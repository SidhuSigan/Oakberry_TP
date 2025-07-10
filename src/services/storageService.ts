import { Worker, Schedule } from '@/types';

const STORAGE_KEYS = {
  WORKERS: 'oakberry_workers',
  SCHEDULES: 'oakberry_schedules',
  SETTINGS: 'oakberry_settings',
  WEATHER_CACHE: 'oakberry_weather_cache'
};

// Worker Storage
export function saveWorkers(workers: Worker[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.WORKERS, JSON.stringify(workers));
  } catch (error) {
    console.error('Failed to save workers:', error);
    throw new Error('Failed to save workers data');
  }
}

export function loadWorkers(): Worker[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WORKERS);
    if (!data) return [];

    const workers = JSON.parse(data);
    // Convert date strings back to Date objects
    return workers.map((worker: any) => ({
      ...worker,
      createdAt: new Date(worker.createdAt),
      holidays: worker.holidays.map((h: string) => new Date(h))
    }));
  } catch (error) {
    console.error('Failed to load workers:', error);
    return [];
  }
}

// Schedule Storage
export function saveSchedules(schedules: Schedule[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  } catch (error) {
    console.error('Failed to save schedules:', error);
    throw new Error('Failed to save schedule data');
  }
}

export function loadSchedules(): Schedule[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    if (!data) return [];

    const schedules = JSON.parse(data);
    // Convert date strings back to Date objects
    return schedules.map((schedule: any) => ({
      ...schedule,
      weekStartDate: new Date(schedule.weekStartDate),
      createdAt: new Date(schedule.createdAt),
      lastModified: new Date(schedule.lastModified),
      shifts: schedule.shifts.map((shift: any) => ({
        ...shift,
        date: new Date(shift.date)
      })),
      weather: schedule.weather?.map((w: any) => ({
        ...w,
        date: new Date(w.date)
      }))
    }));
  } catch (error) {
    console.error('Failed to load schedules:', error);
    return [];
  }
}

// Settings Storage
export interface AppSettings {
  apiKey?: string;
  defaultView: 'dashboard' | 'schedule';
  notifications: boolean;
  theme: 'light' | 'dark' | 'auto';
}

const defaultSettings: AppSettings = {
  defaultView: 'dashboard',
  notifications: true,
  theme: 'light'
};

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

export function loadSettings(): AppSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return defaultSettings;

    return { ...defaultSettings, ...JSON.parse(data) };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return defaultSettings;
  }
}

// Weather Cache
interface WeatherCache {
  data: any;
  timestamp: number;
  location: string;
}

export function saveWeatherCache(data: any, location: string = 'zurich'): void {
  try {
    const cache: WeatherCache = {
      data,
      timestamp: Date.now(),
      location
    };
    localStorage.setItem(STORAGE_KEYS.WEATHER_CACHE, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to save weather cache:', error);
  }
}

export function loadWeatherCache(maxAge: number = 3600000): WeatherCache | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WEATHER_CACHE);
    if (!data) return null;

    const cache: WeatherCache = JSON.parse(data);

    // Check if cache is still valid
    if (Date.now() - cache.timestamp > maxAge) {
      return null;
    }

    return cache;
  } catch (error) {
    console.error('Failed to load weather cache:', error);
    return null;
  }
}

// Export/Import functionality
export function exportData(): string {
  const data = {
    workers: loadWorkers(),
    schedules: loadSchedules(),
    settings: loadSettings(),
    exportDate: new Date().toISOString(),
    version: '1.0.0'
  };

  return JSON.stringify(data, null, 2);
}

export function importData(jsonData: string): void {
  try {
    const data = JSON.parse(jsonData);

    if (data.workers) {
      saveWorkers(data.workers.map((worker: any) => ({
        ...worker,
        createdAt: new Date(worker.createdAt),
        holidays: worker.holidays.map((h: string) => new Date(h))
      })));
    }

    if (data.schedules) {
      saveSchedules(data.schedules.map((schedule: any) => ({
        ...schedule,
        weekStartDate: new Date(schedule.weekStartDate),
        createdAt: new Date(schedule.createdAt),
        lastModified: new Date(schedule.lastModified),
        shifts: schedule.shifts.map((shift: any) => ({
          ...shift,
          date: new Date(shift.date)
        })),
        weather: schedule.weather?.map((w: any) => ({
          ...w,
          date: new Date(w.date)
        }))
      })));
    }

    if (data.settings) {
      saveSettings(data.settings);
    }
  } catch (error) {
    console.error('Failed to import data:', error);
    throw new Error('Invalid import data format');
  }
}

// Clear all data
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}