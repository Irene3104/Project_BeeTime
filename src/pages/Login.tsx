import { Logo } from '../components/Logo';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import GoogleLogo from '../assets/logo_goauth.png';
import { useState, useEffect, useRef } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useGoogleLogin } from '@react-oauth/google';

export function Login() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const googleLoginRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '로그인에 실패했습니다.');
      }

      // Remember me가 체크되어 있으면 localStorage에, 아니면 sessionStorage에 저장
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', data.token);
      storage.setItem('user', JSON.stringify(data.user));
      
      // Remember me 설정 저장
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }
      
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('로그인 중 오류가 발생했습니다.');
      }
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const response = await fetch('http://localhost:3000/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', data.token);
      storage.setItem('user', JSON.stringify(data.user));
      
      if (data.requiresProfileComplete) {
        navigate('/information');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogleButtonClick = () => {
    if (googleLoginRef.current) {
      const button = googleLoginRef.current.querySelector('div[role="button"]');
      if (button instanceof HTMLElement) {
        button.click();
      }
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: tokenResponse => console.log(tokenResponse),
    onError: errorResponse => console.log(errorResponse),
    flow: 'auth-code',
    redirect_uri: 'https://project-bee-time-sandy.vercel.app/auth/google/callback'  // 배포된 URL
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#FFFBF6]">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 font-fredoka">Bee Time</h1>
          <Logo />
        </div>

        {/* 에러 메시지 표시 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        {/* 로그인 폼 섹션 */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4 font-montserrat">
          {/* 이메일 입력 필드 */}
          <div>
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-gray-300 px-4 py-3 text-[14px] rounded-[15px]"
              required
            />
          </div>
          
          {/* 비밀번호 입력 필드 */}
          <div>
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full border border-gray-300 px-4 py-3 text-[14px] rounded-[15px]"
              required
            />
          </div>

          {/* 로그인 보조 기능 (자동 로그인, 비밀번호 찾기) */}
          <div className="flex items-center justify-between px-1">
            {/* 자동 로그인 체크박스 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember-me" className="ml-2 text-[#AB9B9B] text-[14px]">
                Remember me
              </label>
            </div>
            {/* 비밀번호 찾기 링크 */}
            <div>
              <Link to="/forgot-password" className="text-blue-500 text-[14px]">
                Forgot Password?
              </Link>
            </div>
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            className="w-full bg-yellow-400 py-3 font-montserrat text-[14px] text-white hover:bg-yellow-500 mt-4 rounded-[15px]"
          >
            Login
          </button>
        </form>

        {/* 소셜 로그인 섹션 */}
        <div className="mt-6 font-montserrat">
          {/* 구분선과 텍스트 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#FFFBF6] px-4 text-[#AB9B9B] text-[14px]">or continue with</span>
            </div>
          </div>

          {/* 소셜 로그인 버튼 */}
          <div className="mt-6 flex justify-center">
            <Button 
              variant="ghost"
              size="large"
              icon={GoogleLogo}
              onClick={handleGoogleButtonClick}
            />
            <div ref={googleLoginRef} className="hidden">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google 로그인에 실패했습니다.')}
              />
            </div>
          </div>
        </div>

        {/* 회원가입 링크 섹션 */}
        <div className="text-center mt-6 font-montserrat">
          <span className="text-[#AB9B9B] text-[14px]">New member? </span>
          <Link to="/signup" className="font-semibold text-yellow-700 text-[14px]">
            Sign up here
          </Link>
        </div>
      </div>
    </div>
  );
}