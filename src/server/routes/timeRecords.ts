import { Router } from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/authenticate';
import { format, parse } from 'date-fns';
import { isAdmin } from '../middleware/isAdmin';
import { ReportService } from '../services/reportService';

const router = Router();


//========== Time Activity 페이지, 사용자 근무 기록 조회 API========================
router.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    console.log('받은 요청 데이터:', {
      userId,
      startDate,
      endDate
    });

    if (startDate && endDate) {
      // Prisma에서 raw SQL 쿼리 사용
      const records = await prisma.$queryRaw`
        SELECT 
          id, 
          date, 
          "clockInTime", 
          "clockOutTime", 
          "breakStartTime1", 
          "breakEndTime1", 
          "breakStartTime2", 
          "breakEndTime2", 
          "breakStartTime3", 
          "breakEndTime3", 
          "workingHours", 
          "breakMinutes"
        FROM "TimeRecord"
        WHERE "userId" = ${userId}
        AND TO_DATE(date, 'DD-MM-YYYY') BETWEEN ${startDate}::date AND ${endDate}::date
        ORDER BY TO_DATE(date, 'DD-MM-YYYY') DESC
      ` as any[];
      
      console.log(`✅ 조회된 기록 수: ${records.length}`);
      
      if (records.length > 0) {
        console.log('📝 첫 번째 기록:', JSON.stringify(records[0], null, 2));
      } else {
        console.log('❗ 조회된 기록 없음. 조건:', {
          userId,
          startDate,
          endDate
        });
      }
      
      return res.json(records);
    } else {
      // 날짜 범위가 없는 경우 기본 쿼리 실행
      const records = await prisma.timeRecord.findMany({
        where: { userId },
        select: {
          id: true,
          date: true,
          clockInTime: true,
          clockOutTime: true,
          breakStartTime1: true,
          breakEndTime1: true,
          breakStartTime2: true,
          breakEndTime2: true,
          breakStartTime3: true,
          breakEndTime3: true,
          workingHours: true,
          breakMinutes: true
        },
        orderBy: {
          date: 'desc'
        }
      });
      
      console.log(`✅ 조회된 기록 수: ${records.length}`);
      
      return res.json(records);
    }

    // 클라이언트에 보내기 전에 날짜 형식을 yyyy-MM-dd로 변환
    const formattedRecords = records.map(record => {
      try {
        // 디버깅을 위한 로그 추가
        console.log('변환 전 날짜:', record.date);
        
        // 날짜 파싱 및 변환
        const parsedDate = parse(record.date, 'dd-MM-yyyy', new Date());
        const formattedDate = format(parsedDate, 'yyyy-MM-dd');
        
        console.log('변환 후 날짜:', formattedDate);
        
        return {
          ...record,
          date: formattedDate
        };
      } catch (error) {
        console.error(`날짜 변환 오류 (${record.date}):`, error);
        // 오류 발생 시 원본 날짜 반환
        return record;
      }
    });

    res.json(formattedRecords);
    
  } catch (error) {
    console.error('❌ 근무 기록 조회 중 오류 발생:', error);
    console.error('상세 에러:', {
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({ 
      error: '근무 기록 조회 중 오류가 발생했습니다',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

//============================ admin 계정 관련 API =====================================

// 리포트 목록 가져오기 엔드포인트
router.get('/reports', authenticate, async (req, res) => {
  try {
    console.log("리포트 목록 요청 받음");
    
    // 관리자 권한 확인
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    return res.json(reports);
  } catch (error) {
    console.error("리포트 목록 조회 오류:", error);
    return res.status(500).json({ error: '서버 오류' });
  }
});

// 리포트 생성 엔드포인트
router.post('/reports/generate', authenticate, isAdmin, async (req, res) => {
  try {
    console.log('[Report API] Report generation started');
    const { startDate, endDate, locationId } = req.body;
    
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // 날짜 문자열로 변환 (DB 형식과 일치하도록 하이픈 사용)
    const formattedStartDate = format(new Date(startDate), 'dd-MM-yyyy');
    const formattedEndDate = format(new Date(endDate), 'dd-MM-yyyy');
    
    console.log(`[Report API] Date range: ${formattedStartDate} to ${formattedEndDate}`);
    console.log(`[Report API] Location ID: ${locationId || 'All Locations'}`);

    // 타임레코드 조회 - raw SQL 쿼리 사용
    let timeRecords;
    if (locationId) {
      // 특정 위치에 대한 쿼리
      timeRecords = await prisma.$queryRaw`
        SELECT t.*, 
          u.name as "userName", u.email as "userEmail", u.title as "userTitle",
          l.name as "locationName", l.branch as "locationBranch"
        FROM "TimeRecord" t
        LEFT JOIN "User" u ON t."userId" = u.id
        LEFT JOIN "Location" l ON t."locationId" = l.id
        WHERE TO_DATE(t.date, 'DD-MM-YYYY') 
          BETWEEN TO_DATE(${formattedStartDate}, 'DD-MM-YYYY') 
          AND TO_DATE(${formattedEndDate}, 'DD-MM-YYYY')
        AND t."locationId" = ${parseInt(locationId)}
        ORDER BY TO_DATE(t.date, 'DD-MM-YYYY') ASC
      ` as any[];
    } else {
      // 모든 위치에 대한 쿼리
      timeRecords = await prisma.$queryRaw`
        SELECT t.*, 
          u.name as "userName", u.email as "userEmail", u.title as "userTitle",
          l.name as "locationName", l.branch as "locationBranch"
        FROM "TimeRecord" t
        LEFT JOIN "User" u ON t."userId" = u.id
        LEFT JOIN "Location" l ON t."locationId" = l.id
        WHERE TO_DATE(t.date, 'DD-MM-YYYY') 
          BETWEEN TO_DATE(${formattedStartDate}, 'DD-MM-YYYY') 
          AND TO_DATE(${formattedEndDate}, 'DD-MM-YYYY')
        ORDER BY TO_DATE(t.date, 'DD-MM-YYYY') ASC
      ` as any[];
    }

    // 결과 데이터 구조 변환 (Prisma 구조와 일치하도록)
    const processedRecords = timeRecords.map(record => ({
      ...record,
      user: {
        name: record.userName,
        email: record.userEmail,
        title: record.userTitle
      },
      location: {
        name: record.locationName,
        branch: record.locationBranch
      }
    }));

    console.log(`[Report API] Found ${processedRecords.length} records`);
    
    if (processedRecords.length === 0) {
      return res.status(404).json({ error: 'No records found for the specified period' });
    }

    // 위치 정보 가져오기
    let locationName = 'All Locations';
    if (locationId) {
      const location = await prisma.location.findUnique({
        where: { id: parseInt(locationId) },
        select: { name: true, branch: true }
      });
      
      if (location) {
        locationName = location.branch ? 
          `${location.name} - ${location.branch}` : 
          location.name;
      }
    }

    console.log('[Report API] Calling ReportService.generateAttendanceReport');
    try {
      const excelBuffer = await ReportService.generateAttendanceReport(processedRecords);
      console.log('[Report API] Excel buffer generated, size:', excelBuffer.byteLength, 'bytes');

      // 파일명 생성 (형식 통일)
      const fileName = `${locationName} Report_${formattedStartDate} ~ ${formattedEndDate}.xlsx`;
      
      // 리포트 정보를 데이터베이스에 저장
      const reportTitle = `${locationName}_Report_${formattedStartDate} ~ ${formattedEndDate}`;
      
      // Ensure the buffer is properly stored
      const report = await prisma.report.create({
        data: {
          title: reportTitle,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          fileName: fileName,
          fileData: excelBuffer,
          locationId: locationId ? parseInt(locationId) : null,
          creatorId: req.user.id,
          updatedAt: new Date()
        }
      });
      
      console.log(`[Report API] Report saved to database with ID: ${report.id}`);
      
      // 생성된 리포트 정보 반환
      res.status(201).json({
        id: report.id,
        title: report.title,
        startDate: report.startDate.toISOString().split('T')[0],
        endDate: report.endDate.toISOString().split('T')[0],
        fileName: report.fileName,
        locationId: report.locationId,
        locationName: locationName,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString()
      });
    } catch (error: any) {
      console.error('[Report API] Error in Excel generation:', error);
      return res.status(500).json({ 
        error: 'Failed to generate Excel report', 
        details: error.message 
      });
    }
  } catch (error: any) {
    console.error('[Report API] Error generating report:', error);
    res.status(500).json({ 
      error: 'Failed to generate report',
      details: error.message
    });
  }
});

// 리포트 목록 조회 API 수정
router.get('/reports', authenticate, isAdmin, async (req, res) => {
  try {
    // 관계 정보 없이 기본 리포트 데이터만 가져오기
    const reports = await prisma.report.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // 데이터베이스 오류 없이 기본 데이터만 반환
    const formattedReports = reports.map((report: any) => ({
      id: report.id,
      title: report.title,
      startDate: report.startDate.toISOString().split('T')[0],
      endDate: report.endDate.toISOString().split('T')[0],
      fileName: report.fileName,
      locationId: report.locationId,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString()
    }));
    
    res.json(formattedReports);
  } catch (error) {
    console.error('[Report API] Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// 리포트 삭제 API 추가
router.post('/reports/delete', authenticate, isAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid report IDs' });
    }
    
    console.log('[Report API] Deleting reports with IDs:', ids);
    
    // 리포트 삭제
    const result = await prisma.report.deleteMany({
      where: {
        id: {
          in: ids.map(id => parseInt(id))
        }
      }
    });
    
    console.log(`[Report API] Deleted ${result.count} reports`);
    
    res.json({ 
      message: `${result.count} reports deleted successfully`,
      deletedCount: result.count
    });
  } catch (error) {
    console.error('[Report API] Error deleting reports:', error);
    res.status(500).json({ 
      error: 'Failed to delete reports',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 리포트 다운로드 API
router.get('/reports/:id/download', authenticate, isAdmin, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    
    // 리포트 정보 조회
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // 응답 헤더 설정
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(report.fileName)}"`);
    
    // Ensure the fileData is properly handled as a Buffer
    const buffer = Buffer.from(report.fileData);
    
    // Log the buffer size for debugging
    console.log(`[Report API] Sending report ${reportId} with buffer size: ${buffer.length} bytes`);
    
    // 저장된 파일 데이터 전송
    res.send(buffer);
  } catch (error) {
    console.error('[Report API] Error downloading report:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

// 지점 목록 조회 API 추가
router.get('/locations', authenticate, isAdmin, async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        branch: true
      }
    });
    
    res.json(locations);
  } catch (error) {
    console.error('[API] Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// export { router as timeRecordsRouter };
//

export default router;