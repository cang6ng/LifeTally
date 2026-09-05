import { ChinaHolidayProvider } from '../providers/holiday/ChinaHolidayProvider';
import { HOLIDAY_UPDATED_EVENT, holidayDataService } from '../providers/holiday/HolidayDataService';
import type { HolidayDataset, HolidayInfo } from '../providers/holiday/HolidayProvider';

const chinaProvider = new ChinaHolidayProvider();

if (typeof window !== 'undefined') {
  const year = new Date().getFullYear();
  void holidayDataService.ensureYears([year, year + 1]);
}

export function getHolidayForDate(date: Date): HolidayInfo | null {
  return chinaProvider.getHoliday(date);
}

export function isHoliday(date: Date): boolean {
  return chinaProvider.isHoliday(date);
}

export function isFestival(date: Date): boolean {
  return chinaProvider.isFestival(date);
}

export function isWorkday(date: Date): boolean {
  return chinaProvider.isWorkday(date);
}

export function getNextHoliday(fromDate: Date = new Date()) {
  return chinaProvider.getNextHoliday(fromDate);
}

export function getDaysUntilNextHoliday(fromDate: Date = new Date()): number | null {
  const next = getNextHoliday(fromDate);
  return next?.daysUntil ?? null;
}

export function getHolidayDatasetStatus(year: number) {
  return holidayDataService.getDatasetStatus(year);
}

export function checkHolidayUpdate(year: number) {
  return holidayDataService.updateYear(year);
}

export function setHolidayOverride(date: string, holiday: HolidayInfo | null) {
  holidayDataService.setOverride(date, holiday);
}

export function importHolidayDataset(dataset: HolidayDataset) {
  return holidayDataService.importDataset(dataset);
}

export function exportHolidayOverrides() {
  return holidayDataService.exportOverrides();
}

export function importHolidayOverrides(overrides: unknown) {
  holidayDataService.importOverrides(overrides);
}

export { HOLIDAY_UPDATED_EVENT };
