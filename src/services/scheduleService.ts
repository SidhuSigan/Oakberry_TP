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
  priority: 'high' | 'medium' | 'low'; // Business priority for this time slot
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

  // Create shift templates based on store hours and business demands
  private createShiftTemplates(): ShiftTemplate[] {
    const templates: ShiftTemplate[] = [];

    DEFAULT_STORE_HOURS.forEach(storeHour => {
      if (!storeHour.isOpen) return;

      const openTime = storeHour.open;
      const closeTime = storeHour.close;
      const isWeekend = storeHour.day === 'saturday' || storeHour.day === 'sunday';
      const isLongDay = storeHour.day === 'thursday' || storeHour.day === 'friday' || isWeekend;

      // OPENING PERIOD (9:00-11:00) - 1 person sufficient for setup
      templates.push({
        day: storeHour.day,
        startTime: this.subtractMinutes(openTime, 30), // 09:00
        endTime: this.addHours(openTime, 1.5), // 11:00
        type: 'opening',
        minWorkers: 1,
        maxWorkers: 1,
        priority: 'medium'
      });

      // LUNCH RUSH (11:00-15:00) - High demand period
      templates.push({
        day: storeHour.day,
        startTime: this.addHours(openTime, 1.5), // 11:00
        endTime: this.addHours(openTime, 5.5), // 15:00
        type: 'regular',
        minWorkers: isWeekend ? 4 : 3, // Sunday = 4 people, weekdays = 3 people
        maxWorkers: isWeekend ? 5 : 4,
        priority: 'high'
      });

      // AFTERNOON (15:00-17:00) - Moderate demand
      templates.push({
        day: storeHour.day,
        startTime: this.addHours(openTime, 5.5), // 15:00
        endTime: this.addHours(openTime, 7.5), // 17:00
        type: 'regular',
        minWorkers: isWeekend ? 3 : 2,
        maxWorkers: isWeekend ? 4 : 3,
        priority: 'medium'
      });

      // EVENING RUSH (17:00-19:30) - High demand again
      if (isLongDay) {
        templates.push({
          day: storeHour.day,
          startTime: this.addHours(openTime, 7.5), // 17:00
          endTime: this.addHours(openTime, 10), // 19:30
          type: 'regular',
          minWorkers: isWeekend ? 4 : 3,
          maxWorkers: isWeekend ? 5 : 4,
          priority: 'high'
        });
      }

      // CLOSING PERIOD - 2 people for cleaning and closing tasks
      const closingStart = isLongDay ?
        this.addHours(openTime, 10) : // 19:30 for long days
        this.addHours(openTime, 7.5);  // 17:00 for short days

      templates.push({
        day: storeHour.day,
        startTime: closingStart,
        endTime: this.addMinutes(closeTime, 30), // 30min after close
        type: 'closing',
        minWorkers: 2,
        maxWorkers: 3, // Extra person on busy days
        priority: 'high'
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

//   private subtractHours(time: string, hours: number): string {
//     return this.addMinutes(time, -hours * 60);
//   }

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

  // Get available workers for a specific date and shift (now allows concurrent assignments)
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

    // Strong preference for workers who are significantly under their target
    const hoursRemaining = Math.max(0, targetHours - currentHours);

    if (hoursRemaining >= shiftHours) {
      // Worker is well under target - strong bonus
      score += 100;
    } else if (hoursRemaining > 0) {
      // Worker is slightly under target - moderate bonus
      score += 50;
    } else if (newTotalHours <= targetHours + 2) {
      // Worker would be slightly over target - small bonus
      score += 20;
    } else if (newTotalHours <= targetHours + 5) {
      // Worker would be moderately over target - neutral
      score += 0;
    } else {
      // Worker would be significantly over target - penalty
      const overage = newTotalHours - targetHours;
      score -= overage * 10;
    }

    // Balance workload across team - prefer workers with fewer current hours
    const weeklyHoursRatio = currentHours / Math.max(targetHours, 1);
    score += (1 - weeklyHoursRatio) * 50;

    // Preference for higher work percentage workers for critical shifts
    if (shift.type === 'opening' || shift.type === 'closing') {
      score += worker.workPercentage * 0.3;
    }

    // Avoid consecutive days when possible (but don't make it a hard constraint)
    const previousDate = this.getPreviousDay(date);
    const nextDate = this.getNextDay(date);

    const workedPreviousDay = existingShifts.some(s =>
      s.workerId === worker.id && s.date === previousDate
    );
    const workedNextDay = existingShifts.some(s =>
      s.workerId === worker.id && s.date === nextDate
    );

    if (workedPreviousDay || workedNextDay) {
      score -= 15; // Penalty for consecutive days
    }

    // Slight preference for workers who haven't worked this week yet
    if (currentHours === 0) {
      score += 25;
    }

    return Math.max(0, score);
  }

  // Get previous day
  private getPreviousDay(date: string): string {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  // Get next day
  private getNextDay(date: string): string {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  // Assign workers to a shift (now handles multiple concurrent workers)
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
      // Create unassigned shifts for the minimum required workers
      for (let i = 0; i < shiftTemplate.minWorkers; i++) {
        shifts.push({
          id: this.generateShiftId(),
          date,
          startTime: shiftTemplate.startTime,
          endTime: shiftTemplate.endTime,
          type: shiftTemplate.type,
          isRequired: true,
          workerId: undefined
        });
      }
      return shifts;
    }

    // Score and sort workers
    const scoredWorkers = availableWorkers
      .map(worker => ({
        worker,
        score: this.scoreWorkerForShift(worker, shiftTemplate, date, existingShifts)
      }))
      .sort((a, b) => b.score - a.score);

    // Determine how many workers to assign based on template and availability
    let workersToAssign = Math.min(
      shiftTemplate.maxWorkers,
      Math.max(shiftTemplate.minWorkers, availableWorkers.length)
    );

    // For high-priority shifts (lunch/dinner rush), try to assign maximum workers
    if (shiftTemplate.priority === 'high') {
      workersToAssign = Math.min(shiftTemplate.maxWorkers, availableWorkers.length);
    }

    // Assign workers up to the determined amount
    let assignedCount = 0;
    for (let i = 0; i < workersToAssign && i < scoredWorkers.length; i++) {
      const { worker } = scoredWorkers[i];

      // Check if this worker would go extremely over their target
      const currentHours = this.getWorkerWeeklyHours(worker.id, existingShifts);
      const targetHours = calculateTargetHours(worker.workPercentage);
      const shiftHours = this.getHoursBetween(shiftTemplate.startTime, shiftTemplate.endTime);
      const newTotalHours = currentHours + shiftHours;

      // Allow flexibility but prevent extreme overages (only skip if we have enough coverage)
      const overage = newTotalHours - targetHours;
      if (overage > 12 && assignedCount >= shiftTemplate.minWorkers) {
        continue; // Skip this worker
      }

      shifts.push({
        id: this.generateShiftId(),
        date,
        startTime: shiftTemplate.startTime,
        endTime: shiftTemplate.endTime,
        type: shiftTemplate.type,
        isRequired: assignedCount < shiftTemplate.minWorkers,
        workerId: worker.id
      });

      assignedWorkerIds.add(worker.id);
      assignedCount++;
    }

    // If we couldn't assign enough workers for minimum requirements, create unassigned shifts
    for (let i = assignedCount; i < shiftTemplate.minWorkers; i++) {
      shifts.push({
        id: this.generateShiftId(),
        date,
        startTime: shiftTemplate.startTime,
        endTime: shiftTemplate.endTime,
        type: shiftTemplate.type,
        isRequired: true,
        workerId: undefined
      });
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

      // For each shift time slot, we can assign multiple workers concurrently
      dayTemplates.forEach(template => {
        const dayShifts = this.assignWorkersToShift(template, dateString, shifts, new Set());
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
      notes: `Auto-generated schedule for week of ${weekStart} - Oakberry Açaí Bowl Shop`
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

    if (activeWorkers.length < 3) {
      issues.push('At least 3 active workers are recommended for proper açaí bowl shop coverage');
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