import { Router } from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/authenticate';
import { isAdmin } from '../middleware/isAdmin';
import fetch from 'node-fetch';

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

// 지점 목록 조회 엔드포인트
router.get('/locations', authenticate, isAdmin, async (req, res) => {
  console.log('[Admin API] Location route accessed');
  try {
    const locations = await prisma.location.findMany({
      select: {
        id: true,
        name: true,
        branch: true,
        address: true,
        company: true
      },
      orderBy: {
        name: 'asc'  // 이름 기준 오름차순 정렬
      }
    });
    
    // ABN 필드 추가 및 데이터 가공
    const locationsWithABN = locations.map(location => ({
      ...location,
      abn: '-'  // ABN 필드가 없으므로 기본값 '-' 설정
    }));
    
    console.log('[Admin API] Locations found:', locationsWithABN);
    res.json({ locations: locationsWithABN });
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

// Location 삭제 엔드포인트 - 하드 삭제 방식
router.delete('/locations/:id', authenticate, isAdmin, async (req, res) => {
  console.log('[Admin API] Delete location route accessed');
  try {
    const { id } = req.params;
    const locationId = Number(id);
    
    console.log(`[Admin API] Attempting to delete location with ID: ${locationId}`);
    
    // 지점 존재 여부 확인
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });
    
    if (!location) {
      console.log(`[Admin API] Location with ID ${locationId} not found`);
      return res.status(404).json({ error: '지점을 찾을 수 없습니다.' });
    }
    
    // 하드 삭제 실행
    await prisma.location.delete({
      where: { id: locationId }
    });
    
    console.log(`[Admin API] Location ${locationId} deleted successfully`);
    res.status(200).json({ message: '지점이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('[Admin API] Error during location deletion:', error);
    res.status(500).json({ 
      error: '지점 삭제 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Location 추가 엔드포인트 수정
router.post('/locations', authenticate, isAdmin, async (req, res) => {
  console.log('[Admin API] Add location route accessed');
  try {
    // 요청 본문 로깅
    console.log('[Admin API] Request body:', req.body);
    
    const { name, branch, address, company, abn } = req.body;
    
    // 필수 필드 검증
    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required fields.' });
    }
    
    // 주소로부터 Place ID 가져오기
    let placeId = null;
    try {
      // Google API 키
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      
      // 주소를 인코딩하여 URL에 포함
      const encodedAddress = encodeURIComponent(address);
      
      console.log(`[Admin API] Geocoding address: ${address}`);
      
      // Geocoding API를 사용하여 주소를 좌표로 변환
      const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
      const geocodingResponse = await fetch(geocodingUrl);
      const geocodingData = await geocodingResponse.json();
      
      console.log(`[Admin API] Geocoding response status: ${geocodingData.status}`);
      
      // 응답 확인
      if (geocodingData.status === 'OK' && geocodingData.results && geocodingData.results.length > 0) {
        // 첫 번째 결과에서 Place ID 추출
        placeId = geocodingData.results[0].place_id;
        console.log(`[Admin API] Found Place ID: ${placeId}`);
      } else {
        console.log(`[Admin API] No Place ID found for address: ${address}`);
      }
    } catch (geocodingError) {
      console.error('[Admin API] Error during geocoding:', geocodingError);
    }
    
    // 데이터 객체 생성 (필수 필드만 포함)
    const locationData: any = {
      name,
      address
    };
    
    // 선택적 필드는 값이 있을 때만 추가 (null 허용)
    if (branch !== undefined && branch !== '') locationData.branch = branch;
    if (company !== undefined && company !== '') locationData.company = company;
    if (abn !== undefined && abn !== '') locationData.abn = abn;
    if (placeId) locationData.placeId = placeId;
    
    console.log('[Admin API] Creating location with data:', locationData);
    
    // 새 지점 생성
    const newLocation = await prisma.location.create({
      data: locationData
    });
    
    console.log('[Admin API] New location created:', newLocation);
    res.status(201).json(newLocation);
  } catch (error) {
    console.error('[Admin API] Error creating location:', error);
    res.status(500).json({ 
      error: 'Failed to create location',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 주소로부터 Place ID 가져오기 엔드포인트
router.get('/geocode', authenticate, isAdmin, async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: '주소가 필요합니다.' });
    }
    
    // Google API 키
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    // 주소를 인코딩하여 URL에 포함
    const encodedAddress = encodeURIComponent(address);
    
    // Geocoding API를 사용하여 주소를 좌표로 변환
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = await geocodingResponse.json();
    
    // 응답 확인
    if (geocodingData.status !== 'OK' || !geocodingData.results || geocodingData.results.length === 0) {
      return res.status(404).json({ error: '주소를 찾을 수 없습니다.' });
    }
    
    // 첫 번째 결과에서 Place ID 추출
    const placeId = geocodingData.results[0].place_id;
    
    res.json({ placeId });
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ 
      error: '지오코딩 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 