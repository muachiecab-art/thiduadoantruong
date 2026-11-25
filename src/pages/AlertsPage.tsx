import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Info,
  TriangleAlert,
} from 'lucide-react';
import { useActiveAlerts, useClassbook } from '../context/ClassbookContext';
import {
  Card,
  EmptyState,
  PageHeader,
  StatusTag,
} from '../components/ui/BadgesAndPrimitives';

type AlertTab = 'missing' | 'score-drop' | 'check-needed' | 'resolved';

export function AlertsPage() {
  const { resolveAlert, notify, setActivePage } = useClassbook();
  const alerts = useActiveAlerts();
  const [activeTab, setActiveTab] = useState<AlertTab>('missing');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const tabItems: { id: AlertTab; label: string; count: number }[] = [
    {
      id: 'missing',
      label: 'Tiết chưa nhập',
      count: alerts.filter((a) => a.category === 'missing').length,
    },
    {
      id: 'score-drop',
      label: 'Thi đua giảm',
      count: alerts.filter((a) => a.category === 'score-drop').length,
    },
    {
      id: 'check-needed',
      label: 'Dữ liệu cần kiểm tra',
      count: alerts.filter((a) => a.category === 'check-needed').length,
    },
    {
      id: 'resolved',
      label: 'Đã xử lý',
      count: alerts.filter((a) => a.category === 'resolved').length,
    },
  ];

  const visibleAlerts = alerts.filter((a) => a.category === activeTab);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await resolveAlert(id);
      notify('success', 'Đã đánh dấu cảnh báo đã xử lý.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Thao tác thất bại');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cảnh báo thông minh"
        subtitle="Tổng hợp khách quan các tiết chưa nhập, biến động điểm giữa các tuần và bản ghi cần rà soát."
      />

      {/* Advisory note */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-[#0F172A] dark:text-slate-200">
        <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
        <span>
          Cảnh báo biến động điểm chỉ mang tính hỗ trợ công tác chủ nhiệm và nề nếp, không sử dụng để suy đoán hoặc quy kết gian lận.
        </span>
      </div>

      {/* 4 Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#2563EB] text-white'
                : 'bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 text-[#64748B]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[11px] tabular-nums ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {visibleAlerts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 className="w-6 h-6 text-[#16A34A]" />}
            title="Không có cảnh báo trong mục này"
            description="Hệ thống chưa ghi nhận vấn đề cần xử lý thêm ở nhóm cảnh báo đang chọn."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleAlerts.map((alert) => (
            <Card key={alert.id} className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                      Lớp {alert.className}
                    </span>
                    <StatusTag
                      tone={
                        alert.resolved
                          ? 'green'
                          : alert.severity === 'Cao'
                            ? 'red'
                            : alert.severity === 'Trung bình'
                              ? 'amber'
                              : 'blue'
                      }
                      label={
                        alert.resolved ? 'Đã xử lý' : `Mức độ: ${alert.severity}`
                      }
                    />
                    <span className="text-xs text-[#64748B] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {alert.timestamp}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                    {!alert.resolved && (
                      <TriangleAlert
                        className={`w-4 h-4 shrink-0 ${
                          alert.severity === 'Cao'
                            ? 'text-[#DC2626]'
                            : 'text-[#D97706]'
                        }`}
                      />
                    )}
                    <span>{alert.title}</span>
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-slate-400">
                    {alert.description}
                  </p>
                  <div className="text-xs font-medium text-[#0F172A] dark:text-slate-200 pt-1">
                    Dữ liệu liên quan: <span className="text-[#2563EB]">{alert.relatedData}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {alert.category === 'missing' && (
                    <button
                      type="button"
                      onClick={() => setActivePage('lesson-entry')}
                      className="px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold hover:border-[#2563EB]"
                    >
                      Bổ sung tiết
                    </button>
                  )}
                  {!alert.resolved && (
                    <button
                      type="button"
                      disabled={resolvingId === alert.id}
                      onClick={() => handleResolve(alert.id)}
                      className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      {resolvingId === alert.id ? 'Đang xử lý...' : 'Đánh dấu đã xử lý'}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
