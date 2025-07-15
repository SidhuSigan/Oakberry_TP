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
  RotateCcw
} from 'lucide-react';

import { scheduleService } from '../services/scheduleService';
import { workerService } from '../services/workerService';
import type { Schedule, Worker, Shift, DayOfWeek } from '../types';

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
}

const ConsolidatedScheduleManager: React.FC<ConsolidatedScheduleManagerProps> = ({ onScheduleUpdate }) => {
  const [selectedWeek, setSelectedWeek] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddWorker, setShowAddWorker] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState<{
    workerId: string;
    date: string;
    startTime: string;
    endTime: string;
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
        const totalHours = shifts.reduce((sum, shift) => {
          const start = new Date(`2000-01-01 ${shift.startTime}`);
          const end = new Date(`2000-01-01 ${shift.endTime}`);
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }, 0);

        const times = shifts.map(s => ({ start: s.startTime, end: s.endTime }));
        times.sort((a, b) => a.start.localeCompare(b.start));
        const timeRange = `${times[0].start} - ${times[times.length - 1].end}`;

        return {
          id: workerId,
          name: worker?.name || 'Unknown',
          hours: Math.round(totalHours * 10) / 10,
          timeRange,
          arbeitspensum: worker?.workPercentage || 0,
          isOpening: shifts.some(s => s.type === 'opening'),
          isClosing: shifts.some(s => s.type === 'closing')
        };
      });

      const totalHours = dayWorkers.reduce((sum, w) => sum + w.hours, 0);
      const needsAttention = unassignedShifts.length > 0 || dayWorkers.length < 2;

      return {
        date,
        dayName: new Date(date).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' }),
        workers: dayWorkers,
        totalWorkers: dayWorkers.length,
        totalHours: Math.round(totalHours * 10) / 10,
        unassigned: unassignedShifts.length,
        needsAttention
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

    // Create regular 8-hour shift
    const newShift: Shift = {
      id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      workerId,
      date,
      startTime: '09:30',
      endTime: '17:30',
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

    // Validate times
    if (editingShift.startTime >= editingShift.endTime) {
      alert('Start time must be before end time');
      return;
    }

    // Calculate duration
    const startDate = new Date(`2000-01-01 ${editingShift.startTime}`);
    const endDate = new Date(`2000-01-01 ${editingShift.endTime}`);
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

    if (duration > 12) {
      if (!confirm('This shift is longer than 12 hours. Are you sure?')) return;
    }

    // Remove old shifts for this worker on this date
    const otherShifts = currentSchedule.shifts.filter(s => 
      !(s.workerId === editingShift.workerId && s.date === editingShift.date)
    );

    // Create new shift with updated times
    const newShift: Shift = {
      id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      workerId: editingShift.workerId,
      date: editingShift.date,
      startTime: editingShift.startTime,
      endTime: editingShift.endTime,
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

  // Calculate team Arbeitspensum status
  const getTeamStats = () => {
    if (!currentSchedule) return { totalHours: 0, avgPercentage: 0, workersWithIssues: 0 };

    const workerStats = workers.map(worker => {
      const workerShifts = currentSchedule.shifts.filter(s => s.workerId === worker.id);
      const totalHours = workerShifts.reduce((sum, shift) => {
        const start = new Date(`2000-01-01 ${shift.startTime}`);
        const end = new Date(`2000-01-01 ${shift.endTime}`);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      const targetHours = (worker.workPercentage / 100) * 40;
      const achievementPercentage = targetHours > 0 ? (totalHours / targetHours) * 100 : 0;

      return {
        worker,
        totalHours,
        targetHours,
        achievementPercentage,
        hasIssue: achievementPercentage < 80 || achievementPercentage > 120
      };
    });

    const totalHours = workerStats.reduce((sum, w) => sum + w.totalHours, 0);
    const avgPercentage = workerStats.reduce((sum, w) => sum + w.achievementPercentage, 0) / workerStats.length;
    const workersWithIssues = workerStats.filter(w => w.hasIssue).length;

    return { totalHours: Math.round(totalHours), avgPercentage: Math.round(avgPercentage), workersWithIssues };
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

      {/* Schedule Display */}
      {currentSchedule ? (
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={editingShift.startTime}
                    onChange={(e) => setEditingShift({
                      ...editingShift,
                      startTime: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={editingShift.endTime}
                    onChange={(e) => setEditingShift({
                      ...editingShift,
                      endTime: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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