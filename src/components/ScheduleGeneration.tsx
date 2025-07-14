// Updated ScheduleGeneration component with improved display
// This shows how to integrate the new consolidated view

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
  ChevronRight,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

import { scheduleService } from '../services/scheduleService';
import { workerService } from '../services/workerService';
import ImprovedScheduleDisplay from './ImprovedScheduleDisplay';
import type { Schedule, Worker } from '../types';

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
  const [useImprovedDisplay, setUseImprovedDisplay] = useState(true); // NEW: Toggle between views

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

  const handleEditShift = (workerId: string, date: string) => {
    // TODO: Implement in Step 4
    console.log('Edit shift for worker:', workerId, 'on date:', date);
    alert('Shift editing will be available in Step 4: Schedule Editing & Management');
  };

  const handleAssignShift = (shiftId: string) => {
    // TODO: Implement in Step 4
    console.log('Assign shift:', shiftId);
    alert('Shift assignment will be available in Step 4: Schedule Editing & Management');
  };

  const formatWeekRange = (weekStart: string): string => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

//   const getWorkerStats = () => {
//     if (!currentSchedule) return null;
//     return scheduleService.calculateWeeklyHours(currentSchedule);
//   };

//   const getScheduleStats = () => {
//     if (!currentSchedule) return null;
//     return scheduleService.getScheduleStats(currentSchedule);
//   };

  const activeWorkers = workers.filter(w => w.isActive);

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

        {/* Display Toggle and Generated Schedule */}
        {currentSchedule && (
          <>
            {/* Display Mode Toggle */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Schedule Display</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setUseImprovedDisplay(!useImprovedDisplay)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    {useImprovedDisplay ? <ToggleRight className="w-4 h-4 text-blue-600" /> : <ToggleLeft className="w-4 h-4" />}
                    <span>{useImprovedDisplay ? 'Worker-Centric View' : 'Traditional View'}</span>
                  </button>
                  <button className="flex items-center space-x-2 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>

              {/* Feature Comparison */}
              <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
                <div className={`p-3 rounded-md ${useImprovedDisplay ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <h4 className="font-medium mb-2">👥 Worker-Centric View {useImprovedDisplay && '(Active)'}</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Shows continuous work blocks per worker</li>
                    <li>• Easier to understand daily workload</li>
                    <li>• Better for drag-and-drop editing</li>
                    <li>• Consolidates overlapping shifts</li>
                  </ul>
                </div>
                <div className={`p-3 rounded-md ${!useImprovedDisplay ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <h4 className="font-medium mb-2">⏰ Traditional View {!useImprovedDisplay && '(Active)'}</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Shows individual shift periods</li>
                    <li>• Detailed coverage breakdown</li>
                    <li>• Good for understanding peak times</li>
                    <li>• Technical/administrative view</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Schedule Display */}
            {useImprovedDisplay ? (
              <ImprovedScheduleDisplay
                schedule={currentSchedule}
                workers={workers}
                onEditShift={handleEditShift}
                onAssignShift={handleAssignShift}
              />
            ) : (
              // Keep the original display as fallback
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Traditional Schedule View</h3>
                <p className="text-gray-600 mb-4">
                  This is the original technical view showing individual shift periods.
                  Toggle to "Worker-Centric View" above for the improved display.
                </p>
                {/* Original schedule display code would go here */}
                <div className="text-center py-8 text-gray-500">
                  <Eye className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Original schedule display preserved for comparison</p>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Schedule Generated Successfully!</h4>
                  <div className="mt-2 text-sm text-blue-800">
                    <p className="mb-2">The improved display now shows:</p>
                    <ul className="space-y-1">
                      <li className="flex items-center space-x-2">
                        <ChevronRight className="w-3 h-3" />
                        <span><strong>Continuous work blocks</strong> instead of fragmented shifts</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <ChevronRight className="w-3 h-3" />
                        <span><strong>Clear daily hours</strong> for each worker</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <ChevronRight className="w-3 h-3" />
                        <span><strong>Better preparation</strong> for drag-and-drop editing in Step 4</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Help Section */}
        <div className="bg-gray-50 rounded-lg p-6 mt-8">
          <h3 className="font-medium text-gray-900 mb-3">Schedule Display Improvements</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Problem Solved</h4>
              <ul className="space-y-1">
                <li>• Workers no longer appear in multiple overlapping shifts</li>
                <li>• Clear understanding of daily workload per worker</li>
                <li>• Better foundation for Step 4 drag-and-drop editing</li>
                <li>• More intuitive for non-technical users</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Coming in Step 4</h4>
              <ul className="space-y-1">
                <li>• Drag workers between days</li>
                <li>• Adjust start/end times with handles</li>
                <li>• Visual timeline view</li>
                <li>• Real-time conflict detection</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleGeneration;