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
      
      // 헤더 설정
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Employee Name', key: 'name', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Clock In', key: 'clockIn', width: 12 },
        { header: 'Break Start', key: 'breakStart', width: 12 },
        { header: 'Break End', key: 'breakEnd', width: 12 },
        { header: 'Clock Out', key: 'clockOut', width: 12 },
        { header: 'Break Time', key: 'breakTime', width: 15 },
        { header: 'Working Hours', key: 'totalHours', width: 15 },
        { header: 'Working Hours(2)', key: 'totalHoursDecimal', width: 15 }
      ];
      
      // 헤더 스타일 설정
      const headerRow = worksheet.getRow(1);
      
      // 헤더 폰트 설정
      headerRow.font = { bold: true };
      
      // 헤더 색상 설정 (J열까지만)
      for (let i = 1; i <= 10; i++) {
        const cell = headerRow.getCell(i);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9D9D9' }
        };
        
        // 하단 더블 라인 설정
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
          bottom: { style: 'double' }
        };
      }
      
      // K열 헤더 스타일 (Working Hours(2)) - 다른 색상 적용
      const workingHours2Cell = headerRow.getCell(11);
      workingHours2Cell.font = { bold: true };
      workingHours2Cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE605' } // Adjusted to ensure valid color code
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
          // 휴식 시간 계산
          let breakDuration = 0;
          let breakTimeFormatted = '';
          
          if (record.breakStartTime && record.breakEndTime) {
            const [breakStartHour, breakStartMin] = record.breakStartTime.split(':').map(Number);
            const [breakEndHour, breakEndMin] = record.breakEndTime.split(':').map(Number);
            
            let breakHours = breakEndHour - breakStartHour;
            let breakMins = breakEndMin - breakStartMin;
            
            if (breakMins < 0) {
              breakHours -= 1;
              breakMins += 60;
            }
            
            breakDuration = breakHours + (breakMins / 60);
            breakTimeFormatted = `${breakHours}h ${breakMins}m`;
          }
          
          // 총 근무 시간 계산
          let totalHours = '';
          let totalHoursFormatted = '';
          let totalHoursDecimal = 0; // 숫자 타입으로 변경
          
          if (record.clockInTime && record.clockOutTime) {
            const [inHour, inMin] = record.clockInTime.split(':').map(Number);
            const [outHour, outMin] = record.clockOutTime.split(':').map(Number);
            
            let hours = outHour - inHour;
            let mins = outMin - inMin;
            
            if (mins < 0) {
              hours -= 1;
              mins += 60;
            }
            
            const totalWorkHours = hours + (mins / 60) - breakDuration;
            totalHours = totalWorkHours.toFixed(2);
            
            // 시간과 분으로 변환
            const totalWorkHoursInt = Math.floor(totalWorkHours);
            const totalWorkMins = Math.round((totalWorkHours - totalWorkHoursInt) * 60);
            
            totalHoursFormatted = `${totalWorkHoursInt}h ${totalWorkMins}m`;
            
            // 소수점 형식 (7h 30m -> 7.5)
            totalHoursDecimal = parseFloat(totalWorkHours.toFixed(1));
          }
          
          return {
            date: record.date,
            name: record.user?.name || 'N/A',
            email: record.user?.email || 'N/A',
            location: record.location?.name || 'N/A',
            clockIn: record.clockInTime || '',
            breakStart: record.breakStartTime || '',
            breakEnd: record.breakEndTime || '',
            clockOut: record.clockOutTime || '',  
            breakTime: breakTimeFormatted,  
            totalHours: totalHoursFormatted,
            totalHoursDecimal: totalHoursDecimal // 숫자 값으로 전달
          };
        });
        
        // 데이터 추가
        worksheet.addRows(processedRecords);
        
        // 데이터 셀 테두리 설정
        for (let rowIndex = 2; rowIndex <= processedRecords.length + 1; rowIndex++) {
          const row = worksheet.getRow(rowIndex);
          for (let colIndex = 1; colIndex <= 11; colIndex++) {
            const cell = row.getCell(colIndex);
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' },
              bottom: { style: 'thin' }
            };
            
            // K열(Working Hours(2))은 숫자 형식으로 설정
            if (colIndex === 11) {
              cell.numFmt = '0.0';
            }
          }
        }
        
        // 합계 행 추가
        const sumRowIndex = processedRecords.length + 2;
        const sumRow = worksheet.getRow(sumRowIndex);
        
        // 합계 행 스타일 설정
        for (let colIndex = 1; colIndex <= 11; colIndex++) {
          const cell = sumRow.getCell(colIndex);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
            bottom: { style: 'thin' }
          };
          
          if (colIndex === 10) {
            cell.value = 'Total Hours:';
            cell.font = { bold: true };
            cell.alignment = { horizontal: 'right' };
          } else if (colIndex === 11) {
            // SUM 함수 추가 (K2:K{마지막 행})
            const formula = `SUM(K2:K${sumRowIndex - 1})`;
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
      
      // Use writeBuffer with proper options for better compatibility
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