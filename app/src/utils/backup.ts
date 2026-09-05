import type {
  AnyObject,
  ConversionRecord,
  ObjectStatus,
  ObjectType,
  Wallpaper,
} from '../types/objects';
import type { HolidayInfo } from '../providers/holiday/HolidayProvider';
import * as db from '../db/operations';
import { exportHolidayOverrides, importHolidayOverrides } from './holidayUtils';
import { normalizeLifeObject } from './objectConversion';
import { isWallpaperMimeType, wallpaperService } from '../services/wallpaperService';
import { conversionRecordService } from '../services/conversionRecordService';
import {
  normalizePersistedSettingsStorage,
  normalizePersistedUIStorage,
  STORAGE_KEYS,
} from '../core/storage/storageKeys';

export const BACKUP_FORMAT = 'lifetally-backup' as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;
export const APP_VERSION = '0.1.0';

const objectTypes = new Set<ObjectType>([
  'anniversary',
  'event',
  'deadline',
  'note',
  'todo',
  'dailyTodo',
]);
const objectStatuses = new Set<ObjectStatus>(['active', 'archived', 'trashed']);

export interface WallpaperBackup {
  id: string;
  name: string;
  mimeType: Wallpaper['mimeType'];
  dataUrl: string;
  createdAt: number;
  updatedAt: number;
}

export interface BackupSettings {
  ui?: unknown;
  settings?: unknown;
}

export interface LifeTallyBackupV1 {
  format: typeof BACKUP_FORMAT;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  appVersion: string;
  exportedAt: string;
  data: {
    objects: AnyObject[];
    wallpapers: WallpaperBackup[];
    conversionRecords: ConversionRecord[];
    settings: BackupSettings;
    holidayOverrides: Record<string, HolidayInfo | null>;
  };
}

export interface LegacyBackupData {
  version?: string;
  exportDate?: string;
  appName?: string;
  objects: AnyObject[];
  settings?: Record<string, unknown>;
  wallpapers?: WallpaperBackup[];
  conversionRecords?: ConversionRecord[];
}

export interface PreparedBackup {
  objects: AnyObject[];
  wallpapers: Wallpaper[];
  conversionRecords: ConversionRecord[];
  settings: BackupSettings;
  holidayOverrides: Record<string, HolidayInfo | null>;
  source: 'v1' | 'legacy';
}

export interface ImportBackupResult {
  source: PreparedBackup['source'];
  objects: number;
  wallpapers: number;
  conversionRecords: number;
  settingsImported: boolean;
  warnings: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isObjectType = (value: unknown): value is ObjectType =>
  typeof value === 'string' && objectTypes.has(value as ObjectType);

const isFiniteTimestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const cloneJsonValue = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
};

const readStoredJson = (key: string): unknown => {
  if (typeof localStorage === 'undefined') return undefined;
  const raw = localStorage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const sanitizePersistedSettings = (value: unknown): unknown | undefined =>
  normalizePersistedSettingsStorage(cloneJsonValue(value));

const blobToDataUrl = async (blob: Blob, mimeType: string): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
};

const dataUrlToBlob = (dataUrl: string, expectedMimeType: string): Blob => {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error('壁纸数据不是有效的 data URL');

  const [, mimeType, base64] = match;
  if (mimeType !== expectedMimeType) throw new Error('壁纸 MIME 类型不一致');

  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new Error('壁纸 Base64 数据无效');
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
};

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
  const result = new Map<string, T>();
  items.forEach(item => result.set(item.id, item));
  return [...result.values()];
};

export const normalizeImportedObject = (value: AnyObject): AnyObject => {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim()) {
    throw new Error('备份中存在缺少 id 的对象');
  }
  if (!isObjectType(value.type)) {
    throw new Error(`对象 ${value.id} 的类型无效`);
  }

  const now = Date.now();
  const status = objectStatuses.has(value.status as ObjectStatus)
    ? value.status as ObjectStatus
    : 'active';
  const normalized = normalizeLifeObject({
    ...value,
    id: value.id.trim(),
    title: typeof value.title === 'string' ? value.title : '',
    content: typeof value.content === 'string' ? value.content : '',
    contentFormat: value.contentFormat === 'markdown' ? 'markdown' : 'plain',
    status,
    createdAt: isFiniteTimestamp(value.createdAt) ? value.createdAt : now,
    updatedAt: isFiniteTimestamp(value.updatedAt)
      ? value.updatedAt
      : isFiniteTimestamp(value.createdAt) ? value.createdAt : now,
  } as AnyObject);

  if (normalized.type === 'note') {
    const note = normalized as AnyObject & Record<string, unknown>;
    note.noteStage = 'inbox';
    delete note.noteType;
    delete note.folderId;
  }

  return normalized;
};

const normalizeWallpaperNameForImport = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return '本地壁纸';
  return value.trim().slice(0, 80);
};

const normalizeWallpaperBackup = (value: unknown): Wallpaper => {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim()) {
    throw new Error('备份中存在缺少 id 的壁纸');
  }
  const mimeType = String(value.mimeType);
  if (!isWallpaperMimeType(mimeType)) {
    throw new Error(`壁纸 ${value.id} 的 MIME 类型不受支持`);
  }
  if (typeof value.dataUrl !== 'string') {
    throw new Error(`壁纸 ${value.id} 缺少图片数据`);
  }

  const now = Date.now();
  return {
    id: value.id.trim(),
    name: normalizeWallpaperNameForImport(value.name),
    mimeType,
    blob: dataUrlToBlob(value.dataUrl, mimeType),
    createdAt: isFiniteTimestamp(value.createdAt) ? value.createdAt : now,
    updatedAt: isFiniteTimestamp(value.updatedAt)
      ? value.updatedAt
      : isFiniteTimestamp(value.createdAt) ? value.createdAt : now,
  };
};

const normalizeConversionRecord = (value: unknown): ConversionRecord => {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim()) {
    throw new Error('备份中存在缺少 id 的转换记录');
  }
  if (typeof value.objectId !== 'string' || !value.objectId.trim()) {
    throw new Error(`转换记录 ${value.id} 缺少 objectId`);
  }
  if (!isObjectType(value.fromType) || !isObjectType(value.toType)) {
    throw new Error(`转换记录 ${value.id} 的对象类型无效`);
  }
  if (!isFiniteTimestamp(value.convertedAt)) {
    throw new Error(`转换记录 ${value.id} 的时间无效`);
  }

  return {
    id: value.id.trim(),
    objectId: value.objectId.trim(),
    fromType: value.fromType,
    toType: value.toType,
    titleSnapshot: typeof value.titleSnapshot === 'string' ? value.titleSnapshot : '',
    convertedAt: value.convertedAt,
  };
};

const normalizeHolidayOverrides = (value: unknown): Record<string, HolidayInfo | null> =>
  isRecord(value) ? value as Record<string, HolidayInfo | null> : {};

export const prepareBackup = (input: unknown): PreparedBackup => {
  if (!isRecord(input)) throw new Error('备份文件根节点必须是对象');

  let source: PreparedBackup['source'];
  let objects: unknown;
  let wallpapers: unknown;
  let conversionRecords: unknown;
  let settings: BackupSettings;
  let holidayOverrides: unknown;

  if (input.format === BACKUP_FORMAT) {
    if (input.schemaVersion !== BACKUP_SCHEMA_VERSION) {
      throw new Error(`不支持的备份版本：${String(input.schemaVersion)}`);
    }
    if (!isRecord(input.data)) throw new Error('备份缺少 data 节点');
    source = 'v1';
    objects = input.data.objects;
    wallpapers = input.data.wallpapers;
    conversionRecords = input.data.conversionRecords;
    settings = isRecord(input.data.settings) ? input.data.settings : {};
    holidayOverrides = input.data.holidayOverrides;
  } else {
    source = 'legacy';
    objects = input.objects;
    wallpapers = input.wallpapers ?? [];
    conversionRecords = input.conversionRecords ?? [];
    const legacySettings = isRecord(input.settings) ? input.settings : {};
    settings = {
      ui: legacySettings.ui,
      settings: legacySettings.settings,
    };
    holidayOverrides = legacySettings.holidayOverrides;
  }

  if (!Array.isArray(objects)) throw new Error('备份缺少 objects 数组');
  if (!Array.isArray(wallpapers)) throw new Error('备份中的 wallpapers 必须是数组');
  if (!Array.isArray(conversionRecords)) {
    throw new Error('备份中的 conversionRecords 必须是数组');
  }

  return {
    source,
    objects: dedupeById(objects.map(item => normalizeImportedObject(item as AnyObject))),
    wallpapers: dedupeById(wallpapers.map(normalizeWallpaperBackup)),
    conversionRecords: dedupeById(conversionRecords.map(normalizeConversionRecord)),
    settings: {
      ui: normalizePersistedUIStorage(cloneJsonValue(settings.ui)),
      settings: sanitizePersistedSettings(settings.settings),
    },
    holidayOverrides: normalizeHolidayOverrides(holidayOverrides),
  };
};

export const exportWallpapersForBackup = async (): Promise<WallpaperBackup[]> => {
  const wallpapers = await wallpaperService.getAll();
  return Promise.all(wallpapers.map(async wallpaper => ({
    id: wallpaper.id,
    name: wallpaper.name,
    mimeType: wallpaper.mimeType,
    dataUrl: await blobToDataUrl(wallpaper.blob, wallpaper.mimeType),
    createdAt: wallpaper.createdAt,
    updatedAt: wallpaper.updatedAt,
  })));
};

export async function exportData(): Promise<LifeTallyBackupV1> {
  const [objects, wallpapers, conversionRecords] = await Promise.all([
    db.getAllObjects(),
    exportWallpapersForBackup(),
    conversionRecordService.getAll(),
  ]);

  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      objects,
      wallpapers,
      conversionRecords,
      settings: {
        ui: normalizePersistedUIStorage(readStoredJson(STORAGE_KEYS.ui)),
        settings: sanitizePersistedSettings(readStoredJson(STORAGE_KEYS.settings)),
      },
      holidayOverrides: exportHolidayOverrides(),
    },
  };
}

export async function importData(input: unknown): Promise<ImportBackupResult> {
  const prepared = prepareBackup(input);
  await db.mergeCoreBackupData({
    objects: prepared.objects,
    wallpapers: prepared.wallpapers,
    conversionRecords: prepared.conversionRecords,
  });

  const warnings: string[] = [];
  let settingsImported = false;
  if (typeof localStorage !== 'undefined') {
    try {
      if (prepared.settings.ui !== undefined) {
        localStorage.setItem(STORAGE_KEYS.ui, JSON.stringify(prepared.settings.ui));
      }
      if (prepared.settings.settings !== undefined) {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(prepared.settings.settings));
      }
      localStorage.setItem(STORAGE_KEYS.migrationMarker, JSON.stringify({
        version: 1,
        importedAt: Date.now(),
      }));
      settingsImported = true;
    } catch (error) {
      console.warn('备份核心数据已导入，但设置写入失败', error);
      warnings.push('核心数据已合并，但部分页面设置未能写入');
    }
  }

  try {
    importHolidayOverrides(prepared.holidayOverrides);
  } catch (error) {
    console.warn('备份核心数据已导入，但假期覆盖写入失败', error);
    warnings.push('核心数据已合并，但假期覆盖未能写入');
  }

  return {
    source: prepared.source,
    objects: prepared.objects.length,
    wallpapers: prepared.wallpapers.length,
    conversionRecords: prepared.conversionRecords.length,
    settingsImported,
    warnings,
  };
}

export async function downloadBackup(): Promise<void> {
  const backup = await exportData();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `LifeTally-Backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function uploadBackup(): Promise<ImportBackupResult> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async event => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('未选择备份文件'));
        return;
      }
      try {
        resolve(await importData(JSON.parse(await file.text())));
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}

export async function getBackupStats(): Promise<{
  totalObjects: number;
  objectsByType: Record<string, number>;
  oldestObject: string | null;
  newestObject: string | null;
}> {
  const objects = await db.getAllObjects();
  const objectsByType: Record<string, number> = {};
  objects.forEach(object => {
    objectsByType[object.type] = (objectsByType[object.type] || 0) + 1;
  });
  const sortedByDate = [...objects].sort((a, b) => a.createdAt - b.createdAt);
  return {
    totalObjects: objects.length,
    objectsByType,
    oldestObject: sortedByDate[0]?.createdAt
      ? new Date(sortedByDate[0].createdAt).toISOString()
      : null,
    newestObject: sortedByDate.at(-1)?.createdAt
      ? new Date(sortedByDate.at(-1)!.createdAt).toISOString()
      : null,
  };
}
