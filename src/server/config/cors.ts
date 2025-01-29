import { CorsOptions } from 'cors';

const isProduction = process.env.NODE_ENV === 'production';

export const corsOptions: CorsOptions = {
  origin: isProduction
    ? ['https://project-bee-time-sandy.vercel.app', 'https://project-beetime.onrender.com']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}; 