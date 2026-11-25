import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import type {
  AppDataset,
  AuditLogEntry,
  ClassLesson,
  DigitalBookRecord,
  GradeLevel,
  LessonRating,
  LessonStatus,
  LockedWeekRecord,
  SchoolClass,
  SchoolSettings,
  SemesterId,
  SubjectItem,
  TimetableEventType,
  TimetableSlot,
  UserAccount,
  UserRole,
} from '../src/types/classbook.js';
import {
  createInitialSeedStore,
  PersistedStore,
  StoredUserRecord,
} from './seedData.js';

export type StorageMode = 'supabase' | 'local-file' | 'unconfigured-serverless';

export class StorageConfigError extends Error {
  statusCode = 503;
  constructor(message: string) {
    super(message);
    this.name = 'StorageConfigError';
  }
}

const IS_VERCEL = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);
const LOCAL_DATA_DIR = path.resolve(process.cwd(), '.data');
const LOCAL_STORE_PATH = path.join(LOCAL_DATA_DIR, 'classbook-store.json');

function getSupabaseCredentials() {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ''
  ).trim();
  if (!url || !key) return null;
  return { url, key };
}

export function getStorageMode(): StorageMode {
  if (getSupabaseCredentials()) return 'supabase';
  if (IS_VERCEL) return 'unconfigured-serverless';
  return 'local-file';
}

export function getStorageDiagnostics() {
  const hasSupabaseUrl = Boolean(
    (
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      ''
    ).trim()
  );
  const hasServiceRoleKey = Boolean(
    (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      ''
    ).trim()
  );
  return {
    storageMode: getStorageMode(),
    isServerless: IS_VERCEL,
    hasSupabaseUrl,
    hasServiceRoleKey,
    hasSessionSecret: Boolean((process.env.SESSION_SECRET || '').trim()),
  };
}

let cachedSupabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  const creds = getSupabaseCredentials();
  if (!creds) {
    throw new StorageConfigError(
      'Chưa cấu hình SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trên máy chủ.'
    );
  }
  if (!cachedSupabase) {
    cachedSupabase = createClient(creds.url, creds.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedSupabase;
}

function formatSupabaseError(context: string, err: { message: string; code?: string }): Error {
  if (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    err.message.includes('Could not find the table')
  ) {
    return new StorageConfigError(
      'Cơ sở dữ liệu Supabase chưa được khởi tạo bảng. Vui lòng chạy tệp supabase/schema.sql trong Supabase SQL Editor.'
    );
  }
  return new Error(`Lỗi cơ sở dữ liệu (${context}): ${err.message}`);
}

function readLocalStoreFresh(): PersistedStore {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_STORE_PATH)) {
    const initial = createInitialSeedStore();
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8');
    return JSON.parse(raw) as PersistedStore;
  } catch {
    const fallback = createInitialSeedStore();
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

function writeLocalStoreAtomic(next: PersistedStore) {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
  const tmpPath = `${LOCAL_STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(tmpPath, LOCAL_STORE_PATH);
}

function sanitizeUser(u: StoredUserRecord): UserAccount {
  const { passwordHash: _removed, ...safe } = u;
  return safe;
}

function assertPersistentStorageForWrite() {
  if (getStorageMode() === 'unconfigured-serverless') {
    throw new StorageConfigError(
      'Ứng dụng trên Vercel chưa được kết nối cơ sở dữ liệu dùng chung. Vui lòng khai báo SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong Environment Variables trên Vercel và chạy supabase/schema.sql.'
    );
  }
}

let seedInFlight: Promise<void> | null = null;

async function ensureSupabaseSeeded(): Promise<void> {
  if (seedInFlight) return seedInFlight;
  seedInFlight = (async () => {
    const sb = getSupabase();
    const { data: settingsRow, error: checkErr } = await sb
      .from('cb_settings')
      .select('id')
      .eq('id', 'default')
      .maybeSingle();

    if (checkErr) throw formatSupabaseError('kiểm tra cb_settings', checkErr);
    if (settingsRow) return; // Already seeded — never overwrite existing database rows

    const seed = createInitialSeedStore();

    const { error: settingsErr } = await sb
      .from('cb_settings')
      .upsert(
        { id: 'default', data: seed.settings, updated_at: new Date().toISOString() },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    if (settingsErr) throw formatSupabaseError('khởi tạo cb_settings', settingsErr);

    if (seed.classes.length) {
      const { error } = await sb.from('cb_classes').upsert(
        seed.classes.map((c) => ({
          id: c.id,
          name: c.name,
          grade: c.grade,
          homeroom_teacher: c.homeroomTeacher,
          lpht_name: c.lphtName,
          lpht_user_id: c.lphtUserId ?? null,
          student_count: c.studentCount,
          expected_periods_per_week: c.expectedPeriodsPerWeek,
          status: c.status,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
      if (error) throw formatSupabaseError('khởi tạo cb_classes', error);
    }

    if (seed.subjects.length) {
      const { error } = await sb.from('cb_subjects').upsert(
        seed.subjects.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          status: s.status,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
      if (error) throw formatSupabaseError('khởi tạo cb_subjects', error);
    }

    if (seed.users.length) {
      const { error } = await sb.from('cb_users').upsert(
        seed.users.map((u) => ({
          id: u.id,
          full_name: u.fullName,
          contact: u.contact,
          role: u.role,
          assigned_class_id: u.assignedClassId ?? null,
          assigned_class_name: u.assignedClassName ?? null,
          status: u.status,
          last_login_at: u.lastLoginAt ?? null,
          password_hash: u.passwordHash,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
      if (error) throw formatSupabaseError('khởi tạo cb_users', error);
    }

    if (seed.timetable.length) {
      const { error } = await sb.from('cb_timetable').upsert(
        seed.timetable.map((t) => ({
          id: t.id,
          school_year: t.schoolYear,
          semester: t.semester,
          class_id: t.classId,
          class_name: t.className,
          day_of_week: t.dayOfWeek,
          period: t.period,
          subject_id: t.subjectId,
          subject_name: t.subjectName,
          teacher_name: t.teacherName,
          event_type: t.eventType,
          change_note: t.changeNote ?? null,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
      if (error) throw formatSupabaseError('khởi tạo cb_timetable', error);
    }

    if (seed.lessons.length) {
      const { error } = await sb.from('cb_lessons').upsert(
        seed.lessons.map(mapLessonToRow),
        { onConflict: 'id', ignoreDuplicates: true }
      );
      if (error) throw formatSupabaseError('khởi tạo cb_lessons', error);
    }

    if (seed.lockedWeeks.length) {
      const { error } = await sb.from('cb_locked_weeks').upsert(
        seed.lockedWeeks.map((w) => ({
          id: `${w.schoolYear}::${w.week}`,
          week: w.week,
          school_year: w.schoolYear,
          semester: w.semester,
          locked_by: w.lockedBy,
          locked_at: w.lockedAt,
          note: w.note ?? null,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
      if (error) throw formatSupabaseError('khởi tạo cb_locked_weeks', error);
    }

    if (seed.digitalBooks.length) {
      const { error } = await sb.from('cb_digital_books').upsert(
        seed.digitalBooks.map((b) => ({
          id: b.id,
          class_id: b.classId,
          class_name: b.className,
          school_year: b.schoolYear,
          semester: b.semester,
          total_lessons: b.totalLessons,
          status: b.status,
          version: b.version,
          closed_at: b.closedAt ?? null,
          closed_by: b.closedBy ?? null,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
      if (error) throw formatSupabaseError('khởi tạo cb_digital_books', error);
    }

    if (seed.auditLogs.length) {
      const { error } = await sb.from('cb_audit_logs').upsert(
        seed.auditLogs.map((a) => ({
          id: a.id,
          timestamp: a.timestamp,
          actor_name: a.actorName,
          actor_role: a.actorRole,
          action: a.action,
          class_name: a.className ?? null,
          summary: a.summary,
          before_data: a.beforeData ?? null,
          after_data: a.afterData ?? null,
          reason: a.reason ?? null,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
      if (error) throw formatSupabaseError('khởi tạo cb_audit_logs', error);
    }
  })().finally(() => {
    seedInFlight = null;
  });
  return seedInFlight;
}

function mapLessonToRow(l: ClassLesson) {
  return {
    id: l.id,
    school_year: l.schoolYear,
    semester: l.semester,
    week: l.week,
    date: l.date,
    day_of_week: l.dayOfWeek,
    class_id: l.classId,
    class_name: l.className,
    grade: l.grade,
    period: l.period,
    subject_id: l.subjectId,
    subject_name: l.subjectName,
    teacher_name: l.teacherName,
    lesson_content: l.lessonContent,
    scores: l.scores,
    total_score: l.totalScore,
    rating: l.rating,
    notes: l.notes || '',
    teacher_comment: l.teacherComment || '',
    status: l.status,
    created_by: l.createdBy,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  };
}

function mapRowToLesson(r: Record<string, unknown>): ClassLesson {
  return {
    id: String(r.id),
    schoolYear: String(r.school_year),
    semester: r.semester as SemesterId,
    week: Number(r.week),
    date: String(r.date),
    dayOfWeek: Number(r.day_of_week),
    classId: String(r.class_id),
    className: String(r.class_name),
    grade: Number(r.grade) as GradeLevel,
    period: Number(r.period),
    subjectId: String(r.subject_id),
    subjectName: String(r.subject_name),
    teacherName: String(r.teacher_name),
    lessonContent: String(r.lesson_content),
    scores: r.scores as ClassLesson['scores'],
    totalScore: Number(r.total_score),
    rating: r.rating as LessonRating,
    notes: String(r.notes ?? ''),
    teacherComment: String(r.teacher_comment ?? ''),
    status: r.status as LessonStatus,
    createdBy: String(r.created_by),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapRowToUser(r: Record<string, unknown>): StoredUserRecord {
  return {
    id: String(r.id),
    fullName: String(r.full_name),
    contact: String(r.contact),
    role: r.role as UserRole,
    assignedClassId: r.assigned_class_id ? String(r.assigned_class_id) : undefined,
    assignedClassName: r.assigned_class_name
      ? String(r.assigned_class_name)
      : undefined,
    status: r.status as UserAccount['status'],
    lastLoginAt: r.last_login_at ? String(r.last_login_at) : undefined,
    passwordHash: String(r.password_hash),
  };
}

export async function getPublicDataset(): Promise<AppDataset> {
  const mode = getStorageMode();
  if (mode === 'unconfigured-serverless') {
    const seed = createInitialSeedStore();
    return {
      settings: seed.settings,
      classes: seed.classes,
      subjects: seed.subjects,
      users: seed.users.map(sanitizeUser),
      timetable: seed.timetable,
      lessons: seed.lessons,
      lockedWeeks: seed.lockedWeeks,
      digitalBooks: seed.digitalBooks,
      auditLogs: seed.auditLogs,
      resolvedAlertIds: seed.resolvedAlertIds,
    };
  }
  if (mode === 'local-file') {
    const s = readLocalStoreFresh();
    return {
      settings: s.settings,
      classes: s.classes,
      subjects: s.subjects,
      users: s.users.map(sanitizeUser),
      timetable: s.timetable,
      lessons: s.lessons,
      lockedWeeks: s.lockedWeeks,
      digitalBooks: s.digitalBooks,
      auditLogs: s.auditLogs,
      resolvedAlertIds: s.resolvedAlertIds,
    };
  }

  await ensureSupabaseSeeded();
  const sb = getSupabase();

  const [
    settingsRes,
    classesRes,
    subjectsRes,
    usersRes,
    timetableRes,
    lessonsRes,
    lockedRes,
    booksRes,
    auditRes,
    alertsRes,
  ] = await Promise.all([
    sb.from('cb_settings').select('data').eq('id', 'default').single(),
    sb.from('cb_classes').select('*').order('name', { ascending: true }),
    sb.from('cb_subjects').select('*').order('id', { ascending: true }),
    sb
      .from('cb_users')
      .select(
        'id, full_name, contact, role, assigned_class_id, assigned_class_name, status, last_login_at'
      )
      .order('id', { ascending: true }),
    sb
      .from('cb_timetable')
      .select('*')
      .order('day_of_week', { ascending: true })
      .order('period', { ascending: true }),
    sb.from('cb_lessons').select('*').order('created_at', { ascending: false }),
    sb.from('cb_locked_weeks').select('*').order('week', { ascending: true }),
    sb.from('cb_digital_books').select('*').order('class_name', { ascending: true }),
    sb
      .from('cb_audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500),
    sb.from('cb_resolved_alerts').select('id'),
  ]);

  if (settingsRes.error) throw formatSupabaseError('đọc cb_settings', settingsRes.error);
  if (classesRes.error) throw formatSupabaseError('đọc cb_classes', classesRes.error);
  if (subjectsRes.error) throw formatSupabaseError('đọc cb_subjects', subjectsRes.error);
  if (usersRes.error) throw formatSupabaseError('đọc cb_users', usersRes.error);
  if (timetableRes.error) throw formatSupabaseError('đọc cb_timetable', timetableRes.error);
  if (lessonsRes.error) throw formatSupabaseError('đọc cb_lessons', lessonsRes.error);
  if (lockedRes.error) throw formatSupabaseError('đọc cb_locked_weeks', lockedRes.error);
  if (booksRes.error) throw formatSupabaseError('đọc cb_digital_books', booksRes.error);
  if (auditRes.error) throw formatSupabaseError('đọc cb_audit_logs', auditRes.error);
  if (alertsRes.error) throw formatSupabaseError('đọc cb_resolved_alerts', alertsRes.error);

  return {
    settings: settingsRes.data.data as SchoolSettings,
    classes: (classesRes.data || []).map((c) => ({
      id: String(c.id),
      name: String(c.name),
      grade: Number(c.grade) as GradeLevel,
      homeroomTeacher: String(c.homeroom_teacher),
      lphtName: String(c.lpht_name),
      lphtUserId: c.lpht_user_id ? String(c.lpht_user_id) : undefined,
      studentCount: Number(c.student_count),
      expectedPeriodsPerWeek: Number(c.expected_periods_per_week),
      status: c.status as SchoolClass['status'],
    })),
    subjects: (subjectsRes.data || []).map((s) => ({
      id: String(s.id),
      code: String(s.code),
      name: String(s.name),
      status: s.status as SubjectItem['status'],
    })),
    users: (usersRes.data || []).map((u) => ({
      id: String(u.id),
      fullName: String(u.full_name),
      contact: String(u.contact),
      role: u.role as UserRole,
      assignedClassId: u.assigned_class_id ? String(u.assigned_class_id) : undefined,
      assignedClassName: u.assigned_class_name
        ? String(u.assigned_class_name)
        : undefined,
      status: u.status as UserAccount['status'],
      lastLoginAt: u.last_login_at ? String(u.last_login_at) : undefined,
    })),
    timetable: (timetableRes.data || []).map((t) => ({
      id: String(t.id),
      schoolYear: String(t.school_year),
      semester: t.semester as SemesterId,
      classId: String(t.class_id),
      className: String(t.class_name),
      dayOfWeek: Number(t.day_of_week),
      period: Number(t.period),
      subjectId: String(t.subject_id),
      subjectName: String(t.subject_name),
      teacherName: String(t.teacher_name),
      eventType: t.event_type as TimetableEventType,
      changeNote: t.change_note ? String(t.change_note) : undefined,
    })),
    lessons: (lessonsRes.data || []).map(mapRowToLesson),
    lockedWeeks: (lockedRes.data || []).map((w) => ({
      week: Number(w.week),
      schoolYear: String(w.school_year),
      semester: w.semester as SemesterId,
      lockedBy: String(w.locked_by),
      lockedAt: String(w.locked_at),
      note: w.note ? String(w.note) : undefined,
    })),
    digitalBooks: (booksRes.data || []).map((b) => ({
      id: String(b.id),
      classId: String(b.class_id),
      className: String(b.class_name),
      schoolYear: String(b.school_year),
      semester: b.semester as SemesterId,
      totalLessons: Number(b.total_lessons),
      status: b.status as DigitalBookRecord['status'],
      version: String(b.version),
      closedAt: b.closed_at ? String(b.closed_at) : undefined,
      closedBy: b.closed_by ? String(b.closed_by) : undefined,
    })),
    auditLogs: (auditRes.data || []).map((a) => ({
      id: String(a.id),
      timestamp: String(a.timestamp),
      actorName: String(a.actor_name),
      actorRole: a.actor_role as UserRole,
      action: a.action as AuditLogEntry['action'],
      className: a.class_name ? String(a.class_name) : undefined,
      summary: String(a.summary),
      beforeData: a.before_data ? String(a.before_data) : undefined,
      afterData: a.after_data ? String(a.after_data) : undefined,
      reason: a.reason ? String(a.reason) : undefined,
    })),
    resolvedAlertIds: (alertsRes.data || []).map((r) => String(r.id)),
  };
}

export async function findDemoUserByRole(
  role: UserRole
): Promise<StoredUserRecord | null> {
  const mode = getStorageMode();
  if (mode === 'unconfigured-serverless') {
    const seed = createInitialSeedStore();
    return (
      seed.users.find((u) => u.role === role && u.status === 'Hoạt động') ||
      seed.users[0] ||
      null
    );
  }
  if (mode === 'local-file') {
    const s = readLocalStoreFresh();
    return (
      s.users.find((u) => u.role === role && u.status === 'Hoạt động') ||
      s.users[0] ||
      null
    );
  }
  await ensureSupabaseSeeded();
  const sb = getSupabase();
  const { data, error } = await sb
    .from('cb_users')
    .select('*')
    .eq('role', role)
    .eq('status', 'Hoạt động')
    .limit(1);
  if (error) throw formatSupabaseError('tìm tài khoản demo', error);
  if (data && data.length > 0) return mapRowToUser(data[0]);
  const fallback = await sb.from('cb_users').select('*').limit(1);
  if (fallback.error) throw formatSupabaseError('tìm tài khoản mẫu', fallback.error);
  return fallback.data?.[0] ? mapRowToUser(fallback.data[0]) : null;
}

export async function findUserById(id: string): Promise<StoredUserRecord | null> {
  const mode = getStorageMode();
  if (mode === 'unconfigured-serverless') {
    const seed = createInitialSeedStore();
    return seed.users.find((u) => u.id === id) || null;
  }
  if (mode === 'local-file') {
    const s = readLocalStoreFresh();
    return s.users.find((u) => u.id === id) || null;
  }
  await ensureSupabaseSeeded();
  const sb = getSupabase();
  const { data, error } = await sb
    .from('cb_users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw formatSupabaseError('tìm người dùng theo ID', error);
  return data ? mapRowToUser(data) : null;
}

export async function findUserByContact(
  contactLower: string
): Promise<StoredUserRecord | null> {
  const mode = getStorageMode();
  if (mode === 'unconfigured-serverless') {
    const seed = createInitialSeedStore();
    return (
      seed.users.find((u) => u.contact.toLowerCase() === contactLower) || null
    );
  }
  if (mode === 'local-file') {
    const s = readLocalStoreFresh();
    return (
      s.users.find((u) => u.contact.toLowerCase() === contactLower) || null
    );
  }
  await ensureSupabaseSeeded();
  const sb = getSupabase();
  const { data, error } = await sb
    .from('cb_users')
    .select('*')
    .ilike('contact', contactLower)
    .maybeSingle();
  if (error) throw formatSupabaseError('đăng nhập', error);
  return data ? mapRowToUser(data) : null;
}

export async function recordUserLogin(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const mode = getStorageMode();
  if (mode === 'unconfigured-serverless') return;
  if (mode === 'local-file') {
    const s = readLocalStoreFresh();
    const u = s.users.find((x) => x.id === userId);
    if (u) {
      u.lastLoginAt = now;
      writeLocalStoreAtomic(s);
    }
    return;
  }
  const sb = getSupabase();
  const { error } = await sb
    .from('cb_users')
    .update({ last_login_at: now, updated_at: now })
    .eq('id', userId);
  if (error) throw formatSupabaseError('cập nhật thời gian đăng nhập', error);
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string
): Promise<void> {
  assertPersistentStorageForWrite();
  const now = new Date().toISOString();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    const u = s.users.find((x) => x.id === userId);
    if (u) {
      u.passwordHash = passwordHash;
      writeLocalStoreAtomic(s);
    }
    return;
  }
  const sb = getSupabase();
  const { error } = await sb
    .from('cb_users')
    .update({ password_hash: passwordHash, updated_at: now })
    .eq('id', userId);
  if (error) throw formatSupabaseError('cập nhật mật khẩu', error);
}

export async function appendAuditEntry(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): Promise<void> {
  const full: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  if (getStorageMode() === 'unconfigured-serverless') return;
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    s.auditLogs.unshift(full);
    if (s.auditLogs.length > 500) s.auditLogs = s.auditLogs.slice(0, 500);
    writeLocalStoreAtomic(s);
    return;
  }
  const sb = getSupabase();
  const { error } = await sb.from('cb_audit_logs').insert({
    id: full.id,
    timestamp: full.timestamp,
    actor_name: full.actorName,
    actor_role: full.actorRole,
    action: full.action,
    class_name: full.className ?? null,
    summary: full.summary,
    before_data: full.beforeData ?? null,
    after_data: full.afterData ?? null,
    reason: full.reason ?? null,
  });
  if (error) throw formatSupabaseError('ghi nhật ký hoạt động', error);
}

export async function insertLessonRecord(
  lesson: ClassLesson
): Promise<ClassLesson> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    s.lessons.unshift(lesson);
    writeLocalStoreAtomic(s);
    return lesson;
  }
  const sb = getSupabase();
  const { error } = await sb.from('cb_lessons').insert(mapLessonToRow(lesson));
  if (error) throw formatSupabaseError('thêm tiết học', error);
  return lesson;
}

export async function updateLessonRecord(
  lesson: ClassLesson
): Promise<ClassLesson> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    const idx = s.lessons.findIndex((l) => l.id === lesson.id);
    if (idx !== -1) {
      s.lessons[idx] = lesson;
      writeLocalStoreAtomic(s);
    }
    return lesson;
  }
  const sb = getSupabase();
  const { error } = await sb
    .from('cb_lessons')
    .update(mapLessonToRow(lesson))
    .eq('id', lesson.id);
  if (error) throw formatSupabaseError('cập nhật tiết học', error);
  return lesson;
}

export async function deleteLessonRecord(id: string): Promise<void> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    s.lessons = s.lessons.filter((l) => l.id !== id);
    writeLocalStoreAtomic(s);
    return;
  }
  const sb = getSupabase();
  const { error } = await sb.from('cb_lessons').delete().eq('id', id);
  if (error) throw formatSupabaseError('xóa tiết học', error);
}

export async function importLessonRecords(
  lessons: ClassLesson[]
): Promise<void> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    s.lessons = [...lessons, ...s.lessons];
    writeLocalStoreAtomic(s);
    return;
  }
  const sb = getSupabase();
  const { error } = await sb
    .from('cb_lessons')
    .upsert(lessons.map(mapLessonToRow), { onConflict: 'id' });
  if (error) throw formatSupabaseError('import tiết học', error);
}

export async function lockWeekRecord(record: LockedWeekRecord): Promise<void> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    const exists = s.lockedWeeks.some(
      (w) => w.week === record.week && w.schoolYear === record.schoolYear
    );
    if (!exists) {
      s.lockedWeeks.push(record);
      writeLocalStoreAtomic(s);
    }
    return;
  }
  const sb = getSupabase();
  const { error } = await sb.from('cb_locked_weeks').upsert(
    {
      id: `${record.schoolYear}::${record.week}`,
      week: record.week,
      school_year: record.schoolYear,
      semester: record.semester,
      locked_by: record.lockedBy,
      locked_at: record.lockedAt,
      note: record.note ?? null,
    },
    { onConflict: 'id' }
  );
  if (error) throw formatSupabaseError('chốt tuần', error);
}

export async function unlockWeekRecord(
  week: number,
  schoolYear: string
): Promise<void> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    s.lockedWeeks = s.lockedWeeks.filter(
      (w) => !(w.week === week && w.schoolYear === schoolYear)
    );
    writeLocalStoreAtomic(s);
    return;
  }
  const sb = getSupabase();
  const { error } = await sb
    .from('cb_locked_weeks')
    .delete()
    .eq('id', `${schoolYear}::${week}`);
  if (error) throw formatSupabaseError('mở khóa tuần', error);
}

export async function updateTimetableSlotRecord(
  slot: TimetableSlot
): Promise<TimetableSlot> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    const idx = s.timetable.findIndex((t) => t.id === slot.id);
    if (idx !== -1) {
      s.timetable[idx] = slot;
      writeLocalStoreAtomic(s);
    }
    return slot;
  }
  const sb = getSupabase();
  const { error } = await sb
    .from('cb_timetable')
    .update({
      subject_id: slot.subjectId,
      subject_name: slot.subjectName,
      teacher_name: slot.teacherName,
      event_type: slot.eventType,
      change_note: slot.changeNote ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', slot.id);
  if (error) throw formatSupabaseError('cập nhật thời khóa biểu', error);
  return slot;
}

export async function resolveAlertRecord(alertId: string): Promise<void> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    if (!s.resolvedAlertIds.includes(alertId)) {
      s.resolvedAlertIds.push(alertId);
      writeLocalStoreAtomic(s);
    }
    return;
  }
  const sb = getSupabase();
  const { error } = await sb
    .from('cb_resolved_alerts')
    .upsert({ id: alertId, resolved_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw formatSupabaseError('xác nhận cảnh báo', error);
}

export async function closeDigitalBookRecord(
  book: DigitalBookRecord
): Promise<DigitalBookRecord> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    const idx = s.digitalBooks.findIndex((b) => b.id === book.id);
    if (idx !== -1) {
      s.digitalBooks[idx] = book;
      writeLocalStoreAtomic(s);
    }
    return book;
  }
  const sb = getSupabase();
  const { error } = await sb
    .from('cb_digital_books')
    .update({
      status: book.status,
      closed_at: book.closedAt ?? null,
      closed_by: book.closedBy ?? null,
    })
    .eq('id', book.id);
  if (error) throw formatSupabaseError('đóng quyển sổ đầu bài', error);
  return book;
}

export async function createClassRecord(cls: SchoolClass): Promise<SchoolClass> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    s.classes.push(cls);
    writeLocalStoreAtomic(s);
    return cls;
  }
  const sb = getSupabase();
  const { error } = await sb.from('cb_classes').insert({
    id: cls.id,
    name: cls.name,
    grade: cls.grade,
    homeroom_teacher: cls.homeroomTeacher,
    lpht_name: cls.lphtName,
    lpht_user_id: cls.lphtUserId ?? null,
    student_count: cls.studentCount,
    expected_periods_per_week: cls.expectedPeriodsPerWeek,
    status: cls.status,
  });
  if (error) throw formatSupabaseError('thêm lớp học', error);
  return cls;
}

export async function updateClassRecord(cls: SchoolClass): Promise<SchoolClass> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    const idx = s.classes.findIndex((c) => c.id === cls.id);
    if (idx !== -1) {
      s.classes[idx] = cls;
      writeLocalStoreAtomic(s);
    }
    return cls;
  }
  const sb = getSupabase();
  const { error } = await sb
    .from('cb_classes')
    .update({
      name: cls.name,
      grade: cls.grade,
      homeroom_teacher: cls.homeroomTeacher,
      lpht_name: cls.lphtName,
      lpht_user_id: cls.lphtUserId ?? null,
      student_count: cls.studentCount,
      expected_periods_per_week: cls.expectedPeriodsPerWeek,
      status: cls.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cls.id);
  if (error) throw formatSupabaseError('cập nhật lớp học', error);
  return cls;
}

export async function createSubjectRecord(
  sub: SubjectItem
): Promise<SubjectItem> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    s.subjects.push(sub);
    writeLocalStoreAtomic(s);
    return sub;
  }
  const sb = getSupabase();
  const { error } = await sb.from('cb_subjects').insert({
    id: sub.id,
    code: sub.code,
    name: sub.name,
    status: sub.status,
  });
  if (error) throw formatSupabaseError('thêm môn học', error);
  return sub;
}

export async function updateSubjectRecord(
  sub: SubjectItem
): Promise<SubjectItem> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    const idx = s.subjects.findIndex((x) => x.id === sub.id);
    if (idx !== -1) {
      s.subjects[idx] = sub;
      writeLocalStoreAtomic(s);
    }
    return sub;
  }
  const sb = getSupabase();
  const { error } = await sb
    .from('cb_subjects')
    .update({
      code: sub.code,
      name: sub.name,
      status: sub.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id);
  if (error) throw formatSupabaseError('cập nhật môn học', error);
  return sub;
}

export async function deleteSubjectRecord(subjectId: string): Promise<void> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    s.subjects = s.subjects.filter((x) => x.id !== subjectId);
    s.timetable = s.timetable.filter((t) => t.subjectId !== subjectId);
    writeLocalStoreAtomic(s);
    return;
  }
  const sb = getSupabase();
  const { error: ttErr } = await sb
    .from('cb_timetable')
    .delete()
    .eq('subject_id', subjectId);
  if (ttErr) throw formatSupabaseError('gỡ môn học khỏi TKB', ttErr);
  const { error } = await sb.from('cb_subjects').delete().eq('id', subjectId);
  if (error) throw formatSupabaseError('xóa môn học', error);
}

export async function createUserRecord(
  user: StoredUserRecord
): Promise<UserAccount> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    s.users.push(user);
    writeLocalStoreAtomic(s);
    return sanitizeUser(user);
  }
  const sb = getSupabase();
  const { error } = await sb.from('cb_users').insert({
    id: user.id,
    full_name: user.fullName,
    contact: user.contact,
    role: user.role,
    assigned_class_id: user.assignedClassId ?? null,
    assigned_class_name: user.assignedClassName ?? null,
    status: user.status,
    password_hash: user.passwordHash,
  });
  if (error) throw formatSupabaseError('tạo tài khoản', error);
  return sanitizeUser(user);
}

export async function updateUserRecord(
  user: StoredUserRecord
): Promise<UserAccount> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    const idx = s.users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      s.users[idx] = user;
      writeLocalStoreAtomic(s);
    }
    return sanitizeUser(user);
  }
  const sb = getSupabase();
  const { error } = await sb
    .from('cb_users')
    .update({
      full_name: user.fullName,
      contact: user.contact,
      role: user.role,
      assigned_class_id: user.assignedClassId ?? null,
      assigned_class_name: user.assignedClassName ?? null,
      status: user.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  if (error) throw formatSupabaseError('cập nhật tài khoản', error);
  return sanitizeUser(user);
}

export async function updateSettingsRecord(
  settings: SchoolSettings
): Promise<SchoolSettings> {
  assertPersistentStorageForWrite();
  if (getStorageMode() === 'local-file') {
    const s = readLocalStoreFresh();
    s.settings = settings;
    writeLocalStoreAtomic(s);
    return settings;
  }
  const sb = getSupabase();
  const { error } = await sb.from('cb_settings').upsert(
    {
      id: 'default',
      data: settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) throw formatSupabaseError('cập nhật cài đặt', error);
  return settings;
}
