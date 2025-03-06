import ExcelJS from 'exceljs';
import { format } from 'date-fns';

export class ReportService {
  static async generateAttendanceReport(timeRecords: any[]) {
    console.log('[ReportService] Starting report generation');
    console.log(`[ReportService] Processing ${timeRecords.length} records`);
    
    try {
      // 엑셀 워크북 생성
      const workbook = new ExcelJS.Workbook();
      
      // Set workbook properties for better compatibility
      workbook.creator = 'Bee Time';
      workbook.lastModifiedBy = 'Bee Time';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      const worksheet = workbook.addWorksheet('Attendance Report');
      
      // 헤더 설정 - 모든 break 포함
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Employee Name', key: 'name', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Clock In', key: 'clockIn', width: 12 },
        { header: 'Break 1 Start', key: 'breakStart1', width: 12 },
        { header: 'Break 1 End', key: 'breakEnd1', width: 12 },
        { header: 'Break 2 Start', key: 'breakStart2', width: 12 },
        { header: 'Break 2 End', key: 'breakEnd2', width: 12 },
        { header: 'Break 3 Start', key: 'breakStart3', width: 12 },
        { header: 'Break 3 End', key: 'breakEnd3', width: 12 },
        { header: 'Clock Out', key: 'clockOut', width: 12 },
        { header: 'Break Minutes', key: 'breakMinutes', width: 12 },
        { header: 'Working Hours', key: 'workingHours', width: 15 },
        { header: 'Working Hours(Decimal)', key: 'workingHoursDecimal', width: 20 }
      ];
      
      // 헤더 스타일 설정
      const headerRow = worksheet.getRow(1);
      
      // 헤더 폰트 설정
      headerRow.font = { bold: true };
      
      // 헤더 색상 설정
      for (let i = 1; i <= 14; i++) {
        const cell = headerRow.getCell(i);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9D9D9' }
        };
        
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
          bottom: { style: 'double' }
        };
      }
      
      // Working Hours(Decimal) 헤더 스타일 - 다른 색상 적용
      const workingHours2Cell = headerRow.getCell(15);
      workingHours2Cell.font = { bold: true };
      workingHours2Cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE605' }
      };
      workingHours2Cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
        bottom: { style: 'double' }
      };
      
      // 데이터 처리 및 추가
      if (timeRecords && timeRecords.length > 0) {
        console.log('[ReportService] Processing time records for Excel');
        
        const processedRecords = timeRecords.map(record => {
          // DB에서 가져온 breakMinutes 값을 시간과 분 형식으로 변환
          const breakHours = Math.floor(record.breakMinutes / 60);
          const breakMins = record.breakMinutes % 60;
          const breakTimeFormatted = `${breakHours}h ${breakMins}m`;
        
          // DB의 workingHours 값 파싱 (8.01 => 8시간 1분)
          let workingHoursFormatted = "0h 0m";
          let workingHoursDecimal = 0;
        
          if (record.workingHours) {
            // 기존 파싱 로직 (8.01 형식에서 8시간 1분으로 변환)
            const whString = record.workingHours.toString();
            const parts = whString.split('.');
        
            const hours = parseInt(parts[0]);
            // 분 부분의 처리
            let minutes = 0;
            if (parts.length > 1) {
              // 소수점 이하가 1자리면 (예: .1 -> 10분), 2자리면 그대로 (예: .01 -> 1분, .30 -> 30분)
              if (parts[1].length === 1) {
                minutes = parseInt(parts[1]) * 10;
              } else {
                minutes = parseInt(parts[1]);
              }
            }
        
            workingHoursFormatted = `${hours}h ${minutes}m`;
        
            // 10진수 변환 (8h 30m → 8.5)
            workingHoursDecimal = parseFloat((hours + (minutes / 60)).toFixed(2));
          }
        
          return {
            date: record.date,
            name: record.user?.name || 'N/A',
            email: record.user?.email || 'N/A',
            location: record.location?.name || 'N/A',
            clockIn: record.clockInTime || '',
            breakStart1: record.breakStartTime1 || '',
            breakEnd1: record.breakEndTime1 || '',
            breakStart2: record.breakStartTime2 || '',
            breakEnd2: record.breakEndTime2 || '',
            breakStart3: record.breakStartTime3 || '',
            breakEnd3: record.breakEndTime3 || '',
            clockOut: record.clockOutTime || '',
            breakMinutes: breakTimeFormatted,
            workingHours: workingHoursFormatted,
            workingHoursDecimal: workingHoursDecimal
          };
        });
        
        // 직원 이름으로 먼저 정렬하고, 같은 직원은 날짜로 정렬
        processedRecords.sort((a, b) => {
          // 먼저 이름으로 정렬
          const nameComparison = a.name.localeCompare(b.name);
          
          // 이름이 같으면 날짜로 정렬
          if (nameComparison === 0) {
            return a.date.localeCompare(b.date);
          }
          
          return nameComparison;
        });
        
        // 데이터 추가
        worksheet.addRows(processedRecords);
        
        // 데이터 셀 테두리 설정
        for (let rowIndex = 2; rowIndex <= processedRecords.length + 1; rowIndex++) {
          const row = worksheet.getRow(rowIndex);
          for (let colIndex = 1; colIndex <= 15; colIndex++) {
            const cell = row.getCell(colIndex);
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' },
              bottom: { style: 'thin' }
            };
            
            // 숫자 값 컬럼은 숫자 형식으로 설정
            if (colIndex === 15) {
              cell.numFmt = '0.0';
            }
          }
        }
        
        // 합계 행 추가
        const sumRowIndex = processedRecords.length + 2;
        const sumRow = worksheet.getRow(sumRowIndex);
        
        // 합계 행 스타일 설정
        for (let colIndex = 1; colIndex <= 15; colIndex++) {
          const cell = sumRow.getCell(colIndex);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
            bottom: { style: 'thin' }
          };
          
          if (colIndex === 14) {
            cell.value = 'Total Hours:';
            cell.font = { bold: true };
            cell.alignment = { horizontal: 'right' };
          } else if (colIndex === 15) {
            // SUM 함수 추가
            const formula = `SUM(O2:O${sumRowIndex - 1})`;
            cell.value = { formula: formula };
            cell.numFmt = '0.0';
            cell.font = { bold: true };
          }
        }
        
      } else {
        console.log('[ReportService] No records to process');
        worksheet.addRow(['No data available']);
      }
      
      // 엑셀 파일 생성
      console.log('[ReportService] Generating Excel buffer');
      
      return await workbook.xlsx.writeBuffer({
        useStyles: true,
        useSharedStrings: true
      });
    } catch (error: any) {
      console.error('[ReportService] Error generating report:', error);
      throw new Error(`Failed to generate Excel report: ${error.message}`);
    }
  }
} 