import React from 'react';
import { TimeActivityRow } from '../types';
import { format } from 'date-fns';

interface TimeActivityTableProps {
  data: TimeActivityRow[];
}

export const TimeActivityTable: React.FC<TimeActivityTableProps> = ({ data }) => {
  // 근무 시간 계산 함수
  const calculateWorkHours = (row: TimeActivityRow): string => {
    if (!row.checkIn || !row.checkOut) return 'N/A';
    
    // 시간 문자열을 분으로 변환
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const clockInMinutes = timeToMinutes(row.checkIn);
    const clockOutMinutes = timeToMinutes(row.checkOut);
    
    // 휴식 시간 계산
    let breakMinutes = 0;
    if (row.breakIn1 && row.breakOut1) {
      const breakStartMinutes = timeToMinutes(row.breakIn1);
      const breakEndMinutes = timeToMinutes(row.breakOut1);
      breakMinutes += breakEndMinutes - breakStartMinutes;
    }
    if (row.breakIn2 && row.breakOut2) {
      const breakStartMinutes = timeToMinutes(row.breakIn2);
      const breakEndMinutes = timeToMinutes(row.breakOut2);
      breakMinutes += breakEndMinutes - breakStartMinutes;
    }
    if (row.breakIn3 && row.breakOut3) {
      const breakStartMinutes = timeToMinutes(row.breakIn3);
      const breakEndMinutes = timeToMinutes(row.breakOut3);
      breakMinutes += breakEndMinutes - breakStartMinutes;
    }

    // 총 근무 시간 계산
    const totalWorkMinutes = clockOutMinutes - clockInMinutes - breakMinutes;
    const workHours = totalWorkMinutes / 60;
    
    return `${workHours.toFixed(1)} hr`;
  };

  return (
    <div className="overflow-y-auto max-h-[calc(100vh-280px)] overflow-x-auto">
      <table className="w-full border-collapse min-w-[300px]">
        <thead className="sticky top-0">
          <tr className="bg-[#F5E9D7] text-[#B17F4A]">
            <th className="p-2 border border-[#E5D5B5]">Date</th>
            <th className="p-2 border border-[#E5D5B5]">Clock In</th>
            <th className="p-2 border border-[#E5D5B5]">Break 1 Start</th>
            <th className="p-2 border border-[#E5D5B5]">Break 1 End</th>
            <th className="p-2 border border-[#E5D5B5]">Break 2 Start</th>
            <th className="p-2 border border-[#E5D5B5]">Break 2 End</th>
            <th className="p-2 border border-[#E5D5B5]">Break 3 Start</th>
            <th className="p-2 border border-[#E5D5B5]">Break 3 End</th>
            <th className="p-2 border border-[#E5D5B5]">Clock Out</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#FFFBF6]'}>
              <td className="p-2 border border-[#E5D5B5] text-center">{format(row.date, 'dd/MM')}</td>
              <td className="p-2 border border-[#E5D5B5] text-center">{row.checkIn || '-'}</td>
              <td className="p-2 border border-[#E5D5B5] text-center">{row.breakIn1 || '-'}</td>
              <td className="p-2 border border-[#E5D5B5] text-center">{row.breakOut1 || '-'}</td>
              <td className="p-2 border border-[#E5D5B5] text-center">{row.breakIn2 || '-'}</td>
              <td className="p-2 border border-[#E5D5B5] text-center">{row.breakOut2 || '-'}</td>
              <td className="p-2 border border-[#E5D5B5] text-center">{row.breakIn3 || '-'}</td>
              <td className="p-2 border border-[#E5D5B5] text-center">{row.breakOut3 || '-'}</td>
              <td className="p-2 border border-[#E5D5B5] text-center">{row.checkOut || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};