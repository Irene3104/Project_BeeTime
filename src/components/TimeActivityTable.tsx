import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { API_URL } from '../config/constants';
import './TimeActivityTable.css';

interface TimeRecord {
  id: number;
  date: Date | string;
  checkIn: string | null;
  breakIn1: string | null;
  breakOut1: string | null;
  breakIn2: string | null;
  breakOut2: string | null;
  breakIn3: string | null;
  breakOut3: string | null;
  checkOut: string | null;
  workingHours: string | null;
  breakMinutes: number | null;
}

interface TimeActivityTableProps {
  timeRecords: TimeRecord[];
  onRecordUpdate: (record: any) => void;
}

export const TimeActivityTable: React.FC<TimeActivityTableProps> = ({ timeRecords, onRecordUpdate }) => {
  const [selectedCell, setSelectedCell] = useState<{
    recordId: number;
    field: string;
    fieldName: string;
  } | null>(null);
  const [showExtendedBreaks, setShowExtendedBreaks] = useState(false);
  const [timeValue, setTimeValue] = useState('');

  // 데이터가 변경될 때마다 콘솔에 출력
  useEffect(() => {
    console.log('TimeRecords updated:', timeRecords);
  }, [timeRecords]);

  const handleSaveTime = async (time: string) => {
    if (!selectedCell) return;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // 레코드 ID가 날짜 형식인 경우(새 레코드)
      if (selectedCell.recordId > 20000000 || !selectedCell.recordId) {
        // 날짜 형식에서 실제 날짜 추출
        let dateStr;
        
        if (selectedCell.recordId > 20000000) {
          const year = Math.floor(selectedCell.recordId / 10000);
          const month = Math.floor((selectedCell.recordId % 10000) / 100) - 1; // 0-based month
          const day = selectedCell.recordId % 100;
          const recordDate = new Date(year, month, day);
          dateStr = format(recordDate, 'yyyy-MM-dd');
        } else {
          // 현재 선택된 날짜의 레코드를 찾아서 날짜 정보 가져오기
          const record = timeRecords.find(r => r.id === selectedCell.recordId);
          if (record) {
            dateStr = format(new Date(record.date), 'yyyy-MM-dd');
          } else {
            dateStr = format(new Date(), 'yyyy-MM-dd'); // 기본값
          }
        }
        
        console.log('Creating new record for date:', dateStr);
        console.log('Field:', selectedCell.field);
        console.log('Time:', time);
        
        // 새 레코드 생성 API 호출
        const requestData = {
          date: dateStr,
          [selectedCell.field]: time,
          status: 'ACTIVE'  // 필수 status 필드 추가
        };
        
        console.log('Sending data:', JSON.stringify(requestData));
        
        const response = await fetch(`${API_URL}/timeRecords`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null) || await response.text();
          console.error('Server response:', errorData);
          throw new Error(`Failed to create time record: ${response.status} ${response.statusText}`);
        }
        
        const newRecord = await response.json();
        console.log('Successfully created record:', newRecord);
        
        // 부모 컴포넌트에 업데이트 알림
        if (typeof onRecordUpdate === 'function') {
          onRecordUpdate(newRecord);
        } else {
          console.error('onRecordUpdate is not a function:', onRecordUpdate);
        }
      } else {
        // 기존 레코드 업데이트
        console.log('Updating record ID:', selectedCell.recordId);
        console.log('Field:', selectedCell.field);
        console.log('Time:', time);
        
        const response = await fetch(`${API_URL}/timeRecords/${selectedCell.recordId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            [selectedCell.field]: time  // 필드명을 직접 사용
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null) || await response.text();
          console.error('Server response:', errorData);
          throw new Error(`Failed to update time record: ${response.status} ${response.statusText}`);
        }
        
        const updatedRecord = await response.json();
        console.log('Successfully updated record:', updatedRecord);
        
        // 부모 컴포넌트에 업데이트 알림
        if (typeof onRecordUpdate === 'function') {
          onRecordUpdate(updatedRecord);
        } else {
          console.error('onRecordUpdate is not a function:', onRecordUpdate);
        }
      }
      
      setSelectedCell(null);
    } catch (error) {
      console.error('Error saving time:', error);
      throw error;
    }
  };

  const handleCellClick = (recordId: number, field: string, fieldName: string) => {
    setSelectedCell({ recordId, field, fieldName });
  };

  const formatDate = (date: Date | string) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'dd/MM');
  };

  const toggleExtendedBreaks = () => {
    setShowExtendedBreaks(!showExtendedBreaks);
  };

  // 근무 시간 포맷팅 함수 추가
  const formatWorkingHours = (hours: string | number | null): string => {
    if (hours === null) return '-';
    
    // 문자열이면 숫자로 변환
    const numericHours = typeof hours === 'string' ? parseFloat(hours) : hours;
    
    // 시간 부분 계산 (정수 부분)
    const h = Math.floor(numericHours);
    
    // 분 부분 계산 (소수점 부분을 분으로 변환)
    const m = Math.round((numericHours - h) * 100);
    
    // 형식화된 문자열 반환 (분은 항상 2자리로 표시)
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  // 요일 표시 함수
  const getKoreanWeekday = (date: Date | string): string => {
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return weekdays[dateObj.getDay()];
  };

  // 날짜 생성 및 정렬 로직 수정
  const sortedTimeRecords = [...timeRecords].sort((a, b) => {
    // 먼저 날짜로 정렬 (날짜 순서대로)
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  // 또는 일주일치 순서대로 표시하려면 (현재 날짜 기준 7일)
  const sortedByWeekday = [...timeRecords].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    
    // 같은 주차 내에서 요일 순으로 정렬
    const dayA = dateA.getDay() === 0 ? 7 : dateA.getDay();
    const dayB = dateB.getDay() === 0 ? 7 : dateB.getDay();
    
    return dayA - dayB;
  });

  return (
    <div>
      <div className="time-table-wrapper">
        <table className="time-activity-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>In</th>
              {showExtendedBreaks ? (
                <>
                  <th>B1 In</th>
                  <th>B1 Out</th>
                  <th>B2 In</th>
                  <th>B2 Out</th>
                  <th>B3 In</th>
                  <th>B3 Out</th>
                </>
              ) : (
                <>
                  <th>B1 In</th>
                  <th>B1 Out</th>
                </>
              )}
              <th>Out</th>
              <th>WH</th>
            </tr>
          </thead>
          <tbody>
            {sortedTimeRecords.map((record) => (
              <tr key={record.id}>
                <td className="date-cell">
                  {typeof record.date === 'string' 
                    ? `${formatDate(record.date)} (${getKoreanWeekday(record.date)})`
                    : `${formatDate(record.date)} (${getKoreanWeekday(record.date)})`}
                </td>
                <td 
                  className={record.checkIn ? 'has-data' : 'no-data'} 
                  onClick={() => handleCellClick(record.id, 'clockInTime', 'Clock In')}
                >
                  {record.checkIn || '-'}
                </td>
                <td 
                  className={record.breakIn1 ? 'has-data' : 'no-data'} 
                  onClick={() => handleCellClick(record.id, 'breakStartTime1', 'Break 1 In')}
                >
                  {record.breakIn1 || '-'}
                </td>
                <td 
                  className={record.breakOut1 ? 'has-data' : 'no-data'} 
                  onClick={() => handleCellClick(record.id, 'breakEndTime1', 'Break 1 Out')}
                >
                  {record.breakOut1 || '-'}
                </td>
                {showExtendedBreaks && (
                  <>
                    <td 
                      className={record.breakIn2 ? 'has-data' : 'no-data'} 
                      onClick={() => handleCellClick(record.id, 'breakStartTime2', 'Break 2 In')}
                    >
                      {record.breakIn2 || '-'}
                    </td>
                    <td 
                      className={record.breakOut2 ? 'has-data' : 'no-data'} 
                      onClick={() => handleCellClick(record.id, 'breakEndTime2', 'Break 2 Out')}
                    >
                      {record.breakOut2 || '-'}
                    </td>
                    <td 
                      className={record.breakIn3 ? 'has-data' : 'no-data'} 
                      onClick={() => handleCellClick(record.id, 'breakStartTime3', 'Break 3 In')}
                    >
                      {record.breakIn3 || '-'}
                    </td>
                    <td 
                      className={record.breakOut3 ? 'has-data' : 'no-data'} 
                      onClick={() => handleCellClick(record.id, 'breakEndTime3', 'Break 3 Out')}
                    >
                      {record.breakOut3 || '-'}
                    </td>
                  </>
                )}
                <td 
                  className={record.checkOut ? 'has-data' : 'no-data'} 
                  onClick={() => handleCellClick(record.id, 'clockOutTime', 'Clock Out')}
                >
                  {record.checkOut || '-'}
                </td>
                <td className="hours-cell">
                  {record.workingHours ? formatWorkingHours(record.workingHours) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="table-controls">
        <button 
          className="toggle-breaks-btn" 
          onClick={toggleExtendedBreaks}
        >
          {showExtendedBreaks ? '- less' : '+ more'}
        </button>
      </div>
    </div>
  );
};