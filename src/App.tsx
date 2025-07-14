// import React from 'react';
import { Calendar, Users, Settings } from 'lucide-react';

function App() {
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

      {/* Main Content */}
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
              <p className="text-gray-600">
                Manage your team with Arbeitspensum tracking, availability,
                and holiday calendars.
              </p>
              <div className="mt-4">
                <button className="btn-primary">
                  Manage Workers
                </button>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <Calendar className="w-8 h-8 text-primary-600" />
                <h3 className="text-lg font-semibold">Schedule Generation</h3>
              </div>
              <p className="text-gray-600">
                Automatically generate weekly schedules with manual override
                capabilities and drag-and-drop editing.
              </p>
              <div className="mt-4">
                <button className="btn-primary">
                  Generate Schedule
                </button>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <Settings className="w-8 h-8 text-primary-600" />
                <h3 className="text-lg font-semibold">Export & Share</h3>
              </div>
              <p className="text-gray-600">
                Export professional PDFs and share schedules with your team
                via multiple channels.
              </p>
              <div className="mt-4">
                <button className="btn-primary">
                  Export Schedule
                </button>
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="card bg-primary-50 border-primary-200">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <h4 className="font-semibold text-primary-900">
                  System Status: Ready
                </h4>
                <p className="text-sm text-primary-700">
                  Environment setup complete. Ready to start building your schedules!
                </p>
              </div>
            </div>
          </div>

          {/* Development Info */}
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Development Progress</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>✅ Step 1: Environment Setup & Project Foundation</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                <span>⏳ Step 2: Core Data Models & Storage</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                <span>⏳ Step 3: Schedule Generation Engine</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                <span>⏳ Step 4: Schedule Editing & Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                <span>⏳ Step 5: Holiday Management & Weather Integration</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                <span>⏳ Step 6: Export, Sharing & Polish</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;