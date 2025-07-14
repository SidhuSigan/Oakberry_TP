// Worker service for business logic and validation
// Location: src/services/workerService.ts

import type { Worker, WorkerFormData, ValidationError, DayOfWeek } from '../types';
import { calculateTargetHours } from '../types';
import { storageService } from './storage';

class WorkerService {
  // Generate unique ID for workers
  private generateId(): string {
    return `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Validate worker form data
  validateWorkerData(data: WorkerFormData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Name validation
    if (!data.name || data.name.trim().length < 2) {
      errors.push({
        field: 'name',
        message: 'Name must be at least 2 characters long'
      });
    }

    // Phone validation (basic)
    if (!data.phone || data.phone.trim().length < 10) {
      errors.push({
        field: 'phone',
        message: 'Please enter a valid phone number'
      });
    }

    // Email validation (if provided)
    if (data.email && data.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.trim())) {
        errors.push({
          field: 'email',
          message: 'Please enter a valid email address'
        });
      }
    }

    // Work percentage validation
    if (!data.workPercentage || data.workPercentage < 10 || data.workPercentage > 100) {
      errors.push({
        field: 'workPercentage',
        message: 'Work percentage must be between 10% and 100%'
      });
    }

    // Available days validation
    if (!data.availableDays || data.availableDays.length === 0) {
      errors.push({
        field: 'availableDays',
        message: 'Please select at least one available day'
      });
    }

    // Check for duplicate names (excluding current worker if updating)
    const existingWorkers = this.getAllWorkers();
    const duplicateName = existingWorkers.find(w =>
      w.name.toLowerCase().trim() === data.name.toLowerCase().trim()
    );

    if (duplicateName) {
      errors.push({
        field: 'name',
        message: 'A worker with this name already exists'
      });
    }

    return errors;
  }

  // Create new worker
  createWorker(data: WorkerFormData): { success: boolean; worker?: Worker; errors?: ValidationError[] } {
    const errors = this.validateWorkerData(data);

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const now = new Date().toISOString();
    const worker: Worker = {
      id: this.generateId(),
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || undefined,
      workPercentage: data.workPercentage,
      availableDays: [...data.availableDays],
      holidayDates: [],
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    const saved = storageService.addWorker(worker);

    if (!saved) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'Failed to save worker data' }]
      };
    }

    return { success: true, worker };
  }

  // Update existing worker
  updateWorker(workerId: string, data: WorkerFormData): { success: boolean; worker?: Worker; errors?: ValidationError[] } {
    const existingWorker = storageService.getWorkerById(workerId);

    if (!existingWorker) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'Worker not found' }]
      };
    }

    // Validate data (excluding duplicate name check for same worker)
    const errors = this.validateWorkerData(data).filter(error => {
      if (error.field === 'name') {
        const existingWorkers = this.getAllWorkers();
        const duplicateName = existingWorkers.find(w =>
          w.name.toLowerCase().trim() === data.name.toLowerCase().trim() && w.id !== workerId
        );
        return !!duplicateName;
      }
      return true;
    });

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const updatedWorker: Worker = {
      ...existingWorker,
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || undefined,
      workPercentage: data.workPercentage,
      availableDays: [...data.availableDays],
      updatedAt: new Date().toISOString()
    };

    const saved = storageService.updateWorker(updatedWorker);

    if (!saved) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'Failed to update worker data' }]
      };
    }

    return { success: true, worker: updatedWorker };
  }

  // Get all workers
  getAllWorkers(): Worker[] {
    return storageService.getWorkers();
  }

  // Get active workers only
  getActiveWorkers(): Worker[] {
    return storageService.getWorkers().filter(w => w.isActive);
  }

  // Get worker by ID
  getWorkerById(workerId: string): Worker | null {
    return storageService.getWorkerById(workerId);
  }

  // Delete worker (soft delete - mark as inactive)
  deleteWorker(workerId: string): { success: boolean; error?: string } {
    const worker = storageService.getWorkerById(workerId);

    if (!worker) {
      return { success: false, error: 'Worker not found' };
    }

    // Check if worker is assigned to any future schedules
    // For now, we'll do a soft delete by marking as inactive
    const updatedWorker: Worker = {
      ...worker,
      isActive: false,
      updatedAt: new Date().toISOString()
    };

    const saved = storageService.updateWorker(updatedWorker);

    if (!saved) {
      return { success: false, error: 'Failed to delete worker' };
    }

    return { success: true };
  }

  // Permanently delete worker (hard delete)
  permanentlyDeleteWorker(workerId: string): { success: boolean; error?: string } {
    const deleted = storageService.deleteWorker(workerId);

    if (!deleted) {
      return { success: false, error: 'Failed to permanently delete worker' };
    }

    return { success: true };
  }

  // FIXED: Toggle worker status between active/inactive
  toggleWorkerStatus(workerId: string): { success: boolean; error?: string } {
    const worker = this.getWorkerById(workerId);
    if (!worker) return { success: false, error: 'Worker not found' };

    const updatedWorker: Worker = {
      ...worker,
      isActive: !worker.isActive,
      updatedAt: new Date().toISOString()
    };

    const saved = storageService.updateWorker(updatedWorker);

    if (!saved) {
      return { success: false, error: 'Failed to update worker status' };
    }

    return { success: true };
  }

  // Add holiday date for worker
  addHolidayDate(workerId: string, date: string): { success: boolean; error?: string } {
    const worker = storageService.getWorkerById(workerId);

    if (!worker) {
      return { success: false, error: 'Worker not found' };
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return { success: false, error: 'Invalid date format. Use YYYY-MM-DD' };
    }

    // Check if date is not in the past
    const holidayDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (holidayDate < today) {
      return { success: false, error: 'Cannot add holiday dates in the past' };
    }

    // Check if date is already added
    if (worker.holidayDates.includes(date)) {
      return { success: false, error: 'Holiday date already exists' };
    }

    const updatedWorker: Worker = {
      ...worker,
      holidayDates: [...worker.holidayDates, date].sort(),
      updatedAt: new Date().toISOString()
    };

    const saved = storageService.updateWorker(updatedWorker);

    if (!saved) {
      return { success: false, error: 'Failed to add holiday date' };
    }

    return { success: true };
  }

  // Remove holiday date for worker
  removeHolidayDate(workerId: string, date: string): { success: boolean; error?: string } {
    const worker = storageService.getWorkerById(workerId);

    if (!worker) {
      return { success: false, error: 'Worker not found' };
    }

    const updatedWorker: Worker = {
      ...worker,
      holidayDates: worker.holidayDates.filter(d => d !== date),
      updatedAt: new Date().toISOString()
    };

    const saved = storageService.updateWorker(updatedWorker);

    if (!saved) {
      return { success: false, error: 'Failed to remove holiday date' };
    }

    return { success: true };
  }

  // Check if worker is available on a specific date
  isWorkerAvailable(workerId: string, date: string): boolean {
    const worker = this.getWorkerById(workerId);

    if (!worker || !worker.isActive) {
      return false;
    }

    // Check if it's a holiday
    if (worker.holidayDates.includes(date)) {
      return false;
    }

    // Check if it's an available day of week
    const dayOfWeek = this.getDayOfWeek(date);
    return worker.availableDays.includes(dayOfWeek);
  }

  // Get workers available on a specific date
  getAvailableWorkers(date: string): Worker[] {
    return this.getActiveWorkers().filter(worker =>
      this.isWorkerAvailable(worker.id, date)
    );
  }

  // Calculate target hours for worker
  getTargetHours(workerId: string): number {
    const worker = this.getWorkerById(workerId);
    return worker ? calculateTargetHours(worker.workPercentage) : 0;
  }

  // Helper to get day of week from date string
  private getDayOfWeek(dateString: string): DayOfWeek {
    const date = new Date(dateString);
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  // Get worker statistics
  getWorkerStats(): {
    total: number;
    active: number;
    inactive: number;
    averageWorkPercentage: number;
  } {
    const workers = this.getAllWorkers();
    const active = workers.filter(w => w.isActive);
    const inactive = workers.filter(w => !w.isActive);

    const averageWorkPercentage = active.length > 0
      ? active.reduce((sum, w) => sum + w.workPercentage, 0) / active.length
      : 0;

    return {
      total: workers.length,
      active: active.length,
      inactive: inactive.length,
      averageWorkPercentage: Math.round(averageWorkPercentage)
    };
  }
}

// Export singleton instance
export const workerService = new WorkerService();