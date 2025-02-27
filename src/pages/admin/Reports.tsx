import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { API_URL } from '../../config/constants';
import { format } from 'date-fns';
import { FiDownload, FiSearch, FiTrash2 } from 'react-icons/fi';

// 리포트 타입 정의
interface Report {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  fileName: string;
  locationId: number | null;
  locationName: string | null;
  createdAt: string;
}

interface Location {
  id: number;
  name: string;
  branch?: string;
}

export const Reports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedReports, setSelectedReports] = useState<number[]>([]);

  // 인증 헤더 가져오기
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    console.log('Using token:', token ? 'Token exists' : 'No token found');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  // 체크박스 변경 핸들러
  const handleCheckboxChange = (id: number) => {
    setSelectedReports(prev => 
      prev.includes(id) 
        ? prev.filter(reportId => reportId !== id)
        : [...prev, id]
    );
  };

  // 전체 선택 핸들러
  const handleSelectAll = () => {
    if (selectedReports.length === reports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(reports.map(report => report.id));
    }
  };

  // 선택된 리포트 다운로드
  const downloadSelectedReports = async () => {
    // 각 리포트를 순차적으로 다운로드
    for (const id of selectedReports) {
      await downloadReport(id);
    }
  };

  // 선택된 리포트 삭제
  const deleteSelectedReports = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/admin/reports/delete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ids: selectedReports
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete reports');
      }
      
      const result = await response.json();
      
      // 삭제된 리포트를 상태에서 제거
      setReports(prevReports => 
        prevReports.filter(report => !selectedReports.includes(report.id))
      );
      
      // 선택 목록 초기화
      setSelectedReports([]);
      
    } catch (error) {
      console.error('Error deleting reports:', error);
      setError('Failed to delete reports');
    } finally {
      setIsDeleting(false);
    }
  };

  // 리포트 목록 가져오기
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching reports from:', `${API_URL}/admin/reports`);
        const headers = getAuthHeaders();
        console.log('Request headers:', headers);
        
        const response = await fetch(`${API_URL}/admin/reports`, {
          headers: headers,
        });
        
        console.log('Reports API response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch reports: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Reports data received:', data);
        setReports(data);
      } catch (error) {
        console.error('Error fetching reports:', error);
        setError('Failed to load reports');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReports();
  }, []);
  
  // 지점 목록 가져오기
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        console.log('Fetching locations from:', `${API_URL}/admin/locations`);
        const headers = getAuthHeaders();
        console.log('Request headers for locations:', headers);
        
        const response = await fetch(`${API_URL}/admin/locations`, {
          headers: headers,
        });
        
        console.log('Locations API response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch locations: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Locations data received:', data);
        
        // locations 객체에서 locations 배열 추출
        const locationsArray = data.locations || data;
        console.log('Processed locations array:', locationsArray);
        setLocations(locationsArray);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLocations([]);
      }
    };
    
    fetchLocations();
  }, []);
  
  // 지점 이름 형식화
  const formatLocationName = (location: Location) => {
    return location.branch ? `${location.name} - ${location.branch}` : location.name;
  };

  // 리포트 생성 함수
  const generateReport = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      if (!startDate || !endDate) {
        setError('Please select start and end dates');
        return;
      }
      
      const response = await fetch(`${API_URL}/admin/reports/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          startDate,
          endDate,
          locationId: selectedLocation || undefined,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }
      
      const newReport = await response.json();
      
      // 리포트 목록 업데이트
      setReports(prevReports => [newReport, ...prevReports]);
      
      // 입력 필드 초기화
      setStartDate('');
      setEndDate('');
      setSelectedLocation('');
      
    } catch (error: any) {
      console.error('Error generating report:', error);
      setError(error.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // 리포트 다운로드 함수
  const downloadReport = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/admin/reports/${id}/download`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to download report');
      }
      
      const blob = await response.blob();
      const report = reports.find(r => r.id === id);
      
      if (!report) {
        throw new Error('Report not found');
      }
      
      // 파일 다운로드
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      setError('Failed to download report');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold mb-6">Generated Reports</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Generate New Report</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All Locations</option>
                {locations && locations.length > 0 && locations.map(location => (
                  <option key={location.id} value={location.id.toString()}>
                    {formatLocationName(location)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={isGenerating}
                className="w-full py-2 px-4 bg-[#FDCF17] text-black font-medium rounded-md hover:bg-[#e6bb14] flex items-center justify-center"
              >
                {isGenerating ? (
                  <span>Generating...</span>
                ) : (
                  <>
                    <FiSearch className="mr-2" /> Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-md mt-4">
              {error}
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold">Report List</h2>
            <div className="flex space-x-2">
              {selectedReports.length > 0 && (
                <>
                  <button
                    onClick={downloadSelectedReports}
                    className="py-1 px-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
                  >
                    <FiDownload className="mr-1" /> Download ({selectedReports.length})
                  </button>
                  <button
                    onClick={deleteSelectedReports}
                    disabled={isDeleting}
                    className="py-1 px-3 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
                  >
                    <FiTrash2 className="mr-1" /> 
                    {isDeleting ? 'Deleting...' : `Delete (${selectedReports.length})`}
                  </button>
                </>
              )}
            </div>
          </div>
          
          {isLoading ? (
            <div className="p-6 text-center">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No reports have been generated yet.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedReports.length === reports.length && reports.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-[#FDCF17] border-gray-300 rounded focus:ring-[#FDCF17]"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map(report => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(report.id)}
                        onChange={() => handleCheckboxChange(report.id)}
                        className="h-4 w-4 text-[#FDCF17] border-gray-300 rounded focus:ring-[#FDCF17]"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{report.title}</div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(report.startDate), 'yyyy-MM-dd')} ~ {format(new Date(report.endDate), 'yyyy-MM-dd')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.locationName || 'All Locations'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => downloadReport(report.id)}
                        className="text-[#FDCF17] hover:text-[#e6bb14]"
                      >
                        <FiDownload className="inline-block mr-1" /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Reports; 