import { Router } from 'express';
import { prisma } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      select: {
        id: true,
        name: true,
        branch: true,
        address: true,
        company: true
      }
    });
    
    console.log('지점 목록 조회:', locations);
    res.json(locations);
  } catch (error) {
    console.error('지점 목록 조회 실패:', error);
    res.status(500).json({ error: '지점 목록을 불러오는데 실패했습니다.' });
  }
});

router.get('/:id/details', async (req, res) => {
  try {
    const location = await prisma.location.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Error fetching location details:', error);
    res.status(500).json({ error: 'Failed to fetch location details' });
  }
});

router.get('/by-place-id/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    
    const location = await prisma.location.findFirst({
      where: { placeId }
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Error finding location by place ID:', error);
    res.status(500).json({ error: 'Failed to find location' });
  }
});

export { router as locationRouter }; 

