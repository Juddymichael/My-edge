import { db } from '../db';
import { ImportLog } from '../../../types/import';
import { ImportLogSchema } from '../../validation/importSchema';
import { DatabaseError, InvalidImportError } from '../../../types/errors';

export class ImportRepository {
  static async getById(id: string): Promise<ImportLog | null> {
    try {
      const log = await db.imports.get(id);
      return log || null;
    } catch (error) {
      throw new DatabaseError(`Failed to get import log ${id}`, error);
    }
  }

  static async getAll(): Promise<ImportLog[]> {
    try {
      return await db.imports.orderBy('importedAt').reverse().toArray();
    } catch (error) {
      throw new DatabaseError('Failed to fetch import logs', error);
    }
  }

  static async save(importLog: ImportLog): Promise<ImportLog> {
    const validation = ImportLogSchema.safeParse(importLog);
    if (!validation.success) {
      throw new InvalidImportError(
        `Import log validation failed: ${validation.error.issues.map((i) => i.message).join(', ')}`
      );
    }

    try {
      await db.imports.put(validation.data as ImportLog);
      return validation.data as ImportLog;
    } catch (error) {
      throw new DatabaseError(`Failed to save import log ${importLog.id}`, error);
    }
  }

  static async clearAll(): Promise<void> {
    try {
      await db.imports.clear();
    } catch (error) {
      throw new DatabaseError('Failed to clear imports table', error);
    }
  }
}
