import React, { useEffect, useState } from 'react';
import { Worker, Schedule, WeatherData } from '../types';
import { formatDate, getWeekStartDate, DAYS_OF_WEEK_SHORT } from '../utils/dateUtils';
import { calculateWorkerStats, getArbeitspensumEmoji } from '../utils/arbeitspensumUtils';
import { fetchWeatherData, getWeatherEmoji, needsExtraStaff } from '../services/weatherService';
import { Calendar, Users, AlertCircle, Sun, Trash2 } from 'lucide-react';

interface DashboardProps {
  workers: Worker[];
  schedules: Schedule[];
  onSelectSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  onNavigate: (view: 'workers' | 'generate') => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  workers,
  schedules,
  onSelectSchedule,
  onDeleteSchedule,
  onNavigate
}) => {
  const [weather, setWeather] = useState<WeatherData[]>([]);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);

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

  const currentWeekStart = getWeekStartDate(new Date());
  const currentSchedule = schedules.find(s =>
    formatDate(s.weekStartDate) === formatDate(currentWeekStart)
  );

  // Get recent and upcoming schedules
  const sortedSchedules = [...schedules].sort((a, b) =>
    b.weekStartDate.getTime() - a.weekStartDate.getTime()
  );
  const recentSchedules = sortedSchedules.slice(0, 5);

  // Calculate worker stats for current week
  const workerStats = currentSchedule ? workers.map(worker =>
    calculateWorkerStats(worker, currentSchedule, schedules)
  ) : [];

  const handleDeleteClick = (e: React.MouseEvent, scheduleId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this schedule?')) {
      onDeleteSchedule(scheduleId);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Workers</p>
              <p className="text-2xl font-bold">{workers.filter(w => w.isActive).length}</p>
            </div>
            <Users className="w-8 h-8 text-primary-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Schedules</p>
              <p className="text-2xl font-bold">{schedules.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-primary-500" />
          </div>
        </div>
      </div>

      {/* Current Week Status */}
      {currentSchedule ? (
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Current Week Schedule</h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Week of {formatDate(currentSchedule.weekStartDate, 'MMM d, yyyy')}
            </p>
            <button
              onClick={() => onSelectSchedule(currentSchedule)}
              className="btn-primary w-full"
            >
              View/Edit Schedule
            </button>
          </div>
        </div>
      ) : (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">No Schedule for Current Week</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Create a schedule for the week starting {formatDate(currentWeekStart, 'MMM d')}
              </p>
              <button
                onClick={() => onNavigate('generate')}
                className="btn-primary mt-3"
              >
                Generate Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weather Forecast */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Weather Forecast</h2>
        {isLoadingWeather ? (
          <div className="flex justify-center py-4">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {weather.slice(0, 7).map((day, index) => {
              const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
              const extraStaff = needsExtraStaff(day, isWeekend);

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded ${
                    extraStaff ? 'bg-yellow-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getWeatherEmoji(day)}</span>
                    <div>
                      <p className="font-medium">
                        {DAYS_OF_WEEK_SHORT[day.date.getDay()]} {formatDate(day.date, 'MMM d')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {Math.round(day.tempMax)}°/{Math.round(day.tempMin)}°
                      </p>
                    </div>
                  </div>
                  {extraStaff && (
                    <div className="flex items-center text-yellow-600">
                      <Sun className="w-4 h-4 mr-1" />
                      <span className="text-sm">Extra staff</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Worker Arbeitspensum Overview */}
      {currentSchedule && workerStats.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Worker Status This Week</h2>
          <div className="space-y-2">
            {workerStats.map(stat => {
              const worker = workers.find(w => w.id === stat.workerId);
              if (!worker) return null;

              const emoji = getArbeitspensumEmoji(stat.status);

              return (
                <div key={stat.workerId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>{emoji}</span>
                    <span className="font-medium">{worker.name}</span>
                  </div>
                  <div className="text-sm text-right">
                    <p>{stat.actualHours.toFixed(1)}h / {stat.targetHours.toFixed(1)}h</p>
                    <p className="text-gray-600">{Math.round(stat.percentageActual)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Schedules */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Recent Schedules</h2>
        {recentSchedules.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No schedules created yet</p>
        ) : (
          <div className="space-y-2">
            {recentSchedules.map(schedule => {
              const isCurrent = formatDate(schedule.weekStartDate) === formatDate(currentWeekStart);

              return (
                <div
                  key={schedule.id}
                  onClick={() => onSelectSchedule(schedule)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    isCurrent ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        Week of {formatDate(schedule.weekStartDate, 'MMM d')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {schedule.shifts.length} shifts
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isCurrent && (
                        <span className="text-xs bg-primary-600 text-white px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteClick(e, schedule.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        aria-label="Delete schedule"
                      >
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;