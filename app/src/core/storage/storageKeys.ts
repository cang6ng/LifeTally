export const STORAGE_KEYS = {
  ui: 'lifetally:v0:ui',
  settings: 'lifetally:v0:settings',
  holidayCache: 'lifetally:v0:holiday-cache:v1',
  holidayOverrides: 'lifetally:v0:holiday-overrides:v1',
  migrationMarker: 'lifetally:v0:storage-migrated:v1',
} as const;

export const LEGACY_STORAGE_KEYS = {
  ui: 'ui-storage',
  settings: 'settings-storage',
  holidayCache: 'lifetally-holiday-cache-v1',
  holidayOverrides: 'lifetally-holiday-overrides-v1',
} as const;

export const UI_STORAGE_VERSION = 2;
export const SETTINGS_STORAGE_VERSION = 7;

type StorageKeyName = keyof typeof LEGACY_STORAGE_KEYS;

type JsonRecord = Record<string, unknown>;

export interface PersistedStorageEnvelope {
  state: JsonRecord;
  version: number;
}

const sidebarSectionTypes = [
  'anniversary',
  'event',
  'deadline',
  'note',
  'todo',
  'dailyTodo',
] as const;

const sidebarSectionTypeSet = new Set<string>(sidebarSectionTypes);

const settingObjectColorTypes = new Set([
  'anniversary',
  'event',
  'deadline',
  'note',
  'todo',
]);

export interface StorageMigrationResult {
  migrated: StorageKeyName[];
  skipped: StorageKeyName[];
  alreadyCompleted: boolean;
}

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const getPersistedState = (value: JsonRecord): JsonRecord =>
  isRecord(value.state) ? value.state : value;

export const normalizePersistedUIStorage = (
  value: unknown
): PersistedStorageEnvelope | undefined => {
  if (!isRecord(value)) return undefined;
  const source = getPersistedState(value);
  const state: JsonRecord = {};

  if (typeof source.sidebarCollapsed === 'boolean') {
    state.sidebarCollapsed = source.sidebarCollapsed;
  }

  if (Array.isArray(source.sidebarSections)) {
    const collapsedByType = new Map(
      source.sidebarSections
        .filter(isRecord)
        .filter(section =>
          typeof section.type === 'string' && sidebarSectionTypeSet.has(section.type)
        )
        .map(section => [section.type as string, section.collapsed === true] as const)
    );
    state.sidebarSections = sidebarSectionTypes.map(type => ({
      type,
      collapsed: collapsedByType.get(type) ?? false,
    }));
  }

  return { state, version: UI_STORAGE_VERSION };
};

export const normalizePersistedSettingsStorage = (
  value: unknown
): PersistedStorageEnvelope | undefined => {
  if (!isRecord(value)) return undefined;
  const source = getPersistedState(value);
  const state: JsonRecord = {};

  if (['light', 'dark', 'system'].includes(String(source.theme))) {
    state.theme = source.theme;
  }
  if (typeof source.wallpaperId === 'string' && source.wallpaperId) {
    state.wallpaperId = source.wallpaperId;
  }
  if (typeof source.glassStrength === 'number' && Number.isFinite(source.glassStrength)) {
    state.glassStrength = Math.max(0, Math.min(100, source.glassStrength));
  }
  if (['small', 'medium', 'large'].includes(String(source.fontSize))) {
    state.fontSize = source.fontSize;
  }
  if (typeof source.autoSaveInterval === 'number' && Number.isFinite(source.autoSaveInterval)) {
    state.autoSaveInterval = Math.max(1, source.autoSaveInterval);
  }
  if (['zh-CN', 'en-US'].includes(String(source.language))) {
    state.language = source.language;
  }
  if (isRecord(source.objectColors)) {
    state.objectColors = Object.fromEntries(
      Object.entries(source.objectColors).filter(
        ([type, color]) => settingObjectColorTypes.has(type) && typeof color === 'string'
      )
    );
  }

  return { state, version: SETTINGS_STORAGE_VERSION };
};

const normalizeLegacyValue = (name: StorageKeyName, raw: string): unknown | undefined => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (name === 'ui') return normalizePersistedUIStorage(parsed);
  if (name === 'settings') return normalizePersistedSettingsStorage(parsed);
  return isRecord(parsed) ? parsed : undefined;
};

/**
 * Copies compatible values from the old shared keys into the v0 namespace.
 * Legacy keys are deliberately kept because another LifeTally build may still
 * rely on them. Once the marker is written, v0 never reads those keys again.
 */
export const migrateLegacyLocalStorage = (
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined =
    typeof localStorage === 'undefined' ? undefined : localStorage,
): StorageMigrationResult => {
  const result: StorageMigrationResult = {
    migrated: [],
    skipped: [],
    alreadyCompleted: false,
  };

  if (!storage) return result;

  try {
    if (storage.getItem(STORAGE_KEYS.migrationMarker)) {
      result.alreadyCompleted = true;
      return result;
    }

    (Object.keys(LEGACY_STORAGE_KEYS) as StorageKeyName[]).forEach(name => {
      if (storage.getItem(STORAGE_KEYS[name]) !== null) {
        result.skipped.push(name);
        return;
      }

      const legacyValue = storage.getItem(LEGACY_STORAGE_KEYS[name]);
      if (legacyValue === null) {
        result.skipped.push(name);
        return;
      }

      const normalized = normalizeLegacyValue(name, legacyValue);
      if (normalized === undefined) {
        result.skipped.push(name);
        return;
      }

      storage.setItem(STORAGE_KEYS[name], JSON.stringify(normalized));
      result.migrated.push(name);
    });

    storage.setItem(STORAGE_KEYS.migrationMarker, JSON.stringify({
      version: 1,
      migratedAt: Date.now(),
    }));
  } catch (error) {
    console.warn('[storage] 旧 localStorage 数据迁移失败，已保留原数据', error);
  }

  return result;
};
