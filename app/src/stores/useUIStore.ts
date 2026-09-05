import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  migrateLegacyLocalStorage,
  normalizePersistedUIStorage,
  STORAGE_KEYS,
  UI_STORAGE_VERSION,
} from '../core/storage/storageKeys';

migrateLegacyLocalStorage();

type ViewMode = 'calendar' | 'editor' | 'notes' | 'wallpapers';

interface SidebarSection {
  type: 'anniversary' | 'event' | 'deadline' | 'note' | 'todo' | 'dailyTodo';
  collapsed: boolean;
}

interface UIStore {
  viewMode: ViewMode;
  currentMonth: Date;
  sidebarCollapsed: boolean;
  sidebarSections: SidebarSection[];

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setCurrentMonth: (date: Date) => void;
  goToToday: () => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  toggleSidebar: () => void;
  toggleSidebarSection: (type: SidebarSection['type']) => void;
  collapseSidebarSection: (type: SidebarSection['type']) => void;
  expandSidebarSection: (type: SidebarSection['type']) => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        viewMode: 'calendar',
        currentMonth: new Date(),
        sidebarCollapsed: false,
        sidebarSections: [
          { type: 'anniversary', collapsed: false },
          { type: 'event', collapsed: false },
          { type: 'deadline', collapsed: false },
          { type: 'todo', collapsed: false },
          { type: 'dailyTodo', collapsed: false },
          { type: 'note', collapsed: false },
        ],

        setViewMode: (mode) => {
          set({ viewMode: mode });
        },

        setCurrentMonth: (date) => {
          set({ currentMonth: date });
        },

        goToToday: () => {
          set({ currentMonth: new Date() });
        },

        goToPreviousMonth: () => {
          set(state => {
            const newDate = new Date(state.currentMonth);
            newDate.setMonth(newDate.getMonth() - 1);
            return { currentMonth: newDate };
          });
        },

        goToNextMonth: () => {
          set(state => {
            const newDate = new Date(state.currentMonth);
            newDate.setMonth(newDate.getMonth() + 1);
            return { currentMonth: newDate };
          });
        },

        toggleSidebar: () => {
          set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }));
        },

        toggleSidebarSection: (type) => {
          set(state => ({
            sidebarSections: state.sidebarSections.map(section =>
              section.type === type
                ? { ...section, collapsed: !section.collapsed }
                : section
            ),
          }));
        },

        collapseSidebarSection: (type) => {
          set(state => ({
            sidebarSections: state.sidebarSections.map(section =>
              section.type === type ? { ...section, collapsed: true } : section
            ),
          }));
        },

        expandSidebarSection: (type) => {
          set(state => ({
            sidebarSections: state.sidebarSections.map(section =>
              section.type === type ? { ...section, collapsed: false } : section
            ),
          }));
        },
      }),
      {
        name: STORAGE_KEYS.ui,
        version: UI_STORAGE_VERSION,
        partialize: (state) => ({
          sidebarSections: state.sidebarSections,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
        migrate: (persistedState: unknown) =>
          normalizePersistedUIStorage(persistedState)?.state ?? {},
      }
    ),
    { name: 'UIStore' }
  )
);
