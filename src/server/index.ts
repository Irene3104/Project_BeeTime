import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import {timeEntriesRouter} from './routes/timeEntries';
import { timeRecordsRouter } from './routes/timeRecords';
import { locationRouter } from './routes/locations';
import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/authenticate';
import userRouter from './routes/user';
import adminRouter from './routes/admin';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const isProduction = process.env.NODE_ENV === 'production';

// Add detailed CORS configuration
app.use(cors({
  origin: isProduction
    ? ['https://project-bee-time-sandy.vercel.app', 'https://project-beetime.onrender.com']
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));

app.use(express.json());

// Enhanced request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`Headers: ${JSON.stringify(req.headers)}`);
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  console.log('Root endpoint accessed');
  res.status(200).json({ message: 'BeeTime API Server is running' });
});

// Health check endpoints - make sure these are defined BEFORE other routes
app.get('/health', (req, res) => {
  console.log('Health endpoint accessed');
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/health', (req, res) => {
  console.log('API health endpoint accessed');
  res.status(200).json({ status: 'ok', message: 'API is available' });
});

// Render-specific health check
app.get('/.well-known/render-health', (req, res) => {
  console.log('Render health check accessed');
  res.status(200).send('OK');
});

// Public routes
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/locations', locationRouter);

// Protected routes
app.use('/api/time-entries', authenticate, timeEntriesRouter);
app.use('/api/time-records', authenticate, timeRecordsRouter);
// Admin routes
app.use('/admin', adminRouter);

// Catch-all route handler for undefined routes
app.use((req, res) => {
  console.log(`[404] Received request for: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    availableEndpoints: [
      '/',
      '/health',
      '/api/health',
      '/auth/login',
      '/auth/signup',
      '/locations',
      '/api/time-entries',
      '/api/time-records',
      '/admin'
    ]
  });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS origin: ${isProduction ? 'https://project-bee-time-sandy.vercel.app' : 'http://localhost:5173'}`);
  console.log('회원가입 시 필요한 지점 목록 조회: GET /locations');
  console.log('회원가입 요청: POST /auth/signup');
});