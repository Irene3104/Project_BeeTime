import { Router } from 'express';
import { z } from 'zod';
import  bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { validateRequest } from '../middleware/validateRequest';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { authenticate } from '../middleware/authenticate';
import { sendVerificationEmail } from '../services/emailService';

const router = Router();

// 회원가입 데이터 검증을 위한 Zod 스키마 정의
const signupSchema = z.object({
  name: z.string().min(2, '이름은 2글자 이상이어야 합니다'),
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  locationId: z.number({
    required_error: '근무지 선택은 필수입니다',
  }),
});

// Zod 스키마로부터 TypeScript 타입 추론
type SignupInput = z.infer<typeof signupSchema>;

// 일반 회원가입 라우트
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, locationId } = req.body as SignupInput;
    
    // 필수 필드 검증
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password, and name are required' 
      });
    }
    
    // 이름 길이 검증 (2글자 이상)
    if (name.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name must be at least 2 characters' 
      });
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    
    // 비밀번호 길이 검증
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      });
    }
    
    // 근무지 검증
    if (!locationId) {
      return res.status(400).json({
        success: false,
        error: 'Work place is required'
      });
    }
    
    // 중복 이메일 확인
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'Email is already registered. Please use a different email.' 
      });
    }
    
    // 2. 선택한 지점이 실제로 존재하는지 확인
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      console.log('유효하지 않은 locationId:', locationId);
      return res.status(400).json({ error: '유효하지 않은 근무지입니다.' });
    }

    // 3. 트랜잭션 시작 - User 생성과 LocationUser 연결을 동시에 처리
    const result = await prisma.$transaction(async (tx) => {
      // 3-1. 비밀번호 해시화 후 사용자 정보 생성
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          locationId, // 선택한 지점 ID
          isProfileComplete: true,  // 일반 회원가입은 모든 정보가 입력되므로 true
          role: 'EMPLOYEE'
        }
      });

      // 3-2. 사용자-지점 연결 정보 생성 (근무 이력 시작)
      await tx.locationUser.create({
        data: {
          userId: user.id,
          locationId,
          startDate: new Date() // 현재 시간을 시작일로 설정(*****이부분은 나중에 필요시 수정해야함******)
        }
      });

      return user;
    });

    // 4. 자동 로그인을 위해 JWT 토큰 생성 - 7일 동안 유효
    const token = jwt.sign(
      { userId: result.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // 5. 성공 응답 전송
    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      token,
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        locationId,
        isProfileComplete: true
      }
    });

  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' 
    });
  }
});

// 일반 로그인 라우트
router.post('/login', async (req, res) => {
  try {
     // 1. 클라이언트에서 전송된 로그인 정보
    const { email, password } = req.body;
    console.log('로그인 시도:', { email, password: '***' });  // 보안을 위해 비밀번호는 로그에 표시하지 않음

    // 2. 이메일로 사용자 검색
    const user = await prisma.user.findUnique({
      where: { email }
    });

    console.log('DB 조회 결과:', user ? '사용자 찾음' : '사용자 없음');

     // 3. 사용자가 없거나 비밀번호가 없는 경우 (구글 로그인 사용자일 수 있음)
    if (!user || !user.password) {
      console.log('로그인 실패: 사용자 없음');
      return res.status(400).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

     // 4. 비밀번호 검증 - 입력된 비밀번호와 DB의 해시된 비밀번호 비교
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('비밀번호 확인:', validPassword ? '일치' : '불일치');

    if (!validPassword) {
      console.log('로그인 실패: 비밀번호 불일치');
      return res.status(400).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    console.log('로그인 성공:', { userId: user.id, email: user.email });
    
    // 5. JWT 토큰 생성 - 7일간 유효
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // 6. 클라이언트에 토큰과 사용자 정보 전송
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        locationId: user.locationId,
        isProfileComplete: user.isProfileComplete
      }
    });

  } catch (error) {
     // 7. 예외 처리 - DB 오류 등
    console.error('로그인 에러:', error);
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
  }
});

// 구글 login/회원가입 라우트
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  try {
    // 1. 구글에서 받은 인증 정보 확인
    console.log('Received Google login request');
    const { credential } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    console.log('Google token payload:', payload);

    if (!payload || !payload.email) {
      console.error('Invalid token');
      return res.status(400).json({ error: 'Invalid token' });
    }
    
    // 2. 이미 beetime에 가입된 이메일인지 확인
    let user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

     // 3. 신규 사용자면 기본 정보로 계정 생성
    if (!user) {
      console.log('Creating new user');
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || '',
          isProfileComplete: false,  // 추가 정보 입력이 필요하므로 이 단계에선 false
          role: 'EMPLOYEE'
        }
      });
    }
    
    // 4. JWT 토큰 생성 - 7일 동안 유효
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // 5. 프로필 완성 여부에 따라 다른 응답 전송
    console.log('User authenticated, sending response');
    console.log('isProfileComplete:', user.isProfileComplete); // 디버깅 로그 추가
    res.json({
      token,
      user,
      requiresProfileComplete: !user.isProfileComplete // 추가 정보 입력 필요 여부
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Google login processing error' });
  }
});

// 사용자 정보 업데이트 라우트 (구글 로그인 후 추가 정보 입력 페이지로 이동한 후 정보 업데이트)
router.put('/update-user-info', authenticate, async (req, res) => {
  try {
    const { userId, name, locationId } = req.body;

    // 1. 트랜잭션 시작 - 사용자 정보 업데이트와 LocationUser 생성을 동시에 처리
    const result = await prisma.$transaction(async (tx) => {
       // 1-1. 사용자 정보 업데이트
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          name,
          locationId: parseInt(locationId),
          isProfileComplete: true // 모든 정보가 입력되었으므로 true로 변경
        }
      });

      // 1-2. 사용자-지점 연결 정보 생성
      await tx.locationUser.create({
        data: {
          userId,
          locationId: parseInt(locationId),
          startDate: new Date()
        }
      });

      return updatedUser;
    });

     // 2. 새로운 JWT 토큰 생성 (자동 로그인 유지)
    const token = jwt.sign(
      { userId: result.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

     // 3. 업데이트된 정보와 새 토큰 전송
    res.json({ 
      user: result,
      token
    });
  } catch (error) {
    console.error('Failed to update user information:', error);
    res.status(500).json({ error: 'Failed to update user information.' });
  }
});


// 1. 비밀번호 재설정 요청 & 인증 코드 발송
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // 이메일 존재 여부 확인
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ error: 'Unregistered email' });
    }

    // 6자리 인증 코드 생성
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 이전 인증 코드 삭제
    await prisma.verificationCode.deleteMany({
      where: { email }
    });

    // 새 인증 코드 저장 (5분 유효)
    await prisma.verificationCode.create({
      data: {
        email,
        code: verificationCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });

    // 이메일 발송
    await sendVerificationEmail(email, verificationCode);

    res.json({ message: 'Please check your email for the verification code.' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. 인증 코드 확인
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log('Received verification request:', { email, code });

    const verificationRecord = await prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        expiresAt: {
          gt: new Date()  // 현재 시간보다 만료 시간이 더 나중인지 확인
        }
      }
    });

    console.log('Found verification record:', verificationRecord);

    if (!verificationRecord) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // 인증 성공 시 토큰 발급
    const resetToken = jwt.sign(
      { email },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' }
    );

    res.json({ resetToken });
  } catch (error) {
    console.error('Invalid verification code:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. 새 비밀번호 설정
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword, resetToken } = req.body;

    // 토큰 검증
    try {
      jwt.verify(resetToken, process.env.JWT_SECRET!);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    // 인증 코드 레코드 삭제
    await prisma.verificationCode.deleteMany({
      where: { email }
    });

    res.json({ message: 'Password has been successfully reset.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 토큰 갱신 라우트
router.post('/refresh-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Refresh token request received');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // 토큰 검증
      const decoded = jwt.verify(token, process.env.JWT_SECRET!, { ignoreExpiration: true }) as { userId: string };
      console.log('Token decoded for refresh:', decoded);
      
      // 사용자 확인
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      // 새 토큰 발급
      const newToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      
      console.log('New token issued for user:', user.id);
      
      // 응답
      res.json({
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          locationId: user.locationId,
          isProfileComplete: user.isProfileComplete
        }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return res.status(401).json({ error: 'Token refresh failed' });
    }
  } catch (error) {
    console.error('Refresh token route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Comprehensive test endpoint for authentication flow
router.get('/test-auth-flow', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const results: {
      headers: {
        received: string[];
        authorization: string;
      };
      token: {
        present: boolean;
        valid: boolean;
        expired: boolean;
        decoded: any | null;
        error: string | null;
      };
      user: any | null;
      environment: string;
      serverTime: string;
    } = {
      headers: {
        received: Object.keys(req.headers),
        authorization: authHeader ? 'Present' : 'Missing'
      },
      token: {
        present: false,
        valid: false,
        expired: false,
        decoded: null,
        error: null
      },
      user: null,
      environment: process.env.NODE_ENV || 'unknown',
      serverTime: new Date().toISOString()
    };
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ...results,
        error: 'Authentication required',
        message: 'No authorization header provided or invalid format'
      });
    }
    
    const token = authHeader.split(' ')[1];
    results.token.present = true;
    
    try {
      // First try to verify with expiration check
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      results.token.valid = true;
      results.token.decoded = {
        userId: decoded.userId,
        exp: decoded.exp || 0,
        iat: decoded.iat || 0,
        expiresAt: new Date((decoded.exp || 0) * 1000).toISOString(),
        issuedAt: new Date((decoded.iat || 0) * 1000).toISOString(),
        timeRemaining: Math.floor(((decoded.exp || 0) * 1000 - Date.now()) / 1000 / 60) + ' minutes'
      };
      
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          locationId: true
        }
      });
      
      if (user) {
        results.user = user;
        
        // Also get the user's location
        if (user.locationId) {
          const location = await prisma.location.findUnique({
            where: { id: user.locationId },
            select: {
              id: true,
              name: true,
              placeId: true
            }
          });
          
          if (location) {
            results.user.location = location;
          }
        }
      } else {
        results.token.error = 'User not found';
      }
      
      return res.json({
        status: 'success',
        message: 'Authentication flow test completed successfully',
        results
      });
      
    } catch (tokenError) {
      // If verification fails, check if it's due to expiration
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string, { ignoreExpiration: true }) as JwtPayload;
        
        if ((decoded.exp || 0) * 1000 < Date.now()) {
          results.token.expired = true;
          results.token.error = 'Token expired';
          results.token.decoded = {
            userId: decoded.userId,
            exp: decoded.exp || 0,
            iat: decoded.iat || 0,
            expiresAt: new Date((decoded.exp || 0) * 1000).toISOString(),
            issuedAt: new Date((decoded.iat || 0) * 1000).toISOString()
          };
          
          // Try to get user info anyway
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          });
          
          if (user) {
            results.user = user;
          }
          
          return res.status(401).json({
            status: 'error',
            message: 'Token expired',
            results
          });
        }
        
        results.token.error = 'Token invalid (not expired)';
        return res.status(401).json({
          status: 'error',
          message: 'Token invalid',
          results,
          tokenError: tokenError instanceof Error ? tokenError.message : 'Unknown error'
        });
        
      } catch (decodeError) {
        results.token.error = 'Token malformed';
        return res.status(401).json({
          status: 'error',
          message: 'Token malformed',
          results,
          tokenError: decodeError instanceof Error ? decodeError.message : 'Unknown error'
        });
      }
    }
    
  } catch (error) {
    console.error('Error in test-auth-flow endpoint:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as authRouter };