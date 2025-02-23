import { Request, Response, NextFunction } from 'express';

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin 권한이 필요합니다.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};