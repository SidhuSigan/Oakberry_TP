// Consolidated Schedule Manager - One Interface for Everything
// Combines schedule generation, viewing, editing, and worker management

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  Clock,
  Plus,
  Minus,
  RefreshCw,
  Download,
  AlertTriangle,
  User,
  X,
  TrendingUp,
  Coffee,
  Moon,
  Edit3,
  Save,
  RotateCcw,
  List,
  BarChart3
} from 'lucide-react';

import { scheduleService } from '../services/scheduleService';
import { workerService } from '../services/workerService';
import type { Schedule, Worker, Shift, DayOfWeek } from '../types';
import { DEFAULT_STORE_HOURS } from '../types';

interface ConsolidatedScheduleManagerProps {
  onScheduleUpdate?: (schedule: Schedule) => void;
}

// Simple consolidated data structure for the display
interface SimpleDay {
  date: string;
  dayName: string;
  workers: {
    id: string;
    name: string;
    hours: number;
    timeRange: string;
    arbeitspensum: number;
    isOpening: boolean;
    isClosing: boolean;
  }[];
  totalWorkers: number;
  totalHours: number;
  unassigned: number;
  needsAttention: boolean;
  warnings: string[];
}

const ConsolidatedScheduleManager: React.FC<ConsolidatedScheduleManagerProps> = ({ onScheduleUpdate }) => {
  const [selectedWeek, setSelectedWeek] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddWorker, setShowAddWorker] = useState<string | null>(null);
  const [showWorkerOverview, setShowWorkerOverview] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [editingShift, setEditingShift] = useState<{
    workerId: string;
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [draggingShift, setDraggingShift] = useState<{
    workerId: string;
    date: string;
    startX: number;
    originalStartTime: string;
    originalEndTime: string;
  } | null>(null);

  // Initialize with next Monday and load data
  useEffect(() => {
    const allWorkers = workerService.getAllWorkers();
    setWorkers(allWorkers.filter(w => w.isActive));

    // Set default to next Monday
    const today = new Date();
    const nextMonday = new Date(today);
    const daysUntilMonday = (7 - today.getDay() + 1) % 7 || 7;
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    const mondayStr = nextMonday.toISOString().split('T')[0];
    setSelectedWeek(mondayStr);

    // Load existing schedule if available
    const existingSchedule = scheduleService.getScheduleForWeek(mondayStr);
    if (existingSchedule) {
      setCurrentSchedule(existingSchedule);
    }
  }, []);

  // Helper function to determine if a worker is doing opening or closing based on their actual times
  const getWorkerShiftLabels = (date: string, shifts: Shift[]) => {
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[new Date(date).getDay()];
    const storeHours = DEFAULT_STORE_HOURS.find(h => h.day === dayOfWeek);
    if (!storeHours) return { isOpening: false, isClosing: false };

    // Sort shifts by start time
    const sortedShifts = [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    // Opening: Worker starts before or at store opening time (allowing 30 min before)
    const openingThreshold = new Date(`2000-01-01 ${storeHours.open}`);
    openingThreshold.setMinutes(openingThreshold.getMinutes() - 30);
    const openingTime = openingThreshold.toTimeString().slice(0, 5);
    
    const isOpening = sortedShifts.some(shift => shift.startTime <= openingTime);
    
    // Closing: Worker ends at or after store closing time
    const isClosing = sortedShifts.some(shift => shift.endTime >= storeHours.close);

    return { isOpening, isClosing };
  };

  // Helper function to round time to nearest 15-minute interval
  const roundToQuarterHour = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const roundedMinutes = Math.round(totalMinutes / 15) * 15;
    const roundedHours = Math.floor(roundedMinutes / 60);
    const roundedMins = roundedMinutes % 60;
    return `${String(roundedHours).padStart(2, '0')}:${String(roundedMins).padStart(2, '0')}`;
  };

  // Calculate simple day view data
  const getSimpleDays = (): SimpleDay[] => {
    if (!currentSchedule) return [];

    const dates = [...new Set(currentSchedule.shifts.map(s => s.date))].sort();
    
    return dates.map(date => {
      const dayShifts = currentSchedule.shifts.filter(s => s.date === date);
      const assignedShifts = dayShifts.filter(s => s.workerId);
      const unassignedShifts = dayShifts.filter(s => !s.workerId);

      // Group by worker
      const workerShifts: Record<string, Shift[]> = {};
      assignedShifts.forEach(shift => {
        if (!workerShifts[shift.workerId!]) {
          workerShifts[shift.workerId!] = [];
        }
        workerShifts[shift.workerId!].push(shift);
      });

      // Create worker summaries
      const dayWorkers = Object.entries(workerShifts).map(([workerId, shifts]) => {
        const worker = workers.find(w => w.id === workerId);
        
        // Calculate time range first
        const times = shifts.map(s => ({ start: s.startTime, end: s.endTime }));
        times.sort((a, b) => a.start.localeCompare(b.start));
        const timeRange = `${times[0].start} - ${times[times.length - 1].end}`;
        
        // Calculate total hours as the time span from earliest start to latest end
        const earliestStart = new Date(`2000-01-01 ${times[0].start}`);
        const latestEnd = new Date(`2000-01-01 ${times[times.length - 1].end}`);
        const totalHours = (latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60);

        // Use dynamic labels based on actual times
        const { isOpening, isClosing } = getWorkerShiftLabels(date, shifts);

        return {
          id: workerId,
          name: worker?.name || 'Unknown',
          hours: Math.round(totalHours * 10) / 10,
          timeRange,
          arbeitspensum: worker?.workPercentage || 0,
          isOpening,
          isClosing
        };
      });

      const totalHours = dayWorkers.reduce((sum, w) => sum + w.hours, 0);
      
      // Generate warnings based on business rules
      const warnings: string[] = [];
      
      // Check for store opening coverage
      const hasOpeningWorker = dayWorkers.some(w => w.isOpening);
      if (!hasOpeningWorker) {
        warnings.push('⚠️ No one assigned to open the store');
      }
      
      // Check for store closing coverage
      const hasClosingWorker = dayWorkers.some(w => w.isClosing);
      if (!hasClosingWorker) {
        warnings.push('⚠️ No one assigned to close the store');
      }
      
      // Check for minimum staffing during operating hours
      if (dayWorkers.length < 3) {
        warnings.push('⚠️ Insufficient staff coverage - minimum 3 workers recommended');
      }
      
      // Check for unassigned shifts
      if (unassignedShifts.length > 0) {
        warnings.push(`⚠️ ${unassignedShifts.length} unassigned shift${unassignedShifts.length > 1 ? 's' : ''}`);
      }
      
      // Check for workers with excessive hours (>100% workload)
      dayWorkers.forEach(worker => {
        if (worker.hours > 12) {
          warnings.push(`⚠️ ${worker.name} scheduled for ${worker.hours}h (excessive workload)`);
        }
      });

      const needsAttention = warnings.length > 0;

      return {
        date,
        dayName: new Date(date).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' }),
        workers: dayWorkers,
        totalWorkers: dayWorkers.length,
        totalHours: Math.round(totalHours * 10) / 10,
        unassigned: unassignedShifts.length,
        needsAttention,
        warnings
      };
    });
  };

  // Generate or regenerate schedule
  const handleGenerateSchedule = async () => {
    if (!selectedWeek || workers.length === 0) return;

    setIsGenerating(true);
    try {
      const newSchedule = scheduleService.generateSchedule({ weekStartDate: selectedWeek });
      scheduleService.saveSchedule(newSchedule);
      setCurrentSchedule(newSchedule);
      onScheduleUpdate?.(newSchedule);
    } catch (error) {
      console.error('Error generating schedule:', error);
      alert('Error generating schedule. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Add worker to a specific date
  const handleAddWorker = (workerId: string, date: string) => {
    if (!currentSchedule) return;

    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    // Check availability
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = new Date(date).getDay();
    const dayOfWeekKey = dayNames[dayIndex];

    if (!worker.availableDays.includes(dayOfWeekKey)) {
      alert(`${worker.name} is not available on ${dayOfWeekKey}s`);
      return;
    }

    if (worker.holidayDates.includes(date)) {
      alert(`${worker.name} is on holiday on ${new Date(date).toLocaleDateString()}`);
      return;
    }

    // Create regular 9-hour shift (more realistic for your business)
    const newShift: Shift = {
      id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      workerId,
      date,
      startTime: '10:30',
      endTime: '19:30',
      type: 'regular',
      isRequired: false
    };

    const updatedSchedule = {
      ...currentSchedule,
      shifts: [...currentSchedule.shifts, newShift],
      updatedAt: new Date().toISOString()
    };

    scheduleService.saveSchedule(updatedSchedule);
    setCurrentSchedule(updatedSchedule);
    onScheduleUpdate?.(updatedSchedule);
    setShowAddWorker(null);
  };

  // Remove worker from a specific date
  const handleRemoveWorker = (workerId: string, date: string) => {
    if (!currentSchedule) return;

    const worker = workers.find(w => w.id === workerId);
    const workerName = worker?.name || 'Worker';
    
    if (!confirm(`Remove ${workerName} from ${new Date(date).toLocaleDateString()}?`)) return;

    const updatedSchedule = {
      ...currentSchedule,
      shifts: currentSchedule.shifts.filter(shift => 
        !(shift.workerId === workerId && shift.date === date)
      ),
      updatedAt: new Date().toISOString()
    };

    scheduleService.saveSchedule(updatedSchedule);
    setCurrentSchedule(updatedSchedule);
    onScheduleUpdate?.(updatedSchedule);
  };

  // Get available workers for a date
  const getAvailableWorkers = (date: string): Worker[] => {
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = new Date(date).getDay();
    const dayOfWeekKey = dayNames[dayIndex];

    return workers.filter(worker => {
      if (worker.holidayDates.includes(date)) return false;
      if (!worker.availableDays.includes(dayOfWeekKey)) return false;
      // Don't show workers already working that day
      const alreadyWorking = currentSchedule?.shifts.some(s => s.workerId === worker.id && s.date === date);
      return !alreadyWorking;
    });
  };

  // Open shift editing modal
  const handleEditShift = (workerId: string, date: string) => {
    if (!currentSchedule) return;

    const workerShifts = currentSchedule.shifts.filter(s => s.workerId === workerId && s.date === date);
    if (workerShifts.length === 0) return;

    // Get the time range from all shifts for this worker on this date
    const times = workerShifts.map(s => ({ start: s.startTime, end: s.endTime }));
    times.sort((a, b) => a.start.localeCompare(b.start));
    
    setEditingShift({
      workerId,
      date,
      startTime: times[0].start,
      endTime: times[times.length - 1].end
    });
  };

  // Save edited shift times
  const handleSaveShiftEdit = () => {
    if (!currentSchedule || !editingShift) return;

    // Round times to 15-minute intervals
    const roundedStartTime = roundToQuarterHour(editingShift.startTime);
    const roundedEndTime = roundToQuarterHour(editingShift.endTime);

    // Validate times
    if (roundedStartTime >= roundedEndTime) {
      alert('Start time must be before end time');
      return;
    }

    // Calculate duration
    const startDate = new Date(`2000-01-01 ${roundedStartTime}`);
    const endDate = new Date(`2000-01-01 ${roundedEndTime}`);
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

    if (duration > 12) {
      if (!confirm('This shift is longer than 12 hours. Are you sure?')) return;
    }

    // Remove old shifts for this worker on this date
    const otherShifts = currentSchedule.shifts.filter(s => 
      !(s.workerId === editingShift.workerId && s.date === editingShift.date)
    );

    // Create new shift with updated and rounded times
    const newShift: Shift = {
      id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      workerId: editingShift.workerId,
      date: editingShift.date,
      startTime: roundedStartTime,
      endTime: roundedEndTime,
      type: 'regular',
      isRequired: false
    };

    const updatedSchedule = {
      ...currentSchedule,
      shifts: [...otherShifts, newShift],
      updatedAt: new Date().toISOString()
    };

    scheduleService.saveSchedule(updatedSchedule);
    setCurrentSchedule(updatedSchedule);
    onScheduleUpdate?.(updatedSchedule);
    setEditingShift(null);
  };

  // Handle drag start for shift
  const handleDragStart = (e: React.MouseEvent, workerId: string, date: string) => {
    e.preventDefault();
    if (!currentSchedule) return;

    const workerShifts = currentSchedule.shifts.filter(s => s.workerId === workerId && s.date === date);
    if (workerShifts.length === 0) return;

    const times = workerShifts.map(s => ({ start: s.startTime, end: s.endTime }));
    times.sort((a, b) => a.start.localeCompare(b.start));

    setDraggingShift({
      workerId,
      date,
      startX: e.clientX,
      originalStartTime: times[0].start,
      originalEndTime: times[times.length - 1].end
    });

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
  };

  // Handle drag move
  const handleDragMove = (e: React.MouseEvent) => {
    if (!draggingShift || !currentSchedule) return;

    const deltaX = e.clientX - draggingShift.startX;
    
    // Calculate time change based on pixel movement
    // Assume timeline represents 15 hours (7:00-22:00) across the available width
    // Use a simple conversion: every 40 pixels = 1 hour
    const hoursChange = deltaX / 40;
    
    // Round to 15-minute intervals
    const quartersChange = Math.round(hoursChange * 4) / 4;
    const minutesChange = quartersChange * 60;
    
    // Calculate original duration in minutes
    const [origStartHour, origStartMin] = draggingShift.originalStartTime.split(':').map(Number);
    const [origEndHour, origEndMin] = draggingShift.originalEndTime.split(':').map(Number);
    const originalDuration = (origEndHour * 60 + origEndMin) - (origStartHour * 60 + origStartMin);
    
    // Calculate new start time
    const originalStartMinutes = origStartHour * 60 + origStartMin;
    const newStartMinutes = originalStartMinutes + minutesChange;
    const newEndMinutes = newStartMinutes + originalDuration;
    
    // Validate bounds (7:00 - 22:00)
    if (newStartMinutes < 7 * 60 || newEndMinutes > 22 * 60) return;
    
    // Convert back to time strings
    const newStartHours = Math.floor(newStartMinutes / 60);
    const newStartMins = newStartMinutes % 60;
    const newEndHours = Math.floor(newEndMinutes / 60);
    const newEndMins = newEndMinutes % 60;
    
    const newStartTime = `${newStartHours.toString().padStart(2, '0')}:${newStartMins.toString().padStart(2, '0')}`;
    const newEndTime = `${newEndHours.toString().padStart(2, '0')}:${newEndMins.toString().padStart(2, '0')}`;

    // Update the shift visually for preview
    setEditingShift({
      workerId: draggingShift.workerId,
      date: draggingShift.date,
      startTime: newStartTime,
      endTime: newEndTime
    });
  };

  // Handle drag end
  const handleDragEnd = () => {
    document.body.style.userSelect = '';
    
    if (!draggingShift) return;

    if (editingShift) {
      // Apply the change
      handleSaveShiftEdit();
    }
    
    setDraggingShift(null);
    setEditingShift(null);
  };

  // Calculate team Arbeitspensum status
  const getTeamStats = () => {
    if (!currentSchedule) return { totalHours: 0, avgPercentage: 0, workersWithIssues: 0, workerStats: [] };

    const workerStats = workers.map(worker => {
      const workerShifts = currentSchedule.shifts.filter(s => s.workerId === worker.id);
      
      // Group shifts by date to calculate daily totals correctly
      const shiftsByDate: Record<string, typeof workerShifts> = {};
      workerShifts.forEach(shift => {
        if (!shiftsByDate[shift.date]) {
          shiftsByDate[shift.date] = [];
        }
        shiftsByDate[shift.date].push(shift);
      });
      
      // Calculate total hours across all days
      const totalHours = Object.values(shiftsByDate).reduce((sum, dayShifts) => {
        if (dayShifts.length === 0) return sum;
        
        // For each day, calculate the time span from earliest start to latest end
        const times = dayShifts.map(s => ({ start: s.startTime, end: s.endTime }));
        times.sort((a, b) => a.start.localeCompare(b.start));
        
        const earliestStart = new Date(`2000-01-01 ${times[0].start}`);
        const latestEnd = new Date(`2000-01-01 ${times[times.length - 1].end}`);
        const dayHours = (latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60);
        
        return sum + dayHours;
      }, 0);

      const targetHours = (worker.workPercentage / 100) * 40;
      const achievementPercentage = targetHours > 0 ? (totalHours / targetHours) * 100 : 0;

      return {
        worker,
        totalHours: Math.round(totalHours * 10) / 10,
        targetHours: Math.round(targetHours * 10) / 10,
        achievementPercentage: Math.round(achievementPercentage),
        hasIssue: achievementPercentage < 80 || achievementPercentage > 120,
        status: achievementPercentage < 80 ? 'under' : achievementPercentage > 120 ? 'over' : 'normal'
      };
    });

    const totalHours = workerStats.reduce((sum, w) => sum + w.totalHours, 0);
    const avgPercentage = workerStats.reduce((sum, w) => sum + w.achievementPercentage, 0) / workerStats.length;
    const workersWithIssues = workerStats.filter(w => w.hasIssue).length;

    return { 
      totalHours: Math.round(totalHours), 
      avgPercentage: Math.round(avgPercentage), 
      workersWithIssues,
      workerStats
    };
  };

  const simpleDays = getSimpleDays();
  const teamStats = getTeamStats();
  const activeWorkers = workers.length;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Schedule Manager</h1>
            <p className="text-gray-600 mt-1">Generate, view, and edit your team schedule in one place</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => alert('Export coming soon!')}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Week Selection & Generation */}
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Week Starting (Monday)</label>
            <input
              type="date"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Team Overview</label>
            <div className="bg-gray-50 rounded-md p-3">
              <div className="flex justify-between text-sm">
                <span>Active Workers:</span>
                <span className="font-medium">{activeWorkers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Capacity:</span>
                <span className="font-medium">{workers.reduce((sum, w) => sum + w.workPercentage, 0)}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateSchedule}
              disabled={isGenerating || activeWorkers === 0}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isGenerating && <RefreshCw className="w-4 h-4 animate-spin" />}
              <Calendar className="w-4 h-4" />
              <span>{currentSchedule ? 'Regenerate' : 'Generate'} Schedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Team Stats */}
      {currentSchedule && (
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{teamStats.totalHours}h</div>
            <div className="text-sm text-gray-600">Total Hours</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{teamStats.avgPercentage}%</div>
            <div className="text-sm text-gray-600">Avg Arbeitspensum</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{simpleDays.reduce((sum, d) => sum + d.totalWorkers, 0)}</div>
            <div className="text-sm text-gray-600">Worker Assignments</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className={`text-2xl font-bold ${teamStats.workersWithIssues > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {teamStats.workersWithIssues}
            </div>
            <div className="text-sm text-gray-600">Quota Issues</div>
          </div>
        </div>
      )}

      {/* Worker Overview Toggle */}
      {currentSchedule && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowWorkerOverview(!showWorkerOverview)}
            className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>{showWorkerOverview ? 'Hide' : 'Show'} Worker Overview</span>
          </button>
        </div>
      )}

      {/* Worker Overview Section */}
      {currentSchedule && showWorkerOverview && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Worker Overview - Hours vs Target
          </h3>
          
          <div className="space-y-3">
            {teamStats.workerStats.map(({ worker, totalHours, targetHours, achievementPercentage, status }) => (
              <div key={worker.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex items-center space-x-2 min-w-[150px]">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">{worker.name}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Target:</span>
                    <span className="font-medium">{targetHours}h</span>
                    <span className="text-gray-400">({worker.workPercentage}%)</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Actual:</span>
                    <span className={`font-medium ${
                      status === 'under' ? 'text-orange-600' : 
                      status === 'over' ? 'text-red-600' : 
                      'text-green-600'
                    }`}>{totalHours}h</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          status === 'under' ? 'bg-orange-500' : 
                          status === 'over' ? 'bg-red-500' : 
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(achievementPercentage, 150)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className={`text-sm font-medium px-3 py-1 rounded ${
                    status === 'under' ? 'bg-orange-100 text-orange-800' : 
                    status === 'over' ? 'bg-red-100 text-red-800' : 
                    'bg-green-100 text-green-800'
                  }`}>
                    {achievementPercentage}%
                    {status === 'under' && ' (Under)'}
                    {status === 'over' && ' (Over)'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            <p className="font-medium">Target Range: 80% - 120% of Arbeitspensum</p>
            <p>Workers outside this range are highlighted and counted as having quota issues.</p>
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      {currentSchedule && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              viewMode === 'list' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <List className="w-4 h-4" />
            <span>List View</span>
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              viewMode === 'timeline' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Timeline View</span>
          </button>
        </div>
      )}

      {/* Schedule Display */}
      {currentSchedule && viewMode === 'list' ? (
        <div className="space-y-4">
          {simpleDays.map(day => (
            <div key={day.date} className={`bg-white rounded-lg border-2 p-6 ${day.needsAttention ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
              
              {/* Day Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-gray-900">{day.dayName}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{day.totalWorkers} workers</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{day.totalHours}h total</span>
                    </div>
                    {day.unassigned > 0 && (
                      <div className="flex items-center space-x-1 text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{day.unassigned} unassigned</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => setShowAddWorker(day.date)}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Worker</span>
                </button>
              </div>

              {/* Warnings */}
              {day.warnings.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Scheduling Issues</span>
                  </div>
                  <ul className="space-y-1 text-sm text-yellow-700">
                    {day.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Workers */}
              <div className="space-y-3">
                {day.workers.map(worker => (
                  <div key={worker.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-900">{worker.name}</span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <span className="font-mono">{worker.timeRange}</span>
                        <span className="ml-2 font-medium">({worker.hours}h)</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          <TrendingUp className="w-3 h-3" />
                          <span>{worker.arbeitspensum}%</span>
                        </div>
                        
                        {worker.isOpening && (
                          <div className="flex items-center space-x-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            <Coffee className="w-3 h-3" />
                            <span>Opening</span>
                          </div>
                        )}
                        
                        {worker.isClosing && (
                          <div className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            <Moon className="w-3 h-3" />
                            <span>Closing</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditShift(worker.id, day.date)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Edit shift times"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveWorker(worker.id, day.date)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md"
                        title="Remove worker"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Empty state */}
                {day.workers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No workers scheduled</p>
                    <button
                      onClick={() => setShowAddWorker(day.date)}
                      className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Add a worker
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : currentSchedule && viewMode === 'timeline' ? (
        <div className="space-y-4">
          {simpleDays.map(day => (
            <div key={day.date} className={`bg-white rounded-lg border-2 p-6 ${day.needsAttention ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
              {/* Day Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-gray-900">{day.dayName}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{day.totalWorkers} workers</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{day.totalHours}h total</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddWorker(day.date)}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Worker</span>
                </button>
              </div>

              {/* Warnings */}
              {day.warnings.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Scheduling Issues</span>
                  </div>
                  <ul className="space-y-1 text-sm text-yellow-700">
                    {day.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timeline Grid */}
              <div className="relative"
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
              >
                {/* Hour markers */}
                <div className="flex relative h-8 border-b border-gray-200">
                  {Array.from({ length: 15 }, (_, i) => i + 7).map(hour => (
                    <div key={hour} className="flex-1 text-xs text-gray-500 text-center border-r border-gray-100">
                      {hour}:00
                    </div>
                  ))}
                </div>

                {/* Worker timelines */}
                <div className="space-y-2 mt-2">
                  {day.workers.map(worker => {
                    const startHour = parseInt(worker.timeRange.split(' - ')[0].split(':')[0]);
                    const startMin = parseInt(worker.timeRange.split(' - ')[0].split(':')[1]);
                    const endHour = parseInt(worker.timeRange.split(' - ')[1].split(':')[0]);
                    const endMin = parseInt(worker.timeRange.split(' - ')[1].split(':')[1]);
                    
                    const startOffset = ((startHour - 7) * 60 + startMin) / (15 * 60) * 100;
                    const duration = ((endHour - startHour) * 60 + (endMin - startMin)) / (15 * 60) * 100;

                    const isDragging = draggingShift?.workerId === worker.id && draggingShift?.date === day.date;

                    return (
                      <div key={worker.id} className="relative h-12 bg-gray-50 rounded">
                        <div className="absolute left-0 top-0 bottom-0 w-32 px-2 py-2 text-sm font-medium bg-white border-r border-gray-200 flex items-center">
                          <User className="w-4 h-4 mr-1 text-gray-600" />
                          {worker.name}
                        </div>
                        <div className="ml-32 relative h-full">
                          <div
                            className={`absolute top-1 bottom-1 rounded flex items-center px-2 text-xs text-white font-medium cursor-move transition-all ${
                              worker.isOpening ? 'bg-green-600' : worker.isClosing ? 'bg-blue-600' : 'bg-gray-600'
                            } ${isDragging ? 'opacity-75 shadow-lg' : 'hover:shadow-md'}`}
                            style={{
                              left: `${startOffset}%`,
                              width: `${duration}%`
                            }}
                            onMouseDown={(e) => handleDragStart(e, worker.id, day.date)}
                            title="Drag to move shift time"
                          >
                            <div className="flex items-center space-x-1">
                              {worker.isOpening && <Coffee className="w-3 h-3" />}
                              {worker.isClosing && <Moon className="w-3 h-3" />}
                              <span>{worker.hours}h</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center space-x-4 mt-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-green-600 rounded"></div>
                    <span>Opening shift</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-blue-600 rounded"></div>
                    <span>Closing shift</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-gray-600 rounded"></div>
                    <span>Regular shift</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedule Generated</h3>
          <p className="text-gray-600 mb-4">Select a week and click "Generate Schedule" to get started</p>
          {activeWorkers === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-yellow-800">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              You need to add active workers before generating a schedule
            </div>
          )}
        </div>
      )}

      {/* Add Worker Modal */}
      {showAddWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Add Worker - {new Date(showAddWorker).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h2>
              <button
                onClick={() => setShowAddWorker(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {getAvailableWorkers(showAddWorker).map(worker => (
                <button
                  key={worker.id}
                  onClick={() => handleAddWorker(worker.id, showAddWorker)}
                  className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{worker.name}</span>
                    <span className="text-sm text-gray-500">{worker.workPercentage}% Arbeitspensum</span>
                  </div>
                </button>
              ))}

              {getAvailableWorkers(showAddWorker).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p>No available workers for this date</p>
                  <p className="text-sm">Check worker availability and holidays</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Shift Times Modal */}
      {editingShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Edit Shift Times
              </h2>
              <button
                onClick={() => setEditingShift(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Worker
                </label>
                <div className="text-gray-900 font-medium">
                  {workers.find(w => w.id === editingShift.workerId)?.name} - {new Date(editingShift.date).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
              </div>

              <div className="space-y-4">
                {/* Quick Presets */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setEditingShift({
                        ...editingShift,
                        startTime: '09:00',
                        endTime: '18:00'
                      })}
                      className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      Opening (9:00-18:00)
                    </button>
                    <button
                      onClick={() => setEditingShift({
                        ...editingShift,
                        startTime: '10:30',
                        endTime: '19:30'
                      })}
                      className="px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Standard (10:30-19:30)
                    </button>
                    <button
                      onClick={() => setEditingShift({
                        ...editingShift,
                        startTime: '11:00',
                        endTime: '20:00'
                      })}
                      className="px-3 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
                    >
                      Lunch Rush (11:00-20:00)
                    </button>
                    <button
                      onClick={() => {
                        // Get the store hours for this day to determine closing time
                        const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                        const dayIndex = new Date(editingShift.date).getDay();
                        const dayOfWeek = dayNames[dayIndex];
                        const storeHours = DEFAULT_STORE_HOURS.find(h => h.day === dayOfWeek);
                        
                        // Calculate closing time (30 minutes after store close)
                        const storeCloseTime = storeHours?.close || '20:00';
                        const [hours, minutes] = storeCloseTime.split(':').map(Number);
                        const closingTime = new Date(2000, 0, 1, hours, minutes + 30);
                        const closingTimeStr = closingTime.toTimeString().slice(0, 5);
                        
                        setEditingShift({
                          ...editingShift,
                          startTime: '13:00',
                          endTime: closingTimeStr
                        });
                      }}
                      className="px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors"
                    >
                      Closing (13:00-close)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={editingShift.startTime.split(':')[0]}
                      onChange={(e) => setEditingShift({
                        ...editingShift,
                        startTime: `${e.target.value}:${editingShift.startTime.split(':')[1]}`
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 15 }, (_, i) => i + 7).map(hour => (
                        <option key={hour} value={hour.toString().padStart(2, '0')}>
                          {hour.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-500">:</span>
                    <select
                      value={editingShift.startTime.split(':')[1]}
                      onChange={(e) => setEditingShift({
                        ...editingShift,
                        startTime: `${editingShift.startTime.split(':')[0]}:${e.target.value}`
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="00">00</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={editingShift.endTime.split(':')[0]}
                      onChange={(e) => setEditingShift({
                        ...editingShift,
                        endTime: `${e.target.value}:${editingShift.endTime.split(':')[1]}`
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 15 }, (_, i) => i + 7).map(hour => (
                        <option key={hour} value={hour.toString().padStart(2, '0')}>
                          {hour.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-500">:</span>
                    <select
                      value={editingShift.endTime.split(':')[1]}
                      onChange={(e) => setEditingShift({
                        ...editingShift,
                        endTime: `${editingShift.endTime.split(':')[0]}:${e.target.value}`
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="00">00</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Duration display */}
              <div className="bg-gray-50 rounded-md p-3">
                <div className="text-sm text-gray-600">
                  Duration: {
                    (() => {
                      const start = new Date(`2000-01-01 ${editingShift.startTime}`);
                      const end = new Date(`2000-01-01 ${editingShift.endTime}`);
                      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                      return duration > 0 ? `${duration.toFixed(1)} hours` : 'Invalid times';
                    })()
                  }
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Times are limited to 15-minute intervals
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => setEditingShift(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  <RotateCcw className="w-4 h-4 inline mr-1" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveShiftEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-1"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsolidatedScheduleManager;