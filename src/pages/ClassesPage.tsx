import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Search } from 'lucide-react';
import { useClassbook } from '../context/ClassbookContext';
import { GradeLevel, SchoolClass } from '../types/classbook';
import {
  Card,
  ModalDialog,
  PageHeader,
  StatusTag,
} from '../components/ui/BadgesAndPrimitives';

export function ClassesPage() {
  const { dataset, createClass, updateClass, notify } = useClassbook();
  const [gradeTab, setGradeTab] = useState<GradeLevel | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | null>(null);

  const [name, setName] = useState('');
  const [grade, setGrade] = useState<GradeLevel>(10);
  const [gvcn, setGvcn] = useState('');
  const [lpht, setLpht] = useState('');
  const [studentCount, setStudentCount] = useState('42');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!dataset) return [];
    const q = search.trim().toLowerCase();
    return dataset.classes.filter((c) => {
      if (gradeTab !== 'ALL' && c.grade !== gradeTab) return false;
      if (q) {
        const hay = `${c.name} ${c.homeroomTeacher} ${c.lphtName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dataset, gradeTab, search]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setGrade(10);
    setGvcn('');
    setLpht('');
    setStudentCount('42');
    setDialogOpen(true);
  };

  const openEdit = (cls: SchoolClass) => {
    setEditing(cls);
    setName(cls.name);
    setGrade(cls.grade);
    setGvcn(cls.homeroomTeacher);
    setLpht(cls.lphtName);
    setStudentCount(String(cls.studentCount));
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        grade,
        homeroomTeacher: gvcn.trim(),
        lphtName: lpht.trim() || 'Chưa phân công',
        studentCount: Number(studentCount) || 40,
      };
      if (editing) {
        await updateClass(editing.id, payload);
        notify('success', `Đã cập nhật lớp ${payload.name}.`);
      } else {
        await createClass(payload);
        notify('success', `Đã thêm lớp ${payload.name}.`);
      }
      setDialogOpen(false);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Lưu lớp thất bại');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (cls: SchoolClass) => {
    const nextStatus = cls.status === 'Hoạt động' ? 'Tạm ngưng' : 'Hoạt động';
    try {
      await updateClass(cls.id, { status: nextStatus });
      notify('info', `Đã chuyển trạng thái lớp ${cls.name}: ${nextStatus}.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Thao tác thất bại');
    }
  };

  if (!dataset) return null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quản lý lớp học"
        subtitle="Danh sách các lớp phân theo Khối 10, 11, 12 và thông tin GVCN, LPHT phụ trách."
        actions={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm lớp mới</span>
          </button>
        }
      />

      {/* Grade Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'ALL', label: 'Tất cả' },
              { id: 10, label: 'Khối 10' },
              { id: 11, label: 'Khối 11' },
              { id: 12, label: 'Khối 12' },
            ] as { id: GradeLevel | 'ALL'; label: string }[]
          ).map((t) => (
            <button
              key={String(t.id)}
              type="button"
              onClick={() => setGradeTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
                gradeTab === t.id
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 text-[#64748B]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm lớp, GVCN, LPHT..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      {/* Desktop 7-column Table */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B]">
                <th className="py-3 px-4 font-semibold">Lớp</th>
                <th className="py-3 px-4 font-semibold">Khối</th>
                <th className="py-3 px-4 font-semibold">Giáo viên chủ nhiệm</th>
                <th className="py-3 px-4 font-semibold">Lớp phó học tập</th>
                <th className="py-3 px-4 font-semibold text-right">Sĩ số</th>
                <th className="py-3 px-4 font-semibold">Trạng thái</th>
                <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-bold text-[#0F172A] dark:text-white">
                    {c.name}
                  </td>
                  <td className="py-3 px-4">Khối {c.grade}</td>
                  <td className="py-3 px-4">{c.homeroomTeacher}</td>
                  <td className="py-3 px-4">{c.lphtName}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{c.studentCount}</td>
                  <td className="py-3 px-4">
                    <StatusTag
                      tone={c.status === 'Hoạt động' ? 'green' : 'slate'}
                      label={c.status}
                    />
                  </td>
                  <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:border-[#2563EB]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStatus(c)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-[#64748B]"
                    >
                      {c.status === 'Hoạt động' ? 'Tạm ngưng' : 'Kích hoạt'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((c) => (
          <Card key={c.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold">
                Lớp {c.name} · Khối {c.grade}
              </div>
              <StatusTag
                tone={c.status === 'Hoạt động' ? 'green' : 'slate'}
                label={c.status}
              />
            </div>
            <div className="text-xs text-[#64748B] space-y-0.5">
              <div>GVCN: {c.homeroomTeacher}</div>
              <div>LPHT: {c.lphtName} · Sĩ số: {c.studentCount}</div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => openEdit(c)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Chỉnh sửa
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <ModalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? `Cập nhật lớp ${editing.name}` : 'Thêm lớp học mới'}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Tên lớp</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: 10A5"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Khối</label>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value) as GradeLevel)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value={10}>Khối 10</option>
                <option value={11}>Khối 11</option>
                <option value={12}>Khối 12</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Giáo viên chủ nhiệm</label>
            <input
              type="text"
              required
              value={gvcn}
              onChange={(e) => setGvcn(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Lớp phó học tập</label>
              <input
                type="text"
                value={lpht}
                onChange={(e) => setLpht(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Sĩ số</label>
              <input
                type="number"
                min={1}
                max={65}
                value={studentCount}
                onChange={(e) => setStudentCount(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
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
              {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm lớp'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
