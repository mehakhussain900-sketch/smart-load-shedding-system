# Developing an AI & IoT enabled smart PV plant with reduced maximum demand losses

A modern, enterprise-grade control-room frontend dashboard for monitoring and analyzing an AI & IoT enabled smart photovoltaic plant prototype with maximum demand evaluation.

## Project Scope & Physical Hardware

This project operates strictly on the following physical hardware prototype:
- **Microcontroller**: ESP32 Edge Node
- **PV Generator**: 6V 5W Polycrystalline Solar Panel
- **Voltage Measurement**: Precision Voltage Divider Sensor (0 – 6.5V DC)
- **Current Measurement**: ACS712 Current Sensors (Solar Generation & Load Current)
- **Environmental Sensing**:
  - DHT22 (Ambient Temperature in °C, Relative Humidity in %)
  - LDR Photocell (Relative Light Intensity in %)
- **Storage & Power Management**: 18650 Battery & DC-DC Boost Converter
- **Load**: 5V LED Test Load

*Note: All irradiance metrics are represented as Relative Light Intensity (%) from the LDR. Unsupported hardware (pyranometers, utility inverters, grid synch) is excluded.*

## Core Modules

1. **Dashboard** (`/`): Comprehensive overview with 8 primary KPIs (Solar Voltage, Solar Current, Solar Power, Today's Energy Wh, Temperature, Humidity, Relative Light, PV Health Score).
2. **Live Monitoring** (`/live-monitoring`): 2-second streaming telemetry divided into PV Generation, Environment, and Load with real-time Recharts rolling charts.
3. **Energy Analytics** (`/energy-analytics`): Power vs Time solar curves, daily energy generation (Wh), and monthly accumulation trends.
4. **AI Prediction** (`/ai-prediction`): 6-input solar power forecasting engine (prototype regression baseline) with actual vs predicted curves and confidence bounds.
5. **PV Health Assessment** (`/pv-health`): Explainable rule-based diagnostic evaluation of generation performance, voltage/current stability, and environmental conditions.
6. **Maximum Demand Analysis** (`/maximum-demand`): Quantitative evaluation of daytime peak load shaving and electrical demand reduction comparing demand with vs without PV.
7. **Anomalies & Faults** (`/anomalies`): Hardware-specific fault detection (unexpected power drops, voltage/current abnormalities, sensor inconsistencies, low generation under high light).
8. **Data Logs** (`/data-logs`): Full chronological telemetry table with search, status filtering, column sorting, and instant CSV export.

## Development & Build

```bash
# Install dependencies
npm install

# Start local Vite development server
npm run dev

# Run type check and production build
npm run build

# Run Oxlint linter
npm run lint
```
