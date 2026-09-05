import type { HolidayDataset, HolidayInfo, HolidaySource } from './HolidayProvider';
import { migrateLegacyLocalStorage, STORAGE_KEYS } from '../../core/storage/storageKeys';

const CACHE_KEY = STORAGE_KEYS.holidayCache;
const OVERRIDES_KEY = STORAGE_KEYS.holidayOverrides;
const UPDATED_EVENT = 'lifetally:v0:holiday-updated';

type CachedDatasets = Record<string, HolidayDataset>;
type HolidayOverrides = Record<string, HolidayInfo | null>;

interface TimorHolidayEntry {
  holiday?: boolean;
  name?: string;
  date?: string;
  target?: string;
}

const bundledModules = import.meta.glob('./data/china-*.json', { eager: true }) as Record<string, { default: HolidayDataset } | HolidayDataset>;

const readJson = <T>(key: string, fallback: T): T => {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

const normalizeDataset = (dataset: HolidayDataset): HolidayDataset => ({
  _meta: dataset._meta,
  holidays: dataset.holidays.filter(isValidHoliday),
});

const isValidHoliday = (holiday: HolidayInfo): boolean =>
  Boolean(
    holiday &&
    /^\d{4}-\d{2}-\d{2}$/.test(holiday.date) &&
    holiday.name &&
    ['festival', 'holiday', 'workday'].includes(holiday.type) &&
    holiday.source,
  );

const fallbackFestivals = (year: number): HolidayInfo[] => [
  { date: `${year}-01-01`, name: '元旦', type: 'festival', source: '内置节日本日兜底' },
  { date: `${year}-05-01`, name: '劳动节', type: 'festival', source: '内置节日本日兜底' },
  { date: `${year}-10-01`, name: '国庆节', type: 'festival', source: '内置节日本日兜底' },
];

class TimorHolidaySource implements HolidaySource {
  id = 'timor.tech';

  async getYear(year: number): Promise<HolidayDataset | null> {
    const response = await fetch(`https://timor.tech/api/holiday/year/${year}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;

    const payload = await response.json() as { code?: number; holiday?: Record<string, TimorHolidayEntry> };
    if (payload.code !== 0 || !payload.holiday) return null;

    const holidays: HolidayInfo[] = Object.entries(payload.holiday)
      .map(([day, item]) => {
        const date = item.date ?? `${year}-${day}`;
        const isWorkday = item.holiday === false;
        return {
          date,
          name: item.name || (isWorkday ? '调休补班' : '节假日'),
          type: isWorkday ? 'workday' as const : 'holiday' as const,
          source: 'timor.tech 节假日 API',
        };
      })
      .filter(isValidHoliday);

    if (holidays.length === 0) return null;
    return {
      _meta: {
        year,
        status: 'pending',
        source: 'timor.tech 节假日 API',
        verifiedAt: new Date().toISOString(),
      },
      holidays,
    };
  }
}

export class HolidayDataService {
  private bundled = new Map<number, HolidayDataset>();
  private cache: CachedDatasets = {};
  private overrides: HolidayOverrides = {};
  private sources: HolidaySource[];

  constructor(sources: HolidaySource[] = [new TimorHolidaySource()]) {
    migrateLegacyLocalStorage();
    this.sources = sources;
    this.cache = readJson<CachedDatasets>(CACHE_KEY, {});
    this.overrides = readJson<HolidayOverrides>(OVERRIDES_KEY, {});
    Object.values(bundledModules).forEach(moduleValue => {
      const dataset = 'default' in moduleValue ? moduleValue.default : moduleValue;
      if (dataset?._meta?.year) {
        this.bundled.set(dataset._meta.year, normalizeDataset(dataset));
      }
    });
  }

  getHoliday(date: Date): HolidayInfo | null {
    const dateKey = this.toDateKey(date);
    if (Object.prototype.hasOwnProperty.call(this.overrides, dateKey)) {
      return this.overrides[dateKey];
    }
    return this.getHolidays(date.getFullYear()).find(item => item.date === dateKey) ?? null;
  }

  getHolidays(year: number): HolidayInfo[] {
    const byDate = new Map<string, HolidayInfo>();
    this.getFallbackDataset(year).holidays.forEach(item => byDate.set(item.date, item));
    this.bundled.get(year)?.holidays.forEach(item => byDate.set(item.date, item));
    const cached = this.cache[String(year)];
    if (cached) normalizeDataset(cached).holidays.forEach(item => byDate.set(item.date, item));
    Object.entries(this.overrides).forEach(([date, holiday]) => {
      if (!date.startsWith(`${year}-`)) return;
      if (holiday) byDate.set(date, holiday);
      else byDate.delete(date);
    });
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  getDatasetStatus(year: number) {
    const cached = this.cache[String(year)];
    const bundled = this.bundled.get(year);
    const fallback = this.getFallbackDataset(year);
    const dataset = cached ?? bundled ?? fallback;
    return {
      year,
      status: dataset._meta.status,
      source: dataset._meta.source,
      verifiedAt: dataset._meta.verifiedAt,
      count: this.getHolidays(year).length,
      hasCached: Boolean(cached),
      hasBundled: Boolean(bundled),
    };
  }

  async ensureYears(years: number[]): Promise<void> {
    await Promise.all(years.map(year => this.updateYearIfNeeded(year)));
  }

  async updateYear(year: number): Promise<boolean> {
    for (const source of this.sources) {
      try {
        const dataset = await source.getYear(year);
        if (!dataset) continue;
        this.saveDataset(dataset);
        return true;
      } catch (error) {
        console.warn(`[HolidayDataService] ${source.id} 更新 ${year} 年失败`, error);
      }
    }
    return false;
  }

  setOverride(date: string, holiday: HolidayInfo | null): void {
    if (holiday && !isValidHoliday(holiday)) {
      throw new Error('假期覆盖数据格式错误');
    }
    this.overrides[date] = holiday;
    writeJson(OVERRIDES_KEY, this.overrides);
    this.notify();
  }

  exportOverrides(): HolidayOverrides {
    return { ...this.overrides };
  }

  importOverrides(overrides: unknown): void {
    if (!overrides || typeof overrides !== 'object') return;
    const next: HolidayOverrides = {};
    Object.entries(overrides as HolidayOverrides).forEach(([date, holiday]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      if (holiday === null || isValidHoliday(holiday)) next[date] = holiday;
    });
    this.overrides = { ...this.overrides, ...next };
    writeJson(OVERRIDES_KEY, this.overrides);
    this.notify();
  }

  async importDataset(dataset: HolidayDataset): Promise<void> {
    this.saveDataset(dataset);
  }

  private async updateYearIfNeeded(year: number): Promise<void> {
    const status = this.getDatasetStatus(year);
    if (status.hasCached && status.count > 0) return;
    if (status.hasBundled && status.status === 'verified' && status.count > 0) return;
    await this.updateYear(year);
  }

  private saveDataset(dataset: HolidayDataset): void {
    if (!dataset._meta?.year) throw new Error('假期数据缺少年份');
    const normalized = normalizeDataset(dataset);
    if (normalized.holidays.length === 0) throw new Error('假期数据为空');
    this.cache[String(normalized._meta.year)] = normalized;
    writeJson(CACHE_KEY, this.cache);
    this.notify();
  }

  private getFallbackDataset(year: number): HolidayDataset {
    return {
      _meta: {
        year,
        status: 'fallback',
        source: '内置节日本日兜底',
        verifiedAt: new Date(0).toISOString(),
      },
      holidays: fallbackFestivals(year),
    };
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private notify(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(UPDATED_EVENT));
    }
  }
}

export const holidayDataService = new HolidayDataService();
export const HOLIDAY_UPDATED_EVENT = UPDATED_EVENT;
