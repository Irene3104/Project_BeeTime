import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

const prisma = new PrismaClient();

// 첫 글자만 대문자로 변환하는 함수
function capitalizeFirstLetter(text: string): string {
  return text.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

async function generateQRForLocation() {
  try {
    // Get all locations from database
    const locations = await prisma.location.findMany();
    
    if (locations.length === 0) {
      console.log('No locations found in database');
      return;
    }

    // Create qr-codes directory if it doesn't exist
    const qrDir = path.join(process.cwd(), 'public', 'qr-codes');
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    console.log('\nAvailable locations:');
    locations.forEach((loc, index) => {
      console.log(`${index + 1}. ${loc.name} (${loc.address})`);
    });

    // 로고 이미지 경로
    const logoPath = path.join(process.cwd(), 'public', 'logo_bee2.png');
    
    // 로고 이미지가 존재하는지 확인
    const logoExists = fs.existsSync(logoPath);
    if (!logoExists) {
      console.warn(`로고 이미지를 찾을 수 없습니다: ${logoPath}`);
    }

    // Generate QR code for each location
    for (const location of locations) {
      // 위치 이름과 지점명 첫 글자만 대문자로 변환
      const capitalizedName = capitalizeFirstLetter(location.name);
      const capitalizedBranch = location.branch ? capitalizeFirstLetter(location.branch) : '';
      
      // 파일명 생성 (name_branch 형식)
      const fileName = location.branch 
        ? `${location.name.replace(/\s+/g, '_')}_${location.branch.replace(/\s+/g, '_')}.png`
        : `${location.name.replace(/\s+/g, '_')}.png`;
      
      const filePath = path.join(qrDir, fileName);
      
      // QR 코드를 canvas에 생성
      const canvas = createCanvas(800, 1000); // 캔버스 크기 증가
      const ctx = canvas.getContext('2d');
      
      // 배경을 흰색으로 설정
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // QR 코드 생성하여 canvas에 그리기
      const qrCodeURL = await QRCode.toDataURL(location.placeId, {
        width: 600, // QR 코드 크기 증가
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      const qrImage = await loadImage(qrCodeURL);
      ctx.drawImage(qrImage, 100, 50, 600, 600); // QR 코드 크기 및 위치 조정
      
      // 로고 추가 (로고가 존재하는 경우)
      if (logoExists) {
        try {
          const logo = await loadImage(logoPath);
          // 로고를 QR 코드 중앙에 정확히 배치
          const logoSize = 120; // 로고 크기 증가
          const logoX = (canvas.width - logoSize) / 2;
          const logoY = (600 - logoSize) / 2 + 50; // QR 코드 영역 내 중앙에 배치
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        } catch (logoError) {
          console.error('로고 이미지 로드 중 오류:', logoError);
        }
      }
      
      // 텍스트 추가 (위치 이름과 지점)
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 40px Arial'; // 폰트 크기 증가
      ctx.textAlign = 'center';
      
      // 위치 이름
      ctx.fillText(capitalizedName, canvas.width / 2, 720);
      
      // 지점명 (있는 경우)
      if (capitalizedBranch) {
        ctx.font = '32px Arial'; // 폰트 크기 증가
        ctx.fillText(capitalizedBranch, canvas.width / 2, 780);
      }
      
      // Canvas를 파일로 저장
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filePath, buffer);

      console.log(`\nGenerated QR code for ${capitalizedName}:`);
      console.log(`- File: ${fileName}`);
      console.log(`- Place ID: ${location.placeId}`);
      console.log(`- Path: ${filePath}`);
    }

    console.log('\nQR codes have been generated in:', qrDir);

  } catch (error) {
    console.error('Error generating QR codes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateQRForLocation();