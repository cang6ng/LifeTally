import { getDB } from '../db';
import type { Wallpaper } from '../types/objects';

const supportedMimeTypes = new Set<Wallpaper['mimeType']>(['image/png', 'image/jpeg', 'image/webp']);

export const DEFAULT_WALLPAPER_URL = '/assets/default-wallpaper.png';

export const isWallpaperMimeType = (mimeType: string): mimeType is Wallpaper['mimeType'] => {
  return supportedMimeTypes.has(mimeType as Wallpaper['mimeType']);
};

export const assertWallpaperFile = (file: File): Wallpaper['mimeType'] => {
  if (!isWallpaperMimeType(file.type)) {
    throw new Error('仅支持 PNG、JPEG 或 WebP 图片');
  }
  return file.type;
};

export const normalizeWallpaperName = (name: string): string => {
  const normalized = name.trim();
  if (!normalized) {
    throw new Error('壁纸名称不能为空');
  }
  if (normalized.length > 80) {
    throw new Error('壁纸名称不能超过 80 个字符');
  }
  return normalized;
};

export const wallpaperService = {
  async getAll(): Promise<Wallpaper[]> {
    const db = await getDB();
    const wallpapers = await db.getAll('wallpapers');
    return wallpapers.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async getById(id: string): Promise<Wallpaper | undefined> {
    const db = await getDB();
    return db.get('wallpapers', id);
  },

  async saveFile(file: File): Promise<Wallpaper> {
    const mimeType = assertWallpaperFile(file);
    const now = Date.now();
    const wallpaper: Wallpaper = {
      id: crypto.randomUUID(),
      name: file.name || '本地壁纸',
      blob: file,
      mimeType,
      createdAt: now,
      updatedAt: now,
    };
    const db = await getDB();
    await db.put('wallpapers', wallpaper);
    return wallpaper;
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('wallpapers', id);
  },

  async rename(id: string, name: string): Promise<Wallpaper> {
    const nextName = normalizeWallpaperName(name);
    const db = await getDB();
    const wallpaper = await db.get('wallpapers', id);
    if (!wallpaper) {
      throw new Error('壁纸不存在');
    }
    const updated: Wallpaper = {
      ...wallpaper,
      name: nextName,
      updatedAt: Date.now(),
    };
    await db.put('wallpapers', updated);
    return updated;
  },
};
