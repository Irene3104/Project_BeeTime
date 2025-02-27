import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../../config/constants';
import { Logo } from '../../components/Logo';
import { HiMenu } from 'react-icons/hi';
import { format } from 'date-fns';

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

// 리포트 타입 정의
interface Report {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  fileName: string;
  locationId: number | null;
  locationName: string | null;
  createdAt: string;
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
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // 화면 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 인증 헤더 가져오기
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  // 대시보드 데이터 가져오기
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        console.log('[MainDashboard] 대시보드 데이터 로딩 시작');
        const response = await fetch(`${API_URL}/admin/dashboard`, {
          headers: getAuthHeaders(),
        });
        
        if (!response.ok) {
          throw new Error('대시보드 데이터를 가져오는데 실패했습니다');
        }
        
        const data = await response.json();
        console.log('[MainDashboard] 대시보드 데이터:', data);
        
        setDashboardData(data);
      } catch (err) {
        console.error('[MainDashboard] 대시보드 데이터 로딩 오류:', err);
        setError(err instanceof Error ? err.message : '데이터 로딩 중 오류가 발생했습니다');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // 리포트 목록 가져오기
  useEffect(() => {
    const fetchReports = async () => {
      try {
        console.log('[MainDashboard] 리포트 목록 가져오는 중...');
        const response = await fetch(`${API_URL}/time-records/reports`, {
          headers: getAuthHeaders(),
        });
        
        if (!response.ok) {
          throw new Error('리포트 목록을 가져오는데 실패했습니다');
        }
        
        const data = await response.json();
        console.log('[MainDashboard] 리포트 데이터:', data);
        
        setReports(data);
        
        // 모든 데이터가 로드됐음을 표시
        setIsDataLoaded(true);
      } catch (err) {
        console.error('[MainDashboard] 리포트 가져오기 오류:', err);
        setError(err instanceof Error ? err.message : '데이터 로딩 중 오류가 발생했습니다');
      }
    };
    
    fetchReports();
  }, []);

  // 리포트 다운로드 함수
  const handleReportDownload = async (reportId: number, fileName: string) => {
    try {
      console.log(`리포트 다운로드 시작: ${fileName}`);
      const response = await fetch(`${API_URL}/time-records/reports/${reportId}/download`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('리포트 다운로드에 실패했습니다');
      }
      
      // 파일 다운로드 처리
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log(`리포트 다운로드 완료: ${fileName}`);
    } catch (error) {
      console.error('리포트 다운로드 오류:', error);
      alert('리포트 다운로드에 실패했습니다.');
    }
  };

  // 로딩 중 표시
  if (isLoading && !isDataLoaded) {
    return (
      <div className="flex h-screen bg-[#FFFBF6] justify-center items-center">
        <div className="text-center">
          <p className="text-xl font-semibold font-montserrat">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 에러 표시
  if (error && !isDataLoaded) {
    return (
      <div className="flex h-screen bg-[#FFFBF6] justify-center items-center">
        <div className="text-center text-red-500">
          <p className="text-xl font-semibold font-montserrat">{error}</p>
          <button 
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded" 
            onClick={() => window.location.reload()}
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#FFFBF6] overflow-hidden">
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
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="mt-[60px] md:mt-[30px]">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* 섹션 타이틀 */}
            <div className="flex items-center gap-2 md:hidden">
              <img src={EmployeesIcon} alt="" className="w-[15px] h-[15px]" />
              <span className="font-montserrat text-[18px] font-medium">Employees</span>
            </div>

            {/* Employees & Locations 그리드 */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Employees 섹션 */}
                <div className=" rounded-lg">
                    <div className="flex items-center gap-2 mb-8 hidden md:flex">
                    <img src={EmployeesIcon} alt="" className="w-[20px] h-[17px]" />
                    <h2 className="font-montserrat text-[18px] font-semibold">Employees</h2>
                    </div>
                    <div className="flex items-center justify-center">
                    <div className="text-center bg-[#FFE605]/60 rounded-full w-[250px] h-[250px] flex flex-col justify-center">
                        <div className="text-7xl font-bold font-montserrat">{dashboardData.employeeCount}</div>
                        <div className="mt-2 font-semibold font-montserrat">Team members</div>
                    </div>
                    </div>
                </div>

                {/* Locations 섹션 */}
                <div className="" >
                    <div className="flex items-center gap-2 mb-4">
                            <img src={LocationsIcon} alt="" className="w-[20px] h-[17px]" />
                            <h2 className="font-montserrat text-[18px] font-semibold">Locations</h2>
                    </div>
                    <div className="bg-[#DDC5F9]/50 rounded-lg py-4">
                        <div className="space-y-2 p-4 max-h-[300px] overflow-y-auto">
                            {isDataLoaded && dashboardData.locations && dashboardData.locations.map((location, index) => (
                                <div key={index} className="text-[16px] text-[#333] font-montserrat p-[8px]">
                                • {location.name}
                                {location.branch && ` - ${location.branch}`}
                                </div>
                            ))}
                            {(!isDataLoaded || !dashboardData.locations || dashboardData.locations.length === 0) && (
                                <div className="text-[16px] text-gray-500 font-montserrat p-[6px]">
                                    로딩 중...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Reports 섹션 */}
            <div className="">
                <div className="flex items-center gap-2 mb-4">
                        <img src={ReportsIcon} alt="" className="w-[20px] h-[17px]" />
                        <h2 className="font-montserrat text-[18px] font-semibold">Reports</h2>
                </div>
                <div className="bg-[#C4E1FF]/70 rounded-lg p-4 md:p-8">
                    <div className="flex flex-col-reverse md:flex-row justify-between items-center">
                        <div className="space-y-4 text-gray-600 font-montserrat px-2 py-3 md:py-6 max-h-60 md:max-h-72 w-full md:w-2/3 overflow-y-auto">
                            {reports.length > 0 ? (
                              <>
                                {/* 모바일에서는 3개, 데스크탑에서는 5개 표시 */}
                                {reports.slice(0, isMobile ? 3 : 5).map((report) => (
                                  <div 
                                    key={report.id} 
                                    className="hover:text-black cursor-pointer flex items-center text-sm md:text-base mb-3"
                                    onClick={() => handleReportDownload(report.id, report.fileName)}
                                  >
                                    <span className="hover:underline truncate mr-2">
                                      {report.title}
                                    </span>
                                    <span className="text-xs whitespace-nowrap">
                                      ({format(new Date(report.startDate), 'MM/dd')} ~ 
                                      {format(new Date(report.endDate), 'MM/dd')})
                                    </span>
                                    <svg 
                                      className="w-4 h-4 ml-2 text-gray-500 flex-shrink-0" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24" 
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                                      />
                                    </svg>
                                  </div>
                                ))}
                                {reports.length > (isMobile ? 3 : 5) && (
                                  <div 
                                    className="text-blue-600 font-semibold cursor-pointer hover:underline text-sm md:text-base"
                                    onClick={() => navigate('/admin/reports')}
                                  >
                                    more...
                                  </div>
                                )}
                              </>
                            ) : (
                              <div>아직 생성된 리포트가 없습니다.</div>
                            )}
                        </div>
                        <div className="text-center md:w-1/3 p-4 md:p-8 mb-4 md:mb-0">
                            <div className="text-5xl md:text-7xl font-bold font-montserrat">{reports.length}</div>
                            <div className="mt-2 font-montserrat font-semibold text-sm md:text-base">Total Reports Generated</div>
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
