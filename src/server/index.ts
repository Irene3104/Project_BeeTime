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

app.use(cors({
  origin: isProduction
    ? 'https://project-bee-time-sandy.vercel.app'
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));
app.use(express.json());

// Public routes
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/locations', locationRouter);

// Protected routes
app.use('/api/time-entries', authenticate, timeEntriesRouter);
app.use('/api/time-records', authenticate, timeRecordsRouter);
// Admin routes
app.use('/admin', adminRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('회원가입 시 필요한 지점 목록 조회: GET /locations');
  console.log('회원가입 요청: POST /auth/signup');
});