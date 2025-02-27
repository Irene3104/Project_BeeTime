import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../../config/constants';
import { Logo } from '../../components/Logo';
import { HiMenu } from 'react-icons/hi';

// 메뉴 아이콘 import
import DashboardIcon from '../../assets/admin_menu_dashboard.png';
import EmployeesIcon from '../../assets/admin_menu_employees.png';
import LocationsIcon from '../../assets/admin_menu_locations.png';
import ReportsIcon from '../../assets/admin_menu_reports.png';
import SettingsIcon from '../../assets/admin_menu_settings.png';
import LogoutIcon from '../../assets/admin_menu_logout.png';

// 대시보드 데이터 타입 정의
interface DashboardData {
    employeeCount: number;
    locations: Location[];
    reportCount: number;
  }
  
  interface Location {
    id: number;
    name: string;
    branch?: string;
  }

export const AdminDashboard = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    employeeCount: 0,
    locations: [],
    reportCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployeeCount = async () => {
      console.log('[MainDashboard] Starting to fetch employee count...');
      try {
        setIsLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        console.log('[MainDashboard] Using token:', token ? 'Token exists' : 'No token found');
        
        const response = await fetch(`${API_URL}/admin/dashboard/employee-count`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('[MainDashboard] Response status:', response.status);
        console.log('[MainDashboard] Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorData = await response.json();
          console.error('[MainDashboard] Error response:', errorData);
          throw new Error(errorData.error || 'Failed to fetch employee count');
        }

        const data = await response.json();
        console.log('[MainDashboard] Received data:', data);
        
        setDashboardData({
          employeeCount: data.employeeCount,
          locations: [],
          reportCount: 0
        });
      } catch (err: unknown) {
        console.error('[MainDashboard] Error details:', err instanceof Error ? {
          name: err.name,
          message: err.message,
          stack: err.stack
        } : 'Unknown error');
        setError('Failed to fetch employee count');
      } finally {
        setIsLoading(false);
        console.log('[MainDashboard] Fetch operation completed');
      }
    };

    fetchEmployeeCount();
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        console.log('[MainDashboard] Fetching locations...');
        
        const response = await fetch(`${API_URL}/admin/locations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch locations');
        }

        const data = await response.json();
        console.log('[MainDashboard] Raw locations response:', data);
        
        setDashboardData(prev => ({
          ...prev,
          locations: Array.isArray(data.locations) ? data.locations : []
        }));
      } catch (err: unknown) {
        console.error('[MainDashboard] Error fetching locations:', err instanceof Error ? {
          name: err.name,
          message: err.message,
          stack: err.stack
        } : 'Unknown error');
      }
    };

    fetchLocations();
  }, []);

  // 로딩 상태 처리
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // 에러 상태 처리
  if (error) {
    return <div className="flex h-screen items-center justify-center text-red-500">{error}</div>;
  }

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
              <Link to="/AdminDashboard" 
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
              <Link to="/admin/settings" 
                className="flex items-center px-6 py-6 text-gray-700 hover:bg-yellow-50">
                <img src={SettingsIcon} alt="" className="w-5 h-5" />
                <span className="font-montserrat ml-4 text-base">Settings</span>
              </Link>

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
          <Link to="/admin/settings" 
            className="flex items-center px-10 py-5 hover:bg-[#A77750]/20">
            <img src={SettingsIcon} alt="" className="w-6 h-6" />
            <span className="font-montserrat mx-3 text-[18px] font-medium">Settings</span>
          </Link>

          <div className="pt-[100px]">
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
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="mt-[60px]">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* 섹션 타이틀 */}
            <div className="flex items-center gap-2 md:hidden">
              <img src={EmployeesIcon} alt="" className="w-[15px] h-[15px]" />
              <span className="font-montserrat text-[18px] font-medium">Employees</span>
            </div>

            {/* Employees & Locations 그리드 */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Employees 섹션 */}
                <div className="bg-[#ffffff] rounded-lg">
                    <div className="flex items-center gap-2 mb-8 hidden md:flex">
                    <img src={EmployeesIcon} alt="" className="w-[20px] h-[17px]" />
                    <h2 className="font-montserrat text-[18px] font-semibold">Employees</h2>
                    </div>
                    <div className="flex items-center justify-center">
                    <div className="text-center bg-[#FFE605]/60 rounded-full w-[250px] h-[250px] flex flex-col justify-center">
                        <div className="text-7xl font-bold font-montserrat">{dashboardData.employeeCount}</div>
                        <div className="mt-2 font-montserrat">Team members</div>
                    </div>
                    </div>
                </div>

                {/* Locations 섹션 */}
                <div className="bg-[#ffffff]" >
                    <div className="flex items-center gap-2 mb-4">
                            <img src={LocationsIcon} alt="" className="w-[20px] h-[17px]" />
                            <h2 className="font-montserrat text-[18px] font-semibold">Locations</h2>
                    </div>
                    <div className="bg-[#DDC5F9]/50 rounded-lg py-4">
                        <div className="space-y-4 p-4 max-h-[300px] overflow-y-auto">
                            {dashboardData.locations.map((location, index) => (
                                <div key={index} className="text-[16px] text-[#333] font-semibold font-montserrat p-[8px]">
                                • {location.name}
                                {location.branch && ` - ${location.branch}`}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Reports 섹션 */}
            <div className="bg-[#ffffff]">
                <div className="flex items-center gap-2 mb-4">
                        <img src={ReportsIcon} alt="" className="w-[20px] h-[17px]" />
                        <h2 className="font-montserrat text-[18px] font-semibold">Reports</h2>
                </div>
                <div className="bg-[#C4E1FF]/70 rounded-lg p-8">
                    <div className="flex flex-col md:flex-row justify-between">
                        <div className="space-y-4 text-gray-600 font-montserrat px-2 py-6">
                            <div>Report 2025/01/01 ~ 2025/01/14.xls</div>
                            <div>Report 2025/01/01 ~ 2025/01/14.xls</div>
                            <div>Report 2025/01/01 ~ 2025/01/14.xls</div>
                            <div>Report 2025/01/01 ~ 2025/01/14.xls</div>
                        </div>
                        <div className="text-center rounded-lg p-8 mt-[20px]">
                            <div className="text-7xl font-bold  font-montserrat">{dashboardData.reportCount}</div>
                            <div className="mt-2 font-montserrat font-semibold">Total Reports Generated</div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
