import { Router } from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/authenticate';
import { isAdmin } from '../middleware/isAdmin';
import { ReportService } from '../services/reportService';
import { format } from 'date-fns';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    console.log('Fetching time records for user:', userId);  // 디버깅용 로그
    
    // DB에서 시간 기록 조회
    const timeRecords = await prisma.timeRecord.findMany({
      where: {
        userId: userId
      },
      select: {
        date: true,
        clockInTime: true,
        clockOutTime: true,
        breakStartTime: true,
        breakEndTime: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    console.log('Found records:', timeRecords.length);  // 디버깅용 로그
    res.json(timeRecords);
    
  } catch (error) {
    console.error('Error fetching time records:', error);
    res.status(500).json({ error: 'Failed to fetch time records' });
  }
});

// 리포트 생성 엔드포인트
router.post('/reports/generate', authenticate, isAdmin, async (req, res) => {
  try {
    console.log('[Report API] Report generation started');
    const { startDate, endDate, locationId } = req.body;
    
    // 날짜 문자열로 변환 (DD-MM-YYYY 형식으로 통일)
    const formattedStartDate = format(new Date(startDate), 'dd-MM-yyyy');
    const formattedEndDate = format(new Date(endDate), 'dd-MM-yyyy');
    
    console.log(`[Report API] Date range: ${formattedStartDate} to ${formattedEndDate}`);
    console.log(`[Report API] Location ID: ${locationId || 'All Locations'}`);

    // 타임레코드 조회 조건 설정
    const where: any = {};
    
    // 날짜 범위 설정 (문자열 비교 대신 날짜 객체 사용)
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    startDateObj.setHours(0, 0, 0, 0);
    endDateObj.setHours(23, 59, 59, 999);
    
    where.date = {
      gte: formattedStartDate,
      lte: formattedEndDate
    };
    
    if (locationId) {
      where.locationId = parseInt(locationId);
    }

    console.log('[Report API] Query conditions:', JSON.stringify(where));

    // 타임레코드 데이터 조회
    const timeRecords = await prisma.timeRecord.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            title: true
          }
        },
        location: {
          select: {
            name: true,
            branch: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log(`[Report API] Found ${timeRecords.length} records`);
    console.log('[Report API] First few records:', timeRecords.slice(0, 3));
    
    if (timeRecords.length === 0) {
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
    const excelBuffer = await ReportService.generateAttendanceReport(timeRecords);
    console.log('[Report API] Excel buffer generated');

    // 파일명 생성
    const fileName = `${locationName}_Attendance Report_${formattedStartDate} to ${formattedEndDate}.xlsx`;
    
    // 리포트 정보를 데이터베이스에 저장
    const reportTitle = `${locationName} Attendance Report ${formattedStartDate} to ${formattedEndDate}`;
    const report = await prisma.report.create({
      data: {
        title: reportTitle,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        fileName: fileName,
        fileData: Buffer.from(excelBuffer),
        locationId: locationId ? parseInt(locationId) : null,
        creatorId: req.user.id
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
      createdAt: report.createdAt.toISOString()
    });
    
  } catch (error) {
    console.error('[Report API] Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// 리포트 목록 조회 API 수정
router.get('/reports', authenticate, isAdmin, async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        location: {
          select: {
            name: true,
            branch: true
          }
        },
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    // 응답 데이터 가공
    const formattedReports = reports.map(report => ({
      id: report.id,
      title: report.title,
      startDate: report.startDate.toISOString().split('T')[0],
      endDate: report.endDate.toISOString().split('T')[0],
      fileName: report.fileName,
      locationId: report.locationId,
      locationName: report.location ? 
        (report.location.branch ? 
          `${report.location.name} - ${report.location.branch}` : 
          report.location.name) : 
        null,
      createdAt: report.createdAt.toISOString()
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
    res.setHeader('Content-Disposition', `attachment; filename=${report.fileName}`);
    
    // 저장된 파일 데이터 전송
    res.send(report.fileData);
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

export { router as timeRecordsRouter };