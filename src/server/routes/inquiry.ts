import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
// 정확한 경로와 파일명으로 수정
// import { authenticateToken } from '../middleware/authenticate';

// 임시 해결책: 인증 미들웨어 없이 진행
const router = express.Router();

// 사용자 타입 정의
interface User {
  id: string;
  name: string;
  email: string;
}

// 인증된 요청 타입 확장
interface AuthRequest extends Request {
  user?: User;
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
 * @route POST /inquiries
 * @desc 사용자 문의 제출 및 이메일 전송
 * @access Public (인증 미들웨어 제거)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, type, content, user } = req.body;
    
    // 요청 데이터 검증
    if (!title || !type || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    // 사용자 정보는 요청 본문에서 직접 가져옴
    const name = user?.name || 'Anonymous User';
    const email = user?.email || 'No email provided';
    
    // 문의 유형 레이블 가져오기
    let typeLabel = type;
    if (type === 'system_issue') typeLabel = 'System Issue';
    else if (type === 'time_record') typeLabel = 'Time Record Modification';
    else if (type === 'others') typeLabel = 'Others';
    
    // 이메일 옵션 설정
    const mailOptions = {
      from: process.env.EMAIL_USER || 'beetimeapp@gmail.com',
      to: 'beetimeapp@gmail.com',
      subject: `[BeeTime Inquiry] ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #B17F4A;">New Inquiry from BeeTime App</h2>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>User:</strong> ${name} (${email})</p>
            <p><strong>Inquiry Type:</strong> ${typeLabel}</p>
            <p><strong>Title:</strong> ${title}</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #555;">Content:</h3>
            <p style="white-space: pre-line;">${content}</p>
          </div>
          <p style="color: #888; font-size: 12px; margin-top: 30px;">
            This is an automated email from BeeTime App. Please do not reply to this email.
          </p>
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