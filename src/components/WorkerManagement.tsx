// Worker Management Component
// Location: src/components/WorkerManagement.tsx

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Phone, Mail, Users } from 'lucide-react';
import type { Worker, WorkerFormData, DayOfWeek, ValidationError } from '../types';
import { workerService } from '../services/workerService';

const DAYS_OF_WEEK: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const WorkerManagement: React.FC = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState<WorkerFormData>({
    name: '',
    phone: '',
    email: '',
    workPercentage: 100,
    availableDays: [],
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load workers on component mount
  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = () => {
    const allWorkers = workerService.getAllWorkers();
    setWorkers(allWorkers);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      workPercentage: 100,
      availableDays: [],
    });
    setErrors([]);
    setEditingWorker(null);
    setShowForm(false);
  };

  const handleAddWorker = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditWorker = (worker: Worker) => {
    setFormData({
      name: worker.name,
      phone: worker.phone,
      email: worker.email || '',
      workPercentage: worker.workPercentage,
      availableDays: [...worker.availableDays],
    });
    setEditingWorker(worker);
    setErrors([]);
    setShowForm(true);
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (!window.confirm('Are you sure you want to delete this worker?')) {
      return;
    }

    const result = workerService.deleteWorker(workerId);
    if (result.success) {
      loadWorkers();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      let result;

      if (editingWorker) {
        result = workerService.updateWorker(editingWorker.id, formData);
      } else {
        result = workerService.createWorker(formData);
      }

      if (result.success) {
        loadWorkers();
        resetForm();
      } else {
        setErrors(result.errors || []);
      }
    } catch (error) {
      setErrors([{ field: 'general', message: 'An unexpected error occurred' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDayToggle = (day: DayOfWeek) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }));
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return errors.find(e => e.field === fieldName)?.message;
  };

  const getWorkerStats = () => {
    return workerService.getWorkerStats();
  };

  const stats = getWorkerStats();

  return (
    <div className="container py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Worker Management</h1>
            <p className="text-gray-600">Manage your team and their Arbeitspensum</p>
          </div>
          <button
            onClick={handleAddWorker}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Worker</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-primary-600" />
              <div>
                <p className="text-sm text-gray-600">Total Workers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-600">%</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg. Arbeitspensum</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageWorkPercentage}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Worker Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {editingWorker ? 'Edit Worker' : 'Add New Worker'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* General Error */}
                  {getFieldError('general') && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-sm text-red-600">{getFieldError('general')}</p>
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        getFieldError('name') ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter worker name"
                    />
                    {getFieldError('name') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('name')}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        getFieldError('phone') ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter phone number"
                    />
                    {getFieldError('phone') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('phone')}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        getFieldError('email') ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter email address (optional)"
                    />
                    {getFieldError('email') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
                    )}
                  </div>

                  {/* Work Percentage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Arbeitspensum (%) *
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={formData.workPercentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, workPercentage: parseInt(e.target.value) || 0 }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        getFieldError('workPercentage') ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="100"
                    />
                    {getFieldError('workPercentage') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('workPercentage')}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Target hours per week: {Math.round((formData.workPercentage / 100) * 40)}
                    </p>
                  </div>

                  {/* Available Days */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Days *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {DAYS_OF_WEEK.map(({ key, label }) => (
                        <label key={key} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.availableDays.includes(key)}
                            onChange={() => handleDayToggle(key)}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                    {getFieldError('availableDays') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('availableDays')}</p>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary flex items-center space-x-2"
                    >
                      {isSubmitting && <div className="spinner w-4 h-4"></div>}
                      <span>{editingWorker ? 'Update Worker' : 'Add Worker'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Workers List */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
            <span className="text-sm text-gray-500">
              {workers.filter(w => w.isActive).length} active workers
            </span>
          </div>

          {workers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workers yet</h3>
              <p className="text-gray-600 mb-4">
                Get started by adding your first team member.
              </p>
              <button onClick={handleAddWorker} className="btn-primary">
                Add First Worker
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Arbeitspensum</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Available Days</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((worker) => (
                    <tr key={worker.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{worker.name}</div>
                        <div className="text-sm text-gray-500">
                          Target: {Math.round((worker.workPercentage / 100) * 40)}h/week
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            <span>{worker.phone}</span>
                          </div>
                          {worker.email && (
                            <div className="flex items-center space-x-1 text-sm text-gray-600">
                              <Mail className="w-3 h-3" />
                              <span>{worker.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          {worker.workPercentage}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600">
                          {worker.availableDays.length} days
                          <div className="flex flex-wrap gap-1 mt-1">
                            {worker.availableDays.slice(0, 3).map(day => (
                              <span key={day} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {day.slice(0, 3)}
                              </span>
                            ))}
                            {worker.availableDays.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{worker.availableDays.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          worker.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {worker.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditWorker(worker)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit worker"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteWorker(worker.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete worker"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerManagement;