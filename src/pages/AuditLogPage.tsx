import React, { useMemo, useState } from 'react';
import { Clock, ShieldCheck } from 'lucide-react';
import { useClassbook } from '../context/ClassbookContext';
import { Card, PageHeader, StatusTag } from '../components/ui/BadgesAndPrimitives';

export function AuditLogPage() {
  const { dataset } = useClassbook();
  const [filterDate, setFilterDate] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterAction, setFilterAction] = useState('ALL');

  const logs = useMemo(() => {
    if (!dataset) return [];
    return dataset.auditLogs.filter((log) => {
      if (filterDate && !log.timestamp.startsWith(filterDate)) return false;
      if (filterClass !== 'ALL' && log.className !== filterClass) return false;
      if (filterAction !== 'ALL' && log.action !== filterAction) return false;
      return true;
    });
  }, [dataset, filterDate, filterClass, filterAction]);

  if (!dataset) return null;

  const actionTypes = Array.from(
    new Set(dataset.auditLogs.map((l) => l.action))
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lịch sử hoạt động (Nhật ký bất biến)"
        subtitle="Ghi nhận đầy đủ thao tác thay đổi dữ liệu, chốt tuần và lý do điều chỉnh. Không cho phép chỉnh sửa hoặc xóa nhật ký."
        actions={
          <StatusTag tone="blue" label="Chỉ đọc · Toàn vẹn dữ liệu" />
        }
      />

      <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
            Lọc theo ngày
          </label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
            Lớp liên quan
          </label>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="ALL">Tất cả lớp</option>
            {dataset.classes.map((c) => (
              <option key={c.id} value={c.name}>
                Lớp {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
            Loại thao tác
          </label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="ALL">Tất cả thao tác</option>
            {actionTypes.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Timeline + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#2563EB]" />
            <span>Dòng thời gian gần nhất</span>
          </h2>
          <div className="space-y-4 border-l border-slate-200 dark:border-slate-800 pl-4 ml-1.5">
            {logs.slice(0, 6).map((log) => (
              <div key={log.id} className="relative">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] absolute -left-[21px] top-1" />
                <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                  {log.action} {log.className ? `· ${log.className}` : ''}
                </div>
                <div className="text-[11px] text-[#64748B] mt-0.5">
                  {log.actorName} ({log.actorRole}) ·{' '}
                  {new Date(log.timestamp).toLocaleString('vi-VN')}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                  {log.summary}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B]">
                  <th className="py-3 px-4 font-semibold">Thời gian</th>
                  <th className="py-3 px-4 font-semibold">Người thực hiện</th>
                  <th className="py-3 px-4 font-semibold">Hành động & Nội dung</th>
                  <th className="py-3 px-4 font-semibold">Trước → Sau</th>
                  <th className="py-3 px-4 font-semibold">Lý do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 px-4 tabular-nums whitespace-nowrap text-[#64748B]">
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold">{log.actorName}</div>
                      <div className="text-[11px] text-[#64748B]">{log.actorRole}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#2563EB]">
                        {log.action}
                        {log.className ? ` (${log.className})` : ''}
                      </div>
                      <div className="text-slate-700 dark:text-slate-300">{log.summary}</div>
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      {log.beforeData && (
                        <div className="text-[#64748B]">Trước: {log.beforeData}</div>
                      )}
                      {log.afterData && (
                        <div className="text-[#16A34A] font-medium">
                          Sau: {log.afterData}
                        </div>
                      )}
                      {!log.beforeData && !log.afterData && '—'}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {log.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-xs text-[#64748B]">
        <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
        <span>Nhật ký hoạt động được bảo vệ chỉ đọc để phục vụ kiểm tra minh bạch.</span>
      </div>
    </div>
  );
}
