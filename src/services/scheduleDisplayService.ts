// Worker shift consolidation service for better schedule display
// Location: src/services/scheduleDisplayService.ts

import type { Schedule, Shift, Worker } from '../types';
import { getDayOfWeek } from '../types';

export interface ConsolidatedWorkerShift {
  workerId: string;
  workerName: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  shiftTypes: string[]; // ['opening', 'lunch', 'afternoon']
  originalShifts: Shift[]; // Reference to underlying shifts
  gaps: TimeGap[]; // Any gaps in coverage (like breaks)
}

interface TimeGap {
  startTime: string;
  endTime: string;
  duration: number; // in hours
}

export interface DayScheduleDisplay {
  date: string;
  dayOfWeek: string;
  workerShifts: ConsolidatedWorkerShift[];
  unassignedShifts: Shift[];
  coverageGaps: string[]; // Warning messages about coverage
}

class ScheduleDisplayService {

  // Convert time string to minutes since midnight for easier calculation
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Convert minutes back to time string
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Calculate hours between two time strings
  private getHoursBetween(startTime: string, endTime: string): number {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    return (endMinutes - startMinutes) / 60;
  }

  // Get readable shift type labels (make public)
  getShiftTypeLabel(type: string): string {
    switch (type) {
      case 'opening': return 'Opening';
      case 'closing': return 'Closing';
      case 'regular': return 'Service';
      default: return 'Shift';
    }
  }

  // Consolidate overlapping shifts for a single worker on a single day
  private consolidateWorkerDayShifts(
    workerId: string,
    workerName: string,
    date: string,
    shifts: Shift[]
  ): ConsolidatedWorkerShift | null {

    if (shifts.length === 0) return null;

    // Sort shifts by start time
    const sortedShifts = shifts.sort((a, b) =>
      this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );

    // Find the overall start and end times
    const startTime = sortedShifts[0].startTime;
    const endTime = sortedShifts[sortedShifts.length - 1].endTime;

    // Calculate total hours
    const totalHours = this.getHoursBetween(startTime, endTime);

    // Get unique shift types in chronological order
    const shiftTypes = Array.from(new Set(
      sortedShifts.map(shift => this.getShiftTypeLabel(shift.type))
    ));

    // Detect gaps (breaks) in the schedule
    const gaps: TimeGap[] = [];
    for (let i = 0; i < sortedShifts.length - 1; i++) {
      const currentEnd = this.timeToMinutes(sortedShifts[i].endTime);
      const nextStart = this.timeToMinutes(sortedShifts[i + 1].startTime);

      if (nextStart > currentEnd) {
        const gapDuration = (nextStart - currentEnd) / 60;
        if (gapDuration >= 0.25) { // Only track gaps of 15+ minutes
          gaps.push({
            startTime: sortedShifts[i].endTime,
            endTime: sortedShifts[i + 1].startTime,
            duration: gapDuration
          });
        }
      }
    }

    return {
      workerId,
      workerName,
      date,
      startTime,
      endTime,
      totalHours,
      shiftTypes,
      originalShifts: sortedShifts,
      gaps
    };
  }

  // Consolidate all shifts for a schedule into worker-centric view
  consolidateScheduleForDisplay(schedule: Schedule, workers: Worker[]): DayScheduleDisplay[] {
    const days: DayScheduleDisplay[] = [];

    // Group shifts by date
    const shiftsByDate = new Map<string, Shift[]>();
    schedule.shifts.forEach(shift => {
      if (!shiftsByDate.has(shift.date)) {
        shiftsByDate.set(shift.date, []);
      }
      shiftsByDate.get(shift.date)!.push(shift);
    });

    // Process each day
    shiftsByDate.forEach((dayShifts, date) => {
      const dayOfWeek = getDayOfWeek(date);
      const workerShifts: ConsolidatedWorkerShift[] = [];
      const unassignedShifts: Shift[] = [];

      // Group assigned shifts by worker
      const shiftsByWorker = new Map<string, Shift[]>();
      dayShifts.forEach(shift => {
        if (shift.workerId) {
          if (!shiftsByWorker.has(shift.workerId)) {
            shiftsByWorker.set(shift.workerId, []);
          }
          shiftsByWorker.get(shift.workerId)!.push(shift);
        } else {
          unassignedShifts.push(shift);
        }
      });

      // Consolidate shifts for each worker
      shiftsByWorker.forEach((shifts, workerId) => {
        const worker = workers.find(w => w.id === workerId);
        if (worker) {
          const consolidated = this.consolidateWorkerDayShifts(
            workerId,
            worker.name,
            date,
            shifts
          );
          if (consolidated) {
            workerShifts.push(consolidated);
          }
        }
      });

      // Sort worker shifts by start time
      workerShifts.sort((a, b) =>
        this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
      );

      // Check for coverage gaps
      const coverageGaps = this.analyzeCoverageGaps(dayShifts);

      days.push({
        date,
        dayOfWeek: dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1),
        workerShifts,
        unassignedShifts,
        coverageGaps
      });
    });

    // Sort days by date
    return days.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Analyze potential coverage gaps
  private analyzeCoverageGaps(dayShifts: Shift[]): string[] {
    const gaps: string[] = [];

    // Check for unassigned required shifts
    const unassignedRequired = dayShifts.filter(s => !s.workerId && s.isRequired);
    if (unassignedRequired.length > 0) {
      gaps.push(`${unassignedRequired.length} required shifts unassigned`);
    }

    // Check for single-person coverage during busy periods
    const timeSlots = new Map<string, number>();
    dayShifts.filter(s => s.workerId).forEach(shift => {
      const startMinutes = this.timeToMinutes(shift.startTime);
      const endMinutes = this.timeToMinutes(shift.endTime);

      for (let time = startMinutes; time < endMinutes; time += 30) {
        const timeKey = this.minutesToTime(time);
        timeSlots.set(timeKey, (timeSlots.get(timeKey) || 0) + 1);
      }
    });

    // Check lunch rush coverage (11:00-15:00)
    const lunchStart = this.timeToMinutes('11:00');
    const lunchEnd = this.timeToMinutes('15:00');

    for (let time = lunchStart; time < lunchEnd; time += 30) {
      const timeKey = this.minutesToTime(time);
      const coverage = timeSlots.get(timeKey) || 0;
      if (coverage < 2) {
        gaps.push(`Low coverage during lunch rush (${timeKey})`);
        break; // Only report once per day
      }
    }

    return gaps;
  }

  // Format worker shift for display
  formatWorkerShift(shift: ConsolidatedWorkerShift): string {
    const timeRange = `${shift.startTime} - ${shift.endTime}`;
    const hours = `${shift.totalHours}h`;
    const types = shift.shiftTypes.join(' → ');

    if (shift.gaps.length > 0) {
      const breakInfo = shift.gaps.map(gap =>
        `${gap.duration}h break`
      ).join(', ');
      return `${timeRange} (${hours} + ${breakInfo}) - ${types}`;
    }

    return `${timeRange} (${hours}) - ${types}`;
  }

  // Get shift status for styling
  getShiftStatus(shift: ConsolidatedWorkerShift): {
    color: string;
    badge: string;
    priority: 'high' | 'medium' | 'low';
  } {
    const hasOpening = shift.shiftTypes.includes('Opening');
    const hasClosing = shift.shiftTypes.includes('Closing');
    const isLongShift = shift.totalHours >= 8;

    if (hasOpening && hasClosing) {
      return {
        color: 'bg-purple-100 border-purple-300 text-purple-800',
        badge: 'Full Day',
        priority: 'high'
      };
    } else if (hasOpening) {
      return {
        color: 'bg-blue-100 border-blue-300 text-blue-800',
        badge: 'Opening',
        priority: 'medium'
      };
    } else if (hasClosing) {
      return {
        color: 'bg-orange-100 border-orange-300 text-orange-800',
        badge: 'Closing',
        priority: 'medium'
      };
    } else if (isLongShift) {
      return {
        color: 'bg-green-100 border-green-300 text-green-800',
        badge: 'Long Shift',
        priority: 'medium'
      };
    } else {
      return {
        color: 'bg-gray-100 border-gray-300 text-gray-800',
        badge: 'Regular',
        priority: 'low'
      };
    }
  }

  // Get weekly summary for a worker
  getWorkerWeeklySummary(
    workerId: string,
    displaySchedule: DayScheduleDisplay[]
  ): {
    totalHours: number;
    daysWorked: number;
    averageHoursPerDay: number;
    longestShift: number;
    shiftTypes: string[];
  } {
    let totalHours = 0;
    let daysWorked = 0;
    let longestShift = 0;
    const shiftTypes = new Set<string>();

    displaySchedule.forEach(day => {
      const workerShift = day.workerShifts.find(ws => ws.workerId === workerId);
      if (workerShift) {
        totalHours += workerShift.totalHours;
        daysWorked++;
        longestShift = Math.max(longestShift, workerShift.totalHours);
        workerShift.shiftTypes.forEach(type => shiftTypes.add(type));
      }
    });

    return {
      totalHours,
      daysWorked,
      averageHoursPerDay: daysWorked > 0 ? totalHours / daysWorked : 0,
      longestShift,
      shiftTypes: Array.from(shiftTypes)
    };
  }
}

// Export singleton instance
export const scheduleDisplayService = new ScheduleDisplayService();