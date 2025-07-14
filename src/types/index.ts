// Core data models for Oakberry TeamPlanner
export interface Worker {
  id: string;
  name: string;
  phone: string;
  email?: string;
  workPercentage: number; // Arbeitspensum (20, 50, 100, etc.)
  availableDays: DayOfWeek[];
  holidayDates: string[]; // ISO date strings (YYYY-MM-DD)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: string;
  workerId?: string; // undefined means unassigned
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  type: ShiftType;
  isRequired: boolean; // true for opening/closing shifts
}

export interface Schedule {
  id: string;
  weekStartDate: string; // ISO date string (YYYY-MM-DD) - Monday
  shifts: Shift[];
  isGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface WeeklyHours {
  workerId: string;
  weekStartDate: string;
  scheduledHours: number;
  targetHours: number; // Based on work percentage
  percentageAchieved: number;
  status: ArbeitspenaumStatus;
}

// Enums and utility types
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type ShiftType = 'opening' | 'closing' | 'regular';

export type ArbeitspenaumStatus = 'under' | 'target' | 'over';

export interface StoreHours {
  day: DayOfWeek;
  open: string; // HH:MM
  close: string; // HH:MM
  isOpen: boolean;
}

// Default store hours for Oakberry Zurich
export const DEFAULT_STORE_HOURS: StoreHours[] = [
  { day: 'monday', open: '09:30', close: '20:00', isOpen: true },
  { day: 'tuesday', open: '09:30', close: '20:00', isOpen: true },
  { day: 'wednesday', open: '09:30', close: '20:00', isOpen: true },
  { day: 'thursday', open: '09:30', close: '21:00', isOpen: true },
  { day: 'friday', open: '09:30', close: '21:00', isOpen: true },
  { day: 'saturday', open: '09:30', close: '21:00', isOpen: true },
  { day: 'sunday', open: '09:30', close: '21:00', isOpen: true },
];

// Validation interfaces
export interface ValidationError {
  field: string;
  message: string;
}

export interface WorkerFormData {
  name: string;
  phone: string;
  email?: string;
  workPercentage: number;
  availableDays: DayOfWeek[];
}

// Utility functions for type safety
export const isValidDayOfWeek = (day: string): day is DayOfWeek => {
  return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(day);
};

export const isValidShiftType = (type: string): type is ShiftType => {
  return ['opening', 'closing', 'regular'].includes(type);
};

// Helper to get day name from date
export const getDayOfWeek = (dateString: string): DayOfWeek => {
  const date = new Date(dateString);
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
};

// Helper to calculate target hours based on work percentage
export const calculateTargetHours = (workPercentage: number): number => {
  // Assuming 40-hour work week as 100%
  return (workPercentage / 100) * 40;
};

// Helper to determine Arbeitspensum status
export const getArbeitspenumStatus = (scheduledHours: number, targetHours: number): ArbeitspenaumStatus => {
  const percentage = (scheduledHours / targetHours) * 100;
  if (percentage < 90) return 'under';
  if (percentage > 110) return 'over';
  return 'target';
};