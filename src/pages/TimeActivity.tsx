import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/constants';
import { format, subDays, addDays } from 'date-fns';
import { Layout } from '../components/Layout';
import { TimeActivityTable } from '../components/TimeActivityTable';
import BeeTimeLogo from '../assets/logo_bee3.png';



interface TimeRecord {
  id: number;
  date: Date;
  checkIn: string | null;
  breakIn1: string | null;
  breakOut1: string | null;
  breakIn2: string | null;
  breakOut2: string | null;
  breakIn3: string | null;
  breakOut3: string | null;
  checkOut: string | null;
  workingHours: number | null;
  breakMinutes: number | null;
}

export const TimeActivity: React.FC = () => {
  const navigate = useNavigate();
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
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
    const dates: TimeRecord[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push({
        id: 0,  // 실제 데이터가 매칭될 때 덮어써질 것임
        date: addDays(baseDate, i),
        checkIn: null,
        breakIn1: null,
        breakOut1: null,
        breakIn2: null,
        breakOut2: null,
        breakIn3: null,
        breakOut3: null,
        checkOut: null,
        workingHours: null,
        breakMinutes: null
      });
    }
    return dates;
  };

  // 근무 기록 조회 (DB 구조에 맞게 수정)
  const fetchTimeRecords = async (baseDate: Date) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }
      
      // 날짜 범위 설정 (현재 날짜부터 7일)
      const startDate = format(baseDate, 'yyyy-MM-dd');
      const endDate = format(addDays(baseDate, 6), 'yyyy-MM-dd');
      
      // timeRecord 엔드포인트로 변경
      const url = `${API_URL}/timeRecords?startDate=${startDate}&endDate=${endDate}`;
      
      console.log('🔍 API 요청 URL:', url);
      console.log('📅 요청 기간:', `${startDate} ~ ${endDate}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ API 응답 에러:', errorData);
        throw new Error(`근무 기록을 가져오는데 실패했습니다: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ 받은 데이터:', data);
      
      // 7일치 기본 날짜 생성
      const weekDates = generateWeekDates(baseDate);
      
      // 응답 데이터와 날짜 매핑
      const formattedData = weekDates.map(weekDate => {
        // 클라이언트 날짜 형식
        const formattedDate = format(new Date(weekDate.date), 'yyyy-MM-dd');
        
        // 서버 날짜 형식 변환 함수
        const convertServerDate = (serverDate: string) => {
          // dd-MM-yyyy 형식을 yyyy-MM-dd로 변환
          const parts = serverDate.split('-');
          if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          return serverDate;
        };
        
        // 서버 응답의 모든 날짜를 변환하여 비교
        const record = data.find((r: any) => {
          const convertedDate = convertServerDate(r.date);
          console.log(`비교: 서버 날짜(${r.date}) → 변환(${convertedDate}) vs 클라이언트(${formattedDate})`);
          return convertedDate === formattedDate;
        });
        
        if (record) {
          console.log(`✓ ${formattedDate} 날짜의 근무 기록 찾음:`, record);
          return {
            ...weekDate,
            id: record.id || 0,
            checkIn: record.clockInTime,
            breakIn1: record.breakStartTime1,
            breakOut1: record.breakEndTime1, 
            breakIn2: record.breakStartTime2,
            breakOut2: record.breakEndTime2,
            breakIn3: record.breakStartTime3,
            breakOut3: record.breakEndTime3,
            checkOut: record.clockOutTime,
            workingHours: record.workingHours,
            breakMinutes: record.breakMinutes
          };
        }
        
        // 데이터가 없는 경우에도 해당 날짜의 레코드 ID를 생성
        const dateStr = format(new Date(weekDate.date), 'yyyyMMdd');
        return {
          ...weekDate,
          id: parseInt(dateStr),
        };
      });

      console.log('Formatted data:', formattedData);
      setTimeRecords(formattedData);
      setLoading(false);
    } catch (err) {
      console.error('❌ 에러 발생:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다');
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchTimeRecords(currentDate);
  }, []);

  // 날짜 변경 시 데이터 다시 로드
  useEffect(() => {
    fetchTimeRecords(currentDate);
  }, [currentDate]);

  // 레코드 업데이트 핸들러 함수 추가
  const handleRecordUpdate = (updatedRecord: any) => {
    console.log('Record updated:', updatedRecord);
    
    // 기존 timeRecords 배열에서 업데이트된 레코드 찾아 교체
    setTimeRecords(prevRecords => 
      prevRecords.map(record => {
        // id가 같은 레코드를 찾아 업데이트
        if (record.id === updatedRecord.id) {
          return {
            ...record,
            id: updatedRecord.id,
            checkIn: updatedRecord.clockInTime,
            breakIn1: updatedRecord.breakStartTime1,
            breakOut1: updatedRecord.breakEndTime1,
            breakIn2: updatedRecord.breakStartTime2,
            breakOut2: updatedRecord.breakEndTime2,
            breakIn3: updatedRecord.breakStartTime3,
            breakOut3: updatedRecord.breakEndTime3,
            checkOut: updatedRecord.clockOutTime,
            workingHours: updatedRecord.workingHours,
            breakMinutes: updatedRecord.breakMinutes
          };
        }
        
        // 새 레코드인 경우 (날짜로 매칭)
        if (!updatedRecord.id && record.date && updatedRecord.date) {
          const recordDate = format(new Date(record.date), 'yyyy-MM-dd');
          const updatedDate = format(new Date(updatedRecord.date), 'yyyy-MM-dd');
          
          if (recordDate === updatedDate) {
            return {
              ...record,
              id: updatedRecord.id,
              checkIn: updatedRecord.clockInTime,
              breakIn1: updatedRecord.breakStartTime1,
              breakOut1: updatedRecord.breakEndTime1,
              breakIn2: updatedRecord.breakStartTime2,
              breakOut2: updatedRecord.breakEndTime2,
              breakIn3: updatedRecord.breakStartTime3,
              breakOut3: updatedRecord.breakEndTime3,
              checkOut: updatedRecord.clockOutTime,
              workingHours: updatedRecord.workingHours,
              breakMinutes: updatedRecord.breakMinutes
            };
          }
        }
        
        return record;
      })
    );
    
    // 데이터 변경 후 다시 불러오기
    fetchTimeRecords(currentDate);
  };

  return (
    <Layout>
      <div className="flex flex-col min-h-screen px-4 py-6">
        {/* 헤더 섹션 */}
        <div className="flex flex-col items-center justify-center mb-3">
          <img 
            src={BeeTimeLogo} 
            alt="BeeTime Logo" 
            className="w-16 h-16 mb-2"
          />
          <h1 className="text-[18pt] font-fredoka font-bold text-[#000]">Time Activity</h1>
        </div>
        
        {/* 날짜 표시 */}
        <div className="text-center  mb-4 text-[#805B3F] text-[10pt] font-medium">
          {format(currentDate, 'dd.MM.yyyy')} - {format(addDays(currentDate, 6), 'dd.MM.yyyy')}
        </div>

        {/* 테이블 섹션 */}
        {loading ? (
          <div className="text-center py-4 text-sm">
            Loading...
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-4 text-sm">
            {error}
          </div>
        ) : (
          <TimeActivityTable 
            timeRecords={timeRecords} 
            onRecordUpdate={handleRecordUpdate}
          />
        )}

        {/* 네비게이션 버튼 (테이블 아래 빈 공간) */}
        <div className="flex justify-center items-center mt-6 space-x-8">
          <button
            onClick={() => setCurrentDate(prev => subDays(prev, 7))}
            className="px-4 py-2 text-sm text-[#B08968] hover:text-[#805B3F] 
                     flex items-center justify-center"
          >
            <span className="mr-1">←</span> Previous Week
          </button>
          <button
            onClick={() => setCurrentDate(prev => addDays(prev, 7))}
            className="px-4 py-2 text-sm text-[#B08968] hover:text-[#805B3F]
                     flex items-center justify-center"
          >
            Next Week <span className="ml-1">→</span>
          </button>
        </div>
      </div>
    </Layout>
  );
};