import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Location } from '../types/index';  // SignupRequest 제거
import { AlertModal } from '../components/AlertModal';
import BackButtonIcon from '../assets/btn_icon_arrow.png';
import DownArrowIcon from '../assets/icon_under_arrow.png';
import { Logo } from '../components/Logo';
import { Button } from '../components/Button';
import { API_URL } from '../config/constants';

export const Signup = () => {
    const navigate = useNavigate();
    // 회원가입 폼 데이터 상태 관리
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        locationId: ''
    });
    // 지점 목록 상태 관리
    const [locations, setLocations] = useState<Location[]>([]);
     // 일반 에러 메시지 상태
    const [error, setError] = useState('');
    // 회원가입 성공 모달 표시 상태
    const [showSuccessModal, setShowSuccessModal] = useState(false);
     // 각 입력 필드별 유효성 검사 에러 메시지 상태
    const [formErrors, setFormErrors] = useState({
        name: '',
        email: '',
        password: '',
        locationId: ''
    });
    
    // 컴포넌트 마운트 시 지점 목록 가져오기
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const response = await fetch(`${API_URL}/locations`);
                const data = await response.json();
                setLocations(data);
            } catch (error) {
                console.error('Location list retrieval failed:', error);
                setError('Failed to retrieve location list');
            }
        };
        fetchLocations();
    }, []);

    // 폼 유효성 검사 함수
    const validateForm = () => {
        const errors = {
            name: '',
            email: '',
            password: '',
            locationId: ''
        };
        let isValid = true;

        // 이름 검증
        if (!formData.name.trim()) {
            errors.name = 'Name is required';
            isValid = false;
        } else if (formData.name.trim().length < 2) {
            errors.name = 'Name must be at least 2 characters';
            isValid = false;
        }

        // 이메일 검증
        if (!formData.email) {
            errors.email = 'Email is required';
            isValid = false;
        } else if (!formData.email.includes('@')) {
            errors.email = 'Email must contain @';
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Invalid email format';
            isValid = false;
        }

        // 비밀번호 검증
        if (!formData.password) {
            errors.password = 'Password is required';
            isValid = false;
        } else if (formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
            isValid = false;
        }

        // workplace 검증
        if (!formData.locationId) {
            errors.locationId = 'Work place is required';
            isValid = false;
        }

        setFormErrors(errors);
        return isValid;
    };

    // 폼 제출 처리 함수
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // 폼 유효성 검사
        if (!validateForm()) {
            return;
        }

        try {
            // 일반 회원가입 API 호출
            const response = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    ...formData,
                    locationId: parseInt(formData.locationId)
                }),
            });

            const data = await response.json();
            
             // API 응답이 실패인 경우 에러 처리
            if (!response.ok) {
                setError(data.error || '회원가입에 실패했습니다.');
                return;
            }

             // 로그인 정보 로컬 스토리지에 저장
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // 회원가입 성공 모달 표시
            setShowSuccessModal(true);
        } catch (error) {
            setError('Server connection issue. Please try again later.');
        }
    };

    // 회원가입 성공 모달 확인 버튼 클릭 핸들러
    const handleSuccessConfirm = () => {
        setShowSuccessModal(false);   // 모달 닫기
        navigate('/dashboard');       // 메인 페이지인 대시보드로 이동
    };

    return (
      // 전체 페이지 컨테이너 - 세로 중앙 정렬, 배경색 설정
        <div className="flex flex-col items-center justify-center min-h-[100vh] bg-[#FFFBF6] p-8">
             {/* 회원가입 폼 컨테이너 - 최대 너비 제한 */}
            <div className="w-full max-w-sm space-y-8">
                {/* 뒤로가기 버튼 */}
                <Link to="/" className="flex items-center text-gray-500 text-lg">
                    <Button variant="back" size="medium" icon={BackButtonIcon} />
                </Link>

                {/* 페이지 제목 */}
                <h1 className="text-3xl font-bold mb-6 font-fredoka text-center">Create Account</h1>
                
                {/* 에러 메시지 표시 영역 */}
                {error && <div className="text-red-500 text-center">{error}</div>}
                
                 {/* 회원가입 폼 */}
                <form onSubmit={handleSubmit} className="py-10 space-y-4 font-montserrat">
                   {/* 이름 입력 필드 */}
                    <div>
                        <input
                            type="text"
                            placeholder="Full Name (as used at work)"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border border-[#C5ABAB] px-4 py-3 rounded-[15px] placeholder:text-[#AB9B9B] font-montserrat focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            required
                        />
                        {/* 이름 필드 에러 메시지 */}
                        {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                    </div>
                    
                    {/* 이메일 입력 필드 */}
                    <div>
                        <input
                            type="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full border border-[#C5ABAB] px-4 py-3 rounded-[15px] placeholder:text-[#AB9B9B] font-montserrat focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            required
                        />
                        {/* 이메일 필드 에러 메시지 */}
                        {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                    </div>

                    {/* 비밀번호 입력 필드 */}
                    <div>
                        <input
                            type="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full border border-[#C5ABAB] px-4 py-3 rounded-[15px] placeholder:text-[#AB9B9B] font-montserrat focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            required
                        />
                         {/* 비밀번호 필드 에러 메시지 */}
                        {formErrors.password && <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>}
                    </div>

                    {/* 근무지 선택 드롭다운 */}
                    <div className="relative">
                        <select
                            value={formData.locationId}
                            onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                            className="w-full border border-[#C5ABAB] px-4 py-3 rounded-[15px] appearance-none pr-8 font-montserrat bg-white  text-[#AB9B9B] focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            required
                        >
                            <option value="" disabled className="text-[#AB9B9B]">Work Place</option>
                            {locations.map((location: Location) => (
                                <option key={location.id.toString()} value={location.id}>
                                    {location.name} {location.branch ? `(${location.branch})` : ''}
                                </option>
                            ))}
                        </select>
                        {/* 드롭다운 화살표 아이콘 강조 */}
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg 
                                width="14" 
                                height="8" 
                                viewBox="0 0 14 8" 
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                                className="text-[#AB9B9B]"
                            >
                                <path 
                                    d="M1 1L7 7L13 1" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        {formErrors.locationId && <p className="text-red-500 text-sm mt-1">{formErrors.locationId}</p>}
                    </div>
                    
                    {/* 버튼 영역과의 간격 */}
                    <div className='py-8'></div>
                    
                    {/* 회원가입 버튼 영역 */}
                    <div className="flex items-center w-full">
                        <Logo className="mr-2" />
                        <button type="submit" className="flex-1 bg-yellow-400 ml-10 py-3 font-montserrat text-white hover:bg-yellow-500 rounded-[15px]">
                            Sign up
                        </button>
                    </div>
                </form>
            </div>
            
            {/* 회원가입 성공 시 표시되는 모달 */}
            <AlertModal
                isOpen={showSuccessModal}
                message="Registration completed successfully!"
                onConfirm={handleSuccessConfirm}
            />
        </div>
    );
};