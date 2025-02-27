import { API_URL } from '../config/constants';
import type { 
  LoginCredentials, 
  SignupRequest, 
  AuthResponse, 
  ApiResponse, 
  User, 
  Location 
} from '../types/index';
import { getStorage } from '../utils/storage';

const getAuthHeader = (): HeadersInit => {
  const token = getStorage().getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  auth: {
    login: async (credentials: LoginCredentials): Promise<Response> => {
      return fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
    },

    signup: async (data: SignupRequest): Promise<ApiResponse<AuthResponse>> => {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '회원가입에 실패했습니다.');
      }

      return response.json();
    },

    google: (credential: string) =>
      fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      }),

    updateProfile: async (userId: string, data: Partial<User>) => {
      const response = await fetch(`${API_URL}/auth/update-user-info`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ userId, ...data }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '프로필 업데이트에 실패했습니다.');
      }

      return response.json();
    },
  },
  
  locations: {
    getAll: async (): Promise<Location[]> => {
      const response = await fetch(`${API_URL}/locations`);
      if (!response.ok) {
        throw new Error('지점 목록을 불러오는데 실패했습니다.');
      }
      return response.json();
    },
  },
  
  timeEntries: {
    getAll: async () => {
      const response = await fetch(`${API_URL}/api/time-entries`, {
        headers: getAuthHeader(),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch time entries' }));
        throw new Error(error.message || `Error: ${response.status}`);
      }
      
      return response.json();
    },
    
    create: async (data: any) => {
      const response = await fetch(`${API_URL}/api/time-entries`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create time entry' }));
        throw new Error(error.message || `Error: ${response.status}`);
      }
      
      return response.json();
    },
    
    update: async (id: string, data: any) => {
      const response = await fetch(`${API_URL}/api/time-entries/${id}`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update time entry' }));
        throw new Error(error.message || `Error: ${response.status}`);
      }
      
      return response.json();
    },
    
    verifyLocation: async (data: {
      placeId: string;
      latitude: number;
      longitude: number;
      accuracy?: number;
      type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut';
      timestamp: string;
    }) => {
      const response = await fetch(`${API_URL}/api/time-entries/verify-location`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to verify location' }));
        throw new Error(error.message || `Error: ${response.status}`);
      }
      
      return response.json();
    }
  }
};