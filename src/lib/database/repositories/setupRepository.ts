import { db } from '../db';
import { Setup, EntryModel, DEFAULT_SETUPS } from '../../../types/setup';
import { SetupSchema, EntryModelSchema } from '../../validation/setupSchema';

export class SetupRepository {
  /**
   * Retrieves all trading setups, ensuring defaults are seeded if empty.
   */
  async getAllSetups(): Promise<Setup[]> {
    await db.ensureDefaultSetups();
    return await db.setups.toArray();
  }

  /**
   * Retrieves an enabled setup by ID or name.
   */
  async getSetupById(id: string): Promise<Setup | undefined> {
    return await db.setups.get(id);
  }

  /**
   * Retrieves setup by exact or normalized name.
   */
  async getSetupByName(name: string): Promise<Setup | undefined> {
    const all = await this.getAllSetups();
    const lower = name.trim().toLowerCase();
    return all.find(
      (s) => s.name.toLowerCase() === lower || s.shortName.toLowerCase() === lower
    );
  }

  /**
   * Creates or updates a setup.
   */
  async saveSetup(setup: Setup): Promise<Setup> {
    const validated = SetupSchema.parse(setup);
    await db.setups.put(validated);
    return validated;
  }

  /**
   * Toggles setup enabled state.
   */
  async toggleSetup(id: string, enabled: boolean): Promise<void> {
    await db.setups.update(id, { enabled, updatedAt: new Date().toISOString() });
  }

  /**
   * Deletes a setup by ID.
   */
  async deleteSetup(id: string): Promise<void> {
    await db.setups.delete(id);
  }

  /**
   * Entry model operations
   */
  async getAllEntryModels(): Promise<EntryModel[]> {
    return await db.entryModels.toArray();
  }

  async saveEntryModel(entryModel: EntryModel): Promise<EntryModel> {
    const validated = EntryModelSchema.parse(entryModel);
    await db.entryModels.put(validated);
    return validated;
  }

  async getEntryModelsBySetup(setupId: string): Promise<EntryModel[]> {
    return await db.entryModels.where('setupId').equals(setupId).toArray();
  }
}

export const setupRepository = new SetupRepository();
