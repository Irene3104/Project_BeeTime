import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Location } from '../types/index';
import BackButtonIcon from '../assets/btn_icon_arrow.png';
import DownArrowIcon from '../assets/icon_under_arrow.png';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo.tsx';
import { API_URL } from '../config/constants.ts';

export const Information = () => {
  const navigate = useNavigate();
  // 사용자 정보 입력 폼 상태 관리
  const [formData, setFormData] = useState({
    name: '',
    locationId: ''
  });

  // 각 입력 필드별 유효성 검사 에러 메시지 상태 추가
  const [formErrors, setFormErrors] = useState({
    name: '',
    locationId: ''
  });

// 폼 유효성 검사 함수 추가
const validateForm = () => {
    const errors = {
      name: '',
      locationId: ''
    };
    let isValid = true;
  
    // 이름 검증
    if (!formData.name.trim()) {
      errors.name = '이름을 입력해주세요';
      isValid = false;
    }
  
    // 근무지 검증
    if (!formData.locationId) {
      errors.locationId = '근무지를 선택해주세요';
      isValid = false;
    }
  
    setFormErrors(errors);
    return isValid;
  };
  
  // 지점 목록 상태 관리
  const [locations, setLocations] = useState<Location[]>([]);

  // 컴포넌트 마운트 시 지점 목록 가져오기
  useEffect(() => {
    fetch(`${API_URL}/locations`)
      .then(res => res.json())
      .then(data => setLocations(data))
      .catch(error => console.error('지점 목록 조회 실패:', error));
  }, []);

  // 폼 제출 처리 함수
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 폼 유효성 검사 추가
    if (!validateForm()) {
        return;
    }
    // 로컬/세션 스토리지에서 사용자 정보 가져오기
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

    try {
      // 사용자 정보 업데이트 API 호출
      const response = await fetch(`${API_URL}/auth/update-user-info`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user.id,
          name: formData.name,
          locationId: parseInt(formData.locationId)
        }),
      });

      if (!response.ok) throw new Error('정보 업데이트에 실패했습니다.');
      
      const data = await response.json();
      
    // 새로운 토큰과 사용자 정보를 스토리지에 저장
    // rememberMe 설정에 따라 localStorage 또는 sessionStorage 사용
      const storage = localStorage.getItem('rememberMe') ? localStorage : sessionStorage;
      storage.setItem('token', data.token);
      storage.setItem('user', JSON.stringify(data.user));

      // 대시보드로 이동
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
    }
  };

  // 뒤로가기 버튼 클릭 핸들러 추가
  const handleBack = () => {
    // 토큰과 사용자 정보 삭제
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    // 로그인 페이지로 이동
    navigate('/login');
  };

  return (
     // 전체 페이지 컨테이너 - 세로 중앙 정렬, 배경색 설정
     <div className="flex flex-col items-center justify-center min-h-[100vh] bg-[#FFFBF6] p-8">
        {/* 폼 컨테이너 - 최대 너비 제한 */}
      <div className="w-full max-w-sm space-y-8">
         {/* 헤더 영역 - 뒤로가기 버튼과 제목 */}
         <Link to="/" className="flex items-center text-gray-500 text-lg">
            <Button variant="back" size="medium" icon={BackButtonIcon} 
             onClick={handleBack}  // navigate(-1) 대신 handleBack 사용
            />
        </Link>

        {/* 페이지 제목 */}
        <h1 className="text-3xl font-bold mb-6 font-fredoka text-center">Member Information</h1>

        <form onSubmit={handleSubmit} className="py-10 space-y-4 font-montserrat">
            <div>
                <input
                    type="text"
                    placeholder="Full Name (as used at work)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-[#C5ABAB] px-4 py-3 rounded-[15px] placeholder:text-[#AB9B9B] font-montserrat"
                    required
                />
                {/* 이름 필드 에러 메시지 */}
                {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
            </div>  
            
            {/* 근무지 선택 드롭다운 */}
            <div className="relative">
                <select
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="w-full border border-[#C5ABAB] px-4 py-3 rounded-[15px] appearance-none pr-8 font-montserrat text-[#AB9B9B]"
                    required
                >
                    <option value="" disabled>Work Place</option>
                        {/* 지점 목록을 옵션으로 표시 */}
                    {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                                {location.name} {location.branch ? `(${location.branch})` : ''}
                        </option>
                    ))}
                </select>
                {/* 드롭다운 화살표 아이콘 */}
                <img src={DownArrowIcon} alt="arrow" className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                {/* 근무지 필드 에러 메시지 */}
                {formErrors.locationId && <p className="text-red-500 text-sm mt-1">{formErrors.locationId}</p>}
            </div>


            {/* 버튼 영역과의 간격 */}
            <div className='py-20'></div>
            
            <div className="flex items-center w-full">
                <Logo className="mr-2" />
                <button
                type="submit"
                className="flex-1 bg-yellow-400 ml-10 py-3 font-montserrat text-white hover:bg-yellow-500 rounded-[15px]"
            >
                Confirm
            </button>
            </div>
          
        </form>
      </div>
    </div>
  );
};