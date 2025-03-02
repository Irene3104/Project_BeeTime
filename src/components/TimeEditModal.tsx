import React, { useState, useEffect } from 'react';

interface TimeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (time: string) => Promise<void>;
  fieldName: string;
  recordId: number;
}

export const TimeEditModal: React.FC<TimeEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  fieldName,
  recordId
}) => {
  const [time, setTime] = useState('');
  const [error, setError] = useState<string>('');

  const formatTimeInput = (input: string): string => {
    const numbers = input.replace(/[^0-9]/g, '');
    if (numbers.length <= 2) {
      return numbers;
    }
    const hours = numbers.slice(0, 2);
    const minutes = numbers.slice(2, 4);
    return `${hours}:${minutes}`;
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    if (rawValue.length <= 4) {
      const formatted = formatTimeInput(rawValue);
      setTime(formatted);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const timeValue = time.includes(':') ? time : formatTimeInput(time);
    const [hours, minutes] = timeValue.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes) || hours >= 24 || minutes >= 60) {
      setError('Please enter a valid time (00-23:00-59)');
      return;
    }

    try {
      await onSave(timeValue);
      setTime('');
      onClose();
    } catch (err) {
      setError('Failed to save time. Please try again.');
      console.error('Failed to save time:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTime('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[90%] max-w-sm">
        <h2 className="text-2xl font-bold mb-4">Edit Time</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-lg mb-2">
              {fieldName}
            </label>
            <input
              type="text"
              value={time}
              onChange={handleTimeChange}
              placeholder="HH:mm"
              className="w-full px-4 py-3 text-lg border rounded-lg focus:outline-none focus:border-[#B17F4A]"
              maxLength={5}
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-lg text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-lg bg-[#B17F4A] text-white rounded-lg hover:bg-[#8E6A3D]"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 