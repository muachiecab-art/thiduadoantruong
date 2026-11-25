import crypto from 'crypto';
import {
  AppDataset,
  AuditLogEntry,
  ClassLesson,
  DigitalBookRecord,
  GradeLevel,
  LockedWeekRecord,
  SchoolClass,
  SchoolSettings,
  SubjectItem,
  TimetableSlot,
  UserAccount,
} from '../src/types/classbook';
import { classifyLesson, computeTotalScore } from '../src/utils/scoring';

export interface StoredUserRecord extends UserAccount {
  passwordHash: string;
}

export interface PersistedStore extends Omit<AppDataset, 'users'> {
  users: StoredUserRecord[];
}

export function hashPassword(password: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return `${actualSalt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const actualBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export function createInitialSeedStore(): PersistedStore {
  const settings: SchoolSettings = {
    schoolName: 'Trường THPT Chu Văn An',
    slogan: 'Số hóa mỗi tiết học – Thông minh hóa công tác thi đua.',
    address: 'Số 10 Thụy Khuê, Tây Hồ, Hà Nội',
    principalName: 'NGƯT. Nguyễn Thị Minh Tâm',
    currentSchoolYear: '2025-2026',
    currentSemester: 'HK1',
    currentWeek: 12,
    totalWeeks: 39,
    scoringRules: {
      hocTapMax: 3,
      kiLuatMax: 3,
      veSinhMax: 2,
      chuyenCanMax: 2,
      totMin: 9.0,
      khaMin: 7.5,
      datMin: 5.0,
    },
    rankingRules: {
      requireConfirmation: false,
      countMissingAsZero: false,
      tieBreaker: 'totRate_then_completion',
    },
    notifications: {
      alertMissingHours: 24,
      alertScoreDropThreshold: 0.5,
      enableWeeklyReminder: true,
    },
    security: {
      sessionTimeoutMinutes: 120,
      requireReasonOnEdit: true,
    },
  };

  const classes: SchoolClass[] = [
    { id: 'c-10a1', name: '10A1', grade: 10, homeroomTeacher: 'Nguyễn Thị Thu Hà', lphtName: 'Trần Minh Anh', lphtUserId: 'u-lpht-10a1', studentCount: 44, expectedPeriodsPerWeek: 10, status: 'Hoạt động' },
    { id: 'c-10a2', name: '10A2', grade: 10, homeroomTeacher: 'Phạm Quốc Bảo', lphtName: 'Lê Hoàng Nam', studentCount: 43, expectedPeriodsPerWeek: 10, status: 'Hoạt động' },
    { id: 'c-10a3', name: '10A3', grade: 10, homeroomTeacher: 'Đỗ Ngọc Lan', lphtName: 'Nguyễn Thảo Vy', studentCount: 42, expectedPeriodsPerWeek: 10, status: 'Hoạt động' },
    { id: 'c-10a4', name: '10A4', grade: 10, homeroomTeacher: 'Vũ Đức Mạnh', lphtName: 'Hoàng Gia Huy', studentCount: 45, expectedPeriodsPerWeek: 10, status: 'Hoạt động' },
    { id: 'c-11a1', name: '11A1', grade: 11, homeroomTeacher: 'Lê Thanh Hương', lphtName: 'Phạm Khánh Linh', studentCount: 42, expectedPeriodsPerWeek: 10, status: 'Hoạt động' },
    { id: 'c-11a2', name: '11A2', grade: 11, homeroomTeacher: 'Trần Văn Dũng', lphtName: 'Bùi Đức Anh', studentCount: 41, expectedPeriodsPerWeek: 10, status: 'Hoạt động' },
    { id: 'c-11a3', name: '11A3', grade: 11, homeroomTeacher: 'Hoàng Thị Mai', lphtName: 'Vũ Ngọc Diệp', studentCount: 43, expectedPeriodsPerWeek: 10, status: 'Hoạt động' },
    { id: 'c-11a4', name: '11A4', grade: 11, homeroomTeacher: 'Ngô Minh Tuấn', lphtName: 'Đặng Bảo Ngọc', studentCount: 40, expectedPeriodsPerWeek: 10, status: 'Hoạt động' },
    { id: 'c-12a1', name: '12A1', grade: 12, homeroomTeacher: 'Nguyễn Thị Kim Oanh', lphtName: 'Trịnh Quang Minh', studentCount: 44, expectedPeriodsPerWeek: 10, status: 'Hoạt động' },
    { id: 'c-12a2', name: '12A2', grade: 12, homeroomTeacher: 'Bùi Xuân Thành', lphtName: 'Lê Phương Thảo', studentCount: 42, expectedPeriodsPerWeek: 10, status: 'Hoạt động' },
    { id: 'c-12a3', name: '12A3', grade: 12, homeroomTeacher: 'Phan Thị Hạnh', lphtName: 'Đào Hải Đăng', studentCount: 41, expectedPeriodsPerWeek: 10, status: 'Hoạt động' },
    { id: 'c-12a4', name: '12A4', grade: 12, homeroomTeacher: 'Trương Quang Vinh', lphtName: 'Nguyễn Minh Quân', studentCount: 43, expectedPeriodsPerWeek: 10, status: 'Hoạt động' },
  ];

  const subjects: SubjectItem[] = [
    { id: 'sub-toan', code: 'TOAN', name: 'Toán học', status: 'Đang giảng dạy' },
    { id: 'sub-van', code: 'VAN', name: 'Ngữ văn', status: 'Đang giảng dạy' },
    { id: 'sub-anh', code: 'ANH', name: 'Tiếng Anh', status: 'Đang giảng dạy' },
    { id: 'sub-ly', code: 'LY', name: 'Vật lí', status: 'Đang giảng dạy' },
    { id: 'sub-hoa', code: 'HOA', name: 'Hóa học', status: 'Đang giảng dạy' },
    { id: 'sub-sinh', code: 'SINH', name: 'Sinh học', status: 'Đang giảng dạy' },
    { id: 'sub-su', code: 'SU', name: 'Lịch sử', status: 'Đang giảng dạy' },
    { id: 'sub-dia', code: 'DIA', name: 'Địa lí', status: 'Đang giảng dạy' },
    { id: 'sub-tin', code: 'TIN', name: 'Tin học', status: 'Đang giảng dạy' },
    { id: 'sub-gdcd', code: 'GDKTPL', name: 'GD Kinh tế & PL', status: 'Đang giảng dạy' },
    { id: 'sub-cn', code: 'CN', name: 'Công nghệ', status: 'Đang giảng dạy' },
    { id: 'sub-gdqp', code: 'GDQP', name: 'GD Quốc phòng', status: 'Ngừng sử dụng' },
  ];

  const defaultPassHash = hashPassword('Chuvanan@2026');

  const users: StoredUserRecord[] = [
    {
      id: 'u-admin',
      fullName: 'TS. Nguyễn Hữu Quang',
      contact: 'admin@chuvanan.edu.vn',
      role: 'Admin',
      status: 'Hoạt động',
      lastLoginAt: '2025-11-24T07:15:00Z',
      passwordHash: defaultPassHash,
    },
    {
      id: 'u-doan',
      fullName: 'ThS. Phạm Ngọc Diệp',
      contact: 'doantruong@chuvanan.edu.vn',
      role: 'Cán bộ Đoàn',
      status: 'Hoạt động',
      lastLoginAt: '2025-11-24T07:40:00Z',
      passwordHash: defaultPassHash,
    },
    {
      id: 'u-lpht-10a1',
      fullName: 'Trần Minh Anh',
      contact: 'lpht.10a1@chuvanan.edu.vn',
      role: 'LPHT',
      assignedClassId: 'c-10a1',
      assignedClassName: '10A1',
      status: 'Hoạt động',
      lastLoginAt: '2025-11-24T08:05:00Z',
      passwordHash: defaultPassHash,
    },
    {
      id: 'u-lpht-11a1',
      fullName: 'Phạm Khánh Linh',
      contact: 'lpht.11a1@chuvanan.edu.vn',
      role: 'LPHT',
      assignedClassId: 'c-11a1',
      assignedClassName: '11A1',
      status: 'Hoạt động',
      lastLoginAt: '2025-11-23T15:20:00Z',
      passwordHash: defaultPassHash,
    },
    {
      id: 'u-lpht-12a1',
      fullName: 'Trịnh Quang Minh',
      contact: 'lpht.12a1@chuvanan.edu.vn',
      role: 'LPHT',
      assignedClassId: 'c-12a1',
      assignedClassName: '12A1',
      status: 'Hoạt động',
      lastLoginAt: '2025-11-23T16:10:00Z',
      passwordHash: defaultPassHash,
    },
  ];

  const teacherBySubject: Record<string, string> = {
    'sub-toan': 'Nguyễn Văn Hùng',
    'sub-van': 'Trần Thị Thu Lan',
    'sub-anh': 'Lê Phương Thảo',
    'sub-ly': 'Phạm Đức Mạnh',
    'sub-hoa': 'Hoàng Thị Mai',
    'sub-sinh': 'Vũ Ngọc Bích',
    'sub-su': 'Đỗ Quang Minh',
    'sub-dia': 'Ngô Thanh Tâm',
    'sub-tin': 'Bùi Tuấn Kiệt',
    'sub-gdcd': 'Phan Thị Hạnh',
    'sub-cn': 'Trương Văn Sơn',
  };

  const sampleTopics: Record<string, string[]> = {
    'sub-toan': ['Hàm số bậc hai và đồ thị', 'Hệ phương trình bậc nhất hai ẩn', 'Vectơ trong mặt phẳng tọa độ', 'Phương trình quy về bậc hai'],
    'sub-van': ['Đọc hiểu văn bản nghị luận xã hội', 'Phân tích tác phẩm Đất nước', 'Thực hành tiếng Việt: Biện pháp tu từ', 'Viết bài văn nghị luận văn học'],
    'sub-anh': ['Unit 4: For a better community - Reading', 'Unit 4: Listening & Speaking', 'Grammar: Past continuous vs Past simple', 'Project presentation: Volunteer work'],
    'sub-ly': ['Chuyển động thẳng biến đổi đều', 'Định luật II Newton', 'Tổng hợp và phân tích lực', 'Thực hành đo gia tốc rơi tự do'],
    'sub-hoa': ['Cấu tạo vỏ nguyên tử', 'Bảng tuần hoàn các nguyên tố hóa học', 'Liên kết cộng hóa trị', 'Phản ứng oxi hóa - khử'],
    'sub-sinh': ['Thành phần hóa học của tế bào', 'Cấu trúc tế bào nhân thực', 'Vận chuyển các chất qua màng sinh chất', 'Chu kỳ tế bào và nguyên phân'],
    'sub-su': ['Cách mạng công nghiệp thời kỳ cận đại', 'Văn minh Đại Việt thế kỷ X–XV', 'Kháng chiến chống quân xâm lược', 'Tổng kết chuyên đề Lịch sử Việt Nam'],
    'sub-dia': ['Cấu trúc của Trái Đất và thạch quyển', 'Khí hậu và các đới khí hậu', 'Thủy quyển và vòng tuần hoàn nước', 'Thực hành đọc bản đồ địa hình'],
    'sub-tin': ['Biểu diễn thông tin trong máy tính', 'Cấu trúc rẽ nhánh trong Python', 'Thiết kế thuật toán tìm kiếm', 'An toàn thông tin trên mạng'],
    'sub-gdcd': ['Nền kinh tế và các chủ thể kinh tế', 'Thị trường và cơ chế thị trường', 'Ngân sách nhà nước và thuế', 'Quyền bình đẳng của công dân'],
  };

  // Build 10-slot weekly timetable per class (Mon-Fri, 2 key periods/day tracked)
  const subjectCycle = ['sub-toan', 'sub-van', 'sub-anh', 'sub-ly', 'sub-hoa', 'sub-sinh', 'sub-su', 'sub-dia', 'sub-tin', 'sub-gdcd'];
  const timetable: TimetableSlot[] = [];

  classes.forEach((cls, cIdx) => {
    for (let slotIdx = 0; slotIdx < 10; slotIdx++) {
      const dayOfWeek = 2 + Math.floor(slotIdx / 2); // Thứ 2..Thứ 6
      const period = (slotIdx % 2) + 1;
      const subId = subjectCycle[(cIdx + slotIdx) % subjectCycle.length];
      const sub = subjects.find((s) => s.id === subId)!;
      timetable.push({
        id: `tkb-${cls.id}-d${dayOfWeek}-p${period}`,
        schoolYear: '2025-2026',
        semester: 'HK1',
        classId: cls.id,
        className: cls.name,
        dayOfWeek,
        period,
        subjectId: sub.id,
        subjectName: sub.name,
        teacherName: teacherBySubject[sub.id] || 'Giáo viên bộ môn',
        eventType: cls.id === 'c-10a3' && slotIdx === 7 ? 'Đổi tiết' : cls.id === 'c-11a4' && slotIdx === 6 ? 'Dạy thay' : 'Bình thường',
        changeNote:
          cls.id === 'c-10a3' && slotIdx === 7
            ? 'Đổi sang tiết 3 theo đề xuất tổ Toán'
            : cls.id === 'c-11a4' && slotIdx === 6
              ? 'Cô Lan dạy thay thầy Minh đi tập huấn'
              : undefined,
      });
    }
  });

  // Deterministic lesson generator across weeks 8..12
  const lessons: ClassLesson[] = [];
  const baseMondayDates: Record<number, string> = {
    8: '2025-10-27',
    9: '2025-11-03',
    10: '2025-11-10',
    11: '2025-11-17',
    12: '2025-11-24',
  };

  const addDays = (iso: string, offset: number): string => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  // Class baseline tiers so podium & score drops are realistic and meaningful
  const classProfile: Record<string, { ht: number; kl: number; vs: number; cc: number }> = {
    '12A1': { ht: 2.9, kl: 2.9, vs: 1.9, cc: 2.0 },
    '10A1': { ht: 2.8, kl: 2.9, vs: 1.9, cc: 1.9 },
    '11A1': { ht: 2.8, kl: 2.8, vs: 1.9, cc: 1.9 },
    '10A2': { ht: 2.7, kl: 2.7, vs: 1.8, cc: 1.9 },
    '12A2': { ht: 2.7, kl: 2.8, vs: 1.8, cc: 1.8 },
    '11A2': { ht: 2.6, kl: 2.7, vs: 1.8, cc: 1.8 },
    '10A3': { ht: 2.5, kl: 2.5, vs: 1.7, cc: 1.8 },
    '11A3': { ht: 2.5, kl: 2.6, vs: 1.7, cc: 1.7 },
    '12A3': { ht: 2.4, kl: 2.5, vs: 1.7, cc: 1.8 },
    '10A4': { ht: 2.2, kl: 2.2, vs: 1.5, cc: 1.6 },
    '11A4': { ht: 2.3, kl: 2.3, vs: 1.6, cc: 1.7 },
    '12A4': { ht: 2.4, kl: 2.4, vs: 1.6, cc: 1.7 },
  };

  for (const week of [8, 9, 10, 11, 12]) {
    const monIso = baseMondayDates[week];
    classes.forEach((cls, cIdx) => {
      const slots = timetable.filter((t) => t.classId === cls.id);
      slots.forEach((slot, sIdx) => {
        // In current week 12, leave some slots un-entered so progress & alerts are realistic
        if (week === 12) {
          if (cls.name === '10A4' && sIdx >= 6) return; // 4 missing
          if (cls.name === '11A3' && sIdx >= 8) return; // 2 missing
          if (cls.name === '12A4' && sIdx >= 7) return; // 3 missing
          if (cls.name === '10A1' && sIdx >= 9) return; // 1 missing
          if (cls.name === '12A2' && sIdx >= 8) return; // 2 missing
        }

        const prof = classProfile[cls.name];
        const variation = ((cIdx + sIdx + week) % 3) * 0.1 - 0.1; // -0.1, 0, +0.1
        // Give 10A4 a realistic dip in week 12 so Smart Alerts detects it
        const dip = week === 12 && cls.name === '10A4' ? -0.3 : 0;

        const clamp = (v: number, max: number) =>
          Math.max(0, Math.min(max, Math.round(v * 10) / 10));

        const scores = {
          hocTap: clamp(prof.ht + variation + dip, 3),
          kiLuat: clamp(prof.kl + (sIdx % 2 === 0 ? 0 : -0.1) + dip, 3),
          veSinh: clamp(prof.vs + (sIdx % 3 === 0 ? 0.1 : 0), 2),
          chuyenCan: clamp(prof.cc + (sIdx % 4 === 0 ? -0.1 : 0), 2),
        };

        const totalScore = computeTotalScore(scores);
        const rating = classifyLesson(totalScore);
        const date = addDays(monIso, slot.dayOfWeek - 2);
        const topics = sampleTopics[slot.subjectId] || ['Nội dung bài học theo phân phối chương trình'];
        const lessonContent = topics[(week + sIdx) % topics.length];

        const isDraft = week === 12 && cls.name === '11A4' && sIdx === 9;
        const isNeedsConfirm = week === 12 && cls.name === '10A3' && sIdx === 8;

        lessons.push({
          id: `les-w${week}-${cls.id}-d${slot.dayOfWeek}-p${slot.period}`,
          schoolYear: '2025-2026',
          semester: 'HK1',
          week,
          date,
          dayOfWeek: slot.dayOfWeek,
          classId: cls.id,
          className: cls.name,
          grade: cls.grade as GradeLevel,
          period: slot.period,
          subjectId: slot.subjectId,
          subjectName: slot.subjectName,
          teacherName: slot.teacherName,
          lessonContent,
          scores,
          totalScore,
          rating,
          notes:
            rating === 'Tốt'
              ? 'Lớp chuẩn bị bài chu đáo, phát biểu sôi nổi và giữ vệ sinh phòng học tốt.'
              : rating === 'Khá'
                ? 'Học sinh chú ý nghe giảng, cần tăng cường tương tác nhóm ở cuối tiết.'
                : 'Cần nhắc nhở một số em hoàn thành bài tập về nhà và ổn định trật tự đầu giờ.',
          teacherComment:
            sIdx % 3 === 0 ? 'Tiết học đạt mục tiêu chuẩn kiến thức kỹ năng.' : '',
          status: isDraft ? 'Nháp' : isNeedsConfirm ? 'Chờ xác nhận' : 'Đã lưu',
          createdBy: cls.lphtName,
          createdAt: `${date}T09:00:00Z`,
          updatedAt: `${date}T09:15:00Z`,
        });
      });
    });
  }

  const lockedWeeks: LockedWeekRecord[] = [8, 9, 10, 11].map((wk) => ({
    week: wk,
    schoolYear: '2025-2026',
    semester: 'HK1',
    lockedBy: 'ThS. Phạm Ngọc Diệp (Cán bộ Đoàn)',
    lockedAt: `${baseMondayDates[wk]}T17:30:00Z`,
    note: `Đã rà soát đầy đủ dữ liệu thi đua tuần ${wk}.`,
  }));

  const digitalBooks: DigitalBookRecord[] = classes.map((cls, idx) => ({
    id: `book-2025-hk1-${cls.id}`,
    classId: cls.id,
    className: cls.name,
    schoolYear: '2025-2026',
    semester: 'HK1',
    totalLessons: lessons.filter((l) => l.classId === cls.id && l.status !== 'Nháp').length,
    status: idx < 3 ? 'Đã chốt' : 'Đang mở',
    version: 'v1.2',
    closedAt: idx < 3 ? '2025-11-22T16:00:00Z' : undefined,
    closedBy: idx < 3 ? 'TS. Nguyễn Hữu Quang' : undefined,
  }));

  const auditLogs: AuditLogEntry[] = [
    {
      id: 'aud-1',
      actorName: 'ThS. Phạm Ngọc Diệp',
      actorRole: 'Cán bộ Đoàn',
      timestamp: '2025-11-22T17:30:00Z',
      action: 'Chốt tuần',
      summary: 'Chốt số liệu thi đua Tuần 11 toàn trường (12/12 lớp hoàn thành).',
      beforeData: 'Tuần 11: Tạm thời',
      afterData: 'Tuần 11: Đã chốt',
      reason: 'Hoàn tất kiểm tra sổ đầu bài cuối tuần 11.',
    },
    {
      id: 'aud-2',
      actorName: 'Trần Minh Anh',
      actorRole: 'LPHT',
      timestamp: '2025-11-24T08:45:00Z',
      action: 'Cập nhật tiết học',
      className: '10A1',
      summary: 'Điều chỉnh điểm Vệ sinh tiết 2 môn Ngữ văn lớp 10A1.',
      beforeData: 'Vệ sinh: 1,7 · Tổng: 9,4',
      afterData: 'Vệ sinh: 1,9 · Tổng: 9,6',
      reason: 'Bổ sung nhận xét trực nhật sau khi kiểm tra lại đầu giờ.',
    },
    {
      id: 'aud-3',
      actorName: 'TS. Nguyễn Hữu Quang',
      actorRole: 'Admin',
      timestamp: '2025-11-23T14:10:00Z',
      action: 'Cập nhật TKB',
      className: '10A3',
      summary: 'Cập nhật đổi tiết tổ Toán cho lớp 10A3.',
      beforeData: 'Thứ 5 - Tiết 2: Toán học',
      afterData: 'Thứ 5 - Tiết 2: Toán học (Đổi tiết)',
      reason: 'Theo lịch thao giảng cụm chuyên môn.',
    },
  ];

  return {
    settings,
    classes,
    subjects,
    users,
    timetable,
    lessons,
    lockedWeeks,
    digitalBooks,
    auditLogs,
    resolvedAlertIds: [],
  };
}
