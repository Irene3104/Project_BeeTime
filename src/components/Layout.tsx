import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-screen bg-[#FFFBF6] w-full max-w-[500px] mx-auto overflow-hidden">
      <div className="h-full p-4 relative">
        {children}
      </div>
    </div>
  );
}; 