export interface Worker {
  id: string;
  name: string;
  phone: string;
  email: string;
  workPercentage: number; // 0-100 (target Arbeitspensum)
  availableDays: boolean[]; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  holidays: Date[]; // Array of holiday/absence dates
  createdAt: Date;
  isActive: boolean;
}

export interface WorkerStats {
  workerId: string;
  weekStartDate: Date;
  targetHours: number; // Based on work percentage
  actualHours: number; // From scheduled shifts
  percentageActual: number; // Actual percentage this week
  status: 'under' | 'target' | 'over'; // Arbeitspensum status
  monthlyHours: number; // Running monthly total
  monthlyTarget: number; // Monthly target based on percentage
}

export interface Shift {
  id: string;
  workerId: string | null;
  date: Date;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  type: 'opening' | 'closing' | 'regular';
  isRequired: boolean;
}

export interface Schedule {
  id: string;
  weekStartDate: Date;
  shifts: Shift[];
  createdAt: Date;
  lastModified: Date;
  weather?: WeatherData[];
}

export interface WeatherData {
  date: Date;
  temp: number;
  tempMax: number;
  tempMin: number;
  description: string;
  icon: string;
  precipitation: number;
  isSunny: boolean;
  isHot: boolean;
}

export interface StoreHours {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  openTime: string;
  closeTime: string;
}

export interface AppState {
  workers: Worker[];
  schedules: Schedule[];
  currentSchedule: Schedule | null;
  isLoading: boolean;
  error: string | null;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ArbeitspensumWarning {
  workerId: string;
  workerName: string;
  targetPercentage: number;
  actualPercentage: number;
  difference: number;
  status: 'under' | 'over';
}