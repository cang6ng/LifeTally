import type { IDBPDatabase } from 'idb';

export const DB_VERSION = 3;
export const DB_NAME = 'LifeTallyPageV0DB';

type UpgradeTransaction = {
  objectStore: (name: string) => IDBObjectStore;
};

export interface Migration {
  version: number;
  name: string;
  migrate: (db: IDBPDatabase, tx: UpgradeTransaction) => void;
}

const ensureIndex = (store: IDBObjectStore, name: string, keyPath: string): void => {
  if (!store.indexNames.contains(name)) {
    store.createIndex(name, keyPath, { unique: false });
  }
};

const getOrCreateStore = (
  db: IDBPDatabase,
  tx: UpgradeTransaction,
  name: string,
  options: IDBObjectStoreParameters
): IDBObjectStore => {
  if (db.objectStoreNames.contains(name)) {
    return tx.objectStore(name);
  }
  return db.createObjectStore(name, options) as unknown as IDBObjectStore;
};

const ensureObjectsStore = (db: IDBPDatabase, tx: UpgradeTransaction): void => {
  const store = getOrCreateStore(db, tx, 'objects', { keyPath: 'id' });

  ensureIndex(store, 'type', 'type');
  ensureIndex(store, 'date', 'date');
  ensureIndex(store, 'status', 'status');
  ensureIndex(store, 'createdAt', 'createdAt');
  ensureIndex(store, 'updatedAt', 'updatedAt');
};

const ensureFoldersStore = (db: IDBPDatabase, tx: UpgradeTransaction): void => {
  const store = getOrCreateStore(db, tx, 'folders', { keyPath: 'id' });

  ensureIndex(store, 'order', 'order');
  ensureIndex(store, 'parentId', 'parentId');
};

const ensureWallpapersStore = (db: IDBPDatabase, tx: UpgradeTransaction): void => {
  const store = getOrCreateStore(db, tx, 'wallpapers', { keyPath: 'id' });

  ensureIndex(store, 'updatedAt', 'updatedAt');
};

const ensureConversionRecordsStore = (db: IDBPDatabase, tx: UpgradeTransaction): void => {
  const store = getOrCreateStore(db, tx, 'conversionRecords', { keyPath: 'id' });

  ensureIndex(store, 'objectId', 'objectId');
  ensureIndex(store, 'convertedAt', 'convertedAt');
};

export const ensureCoreStores = (db: IDBPDatabase, tx: UpgradeTransaction): void => {
  ensureObjectsStore(db, tx);
  ensureFoldersStore(db, tx);

  if (!db.objectStoreNames.contains('settings')) {
    db.createObjectStore('settings', { keyPath: 'key' });
  }

  ensureWallpapersStore(db, tx);
  ensureConversionRecordsStore(db, tx);
};

const migration_v1: Migration = {
  version: 1,
  name: 'Initial v0 isolated schema',
  migrate: ensureCoreStores,
};

const migration_v2: Migration = {
  version: 2,
  name: 'Ensure conversion records store',
  migrate: ensureConversionRecordsStore,
};

const migration_v3: Migration = {
  version: 3,
  name: 'Repair stable core stores and indexes',
  migrate: ensureCoreStores,
};

export const migrations: Migration[] = [migration_v1, migration_v2, migration_v3];

export function getMigrationPlan(
  currentVersion: number,
  targetVersion: number
): Migration[] {
  return migrations.filter(
    (migration) => migration.version > currentVersion && migration.version <= targetVersion
  );
}

export function applyMigrationsWithTransaction(
  db: IDBPDatabase,
  oldVersion: number,
  tx: UpgradeTransaction
): void {
  for (const migration of getMigrationPlan(oldVersion, DB_VERSION)) {
    migration.migrate(db, tx);
  }
}
