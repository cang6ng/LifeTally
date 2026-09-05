import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  format,
  addMonths,
  subMonths,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * Get calendar days for a month view (including padding days)
 */
export function getCalendarDays(date: Date): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
}

/**
 * Check if a date is in the current month
 */
export function isCurrentMonth(date: Date, currentMonth: Date): boolean {
  return isSameMonth(date, currentMonth);
}

/**
 * Check if a date is today
 */
export function isDateToday(date: Date): boolean {
  return isToday(date);
}

/**
 * Check if two dates are the same day
 */
export function isSameDayAs(date1: Date, date2: Date): boolean {
  return isSameDay(date1, date2);
}

/**
 * Format date for display
 */
export function formatDate(date: Date, formatStr: string): string {
  return format(date, formatStr, { locale: zhCN });
}

/**
 * Get month display string
 */
export function getMonthDisplay(date: Date): string {
  return formatDate(date, 'yyyy年M月');
}

/**
 * Get year-month key for grouping
 */
export function getYearMonthKey(date: Date): string {
  return formatDate(date, 'yyyy-MM');
}

/**
 * Navigate to previous month
 */
export function getPreviousMonth(date: Date): Date {
  return subMonths(date, 1);
}

/**
 * Navigate to next month
 */
export function getNextMonth(date: Date): Date {
  return addMonths(date, 1);
}

/**
 * Get weekday names
 */
export function getWeekdayNames(): string[] {
  return ['日', '一', '二', '三', '四', '五', '六'];
}

/**
 * Check if date matches object's date field
 */
export function dateMatchesObject(date: Date, objectDate: string | undefined): boolean {
  if (!objectDate) return false;
  return isSameDay(date, new Date(objectDate));
}

/**
 * Parse ISO date string to Date
 */
export function parseISODate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Convert Date to ISO string
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Calculate days until next occurrence of an anniversary
 */
export function getDaysUntilAnniversary(anniversaryDate: Date, fromDate: Date = new Date()): number {
  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);

  const targetMonth = anniversaryDate.getMonth();
  const targetDay = anniversaryDate.getDate();

  let nextAnniversary = new Date(today.getFullYear(), targetMonth, targetDay);

  if (nextAnniversary < today) {
    nextAnniversary = new Date(today.getFullYear() + 1, targetMonth, targetDay);
  }

  const diffTime = nextAnniversary.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Calculate the year count of an anniversary
 */
export function getAnniversaryYears(anniversaryDate: Date, fromDate: Date = new Date()): number {
  const today = new Date(fromDate);
  const diff = today.getFullYear() - anniversaryDate.getFullYear();

  if (
    today.getMonth() < anniversaryDate.getMonth() ||
    (today.getMonth() === anniversaryDate.getMonth() && today.getDate() < anniversaryDate.getDate())
  ) {
    return Math.max(0, diff - 1);
  }

  return Math.max(0, diff);
}

/**
 * Calculate days passed since a timestamp
 */
export function getDaysSinceTimestamp(timestamp: number, toDate: Date = new Date()): number {
  const fromDate = new Date(timestamp);
  fromDate.setHours(0, 0, 0, 0);

  const targetDate = new Date(toDate);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - fromDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
