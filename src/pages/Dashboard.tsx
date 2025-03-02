import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BeeIcon from '../assets/logo_bee2.svg';
import CircleBg from '../assets/circle_bg.svg';
import { getCurrentNSWTime, formatNSWTime, formatNSWDate } from '../utils/dateTime';
import { QRScanner } from '../components/QRScanner';
import { Layout } from '../components/Layout';
import { BreakLevelControls } from '../components/BreakLevelControls';
import { API_URL } from '../config/constants';

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

// 확장된 액션 타입 정의
type ActionType = 
  'clockIn' | 'clockOut' | 
  'breakStart1' | 'breakEnd1' | 
  'breakStart2' | 'breakEnd2' | 
  'breakStart3' | 'breakEnd3';

export const Dashboard = () => {
  // Dashboard component for time tracking
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(getCurrentNSWTime());
  const [showScanner, setShowScanner] = useState<{ show: boolean; type: ActionType | null }>({ show: false, type: null });
  const [loading, setLoading] = useState<ActionType | null>(null);
  const [lastAction, setLastAction] = useState<{ type: ActionType; time: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [breakLevel, setBreakLevel] = useState<number>(1);
  const [timeRecord, setTimeRecord] = useState<any>(null);

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
        let mostRecentAction: { type: ActionType; time: string } | null = null;
        let mostRecentTimestamp = 0;
        
        Object.entries(actions).forEach(([type, action]: [string, any]) => {
          if (action.timestamp) {
            const timestamp = new Date(action.timestamp).getTime();
            if (timestamp > mostRecentTimestamp) {
              mostRecentTimestamp = timestamp;
              mostRecentAction = {
                type: type as ActionType,
                time: action.time
              };
            }
          }
        });
        
        if (mostRecentAction) {
          setLastAction(mostRecentAction);
        }

        // 저장된 액션에 따라 breakLevel 설정
        if (actions.breakStart2 || actions.breakEnd2) {
          setBreakLevel(Math.max(breakLevel, 2));
        }
        if (actions.breakStart3 || actions.breakEnd3) {
          setBreakLevel(Math.max(breakLevel, 3));
        }

      }
    } catch (error) {
      console.error("Error loading actions from localStorage:", error);
    }
  }, [userId]); // Re-run when userId changes

  // DB에서 가져온 오늘의 시간 기록 저장
  useEffect(() => {
    const fetchTodayTimeRecord = async () => {
      if (!userId) return;
      
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        // 오늘 날짜 가져오기 (DD-MM-YYYY 형식)
        const today = formatNSWDate(getCurrentNSWTime());
        
        const response = await fetch(`${API_URL}/api/time-entries/today`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Today's time record:", data);
          setTimeRecord(data);
          
          // 시간 기록이 있으면 localStorage 업데이트
          if (data) {
            updateLocalStorageFromTimeRecord(data);
          }
        }
      } catch (error) {
        console.error("Error fetching today's time record:", error);
      }
    };
    
    fetchTodayTimeRecord();
  }, [userId]);
  
  // DB 데이터를 기반으로 localStorage 업데이트
  const updateLocalStorageFromTimeRecord = (record: any) => {
    try {
      const storageKey = getUserStorageKey('lastActions');
      const actions: Record<string, any> = {};
      
      // ClockIn
      if (record.clockInTime) {
        actions['clockIn'] = {
          time: record.clockInTime,
          timestamp: new Date().toISOString() // 정확한 타임스탬프는 없으므로 현재 시간 사용
        };
      }
      
      // ClockOut
      if (record.clockOutTime) {
        actions['clockOut'] = {
          time: record.clockOutTime,
          timestamp: new Date().toISOString()
        };
      }
      
      // Break 1
      if (record.breakStartTime1) {
        actions['breakStart1'] = {
          time: record.breakStartTime1,
          timestamp: new Date().toISOString()
        };
      }
      if (record.breakEndTime1) {
        actions['breakEnd1'] = {
          time: record.breakEndTime1,
          timestamp: new Date().toISOString()
        };
      }
      
      // Break 2
      if (record.breakStartTime2) {
        actions['breakStart2'] = {
          time: record.breakStartTime2,
          timestamp: new Date().toISOString()
        };
        setBreakLevel(prev => Math.max(prev, 2)); // breakLevel 업데이트
      }
      if (record.breakEndTime2) {
        actions['breakEnd2'] = {
          time: record.breakEndTime2,
          timestamp: new Date().toISOString()
        };
        setBreakLevel(prev => Math.max(prev, 2));
      }
      
      // Break 3
      if (record.breakStartTime3) {
        actions['breakStart3'] = {
          time: record.breakStartTime3,
          timestamp: new Date().toISOString()
        };
        setBreakLevel(prev => Math.max(prev, 3));
      }
      if (record.breakEndTime3) {
        actions['breakEnd3'] = {
          time: record.breakEndTime3,
          timestamp: new Date().toISOString()
        };
        setBreakLevel(prev => Math.max(prev, 3));
      }
      
      // localStorage 업데이트
      localStorage.setItem(storageKey, JSON.stringify(actions));
      
      // 가장 최근 액션 찾기
      let mostRecentAction: { type: ActionType; time: string } | null = null;
      let mostRecentTimestamp = 0;
      
      Object.entries(actions).forEach(([type, action]: [string, any]) => {
        if (action.timestamp) {
          const timestamp = new Date(action.timestamp).getTime();
          if (timestamp > mostRecentTimestamp) {
            mostRecentTimestamp = timestamp;
            mostRecentAction = {
              type: type as ActionType,
              time: action.time
            };
          }
        }
      });
      
      if (mostRecentAction) {
        setLastAction(mostRecentAction);
      }
    } catch (error) {
      console.error("Error updating localStorage from DB record:", error);
    }
  };

  // NSW 시간대로 변환
  const nswTime = formatNSWTime(currentTime);
  const nswDate = formatNSWDate(currentTime);

  const handleScanClick = (type: ActionType) => {
    setLoading(type);
    setShowScanner({ show: true, type });
  };

  const handleScanComplete = async (data: any) => {
    // QR 스캐너에서 이미 처리된 결과 받기
    console.log("스캔 완료 데이터:", data);
    setShowScanner({ show: false, type: null });
    
    if (data && data.success) {
      // QR 스캐너에서 전달받은 데이터로 상태 업데이트
      const actionType = showScanner.type;
      if (actionType) {
        // 마지막 액션 업데이트
        setLastAction({
          type: actionType,
          time: data.time || formatNSWTime(new Date())
        });
        
        // timeRecord 상태 업데이트
        const updatedTimeRecord = { ...timeRecord } || {};
        
        // 액션 타입에 따라 필드 이름 결정
        const fieldMap: Record<ActionType, string> = {
          'clockIn': 'clockInTime',
          'clockOut': 'clockOutTime',
          'breakStart1': 'breakStartTime1',
          'breakEnd1': 'breakEndTime1',
          'breakStart2': 'breakStartTime2',
          'breakEnd2': 'breakEndTime2',
          'breakStart3': 'breakStartTime3',
          'breakEnd3': 'breakEndTime3'
        };
        
        // 해당 필드 업데이트
        updatedTimeRecord[fieldMap[actionType]] = data.time || formatNSWTime(new Date());
        setTimeRecord(updatedTimeRecord);
        
        // 성공 메시지 설정
        const actionMessages: Record<ActionType, string> = {
          clockIn: 'Clock In time successfully registered!',
          breakStart1: 'Break Start time successfully registered!',
          breakEnd1: 'Break End time successfully registered!',
          breakStart2: 'Second Break Start time successfully registered!',
          breakEnd2: 'Second Break End time successfully registered!',
          breakStart3: 'Third Break Start time successfully registered!',
          breakEnd3: 'Third Break End time successfully registered!',
          clockOut: 'Clock Out time successfully registered!'
        };
        
        setSuccessMessage(actionMessages[actionType] || 'Action successfully registered!');
      }
    } else if (data && data.error) {
      // 오류 메시지 설정
      setSuccessMessage(`Error: ${data.error}`);
    }
    
    // 로딩 상태 해제
    setLoading(null);
    
  };

  // Get button text based on last action
  const getButtonText = (type: ActionType) => {
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
  const getActionTitle = (type: ActionType) => {
    switch (type) {
      case 'clockIn': return 'Clock In';
      case 'breakStart1': return 'Break Start';
      case 'breakEnd1': return 'Break End';
      case 'breakStart2': return 'Break 2 Start';
      case 'breakEnd2': return 'Break 2 End';
      case 'breakStart3': return 'Break 3 Start';
      case 'breakEnd3': return 'Break 3 End';
      case 'clockOut': return 'Clock Out';
    }
  };

  // Determine if button should be disabled
  const isButtonDisabled = (type: ActionType): boolean => {
    // 현재 로딩 중인 경우
    if (loading === type) return true;
    
    // DB에서 가져온 데이터 확인
    if (timeRecord) {
      const fieldMap: Record<ActionType, string> = {
        'clockIn': 'clockInTime',
        'clockOut': 'clockOutTime',
        'breakStart1': 'breakStartTime1',
        'breakEnd1': 'breakEndTime1',
        'breakStart2': 'breakStartTime2',
        'breakEnd2': 'breakEndTime2',
        'breakStart3': 'breakStartTime3',
        'breakEnd3': 'breakEndTime3'
      };
      
      // 해당 필드에 값이 있으면 버튼 비활성화
      if (timeRecord[fieldMap[type]]) {
        return true;
      }
    }
    
    // localStorage 확인 (백업 로직)
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

   // 휴식 레벨 증가 함수
   const increaseBreakLevel = () => {
    if (breakLevel < 3) {
      setBreakLevel(breakLevel + 1);
    }
  };

  // 휴식 레벨 감소 함수
  const decreaseBreakLevel = () => {
    if (breakLevel > 1) {
      setBreakLevel(breakLevel - 1);
    }
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
    <Layout>
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
      <div className="w-full max-w-[320px] mx-auto px-4 mt-8">
        {/* 첫 번째 행: Clock In, Break Start */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button 
            onClick={() => !isButtonDisabled('clockIn') && handleScanClick('clockIn')}
            disabled={isButtonDisabled('clockIn')}
            className={`${isButtonDisabled('clockIn') ? 'bg-gray-400' : 'bg-[#FDCF17]'} text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full`}
          >
            {getButtonText('clockIn')}
          </button>

          <button 
            onClick={() => !isButtonDisabled('breakStart1') && handleScanClick('breakStart1')}
            disabled={isButtonDisabled('breakStart1')}
            className={`${isButtonDisabled('breakStart1') ? 'bg-gray-400' : 'bg-[#A07907]'} text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full`}
          >
            {getButtonText('breakStart1')}
          </button>
        </div>
        
        {/* 두 번째 행: Break End, Clock Out (breakLevel = 1일 때) 또는 Break-2 Start (breakLevel >= 2일 때) */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button 
            onClick={() => !isButtonDisabled('breakEnd1') && handleScanClick('breakEnd1')}
            disabled={isButtonDisabled('breakEnd1')}
            className={`${isButtonDisabled('breakEnd1') ? 'bg-gray-400' : 'bg-[#A07907]'} text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full`}
          >
            {getButtonText('breakEnd1')}
          </button>

          {breakLevel === 1 ? (
            <button 
              onClick={() => !isButtonDisabled('clockOut') && handleScanClick('clockOut')}
              disabled={isButtonDisabled('clockOut')}
              className={`${isButtonDisabled('clockOut') ? 'bg-gray-400' : 'bg-[#FDCF17]'} text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full`}
            >
              {getButtonText('clockOut')}
            </button>
          ) : (
            <button 
              onClick={() => !isButtonDisabled('breakStart2') && handleScanClick('breakStart2')}
              disabled={isButtonDisabled('breakStart2')}
              className={`${isButtonDisabled('breakStart2') ? 'bg-gray-400' : 'bg-[#C9A55F]'} text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full`}
            >
              {getButtonText('breakStart2')}
            </button>
          )}
        </div>
        
        {/* 세 번째 행: Break-2 End, Clock Out (breakLevel = 2일 때) 또는 Break-3 Start (breakLevel = 3일 때) */}
        {breakLevel >= 2 && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button 
              onClick={() => !isButtonDisabled('breakEnd2') && handleScanClick('breakEnd2')}
              disabled={isButtonDisabled('breakEnd2')}
              className={`${isButtonDisabled('breakEnd2') ? 'bg-gray-400' : 'bg-[#C9A55F]'} text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full`}
            >
              {getButtonText('breakEnd2')}
            </button>

            {breakLevel === 2 ? (
              <button 
                onClick={() => !isButtonDisabled('clockOut') && handleScanClick('clockOut')}
                disabled={isButtonDisabled('clockOut')}
                className={`${isButtonDisabled('clockOut') ? 'bg-gray-400' : 'bg-[#FDCF17]'} text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full`}
              >
                {getButtonText('clockOut')}
              </button>
            ) : (
              <button 
                onClick={() => !isButtonDisabled('breakStart3') && handleScanClick('breakStart3')}
                disabled={isButtonDisabled('breakStart3')}
                className={`${isButtonDisabled('breakStart3') ? 'bg-gray-400' : 'bg-[#A07907]'} text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full`}
              >
                {getButtonText('breakStart3')}
              </button>
            )}
          </div>
        )}
        
        {/* 네 번째 행: Break-3 End, Clock Out (breakLevel = 3일 때만) */}
        {breakLevel === 3 && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button 
              onClick={() => !isButtonDisabled('breakEnd3') && handleScanClick('breakEnd3')}
              disabled={isButtonDisabled('breakEnd3')}
              className={`${isButtonDisabled('breakEnd3') ? 'bg-gray-400' : 'bg-[#A07907]'} text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full`}
            >
              {getButtonText('breakEnd3')}
            </button>

            <button 
              onClick={() => !isButtonDisabled('clockOut') && handleScanClick('clockOut')}
              disabled={isButtonDisabled('clockOut')}
              className={`${isButtonDisabled('clockOut') ? 'bg-gray-400' : 'bg-[#FDCF17]'} text-white rounded-3xl font-montserrat font-semibold flex flex-col items-center justify-center h-[100px] w-full`}
            >
              {getButtonText('clockOut')}
            </button>
          </div>
        )}
      </div>
      
      {/* +/- 버튼 */}
      <BreakLevelControls 
        breakLevel={breakLevel}
        onIncrease={increaseBreakLevel}
        onDecrease={decreaseBreakLevel}
      />

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

      {/* Reset button (for testing) */}
      <div className="mt-8">
                <button 
                  onClick={resetAllActions}
                  className="text-xs text-gray-500 underline"
                >
                  Reset All Actions
                </button>
              </div>
    </Layout>
  );
};