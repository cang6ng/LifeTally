import type { BaseObject } from '../types/objects';

/**
 * Get related objects for a given object
 */
export function getRelatedObjects(
  objectId: string,
  allObjects: BaseObject[]
): BaseObject[] {
  const object = allObjects.find(obj => obj.id === objectId);
  if (!object) return [];

  const related: BaseObject[] = [];

  // Find objects with the same date
  const objectDate = (object as any).date ?? (object as any).startDate ?? (object as any).dueDate;
  if (objectDate) {
    related.push(
      ...allObjects.filter(
        obj => {
          const relatedDate = (obj as any).date ?? (obj as any).startDate ?? (obj as any).dueDate;
          return (
            obj.id !== objectId &&
            relatedDate &&
            new Date(relatedDate).toDateString() === new Date(objectDate).toDateString()
          );
        }
      )
    );
  }

  return related;
}

/**
 * Check if a deadline is overdue
 */
export function isDeadlineOverdue(deadline: BaseObject): boolean {
  const dueDate = (deadline as any).dueDate ?? (deadline as any).date;
  if (deadline.type !== 'deadline' || !dueDate) return false;
  return new Date(dueDate) < new Date() && !(deadline as any).isCompleted;
}

/**
 * Get urgency level for deadline
 */
export function getDeadlineUrgency(deadline: BaseObject): 'urgent' | 'soon' | 'normal' {
  const dueDate = (deadline as any).dueDate ?? (deadline as any).date;
  if (deadline.type !== 'deadline' || !dueDate) return 'normal';

  const now = new Date();
  const deadlineDate = new Date(dueDate);
  const hoursUntil = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < 0 && !(deadline as any).isCompleted) return 'urgent';
  if (hoursUntil < 24) return 'urgent';
  if (hoursUntil < 72) return 'soon';
  return 'normal';
}
