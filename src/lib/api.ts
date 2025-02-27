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
  // Try to get token from both localStorage and sessionStorage
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  console.log("API: Auth token available:", !!token);
  
  if (token) {
    // Log token details for debugging
    try {
      // Check if token is already a JWT or needs to be cleaned
      let cleanToken = token;
      
      // Remove quotes if they exist (handles tokens stored with quotes)
      if (token.startsWith('"') && token.endsWith('"')) {
        cleanToken = token.slice(1, -1);
        console.log("API: Removed quotes from token");
      }
      
      // Try to decode the token
      try {
        const parts = cleanToken.split('.');
        if (parts.length === 3) {
          // Looks like a valid JWT format
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const payload = JSON.parse(jsonPayload);
          const expiryDate = new Date(payload.exp * 1000);
          const now = new Date();
          const isExpired = expiryDate < now;
          
          console.log("API: Token first 20 chars:", cleanToken.substring(0, 20) + "...");
          console.log("API: Token expiry:", expiryDate.toISOString());
          console.log("API: Token expired:", isExpired);
          console.log("API: Token payload:", payload);
        } else {
          console.log("API: Token doesn't appear to be in JWT format, using as-is");
        }
      } catch (e) {
        console.error("API: Error parsing token:", e);
      }
      
      // Return the cleaned token in the Authorization header
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanToken}`
      };
    } catch (e) {
      console.error("API: Error processing token:", e);
    }
  }
  
  return {
    'Content-Type': 'application/json'
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

    refreshToken: async (): Promise<boolean> => {
      try {
        console.log("Attempting to refresh token");
        
        // Try to get token from both localStorage and sessionStorage
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (!token) {
          console.log("No token to refresh");
          return false;
        }
        
        // Clean the token if needed (remove quotes)
        let cleanToken = token;
        if (token.startsWith('"') && token.endsWith('"')) {
          cleanToken = token.slice(1, -1);
          console.log("Removed quotes from token for refresh");
        }
        
        console.log("Token found, sending refresh request");
        const response = await fetch(`${API_URL}/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanToken}`
          }
        });
        
        console.log("Refresh token response status:", response.status);
        
        if (!response.ok) {
          console.error("Token refresh failed:", response.status);
          const errorText = await response.text();
          console.error("Token refresh error response:", errorText);
          return false;
        }
        
        const data = await response.json();
        console.log("Token refresh response data received");
        
        if (data.token) {
          console.log("Token refreshed successfully");
          
          // Store the token in both localStorage and sessionStorage to ensure it's available
          localStorage.setItem('token', data.token);
          sessionStorage.setItem('token', data.token);
          
          // Also update user data if available
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            sessionStorage.setItem('user', JSON.stringify(data.user));
          }
          
          return true;
        }
        
        console.log("No token in refresh response");
        return false;
      } catch (error) {
        console.error("Error refreshing token:", error);
        return false;
      }
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
      console.log("Calling verifyLocation API with data:", data);
      
      // Get fresh headers with the latest token
      const headers = getAuthHeader();
      console.log("Request headers:", headers);
      
      try {
        // Attempt the API call
        const response = await fetch(`${API_URL}/api/time-entries/verify-location`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(data),
        });
        
        console.log("API response status:", response.status);
        
        // Handle authentication errors by attempting to refresh the token
        if (response.status === 401) {
          console.log("Authentication failed, attempting to refresh token");
          const refreshSuccess = await api.auth.refreshToken();
          
          if (refreshSuccess) {
            console.log("Token refreshed, retrying API call with new token");
            // Get fresh headers with the new token
            const newHeaders = getAuthHeader();
            
            // Retry the API call with the new token
            const retryResponse = await fetch(`${API_URL}/api/time-entries/verify-location`, {
              method: 'POST',
              headers: newHeaders,
              body: JSON.stringify(data),
            });
            
            console.log("Retry API response status:", retryResponse.status);
            
            if (!retryResponse.ok) {
              const errorText = await retryResponse.text();
              console.error("API retry error response:", errorText);
              try {
                const error = JSON.parse(errorText);
                throw new Error(error.message || error.error || `Error: ${retryResponse.status}`);
              } catch (e) {
                throw new Error(`Failed to verify location after token refresh: ${retryResponse.status} ${errorText}`);
              }
            }
            
            return retryResponse.json();
          } else {
            console.error("Token refresh failed, cannot retry API call");
            throw new Error("Authentication failed and token refresh was unsuccessful");
          }
        }
        
        // Handle other errors
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", errorText);
          try {
            const error = JSON.parse(errorText);
            throw new Error(error.message || error.error || `Error: ${response.status}`);
          } catch (e) {
            throw new Error(`Failed to verify location: ${response.status} ${errorText}`);
          }
        }
        
        const responseData = await response.json();
        console.log("API response data:", responseData);
        return responseData;
      } catch (error) {
        console.error("API call exception:", error);
        throw error;
      }
    }
  }
};

// Diagnostic functions
export const diagnostics = {
  async testAuth() {
    try {
      console.log('Testing authentication...');
      const headers = await getAuthHeader();
      console.log('Auth headers:', headers);
      
      const response = await fetch(`${API_URL}/auth/test-auth-flow`, {
        method: 'GET',
        headers
      });
      
      console.log('Auth test response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Auth test failed:', errorJson);
          return { success: false, error: errorJson };
        } catch (e) {
          console.error('Auth test failed with non-JSON response:', errorText);
          return { success: false, error: errorText };
        }
      }
      
      const data = await response.json();
      console.log('Auth test successful:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error testing authentication:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  async testDateHandling() {
    try {
      console.log('Testing date handling...');
      const headers = await getAuthHeader();
      console.log('Auth headers:', headers);
      
      const response = await fetch(`${API_URL}/time-entries/test-date`, {
        method: 'GET',
        headers
      });
      
      console.log('Date test response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Date test failed:', errorJson);
          return { success: false, error: errorJson };
        } catch (e) {
          console.error('Date test failed with non-JSON response:', errorText);
          return { success: false, error: errorText };
        }
      }
      
      const data = await response.json();
      console.log('Date test successful:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error testing date handling:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  async checkServerStatus() {
    try {
      console.log('Checking server status...');
      
      const response = await fetch(`${API_URL}/diagnostics/server-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Server status response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Server status check failed:', errorJson);
          return { success: false, error: errorJson };
        } catch (e) {
          console.error('Server status check failed with non-JSON response:', errorText);
          return { success: false, error: errorText };
        }
      }
      
      const data = await response.json();
      console.log('Server status check successful:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error checking server status:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  async testTokenRefresh() {
    try {
      console.log('Testing token refresh...');
      const token = getStorage().getItem('token');
      
      if (!token) {
        console.log('No token available for refresh test');
        return { success: false, error: 'No token available' };
      }
      
      console.log('Token available, attempting refresh');
      
      const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Refresh token response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Token refresh failed:', errorJson);
          return { success: false, error: errorJson };
        } catch (e) {
          console.error('Token refresh failed with non-JSON response:', errorText);
          return { success: false, error: errorText };
        }
      }
      
      const data = await response.json();
      console.log('Token refresh successful:', data);
      
      if (data.token) {
        console.log('New token received, updating storage');
        const storage = getStorage();
        storage.setItem('token', data.token);
        
        // Verify the new token
        console.log('Verifying new token...');
        const verifyResult = await this.testAuth();
        return { 
          success: true, 
          data: {
            refreshResult: data,
            verifyResult
          }
        };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Error testing token refresh:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  async testVerifyLocation(placeId = 'ChIJN1t_tDeuEmsRUsoyG83frY4') {
    try {
      console.log('Testing verify-location endpoint...');
      const headers = await getAuthHeader();
      console.log('Auth headers:', headers);
      
      // Get current position if available
      let position = null;
      try {
        position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        console.log('Current position:', position.coords);
      } catch (e) {
        console.warn('Could not get current position, using default values:', e);
      }
      
      // Use current position or default values
      const testData = {
        placeId: placeId,
        latitude: position ? position.coords.latitude : -33.8688,
        longitude: position ? position.coords.longitude : 151.2093,
        accuracy: position ? position.coords.accuracy : 10,
        type: 'clockIn' as const,
        timestamp: new Date().toISOString()
      };
      
      console.log('Test data:', testData);
      
      const response = await fetch(`${API_URL}/api/time-entries/verify-location`, {
        method: 'POST',
        headers,
        body: JSON.stringify(testData)
      });
      
      console.log('Verify location response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Verify location failed:', errorJson);
          return { success: false, error: errorJson };
        } catch (e) {
          console.error('Verify location failed with non-JSON response:', errorText);
          return { success: false, error: errorText };
        }
      }
      
      const data = await response.json();
      console.log('Verify location successful:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error testing verify location:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  async testDebugModel() {
    try {
      console.log('Testing debug-model endpoint...');
      const headers = await getAuthHeader();
      console.log('Auth headers:', headers);
      
      const response = await fetch(`${API_URL}/api/time-entries/debug-model`, {
        method: 'GET',
        headers
      });
      
      console.log('Debug model response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Debug model failed:', errorJson);
          return { success: false, error: errorJson };
        } catch (e) {
          console.error('Debug model failed with non-JSON response:', errorText);
          return { success: false, error: errorText };
        }
      }
      
      const data = await response.json();
      console.log('Debug model successful:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error testing debug model:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  async testTokenStorage() {
    try {
      console.log('Testing token storage...');
      
      // Check localStorage
      const localToken = localStorage.getItem('token');
      console.log('localStorage token:', localToken ? `${localToken.substring(0, 20)}...` : 'Not found');
      
      // Check sessionStorage
      const sessionToken = sessionStorage.getItem('token');
      console.log('sessionStorage token:', sessionToken ? `${sessionToken.substring(0, 20)}...` : 'Not found');
      
      // Check getStorage function
      const storage = getStorage();
      const storageType = storage === localStorage ? 'localStorage' : 'sessionStorage';
      console.log('getStorage() returns:', storageType);
      
      // Check getAuthHeader function
      const headers = await getAuthHeader();
      console.log('getAuthHeader() returns:', headers);
      
      // Try to decode token if available
      const token = localToken || sessionToken;
      if (token) {
        try {
          // Simple JWT parsing (not secure but works for basic extraction)
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const payload = JSON.parse(jsonPayload);
          console.log('Token payload:', payload);
          
          // Check expiration
          if (payload.exp) {
            const expDate = new Date(payload.exp * 1000);
            const now = new Date();
            const isExpired = expDate < now;
            console.log('Token expiration:', expDate.toISOString());
            console.log('Current time:', now.toISOString());
            console.log('Token is', isExpired ? 'EXPIRED' : 'valid');
            console.log('Time remaining:', Math.floor((expDate.getTime() - now.getTime()) / 1000 / 60), 'minutes');
          }
          
          return { 
            success: true, 
            data: {
              storageType,
              hasLocalToken: !!localToken,
              hasSessionToken: !!sessionToken,
              tokenPayload: payload,
              headers
            }
          };
        } catch (e) {
          console.error('Error decoding token:', e);
          return { 
            success: false, 
            error: 'Error decoding token',
            data: {
              storageType,
              hasLocalToken: !!localToken,
              hasSessionToken: !!sessionToken,
              headers
            }
          };
        }
      }
      
      return { 
        success: true, 
        data: {
          storageType,
          hasLocalToken: !!localToken,
          hasSessionToken: !!sessionToken,
          headers
        }
      };
    } catch (error) {
      console.error('Error testing token storage:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  clearToken() {
    console.log('Clearing authentication token...');
    
    // Clear from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear from sessionStorage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    console.log('Token cleared. You will need to log in again.');
    
    return { success: true };
  },
  
  async clearTodaysTimeRecord() {
    try {
      console.log('Attempting to clear today\'s time record...');
      const headers = await getAuthHeader();
      
      const response = await fetch(`${API_URL}/api/time-entries/clear-today`, {
        method: 'POST',
        headers
      });
      
      console.log('Clear today\'s record response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Failed to clear today\'s record:', errorJson);
          return { success: false, error: errorJson };
        } catch (e) {
          console.error('Failed to clear today\'s record with non-JSON response:', errorText);
          return { success: false, error: errorText };
        }
      }
      
      const data = await response.json();
      console.log('Successfully cleared today\'s time record:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error clearing today\'s time record:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  async testBreakStart(placeId = 'ChIJN1t_tDeuEmsRUsoyG83frY4') {
    try {
      console.log('Testing Break Start functionality...');
      const headers = await getAuthHeader();
      console.log('Auth headers:', headers);
      
      // Get current position if available
      let position = null;
      try {
        position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        console.log('Current position:', position);
      } catch (error) {
        console.warn('Could not get current position:', error);
      }
      
      // Prepare test data for Break Start
      const testData = {
        placeId,
        latitude: position ? position.coords.latitude : -33.8688,
        longitude: position ? position.coords.longitude : 151.2093,
        accuracy: position ? position.coords.accuracy : 10,
        type: 'breakStart' as const,
        timestamp: new Date().toISOString()
      };
      
      console.log('Test data for Break Start:', testData);
      
      // First try to refresh the token
      console.log('Attempting to refresh token before Break Start test');
      const refreshResult = await api.auth.refreshToken();
      console.log('Token refresh result:', refreshResult);
      
      // Get fresh headers after token refresh
      const freshHeaders = await getAuthHeader();
      console.log('Fresh auth headers after token refresh:', freshHeaders);
      
      // Make the API call
      const response = await fetch(`${API_URL}/api/time-entries/verify-location`, {
        method: 'POST',
        headers: freshHeaders,
        body: JSON.stringify(testData)
      });
      
      console.log('Break Start test response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Break Start test failed:', errorJson);
          return { success: false, error: errorJson };
        } catch (e) {
          console.error('Break Start test failed with non-JSON response:', errorText);
          return { success: false, error: errorText };
        }
      }
      
      const data = await response.json();
      console.log('Break Start test successful:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error testing Break Start:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  async testJwtToken() {
    try {
      console.log('Testing JWT token...');
      const token = getStorage().getItem('token');
      
      if (!token) {
        console.log('No token available for JWT test');
        return { success: false, error: 'No token available' };
      }
      
      console.log('Token available, analyzing...');
      
      // Parse the token
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        const expiryDate = new Date(payload.exp * 1000);
        const now = new Date();
        const isExpired = expiryDate < now;
        const timeUntilExpiry = expiryDate.getTime() - now.getTime();
        
        console.log('JWT payload:', payload);
        console.log('JWT expiry:', expiryDate.toISOString());
        console.log('JWT expired:', isExpired);
        console.log('Time until expiry:', Math.floor(timeUntilExpiry / 1000), 'seconds');
        
        // Test the token with the server
        const response = await fetch(`${API_URL}/debug/validate-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        });
        
        console.log('Token validation response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
            console.error('Token validation failed:', errorJson);
            return { 
              success: false, 
              error: errorJson,
              tokenInfo: {
                payload,
                expiryDate: expiryDate.toISOString(),
                isExpired,
                timeUntilExpiry: Math.floor(timeUntilExpiry / 1000)
              }
            };
          } catch (e) {
            console.error('Token validation failed with non-JSON response:', errorText);
            return { 
              success: false, 
              error: errorText,
              tokenInfo: {
                payload,
                expiryDate: expiryDate.toISOString(),
                isExpired,
                timeUntilExpiry: Math.floor(timeUntilExpiry / 1000)
              }
            };
          }
        }
        
        const data = await response.json();
        console.log('Token validation successful:', data);
        return { 
          success: true, 
          data,
          tokenInfo: {
            payload,
            expiryDate: expiryDate.toISOString(),
            isExpired,
            timeUntilExpiry: Math.floor(timeUntilExpiry / 1000)
          }
        };
      } catch (e) {
        console.error('Error parsing token:', e);
        return { success: false, error: 'Invalid token format' };
      }
    } catch (error) {
      console.error('Error testing JWT token:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};

// Add global diagnostic functions for browser console testing
export const setupGlobalDiagnostics = () => {
  if (typeof window !== 'undefined') {
    console.log('Setting up global diagnostic functions...');
    
    // ... existing code ...
    
    // Add testBreakStart function
    (window as any).testBreakStart = async (placeId?: string) => {
      console.log('Running Break Start test...');
      const result = await diagnostics.testBreakStart(placeId);
      console.log('Break Start test result:', result);
      return result;
    };
    
    console.log('Global diagnostic functions available:');
    console.log('- window.testAuth() - Test authentication flow');
    console.log('- window.testDateHandling() - Test date handling');
    console.log('- window.testServerStatus() - Test server status');
    console.log('- window.testTokenRefresh() - Test token refresh');
    console.log('- window.testVerifyLocation() - Test the QR verification endpoint');
    console.log('- window.testBreakStart() - Test the Break Start functionality');
    console.log('- window.testDebugModel() - Test the debug model endpoint');
    console.log('- window.testJwtToken() - Test JWT token validation');
  }
};

// Make diagnostics available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).runDiagnostics = async () => {
    console.log('=== RUNNING DIAGNOSTICS ===');
    console.log('API_URL:', API_URL);
    
    try {
      // Test token storage first
      console.log('\n--- Token Storage Test ---');
      const tokenStorage = await diagnostics.testTokenStorage();
      console.log('Token storage result:', tokenStorage);
      
      // Check server status
      console.log('\n--- Server Status Check ---');
      const serverStatus = await diagnostics.checkServerStatus();
      console.log('Server status result:', serverStatus);
      
      // Test authentication
      console.log('\n--- Authentication Test ---');
      const authResult = await diagnostics.testAuth();
      console.log('Auth test result:', authResult);
      
      // Test token refresh
      console.log('\n--- Token Refresh Test ---');
      const refreshResult = await diagnostics.testTokenRefresh();
      console.log('Token refresh result:', refreshResult);
      
      // Test Break Start functionality
      console.log('\n--- Break Start Test ---');
      const breakStartResult = await diagnostics.testBreakStart();
      console.log('Break Start test result:', breakStartResult);
      
      // Test date handling
      console.log('\n--- Date Handling Test ---');
      const dateResult = await diagnostics.testDateHandling();
      console.log('Date test result:', dateResult);
      
      // Test debug model
      console.log('\n--- Debug Model Test ---');
      const modelResult = await diagnostics.testDebugModel();
      console.log('Debug model result:', modelResult);
      
      // Test JWT token
      console.log('\n--- JWT Token Test ---');
      const jwtResult = await diagnostics.testJwtToken();
      console.log('JWT token test result:', jwtResult);
      
      // Add a separate function for testing verify location
      (window as any).testVerifyLocation = async (placeId?: string) => {
        console.log('=== TESTING VERIFY LOCATION ===');
        const result = await diagnostics.testVerifyLocation(placeId);
        console.log('Verify location test result:', result);
        return result;
      };
      
      // Add a separate function for testing debug model
      (window as any).testDebugModel = async () => {
        console.log('=== TESTING DEBUG MODEL ===');
        const result = await diagnostics.testDebugModel();
        console.log('Debug model test result:', result);
        return result;
      };
      
      // Add a separate function for testing JWT token
      (window as any).testJwtToken = async () => {
        console.log('=== TESTING JWT TOKEN ===');
        const result = await diagnostics.testJwtToken();
        console.log('JWT token test result:', result);
        return result;
      };
      
      console.log('\n=== DIAGNOSTICS COMPLETE ===');
      return {
        tokenStorage,
        serverStatus,
        authResult,
        refreshResult,
        breakStartResult,
        dateResult,
        modelResult,
        jwtResult
      };
    } catch (error) {
      console.error('Error running diagnostics:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };
  
  // Add a utility to clear the token
  (window as any).clearToken = () => {
    console.log('=== CLEARING TOKEN ===');
    const result = diagnostics.clearToken();
    console.log('Token cleared. Please refresh the page and log in again.');
    return result;
  };
  
  // Add a utility to clear today's time record
  (window as any).clearTodaysTimeRecord = async () => {
    console.log('=== CLEARING TODAY\'S TIME RECORD ===');
    const result = await diagnostics.clearTodaysTimeRecord();
    if (result.success) {
      console.log('Time record cleared. You can now test the QR scanner again.');
    } else {
      console.error('Failed to clear time record:', result.error);
    }
    return result;
  };
  
  console.log('Diagnostics available! Run window.runDiagnostics() in console to test API connectivity');
  console.log('You can also run window.testVerifyLocation() to test the QR verification endpoint');
  console.log('To test the Break Start functionality, run window.testBreakStart()');
  console.log('To test your JWT token, run window.testJwtToken()');
  console.log('To clear your token and force re-login, run window.clearToken()');
  console.log('To clear today\'s time record for testing, run window.clearTodaysTimeRecord()');
}