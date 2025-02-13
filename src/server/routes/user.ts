import express from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/authenticate'; 

const router = express.Router();


// 사용자 정보 조회
router.get('/info', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        location: {
          select: {
            id: true,
            name: true,
            branch: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json(user);
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 정보 업데이트
router.put('/update', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    const { name, locationId } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (locationId) updateData.locationId = locationId;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        location: {
          select: {
            name: true,
            branch: true,
          },
        },
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('사용자 정보 업데이트 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 계정 삭제
router.delete('/delete', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log('=== 계정 삭제 시작 ===');
    console.log('삭제할 userId:', userId);

    if (!userId) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. RefreshToken 삭제 (User와 1:N 관계)
      await tx.refreshToken.deleteMany({
        where: { userId }
      });
      console.log('RefreshToken 삭제 완료');

      // 2. BreakRecord 삭제 (TimeRecord의 하위 레코드)
      await tx.breakRecord.deleteMany({
        where: {
          timeRecord: {
            userId
          }
        }
      });
      console.log('BreakRecord 삭제 완료');

      // 3. TimeRecord 삭제 (User와 1:N 관계)
      await tx.timeRecord.deleteMany({
        where: { userId }
      });
      console.log('TimeRecord 삭제 완료');

      // 4. LocationUser 삭제 (User와 Location의 N:M 관계)
      await tx.locationUser.deleteMany({
        where: { userId }
      });
      console.log('LocationUser 삭제 완료');

      // 5. WorkSummary 삭제 (User 관련 기록)
      await tx.workSummary.deleteMany({
        where: { userId }
      });
      console.log('WorkSummary 삭제 완료');

      // 6. 마지막으로 User 삭제
      await tx.user.delete({
        where: { id: userId }
      });
      console.log('User 삭제 완료');
    });

    console.log('=== 계정 삭제 완료 ===');
    res.status(200).json({ message: '계정이 성공적으로 삭제되었습니다.' });

  } catch (error) {
    console.error('=== 계정 삭제 실패 ===');
    console.error('에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});
  
  



export default router;