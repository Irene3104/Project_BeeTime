import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BeeIcon from '../assets/logo_bee2.svg';
import MenuIcon from '../assets/btn_icon_menu.png';
import HomeIcon from '../assets/home.png';
import UserIcon from '../assets/user.png';
import TimeIcon from '../assets/time.png';
import LogoutIcon from '../assets/logout.png';
import CancelIcon from '../assets/btn_icon_cancel.png';
import HomeIconHover from '../assets/home_hover.png';
import UserIconHover from '../assets/user_hover.png';
import TimeIconHover from '../assets/time_hover.png';
import CircleBg from '../assets/circle_bg.svg';
import { getCurrentNSWTime, formatNSWTime, formatNSWDate } from '../utils/dateTime';
import { QRScanner } from '../components/QRScanner';

// Helper function to get current user ID
const getCurrentUserId = (): string | null => {
  // Try to get user from localStorage or sessionStorage
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.id || null;
    } catch (e) {
      console.error("Error parsing user data:", e);
    }
  }
  
  // If user object not found, try to extract from token
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    try {
      // Simple JWT parsing (not secure but works for basic extraction)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      return payload.id || null;
    } catch (e) {
      console.error("Error extracting user ID from token:", e);
    }
  }
  
  return null;
};

// Helper function to get user-specific localStorage key
const getUserStorageKey = (key: string): string => {
  const userId = getCurrentUserId();
  return userId ? `${key}_${userId}` : key;
};

export const Dashboard = () => {
  // Dashboard component for time tracking
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(getCurrentNSWTime());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showScanner, setShowScanner] = useState<{ show: boolean; type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut' | null }>({ show: false, type: null });
  const [loading, setLoading] = useState<'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut' | null>(null);
  const [lastAction, setLastAction] = useState<{ type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut'; time: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Set user ID on component mount
  useEffect(() => {
    const currentUserId = getCurrentUserId();
    setUserId(currentUserId);
    console.log("Current user ID:", currentUserId);
  }, []);

  // 시간 업데이트 (1초마다)
  useEffect(() => {
      const timer = setInterval(() => {
          setCurrentTime(getCurrentNSWTime());
      }, 1000);
      return () => clearInterval(timer);
  }, []);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load last actions from localStorage
  useEffect(() => {
    try {
      const storageKey = getUserStorageKey('lastActions');
      const storedActions = localStorage.getItem(storageKey);
      if (storedActions) {
        const actions = JSON.parse(storedActions);
        console.log("Loaded actions from localStorage:", actions);
        
        // Find the most recent action
        let mostRecentAction: { type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut'; time: string } | null = null;
        let mostRecentTimestamp = 0;
        
        Object.entries(actions).forEach(([type, action]: [string, any]) => {
          if (action.timestamp) {
            const timestamp = new Date(action.timestamp).getTime();
            if (timestamp > mostRecentTimestamp) {
              mostRecentTimestamp = timestamp;
              mostRecentAction = {
                type: type as 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut',
                time: action.time
              };
            }
          }
        });
        
        if (mostRecentAction) {
          setLastAction(mostRecentAction);
        }
      }
    } catch (error) {
      console.error("Error loading actions from localStorage:", error);
    }
  }, [userId]); // Re-run when userId changes

  // NSW 시간대로 변환
  const nswTime = formatNSWTime(currentTime);
  const nswDate = formatNSWDate(currentTime);

  const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      navigate('/login');
  };

  const handleScanClick = (type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut') => {
    setLoading(type);
    setShowScanner({ show: true, type });
  };

  const handleScanComplete = (data: any) => {
    // Handle the scan result
    console.log("Scan complete with data:", data);
    setShowScanner({ show: false, type: null });
    
    // Update last action with current time
    if (showScanner.type) {
      const actionType = showScanner.type;
      
      // Use the timestamp from the scan data if available, otherwise use current time
      let timeToUse = getCurrentNSWTime();
      if (data && data.timestamp) {
        try {
          // Parse the timestamp from the scan data
          timeToUse = new Date(data.timestamp);
          console.log("Using timestamp from scan data:", timeToUse);
        } catch (error) {
          console.error("Error parsing timestamp from scan data:", error);
        }
      }
      
      const currentTimeStr = formatNSWTime(timeToUse);
      
      // Update last action state
      setLastAction({
        type: actionType,
        time: currentTimeStr
      });
      
      // Store the action in localStorage to persist between refreshes
      try {
        const storageKey = getUserStorageKey('lastActions');
        const storedActions = localStorage.getItem(storageKey) 
          ? JSON.parse(localStorage.getItem(storageKey) || '{}') 
          : {};
        
        storedActions[actionType] = {
          type: actionType,
          time: currentTimeStr,
          timestamp: timeToUse.toISOString()
        };
        
        localStorage.setItem(storageKey, JSON.stringify(storedActions));
        console.log("Stored action in localStorage:", storedActions);
      } catch (error) {
        console.error("Error storing action in localStorage:", error);
      }
      
      // Set success message
      const actionMessages = {
        clockIn: 'Clock In successful!',
        breakStart: 'Break Start recorded successfully!',
        breakEnd: 'Break End recorded successfully!',
        clockOut: 'Clock Out successful!'
      };
      
      const message = actionMessages[actionType] || 'Action recorded successfully!';
      setSuccessMessage(message);
    }
    
    // Clear loading state
    setLoading(null);
  };

  // Get button text based on last action
  const getButtonText = (type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut') => {
    // Check if we have stored actions in localStorage
    try {
      const storageKey = getUserStorageKey('lastActions');
      const storedActions = localStorage.getItem(storageKey);
      if (storedActions) {
        const actions = JSON.parse(storedActions);
        if (actions[type]) {
          return (
            <>
              <span className="text-lg">{getActionTitle(type)}</span>
              <span className="text-sm">{actions[type].time}</span>
            </>
          );
        }
      }
    } catch (error) {
      console.error("Error reading stored actions:", error);
    }
    
    // If this is the last action, show the time
    if (lastAction && lastAction.type === type) {
      return (
        <>
          <span className="text-lg">{getActionTitle(type)}</span>
          <span className="text-sm">{lastAction.time}</span>
        </>
      );
    }
    
    // Default text
    return <span className="text-lg">{getActionTitle(type)}</span>;
  };
  
  // Get action title
  const getActionTitle = (type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut') => {
    switch (type) {
      case 'clockIn': return 'Clock In';
      case 'breakStart': return 'Break Start';
      case 'breakEnd': return 'Break End';
      case 'clockOut': return 'Clock Out';
    }
  };

  // Determine if button should be disabled
  const isButtonDisabled = (type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut'): boolean => {
    // Check if this button is currently loading
    if (loading === type) return true;
    
    // Check if this is the last action
    if (lastAction && lastAction.type === type) return true;
    
    // Check localStorage for completed actions
    try {
      const storageKey = getUserStorageKey('lastActions');
      const storedActions = localStorage.getItem(storageKey);
      if (storedActions) {
        const actions = JSON.parse(storedActions);
        if (actions[type]) return true;
      }
    } catch (error) {
      console.error("Error checking stored actions:", error);
    }
    
    return false;
  };

  // Function to reset all actions (for testing)
  const resetAllActions = () => {
    if (userId) {
      const storageKey = getUserStorageKey('lastActions');
      localStorage.removeItem(storageKey);
      setLastAction(null);
      setSuccessMessage('All actions have been reset');
    }
  };

  return (
      <div className="min-h-screen bg-[#FFFBF6] relative">
          {/* 햄버거 메뉴 버튼 */}
          <button 
              className={`absolute top-6 right-6 z-50 ${isMenuOpen ? 'hidden' : ''}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
              <img src={MenuIcon} alt="menu" className="w-12 h-12" />
          </button>

          {/* 사이드 메뉴 */}
          {isMenuOpen && (
              <div className="fixed top-0 right-0 h-full w-full md:w-[375px] bg-[#A77750] shadow-lg z-40">
                  {/* 닫기 버튼 */}
                  <button 
                      className="absolute top-6 right-6 z-50"
                      onClick={() => setIsMenuOpen(false)}
                  >
                      <img src={CancelIcon} alt="close" className="w-8 h-8" />
                  </button>

                  {/* 메뉴 컨테이너 - flex-col과 h-full을 사용하여 수직 정렬 제어 */}
                  <div className="flex flex-col h-full pt-40 px-0">
                      {/* 상단 메뉴 아이템들 */}
                      <div className="space-y-5">
                          <div 
                              className="flex items-center p-8 hover:bg-[#FFE26C] group cursor-pointer  px-20"
                              onClick={() => navigate('/dashboard')}
                          >
                              <img src={HomeIcon} alt="home" className="w-6 h-6 mr-4 group-hover:hidden" />
                              <img src={HomeIconHover} alt="home" className="w-6 h-6 mr-4 hidden group-hover:block" />
                              <span className="text-white group-hover:text-black font-montserrat font-medium text-lg">Home</span>
                          </div>
                          <div 
                              className="flex items-center p-8 hover:bg-[#FFE26C] group cursor-pointer px-20"
                              onClick={() => navigate('/account')}
                          >
                              <img src={UserIcon} alt="account" className="w-6 h-6 mr-4 group-hover:hidden" />
                              <img src={UserIconHover} alt="account" className="w-6 h-6 mr-4 hidden group-hover:block" />
                              <span className="text-white group-hover:text-black font-montserrat font-medium text-lg">Account</span>
                          </div>
                          <div 
                              className="flex items-center p-8 hover:bg-[#FFE26C] group cursor-pointer px-20"
                              onClick={() => navigate('/time-activity')}
                          >
                              <img src={TimeIcon} alt="time" className="w-6 h-6 mr-4 group-hover:hidden" />
                              <img src={TimeIconHover} alt="time" className="w-6 h-6 mr-4 hidden group-hover:block" />
                              <span className="text-white group-hover:text-black font-montserrat font-medium text-lg">Time Activity</span>
                          </div>
                      </div>

                      {/* 로그아웃 버튼 - mt-auto로 하단에 고정 */}
                      <div 
                          className="mt-auto mb-10 flex items-center p-4 cursor-pointer rounded-2xl px-20"
                          onClick={handleLogout}
                      >
                          <img src={LogoutIcon} alt="logout" className="w-6 h-6 mr-4" />
                          <span className="text-[#FFE26C] font-montserrat font-medium text-lg">Logout</span>
                      </div>
                  </div>
              </div>
          )}

          {/* 메인 컨텐츠 */}
          <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#F7E3CA] pt-20">
              {/* Success message */}
              {successMessage && (
                <div className="fixed top-20 left-0 right-0 mx-auto w-full max-w-md bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">✓</span>
                    <span>{successMessage}</span>
                  </div>
                  <button 
                    onClick={() => setSuccessMessage(null)}
                    className="text-green-700"
                  >
                    ×
                  </button>
                </div>
              )}
              
              {/* 시계 영역 - 원형 배경 추가 */}
              <div className="relative text-center m-10">
                  {/* 배경 원 - 크기 조정 */}
                  <img 
                      src={CircleBg} 
                      alt="background" 
                      className="w-[250px] h-[250px] object-contain"
                  />
                  {/* 꿀벌 로고 아이콘 */}
                  <img 
                      src={BeeIcon} 
                      alt="bee" 
                      className="absolute w-30 h-30 left-1/2 -translate-x-1/2 -top-12"
                  />
                  {/* 시계 컨텐츠 */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full">
                      <h2 className="text-[#B17F4A] text-xl mb-8 font-montserrat">Current Time</h2>
                      <div className="text-6xl font-montserrat mb-4">{nswTime}</div>
                      <div className="text-xl font-montserrat">{nswDate}</div>
                  </div>
              </div>

              {/* 버튼 그리드 */}
              <div className="grid grid-cols-2 gap-4 w-full max-w-[320px] mx-auto px-4">
                  <button 
                    onClick={() => !isButtonDisabled('clockIn') && handleScanClick('clockIn')}
                    disabled={isButtonDisabled('clockIn')}
                    className={`${isButtonDisabled('clockIn') ? 'bg-gray-400' : 'bg-[#FDCF17]'} text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full`}
                  >
                    {getButtonText('clockIn')}
                  </button>

                  <button 
                    onClick={() => !isButtonDisabled('breakStart') && handleScanClick('breakStart')}
                    disabled={isButtonDisabled('breakStart')}
                    className={`${isButtonDisabled('breakStart') ? 'bg-gray-400' : 'bg-[#A07907]'} text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full`}
                  >
                    {getButtonText('breakStart')}
                  </button>

                  <button 
                    onClick={() => !isButtonDisabled('breakEnd') && handleScanClick('breakEnd')}
                    disabled={isButtonDisabled('breakEnd')}
                    className={`${isButtonDisabled('breakEnd') ? 'bg-gray-400' : 'bg-[#A07907]'} text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full`}
                  >
                    {getButtonText('breakEnd')}
                  </button>

                  <button 
                    onClick={() => !isButtonDisabled('clockOut') && handleScanClick('clockOut')}
                    disabled={isButtonDisabled('clockOut')}
                    className={`${isButtonDisabled('clockOut') ? 'bg-gray-400' : 'bg-[#FDCF17]'} text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full`}
                  >
                    {getButtonText('clockOut')}
                  </button>
              </div>
              
              {/* Reset button (for testing) */}
              <div className="mt-8">
                <button 
                  onClick={resetAllActions}
                  className="text-xs text-gray-500 underline"
                >
                  Reset All Actions
                </button>
              </div>
          </div>

          {showScanner.show && (
            <QRScanner
              type={showScanner.type!}
              onClose={() => {
                setShowScanner({ show: false, type: null });
                setLoading(null);
              }}
              onScan={handleScanComplete}
            />
          )}
      </div>
  );
};