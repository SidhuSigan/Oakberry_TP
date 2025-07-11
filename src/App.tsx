import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import WorkerManagement from './components/WorkerManagement';
import ScheduleGenerator from './components/ScheduleGenerator';
import ScheduleEditor from './components/ScheduleEditor';
import { Worker, Schedule } from './types';
import { loadWorkers, saveWorkers, loadSchedules, saveSchedules } from './services/storageService';

type ViewType = 'dashboard' | 'workers' | 'generate' | 'edit';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    setIsLoading(true);
    try {
      const loadedWorkers = loadWorkers();
      const loadedSchedules = loadSchedules();
      setWorkers(loadedWorkers);
      setSchedules(loadedSchedules);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save workers when they change
  useEffect(() => {
    if (!isLoading) {
      saveWorkers(workers);
    }
  }, [workers, isLoading]);

  // Save schedules when they change
  useEffect(() => {
    if (!isLoading) {
      saveSchedules(schedules);
    }
  }, [schedules, isLoading]);

  const handleNavigate = (view: ViewType) => {
    setCurrentView(view);
    if (view !== 'edit') {
      setCurrentSchedule(null);
    }
  };

  const handleSelectSchedule = (schedule: Schedule) => {
    setCurrentSchedule(schedule);
    setCurrentView('edit');
  };

  const handleGenerateSchedule = (schedule: Schedule) => {
    setSchedules([...schedules, schedule]);
    setCurrentSchedule(schedule);
    setCurrentView('edit');
  };

  const handleUpdateSchedule = (updatedSchedule: Schedule) => {
    setSchedules(schedules.map(s =>
      s.id === updatedSchedule.id ? updatedSchedule : s
    ));
    setCurrentSchedule(updatedSchedule);
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    setSchedules(schedules.filter(s => s.id !== scheduleId));
    if (currentSchedule?.id === scheduleId) {
      setCurrentSchedule(null);
      setCurrentView('dashboard');
    }
  };

  const handleAddWorker = (worker: Worker) => {
    setWorkers([...workers, worker]);
  };

  const handleUpdateWorker = (updatedWorker: Worker) => {
    setWorkers(workers.map(w =>
      w.id === updatedWorker.id ? updatedWorker : w
    ));
  };

  const handleDeleteWorker = (workerId: string) => {
    setWorkers(workers.filter(w => w.id !== workerId));
  };

  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="spinner"></div>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            workers={workers}
            schedules={schedules}
            onSelectSchedule={handleSelectSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onNavigate={(view) => handleNavigate(view as ViewType)}
          />
        );

      case 'workers':
        return (
          <WorkerManagement
            workers={workers}
            onAddWorker={handleAddWorker}
            onUpdateWorker={handleUpdateWorker}
            onDeleteWorker={handleDeleteWorker}
          />
        );

      case 'generate':
        return (
          <ScheduleGenerator
            workers={workers}
            schedules={schedules}
            onGenerateSchedule={handleGenerateSchedule}
            onCancel={() => handleNavigate('dashboard')}
          />
        );

      case 'edit':
        return currentSchedule ? (
          <ScheduleEditor
            schedule={currentSchedule}
            workers={workers}
            schedules={schedules}
            onUpdateSchedule={handleUpdateSchedule}
            onClose={() => handleNavigate('dashboard')}
          />
        ) : (
          <div className="p-4">
            <p className="text-center text-gray-600">No schedule selected</p>
            <button
              onClick={() => handleNavigate('dashboard')}
              className="mt-4 btn-primary mx-auto block"
            >
              Back to Dashboard
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">Oakberry TeamPlanner</h1>
        </div>
      </header>

      <main className="pb-20">
        {renderView()}
      </main>

      <Navigation currentView={currentView} onNavigate={handleNavigate} />
    </div>
  );
}

export default App;