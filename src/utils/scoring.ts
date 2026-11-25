import type {
  ClassLesson,
  ClassRankingRow,
  CriteriaScores,
  GradeLevel,
  LessonRating,
  LockedWeekRecord,
  SchoolClass,
  ScoringRules,
  SmartAlert,
  TimetableSlot,
} from '../types/classbook.js';

export const DEFAULT_SCORING_RULES: ScoringRules = {
  hocTapMax: 3,
  kiLuatMax: 3,
  veSinhMax: 2,
  chuyenCanMax: 2,
  totMin: 9.0,
  khaMin: 7.5,
  datMin: 5.0,
};

/**
 * Formats a numeric score consistently in Vietnamese locale with max 2 decimals.
 * Avoids floating-point artifacts like 2.8000000000000003 -> "2,8".
 * Only applies formatting at display layer; never mutates underlying precision.
 */
export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return '—';
  }
  const normalized = Math.round((value + Number.EPSILON) * 100) / 100;
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(normalized);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return '—';
  }
  const normalized = Math.round((value + Number.EPSILON) * 10) / 10;
  return `${new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(normalized)}%`;
}

/**
 * Performs exact base-100 integer arithmetic for decimal scores (e.g., 2.8 + 0.1 = 2.9, never 2.9000000000000004).
 */
export function addScoresExact(...values: number[]): number {
  let sumScaled = 0;
  for (const val of values) {
    if (typeof val === 'number' && Number.isFinite(val)) {
      sumScaled += Math.round(val * 100);
    }
  }
  return sumScaled / 100;
}

export function computeTotalScore(scores: CriteriaScores): number {
  return addScoresExact(scores.hocTap, scores.kiLuat, scores.veSinh, scores.chuyenCan);
}

/**
 * Computes exact arithmetic mean over entered values.
 * Returns null if no values exist (never treats un-entered periods as 0).
 */
export function averageScoresExact(values: number[]): number | null {
  if (values.length === 0) return null;
  let sumScaled = 0;
  for (const v of values) {
    sumScaled += Math.round(v * 100);
  }
  return sumScaled / (values.length * 100);
}

export function roundToHundredths(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseLocaleDecimal(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  if (cleaned === '') return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100) / 100;
}

export function validateCriteriaScores(
  scores: Partial<CriteriaScores>,
  rules: ScoringRules = DEFAULT_SCORING_RULES
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const check = (label: string, val: number | undefined, max: number) => {
    if (val === undefined || val === null || Number.isNaN(val)) {
      errors.push(`Vui lòng nhập điểm ${label}.`);
      return;
    }
    if (val < 0 || val > max) {
      errors.push(`Điểm ${label} phải nằm trong khoảng 0 đến ${formatScore(max)}.`);
    }
  };

  check('Học tập', scores.hocTap, rules.hocTapMax);
  check('Kỉ luật', scores.kiLuat, rules.kiLuatMax);
  check('Vệ sinh', scores.veSinh, rules.veSinhMax);
  check('Chuyên cần', scores.chuyenCan, rules.chuyenCanMax);

  return { valid: errors.length === 0, errors };
}

/**
 * Classifies a lesson strictly from its exact unrounded totalScore.
 */
export function classifyLesson(
  totalScore: number,
  rules: ScoringRules = DEFAULT_SCORING_RULES
): LessonRating {
  if (totalScore >= rules.totMin) return 'Tốt';
  if (totalScore >= rules.khaMin) return 'Khá';
  if (totalScore >= rules.datMin) return 'Đạt';
  return 'Chưa đạt';
}

export function getRatingBadgeTone(rating: LessonRating): {
  text: string;
  bg: string;
  border: string;
  dot: string;
} {
  switch (rating) {
    case 'Tốt':
      return {
        text: 'text-[#16A34A] dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        border: 'border-emerald-200 dark:border-emerald-800/60',
        dot: 'bg-[#16A34A]',
      };
    case 'Khá':
      return {
        text: 'text-[#2563EB] dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        border: 'border-blue-200 dark:border-blue-800/60',
        dot: 'bg-[#2563EB]',
      };
    case 'Đạt':
      return {
        text: 'text-[#D97706] dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-200 dark:border-amber-800/60',
        dot: 'bg-[#D97706]',
      };
    case 'Chưa đạt':
      return {
        text: 'text-[#DC2626] dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-950/40',
        border: 'border-red-200 dark:border-red-800/60',
        dot: 'bg-[#DC2626]',
      };
  }
}

export interface RankingQueryOptions {
  schoolYear: string;
  semester?: 'HK1' | 'HK2' | 'ALL';
  scope: 'week' | 'month' | 'semester' | 'year';
  week?: number;
  month?: number; // 1..12 or month block
  grade?: GradeLevel | 'ALL';
}

export function filterLessonsByScope(
  lessons: ClassLesson[],
  options: RankingQueryOptions
): ClassLesson[] {
  return lessons.filter((l) => {
    if (l.status === 'Nháp') return false;
    if (l.schoolYear !== options.schoolYear) return false;
    if (options.grade && options.grade !== 'ALL' && l.grade !== options.grade) return false;

    if (options.scope === 'week') {
      return l.week === (options.week ?? 1);
    }
    if (options.scope === 'month') {
      const m = options.month ?? 1;
      const startWeek = (m - 1) * 4 + 1;
      const endWeek = m * 4;
      return l.week >= startWeek && l.week <= endWeek;
    }
    if (options.scope === 'semester') {
      const sem = options.semester && options.semester !== 'ALL' ? options.semester : 'HK1';
      return l.semester === sem;
    }
    return true; // year
  });
}

/**
 * Computes class rankings without altering ranking rules:
 * - Only entered (non-draft) lessons are averaged; un-entered lessons are NEVER counted as 0.
 * - Tie-breaker: Average score desc -> Tốt rate desc -> Completion rate desc -> Class name asc.
 */
export function computeClassRankings(
  classes: SchoolClass[],
  lessons: ClassLesson[],
  lockedWeeks: LockedWeekRecord[],
  options: RankingQueryOptions
): ClassRankingRow[] {
  const activeClasses = classes.filter(
    (c) => c.status === 'Hoạt động' && (!options.grade || options.grade === 'ALL' || c.grade === options.grade)
  );
  const scopedLessons = filterLessonsByScope(lessons, options);

  const weekMultiplier =
    options.scope === 'week'
      ? 1
      : options.scope === 'month'
        ? 4
        : options.scope === 'semester'
          ? 18
          : 35;

  const isScopeLocked = (() => {
    if (options.scope === 'week') {
      const targetWeek = options.week ?? 1;
      return lockedWeeks.some(
        (w) => w.schoolYear === options.schoolYear && w.week === targetWeek
      );
    }
    if (options.scope === 'month') {
      const m = options.month ?? 1;
      const startWeek = (m - 1) * 4 + 1;
      const endWeek = m * 4;
      for (let wk = startWeek; wk <= endWeek; wk++) {
        if (!lockedWeeks.some((w) => w.schoolYear === options.schoolYear && w.week === wk)) {
          return false;
        }
      }
      return true;
    }
    return false;
  })();

  const rows: Omit<ClassRankingRow, 'rank'>[] = activeClasses.map((cls) => {
    const classLessons = scopedLessons.filter((l) => l.classId === cls.id);
    const avg = averageScoresExact(classLessons.map((l) => l.totalScore));
    const entered = classLessons.length;
    const expected = cls.expectedPeriodsPerWeek * weekMultiplier;
    const completionRate = expected > 0 ? Math.min(100, (entered / expected) * 100) : 0;

    const totCount = classLessons.filter((l) => l.rating === 'Tốt').length;
    const khaCount = classLessons.filter((l) => l.rating === 'Khá').length;
    const datCount = classLessons.filter((l) => l.rating === 'Đạt').length;
    const chuaDatCount = classLessons.filter((l) => l.rating === 'Chưa đạt').length;
    const totRate = entered > 0 ? (totCount / entered) * 100 : 0;

    const explanation =
      avg === null
        ? `Chưa có tiết học nào được lưu trong phạm vi đã chọn (${entered}/${expected} tiết).`
        : `ĐTB ${formatScore(avg)} điểm từ ${entered}/${expected} tiết đã nhập (tỷ lệ tiết Tốt ${formatPercent(totRate)}, hoàn thành ${formatPercent(completionRate)}). Tiết chưa nhập không tính 0 điểm.`;

    return {
      classId: cls.id,
      className: cls.name,
      grade: cls.grade,
      enteredLessons: entered,
      expectedLessons: expected,
      completionRate,
      averageScore: avg,
      totCount,
      khaCount,
      datCount,
      chuaDatCount,
      totRate,
      isLocked: isScopeLocked,
      explanation,
    };
  });

  rows.sort((a, b) => {
    if (a.averageScore === null && b.averageScore === null) {
      return a.className.localeCompare(b.className, 'vi');
    }
    if (a.averageScore === null) return 1;
    if (b.averageScore === null) return -1;
    if (Math.abs(b.averageScore - a.averageScore) > 0.0001) {
      return b.averageScore - a.averageScore;
    }
    if (Math.abs(b.totRate - a.totRate) > 0.01) {
      return b.totRate - a.totRate;
    }
    if (Math.abs(b.completionRate - a.completionRate) > 0.01) {
      return b.completionRate - a.completionRate;
    }
    return a.className.localeCompare(b.className, 'vi');
  });

  return rows.map((row, idx) => ({
    ...row,
    rank: idx + 1,
  }));
}

export interface CriteriaPercentBreakdown {
  hocTapPct: number;
  kiLuatPct: number;
  veSinhPct: number;
  chuyenCanPct: number;
  hocTapAvg: number | null;
  kiLuatAvg: number | null;
  veSinhAvg: number | null;
  chuyenCanAvg: number | null;
}

/**
 * Computes attainment percentage relative to each criterion's maximum score (3-3-2-2)
 * so criteria can be fairly compared as strengths/weaknesses.
 */
export function computeCriteriaBreakdown(
  lessons: ClassLesson[],
  rules: ScoringRules = DEFAULT_SCORING_RULES
): CriteriaPercentBreakdown {
  const valid = lessons.filter((l) => l.status !== 'Nháp');
  if (valid.length === 0) {
    return {
      hocTapPct: 0,
      kiLuatPct: 0,
      veSinhPct: 0,
      chuyenCanPct: 0,
      hocTapAvg: null,
      kiLuatAvg: null,
      veSinhAvg: null,
      chuyenCanAvg: null,
    };
  }

  const hocTapAvg = averageScoresExact(valid.map((l) => l.scores.hocTap)) ?? 0;
  const kiLuatAvg = averageScoresExact(valid.map((l) => l.scores.kiLuat)) ?? 0;
  const veSinhAvg = averageScoresExact(valid.map((l) => l.scores.veSinh)) ?? 0;
  const chuyenCanAvg = averageScoresExact(valid.map((l) => l.scores.chuyenCan)) ?? 0;

  return {
    hocTapPct: (hocTapAvg / rules.hocTapMax) * 100,
    kiLuatPct: (kiLuatAvg / rules.kiLuatMax) * 100,
    veSinhPct: (veSinhAvg / rules.veSinhMax) * 100,
    chuyenCanPct: (chuyenCanAvg / rules.chuyenCanMax) * 100,
    hocTapAvg,
    kiLuatAvg,
    veSinhAvg,
    chuyenCanAvg,
  };
}

/**
 * Generates objective smart alerts without ever accusing students of cheating from score changes.
 */
export function computeSmartAlerts(
  classes: SchoolClass[],
  lessons: ClassLesson[],
  timetable: TimetableSlot[],
  currentWeek: number,
  schoolYear: string,
  scoreDropThreshold = 0.5,
  resolvedIds: string[] = []
): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const resolvedSet = new Set(resolvedIds);

  for (const cls of classes.filter((c) => c.status === 'Hoạt động')) {
    const classSlots = timetable.filter(
      (s) => s.classId === cls.id && s.eventType !== 'Nghỉ học'
    );
    const weekLessons = lessons.filter(
      (l) =>
        l.classId === cls.id &&
        l.week === currentWeek &&
        l.schoolYear === schoolYear &&
        l.status !== 'Nháp'
    );

    // 1. Missing lessons in current week
    const missingCount = Math.max(0, classSlots.length - weekLessons.length);
    if (missingCount > 0) {
      const id = `missing-w${currentWeek}-${cls.id}`;
      const isResolved = resolvedSet.has(id);
      alerts.push({
        id,
        category: isResolved ? 'resolved' : 'missing',
        classId: cls.id,
        className: cls.name,
        title: `Lớp ${cls.name} còn thiếu ${missingCount} tiết tuần ${currentWeek}`,
        description: `Đã ghi nhận ${weekLessons.length}/${classSlots.length} tiết theo thời khóa biểu. Đề nghị LPHT hoặc giáo viên bộ môn bổ sung trước giờ chốt tuần.`,
        timestamp: `Tuần ${currentWeek} · ${schoolYear}`,
        severity: missingCount >= 3 ? 'Cao' : 'Trung bình',
        relatedData: `Đã nhập ${weekLessons.length}/${classSlots.length} tiết`,
        resolved: isResolved,
      });
    }

    // 2. Objective score drop vs previous week
    if (currentWeek > 1) {
      const prevLessons = lessons.filter(
        (l) =>
          l.classId === cls.id &&
          l.week === currentWeek - 1 &&
          l.schoolYear === schoolYear &&
          l.status !== 'Nháp'
      );
      const currAvg = averageScoresExact(weekLessons.map((l) => l.totalScore));
      const prevAvg = averageScoresExact(prevLessons.map((l) => l.totalScore));

      if (currAvg !== null && prevAvg !== null) {
        const diff = prevAvg - currAvg;
        if (diff >= scoreDropThreshold) {
          const id = `drop-w${currentWeek}-${cls.id}`;
          const isResolved = resolvedSet.has(id);
          alerts.push({
            id,
            category: isResolved ? 'resolved' : 'score-drop',
            classId: cls.id,
            className: cls.name,
            title: `Điểm trung bình lớp ${cls.name} giảm ${formatScore(diff)} điểm`,
            description: `Điểm tuần ${currentWeek} đạt ${formatScore(currAvg)} so với ${formatScore(prevAvg)} ở tuần ${currentWeek - 1}. Cần trao đổi với GVCN và lớp để hỗ trợ kịp thời.`,
            timestamp: `Tuần ${currentWeek} · So với tuần ${currentWeek - 1}`,
            severity: diff >= 1.0 ? 'Cao' : 'Trung bình',
            relatedData: `Tuần ${currentWeek - 1}: ${formatScore(prevAvg)} -> Tuần ${currentWeek}: ${formatScore(currAvg)}`,
            resolved: isResolved,
          });
        }
      }
    }

    // 3. Data check needed (drafts, pending confirmation, or low sub-score outlier)
    const drafts = lessons.filter(
      (l) =>
        l.classId === cls.id &&
        l.week === currentWeek &&
        l.schoolYear === schoolYear &&
        (l.status === 'Nháp' || l.status === 'Chờ xác nhận' || l.status === 'Cần bổ sung')
    );
    if (drafts.length > 0) {
      const id = `check-draft-w${currentWeek}-${cls.id}`;
      const isResolved = resolvedSet.has(id);
      alerts.push({
        id,
        category: isResolved ? 'resolved' : 'check-needed',
        classId: cls.id,
        className: cls.name,
        title: `Có ${drafts.length} bản ghi cần hoàn tất hoặc xác nhận`,
        description: `Bản ghi ở trạng thái Nháp / Chờ xác nhận chưa được tính vào bảng xếp hạng chính thức.`,
        timestamp: `Tuần ${currentWeek}`,
        severity: 'Thấp',
        relatedData: drafts.map((d) => `Tiết ${d.period} (${d.subjectName})`).slice(0, 3).join(', '),
        resolved: isResolved,
      });
    }
  }

  return alerts;
}
