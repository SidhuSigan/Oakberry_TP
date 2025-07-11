import React, { useState } from 'react';
import { Worker } from '../types';
import { Plus, Edit2, Trash2, Calendar, Phone, Mail, X } from 'lucide-react';
import { formatPercentage } from '../utils/arbeitspensumUtils';

interface WorkerManagementProps {
  workers: Worker[];
  onAddWorker: (worker: Worker) => void;
  onUpdateWorker: (worker: Worker) => void;
  onDeleteWorker: (workerId: string) => void;
}

const WorkerManagement: React.FC<WorkerManagementProps> = ({
  workers,
  onAddWorker,
  onUpdateWorker,
  onDeleteWorker,
}) => {
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    workPercentage: 100,
    availableDays: [true, true, true, true, true, true, true], // Mon-Sun
  });
  const [selectedHolidays, setSelectedHolidays] = useState<Date[]>([]);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      workPercentage: 100,
      availableDays: [true, true, true, true, true, true, true],
    });
    setSelectedHolidays([]);
    setIsAddingWorker(false);
    setEditingWorker(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      alert('Please fill in at least name and phone number');
      return;
    }

    if (editingWorker) {
      const updatedWorker: Worker = {
        ...editingWorker,
        ...formData,
        holidays: selectedHolidays,
      };
      onUpdateWorker(updatedWorker);
    } else {
      const newWorker: Worker = {
        id: `worker-${Date.now()}`,
        ...formData,
        holidays: selectedHolidays,
        createdAt: new Date(),
        isActive: true,
      };
      onAddWorker(newWorker);
    }

    resetForm();
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      phone: worker.phone,
      email: worker.email,
      workPercentage: worker.workPercentage,
      availableDays: worker.availableDays,
    });
    setSelectedHolidays(worker.holidays);
    setIsAddingWorker(true);
  };

  const handleDelete = (workerId: string) => {
    if (confirm('Are you sure you want to delete this worker?')) {
      onDeleteWorker(workerId);
    }
  };

  const toggleAvailableDay = (dayIndex: number) => {
    const newAvailableDays = [...formData.availableDays];
    newAvailableDays[dayIndex] = !newAvailableDays[dayIndex];
    setFormData({ ...formData, availableDays: newAvailableDays });
  };

  const activeWorkers = workers.filter(w => w.isActive);
  const inactiveWorkers = workers.filter(w => !w.isActive);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Workers</h2>
        <button
          onClick={() => setIsAddingWorker(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          <span>Add Worker</span>
        </button>
      </div>

      {/* Active Workers */}
      <div>
        <h3 className="text-lg font-medium mb-3">Active Workers ({activeWorkers.length})</h3>
        <div className="space-y-2">
          {activeWorkers.map(worker => (
            <div
              key={worker.id}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{worker.name}</h4>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-1" />
                      <span>{worker.phone}</span>
                    </div>
                    {worker.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-1" />
                        <span>{worker.email}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>Arbeitspensum: {formatPercentage(worker.workPercentage)}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Available days:</p>
                    <div className="flex space-x-1 mt-1">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                        <span
                          key={index}
                          className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
                            worker.availableDays[index]
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(worker)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(worker.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Worker Modal */}
      {isAddingWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingWorker ? 'Edit Worker' : 'Add New Worker'}
              </h3>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Percentage (Arbeitspensum)
                </label>
                <select
                  value={formData.workPercentage}
                  onChange={(e) => setFormData({ ...formData, workPercentage: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={20}>20%</option>
                  <option value={40}>40%</option>
                  <option value={50}>50%</option>
                  <option value={60}>60%</option>
                  <option value={80}>80%</option>
                  <option value={100}>100%</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Days
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleAvailableDay(index)}
                      className={`py-2 px-1 text-xs rounded ${
                        formData.availableDays[index]
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                >
                  {editingWorker ? 'Update Worker' : 'Add Worker'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerManagement;