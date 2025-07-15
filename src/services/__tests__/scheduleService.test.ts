import { scheduleService } from '../scheduleService';
import { workerService } from '../workerService';
import type { Worker, Schedule } from '../../types/index';

// Mock the worker service
jest.mock('../workerService', () => ({
  workerService: {
    getAllWorkers: jest.fn(),
    getAvailableWorkers: jest.fn(),
    getActiveWorkers: jest.fn(),
  },
}));

// Mock the storage service
jest.mock('../storage', () => ({
  storageService: {
    addSchedule: jest.fn(() => true),
    getScheduleByWeek: jest.fn(),
    updateSchedule: jest.fn(() => true),
    deleteSchedule: jest.fn(() => true),
    getSchedules: jest.fn(() => []),
  },
}));

const mockWorkerService = workerService as jest.Mocked<typeof workerService>;

describe('ScheduleService', () => {
  const mockWorkers: Worker[] = [
    {
      id: 'worker1',
      name: 'Alice',
      phone: '+41 79 123 4567',
      workPercentage: 80,
      availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      holidayDates: [],
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'worker2',
      name: 'Bob',
      phone: '+41 79 234 5678',
      workPercentage: 100,
      availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      holidayDates: [],
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'worker3',
      name: 'Charlie',
      phone: '+41 79 345 6789',
      workPercentage: 60,
      availableDays: ['wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      holidayDates: [],
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkerService.getAllWorkers.mockReturnValue(mockWorkers);
    mockWorkerService.getActiveWorkers.mockReturnValue(mockWorkers);
    mockWorkerService.getAvailableWorkers.mockReturnValue(mockWorkers);
  });

  describe('generateSchedule', () => {
    it('should generate a schedule for a given week', () => {
      const schedule = scheduleService.generateSchedule({
        weekStartDate: '2024-01-01', // Monday
      });

      expect(schedule).toBeDefined();
      expect(schedule.weekStartDate).toBe('2024-01-01');
      expect(schedule.shifts.length).toBeGreaterThan(0);
      expect(schedule.isGenerated).toBe(true);
    });

    it('should create shifts for all 7 days of the week', () => {
      const schedule = scheduleService.generateSchedule({
        weekStartDate: '2024-01-01',
      });

      const uniqueDates = [...new Set(schedule.shifts.map(s => s.date))];
      expect(uniqueDates.length).toBe(7);
      
      // Check that we have consecutive days
      const sortedDates = uniqueDates.sort();
      expect(sortedDates[0]).toBe('2024-01-01');
      expect(sortedDates[6]).toBe('2024-01-07');
    });

    it('should not create shifts longer than 12 hours', () => {
      const schedule = scheduleService.generateSchedule({
        weekStartDate: '2024-01-01',
      });

      schedule.shifts.forEach(shift => {
        const [startHour, startMin] = shift.startTime.split(':').map(Number);
        const [endHour, endMin] = shift.endTime.split(':').map(Number);
        
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const duration = (endMinutes - startMinutes) / 60;
        
        expect(duration).toBeLessThanOrEqual(12);
        expect(duration).toBeGreaterThan(0);
      });
    });
  });

  describe('Time calculation functions', () => {
    it('should correctly calculate hours between times', () => {
      const schedule = scheduleService.generateSchedule({
        weekStartDate: '2024-01-01',
      });

      // Test a known shift duration
      const testShift = {
        id: 'test',
        workerId: 'worker1',
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '17:30',
        type: 'regular' as const,
        isRequired: false,
      };

      const stats = scheduleService.getScheduleStats({
        ...schedule,
        shifts: [testShift],
      });

      // 9:00 to 17:30 = 8.5 hours
      expect(stats.totalHours).toBe(8.5);
    });

    it('should handle time calculations correctly for edge cases', () => {
      const testCases = [
        { start: '09:00', end: '18:00', expected: 9 },
        { start: '10:30', end: '19:30', expected: 9 },
        { start: '13:00', end: '21:30', expected: 8.5 },
        { start: '07:00', end: '15:15', expected: 8.25 },
      ];

      testCases.forEach(({ start, end, expected }) => {
        const testShift = {
          id: 'test',
          workerId: 'worker1',
          date: '2024-01-01',
          startTime: start,
          endTime: end,
          type: 'regular' as const,
          isRequired: false,
        };

        const schedule: Schedule = {
          id: 'test-schedule',
          weekStartDate: '2024-01-01',
          shifts: [testShift],
          isGenerated: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const stats = scheduleService.getScheduleStats(schedule);
        expect(stats.totalHours).toBe(expected);
      });
    });
  });

  describe('canGenerateSchedule', () => {
    it('should return true when enough workers are available', () => {
      const result = scheduleService.canGenerateSchedule('2024-01-01');
      expect(result.canGenerate).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('should return false when no workers are available', () => {
      mockWorkerService.getActiveWorkers.mockReturnValue([]);
      
      const result = scheduleService.canGenerateSchedule('2024-01-01');
      expect(result.canGenerate).toBe(false);
      expect(result.issues).toContain('No active workers available');
    });

    it('should warn when fewer than 3 workers are available', () => {
      mockWorkerService.getActiveWorkers.mockReturnValue([mockWorkers[0]]);
      
      const result = scheduleService.canGenerateSchedule('2024-01-01');
      expect(result.issues.some(issue => issue.includes('At least 3 active workers are recommended'))).toBe(true);
    });
  });

  describe('calculateWeeklyHours', () => {
    it('should correctly calculate weekly hours for each worker', () => {
      const schedule: Schedule = {
        id: 'test-schedule',
        weekStartDate: '2024-01-01',
        shifts: [
          {
            id: 'shift1',
            workerId: 'worker1',
            date: '2024-01-01',
            startTime: '09:00',
            endTime: '18:00', // 9 hours
            type: 'regular',
            isRequired: false,
          },
          {
            id: 'shift2',
            workerId: 'worker1',
            date: '2024-01-02',
            startTime: '10:30',
            endTime: '19:30', // 9 hours
            type: 'regular',
            isRequired: false,
          },
        ],
        isGenerated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const weeklyHours = scheduleService.calculateWeeklyHours(schedule);
      const worker1Hours = weeklyHours.get('worker1');
      
      expect(worker1Hours).toBeDefined();
      expect(worker1Hours?.scheduled).toBe(18); // 9 + 9 hours
      expect(worker1Hours?.target).toBe(32); // 80% of 40 hours
    });
  });
});