import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
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

// 이메일 전송을 위한 트랜스포터 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'beetimeapp@gmail.com',
    pass: process.env.EMAIL_PASSWORD // Gmail 앱 비밀번호
  }
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
 * @desc 사용자 문의 제출 및 이메일 전송
 * @access Public (인증 미들웨어 제거)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      title, 
      type, 
      typeLabel,
      content, 
      submittedAt,
      user: clientUser // 프론트엔드에서 전송한 사용자 정보 (백업용)
    } = req.body;
    
    // 요청 데이터 검증
    if (!title || !type || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
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
      `
    };
    
    // 이메일 전송
    await transporter.sendMail(mailOptions);
    
    // 성공 응답
    res.status(200).json({ 
      success: true, 
      message: 'Inquiry submitted successfully' 
    });
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit inquiry',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router; 