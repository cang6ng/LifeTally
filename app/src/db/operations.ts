import { getDB, hasObjectStore, hasObjectStoreIndex } from './index';
import type {
  AnyObject,
  ConversionRecord,
  ObjectStatus,
  ObjectType,
  Wallpaper,
} from '../types/objects';

export interface CoreBackupMergeData {
  objects: AnyObject[];
  wallpapers: Wallpaper[];
  conversionRecords: ConversionRecord[];
}

// 创建对象
export const createObject = async (object: AnyObject): Promise<void> => {
  const db = await getDB();
  await db.add('objects', object);
};

export const upsertObject = async (object: AnyObject): Promise<void> => {
  const db = await getDB();
  await db.put('objects', object);
};

// 获取单个对象
export const getObject = async (id: string): Promise<AnyObject | undefined> => {
  const db = await getDB();
  return await db.get('objects', id);
};

// 更新对象
export const updateObject = async (
  id: string,
  updates: Partial<AnyObject>
): Promise<void> => {
  const db = await getDB();
  const existing = await db.get('objects', id);
  if (!existing) {
    throw new Error(`Object with id ${id} not found`);
  }

  const updated = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  } as AnyObject;

  await db.put('objects', updated);
};

export const replaceObject = async (object: AnyObject): Promise<void> => {
  const db = await getDB();
  await db.put('objects', object);
};

// 删除对象（软删除）
export const deleteObject = async (id: string): Promise<void> => {
  const db = await getDB();
  const object = await db.get('objects', id);
  if (object) {
    object.status = 'trashed';
    object.updatedAt = Date.now();
    await db.put('objects', object);
  }
};

// 永久删除对象
export const permanentlyDeleteObject = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete('objects', id);
};

// 获取所有活跃对象
export const getAllActiveObjects = async (): Promise<AnyObject[]> => {
  const db = await getDB();
  const index = db.transaction('objects').store.index('status');
  return await index.getAll('active');
};

// 按类型获取对象
export const getObjectsByType = async (type: ObjectType): Promise<AnyObject[]> => {
  const db = await getDB();
  const index = db.transaction('objects').store.index('type');
  const objects = await index.getAll(type);
  return objects.filter((obj) => obj.status === 'active');
};

// 获取所有对象（包括归档和回收站）
export const getAllObjects = async (): Promise<AnyObject[]> => {
  const db = await getDB();
  return await db.getAll('objects');
};

/**
 * Merges all IndexedDB-backed backup data in one transaction. `put` keeps the
 * operation idempotent: importing the same backup twice updates matching ids
 * instead of creating duplicates. Existing records absent from the backup are
 * deliberately preserved.
 */
export const mergeCoreBackupData = async ({
  objects,
  wallpapers,
  conversionRecords,
}: CoreBackupMergeData): Promise<void> => {
  const database = await getDB();
  const transaction = database.transaction(
    ['objects', 'wallpapers', 'conversionRecords'],
    'readwrite',
  );

  await Promise.all([
    ...objects.map(object => transaction.objectStore('objects').put(object)),
    ...wallpapers.map(wallpaper => transaction.objectStore('wallpapers').put(wallpaper)),
    ...conversionRecords.map(record => transaction.objectStore('conversionRecords').put(record)),
  ]);
  await transaction.done;
};

export const getObjectDiagnostics = async (): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  latestUpdatedAt: number | null;
  stores: Record<string, boolean>;
  indexes: Record<string, boolean>;
}> => {
  const objects = await getAllObjects();
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let latestUpdatedAt: number | null = null;

  objects.forEach(object => {
    byStatus[object.status] = (byStatus[object.status] ?? 0) + 1;
    byType[object.type] = (byType[object.type] ?? 0) + 1;
    latestUpdatedAt = Math.max(latestUpdatedAt ?? 0, object.updatedAt ?? object.createdAt ?? 0);
  });

  return {
    total: objects.length,
    byStatus,
    byType,
    latestUpdatedAt,
    stores: {
      objects: await hasObjectStore('objects'),
      folders: await hasObjectStore('folders'),
      settings: await hasObjectStore('settings'),
      wallpapers: await hasObjectStore('wallpapers'),
      conversionRecords: await hasObjectStore('conversionRecords'),
    },
    indexes: {
      'objects.status': await hasObjectStoreIndex('objects', 'status'),
      'objects.type': await hasObjectStoreIndex('objects', 'type'),
      'conversionRecords.convertedAt': await hasObjectStoreIndex('conversionRecords', 'convertedAt'),
    },
  };
};

// 恢复对象
export const restoreObject = async (id: string): Promise<void> => {
  const db = await getDB();
  const object = await db.get('objects', id);
  if (object) {
    object.status = 'active';
    object.updatedAt = Date.now();
    await db.put('objects', object);
  }
};

// 归档对象
export const archiveObject = async (id: string): Promise<void> => {
  const db = await getDB();
  const object = await db.get('objects', id);
  if (object) {
    object.status = 'archived';
    object.updatedAt = Date.now();
    await db.put('objects', object);
  }
};

// 设置项操作
export const getSetting = async (key: string): Promise<any> => {
  const db = await getDB();
  const setting = await db.get('settings', key);
  return setting?.value;
};

export const setSetting = async (key: string, value: any): Promise<void> => {
  const db = await getDB();
  await db.put('settings', { key, value });
};

// 函数别名 - 向后兼容
export const softDeleteObject = deleteObject;
export const getObjectById = getObject;
