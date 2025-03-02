import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { API_URL } from '../config/constants';
import { useNavigate } from 'react-router-dom';

type ActionType = 'clockIn' | 'clockOut' | 'breakStart1' | 'breakEnd1' | 'breakStart2' | 'breakEnd2' | 'breakStart3' | 'breakEnd3';

// QR 스캐너 컴포넌트 속성 정의
interface QRScannerProps {
  type: ActionType
  onClose: () => void;
  onScan: (data: any) => void;
  offlineMode?: boolean;
  debugMode?: boolean;
  skipLocationCheck?: boolean;
}




export const QRScanner: React.FC<QRScannerProps> = ({ type, onClose, onScan, offlineMode = false, debugMode = false, skipLocationCheck = false }) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<{ message: string; data: any } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [forcedDebugMode, setForcedDebugMode] = useState(false);
  
  // 중복 스캔 방지를 위한 참조
  const lastScannedCode = useRef<string | null>(null);
  const scanCooldown = useRef<boolean>(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader';
  
  // 타입별 타이틀 정의
  const titles = {
    clockIn: 'Clock In',
    breakStart1: 'Break Start',
    breakEnd1: 'Break End',
    breakStart2: 'Break2 Start',
    breakEnd2: 'Break2 End',
    breakStart3: 'Break3 Start',
    breakEnd3: 'Break3 End',
    clockOut: 'Clock Out'
  };
  
  // 컴포넌트 마운트 시 스캐너 초기화
  useEffect(() => {
    // URL 파라미터에서 디버그 모드 확인
    const urlParams = new URLSearchParams(window.location.search);
    const debugParam = urlParams.get('debug');
    const skipLocationParam = urlParams.get('skipLocation');
    
    if (debugParam === 'true') {
      console.log('디버그 모드 활성화 (URL 파라미터)');
      setDebugMode(true);
      setForcedDebugMode(true);
    }
    
    if (skipLocationParam === 'true') {
      console.log('위치 확인 건너뛰기 활성화 (URL 파라미터)');
      setSkipLocationCheck(true);
    }
    
    // 스캐너 초기화
    startScanning();
    
    // 컴포넌트 언마운트 시 스캐너 정리
    return () => {
      stopScanning();
    };
  }, []);
  
  // 스캐너 시작 함수
  const startScanning = () => {
    if (scannerRef.current) {
      stopScanning();
    }
    
    try {
      // 기존 스캐너 컨테이너 내부의 모든 요소 제거
      const container = document.getElementById(scannerContainerId);
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
      
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;
      
      // 스캔 영역 크기를 카메라 화면에 맞게 조정
      // 화면 크기의 70%로 설정하여 카메라 안에 들어가도록 함
      const screenWidth = Math.min(window.innerWidth, 500); // 최대 너비 제한
      const qrboxSize = Math.floor(screenWidth * 0.7);
      
      const config = {
        fps: 10,
        qrbox: { width: qrboxSize, height: qrboxSize },
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
        // 비디오 요소 스타일 직접 설정
        videoConstraints: {
          width: { ideal: screenWidth },
          height: { ideal: screenWidth * 1.2 },
          facingMode: "environment"
        }
      };
      
      html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
      ).catch(err => {
        console.error("카메라 시작 오류:", err);
        setScanError("카메라를 시작할 수 없습니다. 권한을 확인해주세요.");
      });
      
      // 비디오 요소 스타일 직접 조정
      setTimeout(() => {
        const videoElement = container?.querySelector('video');
        if (videoElement) {
          videoElement.style.objectFit = 'cover';
          videoElement.style.width = '100%';
          videoElement.style.height = '100%';
          videoElement.style.borderRadius = '8px';
        }
      }, 500);
    } catch (error) {
      console.error('스캐너 초기화 오류:', error);
      setScanError('카메라를 시작할 수 없습니다. 카메라 권한을 확인해주세요.');
    }
  };
  
  // 스캐너 중지 함수
  const stopScanning = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop()
        .catch(error => console.error('스캐너 중지 오류:', error));
      scannerRef.current = null;
    }
  };
  
  // 스캔 성공 핸들러
  const onScanSuccess = async (decodedText: string) => {
    // 이미 처리 중이거나 스캔 쿨다운 중이면 무시
    if (isProcessing || scanCooldown.current) {
      console.log('스캔 처리 중 또는 쿨다운 중, 무시됨');
      return;
    }

    // 마지막 스캔 코드와 동일하면 무시
    if (lastScannedCode.current === decodedText) {
      console.log('동일한 QR 코드 스캔 무시');
      return;
    }

    try {
      setIsProcessing(true);
      scanCooldown.current = true;
      lastScannedCode.current = decodedText;

      console.log('QR 코드 스캔 성공:', decodedText);
      
      // QR 코드 처리 로직...
      const qrLocation = await parseQRLocation(decodedText);
      if (!qrLocation) {
        throw new Error('QR 코드 파싱 실패');
      }
      
      // skipLocationCheck가 true인 경우에만 위치 확인을 건너뛰고, 
      // 디버그 모드와 상관없이 위치 확인 수행
      if (!skipLocationCheck) {
        try {
          // 사용자의 현재 위치 가져오기
          const position = await getCurrentPosition();
          const userLatitude = position.coords.latitude;
          const userLongitude = position.coords.longitude;
          
          // QR 코드 위치와 사용자 위치 간의 거리 계산 (미터 단위)
          const distance = calculateDistance(
            userLatitude, 
            userLongitude,
            qrLocation.latitude, 
            qrLocation.longitude
          );
          
          console.log(`사용자 위치: ${userLatitude}, ${userLongitude}`);
          console.log(`QR 코드 위치: ${qrLocation.latitude}, ${qrLocation.longitude}`);
          console.log(`거리: ${distance.toFixed(2)}m`);
          
          // 허용 거리 (예: 100미터)
          const MAX_ALLOWED_DISTANCE = 100; // 미터 단위
          
          if (distance > MAX_ALLOWED_DISTANCE) {
            throw new Error(`현재 위치가 QR 코드 위치에서 너무 멉니다 (${distance.toFixed(0)}m). 근처에서 다시 시도하세요.`);
          }
        } catch (locationError) {
          if (locationError instanceof Error && locationError.message.includes('현재 위치가 QR 코드 위치에서 너무 멉니다')) {
            throw locationError; // 위치 거리 오류는 그대로 전달
          }
          console.error('위치 확인 오류:', locationError);
          throw new Error('위치 정보를 확인할 수 없습니다. 위치 권한을 확인하고 다시 시도하세요.');
        }
      } else {
        console.log('위치 확인 건너뜀 (skipLocationCheck가 true)');
      }

      // 스캐너 즉시 중지
      if (scannerRef.current) {
        await scannerRef.current.stop();
      }

      // 시간 기록 생성
      const data = await createTimeEntry(type, qrLocation.placeId, {
        latitude: qrLocation.latitude,
        longitude: qrLocation.longitude
      });

      // 성공 처리
      onScan(data);
      
      // 1초 후 창 닫기
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      console.error('QR 스캔 처리 오류:', error);
      setScanError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      // 3초 후에 쿨다운 해제
      setTimeout(() => {
        scanCooldown.current = false;
        setIsProcessing(false);
      }, 3000);
    }
  };
  
  // 스캔 실패 핸들러
  const onScanFailure = (error: any) => {
    // 일반적인 스캔 실패는 무시 (지속적으로 스캔 시도)
    // console.error('스캔 실패:', error);
  };
  
  // 현재 위치 가져오기
  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('이 브라우저에서는 위치 정보를 지원하지 않습니다.'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
    });
  };
  
  // 두 지점 간의 거리 계산 (Haversine 공식)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // 지구 반경 (미터)
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 미터 단위 거리
  };
  
  // QR 코드에서 위치 정보 파싱
  const parseQRLocation = async (qrData: string): Promise<{ placeId: string, latitude: number, longitude: number } | null> => {
    try {
      console.log('파싱 시도할 QR 데이터:', qrData);
      
      if (typeof qrData === 'string' && qrData.trim().startsWith('Ch')) {
        console.log('Google Place ID 감지:', qrData);
        
        try {
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          const response = await fetch(`${API_URL}/api/time-entries/places/${qrData.trim()}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Place API 응답 오류: ${response.status}`);
          }
          
          const placeData = await response.json();
          console.log('Place API 응답:', placeData);
          
          if (!placeData.latitude || !placeData.longitude) {
            throw new Error('위치 정보가 없습니다');
          }
          
          return {
            placeId: qrData.trim(),
            latitude: placeData.latitude,
            longitude: placeData.longitude
          };
        } catch (error) {
          console.error('Place ID 조회 오류:', error);
          throw new Error('위치 정보를 가져올 수 없습니다');
        }
      }
      
      throw new Error('지원되지 않는 QR 코드 형식입니다');
    } catch (error) {
      console.error('QR 코드 파싱 오류:', error);
      throw error;
    }
  };
  
  // 닫기 버튼 핸들러
  const handleClose = () => {
    stopScanning();

  // 카메라 스트림 명시적으로 중지
  if (scannerRef.current) {
    scannerRef.current.clear();
  }
    onClose();
  };
  
  // 성공 후 닫기 핸들러
  const handleSuccessClose = () => {
    if (scanSuccess) {
      onScan(scanSuccess.data);
    }
    handleClose();
  };
  
  // 재시도 버튼 핸들러
  const handleRetry = () => {
    setScanError(null);
    setScanSuccess(null);
    setIsProcessing(false);
    scanCooldown.current = false;
    lastScannedCode.current = null;
    startScanning();
  };
  
  // 시간 기록 생성 함수 수정
  const createTimeEntry = async (type: ActionType, placeId: string, location: { latitude: number, longitude: number, accuracy?: number }): Promise<any> => {
    try {
      // 현재 시간 포맷팅 (HH:MM)
      const now = new Date();
      const formattedTime = now.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      // 현재 날짜 포맷팅 (DD-MM-YYYY)
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;
      
      // 요청 데이터 준비
      let requestData: any = {
        type: type,
        time: formattedTime,
        date: formattedDate,
        placeId: placeId
      };
      
      // 휴식 종료일 경우 휴식 시간 계산 추가
      if (type === 'breakEnd1' || type === 'breakEnd2' || type === 'breakEnd3') {
        // 휴식 번호 추출 (1, 2, 3)
        const breakNumber = type.charAt(type.length - 1);
        
        // 해당 휴식의 시작 시간 가져오기
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        const storageKey = `user_${userId}_lastActions`;
        const storedActionsStr = localStorage.getItem(storageKey) || '{}';
        const storedActions = JSON.parse(storedActionsStr);
        
        // 시작 시간이 있는지 확인
        const startType = `breakStart${breakNumber}` as ActionType;
        const startAction = storedActions[startType];
        
        if (startAction && startAction.time) {
          // 시작 시간과 현재 시간을 Date 객체로 변환
          const startParts = startAction.time.split(':');
          const startDate = new Date();
          startDate.setHours(parseInt(startParts[0], 10));
          startDate.setMinutes(parseInt(startParts[1], 10));
          
          const endParts = formattedTime.split(':');
          const endDate = new Date();
          endDate.setHours(parseInt(endParts[0], 10));
          endDate.setMinutes(parseInt(endParts[1], 10));
          
          // 날짜가 바뀌었을 경우를 고려 (예: 23:50에 시작해서 00:10에 종료)
          let timeDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60); // 분 단위
          if (timeDiff < 0) {
            timeDiff += 24 * 60; // 하루(24시간)를 분으로 추가
          }
          
          // 휴식 시간 추가
          requestData.breakMinutes = Math.round(timeDiff);
          console.log(`Break ${breakNumber} minutes calculated:`, requestData.breakMinutes);
        }
      }
      
      console.log('서버로 보내는 데이터:', JSON.stringify(requestData, null, 2));
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!API_URL) {
        console.warn('API_URL is temporarily undefined, retrying...');
        // API_URL이 undefined일 때 잠시 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // API 요청
      const response = await fetch(`${API_URL}/api/time-entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });
      
      console.log('서버 응답 상태:', response.status, response.statusText);
      
      // 응답 데이터 파싱
      const responseText = await response.text();
      console.log('서버 응답 원본:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('서버 응답 파싱 결과:', data);
      } catch (e) {
        console.error('JSON 파싱 오류:', e);
        throw new Error('서버 응답을 파싱할 수 없습니다: ' + responseText);
      }
      
      if (!response.ok) {
        throw new Error(data.message || data.error || `서버 오류: ${response.status}`);
      }
      
      // 성공 시 로컬 스토리지에 액션 저장
      const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
      const storageKey = `user_${userId}_lastActions`;
      const storedActionsStr = localStorage.getItem(storageKey) || '{}';
      let storedActions;
      
      try {
        storedActions = JSON.parse(storedActionsStr);
      } catch (e) {
        console.error('저장된 액션 파싱 오류:', e);
        storedActions = {};
      }
      
      // 액션 저장
      storedActions[type] = {
        time: formattedTime,
        timestamp: now.toISOString()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(storedActions));
      console.log('로컬 스토리지에 저장된 액션:', storedActions);
      
      return data;
    } catch (error) {
      console.error('시간 기록 생성 오류:', error);
      throw new Error('시간 기록 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* 헤더 */}
      <div className="flex justify-between items-center p-8 ">
        <h2 className="text-xl font-bold text-[#FDCF17]">{titles[type]}</h2>
        <button 
          onClick={handleClose}
          className="text-[#FDCF17] text-[30px]"
        >
          ✕
        </button>
      </div>
      
      {/* 스캐너 영역 - 텍스트를 카메라 바로 위에 배치 */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden p-4">
        {/* 안내 메시지를 여기로 이동 - 카메라 바로 위에 위치 */}
        <div className="text-center py-3 mb-2">
          <p className="text-xl font-medium text-white">Scan your QR Code</p>
        </div>
        
        {/* 스캐너 - 크기 제한 및 가운데 정렬 */}
        <div className="w-full max-w-md aspect-[4/5] relative rounded-lg overflow-hidden">
          <div id={scannerContainerId} className="w-full h-full absolute inset-0"></div>
          
          {/* 스캔 프레임 - 카메라 안에 들어가도록 조정 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* <div className="border-2 border-white w-4/5 h-4/5 rounded-lg relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg"></div>
            </div> */}
          </div>
        </div>
      </div>
      
      {/* 상태 메시지 */}
      <div className="p-4">
        {isProcessing && !scanError && (
          <div className="bg-[#FDCF17] border border-yellow-200 text-black-800 font-montserrat font-semibold p-4 rounded-lg text-center">
            <p>Processing...</p>
          </div>
        )}
        
        {scanError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            <p>{scanError}</p>
            <div className="mt-3 flex justify-center">
              <button
                onClick={handleRetry}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
