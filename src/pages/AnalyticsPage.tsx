import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useClassbook } from '../context/ClassbookContext';
import {
  averageScoresExact,
  computeCriteriaBreakdown,
  formatPercent,
  formatScore,
} from '../utils/scoring';
import { Card, PageHeader } from '../components/ui/BadgesAndPrimitives';

type AnalyticsTab = 'overview' | 'by-class' | 'by-subject' | 'trend' | 'compare';

export function AnalyticsPage() {
  const { dataset, globalFilters, user } = useClassbook();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [compareClassA, setCompareClassA] = useState('c-10a1');
  const [compareClassB, setCompareClassB] = useState('c-12a1');

  const scopedLessons = useMemo(() => {
    if (!dataset) return [];
    return dataset.lessons.filter(
      (l) =>
        l.schoolYear === globalFilters.schoolYear &&
        l.status !== 'Nháp' &&
        (user?.role !== 'LPHT' || l.classId === user.assignedClassId)
    );
  }, [dataset, globalFilters.schoolYear, user]);

  const criteriaRadarData = useMemo(() => {
    if (!dataset) return [];
    const breakdown = computeCriteriaBreakdown(
      scopedLessons,
      dataset.settings.scoringRules
    );
    return [
      {
        subject: 'Học tập (3đ)',
        tyLeDat: Math.round(breakdown.hocTapPct * 10) / 10,
        diemTB: breakdown.hocTapAvg ?? 0,
      },
      {
        subject: 'Kỉ luật (3đ)',
        tyLeDat: Math.round(breakdown.kiLuatPct * 10) / 10,
        diemTB: breakdown.kiLuatAvg ?? 0,
      },
      {
        subject: 'Vệ sinh (2đ)',
        tyLeDat: Math.round(breakdown.veSinhPct * 10) / 10,
        diemTB: breakdown.veSinhAvg ?? 0,
      },
      {
        subject: 'Chuyên cần (2đ)',
        tyLeDat: Math.round(breakdown.chuyenCanPct * 10) / 10,
        diemTB: breakdown.chuyenCanAvg ?? 0,
      },
    ];
  }, [dataset, scopedLessons]);

  const byClassData = useMemo(() => {
    if (!dataset) return [];
    return dataset.classes
      .filter((c) => user?.role !== 'LPHT' || c.id === user.assignedClassId)
      .map((c) => {
        const clsLessons = scopedLessons.filter((l) => l.classId === c.id);
        return {
          name: c.name,
          diemTB: averageScoresExact(clsLessons.map((l) => l.totalScore)) ?? 0,
          soTiet: clsLessons.length,
        };
      });
  }, [dataset, scopedLessons, user]);

  const bySubjectData = useMemo(() => {
    if (!dataset) return [];
    return dataset.subjects
      .map((s) => {
        const subLessons = scopedLessons.filter((l) => l.subjectId === s.id);
        return {
          name: s.name,
          diemTB: averageScoresExact(subLessons.map((l) => l.totalScore)) ?? 0,
          soTiet: subLessons.length,
        };
      })
      .filter((item) => item.soTiet > 0);
  }, [dataset, scopedLessons]);

  const weeklyTrend = useMemo(() => {
    const weeks = Array.from(new Set(scopedLessons.map((l) => l.week))).sort(
      (a, b) => a - b
    );
    return weeks.map((w) => {
      const wList = scopedLessons.filter((l) => l.week === w);
      return {
        name: `T${w}`,
        diemTB: averageScoresExact(wList.map((l) => l.totalScore)) ?? 0,
        soTiet: wList.length,
      };
    });
  }, [scopedLessons]);

  const ratingPieData = useMemo(() => {
    const counts = { Tốt: 0, Khá: 0, Đạt: 0, 'Chưa đạt': 0 };
    scopedLessons.forEach((l) => {
      counts[l.rating] += 1;
    });
    return [
      { name: 'Tốt', value: counts['Tốt'], color: '#16A34A' },
      { name: 'Khá', value: counts['Khá'], color: '#2563EB' },
      { name: 'Đạt', value: counts['Đạt'], color: '#D97706' },
      { name: 'Chưa đạt', value: counts['Chưa đạt'], color: '#DC2626' },
    ].filter((i) => i.value > 0);
  }, [scopedLessons]);

  const heatmap39 = useMemo(() => {
    return Array.from({ length: 39 }, (_, idx) => {
      const wk = idx + 1;
      const wList = scopedLessons.filter((l) => l.week === wk);
      const avg = averageScoresExact(wList.map((l) => l.totalScore));
      return { week: wk, count: wList.length, avg };
    });
  }, [scopedLessons]);

  const compareRadarData = useMemo(() => {
    if (!dataset) return [];
    const listA = scopedLessons.filter((l) => l.classId === compareClassA);
    const listB = scopedLessons.filter((l) => l.classId === compareClassB);
    const bA = computeCriteriaBreakdown(listA, dataset.settings.scoringRules);
    const bB = computeCriteriaBreakdown(listB, dataset.settings.scoringRules);
    const nameA = dataset.classes.find((c) => c.id === compareClassA)?.name || 'Lớp A';
    const nameB = dataset.classes.find((c) => c.id === compareClassB)?.name || 'Lớp B';

    return {
      nameA,
      nameB,
      data: [
        { criterion: 'Học tập', A: Math.round(bA.hocTapPct * 10) / 10, B: Math.round(bB.hocTapPct * 10) / 10 },
        { criterion: 'Kỉ luật', A: Math.round(bA.kiLuatPct * 10) / 10, B: Math.round(bB.kiLuatPct * 10) / 10 },
        { criterion: 'Vệ sinh', A: Math.round(bA.veSinhPct * 10) / 10, B: Math.round(bB.veSinhPct * 10) / 10 },
        { criterion: 'Chuyên cần', A: Math.round(bA.chuyenCanPct * 10) / 10, B: Math.round(bB.chuyenCanPct * 10) / 10 },
      ],
    };
  }, [dataset, scopedLessons, compareClassA, compareClassB]);

  if (!dataset) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Thống kê và phân tích"
        subtitle="Phân tích điểm Sổ đầu bài (3–3–2–2) theo tỷ lệ % đạt trên điểm tối đa; không nhầm lẫn với điểm học lực."
      />

      {/* 5 Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'overview', label: 'Tổng quan' },
            { id: 'by-class', label: 'Theo lớp' },
            { id: 'by-subject', label: 'Theo môn' },
            { id: 'trend', label: 'Xu hướng' },
            { id: 'compare', label: 'So sánh' },
          ] as { id: AnalyticsTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-[#2563EB] text-white'
                : 'bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 text-[#64748B]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h2 className="text-sm font-bold mb-1">
              Biểu đồ Radar 4 tiêu chí (% đạt trên điểm tối đa)
            </h2>
            <p className="text-xs text-[#64748B] mb-3">
              Quy chuẩn về % để so sánh công bằng điểm mạnh/yếu giữa nhóm 3 điểm và 2 điểm.
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={criteriaRadarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Tỷ lệ đạt (%)"
                    dataKey="tyLeDat"
                    stroke="#2563EB"
                    fill="#2563EB"
                    fillOpacity={0.25}
                  />
                  <Tooltip formatter={(v: unknown) => [formatPercent(Number(v)), 'Tỷ lệ đạt']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-bold mb-1">Cơ cấu xếp loại tiết học</h2>
            <p className="text-xs text-[#64748B] mb-3">
              Tổng số {scopedLessons.length} tiết đã lưu năm học {globalFilters.schoolYear}
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ratingPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {ratingPieData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5 lg:col-span-2">
            <h2 className="text-sm font-bold mb-1">Bản đồ nhiệt 39 tuần học</h2>
            <p className="text-xs text-[#64748B] mb-3">
              Mỗi ô thể hiện tuần 1–39 và mức điểm trung bình Sổ đầu bài.
            </p>
            <div className="grid grid-cols-6 sm:grid-cols-13 gap-2">
              {heatmap39.map((cell) => {
                const bg =
                  cell.avg === null
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    : cell.avg >= 9
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-[#16A34A] border-emerald-300 dark:border-emerald-800'
                      : cell.avg >= 7.5
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-[#2563EB] border-blue-300 dark:border-blue-800'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-[#D97706] border-amber-300 dark:border-amber-800';
                return (
                  <div
                    key={cell.week}
                    title={`Tuần ${cell.week}: ${cell.avg !== null ? `${formatScore(cell.avg)}đ (${cell.count} tiết)` : 'Chưa có dữ liệu'}`}
                    className={`p-2 rounded-xl border border-transparent text-center tabular-nums ${bg}`}
                  >
                    <div className="text-[10px] font-semibold">T{cell.week}</div>
                    <div className="text-xs font-bold mt-0.5">
                      {cell.avg !== null ? formatScore(cell.avg) : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'by-class' && (
        <Card className="p-5">
          <h2 className="text-sm font-bold mb-3">
            Biểu đồ cột điểm trung bình Sổ đầu bài theo lớp
          </h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byClassData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[6, 10]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: unknown) => [formatScore(Number(v)), 'Điểm TB']} />
                <Bar dataKey="diemTB" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {activeTab === 'by-subject' && (
        <Card className="p-5">
          <h2 className="text-sm font-bold mb-3">
            Điểm trung bình Sổ đầu bài theo môn học
          </h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySubjectData} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" domain={[6, 10]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: unknown) => [formatScore(Number(v)), 'Điểm TB']} />
                <Bar dataKey="diemTB" fill="#16A34A" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {activeTab === 'trend' && (
        <Card className="p-5">
          <h2 className="text-sm font-bold mb-3">
            Biểu đồ đường xu hướng điểm trung bình qua các tuần
          </h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[7, 10]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: unknown) => [formatScore(Number(v)), 'Điểm TB']} />
                <Line
                  type="monotone"
                  dataKey="diemTB"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {activeTab === 'compare' && !Array.isArray(compareRadarData) && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">So sánh trực tiếp 2 lớp theo 4 tiêu chí (%)</h2>
              <p className="text-xs text-[#64748B]">
                So sánh tỷ lệ đạt trên điểm tối đa của từng tiêu chí (3–3–2–2).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Lớp thứ nhất"
                value={compareClassA}
                onChange={(e) => setCompareClassA(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {dataset.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name}
                  </option>
                ))}
              </select>
              <span className="text-xs font-semibold text-[#64748B]">vs</span>
              <select
                aria-label="Lớp thứ hai"
                value={compareClassB}
                onChange={(e) => setCompareClassB(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {dataset.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={compareRadarData.data}>
                <PolarGrid />
                <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name={`Lớp ${compareRadarData.nameA}`}
                  dataKey="A"
                  stroke="#2563EB"
                  fill="#2563EB"
                  fillOpacity={0.25}
                />
                <Radar
                  name={`Lớp ${compareRadarData.nameB}`}
                  dataKey="B"
                  stroke="#16A34A"
                  fill="#16A34A"
                  fillOpacity={0.2}
                />
                <Legend />
                <Tooltip formatter={(v: unknown) => formatPercent(Number(v))} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
