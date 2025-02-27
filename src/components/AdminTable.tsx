import { useState } from 'react';
import adminIconSortDown from '../assets/admin_icon_sort_down.png';
import adminIconSortUp from '../assets/admin_icon_sort_up.png';
import adminIconEdit from '../assets/admin_icon_edit.png';
import adminIconSearch from '../assets/admin_icon_search.png';

interface Column {
  key: string;
  header: string;
}

interface AdminTableProps {
  columns: Column[];
  data: any[];
  searchTerm: string;
  onSearch: (term: string) => void;
  onSort: (key: string) => void;
  isEditMode: boolean;
  onEdit: () => void;
}

export const AdminTable = ({ 
  columns, 
  data, 
  searchTerm, 
  onSearch, 
  onSort, 
  isEditMode, 
  onEdit 
}: AdminTableProps) => {
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isSortAscending, setIsSortAscending] = useState(true);

  const handleSortClick = () => {
    setShowSortDropdown(!showSortDropdown);
    setIsSortAscending(!isSortAscending);
  };

  const handleSort = (key: string) => {
    onSort(key);
    setShowSortDropdown(false);
  };

  return (
    <div>
      {/* 검색 및 정렬 영역 */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4 py-4 border-y border-[#DDDDDD] mt-6">
        {/* 검색 */}
        <div className="flex items-center gap-2">
          <img src={adminIconSearch} alt="search" className="w-5 h-5" />
          <input
            type="text"
            placeholder="Search.."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full md:w-64 px-2 py-2 rounded-lg font-montserrat text-14 focus:outline-none"
          />
        </div>

        {/* Sort & Edit 버튼 컨테이너 */}
        <div className="relative flex flex-col items-start md:items-center">
          <div className="flex items-center gap-6 h-full">
            <button
              onClick={handleSortClick}
              className="flex items-center justify-center gap-2 text-[#A18206] font-montserrat h-[40px]"
            >
              Sort
              <img 
                src={isSortAscending ? adminIconSortDown : adminIconSortUp} 
                alt="sort" 
                className="w-[13px] h-[13px]"
              />
            </button>
            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-2 text-[#A18206] font-montserrat h-[40px]"
            >
              Edit
              <img src={adminIconEdit} alt="edit" />
            </button>
          </div>

          {/* Sort 드롭다운 */}
          {showSortDropdown && (
            <div className="absolute top-full md:translate-x-4 translate-y-[8px] left-0 md:right-0 md:left-auto mt-2 bg-white rounded-lg shadow-lg w-[160px] z-10">
              {columns.map((column) => (
                <button 
                  key={column.key}
                  className="w-full px-4 py-3 text-left hover:bg-[#dddddd] font-montserrat text-[14px]"
                  onClick={() => handleSort(column.key)}
                >
                  {column.header}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="mt-6">
        <div className="bg-[#FDCF17] grid grid-cols-[repeat(auto-fit,_minmax(0,_1fr))] gap-4 p-4">
          {columns.map((col) => (
            <div key={col.key} className="font-montserrat font-semibold">{col.header}</div>
          ))}
        </div>
        {data.map((item, index) => (
          <div key={index} className="grid grid-cols-[repeat(auto-fit,_minmax(0,_1fr))] gap-4 p-4 border-b">
            {columns.map((col) => (
              <div key={col.key} className="font-montserrat">{item[col.key] || '-'}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}; 