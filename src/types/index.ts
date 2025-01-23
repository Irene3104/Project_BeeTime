// 사용자 관련 타입
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  locationId?: number;
  isProfileComplete?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 인증 관련 타입
export interface AuthResponse {
  token: string;
  user: User & {
    location: Location;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// 시간 기록 관련 타입
export interface TimeEntry {
  id: string;
  userId: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END';
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

// API 응답 관련 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// QR 스캐너 관련 타입
export interface QRScannerProps {
  type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut';
  onClose: () => void;
  onScan: (data: string) => void;
}

// export interface ButtonProps {
//   children: React.ReactNode;
//   size?: 'default' | 'small' | 'medium' | 'large' | 'icon';
//   icon?: string;
//   variant?: 'primary' | 'secondary' | 'ghost' | 'cancel' | 'back' | 'login';
//   fullWidth?: boolean;
//   onClick?: () => void;
//   type?: 'button' | 'submit' | 'reset';
//   disabled?: boolean;
//   className?: string;
// }

// 시간 그리드 관련 타입
export interface TimeGridEntry {
  date: Date;
  clockIn?: Date;
  clockOut?: Date;
  breakStart?: Date;
  breakEnd?: Date;
  totalHours?: number;
}

// 환경 변수 타입
export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  PORT: number;
}

// Location 관련 타입 추가
export interface Location {
  id: number;
  name: string;
  branch: string | null;
  address: string;
  company: string;
  isActive: boolean;
}

// 회원가입 요청 타입 추가
export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  locationId: number;
}