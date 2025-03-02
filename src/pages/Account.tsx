import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Logo from '../assets/logo_bee3.png';
import EditIcon from '../assets/edit.png';
import HomeIcon from '../assets/home.png';
import UserIcon from '../assets/user.png';
import TimeIcon from '../assets/time.png';
import LogoutIcon from '../assets/logout.png';
import CancelIcon from '../assets/red_btn_cancel.png';
import MenuCancelIcon from '../assets/btn_icon_cancel.png';
import HomeIconHover from '../assets/home_hover.png';
import UserIconHover from '../assets/user_hover.png';
import TimeIconHover from '../assets/time_hover.png';
import { Layout } from '../components/Layout';
import { API_URL } from '../config/constants';

// 사용자 정보 인터페이스 정의
interface UserInfo {
  name: string;
  email: string;
  location: {
    name: string;
  };
}

interface Location {
  id: string;
  name: string;
  branch?: string;
}

export const Account: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isEditing, setIsEditing] = useState<'name' | 'email' | 'workPlace' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        console.log('=== 디버깅 정보 ===');
        console.log('1. 토큰:', token);
        console.log('2. API_URL:', API_URL);
        
        const response = await fetch(`${API_URL}/user/info`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('3. Response status:', response.status);
        const jsonData = await response.json();
        console.log('4. Parsed data:', jsonData);
        
        setUserInfo(jsonData);
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setError('Failed to load user information');
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  // 근무지 정보 가져오기
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch(`${API_URL}/locations`);
        const data = await response.json();
        setLocations(data);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };
    fetchLocations();
  }, []);

  if (loading) {
    return <Layout><div className="flex justify-center items-center min-h-screen">Loading...</div></Layout>;
  }

  // 사용자 정보 업데이트 함수
  const handleEdit = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      let updateData = {};
      if (isEditing === 'name') {
        updateData = { name: editValue };
      } else if (isEditing === 'workPlace') {
        const selectedLocation = locations.find(loc => loc.name === editValue);
        if (!selectedLocation) {
          throw new Error('Failed to find selected location.');
        }
        updateData = { locationId: parseInt(selectedLocation.id) };
      }

      const response = await fetch(`${API_URL}/user/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Failed to update user information.');
      }

      const updatedUser = await response.json();
      
      setUserInfo(prev => ({
        ...prev!,
        name: updatedUser.name,
        location: {
          name: updatedUser.location?.name || ''
        }
      }));
      
      setIsEditing(null);
    } catch (error) {
      console.error('Error updating user info:', error);
      alert('Failed to update user information.');
    }
  };

  // 계정 삭제 함수
  const handleDeleteAccount = async () => {
    if (window.confirm('Deleting your account will permanently remove all your data.\nAre you sure you want to delete your account?')) {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          throw new Error('No token found');
        }

        const response = await fetch(`${API_URL}/user/delete`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete account.');
        }

        localStorage.clear();
        sessionStorage.clear();
        
        alert('Your account has been successfully deleted.');
        navigate('/login');
      } catch (error: any) {
        console.error('Error deleting account:', error);
        alert(error.message || 'An error occurred while deleting the account.');
      }
    }
  };

  // 로그아웃 함수
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <Layout>
      <div className="flex flex-col min-h-screen w-full max-w-md mx-auto">
        {/* 로고 및 타이틀 */}
        <div className="flex flex-col items-center justify-center py-6">
          <img src={Logo} alt="Bee Time Logo" className="h-16 w-16 mb-3" />
          <h1 className="text-[18pt] font-bold font-fredoka">My Account</h1>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-500 text-center">
            {error}
          </div>
        )}

        {/* 계정 정보 카드들 */}
        <div className="space-y-6 px-6">
          <div className="bg-white rounded-3xl p-6 shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center">
              <div className="text-gray-600 font-bold">Email:</div>
              <div className="flex-1 ml-2">
                <span className="font-montserrat">{userInfo?.email || '-'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center">
              <div className="text-gray-600 font-bold">Name:</div>
              {isEditing === 'name' ? (
                <div className="flex items-center gap-2 flex-1 ml-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <button onClick={handleEdit} className="text-green-600">
                    <img src={EditIcon} alt="save" className="w-6 h-6" />
                  </button>
                  <button onClick={() => setIsEditing(null)} className="text-red-600">
                    <img src={CancelIcon} alt="cancel" className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center flex-1 ml-2">
                  <span className="font-montserrat">{userInfo?.name || '-'}</span>
                  <button onClick={() => {
                    setIsEditing('name');
                    setEditValue(userInfo?.name || '');
                  }}>
                    <img src={EditIcon} alt="edit" className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center">
              <div className="text-gray-600 font-bold">Work Place:</div>
              {isEditing === 'workPlace' ? (
                <div className="flex items-center gap-2 flex-1 ml-2">
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 appearance-none"
                  >
                    <option value="" disabled>Select Work Place</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.name}>
                        {location.name} {location.branch ? `(${location.branch})` : ''}
                      </option>
                    ))}
                  </select>
                  <button onClick={handleEdit} className="text-green-600">
                    <img src={EditIcon} alt="save" className="w-6 h-6" />
                  </button>
                  <button onClick={() => setIsEditing(null)} className="text-red-600">
                    <img src={CancelIcon} alt="cancel" className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center flex-1 ml-2">
                  <span className="font-montserrat">{userInfo?.location?.name || '-'}</span>
                  <button onClick={() => {
                    setIsEditing('workPlace');
                    setEditValue(userInfo?.location?.name || '');
                  }}>
                    <img src={EditIcon} alt="edit" className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Account 버튼 */}
        <div className="mt-auto mb-10 text-center">
          <button
            onClick={handleDeleteAccount}
            className="text-[#B17F4A] font-montserrat text-lg hover:underline"
          >
            Delete Account
          </button>
        </div>
      </div>
    </Layout>
  );
};