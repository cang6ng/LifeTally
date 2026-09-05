import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AnyObject, BaseObject, ContentFormat, Note, NoteStage, ObjectStatus, ObjectType } from '../types/objects';
import * as db from '../db/operations';
import { convertObjectType as buildConvertedObject, normalizeLifeObject } from '../utils/objectConversion';
import { conversionRecordService } from '../services/conversionRecordService';

type CreateObjectInput = {
  type: ObjectType;
  title: string;
  content?: string;
  contentFormat?: ContentFormat;
  status?: ObjectStatus;
  [key: string]: unknown;
};

interface ObjectStore {
  objects: AnyObject[];
  selectedDate: Date | null;
  selectedObjectId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadObjects: () => Promise<void>;
  loadObjectsByType: (type: ObjectType) => Promise<void>;
  loadObjectsByDate: (date: Date) => Promise<void>;
  createObject: (object: CreateObjectInput) => Promise<AnyObject>;
  updateObject: (id: string, updates: Partial<AnyObject>) => Promise<void>;
  deleteObject: (id: string) => Promise<void>;
  restoreObject: (id: string) => Promise<void>;
  archiveObject: (id: string) => Promise<void>;
  setSelectedDate: (date: Date | null) => void;
  setSelectedObjectId: (id: string | null) => void;
  getObjectById: (id: string) => AnyObject | undefined;
  getActiveObjectsByType: (type: ObjectType) => AnyObject[];
  getObjectsByDate: (date: Date) => AnyObject[];
  getNotes: () => Note[];
  getConvertedFromNote: () => AnyObject[];
  convertObjectType: (id: string, targetType: ObjectType, options?: { date?: string; noteStage?: NoteStage }) => Promise<AnyObject>;
}

export const useObjectStore = create<ObjectStore>()(
  devtools(
    (set, get) => ({
      objects: [],
      selectedDate: new Date(),
      selectedObjectId: null,
      loading: false,
      error: null,

      loadObjects: async () => {
        set({ loading: true, error: null });
        try {
          const objects = await db.getAllActiveObjects();
          set({ objects: objects.map(normalizeLifeObject), loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load objects',
            loading: false
          });
        }
      },

      loadObjectsByType: async (type: ObjectType) => {
        set({ loading: true, error: null });
        try {
          const objects = await db.getObjectsByType(type);
          set({ objects: objects.map(normalizeLifeObject), loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load objects',
            loading: false
          });
        }
      },

      loadObjectsByDate: async (date: Date) => {
        set({ loading: true, error: null });
        try {
          const allObjects = (await db.getAllActiveObjects()).map(normalizeLifeObject);
          const filtered = allObjects.filter(obj => {
            const objDate = 'date' in obj ? obj.date :
                           'startDate' in obj ? obj.startDate :
                           'dueDate' in obj ? obj.dueDate :
                           'linkedDate' in obj ? obj.linkedDate : null;
            if (!objDate) return false;
            const dateObj = new Date(objDate);
            return (
              dateObj.getFullYear() === date.getFullYear() &&
              dateObj.getMonth() === date.getMonth() &&
              dateObj.getDate() === date.getDate()
            );
          });
          set({ objects: filtered, loading: false, selectedDate: date });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load objects',
            loading: false
          });
        }
      },

      createObject: async (objectData) => {
        set({ loading: true, error: null });
        try {
          const newObject: AnyObject = normalizeLifeObject({
            ...objectData,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: objectData.status || 'active',
            content: objectData.content ?? '',
            contentFormat: objectData.contentFormat ?? 'plain',
          } as AnyObject);

          // Notes are sticky inbox items in LifeTallyPage v0.
          if (newObject.type === 'note') {
            const note = newObject as Note;
            note.noteStage = note.noteStage ?? 'inbox';
            delete note.noteType;
            delete note.folderId;
          }
          if (newObject.type === 'event' && !(newObject as any).startDate) {
            (newObject as any).startDate = (objectData.date as string | undefined) ?? new Date().toISOString();
            (newObject as any).date = (newObject as any).startDate;
          }
          if (newObject.type === 'deadline' && !(newObject as any).dueDate) {
            (newObject as any).dueDate = (objectData.date as string | undefined) ?? new Date().toISOString();
            (newObject as any).date = (newObject as any).dueDate;
            (newObject as any).isCompleted = false;
          }
          if ((newObject.type === 'todo' || newObject.type === 'dailyTodo') && !('isCompleted' in newObject)) {
            (newObject as any).isCompleted = false;
          }

          await db.createObject(newObject);
          set(state => ({
            objects: [...state.objects, newObject],
            loading: false
          }));
          return newObject;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create object',
            loading: false
          });
          throw error;
        }
      },

      updateObject: async (id, updates) => {
        set({ loading: true, error: null });
        try {
          await db.updateObject(id, updates);
          set(state => ({
            objects: state.objects.map(obj =>
              obj.id === id ? ({ ...obj, ...updates, updatedAt: Date.now() } as AnyObject) : obj
            ),
            loading: false
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update object',
            loading: false
          });
          throw error;
        }
      },

      deleteObject: async (id) => {
        set({ loading: true, error: null });
        try {
          await db.softDeleteObject(id);
          set(state => ({
            objects: state.objects.filter(obj => obj.id !== id),
            loading: false
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete object',
            loading: false
          });
          throw error;
        }
      },

      restoreObject: async (id) => {
        set({ loading: true, error: null });
        try {
          await db.restoreObject(id);
          const restored = await db.getObjectById(id);
          if (restored) {
            set(state => ({
              objects: [...state.objects, normalizeLifeObject(restored)],
              loading: false
            }));
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to restore object',
            loading: false
          });
          throw error;
        }
      },

      archiveObject: async (id) => {
        set({ loading: true, error: null });
        try {
          await db.archiveObject(id);
          set(state => ({
            objects: state.objects.filter(obj => obj.id !== id),
            loading: false
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to archive object',
            loading: false
          });
          throw error;
        }
      },

      setSelectedDate: (date) => {
        set({ selectedDate: date });
      },

      setSelectedObjectId: (id) => {
        set({ selectedObjectId: id });
      },

      getObjectById: (id) => {
        return get().objects.find(obj => obj.id === id);
      },

      getActiveObjectsByType: (type) => {
        return get().objects.filter(obj =>
          obj.type === type && obj.status === 'active'
        );
      },

      getObjectsByDate: (date) => {
        return get().objects.filter(obj => {
          const objDate = 'date' in obj ? obj.date :
                         'startDate' in obj ? obj.startDate :
                         'dueDate' in obj ? obj.dueDate :
                         'linkedDate' in obj ? obj.linkedDate : null;
          if (!objDate) return false;
          const dateObj = new Date(objDate);
          return (
            dateObj.getFullYear() === date.getFullYear() &&
            dateObj.getMonth() === date.getMonth() &&
            dateObj.getDate() === date.getDate()
          );
        });
      },

      getNotes: () => {
        return get().objects.filter(obj =>
          obj.type === 'note' &&
          obj.status === 'active'
        ) as Note[];
      },

      getConvertedFromNote: () => {
        return get().objects.filter(obj =>
          obj.status === 'active' &&
          obj.type !== 'note' &&
          obj.conversionMeta?.some(meta => meta.fromType === 'note')
        );
      },

      convertObjectType: async (id, targetType, options = {}) => {
        const object = get().getObjectById(id);
        if (!object) {
          throw new Error('Object not found');
        }
        const fromType = object.type;
          const converted = buildConvertedObject(object, targetType, {
          ...options,
          noteStage: targetType === 'note' ? 'inbox' : options.noteStage,
        });
        await db.replaceObject(converted);
        try {
          await conversionRecordService.add({
            objectId: converted.id,
            fromType,
            toType: targetType,
            titleSnapshot: object.title,
            convertedAt: converted.updatedAt,
          });
        } catch (error) {
          console.warn('Failed to write conversion record:', error);
        }
        set(state => ({
          objects: state.objects.map(obj => obj.id === id ? converted : obj),
          loading: false,
        }));
        return converted;
      },
    }),
    { name: 'ObjectStore' }
  )
);
