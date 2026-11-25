import React, { useMemo, useState } from 'react';
import { AlertTriangle, Edit3, Plus, Search, Trash2 } from 'lucide-react';
import { useClassbook } from '../context/ClassbookContext';
import { SubjectItem } from '../types/classbook';
import {
  Card,
  ModalDialog,
  PageHeader,
  StatusTag,
} from '../components/ui/BadgesAndPrimitives';

export function SubjectsPage() {
  const { dataset, createSubject, updateSubject, deleteSubject, notify } = useClassbook();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectItem | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubjectItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    if (!dataset) return [];
    const q = search.trim().toLowerCase();
    return dataset.subjects.filter((s) => {
      if (!q) return true;
      return `${s.code} ${s.name}`.toLowerCase().includes(q);
    });
  }, [dataset, search]);

  const openAdd = () => {
    setEditing(null);
    setCode('');
    setName('');
    setDialogOpen(true);
  };

  const openEdit = (sub: SubjectItem) => {
    setEditing(sub);
    setCode(sub.code);
    setName(sub.name);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateSubject(editing.id, { code: code.trim().toUpperCase(), name: name.trim() });
        notify('success', `Đã cập nhật môn ${name.trim()}.`);
      } else {
        await createSubject({ code: code.trim().toUpperCase(), name: name.trim() });
        notify('success', `Đã thêm môn ${name.trim()}.`);
      }
      setDialogOpen(false);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Thao tác thất bại');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (sub: SubjectItem) => {
    const next =
      sub.status === 'Đang giảng dạy' ? 'Ngừng sử dụng' : 'Đang giảng dạy';
    try {
      await updateSubject(sub.id, { status: next });
      notify(
        'info',
        `Môn ${sub.name} chuyển sang "${next}". Dữ liệu Sổ đầu bài lịch sử vẫn được bảo toàn.`
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Thao tác thất bại');
    }
  };

  const deleteImpact = useMemo(() => {
    if (!dataset || !deleteTarget) return { lessons: 0, timetable: 0 };
    return {
      lessons: dataset.lessons.filter((l) => l.subjectId === deleteTarget.id).length,
      timetable: dataset.timetable.filter((t) => t.subjectId === deleteTarget.id).length,
    };
  }, [dataset, deleteTarget]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSubject(deleteTarget.id);
      notify('success', `Đã xóa môn ${deleteTarget.name} (${deleteTarget.code}) khỏi danh mục.`);
      setDeleteTarget(null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Không thể xóa môn học');
    } finally {
      setDeleting(false);
    }
  };

  if (!dataset) return null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quản lý môn học"
        subtitle="Khi ngừng sử dụng môn học, dữ liệu lịch sử trong Sổ đầu bài vẫn được giữ nguyên vẹn."
        actions={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm môn học</span>
          </button>
        }
      />

      <div className="flex justify-end">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã môn hoặc tên môn..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B]">
                <th className="py-3 px-4 font-semibold">Mã môn</th>
                <th className="py-3 px-4 font-semibold">Tên môn học</th>
                <th className="py-3 px-4 font-semibold">Trạng thái</th>
                <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-mono font-bold text-[#2563EB]">{s.code}</td>
                  <td className="py-3 px-4 font-semibold text-[#0F172A] dark:text-white">
                    {s.name}
                  </td>
                  <td className="py-3 px-4">
                    <StatusTag
                      tone={s.status === 'Đang giảng dạy' ? 'green' : 'slate'}
                      label={s.status}
                    />
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:border-[#2563EB] whitespace-nowrap shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sửa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(s)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-[#64748B] hover:border-slate-300 dark:hover:border-slate-600 whitespace-nowrap shrink-0"
                      >
                        {s.status === 'Đang giảng dạy' ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 font-semibold text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/40 whitespace-nowrap shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ModalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? `Cập nhật môn ${editing.name}` : 'Thêm môn học mới'}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1">Mã môn</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ví dụ: TOAN"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Tên môn học</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Toán học"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
            >
              {saving ? 'Đang lưu...' : 'Lưu môn học'}
            </button>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Xác nhận xóa môn học"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60">
              <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-[#0F172A] dark:text-slate-200 space-y-1">
                <p>
                  Bạn sắp xóa môn{' '}
                  <span className="font-bold">
                    {deleteTarget.code} · {deleteTarget.name}
                  </span>{' '}
                  khỏi danh mục môn học.
                </p>
                {(deleteImpact.lessons > 0 || deleteImpact.timetable > 0) ? (
                  <p className="text-[#64748B] dark:text-slate-400">
                    Đang liên kết với{' '}
                    <span className="font-semibold tabular-nums text-[#0F172A] dark:text-slate-200">
                      {deleteImpact.lessons}
                    </span>{' '}
                    tiết trong Sổ đầu bài và{' '}
                    <span className="font-semibold tabular-nums text-[#0F172A] dark:text-slate-200">
                      {deleteImpact.timetable}
                    </span>{' '}
                    tiết Thời khóa biểu. Dữ liệu tiết học lịch sử vẫn giữ nguyên tên môn, còn các ô TKB liên quan sẽ được gỡ khỏi lịch.
                  </p>
                ) : (
                  <p className="text-[#64748B] dark:text-slate-400">
                    Môn học này chưa phát sinh tiết học hoặc lịch phân công nào.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium whitespace-nowrap"
              >
                Hủy
              </button>
              {deleteTarget.status === 'Đang giảng dạy' && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={async () => {
                    const target = deleteTarget;
                    setDeleteTarget(null);
                    await toggleStatus(target);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Vô hiệu hóa thay vì xóa
                </button>
              )}
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-red-700 text-white text-xs font-semibold whitespace-nowrap disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
              </button>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
