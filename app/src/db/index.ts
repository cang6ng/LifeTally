import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { AnyObject, ConversionRecord, Folder, Wallpaper } from '../types/objects';
import { applyMigrationsWithTransaction, DB_VERSION, DB_NAME } from './migrations';

interface LifeTallyPageV0DBSchema extends DBSchema {
  objects: {
    key: string;
    value: AnyObject;
    indexes: {
      type: string;
      status: string;
      createdAt: number;
      updatedAt: number;
    };
  };
  folders: {
    key: string;
    value: Folder;
    indexes: {
      order: number;
      parentId: string;
    };
  };
  settings: {
    key: string;
    value: any;
  };
  wallpapers: {
    key: string;
    value: Wallpaper;
    indexes: {
      updatedAt: number;
    };
  };
  conversionRecords: {
    key: string;
    value: ConversionRecord;
    indexes: {
      objectId: string;
      convertedAt: number;
    };
  };
}

type LifeTallyPageV0StoreName = 'objects' | 'folders' | 'settings' | 'wallpapers' | 'conversionRecords';
type LifeTallyPageV0IndexName =
  | 'type'
  | 'date'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'order'
  | 'parentId'
  | 'objectId'
  | 'convertedAt';

export { DB_NAME, DB_VERSION };

let dbInstance: IDBPDatabase<LifeTallyPageV0DBSchema> | null = null;

export const initDB = async (): Promise<IDBPDatabase<LifeTallyPageV0DBSchema>> => {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<LifeTallyPageV0DBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      console.log(`Upgrading database from version ${oldVersion} to ${DB_VERSION}`);
      applyMigrationsWithTransaction(db as any, oldVersion, transaction as any);
    },
  });

  return dbInstance;
};

export const getDB = async (): Promise<IDBPDatabase<LifeTallyPageV0DBSchema>> => {
  if (!dbInstance) {
    return await initDB();
  }
  return dbInstance;
};

export const closeDB = (): void => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
};

export const hasObjectStore = async (storeName: LifeTallyPageV0StoreName): Promise<boolean> => {
  const db = await getDB();
  return db.objectStoreNames.contains(storeName);
};

export const hasObjectStoreIndex = async (
  storeName: LifeTallyPageV0StoreName,
  indexName: LifeTallyPageV0IndexName
): Promise<boolean> => {
  const db = await getDB();
  if (!db.objectStoreNames.contains(storeName)) return false;
  const tx = db.transaction(storeName);
  const indexNames = (tx.store as unknown as IDBObjectStore).indexNames;
  return indexNames.contains(indexName);
};
