import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import {
  AppDataset,
  AuditLogEntry,
  ClassLesson,
  UserAccount,
  UserRole,
} from '../src/types/classbook.js';
import {
  classifyLesson,
  computeClassRankings,
  computeCriteriaBreakdown,
  computeSmartAlerts,
  computeTotalScore,
  formatPercent,
  formatScore,
  validateCriteriaScores,
} from '../src/utils/scoring.js';
import {
  createInitialSeedStore,
  hashPassword,
  PersistedStore,
  StoredUserRecord,
  verifyPassword,
} from './seedData.js';

dotenv.config();

const IS_SERVERLESS = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);
const DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), 'smart-classbook-ai')
  : path.resolve(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'classbook-store.json');
const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function ensureDataStore(): PersistedStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
      const initial = createInitialSeedStore();
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(raw) as PersistedStore;
  } catch {
    return createInitialSeedStore();
  }
}

const store: PersistedStore = ensureDataStore();

function saveStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    // Keep operating cleanly from in-memory store if ephemeral disk is restricted
  }
}

function sanitizeUser(u: StoredUserRecord): UserAccount {
  const { passwordHash: _removed, ...safe } = u;
  return safe;
}

function getPublicDataset(): AppDataset {
  return {
    settings: store.settings,
    classes: store.classes,
    subjects: store.subjects,
    users: store.users.map(sanitizeUser),
    timetable: store.timetable,
    lessons: store.lessons,
    lockedWeeks: store.lockedWeeks,
    digitalBooks: store.digitalBooks,
    auditLogs: store.auditLogs,
    resolvedAlertIds: store.resolvedAlertIds,
  };
}

interface SessionPayload {
  userId: string;
  role: UserRole;
  exp: number;
}

function signToken(user: StoredUserRecord): string {
  const payload: SessionPayload = {
    userId: user.id,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SessionPayload;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

interface AuthedRequest extends Request {
  currentUser?: StoredUserRecord;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Vui lòng đăng nhập để thực hiện thao tác.' });
    return;
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res
      .status(401)
      .json({ error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' });
    return;
  }
  const user = store.users.find((u) => u.id === payload.userId);
  if (!user || user.status === 'Đã khóa') {
    res.status(403).json({ error: 'Tài khoản không tồn tại hoặc đã bị khóa.' });
    return;
  }
  req.currentUser = user;
  next();
}

function requireRoles(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.currentUser || !roles.includes(req.currentUser.role)) {
      res
        .status(403)
        .json({ error: 'Bạn không có quyền thực hiện chức năng này.' });
      return;
    }
    next();
  };
}

function appendAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  store.auditLogs.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (store.auditLogs.length > 500) {
    store.auditLogs = store.auditLogs.slice(0, 500);
  }
}

export function createApiApp() {
  const app = express();
  const jsonParser = express.json({ limit: '5mb' });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.body !== undefined) {
      next();
      return;
    }
    jsonParser(req, res, next);
  });

  // Auth routes
  app.post('/api/auth/demo-session', (req: Request, res: Response) => {
    const requestedRole = (req.body?.role as UserRole) || 'Admin';
    const user =
      store.users.find(
        (u) => u.role === requestedRole && u.status === 'Hoạt động'
      ) || store.users[0];
    if (!user) {
      res.status(404).json({ error: 'Không tìm thấy tài khoản mẫu.' });
      return;
    }
    const token = signToken(user);
    res.json({
      token,
      user: sanitizeUser(user),
      dataset: getPublicDataset(),
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const contact = String(req.body?.contact ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!contact || !password) {
      res
        .status(400)
        .json({ error: 'Vui lòng nhập đầy đủ Email/SĐT và mật khẩu.' });
      return;
    }
    const user = store.users.find(
      (u) => u.contact.toLowerCase() === contact
    );
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Thông tin đăng nhập không chính xác.' });
      return;
    }
    if (user.status === 'Đã khóa') {
      res
        .status(403)
        .json({ error: 'Tài khoản này đang bị khóa. Liên hệ Admin.' });
      return;
    }
    user.lastLoginAt = new Date().toISOString();
    saveStore();
    const token = signToken(user);
    res.json({
      token,
      user: sanitizeUser(user),
      dataset: getPublicDataset(),
    });
  });

  app.post(
    '/api/auth/change-password',
    requireAuth,
    (req: AuthedRequest, res: Response) => {
      const currentPassword = String(req.body?.currentPassword ?? '');
      const newPassword = String(req.body?.newPassword ?? '');
      if (!currentPassword || newPassword.length < 6) {
        res
          .status(400)
          .json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
        return;
      }
      const user = req.currentUser!;
      if (!verifyPassword(currentPassword, user.passwordHash)) {
        res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
        return;
      }
      user.passwordHash = hashPassword(newPassword);
      saveStore();
      res.json({ success: true });
    }
  );

  // Bootstrap dataset (authenticated)
  app.get('/api/bootstrap', requireAuth, (_req: AuthedRequest, res: Response) => {
    res.json(getPublicDataset());
  });

  // Lessons CRUD
  app.post('/api/lessons', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.currentUser!;
    const body = req.body as Partial<ClassLesson>;
    const cls = store.classes.find((c) => c.id === body.classId);
    const sub = store.subjects.find((s) => s.id === body.subjectId);

    if (!cls || !sub) {
      res.status(400).json({ error: 'Lớp hoặc môn học không hợp lệ.' });
      return;
    }
    if (user.role === 'LPHT' && user.assignedClassId !== cls.id) {
      res.status(403).json({
        error: `Tài khoản LPHT chỉ được nhập cho lớp ${user.assignedClassName}.`,
      });
      return;
    }
    const week = Number(body.week);
    const schoolYear = body.schoolYear || store.settings.currentSchoolYear;
    const isLocked = store.lockedWeeks.some(
      (w) => w.week === week && w.schoolYear === schoolYear
    );
    if (isLocked && user.role === 'LPHT') {
      res.status(403).json({
        error: `Tuần ${week} đã chốt, LPHT không thể tự mở khóa hoặc thêm mới.`,
      });
      return;
    }

    const validation = validateCriteriaScores(
      body.scores || {},
      store.settings.scoringRules
    );
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' ') });
      return;
    }

    const scores = {
      hocTap: Number(body.scores!.hocTap),
      kiLuat: Number(body.scores!.kiLuat),
      veSinh: Number(body.scores!.veSinh),
      chuyenCan: Number(body.scores!.chuyenCan),
    };
    const totalScore = computeTotalScore(scores);
    const rating = classifyLesson(totalScore, store.settings.scoringRules);
    const date = body.date || new Date().toISOString().slice(0, 10);
    const jsDay = new Date(`${date}T00:00:00`).getDay();
    const dayOfWeek = Math.min(7, Math.max(2, jsDay === 0 ? 7 : jsDay + 1));
    const now = new Date().toISOString();

    const newLesson: ClassLesson = {
      id: `les-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      schoolYear,
      semester: body.semester || store.settings.currentSemester,
      week,
      date,
      dayOfWeek,
      classId: cls.id,
      className: cls.name,
      grade: cls.grade,
      period: Number(body.period) || 1,
      subjectId: sub.id,
      subjectName: sub.name,
      teacherName: String(body.teacherName || 'Giáo viên bộ môn').trim(),
      lessonContent: String(body.lessonContent || '').trim(),
      scores,
      totalScore,
      rating,
      notes: String(body.notes || '').trim(),
      teacherComment: String(body.teacherComment || '').trim(),
      status: body.status === 'Nháp' ? 'Nháp' : 'Đã lưu',
      createdBy: user.fullName,
      createdAt: now,
      updatedAt: now,
    };

    if (!newLesson.lessonContent) {
      res.status(400).json({ error: 'Vui lòng nhập nội dung bài học.' });
      return;
    }

    store.lessons.unshift(newLesson);
    appendAudit({
      actorName: user.fullName,
      actorRole: user.role,
      action: 'Tạo tiết học',
      className: cls.name,
      summary: `Thêm tiết ${newLesson.period} môn ${sub.name} (Tuần ${week}, ${cls.name}) - ${formatScore(totalScore)}đ (${rating}).`,
      afterData: `Tổng ${formatScore(totalScore)} · ${rating}`,
    });
    saveStore();
    res.status(201).json(newLesson);
  });

  const handleUpdateLesson = (req: AuthedRequest, res: Response) => {
    const user = req.currentUser!;
    const idx = store.lessons.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy bản ghi tiết học.' });
      return;
    }
    const existing = store.lessons[idx];
    if (user.role === 'LPHT' && user.assignedClassId !== existing.classId) {
      res
        .status(403)
        .json({ error: 'LPHT chỉ được chỉnh sửa tiết học của lớp phụ trách.' });
      return;
    }
    const isLocked = store.lockedWeeks.some(
      (w) => w.week === existing.week && w.schoolYear === existing.schoolYear
    );
    if (isLocked && user.role === 'LPHT') {
      res.status(403).json({
        error: `Tuần ${existing.week} đã chốt, LPHT không thể chỉnh sửa.`,
      });
      return;
    }

    const body = req.body as Partial<ClassLesson> & { reason?: string };
    const scores = body.scores || existing.scores;
    const validation = validateCriteriaScores(
      scores,
      store.settings.scoringRules
    );
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' ') });
      return;
    }

    const totalScore = computeTotalScore(scores);
    const rating = classifyLesson(totalScore, store.settings.scoringRules);
    const sub = body.subjectId
      ? store.subjects.find((s) => s.id === body.subjectId)
      : undefined;

    const updated: ClassLesson = {
      ...existing,
      ...body,
      subjectId: sub ? sub.id : existing.subjectId,
      subjectName: sub ? sub.name : existing.subjectName,
      scores,
      totalScore,
      rating,
      updatedAt: new Date().toISOString(),
    };

    store.lessons[idx] = updated;
    appendAudit({
      actorName: user.fullName,
      actorRole: user.role,
      action: 'Cập nhật tiết học',
      className: updated.className,
      summary: `Cập nhật tiết ${updated.period} môn ${updated.subjectName} (${updated.className}, Tuần ${updated.week}).`,
      beforeData: `Tổng ${formatScore(existing.totalScore)} · ${existing.rating}`,
      afterData: `Tổng ${formatScore(updated.totalScore)} · ${updated.rating}`,
      reason: body.reason || 'Cập nhật thông tin tiết học',
    });
    saveStore();
    res.json(updated);
  };

  app.patch('/api/lessons/:id', requireAuth, handleUpdateLesson);
  app.post('/api/lessons/:id/update', requireAuth, handleUpdateLesson);

  const handleDeleteLesson = (req: AuthedRequest, res: Response) => {
    const user = req.currentUser!;
    const idx = store.lessons.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy bản ghi tiết học.' });
      return;
    }
    const existing = store.lessons[idx];
    if (user.role === 'LPHT' && user.assignedClassId !== existing.classId) {
      res
        .status(403)
        .json({ error: 'LPHT chỉ được xóa tiết học của lớp phụ trách.' });
      return;
    }
    const isLocked = store.lockedWeeks.some(
      (w) => w.week === existing.week && w.schoolYear === existing.schoolYear
    );
    if (isLocked && user.role === 'LPHT') {
      res.status(403).json({
        error: `Tuần ${existing.week} đã chốt, LPHT không được phép xóa.`,
      });
      return;
    }

    store.lessons.splice(idx, 1);
    appendAudit({
      actorName: user.fullName,
      actorRole: user.role,
      action: 'Xóa tiết học',
      className: existing.className,
      summary: `Xóa tiết ${existing.period} môn ${existing.subjectName} (${existing.className}, Tuần ${existing.week}).`,
      beforeData: `Tổng ${formatScore(existing.totalScore)} · ${existing.rating}`,
      reason: String(req.body?.reason || 'Xóa bản ghi nhập trùng hoặc sai lớp'),
    });
    saveStore();
    res.json({ success: true });
  };

  app.delete('/api/lessons/:id', requireAuth, handleDeleteLesson);
  app.post('/api/lessons/:id/delete', requireAuth, handleDeleteLesson);

  // Bulk Excel import
  app.post(
    '/api/lessons/import',
    requireAuth,
    (req: AuthedRequest, res: Response) => {
      const user = req.currentUser!;
      const rows = (req.body?.lessons || []) as ClassLesson[];
      if (!Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({ error: 'Danh sách tiết học import trống.' });
        return;
      }
      if (user.role === 'LPHT') {
        const foreign = rows.find((r) => r.classId !== user.assignedClassId);
        if (foreign) {
          res.status(403).json({
            error: `LPHT chỉ được import dữ liệu cho lớp ${user.assignedClassName}.`,
          });
          return;
        }
      }

      store.lessons = [...rows, ...store.lessons];
      appendAudit({
        actorName: user.fullName,
        actorRole: user.role,
        action: 'Import Excel',
        summary: `Import thành công ${rows.length} tiết học từ tệp Excel 13 cột.`,
        afterData: `+${rows.length} bản ghi`,
      });
      saveStore();
      res.status(201).json({ importedCount: rows.length, lessons: rows });
    }
  );

  // Lock / unlock week (Cán bộ Đoàn or Admin only)
  app.post(
    '/api/weeks/:week/lock',
    requireAuth,
    requireRoles('Admin', 'Cán bộ Đoàn'),
    (req: AuthedRequest, res: Response) => {
      const user = req.currentUser!;
      const week = Number(req.params.week);
      const schoolYear = String(
        req.body?.schoolYear || store.settings.currentSchoolYear
      );
      const semester = req.body?.semester || store.settings.currentSemester;

      if (!Number.isInteger(week) || week < 1 || week > 39) {
        res.status(400).json({ error: 'Số tuần không hợp lệ (1–39).' });
        return;
      }

      const exists = store.lockedWeeks.some(
        (w) => w.week === week && w.schoolYear === schoolYear
      );
      if (!exists) {
        store.lockedWeeks.push({
          week,
          schoolYear,
          semester,
          lockedBy: `${user.fullName} (${user.role})`,
          lockedAt: new Date().toISOString(),
          note: String(req.body?.note || `Chốt số liệu thi đua tuần ${week}`),
        });
        appendAudit({
          actorName: user.fullName,
          actorRole: user.role,
          action: 'Chốt tuần',
          summary: `Chốt sổ đầu bài Tuần ${week} (${schoolYear}).`,
          beforeData: 'Tạm thời',
          afterData: 'Đã chốt',
          reason: String(req.body?.note || 'Hoàn tất kiểm tra tuần'),
        });
        saveStore();
      }
      res.json({ lockedWeeks: store.lockedWeeks });
    }
  );

  app.post(
    '/api/weeks/:week/unlock',
    requireAuth,
    requireRoles('Admin', 'Cán bộ Đoàn'),
    (req: AuthedRequest, res: Response) => {
      const user = req.currentUser!;
      const week = Number(req.params.week);
      const schoolYear = String(
        req.body?.schoolYear || store.settings.currentSchoolYear
      );

      store.lockedWeeks = store.lockedWeeks.filter(
        (w) => !(w.week === week && w.schoolYear === schoolYear)
      );
      appendAudit({
        actorName: user.fullName,
        actorRole: user.role,
        action: 'Mở khóa tuần',
        summary: `Mở khóa Tuần ${week} (${schoolYear}) để bổ sung dữ liệu.`,
        beforeData: 'Đã chốt',
        afterData: 'Đang mở',
        reason: String(req.body?.reason || 'Mở khóa điều chỉnh số liệu'),
      });
      saveStore();
      res.json({ lockedWeeks: store.lockedWeeks });
    }
  );

  // Timetable updates (Admin & Cán bộ Đoàn)
  const handleUpdateTimetable = (req: AuthedRequest, res: Response) => {
    const user = req.currentUser!;
    const idx = store.timetable.findIndex((t) => t.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy tiết thời khóa biểu.' });
      return;
    }
    const existing = store.timetable[idx];
    const body = req.body;
    const sub = body.subjectId
      ? store.subjects.find((s) => s.id === body.subjectId)
      : undefined;
    const updated = {
      ...existing,
      subjectId: sub ? sub.id : existing.subjectId,
      subjectName: sub ? sub.name : existing.subjectName,
      teacherName: body.teacherName ?? existing.teacherName,
      eventType: body.eventType ?? existing.eventType,
      changeNote: body.changeNote ?? existing.changeNote,
    };
    store.timetable[idx] = updated;
    appendAudit({
      actorName: user.fullName,
      actorRole: user.role,
      action: 'Cập nhật TKB',
      className: updated.className,
      summary: `Cập nhật TKB ${updated.className} (Thứ ${updated.dayOfWeek}, Tiết ${updated.period}): ${updated.eventType} - ${updated.subjectName}.`,
      reason: updated.changeNote || 'Điều chỉnh thời khóa biểu',
    });
    saveStore();
    res.json(updated);
  };

  app.patch(
    '/api/timetable/:id',
    requireAuth,
    requireRoles('Admin', 'Cán bộ Đoàn'),
    handleUpdateTimetable
  );
  app.post(
    '/api/timetable/:id/update',
    requireAuth,
    requireRoles('Admin', 'Cán bộ Đoàn'),
    handleUpdateTimetable
  );

  // Smart Alerts resolve
  app.post(
    '/api/alerts/:id/resolve',
    requireAuth,
    (req: AuthedRequest, res: Response) => {
      const id = req.params.id;
      if (!store.resolvedAlertIds.includes(id)) {
        store.resolvedAlertIds.push(id);
        saveStore();
      }
      res.json({ resolvedAlertIds: store.resolvedAlertIds });
    }
  );

  // Digital book archive close
  app.post(
    '/api/digital-books/:id/close',
    requireAuth,
    requireRoles('Admin', 'Cán bộ Đoàn'),
    (req: AuthedRequest, res: Response) => {
      const user = req.currentUser!;
      const book = store.digitalBooks.find((b) => b.id === req.params.id);
      if (!book) {
        res.status(404).json({ error: 'Không tìm thấy quyển Sổ đầu bài.' });
        return;
      }
      book.status = 'Đã đóng quyển';
      book.closedAt = new Date().toISOString();
      book.closedBy = user.fullName;
      appendAudit({
        actorName: user.fullName,
        actorRole: user.role,
        action: 'Đóng quyển',
        className: book.className,
        summary: `Đóng quyển Sổ đầu bài điện tử lớp ${book.className} (${book.schoolYear} - ${book.semester}).`,
      });
      saveStore();
      res.json(book);
    }
  );

  // Classes management (Admin & Cán bộ Đoàn)
  app.post(
    '/api/classes',
    requireAuth,
    requireRoles('Admin', 'Cán bộ Đoàn'),
    (req: AuthedRequest, res: Response) => {
      const user = req.currentUser!;
      const body = req.body;
      if (!body.name || !body.homeroomTeacher) {
        res
          .status(400)
          .json({ error: 'Vui lòng nhập tên lớp và giáo viên chủ nhiệm.' });
        return;
      }
      const newCls = {
        id: `c-${Date.now()}`,
        name: String(body.name).trim(),
        grade: Number(body.grade) as 10 | 11 | 12,
        homeroomTeacher: String(body.homeroomTeacher).trim(),
        lphtName: String(body.lphtName || 'Chưa phân công').trim(),
        studentCount: Number(body.studentCount) || 40,
        expectedPeriodsPerWeek: Number(body.expectedPeriodsPerWeek) || 10,
        status: 'Hoạt động' as const,
      };
      store.classes.push(newCls);
      appendAudit({
        actorName: user.fullName,
        actorRole: user.role,
        action: 'Quản trị hệ thống',
        className: newCls.name,
        summary: `Thêm lớp mới ${newCls.name} (Khối ${newCls.grade}).`,
      });
      saveStore();
      res.status(201).json(newCls);
    }
  );

  const handleUpdateClass = (req: AuthedRequest, res: Response) => {
    const idx = store.classes.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy lớp.' });
      return;
    }
    store.classes[idx] = { ...store.classes[idx], ...req.body };
    saveStore();
    res.json(store.classes[idx]);
  };

  app.patch(
    '/api/classes/:id',
    requireAuth,
    requireRoles('Admin', 'Cán bộ Đoàn'),
    handleUpdateClass
  );
  app.post(
    '/api/classes/:id/update',
    requireAuth,
    requireRoles('Admin', 'Cán bộ Đoàn'),
    handleUpdateClass
  );

  // Subjects management (Admin & Cán bộ Đoàn)
  app.post(
    '/api/subjects',
    requireAuth,
    requireRoles('Admin', 'Cán bộ Đoàn'),
    (req: AuthedRequest, res: Response) => {
      const body = req.body;
      if (!body.code || !body.name) {
        res
          .status(400)
          .json({ error: 'Vui lòng nhập mã môn và tên môn học.' });
        return;
      }
      const sub = {
        id: `sub-${Date.now()}`,
        code: String(body.code).trim().toUpperCase(),
        name: String(body.name).trim(),
        status: 'Đang giảng dạy' as const,
      };
      store.subjects.push(sub);
      saveStore();
      res.status(201).json(sub);
    }
  );

  const handleUpdateSubject = (req: AuthedRequest, res: Response) => {
    const idx = store.subjects.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy môn học.' });
      return;
    }
    const existing = store.subjects[idx];
    const body = req.body as Partial<{
      code: string;
      name: string;
      status: 'Đang giảng dạy' | 'Ngừng sử dụng';
    }>;
    store.subjects[idx] = {
      ...existing,
      code: body.code ? String(body.code).trim().toUpperCase() : existing.code,
      name: body.name ? String(body.name).trim() : existing.name,
      status:
        body.status === 'Đang giảng dạy' || body.status === 'Ngừng sử dụng'
          ? body.status
          : existing.status,
    };
    saveStore();
    res.json(store.subjects[idx]);
  };

  app.patch(
    '/api/subjects/:id',
    requireAuth,
    requireRoles('Admin', 'Cán bộ Đoàn'),
    handleUpdateSubject
  );
  app.post(
    '/api/subjects/:id/update',
    requireAuth,
    requireRoles('Admin', 'Cán bộ Đoàn'),
    handleUpdateSubject
  );

  const handleDeleteSubject = (req: AuthedRequest, res: Response) => {
    const user = req.currentUser!;
    const idx = store.subjects.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy môn học.' });
      return;
    }
    const [removed] = store.subjects.splice(idx, 1);
    store.timetable = store.timetable.filter((t) => t.subjectId !== removed.id);
    appendAudit({
      actorName: user.fullName,
      actorRole: user.role,
      action: 'Quản trị hệ thống',
      summary: `Xóa môn học ${removed.code} – ${removed.name} khỏi danh mục.`,
      beforeData: `${removed.code} · ${removed.name}`,
      afterData: 'Đã xóa khỏi danh mục',
    });
    saveStore();
    res.json({ success: true });
  };

  app.delete(
    '/api/subjects/:id',
    requireAuth,
    requireRoles('Admin', 'Cán bộ Đoàn'),
    handleDeleteSubject
  );
  app.post(
    '/api/subjects/:id/delete',
    requireAuth,
    requireRoles('Admin', 'Cán bộ Đoàn'),
    handleDeleteSubject
  );

  // Users management (Admin ONLY)
  app.post(
    '/api/users',
    requireAuth,
    requireRoles('Admin'),
    (req: AuthedRequest, res: Response) => {
      const body = req.body;
      if (!body.fullName || !body.contact || !body.role) {
        res.status(400).json({
          error: 'Vui lòng nhập đầy đủ họ tên, email/SĐT và vai trò.',
        });
        return;
      }
      const cls = body.assignedClassId
        ? store.classes.find((c) => c.id === body.assignedClassId)
        : undefined;
      const newUser: StoredUserRecord = {
        id: `u-${Date.now()}`,
        fullName: String(body.fullName).trim(),
        contact: String(body.contact).trim(),
        role: body.role as UserRole,
        assignedClassId: cls?.id,
        assignedClassName: cls?.name,
        status: 'Hoạt động',
        passwordHash: hashPassword(
          String(body.initialPassword || 'Chuvanan@2026')
        ),
      };
      store.users.push(newUser);
      appendAudit({
        actorName: req.currentUser!.fullName,
        actorRole: req.currentUser!.role,
        action: 'Quản trị hệ thống',
        summary: `Tạo tài khoản ${newUser.fullName} (${newUser.role}).`,
      });
      saveStore();
      res.status(201).json(sanitizeUser(newUser));
    }
  );

  const handleUpdateUser = (req: AuthedRequest, res: Response) => {
    const idx = store.users.findIndex((u) => u.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
      return;
    }
    const body = req.body;
    const cls = body.assignedClassId
      ? store.classes.find((c) => c.id === body.assignedClassId)
      : undefined;
    const existing = store.users[idx];
    store.users[idx] = {
      ...existing,
      fullName: body.fullName ?? existing.fullName,
      contact: body.contact ?? existing.contact,
      role: body.role ?? existing.role,
      assignedClassId:
        body.role && body.role !== 'LPHT'
          ? undefined
          : cls
            ? cls.id
            : existing.assignedClassId,
      assignedClassName:
        body.role && body.role !== 'LPHT'
          ? undefined
          : cls
            ? cls.name
            : existing.assignedClassName,
      status: body.status ?? existing.status,
    };
    saveStore();
    res.json(sanitizeUser(store.users[idx]));
  };

  app.patch('/api/users/:id', requireAuth, requireRoles('Admin'), handleUpdateUser);
  app.post(
    '/api/users/:id/update',
    requireAuth,
    requireRoles('Admin'),
    handleUpdateUser
  );

  app.post(
    '/api/users/:id/reset-password',
    requireAuth,
    requireRoles('Admin'),
    (req: AuthedRequest, res: Response) => {
      const user = store.users.find((u) => u.id === req.params.id);
      if (!user) {
        res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
        return;
      }
      const tempPass = String(req.body?.newPassword || 'Chuvanan@2026');
      user.passwordHash = hashPassword(tempPass);
      appendAudit({
        actorName: req.currentUser!.fullName,
        actorRole: req.currentUser!.role,
        action: 'Quản trị hệ thống',
        summary: `Đặt lại mật khẩu cho tài khoản ${user.fullName} (${user.contact}).`,
      });
      saveStore();
      res.json({ success: true });
    }
  );

  // Settings (Admin ONLY)
  const handleUpdateSettings = (req: AuthedRequest, res: Response) => {
    store.settings = {
      ...store.settings,
      ...req.body,
      scoringRules: {
        ...store.settings.scoringRules,
        ...(req.body?.scoringRules || {}),
      },
      rankingRules: {
        ...store.settings.rankingRules,
        ...(req.body?.rankingRules || {}),
      },
      notifications: {
        ...store.settings.notifications,
        ...(req.body?.notifications || {}),
      },
      security: {
        ...store.settings.security,
        ...(req.body?.security || {}),
      },
    };
    appendAudit({
      actorName: req.currentUser!.fullName,
      actorRole: req.currentUser!.role,
      action: 'Quản trị hệ thống',
      summary: 'Cập nhật cấu hình hệ thống Trường THPT Chu Văn An.',
    });
    saveStore();
    res.json(store.settings);
  };

  app.patch(
    '/api/settings',
    requireAuth,
    requireRoles('Admin'),
    handleUpdateSettings
  );
  app.post(
    '/api/settings/update',
    requireAuth,
    requireRoles('Admin'),
    handleUpdateSettings
  );

  // AI Assistant route (server-computed analytics + @google/genai)
  app.post(
    '/api/ai/chat',
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      const prompt = String(req.body?.message ?? '').trim();
      const week = Number(req.body?.week || store.settings.currentWeek);
      if (!prompt) {
        res.status(400).json({ error: 'Vui lòng nhập câu hỏi cho Trợ lý AI.' });
        return;
      }

      const rankings = computeClassRankings(
        store.classes,
        store.lessons,
        store.lockedWeeks,
        {
          schoolYear: store.settings.currentSchoolYear,
          scope: 'week',
          week,
        }
      );
      const weekLessons = store.lessons.filter(
        (l) => l.week === week && l.status !== 'Nháp'
      );
      const criteria = computeCriteriaBreakdown(
        weekLessons,
        store.settings.scoringRules
      );
      const alerts = computeSmartAlerts(
        store.classes,
        store.lessons,
        store.timetable,
        week,
        store.settings.currentSchoolYear,
        store.settings.notifications.alertScoreDropThreshold,
        store.resolvedAlertIds
      ).filter((a) => !a.resolved);

      const verifiedContext = {
        school: store.settings.schoolName,
        schoolYear: store.settings.currentSchoolYear,
        week,
        isWeekLocked: store.lockedWeeks.some((w) => w.week === week),
        totalEnteredLessons: weekLessons.length,
        rankingsTopAndAll: rankings.map((r) => ({
          hang: r.rank,
          lop: r.className,
          khoi: r.grade,
          diemTrungBinh: formatScore(r.averageScore),
          soTietDaNhap: `${r.enteredLessons}/${r.expectedLessons}`,
          tyLeHoanThanh: formatPercent(r.completionRate),
          soTietTot: r.totCount,
          trangThai: r.isLocked ? 'Đã chốt' : 'Tạm thời',
        })),
        tieuChiTrungBinhToanTruong: {
          hocTap: `${formatScore(criteria.hocTapAvg)}/3 (${formatPercent(criteria.hocTapPct)})`,
          kiLuat: `${formatScore(criteria.kiLuatAvg)}/3 (${formatPercent(criteria.kiLuatPct)})`,
          veSinh: `${formatScore(criteria.veSinhAvg)}/2 (${formatPercent(criteria.veSinhPct)})`,
          chuyenCan: `${formatScore(criteria.chuyenCanAvg)}/2 (${formatPercent(criteria.chuyenCanPct)})`,
        },
        canhBaoHienTai: alerts.slice(0, 8).map((a) => ({
          lop: a.className,
          noiDung: a.title,
          mucDo: a.severity,
        })),
      };

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        res.status(503).json({
          error:
            'Dịch vụ Gemini AI chưa được cấu hình khóa API trên máy chủ. Các bảng số liệu thống kê thực tế vẫn được hiển thị đầy đủ bên dưới.',
          verifiedContext,
        });
        return;
      }

      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Câu hỏi của cán bộ/giáo viên (${req.currentUser!.role}): "${prompt}"\n\nDỮ LIỆU SỔ ĐẦU BÀI ĐÃ TÍNH TOÁN CHÍNH XÁC TỪ HỆ THỐNG:\n${JSON.stringify(verifiedContext, null, 2)}`,
          config: {
            systemInstruction:
              'Bạn là Trợ lý AI phân tích thi đua Sổ đầu bài của Trường THPT Chu Văn An. Chỉ sử dụng các con số đã được tính toán sẵn trong JSON đính kèm, tuyệt đối không tự bịa số liệu, không nhầm điểm Sổ đầu bài với điểm học lực của học sinh, và không quy kết học sinh gian lận từ biến động điểm. Trả lời bằng tiếng Việt ngắn gọn, rõ ràng, chuyên nghiệp theo định dạng Markdown có gạch đầu dòng hoặc bảng nếu hữu ích.',
          },
        });

        res.json({
          reply: response.text || 'Không nhận được phản hồi từ mô hình AI.',
          verifiedContext,
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Lỗi kết nối Gemini API';
        res.status(502).json({
          error: `Không thể kết nối Trợ lý Gemini AI lúc này (${msg}). Các chức năng Sổ đầu bài khác vẫn hoạt động bình thường.`,
          verifiedContext,
        });
      }
    }
  );

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message =
      err instanceof Error ? err.message : 'Lỗi xử lý yêu cầu trên máy chủ.';
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  });

  return app;
}
