import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  Download,
  Settings,
  ChevronRight
} from 'lucide-react';

import { scheduleService } from '../services/scheduleService';
import { workerService } from '../services/workerService';
import type { Schedule, Worker, Shift, ArbeitspenaumStatus } from '../types';
import { getDayOfWeek } from '../types';

interface ScheduleGenerationProps {
  // Could accept props for pre-selected week, etc.
}

const ScheduleGeneration: React.FC<ScheduleGenerationProps> = () => {
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationIssues, setGenerationIssues] = useState<string[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Load workers and set default week
  useEffect(() => {
    const allWorkers = workerService.getAllWorkers();
    setWorkers(allWorkers);

    // Set default to next Monday
    const today = new Date();
    const nextMonday = new Date(today);
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    setSelectedWeek(nextMonday.toISOString().split('T')[0]);
  }, []);

  // Check for existing schedule when week changes
  useEffect(() => {
    if (selectedWeek) {
      const existingSchedule = scheduleService.getScheduleForWeek(selectedWeek);
      setCurrentSchedule(existingSchedule);

      // Check if generation is possible
      const canGenerate = scheduleService.canGenerateSchedule(selectedWeek);
      setGenerationIssues(canGenerate.issues);
    }
  }, [selectedWeek]);

  const handleGenerateSchedule = async () => {
    if (!selectedWeek) return;

    setIsGenerating(true);
    try {
      // Check if we can generate
      const canGenerate = scheduleService.canGenerateSchedule(selectedWeek);
      if (!canGenerate.canGenerate) {
        alert('Cannot generate schedule:\n' + canGenerate.issues.join('\n'));
        return;
      }

      // Generate the schedule
      const newSchedule = scheduleService.generateSchedule({
        weekStartDate: selectedWeek,
        prioritizeWorkBalance: true
      });

      // Save it
      const saved = scheduleService.saveSchedule(newSchedule);
      if (saved) {
        setCurrentSchedule(newSchedule);
      } else {
        alert('Failed to save schedule');
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
      alert('Error generating schedule');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOverwriteSchedule = async () => {
    if (!currentSchedule) return;

    const confirmed = window.confirm(
      'This will overwrite the existing schedule. All manual changes will be lost. Continue?'
    );

    if (confirmed) {
      // Delete existing and generate new
      scheduleService.deleteSchedule(currentSchedule.id);
      setCurrentSchedule(null);
      await handleGenerateSchedule();
    }
  };

  const formatWeekRange = (weekStart: string): string => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  const getWorkerStats = () => {
    if (!currentSchedule) return null;
    return scheduleService.calculateWeeklyHours(currentSchedule);
  };

  const getScheduleStats = () => {
    if (!currentSchedule) return null;
    return scheduleService.getScheduleStats(currentSchedule);
  };

  const getStatusColor = (status: ArbeitspenaumStatus): string => {
    switch (status) {
      case 'under': return 'text-yellow-600 bg-yellow-100';
      case 'target': return 'text-green-600 bg-green-100';
      case 'over': return 'text-red-600 bg-red-100';
    }
  };

  const getStatusIcon = (status: ArbeitspenaumStatus) => {
    switch (status) {
      case 'under': return '⚠️';
      case 'target': return '✅';
      case 'over': return '🔴';
    }
  };

  const groupShiftsByDay = (shifts: Shift[]) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const grouped: Record<string, Shift[]> = {};

    days.forEach(day => {
      grouped[day] = shifts.filter(shift => getDayOfWeek(shift.date) === day);
    });

    return grouped;
  };

  const getWorkerName = (workerId?: string): string => {
    if (!workerId) return 'Unassigned';
    const worker = workers.find(w => w.id === workerId);
    return worker?.name || 'Unknown Worker';
  };

  const activeWorkers = workers.filter(w => w.isActive);
  const workerStats = getWorkerStats();
  const scheduleStats = getScheduleStats();
  const groupedShifts = currentSchedule ? groupShiftsByDay(currentSchedule.shifts) : {};

  return (
    <div className="container py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Generation</h1>
            <p className="text-gray-600">Create automated weekly schedules with smart worker assignment</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Options</span>
            </button>
          </div>
        </div>

        {/* Week Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Week</h3>
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week Starting (Monday)
              </label>
              <input
                type="date"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {selectedWeek && (
              <div className="flex-1">
                <p className="text-sm text-gray-600">Week Range:</p>
                <p className="font-medium text-gray-900">{formatWeekRange(selectedWeek)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Pre-generation Checks */}
        {selectedWeek && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Status</h3>

            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Workers</p>
                  <p className="text-xl font-bold text-gray-900">{activeWorkers.length}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className={`text-sm font-medium ${generationIssues.length === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {generationIssues.length === 0 ? 'Ready to Generate' : 'Ready with Warnings'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="w-8 h-8 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Existing Schedule</p>
                  <p className="text-sm font-medium text-gray-900">
                    {currentSchedule ? 'Yes (will overwrite)' : 'None'}
                  </p>
                </div>
              </div>
            </div>

            {/* Issues/Warnings */}
            {generationIssues.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Generation Warnings</h4>
                    <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                      {generationIssues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Generation Button */}
            <div className="flex justify-center">
              {currentSchedule ? (
                <button
                  onClick={handleOverwriteSchedule}
                  disabled={isGenerating || activeWorkers.length === 0}
                  className="bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <RefreshCw className="w-4 h-4" />
                  <span>Regenerate Schedule</span>
                </button>
              ) : (
                <button
                  onClick={handleGenerateSchedule}
                  disabled={isGenerating || activeWorkers.length === 0}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <Calendar className="w-4 h-4" />
                  <span>Generate Schedule</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Generated Schedule Display */}
        {currentSchedule && (
          <>
            {/* Schedule Statistics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Schedule Overview</h3>
                <div className="flex items-center space-x-2">
                  <button className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                    <Eye className="w-4 h-4" />
                    <span>View Full Schedule</span>
                  </button>
                  <button className="flex items-center space-x-2 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>

              {scheduleStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{scheduleStats.totalShifts}</p>
                    <p className="text-sm text-gray-600">Total Shifts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{scheduleStats.assignedShifts}</p>
                    <p className="text-sm text-gray-600">Assigned</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{scheduleStats.unassignedShifts}</p>
                    <p className="text-sm text-gray-600">Unassigned</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{Math.round(scheduleStats.totalHours)}</p>
                    <p className="text-sm text-gray-600">Total Hours</p>
                  </div>
                </div>
              )}

              {scheduleStats && scheduleStats.unassignedShifts > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800">Unassigned Shifts Detected</h4>
                      <p className="text-sm text-red-700 mt-1">
                        {scheduleStats.unassignedShifts} shifts could not be assigned automatically.
                        You may need to assign these manually or check worker availability.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Worker Arbeitspensum Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Worker Arbeitspensum Status</h3>

              {workerStats && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Worker</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Target Hours</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Scheduled Hours</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Percentage</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(workerStats.entries()).map(([workerId, stats]) => {
                        const worker = workers.find(w => w.id === workerId);
                        if (!worker) return null;

                        const percentage = stats.target > 0 ? (stats.scheduled / stats.target) * 100 : 0;

                        return (
                          <tr key={workerId} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900">{worker.name}</div>
                              <div className="text-sm text-gray-500">{worker.workPercentage}% Arbeitspensum</div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{stats.target}h</td>
                            <td className="py-3 px-4 text-gray-900 font-medium">{stats.scheduled}h</td>
                            <td className="py-3 px-4">
                              <span className="text-gray-900 font-medium">{Math.round(percentage)}%</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(stats.status)}`}>
                                <span className="mr-1">{getStatusIcon(stats.status)}</span>
                                {stats.status === 'target' ? 'On Target' :
                                 stats.status === 'under' ? 'Under Target' : 'Over Target'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Weekly Schedule Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Weekly Schedule Preview</h3>
                <p className="text-sm text-gray-500">
                  Generated on {new Date(currentSchedule.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="space-y-6">
                {Object.entries(groupedShifts).map(([day, dayShifts]) => {
                  const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                  const dayDate = new Date(selectedWeek);
                  const dayOffset = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(day);
                  dayDate.setDate(dayDate.getDate() + dayOffset);

                  return (
                    <div key={day} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">
                          {dayName}, {dayDate.toLocaleDateString()}
                        </h4>
                        <span className="text-sm text-gray-500">
                          {dayShifts.length} shifts
                        </span>
                      </div>

                      {dayShifts.length === 0 ? (
                        <p className="text-gray-500 text-sm">No shifts scheduled</p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                          {dayShifts.map((shift) => (
                            <div
                              key={shift.id}
                              className={`p-3 rounded-md border ${
                                shift.workerId
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-red-50 border-red-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  shift.type === 'opening' ? 'bg-blue-100 text-blue-800' :
                                  shift.type === 'closing' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {scheduleService.getShiftTypeLabel(shift.type)}
                                </span>
                                {shift.isRequired && (
                                  <span className="text-xs text-red-600 font-medium">Required</span>
                                )}
                              </div>

                              <p className="text-sm font-medium text-gray-900 mb-1">
                                {scheduleService.formatShiftTime(shift)}
                              </p>

                              <p className={`text-sm ${shift.workerId ? 'text-green-700' : 'text-red-700'}`}>
                                {getWorkerName(shift.workerId)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Next Steps */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Schedule Generated Successfully!</h4>
                    <div className="mt-2 text-sm text-blue-800">
                      <p className="mb-2">Next steps:</p>
                      <ul className="space-y-1">
                        <li className="flex items-center space-x-2">
                          <ChevronRight className="w-3 h-3" />
                          <span>Review the schedule for any unassigned shifts</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <ChevronRight className="w-3 h-3" />
                          <span>Use manual editing to make adjustments if needed</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <ChevronRight className="w-3 h-3" />
                          <span>Export as PDF to share with your team</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Advanced Options Panel */}
        {showAdvancedOptions && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Generation Options</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Scheduling Preferences</h4>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Prioritize work-life balance</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Avoid consecutive days when possible</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Consider weather forecasts</span>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Coverage Settings</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum staff per shift
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="1">1 person</option>
                      <option value="2">2 people</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred shift length
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="4">4 hours</option>
                      <option value="6">6 hours</option>
                      <option value="8">8 hours</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-gray-50 rounded-lg p-6 mt-8">
          <h3 className="font-medium text-gray-900 mb-3">How Schedule Generation Works</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Automatic Assignment</h4>
              <ul className="space-y-1">
                <li>• Considers each worker's Arbeitspensum target</li>
                <li>• Respects availability and holiday dates</li>
                <li>• Balances workload across the team</li>
                <li>• Ensures coverage for opening and closing shifts</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Smart Features</h4>
              <ul className="space-y-1">
                <li>• Avoids consecutive days when possible</li>
                <li>• Prioritizes workers under their target hours</li>
                <li>• Creates unassigned shifts when no workers available</li>
                <li>• Provides real-time Arbeitspensum tracking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleGeneration;