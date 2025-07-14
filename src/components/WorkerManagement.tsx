import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Phone, Mail, Users, ToggleLeft, ToggleRight, Eye, EyeOff, AlertTriangle } from 'lucide-react';

// Import the real services
import { workerService } from '../services/workerService';
import type { Worker, WorkerFormData, ValidationError, DayOfWeek } from '../types';

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
  const [showInactive, setShowInactive] = useState(false);
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
    // Use the real worker service instead of mock data
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

  // Toggle worker active status (soft delete/reactivate)
  const handleToggleWorkerStatus = async (workerId: string, currentStatus: boolean) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const message = currentStatus
      ? `Deactivate ${worker.name}? They will no longer be available for new schedules, but their data will be preserved.`
      : `Reactivate ${worker.name}? They will be available for new schedule assignments.`;

    if (!window.confirm(message)) {
      return;
    }

    // Use the real worker service
    const result = await workerService.toggleWorkerStatus(workerId);

    if (result.success) {
      // Reload workers from storage to get the updated data
      loadWorkers();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  // Permanent delete (hard delete)
  const handlePermanentDelete = async (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const message = `⚠️ PERMANENTLY DELETE ${worker.name}?\n\nThis will completely remove all their data including:\n- Personal information\n- Work history\n- Schedule assignments\n- Arbeitspensum records\n\nThis action CANNOT be undone!\n\nType "${worker.name}" to confirm:`;

    const confirmation = window.prompt(message);
    if (confirmation !== worker.name) {
      if (confirmation !== null) {
        alert('Name did not match. Deletion cancelled.');
      }
      return;
    }

    // Use the real worker service
    const result = await workerService.permanentlyDeleteWorker(workerId);

    if (result.success) {
      // Reload workers from storage to get the updated data
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
        // Update existing worker
        result = await workerService.updateWorker(editingWorker.id, formData);
      } else {
        // Create new worker
        result = await workerService.createWorker(formData);
      }

      if (result.success) {
        // Reload workers from storage to get the updated data
        loadWorkers();
        resetForm();
      } else {
        // Display validation errors
        setErrors(result.errors || []);
      }
    } catch (error) {
      console.error('Error submitting worker form:', error);
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

  // Use the real worker service for stats
  const stats = workerService.getWorkerStats();
  const filteredWorkers = showInactive ? workers : workers.filter(w => w.isActive);
  const inactiveCount = workers.filter(w => !w.isActive).length;

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
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Worker</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Workers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-600">%</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg. Arbeitspensum</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageWorkPercentage}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Explanation Card for Active/Inactive System */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs">i</span>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-2">About Active/Inactive Status</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Active workers:</strong> Available for new schedules, counted in statistics, can receive shifts</p>
                <p><strong>Inactive workers:</strong> Temporarily unavailable (vacation, leave, etc.) but data is preserved for history</p>
                <p><strong>Why keep inactive workers?</strong> Scheduling systems need historical data for Arbeitspensum tracking, audits, and potential reactivation</p>
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
                  {errors.find(e => e.field === 'general') && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-600">
                        {getFieldError('general')}
                      </p>
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
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        getFieldError('name') ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter worker name"
                      required
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
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        getFieldError('phone') ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter phone number"
                      required
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
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        getFieldError('workPercentage') ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="100"
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Target hours per week: {Math.round((formData.workPercentage / 100) * 40)}
                    </p>
                    {getFieldError('workPercentage') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('workPercentage')}</p>
                    )}
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
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                      disabled={isSubmitting}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                      <span>{editingWorker ? 'Update Worker' : 'Add Worker'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Workers List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
            <div className="flex items-center space-x-4">
              {inactiveCount > 0 && (
                <button
                  onClick={() => setShowInactive(!showInactive)}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>
                    {showInactive ? 'Hide' : 'Show'} Inactive ({inactiveCount})
                  </span>
                </button>
              )}
              <span className="text-sm text-gray-500">
                {filteredWorkers.filter(w => w.isActive).length} active workers
              </span>
            </div>
          </div>

          {filteredWorkers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workers yet</h3>
              <p className="text-gray-600 mb-4">
                Get started by adding your first team member.
              </p>
              <button onClick={handleAddWorker} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
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
                  {filteredWorkers.map((worker) => (
                    <tr key={worker.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!worker.isActive ? 'opacity-75' : ''}`}>
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
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            worker.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {worker.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditWorker(worker)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit worker"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Activate/Deactivate Toggle */}
                          <button
                            onClick={() => handleToggleWorkerStatus(worker.id, worker.isActive)}
                            className={`p-2 transition-colors ${
                              worker.isActive
                                ? 'text-green-500 hover:text-green-700'
                                : 'text-gray-400 hover:text-green-500'
                            }`}
                            title={worker.isActive ? 'Deactivate worker' : 'Reactivate worker'}
                          >
                            {worker.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>

                          {/* Permanent Delete (only for inactive workers) */}
                          {!worker.isActive && (
                            <button
                              onClick={() => handlePermanentDelete(worker.id)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Permanently delete worker (cannot be undone)"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
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