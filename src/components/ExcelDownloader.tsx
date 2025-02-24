import ExcelJS from 'exceljs';

interface Employee {
  id: string;
  name: string;
  email: string;
  title: string;
  location: string;
}

interface ExcelDownloaderProps {
  data: Employee[];
  pageType: 'Employees' | 'Reports' | 'Locations';
}

export const ExcelDownloader = ({ data, pageType }: ExcelDownloaderProps) => {
  // 데이터 정렬 함수 추가
  const sortByLocation = (data: Employee[]) => {
    return [...data].sort((a, b) => {
      const locationA = a.location || '-';  // 빈 location은 '-'로 처리
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
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employees');

    // 정렬된 데이터 생성
    const sortedData = sortByLocation(data);

    // 헤더 설정
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Title', key: 'title', width: 15 },
      { header: 'Location', key: 'location', width: 25 }
    ];

    // 테두리 스타일 정의
    const normalBorderStyle = {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
    };

    const headerBottomBorderStyle = {
      top: { style: 'thin' as const },
      bottom: { style: 'double' as const },
    };

    // 헤더 스타일 적용
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE479' }
      };
      cell.font = {
        bold: true,
        color: { argb: 'FF000000' }
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = headerBottomBorderStyle;  // 헤더에 이중 테두리 적용
    });

    // 정렬된 데이터 추가
    worksheet.addRows(sortedData);

    // 데이터 셀에 일반 테두리 추가
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {  // 헤더 제외
        row.eachCell((cell) => {
          cell.border = normalBorderStyle;
          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle'
          };
        });
      }
    });

    // 파일 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFileName();
    a.click();
    window.URL.revokeObjectURL(url);
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