import React, { useState } from 'react';
import { Location } from '../types';

interface AddEmployeeModalProps {
  onClose: () => void;
  onSubmit: (employeeData: any) => void;
  locations: Location[];
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ onClose, onSubmit, locations }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    title: '',
    locationId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 필드 검증
    if (!formData.name || !formData.email || !formData.locationId) {
      alert('Please fill in all required fields');
      return;
    }

    // 부모 컴포넌트의 handleAddEmployee 호출
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg w-[500px]">
        <h2 className="text-xl font-fredoka mb-6">Add New Employee</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-montserrat">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-2 font-montserrat">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-2 font-montserrat">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-2 font-montserrat">Location</label>
              <select
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              >
                <option value="">Select Location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.branch ? `- ${loc.branch}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 font-montserrat"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-yellow-400 text-white rounded font-montserrat"
            >
              Add Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 