export interface HolidayInfo {
  date: string;
  name: string;
  type: 'festival' | 'holiday' | 'workday';
  description?: string;
  source: string;
}

export interface HolidayDatasetMeta {
  year: number;
  status: 'verified' | 'pending' | 'fallback';
  source: string;
  verifiedAt: string;
}

export interface HolidayDataset {
  _meta: HolidayDatasetMeta;
  holidays: HolidayInfo[];
}

export interface HolidaySource {
  id: string;
  getYear(year: number): Promise<HolidayDataset | null>;
}

export interface HolidayProvider {
  getHoliday(date: Date): HolidayInfo | null;
  getHolidays(year: number): HolidayInfo[];
  isHoliday(date: Date): boolean;
  isFestival(date: Date): boolean;
  isWorkday(date: Date): boolean;
  getNextHoliday(fromDate: Date): { holiday: HolidayInfo; daysUntil: number } | null;
}
