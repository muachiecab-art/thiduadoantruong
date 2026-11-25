import React, { useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  FileCheck,
  Info,
  Printer,
} from 'lucide-react';
import { useClassbook } from '../context/ClassbookContext';
import { DigitalBookRecord, SemesterId } from '../types/classbook';
import { formatScore } from '../utils/scoring';
import {
  Card,
  ModalDialog,
  PageHeader,
  StatusTag,
} from '../components/ui/BadgesAndPrimitives';

export function DigitalArchivePage() {
  const { dataset, user, closeDigitalBook, notify } = useClassbook();
  const [filterYear, setFilterYear] = useState('2025-2026');
  const [filterSem, setFilterSem] = useState<SemesterId | 'ALL'>('ALL');
  const [inspectBook, setInspectBook] = useState<DigitalBookRecord | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  const canCloseBook = user?.role === 'Admin' || user?.role === 'Cán bộ Đoàn';

  const books = useMemo(() => {
    if (!dataset) return [];
    return dataset.digitalBooks.filter((b) => {
      if (user?.role === 'LPHT' && user.assignedClassId && b.classId !== user.assignedClassId) {
        return false;
      }
      if (b.schoolYear !== filterYear) return false;
      if (filterSem !== 'ALL' && b.semester !== filterSem) return false;
      return true;
    });
  }, [dataset, user, filterYear, filterSem]);

  const inspectLessons = useMemo(() => {
    if (!dataset || !inspectBook) return [];
    return dataset.lessons
      .filter(
        (l) =>
          l.classId === inspectBook.classId &&
          l.schoolYear === inspectBook.schoolYear &&
          l.semester === inspectBook.semester &&
          l.status !== 'Nháp'
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period);
  }, [dataset, inspectBook]);

  const handleCloseBook = async (id: string) => {
    setClosingId(id);
    try {
      await closeDigitalBook(id);
      notify('success', 'Đã đóng quyển Sổ đầu bài điện tử.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Đóng quyển thất bại');
    } finally {
      setClosingId(null);
    }
  };

  if (!dataset) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kho Sổ đầu bài số"
        subtitle="Thư viện lưu trữ Sổ đầu bài điện tử theo từng năm học, học kỳ và lớp."
      />

      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-700 text-xs text-[#64748B] dark:text-slate-300">
        <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
        <span>
          Lưu ý pháp lý: Thao tác xác nhận đóng quyển và mã phiên bản hồ sơ phục vụ lưu trữ quản lý nội bộ nhà trường, không thay thế chữ ký số hợp pháp theo quy định giao dịch điện tử.
        </span>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <select
          aria-label="Chọn năm học lưu trữ"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
        >
          <option value="2025-2026">Năm học 2025-2026</option>
          <option value="2024-2025">Năm học 2024-2025</option>
        </select>
        <select
          aria-label="Chọn học kỳ lưu trữ"
          value={filterSem}
          onChange={(e) => setFilterSem(e.target.value as SemesterId | 'ALL')}
          className="px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
        >
          <option value="ALL">Tất cả học kỳ</option>
          <option value="HK1">Học kỳ I</option>
          <option value="HK2">Học kỳ II</option>
        </select>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {books.map((book) => {
          const liveCount = dataset.lessons.filter(
            (l) =>
              l.classId === book.classId &&
              l.schoolYear === book.schoolYear &&
              l.semester === book.semester &&
              l.status !== 'Nháp'
          ).length;

          return (
            <Card key={book.id} className="p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                        Sổ đầu bài Lớp {book.className}
                      </h3>
                      <div className="text-[11px] text-[#64748B]">
                        {book.schoolYear} · {book.semester} · Phiên bản {book.version}
                      </div>
                    </div>
                  </div>
                  <StatusTag
                    tone={
                      book.status === 'Đã đóng quyển'
                        ? 'green'
                        : book.status === 'Đã chốt'
                          ? 'blue'
                          : 'amber'
                    }
                    label={book.status}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-[11px] text-[#64748B]">Số tiết lưu trữ</div>
                    <div className="font-bold tabular-nums mt-0.5">{liveCount} tiết</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-[11px] text-[#64748B]">Ngày chốt</div>
                    <div className="font-semibold mt-0.5">
                      {book.closedAt
                        ? new Date(book.closedAt).toLocaleDateString('vi-VN')
                        : 'Chưa chốt'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInspectBook(book)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold hover:border-[#2563EB]"
                >
                  <FileCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Xem & Xuất PDF</span>
                </button>
                {canCloseBook && book.status !== 'Đã đóng quyển' && (
                  <button
                    type="button"
                    disabled={closingId === book.id}
                    onClick={() => handleCloseBook(book.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#123B80] hover:bg-blue-900 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Đóng quyển</span>
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Inspect Digital Book Modal */}
      <ModalDialog
        open={!!inspectBook}
        onClose={() => setInspectBook(null)}
        title={
          inspectBook
            ? `Hồ sơ Sổ đầu bài điện tử · Lớp ${inspectBook.className}`
            : ''
        }
        description={
          inspectBook
            ? `${inspectBook.schoolYear} · ${inspectBook.semester} · ${inspectLessons.length} tiết`
            : ''
        }
        maxWidth="max-w-3xl"
      >
        {inspectBook && (
          <div className="space-y-4">
            <div className="flex justify-end no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                <Printer className="w-4 h-4" />
                <span>In / Xuất PDF quyển sổ</span>
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto border border-[#E2E8F0] dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B]">
                    <th className="py-2 px-3">Ngày</th>
                    <th className="py-2 px-3">Tuần</th>
                    <th className="py-2 px-3">Tiết</th>
                    <th className="py-2 px-3">Môn & Nội dung</th>
                    <th className="py-2 px-3 text-right">Điểm</th>
                    <th className="py-2 px-3">Xếp loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inspectLessons.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2 px-3 tabular-nums whitespace-nowrap">{l.date}</td>
                      <td className="py-2 px-3 tabular-nums">T{l.week}</td>
                      <td className="py-2 px-3 tabular-nums">Tiết {l.period}</td>
                      <td className="py-2 px-3">
                        <div className="font-semibold">{l.subjectName}</div>
                        <div className="text-[11px] text-[#64748B]">{l.lessonContent}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-bold tabular-nums text-[#2563EB]">
                        {formatScore(l.totalScore)}
                      </td>
                      <td className="py-2 px-3">{l.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
