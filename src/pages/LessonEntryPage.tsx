import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Mic,
  Minus,
  Plus,
  Save,
  Sparkles,
} from 'lucide-react';
import { useClassbook } from '../context/ClassbookContext';
import { CriteriaScores, SemesterId } from '../types/classbook';
import {
  classifyLesson,
  computeTotalScore,
  formatScore,
  parseLocaleDecimal,
  validateCriteriaScores,
} from '../utils/scoring';
import {
  Card,
  ModalDialog,
  PageHeader,
  RatingBadge,
} from '../components/ui/BadgesAndPrimitives';

export function LessonEntryPage() {
  const {
    dataset,
    user,
    globalFilters,
    createLesson,
    notify,
    setActivePage,
    pendingLessonDraft,
    setPendingLessonDraft,
  } = useClassbook();

  const defaultClassId = useMemo(() => {
    if (user?.role === 'LPHT' && user.assignedClassId) {
      return user.assignedClassId;
    }
    return pendingLessonDraft?.classId || dataset?.classes[0]?.id || '';
  }, [user, pendingLessonDraft, dataset]);

  const [schoolYear, setSchoolYear] = useState(globalFilters.schoolYear);
  const [semester, setSemester] = useState<SemesterId>(globalFilters.semester);
  const [week, setWeek] = useState<number>(globalFilters.week);
  const [date, setDate] = useState('2025-11-24');
  const [classId, setClassId] = useState(defaultClassId);
  const [period, setPeriod] = useState<number>(pendingLessonDraft?.period || 1);
  const [subjectId, setSubjectId] = useState(
    pendingLessonDraft?.subjectId || dataset?.subjects[0]?.id || ''
  );
  const [teacherName, setTeacherName] = useState(
    pendingLessonDraft?.teacherName || ''
  );
  const [lessonContent, setLessonContent] = useState('');

  // NEVER pre-fill maximum scores by default
  const [scoreInputs, setScoreInputs] = useState({
    hocTap: '',
    kiLuat: '',
    veSinh: '',
    chuyenCan: '',
  });

  const [notes, setNotes] = useState('');
  const [teacherComment, setTeacherComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [smartModalOpen, setSmartModalOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');

  useEffect(() => {
    if (defaultClassId && !classId) {
      setClassId(defaultClassId);
    }
  }, [defaultClassId, classId]);

  useEffect(() => {
    if (pendingLessonDraft) {
      if (pendingLessonDraft.classId && user?.role !== 'LPHT') {
        setClassId(pendingLessonDraft.classId);
      }
      if (pendingLessonDraft.period) setPeriod(pendingLessonDraft.period);
      if (pendingLessonDraft.subjectId) setSubjectId(pendingLessonDraft.subjectId);
      if (pendingLessonDraft.teacherName) setTeacherName(pendingLessonDraft.teacherName);
      setPendingLessonDraft(null);
    }
  }, [pendingLessonDraft, setPendingLessonDraft, user]);

  // Auto-fill teacher from timetable assignment if teacherName is empty or matches previous auto-fill
  useEffect(() => {
    if (!dataset || !classId || !subjectId) return;
    const slot = dataset.timetable.find(
      (t) => t.classId === classId && t.subjectId === subjectId
    );
    if (slot) {
      setTeacherName(slot.teacherName);
    }
  }, [dataset, classId, subjectId]);

  const rules = dataset?.settings.scoringRules;

  const parsedScores = useMemo((): Partial<CriteriaScores> => {
    return {
      hocTap: parseLocaleDecimal(scoreInputs.hocTap) ?? undefined,
      kiLuat: parseLocaleDecimal(scoreInputs.kiLuat) ?? undefined,
      veSinh: parseLocaleDecimal(scoreInputs.veSinh) ?? undefined,
      chuyenCan: parseLocaleDecimal(scoreInputs.chuyenCan) ?? undefined,
    };
  }, [scoreInputs]);

  const allScoresEntered =
    parsedScores.hocTap !== undefined &&
    parsedScores.kiLuat !== undefined &&
    parsedScores.veSinh !== undefined &&
    parsedScores.chuyenCan !== undefined;

  const liveTotal = useMemo(() => {
    if (!allScoresEntered) return null;
    return computeTotalScore(parsedScores as CriteriaScores);
  }, [allScoresEntered, parsedScores]);

  const liveRating = useMemo(() => {
    if (liveTotal === null) return null;
    return classifyLesson(liveTotal, rules);
  }, [liveTotal, rules]);

  const stepScore = (
    key: keyof typeof scoreInputs,
    delta: number,
    max: number
  ) => {
    setScoreInputs((prev) => {
      const current = parseLocaleDecimal(prev[key]) ?? 0;
      const next = Math.max(0, Math.min(max, Math.round((current + delta) * 10) / 10));
      return { ...prev, [key]: String(next).replace('.', ',') };
    });
  };

  const resetForNextPeriod = () => {
    setPeriod((p) => (p >= 5 ? 1 : p + 1));
    setLessonContent('');
    setScoreInputs({ hocTap: '', kiLuat: '', veSinh: '', chuyenCan: '' });
    setNotes('');
    setTeacherComment('');
  };

  const handleSave = async (mode: 'draft' | 'save' | 'save-next') => {
    if (!lessonContent.trim()) {
      notify('error', 'Vui lòng nhập nội dung bài học.');
      return;
    }

    if (mode !== 'draft') {
      const check = validateCriteriaScores(parsedScores, rules);
      if (!check.valid) {
        notify('error', check.errors.join(' '));
        return;
      }
    }

    const scoresToSend: CriteriaScores = {
      hocTap: parsedScores.hocTap ?? 0,
      kiLuat: parsedScores.kiLuat ?? 0,
      veSinh: parsedScores.veSinh ?? 0,
      chuyenCan: parsedScores.chuyenCan ?? 0,
    };

    setSubmitting(true);
    try {
      await createLesson({
        schoolYear,
        semester,
        week,
        date,
        classId,
        period,
        subjectId,
        teacherName,
        lessonContent: lessonContent.trim(),
        scores: scoresToSend,
        notes: notes.trim(),
        teacherComment: teacherComment.trim(),
        status: mode === 'draft' ? 'Nháp' : 'Đã lưu',
      });

      if (mode === 'draft') {
        notify('info', `Đã lưu nháp Tiết ${period}.`);
      } else {
        notify('success', `Đã lưu Tiết ${period} thành công!`);
      }

      if (mode === 'save-next') {
        resetForNextPeriod();
      } else if (mode === 'save') {
        setActivePage('classbook');
      }
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Lưu tiết học thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus(
        'Trình duyệt hiện tại chưa hỗ trợ nhận diện giọng nói trực tiếp (Web Speech API). Vui lòng nhập trực tiếp nội dung.'
      );
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new SpeechRecognition() as any;
      recognition.lang = 'vi-VN';
      recognition.interimResults = false;
      setVoiceListening(true);
      setVoiceStatus('Đang lắng nghe tiếng Việt...');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setLessonContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setVoiceStatus(`Đã nhận dạng: "${transcript}"`);
        }
        setVoiceListening(false);
      };
      recognition.onerror = () => {
        setVoiceStatus('Không thu được âm thanh. Vui lòng kiểm tra quyền micro.');
        setVoiceListening(false);
      };
      recognition.onend = () => setVoiceListening(false);
      recognition.start();
    } catch {
      setVoiceListening(false);
      setVoiceStatus('Không thể khởi tạo micro.');
    }
  };

  if (!dataset) return null;

  const activeSubjects = dataset.subjects.filter(
    (s) => s.status === 'Đang giảng dạy'
  );

  const criteriaConfig: {
    key: keyof typeof scoreInputs;
    label: string;
    max: number;
    hint: string;
  }[] = [
    {
      key: 'hocTap',
      label: 'Học tập',
      max: rules?.hocTapMax ?? 3,
      hint: `Thang điểm 0 – ${formatScore(rules?.hocTapMax ?? 3)}`,
    },
    {
      key: 'kiLuat',
      label: 'Kỉ luật',
      max: rules?.kiLuatMax ?? 3,
      hint: `Thang điểm 0 – ${formatScore(rules?.kiLuatMax ?? 3)}`,
    },
    {
      key: 'veSinh',
      label: 'Vệ sinh',
      max: rules?.veSinhMax ?? 2,
      hint: `Thang điểm 0 – ${formatScore(rules?.veSinhMax ?? 2)}`,
    },
    {
      key: 'chuyenCan',
      label: 'Chuyên cần',
      max: rules?.chuyenCanMax ?? 2,
      hint: `Thang điểm 0 – ${formatScore(rules?.chuyenCanMax ?? 2)}`,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader
        title="Nhập tiết học Sổ đầu bài"
        subtitle="Giao diện nhập nhanh 3 bước, không tự điền điểm tối đa để đảm bảo đánh giá thực chất."
        actions={
          <button
            type="button"
            onClick={() => setSmartModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#0F172A] dark:text-slate-100 hover:border-[#2563EB] transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[#2563EB]" />
            <span>Nhập thông minh</span>
          </button>
        }
      />

      {/* Khung 1 – Thông tin tiết học */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
            1. Thông tin tiết học
          </h2>
          {user?.role === 'LPHT' && (
            <span className="text-xs font-medium text-[#2563EB]">
              Tự động chọn lớp {user.assignedClassName}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="entry-year" className="block text-xs font-medium mb-1">
              Năm học
            </label>
            <select
              id="entry-year"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
            </select>
          </div>

          <div>
            <label htmlFor="entry-sem" className="block text-xs font-medium mb-1">
              Học kỳ
            </label>
            <select
              id="entry-sem"
              value={semester}
              onChange={(e) => setSemester(e.target.value as SemesterId)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="HK1">Học kỳ I</option>
              <option value="HK2">Học kỳ II</option>
            </select>
          </div>

          <div>
            <label htmlFor="entry-week" className="block text-xs font-medium mb-1">
              Tuần (1–39)
            </label>
            <select
              id="entry-week"
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {Array.from({ length: 39 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Tuần {w}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="entry-date" className="block text-xs font-medium mb-1">
              Ngày học
            </label>
            <input
              id="entry-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div>
            <label htmlFor="entry-class" className="block text-xs font-medium mb-1">
              Lớp
            </label>
            <select
              id="entry-class"
              disabled={user?.role === 'LPHT'}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
            >
              {dataset.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="entry-period" className="block text-xs font-medium mb-1">
              Tiết
            </label>
            <select
              id="entry-period"
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {[1, 2, 3, 4, 5].map((p) => (
                <option key={p} value={p}>
                  Tiết {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="entry-subject" className="block text-xs font-medium mb-1">
              Môn học
            </label>
            <select
              id="entry-subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {activeSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="entry-teacher" className="block text-xs font-medium mb-1">
              Giáo viên bộ môn
            </label>
            <input
              id="entry-teacher"
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="Tên giáo viên"
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div className="col-span-2 sm:col-span-4">
            <label htmlFor="entry-content" className="block text-xs font-medium mb-1">
              Nội dung bài học <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="entry-content"
              type="text"
              value={lessonContent}
              onChange={(e) => setLessonContent(e.target.value)}
              placeholder="Ví dụ: Chương II - Bài 3: Hàm số bậc hai"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>
      </Card>

      {/* Khung 2 – Đánh giá (4 ô điểm lớn, không điền sẵn) */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
            2. Đánh giá tiết học (Thang điểm 3–3–2–2)
          </h2>
          <span className="text-xs text-[#64748B]">
            Nhập số thập phân (ví dụ: 2,8 hoặc 2.8)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {criteriaConfig.map((item) => {
            const parsed = parseLocaleDecimal(scoreInputs[item.key]);
            const invalid =
              scoreInputs[item.key].trim() !== '' &&
              (parsed === null || parsed < 0 || parsed > item.max);

            return (
              <div
                key={item.key}
                className={`p-3.5 rounded-2xl border transition-colors ${
                  invalid
                    ? 'border-[#DC2626] bg-red-50/40 dark:bg-red-950/20'
                    : 'border-[#E2E8F0] dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor={`score-${item.key}`}
                    className="text-xs font-bold text-[#0F172A] dark:text-white"
                  >
                    {item.label}
                  </label>
                  <span className="text-[11px] text-[#64748B]">{item.hint}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={`Giảm điểm ${item.label}`}
                    onClick={() => stepScore(item.key, -0.1, item.max)}
                    className="w-10 h-11 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    id={`score-${item.key}`}
                    type="text"
                    inputMode="decimal"
                    placeholder="—"
                    value={scoreInputs[item.key]}
                    onChange={(e) =>
                      setScoreInputs((prev) => ({
                        ...prev,
                        [item.key]: e.target.value,
                      }))
                    }
                    className="w-full h-11 text-center text-xl font-bold tabular-nums rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:border-[#2563EB]"
                  />
                  <button
                    type="button"
                    aria-label={`Tăng điểm ${item.label}`}
                    onClick={() => stepScore(item.key, 0.1, item.max)}
                    className="w-10 h-11 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {invalid && (
                  <p className="text-[11px] text-[#DC2626] mt-1">
                    Giá trị hợp lệ từ 0 đến {formatScore(item.max)}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Tổng điểm tự động và xếp loại ngay bên dưới */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-[#64748B] dark:text-slate-400">
              Tổng điểm tiết học (tính tự động, giữ nguyên độ chính xác)
            </div>
            <div className="text-2xl font-bold tabular-nums text-[#2563EB] dark:text-blue-400 mt-0.5">
              {liveTotal !== null ? `${formatScore(liveTotal)} / 10` : 'Chưa nhập đủ 4 tiêu chí'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B]">Xếp loại dự kiến:</span>
            {liveRating ? (
              <RatingBadge rating={liveRating} />
            ) : (
              <span className="text-xs font-medium text-slate-400">—</span>
            )}
          </div>
        </div>
      </Card>

      {/* Khung 3 – Hoàn thành */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-[#0F172A] dark:text-white mb-4">
          3. Ghi chú & Hoàn thành
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="entry-notes" className="block text-xs font-medium mb-1">
              Ghi chú tiết học
            </label>
            <textarea
              id="entry-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Học sinh vắng, tình hình trật tự, vệ sinh lớp..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label htmlFor="entry-comment" className="block text-xs font-medium mb-1">
              Nhận xét của giáo viên
            </label>
            <textarea
              id="entry-comment"
              rows={2}
              value={teacherComment}
              onChange={(e) => setTeacherComment(e.target.value)}
              placeholder="Đánh giá chung về tinh thần học tập..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave('draft')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Lưu nháp</span>
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave('save')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Lưu tiết học</span>
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave('save-next')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Lưu và nhập tiết tiếp theo</span>
          </button>
        </div>
      </Card>

      {/* Smart Input Dialog */}
      <ModalDialog
        open={smartModalOpen}
        onClose={() => setSmartModalOpen(false)}
        title="Nhập thông minh"
        description="Hỗ trợ đọc nội dung bài học bằng giọng nói hoặc đối chiếu trạng thái quét ảnh sổ giấy."
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Mic className="w-4 h-4 text-[#2563EB]" />
                <span>Nhập nội dung bài học bằng giọng nói (tiếng Việt)</span>
              </div>
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={voiceListening}
                className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold disabled:opacity-60"
              >
                {voiceListening ? 'Đang nghe...' : 'Bắt đầu nói'}
              </button>
            </div>
            {voiceStatus && (
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                {voiceStatus}
              </p>
            )}
          </div>

          <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Camera className="w-4 h-4 text-[#D97706]" />
              <span>Nhập từ ảnh chụp Sổ đầu bài giấy (OCR)</span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              Trạng thái: Chưa triển khai nhận dạng OCR ảnh sổ giấy ở phiên bản hiện tại. Vui lòng sử dụng nhập trực tiếp hoặc chức năng Import Excel 13 cột.
            </p>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
}
