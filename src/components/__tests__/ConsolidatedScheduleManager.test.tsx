import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsolidatedScheduleManager from '../ConsolidatedScheduleManager';
import { scheduleService } from '../../services/scheduleService';
import { workerService } from '../../services/workerService';
import type { Worker, Schedule } from '../../types/index';

// Mock the services
jest.mock('../../services/scheduleService');
jest.mock('../../services/workerService');

const mockScheduleService = scheduleService as jest.Mocked<typeof scheduleService>;
const mockWorkerService = workerService as jest.Mocked<typeof workerService>;

describe('ConsolidatedScheduleManager', () => {
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
  ];

  const mockSchedule: Schedule = {
    id: 'test-schedule',
    weekStartDate: '2024-01-01',
    shifts: [
      {
        id: 'shift1',
        workerId: 'worker1',
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '18:00',
        type: 'regular',
        isRequired: false,
      },
      {
        id: 'shift2',
        workerId: 'worker2',
        date: '2024-01-01',
        startTime: '10:30',
        endTime: '19:30',
        type: 'regular',
        isRequired: false,
      },
    ],
    isGenerated: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkerService.getAllWorkers.mockReturnValue(mockWorkers);
    mockScheduleService.getScheduleForWeek.mockReturnValue(null);
    mockScheduleService.generateSchedule.mockReturnValue(mockSchedule);
    mockScheduleService.saveSchedule.mockReturnValue(true);
  });

  it('should render the schedule manager', () => {
    render(<ConsolidatedScheduleManager />);
    
    expect(screen.getByText('Schedule Manager')).toBeInTheDocument();
    expect(screen.getByText('Generate, view, and edit your team schedule in one place')).toBeInTheDocument();
  });

  it('should display team overview with correct worker count', () => {
    render(<ConsolidatedScheduleManager />);
    
    expect(screen.getByText('Active Workers:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Total Capacity:')).toBeInTheDocument();
    expect(screen.getByText('180%')).toBeInTheDocument(); // 80% + 100%
  });

  it('should generate a schedule when button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConsolidatedScheduleManager />);
    
    const generateButton = screen.getByText('Generate Schedule');
    await user.click(generateButton);
    
    expect(mockScheduleService.generateSchedule).toHaveBeenCalled();
    expect(mockScheduleService.saveSchedule).toHaveBeenCalledWith(mockSchedule);
  });

  it('should display schedule stats after generation', async () => {
    const user = userEvent.setup();
    render(<ConsolidatedScheduleManager />);
    
    const generateButton = screen.getByText('Generate Schedule');
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('17h')).toBeInTheDocument(); // Total hours
      expect(screen.getByText('2')).toBeInTheDocument(); // Worker assignments
    });
  });

  it('should show warnings for scheduling issues', async () => {
    // Create a schedule with issues
    const problemSchedule: Schedule = {
      ...mockSchedule,
      shifts: [
        {
          id: 'shift1',
          workerId: 'worker1',
          date: '2024-01-01',
          startTime: '09:00',
          endTime: '21:00', // 12 hours - excessive
          type: 'regular',
          isRequired: false,
        },
        // No opening or closing shifts
      ],
    };

    mockScheduleService.generateSchedule.mockReturnValue(problemSchedule);
    
    const user = userEvent.setup();
    render(<ConsolidatedScheduleManager />);
    
    const generateButton = screen.getByText('Generate Schedule');
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Scheduling Issues')).toBeInTheDocument();
      expect(screen.getByText(/Alice scheduled for 12h \(excessive workload\)/)).toBeInTheDocument();
    });
  });

  it('should switch between list and timeline views', async () => {
    const user = userEvent.setup();
    render(<ConsolidatedScheduleManager />);
    
    // Generate schedule first
    const generateButton = screen.getByText('Generate Schedule');
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('List View')).toBeInTheDocument();
      expect(screen.getByText('Timeline View')).toBeInTheDocument();
    });
    
    // Switch to timeline view
    const timelineButton = screen.getByText('Timeline View');
    await user.click(timelineButton);
    
    // Timeline view should now be active
    expect(timelineButton).toHaveClass('bg-blue-600');
  });

  it('should open add worker modal when add worker button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConsolidatedScheduleManager />);
    
    // Generate schedule first
    const generateButton = screen.getByText('Generate Schedule');
    await user.click(generateButton);
    
    await waitFor(() => {
      const addWorkerButton = screen.getAllByText('Add Worker')[0];
      user.click(addWorkerButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Add Worker -/)).toBeInTheDocument();
    });
  });

  it('should calculate hours correctly for display', async () => {
    const user = userEvent.setup();
    render(<ConsolidatedScheduleManager />);
    
    // Generate schedule first
    const generateButton = screen.getByText('Generate Schedule');
    await user.click(generateButton);
    
    await waitFor(() => {
      // Alice: 09:00-18:00 = 9 hours
      expect(screen.getByText('9h')).toBeInTheDocument();
      // Bob: 10:30-19:30 = 9 hours  
      expect(screen.getByText('9h')).toBeInTheDocument();
    });
  });

  it('should show worker overview when toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<ConsolidatedScheduleManager />);
    
    // Generate schedule first
    const generateButton = screen.getByText('Generate Schedule');
    await user.click(generateButton);
    
    await waitFor(() => {
      const showOverviewButton = screen.getByText('Show Worker Overview');
      user.click(showOverviewButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Worker Overview - Hours vs Target')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('should handle empty schedule state', () => {
    render(<ConsolidatedScheduleManager />);
    
    expect(screen.getByText('No Schedule Generated')).toBeInTheDocument();
    expect(screen.getByText('Select a week and click "Generate Schedule" to get started')).toBeInTheDocument();
  });

  it('should handle no workers state', () => {
    mockWorkerService.getAllWorkers.mockReturnValue([]);
    
    render(<ConsolidatedScheduleManager />);
    
    expect(screen.getByText('You need to add active workers before generating a schedule')).toBeInTheDocument();
  });
});