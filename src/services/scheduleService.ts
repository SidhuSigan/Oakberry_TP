// Schedule service for generating and managing weekly schedules
// Location: src/services/scheduleService.ts

import type {
  Schedule,
  Shift,
  Worker,
  DayOfWeek,
  ShiftType,
  ArbeitspenaumStatus
} from '../types';
import {
  DEFAULT_STORE_HOURS,
  getDayOfWeek,
  calculateTargetHours,
  getArbeitspenumStatus
} from '../types';
import { storageService } from './storage';
import { workerService } from './workerService';

interface ScheduleGenerationOptions {
  weekStartDate: string; // Monday in YYYY-MM-DD format
  minStaffPerShift?: number;
  prioritizeWorkBalance?: boolean;
  considerWeather?: boolean;
}

interface ShiftTemplate {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  type: ShiftType;
  minWorkers: number;
  maxWorkers: number;
}

class ScheduleService {
  // Generate unique ID for schedules
  private generateId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate shift ID
  private generateShiftId(): string {
    return `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get Monday of the week for a given date
  private getWeekStart(date: string): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  // Create shift templates based on store hours
  private createShiftTemplates(): ShiftTemplate[] {
    const templates: ShiftTemplate[] = [];

    DEFAULT_STORE_HOURS.forEach(storeHour => {
      if (!storeHour.isOpen) return;

      const openTime = storeHour.open;
      const closeTime = storeHour.close;

      // Opening shift: 30 minutes before store opens until 2 hours after
      const openingStart = this.subtractMinutes(openTime, 30);
      const openingEnd = this.addHours(openTime, 2);

      templates.push({
        day: storeHour.day,
        startTime: openingStart,
        endTime: openingEnd,
        type: 'opening',
        minWorkers: 1,
        maxWorkers: 1
      });

      // Middle shifts during operating hours (if store is open long enough)
      const totalHours = this.getHoursBetween(openTime, closeTime);
      if (totalHours > 6) {
        // Create middle shifts
        let currentTime = this.addHours(openTime, 1);
        while (this.getHoursBetween(currentTime, closeTime) > 3) {
          const shiftEnd = this.addHours(currentTime, 4);
          templates.push({
            day: storeHour.day,
            startTime: currentTime,
            endTime: shiftEnd,
            type: 'regular',
            minWorkers: 1,
            maxWorkers: 2
          });
          currentTime = this.addHours(currentTime, 2);
        }
      }

      // Closing shift: 2 hours before close until 30 minutes after
      const closingStart = this.subtractHours(closeTime, 2);
      const closingEnd = this.addMinutes(closeTime, 30);

      templates.push({
        day: storeHour.day,
        startTime: closingStart,
        endTime: closingEnd,
        type: 'closing',
        minWorkers: 2, // 2 people for closing
        maxWorkers: 2
      });
    });

    return templates;
  }

  // Time calculation helpers
  private addMinutes(time: string, minutes: number): string {
    const [hour, min] = time.split(':').map(Number);
    const totalMinutes = hour * 60 + min + minutes;
    const newHour = Math.floor(totalMinutes / 60) % 24;
    const newMin = totalMinutes % 60;
    return `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`;
  }

  private subtractMinutes(time: string, minutes: number): string {
    return this.addMinutes(time, -minutes);
  }

  private addHours(time: string, hours: number): string {
    return this.addMinutes(time, hours * 60);
  }

  private subtractHours(time: string, hours: number): string {
    return this.addMinutes(time, -hours * 60);
  }

  private getHoursBetween(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return (endMinutes - startMinutes) / 60;
  }

  private getShiftHours(shift: Shift): number {
    return this.getHoursBetween(shift.startTime, shift.endTime);
  }

  // Get available workers for a specific date and shift
  private getAvailableWorkersForShift(date: string, excludeWorkerIds: string[] = []): Worker[] {
    const dayOfWeek = getDayOfWeek(date);
    const availableWorkers = workerService.getAvailableWorkers(date);

    return availableWorkers.filter(worker =>
      !excludeWorkerIds.includes(worker.id) &&
      worker.availableDays.includes(dayOfWeek)
    );
  }

  // Calculate worker's current weekly hours (for this schedule)
  private getWorkerWeeklyHours(workerId: string, shifts: Shift[]): number {
    return shifts
      .filter(s => s.workerId === workerId)
      .reduce((total, shift) => total + this.getShiftHours(shift), 0);
  }

  // Score worker for shift assignment (higher score = better fit)
  private scoreWorkerForShift(worker: Worker, shift: ShiftTemplate, date: string, existingShifts: Shift[]): number {
    let score = 100;

    // Check current weekly hours vs target
    const currentHours = this.getWorkerWeeklyHours(worker.id, existingShifts);
    const targetHours = calculateTargetHours(worker.workPercentage);
    const shiftHours = this.getHoursBetween(shift.startTime, shift.endTime);
    const newTotalHours = currentHours + shiftHours;

    // Prefer workers who are under their target hours
    if (newTotalHours <= targetHours) {
      score += 50; // Bonus for staying under target
    } else {
      // Penalty for going over target (but still possible if needed)
      const overagePercent = ((newTotalHours - targetHours) / targetHours) * 100;
      score -= overagePercent * 2;
    }

    // Balance workload - prefer workers with fewer hours this week
    const hoursRatio = currentHours / Math.max(targetHours, 1);
    score += (1 - hoursRatio) * 30;

    // Slight preference for higher work percentage workers for important shifts
    if (shift.type === 'opening' || shift.type === 'closing') {
      score += worker.workPercentage * 0.2;
    }

    // Check if worker has worked the day before (avoid consecutive days if possible)
    const previousDate = this.getPreviousDay(date);
    const workedPreviousDay = existingShifts.some(s =>
      s.workerId === worker.id && s.date === previousDate
    );
    if (workedPreviousDay) {
      score -= 10; // Small penalty for consecutive days
    }

    return Math.max(0, score);
  }

  // Get previous day
  private getPreviousDay(date: string): string {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  // Assign workers to a shift
  private assignWorkersToShift(
    shiftTemplate: ShiftTemplate,
    date: string,
    existingShifts: Shift[],
    assignedWorkerIds: Set<string>
  ): Shift[] {
    const shifts: Shift[] = [];
    const availableWorkers = this.getAvailableWorkersForShift(
      date,
      Array.from(assignedWorkerIds)
    );

    if (availableWorkers.length === 0) {
      // Create unassigned shift
      return [{
        id: this.generateShiftId(),
        date,
        startTime: shiftTemplate.startTime,
        endTime: shiftTemplate.endTime,
        type: shiftTemplate.type,
        isRequired: shiftTemplate.minWorkers > 0,
        workerId: undefined
      }];
    }

    // Score and sort workers
    const scoredWorkers = availableWorkers
      .map(worker => ({
        worker,
        score: this.scoreWorkerForShift(worker, shiftTemplate, date, existingShifts)
      }))
      .sort((a, b) => b.score - a.score);

    // Assign workers based on min/max requirements
    const workersNeeded = Math.min(shiftTemplate.maxWorkers, Math.max(shiftTemplate.minWorkers, 1));

    for (let i = 0; i < workersNeeded && i < scoredWorkers.length; i++) {
      const { worker } = scoredWorkers[i];

      shifts.push({
        id: this.generateShiftId(),
        date,
        startTime: shiftTemplate.startTime,
        endTime: shiftTemplate.endTime,
        type: shiftTemplate.type,
        isRequired: i < shiftTemplate.minWorkers,
        workerId: worker.id
      });

      assignedWorkerIds.add(worker.id);
    }

    return shifts;
  }

  // Generate a complete weekly schedule
  generateSchedule(options: ScheduleGenerationOptions): Schedule {
    const weekStart = this.getWeekStart(options.weekStartDate);
    const shifts: Shift[] = [];
    const shiftTemplates = this.createShiftTemplates();

    // Process each day of the week
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + dayOffset);
      const dateString = currentDate.toISOString().split('T')[0];

      const dayOfWeek = getDayOfWeek(dateString);
      const dayTemplates = shiftTemplates.filter(template => template.day === dayOfWeek);

      // Track assigned workers for this day to avoid double-booking
      const assignedWorkerIds = new Set<string>();

      // Process each shift template for this day
      dayTemplates.forEach(template => {
        const dayShifts = this.assignWorkersToShift(template, dateString, shifts, assignedWorkerIds);
        shifts.push(...dayShifts);
      });
    }

    // Create the schedule object
    const schedule: Schedule = {
      id: this.generateId(),
      weekStartDate: weekStart,
      shifts,
      isGenerated: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: `Auto-generated schedule for week of ${weekStart}`
    };

    return schedule;
  }

  // Save generated schedule
  saveSchedule(schedule: Schedule): boolean {
    return storageService.addSchedule(schedule);
  }

  // Get existing schedule for a week
  getScheduleForWeek(weekStartDate: string): Schedule | null {
    const weekStart = this.getWeekStart(weekStartDate);
    return storageService.getScheduleByWeek(weekStart);
  }

  // Update existing schedule
  updateSchedule(schedule: Schedule): boolean {
    const updatedSchedule: Schedule = {
      ...schedule,
      updatedAt: new Date().toISOString()
    };
    return storageService.updateSchedule(updatedSchedule);
  }

  // Delete schedule
  deleteSchedule(scheduleId: string): boolean {
    return storageService.deleteSchedule(scheduleId);
  }

  // Get all schedules
  getAllSchedules(): Schedule[] {
    return storageService.getSchedules();
  }

  // Calculate weekly hours for each worker in a schedule
  calculateWeeklyHours(schedule: Schedule): Map<string, { scheduled: number; target: number; status: ArbeitspenaumStatus }> {
    const workerHours = new Map<string, { scheduled: number; target: number; status: ArbeitspenaumStatus }>();
    const workers = workerService.getAllWorkers();

    // Initialize with all active workers
    workers.filter(w => w.isActive).forEach(worker => {
      const targetHours = calculateTargetHours(worker.workPercentage);
      workerHours.set(worker.id, {
        scheduled: 0,
        target: targetHours,
        status: 'target'
      });
    });

    // Calculate actual scheduled hours
    schedule.shifts.forEach(shift => {
      if (shift.workerId) {
        const current = workerHours.get(shift.workerId);
        if (current) {
          const shiftHours = this.getShiftHours(shift);
          const newScheduled = current.scheduled + shiftHours;
          const status = getArbeitspenumStatus(newScheduled, current.target);

          workerHours.set(shift.workerId, {
            ...current,
            scheduled: newScheduled,
            status
          });
        }
      }
    });

    return workerHours;
  }

  // Get schedule statistics
  getScheduleStats(schedule: Schedule): {
    totalShifts: number;
    assignedShifts: number;
    unassignedShifts: number;
    totalHours: number;
    workerCount: number;
    avgHoursPerWorker: number;
  } {
    const assignedShifts = schedule.shifts.filter(s => s.workerId);
    const unassignedShifts = schedule.shifts.filter(s => !s.workerId);
    const totalHours = schedule.shifts.reduce((sum, shift) => sum + this.getShiftHours(shift), 0);
    const uniqueWorkers = new Set(assignedShifts.map(s => s.workerId)).size;

    return {
      totalShifts: schedule.shifts.length,
      assignedShifts: assignedShifts.length,
      unassignedShifts: unassignedShifts.length,
      totalHours,
      workerCount: uniqueWorkers,
      avgHoursPerWorker: uniqueWorkers > 0 ? totalHours / uniqueWorkers : 0
    };
  }

  // Check if a schedule can be generated (enough workers, etc.)
  canGenerateSchedule(weekStartDate: string): { canGenerate: boolean; issues: string[] } {
    const weekStart = this.getWeekStart(weekStartDate);
    const issues: string[] = [];
    const activeWorkers = workerService.getActiveWorkers();

    if (activeWorkers.length === 0) {
      issues.push('No active workers available');
      return { canGenerate: false, issues };
    }

    if (activeWorkers.length < 2) {
      issues.push('At least 2 active workers are recommended for proper coverage');
    }

    // Check each day for minimum coverage
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + dayOffset);
      const dateString = currentDate.toISOString().split('T')[0];

      const availableWorkers = workerService.getAvailableWorkers(dateString);

      if (availableWorkers.length === 0) {
        const dayName = getDayOfWeek(dateString);
        issues.push(`No workers available on ${dayName} (${dateString})`);
      } else if (availableWorkers.length < 2) {
        const dayName = getDayOfWeek(dateString);
        issues.push(`Only ${availableWorkers.length} worker available on ${dayName} - may not cover all shifts`);
      }
    }

    return {
      canGenerate: issues.length === 0 || issues.every(issue => issue.includes('recommended')),
      issues
    };
  }

  // Helper to format shift time range
  formatShiftTime(shift: Shift): string {
    return `${shift.startTime} - ${shift.endTime}`;
  }

  // Helper to get readable shift type
  getShiftTypeLabel(type: ShiftType): string {
    switch (type) {
      case 'opening': return 'Opening';
      case 'closing': return 'Closing';
      case 'regular': return 'Regular';
      default: return 'Shift';
    }
  }
}

// Export singleton instance
export const scheduleService = new ScheduleService();