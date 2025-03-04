import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Loading data..." }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-t-[#FDCF17] border-b-[#FDCF17] border-l-transparent border-r-transparent rounded-full animate-spin mb-4 mx-auto"></div>
        <p className="text-gray-700 font-semibold">{message}</p>
      </div>
    </div>
  );
}; 