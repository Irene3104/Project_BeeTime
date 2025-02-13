import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TimeActivityTable } from '../components/TimeActivityTable';
import { TimeActivityRow } from '../types';
import { API_URL } from '../config/constants';
import { format, subDays, addDays } from 'date-fns';
import { Menu } from 'lucide-react';
import Logo from '../assets/logo_bee3.png';
import { Layout } from '../components/Layout';

// 메뉴 관련 아이콘들 import
import HomeIcon from '../assets/home.png';
import UserIcon from '../assets/user.png';
import TimeIcon from '../assets/time.png';
import LogoutIcon from '../assets/logout.png';
import CancelIcon from '../assets/btn_icon_cancel.png';
import HomeIconHover from '../assets/home_hover.png';
import UserIconHover from '../assets/user_hover.png';
import TimeIconHover from '../assets/time_hover.png';


export const TimeActivity: React.FC = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [timeRecords, setTimeRecords] = useState<TimeActivityRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());

    // 로그아웃 핸들러
    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        navigate('/login');
      };

  // 7일치 날짜 데이터 생성
  const generateWeekDates = (baseDate: Date) => {
    const dates: TimeActivityRow[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push({
        date: subDays(baseDate, 3 - i),
        checkIn: null,
        breakIn: null,
        breakOut: null,
        checkOut: null
      });
    }
    return dates;
  };

  // 근무 기록 조회
  const fetchTimeRecords = async (baseDate: Date) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/time-entries`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch time records');
      }

      const data = await response.json();
      const weekDates = generateWeekDates(baseDate);
      
      // 데이터 포맷팅
      const formattedData = weekDates.map(weekDate => {
        const record = data.find((r: any) => 
          format(new Date(r.date), 'dd/MM') === format(weekDate.date, 'dd/MM')
        );
        
        if (record) {
          return {
            ...weekDate,
            checkIn: record.clockIn ? format(new Date(record.clockIn), 'HH:mm') : null,
            breakIn: record.breaks?.[0]?.startTime ? format(new Date(record.breaks[0].startTime), 'HH:mm') : null,
            breakOut: record.breaks?.[0]?.endTime ? format(new Date(record.breaks[0].endTime), 'HH:mm') : null,
            checkOut: record.clockOut ? format(new Date(record.clockOut), 'HH:mm') : null
          };
        }
        return weekDate;
      });

      setTimeRecords(formattedData);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeRecords(currentDate);
  }, [currentDate]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <Layout>
    <div className="p-4 bg-[#FFFBF6] min-h-screen">
      {/* 메뉴 아이콘 */}
      <div className=" mt-2 absolute top-4 right-6">
        <Menu 
          className="h-8 w-8 cursor-pointer text-[#B17F4A]" 
          onClick={() => setIsMenuOpen(true)}
        />
      </div>

      {/* 메인 컨텐츠 컨테이너 */}
      <div className="mt-[20pt] pt-[20pt] pb-[20pt]">
        {/* 로고 */}
        <div className="flex justify-center mb-2">
          <img src={Logo} alt="Bee Time Logo" className="h-16 w-16" />
        </div>

        {/* 제목 */}
        <h1 className="text-[18pt] font-bold mb-2 font-fredoka text-center">Time Activity</h1>

        {/* 테이블 */}
        <div className="mb-4">
          <TimeActivityTable data={timeRecords} />
        </div>

        {/* 네비게이션 버튼 */}
        <div className="flex justify-between mt-4 font-montserrat text-[#B17F4A]">
          <button 
            className="flex items-center"
            onClick={() => {
              const newDate = subDays(currentDate, 7);
              setCurrentDate(newDate);
            }}
          >
            ◀ Previous
          </button>
          <button 
            className="flex items-center"
            onClick={() => {
              const newDate = addDays(currentDate, 7);
              setCurrentDate(newDate);
            }}
          >
            Next ▶
          </button>
        </div>
      </div>

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

          {/* 메뉴 컨테이너 */}
          <div className="flex flex-col h-full pt-40 px-0">
            {/* 상단 메뉴 아이템들 */}
            <div className="space-y-5">
              <div 
                className="flex items-center p-8 hover:bg-[#FFE26C] group cursor-pointer px-20"
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

            {/* 로그아웃 버튼 */}
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
    </div>
    </Layout>
  );
};