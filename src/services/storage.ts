// Storage service for localStorage operations
// Location: src/services/storage.ts

import type { Worker, Schedule, WeeklyHours } from '../types';

// Storage keys
const STORAGE_KEYS = {
  WORKERS: 'oakberry_workers',
  SCHEDULES: 'oakberry_schedules',
  WEEKLY_HOURS: 'oakberry_weekly_hours',
  APP_SETTINGS: 'oakberry_settings',
} as const;

// Generic storage operations
class StorageService {
  private isLocalStorageAvailable(): boolean {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private getItem<T>(key: string): T | null {
    if (!this.isLocalStorageAvailable()) {
      console.warn('LocalStorage not available');
      return null;
    }

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage for key ${key}:`, error);
      return null;
    }
  }

  private setItem<T>(key: string, value: T): boolean {
    if (!this.isLocalStorageAvailable()) {
      console.warn('LocalStorage not available');
      return false;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage for key ${key}:`, error);
      return false;
    }
  }

  private removeItem(key: string): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage for key ${key}:`, error);
      return false;
    }
  }

  // Worker operations
  getWorkers(): Worker[] {
    return this.getItem<Worker[]>(STORAGE_KEYS.WORKERS) || [];
  }

  saveWorkers(workers: Worker[]): boolean {
    return this.setItem(STORAGE_KEYS.WORKERS, workers);
  }

  addWorker(worker: Worker): boolean {
    const workers = this.getWorkers();
    workers.push(worker);
    return this.saveWorkers(workers);
  }

  updateWorker(updatedWorker: Worker): boolean {
    const workers = this.getWorkers();
    const index = workers.findIndex(w => w.id === updatedWorker.id);

    if (index === -1) {
      console.error('Worker not found for update');
      return false;
    }

    workers[index] = updatedWorker;
    return this.saveWorkers(workers);
  }

  deleteWorker(workerId: string): boolean {
    const workers = this.getWorkers();
    const filteredWorkers = workers.filter(w => w.id !== workerId);
    return this.saveWorkers(filteredWorkers);
  }

  getWorkerById(workerId: string): Worker | null {
    const workers = this.getWorkers();
    return workers.find(w => w.id === workerId) || null;
  }

  // Schedule operations
  getSchedules(): Schedule[] {
    return this.getItem<Schedule[]>(STORAGE_KEYS.SCHEDULES) || [];
  }

  saveSchedules(schedules: Schedule[]): boolean {
    return this.setItem(STORAGE_KEYS.SCHEDULES, schedules);
  }

  addSchedule(schedule: Schedule): boolean {
    const schedules = this.getSchedules();
    schedules.push(schedule);
    return this.saveSchedules(schedules);
  }

  updateSchedule(updatedSchedule: Schedule): boolean {
    const schedules = this.getSchedules();
    const index = schedules.findIndex(s => s.id === updatedSchedule.id);

    if (index === -1) {
      console.error('Schedule not found for update');
      return false;
    }

    schedules[index] = updatedSchedule;
    return this.saveSchedules(schedules);
  }

  deleteSchedule(scheduleId: string): boolean {
    const schedules = this.getSchedules();
    const filteredSchedules = schedules.filter(s => s.id !== scheduleId);
    return this.saveSchedules(filteredSchedules);
  }

  getScheduleById(scheduleId: string): Schedule | null {
    const schedules = this.getSchedules();
    return schedules.find(s => s.id === scheduleId) || null;
  }

  getScheduleByWeek(weekStartDate: string): Schedule | null {
    const schedules = this.getSchedules();
    return schedules.find(s => s.weekStartDate === weekStartDate) || null;
  }

  // Weekly hours operations
  getWeeklyHours(): WeeklyHours[] {
    return this.getItem<WeeklyHours[]>(STORAGE_KEYS.WEEKLY_HOURS) || [];
  }

  saveWeeklyHours(weeklyHours: WeeklyHours[]): boolean {
    return this.setItem(STORAGE_KEYS.WEEKLY_HOURS, weeklyHours);
  }

  updateWeeklyHours(workerId: string, weekStartDate: string, hours: Partial<WeeklyHours>): boolean {
    const allWeeklyHours = this.getWeeklyHours();
    const index = allWeeklyHours.findIndex(wh =>
      wh.workerId === workerId && wh.weekStartDate === weekStartDate
    );

    if (index === -1) {
      // Create new entry
      const newEntry: WeeklyHours = {
        workerId,
        weekStartDate,
        scheduledHours: 0,
        targetHours: 0,
        percentageAchieved: 0,
        status: 'target',
        ...hours
      };
      allWeeklyHours.push(newEntry);
    } else {
      // Update existing entry
      allWeeklyHours[index] = { ...allWeeklyHours[index], ...hours };
    }

    return this.saveWeeklyHours(allWeeklyHours);
  }

  getWeeklyHoursForWorker(workerId: string): WeeklyHours[] {
    const allWeeklyHours = this.getWeeklyHours();
    return allWeeklyHours.filter(wh => wh.workerId === workerId);
  }

  // Utility operations
  exportAllData(): string {
    const data = {
      workers: this.getWorkers(),
      schedules: this.getSchedules(),
      weeklyHours: this.getWeeklyHours(),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(data, null, 2);
  }

  importAllData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);

      if (data.workers) {
        this.saveWorkers(data.workers);
      }
      if (data.schedules) {
        this.saveSchedules(data.schedules);
      }
      if (data.weeklyHours) {
        this.saveWeeklyHours(data.weeklyHours);
      }

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  clearAllData(): boolean {
    try {
      this.removeItem(STORAGE_KEYS.WORKERS);
      this.removeItem(STORAGE_KEYS.SCHEDULES);
      this.removeItem(STORAGE_KEYS.WEEKLY_HOURS);
      this.removeItem(STORAGE_KEYS.APP_SETTINGS);
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  // Get storage usage info
  getStorageInfo(): { used: number; available: boolean } {
    if (!this.isLocalStorageAvailable()) {
      return { used: 0, available: false };
    }

    let used = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length;
      }
    }

    return { used, available: true };
  }
}

// Export singleton instance
export const storageService = new StorageService();