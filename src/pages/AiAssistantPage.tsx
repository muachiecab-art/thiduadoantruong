import React, { useState } from 'react';
import {
  AlertCircle,
  PlusCircle,
  Send,
  Sparkles,
} from 'lucide-react';
import { useClassbook } from '../context/ClassbookContext';
import { Card, PageHeader } from '../components/ui/BadgesAndPrimitives';

interface RankingSnapshotRow {
  hang: number;
  lop: string;
  khoi: number;
  diemTrungBinh: string;
  soTietDaNhap: string;
  tyLeHoanThanh: string;
  trangThai: string;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
  tableData?: RankingSnapshotRow[];
}

const SUGGESTED_QUESTIONS = [
  'Tổng hợp xếp hạng thi đua tuần này và nêu Top 3 lớp dẫn đầu.',
  'Tiêu chí nào (Học tập, Kỉ luật, Vệ sinh, Chuyên cần) đang có tỷ lệ đạt thấp nhất toàn trường?',
  'Liệt kê các lớp còn thiếu tiết hoặc cần lưu ý trong tuần hiện tại.',
  'Đề xuất biện pháp hỗ trợ các lớp có điểm Sổ đầu bài giảm so với tuần trước.',
];

export function AiAssistantPage() {
  const { token, dataset, globalFilters } = useClassbook();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const sendMessage = async (textToSend?: string) => {
    const prompt = (textToSend ?? input).trim();
    if (!prompt || sending) return;

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: prompt,
    };
    setMessages((prev) => [...prev, userTurn]);
    if (!textToSend) setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: prompt,
          week: globalFilters.week,
        }),
      });
      const rawText = await res.text().catch(() => '');
      let data: {
        reply?: string;
        error?: string;
        verifiedContext?: { rankingsTopAndAll?: RankingSnapshotRow[] };
      } = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = {};
        }
      }
      const snapshotTable: RankingSnapshotRow[] | undefined =
        data?.verifiedContext?.rankingsTopAndAll;

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'error',
            text:
              data.error ||
              'Không thể kết nối Trợ lý AI lúc này. Các chức năng khác vẫn hoạt động bình thường.',
            tableData: snapshotTable,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            text: data.reply || 'Không nhận được phản hồi từ Trợ lý AI.',
            tableData: snapshotTable,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'error',
          text: 'Lỗi kết nối mạng khi gọi Trợ lý AI. Các module Sổ đầu bài khác vẫn hoạt động bình thường.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!dataset) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <PageHeader
        title="Trợ lý AI Phân tích Thi đua"
        subtitle={`Sử dụng dữ liệu thực tế đã tính toán chuẩn xác cho Tuần ${globalFilters.week} (${dataset.settings.schoolName}).`}
        actions={
          <button
            type="button"
            onClick={() => setMessages([])}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold hover:border-[#2563EB]"
          >
            <PlusCircle className="w-4 h-4 text-[#2563EB]" />
            <span>Hội thoại mới</span>
          </button>
        }
      />

      <Card className="flex flex-col min-h-[520px] overflow-hidden">
        {/* Top Greeting & Suggested Questions when empty */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[60vh]">
          {messages.length === 0 ? (
            <div className="py-6 space-y-6">
              <div className="flex flex-col items-center text-center max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-[#123B80] text-white flex items-center justify-center mb-3 shadow-xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                  Xin chào! Tôi là Trợ lý Phân tích Sổ đầu bài
                </h2>
                <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
                  Mọi điểm trung bình, thứ hạng và tỷ lệ hoàn thành đều được hệ thống tính toán chính xác bằng thuật toán trước khi phân tích.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 hover:border-[#2563EB] hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-left text-xs font-medium text-[#0F172A] dark:text-slate-200 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#2563EB] text-white'
                        : msg.role === 'error'
                          ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[#0F172A] dark:text-slate-100'
                          : 'bg-slate-50 dark:bg-slate-800/70 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-100'
                    }`}
                  >
                    {msg.role === 'error' && (
                      <div className="flex items-center gap-1.5 font-bold text-[#D97706] mb-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>Thông báo từ dịch vụ AI</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {msg.tableData && msg.tableData.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 overflow-x-auto">
                        <div className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 mb-1.5">
                          Bảng số liệu thực tế Tuần {globalFilters.week}:
                        </div>
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-[#64748B]">
                              <th className="py-1 pr-2">Hạng</th>
                              <th className="py-1 pr-2">Lớp</th>
                              <th className="py-1 pr-2 text-right">ĐTB</th>
                              <th className="py-1 pr-2 text-right">Số tiết</th>
                              <th className="py-1">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {msg.tableData.slice(0, 6).map((r) => (
                              <tr key={r.lop}>
                                <td className="py-1 pr-2 font-bold tabular-nums">#{r.hang}</td>
                                <td className="py-1 pr-2 font-semibold">{r.lop}</td>
                                <td className="py-1 pr-2 text-right font-bold tabular-nums text-[#2563EB]">
                                  {r.diemTrungBinh}
                                </td>
                                <td className="py-1 pr-2 text-right tabular-nums">
                                  {r.soTietDaNhap}
                                </td>
                                <td className="py-1">{r.trangThai}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="text-xs text-[#64748B] italic">
                  Đang tổng hợp dữ liệu và phân tích...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input footer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-3 sm:p-4 border-t border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi về tình hình Sổ đầu bài hoặc thi đua..."
            aria-label="Câu hỏi cho Trợ lý AI"
            className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-slate-50 dark:bg-slate-950 outline-none focus:border-[#2563EB]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Gửi</span>
          </button>
        </form>
      </Card>
    </div>
  );
}
