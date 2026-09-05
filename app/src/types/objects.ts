// 六种核心对象类型
export type ObjectType = 'anniversary' | 'event' | 'deadline' | 'note' | 'todo' | 'dailyTodo';

// 对象状态（软删除）
export type ObjectStatus = 'active' | 'archived' | 'trashed';

// 内容格式
export type ContentFormat = 'plain' | 'markdown';

// 重复规则频率
export type RepeatFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

// 紧迫度
export type Urgency = 'high' | 'medium' | 'low';

export type NoteStage = 'inbox';

export interface ConversionMeta {
  fromType: ObjectType;
  toType: ObjectType;
  convertedAt: number;
}

export interface ConversionRecord {
  id: string;
  objectId: string;
  fromType: ObjectType;
  toType: ObjectType;
  titleSnapshot: string;
  convertedAt: number;
}

// 重复规则接口
export interface RepeatRule {
  frequency: RepeatFrequency;
  interval?: number;
  endDate?: string;
}

// 基础对象接口 - 所有对象的基类
export interface BaseObject {
  id: string;
  type: ObjectType;
  title: string;
  content: string;
  contentFormat: ContentFormat;
  createdAt: number;
  updatedAt: number;
  status: ObjectStatus;
  tags?: string[];
  emoji?: string;
  conversionMeta?: ConversionMeta[];
}

// 纪念日
export interface Anniversary extends BaseObject {
  type: 'anniversary';
  date: string;
  repeatRule?: RepeatRule;
  countdown?: boolean;
}

// 事件
export interface Event extends BaseObject {
  type: 'event';
  startDate: string;
  date?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  location?: string;
  repeatRule?: RepeatRule;
}

// Deadline
export interface Deadline extends BaseObject {
  type: 'deadline';
  dueDate: string;
  date?: string;
  dueTime?: string;
  isCompleted: boolean;
  urgency?: Urgency;
}

// Legacy note fields are kept optional for old Demo data only.
export type NoteType = 'calendar' | 'knowledge';

// 便利贴（内部类型名保持 note，避免破坏既有数据）
export interface Note extends BaseObject {
  type: 'note';
  noteStage: NoteStage;
  noteType?: NoteType;
  folderId?: string | null;
  linkedDate?: string;
  isCompleted?: boolean;
  isPinned?: boolean;
  linkedTodoId?: string;
}

// To Do
export interface Todo extends BaseObject {
  type: 'todo';
  date: string;
  startTime?: string;
  endTime?: string;
  isCompleted: boolean;
  repeatRule?: RepeatRule;
  linkedNoteId?: string;
}

// Daily To Do
export interface DailyTodo extends BaseObject {
  type: 'dailyTodo';
  isCompleted: boolean;
}

// 联合类型 - 任意对象
export type AnyObject = Anniversary | Event | Deadline | Note | Todo | DailyTodo;

// 文件夹
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Wallpaper {
  id: string;
  name: string;
  blob: Blob;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  createdAt: number;
  updatedAt: number;
}

// 默认 Inbox 文件夹 ID
export const INBOX_FOLDER_ID = 'inbox';
