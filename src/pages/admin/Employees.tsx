import { useState, useEffect } from 'react';
import { Employee, SortOption, Location } from '../../types';
import { API_URL } from '../../config/constants';

import { AdminLayout } from '../../components/AdminLayout';
// import { AddEmployeeModal } from '../../components/AddEmployeeModal';
import { ExcelDownloader } from '../../components/ExcelDownloader';
// import adminIconAdd from '../../assets/admin_icon_add.png';
import adminIconSearch from '../../assets/admin_icon_search.png'
import adminIconSortDown from '../../assets/admin_icon_sort_down.png';
import adminIconSortUp from '../../assets/admin_icon_sort_up.png';
import adminIconEdit from '../../assets/admin_icon_edit.png';
import adminIconDelete from '../../assets/admin_icon_delete.png';

export const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>({ field: 'name', direction: 'asc' });
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isSortAscending, setIsSortAscending] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    fetchEmployees();
    fetchLocations();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/employees`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('직원 목록 조회 실패:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch(`${API_URL}/locations`);
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('지점 목록 조회 실패:', error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleSort = (field: SortOption['field']) => {
    setSortOption(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setShowSortDropdown(false);
  };

  const handleDelete = async (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    try {
      const response = await fetch(`${API_URL}/admin/employees/${deleteTargetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchEmployees();
        setShowDeleteModal(false);
        setDeleteTargetId(null);
        setIsEditMode(false);
      }
    } catch (error) {
      console.error('직원 삭제 실패:', error);
    }
  };

  // const handleAddEmployee = async (employeeData: any) => {
  //   try {
  //     const response = await fetch(`${API_URL}/admin/employees`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
  //       },
  //       body: JSON.stringify(employeeData)
  //     });

  //     if (!response.ok) {
  //       throw new Error('Failed to add employee');
  //     }

  //     const newEmployee = await response.json();
      
  //     // 새로운 직원을 목록에 추가
  //     setEmployees(prev => [...prev, newEmployee]);
      
  //     // 모달 닫기
  //     setShowAddModal(false);
      
  //     // 성공 메시지 표시 (옵션)
  //     alert('Employee added successfully');
      
  //   } catch (error) {
  //     console.error('Failed to add employee:', error);
  //     alert('Failed to add employee. Please try again.');
  //   }
  // };

  const filteredAndSortedEmployees = employees
    .filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (emp.location?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const direction = sortOption.direction === 'asc' ? 1 : -1;
      if (sortOption.field === 'name') return a.name.localeCompare(b.name) * direction;
      if (sortOption.field === 'title') return ((a.title || '') > (b.title || '') ? 1 : -1) * direction;
      if (sortOption.field === 'location') return (a.location?.name || '').localeCompare(b.location?.name || '') * direction;
      return 0;
    });

  // 엑셀 다운로드를 위한 컬럼 설정
  const employeeColumns = [
    { key: 'name', header: 'Name', width: 20 },
    { key: 'email', header: 'Email', width: 30 },
    { key: 'title', header: 'Title', width: 15 },
    { key: 'location', header: 'Location', width: 25 }
  ];

  // location 정보 포맷팅
  const formattedEmployees = employees.map(emp => ({
    ...emp,
    location: emp.location 
      ? `${emp.location.name}${emp.location.branch ? ` - ${emp.location.branch}` : ''}`
      : '-'
  }));

  const handleSortClick = () => {
    setShowSortDropdown(!showSortDropdown);
    setIsSortAscending(!isSortAscending);
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-5xl mt-[35px] mx-auto">
        {/* 타이틀 */}
        <h1 className="text-[32px] font-montserrat font-semibold">Employees</h1>

        {/* 버튼 영역 - 오른쪽 정렬 */}
        <div className="flex justify-end gap-6 mt-4">
          <ExcelDownloader 
            data={formattedEmployees}
            pageType="Employees" 
            columns={employeeColumns}
            filename="employees"
          />
        </div>

        {/* 검색 및 정렬 영역 */}
        <div className="flex flex-col md:flex-row md:justify-between gap-4 py-4 border-y border-[#DDDDDD] mt-6">
          {/* 검색 영역 */}
          <div className="flex items-center gap-2">
            <img src={adminIconSearch} alt="search" className="w-5 h-5" />
            <input
              type="text"
              placeholder="Search.."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
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
                onClick={() => setIsEditMode(!isEditMode)}
                className="flex items-center justify-center gap-2 text-[#A18206] font-montserrat h-[40px]"
              >
                Edit
                <img src={adminIconEdit} alt="edit" />
              </button>
            </div>

            {/* Sort 드롭다운 */}
            {showSortDropdown && (
              <div className="absolute top-full md:translate-x-4 translate-y-[8px] left-0 md:right-0 md:left-auto mt-2 bg-white rounded-lg shadow-lg w-[160px] z-10">
                <button 
                  className="w-full px-4 py-3 text-left hover:bg-[#dddddd] font-montserrat text-[14px]"
                  onClick={() => handleSort('name')}
                >
                  Name
                </button>
                <button 
                  className="w-full px-4 py-3 text-left hover:bg-[#dddddd] font-montserrat text-[14px]"
                  onClick={() => handleSort('title')}
                >
                  Title
                </button>
                <button 
                  className="w-full px-4 py-3 text-left hover:bg-[#dddddd] font-montserrat text-[14px]"
                  onClick={() => handleSort('location')}
                >
                  Location
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 테이블 영역 - 스크롤 가능하도록 수정 */}
        <div className="mt-6 md:mt-[30px] overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-[#FFE26C] border-b border-t">
                <th className="px-6 py-4 text-left font-montserrat">Name</th>
                <th className="px-6 py-4 text-left font-montserrat">Email</th>
                <th className="px-6 py-4 text-left font-montserrat">Title</th>
                <th className="px-6 py-4 text-left font-montserrat">Location</th>
                {isEditMode && <th className="px-6 py-4 text-left font-montserrat"></th>}
              </tr>
            </thead>
            <tbody className="border-b border-[#DDDDDD]">
              {filteredAndSortedEmployees.map(employee => (
                <tr key={employee.id}>
                  <td className="px-6 py-4 text-black font-montserrat text-14">{employee.name}</td>
                  <td className="px-6 py-4 text-black font-montserrat text-14">{employee.email}</td>
                  <td className="px-6 py-4 text-black font-montserrat text-14">{employee.title || '-'}</td>
                  <td className="px-6 py-4 text-black font-montserrat text-14">
                    {employee.location 
                      ? `${employee.location.name}${employee.location.branch ? ` - ${employee.location.branch}` : ''}`
                      : '-'
                    }
                  </td>
                  {isEditMode && (
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="flex justify-between items-center w-full px-4 py-3 text-[#B3261E] font-montserrat hover:bg-[#dddddd] active:bg-[#dddddd]"
                      >
                        <span>Delete</span>
                        <img 
                          src={adminIconDelete} 
                          alt="delete" 
                          className="w-[13px] h-[13px]"
                        />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Delete 확인 모달 */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg w-[400px]">
              <h2 className="text-xl font-fredoka mb-4">Confirm Delete</h2>
              <p className="mb-6 font-montserrat">Are you sure you want to delete this employee?</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-600 font-montserrat"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded font-montserrat"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 모달 추가
        {showAddModal && (
          <AddEmployeeModal
            onClose={() => setShowAddModal(false)}
            onSubmit={handleAddEmployee}
            locations={locations}
          />
        )} */}
      </div>
    </AdminLayout>
  );
};