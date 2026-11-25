import React, { useState } from 'react';
import { Lock, LogIn, ShieldCheck, UserCheck } from 'lucide-react';
import { useClassbook } from '../../context/ClassbookContext';
import { UserRole } from '../../types/classbook';

export function LoginScreen() {
  const { loginWithCredentials, switchDemoRole } = useClassbook();
  const [contact, setContact] = useState('admin@chuvanan.edu.vn');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg('');
    setSubmitting(true);
    try {
      await loginWithCredentials(contact, password);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-white flex items-center justify-center shrink-0">
            <img
              src="/src/assets/images/school_crest_logo_1795589268302.jpg"
              alt="Trường THPT Chu Văn An"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0F172A] dark:text-white">
              SMART CLASSBOOK AI
            </h1>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              Trường THPT Chu Văn An · Số hóa mỗi tiết học
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-contact"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Email / Số điện thoại
            </label>
            <input
              id="login-contact"
              type="text"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:border-[#2563EB]"
              placeholder="admin@chuvanan.edu.vn"
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:border-[#2563EB]"
                placeholder="Nhập mật khẩu"
              />
            </div>
          </div>

          {errMsg && (
            <div className="text-xs font-medium text-[#DC2626] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">
              {errMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            <LogIn className="w-4 h-4" />
            <span>{submitting ? 'Đang xác thực...' : 'Đăng nhập'}</span>
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-[#64748B] dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Truy cập nhanh theo phân quyền</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { role: 'Admin', label: 'Quản trị viên' },
                { role: 'Cán bộ Đoàn', label: 'Cán bộ Đoàn' },
                { role: 'LPHT', label: 'LPHT 10A1' },
              ] as { role: UserRole; label: string }[]
            ).map((item) => (
              <button
                key={item.role}
                type="button"
                onClick={() => switchDemoRole(item.role)}
                className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#2563EB] hover:bg-blue-50/60 dark:hover:bg-blue-950/30 text-xs font-medium transition-colors"
              >
                <UserCheck className="w-4 h-4 text-[#2563EB]" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
