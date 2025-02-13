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
    if (row.breakIn && row.breakOut) {
      const breakStartMinutes = timeToMinutes(row.breakIn);
      const breakEndMinutes = timeToMinutes(row.breakOut);
      breakMinutes = breakEndMinutes - breakStartMinutes;
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
          <tr>
            <th className="py-1 px-2 bg-[#FDCF17] font-montserrat text-black border border-[#A07907] text-sm">Date</th>
            <th className="py-1 px-2 bg-[#FFE26C] font-montserrat text-black border border-[#A07907] text-sm">Clock In</th>
            <th className="py-1 px-2 bg-[#FFE26C] font-montserrat text-black border border-[#A07907] text-sm">Break Start</th>
            <th className="py-1 px-2 bg-[#FFE26C] font-montserrat text-black border border-[#A07907] text-sm">Break End</th>
            <th className="py-1 px-2 bg-[#FFE26C] font-montserrat text-black border border-[#A07907] text-sm">Clock Out</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td className="py-2 px-2 font-montserrat font-semibold text-center border border-[#A07907] bg-white text-sm">
                {format(row.date, 'dd/MM')}
              </td>
              <td className="py-2 px-2 font-montserrat text-center border border-[#A07907] bg-white text-sm">
                {row.checkIn || '-'}
              </td>
              <td className="py-2 px-2 font-montserrat text-center border border-[#A07907] bg-white text-sm">
                {row.breakIn || '-'}
              </td>
              <td className="py-2 px-2 font-montserrat text-center border border-[#A07907] bg-white text-sm">
                {row.breakOut || '-'}
              </td>
              <td className="py-2 px-2 font-montserrat text-center border border-[#A07907] bg-white text-sm">
                <div>{row.checkOut || '-'}</div>
                <div className="text-xs text-gray-600">({calculateWorkHours(row)})</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};