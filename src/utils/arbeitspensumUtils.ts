import { Worker, WorkerStats, Shift, Schedule, ArbeitspensumWarning } from '@/types';
import { calculateDuration, getMonthDateRange, formatDate } from './dateUtils';

const FULL_TIME_HOURS_PER_WEEK = 42; // Swiss standard work week
const WEEKS_PER_MONTH = 4.33; // Average weeks per month

export function calculateTargetHours(workPercentage: number, weekly: boolean = true): number {
  const baseHours = weekly ? FULL_TIME_HOURS_PER_WEEK : FULL_TIME_HOURS_PER_WEEK * WEEKS_PER_MONTH;
  return (workPercentage / 100) * baseHours;
}

export function calculateActualHours(shifts: Shift[]): number {
  return shifts.reduce((total, shift) => {
    if (!shift.workerId) return total;
    return total + calculateDuration(shift.startTime, shift.endTime);
  }, 0);
}

export function calculateWorkerHours(workerId: string, shifts: Shift[]): number {
  const workerShifts = shifts.filter(shift => shift.workerId === workerId);
  return calculateActualHours(workerShifts);
}

export function calculateWorkerStats(
  worker: Worker,
  schedule: Schedule,
  allSchedules: Schedule[]
): WorkerStats {
  const weeklyHours = calculateWorkerHours(worker.id, schedule.shifts);
  const targetHours = calculateTargetHours(worker.workPercentage);
  const percentageActual = (weeklyHours / FULL_TIME_HOURS_PER_WEEK) * 100;

  // Calculate monthly hours
  const monthRange = getMonthDateRange(schedule.weekStartDate);
  const monthlySchedules = allSchedules.filter(s =>
    s.weekStartDate >= monthRange.start && s.weekStartDate <= monthRange.end
  );

  const monthlyHours = monthlySchedules.reduce((total, s) => {
    return total + calculateWorkerHours(worker.id, s.shifts);
  }, 0);

  const monthlyTarget = calculateTargetHours(worker.workPercentage, false);

  // Determine status
  let status: 'under' | 'target' | 'over' = 'target';
  const difference = percentageActual - worker.workPercentage;

  if (Math.abs(difference) > 5) { // 5% tolerance
    status = difference > 0 ? 'over' : 'under';
  }

  return {
    workerId: worker.id,
    weekStartDate: schedule.weekStartDate,
    targetHours,
    actualHours: weeklyHours,
    percentageActual,
    status,
    monthlyHours,
    monthlyTarget
  };
}

export function getArbeitspensumStatus(
  percentageActual: number,
  targetPercentage: number
): 'under' | 'target' | 'over' {
  const difference = percentageActual - targetPercentage;

  if (Math.abs(difference) <= 5) return 'target'; // 5% tolerance
  return difference > 0 ? 'over' : 'under';
}

export function getArbeitspensumColor(status: 'under' | 'target' | 'over'): string {
  switch (status) {
    case 'target':
      return 'text-green-600';
    case 'under':
      return 'text-yellow-600';
    case 'over':
      return 'text-red-600';
  }
}

export function getArbeitspensumEmoji(status: 'under' | 'target' | 'over'): string {
  switch (status) {
    case 'target':
      return '🟢';
    case 'under':
      return '🟡';
    case 'over':
      return '🔴';
  }
}

export function validateArbeitspensumChanges(
  workers: Worker[],
  schedule: Schedule,
  allSchedules: Schedule[]
): ArbeitspensumWarning[] {
  const warnings: ArbeitspensumWarning[] = [];

  workers.forEach(worker => {
    const stats = calculateWorkerStats(worker, schedule, allSchedules);

    if (stats.status !== 'target') {
      const difference = stats.percentageActual - worker.workPercentage;

      warnings.push({
        workerId: worker.id,
        workerName: worker.name,
        targetPercentage: worker.workPercentage,
        actualPercentage: stats.percentageActual,
        difference: Math.abs(difference),
        status: stats.status
      });
    }
  });

  return warnings.sort((a, b) => b.difference - a.difference);
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (minutes === 0) {
    return `${wholeHours}h`;
  }

  return `${wholeHours}h ${minutes}m`;
}

export function isWorkerAvailable(
  worker: Worker,
  date: Date,
  considerHolidays: boolean = true
): boolean {
  const dayOfWeek = date.getDay();
  const isAvailableDay = worker.availableDays[dayOfWeek];

  if (!isAvailableDay) return false;

  if (considerHolidays) {
    const isHoliday = worker.holidays.some(holiday =>
      formatDate(holiday) === formatDate(date)
    );

    return !isHoliday;
  }

  return true;
}

export function prioritizeWorkers(workers: Worker[]): Worker[] {
  // Workers with 100% get priority
  return [...workers].sort((a, b) => {
    if (a.workPercentage === 100 && b.workPercentage !== 100) return -1;
    if (b.workPercentage === 100 && a.workPercentage !== 100) return 1;
    return b.workPercentage - a.workPercentage;
  });
}