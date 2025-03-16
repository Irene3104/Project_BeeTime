import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
// 정확한 경로와 파일명으로 수정
// import { authenticateToken } from '../middleware/authenticate';

// 임시 해결책: 인증 미들웨어 없이 진행
const router = express.Router();
const prisma = new PrismaClient();

// JWT 토큰 정보 타입
interface JwtPayload {
  userId: string;
}

// 사용자 타입 정의
interface User {
  id: string;
  name: string;
  email: string;
}

// 인증된 요청 타입 확장 (타입 에러는 무시)
interface AuthRequest extends Request {
  user?: any;
}

// Request에 files 프로퍼티 확장
interface MulterRequest extends Request {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

// 이메일 전송을 위한 트랜스포터 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'beetimeapp@gmail.com',
    pass: process.env.EMAIL_PASSWORD // Gmail 앱 비밀번호
  }
});

// 파일 업로드를 위한 디렉토리 설정
const uploadDir = path.join(process.cwd(), 'uploads');

// uploads 디렉토리가 없으면 생성
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 파일 저장소 설정
const storage = multer.diskStorage({
  destination: function (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
    cb(null, uploadDir);
  },
  filename: function (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    // 원본 파일명에서 확장자 추출
    const ext = path.extname(file.originalname);
    // 타임스탬프 + 랜덤문자열 + 확장자로 파일명 생성
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${ext}`);
  }
});

// 파일 필터링 (허용 파일 타입 설정)
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 허용할 파일 형식
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // Excel
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('지원하지 않는 파일 형식입니다.'));
  }
};

// Multer 설정 적용
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 3 // 최대 파일 개수
  },
  fileFilter: fileFilter
});

/**
 * 날짜 형식 변환 함수 - 보기 좋은 형식으로 변환
 * @param isoString ISO 날짜 문자열
 * @returns 읽기 쉬운 형식의 날짜와 시간
 */
function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Seoul'
    });
  } catch (e) {
    return new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul'
    });
  }
}

/**
 * JWT 토큰에서 사용자 ID 추출
 * @param token JWT 토큰 문자열
 * @returns 사용자 ID 또는 null
 */
function extractUserIdFromToken(token: string): string | null {
  try {
    const secret = process.env.JWT_SECRET || 'your_jwt_secret';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded.userId;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * 사용자 ID로 사용자 정보 조회
 * @param userId 사용자 ID
 * @returns 사용자 정보 객체 또는 null
 */
async function getUserById(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * @route POST /inquiries
 * @desc 사용자 문의 제출 및 이메일 전송 (첨부파일 지원)
 * @access Public (인증 미들웨어 제거)
 */
router.post('/', upload.array('attachments', 3), async (req: Request, res: Response) => {
  try {
    // multer에 의해 추가된 files 속성에 접근 (타입 단언 사용)
    const files = (req as MulterRequest).files as Express.Multer.File[] || [];
    
    // 폼 데이터에서 JSON 데이터 파싱
    let inquiryData;
    try {
      inquiryData = JSON.parse(req.body.data || '{}');
    } catch (error) {
      console.error('JSON 파싱 에러:', error);
      return res.status(400).json({
        success: false,
        message: '잘못된 데이터 형식입니다.'
      });
    }
    
    const { 
      title, 
      type, 
      typeLabel,
      content, 
      submittedAt,
      user: clientUser // 프론트엔드에서 전송한 사용자 정보 (백업용)
    } = inquiryData;
    
    // 요청 데이터 검증
    if (!title || !type || !content) {
      // 업로드된 파일이 있으면 삭제
      if (files && files.length > 0) {
        files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      
      return res.status(400).json({ 
        success: false, 
        message: '모든 필드를 입력해주세요.' 
      });
    }
    
    // 토큰에서 사용자 정보 조회 시도
    let userData = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // 'Bearer ' 부분을 제외한 토큰
      const userId = extractUserIdFromToken(token);
      
      if (userId) {
        userData = await getUserById(userId);
        console.log('서버에서 조회한 사용자 정보:', userData);
      }
    }
    
    // 서버에서 조회한 정보가 없으면 클라이언트에서 전송한 정보 사용
    const name = userData?.name || clientUser?.name || 'Unknown';
    const email = userData?.email || clientUser?.email || 'No email provided';
    const userId = userData?.id || clientUser?.id || 'Unknown ID';
    
    // 제출 시간 형식 변환 (없으면 현재 시간 사용)
    const formattedSubmitTime = submittedAt 
      ? formatDate(submittedAt)
      : formatDate(new Date().toISOString());
    
    // 문의 유형 레이블 - 프론트엔드에서 제공한 것 사용하되 없으면 기본값 사용
    const inquiryTypeDisplay = typeLabel || (() => {
      if (type === 'system_issue') return '시스템 이슈';
      else if (type === 'time_record') return '타임 레코드 수정 요청';
      else if (type === 'others') return '기타 문의';
      return type;
    })();
    
    // 첨부파일 정보 구성
    const attachments = files.map(file => ({
      filename: path.basename(file.path),
      path: file.path,
      contentType: file.mimetype
    }));
    
    // 이메일 옵션 설정 - 향상된 템플릿
    const mailOptions = {
      from: process.env.EMAIL_USER || 'beetimeapp@gmail.com',
      to: 'beetimeapp@gmail.com',
      subject: `[BeeTime Inquiry] ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #FDCF17; padding: 15px; text-align: center;">
            <h2 style="color: #333; margin: 0;">새로운 문의가 도착했습니다</h2>
          </div>
          
          <div style="padding: 20px;">
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">사용자 정보</h3>
              <p><strong>이름:</strong> ${name}</p>
              <p><strong>이메일:</strong> ${email}</p>
              <p><strong>사용자 ID:</strong> ${userId}</p>
              <p><strong>제출 시간:</strong> ${formattedSubmitTime}</p>
            </div>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">문의 세부 정보</h3>
              <p><strong>제목:</strong> ${title}</p>
              <p><strong>문의 유형:</strong> ${inquiryTypeDisplay}</p>
              ${attachments.length > 0 ? `<p><strong>첨부파일:</strong> ${attachments.length}개</p>` : ''}
            </div>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">문의 내용</h3>
              <div style="white-space: pre-line; background-color: white; padding: 10px; border-radius: 5px; border: 1px solid #ddd;">${content}</div>
            </div>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #ddd;">
            <p>이 이메일은 BeeTime 앱에서 자동으로 발송되었습니다. 회신하지 마세요.</p>
            <p>© ${new Date().getFullYear()} BeeTime App</p>
          </div>
        </div>
      `,
      // 첨부파일이 있으면 이메일에 첨부
      attachments: attachments.length > 0 ? attachments : undefined
    };
    
    // 이메일 전송
    await transporter.sendMail(mailOptions);
    
    // 성공 응답
    res.status(200).json({ 
      success: true, 
      message: '문의가 성공적으로 제출되었습니다',
      attachments: files.map(file => ({
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }))
    });
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    
    // 업로드된 파일이 있으면 삭제 시도 (에러 시)
    try {
      const files = (req as MulterRequest).files as Express.Multer.File[] || [];
      if (files && files.length > 0) {
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
    } catch (cleanupError) {
      console.error('Error cleaning up files:', cleanupError);
    }
    
    res.status(500).json({ 
      success: false, 
      message: '문의 제출에 실패했습니다',
      error: error instanceof Error ? error.message : '알 수 없는 오류' 
    });
  }
});

export default router; 