import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BeeIcon from '../assets/logo_bee2.svg';
import MenuIcon from '../assets/btn_icon_menu.png';
import HomeIcon from '../assets/home.png';
import UserIcon from '../assets/user.png';
import TimeIcon from '../assets/time.png';
import LogoutIcon from '../assets/logout.png';
import CancelIcon from '../assets/btn_icon_cancel.png';
import HomeIconHover from '../assets/home_hover.png';
import UserIconHover from '../assets/user_hover.png';
import TimeIconHover from '../assets/time_hover.png';
import CircleBg from '../assets/circle_bg.svg';
import { getCurrentNSWTime, formatNSWTime, formatNSWDate } from '../utils/dateTime';
import { QRScanner } from '../components/QRScanner';

export const Dashboard = () => {
  // Dashboard component for time tracking
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(getCurrentNSWTime());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showScanner, setShowScanner] = useState<{ show: boolean; type: string | null }>({ show: false, type: null });
  const [loading, setLoading] = useState<string | null>(null);

  // 시간 업데이트 (1초마다)
  useEffect(() => {
      const timer = setInterval(() => {
          setCurrentTime(getCurrentNSWTime());
      }, 1000);
      return () => clearInterval(timer);
  }, []);

  // NSW 시간대로 변환
  const nswTime = formatNSWTime(currentTime);
  const nswDate = formatNSWDate(currentTime);

  const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      navigate('/login');
  };

  const handleScanClick = (type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut') => {
    setLoading(type);
    setShowScanner({ show: true, type });
  };

  return (
      <div className="min-h-screen bg-[#FFFBF6] relative">
          {/* 햄버거 메뉴 버튼 */}
          <button 
              className={`absolute top-6 right-6 z-50 ${isMenuOpen ? 'hidden' : ''}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
              <img src={MenuIcon} alt="menu" className="w-12 h-12" />
          </button>

          {/* 사이드 메뉴 */}
          {isMenuOpen && (
              <div className="fixed top-0 right-0 h-full w-[375px] bg-[#A77750] shadow-lg z-40">
                  {/* 닫기 버튼 */}
                  <button 
                      className="absolute top-6 right-6 z-50"
                      onClick={() => setIsMenuOpen(false)}
                  >
                      <img src={CancelIcon} alt="close" className="w-8 h-8" />
                  </button>

                  {/* 메뉴 컨테이너 - flex-col과 h-full을 사용하여 수직 정렬 제어 */}
                  <div className="flex flex-col h-full pt-40 px-0">
                      {/* 상단 메뉴 아이템들 */}
                      <div className="space-y-5">
                          <div 
                              className="flex items-center p-8 hover:bg-[#FFE26C] group cursor-pointer  px-20"
                              onClick={() => navigate('/dashboard')}
                          >
                              <img src={HomeIcon} alt="home" className="w-6 h-6 mr-4 group-hover:hidden" />
                              <img src={HomeIconHover} alt="home" className="w-6 h-6 mr-4 hidden group-hover:block" />
                              <span className="text-white group-hover:text-black font-montserrat font-medium text-lg">Home</span>
                          </div>
                          <div 
                              className="flex items-center p-8 hover:bg-[#FFE26C] group cursor-pointer px-20"
                              onClick={() => navigate('/account')}
                          >
                              <img src={UserIcon} alt="account" className="w-6 h-6 mr-4 group-hover:hidden" />
                              <img src={UserIconHover} alt="account" className="w-6 h-6 mr-4 hidden group-hover:block" />
                              <span className="text-white group-hover:text-black font-montserrat font-medium text-lg">Account</span>
                          </div>
                          <div 
                              className="flex items-center p-8 hover:bg-[#FFE26C] group cursor-pointer px-20"
                              onClick={() => navigate('/time-activity')}
                          >
                              <img src={TimeIcon} alt="time" className="w-6 h-6 mr-4 group-hover:hidden" />
                              <img src={TimeIconHover} alt="time" className="w-6 h-6 mr-4 hidden group-hover:block" />
                              <span className="text-white group-hover:text-black font-montserrat font-medium text-lg">Time Activity</span>
                          </div>
                      </div>

                      {/* 로그아웃 버튼 - mt-auto로 하단에 고정 */}
                      <div 
                          className="mt-auto mb-10 flex items-center p-4 cursor-pointer rounded-2xl px-20"
                          onClick={handleLogout}
                      >
                          <img src={LogoutIcon} alt="logout" className="w-6 h-6 mr-4" />
                          <span className="text-[#FFE26C] font-montserrat font-medium text-lg">Logout</span>
                      </div>
                  </div>
              </div>
          )}

          {/* 메인 컨텐츠 */}
          <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#F7E3CA] pt-20">
              {/* 시계 영역 - 원형 배경 추가 */}
              <div className="relative text-center m-10">
                  {/* 배경 원 - 크기 조정 */}
                  <img 
                      src={CircleBg} 
                      alt="background" 
                      className="w-[250px] h-[250px] object-contain"
                  />
                  {/* 꿀벌 로고 아이콘 */}
                  <img 
                      src={BeeIcon} 
                      alt="bee" 
                      className="absolute w-30 h-30 left-1/2 -translate-x-1/2 -top-12"
                  />
                  {/* 시계 컨텐츠 */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full">
                      <h2 className="text-[#B17F4A] text-xl mb-8 font-montserrat">Current Time</h2>
                      <div className="text-6xl font-montserrat mb-4">{nswTime}</div>
                      <div className="text-xl font-montserrat">{nswDate}</div>
                  </div>
              </div>

              {/* 버튼 그리드 */}
              <div className="grid grid-cols-2 gap-4 w-full max-w-[320px] mx-auto px-4">
                  <button 
                    onClick={() => handleScanClick('clockIn')}
                    disabled={loading === 'clockIn'}
                    className="bg-[#FDCF17] text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full"
                  >
                    <span className="text-[14pt]">Clock</span>
                    <span className="text-[14pt] -mt-2">In</span>
                  </button>

                  <button 
                    onClick={() => handleScanClick('breakStart')}
                    disabled={loading === 'breakStart'}
                    className="bg-[#A07907] text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full"
                  >
                    <span className="text-[14pt]">Break</span>
                    <span className="text-[14pt] -mt-2">Start</span>
                  </button>

                  <button 
                    onClick={() => handleScanClick('breakEnd')}
                    disabled={loading === 'breakEnd'}
                    className="bg-[#A07907] text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full"
                  >
                    <span className="text-[14pt]">Break</span>
                    <span className="text-[14pt] -mt-2">End</span>
                  </button>

                  <button 
                    onClick={() => handleScanClick('clockOut')}
                    disabled={loading === 'clockOut'}
                    className="bg-[#FDCF17] text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full"
                  >
                    <span className="text-[14pt]">Clock</span>
                    <span className="text-[14pt] -mt-2">Out</span>
                  </button>
              </div>
          </div>

          {showScanner.show && (
            <QRScanner
              type={showScanner.type!}
              onClose={() => setShowScanner({ show: false, type: null })}
              onScan={() => {
                setShowScanner({ show: false, type: null });
                // Optionally refresh or show success message
              }}
            />
          )}
      </div>
  );
};