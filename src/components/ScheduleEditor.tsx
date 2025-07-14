// src/components/ScheduleEditor.tsx
// Phase 4: User-Friendly Schedule Editor - Redesigned for store managers

import React, { useState, useEffect } from 'react';
import {
  Clock,
  User,
  Users,
  Edit3,
  RotateCcw,
  AlertTriangle,
  XCircle,
  Download,
  Undo,
  UserPlus,
  UserMinus,
  Coffee,
  Moon
} from 'lucide-react';

// Import your existing services and types
import { scheduleService } from '../services/scheduleService';
import { workerService } from '../services/workerService';
import type { Schedule, Worker, Shift, DayOfWeek } from '../types';

interface ScheduleEditorProps {
  schedule: Schedule;
  onScheduleUpdate: (updatedSchedule: Schedule) => void;
  onBack?: () => void;
}

// Interface for consolidated worker shift per day
interface ConsolidatedWorkerShift {
  workerId: string;
  workerName: string;
  date: string;
  shifts: Shift[];
  totalHours: number;
  hasOpening: boolean;
  hasClosing: boolean;
  timeRange: string;
}

// Interface for daily staffing summary
interface DailyStaffingSummary {
  date: string;
  totalWorkers: number;
  totalHours: number;
  hasOpening: boolean;
  hasClosing: boolean;
  shifts: ConsolidatedWorkerShift[];
  unassignedShifts: Shift[];
}

const ScheduleEditor: React.FC<ScheduleEditorProps> = ({ schedule, onScheduleUpdate, onBack }) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [undoStack, setUndoStack] = useState<Schedule[]>([]);
  const [redoStack, setRedoStack] = useState<Schedule[]>([]);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState<{date: string} | null>(null);

  // Load workers on component mount
  useEffect(() => {
    const allWorkers = workerService.getAllWorkers();
    setWorkers(allWorkers.filter(w => w.isActive));
  }, []);

  // Calculate consolidated daily staffing
  const calculateDailyStaffing = (): DailyStaffingSummary[] => {
    const dates = [...new Set(schedule.shifts.map(s => s.date))].sort();
    
    return dates.map(date => {
      const dayShifts = schedule.shifts.filter(s => s.date === date);
      const assignedShifts = dayShifts.filter(s => s.workerId);
      const unassignedShifts = dayShifts.filter(s => !s.workerId);
      
      // Group shifts by worker
      const workerShifts: Record<string, Shift[]> = {};
      assignedShifts.forEach(shift => {
        if (!workerShifts[shift.workerId!]) {
          workerShifts[shift.workerId!] = [];
        }
        workerShifts[shift.workerId!].push(shift);
      });

      // Create consolidated worker shifts
      const consolidatedShifts: ConsolidatedWorkerShift[] = Object.entries(workerShifts).map(([workerId, shifts]) => {
        const worker = workers.find(w => w.id === workerId);
        const totalHours = shifts.reduce((sum, shift) => {
          const start = new Date(`2000-01-01 ${shift.startTime}`);
          const end = new Date(`2000-01-01 ${shift.endTime}`);
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }, 0);

        const hasOpening = shifts.some(s => s.type === 'opening');
        const hasClosing = shifts.some(s => s.type === 'closing');

        // Calculate time range
        const times = shifts.map(s => ({ start: s.startTime, end: s.endTime }));
        times.sort((a, b) => a.start.localeCompare(b.start));
        const timeRange = `${times[0].start} - ${times[times.length - 1].end}`;

        return {
          workerId,
          workerName: worker?.name || 'Unknown',
          date,
          shifts,
          totalHours: Math.round(totalHours * 10) / 10,
          hasOpening,
          hasClosing,
          timeRange
        };
      });

      return {
        date,
        totalWorkers: consolidatedShifts.length,
        totalHours: Math.round(consolidatedShifts.reduce((sum, ws) => sum + ws.totalHours, 0) * 10) / 10,
        hasOpening: consolidatedShifts.some(ws => ws.hasOpening),
        hasClosing: consolidatedShifts.some(ws => ws.hasClosing),
        shifts: consolidatedShifts,
        unassignedShifts
      };
    });
  };

  // Save state for undo functionality
  const saveState = () => {
    setUndoStack(prev => [...prev.slice(-9), { ...schedule }]);
    setRedoStack([]);
  };

  // Handle undo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [schedule, ...prev.slice(0, 9)]);
    setUndoStack(prev => prev.slice(0, -1));
    scheduleService.saveSchedule(previousState);
    onScheduleUpdate(previousState);
  };

  // Handle redo
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[0];
    setUndoStack(prev => [...prev.slice(-9), schedule]);
    setRedoStack(prev => prev.slice(1));
    scheduleService.saveSchedule(nextState);
    onScheduleUpdate(nextState);
  };

  // Remove worker from a day
  const handleRemoveWorker = (workerId: string, date: string) => {
    const workerName = workers.find(w => w.id === workerId)?.name || 'Worker';
    const confirmRemove = window.confirm(`Remove ${workerName} from ${new Date(date).toLocaleDateString()}?`);
    
    if (!confirmRemove) return;

    saveState();
    const updatedSchedule = {
      ...schedule,
      shifts: schedule.shifts.filter(shift => 
        !(shift.workerId === workerId && shift.date === date)
      ),
      updatedAt: new Date().toISOString()
    };

    scheduleService.saveSchedule(updatedSchedule);
    onScheduleUpdate(updatedSchedule);
  };

  // Add worker to a day
  const handleAddWorker = (workerId: string, date: string) => {
    // Check if worker is available
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    // Check day availability
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

    // Create a new regular shift (9:30 - 17:30 by default)
    const newShift: Shift = {
      id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      workerId,
      date,
      startTime: '09:30',
      endTime: '17:30',
      type: 'regular',
      isRequired: false
    };

    saveState();
    const updatedSchedule = {
      ...schedule,
      shifts: [...schedule.shifts, newShift],
      updatedAt: new Date().toISOString()
    };

    scheduleService.saveSchedule(updatedSchedule);
    onScheduleUpdate(updatedSchedule);
    setShowAddWorkerModal(null);
  };

  // Get available workers for a date
  const getAvailableWorkers = (date: string): Worker[] => {
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = new Date(date).getDay();
    const dayOfWeekKey = dayNames[dayIndex];

    return workers.filter(worker => {
      if (worker.holidayDates.includes(date)) return false;
      if (!worker.availableDays.includes(dayOfWeekKey)) return false;
      return true;
    });
  };

  const dailyStaffing = calculateDailyStaffing();

  // Helper to get day label
  const getDayLabel = (date: string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Editor</h1>
            <p className="text-gray-600 mt-1">
              Week of {new Date(schedule.weekStartDate).toLocaleDateString()} • Zurich Store
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Back Button */}
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Schedule</span>
              </button>
            )}

            {/* Undo/Redo */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Undo"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Redo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Export */}
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Staffing Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Weekly Staffing Overview
        </h3>

        <div className="grid grid-cols-7 gap-4">
          {dailyStaffing.map(day => (
            <div key={day.date} className="text-center">
              <div className="text-sm font-medium text-gray-700 mb-2">
                {getDayLabel(day.date)}
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-900">{day.totalWorkers}</div>
                <div className="text-xs text-gray-500">workers</div>
                <div className="text-sm font-medium text-gray-700 mt-1">{day.totalHours}h</div>
                <div className="flex justify-center space-x-1 mt-2">
                  {day.hasOpening && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Opening covered"></div>
                  )}
                  {day.hasClosing && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" title="Closing covered"></div>
                  )}
                  {day.unassignedShifts.length > 0 && (
                    <div className="w-2 h-2 bg-red-500 rounded-full" title="Unassigned shifts"></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Schedule */}
      <div className="space-y-4">
        {dailyStaffing.map(day => (
          <div key={day.date} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {getDayLabel(day.date)}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{day.totalWorkers} workers</span>
                  <Clock className="w-4 h-4 ml-2" />
                  <span>{day.totalHours}h total</span>
                </div>
              </div>

              <button
                onClick={() => setShowAddWorkerModal({date: day.date})}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Worker</span>
              </button>
            </div>

            {/* Worker Assignments */}
            <div className="space-y-3">
              {day.shifts.map(workerShift => (
                <div key={`${workerShift.workerId}-${day.date}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">{workerShift.workerName}</span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{workerShift.timeRange}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{workerShift.totalHours}h</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {workerShift.hasOpening && (
                        <div className="flex items-center space-x-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          <Coffee className="w-3 h-3" />
                          <span>Opening</span>
                        </div>
                      )}
                      {workerShift.hasClosing && (
                        <div className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          <Moon className="w-3 h-3" />
                          <span>Closing</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => alert('Individual shift editing will be available soon!')}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit worker shift"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveWorker(workerShift.workerId, day.date)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove worker"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Unassigned Shifts */}
              {day.unassignedShifts.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-900">Unassigned Shifts</span>
                  </div>
                  <div className="space-y-2">
                    {day.unassignedShifts.map(shift => (
                      <div key={shift.id} className="flex items-center justify-between text-sm">
                        <span className="text-red-700">
                          {shift.type.charAt(0).toUpperCase() + shift.type.slice(1)} shift: {shift.startTime} - {shift.endTime}
                        </span>
                        <button
                          onClick={() => setShowAddWorkerModal({date: day.date})}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Assign Worker
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {day.shifts.length === 0 && day.unassignedShifts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No workers scheduled for this day</p>
                  <button
                    onClick={() => setShowAddWorkerModal({date: day.date})}
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

      {/* Add Worker Modal */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Add Worker - {getDayLabel(showAddWorkerModal.date)}
              </h2>
              <button
                onClick={() => setShowAddWorkerModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              {getAvailableWorkers(showAddWorkerModal.date).map(worker => (
                <button
                  key={worker.id}
                  onClick={() => handleAddWorker(worker.id, showAddWorkerModal.date)}
                  className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{worker.name}</span>
                    <span className="text-sm text-gray-500">{worker.workPercentage}%</span>
                  </div>
                </button>
              ))}

              {getAvailableWorkers(showAddWorkerModal.date).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p>No available workers for this date</p>
                  <p className="text-sm">Check worker availability and holidays</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleEditor;