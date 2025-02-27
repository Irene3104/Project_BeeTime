import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiMenu } from 'react-icons/hi';
import { Logo } from './Logo';

// 메뉴 아이콘 import
import DashboardIcon from '../assets/admin_menu_dashboard.png';
import EmployeesIcon from '../assets/admin_menu_employees.png';
import LocationsIcon from '../assets/admin_menu_locations.png';
import ReportsIcon from '../assets/admin_menu_reports.png';
import SettingsIcon from '../assets/admin_menu_settings.png';
import LogoutIcon from '../assets/admin_menu_logout.png';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#ffffff]">
      {/* 모바일 헤더 */}
      <div className="md:hidden w-full fixed top-0 z-50">
        <div className="flex bg-[#FDCF17]/80 items-center justify-between h-[70px] p-5">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8" />
            <span className="text-lg font-fredoka">Bee Time Admin</span>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="">
            <HiMenu size={24} />
          </button>
        </div>

        {/* 모바일 메뉴 */}
        {isMenuOpen && (
          <div className="fixed top-[71px] right-0 h-screen w-screen bg-[#FFFBF6] shadow-lg z-50">
            <nav className="py-6 space-y-2">
              <Link to="/admin/MainDashboard" 
                className="flex items-center px-6 py-6 text-gray-700 hover:bg-yellow-50">
                <img src={DashboardIcon} alt="" className="w-5 h-5" />
                <span className="font-montserrat ml-4 text-base">Dashboard</span>
              </Link>
              <Link to="/admin/employees" 
                className="flex items-center px-6 py-6 text-gray-700 hover:bg-yellow-50">
                <img src={EmployeesIcon} alt="" className="w-5 h-5" />
                <span className="font-montserrat ml-4 text-base">Employees</span>
              </Link>
              <Link to="/admin/locations" 
                className="flex items-center px-6 py-6 text-gray-700 hover:bg-yellow-50">
                <img src={LocationsIcon} alt="" className="w-5 h-5" />
                <span className="font-montserrat ml-4 text-base">Locations</span>
              </Link>
              <Link to="/admin/reports" 
                className="flex items-center px-6 py-6 text-gray-700 hover:bg-yellow-50">
                <img src={ReportsIcon} alt="" className="w-5 h-5" />
                <span className="font-montserrat ml-4 text-base">Reports</span>
              </Link>
              {/* <Link to="/admin/settings" 
                className="flex items-center px-6 py-6 text-gray-700 hover:bg-yellow-50">
                <img src={SettingsIcon} alt="" className="w-5 h-5" />
                <span className="font-montserrat ml-4 text-base">Settings</span>
              </Link> */}

              <div className="pt-[100px]">
            <button
              onClick={handleLogout}
              className="flex items-center px-6 py-8 text-gray-700 hover:bg-yellow-50"
            >
              <img src={LogoutIcon} alt="logout" className="w-5 h-5" />
              <span className="font-montserrat ml-4 text-base text-[#F31616]">Logout</span>
            </button>
          </div>
            </nav>
          </div>
        )}
      </div>

      {/* 데스크탑 사이드바 */}
      <div className="hidden md:block w-64 bg-[#FFFBF6] shadow-lg">
        {/* 로고 섹션 */}
        <div className="mt-[40px] p-[20px] flex items-center gap-3">
          <Logo className="w-[65px] h-[60px]" />
          <span className="text-[25px] font-fredoka">Bee Time</span>
        </div>

        {/* 네비게이션 */}
        <nav className="mt-8 space-y-6">
          <Link to="/admin/MainDashboard" 
            className="flex items-center px-10 py-5  hover:bg-[#A77750]/20">
            <img src={DashboardIcon} alt="" className="w-[20px] h-[20px]" />
            <span className="font-montserrat mx-3 text-[18px] font-medium ">Dashboard</span>
          </Link>
          <Link to="/admin/employees" 
            className="flex items-center px-10 py-5  hover:bg-[#A77750]/20">
            <img src={EmployeesIcon} alt="" className="w-[20px] h-[16px]" />
            <span className="font-montserrat mx-3 text-[18px] font-medium">Employees</span>
          </Link>
          <Link to="/admin/locations" 
            className="flex items-center px-10 py-5  hover:bg-[#A77750]/20">
            <img src={LocationsIcon} alt="" className="w-[20px] h-[20px]" />
            <span className="font-montserrat mx-3 text-[18px] font-medium">Locations</span>
          </Link>
          <Link to="/admin/reports" 
            className="flex items-center px-10 py-5 hover:bg-[#A77750]/20">
            <img src={ReportsIcon} alt="" className="w-[20px] h-[20px]" />
            <span className="font-montserrat mx-3 text-[18px] font-medium">Reports</span>
          </Link>
          {/* <Link to="/admin/settings" 
            className="flex items-center px-10 py-5 hover:bg-[#A77750]/20">
            <img src={SettingsIcon} alt="" className="w-6 h-6" />
            <span className="font-montserrat mx-3 text-[18px] font-medium">Settings</span>
          </Link> */}

          <div className="pt-[150px]">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-10 py-5 hover:bg-[#A77750]/20"
            >
              <img src={LogoutIcon} alt="logout" className="w-5 h-5" />
              <span className="font-montserrat mx-3 text-[18px] text-[#F31616] font-medium">Logout</span>
            </button>
          </div>
        </nav>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        <div className="mt-[70px] md:mt-0 p-4 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
};