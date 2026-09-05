import { getDB } from '../db';
import type { ConversionRecord } from '../types/objects';

export const conversionRecordService = {
  async add(record: Omit<ConversionRecord, 'id' | 'convertedAt'> & Partial<Pick<ConversionRecord, 'id' | 'convertedAt'>>): Promise<ConversionRecord> {
    const db = await getDB();
    const next: ConversionRecord = {
      id: record.id ?? crypto.randomUUID(),
      objectId: record.objectId,
      fromType: record.fromType,
      toType: record.toType,
      titleSnapshot: record.titleSnapshot,
      convertedAt: record.convertedAt ?? Date.now(),
    };
    await db.put('conversionRecords', next);
    return next;
  },

  async getLatest(limit = 5): Promise<ConversionRecord[]> {
    const db = await getDB();
    const items = await db.getAllFromIndex('conversionRecords', 'convertedAt');
    return items.sort((a, b) => b.convertedAt - a.convertedAt).slice(0, limit);
  },

  async getAll(): Promise<ConversionRecord[]> {
    const db = await getDB();
    return db.getAll('conversionRecords');
  },
};
