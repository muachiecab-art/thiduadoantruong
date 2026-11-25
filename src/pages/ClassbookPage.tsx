import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Eye,
  MoreVertical,
  PenSquare,
  Plus,
  Trash2,
} from 'lucide-react';
import { useClassbook } from '../context/ClassbookContext';
import { ClassLesson, SemesterId } from '../types/classbook';
import {
  averageScoresExact,
  formatScore,
  validateCriteriaScores,
} from '../utils/scoring';
import {
  Card,
  EmptyState,
  ModalDialog,
  PageHeader,
  RatingBadge,
  StatusTag,
} from '../components/ui/BadgesAndPrimitives';

type ClassbookTab = 'all' | 'by-day' | 'by-week' | 'by-class' | 'pending';

export function ClassbookPage() {
  const {
    dataset,
    user,
    globalFilters,
    quickSearchQuery,
    setActivePage,
    updateLesson,
    deleteLesson,
    notify,
  } = useClassbook();

  const [activeTab, setActiveTab] = useState<ClassbookTab>('by-class');
  const [filterYear, setFilterYear] = useState(globalFilters.schoolYear);
  const [filterSem, setFilterSem] = useState<SemesterId | 'ALL'>(globalFilters.semester);
  const [filterWeek, setFilterWeek] = useState<number | 'ALL'>(globalFilters.week);
  const [filterDate, setFilterDate] = useState('');
  const [filterClassId, setFilterClassId] = useState(
    user?.role === 'LPHT' && user.assignedClassId ? user.assignedClassId : 'ALL'
  );
  const [filterSubjectId, setFilterSubjectId] = useState('ALL');

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [viewLesson, setViewLesson] = useState<ClassLesson | null>(null);
  const [editLesson, setEditLesson] = useState<ClassLesson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassLesson | null>(null);

  // Edit form state
  const [editContent, setEditContent] = useState('');
  const [editScores, setEditScores] = useState({
    hocTap: '',
    kiLuat: '',
    veSinh: '',
    chuyenCan: '',
  });
  const [editNotes, setEditNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    if (user?.role === 'LPHT' && user.assignedClassId) {
      setFilterClassId(user.assignedClassId);
    }
  }, [user]);

  const filteredLessons = useMemo(() => {
    if (!dataset) return [];
    const q = quickSearchQuery.trim().toLowerCase();

    return dataset.lessons
      .filter((l) => {
        if (user?.role === 'LPHT' && user.assignedClassId && l.classId !== user.assignedClassId) {
          return false;
        }
        if (filterYear !== 'ALL' && l.schoolYear !== filterYear) return false;
        if (filterSem !== 'ALL' && l.semester !== filterSem) return false;
        if (filterWeek !== 'ALL' && l.week !== filterWeek) return false;
        if (filterDate && l.date !== filterDate) return false;
        if (filterClassId !== 'ALL' && l.classId !== filterClassId) return false;
        if (filterSubjectId !== 'ALL' && l.subjectId !== filterSubjectId) return false;
        if (activeTab === 'pending') {
          if (l.status === 'Đã lưu') return false;
        }
        if (q) {
          const hay = `${l.className} ${l.subjectName} ${l.teacherName} ${l.lessonContent} ${l.notes}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        if (a.className !== b.className) return a.className.localeCompare(b.className, 'vi');
        return a.period - b.period;
      });
  }, [
    dataset,
    user,
    filterYear,
    filterSem,
    filterWeek,
    filterDate,
    filterClassId,
    filterSubjectId,
    activeTab,
    quickSearchQuery,
  ]);

  const groupedData = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; title: string; subtitle: string; items: ClassLesson[] }
    >();

    filteredLessons.forEach((lesson) => {
      let key = 'all';
      let title = 'Tất cả tiết học';
      let subtitle = '';

      if (activeTab === 'by-class') {
        key = `cls-${lesson.classId}`;
        title = `Lớp ${lesson.className}`;
        subtitle = `Khối ${lesson.grade}`;
      } else if (activeTab === 'by-day') {
        key = `day-${lesson.date}`;
        title = `Ngày ${lesson.date} (Thứ ${lesson.dayOfWeek})`;
        subtitle = `Tuần ${lesson.week}`;
      } else if (activeTab === 'by-week') {
        key = `wk-${lesson.week}`;
        title = `Tuần ${lesson.week}`;
        subtitle = `${lesson.semester} · ${lesson.schoolYear}`;
      } else if (activeTab === 'pending') {
        key = `pend-${lesson.classId}`;
        title = `Cần xử lý · Lớp ${lesson.className}`;
        subtitle = 'Nháp / Chờ xác nhận';
      } else {
        key = `all-wk-${lesson.week}`;
        title = `Tất cả tiết học · Tuần ${lesson.week}`;
        subtitle = `${lesson.schoolYear}`;
      }

      if (!groups.has(key)) {
        groups.set(key, { key, title, subtitle, items: [] });
      }
      groups.get(key)!.items.push(lesson);
    });

    return Array.from(groups.values());
  }, [filteredLessons, activeTab]);

  // Auto-expand first group for rapid readability
  useEffect(() => {
    if (groupedData.length > 0) {
      const firstKey = groupedData[0].key;
      setExpandedGroups((prev) =>
        Object.keys(prev).length === 0 ? { [firstKey]: true } : prev
      );
    }
  }, [groupedData]);

  const canModifyLesson = (lesson: ClassLesson) => {
    if (!user || !dataset) return false;
    const isLocked = dataset.lockedWeeks.some(
      (w) => w.week === lesson.week && w.schoolYear === lesson.schoolYear
    );
    if (user.role === 'LPHT') {
      return user.assignedClassId === lesson.classId && !isLocked;
    }
    return user.role === 'Admin' || user.role === 'Cán bộ Đoàn';
  };

  const openEditModal = (lesson: ClassLesson) => {
    setEditLesson(lesson);
    setEditContent(lesson.lessonContent);
    setEditScores({
      hocTap: String(lesson.scores.hocTap),
      kiLuat: String(lesson.scores.kiLuat),
      veSinh: String(lesson.scores.veSinh),
      chuyenCan: String(lesson.scores.chuyenCan),
    });
    setEditNotes(lesson.notes);
    setEditReason('');
    setOpenMenuId(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLesson) return;
    const parsed = {
      hocTap: Number(editScores.hocTap.replace(',', '.')),
      kiLuat: Number(editScores.kiLuat.replace(',', '.')),
      veSinh: Number(editScores.veSinh.replace(',', '.')),
      chuyenCan: Number(editScores.chuyenCan.replace(',', '.')),
    };
    const check = validateCriteriaScores(parsed, dataset?.settings.scoringRules);
    if (!check.valid) {
      notify('error', check.errors.join(' '));
      return;
    }
    setSavingEdit(true);
    try {
      await updateLesson(editLesson.id, {
        lessonContent: editContent,
        scores: parsed,
        notes: editNotes,
        status: 'Đã lưu',
        reason: editReason || 'Điều chỉnh từ trang Sổ đầu bài',
      });
      notify('success', `Đã cập nhật tiết ${editLesson.period} lớp ${editLesson.className}.`);
      setEditLesson(null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Cập nhật thất bại');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLesson(deleteTarget.id, deleteReason || 'Xóa theo yêu cầu rà soát');
      notify('success', `Đã xóa tiết ${deleteTarget.period} lớp ${deleteTarget.className}.`);
      setDeleteTarget(null);
      setDeleteReason('');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Xóa thất bại');
    }
  };

  if (!dataset) return null;

  const hideClassCol = activeTab === 'by-class' || activeTab === 'pending';
  const hideDayCol = activeTab === 'by-day';
  const hideWeekCol = activeTab === 'by-week' || activeTab === 'all';

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sổ đầu bài điện tử"
        subtitle="Tra cứu, rà soát điểm thành phần (3–3–2–2) và nhận xét theo lớp, ngày hoặc tuần."
        actions={
          <button
            type="button"
            onClick={() => setActivePage('lesson-entry')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nhập tiết mới</span>
          </button>
        }
      />

      {/* 5 Tabs */}
      <div
        role="tablist"
        aria-label="Chế độ xem sổ đầu bài"
        className="flex items-center gap-1.5 overflow-x-auto pb-1"
      >
        {(
          [
            { id: 'all', label: 'Tất cả tiết học' },
            { id: 'by-day', label: 'Theo ngày' },
            { id: 'by-week', label: 'Theo tuần' },
            { id: 'by-class', label: 'Theo lớp' },
            { id: 'pending', label: 'Cần xử lý' },
          ] as { id: ClassbookTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setExpandedGroups({});
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 text-[#64748B] dark:text-slate-300 hover:text-[#0F172A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Năm học
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Học kỳ
            </label>
            <select
              value={filterSem}
              onChange={(e) => setFilterSem(e.target.value as SemesterId | 'ALL')}
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="ALL">Cả năm</option>
              <option value="HK1">Học kỳ I</option>
              <option value="HK2">Học kỳ II</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Tuần
            </label>
            <select
              value={filterWeek}
              onChange={(e) =>
                setFilterWeek(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="ALL">Tất cả tuần</option>
              {Array.from({ length: 39 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Tuần {w}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Ngày
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Lớp
            </label>
            <select
              disabled={user?.role === 'LPHT'}
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
            >
              <option value="ALL">Tất cả lớp</option>
              {dataset.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Môn học
            </label>
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="ALL">Tất cả môn</option>
              {dataset.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Accordion Groups */}
      {groupedData.length === 0 ? (
        <Card>
          <EmptyState
            title="Không có tiết học nào phù hợp bộ lọc"
            description="Hãy điều chỉnh bộ lọc tuần, lớp, ngày hoặc nhập tiết học mới vào Sổ đầu bài."
            action={
              <button
                type="button"
                onClick={() => setActivePage('lesson-entry')}
                className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                Nhập tiết học đầu tiên
              </button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedData.map((group) => {
            const isExpanded = !!expandedGroups[group.key];
            const avg = averageScoresExact(
              group.items.filter((i) => i.status !== 'Nháp').map((i) => i.totalScore)
            );
            const hasPending = group.items.some((i) => i.status !== 'Đã lưu');

            return (
              <Card key={group.key} className="overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() =>
                    setExpandedGroups((prev) => ({
                      ...prev,
                      [group.key]: !prev[group.key],
                    }))
                  }
                  className="w-full flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#2563EB] shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-sm font-bold text-[#0F172A] dark:text-white">
                        {group.title}
                      </div>
                      <div className="text-xs text-[#64748B] dark:text-slate-400">
                        {group.subtitle} · {group.items.length} tiết
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                        Điểm TB
                      </div>
                      <div className="text-sm font-bold tabular-nums text-[#2563EB] dark:text-blue-400">
                        {formatScore(avg)}
                      </div>
                    </div>
                    <StatusTag
                      tone={hasPending ? 'amber' : 'green'}
                      label={hasPending ? 'Cần xử lý' : 'Đầy đủ'}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[#E2E8F0] dark:border-slate-800">
                    {/* Desktop / Tablet Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60 text-[#64748B] dark:text-slate-400 border-b border-[#E2E8F0] dark:border-slate-800">
                            {!hideDayCol && <th className="py-2.5 px-3 font-semibold">Ngày</th>}
                            {!hideWeekCol && <th className="py-2.5 px-3 font-semibold">Tuần</th>}
                            {!hideClassCol && <th className="py-2.5 px-3 font-semibold">Lớp</th>}
                            <th className="py-2.5 px-3 font-semibold">Tiết</th>
                            <th className="py-2.5 px-3 font-semibold">Môn học</th>
                            <th className="py-2.5 px-3 font-semibold text-right">HT</th>
                            <th className="py-2.5 px-3 font-semibold text-right">KL</th>
                            <th className="py-2.5 px-3 font-semibold text-right">VS</th>
                            <th className="py-2.5 px-3 font-semibold text-right">CC</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Tổng</th>
                            <th className="py-2.5 px-3 font-semibold">Xếp loại</th>
                            <th className="py-2.5 px-3 font-semibold">Ghi chú</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {group.items.map((item) => {
                            const modifiable = canModifyLesson(item);
                            return (
                              <tr
                                key={item.id}
                                className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                              >
                                {!hideDayCol && (
                                  <td className="py-2.5 px-3 whitespace-nowrap tabular-nums">
                                    {item.date}
                                  </td>
                                )}
                                {!hideWeekCol && (
                                  <td className="py-2.5 px-3 whitespace-nowrap tabular-nums">
                                    T{item.week}
                                  </td>
                                )}
                                {!hideClassCol && (
                                  <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                                    {item.className}
                                  </td>
                                )}
                                <td className="py-2.5 px-3 tabular-nums whitespace-nowrap">
                                  Tiết {item.period}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-[#0F172A] dark:text-white">
                                    {item.subjectName}
                                  </div>
                                  <div className="text-[11px] text-[#64748B] truncate max-w-44">
                                    {item.lessonContent}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums">
                                  {formatScore(item.scores.hocTap)}
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums">
                                  {formatScore(item.scores.kiLuat)}
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums">
                                  {formatScore(item.scores.veSinh)}
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums">
                                  {formatScore(item.scores.chuyenCan)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold tabular-nums text-[#2563EB] dark:text-blue-400">
                                  {formatScore(item.totalScore)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <RatingBadge rating={item.rating} />
                                    {item.status !== 'Đã lưu' && (
                                      <StatusTag tone="amber" label={item.status} />
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 max-w-40">
                                  {item.notes ? (
                                    <button
                                      type="button"
                                      onClick={() => setViewLesson(item)}
                                      className="text-left text-[#64748B] dark:text-slate-400 hover:text-[#2563EB] truncate block max-w-36"
                                      title="Bấm để xem đầy đủ ghi chú"
                                    >
                                      {item.notes}
                                    </button>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right relative">
                                  <button
                                    type="button"
                                    aria-label={`Thao tác tiết ${item.period} lớp ${item.className}`}
                                    onClick={() =>
                                      setOpenMenuId((cur) =>
                                        cur === item.id ? null : item.id
                                      )
                                    }
                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                  >
                                    <MoreVertical className="w-4 h-4 text-slate-500" />
                                  </button>
                                  {openMenuId === item.id && (
                                    <div className="absolute right-3 mt-1 w-36 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl shadow-lg p-1 z-20 text-left">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setViewLesson(item);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Xem chi tiết</span>
                                      </button>
                                      {modifiable && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => openEditModal(item)}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            <span>Chỉnh sửa</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDeleteTarget(item);
                                              setOpenMenuId(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Xóa tiết</span>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {group.items.map((item) => {
                        const modifiable = canModifyLesson(item);
                        return (
                          <div key={item.id} className="p-4 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                                  Lớp {item.className} · Tiết {item.period} · {item.subjectName}
                                </div>
                                <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                                  {item.date} · Tuần {item.week} · GV: {item.teacherName}
                                </div>
                              </div>
                              <RatingBadge rating={item.rating} />
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300">
                              {item.lessonContent}
                            </p>
                            <div className="grid grid-cols-5 gap-1.5 text-center bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl text-[11px] tabular-nums">
                              <div>
                                <div className="text-[#64748B]">HT</div>
                                <div className="font-semibold">{formatScore(item.scores.hocTap)}</div>
                              </div>
                              <div>
                                <div className="text-[#64748B]">KL</div>
                                <div className="font-semibold">{formatScore(item.scores.kiLuat)}</div>
                              </div>
                              <div>
                                <div className="text-[#64748B]">VS</div>
                                <div className="font-semibold">{formatScore(item.scores.veSinh)}</div>
                              </div>
                              <div>
                                <div className="text-[#64748B]">CC</div>
                                <div className="font-semibold">{formatScore(item.scores.chuyenCan)}</div>
                              </div>
                              <div>
                                <div className="text-[#64748B]">Tổng</div>
                                <div className="font-bold text-[#2563EB]">{formatScore(item.totalScore)}</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setViewLesson(item)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                              >
                                Xem
                              </button>
                              {modifiable && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(item)}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-[#2563EB]"
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(item)}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-[#DC2626]"
                                  >
                                    Xóa
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* View Detail Modal */}
      <ModalDialog
        open={!!viewLesson}
        onClose={() => setViewLesson(null)}
        title={
          viewLesson
            ? `Chi tiết tiết ${viewLesson.period} · Lớp ${viewLesson.className}`
            : ''
        }
        description={
          viewLesson
            ? `${viewLesson.date} (Tuần ${viewLesson.week}) · Môn ${viewLesson.subjectName}`
            : ''
        }
      >
        {viewLesson && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#64748B]">Giáo viên:</span>{' '}
                <span className="font-semibold">{viewLesson.teacherName}</span>
              </div>
              <div>
                <span className="text-[#64748B]">Người nhập:</span>{' '}
                <span className="font-semibold">{viewLesson.createdBy}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="text-[11px] font-semibold text-[#64748B] mb-1">
                Nội dung bài học
              </div>
              <div className="text-xs font-medium">{viewLesson.lessonContent}</div>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-800 tabular-nums">
              <div>
                <div className="text-[11px] text-[#64748B]">Học tập</div>
                <div className="font-bold">{formatScore(viewLesson.scores.hocTap)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#64748B]">Kỉ luật</div>
                <div className="font-bold">{formatScore(viewLesson.scores.kiLuat)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#64748B]">Vệ sinh</div>
                <div className="font-bold">{formatScore(viewLesson.scores.veSinh)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#64748B]">Chuyên cần</div>
                <div className="font-bold">{formatScore(viewLesson.scores.chuyenCan)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#64748B]">Tổng</div>
                <div className="font-bold text-[#2563EB]">{formatScore(viewLesson.totalScore)}</div>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#64748B] mb-1">
                Ghi chú đầy đủ
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {viewLesson.notes || 'Không có ghi chú.'}
              </p>
            </div>
            {viewLesson.teacherComment && (
              <div>
                <div className="text-[11px] font-semibold text-[#64748B] mb-1">
                  Nhận xét giáo viên
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {viewLesson.teacherComment}
                </p>
              </div>
            )}
          </div>
        )}
      </ModalDialog>

      {/* Edit Modal */}
      <ModalDialog
        open={!!editLesson}
        onClose={() => setEditLesson(null)}
        title={
          editLesson
            ? `Chỉnh sửa tiết ${editLesson.period} · Lớp ${editLesson.className}`
            : ''
        }
        description="Mọi thay đổi đều được lưu vào Nhật ký hoạt động."
      >
        <form onSubmit={handleSaveEdit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1">
              Nội dung bài học
            </label>
            <input
              type="text"
              required
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-[11px] font-semibold mb-1">Học tập (0–3)</label>
              <input
                type="text"
                inputMode="decimal"
                value={editScores.hocTap}
                onChange={(e) => setEditScores((s) => ({ ...s, hocTap: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Kỉ luật (0–3)</label>
              <input
                type="text"
                inputMode="decimal"
                value={editScores.kiLuat}
                onChange={(e) => setEditScores((s) => ({ ...s, kiLuat: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Vệ sinh (0–2)</label>
              <input
                type="text"
                inputMode="decimal"
                value={editScores.veSinh}
                onChange={(e) => setEditScores((s) => ({ ...s, veSinh: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Chuyên cần (0–2)</label>
              <input
                type="text"
                inputMode="decimal"
                value={editScores.chuyenCan}
                onChange={(e) => setEditScores((s) => ({ ...s, chuyenCan: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Ghi chú</label>
            <textarea
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              Lý do điều chỉnh
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Điều chỉnh điểm vệ sinh theo thực tế trực nhật"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditLesson(null)}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Delete Confirm Modal */}
      <ModalDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa tiết học"
        description={
          deleteTarget
            ? `Bạn chắc chắn muốn xóa tiết ${deleteTarget.period} môn ${deleteTarget.subjectName} lớp ${deleteTarget.className}?`
            : ''
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1">Lý do xóa</label>
            <input
              type="text"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Ví dụ: Nhập nhầm tiết hoặc trùng bản ghi"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#DC2626] text-white hover:bg-red-700"
            >
              Xóa tiết học
            </button>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
}
