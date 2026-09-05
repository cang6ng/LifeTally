import type { AnyObject, BaseObject, NoteStage, ObjectType } from '../types/objects';

export interface ConvertObjectOptions {
  date?: string;
  noteStage?: NoteStage;
}

const dateOnly = (value?: string): string => {
  if (!value) return new Date().toISOString();
  return value;
};

const stripExecutionFields = (object: BaseObject): BaseObject => {
  const clean = { ...object } as Record<string, unknown>;
  delete clean.date;
  delete clean.startDate;
  delete clean.endDate;
  delete clean.startTime;
  delete clean.endTime;
  delete clean.dueDate;
  delete clean.dueTime;
  delete clean.isCompleted;
  delete clean.urgency;
  delete clean.repeatRule;
  delete clean.linkedTodoId;
  delete clean.linkedNoteId;
  delete clean.linkedDate;
  delete clean.noteType;
  delete clean.folderId;
  return clean as unknown as BaseObject;
};

export const normalizeLifeObject = (object: AnyObject): AnyObject => {
  if (object.type !== 'note') return object;
  return {
    ...object,
    noteStage: object.noteStage ?? 'inbox',
  };
};

export const convertObjectType = (
  object: AnyObject,
  targetType: ObjectType,
  options: ConvertObjectOptions = {},
): AnyObject => {
  if (object.status === 'trashed') {
    throw new Error('已删除对象不能转换');
  }
  if (object.type === targetType) {
    return normalizeLifeObject(object);
  }
  if (object.type !== 'note' && targetType !== 'note') {
    throw new Error('非便利贴对象只能转回便利贴');
  }

  const now = Date.now();
  const conversionMeta = [
    ...(object.conversionMeta ?? []),
    { fromType: object.type, toType: targetType, convertedAt: now },
  ];
  const base = {
    ...stripExecutionFields(object),
    type: targetType,
    updatedAt: now,
    conversionMeta,
  } as BaseObject;
  const date = dateOnly(options.date);

  switch (targetType) {
    case 'note':
      return {
        ...base,
        type: 'note',
        noteStage: options.noteStage ?? 'inbox',
      };
    case 'todo':
      return {
        ...base,
        type: 'todo',
        date,
        isCompleted: false,
      };
    case 'dailyTodo':
      return {
        ...base,
        type: 'dailyTodo',
        isCompleted: false,
      };
    case 'event':
      return {
        ...base,
        type: 'event',
        startDate: date,
        date,
      };
    case 'anniversary':
      return {
        ...base,
        type: 'anniversary',
        date,
      };
    case 'deadline':
      return {
        ...base,
        type: 'deadline',
        dueDate: date,
        date,
        isCompleted: false,
      };
    default:
      throw new Error(`不支持的目标类型: ${targetType satisfies never}`);
  }
};
