import assert from 'node:assert/strict';
import type { AnyObject, Note, ObjectType } from '../types/objects';
import { DB_NAME, DB_VERSION } from '../db';
import { ensureCoreStores, getMigrationPlan } from '../db/migrations';
import { HolidayDataService } from '../providers/holiday/HolidayDataService';
import { assertWallpaperFile, isWallpaperMimeType, normalizeWallpaperName } from '../services/wallpaperService';
import { convertObjectType } from '../utils/objectConversion';
import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  normalizeImportedObject,
  prepareBackup,
} from '../utils/backup';
import {
  LEGACY_STORAGE_KEYS,
  migrateLegacyLocalStorage,
  normalizePersistedUIStorage,
  SETTINGS_STORAGE_VERSION,
  STORAGE_KEYS,
  UI_STORAGE_VERSION,
} from '../core/storage/storageKeys';

const baseNote: Note = {
  id: 'note-1',
  type: 'note',
  title: '临时想法',
  content: '先暂存',
  contentFormat: 'plain',
  createdAt: 100,
  updatedAt: 100,
  status: 'active',
  noteStage: 'inbox',
};

const targets: Exclude<ObjectType, 'note'>[] = ['todo', 'dailyTodo', 'event', 'anniversary', 'deadline'];

for (const target of targets) {
  const converted = convertObjectType(baseNote, target, { date: '2026-06-17T00:00:00.000Z' });
  assert.equal(converted.id, baseNote.id);
  assert.equal(converted.title, baseNote.title);
  assert.equal(converted.content, baseNote.content);
  assert.equal(converted.createdAt, baseNote.createdAt);
  assert.equal(converted.type, target);
  assert.equal(converted.conversionMeta?.at(-1)?.fromType, 'note');
  assert.equal(converted.conversionMeta?.at(-1)?.toType, target);

  const backToNote = convertObjectType(converted, 'note', { noteStage: 'inbox' });
  assert.equal(backToNote.id, baseNote.id);
  assert.equal(backToNote.type, 'note');
  assert.equal((backToNote as Note).noteStage, 'inbox');
  assert.equal(backToNote.conversionMeta?.at(-1)?.fromType, target);
  assert.equal(backToNote.conversionMeta?.at(-1)?.toType, 'note');
}

const trashed = { ...baseNote, status: 'trashed' as const };
assert.throws(() => convertObjectType(trashed, 'todo'), /已删除对象不能转换/);

const memoryStore = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => memoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => memoryStore.set(key, value),
    removeItem: (key: string) => memoryStore.delete(key),
    clear: () => memoryStore.clear(),
  },
  configurable: true,
});
Object.defineProperty(globalThis, 'window', {
  value: {
    dispatchEvent: () => undefined,
  },
  configurable: true,
});

memoryStore.set(LEGACY_STORAGE_KEYS.ui, JSON.stringify({ state: { sidebarCollapsed: true }, version: 1 }));
memoryStore.set(LEGACY_STORAGE_KEYS.settings, JSON.stringify({
  state: {
    wallpaperId: 'legacy-wallpaper',
    searchWidgets: { clock: true },
    qweather: { apiKey: 'legacy-secret' },
  },
  version: 6,
}));
const migrationResult = migrateLegacyLocalStorage(localStorage);
assert.deepEqual(migrationResult.migrated.sort(), ['settings', 'ui']);
const normalizedUi = JSON.parse(localStorage.getItem(STORAGE_KEYS.ui) ?? '{}');
assert.equal(normalizedUi.state.sidebarCollapsed, true);
assert.equal(normalizedUi.version, UI_STORAGE_VERSION);
const migratedSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) ?? '{}');
assert.equal(migratedSettings.state.wallpaperId, 'legacy-wallpaper');
assert.equal(migratedSettings.state.searchWidgets, undefined);
assert.equal(migratedSettings.state.qweather, undefined);
assert.equal(migratedSettings.version, SETTINGS_STORAGE_VERSION);
assert.match(localStorage.getItem(LEGACY_STORAGE_KEYS.settings) ?? '', /legacy-secret/);
assert.notEqual(localStorage.getItem(STORAGE_KEYS.migrationMarker), null);

const migratedUi = localStorage.getItem(STORAGE_KEYS.ui);
memoryStore.set(LEGACY_STORAGE_KEYS.ui, JSON.stringify({ state: { sidebarCollapsed: false }, version: 1 }));
const repeatedMigration = migrateLegacyLocalStorage(localStorage);
assert.equal(repeatedMigration.alreadyCompleted, true);
assert.equal(localStorage.getItem(STORAGE_KEYS.ui), migratedUi);
assert.equal(
  localStorage.getItem(LEGACY_STORAGE_KEYS.ui),
  JSON.stringify({ state: { sidebarCollapsed: false }, version: 1 }),
);

const priorityStore = new Map<string, string>([
  [STORAGE_KEYS.ui, JSON.stringify({ state: { sidebarCollapsed: false }, version: 1 })],
  [LEGACY_STORAGE_KEYS.ui, JSON.stringify({ state: { sidebarCollapsed: true }, version: 1 })],
]);
const priorityStorage = {
  getItem: (key: string) => priorityStore.get(key) ?? null,
  setItem: (key: string, value: string) => priorityStore.set(key, value),
};
const priorityResult = migrateLegacyLocalStorage(priorityStorage as Storage);
assert.equal(priorityResult.skipped.includes('ui'), true);
assert.equal(
  priorityStorage.getItem(STORAGE_KEYS.ui),
  JSON.stringify({ state: { sidebarCollapsed: false }, version: 1 }),
);
assert.equal(
  priorityStorage.getItem(LEGACY_STORAGE_KEYS.ui),
  JSON.stringify({ state: { sidebarCollapsed: true }, version: 1 }),
);

const normalizedLegacySections = normalizePersistedUIStorage({
  sidebarSections: [
    { type: 'todo', collapsed: true },
    { type: 'search', collapsed: true },
  ],
});
const normalizedSectionList = normalizedLegacySections?.state.sidebarSections as Array<{
  type: string;
  collapsed: boolean;
}>;
assert.equal(normalizedSectionList.some(section => section.type === 'search'), false);
assert.equal(normalizedSectionList.find(section => section.type === 'todo')?.collapsed, true);
assert.equal(normalizedSectionList.some(section => section.type === 'dailyTodo'), true);

const holidayService = new HolidayDataService([]);
assert.equal(holidayService.getHoliday(new Date('2028-10-01T00:00:00'))?.type, 'festival');
assert.equal(holidayService.getHoliday(new Date('2028-10-02T00:00:00')), null);

holidayService.setOverride('2028-10-02', {
  date: '2028-10-02',
  name: '国庆假期',
  type: 'holiday',
  source: '用户覆盖',
});
assert.equal(holidayService.getHoliday(new Date('2028-10-02T00:00:00'))?.type, 'holiday');

holidayService.setOverride('2028-10-02', null);
assert.equal(holidayService.getHoliday(new Date('2028-10-02T00:00:00')), null);

await holidayService.importDataset({
  _meta: {
    year: 2028,
    status: 'verified',
    source: 'test',
    verifiedAt: '2028-01-01T00:00:00.000Z',
  },
  holidays: [{
    date: '2028-12-31',
    name: '测试假期',
    type: 'holiday',
    source: 'test',
  }],
});
assert.equal(holidayService.getHoliday(new Date('2028-12-31T00:00:00'))?.name, '测试假期');

assert.equal(isWallpaperMimeType('image/png'), true);
assert.equal(isWallpaperMimeType('image/jpeg'), true);
assert.equal(isWallpaperMimeType('image/webp'), true);
assert.equal(isWallpaperMimeType('image/svg+xml'), false);
assert.equal(assertWallpaperFile(new File(['x'], 'test.png', { type: 'image/png' })), 'image/png');
assert.throws(() => assertWallpaperFile(new File(['x'], 'test.gif', { type: 'image/gif' })), /PNG|JPEG|WebP/);
assert.equal(normalizeWallpaperName('  黑洞壁纸  '), '黑洞壁纸');
assert.throws(() => normalizeWallpaperName('   '), /不能为空/);
assert.throws(() => normalizeWallpaperName('x'.repeat(81)), /80/);

assert.equal(DB_NAME, 'LifeTallyPageV0DB');
assert.equal(DB_VERSION, 3);
assert.deepEqual(getMigrationPlan(1, 3).map(migration => migration.version), [2, 3]);

const createFakeStore = (existingIndexes: string[] = []) => {
  const indexes = new Set(existingIndexes);
  return {
    createdIndexes: [] as string[],
    indexNames: {
      contains: (name: string) => indexes.has(name),
    },
    createIndex(name: string) {
      indexes.add(name);
      this.createdIndexes.push(name);
    },
  };
};

const fakeStores = new Map<string, ReturnType<typeof createFakeStore>>();
fakeStores.set('objects', createFakeStore(['type']));
const fakeDb = {
  objectStoreNames: {
    contains: (name: string) => fakeStores.has(name),
  },
  createObjectStore: (name: string) => {
    const store = createFakeStore();
    fakeStores.set(name, store);
    return store;
  },
};
const fakeTx = {
  objectStore: (name: string) => {
    const store = fakeStores.get(name);
    if (!store) throw new Error(`missing fake store ${name}`);
    return store;
  },
};

const existingObjectsStore = fakeStores.get('objects');
ensureCoreStores(fakeDb as any, fakeTx as any);
assert.equal(fakeStores.has('wallpapers'), true);
assert.equal(fakeStores.has('conversionRecords'), true);
assert.equal(fakeStores.get('objects'), existingObjectsStore);
assert.deepEqual(fakeStores.get('wallpapers')?.createdIndexes, ['updatedAt']);
assert.deepEqual(fakeStores.get('conversionRecords')?.createdIndexes, ['objectId', 'convertedAt']);
assert.equal(fakeStores.get('objects')?.createdIndexes.includes('status'), true);
assert.equal(fakeStores.get('objects')?.createdIndexes.includes('type'), false);

const demoNote = {
  ...baseNote,
  id: 'demo-note',
  noteType: 'knowledge',
  folderId: 'legacy-folder',
  noteStage: undefined,
} as unknown as AnyObject;

const imported = normalizeImportedObject(demoNote) as Note;
assert.equal(imported.type, 'note');
assert.equal(imported.noteStage, 'inbox');
assert.equal((imported as any).noteType, undefined);
assert.equal((imported as any).folderId, undefined);

const preparedV1 = prepareBackup({
  format: BACKUP_FORMAT,
  schemaVersion: BACKUP_SCHEMA_VERSION,
  appVersion: '0.1.0',
  exportedAt: '2026-08-04T00:00:00.000Z',
  data: {
    objects: [baseNote, { ...baseNote, title: '同 ID 后写入' }],
    wallpapers: [{
      id: 'wallpaper-1',
      name: '测试壁纸',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,eA==',
      createdAt: 1,
      updatedAt: 2,
    }],
    conversionRecords: [{
      id: 'conversion-1',
      objectId: baseNote.id,
      fromType: 'note',
      toType: 'todo',
      titleSnapshot: baseNote.title,
      convertedAt: 200,
    }],
    settings: {
      ui: { state: { sidebarCollapsed: false }, version: 1 },
      settings: {
        state: {
          wallpaperId: 'wallpaper-1',
          qweather: { apiKey: 'must-not-survive' },
        },
        version: 6,
      },
    },
    holidayOverrides: {},
  },
});
assert.equal(preparedV1.source, 'v1');
assert.equal(preparedV1.objects.length, 1);
assert.equal(preparedV1.objects[0].title, '同 ID 后写入');
assert.equal(preparedV1.wallpapers.length, 1);
assert.equal(preparedV1.conversionRecords.length, 1);
assert.equal((preparedV1.settings.settings as any).state.qweather, undefined);

const preparedLegacy = prepareBackup({
  version: '5.0.0',
  objects: [demoNote],
  settings: {
    ui: { state: {}, version: 1 },
    settings: { state: {}, version: 6 },
    holidayOverrides: {},
  },
});
assert.equal(preparedLegacy.source, 'legacy');
assert.equal((preparedLegacy.objects[0] as Note).noteStage, 'inbox');
assert.deepEqual(preparedLegacy.conversionRecords, []);

assert.throws(
  () => prepareBackup({ format: BACKUP_FORMAT, schemaVersion: 999, data: {} }),
  /不支持的备份版本/,
);
assert.throws(() => prepareBackup({ version: '5.0.0' }), /objects/);

const { useUIStore } = await import('../stores/useUIStore');
assert.equal(useUIStore.getState().viewMode, 'calendar');

console.log('unit tests passed');
