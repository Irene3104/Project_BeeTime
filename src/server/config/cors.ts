import { CorsOptions } from 'cors';

export const corsOptions: CorsOptions = {
  origin: [
    'https://project-bee-time-sandy.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}; 