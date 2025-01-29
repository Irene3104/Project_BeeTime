const isProduction = import.meta.env.PROD;

export const API_URL = isProduction
  ? 'https://project-beetime.onrender.com'
  : 'http://localhost:3000';

export const CLIENT_URL = isProduction
  ? 'https://project-bee-time-sandy.vercel.app'
  : 'http://localhost:5173';

export const GOOGLE_CALLBACK_URL = `${CLIENT_URL}/auth/google/callback`; 

