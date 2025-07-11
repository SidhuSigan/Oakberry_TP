import { Worker, Shift, Schedule } from '@/types';
import {
  getWeekDates,
  getStoreHours,
  getOpeningShiftTime,
  getClosingShiftTime,
  getDayOfWeek,
  isWeekend,
  formatDate,
  calculateDuration
} from './dateUtils';
import { isWorkerAvailable, prioritizeWorkers, calculateWorkerHours } from './arbeitspensumUtils';

export function generateShiftId(): string {
  return `shift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateScheduleId(): string {
  return `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createShift(
  date: Date,
  startTime: string,
  endTime: string,
  type: 'opening' | 'closing' | 'regular',
  workerId: string | null = null
): Shift {
  return {
    id: generateShiftId(),
    workerId,
    date,
    startTime,
    endTime,
    type,
    isRequired: true
  };
}

export function generateDefaultShifts(weekStartDate: Date): Shift[] {
  const shifts: Shift[] = [];
  const weekDates = getWeekDates(weekStartDate);

  weekDates.forEach(date => {
    const dayOfWeek = getDayOfWeek(date);
    const storeHours = getStoreHours(dayOfWeek);
    const isWeekendDay = isWeekend(date);

    // 1. Opening shift (1 person, 30 min before opening)
    const openingTime = getOpeningShiftTime(dayOfWeek);
    shifts.push(createShift(
      date,
      openingTime,
      '12:00', // Morning shift until noon
      'opening'
    ));

    // 2. Second morning person (arrives 10:00-10:30)
    const secondMorningTime = dayOfWeek === 6 ? '09:30' : '10:00'; // Earlier on Saturday
    shifts.push(createShift(
      date,
      secondMorningTime,
      '14:00',
      'regular'
    ));

    // 3. Peak hour shifts (12:00-16:00)
    const peakStaff = isWeekendDay ? 4 : 3; // More staff on weekends

    // We already have 2 people, add more for peak
    for (let i = 0; i < peakStaff - 2; i++) {
      shifts.push(createShift(
        date,
        '11:30', // Arrive before peak
        '16:00',
        'regular'
      ));
    }

    // 4. Late afternoon shift (bridges to closing)
    shifts.push(createShift(
      date,
      '14:00',
      getClosingShiftTime(dayOfWeek),
      'closing'
    ));

    // 5. Second closing shift (2 people required for closing)
    shifts.push(createShift(
      date,
      '16:00',
      getClosingShiftTime(dayOfWeek),
      'closing'
    ));

    // 6. Extra shifts for busy days (weekends)
    if (isWeekendDay) {
      // Add one more person for the afternoon
      shifts.push(createShift(
        date,
        '13:00',
        '18:00',
        'regular'
      ));
    }
  });

  return shifts;
}

export function assignWorkersToShifts(
  shifts: Shift[],
  workers: Worker[],
  existingSchedule?: Schedule
): Shift[] {
  const assignedShifts = [...shifts];
  const activeWorkers = workers.filter(w => w.isActive);
  const prioritizedWorkers = prioritizeWorkers(activeWorkers);

  // Track assigned hours per worker for the week
  const workerHours = new Map<string, number>();
  const workerShiftCount = new Map<string, number>();

  prioritizedWorkers.forEach(worker => {
    workerHours.set(worker.id, 0);
    workerShiftCount.set(worker.id, 0);
  });

  // Group shifts by date
  const shiftsByDate = new Map<string, Shift[]>();
  assignedShifts.forEach(shift => {
    const dateKey = formatDate(shift.date);
    if (!shiftsByDate.has(dateKey)) {
      shiftsByDate.set(dateKey, []);
    }
    shiftsByDate.get(dateKey)!.push(shift);
  });

  // First pass: Assign critical shifts (opening and closing)
  shiftsByDate.forEach((dayShifts, dateKey) => {
    const date = new Date(dateKey);

    // Sort shifts by priority: opening first, then closing, then regular
    dayShifts.sort((a, b) => {
      const priority = { opening: 1, closing: 2, regular: 3 };
      return priority[a.type] - priority[b.type];
    });

    // Assign opening and closing shifts first
    dayShifts.filter(s => s.type !== 'regular').forEach(shift => {
      if (shift.workerId) return; // Already assigned

      // Find best worker for critical shifts
      let bestWorker: Worker | null = null;
      let bestScore = -Infinity;

      prioritizedWorkers.forEach(worker => {
        if (!isWorkerAvailable(worker, date)) return;

        const hasConflict = dayShifts.some(s =>
          s.workerId === worker.id &&
          s.id !== shift.id &&
          hasTimeOverlap(shift, s)
        );

        if (hasConflict) return;

        // Score based on: availability, current hours vs target, and workPercentage
        const currentHours = workerHours.get(worker.id) || 0;
        const targetWeeklyHours = (worker.workPercentage / 100) * 42;
        const hoursNeeded = targetWeeklyHours - currentHours;

        // Prioritize workers who need more hours and have higher work percentage
        let score = hoursNeeded + (worker.workPercentage / 10);

        // Bonus for 100% workers on critical shifts
        if (worker.workPercentage === 100) {
          score += 20;
        }

        if (score > bestScore) {
          bestScore = score;
          bestWorker = worker;
        }
      });

      if (bestWorker) {
        shift.workerId = bestWorker.id;
        const shiftHours = calculateShiftHours(shift);
        workerHours.set(bestWorker.id, (workerHours.get(bestWorker.id) || 0) + shiftHours);
        workerShiftCount.set(bestWorker.id, (workerShiftCount.get(bestWorker.id) || 0) + 1);
      }
    });
  });

  // Second pass: Assign regular shifts
  shiftsByDate.forEach((dayShifts, dateKey) => {
    const date = new Date(dateKey);

    dayShifts.filter(s => s.type === 'regular').forEach(shift => {
      if (shift.workerId) return; // Already assigned

      // Find best worker for regular shifts
      let bestWorker: Worker | null = null;
      let bestScore = -Infinity;

      prioritizedWorkers.forEach(worker => {
        if (!isWorkerAvailable(worker, date)) return;

        const hasConflict = dayShifts.some(s =>
          s.workerId === worker.id &&
          s.id !== shift.id &&
          hasTimeOverlap(shift, s)
        );

        if (hasConflict) return;

        const currentHours = workerHours.get(worker.id) || 0;
        const targetWeeklyHours = (worker.workPercentage / 100) * 42;
        const hoursNeeded = targetWeeklyHours - currentHours;
        const shiftCount = workerShiftCount.get(worker.id) || 0;

        // Balance between hours needed and shift distribution
        let score = hoursNeeded - (shiftCount * 2); // Penalize too many shifts

        // Slight bonus for higher percentage workers
        score += worker.workPercentage / 20;

        if (score > bestScore) {
          bestScore = score;
          bestWorker = worker;
        }
      });

      if (bestWorker) {
        shift.workerId = bestWorker.id;
        const shiftHours = calculateShiftHours(shift);
        workerHours.set(bestWorker.id, (workerHours.get(bestWorker.id) || 0) + shiftHours);
        workerShiftCount.set(bestWorker.id, (workerShiftCount.get(bestWorker.id) || 0) + 1);
      }
    });
  });

  return assignedShifts;
}

function hasTimeOverlap(shift1: Shift, shift2: Shift): boolean {
  const start1 = parseTimeToMinutes(shift1.startTime);
  const end1 = parseTimeToMinutes(shift1.endTime);
  const start2 = parseTimeToMinutes(shift2.startTime);
  const end2 = parseTimeToMinutes(shift2.endTime);

  return !(end1 <= start2 || end2 <= start1);
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function calculateShiftHours(shift: Shift): number {
  const start = parseTimeToMinutes(shift.startTime);
  const end = parseTimeToMinutes(shift.endTime);
  return (end - start) / 60;
}

export function validateSchedule(schedule: Schedule, workers: Worker[]): string[] {
  const errors: string[] = [];

  // Group shifts by date
  const shiftsByDate = new Map<string, Shift[]>();
  schedule.shifts.forEach(shift => {
    const dateKey = formatDate(shift.date);
    if (!shiftsByDate.has(dateKey)) {
      shiftsByDate.set(dateKey, []);
    }
    shiftsByDate.get(dateKey)!.push(shift);
  });

  // Check each day
  shiftsByDate.forEach((shifts, dateKey) => {
    const date = new Date(dateKey);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];

    // Check opening coverage
    const openingShifts = shifts.filter(s => s.type === 'opening' && s.workerId);
    if (openingShifts.length === 0) {
      errors.push(`${dayName}: No one assigned to opening shift`);
    }

    // Check closing coverage (need 2 people)
    const closingShifts = shifts.filter(s => s.type === 'closing' && s.workerId);
    if (closingShifts.length < 2) {
      errors.push(`${dayName}: Need 2 people for closing (only ${closingShifts.length} assigned)`);
    }

    // Check minimum coverage during peak hours (12:00-14:00)
    const isWeekendDay = isWeekend(date);
    const requiredStaff = isWeekendDay ? 4 : 3;

    const peakTime = parseTimeToMinutes('12:00');
    const peakEndTime = parseTimeToMinutes('14:00');

    const peakStaff = shifts.filter(s => {
      if (!s.workerId) return false;
      const start = parseTimeToMinutes(s.startTime);
      const end = parseTimeToMinutes(s.endTime);
      return start <= peakTime && end >= peakEndTime;
    });

    if (peakStaff.length < requiredStaff) {
      errors.push(`${dayName}: Peak hours (12-14) need ${requiredStaff} staff (only ${peakStaff.length} scheduled)`);
    }

    // Check for unassigned shifts
    const unassignedShifts = shifts.filter(s => !s.workerId);
    if (unassignedShifts.length > 0) {
      errors.push(`${dayName}: ${unassignedShifts.length} unassigned shift(s)`);
    }

    // Check for worker conflicts
    const workerShifts = new Map<string, Shift[]>();
    shifts.forEach(shift => {
      if (shift.workerId) {
        if (!workerShifts.has(shift.workerId)) {
          workerShifts.set(shift.workerId, []);
        }
        workerShifts.get(shift.workerId)!.push(shift);
      }
    });

    workerShifts.forEach((workerDayShifts, workerId) => {
      const worker = workers.find(w => w.id === workerId);
      if (!worker) return;

      // Check for overlapping shifts
      for (let i = 0; i < workerDayShifts.length; i++) {
        for (let j = i + 1; j < workerDayShifts.length; j++) {
          if (hasTimeOverlap(workerDayShifts[i], workerDayShifts[j])) {
            errors.push(`${dayName}: ${worker.name} has overlapping shifts`);
          }
        }
      }

      // Check if worker is available on this day
      if (!isWorkerAvailable(worker, date)) {
        errors.push(`${dayName}: ${worker.name} is not available (holiday or day off)`);
      }
    });
  });

  return [...new Set(errors)]; // Remove duplicates
}

export function canAssignWorkerToShift(
  worker: Worker,
  shift: Shift,
  schedule: Schedule
): boolean {
  // Check if worker is available on this day
  if (!isWorkerAvailable(worker, shift.date)) {
    return false;
  }

  // Check for time conflicts with other shifts
  const workerShifts = schedule.shifts.filter(s =>
    s.workerId === worker.id &&
    formatDate(s.date) === formatDate(shift.date) &&
    s.id !== shift.id
  );

  for (const existingShift of workerShifts) {
    if (hasTimeOverlap(shift, existingShift)) {
      return false;
    }
  }

  return true;
}

export function removeWorkerFromShift(shift: Shift): Shift {
  return {
    ...shift,
    workerId: null
  };
}

export function assignWorkerToShift(shift: Shift, workerId: string): Shift {
  return {
    ...shift,
    workerId
  };
}