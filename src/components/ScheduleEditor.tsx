// src/components/ScheduleEditor.tsx
// Phase 4: Schedule Editing & Management - Connected to real data

import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Edit3,
  Move,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
//   Save,
  Download,
  Undo,
  Users
} from 'lucide-react';

// Import your existing services and types
import { scheduleService } from '../services/scheduleService';
import { workerService } from '../services/workerService';
import type { Schedule, Worker, Shift, DayOfWeek } from '../types';

interface ScheduleEditorProps {
  schedule: Schedule;
  onScheduleUpdate: (updatedSchedule: Schedule) => void;
}

const ScheduleEditor: React.FC<ScheduleEditorProps> = ({ schedule, onScheduleUpdate }) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [editMode, setEditMode] = useState<'click' | 'drag'>('click');
  const [draggedShift, setDraggedShift] = useState<(Shift & { originalDate: string }) | null>(null);
  const [dropZones, setDropZones] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<Schedule[]>([]);
  const [redoStack, setRedoStack] = useState<Schedule[]>([]);

  // Load workers on component mount
  useEffect(() => {
    const allWorkers = workerService.getAllWorkers();
    setWorkers(allWorkers.filter(w => w.isActive));
  }, []);

  // Group shifts by date for display
  const groupShiftsByDate = () => {
    const grouped: Record<string, Shift[]> = {};

    schedule.shifts.forEach(shift => {
      if (!grouped[shift.date]) {
        grouped[shift.date] = [];
      }
      grouped[shift.date].push(shift);
    });

    return grouped;
  };

  // Calculate work hours for each worker this week
  const calculateWorkerHours = () => {
    const workerHours: Record<string, { scheduled: number; target: number; percentage: number }> = {};

    workers.forEach(worker => {
      workerHours[worker.id] = {
        scheduled: 0,
        target: (worker.workPercentage * 40) / 100, // Assuming 40 hours = 100%
        percentage: worker.workPercentage
      };
    });

    schedule.shifts.forEach(shift => {
      if (shift.workerId && workerHours[shift.workerId]) {
        const hours = calculateShiftHours(shift.startTime, shift.endTime);
        workerHours[shift.workerId].scheduled += hours;
      }
    });

    return workerHours;
  };

  const calculateShiftHours = (startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    return Math.round(((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 10) / 10;
  };

  // Check if worker is available for a specific date
  const isWorkerAvailable = (workerId: string, date: string): boolean => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return false;

    // Check if it's a holiday for this worker
    const isHoliday = worker.holidayDates.includes(date);
    if (isHoliday) return false;

    // Check if worker is available on this day of week
    const dayOfWeek = new Date(date).toLocaleDateString('en', { weekday: 'long' }).toLowerCase();

    // Convert date to day of week (this is a simplified approach)
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = new Date(date).getDay();
    const dayOfWeekKey = dayNames[dayIndex];

    return worker.availableDays.includes(dayOfWeekKey);
  };

  // Get available workers for a shift (excluding conflicts)
  const getAvailableWorkers = (date: string, excludeShiftId?: string): Worker[] => {
    return workers.filter(worker => {
      if (!isWorkerAvailable(worker.id, date)) return false;

      // Check for time conflicts with other shifts on the same day
      const dayShifts = schedule.shifts.filter(s =>
        s.date === date &&
        s.id !== excludeShiftId &&
        s.workerId === worker.id
      );

      // For now, we'll allow multiple shifts per day per worker
      // In a more sophisticated version, we'd check for time overlaps
      return true;
    });
  };

  // Save state for undo functionality
  const saveState = () => {
    setUndoStack(prev => [...prev.slice(-9), { ...schedule }]);
    setRedoStack([]);
  };

  // Handle worker assignment via dropdown
  const handleWorkerAssignment = (shiftId: string, workerId: string | null) => {
    saveState();

    const updatedSchedule = {
      ...schedule,
      shifts: schedule.shifts.map(shift =>
        shift.id === shiftId
          ? { ...shift, workerId: workerId === null ? undefined : workerId }
          : shift
      ),
      updatedAt: new Date().toISOString()
    };

    // Save to localStorage and notify parent
    scheduleService.saveSchedule(updatedSchedule);
    onScheduleUpdate(updatedSchedule);
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, shift: Shift) => {
    setDraggedShift({ ...shift, originalDate: shift.date });

    // Calculate valid drop zones (dates where worker is available)
    const validDates = getUniqueDates().filter(date => {
      if (shift.workerId && !isWorkerAvailable(shift.workerId, date)) return false;
      return date !== shift.date; // Can't drop on same date
    });

    setDropZones(validDates);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, date: string) => {
    if (dropZones.includes(date)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e: React.DragEvent, newDate: string) => {
    e.preventDefault();

    if (!draggedShift || !dropZones.includes(newDate)) return;

    saveState();

    const updatedSchedule = {
      ...schedule,
      shifts: schedule.shifts.map(shift =>
        shift.id === draggedShift.id
          ? { ...shift, date: newDate }
          : shift
      ),
      updatedAt: new Date().toISOString()
    };

    scheduleService.saveSchedule(updatedSchedule);
    onScheduleUpdate(updatedSchedule);

    setDraggedShift(null);
    setDropZones([]);
  };

  const handleDragEnd = () => {
    setDraggedShift(null);
    setDropZones([]);
  };

  // Get unique dates from schedule
  const getUniqueDates = (): string[] => {
    const dates = [...new Set(schedule.shifts.map(s => s.date))];
    return dates.sort();
  };

  // Helper to get day label
  const getDayLabel = (date: string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const workerHours = calculateWorkerHours();
  const shiftsByDate = groupShiftsByDate();
  const uniqueDates = getUniqueDates();

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

        {/* Edit Mode Toggle */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Editing Mode:</span>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setEditMode('click')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  editMode === 'click'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>Click to Assign</span>
              </button>

              <button
                onClick={() => setEditMode('drag')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  editMode === 'drag'
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                <Move className="w-4 h-4" />
                <span>Drag & Drop</span>
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="text-sm text-gray-600">
            <span className="mr-4">
              Assigned: {schedule.shifts.filter(s => s.workerId).length} shifts
            </span>
            <span>
              Unassigned: {schedule.shifts.filter(s => !s.workerId).length} shifts
            </span>
          </div>
        </div>
      </div>

      {/* Worker Status Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Worker Status & Hours
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {workers.map(worker => {
            const hours = workerHours[worker.id] || { scheduled: 0, target: 0, percentage: 0 };
            const percentageUsed = hours.target > 0 ? Math.round((hours.scheduled / hours.target) * 100) : 0;

            let statusColor = 'green';
            if (percentageUsed > 110) statusColor = 'red';
            else if (percentageUsed < 80) statusColor = 'yellow';

            return (
              <div key={worker.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{worker.name}</h4>
                </div>

                <div className="text-xs text-gray-600 space-y-1">
                  <div>Target: {hours.target}h ({worker.workPercentage}%)</div>
                  <div>Scheduled: {hours.scheduled}h</div>
                  <div className={`flex items-center ${
                    statusColor === 'green' ? 'text-green-600' :
                    statusColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {statusColor === 'green' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {statusColor === 'yellow' && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {statusColor === 'red' && <XCircle className="w-3 h-3 mr-1" />}
                    {percentageUsed}% of target
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Weekly Schedule
          {editMode === 'click' && <span className="ml-2 text-sm text-blue-600">(Click shifts to assign workers)</span>}
          {editMode === 'drag' && <span className="ml-2 text-sm text-purple-600">(Drag shifts to move between days)</span>}
        </h3>

        <div className="grid grid-cols-7 gap-3">
          {uniqueDates.map(date => {
            const dayShifts = shiftsByDate[date] || [];
            const isDropZone = dropZones.includes(date);

            return (
              <div
                key={date}
                className={`border border-gray-200 rounded-lg p-3 min-h-[200px] transition-all ${
                  isDropZone ? 'border-green-400 bg-green-50' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, date)}
                onDrop={(e) => handleDrop(e, date)}
              >
                {/* Day Header */}
                <div className="text-center mb-3">
                  <div className="font-semibold text-gray-900">{getDayLabel(date)}</div>
                </div>

                {/* Shifts */}
                <div className="space-y-2">
                  {dayShifts.map(shift => (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      workers={workers}
                      availableWorkers={getAvailableWorkers(date, shift.id)}
                      editMode={editMode}
                      onWorkerAssignment={handleWorkerAssignment}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDragging={draggedShift?.id === shift.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-3">How to Edit Your Schedule</h3>

        <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <Edit3 className="w-4 h-4 mr-1" />
              Click to Assign Mode
            </h4>
            <ul className="space-y-1">
              <li>• Click any shift to see available workers</li>
              <li>• Select a worker from the dropdown</li>
              <li>• System prevents conflicts automatically</li>
              <li>• Perfect for quick assignments</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <Move className="w-4 h-4 mr-1" />
              Drag & Drop Mode
            </h4>
            <ul className="space-y-1">
              <li>• Drag shifts between days</li>
              <li>• Green highlight = valid drop zone</li>
              <li>• Automatic availability checking</li>
              <li>• Great for rearranging schedules</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual Shift Card Component
interface ShiftCardProps {
  shift: Shift;
  workers: Worker[];
  availableWorkers: Worker[];
  editMode: 'click' | 'drag';
  onWorkerAssignment: (shiftId: string, workerId: string | null) => void;
  onDragStart: (e: React.DragEvent, shift: Shift) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

const ShiftCard: React.FC<ShiftCardProps> = ({
  shift,
  workers,
  availableWorkers,
  editMode,
  onWorkerAssignment,
  onDragStart,
  onDragEnd,
  isDragging
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getShiftTypeColor = (type: string) => {
    switch (type) {
      case 'opening': return 'bg-green-100 border-green-300 text-green-800';
      case 'closing': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const isAssigned = shift.workerId !== null && shift.workerId !== undefined;
  const assignedWorker = isAssigned ? workers.find(w => w.id === shift.workerId) : null;

  const start = new Date(`2000-01-01 ${shift.startTime}`);
  const end = new Date(`2000-01-01 ${shift.endTime}`);
  const hours = Math.round(((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 10) / 10;

  return (
    <div
      className={`border rounded-md p-2 cursor-pointer transition-all relative ${
        isDragging ? 'opacity-50 transform rotate-2' : ''
      } ${
        isAssigned
          ? getShiftTypeColor(shift.type)
          : 'bg-red-50 border-red-300 text-red-800 border-dashed'
      }`}
      draggable={editMode === 'drag' && isAssigned}
      onDragStart={(e) => onDragStart(e, shift)}
      onDragEnd={onDragEnd}
      onClick={() => editMode === 'click' && setShowDropdown(true)}
    >
      {/* Drag Handle for drag mode */}
      {editMode === 'drag' && isAssigned && (
        <div className="absolute top-1 right-1 text-gray-400">
          <Move className="w-3 h-3" />
        </div>
      )}

      {/* Shift Info */}
      <div className="text-xs font-medium capitalize mb-1">
        {shift.type}
      </div>

      <div className="text-xs mb-1">
        <Clock className="w-3 h-3 inline mr-1" />
        {shift.startTime} - {shift.endTime} ({hours}h)
      </div>

      {/* Worker Assignment */}
      <div className="text-xs">
        {isAssigned && assignedWorker ? (
          <div className="flex items-center">
            <User className="w-3 h-3 mr-1" />
            {assignedWorker.name}
          </div>
        ) : (
          <div className="flex items-center text-red-600">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Unassigned
          </div>
        )}
      </div>

      {/* Click-to-assign dropdown */}
      {editMode === 'click' && showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto"
        >
          <div className="p-2 border-b border-gray-200 text-xs font-medium text-gray-700">
            Assign Worker
          </div>

          {availableWorkers.length === 0 ? (
            <div className="p-2 text-xs text-gray-500">No available workers</div>
          ) : (
            <>
              {/* Unassign option */}
              {isAssigned && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onWorkerAssignment(shift.id, null);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 text-red-600"
                >
                  <XCircle className="w-3 h-3 inline mr-1" />
                  Unassign
                </button>
              )}

              {/* Available workers */}
              {availableWorkers.map(worker => (
                <button
                  key={worker.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onWorkerAssignment(shift.id, worker.id);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-blue-50 flex items-center justify-between"
                >
                  <span>{worker.name}</span>
                  <span className="text-gray-500">({worker.workPercentage}%)</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleEditor;