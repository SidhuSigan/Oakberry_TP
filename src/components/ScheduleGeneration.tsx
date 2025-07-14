// src/components/ScheduleGeneration.tsx - Updated with Editor Integration

import React, { useState, useEffect } from 'react';
import {
  Calendar,
//   Users,
//   Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Edit3
} from 'lucide-react';

import { scheduleService } from '../services/scheduleService';
import { workerService } from '../services/workerService';
import ImprovedScheduleDisplay from './ImprovedScheduleDisplay';
import ScheduleEditor from './ScheduleEditor';
import type { Schedule, Worker } from '../types';

interface ScheduleGenerationProps {
  onScheduleGenerated?: (schedule: Schedule) => void;
}

const ScheduleGeneration: React.FC<ScheduleGenerationProps> = ({ onScheduleGenerated }) => {
  const [selectedWeek, setSelectedWeek] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Load workers and set default week on component mount
  useEffect(() => {
    const allWorkers = workerService.getAllWorkers();
    setWorkers(allWorkers);

    // Set default week to next Monday
    const today = new Date();
    const nextMonday = new Date(today);
    const daysUntilMonday = (7 - today.getDay() + 1) % 7 || 7;
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    setSelectedWeek(nextMonday.toISOString().split('T')[0]);

    // Load existing schedule if available
    const existingSchedule = scheduleService.getScheduleForWeek(nextMonday.toISOString().split('T')[0]);
    if (existingSchedule) {
      setCurrentSchedule(existingSchedule);
    }
  }, []);

  const activeWorkers = workers.filter(w => w.isActive);

  const handleGenerateSchedule = async () => {
    if (!selectedWeek || activeWorkers.length === 0) return;

    setIsGenerating(true);
    try {
      // Generate the schedule using your existing service
      const newSchedule = scheduleService.generateSchedule({ weekStartDate: selectedWeek });  // activeWorkers

      // Save the schedule
      scheduleService.saveSchedule(newSchedule);
      setCurrentSchedule(newSchedule);

      // Notify parent component (App.tsx) that schedule was generated
      if (onScheduleGenerated) {
        onScheduleGenerated(newSchedule);
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
      // You could add toast notification here
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOverwriteSchedule = async () => {
    if (!selectedWeek || activeWorkers.length === 0) return;

    const confirmOverwrite = window.confirm(
      'This will replace the existing schedule. Are you sure you want to continue?'
    );

    if (!confirmOverwrite) return;

    await handleGenerateSchedule();
  };

  const handleScheduleUpdate = (updatedSchedule: Schedule) => {
    setCurrentSchedule(updatedSchedule);
    if (onScheduleGenerated) {
      onScheduleGenerated(updatedSchedule);
    }
  };

  const handleExitEditing = () => {
    setIsEditing(false);
  };

  // Show schedule editor when in editing mode
  if (isEditing && currentSchedule) {
    return (
      <ScheduleEditor
        schedule={currentSchedule}
        onScheduleUpdate={handleScheduleUpdate}
        onBack={handleExitEditing}
      />
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule Generation</h2>
          <p className="text-gray-600">
            Generate optimized weekly schedules for your team
          </p>
        </div>

        {/* Generation Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate New Schedule</h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Week Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week Starting (Monday)
              </label>
              <input
                type="date"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Worker Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Workers
              </label>
              <div className="bg-gray-50 rounded-md p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Active Workers:</span>
                  <span className="font-medium text-gray-900">{activeWorkers.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Total Capacity:</span>
                  <span className="font-medium text-gray-900">
                    {activeWorkers.reduce((sum, w) => sum + w.workPercentage, 0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Generation Controls */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {activeWorkers.length === 0 ? (
                <div className="flex items-center text-red-600">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  No active workers available
                </div>
              ) : (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Ready to generate schedule
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
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
        </div>

        {/* Generated Schedule Display */}
        {currentSchedule && (
          <>
            {/* Schedule Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Generated Schedule</h3>
                <div className="flex items-center space-x-3">
                  {/* Edit Button */}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Schedule</span>
                  </button>


                  <button className="flex items-center space-x-2 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Schedule Display */}
            <ImprovedScheduleDisplay
              schedule={currentSchedule}
              workers={workers}
              onScheduleUpdate={handleScheduleUpdate}
            />
          </>
        )}

        {/* Help Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-3">Next Steps</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">What You Can Do Now</h4>
              <ul className="space-y-1">
                <li>• Generate schedules for any week</li>
                <li>• View worker-centric consolidated display</li>
                <li>• See Arbeitspensum status for each worker</li>
                <li>• Switch to Schedule Editor for manual adjustments</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Coming in Phase 4 Editor</h4>
              <ul className="space-y-1">
                <li>• Click-to-assign workers to shifts</li>
                <li>• Drag-and-drop shifts between days</li>
                <li>• Real-time conflict detection</li>
                <li>• Undo/redo functionality</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleGeneration;

export interface ImprovedScheduleDisplayProps {
  schedule: Schedule;
  workers: Worker[];
  onScheduleUpdate: (updatedSchedule: Schedule) => void;
}