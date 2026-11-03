import sqlite3

def run_migration():
    conn = sqlite3.connect('backend/data/pv_intelligence.db')
    cursor = conn.cursor()

    # Check and add columns to demand_settings
    ds_cols = [c[1] for c in cursor.execute('PRAGMA table_info(demand_settings)').fetchall()]
    if 'auto_restore_enabled' not in ds_cols:
        cursor.execute('ALTER TABLE demand_settings ADD COLUMN auto_restore_enabled BOOLEAN DEFAULT 1')
        print('Added auto_restore_enabled to demand_settings')

    if 'device_id' not in ds_cols:
        cursor.execute("ALTER TABLE demand_settings ADD COLUMN device_id VARCHAR(64) DEFAULT 'ESP32_LOAD_SHEDDING_01'")
        print('Added device_id to demand_settings')

    if 'telemetry_interval_sec' not in ds_cols:
        cursor.execute('ALTER TABLE demand_settings ADD COLUMN telemetry_interval_sec FLOAT DEFAULT 2.0')
        print('Added telemetry_interval_sec to demand_settings')

    # Check and add columns to load_configs
    lc_cols = [c[1] for c in cursor.execute('PRAGMA table_info(load_configs)').fetchall()]
    if 'category' not in lc_cols:
        cursor.execute("ALTER TABLE load_configs ADD COLUMN category VARCHAR(32) DEFAULT 'Essential'")
        print('Added category to load_configs')

    # Seed initial configuration as specified in Requirement 5:
    # 5 loads, each rated at 100W.
    # L1, L2, L3 are Essential. L4, L5 are Heavy.
    # Default maximum demand threshold: 250W.
    # Shed L5 first (priority 5), followed by L4 (priority 4).
    # Restore L4 before L5 when sufficient headroom is available.
    cursor.execute('DELETE FROM load_configs')
    initial_loads = [
        ('L1', 'L1 - Essential Load 1', 100.0, 1, 1, 'Essential', 1, 1, 26, 1),
        ('L2', 'L2 - Essential Load 2', 100.0, 2, 1, 'Essential', 2, 1, 27, 1),
        ('L3', 'L3 - Essential Load 3', 100.0, 3, 1, 'Essential', 3, 1, 25, 1),
        ('L4', 'L4 - Heavy Load 1',     100.0, 4, 0, 'Heavy',     4, 1, 33, 1),
        ('L5', 'L5 - Heavy Load 2',     100.0, 5, 0, 'Heavy',     5, 1, 32, 1),
    ]
    cursor.executemany(
        '''INSERT INTO load_configs 
           (id, name, rated_power_w, priority, is_essential, category, relay_channel, is_enabled, gpio_pin, relay_active_low) 
           VALUES (?,?,?,?,?,?,?,?,?,?)''',
        initial_loads
    )

    cursor.execute('''
        INSERT OR REPLACE INTO demand_settings 
        (id, threshold_w, confirmation_sec, cooldown_sec, restoration_hysteresis_w, 
         auto_mode, auto_restore_enabled, transformer_rating_va, power_factor, 
         device_id, telemetry_interval_sec, updated_at)
        VALUES (1, 250.0, 2.0, 3.0, 20.0, 1, 1, 1000.0, 0.8, 'ESP32_LOAD_SHEDDING_01', 2.0, CURRENT_TIMESTAMP)
    ''')

    conn.commit()
    print('Migration successful!')
    print('Current loads in DB:', cursor.execute('SELECT id, name, rated_power_w, priority, is_essential, category, gpio_pin FROM load_configs').fetchall())
    print('Current settings in DB:', cursor.execute('SELECT threshold_w, transformer_rating_va, power_factor, auto_mode, auto_restore_enabled, device_id FROM demand_settings').fetchall())
    conn.close()

if __name__ == '__main__':
    run_migration()
