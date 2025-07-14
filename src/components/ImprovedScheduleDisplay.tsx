// Improved Schedule Display Component with Worker-Centric View
// Location: src/components/ImprovedScheduleDisplay.tsx

import React from 'react';
import { Clock, User, AlertTriangle, Calendar, Coffee, CheckCircle } from 'lucide-react';
import type { Schedule, Worker } from '../types';
// import { scheduleDisplayService, type ConsolidatedWorkerShift, type DayScheduleDisplay } from '../services/scheduleDisplayService';
import { scheduleDisplayService, type ConsolidatedWorkerShift } from '../services/scheduleDisplayService';

interface ImprovedScheduleDisplayProps {
  schedule: Schedule;
  workers: Worker[];
  onEditShift?: (workerId: string, date: string) => void;
  onAssignShift?: (shiftId: string) => void;
}

const ImprovedScheduleDisplay: React.FC<ImprovedScheduleDisplayProps> = ({
  schedule,
  workers,
  onEditShift,
  onAssignShift
}) => {
  // Get consolidated display data
  const displaySchedule = scheduleDisplayService.consolidateScheduleForDisplay(schedule, workers);

  // Calculate weekly summary for all workers
  const workerSummaries = workers
    .filter(w => w.isActive)
    .map(worker => ({
      worker,
      summary: scheduleDisplayService.getWorkerWeeklySummary(worker.id, displaySchedule)
    }))
    .filter(ws => ws.summary.daysWorked > 0);

  const ShiftCard: React.FC<{
    shift: ConsolidatedWorkerShift;
    onEdit?: () => void;
  }> = ({ shift, onEdit }) => {
    const status = scheduleDisplayService.getShiftStatus(shift);

    return (
      <div className={`p-4 rounded-lg border-2 ${status.color} hover:shadow-md transition-all cursor-pointer group`}
           onClick={onEdit}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span className="font-semibold">{shift.workerName}</span>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            status.priority === 'high' ? 'bg-purple-200 text-purple-800' :
            status.priority === 'medium' ? 'bg-blue-200 text-blue-800' :
            'bg-gray-200 text-gray-800'
          }`}>
            {status.badge}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="w-3 h-3" />
            <span className="font-mono">{shift.startTime} - {shift.endTime}</span>
            <span className="font-medium">({shift.totalHours}h)</span>
          </div>

          <div className="text-sm text-gray-600">
            {shift.shiftTypes.join(' → ')}
          </div>

          {shift.gaps.length > 0 && (
            <div className="flex items-center space-x-1 text-xs text-orange-600">
              <Coffee className="w-3 h-3" />
              <span>
                {shift.gaps.map(gap => `${gap.duration}h break`).join(', ')}
              </span>
            </div>
          )}
        </div>

        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="text-xs text-blue-600 hover:text-blue-800">
            Click to edit shift
          </button>
        </div>
      </div>
    );
  };

  const UnassignedShiftCard: React.FC<{
    shift: any;
    onAssign?: () => void;
  }> = ({ shift, onAssign }) => (
    <div className="p-4 rounded-lg border-2 border-red-300 bg-red-50 hover:shadow-md transition-all cursor-pointer"
         onClick={onAssign}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="font-semibold text-red-800">Unassigned</span>
        </div>
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-200 text-red-800">
          {shift.isRequired ? 'Required' : 'Optional'}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-sm text-red-700">
          <Clock className="w-3 h-3" />
          <span className="font-mono">{shift.startTime} - {shift.endTime}</span>
        </div>

        <div className="text-sm text-red-600">
          {scheduleDisplayService.getShiftTypeLabel(shift.type)}
        </div>
      </div>

      <div className="mt-2">
        <button className="text-xs text-red-700 hover:text-red-900">
          Click to assign worker
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Weekly Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Overview</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workerSummaries.map(({ worker, summary }) => (
            <div key={worker.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{worker.name}</span>
                <span className="text-sm text-gray-500">{summary.daysWorked} days</span>
              </div>

              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Total Hours:</span>
                  <span className="font-medium">{summary.totalHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg/Day:</span>
                  <span>{summary.averageHoursPerDay.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Longest:</span>
                  <span>{summary.longestShift}h</span>
                </div>
              </div>

              <div className="mt-2">
                <div className="flex flex-wrap gap-1">
                  {summary.shiftTypes.map(type => (
                    <span key={type} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Schedule */}
      <div className="space-y-6">
        {displaySchedule.map((day) => (
          <div key={day.date} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {day.dayOfWeek}, {new Date(day.date).toLocaleDateString()}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {day.workerShifts.length} workers scheduled
                  </p>
                </div>
              </div>

              {/* Day Status Indicators */}
              <div className="flex items-center space-x-2">
                {day.coverageGaps.length === 0 ? (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Full Coverage</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-yellow-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">{day.coverageGaps.length} Issues</span>
                  </div>
                )}

                <span className="text-sm text-gray-400">
                  {day.workerShifts.reduce((total, shift) => total + shift.totalHours, 0)}h total
                </span>
              </div>
            </div>

            {/* Coverage Issues */}
            {day.coverageGaps.length > 0 && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Coverage Issues</h4>
                    <ul className="mt-1 text-sm text-yellow-700 space-y-1">
                      {day.coverageGaps.map((gap, index) => (
                        <li key={index}>• {gap}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Worker Shifts */}
            {day.workerShifts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                {day.workerShifts.map((shift) => (
                  <ShiftCard
                    key={`${shift.workerId}-${shift.date}`}
                    shift={shift}
                    onEdit={() => onEditShift?.(shift.workerId, shift.date)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 mb-6">
                <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No workers scheduled for this day</p>
              </div>
            )}

            {/* Unassigned Shifts */}
            {day.unassignedShifts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Unassigned Shifts ({day.unassignedShifts.length})
                </h4>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {day.unassignedShifts.map((shift) => (
                    <UnassignedShiftCard
                      key={shift.id}
                      shift={shift}
                      onAssign={() => onAssignShift?.(shift.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Timeline View Option (Future Enhancement) */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline View</h3>
        <div className="bg-white rounded border p-4">
          <div className="text-center text-gray-500 py-8">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>Timeline view coming in Step 4: Schedule Editing & Management</p>
            <p className="text-sm mt-1">This will show all workers on a visual timeline for easy drag-and-drop editing</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Statistics</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {displaySchedule.reduce((total, day) => total + day.workerShifts.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Worker Assignments</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {displaySchedule.reduce((total, day) =>
                total + day.workerShifts.reduce((dayTotal, shift) => dayTotal + shift.totalHours, 0), 0
              )}
            </div>
            <div className="text-sm text-gray-600">Total Hours</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(
                displaySchedule.reduce((total, day) =>
                  total + day.workerShifts.reduce((dayTotal, shift) => dayTotal + shift.totalHours, 0), 0
                ) / Math.max(workerSummaries.length, 1)
              )}
            </div>
            <div className="text-sm text-gray-600">Avg Hours/Worker</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {displaySchedule.reduce((total, day) => total + day.unassignedShifts.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Unassigned Shifts</div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Read This Schedule</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Worker Cards Show:</h4>
            <ul className="space-y-1 text-blue-800">
              <li>• <strong>Continuous work blocks</strong> (not separate shifts)</li>
              <li>• <strong>Total hours</strong> for the day</li>
              <li>• <strong>Shift progression</strong> (Opening → Lunch → Closing)</li>
              <li>• <strong>Break periods</strong> if any gaps exist</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Status Indicators:</h4>
            <ul className="space-y-1 text-blue-800">
              <li>• <span className="bg-purple-200 px-1 rounded">Full Day</span> Opening + Closing</li>
              <li>• <span className="bg-blue-200 px-1 rounded">Opening</span> Starts early shift</li>
              <li>• <span className="bg-orange-200 px-1 rounded">Closing</span> Ends late shift</li>
              <li>• <span className="bg-green-200 px-1 rounded">Long Shift</span> 8+ hours</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedScheduleDisplay;