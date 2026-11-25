import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { useClassbook } from '../context/ClassbookContext';
import {
  buildLessonFromParsedRow,
  downloadExcelTemplate,
  EXCEL_13_COLUMNS,
  exportLessonsToExcel,
  ParsedExcelRow,
  parseAndValidateExcelFile,
} from '../utils/excel';
import { formatScore } from '../utils/scoring';
import { Card, PageHeader, StatusTag } from '../components/ui/BadgesAndPrimitives';

export function ExcelPage() {
  const { dataset, user, globalFilters, importLessons, notify } = useClassbook();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [columnsValid, setColumnsValid] = useState(false);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedExcelRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [exportWeek, setExportWeek] = useState<number | 'ALL'>(globalFilters.week);

  if (!dataset) return null;

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const errorRows = parsedRows.filter((r) => r.errors.length > 0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    try {
      const result = await parseAndValidateExcelFile(
        file,
        dataset.classes,
        dataset.subjects
      );
      setColumnsValid(result.columnsValid);
      setMissingColumns(result.missingColumns);
      setParsedRows(result.rows);
      setStep(2);
    } catch {
      notify('error', 'Không thể đọc tệp Excel. Vui lòng kiểm tra định dạng .xlsx.');
    }
  };

  const handleConfirmImport = async () => {
    if (validRows.length === 0) {
      notify('error', 'Không có dòng hợp lệ nào để lưu.');
      return;
    }
    setImporting(true);
    try {
      const lessonsToInsert = validRows.map((r) =>
        buildLessonFromParsedRow(r, user?.fullName || 'Import Excel')
      );
      const count = await importLessons(lessonsToInsert);
      notify('success', `Đã lưu thành công ${count} tiết học từ tệp Excel.`);
      setStep(1);
      setSelectedFileName('');
      setParsedRows([]);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Import thất bại');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const list = dataset.lessons.filter(
      (l) =>
        l.schoolYear === globalFilters.schoolYear &&
        (exportWeek === 'ALL' || l.week === exportWeek) &&
        (user?.role !== 'LPHT' || l.classId === user.assignedClassId)
    );
    exportLessonsToExcel(
      list,
      `So_Dau_Bai_${exportWeek === 'ALL' ? 'Ca_Nam' : `Tuan_${exportWeek}`}_${globalFilters.schoolYear}.xlsx`
    );
    notify('success', `Đã xuất ${list.length} tiết học ra tệp Excel.`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Import / Export Excel"
        subtitle="Giữ nguyên chuẩn tệp mẫu 13 cột để nhập và xuất dữ liệu Sổ đầu bài nhanh chóng."
      />

      {/* 3 Main Functional Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Tải file mẫu */}
        <Card className="p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold">1. Tải file Excel mẫu (13 cột)</h2>
            <p className="text-xs text-[#64748B] mt-1">
              Bao gồm đầy đủ 13 cột chuẩn: {EXCEL_13_COLUMNS.slice(0, 6).join(', ')}... đến Chuyên cần (0–2).
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              downloadExcelTemplate(globalFilters.schoolYear);
              notify('success', 'Đã tải xuống tệp mẫu Excel 13 cột.');
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#2563EB] text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs font-semibold"
          >
            <Download className="w-4 h-4" />
            <span>Tải file Excel mẫu</span>
          </button>
        </Card>

        {/* Card 2: Import 4 bước */}
        <Card className="p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold">2. Import dữ liệu (4 bước)</h2>
            <p className="text-xs text-[#64748B] mt-1">
              Chọn file → Kiểm tra cấu trúc 13 cột → Xem trước & rà lỗi → Xác nhận lưu.
            </p>
          </div>
          <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Chọn tệp .xlsx để Import</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </Card>

        {/* Card 3: Export dữ liệu */}
        <Card className="p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-[#D97706] flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold">3. Export dữ liệu Sổ đầu bài</h2>
            <p className="text-xs text-[#64748B] mt-1">
              Xuất toàn bộ các tiết đã ghi nhận kèm tổng điểm và xếp loại.
            </p>
            <select
              aria-label="Chọn tuần xuất Excel"
              value={exportWeek}
              onChange={(e) =>
                setExportWeek(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="mt-3 w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="ALL">Tất cả các tuần ({globalFilters.schoolYear})</option>
              {Array.from({ length: 39 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Tuần {w}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            <Download className="w-4 h-4" />
            <span>Xuất dữ liệu Excel</span>
          </button>
        </Card>
      </div>

      {/* 4-step Import Wizard */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0] dark:border-slate-800">
          <div className="text-sm font-bold">Quy trình Import 4 bước</div>
          <div className="flex items-center gap-2 text-xs">
            {(
              [
                { num: 1, label: '1. Chọn file' },
                { num: 2, label: '2. Kiểm tra' },
                { num: 3, label: '3. Xem trước' },
                { num: 4, label: '4. Xác nhận lưu' },
              ] as const
            ).map((s) => (
              <span
                key={s.num}
                className={`px-2.5 py-1 rounded-lg font-semibold ${
                  step >= s.num
                    ? 'bg-blue-50 text-[#2563EB] dark:bg-blue-950/50 dark:text-blue-400'
                    : 'text-[#64748B]'
                }`}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {step === 1 && (
          <p className="text-xs text-[#64748B]">
            Chưa có tệp nào được chọn. Hãy tải tệp mẫu 13 cột ở trên hoặc chọn tệp `.xlsx` sẵn có để bắt đầu kiểm tra.
          </p>
        )}

        {step >= 2 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
              <div>
                Tệp đã chọn: <strong>{selectedFileName}</strong> · Tổng{' '}
                <strong>{parsedRows.length}</strong> dòng ({validRows.length} hợp lệ,{' '}
                <span className="text-[#DC2626] font-semibold">
                  {errorRows.length} lỗi
                </span>
                )
              </div>
              <StatusTag
                tone={columnsValid ? 'green' : 'red'}
                label={
                  columnsValid
                    ? 'Đúng cấu trúc 13 cột'
                    : `Thiếu cột: ${missingColumns.join(', ')}`
                }
              />
            </div>

            {step === 2 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!columnsValid || parsedRows.length === 0}
                  onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold disabled:opacity-50"
                >
                  Tiếp tục: Xem trước dữ liệu
                </button>
              </div>
            )}

            {step >= 3 && (
              <>
                <div className="overflow-x-auto max-h-72 border border-[#E2E8F0] dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-[#64748B] border-b border-[#E2E8F0] dark:border-slate-800">
                        <th className="py-2 px-3">Dòng</th>
                        <th className="py-2 px-3">Tuần / Ngày</th>
                        <th className="py-2 px-3">Lớp / Tiết</th>
                        <th className="py-2 px-3">Môn học</th>
                        <th className="py-2 px-3 text-right">Tổng điểm</th>
                        <th className="py-2 px-3">Kiểm tra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedRows.map((row) => (
                        <tr key={row.rowIndex}>
                          <td className="py-2 px-3 tabular-nums">{row.rowIndex}</td>
                          <td className="py-2 px-3 tabular-nums">
                            T{row.week} · {row.date}
                          </td>
                          <td className="py-2 px-3">
                            {row.className} · Tiết {row.period}
                          </td>
                          <td className="py-2 px-3">{row.subjectName}</td>
                          <td className="py-2 px-3 text-right font-bold tabular-nums">
                            {row.errors.length === 0 ? formatScore(row.totalScore) : '—'}
                          </td>
                          <td className="py-2 px-3">
                            {row.errors.length === 0 ? (
                              <StatusTag tone="green" label="Hợp lệ" />
                            ) : (
                              <span className="text-[#DC2626] font-medium">
                                {row.errors.join('; ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setParsedRows([]);
                      setSelectedFileName('');
                    }}
                    className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={importing || validRows.length === 0}
                    onClick={() => {
                      setStep(4);
                      handleConfirmImport();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {importing
                        ? 'Đang lưu...'
                        : `Xác nhận lưu (${validRows.length} tiết hợp lệ)`}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
