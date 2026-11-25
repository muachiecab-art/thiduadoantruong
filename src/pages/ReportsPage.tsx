import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { useClassbook } from '../context/ClassbookContext';
import { GradeLevel, SemesterId } from '../types/classbook';
import {
  computeClassRankings,
  filterLessonsByScope,
  formatPercent,
  formatScore,
} from '../utils/scoring';
import { exportLessonsToExcel } from '../utils/excel';
import { Card, PageHeader } from '../components/ui/BadgesAndPrimitives';

type ReportTab = 'week' | 'month' | 'semester' | 'year';

export function ReportsPage() {
  const { dataset, globalFilters, notify } = useClassbook();
  const [tab, setTab] = useState<ReportTab>('week');
  const [week, setWeek] = useState<number>(globalFilters.week);
  const [month, setMonth] = useState<number>(3);
  const [semester, setSemester] = useState<SemesterId>(globalFilters.semester);
  const [grade, setGrade] = useState<GradeLevel | 'ALL'>('ALL');
  const [generated, setGenerated] = useState(true);
  const [remarks, setRemarks] = useState(
    'Nhìn chung các lớp thực hiện nghiêm túc việc ghi chép Sổ đầu bài điện tử đúng thời gian quy định. Đề nghị các lớp còn thiếu tiết khẩn trương rà soát bổ sung và phát huy tinh thần tự quản giờ học.'
  );

  const reportData = useMemo(() => {
    if (!dataset) return { rankings: [], lessons: [] };
    const options = {
      schoolYear: globalFilters.schoolYear,
      scope: tab,
      week,
      month,
      semester,
      grade,
    };
    const rankings = computeClassRankings(
      dataset.classes,
      dataset.lessons,
      dataset.lockedWeeks,
      options
    );
    const lessons = filterLessonsByScope(dataset.lessons, options);
    return { rankings, lessons };
  }, [dataset, globalFilters.schoolYear, tab, week, month, semester, grade]);

  if (!dataset) return null;

  const scopeTitle =
    tab === 'week'
      ? `TUẦN ${week}`
      : tab === 'month'
        ? `THÁNG THI ĐUA ${month}`
        : tab === 'semester'
          ? semester === 'HK1'
            ? 'HỌC KỲ I'
            : 'HỌC KỲ II'
          : 'CẢ NĂM HỌC';

  const handlePrintPdf = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportLessonsToExcel(
      reportData.lessons,
      `Bao_Cao_Thi_Dua_${scopeTitle.replace(/\s+/g, '_')}_${globalFilters.schoolYear}.xlsx`
    );
    notify('success', 'Đã xuất tệp Excel báo cáo thi đua.');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Báo cáo thi đua hành chính"
        subtitle="Chọn phạm vi → Tạo báo cáo → Chỉnh sửa nhận xét → Xuất bản in PDF hoặc Excel."
        actions={
          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold hover:border-[#16A34A]"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
              <span>Xuất Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold"
            >
              <Printer className="w-4 h-4" />
              <span>Xuất PDF / In văn bản</span>
            </button>
          </div>
        }
      />

      {/* 4 Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-print">
        {(
          [
            { id: 'week', label: 'Báo cáo tuần' },
            { id: 'month', label: 'Báo cáo tháng' },
            { id: 'semester', label: 'Báo cáo học kỳ' },
            { id: 'year', label: 'Báo cáo năm học' },
          ] as { id: ReportTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
              tab === t.id
                ? 'bg-[#2563EB] text-white'
                : 'bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 text-[#64748B]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <Card className="p-4 space-y-3 no-print">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tab === 'week' && (
            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                Tuần báo cáo
              </label>
              <select
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {Array.from({ length: 39 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w}
                  </option>
                ))}
              </select>
            </div>
          )}
          {tab === 'month' && (
            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                Tháng thi đua
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            </div>
          )}
          {tab === 'semester' && (
            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                Học kỳ
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value as SemesterId)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="HK1">Học kỳ I</option>
                <option value="HK2">Học kỳ II</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Phạm vi khối
            </label>
            <select
              value={String(grade)}
              onChange={(e) =>
                setGrade(
                  e.target.value === 'ALL'
                    ? 'ALL'
                    : (Number(e.target.value) as GradeLevel)
                )
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="ALL">Toàn trường</option>
              <option value="10">Khối 10</option>
              <option value="11">Khối 11</option>
              <option value="12">Khối 12</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setGenerated(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold"
            >
              <FileText className="w-4 h-4" />
              <span>Tạo bản xem trước</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
            Chỉnh sửa nhận xét chung của văn bản
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>
      </Card>

      {/* Administrative Document Preview */}
      {generated && (
        <Card className="p-6 sm:p-10 bg-white text-[#0F172A] dark:bg-slate-900 dark:text-slate-100 print-document max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center text-xs mb-6">
            <div>
              <div className="font-semibold uppercase">SỞ GIÁO DỤC VÀ ĐÀO TẠO</div>
              <div className="font-bold uppercase text-sm mt-0.5">
                {dataset.settings.schoolName}
              </div>
              <div className="w-28 h-px bg-slate-400 mx-auto my-1.5" />
              <div className="text-[11px] text-[#64748B]">
                Số: .../BC-SĐBĐT
              </div>
            </div>
            <div>
              <div className="font-bold uppercase">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </div>
              <div className="font-semibold mt-0.5">
                Độc lập - Tự do - Hạnh phúc
              </div>
              <div className="w-36 h-px bg-slate-400 mx-auto my-1.5" />
              <div className="italic text-[11px] text-[#64748B]">
                Ngày {new Date().toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-base sm:text-lg font-bold uppercase">
              BÁO CÁO TỔNG HỢP THI ĐUA SỔ ĐẦU BÀI {scopeTitle}
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Năm học {globalFilters.schoolYear} · Phạm vi:{' '}
              {grade === 'ALL' ? 'Toàn trường' : `Khối ${grade}`}
            </p>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <th className="border border-slate-300 dark:border-slate-700 py-2 px-3 text-center">
                    Hạng
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 py-2 px-3 text-left">
                    Lớp
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 py-2 px-3 text-right">
                    Số tiết đã nhập
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 py-2 px-3 text-right">
                    Tỷ lệ hoàn thành
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 py-2 px-3 text-right">
                    Điểm trung bình
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 py-2 px-3 text-center">
                    Tiết Tốt
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.rankings.map((row) => (
                  <tr key={row.classId}>
                    <td className="border border-slate-300 dark:border-slate-700 py-1.5 px-3 text-center font-bold tabular-nums">
                      {row.rank}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 py-1.5 px-3 font-semibold">
                      {row.className}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 py-1.5 px-3 text-right tabular-nums">
                      {row.enteredLessons}/{row.expectedLessons}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 py-1.5 px-3 text-right tabular-nums">
                      {formatPercent(row.completionRate)}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 py-1.5 px-3 text-right font-bold tabular-nums">
                      {formatScore(row.averageScore)}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 py-1.5 px-3 text-center tabular-nums">
                      {row.totCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-8 text-xs leading-relaxed">
            <div className="font-bold uppercase mb-1">Nhận xét & Đề xuất:</div>
            <p>{remarks}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 text-center text-xs">
            <div>
              <div className="font-bold uppercase">TM. BAN CHẤP HÀNH ĐOÀN TRƯỜNG</div>
              <div className="italic text-[11px] text-[#64748B] mt-0.5">(Ký và ghi rõ họ tên)</div>
              <div className="h-16" />
              <div className="font-semibold">ThS. Phạm Ngọc Diệp</div>
            </div>
            <div>
              <div className="font-bold uppercase">HIỆU TRƯỞNG PHÊ DUYỆT</div>
              <div className="italic text-[11px] text-[#64748B] mt-0.5">(Ký tên, đóng dấu)</div>
              <div className="h-16" />
              <div className="font-semibold">{dataset.settings.principalName}</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
