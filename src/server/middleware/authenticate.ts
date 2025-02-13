import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { User } from  '../../types/index';


interface JwtPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth Header:', authHeader); // 헤더 확인

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const token = authHeader.split(' ')[1];
    console.log('미들웨어 Token:', token); // 토큰 확인
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    console.log('Decoded:', decoded); // 디코딩된 정보 확인

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    console.log('Found user:', user); // 찾은 사용자 확인

    if (!user) {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }

    req.user = user as User;
    next();
  } catch (error) {
    return res.status(401).json({ error: '인증에 실패했습니다.' });
  }
};