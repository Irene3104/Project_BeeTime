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

// 직원 목록 조회
router.get('/employees', authenticate, isAdmin, async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      where: { 
        role: 'EMPLOYEE' 
      },
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        location: {
          select: {
            id: true,
            name: true,
            branch: true
          }
        }
      }
    });
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: '직원 목록 조회 실패' });
  }
});

// 직원 정보 수정
router.put('/employees/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  try {
    const updatedEmployee = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        location: {
          select: {
            name: true
          }
        }
      }
    });
    res.json(updatedEmployee);
  } catch (error) {
    res.status(500).json({ error: '직원 정보 수정 실패' });
  }
});

// 직원 추가
router.post('/employees', authenticate, isAdmin, async (req, res) => {
  const { name, email, title, locationId } = req.body;
  
  try {
    const newEmployee = await prisma.user.create({
      data: {
        name,
        email,
        title,
        locationId: parseInt(locationId),
        role: 'EMPLOYEE',
        password: '임시비밀번호' // 실제 구현시에는 랜덤 비밀번호 생성 필요
      },
      include: {
        location: {
          select: {
            name: true
          }
        }
      }
    });
    res.json(newEmployee);
  } catch (error) {
    res.status(500).json({ error: '직원 추가 실패' });
  }
});

// 직원 삭제
router.delete('/employees/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log('=== 직원 삭제 시작 ===');
    console.log('삭제할 userId:', id);

    await prisma.$transaction(async (tx) => {
      // 1. RefreshToken 삭제
      await tx.refreshToken.deleteMany({
        where: { userId: id }
      });
      console.log('RefreshToken 삭제 완료');

      // 2. BreakRecord 삭제
      await tx.breakRecord.deleteMany({
        where: {
          timeRecord: {
            userId: id
          }
        }
      });
      console.log('BreakRecord 삭제 완료');

      // 3. TimeRecord 삭제
      await tx.timeRecord.deleteMany({
        where: { userId: id }
      });
      console.log('TimeRecord 삭제 완료');

      // 4. LocationUser 삭제
      await tx.locationUser.deleteMany({
        where: { userId: id }
      });
      console.log('LocationUser 삭제 완료');

      // 5. WorkSummary 삭제
      await tx.workSummary.deleteMany({
        where: { userId: id }
      });
      console.log('WorkSummary 삭제 완료');

      // 6. 마지막으로 User 삭제
      await tx.user.delete({
        where: { id }
      });
      console.log('User 삭제 완료');
    });

    console.log('=== 직원 삭제 완료 ===');
    res.json({ message: '직원이 성공적으로 삭제되었습니다.' });

  } catch (error) {
    console.error('=== 직원 삭제 실패 ===');
    console.error('에러:', error);
    res.status(500).json({ error: '직원 삭제 실패' });
  }
});

export default router; 