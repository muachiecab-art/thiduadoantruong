import React, { useMemo } from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  PenSquare,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ROLE_ALLOWED_PAGES,
  useActiveAlerts,
  useClassbook,
} from '../context/ClassbookContext';
import { GradeLevel, PageId, SemesterId } from '../types/classbook';
import {
  averageScoresExact,
  computeClassRankings,
  formatPercent,
  formatScore,
} from '../utils/scoring';
import { Card, PageHeader, RatingBadge, StatusTag } from '../components/ui/BadgesAndPrimitives';

export function DashboardPage() {
  const {
    dataset,
    user,
    globalFilters,
    setGlobalFilters,
    setActivePage,
  } = useClassbook();
  const alerts = useActiveAlerts().filter((a) => !a.resolved);

  const allowedPages = user ? ROLE_ALLOWED_PAGES[user.role] : [];

  const filteredClasses = useMemo(() => {
    if (!dataset) return [];
    let list = dataset.classes.filter((c) => c.status === 'Hoạt động');
    if (user?.role === 'LPHT' && user.assignedClassId) {
      list = list.filter((c) => c.id === user.assignedClassId);
    } else if (globalFilters.grade !== 'ALL') {
      list = list.filter((c) => c.grade === globalFilters.grade);
    }
    return list;
  }, [dataset, globalFilters.grade, user]);

  const weekLessons = useMemo(() => {
    if (!dataset) return [];
    const classIds = new Set(filteredClasses.map((c) => c.id));
    return dataset.lessons.filter(
      (l) =>
        l.schoolYear === globalFilters.schoolYear &&
        l.semester === globalFilters.semester &&
        l.week === globalFilters.week &&
        classIds.has(l.classId) &&
        l.status !== 'Nháp'
    );
  }, [dataset, filteredClasses, globalFilters]);

  const kpis = useMemo(() => {
    const totalClasses = filteredClasses.length;
    const enteredCount = weekLessons.length;
    const expectedCount = filteredClasses.reduce(
      (acc, c) => acc + c.expectedPeriodsPerWeek,
      0
    );
    const missingCount = Math.max(0, expectedCount - enteredCount);
    const avgScore = averageScoresExact(weekLessons.map((l) => l.totalScore));
    return { totalClasses, enteredCount, expectedCount, missingCount, avgScore };
  }, [filteredClasses, weekLessons]);

  const weeklyTrendData = useMemo(() => {
    if (!dataset) return [];
    const classIds = new Set(filteredClasses.map((c) => c.id));
    const weeksWithData = Array.from(
      new Set(
        dataset.lessons
          .filter(
            (l) =>
              l.schoolYear === globalFilters.schoolYear &&
              l.semester === globalFilters.semester &&
              classIds.has(l.classId) &&
              l.status !== 'Nháp'
          )
          .map((l) => l.week)
      )
    ).sort((a, b) => a - b);

    return weeksWithData.map((wk) => {
      const wkLessons = dataset.lessons.filter(
        (l) =>
          l.week === wk &&
          l.schoolYear === globalFilters.schoolYear &&
          l.semester === globalFilters.semester &&
          classIds.has(l.classId) &&
          l.status !== 'Nháp'
      );
      const avg = averageScoresExact(wkLessons.map((l) => l.totalScore));
      return {
        name: `Tuần ${wk}`,
        diemTB: avg ?? 0,
        soTiet: wkLessons.length,
      };
    });
  }, [dataset, filteredClasses, globalFilters.schoolYear, globalFilters.semester]);

  const ratingDistribution = useMemo(() => {
    const counts = {
      Tốt: 0,
      Khá: 0,
      Đạt: 0,
      'Chưa đạt': 0,
    };
    weekLessons.forEach((l) => {
      counts[l.rating] += 1;
    });
    return [
      { name: 'Tốt', value: counts['Tốt'], color: '#16A34A' },
      { name: 'Khá', value: counts['Khá'], color: '#2563EB' },
      { name: 'Đạt', value: counts['Đạt'], color: '#D97706' },
      { name: 'Chưa đạt', value: counts['Chưa đạt'], color: '#DC2626' },
    ].filter((item) => item.value > 0);
  }, [weekLessons]);

  const top3Classes = useMemo(() => {
    if (!dataset) return [];
    return computeClassRankings(
      dataset.classes,
      dataset.lessons,
      dataset.lockedWeeks,
      {
        schoolYear: globalFilters.schoolYear,
        semester: globalFilters.semester,
        scope: 'week',
        week: globalFilters.week,
        grade: globalFilters.grade,
      }
    ).slice(0, 3);
  }, [dataset, globalFilters]);

  const allQuickLinks: {
    id: PageId;
    label: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'lesson-entry',
      label: 'Nhập tiết học',
      desc: 'Ghi nhận điểm 3–3–2–2',
      icon: <PenSquare className="w-4 h-4 text-[#2563EB]" />,
    },
    {
      id: 'classbook',
      label: 'Sổ đầu bài',
      desc: 'Tra cứu tiết theo lớp/ngày',
      icon: <BookOpen className="w-4 h-4 text-[#16A34A]" />,
    },
    {
      id: 'week-close',
      label: 'Kiểm tra & chốt tuần',
      desc: 'Theo dõi tiến độ nhập sổ',
      icon: <CheckCircle2 className="w-4 h-4 text-[#D97706]" />,
    },
    {
      id: 'rankings',
      label: 'Xếp hạng thi đua',
      desc: 'Bảng xếp hạng tuần/học kỳ',
      icon: <Award className="w-4 h-4 text-[#2563EB]" />,
    },
    {
      id: 'analytics',
      label: 'Thống kê & phân tích',
      desc: 'Biểu đồ đa chiều & Radar',
      icon: <BarChart3 className="w-4 h-4 text-[#16A34A]" />,
    },
    {
      id: 'ai-assistant',
      label: 'Trợ lý AI',
      desc: 'Hỏi đáp dữ liệu thi đua',
      icon: <Sparkles className="w-4 h-4 text-[#2563EB]" />,
    },
  ];
  const quickLinks = allQuickLinks.filter((item) => allowedPages.includes(item.id));

  if (!dataset) return null;

  const isWeekLocked = dataset.lockedWeeks.some(
    (w) => w.week === globalFilters.week && w.schoolYear === globalFilters.schoolYear
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tổng quan Sổ đầu bài & Thi đua"
        subtitle={`${dataset.settings.schoolName} · ${dataset.settings.slogan}`}
        actions={
          <>
            <StatusTag
              tone={isWeekLocked ? 'green' : 'amber'}
              label={
                isWeekLocked
                  ? `Tuần ${globalFilters.week}: Đã chốt`
                  : `Tuần ${globalFilters.week}: Tạm thời`
              }
            />
            {allowedPages.includes('lesson-entry') && (
              <button
                type="button"
                onClick={() => setActivePage('lesson-entry')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <PenSquare className="w-4 h-4" />
                <span>Nhập tiết học</span>
              </button>
            )}
          </>
        }
      />

      {/* Phần 1: Bộ lọc chung */}
      <Card className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="dash-year"
              className="block text-[11px] font-semibold text-[#64748B] dark:text-slate-400 mb-1"
            >
              Năm học
            </label>
            <select
              id="dash-year"
              value={globalFilters.schoolYear}
              onChange={(e) =>
                setGlobalFilters((f) => ({ ...f, schoolYear: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:border-[#2563EB]"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="dash-sem"
              className="block text-[11px] font-semibold text-[#64748B] dark:text-slate-400 mb-1"
            >
              Học kỳ
            </label>
            <select
              id="dash-sem"
              value={globalFilters.semester}
              onChange={(e) =>
                setGlobalFilters((f) => ({
                  ...f,
                  semester: e.target.value as SemesterId,
                }))
              }
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:border-[#2563EB]"
            >
              <option value="HK1">Học kỳ I</option>
              <option value="HK2">Học kỳ II</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="dash-week"
              className="block text-[11px] font-semibold text-[#64748B] dark:text-slate-400 mb-1"
            >
              Tuần (1–39)
            </label>
            <select
              id="dash-week"
              value={globalFilters.week}
              onChange={(e) =>
                setGlobalFilters((f) => ({
                  ...f,
                  week: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:border-[#2563EB]"
            >
              {Array.from({ length: 39 }, (_, i) => i + 1).map((wk) => (
                <option key={wk} value={wk}>
                  Tuần {wk}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="dash-grade"
              className="block text-[11px] font-semibold text-[#64748B] dark:text-slate-400 mb-1"
            >
              Khối lớp
            </label>
            <select
              id="dash-grade"
              disabled={user?.role === 'LPHT'}
              value={
                user?.role === 'LPHT' && filteredClasses[0]
                  ? filteredClasses[0].grade
                  : globalFilters.grade
              }
              onChange={(e) => {
                const v = e.target.value;
                setGlobalFilters((f) => ({
                  ...f,
                  grade: v === 'ALL' ? 'ALL' : (Number(v) as GradeLevel),
                }));
              }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:border-[#2563EB] disabled:opacity-60"
            >
              <option value="ALL">Toàn trường (10, 11, 12)</option>
              <option value="10">Khối 10</option>
              <option value="11">Khối 11</option>
              <option value="12">Khối 12</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Phần 2: Bốn KPI chính */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5">
          <div className="text-xs font-medium text-[#64748B] dark:text-slate-400">
            Tổng số lớp
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-[#0F172A] dark:text-white">
            {kpis.totalClasses}
          </div>
          <div className="mt-1 text-xs text-[#64748B] dark:text-slate-400">
            {user?.role === 'LPHT'
              ? `Phụ trách lớp ${user.assignedClassName}`
              : 'Đang hoạt động'}
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="text-xs font-medium text-[#64748B] dark:text-slate-400">
            Số tiết đã nhập
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-[#2563EB] dark:text-blue-400">
            {kpis.enteredCount}
            <span className="text-sm font-medium text-[#64748B] dark:text-slate-400 ml-1">
              / {kpis.expectedCount}
            </span>
          </div>
          <div className="mt-1 text-xs text-[#64748B] dark:text-slate-400">
            Tuần {globalFilters.week} ·{' '}
            {kpis.expectedCount > 0
              ? formatPercent((kpis.enteredCount / kpis.expectedCount) * 100)
              : '0%'}
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="text-xs font-medium text-[#64748B] dark:text-slate-400">
            Điểm trung bình
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-[#16A34A] dark:text-emerald-400">
            {formatScore(kpis.avgScore)}
          </div>
          <div className="mt-1 text-xs text-[#64748B] dark:text-slate-400">
            Thang điểm 3–3–2–2 (tối đa 10)
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="text-xs font-medium text-[#64748B] dark:text-slate-400">
            Số tiết cần bổ sung
          </div>
          <div
            className={`mt-2 text-2xl sm:text-3xl font-bold tabular-nums ${
              kpis.missingCount > 0
                ? 'text-[#D97706] dark:text-amber-400'
                : 'text-[#16A34A] dark:text-emerald-400'
            }`}
          >
            {kpis.missingCount}
          </div>
          <div className="mt-1 text-xs text-[#64748B] dark:text-slate-400">
            {kpis.missingCount > 0
              ? 'Không tính 0 điểm khi chưa nhập'
              : 'Đã hoàn thành đủ tiết dự kiến'}
          </div>
        </Card>
      </div>

      {/* Phần 3: Biểu đồ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Xu hướng điểm trung bình theo tuần
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Tổng hợp từ các tiết đã lưu chính thức (không gộp điểm học lực)
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[7, 10]} tick={{ fontSize: 12 }} tickFormatter={(v) => formatScore(Number(v))} />
                <Tooltip
                  formatter={(value: unknown) => [formatScore(Number(value)), 'Điểm TB']}
                />
                <Line
                  type="monotone"
                  dataKey="diemTB"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#2563EB' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
              Tỷ lệ xếp loại tiết học
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              Tuần {globalFilters.week} · {weekLessons.length} tiết đã nhập
            </p>
          </div>
          {ratingDistribution.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-[#64748B]">
              Chưa có tiết học nào trong tuần này.
            </div>
          ) : (
            <>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ratingDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {ratingDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => [`${v} tiết`, 'Số lượng']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {ratingDistribution.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name}
                    </span>
                    <span className="font-semibold tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Phần 4, 5, 6: Top 3 lớp + Công việc cần xử lý + Truy cập nhanh */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top 3 lớp dẫn đầu */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
              Top 3 lớp dẫn đầu
            </h2>
            <button
              type="button"
              onClick={() => setActivePage('rankings')}
              className="text-xs font-medium text-[#2563EB] hover:underline inline-flex items-center gap-1"
            >
              <span>Bảng đầy đủ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2.5">
            {top3Classes.map((row) => (
              <div
                key={row.classId}
                className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums ${
                      row.rank === 1
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                        : row.rank === 2
                          ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                    }`}
                  >
                    #{row.rank}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Lớp {row.className}
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                      {row.enteredLessons}/{row.expectedLessons} tiết · Tốt{' '}
                      {formatPercent(row.totRate)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold tabular-nums text-[#2563EB] dark:text-blue-400">
                    {formatScore(row.averageScore)}
                  </div>
                  <div className="mt-0.5">
                    <RatingBadge rating={row.averageScore && row.averageScore >= 9 ? 'Tốt' : 'Khá'} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Công việc cần xử lý */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
              Công việc cần xử lý
            </h2>
            <button
              type="button"
              onClick={() => setActivePage('alerts')}
              className="text-xs font-medium text-[#2563EB] hover:underline"
            >
              Xem cảnh báo ({alerts.length})
            </button>
          </div>
          {alerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#64748B]">
              Tất cả các lớp đều đã hoàn thành tốt trong tuần {globalFilters.week}.
            </div>
          ) : (
            <div className="space-y-2.5">
              {alerts.slice(0, 4).map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() =>
                    setActivePage(
                      alert.category === 'missing' && allowedPages.includes('week-close')
                        ? 'week-close'
                        : 'alerts'
                    )
                  }
                  className="w-full text-left p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-800 hover:border-[#2563EB] transition-colors flex items-start gap-2.5"
                >
                  <TriangleAlert
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      alert.severity === 'Cao'
                        ? 'text-[#DC2626]'
                        : 'text-[#D97706]'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#0F172A] dark:text-slate-100 truncate">
                      {alert.title}
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
                      {alert.relatedData} · Mức độ: {alert.severity}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Truy cập nhanh */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
              Truy cập nhanh
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {quickLinks.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setActivePage(q.id)}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 hover:border-[#2563EB] hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {q.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#0F172A] dark:text-slate-100 truncate">
                      {q.label}
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                      {q.desc}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
