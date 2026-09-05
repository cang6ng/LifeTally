import type { BaseObject } from '../types/objects';

export interface ObjectPreview {
  id: string;
  type: BaseObject['type'];
  title: string;
  emoji?: string;
  color: string;
}

/**
 * Get color for object type
 */
export function getObjectColor(type: BaseObject['type']): string {
  const colors: Record<BaseObject['type'], string> = {
    anniversary: '#ff4d7f',
    event: '#faad14',
    deadline: '#ff4d4f',
    note: '#8c8c8c',
    todo: '#1890ff',
    dailyTodo: '#52c41a',
  };
  return colors[type];
}

/**
 * Get type display name
 */
export function getTypeDisplayName(type: BaseObject['type']): string {
  const names: Record<BaseObject['type'], string> = {
    anniversary: '纪念日',
    event: '事件',
    deadline: 'Deadline',
    note: '便利贴',
    todo: 'To Do',
    dailyTodo: 'Daily To Do',
  };
  return names[type];
}

/**
 * Get emoji for anniversary
 */
function getAnniversaryEmoji(obj: BaseObject): string | undefined {
  // Check if object has emoji in title or content
  const text = obj.title || '';
  const emojiMatch = text.match(/[\u{1F300}-\u{1F9FF}]/u);
  return emojiMatch?.[0];
}

/**
 * Convert object to preview format
 */
export function objectToPreview(obj: BaseObject): ObjectPreview {
  return {
    id: obj.id,
    type: obj.type,
    title: obj.title,
    emoji: obj.type === 'anniversary' ? getAnniversaryEmoji(obj) : undefined,
    color: getObjectColor(obj.type),
  };
}

/**
 * Get the date field from an object based on its type
 */
function getObjectDate(obj: BaseObject): string | null {
  if (obj.type === 'deadline') {
    return (obj as any).dueDate || null;
  } else if (obj.type === 'event') {
    return (obj as any).startDate || null;
  } else if (obj.type === 'anniversary' || obj.type === 'todo') {
    return (obj as any).date || null;
  }
  return null;
}

/**
 * Get objects for a specific date
 */
export function getObjectsForDate(
  objects: BaseObject[],
  date: Date
): ObjectPreview[] {
  const filtered = objects.filter(obj => {
    const dateStr = getObjectDate(obj);
    if (!dateStr) return false;

    const objDate = new Date(dateStr);

    // Anniversary: only match month+day, repeat yearly
    if (obj.type === 'anniversary') {
      return (
        objDate.getMonth() === date.getMonth() &&
        objDate.getDate() === date.getDate()
      );
    }

    // Other types: full date match
    return (
      objDate.getFullYear() === date.getFullYear() &&
      objDate.getMonth() === date.getMonth() &&
      objDate.getDate() === date.getDate()
    );
  });

  return filtered.map(objectToPreview);
}

/**
 * Limit previews to display in date cell
 */
export function limitPreviews(
  previews: ObjectPreview[],
  maxDisplay: number = 3
): {
  displayed: ObjectPreview[];
  remaining: number;
} {
  if (previews.length <= maxDisplay) {
    return { displayed: previews, remaining: 0 };
  }

  return {
    displayed: previews.slice(0, maxDisplay),
    remaining: previews.length - maxDisplay,
  };
}

/**
 * Sort objects by type priority for display
 */
export function sortObjectsByPriority(objects: ObjectPreview[]): ObjectPreview[] {
  const priority: Record<BaseObject['type'], number> = {
    anniversary: 1,
    deadline: 2,
    event: 3,
    todo: 4,
    dailyTodo: 5,
    note: 6,
  };

  return [...objects].sort((a, b) => priority[a.type] - priority[b.type]);
}
