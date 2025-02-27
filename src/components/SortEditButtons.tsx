import adminIconSort from "../assets/admin_icon_sort_down.png";
import adminIconEdit from "../assets/admin_icon_edit.png";
import { useState } from 'react';

interface SortEditButtonsProps {
  onSort?: () => void;
  onEdit?: () => void;
}

export const SortEditButtons = ({ onSort, onEdit }) => {
  return (
    <div className="relative flex flex-col items-start md:items-center">
      <div className="flex items-center gap-6 h-full">
        <button onClick={onSort} className="flex items-center justify-center gap-2 text-[#A18206] font-montserrat h-[40px]">
          Sort
          <img src={adminIconSort} alt="sort" className="w-[13px] h-[13px]" />
        </button>
        <button onClick={onEdit} className="flex items-center justify-center gap-2 text-[#A18206] font-montserrat h-[40px]">
          Edit
          <img src={adminIconEdit} alt="edit" />
        </button>
      </div>
    </div>
  );
}; 