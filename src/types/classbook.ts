export type UserRole = 'Admin' | 'Cán bộ Đoàn' | 'LPHT';

export type PageId =
  | 'dashboard'
  | 'classbook'
  | 'lesson-entry'
  | 'timetable'
  | 'week-close'
  | 'rankings'
  | 'analytics'
  | 'alerts'
  | 'ai-assistant'
  | 'reports'
  | 'digital-archive'
  | 'excel'
  | 'classes'
  | 'subjects'
  | 'users'
  | 'audit-log'
  | 'settings';

export type LessonRating = 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';
export type LessonStatus = 'Đã lưu' | 'Nháp' | 'Chờ xác nhận' | 'Cần bổ sung';
export type SemesterId = 'HK1' | 'HK2';
export type GradeLevel = 10 | 11 | 12;

export interface CriteriaScores {
  hocTap: number;    // 0 - 3
  kiLuat: number;    // 0 - 3
  veSinh: number;    // 0 - 2
  chuyenCan: number; // 0 - 2
}

export interface ClassLesson {
  id: string;
  schoolYear: string;
  semester: SemesterId;
  week: number; // 1..39
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 2..7 (Thứ 2 .. Thứ 7)
  classId: string;
  className: string;
  grade: GradeLevel;
  period: number; // 1..5
  subjectId: string;
  subjectName: string;
  teacherName: string;
  lessonContent: string;
  scores: CriteriaScores;
  totalScore: number;
  rating: LessonRating;
  notes: string;
  teacherComment: string;
  status: LessonStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  grade: GradeLevel;
  homeroomTeacher: string;
  lphtName: string;
  lphtUserId?: string;
  studentCount: number;
  expectedPeriodsPerWeek: number;
  status: 'Hoạt động' | 'Tạm ngưng';
}

export interface SubjectItem {
  id: string;
  code: string;
  name: string;
  status: 'Đang giảng dạy' | 'Ngừng sử dụng';
}

export interface UserAccount {
  id: string;
  fullName: string;
  contact: string; // Email or Phone
  role: UserRole;
  assignedClassId?: string;
  assignedClassName?: string;
  status: 'Hoạt động' | 'Đã khóa';
  lastLoginAt?: string;
}

export type TimetableEventType = 'Bình thường' | 'Đổi tiết' | 'Nghỉ học' | 'Học bù' | 'Dạy thay';

export interface TimetableSlot {
  id: string;
  schoolYear: string;
  semester: SemesterId;
  classId: string;
  className: string;
  dayOfWeek: number; // 2..7 (Thứ 2 .. Thứ 7)
  period: number; // 1..5
  subjectId: string;
  subjectName: string;
  teacherName: string;
  eventType: TimetableEventType;
  changeNote?: string;
}

export interface LockedWeekRecord {
  week: number;
  schoolYear: string;
  semester: SemesterId;
  lockedBy: string;
  lockedAt: string;
  note?: string;
}

export interface DigitalBookRecord {
  id: string;
  classId: string;
  className: string;
  schoolYear: string;
  semester: SemesterId;
  totalLessons: number;
  status: 'Đang mở' | 'Đã chốt' | 'Đã đóng quyển';
  version: string;
  closedAt?: string;
  closedBy?: string;
}

export interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: UserRole;
  timestamp: string;
  action: 'Tạo tiết học' | 'Cập nhật tiết học' | 'Xóa tiết học' | 'Chốt tuần' | 'Mở khóa tuần' | 'Cập nhật TKB' | 'Quản trị hệ thống' | 'Import Excel' | 'Đóng quyển';
  className?: string;
  summary: string;
  beforeData?: string;
  afterData?: string;
  reason?: string;
}

export interface ScoringRules {
  hocTapMax: number;
  kiLuatMax: number;
  veSinhMax: number;
  chuyenCanMax: number;
  totMin: number;
  khaMin: number;
  datMin: number;
}

export interface RankingRules {
  requireConfirmation: boolean;
  countMissingAsZero: false; // Explicitly false by policy
  tieBreaker: 'totRate_then_completion';
}

export interface SchoolSettings {
  schoolName: string;
  slogan: string;
  address: string;
  principalName: string;
  currentSchoolYear: string;
  currentSemester: SemesterId;
  currentWeek: number;
  totalWeeks: number;
  scoringRules: ScoringRules;
  rankingRules: RankingRules;
  notifications: {
    alertMissingHours: number;
    alertScoreDropThreshold: number;
    enableWeeklyReminder: boolean;
  };
  security: {
    sessionTimeoutMinutes: number;
    requireReasonOnEdit: boolean;
  };
}

export interface SmartAlert {
  id: string;
  category: 'missing' | 'score-drop' | 'check-needed' | 'resolved';
  classId: string;
  className: string;
  title: string;
  description: string;
  timestamp: string;
  severity: 'Cao' | 'Trung bình' | 'Thấp';
  relatedData: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface ClassRankingRow {
  rank: number;
  classId: string;
  className: string;
  grade: GradeLevel;
  enteredLessons: number;
  expectedLessons: number;
  completionRate: number;
  averageScore: number | null;
  totCount: number;
  khaCount: number;
  datCount: number;
  chuaDatCount: number;
  totRate: number;
  isLocked: boolean;
  explanation: string;
}

export interface AppDataset {
  settings: SchoolSettings;
  classes: SchoolClass[];
  subjects: SubjectItem[];
  users: UserAccount[];
  timetable: TimetableSlot[];
  lessons: ClassLesson[];
  lockedWeeks: LockedWeekRecord[];
  digitalBooks: DigitalBookRecord[];
  auditLogs: AuditLogEntry[];
  resolvedAlertIds: string[];
}
