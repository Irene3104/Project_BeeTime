import React, { useState } from 'react';
import { API_URL } from '../config/constants';
import Logo from '../assets/logo_bee1.png';
import { Link, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  // 현재 단계 상태 관리 (1: 이메일 입력, 2: 인증코드 확인, 3: 새 비밀번호 설정)
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'verification' | 'reset'>('verification');

  // 이메일로 인증 코드 요청
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error sending verification code');
      }
      
      // 성공적으로 이메일 발송 후 모달 표시
      setModalType('verification');
      setShowModal(true);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // 인증 코드 확인
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode })
      });
      
      if (!response.ok) throw new Error('Invalid verification code');
      
      const data = await response.json();
      setResetToken(data.resetToken);
      setStep(3);
    } catch (err) {
      setError('Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // 새 비밀번호 설정
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          newPassword,
          resetToken
        })
      });
      
      if (!response.ok) throw new Error('Failed to reset password');
      
      // 비밀번호 재설정 성공 모달 표시
      setModalType('reset');
      setShowModal(true);
    } catch (err) {
      setError('Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  // 각 단계별 컨텐츠 렌더링
  const getTitleText = () => {
    switch (step) {
      case 1:
        return "Email Verification";
      case 2:
        return "Verify Code";
      case 3:
        return "Reset Password";
      default:
        return "";
    }
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4  mt- 10 border border-gray-200 rounded-full focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#FFDA55] text-black font-semibold rounded-full hover:bg-[#FFD133] transition-colors"
            >
              {isLoading ? 'Sending email...' : 'Send code'}
            </button>
          </form>
        );
        
      case 2:
        return (
          <form onSubmit={handleVerifyCode} className="w-full space-y-6">
            <input
              type="text"
              placeholder="Verification Code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full h-12 px-4 border border-gray-200 rounded-full focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#FFDA55] text-black font-semibold rounded-full hover:bg-[#FFD133] transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
        );
        
      case 3:
        return (
          <form onSubmit={handleResetPassword} className="w-full space-y-6">
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-12 px-4 border border-gray-200 rounded-full focus:outline-none"
              required
              minLength={6}
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-12 px-4 border border-gray-200 rounded-full focus:outline-none"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#FFDA55] text-black font-semibold rounded-full hover:bg-[#FFD133] transition-colors"
            >
              {isLoading ? 'Resetting password...' : 'Reset Password'}
            </button>
          </form>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFBF6]">
      {/* 뒤로가기 버튼 - 상단 왼쪽에 배치 */}
      <div className="p-8">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : navigate('/login')}
          className="inline-flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>

      {/* 중앙 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col items-center px-8 pt-4 pb-16">
        {/* 제목 및 로고 - 중앙에 배치 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Email</h1>
          <h1 className="text-3xl font-bold mb-4">Verification</h1>
          <img src={Logo} alt="Bee Time Logo" className="mx-auto w-30 h-30" />
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 w-full">
            {error}
          </div>
        )}

        {/* 단계별 컨텐츠 - 중앙에 배치 (이메일 입력 필드만) */}
        <div className="w-full mt-8">
          {step === 1 && (
            <form onSubmit={handleSubmit} className="w-full">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 px-4 border  border-gray-200 rounded-full focus:outline-[#C5ABAB]"
                required
              />
            </form>
          )}
          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="w-full">
              <input
                type="text"
                placeholder="Verification Code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full h-14 px-4 border border-gray-200 rounded-full focus:outline-[#C5ABAB]"
                required
              />
            </form>
          )}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="w-full space-y-4">
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-14 px-4 border border-gray-200 rounded-full focus:outline-[#C5ABAB]"
                required
                minLength={6}
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-14 px-4 border border-gray-200 rounded-full focus:outline-[#C5ABAB]"
                required
                minLength={6}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-[#FFDA55] text-black font-semibold rounded-full hover:bg-[#FFD133] transition-colors"
              >
                {isLoading ? 'Resetting password...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        {/* 버튼과 회원가입 링크를 하단에 배치 */}
        <div className="w-full mt-32">
          {/* 버튼 - 하단에 배치 */}
          {step === 1 && (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full h-14 bg-[#FFDA55] text-black font-semibold rounded-full hover:bg-[#FFD133] transition-colors mb-8"
            >
              {isLoading ? 'Sending email...' : 'Send code'}
            </button>
          )}
          {step === 2 && (
            <button
              onClick={handleVerifyCode}
              disabled={isLoading}
              className="w-full h-14 bg-[#FFDA55] text-black font-semibold rounded-full hover:bg-[#FFD133] transition-colors mb-8"
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
          )}

          {/* 회원가입 링크 - 하단에 배치 */}
          <div className="text-center">
            <p className="text-gray-500">
              New member?{' '}
              <Link to="/signup" className="text-[#B17F4A] font-semibold">
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* 모달 */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="p-6 text-center">
            <svg className="mx-auto mb-4 w-14 h-14 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            
            {modalType === 'verification' ? (
              <>
                <h3 className="mb-5 text-lg font-semibold">Verification code has been sent to your email.</h3>
                <p className="mb-4 text-gray-500">Please check your email and proceed to the next step.</p>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setStep(2);
                  }}
                  className="bg-[#FFDA55] text-black px-5 py-2 rounded-full font-semibold"
                >
                  Confirm
                </button>
              </>
            ) : (
              <>
                <h3 className="mb-5 text-lg font-semibold">Your password has been successfully changed.</h3>
                <p className="mb-4 text-gray-500">Please login with your new password.</p>
                <button
                  onClick={() => {
                    setShowModal(false);
                    navigate('/login');
                  }}
                  className="bg-[#FFDA55] text-black px-5 py-2 rounded-full font-semibold"
                >
                  Go to Login Page
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}; 