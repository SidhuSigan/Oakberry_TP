import { Worker, Shift, Schedule } from '@/types';
import {
  getWeekDates,
  getStoreHours,
  getOpeningShiftTime,
  getClosingShiftTime,
  getDayOfWeek,
  isWeekend,
  formatDate
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

    // Opening shift (1 person, 30 min before opening)
    shifts.push(createShift(
      date,
      getOpeningShiftTime(dayOfWeek),
      storeHours.open,
      'opening'
    ));

    // Morning shift (second person arrives 10:00-10:30)
    const morningStart = dayOfWeek === 6 ? '09:30' : '10:00'; // Earlier on Saturday
    shifts.push(createShift(
      date,
      morningStart,
      '14:00',
      'regular'
    ));

    // Midday shifts (additional coverage for peak)
    const isWeekendDay = isWeekend(date);
    const peakStaff = isWeekendDay ? 4 : 3; // More staff on weekends

    // Add peak hour shifts (12:00-16:00)
    for (let i = 0; i < peakStaff - 2; i++) { // -2 because we already have 2 people
      shifts.push(createShift(
        date,
        '12:00',
        '16:00',
        'regular'
      ));
    }

    // Afternoon/evening shifts
    shifts.push(createShift(
      date,
      '14:00',
      getClosingShiftTime(dayOfWeek),
      'closing'
    ));

    // Second closing shift (2 people required for closing)
    shifts.push(createShift(
      date,
      '16:00',
      getClosingShiftTime(dayOfWeek),
      'closing'
    ));
  });

  return shifts;
}

export function assignWorkersToShifts(
  shifts: Shift[],
  workers: Worker[],
  existingSchedule?: Schedule
): Shift[] {
  const assignedShifts = [...shifts];
  const prioritizedWorkers = prioritizeWorkers(workers.filter(w => w.isActive));

  // Track assigned hours per worker
  const workerHours = new Map<string, number>();
  prioritizedWorkers.forEach(worker => {
    workerHours.set(worker.id, 0);
  });

  // Group shifts by date and type
  const shiftsByDate = new Map<string, Shift[]>();
  assignedShifts.forEach(shift => {
    const dateKey = formatDate(shift.date);
    if (!shiftsByDate.has(dateKey)) {
      shiftsByDate.set(dateKey, []);
    }
    shiftsByDate.get(dateKey)!.push(shift);
  });

  // Assign shifts day by day
  shiftsByDate.forEach((dayShifts, dateKey) => {
    const date = new Date(dateKey);

    // Sort shifts by priority: opening first, then regular, then closing
    dayShifts.sort((a, b) => {
      const priority = { opening: 1, regular: 2, closing: 3 };
      return priority[a.type] - priority[b.type];
    });

    // Available workers for this day
    const availableWorkers = prioritizedWorkers.filter(worker =>
      isWorkerAvailable(worker, date)
    );

    // Assign workers to shifts
    dayShifts.forEach(shift => {
      if (shift.workerId) return; // Already assigned

      // Find best worker for this shift
      let bestWorker: Worker | null = null;
      let minHours = Infinity;

      availableWorkers.forEach(worker => {
        const currentHours = workerHours.get(worker.id) || 0;
        const targetWeeklyHours = (worker.workPercentage / 100) * 42; // 42 hours = 100%

        // Check if worker is already assigned to another shift at the same time
        const hasConflict = dayShifts.some(s =>
          s.workerId === worker.id &&
          s.id !== shift.id &&
          hasTimeOverlap(shift, s)
        );

        if (hasConflict) return;

        // Prioritize workers who need more hours
        if (currentHours < targetWeeklyHours && currentHours < minHours) {
          bestWorker = worker;
          minHours = currentHours;
        }
      });

      if (bestWorker) {
        shift.workerId = bestWorker.id;
        const shiftHours = calculateShiftHours(shift);
        workerHours.set(bestWorker.id, (workerHours.get(bestWorker.id) || 0) + shiftHours);
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

    // Check closing coverage
    const closingShifts = shifts.filter(s => s.type === 'closing' && s.workerId);
    if (closingShifts.length < 2) {
      errors.push(`${dayName}: Need 2 people for closing (only ${closingShifts.length} assigned)`);
    }

    // Check minimum coverage during operating hours
    const storeHours = getStoreHours(date.getDay());
    const requiredStaff = isWeekend(date) ? 4 : 3;
    const peakShifts = shifts.filter(s =>
      s.workerId &&
      parseTimeToMinutes(s.startTime) <= parseTimeToMinutes('12:00') &&
      parseTimeToMinutes(s.endTime) >= parseTimeToMinutes('14:00')
    );

    if (peakShifts.length < requiredStaff) {
      errors.push(`${dayName}: Peak hours need ${requiredStaff} staff (only ${peakShifts.length} scheduled)`);
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
    });
  });

  return errors;
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