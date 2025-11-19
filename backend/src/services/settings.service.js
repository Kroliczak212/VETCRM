const { pool } = require('../config/database');
const { NotFoundError } = require('../utils/errors');

class SettingsService {
  /**
   * Get all settings
   */
  async getAll() {
    const [settings] = await pool.query(
      `SELECT setting_key, setting_value, setting_type, description, updated_at
       FROM settings
       ORDER BY setting_key`
    );

    // Convert settings array to object for easier frontend consumption
    const settingsObject = settings.reduce((acc, setting) => {
      // Parse JSON values if setting_type is 'json'
      let value = setting.setting_value;
      if (setting.setting_type === 'json') {
        try {
          value = JSON.parse(setting.setting_value);
        } catch (e) {
          // If parse fails, keep as string
        }
      } else if (setting.setting_type === 'boolean') {
        value = setting.setting_value === 'true' || setting.setting_value === '1';
      } else if (setting.setting_type === 'number') {
        value = parseFloat(setting.setting_value);
      }

      acc[setting.setting_key] = {
        value,
        type: setting.setting_type,
        description: setting.description,
        updatedAt: setting.updated_at,
      };
      return acc;
    }, {});

    return settingsObject;
  }

  /**
   * Get setting by key
   */
  async getByKey(key) {
    const [settings] = await pool.query(
      'SELECT setting_key, setting_value, setting_type, description, updated_at FROM settings WHERE setting_key = ?',
      [key]
    );

    if (settings.length === 0) {
      throw new NotFoundError('Setting');
    }

    const setting = settings[0];
    let value = setting.setting_value;

    // Parse value based on type
    if (setting.setting_type === 'json') {
      try {
        value = JSON.parse(setting.setting_value);
      } catch (e) {
        // Keep as string if parse fails
      }
    } else if (setting.setting_type === 'boolean') {
      value = setting.setting_value === 'true' || setting.setting_value === '1';
    } else if (setting.setting_type === 'number') {
      value = parseFloat(setting.setting_value);
    }

    return {
      key: setting.setting_key,
      value,
      type: setting.setting_type,
      description: setting.description,
      updatedAt: setting.updated_at,
    };
  }

  /**
   * Update setting by key
   */
  async update(key, value) {
    // Check if setting exists
    const [existing] = await pool.query(
      'SELECT setting_type FROM settings WHERE setting_key = ?',
      [key]
    );

    if (existing.length === 0) {
      throw new NotFoundError('Setting');
    }

    // Convert value to string based on type
    let stringValue = value;
    const settingType = existing[0].setting_type;

    if (settingType === 'json') {
      stringValue = JSON.stringify(value);
    } else if (settingType === 'boolean') {
      stringValue = value ? '1' : '0';
    } else {
      stringValue = String(value);
    }

    // Update setting
    await pool.query(
      'UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?',
      [stringValue, key]
    );

    return this.getByKey(key);
  }

  /**
   * Update multiple settings at once
   */
  async updateBulk(settingsData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const updatedSettings = [];

      for (const [key, value] of Object.entries(settingsData)) {
        // Check if setting exists
        const [existing] = await connection.query(
          'SELECT setting_type FROM settings WHERE setting_key = ?',
          [key]
        );

        if (existing.length === 0) {
          continue; // Skip non-existent settings
        }

        // Convert value to string based on type
        let stringValue = value;
        const settingType = existing[0].setting_type;

        if (settingType === 'json') {
          stringValue = JSON.stringify(value);
        } else if (settingType === 'boolean') {
          stringValue = value ? '1' : '0';
        } else {
          stringValue = String(value);
        }

        // Update setting
        await connection.query(
          'UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?',
          [stringValue, key]
        );

        updatedSettings.push(key);
      }

      await connection.commit();

      return {
        message: 'Settings updated successfully',
        updatedKeys: updatedSettings,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Create new setting (admin only)
   */
  async create(data) {
    const { key, value, type, description } = data;

    // Check if setting already exists
    const [existing] = await pool.query(
      'SELECT setting_key FROM settings WHERE setting_key = ?',
      [key]
    );

    if (existing.length > 0) {
      throw new Error('Setting with this key already exists');
    }

    // Convert value to string based on type
    let stringValue = value;
    if (type === 'json') {
      stringValue = JSON.stringify(value);
    } else if (type === 'boolean') {
      stringValue = value ? '1' : '0';
    } else {
      stringValue = String(value);
    }

    await pool.query(
      `INSERT INTO settings (setting_key, setting_value, setting_type, description)
       VALUES (?, ?, ?, ?)`,
      [key, stringValue, type, description]
    );

    return this.getByKey(key);
  }

  /**
   * Delete setting (admin only)
   */
  async delete(key) {
    const [result] = await pool.query(
      'DELETE FROM settings WHERE setting_key = ?',
      [key]
    );

    if (result.affectedRows === 0) {
      throw new NotFoundError('Setting');
    }

    return { message: 'Setting deleted successfully' };
  }

  /**
   * Initialize default settings if they don't exist
   */
  async initializeDefaults() {
    const defaultSettings = [
      {
        key: 'clinic_name',
        value: 'Klinika Weterynaryjna',
        type: 'string',
        description: 'Nazwa kliniki',
      },
      {
        key: 'clinic_address',
        value: 'ul. Przykładowa 1, 00-001 Warszawa',
        type: 'string',
        description: 'Adres kliniki',
      },
      {
        key: 'clinic_phone',
        value: '+48 123 456 789',
        type: 'string',
        description: 'Telefon kontaktowy',
      },
      {
        key: 'clinic_email',
        value: 'kontakt@klinika.pl',
        type: 'string',
        description: 'Email kontaktowy',
      },
      {
        key: 'working_hours',
        value: JSON.stringify({
          monday: { open: '08:00', close: '18:00' },
          tuesday: { open: '08:00', close: '18:00' },
          wednesday: { open: '08:00', close: '18:00' },
          thursday: { open: '08:00', close: '18:00' },
          friday: { open: '08:00', close: '18:00' },
          saturday: { open: '09:00', close: '14:00' },
          sunday: { open: null, close: null },
        }),
        type: 'json',
        description: 'Godziny otwarcia kliniki',
      },
      {
        key: 'default_appointment_duration',
        value: '30',
        type: 'number',
        description: 'Domyślny czas trwania wizyty (minuty)',
      },
      {
        key: 'cancellation_policy_hours',
        value: '24',
        type: 'number',
        description: 'Minimalna liczba godzin przed wizytą do odwołania bez opłaty',
      },
      {
        key: 'late_cancellation_fee',
        value: '50',
        type: 'number',
        description: 'Opłata za późne odwołanie wizyty (PLN)',
      },
      {
        key: 'email_notifications_enabled',
        value: '1',
        type: 'boolean',
        description: 'Powiadomienia email włączone',
      },
      {
        key: 'sms_notifications_enabled',
        value: '0',
        type: 'boolean',
        description: 'Powiadomienia SMS włączone',
      },
      {
        key: 'appointment_reminder_hours',
        value: '24',
        type: 'number',
        description: 'Liczba godzin przed wizytą do wysłania przypomnienia',
      },
    ];

    for (const setting of defaultSettings) {
      const [existing] = await pool.query(
        'SELECT setting_key FROM settings WHERE setting_key = ?',
        [setting.key]
      );

      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO settings (setting_key, setting_value, setting_type, description)
           VALUES (?, ?, ?, ?)`,
          [setting.key, setting.value, setting.type, setting.description]
        );
      }
    }

    return { message: 'Default settings initialized successfully' };
  }
}

module.exports = new SettingsService();
