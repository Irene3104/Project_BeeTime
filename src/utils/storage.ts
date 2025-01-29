export const getStorage = () => 
  localStorage.getItem('rememberMe') ? localStorage : sessionStorage;

export const setAuthData = (token: string, user: any) => {
  const storage = getStorage();
  storage.setItem('token', token);
  storage.setItem('user', JSON.stringify(user));
};

export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
}; 