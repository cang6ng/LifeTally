import * as db from '../db/operations';
import type { AnyObject } from '../types/objects';
import { normalizeLifeObject } from '../utils/objectConversion';

export const trashService = {
  async list(): Promise<AnyObject[]> {
    const objects = await db.getAllObjects();
    return objects
      .filter(object => object.status === 'trashed')
      .map(normalizeLifeObject)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async restore(id: string): Promise<void> {
    await db.restoreObject(id);
  },

  async permanentlyDelete(id: string): Promise<void> {
    await db.permanentlyDeleteObject(id);
  },
};
