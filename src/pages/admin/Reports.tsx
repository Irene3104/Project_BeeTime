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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      // 삭제 전 확인 메시지
      const confirmDelete = window.confirm(
        `Are you sure you want to delete ${selectedReports.length} selected report(s)? This action cannot be undone.`
      );
      
      if (!confirmDelete) {
        return; // 사용자가 취소한 경우
      }
      
      setIsDeleting(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/time-records/reports/delete`, {
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
        
        console.log('Fetching reports from:', `${API_URL}/time-records/reports`);
        const headers = getAuthHeaders();
        console.log('Request headers:', headers);
        
        const response = await fetch(`${API_URL}/time-records/reports`, {
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
        console.log('Fetching locations from:', `${API_URL}/time-records/locations`);
        const headers = getAuthHeaders();
        console.log('Request headers for locations:', headers);
        
        const response = await fetch(`${API_URL}/time-records/locations`, {
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
        setError('시작일과 종료일을 모두 선택해주세요.');
        return;
      }
      
      const response = await fetch(`${API_URL}/time-records/reports/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          startDate,
          endDate,
          locationId: selectedLocation || undefined,
        }),
      });
      
      // 응답이 JSON 형식인지 확인
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { error: text };
        }
      }
      
      if (!response.ok) {
        // "No records found for the specified period" 오류 메시지를 사용자 친화적으로 변환
        if (data.error === "No records found for the specified period") {
          const locationText = selectedLocation 
            ? locations.find(loc => loc.id.toString() === selectedLocation)?.name || '선택한 위치'
            : '모든 위치';
            
          const formattedStartDate = format(new Date(startDate), 'yyyy년 MM월 dd일');
          const formattedEndDate = format(new Date(endDate), 'yyyy년 MM월 dd일');
          
          setError(`${locationText}에서 ${formattedStartDate}부터 ${formattedEndDate}까지의 기록이 존재하지 않습니다.`);
        } else {
          setError(data.error || '리포트 생성에 실패했습니다.');
        }
        return;
      }
      
      // JSON 응답 처리
      const newReport = data;
      
      // 리포트 목록 업데이트
      setReports(prevReports => [newReport, ...prevReports]);
      
      // 입력 필드 초기화
      setStartDate('');
      setEndDate('');
      setSelectedLocation('');
      
      // 성공 메시지 표시
      setError(null);
      setSuccessMessage('리포트가 성공적으로 생성되었습니다.');
      
    } catch (error: any) {
      console.error('Error generating report:', error);
      setError(error.message || '리포트 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // 리포트 다운로드 함수
  const downloadReport = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/time-records/reports/${id}/download`, {
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

  // 리포트 목록 새로고침 함수
  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching reports from:', `${API_URL}/time-records/reports`);
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_URL}/time-records/reports`, {
        headers: headers,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <h1 className="text-[32px] font-montserrat font-semibold">Attendance Reports</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-[20px] font-bold mb-4">Generate New Report</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
            
            <div>
              <button
                onClick={generateReport}
                disabled={isGenerating}
                className="w-full py-2 px-6 bg-[#FDCF17] text-black font-medium rounded-md hover:bg-[#e6bb14] flex items-center justify-center h-[42px]"
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
          
          {successMessage && (
            <div className="bg-green-100 text-green-700 p-3 rounded-md mt-4">
              {successMessage}
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-[20px] font-bold">Report List</h2>
            <div className="flex space-x-2">
              {selectedReports.length > 0 && (
                <>
                  <button
                    onClick={downloadSelectedReports}
                    className="py-1 px-3 md:py-2 md:px-4 text-sm md:text-base bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
                  >
                    <FiDownload className="mr-1" /> 
                    <span className="hidden xs:inline">Download</span> ({selectedReports.length})
                  </button>
                  <button
                    onClick={deleteSelectedReports}
                    disabled={isDeleting}
                    className="py-1 px-3 md:py-2 md:px-4 text-sm md:text-base bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
                  >
                    <FiTrash2 className="mr-1" /> 
                    <span className="hidden xs:inline">Delete</span> 
                    {isDeleting ? '...' : `(${selectedReports.length})`}
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
            <div className='overflow-x-auto'>
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
                        className="text-[#A18206] hover:text-[#e6bb14]"
                      >
                        <FiDownload className="inline-block mr-1" /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            </div>
            
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Reports; 