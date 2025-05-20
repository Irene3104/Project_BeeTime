import { Router } from 'express';
import { prisma } from '../db';
// import { PrismaClient } from '@prisma/client'; // If needed for DB queries
// import { computeDistance } from 'somewhere/computeDistance'; // If you need to calculate actual distances

const router = Router();

// Example: POST /api/qr/verify
// Validate the incoming QR data, look up in DB, or do any custom logic you need
router.post('/verify', async (req, res) => {
  try {
    const { qrData } = req.body;
    console.log('[DEBUG/QR] 검증 요청 데이터:', JSON.stringify(req.body));
    console.log('[DEBUG/QR] 헤더 정보:', JSON.stringify(req.headers));
    console.log('[DEBUG/QR] QR 코드:', qrData);

    // 1) QR 코드 데이터 확인
    if (!qrData) {
      console.log('[DEBUG/QR] QR 데이터 없음');
      return res.status(400).json({ success: false, message: 'QR 코드 데이터가 없습니다' });
    }

    console.log('[DEBUG/QR] placeId로 위치 검색 시작. placeId:', qrData);
    // 2) 데이터베이스에서 해당 placeId가 등록된 위치인지 확인
    const location = await prisma.location.findFirst({
      where: { placeId: qrData }
    });
    
    console.log('[DEBUG/QR] 위치 검색 결과:', location ? JSON.stringify({
      id: location.id,
      name: location.name,
      placeId: location.placeId
    }) : '찾을 수 없음');

    if (!location) {
      console.log('[DEBUG/QR] 등록되지 않은 QR 코드:', qrData);
      return res.status(404).json({ 
        success: false, 
        message: '등록되지 않은 QR 코드입니다' 
      });
    }

    // 3) 유효한 QR 코드이므로 성공 응답 반환
    console.log('[DEBUG/QR] QR 코드 검증 성공:', qrData, '위치:', location.name);
    return res.json({ 
      success: true, 
      message: 'QR 코드 검증 성공', 
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
        placeId: location.placeId
      }
    });

  } catch (error) {
    console.error('[DEBUG/QR] QR 코드 검증 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다' 
    });
  }
});

// QR 코드 생성 API (관리자 도구용)
router.post('/generate', async (req, res) => {
  try {
    const { locationId } = req.body;
    
    if (!locationId) {
      return res.status(400).json({ success: false, message: '위치 ID가 필요합니다' });
    }
    
    const location = await prisma.location.findUnique({
      where: { id: parseInt(locationId) }
    });
    
    if (!location) {
      return res.status(404).json({ success: false, message: '존재하지 않는 위치입니다' });
    }
    
    // 이미 placeId가 있으면 그것을 사용하고, 없으면 새로 생성
    const qrData = location.placeId || `location_${location.id}_${Date.now()}`;
    
    // placeId가 없었다면 업데이트
    if (!location.placeId) {
      await prisma.location.update({
        where: { id: location.id },
        data: { placeId: qrData }
      });
    }
    
    return res.json({
      success: true,
      qrData,
      location
    });
    
  } catch (error) {
    console.error('QR 코드 생성 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다' });
  }
});

// QR 코드 유효성 검증 및 사용자 위치 확인 API
router.post('/validate-check-in', async (req, res) => {
  try {
    const { qrData, userId } = req.body;
    console.log('[DEBUG/QR] 체크인 검증 요청:', JSON.stringify(req.body));
    
    if (!qrData || !userId) {
      console.log('[DEBUG/QR] 필수 데이터 누락. qrData:', !!qrData, 'userId:', !!userId);
      return res.status(400).json({ 
        success: false, 
        message: 'QR 코드와 사용자 ID가 필요합니다' 
      });
    }
    
    // 1) 데이터베이스에서 QR 코드 검증
    console.log('[DEBUG/QR] location 테이블에서 placeId 검색:', qrData);
    const location = await prisma.location.findFirst({
      where: { placeId: qrData }
    });
    
    console.log('[DEBUG/QR] 위치 검색 결과:', location ? JSON.stringify({
      id: location.id, 
      name: location.name,
      placeId: location.placeId
    }, null, 2) : '찾을 수 없음');
    
    if (!location) {
      console.log('[DEBUG/QR] 등록되지 않은 QR 코드:', qrData);
      return res.status(404).json({ 
        success: false, 
        message: '등록되지 않은 QR 코드입니다' 
      });
    }
    
    // 2) 사용자가 해당 위치에 할당되어 있는지 확인
    console.log('[DEBUG/QR] 사용자 정보 조회 시작. userId:', userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        location: true,
        locationUsers: {
          include: {
            location: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('[DEBUG/QR] 사용자를 찾을 수 없음. userId:', userId);
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다' 
      });
    }
    
    console.log('[DEBUG/QR] 사용자 정보:', {
      id: user.id,
      email: user.email,
      locationId: user.locationId,
      hasDirectLocation: !!user.location,
      locationUserCount: user.locationUsers?.length || 0
    });
    
    // 3) 사용자의 위치와 QR 코드 위치 일치 확인
    // - 직접 관계(locationId)를 통한 확인
    let isAuthorized = user.locationId === location.id;
    console.log('[DEBUG/QR] 직접 위치 권한 확인:', isAuthorized, 
      '(사용자 locationId:', user.locationId, 'QR 위치 id:', location.id, ')');
    
    // - LocationUser 테이블을 통한 확인 (여러 위치 할당 가능)
    if (!isAuthorized && user.locationUsers) {
      const locationUserMatches = user.locationUsers.filter(lu => 
        lu.locationId === location.id && (!lu.endDate || new Date(lu.endDate) > new Date())
      );
      
      isAuthorized = locationUserMatches.length > 0;
      
      console.log('[DEBUG/QR] 위치 권한 추가 확인:', {
        통과: isAuthorized,
        매칭_위치_수: locationUserMatches.length,
        사용자_위치_전체: user.locationUsers.map(lu => ({
          locationId: lu.locationId,
          startDate: lu.startDate,
          endDate: lu.endDate,
          isActive: !lu.endDate || new Date(lu.endDate) > new Date()
        }))
      });
    }
    
    if (!isAuthorized) {
      console.log('[DEBUG/QR] 위치 권한 없음. 사용자:', userId, '위치:', location.id);
      return res.status(403).json({ 
        success: false, 
        message: '해당 위치에 대한 권한이 없습니다' 
      });
    }
    
    console.log('[DEBUG/QR] 위치 인증 성공:', {
      userId: user.id,
      locationName: location.name,
      locationId: location.id
    });
    
    return res.json({
      success: true, 
      message: '출근 인증 성공',
      location
    });
    
  } catch (error) {
    console.error('[DEBUG/QR] 출근 인증 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다' 
    });
  }
});

export { router as qrRouter }; 