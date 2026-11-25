import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addScoresExact,
  averageScoresExact,
  classifyLesson,
  computeClassRankings,
  computeCriteriaBreakdown,
  formatScore,
  validateCriteriaScores,
} from './scoring';
import { ClassLesson, LockedWeekRecord, SchoolClass } from '../types/classbook';

test('formatScore prevents floating point artifacts like 2.8000000000000003', () => {
  assert.equal(formatScore(2.8000000000000003), '2,8');
  assert.equal(formatScore(0.1 + 0.2), '0,3');
  assert.equal(formatScore(9), '9');
  assert.equal(formatScore(8.75), '8,75');
  assert.equal(formatScore(null), '—');
});

test('addScoresExact avoids IEEE 754 drift', () => {
  assert.equal(addScoresExact(2.8, 0.1), 2.9);
  assert.equal(addScoresExact(2.8, 2.7, 1.9, 1.8), 9.2);
  assert.equal(addScoresExact(3, 3, 2, 2), 10);
});

test('averageScoresExact returns null for empty array and never treats missing as 0', () => {
  assert.equal(averageScoresExact([]), null);
  assert.equal(averageScoresExact([9.2, 9.4]), 9.3);
});

test('validateCriteriaScores enforces 3-3-2-2 boundaries', () => {
  assert.equal(
    validateCriteriaScores({ hocTap: 3, kiLuat: 2.5, veSinh: 2, chuyenCan: 1.8 }).valid,
    true
  );
  const invalid = validateCriteriaScores({ hocTap: 3.5, kiLuat: 3, veSinh: 2, chuyenCan: 2 });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length === 1);
});

test('classifyLesson uses exact unrounded thresholds', () => {
  assert.equal(classifyLesson(8.99), 'Khá');
  assert.equal(classifyLesson(9.0), 'Tốt');
  assert.equal(classifyLesson(7.5), 'Khá');
  assert.equal(classifyLesson(7.49), 'Đạt');
  assert.equal(classifyLesson(5.0), 'Đạt');
  assert.equal(classifyLesson(4.99), 'Chưa đạt');
});

test('computeClassRankings ignores un-entered lessons and distinguishes locked vs temporary', () => {
  const classes: SchoolClass[] = [
    {
      id: 'c1',
      name: '10A1',
      grade: 10,
      homeroomTeacher: 'GV A',
      lphtName: 'HS A',
      studentCount: 42,
      expectedPeriodsPerWeek: 10,
      status: 'Hoạt động',
    },
    {
      id: 'c2',
      name: '10A2',
      grade: 10,
      homeroomTeacher: 'GV B',
      lphtName: 'HS B',
      studentCount: 40,
      expectedPeriodsPerWeek: 10,
      status: 'Hoạt động',
    },
  ];

  const lessons: ClassLesson[] = [
    {
      id: 'l1',
      schoolYear: '2025-2026',
      semester: 'HK1',
      week: 12,
      date: '2025-11-24',
      dayOfWeek: 2,
      classId: 'c1',
      className: '10A1',
      grade: 10,
      period: 1,
      subjectId: 'toan',
      subjectName: 'Toán học',
      teacherName: 'Thầy Hùng',
      lessonContent: 'Hàm số bậc hai',
      scores: { hocTap: 2.8, kiLuat: 2.9, veSinh: 1.9, chuyenCan: 2 },
      totalScore: 9.6,
      rating: 'Tốt',
      notes: '',
      teacherComment: '',
      status: 'Đã lưu',
      createdBy: 'u1',
      createdAt: '2025-11-24T08:00:00Z',
      updatedAt: '2025-11-24T08:00:00Z',
    },
    {
      id: 'l2',
      schoolYear: '2025-2026',
      semester: 'HK1',
      week: 12,
      date: '2025-11-24',
      dayOfWeek: 2,
      classId: 'c2',
      className: '10A2',
      grade: 10,
      period: 1,
      subjectId: 'van',
      subjectName: 'Ngữ văn',
      teacherName: 'Cô Lan',
      lessonContent: 'Thơ đường luật',
      scores: { hocTap: 2.5, kiLuat: 2.5, veSinh: 1.8, chuyenCan: 1.8 },
      totalScore: 8.6,
      rating: 'Khá',
      notes: '',
      teacherComment: '',
      status: 'Đã lưu',
      createdBy: 'u2',
      createdAt: '2025-11-24T08:00:00Z',
      updatedAt: '2025-11-24T08:00:00Z',
    },
  ];

  const lockedWeeks: LockedWeekRecord[] = [
    {
      week: 11,
      schoolYear: '2025-2026',
      semester: 'HK1',
      lockedBy: 'Admin',
      lockedAt: '2025-11-20T10:00:00Z',
    },
  ];

  const rankings = computeClassRankings(classes, lessons, lockedWeeks, {
    schoolYear: '2025-2026',
    scope: 'week',
    week: 12,
  });

  assert.equal(rankings[0].className, '10A1');
  assert.equal(rankings[0].averageScore, 9.6);
  assert.equal(rankings[0].isLocked, false);
  assert.equal(rankings[1].className, '10A2');
  assert.equal(rankings[1].averageScore, 8.6);
});

test('computeCriteriaBreakdown normalizes scores against 3-3-2-2 maxima', () => {
  const sample: ClassLesson[] = [
    {
      id: 'l1',
      schoolYear: '2025-2026',
      semester: 'HK1',
      week: 12,
      date: '2025-11-24',
      dayOfWeek: 2,
      classId: 'c1',
      className: '10A1',
      grade: 10,
      period: 1,
      subjectId: 'toan',
      subjectName: 'Toán học',
      teacherName: 'Thầy Hùng',
      lessonContent: 'Hàm số',
      scores: { hocTap: 3, kiLuat: 1.5, veSinh: 2, chuyenCan: 1 },
      totalScore: 7.5,
      rating: 'Khá',
      notes: '',
      teacherComment: '',
      status: 'Đã lưu',
      createdBy: 'u1',
      createdAt: '',
      updatedAt: '',
    },
  ];
  const breakdown = computeCriteriaBreakdown(sample);
  assert.equal(breakdown.hocTapPct, 100);
  assert.equal(breakdown.kiLuatPct, 50);
  assert.equal(breakdown.veSinhPct, 100);
  assert.equal(breakdown.chuyenCanPct, 50);
});
