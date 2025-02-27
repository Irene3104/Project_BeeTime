export const getStorage = () => 
  localStorage.getItem('rememberMe') ? localStorage : sessionStorage;

export const setAuthData = (token: string, user: any) => {
  // Store in both localStorage and sessionStorage to ensure availability
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('user', JSON.stringify(user));
};

export const clearAuthData = () => {
  // Clear from both storage locations
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  
  // Also clear any offline entries if needed
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('offlineEntry_')) {
        localStorage.removeItem(key);
      }
    }
    console.log('Cleared all auth data and offline entries');
  } catch (e) {
    console.error('Error clearing offline entries:', e);
  }
}; 