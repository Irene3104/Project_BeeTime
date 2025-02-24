import { Router } from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/authenticate';
import { isAdmin } from '../middleware/isAdmin';

const router = Router();

// 대시보드 데이터 조회 엔드포인트
router.get('/dashboard', authenticate, isAdmin, async (req, res) => {
  try {
    // 직원 수 조회 (EMPLOYEE 역할을 가진 사용자만)
    const employeeCount = await prisma.user.count({
      where: {
        role: 'EMPLOYEE'
      }
    });

    // 지점 목록 조회
    const locations = await prisma.location.findMany({
      select: {
        id: true,
        name: true,
        branch: true
      }
    });

    // 리포트 수 조회 (나중에 구현)
    const reportCount = await prisma.timeRecord.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30)) // 최근 30일
        }
      }
    });

    res.json({
      employeeCount,
      locations,
      reportCount
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// 직원 수 조회 엔드포인트
router.get('/dashboard/employee-count', authenticate, isAdmin, async (req, res) => {
  console.log('[Admin API] Fetching employee count...');
  try {
    console.log('[Admin API] Authenticated user:', req.user);
    
    const employeeCount = await prisma.user.count({
      where: {
        role: 'EMPLOYEE'
      }
    });
    
    console.log('[Admin API] Employee count result:', employeeCount);
    res.json({ employeeCount });
  } catch (error) {
    console.error('[Admin API] Error details:', error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : 'Unknown error');
    res.status(500).json({ 
      error: 'Failed to fetch employee count',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 지점 목록만 조회하는 엔드포인트
router.get('/locations', authenticate, isAdmin, async (req, res) => {
  console.log('[Admin API] Location route accessed');
  try {
    const locations = await prisma.location.findMany({
      select: {
        id: true,
        name: true,
        branch: true
      },
      orderBy: {
        name: 'asc'  // 이름 기준 오름차순 정렬
      }
    });
    
    console.log('[Admin API] Locations found:', locations);
    res.json({ locations });
  } catch (error) {
    console.error('[Admin API] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch locations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 테스트용 라우트 추가
router.get('/test', (req, res) => {
  console.log('[Admin API] Test route accessed');
  res.json({ message: 'Admin router is working' });
});

export default router; 