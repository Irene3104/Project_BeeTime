import React, { useState } from 'react';
import { API_URL } from '../config/constants';
import Logo from '../assets/logo_bee3.png';
import { Link } from 'react-router-dom';

export const ForgotPassword = () => {
  // 현재 단계 상태 관리 (1: 이메일 입력, 2: 인증코드 확인, 3: 새 비밀번호 설정)
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState('');

  // 이메일로 인증 코드 요청
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (!response.ok) throw new Error('Failed to send verification code');
      setStep(2);
    } catch (err) {
      setError('Failed to send verification code');
    }
  };

  // 인증 코드 확인
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
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
    }
  };

  // 새 비밀번호 설정
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

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
      window.location.href = '/login';
    } catch (err) {
      setError('Failed to reset password');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#FFFBF6]">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 font-fredoka">Bee Time</h1>
          <img src={Logo} alt="Bee Time Logo" className="mx-auto w-24 h-24" />
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSendCode} className="mt-8 space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 rounded-[15px] text-[14px]"
              required
            />
            <button
              type="submit"
              className="w-full bg-[#FFE26C] text-black py-3 rounded-[15px] font-montserrat"
            >
              Send Verification Code
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="mt-8 space-y-4">
            <input
              type="text"
              placeholder="Verification Code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 rounded-[15px] text-[14px]"
              required
            />
            <button
              type="submit"
              className="w-full bg-[#FFE26C] text-black py-3 rounded-[15px] font-montserrat"
            >
              Verify Code
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="mt-8 space-y-4">
            <input
              type="password"
              placeholder="새 비밀번호"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 rounded-[15px] text-[14px]"
              required
              minLength={6}
            />
            <input
              type="password"
              placeholder="새 비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 rounded-[15px] text-[14px]"
              required
              minLength={6}
            />
            <button
              type="submit"
              className="w-full bg-[#FFE26C] text-black py-3 rounded-[15px] font-montserrat"
            >
              비밀번호 재설정
            </button>
          </form>
        )}

        <div className="text-center mt-4">
          <Link to="/login" className="text-[#B17F4A] hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}; 