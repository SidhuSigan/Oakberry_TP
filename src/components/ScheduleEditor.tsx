import React, { useState, useEffect } from 'react';
import { Worker, Schedule, Shift } from '../types';
import { formatDate, DAYS_OF_WEEK_SHORT } from '../utils/dateUtils';
import { calculateWorkerStats, getArbeitspensumEmoji } from '../utils/arbeitspensumUtils';
import { canAssignWorkerToShift, assignWorkerToShift, removeWorkerFromShift } from '../utils/scheduleUtils';
import { Share2, AlertCircle, X, Check } from 'lucide-react';
import ShareExport from './ShareExport';

interface ScheduleEditorProps {
  schedule: Schedule;
  workers: Worker[];
  schedules: Schedule[];
  onUpdateSchedule: (schedule: Schedule) => void;
  onClose: () => void;
}

const ScheduleEditor: React.FC<ScheduleEditorProps> = ({
  schedule,
  workers,
  schedules,
  onUpdateSchedule,
  onClose,
}) => {
  const [editedSchedule, setEditedSchedule] = useState<Schedule>(schedule);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showShareExport, setShowShareExport] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditedSchedule(schedule);
    setHasChanges(false);
  }, [schedule]);

  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift);
  };

  const handleAssignWorker = (workerId: string) => {
    if (!selectedShift) return;

    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    if (canAssignWorkerToShift(worker, selectedShift, editedSchedule)) {
      const updatedShift = assignWorkerToShift(selectedShift, workerId);
      const updatedShifts = editedSchedule.shifts.map(s =>
        s.id === selectedShift.id ? updatedShift : s
      );

      setEditedSchedule({
        ...editedSchedule,
        shifts: updatedShifts,
        lastModified: new Date(),
      });
      setHasChanges(true);
      setSelectedShift(null);
    } else {
      alert('This worker cannot be assigned to this shift (conflict or not available)');
    }
  };

  const handleRemoveWorker = (shift: Shift) => {
    const updatedShift = removeWorkerFromShift(shift);
    const updatedShifts = editedSchedule.shifts.map(s =>
      s.id === shift.id ? updatedShift : s
    );

    setEditedSchedule({
      ...editedSchedule,
      shifts: updatedShifts,
      lastModified: new Date(),
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdateSchedule(editedSchedule);
    setHasChanges(false);
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Group shifts by day
  const shiftsByDay = new Map<string, Shift[]>();
  const weekDates: Date[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(editedSchedule.weekStartDate);
    date.setDate(date.getDate() + i);
    weekDates.push(date);

    const dateKey = formatDate(date);
    const dayShifts = editedSchedule.shifts
      .filter(shift => formatDate(shift.date) === dateKey)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    shiftsByDay.set(dateKey, dayShifts);
  }

  // Calculate worker stats
  const workerStats = workers.map(worker =>
    calculateWorkerStats(worker, editedSchedule, schedules)
  );

  const getShiftTypeColor = (type: string) => {
    switch (type) {
      case 'opening':
        return 'bg-blue-100 border-blue-300 text-blue-900';
      case 'closing':
        return 'bg-purple-100 border-purple-300 text-purple-900';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-900';
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Edit Schedule</h2>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-600">
          Week of {formatDate(editedSchedule.weekStartDate, 'MMM d, yyyy')}
        </p>
        {hasChanges && (
          <div className="mt-2 flex items-center text-sm text-yellow-600">
            <AlertCircle className="w-4 h-4 mr-1" />
            <span>You have unsaved changes</span>
          </div>
        )}
      </div>

      {/* Schedule Grid */}
      <div className="space-y-4">
        {weekDates.map((date, dayIndex) => {
          const dateKey = formatDate(date);
          const dayShifts = shiftsByDay.get(dateKey) || [];
          const dayName = DAYS_OF_WEEK_SHORT[date.getDay()];

          return (
            <div key={dateKey} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3">
                {dayName}, {formatDate(date, 'MMM d')}
              </h3>

              <div className="space-y-2">
                {dayShifts.map(shift => {
                  const worker = workers.find(w => w.id === shift.workerId);
                  const isSelected = selectedShift?.id === shift.id;

                  return (
                    <div
                      key={shift.id}
                      onClick={() => handleShiftClick(shift)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        getShiftTypeColor(shift.type)
                      } ${isSelected ? 'ring-2 ring-blue-500' : ''} ${
                        !worker ? 'border-red-500 bg-red-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {shift.startTime} - {shift.endTime}
                            {shift.type !== 'regular' && (
                              <span className="ml-2 text-xs uppercase">
                                ({shift.type})
                              </span>
                            )}
                          </div>
                          <div className="text-sm mt-1">
                            {worker ? (
                              <span className="flex items-center">
                                {worker.name}
                                {workerStats.find(s => s.workerId === worker.id) && (
                                  <span className="ml-2">
                                    {getArbeitspensumEmoji(
                                      workerStats.find(s => s.workerId === worker.id)!.status
                                    )}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-red-600 font-medium">
                                ⚠️ Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                        {worker && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveWorker(shift);
                            }}
                            className="p-1 hover:bg-red-100 rounded"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Worker Selection Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Assign Worker</h3>
                <button
                  onClick={() => setSelectedShift(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {formatDate(selectedShift.date, 'EEE, MMM d')} •{' '}
                {selectedShift.startTime} - {selectedShift.endTime}
              </p>
            </div>

            <div className="p-4 space-y-2">
              {workers
                .filter(w => w.isActive)
                .map(worker => {
                  const canAssign = canAssignWorkerToShift(worker, selectedShift, editedSchedule);
                  const stats = workerStats.find(s => s.workerId === worker.id);

                  return (
                    <button
                      key={worker.id}
                      onClick={() => canAssign && handleAssignWorker(worker.id)}
                      disabled={!canAssign}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        canAssign
                          ? 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{worker.name}</div>
                          <div className="text-sm text-gray-600">
                            {worker.workPercentage}% • {stats?.actualHours.toFixed(1)}h this week
                          </div>
                        </div>
                        {stats && (
                          <span className="text-lg">
                            {getArbeitspensumEmoji(stats.status)}
                          </span>
                        )}
                      </div>
                      {!canAssign && (
                        <p className="text-xs text-red-600 mt-1">
                          Not available or has conflict
                        </p>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-2">
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Check className="w-5 h-5" />
            <span>Save Changes</span>
          </button>
          <button
            onClick={() => setShowShareExport(true)}
            className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 flex items-center justify-center space-x-2"
          >
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Share/Export Modal */}
      {showShareExport && (
        <ShareExport
          schedule={editedSchedule}
          workers={workers}
          onClose={() => setShowShareExport(false)}
        />
      )}
    </div>
  );
};

export default ScheduleEditor;