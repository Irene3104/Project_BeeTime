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

/***************************************************************************/
/** =================== 임시 코드 변경 (시작) ========================== **/
/** QR 코드가 데이터베이스의 location 테이블에 있는지 확인하는 함수입니다. **/
/***************************************************************************/
// DB의 location 테이블에서 placeID 검증하는 함수
const verifyPlaceIdInDatabase = async (placeId: string): Promise<boolean> => {
  try {
    console.log('2. 장소 ID 데이터베이스 검증 시작:', placeId);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    // 서버에 placeID 검증 요청 - 경로 수정
    const response = await fetch(`${API_URL}/qr/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ qrData: placeId })
    });
    
    // 응답 데이터 파싱
    const data = await response.json();
    console.log('2-1. 장소 ID 데이터베이스 검증 결과:', data);
    
    // 서버에서 검증 결과 반환
    return data.success === true;
  } catch (error) {
    console.error('장소 ID 검증 중 오류:', error);
    return false;
  }
};

// 로그인한 유저의 locationId를 가져오는 함수
const getUserLocationId = async (): Promise<number | null> => {
  try {
    console.log('2-2. 사용자의 location ID 가져오기 시작');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    console.log('2-2-1. 토큰 확인:', token ? '토큰 있음' : '토큰 없음');
    
    if (!token) {
      console.error('토큰이 없습니다.');
      return null;
    }
    
    // 사용자 정보 가져오기 - 엔드포인트 수정: /api/users/:id → /user/info
    console.log('2-2-4. 사용자 정보 API 호출 시작:', `${API_URL}/user/info`);
    const response = await fetch(`${API_URL}/user/info`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('2-2-5. 사용자 정보 API 응답 상태:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error(`사용자 정보 가져오기 실패 (상태: ${response.status})`);
      try {
        const errorText = await response.text();
        console.error('2-2-6. 오류 응답:', errorText);
      } catch (e) {
        console.error('2-2-7. 오류 응답 읽기 실패');
      }
      return null;
    }
    
    const userData = await response.json();
    console.log('2-3. 사용자 정보 조회 완료:', userData);
    
    // location 객체에서 id를 가져옴
    const locationId = userData.location?.id;
    console.log(`2-4. 사용자의 location ID: ${locationId}`);
    
    return locationId ? Number(locationId) : null;
  } catch (error) {
    console.error('사용자 위치 정보 가져오기 오류:', error);
    return null;
  }
};

// 위치 ID(placeId)가 사용자의 locationId에 해당하는지 확인하는 함수
const verifyPlaceIdMatchesUserLocation = async (placeId: string): Promise<boolean> => {
  try {
    console.log('3. 사용자 위치와 QR 코드 위치 일치 여부 확인 시작');
    
    // 토큰 가져오기
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (!token) {
      console.error('토큰이 없습니다.');
      return false;
    }
    
    // 사용자 정보 가져오기 (location 정보 포함)
    console.log('3-1. 사용자 정보 및 위치 정보 가져오기');
    const response = await fetch(`${API_URL}/user/info`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`사용자 정보 가져오기 실패 (상태: ${response.status})`);
      return false;
    }
    
    const userData = await response.json();
    console.log('3-2. 사용자 정보 조회 완료:', userData);
    
    // 사용자 위치 정보 추출
    if (!userData.location) {
      console.error('3-3. 사용자에게 위치 정보가 없음');
      return false;
    }
    
    console.log(`3-4. 사용자 위치 정보: ID=${userData.location.id}, 이름=${userData.location.name}, placeId=${userData.location.placeId}`);
    
    // QR 코드와 사용자 위치의 placeId 직접 비교
    const isMatch = userData.location.placeId === placeId;
    console.log(`3-5. 위치 일치 여부: ${isMatch ? '일치함 ✓' : '일치하지 않음 ✗'} (QR: ${placeId}, 유저: ${userData.location.placeId})`);
    
    return isMatch;
  } catch (error) {
    console.error('위치 매칭 검증 오류:', error);
    return false;
  }
};
/***************************************************************************/
/** =================== 임시 코드 변경 (끝) ============================ **/
/***************************************************************************/

export const QRScanner: React.FC<QRScannerProps> = ({ type, onClose, onScan, offlineMode = false, debugMode = false, skipLocationCheck = false }) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<{ message: string; data: any } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [forcedDebugMode, setForcedDebugMode] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [internalDebugMode, setInternalDebugMode] = useState(debugMode);
  const [internalSkipLocationCheck, setInternalSkipLocationCheck] = useState(skipLocationCheck);
  const [scanCompleted, setScanCompleted] = useState(false);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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
  
  // 컴포넌트 마운트 시 스캐너 초기화 및 전역 정리 이벤트 추가
  useEffect(() => {
    // URL 파라미터에서 디버그 모드 확인
    const urlParams = new URLSearchParams(window.location.search);
    const debugParam = urlParams.get('debug');
    const skipLocationParam = urlParams.get('skipLocation');
    
    if (debugParam === 'true') {
      console.log('디버그 모드 활성화 (URL 파라미터)');
      setInternalDebugMode(true);
      setForcedDebugMode(true);
    }
    
    if (skipLocationParam === 'true') {
      console.log('위치 확인 건너뛰기 활성화 (URL 파라미터)');
      setInternalSkipLocationCheck(true);
    }
    
    // 스캐너 초기화
    startScanning();
    
    // 페이지 언로드 시 모든 미디어 트랙 종료를 위한 전역 이벤트 리스너 추가
    const handlePageUnload = () => {
      console.log("페이지 언로드: 모든 미디어 트랙 종료");
      stopAllMediaTracks();
    };
    
    window.addEventListener('beforeunload', handlePageUnload);
    
    // 컴포넌트 언마운트 시 스캐너 정리 및 이벤트 리스너 제거
    return () => {
      window.removeEventListener('beforeunload', handlePageUnload);
      stopScanning();
    };
  }, []);
  
  // 스캐너 시작 함수
  const startScanning = async () => {
    try {
      console.log("스캐너 시작 시도...");
      
      // DOM 요소가 확실히 준비되었는지 확인
      const scannerContainer = document.getElementById(scannerContainerId);
      if (!scannerContainer) {
        console.error(`스캐너 컨테이너 요소 ${scannerContainerId}를 찾을 수 없음`);
        return;
      }
      
      // 새 스캐너 인스턴스 생성
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;
      
      // iOS용 최적화 설정
      const config = {
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false
        }
      };
      
      console.log("카메라 접근 권한 요청 중...");
      
      // iOS Safari를 위한 추가 처리
      if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.hasOwnProperty('MSStream')) {
        console.log("iOS 기기 감지됨, 카메라 접근에 특별 처리 적용");
      }
      
      // 카메라 시작 전에 먼저 권한 요청 시도
      await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      
      console.log("카메라 권한 획득 성공, 스캐너 시작");
      
      // 후면 카메라 강제 선택을 위한 개선된 접근 방식
      try {
        // 첫 번째 시도: 정확한 environment 모드로 시도 (가장 강력한 제약)
        console.log("1차 시도: exact environment 모드로 카메라 시작");
        await html5QrCode.start(
          { facingMode: { exact: "environment" } },
          config,
          onScanSuccess,
          onScanFailure
        );
        console.log("exact environment 모드로 카메라 시작 성공!");
        return; // 성공하면 함수 종료
      } catch (exactEnvError) {
        console.log("exact environment 모드 실패, 대체 방법 시도:", exactEnvError);
        
        try {
          // 두 번째 시도: 일반 environment 모드로 시도 (덜 제한적)
          console.log("2차 시도: 일반 environment 모드로 카메라 시작");
          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanFailure
          );
          console.log("일반 environment 모드로 카메라 시작 성공!");
          return; // 성공하면 함수 종료
        } catch (envError) {
          console.log("일반 environment 모드 실패, deviceId 접근법 시도:", envError);
          
          // 세 번째 시도: deviceId 방식으로 후면 카메라 찾기
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cameras = devices.filter(device => device.kind === 'videoinput');
          
          if (cameras.length === 0) {
            throw new Error("카메라를 찾을 수 없습니다");
          }
          
          console.log(`사용 가능한 카메라: ${cameras.length}개`);
          cameras.forEach((camera, index) => {
            console.log(`카메라 ${index}: ${camera.label || '레이블 없음'} (${camera.deviceId})`);
          });
          
          // 후면 카메라를 찾기 위한 개선된 방법
          let selectedCamera = null;
          
          // 1. 레이블에 후면 카메라 관련 키워드가 있는지 확인 (다국어 지원)
          const backCameraKeywords = ['back', 'rear', 'environment', '후면', '外', 'trasero', 'arrière', 'задняя', 'hinten'];
          for (const camera of cameras) {
            const label = camera.label.toLowerCase();
            if (backCameraKeywords.some(keyword => label.includes(keyword))) {
              selectedCamera = camera.deviceId;
              console.log(`키워드로 후면 카메라 찾음: ${camera.label}`);
              break;
            }
          }
          
          // 2. 여러 개의 카메라가 있는 경우 마지막 카메라 선택 (대부분의 기기에서 후면 카메라)
          if (!selectedCamera && cameras.length > 1) {
            selectedCamera = cameras[cameras.length - 1].deviceId;
            console.log(`여러 카메라 중 마지막 카메라 선택 (인덱스: ${cameras.length - 1})`);
          }
          
          // 3. 그래도 없으면 첫 번째 카메라 사용
          if (!selectedCamera) {
            selectedCamera = cameras[0].deviceId;
            console.log("대안이 없어 첫 번째 카메라 사용");
          }
          
          try {
            await html5QrCode.start(
              { deviceId: { exact: selectedCamera } },
              config,
              onScanSuccess,
              onScanFailure
            );
            console.log(`deviceId 방식으로 카메라 시작 성공! (ID: ${selectedCamera})`);
          } catch (deviceIdError) {
            console.error("deviceId 방식도 실패, 마지막 대안 시도:", deviceIdError);
            
            // 마지막 대안: 제약 없이 시도
            await html5QrCode.start(
              { facingMode: "user" }, // 아무런 옵션이라도 제공해야 함, 전면 카메라라도 사용
              config,
              onScanSuccess,
              onScanFailure
            );
            console.log("제약 없는 방식으로 카메라 시작 성공!");
          }
        }
      }
    } catch (error) {
      console.error("스캐너 초기화 또는 카메라 접근 오류:", error);
      setScanError("Cannot start camera. Please check camera permissions in your browser settings.");
    }
  };
  
  // 모든 미디어 스트림 종료 함수 추가
  const stopAllMediaTracks = () => {
    try {
      console.log("모든 미디어 트랙 종료 시도...");
      
      // 1. 현재 모든 활성 비디오 요소에서 트랙 종료
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        if (video.srcObject) {
          const mediaStream = video.srcObject as MediaStream;
          mediaStream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
            console.log("비디오 요소의 트랙 종료됨:", track.id);
          });
          video.srcObject = null;
          video.remove(); // 비디오 요소 자체도 제거
        }
      });
      
      // 2. 기존 navigator.mediaDevices.getUserMedia 메서드를 통한 종료
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          stream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
            console.log("새로운 미디어 스트림 트랙 종료됨:", track.id);
          });
        })
        .catch(err => console.log("미디어 스트림 접근 중 오류 (무시됨):", err));
      
      // 3. MediaDevices API를 통해 모든 활성 장치 종료 시도
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices()
          .then(devices => {
            devices.forEach(device => {
              if (device.kind === 'videoinput') {
                console.log("비디오 입력 장치 감지됨:", device.label || device.deviceId);
              }
            });
          })
          .catch(err => console.log("장치 열거 중 오류:", err));
      }
      
      // 4. 스캐너 컨테이너 정리 (모두 제거하는 방식으로 변경)
      const scannerContainer = document.getElementById(scannerContainerId);
      if (scannerContainer) {
        // 컨테이너 내부의 비디오 요소 모두 제거
        const containerVideos = scannerContainer.querySelectorAll('video');
        containerVideos.forEach(video => {
          if (video.srcObject) {
            const mediaStream = video.srcObject as MediaStream;
            mediaStream.getTracks().forEach(track => {
              track.stop();
              track.enabled = false;
            });
            video.srcObject = null;
          }
        });
        
        // 스캐너 컨테이너의 모든 내용 제거
        scannerContainer.innerHTML = '';
      }
      
      // 5. 전역 Navigator 객체에서 모든 미디어 장치 종료 시도
      if (navigator.mediaDevices) {
        // MediaDevices API 사용 가능한 경우 추가 종료 시도
        console.log("MediaDevices API를 통한 추가 종료 시도");
      }
      
      console.log("모든 미디어 트랙 종료 완료");
    } catch (error) {
      console.error("미디어 트랙 종료 중 오류:", error);
    }
  };
  
  // 스캐너 중지 함수 수정
  const stopScanning = () => {
    return new Promise<void>((resolve) => {
      try {
        if (scannerRef.current) {
          // 현재 상태 확인
          const isScanning = scannerRef.current.isScanning;
          console.log("스캐너 중지 시도, 현재 스캐닝 상태:", isScanning);
          
          if (isScanning) {
            // 스캔 중인 경우 중지
            scannerRef.current.stop()
              .then(() => {
                console.log("스캐너 중지 성공");
                // 스캐너 정리
                try {
                  scannerRef.current?.clear();
                } catch (clearErr) {
                  console.log("스캐너 정리 중 무시된 오류:", clearErr);
                }
                
                scannerRef.current = null;
                
                // 모든 미디어 트랙 강제 종료
                stopAllMediaTracks();
                
                resolve();
              })
              .catch((err) => {
                console.log("스캐너 중지 중 오류:", err);
                scannerRef.current = null;
                
                // 오류 발생해도 미디어 트랙 강제 종료
                stopAllMediaTracks();
                
                resolve();
              });
          } else {
            console.log("스캐너가 이미 중지된 상태");
            scannerRef.current = null;
            
            // 이미 중지된 상태여도 미디어 트랙 강제 종료
            stopAllMediaTracks();
            
            resolve();
          }
        } else {
          console.log("중지할 스캐너가 없음");
          
          // 스캐너가 없어도 혹시 모를 미디어 트랙 강제 종료
          stopAllMediaTracks();
          
          resolve();
        }
      } catch (error) {
        console.error("스캐너 중지 시 예외 발생:", error);
        scannerRef.current = null;
        
        // 예외 발생해도 미디어 트랙 강제 종료
        stopAllMediaTracks();
        
        resolve();
      }
    });
  };
  
  // 스캔 성공 핸들러 수정
  const onScanSuccess = async (decodedText: string) => {
    // 이미 처리 중이거나 스캔 쿨다운 중이면 무시
    if (isProcessing || scanCooldown.current || scanCompleted) {
      console.log('스캔 처리 중, 쿨다운 중, 또는 이미 완료됨 - 무시됨');
      return;
    }

    // 마지막 스캔 코드와 동일하면 무시
    if (lastScannedCode.current === decodedText) {
      console.log('동일한 QR 코드 스캔 무시');
      return;
    }

    try {
      console.log('1. QR 코드 스캔 성공 - 처리 시작:', decodedText);
      setIsProcessing(true);
      scanCooldown.current = true;
      lastScannedCode.current = decodedText;
      
      // 진행 상태 표시 타이머 설정 (약 3초 동안 0%에서 90%까지)
      setProcessingProgress(0);
      progressTimerRef.current = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 90) {
            if (progressTimerRef.current) {
              clearInterval(progressTimerRef.current);
            }
            return 90;
          }
          return prev + 5;
        });
      }, 150);
      
      // QR 코드 값 정리
      const trimmedQrCode = decodedText.trim();
      console.log('1-1. 정리된 QR 코드 값:', trimmedQrCode);
      
      // 1. QR 코드가 데이터베이스에 등록된 장소 ID인지 검증
      const isValidPlaceId = await verifyPlaceIdInDatabase(trimmedQrCode);
      
      if (!isValidPlaceId) {
        console.log('2-5. 등록되지 않은 장소 ID:', trimmedQrCode);
        throw new Error('이 QR 코드는 등록된 장소가 아닙니다. 유효한 장소 QR 코드를 스캔해주세요.');
      }
      
      console.log('2-6. 장소 ID 데이터베이스 검증 성공:', trimmedQrCode);
      
      // 2. 로그인한 유저의 location 정보와 QR 코드의 위치가 일치하는지 검증
      const isUserLocation = await verifyPlaceIdMatchesUserLocation(trimmedQrCode);
      
      if (!isUserLocation) {
        console.log('3-5. 사용자 위치와 일치하지 않는 QR 코드:', trimmedQrCode);
        throw new Error('이 QR 코드는 귀하의 근무 위치와 일치하지 않습니다. 본인 위치의 QR 코드를 스캔해주세요.');
      }
      
      console.log('3-6. 사용자 위치와 QR 코드 위치 일치 확인 완료');
      
      // QR 코드 파싱 간소화 - 모든 QR 코드 값을 유효하게 처리
      console.log('4. QR 코드 정보 처리 시작');
      // 어떤 QR 코드든 유효한 위치 정보로 처리
      const qrLocation = {
        placeId: trimmedQrCode, // QR 코드 값 그대로 사용
        latitude: 37.5665, // 기본 위도값 (의미 없음)
        longitude: 126.9780 // 기본 경도값 (의미 없음)
      };
      console.log('4-1. QR 코드 위치 정보 처리 완료:', qrLocation);
      
      // QR 코드에서 필요한 정보(placeId)를 얻었으므로 즉시 카메라 종료
      console.log('4-2. 필요한 QR 정보 획득 완료 - 카메라 종료 시작');
      
      // 스캐너 즉시 중지 및 숨기기
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          console.log('4-3. 스캐너 중지 성공');
        } catch (e) {
          console.log('스캐너 중지 중 오류 (무시됨):', e);
        }
        
        try {
          scannerRef.current.clear();
          console.log('4-4. 스캐너 정리 성공');
        } catch (e) {
          console.log('스캐너 정리 중 무시된 오류:', e);
        }
        
        scannerRef.current = null;
      }
      
      // 스캐너 DOM 요소 비우기
      const scannerContainer = document.getElementById(scannerContainerId);
      if (scannerContainer) {
        scannerContainer.innerHTML = '';
        console.log('4-5. 스캐너 DOM 요소 제거됨');
      }
      
      // 모든 미디어 트랙 강제 종료
      stopAllMediaTracks();
      console.log('4-6. 카메라 종료 완료');
      
      // 위치 확인 건너뛰고 바로 성공 UI 표시
      console.log('5. 성공 UI 표시 및 시간 기록 시작');
      setScanCompleted(true); // 스캔 완료 상태로 설정
      setProcessingProgress(90); // 진행률 90%로 표시 (API 호출 전)
      
      // 타이머 정리
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }

      // 시간 기록 생성 (위치 확인 없이 바로 API 호출 진행)
      console.log('5-1. 시간 기록 API 호출 시작 - 타입:', type);
      const data = await createTimeEntry(type, qrLocation.placeId, {
        latitude: qrLocation.latitude,
        longitude: qrLocation.longitude
      });
      console.log('5-2. 시간 기록 API 호출 완료:', data);

      // 성공 데이터 설정
      setScanSuccess({
        message: `Successfully processed ${type}!`,
        data: data
      });
      
      // 진행률 100%로 표시 (모든 처리 완료)
      setProcessingProgress(100);
      console.log('5-3. 모든 처리 완료 - 진행률 100%');
      
      // 성공 처리 (데이터 전달)
      onScan(data);
      console.log('5-4. 성공 처리 완료 - 창 닫기 준비');
      
      // 화면 전환 후 1초 뒤 새로고침 (브라우저 호환성 문제 해결)
      setTimeout(() => {
        console.log('5-5. 창 닫기 타이머 실행');
        onClose();
        
        // 추가: 1초 후 페이지 새로고침
        setTimeout(() => {
          console.log('5-6. 페이지 새로고침 실행');
          window.location.reload();
        }, 1000);
      }, 800);

    } catch (error) {
      // 오류 발생 시 진행 상태 타이머 정리
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setProcessingProgress(0);
      
      console.error('QR 스캔 처리 오류:', error);
      setScanError(error instanceof Error ? error.message : 'An unknown error has occured.');
      console.log('오류 발생 - 에러 메시지 표시됨');
      
      // 오류 발생 시에도 카메라와 스캐너를 종료 시도
      try {
        if (scannerRef.current) {
          scannerRef.current.stop().catch(e => console.log('오류 발생 후 스캐너 중지 실패:', e));
          scannerRef.current = null;
        }
        stopAllMediaTracks();
        console.log('오류 발생 후 카메라 및 스캐너 종료 완료');
      } catch (cleanupError) {
        console.error('오류 후 정리 중 추가 오류:', cleanupError);
      }
    } finally {
      // 3초 후에 쿨다운 해제
      setTimeout(() => {
        scanCooldown.current = false;
        if (!scanCompleted) { // 스캔이 완료되지 않은 경우에만 처리 중 상태 해제
          setIsProcessing(false);
        }
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
        reject(new Error('Geolocation is not supported in this browser.'));
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
      
      /***************************************************************************/
      /** =================== 임시 코드 변경 (시작) ========================== **/
      /** QR 코드 값을 간단히 처리하여 위치 정보를 고정값으로 반환합니다.     **/
      /** 위치 확인 없이 바로 시간 기록이 가능해집니다.                       **/
      /***************************************************************************/
      
      // 모든 QR 코드를 유효한 것으로 처리
      console.log('QR 코드 간소화 처리 - 모든 QR 코드를 유효한 것으로 간주');
      
      return {
        placeId: qrData.trim(), // QR 코드 값 그대로 사용
        latitude: 37.5665, // 기본 위도값 (의미 없음)
        longitude: 126.9780 // 기본 경도값 (의미 없음)
      };
      
      /***************************************************************************/
      /** =================== 임시 코드 변경 (끝) ============================ **/
      /***************************************************************************/

      /* 아래는 기존 코드 (주석 처리)
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
            throw new Error(`Place API response error: ${response.status}`);
          }
          
          const placeData = await response.json();
          console.log('Place API 응답:', placeData);
          
          if (!placeData.latitude || !placeData.longitude) {
            throw new Error('No location information available');
          }
          
          return {
            placeId: qrData.trim(),
            latitude: placeData.latitude,
            longitude: placeData.longitude
          };
        } catch (error) {
          console.error('Place ID 조회 오류:', error);
          throw new Error('Unable to retrieve location information');
        }
      }
      
      throw new Error('Unsupported QR code format');
      */
    } catch (error) {
      console.error('QR 코드 파싱 오류:', error);
      throw error;
    }
  };
  
  // 닫기 버튼 핸들러 수정
  const handleClose = async () => {
    try {
      console.log('QR 스캐너 닫기 시작');
      
      // 진행 중인 모든 타이머 정리
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
        console.log('진행 타이머 정리 완료');
      }
      
      // 모든 상태 초기화
      setIsProcessing(false);
      setScanError(null);
      setProcessingProgress(0);
      
      // 스캐너 중지 및 정리
      if (scannerRef.current) {
        console.log('스캐너 종료 시작');
        try {
          await scannerRef.current.stop();
          console.log('스캐너 중지 성공');
        } catch (error) {
          console.log('스캐너 중지 중 오류 무시:', error);
        }
        
        try {
          scannerRef.current.clear();
          console.log('스캐너 리소스 정리 성공');
        } catch (error) {
          console.log('스캐너 정리 중 오류 무시:', error);
        }
        
        scannerRef.current = null;
      }
      
      // 모든 미디어 트랙 종료 (강화된 버전 사용)
      console.log('모든 미디어 트랙 종료 시작');
      stopAllMediaTracks();
      console.log('모든 미디어 트랙 종료 완료');
      
      // 스캐너 컨테이너 내용 정리
      const container = document.getElementById(scannerContainerId);
      if (container) {
        // container.innerHTML = '';
        console.log('스캐너 컨테이너 정리 완료');
      }
      
      // 메모리 정리를 위한 추가 조치
      lastScannedCode.current = null;
      scanCooldown.current = false;
      
      // 모든 정리 작업이 완료된 후 onClose 호출
      console.log('QR 스캐너 닫기 작업 완료, 화면 전환');
      onClose();
    } catch (error) {
      console.error('닫기 처리 중 오류:', error);
      // 오류가 발생해도 닫기는 진행
      stopAllMediaTracks(); // 최종 안전 조치
      onClose();
    }
  };
  
  // 성공 후 닫기 핸들러
  const handleSuccessClose = () => {
    if (scanSuccess) {
      onScan(scanSuccess.data);
    }
    handleClose();
  };
  
  // handleRetry 함수 개선
  const handleRetry = async () => {
    console.log("다시 시도 실행: 스캐너 재시작");
    
    // 오류 상태 초기화
    setScanError(null);
    setIsProcessing(false);
    
    // 스캔 쿨다운 초기화
    scanCooldown.current = false;
    lastScannedCode.current = null;
    
    // 진행 중인 타이머 모두 제거
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    
    try {
      // 먼저 스캐너 완전히 중지 (Promise 기반)
      await stopScanning();
      
      // 기존 HTML 요소 정리
      const container = document.getElementById(scannerContainerId);
      if (container) {
        container.innerHTML = '';
      }
      
      // 잠시 지연 후 다시 시작
      setTimeout(() => {
        try {
          startScanning();
          console.log("스캐너가 성공적으로 재시작되었습니다");
        } catch (error) {
          console.error("스캐너 재시작 실패:", error);
          setScanError("Cannot restart scanner. Please try refreshing the page.");
        }
      }, 1000); // 1초 지연
    } catch (error) {
      console.error("재시도 처리 중 오류:", error);
      setScanError("An error occurred while processing the retry. Please try refreshing the page.");
    }
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
      
      console.log('5-1. 서버로 보내는 데이터:', JSON.stringify(requestData, null, 2));
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      console.log('5-1-1. 인증 토큰:', token ? '토큰 있음' : '토큰 없음');
      console.log('5-1-2. API_URL:', API_URL);
      
      if (!API_URL) {
        console.warn('API_URL is temporarily undefined, retrying...');
        // API_URL이 undefined일 때 잠시 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('5-1-3. API 요청 준비 - 엔드포인트:', `${API_URL}/api/time-entries/qr-check`);
      console.log('5-1-4. QR 데이터:', placeId);

      try {
        // API 요청 - 시간 기록 엔드포인트로 요청
        const response = await fetch(`${API_URL}/api/time-entries/qr-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            type: type,
            qrData: placeId,
            date: requestData.date
          })
        });
        
        console.log('5-1-5. 서버 응답 상태:', response.status, response.statusText);
        console.log('5-1-6. 응답 헤더:', 
          Array.from(response.headers.entries())
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')
        );
        
        // 응답 데이터 파싱
        const responseText = await response.text();
        console.log('5-2. 서버 응답 원본:', responseText);
        
        let data;
        try {
          data = JSON.parse(responseText);
          console.log('5-2-1. 서버 응답 파싱 결과:', data);
        } catch (e) {
          console.error('5-2-2. JSON 파싱 오류:', e);
          throw new Error('서버 응답을 파싱할 수 없습니다: ' + responseText);
        }
        
        if (!response.ok) {
          console.error('5-2-3. 서버 오류 응답:', response.status);
          throw new Error(data.message || data.error || `서버 오류: ${response.status}`);
        }
        
        console.log('5-2-4. 시간 기록 API 응답 성공');
        
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
        console.log('5-3. 로컬 스토리지에 저장된 액션:', storedActions);
        
        return data;
      } catch (fetchError) {
        console.error('5-4. API 요청 중 오류 발생:', fetchError);
        
        if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          console.error('5-4-1. 네트워크 연결 오류 또는 CORS 문제 발생');
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error('5-5. 시간 기록 생성 전체 오류:', error);
      throw new Error('An error occurred while processing your time record. Please try again later.');
    }
  };
  
  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);
  
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
          {scanCompleted ? (
            <p className="text-xl font-medium text-[#FDCF17]">Success!</p>
          ) : (
            <p className="text-xl font-medium text-white">Scan your QR Code</p>
          )}
        </div>
        
        {/* 스캐너 - 스캔 완료 시 숨기고 성공 UI 표시 */}
        {scanCompleted ? (
          <div className="w-full max-w-md aspect-[4/5] flex items-center justify-center">
            <div className="bg-[#FDCF17]/10 p-8 rounded-full animate-pulse">
              <div className="text-[#FDCF17] text-9xl animate-bounce">✓</div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md aspect-[4/5] relative rounded-lg overflow-hidden">
            <div id={scannerContainerId} className="w-full h-full absolute inset-0"></div>
            
            {/* 스캔 프레임 - 카메라 안에 들어가도록 조정 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-[#FDCF17] w-4/5 h-4/5 rounded-lg"></div>
            </div>
          </div>
        )}
      </div>
      
      {/* 상태 메시지 */}
      <div className="p-4">
        {isProcessing && !scanError && !scanCompleted && (
          <div className="bg-white border border-[#FDCF17] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-700">Processing...</span>
              <span className="text-sm text-gray-500">{processingProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-[#FDCF17] h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">Please wait a moment...</p>
          </div>
        )}
        
        {scanCompleted && (
          <div className="bg-white border border-[#FDCF17] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-700">Completed!</span>
              <span className="text-sm text-gray-500">100%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-[#FDCF17] h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: '100%' }}
              ></div>
            </div>
            <p className="text-sm text-green-600 mt-2 text-center font-medium">
              {type === 'clockIn' ? 'Clock In Successful!' : 
               type === 'clockOut' ? 'Clock Out Successful!' : 
               type.includes('breakStart') ? 'Break Started Successfully!' : 
               'Break Ended Successfully!'}
            </p>
          </div>
        )}
        
        {scanError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            <p>{scanError}</p>
          </div>
        )}
      </div>
    </div>
  );
};
