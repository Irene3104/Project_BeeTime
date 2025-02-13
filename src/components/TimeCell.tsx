import React from 'react';
import { TableCellProps } from '../types/index';

export const TableCell: React.FC<TableCellProps> = ({ data }) => {
  // 상태에 따른 텍스트 색상 결정
  const getStatusColor = () => {
    switch (data.status) {
      case 'late':
        return 'text-red-500';  // 지각인 경우 빨간색
      case 'early':
        return 'text-orange-500';  // 조퇴인 경우 주황색
      default:
        return 'text-gray-800';  // 정상인 경우 기본 색상
    }
  };

  return (
    <td className={`py-3 px-4 font-montserrat text-sm ${getStatusColor()}`}>
      {data.value || '-'}  {/* 값이 없는 경우 '-' 표시 */}
    </td>
  );
};