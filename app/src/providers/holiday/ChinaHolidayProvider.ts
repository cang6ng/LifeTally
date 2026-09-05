import type { HolidayInfo, HolidayProvider } from './HolidayProvider';
import { holidayDataService } from './HolidayDataService';

export class ChinaHolidayProvider implements HolidayProvider {
  getHoliday(date: Date): HolidayInfo | null {
    return holidayDataService.getHoliday(date);
  }

  getHolidays(year: number): HolidayInfo[] {
    return holidayDataService.getHolidays(year);
  }

  isHoliday(date: Date): boolean {
    const holiday = this.getHoliday(date);
    return holiday?.type === 'holiday' || holiday?.type === 'festival';
  }

  isFestival(date: Date): boolean {
    return this.getHoliday(date)?.type === 'festival';
  }

  isWorkday(date: Date): boolean {
    return this.getHoliday(date)?.type === 'workday';
  }

  getNextHoliday(fromDate: Date): { holiday: HolidayInfo; daysUntil: number } | null {
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);

    const years = [from.getFullYear(), from.getFullYear() + 1];
    const allHolidays = years
      .flatMap(year => this.getHolidays(year))
      .filter(holiday => holiday.type === 'holiday' || holiday.type === 'festival');

    const futureHolidays = allHolidays
      .map(holiday => ({ ...holiday, dateObj: new Date(holiday.date) }))
      .filter(holiday => holiday.dateObj > from)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    if (futureHolidays.length === 0) return null;

    const next = futureHolidays[0];
    const daysUntil = Math.round((next.dateObj.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    return {
      holiday: {
        date: next.date,
        name: next.name,
        type: next.type,
        source: next.source,
        description: next.description,
      },
      daysUntil,
    };
  }
}
