import ExcelJS from 'exceljs';

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
  data: Employee[] | Location[];
  pageType: 'Employees' | 'Reports' | 'Locations';
  columns?: { key: string; header: string }[];
}

export const ExcelDownloader = ({ data, pageType, columns }: ExcelDownloaderProps) => {
  // 스타일 정의 추가
  const headerBottomBorderStyle = {
    bottom: { style: 'thin', color: { argb: 'FF000000' } }
  };
  
  const normalBorderStyle = {
    top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
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

  const handleDownload = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
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
      } else {
        // Employees 또는 Reports 페이지일 경우 기존 로직 사용
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
      <img src="/src/assets/admin_icon_download.png" alt="download" />
    </button>
  );
};