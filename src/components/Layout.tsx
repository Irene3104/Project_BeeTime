import React, { ReactNode } from 'react';
import { SideMenu } from './SideMenu';
import MenuIcon from '../assets/btn_icon_menu.png';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#FFFBF6] relative">
      {/* 햄버거 메뉴 버튼 */}
      <button 
        className={`absolute top-6 right-6 z-50 ${isMenuOpen ? 'hidden' : ''}`}
        onClick={() => setIsMenuOpen(true)}
      >
        <img src={MenuIcon} alt="menu" className="w-12 h-12" />
      </button>

      {/* 사이드 메뉴 */}
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* 메인 컨텐츠 */}
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#F7E3CA] pt-20">
        {title && (
          <h1 className="text-2xl font-montserrat font-bold text-[#B17F4A] mb-6">{title}</h1>
        )}
        {children}
      </div>
    </div>
  );
};