import { Router } from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/authenticate';
import { isAdmin } from '../middleware/isAdmin';

const router = Router();

router.get('/AdminDashboard', authenticate, isAdmin, async (req, res) => {
  try {
    const employeeCount = await prisma.user.count({
      where: {
        role: 'EMPLOYEE'
      }
    });

    const locations = await prisma.location.findMany({
      select: {
        name: true,
        branch: true
      }
    });

    const reportCount = 31; // 임시 데이터

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

export default router; 