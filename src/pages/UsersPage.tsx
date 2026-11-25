import React, { useMemo, useState } from 'react';
import { Edit3, KeyRound, Lock, Plus, Unlock } from 'lucide-react';
import { useClassbook } from '../context/ClassbookContext';
import { UserAccount, UserRole } from '../types/classbook';
import {
  Card,
  ModalDialog,
  PageHeader,
  StatusTag,
} from '../components/ui/BadgesAndPrimitives';

type UserTab = 'ALL' | UserRole;

export function UsersPage() {
  const {
    dataset,
    user,
    createUser,
    updateUser,
    resetUserPassword,
    notify,
  } = useClassbook();

  const [tab, setTab] = useState<UserTab>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [resetTarget, setResetTarget] = useState<UserAccount | null>(null);

  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [role, setRole] = useState<UserRole>('LPHT');
  const [assignedClassId, setAssignedClassId] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredUsers = useMemo(() => {
    if (!dataset) return [];
    if (tab === 'ALL') return dataset.users;
    return dataset.users.filter((u) => u.role === tab);
  }, [dataset, tab]);

  if (!dataset || user?.role !== 'Admin') {
    return (
      <Card className="p-8 text-center text-sm text-[#DC2626] font-semibold">
        Chỉ Quản trị viên (Admin) mới có quyền truy cập trang Quản lý người dùng.
      </Card>
    );
  }

  const openAdd = () => {
    setEditing(null);
    setFullName('');
    setContact('');
    setRole('LPHT');
    setAssignedClassId(dataset.classes[0]?.id || '');
    setInitialPassword('');
    setDialogOpen(true);
  };

  const openEdit = (acc: UserAccount) => {
    setEditing(acc);
    setFullName(acc.fullName);
    setContact(acc.contact);
    setRole(acc.role);
    setAssignedClassId(acc.assignedClassId || dataset.classes[0]?.id || '');
    setInitialPassword('');
    setDialogOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateUser(editing.id, {
          fullName: fullName.trim(),
          contact: contact.trim(),
          role,
          assignedClassId: role === 'LPHT' ? assignedClassId : undefined,
        });
        notify('success', `Đã cập nhật tài khoản ${fullName.trim()}.`);
      } else {
        await createUser({
          fullName: fullName.trim(),
          contact: contact.trim(),
          role,
          assignedClassId: role === 'LPHT' ? assignedClassId : undefined,
          initialPassword: initialPassword || 'Chuvanan@2026',
        });
        notify('success', `Đã tạo tài khoản ${fullName.trim()}.`);
      }
      setDialogOpen(false);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Thao tác thất bại');
    } finally {
      setSaving(false);
    }
  };

  const toggleLock = async (acc: UserAccount) => {
    const nextStatus = acc.status === 'Hoạt động' ? 'Đã khóa' : 'Hoạt động';
    try {
      await updateUser(acc.id, { status: nextStatus });
      notify('info', `Tài khoản ${acc.fullName}: ${nextStatus}.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Thao tác thất bại');
    }
  };

  const handleConfirmResetPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    try {
      await resetUserPassword(resetTarget.id, newResetPassword);
      notify('success', `Đã đặt lại mật khẩu cho ${resetTarget.fullName}.`);
      setResetTarget(null);
      setNewResetPassword('');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quản lý người dùng"
        subtitle="Phân quyền tài khoản Admin, Cán bộ Đoàn và Lớp phó học tập. Mật khẩu được mã hóa an toàn trên máy chủ."
        actions={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm tài khoản</span>
          </button>
        }
      />

      {/* 4 Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'ALL', label: 'Tất cả' },
            { id: 'Admin', label: 'Admin' },
            { id: 'Cán bộ Đoàn', label: 'Cán bộ Đoàn' },
            { id: 'LPHT', label: 'LPHT' },
          ] as { id: UserTab; label: string }[]
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

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B]">
                <th className="py-3 px-4 font-semibold">Họ tên</th>
                <th className="py-3 px-4 font-semibold">Email / SĐT</th>
                <th className="py-3 px-4 font-semibold">Vai trò</th>
                <th className="py-3 px-4 font-semibold">Lớp phụ trách</th>
                <th className="py-3 px-4 font-semibold">Trạng thái</th>
                <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-bold text-[#0F172A] dark:text-white">
                    {acc.fullName}
                  </td>
                  <td className="py-3 px-4">{acc.contact}</td>
                  <td className="py-3 px-4">
                    <StatusTag
                      tone={
                        acc.role === 'Admin'
                          ? 'blue'
                          : acc.role === 'Cán bộ Đoàn'
                            ? 'green'
                            : 'slate'
                      }
                      label={acc.role}
                    />
                  </td>
                  <td className="py-3 px-4">{acc.assignedClassName || 'Toàn trường'}</td>
                  <td className="py-3 px-4">
                    <StatusTag
                      tone={acc.status === 'Hoạt động' ? 'green' : 'red'}
                      label={acc.status}
                    />
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(acc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setResetTarget(acc);
                        setNewResetPassword('');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-[#2563EB]"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Đặt lại MK</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleLock(acc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-[#D97706]"
                    >
                      {acc.status === 'Hoạt động' ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Khóa</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Mở khóa</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit User Modal */}
      <ModalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? `Cập nhật tài khoản` : 'Thêm tài khoản mới'}
      >
        <form onSubmit={handleSaveUser} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1">Họ và tên</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Email / Số điện thoại</label>
            <input
              type="text"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Vai trò</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Admin">Admin</option>
                <option value="Cán bộ Đoàn">Cán bộ Đoàn</option>
                <option value="LPHT">LPHT</option>
              </select>
            </div>
            {role === 'LPHT' && (
              <div>
                <label className="block text-xs font-semibold mb-1">Lớp phụ trách</label>
                <select
                  value={assignedClassId}
                  onChange={(e) => setAssignedClassId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {dataset.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Lớp {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {!editing && (
            <div>
              <label className="block text-xs font-semibold mb-1">
                Mật khẩu khởi tạo (mặc định nếu để trống: Chuvanan@2026)
              </label>
              <input
                type="password"
                value={initialPassword}
                onChange={(e) => setInitialPassword(e.target.value)}
                placeholder="Nhập mật khẩu khởi tạo"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          )}
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
              {saving ? 'Đang lưu...' : 'Lưu tài khoản'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Reset Password Modal */}
      <ModalDialog
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title={
          resetTarget ? `Đặt lại mật khẩu · ${resetTarget.fullName}` : ''
        }
        description="Mật khẩu cũ không thể xem lại. Hãy cấp mật khẩu tạm mới."
      >
        <form onSubmit={handleConfirmResetPass} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1">Mật khẩu mới</label>
            <input
              type="password"
              required
              minLength={6}
              value={newResetPassword}
              onChange={(e) => setNewResetPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setResetTarget(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
            >
              Xác nhận đặt lại
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
