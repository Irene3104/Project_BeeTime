import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { LoginCredentials, AuthResponse } from '../types/index';

export const useAuth = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleAuthSuccess = (data: AuthResponse) => {
    const storage = localStorage.getItem('rememberMe') ? localStorage : sessionStorage;
    storage.setItem('token', data.token);
    storage.setItem('user', JSON.stringify(data.user));
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response: Response = await api.auth.login(credentials);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }
      
      const data: AuthResponse = await response.json();
      handleAuthSuccess(data);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('로그인 중 오류가 발생했습니다.');
      }
    }
  };

  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  return { login, logout, error };
};