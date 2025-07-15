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

      // OPENING SHIFT (9:00-18:00) - Long shift for opening team
      templates.push({
        day: storeHour.day,
        startTime: this.subtractMinutes(openTime, 30), // 09:00
        endTime: this.addHours(openTime, 8.5), // 18:00
        type: 'opening',
        minWorkers: 2,
        maxWorkers: 3,
        priority: 'high'
      });

      // MID-DAY SHIFT (10:30-19:30) - Standard 9-hour shift
      templates.push({
        day: storeHour.day,
        startTime: this.addHours(openTime, 1), // 10:30
        endTime: this.addHours(openTime, 9), // 19:30
        type: 'regular',
        minWorkers: isWeekend ? 3 : 2,
        maxWorkers: isWeekend ? 4 : 3,
        priority: 'high'
      });

      // CLOSING SHIFT - From lunch until 30min after close
      const closingStart = this.addHours(openTime, 3.5); // 13:00
      const closingEnd = this.addMinutes(closeTime, 30); // 30min after close

      templates.push({
        day: storeHour.day,
        startTime: closingStart,
        endTime: closingEnd,
        type: 'closing',
        minWorkers: 2,
        maxWorkers: 3,
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

    // Handle same-day shifts only (no overnight shifts)
    const duration = endMinutes - startMinutes;
    return duration / 60;
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

    // Calculate how far worker is from their target as a percentage
    const currentPercentage = (currentHours / targetHours) * 100;
    const newPercentage = (newTotalHours / targetHours) * 100;

    // Preference for workers below their target, but not so strong that it prevents coverage
    if (currentPercentage < 80) {
      // Worker is under target - good bonus
      score += 80;
    } else if (currentPercentage < 100) {
      // Worker is slightly under target - moderate bonus
      score += 50;
    } else if (newPercentage <= 120) {
      // Worker would be over but within acceptable range - small bonus
      score += 20;
    } else if (newPercentage <= 140) {
      // Worker would be significantly over - small penalty
      score -= 20;
    } else {
      // Worker would be extremely over target - stronger penalty
      const overage = newPercentage - 140;
      score -= overage * 2;
    }

    // Prefer distributing hours evenly - bonus based on how far below average they are
    const allWorkerHours = existingShifts
      .filter(s => s.workerId)
      .reduce((acc, s) => {
        const hours = this.getShiftHours(s);
        acc[s.workerId!] = (acc[s.workerId!] || 0) + hours;
        return acc;
      }, {} as Record<string, number>);
    
    const avgHours = Object.values(allWorkerHours).length > 0 
      ? Object.values(allWorkerHours).reduce((sum, h) => sum + h, 0) / Object.values(allWorkerHours).length
      : 0;
    
    if (currentHours < avgHours) {
      score += 30; // Bonus for being below average
    }

    // Slight penalty for consecutive days (but don't make it too strong)
    const previousDate = this.getPreviousDay(date);
    const nextDate = this.getNextDay(date);

    const workedPreviousDay = existingShifts.some(s =>
      s.workerId === worker.id && s.date === previousDate
    );
    const workedNextDay = existingShifts.some(s =>
      s.workerId === worker.id && s.date === nextDate
    );

    if (workedPreviousDay || workedNextDay) {
      score -= 10; // Mild penalty for consecutive days
    }

    // Moderate preference for workers who haven't worked this week yet
    if (currentHours === 0) {
      score += 30;
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


  // Two-phase assignment: prioritize workers who need hours most
  private assignWorkersBalanced(
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

    // Score and sort ALL available workers (no pre-filtering)
    const scoredWorkers = availableWorkers
      .map(worker => ({
        worker,
        score: this.scoreWorkerForShift(worker, shiftTemplate, date, existingShifts)
      }))
      .sort((a, b) => b.score - a.score);

    // Determine how many workers to assign
    let workersToAssign = Math.min(
      shiftTemplate.maxWorkers,
      Math.max(shiftTemplate.minWorkers, availableWorkers.length)
    );

    // For high-priority shifts, try to assign maximum workers
    if (shiftTemplate.priority === 'high') {
      workersToAssign = Math.min(shiftTemplate.maxWorkers, availableWorkers.length);
    }

    // Assign workers with more flexible hour limits
    let assignedCount = 0;
    for (let i = 0; i < scoredWorkers.length && assignedCount < workersToAssign; i++) {
      const { worker } = scoredWorkers[i];

      // Check hour limits
      const currentHours = this.getWorkerWeeklyHours(worker.id, existingShifts);
      const targetHours = calculateTargetHours(worker.workPercentage);
      const shiftHours = this.getHoursBetween(shiftTemplate.startTime, shiftTemplate.endTime);
      const newTotalHours = currentHours + shiftHours;
      const newPercentage = (newTotalHours / targetHours) * 100;

      // More flexible limits to ensure coverage
      // Allow up to 140% for coverage needs, but only skip if we have enough workers
      if (newPercentage > 140 && assignedCount >= shiftTemplate.minWorkers) {
        continue;
      }
      
      // Absolute maximum of 160% to prevent extreme overtime
      if (newPercentage > 160) {
        continue;
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

    // Create unassigned shifts for remaining minimum requirements
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

      // Use the improved balanced assignment method
      dayTemplates.forEach(template => {
        const dayShifts = this.assignWorkersBalanced(template, dateString, shifts, new Set());
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
      notes: `Auto-generated schedule for week of ${weekStart} - Improved work percentage distribution`
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