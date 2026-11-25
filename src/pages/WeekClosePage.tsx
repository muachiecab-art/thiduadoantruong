import React, { useMemo, useState } from 'react';
import { CheckCircle2, Eye, Lock, Unlock } from 'lucide-react';
import { useClassbook } from '../context/ClassbookContext';
import { SchoolClass } from '../types/classbook';
import { formatPercent, formatScore } from '../utils/scoring';
import {
  Card,
  ModalDialog,
  PageHeader,
  StatusTag,
} from '../components/ui/BadgesAndPrimitives';

export function WeekClosePage() {
  const {
    dataset,
    user,
    globalFilters,
    setGlobalFilters,
    lockWeek,
    unlockWeek,
    notify,
  } = useClassbook();

  const [detailClass, setDetailClass] = useState<SchoolClass | null>(null);
  const [lockNote, setLockNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const canLock = user?.role === 'Admin' || user?.role === 'Cán bộ Đoàn';

  const weekSummary = useMemo(() => {
    if (!dataset) return null;
    const activeClasses = dataset.classes.filter((c) => c.status === 'Hoạt động');
    const weekLessons = dataset.lessons.filter(
      (l) =>
        l.schoolYear === globalFilters.schoolYear &&
        l.semester === globalFilters.semester &&
        l.week === globalFilters.week
    );

    const rows = activeClasses.map((cls) => {
      const clsLessons = weekLessons.filter((l) => l.classId === cls.id);
      const saved = clsLessons.filter((l) => l.status === 'Đã lưu');
      const pendingConfirm = clsLessons.filter(
        (l) => l.status === 'Chờ xác nhận' || l.status === 'Nháp'
      );
      const expected = cls.expectedPeriodsPerWeek;
      const missing = Math.max(0, expected - saved.length);
      const pct = expected > 0 ? Math.min(100, (saved.length / expected) * 100) : 0;

      return {
        cls,
        expected,
        entered: saved.length,
        missing,
        pendingConfirm: pendingConfirm.length,
        pct,
        lessons: clsLessons,
      };
    });

    const totalExpected = rows.reduce((a, r) => a + r.expected, 0);
    const totalEntered = rows.reduce((a, r) => a + r.entered, 0);
    const totalMissing = rows.reduce((a, r) => a + r.missing, 0);
    const totalPending = rows.reduce((a, r) => a + r.pendingConfirm, 0);
    const overallPct = totalExpected > 0 ? (totalEntered / totalExpected) * 100 : 0;

    return {
      rows,
      totalExpected,
      totalEntered,
      totalMissing,
      totalPending,
      overallPct,
    };
  }, [dataset, globalFilters]);

  if (!dataset || !weekSummary) return null;

  const lockedRecord = dataset.lockedWeeks.find(
    (w) =>
      w.week === globalFilters.week && w.schoolYear === globalFilters.schoolYear
  );

  const handleToggleLock = async () => {
    if (!canLock) return;
    setProcessing(true);
    try {
      if (lockedRecord) {
        await unlockWeek(
          globalFilters.week,
          lockNote || `Mở khóa tuần ${globalFilters.week} để rà soát bổ sung`
        );
        notify('info', `Đã mở khóa Tuần ${globalFilters.week}.`);
      } else {
        await lockWeek(
          globalFilters.week,
          lockNote || `Chốt sổ đầu bài Tuần ${globalFilters.week}`
        );
        notify('success', `Đã chốt số liệu thi đua Tuần ${globalFilters.week}.`);
      }
      setLockNote('');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Thao tác thất bại');
    } finally {
      setProcessing(false);
    }
  };

  const detailRow = detailClass
    ? weekSummary.rows.find((r) => r.cls.id === detailClass.id)
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kiểm tra và chốt tuần"
        subtitle="Rà soát tiến độ hoàn thành Sổ đầu bài. Tiết chưa nhập không bị tính là 0 điểm."
        actions={
          <div className="flex items-center gap-2">
            <select
              aria-label="Chọn tuần kiểm tra"
              value={globalFilters.week}
              onChange={(e) =>
                setGlobalFilters((f) => ({ ...f, week: Number(e.target.value) }))
              }
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              {Array.from({ length: 39 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Tuần {w}
                </option>
              ))}
            </select>
            <StatusTag
              tone={lockedRecord ? 'green' : 'amber'}
              label={lockedRecord ? 'Đã chốt tuần' : 'Chưa chốt (Tạm thời)'}
            />
          </div>
        }
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-4">
          <div className="text-xs text-[#64748B]">Tổng số tiết dự kiến</div>
          <div className="text-2xl font-bold tabular-nums mt-1">
            {weekSummary.totalExpected}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-[#64748B]">Số tiết đã nhập</div>
          <div className="text-2xl font-bold tabular-nums text-[#2563EB] mt-1">
            {weekSummary.totalEntered}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-[#64748B]">Số tiết còn thiếu</div>
          <div className="text-2xl font-bold tabular-nums text-[#D97706] mt-1">
            {weekSummary.totalMissing}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-[#64748B]">Chờ xác nhận / Nháp</div>
          <div className="text-2xl font-bold tabular-nums text-slate-700 dark:text-slate-300 mt-1">
            {weekSummary.totalPending}
          </div>
        </Card>
        <Card className="p-4 col-span-2 lg:col-span-1">
          <div className="text-xs text-[#64748B]">Tiến độ hoàn thành</div>
          <div className="text-2xl font-bold tabular-nums text-[#16A34A] mt-1">
            {formatPercent(weekSummary.overallPct)}
          </div>
        </Card>
      </div>

      {/* Lock action bar */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs space-y-1">
          {lockedRecord ? (
            <>
              <div className="font-bold text-[#16A34A] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Tuần {globalFilters.week} đã được chốt bởi {lockedRecord.lockedBy}
                </span>
              </div>
              <div className="text-[#64748B]">
                Thời gian chốt: {new Date(lockedRecord.lockedAt).toLocaleString('vi-VN')}
              </div>
            </>
          ) : (
            <>
              <div className="font-bold text-[#0F172A] dark:text-white">
                Tuần {globalFilters.week} đang mở nhập liệu
              </div>
              <div className="text-[#64748B]">
                Chỉ Cán bộ Đoàn hoặc Admin có quyền chốt tuần. LPHT không thể tự mở khóa tuần đã chốt.
              </div>
            </>
          )}
        </div>

        {canLock && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={lockNote}
              onChange={(e) => setLockNote(e.target.value)}
              placeholder="Ghi chú chốt / mở khóa..."
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <button
              type="button"
              disabled={processing}
              onClick={handleToggleLock}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors ${
                lockedRecord
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-[#16A34A] hover:bg-emerald-700'
              }`}
            >
              {lockedRecord ? (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Mở khóa tuần</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Chốt tuần {globalFilters.week}</span>
                </>
              )}
            </button>
          </div>
        )}
      </Card>

      {/* Class list */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B]">
                <th className="py-3 px-4 font-semibold">Lớp</th>
                <th className="py-3 px-4 font-semibold">GVCN / LPHT</th>
                <th className="py-3 px-4 font-semibold">Tiến độ hoàn thành</th>
                <th className="py-3 px-4 font-semibold text-right">Tiết còn thiếu</th>
                <th className="py-3 px-4 font-semibold">Trạng thái</th>
                <th className="py-3 px-4 font-semibold text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {weekSummary.rows.map((row) => (
                <tr key={row.cls.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-bold text-[#0F172A] dark:text-white">
                    {row.cls.name}
                  </td>
                  <td className="py-3 px-4 text-[#64748B]">
                    {row.cls.homeroomTeacher} · LPHT: {row.cls.lphtName}
                  </td>
                  <td className="py-3 px-4 min-w-44">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            row.missing === 0 ? 'bg-[#16A34A]' : 'bg-[#2563EB]'
                          }`}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="tabular-nums font-semibold w-14 text-right">
                        {row.entered}/{row.expected}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-bold tabular-nums">
                    {row.missing > 0 ? (
                      <span className="text-[#D97706]">{row.missing} tiết</span>
                    ) : (
                      <span className="text-[#16A34A]">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <StatusTag
                      tone={
                        row.missing === 0 && row.pendingConfirm === 0
                          ? 'green'
                          : row.pendingConfirm > 0
                            ? 'blue'
                            : 'amber'
                      }
                      label={
                        row.missing === 0 && row.pendingConfirm === 0
                          ? 'Đủ tiết'
                          : row.pendingConfirm > 0
                            ? `${row.pendingConfirm} chờ xử lý`
                            : 'Thiếu tiết'
                      }
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setDetailClass(row.cls)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-slate-700 font-semibold hover:border-[#2563EB] text-[#2563EB]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem chi tiết</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Class Week Detail Modal */}
      <ModalDialog
        open={!!detailClass}
        onClose={() => setDetailClass(null)}
        title={
          detailClass
            ? `Chi tiết kiểm tra Tuần ${globalFilters.week} · Lớp ${detailClass.name}`
            : ''
        }
        maxWidth="max-w-2xl"
      >
        {detailRow && (
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span>
                Đã nhập: <strong>{detailRow.entered}/{detailRow.expected}</strong> tiết
              </span>
              <span>·</span>
              <span>
                Còn thiếu: <strong className="text-[#D97706]">{detailRow.missing}</strong> tiết
              </span>
              <span>·</span>
              <span>
                Chờ xác nhận/Nháp: <strong>{detailRow.pendingConfirm}</strong>
              </span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {detailRow.lessons.length === 0 ? (
                <p className="py-6 text-center text-[#64748B]">
                  Chưa có tiết nào được ghi nhận trong tuần này.
                </p>
              ) : (
                detailRow.lessons.map((l) => (
                  <div key={l.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">
                        {l.date} · Tiết {l.period} · {l.subjectName}
                      </div>
                      <div className="text-[#64748B] truncate max-w-md">
                        {l.lessonContent}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold tabular-nums text-[#2563EB]">
                        {formatScore(l.totalScore)}đ ({l.rating})
                      </div>
                      <div className="text-[11px] text-[#64748B]">{l.status}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
