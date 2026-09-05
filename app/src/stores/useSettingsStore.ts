import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  migrateLegacyLocalStorage,
  normalizePersistedSettingsStorage,
  SETTINGS_STORAGE_VERSION,
  STORAGE_KEYS,
} from '../core/storage/storageKeys';

migrateLegacyLocalStorage();

type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsStore {
  theme: ThemeMode;
  wallpaperId?: string;
  glassStrength: number;
  fontSize: 'small' | 'medium' | 'large';
  autoSaveInterval: number;
  language: 'zh-CN' | 'en-US';
  objectColors: {
    anniversary: string;
    event: string;
    deadline: string;
    note: string;
    todo: string;
  };

  setTheme: (theme: ThemeMode) => void;
  setWallpaperId: (id?: string) => void;
  setGlassStrength: (strength: number) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setAutoSaveInterval: (seconds: number) => void;
  setLanguage: (lang: 'zh-CN' | 'en-US') => void;
  setObjectColor: (type: keyof SettingsStore['objectColors'], color: string) => void;
  resetToDefaults: () => void;
}

const defaultSettings = {
  theme: 'system' as ThemeMode,
  wallpaperId: undefined,
  glassStrength: 50,
  fontSize: 'medium' as const,
  autoSaveInterval: 3,
  language: 'zh-CN' as const,
  objectColors: {
    anniversary: '#ff4d7f',
    event: '#faad14',
    deadline: '#ff4d4f',
    note: '#8c8c8c',
    todo: '#1890ff',
  },
};

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set) => ({
        ...defaultSettings,

        setTheme: (theme) => set({ theme }),
        setWallpaperId: (id) => set({ wallpaperId: id }),
        setGlassStrength: (strength) => set({ glassStrength: Math.max(0, Math.min(100, strength)) }),
        setFontSize: (size) => set({ fontSize: size }),
        setAutoSaveInterval: (seconds) => set({ autoSaveInterval: Math.max(1, seconds) }),
        setLanguage: (lang) => set({ language: lang }),
        setObjectColor: (type, color) => {
          set(state => ({
            objectColors: {
              ...state.objectColors,
              [type]: color,
            },
          }));
        },
        resetToDefaults: () => set(defaultSettings),
      }),
      {
        name: STORAGE_KEYS.settings,
        version: SETTINGS_STORAGE_VERSION,
        migrate: (persistedState: unknown) =>
          normalizePersistedSettingsStorage(persistedState)?.state ?? {},
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<SettingsStore>;
          return {
            ...currentState,
            ...persisted,
            objectColors: {
              ...currentState.objectColors,
              ...(persisted.objectColors ?? {}),
            },
          };
        },
      }
    ),
    { name: 'SettingsStore' }
  )
);
