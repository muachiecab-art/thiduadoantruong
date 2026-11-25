import React, { useMemo, useState } from 'react';
import { Award, HelpCircle, Lock, Medal } from 'lucide-react';
import { useClassbook } from '../context/ClassbookContext';
import { ClassRankingRow, GradeLevel, SemesterId } from '../types/classbook';
import {
  computeClassRankings,
  formatPercent,
  formatScore,
} from '../utils/scoring';
import {
  Card,
  ModalDialog,
  PageHeader,
  StatusTag,
} from '../components/ui/BadgesAndPrimitives';

type RankingScope = 'week' | 'month' | 'semester' | 'year';

export function RankingsPage() {
  const { dataset, globalFilters } = useClassbook();
  const [scope, setScope] = useState<RankingScope>('week');
  const [gradeFilter, setGradeFilter] = useState<GradeLevel | 'ALL'>('ALL');
  const [week, setWeek] = useState<number>(globalFilters.week);
  const [month, setMonth] = useState<number>(3);
  const [semester, setSemester] = useState<SemesterId>(globalFilters.semester);
  const [detailRow, setDetailRow] = useState<ClassRankingRow | null>(null);

  const rankings = useMemo(() => {
    if (!dataset) return [];
    return computeClassRankings(
      dataset.classes,
      dataset.lessons,
      dataset.lockedWeeks,
      {
        schoolYear: globalFilters.schoolYear,
        scope,
        week,
        month,
        semester,
        grade: gradeFilter,
      }
    );
  }, [dataset, globalFilters.schoolYear, scope, week, month, semester, gradeFilter]);

  if (!dataset) return null;

  const top3 = rankings.slice(0, 3);
  const isLocked = rankings[0]?.isLocked ?? false;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Xếp hạng thi đua"
        subtitle="Bảng xếp hạng tổng hợp theo công thức 3–3–2–2. Chỉ tính bình quân trên số tiết đã nhập."
        actions={
          <StatusTag
            tone={isLocked ? 'green' : 'amber'}
            label={isLocked ? 'Kết quả đã chốt' : 'Kết quả tạm thời'}
          />
        }
      />

      {/* Tabs: Tuần / Tháng / Học kỳ / Năm học + Grade Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { id: 'week', label: 'Tuần' },
              { id: 'month', label: 'Tháng' },
              { id: 'semester', label: 'Học kỳ' },
              { id: 'year', label: 'Năm học' },
            ] as { id: RankingScope; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScope(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
                scope === tab.id
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 text-[#64748B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {scope === 'week' && (
            <select
              aria-label="Chọn tuần xếp hạng"
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              {Array.from({ length: 39 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Tuần {w}
                </option>
              ))}
            </select>
          )}
          {scope === 'month' && (
            <select
              aria-label="Chọn tháng thi đua"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((m) => (
                <option key={m} value={m}>
                  Tháng thi đua {m} (Tuần {(m - 1) * 4 + 1}–{m * 4})
                </option>
              ))}
            </select>
          )}
          {scope === 'semester' && (
            <select
              aria-label="Chọn học kỳ"
              value={semester}
              onChange={(e) => setSemester(e.target.value as SemesterId)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="HK1">Học kỳ I</option>
              <option value="HK2">Học kỳ II</option>
            </select>
          )}

          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-1 rounded-xl">
            {(
              [
                { id: 'ALL', label: 'Toàn trường' },
                { id: 10, label: 'Khối 10' },
                { id: 11, label: 'Khối 11' },
                { id: 12, label: 'Khối 12' },
              ] as { id: GradeLevel | 'ALL'; label: string }[]
            ).map((g) => (
              <button
                key={String(g.id)}
                type="button"
                onClick={() => setGradeFilter(g.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                  gradeFilter === g.id
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3.map((row, index) => {
          const orderClass =
            index === 0
              ? 'md:order-2 border-amber-300 dark:border-amber-700/60 bg-amber-50/30 dark:bg-amber-950/20'
              : index === 1
                ? 'md:order-1'
                : 'md:order-3';

          return (
            <Card key={row.classId} className={`p-5 flex flex-col justify-between ${orderClass}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      row.rank === 1
                        ? 'bg-amber-400 text-slate-950'
                        : row.rank === 2
                          ? 'bg-slate-300 text-slate-900'
                          : 'bg-orange-200 text-orange-900'
                    }`}
                  >
                    {row.rank === 1 ? <Award className="w-5 h-5" /> : <Medal className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#64748B]">
                      Hạng {row.rank} · Khối {row.grade}
                    </div>
                    <div className="text-lg font-bold text-[#0F172A] dark:text-white">
                      Lớp {row.className}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold tabular-nums text-[#2563EB] dark:text-blue-400">
                    {formatScore(row.averageScore)}
                  </div>
                  <div className="text-[11px] text-[#64748B]">Điểm TB</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs text-[#64748B]">
                <span>
                  {row.enteredLessons}/{row.expectedLessons} tiết · Tốt {formatPercent(row.totRate)}
                </span>
                <button
                  type="button"
                  onClick={() => setDetailRow(row)}
                  className="text-[#2563EB] font-semibold hover:underline"
                >
                  Giải thích
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Full Rankings Table (Desktop) & Cards (Mobile) */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold">Bảng xếp hạng đầy đủ</h2>
          <span className="text-xs text-[#64748B] flex items-center gap-1">
            {isLocked && <Lock className="w-3.5 h-3.5 text-[#16A34A]" />}
            <span>{isLocked ? 'Số liệu chính thức đã chốt' : 'Số liệu cập nhật tạm thời'}</span>
          </span>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B]">
                <th className="py-3 px-4 font-semibold">Hạng</th>
                <th className="py-3 px-4 font-semibold">Lớp</th>
                <th className="py-3 px-4 font-semibold">Khối</th>
                <th className="py-3 px-4 font-semibold text-right">Điểm TB</th>
                <th className="py-3 px-4 font-semibold text-right">Số tiết</th>
                <th className="py-3 px-4 font-semibold text-right">Tốt / Khá / Đạt / CĐ</th>
                <th className="py-3 px-4 font-semibold text-right">Tỷ lệ hoàn thành</th>
                <th className="py-3 px-4 font-semibold text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rankings.map((row) => (
                <tr key={row.classId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-bold tabular-nums">#{row.rank}</td>
                  <td className="py-3 px-4 font-bold text-[#0F172A] dark:text-white">
                    {row.className}
                  </td>
                  <td className="py-3 px-4">Khối {row.grade}</td>
                  <td className="py-3 px-4 text-right font-bold tabular-nums text-[#2563EB] dark:text-blue-400">
                    {formatScore(row.averageScore)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {row.enteredLessons}/{row.expectedLessons}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    <span className="text-[#16A34A] font-semibold">{row.totCount}</span> /{' '}
                    <span className="text-[#2563EB] font-semibold">{row.khaCount}</span> /{' '}
                    <span className="text-[#D97706] font-semibold">{row.datCount}</span> /{' '}
                    <span className="text-[#DC2626] font-semibold">{row.chuaDatCount}</span>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {formatPercent(row.completionRate)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setDetailRow(row)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-slate-700 hover:border-[#2563EB] text-[#2563EB] font-semibold"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Giải thích</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {rankings.map((row) => (
            <div key={row.classId} className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                  #{row.rank} · Lớp {row.className} <span className="font-normal text-[#64748B]">(Khối {row.grade})</span>
                </div>
                <div className="text-[11px] text-[#64748B] mt-0.5 tabular-nums">
                  {row.enteredLessons}/{row.expectedLessons} tiết · Hoàn thành {formatPercent(row.completionRate)}
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="text-right">
                  <div className="text-sm font-bold tabular-nums text-[#2563EB]">
                    {formatScore(row.averageScore)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailRow(row)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-slate-700 text-[11px] font-semibold text-[#2563EB]"
                >
                  Chi tiết
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Explanation Dialog */}
      <ModalDialog
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        title={detailRow ? `Chi tiết xếp hạng · Lớp ${detailRow.className}` : ''}
        description={
          detailRow
            ? `Thứ hạng #${detailRow.rank} · ${detailRow.isLocked ? 'Kết quả đã chốt' : 'Kết quả tạm thời'}`
            : ''
        }
      >
        {detailRow && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-[#0F172A] dark:text-slate-100">
              {detailRow.explanation}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-800">
                <div className="text-[#64748B]">Điểm trung bình</div>
                <div className="text-lg font-bold tabular-nums text-[#2563EB] mt-0.5">
                  {formatScore(detailRow.averageScore)}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-800">
                <div className="text-[#64748B]">Tỷ lệ tiết Tốt</div>
                <div className="text-lg font-bold tabular-nums text-[#16A34A] mt-0.5">
                  {formatPercent(detailRow.totRate)}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Nguyên tắc xếp hạng: Ưu tiên Điểm trung bình Sổ đầu bài (không làm tròn trước khi xếp hạng), sau đó xét Tỷ lệ tiết Tốt và Tỷ lệ hoàn thành số tiết. Tiết chưa nhập không tính 0 điểm.
            </p>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
