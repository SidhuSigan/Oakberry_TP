import React, { useState, useEffect } from 'react';
import { Worker, Schedule, WeatherData } from '../types';
import { Calendar, AlertCircle, Cloud, Users } from 'lucide-react';
import { getWeekStartDate, formatDate } from '../utils/dateUtils';
import { generateDefaultShifts, assignWorkersToShifts, generateScheduleId } from '../utils/scheduleUtils';
import { fetchWeatherData } from '../services/weatherService';

interface ScheduleGeneratorProps {
  workers: Worker[];
  schedules: Schedule[];
  onGenerateSchedule: (schedule: Schedule) => void;
  onCancel: () => void;
}

const ScheduleGenerator: React.FC<ScheduleGeneratorProps> = ({
  workers,
  schedules,
  onGenerateSchedule,
  onCancel,
}) => {
  const [selectedWeek, setSelectedWeek] = useState<Date>(getWeekStartDate(new Date()));
  const [isGenerating, setIsGenerating] = useState(false);
  const [weather, setWeather] = useState<WeatherData[]>([]);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = async () => {
    setIsLoadingWeather(true);
    try {
      const data = await fetchWeatherData();
      setWeather(data);
    } catch (error) {
      console.error('Failed to load weather:', error);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    setSelectedWeek(getWeekStartDate(date));
  };

  const handleGenerate = async () => {
    if (workers.filter(w => w.isActive).length === 0) {
      alert('Please add at least one active worker before generating a schedule.');
      return;
    }

    // Check if schedule already exists for this week
    const existingSchedule = schedules.find(s =>
      formatDate(s.weekStartDate) === formatDate(selectedWeek)
    );

    if (existingSchedule) {
      if (!confirm('A schedule already exists for this week. Do you want to overwrite it?')) {
        return;
      }
    }

    setIsGenerating(true);

    try {
      // Generate default shifts
      const shifts = generateDefaultShifts(selectedWeek);

      // Assign workers to shifts
      const assignedShifts = assignWorkersToShifts(shifts, workers);

      // Create new schedule
      const newSchedule: Schedule = {
        id: generateScheduleId(),
        weekStartDate: selectedWeek,
        shifts: assignedShifts,
        createdAt: new Date(),
        lastModified: new Date(),
        weather: weather.filter(w => {
          const weekEnd = new Date(selectedWeek);
          weekEnd.setDate(weekEnd.getDate() + 6);
          return w.date >= selectedWeek && w.date <= weekEnd;
        }),
      };

      onGenerateSchedule(newSchedule);
    } catch (error) {
      console.error('Failed to generate schedule:', error);
      alert('Failed to generate schedule. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const activeWorkers = workers.filter(w => w.isActive);
  const weekDisplay = formatDate(selectedWeek, 'MMM d, yyyy');

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-xl font-semibold mb-4">Generate New Schedule</h2>

        {/* Week Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Week
            </label>
            <input
              type="date"
              value={formatDate(selectedWeek, 'yyyy-MM-dd')}
              onChange={handleWeekChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-600">
              Week starting: {weekDisplay}
            </p>
          </div>

          {/* Worker Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium">Available Workers</h3>
            </div>
            {activeWorkers.length === 0 ? (
              <p className="text-sm text-red-600">
                No active workers available. Please add workers first.
              </p>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  {activeWorkers.length} active worker{activeWorkers.length !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {activeWorkers.map(worker => (
                    <span
                      key={worker.id}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {worker.name} ({worker.workPercentage}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Weather Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Cloud className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium">Weather Forecast</h3>
            </div>
            {isLoadingWeather ? (
              <p className="text-sm text-gray-600">Loading weather data...</p>
            ) : weather.length > 0 ? (
              <div className="space-y-1">
                {weather.slice(0, 7).some(w => w.isHot || w.isSunny) && (
                  <div className="flex items-start space-x-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>
                      Sunny/hot days expected. Consider scheduling extra staff on weekends.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Weather data unavailable</p>
            )}
          </div>

          {/* Schedule Information */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Schedule Rules</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Opening: 1 person arrives 30min before store opens</li>
              <li>• Closing: 2 people stay 30min after store closes</li>
              <li>• Peak hours: 3-4 staff (more on weekends)</li>
              <li>• Workers with 100% get priority for shifts</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || activeWorkers.length === 0}
            className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="spinner w-4 h-4"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5" />
                <span>Generate Schedule</span>
              </>
            )}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleGenerator;