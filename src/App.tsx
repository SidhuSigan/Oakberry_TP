// Updated App.tsx with navigation and worker management
// Location: src/App.tsx

import { useState } from 'react';
import { Calendar, Users, Settings, Home } from 'lucide-react';
import WorkerManagement from './components/WorkerManagement';
import ScheduleGeneration from './components/ScheduleGeneration';

type Page = 'home' | 'workers' | 'schedules' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'workers':
        return <WorkerManagement />;
      case 'schedules':
        return <ScheduleGeneration />;
      case 'settings':
        return (
          <div className="container py-8">
            <div className="max-w-4xl mx-auto text-center">
              <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
              <p className="text-gray-600 mb-8">
                This feature will be available in Step 6: Export, Sharing & Polish
              </p>
              <div className="card bg-yellow-50 border-yellow-200">
                <p className="text-yellow-800">
                  ⏳ Coming soon - store hours configuration, export settings, and more
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <main className="container py-8">
            <div className="max-w-4xl mx-auto">
              {/* Welcome Section */}
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to Oakberry TeamPlanner
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Automated weekly shift scheduling for your retail team with smart
                  Arbeitspensum tracking and weather-based staffing recommendations.
                </p>
              </div>

              {/* Feature Cards */}
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="card hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3 mb-4">
                    <Users className="w-8 h-8 text-primary-600" />
                    <h3 className="text-lg font-semibold">Worker Management</h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Manage your team with Arbeitspensum tracking, availability,
                    and holiday calendars.
                  </p>
                  <button
                    onClick={() => setCurrentPage('workers')}
                    className="btn-primary w-full"
                  >
                    Manage Workers
                  </button>
                </div>

                <div className="card hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3 mb-4">
                    <Calendar className="w-8 h-8 text-primary-600" />
                    <h3 className="text-lg font-semibold">Schedule Generation</h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Automatically generate weekly schedules with manual override
                    capabilities and drag-and-drop editing.
                  </p>
                  <button
                    onClick={() => setCurrentPage('schedules')}
                    className="btn-primary w-full"
                  >
                    Generate Schedule
                  </button>
                </div>

                <div className="card hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3 mb-4">
                    <Settings className="w-8 h-8 text-primary-600" />
                    <h3 className="text-lg font-semibold">Export & Share</h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Export professional PDFs and share schedules with your team
                    via multiple channels.
                  </p>
                  <button
                    onClick={() => setCurrentPage('settings')}
                    className="btn-primary w-full"
                  >
                    Export Schedule
                  </button>
                </div>
              </div>

              {/* Status Section */}
              <div className="card bg-primary-50 border-primary-200 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <h4 className="font-semibold text-primary-900">
                      System Status: Ready
                    </h4>
                    <p className="text-sm text-primary-700">
                      Schedule generation is now available! Try creating your first weekly schedule.
                    </p>
                  </div>
                </div>
              </div>

              {/* Development Info */}
              <div className="card bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-4">Development Progress</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Step 1: Environment Setup & Project Foundation</span>
                      <p className="text-sm text-gray-600">✅ Complete - React + TypeScript + Tailwind + GitHub Pages</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Step 2: Core Data Models & Storage</span>
                      <p className="text-sm text-gray-600">✅ Complete - TypeScript interfaces, localStorage, worker CRUD</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Step 3: Schedule Generation Engine</span>
                      <p className="text-sm text-gray-600">✅ Complete - Automatic weekly schedule creation with smart assignment</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 text-xs">4</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Step 4: Schedule Editing & Management</span>
                      <p className="text-sm text-gray-600">⏳ Next - Drag-and-drop editing interface</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 text-xs">5</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Step 5: Holiday Management & Weather Integration</span>
                      <p className="text-sm text-gray-600">⏳ Upcoming - Holiday calendar and weather API</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 text-xs">6</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Step 6: Export, Sharing & Polish</span>
                      <p className="text-sm text-gray-600">⏳ Upcoming - PDF generation and final polish</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Calendar className="w-8 h-8 text-primary-600" />
              <h1 className="text-xl font-bold text-gray-900">
                Oakberry TeamPlanner
              </h1>
            </div>
            <div className="text-sm text-gray-600">
              v1.0 - Zurich
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentPage('home')}
              className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                currentPage === 'home'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setCurrentPage('workers')}
              className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                currentPage === 'workers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Workers</span>
            </button>
            <button
              onClick={() => setCurrentPage('schedules')}
              className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                currentPage === 'schedules'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Schedules</span>
            </button>
            <button
              onClick={() => setCurrentPage('settings')}
              className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                currentPage === 'settings'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      {renderPage()}
    </div>
  );
}

export default App;