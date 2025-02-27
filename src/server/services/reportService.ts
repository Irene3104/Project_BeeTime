import * as XLSX from 'xlsx';
import { TimeRecord } from '@prisma/client';

interface ReportData {
  timeRecords: any[]; // TimeRecord와 관련 데이터를 포함하는 타입
  startDate: Date;
  endDate: Date;
}

export class ReportService {
  /**
   * 출석 기록 엑셀 리포트 생성
   */
  public static generateAttendanceReport(data: ReportData): Buffer {
    console.log('[ReportService] Generating attendance report');
    const { timeRecords } = data;
    
    // 엑셀 데이터 가공
    const excelData = this.processTimeRecordsForExcel(timeRecords);
    
    // 엑셀 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Records');
    
    // 헤더 스타일 적용
    this.applyHeaderStyles(worksheet);
    
    // 열 너비 설정
    this.setColumnWidths(worksheet);
    
    // 엑셀 파일 생성
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
  
  /**
   * 타임레코드 데이터를 엑셀 형식으로 가공
   */
  private static processTimeRecordsForExcel(timeRecords: any[]): any[] {
    return timeRecords.map((record, index) => {
      // 출퇴근 시간 포맷팅
      const clockInTime = record.clockIn ? this.formatTime(record.clockIn) : '';
      const clockOutTime = record.clockOut ? this.formatTime(record.clockOut) : '';
      
      // 휴식 시간 처리
      const breakStartTimes: string[] = [];
      const breakEndTimes: string[] = [];
      let totalBreakMinutes = 0;
      
      if (record.breaks && record.breaks.length > 0) {
        record.breaks.forEach((breakItem: any) => {
          if (breakItem.startTime) {
            breakStartTimes.push(this.formatTime(breakItem.startTime));
          }
          
          if (breakItem.endTime) {
            breakEndTimes.push(this.formatTime(breakItem.endTime));
          }
          
          // 휴식 시간 계산 (분 단위)
          if (breakItem.startTime && breakItem.endTime) {
            const breakDuration = Math.round(
              (breakItem.endTime.getTime() - breakItem.startTime.getTime()) / (1000 * 60)
            );
            totalBreakMinutes += breakDuration;
          }
        });
      }
      
      // 근무 시간 계산
      let workHours = '';
      if (record.clockIn && record.clockOut) {
        const totalMinutes = Math.round(
          (record.clockOut.getTime() - record.clockIn.getTime()) / (1000 * 60)
        ) - totalBreakMinutes;
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        workHours = `${hours}:${minutes.toString().padStart(2, '0')}`;
      }
      
      return {
        'No.': index + 1,
        'Name': record.user.name,
        'Position': record.user.title || '',
        'Email': record.user.email,
        'Location': record.location.name,
        'Clock In': clockInTime,
        'Clock Out': clockOutTime,
        'Break Start': breakStartTimes.join(', '),
        'Break End': breakEndTimes.join(', '),
        'Break Time(min)': totalBreakMinutes.toString(),
        'Work Hours': workHours
      };
    });
  }
  
  /**
   * 헤더 스타일 적용
   */
  private static applyHeaderStyles(worksheet: XLSX.WorkSheet): void {
    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:K1');
    const headerRowIndex = headerRange.s.r;
    
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
      
      if (!worksheet[cellAddress].s) {
        worksheet[cellAddress].s = {};
      }
      
      worksheet[cellAddress].s = {
        fill: { fgColor: { rgb: "E6E6E6" } },
        font: { bold: true },
        border: {
          bottom: { style: "double", color: { rgb: "000000" } }
        },
        alignment: { horizontal: "center" }
      };
    }
  }
  
  /**
   * 열 너비 설정
   */
  private static setColumnWidths(worksheet: XLSX.WorkSheet): void {
    worksheet['!cols'] = [
      { wch: 5 },    // No.
      { wch: 15 },   // Name
      { wch: 12 },   // Position
      { wch: 25 },   // Email
      { wch: 15 },   // Location
      { wch: 10 },   // Clock In
      { wch: 10 },   // Clock Out
      { wch: 20 },   // Break Start
      { wch: 20 },   // Break End
      { wch: 15 },   // Break Time(min)
      { wch: 12 }    // Work Hours
    ];
  }
  
  /**
   * 시간 포맷팅
   */
  private static formatTime(date: Date): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    
    try {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('[ReportService] Error formatting time:', error);
      return '';
    }
  }
} 