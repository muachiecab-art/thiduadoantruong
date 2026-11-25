import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppDataset,
  ClassLesson,
  GradeLevel,
  PageId,
  SchoolClass,
  SchoolSettings,
  SemesterId,
  SubjectItem,
  TimetableSlot,
  UserAccount,
  UserRole,
} from '../types/classbook';
import { computeSmartAlerts } from '../utils/scoring';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

export interface GlobalFilters {
  schoolYear: string;
  semester: SemesterId;
  week: number;
  grade: GradeLevel | 'ALL';
}

interface ClassbookContextValue {
  user: UserAccount | null;
  token: string | null;
  dataset: AppDataset | null;
  loading: boolean;
  error: string | null;
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  globalFilters: GlobalFilters;
  setGlobalFilters: React.Dispatch<React.SetStateAction<GlobalFilters>>;
  quickSearchQuery: string;
  setQuickSearchQuery: (q: string) => void;
  isDark: boolean;
  toggleDark: () => void;
  toasts: ToastMessage[];
  notify: (type: ToastMessage['type'], text: string) => void;
  dismissToast: (id: string) => void;
  // Auth
  loginWithCredentials: (contact: string, password: string) => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  // Data mutations
  refreshDataset: () => Promise<void>;
  createLesson: (payload: Partial<ClassLesson>) => Promise<ClassLesson>;
  updateLesson: (id: string, payload: Partial<ClassLesson> & { reason?: string }) => Promise<ClassLesson>;
  deleteLesson: (id: string, reason?: string) => Promise<void>;
  importLessons: (lessons: ClassLesson[]) => Promise<number>;
  lockWeek: (week: number, note?: string) => Promise<void>;
  unlockWeek: (week: number, reason?: string) => Promise<void>;
  updateTimetableSlot: (id: string, payload: Partial<TimetableSlot>) => Promise<void>;
  resolveAlert: (id: string) => Promise<void>;
  closeDigitalBook: (id: string) => Promise<void>;
  createClass: (payload: Partial<SchoolClass>) => Promise<void>;
  updateClass: (id: string, payload: Partial<SchoolClass>) => Promise<void>;
  createSubject: (payload: Partial<SubjectItem>) => Promise<void>;
  updateSubject: (id: string, payload: Partial<SubjectItem>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  createUser: (payload: Partial<UserAccount> & { initialPassword?: string }) => Promise<void>;
  updateUser: (id: string, payload: Partial<UserAccount>) => Promise<void>;
  resetUserPassword: (id: string, newPassword?: string) => Promise<void>;
  updateSettings: (payload: Partial<SchoolSettings>) => Promise<void>;
  // Pre-fill helper when jumping from Timetable to Lesson Entry
  pendingLessonDraft: Partial<ClassLesson> | null;
  setPendingLessonDraft: (draft: Partial<ClassLesson> | null) => void;
}

const ClassbookContext = createContext<ClassbookContextValue | null>(null);

export const ROLE_ALLOWED_PAGES: Record<UserRole, PageId[]> = {
  Admin: [
    'dashboard',
    'classbook',
    'lesson-entry',
    'timetable',
    'week-close',
    'rankings',
    'analytics',
    'alerts',
    'ai-assistant',
    'reports',
    'digital-archive',
    'excel',
    'classes',
    'subjects',
    'users',
    'audit-log',
    'settings',
  ],
  'Cán bộ Đoàn': [
    'dashboard',
    'classbook',
    'lesson-entry',
    'timetable',
    'week-close',
    'rankings',
    'analytics',
    'alerts',
    'ai-assistant',
    'reports',
    'digital-archive',
    'excel',
    'classes',
    'subjects',
    'audit-log',
  ],
  LPHT: [
    'dashboard',
    'classbook',
    'lesson-entry',
    'timetable',
    'rankings',
    'analytics',
    'alerts',
    'ai-assistant',
    'digital-archive',
    'excel',
  ],
};

export function ClassbookProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const setToken = useCallback((next: string | null) => {
    tokenRef.current = next;
    setTokenState(next);
  }, []);
  const [loggedOutManually, setLoggedOutManually] = useState(false);
  const isDemoSessionRef = useRef(true);
  const [dataset, setDataset] = useState<AppDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePageState] = useState<PageId>('dashboard');
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [pendingLessonDraft, setPendingLessonDraft] =
    useState<Partial<ClassLesson> | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDark, setIsDark] = useState(false);

  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>({
    schoolYear: '2025-2026',
    semester: 'HK1',
    week: 12,
    grade: 'ALL',
  });

  const notify = useCallback((type: ToastMessage['type'], text: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleDark = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }, []);

  const apiFetch = useCallback(
    async <T,>(url: string, options: RequestInit = {}, overrideToken?: string): Promise<T> => {
      const execute = async (bearerToken: string | null) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...((options.headers as Record<string, string>) || {}),
        };
        if (bearerToken) {
          headers.Authorization = `Bearer ${bearerToken}`;
        }
        return fetch(url, { ...options, headers });
      };

      let res = await execute(overrideToken ?? tokenRef.current);
      if (
        res.status === 401 &&
        overrideToken === undefined &&
        isDemoSessionRef.current &&
        user?.role &&
        !loggedOutManually &&
        !url.startsWith('/api/auth/')
      ) {
        const refreshRes = await fetch('/api/auth/demo-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: user.role }),
        });
        if (refreshRes.ok) {
          const refreshed = await refreshRes.json();
          setToken(refreshed.token);
          setUser(refreshed.user);
          res = await execute(refreshed.token);
        }
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
      }
      return data as T;
    },
    [user, loggedOutManually, setToken]
  );

  const loadDatasetWithToken = useCallback(
    async (authToken: string) => {
      const data = await apiFetch<AppDataset>('/api/bootstrap', {}, authToken);
      setDataset(data);
      setGlobalFilters((prev) => ({
        ...prev,
        schoolYear: data.settings.currentSchoolYear,
        semester: data.settings.currentSemester,
        week: data.settings.currentWeek,
      }));
    },
    [apiFetch]
  );

  const switchDemoRole = useCallback(
    async (role: UserRole) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/auth/demo-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không thể khởi tạo phiên');
        isDemoSessionRef.current = true;
        setToken(data.token);
        setUser(data.user);
        setLoggedOutManually(false);
        await loadDatasetWithToken(data.token);
        const allowed = ROLE_ALLOWED_PAGES[data.user.role as UserRole];
        setActivePageState((prev) => (allowed.includes(prev) ? prev : 'dashboard'));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi kết nối hệ thống');
      } finally {
        setLoading(false);
      }
    },
    [loadDatasetWithToken]
  );

  useEffect(() => {
    if (!token && !loggedOutManually) {
      switchDemoRole('Admin');
    }
  }, [token, loggedOutManually, switchDemoRole]);

  const setActivePage = useCallback(
    (page: PageId) => {
      if (user && !ROLE_ALLOWED_PAGES[user.role].includes(page)) {
        notify('error', `Vai trò ${user.role} không có quyền truy cập trang này.`);
        return;
      }
      setActivePageState(page);
    },
    [user, notify]
  );

  const loginWithCredentials = useCallback(
    async (contact: string, password: string) => {
      const data = await apiFetch<{ token: string; user: UserAccount }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ contact, password }),
        },
        ''
      );
      isDemoSessionRef.current = false;
      setToken(data.token);
      setUser(data.user);
      setLoggedOutManually(false);
      await loadDatasetWithToken(data.token);
      setActivePageState('dashboard');
      notify('success', `Đăng nhập thành công: ${data.user.fullName}`);
    },
    [apiFetch, loadDatasetWithToken, notify]
  );

  const logout = useCallback(() => {
    isDemoSessionRef.current = false;
    setLoggedOutManually(true);
    setToken(null);
    setUser(null);
    setDataset(null);
    setActivePageState('dashboard');
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      notify('success', 'Đã đổi mật khẩu thành công.');
    },
    [apiFetch, notify]
  );

  const refreshDataset = useCallback(async () => {
    const active = tokenRef.current;
    if (!active) return;
    await loadDatasetWithToken(active);
  }, [loadDatasetWithToken]);

  const createLesson = useCallback(
    async (payload: Partial<ClassLesson>) => {
      const created = await apiFetch<ClassLesson>('/api/lessons', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshDataset();
      return created;
    },
    [apiFetch, refreshDataset]
  );

  const updateLesson = useCallback(
    async (id: string, payload: Partial<ClassLesson> & { reason?: string }) => {
      const updated = await apiFetch<ClassLesson>(`/api/lessons/${id}/update`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshDataset();
      return updated;
    },
    [apiFetch, refreshDataset]
  );

  const deleteLesson = useCallback(
    async (id: string, reason?: string) => {
      await apiFetch(`/api/lessons/${id}/delete`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      await refreshDataset();
    },
    [apiFetch, refreshDataset]
  );

  const importLessons = useCallback(
    async (lessons: ClassLesson[]) => {
      const res = await apiFetch<{ importedCount: number }>('/api/lessons/import', {
        method: 'POST',
        body: JSON.stringify({ lessons }),
      });
      await refreshDataset();
      return res.importedCount;
    },
    [apiFetch, refreshDataset]
  );

  const lockWeek = useCallback(
    async (week: number, note?: string) => {
      await apiFetch(`/api/weeks/${week}/lock`, {
        method: 'POST',
        body: JSON.stringify({
          schoolYear: globalFilters.schoolYear,
          semester: globalFilters.semester,
          note,
        }),
      });
      await refreshDataset();
    },
    [apiFetch, globalFilters.schoolYear, globalFilters.semester, refreshDataset]
  );

  const unlockWeek = useCallback(
    async (week: number, reason?: string) => {
      await apiFetch(`/api/weeks/${week}/unlock`, {
        method: 'POST',
        body: JSON.stringify({
          schoolYear: globalFilters.schoolYear,
          reason,
        }),
      });
      await refreshDataset();
    },
    [apiFetch, globalFilters.schoolYear, refreshDataset]
  );

  const updateTimetableSlot = useCallback(
    async (id: string, payload: Partial<TimetableSlot>) => {
      await apiFetch(`/api/timetable/${id}/update`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshDataset();
    },
    [apiFetch, refreshDataset]
  );

  const resolveAlert = useCallback(
    async (id: string) => {
      await apiFetch(`/api/alerts/${id}/resolve`, { method: 'POST' });
      await refreshDataset();
    },
    [apiFetch, refreshDataset]
  );

  const closeDigitalBook = useCallback(
    async (id: string) => {
      await apiFetch(`/api/digital-books/${id}/close`, { method: 'POST' });
      await refreshDataset();
    },
    [apiFetch, refreshDataset]
  );

  const createClass = useCallback(
    async (payload: Partial<SchoolClass>) => {
      await apiFetch('/api/classes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshDataset();
    },
    [apiFetch, refreshDataset]
  );

  const updateClass = useCallback(
    async (id: string, payload: Partial<SchoolClass>) => {
      await apiFetch(`/api/classes/${id}/update`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshDataset();
    },
    [apiFetch, refreshDataset]
  );

  const createSubject = useCallback(
    async (payload: Partial<SubjectItem>) => {
      await apiFetch('/api/subjects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshDataset();
    },
    [apiFetch, refreshDataset]
  );

  const updateSubject = useCallback(
    async (id: string, payload: Partial<SubjectItem>) => {
      await apiFetch(`/api/subjects/${id}/update`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshDataset();
    },
    [apiFetch, refreshDataset]
  );

  const deleteSubject = useCallback(
    async (id: string) => {
      await apiFetch(`/api/subjects/${id}/delete`, {
        method: 'POST',
      });
      await refreshDataset();
    },
    [apiFetch, refreshDataset]
  );

  const createUser = useCallback(
    async (payload: Partial<UserAccount> & { initialPassword?: string }) => {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshDataset();
    },
    [apiFetch, refreshDataset]
  );

  const updateUser = useCallback(
    async (id: string, payload: Partial<UserAccount>) => {
      await apiFetch(`/api/users/${id}/update`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshDataset();
    },
    [apiFetch, refreshDataset]
  );

  const resetUserPassword = useCallback(
    async (id: string, newPassword?: string) => {
      await apiFetch(`/api/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      await refreshDataset();
    },
    [apiFetch, refreshDataset]
  );

  const updateSettings = useCallback(
    async (payload: Partial<SchoolSettings>) => {
      await apiFetch('/api/settings/update', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshDataset();
    },
    [apiFetch, refreshDataset]
  );

  const value = useMemo<ClassbookContextValue>(
    () => ({
      user,
      token,
      dataset,
      loading,
      error,
      activePage,
      setActivePage,
      globalFilters,
      setGlobalFilters,
      quickSearchQuery,
      setQuickSearchQuery,
      isDark,
      toggleDark,
      toasts,
      notify,
      dismissToast,
      loginWithCredentials,
      switchDemoRole,
      logout,
      changePassword,
      refreshDataset,
      createLesson,
      updateLesson,
      deleteLesson,
      importLessons,
      lockWeek,
      unlockWeek,
      updateTimetableSlot,
      resolveAlert,
      closeDigitalBook,
      createClass,
      updateClass,
      createSubject,
      updateSubject,
      deleteSubject,
      createUser,
      updateUser,
      resetUserPassword,
      updateSettings,
      pendingLessonDraft,
      setPendingLessonDraft,
    }),
    [
      user,
      token,
      dataset,
      loading,
      error,
      activePage,
      setActivePage,
      globalFilters,
      quickSearchQuery,
      isDark,
      toggleDark,
      toasts,
      notify,
      dismissToast,
      loginWithCredentials,
      switchDemoRole,
      logout,
      changePassword,
      refreshDataset,
      createLesson,
      updateLesson,
      deleteLesson,
      importLessons,
      lockWeek,
      unlockWeek,
      updateTimetableSlot,
      resolveAlert,
      closeDigitalBook,
      createClass,
      updateClass,
      createSubject,
      updateSubject,
      deleteSubject,
      createUser,
      updateUser,
      resetUserPassword,
      updateSettings,
      pendingLessonDraft,
    ]
  );

  return (
    <ClassbookContext.Provider value={value}>{children}</ClassbookContext.Provider>
  );
}

export function useClassbook() {
  const ctx = useContext(ClassbookContext);
  if (!ctx) throw new Error('useClassbook must be used within ClassbookProvider');
  return ctx;
}

export function useActiveAlerts() {
  const { dataset, globalFilters, user } = useClassbook();
  return useMemo(() => {
    if (!dataset) return [];
    const all = computeSmartAlerts(
      dataset.classes,
      dataset.lessons,
      dataset.timetable,
      globalFilters.week,
      globalFilters.schoolYear,
      dataset.settings.notifications.alertScoreDropThreshold,
      dataset.resolvedAlertIds
    );
    if (user?.role === 'LPHT' && user.assignedClassId) {
      return all.filter((a) => a.classId === user.assignedClassId);
    }
    return all;
  }, [dataset, globalFilters.week, globalFilters.schoolYear, user]);
}
