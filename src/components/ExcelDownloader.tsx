import * as XLSX from 'xlsx';
import adminIconDownload from '../assets/admin_icon_download.png';

interface ExcelDownloaderProps {
  data: any[];
  columns: {
    key: string;
    header: string;
    width?: number;
  }[];
  filename: string;
}

export const ExcelDownloader = ({ data, columns, filename }: ExcelDownloaderProps) => {
  const handleDownload = () => {
    // 데이터 준비
    const excelData = data.map(item => 
      columns.reduce((acc, col) => ({
        ...acc,
        [col.header]: item[col.key] || '-'
      }), {})
    );

    // 워크시트 생성
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    ws['!cols'] = columns.map(col => ({ wch: col.width || 20 }));

    // 스타일 설정
    const headerStyle = {
      font: { bold: true, sz: 14, name: 'Calibri' },
      fill: { fgColor: { rgb: "#FFE26C" } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    const cellStyle = {
      font: { sz: 12, name: 'Calibri' },
      alignment: { horizontal: 'left' }
    };

    // 스타일 적용
    const headerCells = columns.map((_, idx) => 
      `${String.fromCharCode(65 + idx)}1`
    );
    headerCells.forEach(cell => {
      if (ws[cell]) {  // 셀 존재 여부 확인
        ws[cell].s = headerStyle;
      }
    });

    // 데이터 셀 스타일 적용
    for(let i = 2; i <= excelData.length + 1; i++) {
      columns.forEach((_, idx) => {
        const cell = `${String.fromCharCode(65 + idx)}${i}`;
        if (ws[cell]) {  // 셀 존재 여부 확인
          ws[cell].s = cellStyle;
        }
      });
    }

    // 워크북 생성 및 저장
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 text-[#A18206] font-montserrat"
    >
      Download
      <img src={adminIconDownload} alt="download" className="w-[13px] h-[13px]" />
    </button>
  );
};