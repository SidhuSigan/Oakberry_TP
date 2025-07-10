import { format, startOfWeek, addDays, parse, differenceInMinutes, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_OF_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getWeekStartDate(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday as start of week
}

export function getWeekDates(weekStart: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(weekStart, i));
  }
  return dates;
}

export function formatDate(date: Date, formatStr: string = 'yyyy-MM-dd'): string {
  return format(date, formatStr);
}

export function formatTime(time: string): string {
  // Ensure time is in HH:mm format
  return time.padStart(5, '0');
}

export function parseTime(timeStr: string, referenceDate: Date = new Date()): Date {
  return parse(timeStr, 'HH:mm', referenceDate);
}

export function calculateDuration(startTime: string, endTime: string): number {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  return differenceInMinutes(end, start) / 60; // Return hours
}

export function isDateInRange(date: Date, holidays: Date[]): boolean {
  return holidays.some(holiday =>
    formatDate(holiday) === formatDate(date)
  );
}

export function getMonthDateRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date)
  };
}

export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

export function getStoreHours(dayOfWeek: number): { open: string; close: string } {
  // Based on specification:
  // Monday-Friday: 9:30 - 20:00
  // Saturday: 9:00 - 21:00
  // Sunday: 9:30 - 21:00

  if (dayOfWeek === 6) { // Saturday
    return { open: '09:00', close: '21:00' };
  } else if (dayOfWeek === 0) { // Sunday
    return { open: '09:30', close: '21:00' };
  } else { // Monday-Friday
    return { open: '09:30', close: '20:00' };
  }
}

export function getOpeningShiftTime(dayOfWeek: number): string {
  const hours = getStoreHours(dayOfWeek);
  const [hour, minute] = hours.open.split(':').map(Number);
  const openingHour = hour === 0 ? 23 : hour;
  const openingMinute = minute === 0 ? 30 : 0;
  const adjustedHour = minute === 0 ? openingHour - 1 : openingHour;

  return `${String(adjustedHour).padStart(2, '0')}:${String(openingMinute).padStart(2, '0')}`;
}

export function getClosingShiftTime(dayOfWeek: number): string {
  const hours = getStoreHours(dayOfWeek);
  const [hour, minute] = hours.close.split(':').map(Number);
  const closingMinute = minute + 30;
  const adjustedMinute = closingMinute >= 60 ? closingMinute - 60 : closingMinute;
  const adjustedHour = closingMinute >= 60 ? hour + 1 : hour;

  return `${String(adjustedHour).padStart(2, '0')}:${String(adjustedMinute).padStart(2, '0')}`;
}

export function isWeekend(date: Date): boolean {
  const day = getDayOfWeek(date);
  return day === 0 || day === 6;
}