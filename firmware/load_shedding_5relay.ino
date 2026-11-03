#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
// ------------------- 1. User settings -------------------
const char* WIFI_SSID = "MEHAK";
const char* WIFI_PASS = "12345678";
// ------------------- FastAPI backend -------------------
const char* BACKEND_URL = "http://10.38.236.12:8000/api/ac-telemetry";
const char* DEVICE_ID = "ESP32_LOAD_SHEDDING_01";
const unsigned long BACKEND_INTERVAL_MS = 2000;
unsigned long lastBackendSend = 0;
const bool SIMULATE = false;
const bool RELAY_ACTIVE_LOW = true;
float THRESHOLD_W = 220.0;
const float TRANSFORMER_RATING_VA = 400.0;
float RESTORE_MARGIN_W = 5.0;
const unsigned long OVERLOAD_CONFIRM_MS = 2000;
const unsigned long SETTLE_MS = 3000;
const unsigned long READ_INTERVAL_MS = 1000;
bool fullReport = true;
// ------------------- 2. Sensor settings -------------------
#define V_PIN 35
#define I_PIN 34
const float DIVIDER = 20.0 / 30.0;
const float ACS_MV_PER_A = 185.0;
const float I_PER_MV = 1.0 / (ACS_MV_PER_A * DIVIDER);
float vCal = 0.46;
float iCal = 1.00;
const unsigned long WINDOW_US = 200000;
const float NO_LOAD_A = 0.008;
const float NOMINAL_V = 230.0;
const float V_OK_MIN = 180.0, V_OK_MAX = 260.0;
float Vmeas = 0;
bool voltageOk = true;
Preferences prefs;
float iNoise = 0;
float pOffset = 0;
float vMid = 1650;
float lastVraw = 0;
float lastIraw = 0;
float vPP = 0;
unsigned long lastSamples = 0;
// ------------------- 3. Relays and loads -------------------
WebServer server(80);
struct Load {
const char* name;
const char* type;
uint8_t pin;
float ratedW;
uint8_t priority;
bool requested;
bool shed;
};
Load loads[] = {
  {"L1 - 100 W bulb", "ESSENTIAL", 26, 100.0, 1, false, false},
  {"L2 - 100 W bulb", "ESSENTIAL", 27, 100.0, 2, false, false},
  {"L3 - 100 W bulb", "ESSENTIAL", 25, 100.0, 3, false, false},
  {"L4 - 100 W bulb", "HEAVY",     33, 100.0, 4, false, false},
  {"L5 - 100 W bulb", "HEAVY",     32, 100.0, 5, false, false},
};
const int N = sizeof(loads) / sizeof(loads[0]);
const bool START_ON[] = {true, true, true, true, false};
struct Raw {
float vRms, iRms, p, vpp, f;
unsigned long n;
};
// ------------------- 4. Measured values -------------------
float V = 0, I = 0, P = 0, S = 0;
float E_Wh = 0, PF = 0, F = 0, peakP = 0;
float transformerLoadingPct = 0;
unsigned long overSince = 0;
unsigned long lastAction = 0;
unsigned long lastRead = 0;
unsigned long readingNo = 0;
unsigned long shedCount = 0;
unsigned long restoreCount = 0;
int lastState[8];
unsigned long stateSince[8];
String hms(unsigned long ms) {
unsigned long s = ms / 1000;
char b[24];
snprintf(
b, sizeof(b), "%02lu:%02lu:%02lu",
s / 3600, (s / 60) % 60, s % 60
);
return String(b);
}
const int LOG_LEN = 8;
String events[LOG_LEN];
void logEvent(const String& s) {
String line = hms(millis()) + "  " + s;
for (int k = LOG_LEN - 1; k > 0; k--)
events[k] = events[k - 1];
events[0] = line;
Serial.println();
Serial.println(">>> EVENT  " + line);
Serial.println();
}
bool isOn(int i) {
return loads[i].requested && !loads[i].shed;
}
int stateOf(int i) {
return isOn(i) ? 1 : (loads[i].shed ? 2 : 0);
}
const char* stateName(int st) {
return st == 1 ? "ON" : (st == 2 ? "SHED" : "OFF");
}
void applyRelays() {
for (int i = 0; i < N; i++) {
bool on = isOn(i);
digitalWrite(
loads[i].pin,
RELAY_ACTIVE_LOW ? !on : on
);
int st = stateOf(i);
if (st != lastState[i]) {
lastState[i] = st;
stateSince[i] = millis();
}
}
}
// ------------------- 5. Sensor sampling -------------------
Raw sampleWindow() {
double sv = 0, sv2 = 0;
double si = 0, si2 = 0, svi = 0;
unsigned long n = 0;
int vmin = 5000, vmax = 0;
const int HYS = 30;
bool above = false, started = false;
int crossings = 0;
unsigned long firstX = 0, lastX = 0;
unsigned long t0 = micros();
while (micros() - t0 < WINDOW_US) {
int v = analogReadMilliVolts(V_PIN);
int i = analogReadMilliVolts(I_PIN);
unsigned long t = micros();
sv += v;
sv2 += (double)v * v;
si += i;
si2 += (double)i * i;
svi += (double)v * i;
n++;
if (v < vmin) vmin = v;
if (v > vmax) vmax = v;
if (!started) {
above = v > vMid;
started = true;
}
else if (!above && v > vMid + HYS) {
above = true;
if (crossings == 0)
firstX = t;
lastX = t;
crossings++;
}
else if (above && v < vMid - HYS) {
above = false;
}
}
double mv = sv / n;
double mi = si / n;
vMid = mv;
Raw r;
r.vRms = sqrt(fmax(0.0, sv2 / n - mv * mv));
r.iRms = sqrt(fmax(0.0, si2 / n - mi * mi));
r.p = svi / n - mv * mi;
r.vpp = vmax - vmin;
r.f = (crossings >= 2 && lastX > firstX)
? (crossings - 1) * 1e6 / (float)(lastX - firstX)
: 0;
r.n = n;
return r;
}
// ------------------- Zero calibration -------------------
void calibrateZero() {
Serial.println(
"Zero calibration: measuring sensor noise with ALL loads OFF ..."
);
float accI = 0, accP = 0;
for (int k = 0; k < 5; k++) {
Raw r = sampleWindow();
accI += r.iRms * I_PER_MV * iCal;
accP += r.p * vCal * I_PER_MV * iCal;
}
iNoise = accI / 5;
pOffset = accP / 5;
Serial.printf(
"  current noise floor = %.4f A   power offset = %.2f W\n",
iNoise, pOffset
);
Raw rv = sampleWindow();
Serial.printf(
"  voltage reading = %.1f V  (ZMPT p-p %.0f mV at GPIO35)\n",
rv.vRms * vCal, rv.vpp
);
if (rv.vRms * vCal < V_OK_MIN ||
rv.vRms * vCal > V_OK_MAX) {
Serial.println(
"  NOTE: voltage not in 180-260 V -> type c<multimeter volts> to calibrate."
);
}
if (iNoise > 0.05) {
Serial.println(
"  WARNING: noise is high - was a load ON at start-up?"
);
}
}
// ------------------- Meter reading -------------------
void readMeter() {
static unsigned long lastT = millis();
unsigned long now = millis();
float dtH = (now - lastT) / 3600000.0;
lastT = now;
readingNo++;
if (SIMULATE) {
P = 0;
for (int i = 0; i < N; i++) {
if (isOn(i))
P += loads[i].ratedW;
}
V = 230.0;
F = 50.0;
PF = (P > 0) ? 1.0 : 0.0;
I = P / V;
S = V * I;
lastVraw = 0;
lastIraw = 0;
vPP = 0;
lastSamples = 0;
}
else {
Raw r = sampleWindow();
lastVraw = r.vRms;
lastIraw = r.iRms;
vPP = r.vpp;
lastSamples = r.n;
Vmeas = r.vRms * vCal;
float iRaw = r.iRms * I_PER_MV * iCal;
float i2 = iRaw * iRaw - iNoise * iNoise;
I = i2 > 0 ? sqrt(i2) : 0;
float pMeas = fabs(
r.p * vCal * I_PER_MV * iCal - pOffset
);
float sMeas = Vmeas * I;
if (sMeas > 1.0)
PF = pMeas / sMeas;
else
PF = (Vmeas < 20.0 && I > 0) ? 1.0 : 0.0;
if (PF > 1.0)
PF = 1.0;
voltageOk = (Vmeas >= V_OK_MIN && Vmeas <= V_OK_MAX);
V = voltageOk ? Vmeas : NOMINAL_V;
if (I < NO_LOAD_A) {
I = 0;
PF = 0;
}
S = V * I;
P = S * PF;
F = r.f;
}
// Transformer loading percentage
transformerLoadingPct =
(PF > 0.01 && TRANSFORMER_RATING_VA > 0)
? (P / (TRANSFORMER_RATING_VA * PF)) * 100.0
: 0.0;
E_Wh += P * dtH;
if (P > peakP)
peakP = P;
}
// ------------------- 6. Load-shedding algorithm -------------------
int nextToShed() {
int v = -1;
for (int i = 0; i < N; i++) {
if (strcmp(loads[i].type, "ESSENTIAL") == 0) continue;  // Never auto-shed essential loads
if (isOn(i) &&
(v < 0 || loads[i].priority > loads[v].priority)) {
v = i;
}
}
return v;
}
int nextToRestore() {
  bool heavyActive = false;
  for (int i = 0; i < N; i++) {
    if (strcmp(loads[i].type, "HEAVY") == 0 && isOn(i)) {
      heavyActive = true;
      break;
    }
  }

  int c = -1;
  for (int i = 0; i < N; i++) {
    // Keep the other heavy load OFF: if any HEAVY load is already ON, do not restore another
    if (heavyActive && strcmp(loads[i].type, "HEAVY") == 0)
      continue;

    if (loads[i].requested && loads[i].shed &&
        (c < 0 || loads[i].priority < loads[c].priority)) {
      c = i;
    }
  }
  return c;
}

void loadShedding() {
  unsigned long now = millis();

  if (now - lastAction < SETTLE_MS)
    return;

  if (P > THRESHOLD_W) {
    if (overSince == 0) {
      overSince = now;
      logEvent(
        "OVERLOAD detected: " + String(P, 1) +
        " W > limit " + String(THRESHOLD_W, 0) +
        " W  (confirming for " +
        String(OVERLOAD_CONFIRM_MS / 1000.0, 1) + " s)"
      );
    }

    if (now - overSince >= OVERLOAD_CONFIRM_MS) {
      // Overload for 2s: automatically shed both heavy loads (L4 and L5)
      bool shedAny = false;
      for (int i = 0; i < N; i++) {
        if (strcmp(loads[i].type, "HEAVY") == 0 && isOn(i)) {
          loads[i].shed = true;
          shedAny = true;
          shedCount++;
          logEvent(
            "SHED " + String(loads[i].name) +
            " [" + String(loads[i].type) +
            ", relay GPIO" + String(loads[i].pin) +
            " -> OFF] because " + String(P, 1) +
            " W stayed above " + String(THRESHOLD_W, 0) +
            " W for 2 s"
          );
        }
      }

      if (shedAny) {
        applyRelays();
        lastAction = now;
      }
      else {
        int v = nextToShed();
        if (v >= 0) {
          loads[v].shed = true;
          applyRelays();
          lastAction = now;
          shedCount++;
          logEvent(
            "SHED " + String(loads[v].name) +
            " [" + String(loads[v].type) +
            ", priority " + String(loads[v].priority) +
            ", relay GPIO" + String(loads[v].pin) +
            " -> OFF] because " + String(P, 1) +
            " W stayed above " + String(THRESHOLD_W, 0) +
            " W for 2 s"
          );
        }
        else {
          logEvent(
            "OVERLOAD but no load is ON that can be shed - check sensor calibration"
          );
        }
      }
      overSince = 0;
    }
  }
  else {
    if (overSince != 0) {
      logEvent(
        "Overload cleared before confirmation (" +
        String(P, 1) + " W) - no action"
      );
    }
    overSince = 0;

    int c = nextToRestore();
    if (c >= 0 &&
        P + loads[c].ratedW <= THRESHOLD_W - RESTORE_MARGIN_W) {
      loads[c].shed = false;
      applyRelays();
      lastAction = now;
      restoreCount++;
      logEvent(
        "RESTORE " + String(loads[c].name) +
        " [priority " + String(loads[c].priority) +
        ", relay GPIO" + String(loads[c].pin) +
        " -> ON] because " + String(P, 1) +
        " W + " + String(loads[c].ratedW, 1) +
        " W <= " + String(THRESHOLD_W - RESTORE_MARGIN_W, 0) +
        " W"
      );
    }
  }
}
// ------------------- 7. Serial Monitor report -------------------
String systemStatus() {
unsigned long now = millis();
if (now - lastAction < SETTLE_MS) {
return "SETTLING after relay change (" +
String((SETTLE_MS - (now - lastAction)) / 1000.0, 1) +
" s left)";
}
if (P > THRESHOLD_W) {
return "OVERLOAD - confirming " +
String((overSince ? now - overSince : 0) / 1000.0, 1) +
" / " + String(OVERLOAD_CONFIRM_MS / 1000.0, 1) + " s";
}
int c = nextToRestore();
if (c >= 0) {
return "RECOVERY - " + String(loads[c].name) +
" waits until power <= " +
String(THRESHOLD_W - RESTORE_MARGIN_W - loads[c].ratedW, 1) +
" W";
}
return "NORMAL";
}
void printReport() {
float used = THRESHOLD_W > 0
? P / THRESHOLD_W * 100.0
: 0;
if (!fullReport) {
Serial.printf(
"[%s] V=%.1f V I=%.3f A P=%.1f W PF=%.2f f=%.1f Hz E=%.3f Wh | ",
hms(millis()).c_str(), V, I, P, PF, F, E_Wh
);
for (int i = 0; i < N; i++)
Serial.printf("L%d:%s ", i + 1, stateName(stateOf(i)));
Serial.printf(
"| %s%s\n",
systemStatus().c_str(),
(!SIMULATE && !voltageOk) ? " [V not calibrated]" : ""
);
return;
}
Serial.println("======================================================================");
Serial.printf(
" Time %s   Reading #%lu   Mode: %s\n",
hms(millis()).c_str(), readingNo,
SIMULATE ? "SIMULATION (no sensors)" : "LIVE (sensors)"
);
Serial.println("----------------------------------------------------------------------");
Serial.printf(
" Voltage      : %7.1f V        Frequency    : %6.1f Hz\n",
V, F
);
Serial.printf(
" Current      : %7.3f A        Power factor : %6.2f\n",
I, PF
);
Serial.printf(
" Real power   : %7.1f W        Apparent pwr : %6.1f VA\n",
P, S
);
Serial.printf(
" Energy       : %7.3f Wh       Peak power   : %6.1f W\n",
E_Wh, peakP
);
Serial.printf(
" Limit        : %7.0f W        Load used    : %6.1f %%   Headroom: %.1f W\n",
THRESHOLD_W, used, THRESHOLD_W - P
);
Serial.printf(
" Transformer  : %6.1f %% loading   Rating: %.0f VA\n",
transformerLoadingPct, TRANSFORMER_RATING_VA
);
Serial.printf(" System       : %s\n", systemStatus().c_str());
if (!SIMULATE && !voltageOk) {
Serial.printf(
" WARNING      : measured voltage %.1f V is not believable -> using 230 V for power.\n",
Vmeas
);
}
if (!SIMULATE) {
Serial.printf(
" Raw sensors  : V %.0f mV rms (ZMPT p-p %.0f mV) | I %.1f mV rms | %lu samples/200 ms\n",
lastVraw, vPP, lastIraw, lastSamples
);
}
Serial.println("----------------------------------------------------------------------");
Serial.println(" Load | Bulb      | Type      | Relay pin | Priority | Status | In state");
for (int i = 0; i < N; i++) {
int st = stateOf(i);
char bulb[12];
snprintf(bulb, sizeof(bulb), "%.1f W", loads[i].ratedW);
Serial.printf(
" L%d   | %-9s | %-9s | GPIO%-5d | %-8d | %-6s | %s\n",
i + 1, bulb, loads[i].type, loads[i].pin,
loads[i].priority, stateName(st),
hms(millis() - stateSince[i]).c_str()
);
}
int v = nextToShed();
int c = nextToRestore();
Serial.println("----------------------------------------------------------------------");
Serial.printf(
" Next to shed if overloaded : %s\n",
v >= 0 ? loads[v].name : "none (no load ON)"
);
Serial.printf(
" Next to restore            : %s\n",
c >= 0 ? loads[c].name : "none"
);
Serial.printf(" Sheds: %lu   Restores: %lu   ", shedCount, restoreCount);
if (WiFi.getMode() == WIFI_AP) {
Serial.printf(
"Wi-Fi: hotspot 'LoadShedding' IP %s\n",
WiFi.softAPIP().toString().c_str()
);
}
else if (WiFi.status() == WL_CONNECTED) {
Serial.printf(
"Wi-Fi: %d dBm IP %s\n",
WiFi.RSSI(), WiFi.localIP().toString().c_str()
);
}
else {
Serial.println("Wi-Fi: not connected");
}
}
void printHelp() {
Serial.println();
Serial.println("---------------- Serial Monitor commands ----------------");
Serial.println("  1 .. 5     toggle load L1 .. L5 ON / OFF");
Serial.println("  a          all loads ON          o   all loads OFF");
Serial.println("  t150       set limit to 150 W");
Serial.println("  c230.5     calibrate voltage to multimeter reading");
Serial.println("  r          reset energy, peak power and counters");
Serial.println("  q          switch report mode");
Serial.println("  x          relay test");
Serial.println("  l          show load / pin table      h   help");
Serial.println("----------------------------------------------------------");
Serial.println();
}
void printLoadTable() {
Serial.println();
Serial.println("------------------------- LOADS AND RELAY PINS -------------------------");
Serial.println(" Load | Bulb     | Type      | Relay pin | Priority | Shed order");
for (int i = 0; i < N; i++) {
char bulb[12];
snprintf(bulb, sizeof(bulb), "%.1f W", loads[i].ratedW);
Serial.printf(
" L%d   | %-8s | %-9s | GPIO%-5d | %-8d | %s\n",
i + 1, bulb, loads[i].type, loads[i].pin,
loads[i].priority,
loads[i].priority == N ? "shed FIRST" :
(loads[i].priority == 1 ? "shed LAST" : "-")
);
}
Serial.printf(
" Limit %.0f W | overload must last %.1f s | wait %.1f s after each action | restore margin %.0f W\n",
THRESHOLD_W,
OVERLOAD_CONFIRM_MS / 1000.0,
SETTLE_MS / 1000.0,
RESTORE_MARGIN_W
);
Serial.println("------------------------------------------------------------------------");
Serial.println();
}
void relayTest() {
Serial.println();
Serial.println("================ RELAY TEST ================");
Serial.println("All relays OFF. Each lamp should light ALONE for 2 s, in order L1..L5.");
for (int i = 0; i < N; i++)
digitalWrite(loads[i].pin, RELAY_ACTIVE_LOW ? HIGH : LOW);
delay(1500);
for (int i = 0; i < N; i++) {
Serial.printf(
"  %s -> relay on GPIO%d is now ON (pin level %s)\n",
loads[i].name, loads[i].pin,
RELAY_ACTIVE_LOW ? "LOW" : "HIGH"
);
digitalWrite(
loads[i].pin,
RELAY_ACTIVE_LOW ? LOW : HIGH
);
delay(2000);
digitalWrite(
loads[i].pin,
RELAY_ACTIVE_LOW ? HIGH : LOW
);
delay(500);
}
Serial.println("If a lamp was ON when it should be OFF: check NO/NC wiring or relay polarity.");
Serial.println("============================================");
applyRelays();
lastAction = millis();
}
void setLoad(int i, bool on, const char* by) {
loads[i].requested = on;
loads[i].shed = false;
applyRelays();
lastAction = millis();
logEvent(
String(loads[i].name) + " switched " +
(on ? "ON" : "OFF") + " by " + by +
" (relay GPIO" + String(loads[i].pin) + ")"
);
}
void handleSerial() {
if (!Serial.available())
return;
String cmd = Serial.readStringUntil('\n');
cmd.trim();
if (cmd.length() == 0)
return;
char c0 = cmd.charAt(0);
if (c0 >= '1' && c0 <= '0' + N && cmd.length() == 1) {
int i = c0 - '1';
setLoad(i, !loads[i].requested, "Serial Monitor");
}
else if (c0 == 'a') {
for (int i = 0; i < N; i++) {
loads[i].requested = true;
loads[i].shed = false;
}
applyRelays();
lastAction = millis();
logEvent("ALL loads switched ON by Serial Monitor");
}
else if (c0 == 'o') {
for (int i = 0; i < N; i++) {
loads[i].requested = false;
loads[i].shed = false;
}
applyRelays();
lastAction = millis();
logEvent("ALL loads switched OFF by Serial Monitor");
}
else if (c0 == 't') {
float w = cmd.substring(1).toFloat();
if (w > 0) {
THRESHOLD_W = w;
logEvent("Limit set to " + String(w, 0) + " W");
}
else {
Serial.println("Usage: t150");
}
}
else if (c0 == 'c') {
float actual = cmd.substring(1).toFloat();
if (actual > 50 && lastVraw > 20) {
vCal = actual / lastVraw;
prefs.putFloat("vcal", vCal);
logEvent(
"Voltage calibrated to " + String(actual, 1) +
" V (vCal = " + String(vCal, 4) + ", saved)"
);
}
else {
Serial.println("Usage: c230.5 (mains must be connected)");
}
}
else if (c0 == 'r') {
E_Wh = 0;
peakP = 0;
shedCount = 0;
restoreCount = 0;
logEvent("Energy, peak power and counters reset");
}
else if (c0 == 'q') {
fullReport = !fullReport;
Serial.println(fullReport ? "Full report ON" : "One-line report ON");
}
else if (c0 == 'x') {
relayTest();
}
else if (c0 == 'l') {
printLoadTable();
}
else if (c0 == 'h') {
printHelp();
}
else {
Serial.println("Unknown command '" + cmd + "' - type h for help");
}
}
// ------------------- 8. Web dashboard (HTML page) -------------------
const char PAGE[] PROGMEM = R"rawliteral(

<!DOCTYPE html><html><head><meta charset="utf-8">

<meta name="viewport" content="width=device-width,initial-scale=1">

<title>IoT Load Shedding</title>

<style>

body{font-family:Arial,sans-serif;margin:0;background:#f2f4f7;color:#222}

header{background:#1f3b5a;color:#fff;padding:12px 16px;font-size:20px}

.wrap{padding:12px;max-width:900px;margin:auto}

.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}

.card{background:#fff;border-radius:8px;padding:10px;box-shadow:0 1px 3px #0002;font-size:13px;color:#555}

.card b{display:block;font-size:22px;margin-top:4px;color:#222}

.bar{height:22px;background:#ddd;border-radius:11px;overflow:hidden;margin:16px 0 4px}

#fill{height:100%;width:0;background:#2e9d4f;transition:width .4s}

canvas{width:100%;height:160px;background:#fff;border-radius:8px;margin-top:12px}

table{width:100%;border-collapse:collapse;background:#fff;margin-top:12px}

td,th{padding:8px;border-bottom:1px solid #eee;text-align:left}

.ON{color:#2e9d4f;font-weight:bold}.OFF{color:#888}.SHED{color:#d33;font-weight:bold}

button{padding:6px 12px;cursor:pointer}

#log{background:#fff;padding:10px;font-family:monospace;font-size:13px;border-radius:8px;min-height:40px}

.cal{background:#fff;padding:10px;border-radius:8px;margin-top:12px;font-size:13px;color:#555}

#st{background:#fff;padding:10px;border-radius:8px;margin-top:12px;font-weight:bold}

</style></head><body>

<header>IoT Load Shedding Dashboard</header>

<div class="wrap">

 <div class="cards">

  <div class="card">Transformer Loading<b id="ctl">-</b></div>

  <div class="card">Voltage<b id="cv">-</b></div>

  <div class="card">Current<b id="ci">-</b></div>

  <div class="card">Real Power<b id="cp">-</b></div>

  <div class="card">Apparent Power<b id="cs">-</b></div>

  <div class="card">Power Factor<b id="cpf">-</b></div>

  <div class="card">Frequency<b id="cf">-</b></div>

  <div class="card">Energy<b id="ce">-</b></div>

  <div class="card">Peak Power<b id="cpk">-</b></div>

 </div>

 <div id="st">-</div>

 <div class="bar"><div id="fill"></div></div>

 <div id="ptext"></div>

 <canvas id="trend" width="860" height="160"></canvas>

 <p>

  Threshold (W):

  <input id="th" type="number" style="width:70px">

  <button onclick="setTh()">Set</button>

 </p>

 <table>

  <thead>

   <tr>

    <th>Load</th>

    <th>Type</th>

    <th>Pin</th>

    <th>Priority</th>

    <th>Status</th>

    <th>Control</th>

   </tr>

  </thead>

  <tbody id="tb"></tbody>

 </table>

 <h3>Event log</h3>

 <div id="log"></div>

 <div class="cal">

  Voltage calibration: measure mains voltage with a multimeter and enter it here

  <input id="vm" type="number" step="0.1" style="width:70px">

  V

  <button onclick="calV()">Calibrate</button>

  <br>

  ZMPT signal peak-to-peak at GPIO35:

  <b id="vpp">-</b> mV (adjust trimmer for 1200 - 1600 mV)

 </div>

</div>

<script>

const $=id=>document.getElementById(id);

let thInit=false;

const hist=[];

function draw(t){

 const c=$('trend'),g=c.getContext('2d'),w=c.width,h=c.height;

 g.clearRect(0,0,w,h);

 const mx=Math.max(t*1.3,...hist,10);

 const ty=h-t/mx*(h-20)-10;

 g.strokeStyle='#d33';

 g.setLineDash([6,4]);

 g.beginPath();

 g.moveTo(0,ty);

 g.lineTo(w,ty);

 g.stroke();

 g.setLineDash([]);

 g.fillStyle='#d33';

 g.font='12px Arial';

 g.fillText('Limit '+t+' W',6,ty-4);

 g.strokeStyle='#1f6fb2';

 g.lineWidth=2;

 g.beginPath();

 hist.forEach((p,k)=>{

  const x=k/59*w;

  const y=h-p/mx*(h-20)-10;

  k?g.lineTo(x,y):g.moveTo(x,y);

 });

 g.stroke();

 g.fillStyle='#555';

 g.fillText('Power, last 60 s',w-110,14);

}

async function upd(){

 try{

  const d=await (await fetch('/data')).json();

  $('cv').textContent=d.v.toFixed(1)+' V';

  $('ci').textContent=d.i.toFixed(3)+' A';

  $('cp').textContent=d.p.toFixed(1)+' W';

  $('cs').textContent=d.s.toFixed(1)+' VA';

  $('ce').textContent=d.e.toFixed(2)+' Wh';

  $('cpf').textContent=d.pf.toFixed(2);

  $('cf').textContent=d.f.toFixed(1)+' Hz';

  $('cpk').textContent=d.pk.toFixed(1)+' W';

  $('ctl').textContent=d.tl.toFixed(1)+' %';

  $('vpp').textContent=d.vpp.toFixed(0);

  $('st').textContent=

   'System: '+d.st+

   ' | Sheds: '+d.sc+

   ' Restores: '+d.rc;

  const pct=Math.min(100,d.p/d.t*100);

  $('fill').style.width=pct+'%';

  $('fill').style.background=

   d.p>d.t?'#d33':

   (pct>80?'#e8a33d':'#2e9d4f');

  $('ptext').textContent=

   'Total load '+d.p.toFixed(1)+' W of '+d.t+' W limit';

  hist.push(d.p);

  if(hist.length>60)hist.shift();

  draw(d.t);

  if(!thInit){

   $('th').value=d.t;

   thInit=true;

  }

  $('tb').innerHTML=d.loads.map((l,i)=>

   '<tr><td>'+l.n+'</td><td>'+l.ty+

   '</td><td>GPIO'+l.pin+'</td><td>'+l.pr+

   '</td><td class="'+l.s+'">'+l.s+

   '</td><td><button onclick="tg('+i+')">'+

   (l.r?'Turn OFF':'Turn ON')+

   '</button></td></tr>'

  ).join('');

  $('log').innerHTML=d.log.join('<br>');

 }catch(e){}

}

function tg(i){

 fetch('/toggle?i='+i).then(upd);

}

function setTh(){

 fetch('/threshold?w='+$('th').value).then(upd);

}

function calV(){

 fetch('/calv?v='+$('vm').value).then(upd);

}

setInterval(upd,1000);

upd();

</script>

</body></html>

)rawliteral";
// ------------------- Backend command handler -------------------
void handleBackendCommands(const String& response) {
// 1. Process pending relay commands from dashboard
int cmdIdx = response.indexOf("\"pending_relay_commands\"");
if (cmdIdx >= 0) {
int openBrace = response.indexOf('{', cmdIdx);
int closeBrace = response.indexOf('}', openBrace);
if (openBrace >= 0 && closeBrace > openBrace) {
String block = response.substring(openBrace, closeBrace + 1);
for (int i = 0; i < N; i++) {
String idStr = "L" + String(i + 1);
String onPattern = "\"" + idStr + "\":\"on\"";
String onPatternSp = "\"" + idStr + "\": \"on\"";
String offPattern = "\"" + idStr + "\":\"off\"";
String offPatternSp = "\"" + idStr + "\": \"off\"";
if (block.indexOf(onPattern) >= 0 || block.indexOf(onPatternSp) >= 0) {
          if (!isOn(i)) {
            Serial.printf(">>> Dashboard Command: Turn ON %s (GPIO%d)\n", loads[i].name, loads[i].pin);
            setLoad(i, true, "dashboard remote");
          }
        } else if (block.indexOf(offPattern) >= 0 || block.indexOf(offPatternSp) >= 0) {
if (isOn(i)) {
Serial.printf(">>> Dashboard Command: Turn OFF %s (GPIO%d)\n", loads[i].name, loads[i].pin);
setLoad(i, false, "dashboard remote");
}
}
}
}
}
// 2. Synchronize threshold / demand limit from dashboard if changed
int thIdx = response.indexOf("\"threshold_w\":");
if (thIdx >= 0) {
int valStart = thIdx + 14;
while (valStart < response.length() && (response.charAt(valStart) == ' ' || response.charAt(valStart) == ':')) {
valStart++;
}
float newTh = response.substring(valStart).toFloat();
if (newTh >= 50.0 && abs(newTh - THRESHOLD_W) > 1.0) {
THRESHOLD_W = newTh;
Serial.printf(">>> Demand threshold updated from Dashboard: %.0f W\n", THRESHOLD_W);
}
}
}
// ------------------- Backend telemetry -------------------
void sendBackendTelemetry() {
if (WiFi.status() != WL_CONNECTED) {
Serial.println("Backend: Wi-Fi not connected; telemetry skipped");
return;
}
HTTPClient http;
http.begin(BACKEND_URL);
http.addHeader("Content-Type", "application/json");
String payload = "{";
payload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
payload += "\"ac_voltage\":" + String(V, 2) + ",";
payload += "\"ac_current\":" + String(I, 3) + ",";
payload += "\"power_w\":" + String(P, 2) + ",";
payload += "\"energy_wh\":" + String(E_Wh, 4) + ",";
payload += "\"is_simulated\":";
payload += String(SIMULATE ? "true" : "false");
payload += ",";
payload += "\"relay_states\":{";
for (int i = 0; i < N; i++) {
payload += "\"L" + String(i + 1) + "\":";
payload += isOn(i) ? "true" : "false";
if (i < N - 1)
payload += ",";
}
payload += "}}";
int code = http.POST(payload);
Serial.printf("Backend POST status: %d\n", code);
if (code < 0) {
Serial.print("HTTP Error: ");
Serial.println(http.errorToString(code));
}
if (code > 0) {
String response = http.getString();
Serial.println("Backend response: " + response);
handleBackendCommands(response);
}
http.end();
}
// ------------------- 9. Web server handlers -------------------
void handleRoot() {
server.send_P(200, "text/html", PAGE);
}
void handleData() {
String j =
"{\"v\":" + String(V, 1) +
",\"i\":" + String(I, 3) +
",\"p\":" + String(P, 1) +
",\"s\":" + String(S, 1) +
",\"pf\":" + String(PF, 2) +
",\"e\":" + String(E_Wh, 3) +
",\"f\":" + String(F, 1) +
",\"pk\":" + String(peakP, 1) +
",\"vpp\":" + String(vPP, 0) +
",\"t\":" + String(THRESHOLD_W, 0) +
",\"tl\":" + String(transformerLoadingPct, 1) +
",\"sc\":" + String(shedCount) +
",\"rc\":" + String(restoreCount) +
",\"st\":\"" + systemStatus() +
"\",\"loads\":[";
for (int i = 0; i < N; i++) {
j += String(i ? "," : "") +
"{\"n\":\"" + loads[i].name +
"\",\"ty\":\"" + loads[i].type +
"\",\"pin\":" + String(loads[i].pin) +
",\"pr\":" + String(loads[i].priority) +
",\"s\":\"" + stateName(stateOf(i)) +
"\",\"r\":" +
(loads[i].requested ? "true" : "false") +
"}";
}
j += "],\"log\":[";
bool first = true;
for (int k = 0; k < LOG_LEN; k++) {
if (events[k].length() == 0)
continue;
j += String(first ? "" : ",") +
"\"" + events[k] + "\"";
first = false;
}
j += "]}";
server.send(200, "application/json", j);
}
void handleToggle() {
int i = server.arg("i").toInt();
if (i >= 0 && i < N)
setLoad(i, !loads[i].requested, "dashboard");
server.send(200, "text/plain", "ok");
}
void handleThreshold() {
float w = server.arg("w").toFloat();
if (w > 0) {
THRESHOLD_W = w;
logEvent(
"Limit set to " + String(w, 0) +
" W (dashboard)"
);
}
server.send(200, "text/plain", "ok");
}
// Voltage calibration: /calv?v=<multimeter reading>
void handleCalV() {
float actual = server.arg("v").toFloat();
if (actual > 50 && lastVraw > 20) {
vCal = actual / lastVraw;
prefs.putFloat("vcal", vCal);
logEvent(
"Voltage calibrated to " + String(actual, 1) +
" V (vCal = " + String(vCal, 4) + ", saved)"
);
}
server.send(200, "text/plain", "ok");
}
// ------------------- 10. Setup and loop -------------------
void setup() {
Serial.begin(115200);
Serial.setTimeout(20);
for (int i = 0; i < N; i++) {
digitalWrite(
loads[i].pin,
RELAY_ACTIVE_LOW ? HIGH : LOW
);
pinMode(loads[i].pin, OUTPUT);
lastState[i] = 0;
stateSince[i] = 0;
}
applyRelays();
delay(800);
Serial.println();
Serial.println("========================================================================");
Serial.println("  IoT-Based Priority-Driven Automatic Load Shedding System (ESP32)");
Serial.println("========================================================================");
Serial.printf(
"  Sensors : ZMPT101B -> GPIO%d (voltage) ACS712-5A -> GPIO%d (current)\n",
V_PIN, I_PIN
);
Serial.printf(
"  Relays : active-%s Mode: %s\n",
RELAY_ACTIVE_LOW ? "LOW" : "HIGH",
SIMULATE ? "SIMULATION" : "LIVE"
);
printLoadTable();
prefs.begin("loadshed", false);
vCal = prefs.getFloat("vcal", vCal);
Serial.printf(
"Voltage calibration factor vCal = %.4f (type c<volts> to calibrate)\n",
vCal
);
if (!SIMULATE)
calibrateZero();
WiFi.mode(WIFI_STA);
WiFi.begin(WIFI_SSID, WIFI_PASS);
Serial.printf("Connecting to Wi-Fi '%s'", WIFI_SSID);
unsigned long t0 = millis();
while (WiFi.status() != WL_CONNECTED &&
millis() - t0 < 15000) {
delay(500);
Serial.print(".");
}
if (WiFi.status() == WL_CONNECTED) {
Serial.println(" connected");
Serial.printf(
"  IP address : %s\n",
WiFi.localIP().toString().c_str()
);
Serial.printf(
"  Signal : %d dBm\n",
WiFi.RSSI()
);
Serial.printf(
"  MAC : %s\n",
WiFi.macAddress().c_str()
);
Serial.println(
"  Dashboard : http://" +
WiFi.localIP().toString()
);
}
else {
WiFi.mode(WIFI_AP);
WiFi.softAP("LoadShedding", "12345678");
Serial.println(" not found");
Serial.println(
"  Hotspot mode: join Wi-Fi 'LoadShedding' (password 12345678)"
);
Serial.println(
"  Dashboard : http://" +
WiFi.softAPIP().toString()
);
}
server.on("/", handleRoot);
server.on("/data", handleData);
server.on("/toggle", handleToggle);
server.on("/threshold", handleThreshold);
server.on("/calv", handleCalV);
server.begin();
printHelp();
logEvent(
"System started, limit " +
String(THRESHOLD_W, 0) + " W"
);
for (int i = 0; i < N; i++) {
loads[i].requested = START_ON[i];
loads[i].shed = false;
}
applyRelays();
lastAction = millis();
logEvent(
"Start-up: L1, L2, L3, L4 switched ON automatically (L5 OFF). Switch L5 ON to see L4 shed."
);
}
void loop() {
server.handleClient();
handleSerial();
if (millis() - lastRead >= READ_INTERVAL_MS) {
lastRead = millis();
readMeter();
loadShedding();
printReport();
}
