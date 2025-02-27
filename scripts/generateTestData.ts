import { PrismaClient } from '@prisma/client';
import { randomInt } from 'crypto';
import { format } from 'date-fns';

const prisma = new PrismaClient();

// 시간을 HH:MM 형식으로 변환하는 함수
function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

async function main() {
//   // 1. 기존 TimeRecord 데이터 삭제
//   console.log('Cleaning up existing TimeRecord data...');
//   await prisma.timeRecord.deleteMany({});
//   console.log('TimeRecord data cleaned up successfully.');

  // 2. 사용자 정보 가져오기
  const user = await prisma.user.findUnique({
    where: { email: 'tsjyono@gmail.com' },
    include: { location: true }
  });

  if (!user || !user.location) {
    console.error('User not found or has no location assigned');
    return;
  }

  console.log(`Generating test data for user: ${user.name} (${user.email})`);

  // 3. 2월 1일부터 13일까지의 근무 기록 생성
  const startDate = new Date('2025-02-10');
  const endDate = new Date('2025-02-27');
  
  // 날짜 범위 생성
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 4. 각 날짜별 근무 기록 생성
  for (const date of dates) {
    // 출근 시간 - 오전 9시 정각 또는 9시 30분 (랜덤)
    const clockInHour = 9;
    const clockInMinute = [0, 30][randomInt(2)]; // 9:00 또는 9:30
    
    // 퇴근 시간 - 오후 5시 정각 또는 5시 30분 (랜덤)
    const clockOutHour = 17;
    const clockOutMinute = [0, 30][randomInt(2)]; // 17:00 또는 17:30
    
    // 휴식 시간은 출근과 퇴근 사이에 30분
    // 가능한 휴식 시작 시간 (30분 단위로, 출근 후 1시간 이후부터 퇴근 1시간 전까지)
    const possibleBreakStartHours = [];
    for (let hour = 10; hour <= 15; hour++) {
      possibleBreakStartHours.push({ hour, minute: 0 });
      possibleBreakStartHours.push({ hour, minute: 30 });
    }
    
    // 랜덤하게 휴식 시작 시간 선택
    const breakStartIndex = randomInt(possibleBreakStartHours.length);
    const breakStart = possibleBreakStartHours[breakStartIndex];
    
    // 휴식 종료 시간 (휴식 시작 후 30분)
    let breakEndHour = breakStart.hour;
    let breakEndMinute = breakStart.minute + 30;
    
    if (breakEndMinute >= 60) {
      breakEndHour += 1;
      breakEndMinute -= 60;
    }
    
    // 시간을 HH:MM 형식으로 변환
    const clockInTime = formatTime(clockInHour, clockInMinute);
    const clockOutTime = formatTime(clockOutHour, clockOutMinute);
    const breakStartTime = formatTime(breakStart.hour, breakStart.minute);
    const breakEndTime = formatTime(breakEndHour, breakEndMinute);
    
    // 휴식 시간 계산 (분)
    const breakMinutes = 30; // 항상 30분
    
    // 근무 시간 계산 (시간 단위, 소수점 포함)
    const totalWorkMinutes = (clockOutHour * 60 + clockOutMinute) - (clockInHour * 60 + clockInMinute);
    const workingHours = (totalWorkMinutes - breakMinutes) / 60;
    
    // 날짜를 DD-MM-YYYY 형식으로 변환 (시드니 기준)
    const formattedDate = format(date, 'dd-MM-yyyy');
    
    // TimeRecord 생성
    const timeRecord = await prisma.timeRecord.create({
      data: {
        userId: user.id,
        locationId: user.location.id,
        date: formattedDate,
        clockInTime: clockInTime,
        clockOutTime: clockOutTime,
        breakStartTime: breakStartTime,
        breakEndTime: breakEndTime,
        breakMinutes: breakMinutes,
        workingHours: workingHours,
        status: 'completed',
        note: `Test record for ${formattedDate}`
      }
    });
    
    console.log(`Created TimeRecord for ${formattedDate}:`, {
      clockIn: clockInTime,
      clockOut: clockOutTime,
      breakStart: breakStartTime,
      breakEnd: breakEndTime,
      breakMinutes,
      workingHours: workingHours.toFixed(1)
    });
  }

  console.log(`Successfully created ${dates.length} test records.`);
}

main()
  .catch((e) => {
    console.error('Error generating test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 