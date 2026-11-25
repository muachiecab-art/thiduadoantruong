import React, { useState } from 'react';
import { Download, Save } from 'lucide-react';
import { useClassbook } from '../context/ClassbookContext';
import { SchoolSettings, SemesterId } from '../types/classbook';
import { Card, PageHeader } from '../components/ui/BadgesAndPrimitives';

type SettingsTab =
  | 'school'
  | 'year'
  | 'scoring'
  | 'ranking'
  | 'notifications'
  | 'security'
  | 'backup';

export function SettingsPage() {
  const { dataset, user, updateSettings, notify } = useClassbook();
  const [tab, setTab] = useState<SettingsTab>('school');
  const [draft, setDraft] = useState<SchoolSettings | null>(
    dataset ? structuredClone(dataset.settings) : null
  );
  const [saving, setSaving] = useState(false);

  if (!dataset || !draft) return null;

  const isAdmin = user?.role === 'Admin';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      await updateSettings(draft);
      notify('success', 'Đã lưu cấu hình hệ thống.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Lưu cài đặt thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleBackupDownload = () => {
    const blob = new Blob([JSON.stringify(dataset, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_SmartClassbook_${draft.currentSchoolYear}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('success', 'Đã tải xuống bản sao lưu dữ liệu JSON.');
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'school', label: 'Thông tin trường' },
    { id: 'year', label: 'Năm học và học kỳ' },
    { id: 'scoring', label: 'Quy định thang điểm' },
    { id: 'ranking', label: 'Quy tắc xếp hạng' },
    { id: 'notifications', label: 'Thông báo' },
    { id: 'security', label: 'Bảo mật' },
    { id: 'backup', label: 'Sao lưu dữ liệu' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cài đặt hệ thống"
        subtitle="Chỉ Quản trị viên (Admin) được phép điều chỉnh thông số hệ thống."
      />

      {/* 7 Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
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

      <Card className="p-5">
        <form onSubmit={handleSave} className="space-y-4">
          {tab === 'school' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Tên trường</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={draft.schoolName}
                  onChange={(e) => setDraft({ ...draft, schoolName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Hiệu trưởng</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={draft.principalName}
                  onChange={(e) => setDraft({ ...draft, principalName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Khẩu hiệu (Slogan)</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={draft.slogan}
                  onChange={(e) => setDraft({ ...draft, slogan: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Địa chỉ</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={draft.address}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
          )}

          {tab === 'year' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Năm học hiện tại</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={draft.currentSchoolYear}
                  onChange={(e) =>
                    setDraft({ ...draft, currentSchoolYear: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Học kỳ hiện tại</label>
                <select
                  disabled={!isAdmin}
                  value={draft.currentSemester}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      currentSemester: e.target.value as SemesterId,
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="HK1">Học kỳ I</option>
                  <option value="HK2">Học kỳ II</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Tuần hiện tại (1–39)</label>
                <input
                  type="number"
                  min={1}
                  max={39}
                  disabled={!isAdmin}
                  value={draft.currentWeek}
                  onChange={(e) =>
                    setDraft({ ...draft, currentWeek: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                />
              </div>
            </div>
          )}

          {tab === 'scoring' && (
            <div className="space-y-4">
              <p className="text-xs text-[#64748B]">
                Công thức chuẩn 3–3–2–2 (Tổng 10 điểm) và ngưỡng xếp loại tiết học.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Học tập tối đa</label>
                  <input
                    type="number"
                    step="0.5"
                    disabled={!isAdmin}
                    value={draft.scoringRules.hocTapMax}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        scoringRules: {
                          ...draft.scoringRules,
                          hocTapMax: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Kỉ luật tối đa</label>
                  <input
                    type="number"
                    step="0.5"
                    disabled={!isAdmin}
                    value={draft.scoringRules.kiLuatMax}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        scoringRules: {
                          ...draft.scoringRules,
                          kiLuatMax: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Vệ sinh tối đa</label>
                  <input
                    type="number"
                    step="0.5"
                    disabled={!isAdmin}
                    value={draft.scoringRules.veSinhMax}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        scoringRules: {
                          ...draft.scoringRules,
                          veSinhMax: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Chuyên cần tối đa</label>
                  <input
                    type="number"
                    step="0.5"
                    disabled={!isAdmin}
                    value={draft.scoringRules.chuyenCanMax}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        scoringRules: {
                          ...draft.scoringRules,
                          chuyenCanMax: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Mức Tốt (&ge;)</label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!isAdmin}
                    value={draft.scoringRules.totMin}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        scoringRules: {
                          ...draft.scoringRules,
                          totMin: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Mức Khá (&ge;)</label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!isAdmin}
                    value={draft.scoringRules.khaMin}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        scoringRules: {
                          ...draft.scoringRules,
                          khaMin: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Mức Đạt (&ge;)</label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!isAdmin}
                    value={draft.scoringRules.datMin}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        scoringRules: {
                          ...draft.scoringRules,
                          datMin: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'ranking' && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <strong>Quy tắc bất biến:</strong> Tiết chưa nhập không bị tính là 0 điểm khi tính trung bình cộng thi đua.
              </div>
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={draft.rankingRules.requireConfirmation}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      rankingRules: {
                        ...draft.rankingRules,
                        requireConfirmation: e.target.checked,
                      },
                    })
                  }
                />
                <span>Yêu cầu xác nhận giáo viên trước khi đưa vào xếp hạng chính thức</span>
              </label>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Ngưỡng cảnh báo giảm điểm giữa 2 tuần
                </label>
                <input
                  type="number"
                  step="0.1"
                  disabled={!isAdmin}
                  value={draft.notifications.alertScoreDropThreshold}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      notifications: {
                        ...draft.notifications,
                        alertScoreDropThreshold: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Nhắc nhập tiết thiếu sau (giờ)
                </label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={draft.notifications.alertMissingHours}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      notifications: {
                        ...draft.notifications,
                        alertMissingHours: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                />
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-3 text-xs">
              <div className="max-w-xs">
                <label className="block text-xs font-semibold mb-1">
                  Thời gian hết hạn phiên đăng nhập (phút)
                </label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={draft.security.sessionTimeoutMinutes}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      security: {
                        ...draft.security,
                        sessionTimeoutMinutes: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                />
              </div>
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={draft.security.requireReasonOnEdit}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      security: {
                        ...draft.security,
                        requireReasonOnEdit: e.target.checked,
                      },
                    })
                  }
                />
                <span>Bắt buộc nhập lý do khi chỉnh sửa bản ghi đã lưu</span>
              </label>
            </div>
          )}

          {tab === 'backup' && (
            <div className="space-y-3">
              <p className="text-xs text-[#64748B]">
                Tải xuống toàn bộ dữ liệu Sổ đầu bài, danh mục lớp, môn học, thời khóa biểu và nhật ký hoạt động dưới dạng tệp JSON chuẩn.
              </p>
              <button
                type="button"
                onClick={handleBackupDownload}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#2563EB] text-[#2563EB] text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                <Download className="w-4 h-4" />
                <span>Tải bản sao lưu JSON</span>
              </button>
            </div>
          )}

          {tab !== 'backup' && isAdmin && (
            <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
              </button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
