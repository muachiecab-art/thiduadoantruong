import React, { useMemo, useState } from 'react';
import {
  Archive,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  History,
  Home,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  PenSquare,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  TriangleAlert,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import {
  ROLE_ALLOWED_PAGES,
  useActiveAlerts,
  useClassbook,
} from '../../context/ClassbookContext';
import { PageId, UserRole } from '../../types/classbook';
import { ModalDialog } from '../ui/BadgesAndPrimitives';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    title: 'TỔNG QUAN',
    items: [{ id: 'dashboard', label: 'Trang chủ', icon: <Home className="w-4 h-4" /> }],
  },
  {
    id: 'classbook-group',
    title: 'SỔ ĐẦU BÀI',
    items: [
      { id: 'classbook', label: 'Sổ đầu bài', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'lesson-entry', label: 'Nhập tiết học', icon: <PenSquare className="w-4 h-4" /> },
      { id: 'timetable', label: 'Thời khóa biểu', icon: <CalendarDays className="w-4 h-4" /> },
      { id: 'week-close', label: 'Kiểm tra và chốt tuần', icon: <CheckCircle2 className="w-4 h-4" /> },
    ],
  },
  {
    id: 'emulation-group',
    title: 'THI ĐUA VÀ PHÂN TÍCH',
    items: [
      { id: 'rankings', label: 'Xếp hạng thi đua', icon: <Award className="w-4 h-4" /> },
      { id: 'analytics', label: 'Thống kê và phân tích', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'alerts', label: 'Cảnh báo thông minh', icon: <TriangleAlert className="w-4 h-4" /> },
      { id: 'ai-assistant', label: 'Trợ lý AI', icon: <Sparkles className="w-4 h-4" /> },
    ],
  },
  {
    id: 'records-group',
    title: 'HỒ SƠ VÀ BÁO CÁO',
    items: [
      { id: 'reports', label: 'Báo cáo thi đua', icon: <FileText className="w-4 h-4" /> },
      { id: 'digital-archive', label: 'Kho Sổ đầu bài số', icon: <Archive className="w-4 h-4" /> },
      { id: 'excel', label: 'Import/Export Excel', icon: <FileSpreadsheet className="w-4 h-4" /> },
    ],
  },
  {
    id: 'admin-group',
    title: 'QUẢN TRỊ',
    items: [
      { id: 'classes', label: 'Quản lý lớp', icon: <GraduationCap className="w-4 h-4" /> },
      { id: 'subjects', label: 'Quản lý môn học', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'users', label: 'Quản lý người dùng', icon: <Users className="w-4 h-4" /> },
      { id: 'audit-log', label: 'Lịch sử hoạt động', icon: <History className="w-4 h-4" /> },
      { id: 'settings', label: 'Cài đặt hệ thống', icon: <Settings className="w-4 h-4" /> },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    user,
    dataset,
    activePage,
    setActivePage,
    quickSearchQuery,
    setQuickSearchQuery,
    isDark,
    toggleDark,
    switchDemoRole,
    logout,
    changePassword,
    toasts,
    dismissToast,
    notify,
  } = useClassbook();

  const activeAlerts = useActiveAlerts().filter((a) => !a.resolved);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passSaving, setPassSaving] = useState(false);

  const allowedPages = useMemo(() => {
    if (!user) return [];
    return ROLE_ALLOWED_PAGES[user.role];
  }, [user]);

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => allowedPages.includes(item.id)),
    })).filter((g) => g.items.length > 0);
  }, [allowedPages]);

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearchQuery.trim()) return;
    setActivePage('classbook');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      notify('error', 'Xác nhận mật khẩu mới chưa khớp.');
      return;
    }
    setPassSaving(true);
    try {
      await changePassword(currPass, newPass);
      setCurrPass('');
      setNewPass('');
      setConfirmPass('');
      setPasswordModalOpen(false);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Đổi mật khẩu thất bại');
    } finally {
      setPassSaving(false);
    }
  };

  const schoolName = dataset?.settings.schoolName || 'Trường THPT Chu Văn An';
  const schoolYear = dataset?.settings.currentSchoolYear || '2025-2026';

  const mobilePrimaryIds: PageId[] = ['dashboard', 'classbook', 'lesson-entry', 'rankings'];
  const mobileExtraItems = visibleGroups
    .flatMap((g) => g.items)
    .filter((i) => !mobilePrimaryIds.includes(i.id));

  return (
    <div className="min-h-screen flex bg-[#F1F5F9] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside
        aria-label="Điều hướng chính"
        className="hidden lg:flex lg:flex-col lg:w-64 xl:w-68 shrink-0 bg-[#123B80] text-white border-r border-blue-950/50 sticky top-0 h-screen"
      >
        <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-1 shrink-0 overflow-hidden shadow-xs flex items-center justify-center">
            <img
              src="/src/assets/images/school_crest_logo_1795589268302.jpg"
              alt="Biểu trưng Trường THPT Chu Văn An"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-white truncate">
              SMART CLASSBOOK AI
            </div>
            <div className="text-[11px] text-blue-200 truncate">
              {schoolName}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {visibleGroups.map((group) => {
            const isCollapsed = !!collapsedGroups[group.id];
            return (
              <div key={group.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!isCollapsed}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10.5px] font-semibold tracking-wider text-blue-200/80 hover:text-white transition-colors"
                >
                  <span>{group.title}</span>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                {!isCollapsed && (
                  <ul className="mt-0.5 space-y-0.5">
                    {group.items.map((item) => {
                      const active = activePage === item.id;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setActivePage(item.id)}
                            aria-current={active ? 'page' : undefined}
                            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-colors ${
                              active
                                ? 'bg-[#2563EB] text-white shadow-xs'
                                : 'text-blue-100/90 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <span className="shrink-0">{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                            {item.id === 'alerts' && activeAlerts.length > 0 && (
                              <span className="ml-auto text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950">
                                {activeAlerts.length}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 text-xs text-blue-200/90">
          <div className="bg-white/10 rounded-xl px-3 py-2.5">
            <div className="font-medium text-white truncate">
              {user?.fullName}
            </div>
            <div className="text-[11px] text-blue-200 mt-0.5">
              {user?.role}
              {user?.assignedClassName ? ` · Lớp ${user.assignedClassName}` : ''}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-[#E2E8F0] dark:border-slate-800 px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: School Name & Year */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="lg:hidden w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 shrink-0 flex items-center justify-center">
              <img
                src="/src/assets/images/school_crest_logo_1795589268302.jpg"
                alt="Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] sm:text-sm font-bold text-[#0F172A] dark:text-white truncate">
                <span className="sm:hidden">THPT Chu Văn An</span>
                <span className="hidden sm:inline">{schoolName}</span>
              </div>
              <div className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400 truncate">
                <span className="sm:hidden">{schoolYear} · Tuần {dataset?.settings.currentWeek ?? 12}</span>
                <span className="hidden sm:inline">Năm học {schoolYear} · Tuần {dataset?.settings.currentWeek ?? 12}</span>
              </div>
            </div>
          </div>

          {/* Center: Quick Search */}
          <form
            onSubmit={handleQuickSearchSubmit}
            className="hidden md:flex items-center flex-1 max-w-sm relative"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="search"
              value={quickSearchQuery}
              onChange={(e) => setQuickSearchQuery(e.target.value)}
              placeholder="Tìm lớp, môn học, bài giảng..."
              aria-label="Tìm kiếm nhanh"
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#2563EB] focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none transition-colors"
            />
          </form>

          {/* Right: Notifications, Theme, Profile / Role */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Role quick preview switcher */}
            <div className="hidden xl:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['Admin', 'Cán bộ Đoàn', 'LPHT'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => switchDemoRole(role)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    user?.role === role
                      ? 'bg-white dark:bg-slate-700 text-[#2563EB] dark:text-blue-400 shadow-xs'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {role === 'LPHT' ? 'LPHT (10A1)' : role}
                </button>
              ))}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setAccountMenuOpen(false);
                }}
                aria-label="Thông báo cảnh báo"
                className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {activeAlerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#DC2626]" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl shadow-lg p-3 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                      Thông báo ({activeAlerts.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        setActivePage('alerts');
                      }}
                      className="text-xs font-medium text-[#2563EB] hover:underline"
                    >
                      Xem tất cả
                    </button>
                  </div>
                  <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
                    {activeAlerts.length === 0 ? (
                      <p className="text-xs text-[#64748B] py-4 text-center">
                        Không có cảnh báo mới.
                      </p>
                    ) : (
                      activeAlerts.slice(0, 5).map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            setActivePage('alerts');
                          }}
                          className="w-full text-left p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                        >
                          <div className="text-xs font-semibold text-[#0F172A] dark:text-slate-100">
                            {a.title}
                          </div>
                          <div className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5 truncate">
                            {a.relatedData}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Light / Dark Mode */}
            <button
              type="button"
              onClick={toggleDark}
              aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Avatar & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen((o) => !o);
                  setNotifOpen(false);
                }}
                aria-label="Menu tài khoản"
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <img
                  src="/src/assets/images/avatar_teacher_profile_1795589268937.jpg"
                  alt={user?.fullName || 'Avatar'}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  referrerPolicy="no-referrer"
                />
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-[#0F172A] dark:text-white leading-tight max-w-28 truncate">
                    {user?.fullName}
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-slate-400 leading-tight">
                    {user?.role}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl shadow-lg p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                      {user?.fullName}
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                      {user?.contact} · {user?.role}
                    </div>
                  </div>

                  {/* Mobile/Tablet Role Switcher */}
                  <div className="xl:hidden px-2 py-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-semibold text-[#64748B] px-1 mb-1">
                      Chuyển vai trò trải nghiệm
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(['Admin', 'Cán bộ Đoàn', 'LPHT'] as UserRole[]).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            switchDemoRole(role);
                            setAccountMenuOpen(false);
                          }}
                          className={`px-2 py-1 rounded-lg text-[11px] font-medium ${
                            user?.role === role
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {role === 'Cán bộ Đoàn' ? 'Đoàn' : role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setPasswordModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <KeyRound className="w-4 h-4 text-slate-400" />
                    <span>Đổi mật khẩu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Điều hướng di động"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-[#E2E8F0] dark:border-slate-800 px-1 py-1.5 grid grid-cols-5 gap-1"
      >
        {[
          { id: 'dashboard' as PageId, label: 'Trang chủ', icon: <Home className="w-4 h-4" /> },
          { id: 'classbook' as PageId, label: 'Sổ đầu bài', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'lesson-entry' as PageId, label: 'Nhập tiết', icon: <PenSquare className="w-4 h-4" /> },
          { id: 'rankings' as PageId, label: 'Thi đua', icon: <Award className="w-4 h-4" /> },
        ].map((tab) => {
          const active = activePage === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMobileMoreOpen(false);
                setActivePage(tab.id);
              }}
              className={`flex flex-col items-center justify-center py-1 rounded-xl text-[11px] font-medium transition-colors ${
                active
                  ? 'text-[#2563EB] dark:text-blue-400'
                  : 'text-[#64748B] dark:text-slate-400'
              }`}
            >
              {tab.icon}
              <span className="mt-0.5 truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMoreOpen(true)}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[11px] font-medium transition-colors ${
            mobileMoreOpen
              ? 'text-[#2563EB] dark:text-blue-400'
              : 'text-[#64748B] dark:text-slate-400'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span className="mt-0.5">Thêm</span>
        </button>
      </nav>

      {/* Mobile "Thêm" Drawer */}
      {mobileMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/50 flex items-end">
          <div className="w-full bg-white dark:bg-slate-900 rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-sm font-bold">Chức năng mở rộng</div>
                <div className="text-xs text-[#64748B]">
                  Phân quyền: {user?.role}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                aria-label="Đóng menu thêm"
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {mobileExtraItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActivePage(item.id);
                    setMobileMoreOpen(false);
                  }}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left text-xs font-medium ${
                    activePage === item.id
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-[#2563EB] text-[#2563EB]'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ModalDialog
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Đổi mật khẩu tài khoản"
        description="Mật khẩu mới tối thiểu 6 ký tự."
      >
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              required
              value={currPass}
              onChange={(e) => setCurrPass(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Mật khẩu mới</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={passSaving}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {passSaving ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Toasts */}
      <div className="fixed bottom-20 lg:bottom-5 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-xs font-medium bg-white dark:bg-slate-900 ${
              t.type === 'success'
                ? 'border-emerald-200 text-[#16A34A] dark:border-emerald-800 dark:text-emerald-400'
                : t.type === 'error'
                  ? 'border-red-200 text-[#DC2626] dark:border-red-800 dark:text-red-400'
                  : 'border-blue-200 text-[#2563EB] dark:border-blue-800 dark:text-blue-400'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 text-[#0F172A] dark:text-slate-100">{t.text}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Đóng thông báo"
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
