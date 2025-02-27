import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { ExcelDownloader } from '../../components/ExcelDownloader';
import { API_URL } from '../../config/constants';
import adminIconAdd from '../../assets/admin_icon_add.png';
import adminIconSearch from '../../assets/admin_icon_search.png';
import adminIconSortDown from '../../assets/admin_icon_sort_down.png';
import adminIconSortUp from '../../assets/admin_icon_sort_up.png';
import adminIconEdit from '../../assets/admin_icon_edit.png';
import adminIconDelete from '../../assets/admin_icon_delete.png';
import adminIconClose from '../../assets/admin_btn_exit.png';
import beeIcon from '../../assets/logo_bee1.png';

interface Location {
  id: number;
  name: string;
  branch: string | null;
  address: string;
  company: string;
  abn: string;
}

interface SortOption {
  field: 'name' | 'branch' | 'address' | 'company' | 'abn';
  direction: 'asc' | 'desc';
}

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (location: Omit<Location, 'id'>) => void;
}

const AddLocationModal = ({ isOpen, onClose, onAdd }: AddLocationModalProps) => {
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [address, setAddress] = useState('');
  const [company, setCompany] = useState('');
  const [abn, setAbn] = useState('');
  
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  const handleSubmit = () => {
    if (!name || !address) {
      alert('Name and address are required fields.');
      return;
    }
    
    onAdd({
      name,
      branch,
      address,
      company,
      abn
    });
    
    setName('');
    setBranch('');
    setAddress('');
    setCompany('');
    setAbn('');
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg w-full max-w-md mx-auto overflow-hidden"
      >
        <div className="bg-[#FDCF17] p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={beeIcon} alt="Bee" className="w-10 h-10" />
            <h2 className="text-2xl font-bold">Add New Location</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-700 hover:text-gray-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-5">
          <div className="mb-4">
            <label className="block text-gray-600 text-lg mb-2">Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-600 text-lg mb-2">Branch:</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-600 text-lg mb-2">Address:</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none h-24"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-600 text-lg mb-2">Company:</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          
          <div className="mb-5">
            <label className="block text-gray-600 text-lg mb-2">ABN:</label>
            <input
              type="text"
              value={abn}
              onChange={(e) => setAbn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          
          <button
            onClick={handleSubmit}
            className="w-full bg-[#FDCF17] hover:bg-[#e6bb14] text-black font-bold py-3 px-4 rounded-md transition duration-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export const Locations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>({ field: 'name', direction: 'asc' });
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSortAscending, setIsSortAscending] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const locationColumns = [
    { key: 'name', header: 'Name' },
    { key: 'branch', header: 'Branch' },
    { key: 'address', header: 'Address' },
    { key: 'company', header: 'Company' },
    { key: 'abn', header: 'ABN' }
  ];

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoading(true);
        
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/admin/locations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch locations');
        
        const data = await response.json();
        console.log('Locations API 응답:', data);
        
        const locationsData = data.locations || [];
        
        const locationsWithABN = locationsData.map(loc => ({
          ...loc,
          abn: loc.abn || '-'
        }));
        
        setLocations(locationsWithABN);
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleSortClick = () => {
    setShowSortDropdown(!showSortDropdown);
    setIsSortAscending(!isSortAscending);
  };

  const handleSort = (field: SortOption['field']) => {
    setSortOption(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setShowSortDropdown(false);
  };

  const handleDelete = (id: number) => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/admin/locations/${deleteTargetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`삭제 실패: ${response.status}`);
      }
      
      setLocations(locations.filter(loc => loc.id !== deleteTargetId));
      setShowDeleteModal(false);
      setDeleteTargetId(null);
      setIsEditMode(false);
    } catch (error) {
      console.error('지점 삭제 실패:', error);
      alert('지점 삭제에 실패했습니다.');
    }
  };

  const handleAddLocation = async (newLocation: Omit<Location, 'id'>) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/admin/locations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newLocation)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('지점 추가 실패 응답:', errorData);
        throw new Error(`지점 추가 실패: ${response.status}`);
      }
      
      const addedLocation = await response.json();
      
      setLocations([...locations, {
        id: addedLocation.id,
        name: addedLocation.name,
        branch: addedLocation.branch || '-',
        address: addedLocation.address,
        company: addedLocation.company || '-',
        abn: addedLocation.abn || '-'
      }]);
      
      setShowAddModal(false);
    } catch (error) {
      console.error('지점 추가 실패:', error);
      alert('지점 추가에 실패했습니다.');
    }
  };

  const filteredLocations = locations.filter(location => {
    if (!searchTerm) return true;
    
    const searchRegex = new RegExp(searchTerm, 'i');
    return (
      searchRegex.test(location.name) ||
      searchRegex.test(location.branch || '') ||
      searchRegex.test(location.address) ||
      searchRegex.test(location.company) ||
      searchRegex.test(location.abn)
    );
  });

  const sortedLocations = [...filteredLocations].sort((a, b) => {
    const { field, direction } = sortOption;
    const valueA = a[field] || '';
    const valueB = b[field] || '';
    
    const result = String(valueA).localeCompare(String(valueB));
    return direction === 'asc' ? result : -result;
  });

  // 백엔드를 통해 Place ID 가져오기
  const getPlaceIdFromAddress = async (address: string): Promise<string | null> => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/admin/geocode?address=${encodeURIComponent(address)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error('Geocoding failed:', response.status);
        return null;
      }
      
      const data = await response.json();
      console.log('Found Place ID:', data.placeId);
      
      return data.placeId;
    } catch (error) {
      console.error('Error getting Place ID:', error);
      return null;
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-5xl mt-[35px] mx-auto">
        <h1 className="text-[32px] font-montserrat font-semibold">Locations</h1>

        <div className="flex justify-end gap-6 mt-4">
          <ExcelDownloader 
            data={locations}
            pageType="Locations" 
            columns={locationColumns}
          />
          <button 
            onClick={() => setShowAddModal(true)}
            className="text-[#A18206] font-montserrat flex items-center gap-2"
          >
            Add
            <img src={adminIconAdd} alt="add" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:justify-between gap-4 py-4 border-y border-[#DDDDDD] mt-6">
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

            {showSortDropdown && (
              <div className="absolute top-full md:translate-x-4 translate-y-[8px] left-0 md:right-0 md:left-auto mt-2 bg-white rounded-lg shadow-lg w-[160px] z-10">
                {locationColumns.map(column => (
                  <button 
                    key={column.key}
                    className="w-full px-4 py-3 text-left hover:bg-[#dddddd] font-montserrat text-[14px]"
                    onClick={() => handleSort(column.key as SortOption['field'])}
                  >
                    {column.header}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* 테이블 영역 */}
        <div className="mt-6 md:mt-[30px] overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-[#FFE26C] border-b border-t">
                {locationColumns.map(column => (
                  <th key={column.key} className="px-6 py-4 text-left font-montserrat">{column.header}</th>
                ))}
                {isEditMode && <th className="px-6 py-4 text-left font-montserrat"></th>}
              </tr>
            </thead>
            <tbody className="border-b border-[#DDDDDD]">
              {isLoading ? (
                <tr>
                  <td colSpan={locationColumns.length + (isEditMode ? 1 : 0)} className="px-6 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : sortedLocations.length === 0 ? (
                <tr>
                  <td colSpan={locationColumns.length + (isEditMode ? 1 : 0)} className="px-6 py-4 text-center">
                    No locations found
                  </td>
                </tr>
              ) : (
                sortedLocations.map(location => (
                  <tr key={location.id}>
                    <td className="px-6 py-4 text-black font-montserrat text-14">{location.name}</td>
                    <td className="px-6 py-4 text-black font-montserrat text-14">{location.branch || '-'}</td>
                    <td className="px-6 py-4 text-black font-montserrat text-14">{location.address}</td>
                    <td className="px-6 py-4 text-black font-montserrat text-14">{location.company}</td>
                    <td className="px-6 py-4 text-black font-montserrat text-14">{location.abn}</td>
                    {isEditMode && (
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDelete(location.id)}
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
                ))
              )}
            </tbody>
          </table>
        </div>

        <AddLocationModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddLocation}
        />

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg w-[400px]">
              <h2 className="text-xl font-fredoka mb-4">Confirm Delete</h2>
              <p className="mb-6 font-montserrat">Are you sure you want to delete this location?</p>
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
      </div>
    </AdminLayout>
  );
}; 