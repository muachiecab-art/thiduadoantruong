import * as XLSX from 'xlsx';
import {
  ClassLesson,
  SchoolClass,
  SemesterId,
  SubjectItem,
} from '../types/classbook';
import { classifyLesson, computeTotalScore, formatScore } from './scoring';

export const EXCEL_13_COLUMNS = [
  'Năm học',
  'Học kỳ',
  'Tuần',
  'Ngày',
  'Lớp',
  'Tiết',
  'Môn học',
  'Giáo viên',
  'Nội dung bài học',
  'Học tập (0-3)',
  'Kỉ luật (0-3)',
  'Vệ sinh (0-2)',
  'Chuyên cần (0-2)',
] as const;

export interface ParsedExcelRow {
  rowIndex: number;
  schoolYear: string;
  semester: SemesterId;
  week: number;
  date: string;
  className: string;
  period: number;
  subjectName: string;
  teacherName: string;
  lessonContent: string;
  hocTap: number;
  kiLuat: number;
  veSinh: number;
  chuyenCan: number;
  totalScore: number;
  errors: string[];
  classId?: string;
  subjectId?: string;
  grade?: 10 | 11 | 12;
}

export function downloadExcelTemplate(schoolYear: string) {
  const sampleRows = [
    EXCEL_13_COLUMNS as unknown as string[],
    [
      schoolYear,
      'HK1',
      12,
      '2025-11-24',
      '10A1',
      1,
      'Toán học',
      'Nguyễn Văn Hùng',
      'Ôn tập chương II: Hàm số bậc nhất và bậc hai',
      2.8,
      2.9,
      1.9,
      2,
    ],
    [
      schoolYear,
      'HK1',
      12,
      '2025-11-24',
      '10A1',
      2,
      'Ngữ văn',
      'Trần Thị Thu Lan',
      'Đọc hiểu văn bản: Đất nước',
      2.7,
      2.8,
      2,
      1.9,
    ],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sampleRows);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 13 },
    { wch: 10 },
    { wch: 8 },
    { wch: 16 },
    { wch: 22 },
    { wch: 36 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_So_Dau_Bai_13_Cot');
  XLSX.writeFile(wb, `Mau_Import_So_Dau_Bai_13_Cot_${schoolYear}.xlsx`);
}

export function exportLessonsToExcel(lessons: ClassLesson[], filename: string) {
  const header = [...EXCEL_13_COLUMNS, 'Tổng điểm', 'Xếp loại', 'Ghi chú'];
  const rows = lessons.map((l) => [
    l.schoolYear,
    l.semester,
    l.week,
    l.date,
    l.className,
    l.period,
    l.subjectName,
    l.teacherName,
    l.lessonContent,
    l.scores.hocTap,
    l.scores.kiLuat,
    l.scores.veSinh,
    l.scores.chuyenCan,
    l.totalScore,
    l.rating,
    l.notes || '',
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 13 },
    { wch: 10 },
    { wch: 8 },
    { wch: 16 },
    { wch: 22 },
    { wch: 34 },
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
    { wch: 15 },
    { wch: 11 },
    { wch: 12 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Du_Lieu_So_Dau_Bai');
  XLSX.writeFile(wb, filename);
}

export async function parseAndValidateExcelFile(
  file: File,
  classes: SchoolClass[],
  subjects: SubjectItem[]
): Promise<{
  columnsValid: boolean;
  missingColumns: string[];
  rows: ParsedExcelRow[];
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(ws, {
    header: 1,
    defval: '',
  });

  if (aoa.length < 2) {
    return {
      columnsValid: false,
      missingColumns: ['Tệp không có dữ liệu (cần ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu)'],
      rows: [],
    };
  }

  const headerRow = aoa[0].map((c) => String(c ?? '').trim());
  const missingColumns = EXCEL_13_COLUMNS.filter(
    (col, idx) => headerRow[idx] !== col && !headerRow.includes(col)
  );

  const classMap = new Map(classes.map((c) => [c.name.trim().toLowerCase(), c]));
  const subjectMap = new Map(subjects.map((s) => [s.name.trim().toLowerCase(), s]));

  const rows: ParsedExcelRow[] = [];

  for (let i = 1; i < aoa.length; i++) {
    const raw = aoa[i];
    if (!raw || raw.every((cell) => String(cell ?? '').trim() === '')) continue;

    const getVal = (colIdx: number) => String(raw[colIdx] ?? '').trim();
    const getNum = (colIdx: number) => {
      const val = String(raw[colIdx] ?? '').trim().replace(',', '.');
      const num = Number(val);
      return Number.isFinite(num) ? Math.round(num * 100) / 100 : NaN;
    };

    const schoolYear = getVal(0) || '2025-2026';
    const semesterRaw = getVal(1).toUpperCase();
    const semester: SemesterId = semesterRaw === 'HK2' ? 'HK2' : 'HK1';
    const week = Number(getVal(2));
    const date = getVal(3);
    const className = getVal(4);
    const period = Number(getVal(5));
    const subjectName = getVal(6);
    const teacherName = getVal(7);
    const lessonContent = getVal(8);
    const hocTap = getNum(9);
    const kiLuat = getNum(10);
    const veSinh = getNum(11);
    const chuyenCan = getNum(12);

    const errors: string[] = [];
    if (!Number.isInteger(week) || week < 1 || week > 39) {
      errors.push('Tuần phải từ 1–39');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push('Ngày phải đúng định dạng YYYY-MM-DD');
    }
    const matchedClass = classMap.get(className.toLowerCase());
    if (!matchedClass) {
      errors.push(`Không tìm thấy lớp "${className}"`);
    }
    if (!Number.isInteger(period) || period < 1 || period > 5) {
      errors.push('Tiết phải từ 1–5');
    }
    const matchedSubject = subjectMap.get(subjectName.toLowerCase());
    if (!matchedSubject) {
      errors.push(`Không tìm thấy môn "${subjectName}"`);
    }
    if (!lessonContent) {
      errors.push('Thiếu nội dung bài học');
    }
    if (Number.isNaN(hocTap) || hocTap < 0 || hocTap > 3) errors.push('Học tập 0–3');
    if (Number.isNaN(kiLuat) || kiLuat < 0 || kiLuat > 3) errors.push('Kỉ luật 0–3');
    if (Number.isNaN(veSinh) || veSinh < 0 || veSinh > 2) errors.push('Vệ sinh 0–2');
    if (Number.isNaN(chuyenCan) || chuyenCan < 0 || chuyenCan > 2) errors.push('Chuyên cần 0–2');

    const totalScore =
      errors.length === 0
        ? computeTotalScore({ hocTap, kiLuat, veSinh, chuyenCan })
        : 0;

    rows.push({
      rowIndex: i + 1,
      schoolYear,
      semester,
      week,
      date,
      className,
      period,
      subjectName,
      teacherName: teacherName || 'Chưa phân công',
      lessonContent,
      hocTap: Number.isNaN(hocTap) ? 0 : hocTap,
      kiLuat: Number.isNaN(kiLuat) ? 0 : kiLuat,
      veSinh: Number.isNaN(veSinh) ? 0 : veSinh,
      chuyenCan: Number.isNaN(chuyenCan) ? 0 : chuyenCan,
      totalScore,
      errors,
      classId: matchedClass?.id,
      subjectId: matchedSubject?.id,
      grade: matchedClass?.grade,
    });
  }

  return {
    columnsValid: missingColumns.length === 0,
    missingColumns,
    rows,
  };
}

export function buildLessonFromParsedRow(row: ParsedExcelRow, actorName: string): ClassLesson {
  const total = computeTotalScore({
    hocTap: row.hocTap,
    kiLuat: row.kiLuat,
    veSinh: row.veSinh,
    chuyenCan: row.chuyenCan,
  });
  const d = new Date(`${row.date}T00:00:00`);
  const jsDay = d.getDay(); // 0=Sun..6=Sat
  const dayOfWeek = jsDay === 0 ? 7 : jsDay + 1;
  const now = new Date().toISOString();

  return {
    id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    schoolYear: row.schoolYear,
    semester: row.semester,
    week: row.week,
    date: row.date,
    dayOfWeek: Math.min(7, Math.max(2, dayOfWeek)),
    classId: row.classId!,
    className: row.className,
    grade: row.grade!,
    period: row.period,
    subjectId: row.subjectId!,
    subjectName: row.subjectName,
    teacherName: row.teacherName,
    lessonContent: row.lessonContent,
    scores: {
      hocTap: row.hocTap,
      kiLuat: row.kiLuat,
      veSinh: row.veSinh,
      chuyenCan: row.chuyenCan,
    },
    totalScore: total,
    rating: classifyLesson(total),
    notes: `Import từ Excel (${formatScore(total)} điểm)`,
    teacherComment: '',
    status: 'Đã lưu',
    createdBy: actorName,
    createdAt: now,
    updatedAt: now,
  };
}
