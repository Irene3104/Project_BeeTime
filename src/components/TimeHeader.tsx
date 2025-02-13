import React from 'react';
import { TableHeaderProps } from '../types/index';

export const TableHeader: React.FC<TableHeaderProps> = ({ title }) => {
  return (
    // 브라운 계열의 배경색과 텍스트 색상 사용
    <th className="py-3 px-4 bg-[#F7E3CA] text-[#B17F4A] font-montserrat text-sm">
      {title}
    </th>
  );
};