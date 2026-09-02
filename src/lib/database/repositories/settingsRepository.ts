import { db } from '../db';
import { UserSettings, DEFAULT_USER_SETTINGS } from '../../../types/settings';
import { UserSettingsSchema } from '../../validation/settingsSchema';
import { DatabaseError, DataValidationError } from '../../../types/errors';

export class SettingsRepository {
  static async get(): Promise<UserSettings> {
    try {
      return await db.ensureSettings();
    } catch (error) {
      throw new DatabaseError('Failed to retrieve settings', error);
    }
  }

  static async save(settings: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.get();
    const updated: UserSettings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    const validation = UserSettingsSchema.safeParse(updated);
    if (!validation.success) {
      throw new DataValidationError(
        `Settings validation failed: ${validation.error.issues.map((i) => i.message).join(', ')}`
      );
    }

    try {
      await db.settings.put(validation.data as UserSettings);
      return validation.data as UserSettings;
    } catch (error) {
      throw new DatabaseError('Failed to save settings', error);
    }
  }

  static async reset(): Promise<UserSettings> {
    try {
      await db.settings.put(DEFAULT_USER_SETTINGS);
      return DEFAULT_USER_SETTINGS;
    } catch (error) {
      throw new DatabaseError('Failed to reset settings', error);
    }
  }
}
