//새로 만든 파일임.

// 사용자 관련 타입
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'EMPLOYEE';
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
    type: 'CLOCK_IN' | 'CLOCK_OUT' | 
          'BREAK_START_1' | 'BREAK_END_1' | 
          'BREAK_START_2' | 'BREAK_END_2' | 
          'BREAK_START_3' | 'BREAK_END_3';
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
  
  
  export interface InformationFormData {
    name: string;
    locationId: string;
  }

  // 테이블 셀 데이터 타입
export interface TableCellData {
  value: string | null;
  status?: 'late' | 'early' | 'normal';
}

// 테이블 셀 props 타입
export interface TableCellProps {
  data: TableCellData;
}

// 테이블 헤더 props 타입
export interface TableHeaderProps {
  title: string;
}

// 근무 시간 기록 행 타입
export interface TimeActivityRow {
  date: Date;
  checkIn: string | null;
  breakIn: string | null;
  breakOut: string | null;
  checkOut: string | null;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  title?: string;
  locationId: string | number;
  location: Location;
}

export interface SortOption {
  field: 'name' | 'title' | 'location';
  direction: 'asc' | 'desc';
}