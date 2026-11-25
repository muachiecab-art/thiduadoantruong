import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Edit3, PenSquare } from 'lucide-react';
import { useClassbook } from '../context/ClassbookContext';
import { TimetableEventType, TimetableSlot } from '../types/classbook';
import {
  Card,
  ModalDialog,
  PageHeader,
  StatusTag,
} from '../components/ui/BadgesAndPrimitives';

type TimetableTab = 'today' | 'week' | 'manage';

const DAY_NAMES: Record<number, string> = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
};

export function TimetablePage() {
  const {
    dataset,
    user,
    globalFilters,
    setActivePage,
    setPendingLessonDraft,
    updateTimetableSlot,
    notify,
  } = useClassbook();

  const [activeTab, setActiveTab] = useState<TimetableTab>('today');
  const [selectedClassId, setSelectedClassId] = useState<string>(
    user?.role === 'LPHT' && user.assignedClassId
      ? user.assignedClassId
      : dataset?.classes[0]?.id || 'c-10a1'
  );
  const [selectedDay, setSelectedDay] = useState<number>(2);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [slotSubjectId, setSlotSubjectId] = useState('');
  const [slotTeacher, setSlotTeacher] = useState('');
  const [slotEvent, setSlotEvent] = useState<TimetableEventType>('Bình thường');
  const [slotNote, setSlotNote] = useState('');
  const [saving, setSaving] = useState(false);

  const canManage = user?.role === 'Admin' || user?.role === 'Cán bộ Đoàn';

  const classSlots = useMemo(() => {
    if (!dataset) return [];
    return dataset.timetable
      .filter((t) => t.classId === selectedClassId)
      .sort((a, b) =>
        a.dayOfWeek !== b.dayOfWeek ? a.dayOfWeek - b.dayOfWeek : a.period - b.period
      );
  }, [dataset, selectedClassId]);

  const weekLessonsForClass = useMemo(() => {
    if (!dataset) return [];
    return dataset.lessons.filter(
      (l) =>
        l.classId === selectedClassId &&
        l.week === globalFilters.week &&
        l.schoolYear === globalFilters.schoolYear &&
        l.status !== 'Nháp'
    );
  }, [dataset, selectedClassId, globalFilters.week, globalFilters.schoolYear]);

  const isSlotEntered = (slot: TimetableSlot) =>
    weekLessonsForClass.some(
      (l) => l.dayOfWeek === slot.dayOfWeek && l.period === slot.period
    );

  const openQuickEntry = (slot: TimetableSlot) => {
    const entered = isSlotEntered(slot);
    if (entered) {
      setActivePage('classbook');
      return;
    }
    setPendingLessonDraft({
      classId: slot.classId,
      period: slot.period,
      subjectId: slot.subjectId,
      teacherName: slot.teacherName,
    });
    setActivePage('lesson-entry');
  };

  const openManageDialog = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setSlotSubjectId(slot.subjectId);
    setSlotTeacher(slot.teacherName);
    setSlotEvent(slot.eventType);
    setSlotNote(slot.changeNote || '');
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    setSaving(true);
    try {
      await updateTimetableSlot(editingSlot.id, {
        subjectId: slotSubjectId,
        teacherName: slotTeacher,
        eventType: slotEvent,
        changeNote: slotNote,
      });
      notify('success', 'Đã cập nhật thời khóa biểu.');
      setEditingSlot(null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Cập nhật TKB thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (!dataset) return null;

  const todaySlots = classSlots.filter((s) => s.dayOfWeek === selectedDay);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Thời khóa biểu & Tiến độ tiết học"
        subtitle={`Đối chiếu lịch giảng dạy Tuần ${globalFilters.week} với Sổ đầu bài thực tế.`}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'today', label: 'Hôm nay' },
            { id: 'week', label: 'Cả tuần' },
            ...(canManage
              ? [{ id: 'manage', label: 'Quản lý thời khóa biểu' }]
              : []),
          ] as { id: TimetableTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[#2563EB] text-white'
                : 'bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 text-[#64748B] dark:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="w-44">
          <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
            Lớp học
          </label>
          <select
            disabled={user?.role === 'LPHT'}
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
          >
            {dataset.classes.map((c) => (
              <option key={c.id} value={c.id}>
                Lớp {c.name}
              </option>
            ))}
          </select>
        </div>

        {activeTab === 'today' && (
          <div className="w-44">
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Thứ trong tuần
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {[2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {DAY_NAMES[d]}
                </option>
              ))}
            </select>
          </div>
        )}
      </Card>

      {/* Content */}
      {activeTab === 'today' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {todaySlots.map((slot) => {
            const entered = isSlotEntered(slot);
            return (
              <Card key={slot.id} className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#2563EB] tabular-nums">
                      Tiết {slot.period}
                    </span>
                    <span className="text-sm font-bold text-[#0F172A] dark:text-white">
                      {slot.subjectName}
                    </span>
                    {slot.eventType !== 'Bình thường' && (
                      <StatusTag tone="amber" label={slot.eventType} />
                    )}
                  </div>
                  <div className="text-xs text-[#64748B] dark:text-slate-400">
                    GV: {slot.teacherName}
                    {slot.changeNote ? ` · ${slot.changeNote}` : ''}
                  </div>
                  <div className="pt-1">
                    <StatusTag
                      tone={entered ? 'green' : 'amber'}
                      label={entered ? 'Đã nhập Sổ đầu bài' : 'Chưa nhập'}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openQuickEntry(slot)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold shrink-0"
                >
                  {entered ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mở sổ</span>
                    </>
                  ) : (
                    <>
                      <PenSquare className="w-3.5 h-3.5" />
                      <span>Nhập tiết</span>
                    </>
                  )}
                </button>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B]">
                  <th className="py-3 px-4 font-semibold">Thứ</th>
                  <th className="py-3 px-4 font-semibold">Tiết</th>
                  <th className="py-3 px-4 font-semibold">Môn học</th>
                  <th className="py-3 px-4 font-semibold">Giáo viên</th>
                  <th className="py-3 px-4 font-semibold">Hình thức</th>
                  <th className="py-3 px-4 font-semibold">Trạng thái Tuần {globalFilters.week}</th>
                  <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {classSlots.map((slot) => {
                  const entered = isSlotEntered(slot);
                  return (
                    <tr key={slot.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-semibold">{DAY_NAMES[slot.dayOfWeek]}</td>
                      <td className="py-3 px-4 tabular-nums">Tiết {slot.period}</td>
                      <td className="py-3 px-4 font-semibold text-[#0F172A] dark:text-white">
                        {slot.subjectName}
                      </td>
                      <td className="py-3 px-4">{slot.teacherName}</td>
                      <td className="py-3 px-4">
                        <StatusTag
                          tone={slot.eventType === 'Bình thường' ? 'slate' : 'amber'}
                          label={slot.eventType}
                        />
                        {slot.changeNote && (
                          <div className="text-[11px] text-[#64748B] mt-0.5">
                            {slot.changeNote}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusTag
                          tone={entered ? 'green' : 'amber'}
                          label={entered ? 'Đã nhập' : 'Chưa nhập'}
                        />
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openQuickEntry(slot)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] font-semibold hover:bg-blue-100"
                        >
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>{entered ? 'Xem sổ' : 'Nhập nhanh'}</span>
                        </button>
                        {activeTab === 'manage' && canManage && (
                          <button
                            type="button"
                            onClick={() => openManageDialog(slot)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Đổi/Thay</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Manage Timetable Slot Dialog */}
      <ModalDialog
        open={!!editingSlot}
        onClose={() => setEditingSlot(null)}
        title={
          editingSlot
            ? `Điều chỉnh TKB · Lớp ${editingSlot.className} (${DAY_NAMES[editingSlot.dayOfWeek]} - Tiết ${editingSlot.period})`
            : ''
        }
        description="Hỗ trợ đổi tiết, nghỉ học, học bù hoặc dạy thay."
      >
        <form onSubmit={handleSaveSlot} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1">Hình thức điều chỉnh</label>
            <select
              value={slotEvent}
              onChange={(e) => setSlotEvent(e.target.value as TimetableEventType)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Bình thường">Bình thường</option>
              <option value="Đổi tiết">Đổi tiết</option>
              <option value="Nghỉ học">Nghỉ học</option>
              <option value="Học bù">Học bù</option>
              <option value="Dạy thay">Dạy thay</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Môn học</label>
            <select
              value={slotSubjectId}
              onChange={(e) => setSlotSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {dataset.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Giáo viên giảng dạy</label>
            <input
              type="text"
              required
              value={slotTeacher}
              onChange={(e) => setSlotTeacher(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Ghi chú điều chỉnh</label>
            <input
              type="text"
              value={slotNote}
              onChange={(e) => setSlotNote(e.target.value)}
              placeholder="Ví dụ: Dạy thay thầy Minh đi công tác"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingSlot(null)}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#2563EB] text-white"
            >
              {saving ? 'Đang lưu...' : 'Lưu điều chỉnh'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
