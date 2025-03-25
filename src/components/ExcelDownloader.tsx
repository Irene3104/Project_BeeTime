import ExcelJS from 'exceljs';
import adminIconDownload from '../assets/admin_icon_download.png';

// Excel Border 스타일 타입 정의
type BorderStyle = 'thin' | 'dotted' | 'dashDot' | 'hair' | 'dashDotDot' | 
                 'slantDashDot' | 'mediumDashed' | 'mediumDashDotDot' | 
                 'mediumDashDot' | 'medium' | 'double' | 'thick';

interface Employee {
  id: string;
  name: string;
  email: string;
  title: string;
  location: string;
}

interface Location {
  id: string;
  name: string;
}

interface ExcelDownloaderProps {
  data: Employee[] | Location[] | any[]; // any[] 추가하여 Reports 데이터도 처리할 수 있도록 함
  pageType: 'Employees' | 'Reports' | 'Locations';
  columns?: { key: string; header: string }[];
}

export const ExcelDownloader = ({ data, pageType, columns }: ExcelDownloaderProps) => {
  // 스타일 정의 추가
  const headerBottomBorderStyle = {
    bottom: { style: 'thin' as BorderStyle, color: { argb: 'FF000000' } }
  };
  
  const normalBorderStyle = {
    top: { style: 'thin' as BorderStyle, color: { argb: 'FFDDDDDD' } },
    left: { style: 'thin' as BorderStyle, color: { argb: 'FFDDDDDD' } },
    bottom: { style: 'thin' as BorderStyle, color: { argb: 'FFDDDDDD' } },
    right: { style: 'thin' as BorderStyle, color: { argb: 'FFDDDDDD' } }
  };

  // 데이터 정렬 함수 추가
  const sortByLocation = (data: any[]) => {
    if (pageType !== 'Employees') return data;  // Employees 페이지가 아니면 정렬하지 않음
    
    return [...data].sort((a, b) => {
      const locationA = a.location || '-';
      const locationB = b.location || '-';
      return locationA.localeCompare(locationB);
    });
  };

  const getSydneyDateTime = () => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    
    return new Date().toLocaleString('en-AU', options).split('/').reverse().join('');
  };

  const getFileName = () => {
    const date = getSydneyDateTime();
    return `${pageType}_${date}.xlsx`;
  };

  // Working Hours를 소수점 3자리까지 계산하는 함수
  const formatWorkingHours = (hoursStr: string | number | null | undefined): string => {
    if (!hoursStr) return '0.000';
    
    // 시간과 분 형식(예: 7h 34m)인 경우 처리
    if (typeof hoursStr === 'string' && hoursStr.includes('h')) {
      const match = hoursStr.match(/(\d+)h\s*(\d+)m?/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const decimal = hours + (minutes / 60);
        
        // 반올림하지 않고 소수점 3자리까지 자르기 (truncate)
        const truncated = Math.floor(decimal * 1000) / 1000;
        return truncated.toFixed(3);
      }
    }
    
    // 이미 숫자인 경우
    const numValue = typeof hoursStr === 'number' 
      ? hoursStr 
      : parseFloat(String(hoursStr).replace(',', '.'));
    
    if (isNaN(numValue)) return '0.000';
    
    // 반올림하지 않고 소수점 3자리까지 자르기
    const truncated = Math.floor(numValue * 1000) / 1000;
    return truncated.toFixed(3);
  };

  const handleDownload = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      // Excel 전역 설정
      workbook.calcProperties.fullCalcOnLoad = true;
      
      const worksheet = workbook.addWorksheet(pageType);
      
      // 컬럼 설정
      let headers: string[] = [];
      
      if (pageType === 'Locations' && columns) {
        // Locations 페이지일 경우 전달받은 columns 사용
        headers = columns.map(col => col.header);
        
        // 헤더 행 추가
        worksheet.addRow(headers);
        
        // 스타일 적용
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFDCF17' }
          };
          cell.border = headerBottomBorderStyle;
        });
        
        // 데이터 행 추가
        data.forEach((item: any) => {
          const rowData = columns.map(col => item[col.key] || '-');
          const row = worksheet.addRow(rowData);
          
          // 스타일 적용
          row.eachCell((cell) => {
            cell.border = normalBorderStyle;
          });
        });
      } else if (pageType === 'Reports') {
        // Reports 페이지는 Working Hours가 있을 수 있음
        headers = columns ? columns.map(col => col.header) : ['Name', 'Date', 'Working Hours', 'Working Hours(Decimal)'];
        
        // 헤더 행 추가
        worksheet.addRow(headers);
        
        // 스타일 적용
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFDCF17' }
          };
          cell.border = headerBottomBorderStyle;
        });

        // Decimal 열 인덱스 찾기
        const decimalColIndex = headers.findIndex(h => 
          h.toLowerCase().includes('decimal') || h.toLowerCase().includes('working hours(decimal)')
        );
        
        // 열 형식 미리 설정 (전체 열에 적용)
        if (decimalColIndex !== -1) {
          // 더 강력한 숫자 형식 설정
          const decimalColumn = worksheet.getColumn(decimalColIndex + 1);
          decimalColumn.numFmt = '0.000';
          // 열 전체를 숫자 타입으로 지정
          decimalColumn.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
            if (rowNumber > 1) { // 헤더 행 제외
              cell.numFmt = '0.000';
            }
          });
        }
        
        // 데이터 행 추가
        data.forEach((item: any, rowIndex) => {
          let rowData;
          
          if (columns) {
            rowData = columns.map(col => {
              // 'workingHoursDecimal' 필드가 있는 경우 소수점 3자리로 포맷팅
              if (col.key === 'workingHoursDecimal' || col.key.toLowerCase().includes('decimal')) {
                return formatWorkingHours(item[col.key]);
              }
              return item[col.key] || '-';
            });
          } else {
            rowData = [
              item.name || '-',
              item.date || '-',
              item.workingHours || '-',
              formatWorkingHours(item.workingHoursDecimal)
            ];
          }
          
          const row = worksheet.addRow(rowData);
          
          // 각 셀에도 명시적으로 소수점 3자리 형식 적용
          if (decimalColIndex !== -1) {
            const cell = row.getCell(decimalColIndex + 1); // 1-indexed
            // 숫자형식으로 변환 후 형식 적용
            if (rowData[decimalColIndex] !== '-') {
              const numValue = parseFloat(rowData[decimalColIndex] as string);
              
              // 소수점 3자리로 맞춘 후 숫자로 변환하여 할당
              const formattedValue = numValue.toFixed(3);
              cell.value = parseFloat(formattedValue);
              
              // 명시적으로 숫자 형식 적용
              cell.numFmt = '0.000'; // 고정 소수점 3자리 형식
            }
          }
          
          // 스타일 적용
          row.eachCell((cell) => {
            cell.border = normalBorderStyle;
          });
        });
        
        // 컬럼 형식 다시 확인하여 적용
        if (decimalColIndex !== -1) {
          worksheet.getColumn(decimalColIndex + 1).numFmt = '0.000';
          worksheet.getColumn(decimalColIndex + 1).eachCell({ includeEmpty: false }, cell => {
            cell.numFmt = '0.000';
          });
        }
        
      } else {
        // Employees 페이지일 경우 기존 로직 사용
        headers = ['Name', 'Email', 'Title', 'Location'];
        
        // 헤더 행 추가
        worksheet.addRow(headers);
        
        // 스타일 적용
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFDCF17' }
          };
          cell.border = headerBottomBorderStyle;
        });
        
        // 데이터 행 추가 (Employee 타입으로 가정)
        const sortedData = sortByLocation(data as Employee[]);
        sortedData.forEach((employee: Employee) => {
          const row = worksheet.addRow([
            employee.name,
            employee.email,
            employee.title || '-',
            employee.location || '-'
          ]);
          
          // 스타일 적용
          row.eachCell((cell) => {
            cell.border = normalBorderStyle;
          });
        });
      }
      
      // 컬럼 너비 자동 조정
      worksheet.columns.forEach(column => {
        column.width = 20;
      });
      
      // 파일 생성 및 다운로드
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFileName();
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log(`${pageType} 엑셀 파일 다운로드 완료`);
    } catch (error) {
      console.error('엑셀 파일 생성 중 오류 발생:', error);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="text-[#A18206] font-montserrat flex items-center gap-2"
    >
      Download
      <img src={adminIconDownload} alt="download" />
    </button>
  );
};