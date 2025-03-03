import React, { useState } from 'react';
import Logo from '../assets/logo_bee3.png';
import { API_URL } from '../config/constants';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inquiryTypes = [
  { value: 'system_issue', label: 'System Issue' },
  { value: 'time_record', label: 'Ask for Time Record Modification' },
  { value: 'others', label: 'Others' }
];

export const InquiryModal: React.FC<InquiryModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [inquiryType, setInquiryType] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    
    if (!inquiryType) {
      setError('Please select an inquiry type');
      return;
    }
    
    if (!content.trim()) {
      setError('Please enter your inquiry content');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          type: inquiryType,
          content
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit inquiry');
      }
      
      // Reset form
      setTitle('');
      setInquiryType('');
      setContent('');
      
      // Close modal
      onClose();
      
      // Show success message
      alert('Your inquiry has been submitted successfully!');
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      setError('Failed to submit inquiry. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6 relative border-2 border-blue-400">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        {/* Header */}
        <div className="flex items-center mb-6">
          <img src={Logo} alt="Bee Time Logo" className="h-10 w-10 mr-3" />
          <h2 className="text-xl font-bold">Submit Inquiry</h2>
        </div>
        
        {error && (
          <div className="mb-4 text-sm text-red-500">
            {error}
          </div>
        )}
        
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
              Title:
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Enter inquiry title"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="inquiryType">
              Inquiry Type:
            </label>
            <select
              id="inquiryType"
              value={inquiryType}
              onChange={(e) => setInquiryType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              style={{ 
                backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 9l6 6 6-6\"/></svg>')",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.5rem center",
                backgroundSize: "1.5em 1.5em"
              }}
            >
              <option value="" disabled>Select Inquiry Type</option>
              {inquiryTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="content">
              Content:
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Describe your inquiry in detail..."
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
          >
            {isSubmitting ? 'Submitting...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}; 