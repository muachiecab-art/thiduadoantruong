/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ClassbookProvider, useClassbook } from './context/ClassbookContext';
import { AppShell } from './components/layout/AppShell';
import { LoginScreen } from './components/auth/LoginScreen';
import { DashboardPage } from './pages/DashboardPage';
import { ClassbookPage } from './pages/ClassbookPage';
import { LessonEntryPage } from './pages/LessonEntryPage';
import { TimetablePage } from './pages/TimetablePage';
import { WeekClosePage } from './pages/WeekClosePage';
import { RankingsPage } from './pages/RankingsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AlertsPage } from './pages/AlertsPage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { ReportsPage } from './pages/ReportsPage';
import { DigitalArchivePage } from './pages/DigitalArchivePage';
import { ExcelPage } from './pages/ExcelPage';
import { ClassesPage } from './pages/ClassesPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';

function ActivePageRouter() {
  const { activePage } = useClassbook();

  switch (activePage) {
    case 'dashboard':
      return <DashboardPage />;
    case 'classbook':
      return <ClassbookPage />;
    case 'lesson-entry':
      return <LessonEntryPage />;
    case 'timetable':
      return <TimetablePage />;
    case 'week-close':
      return <WeekClosePage />;
    case 'rankings':
      return <RankingsPage />;
    case 'analytics':
      return <AnalyticsPage />;
    case 'alerts':
      return <AlertsPage />;
    case 'ai-assistant':
      return <AiAssistantPage />;
    case 'reports':
      return <ReportsPage />;
    case 'digital-archive':
      return <DigitalArchivePage />;
    case 'excel':
      return <ExcelPage />;
    case 'classes':
      return <ClassesPage />;
    case 'subjects':
      return <SubjectsPage />;
    case 'users':
      return <UsersPage />;
    case 'audit-log':
      return <AuditLogPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
}

function ClassbookAppView() {
  const { user, loading, error, switchDemoRole } = useClassbook();

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-medium text-[#64748B]">
            Đang tải dữ liệu SMART CLASSBOOK AI...
          </p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-6 max-w-sm text-center space-y-3">
          <p className="text-sm font-semibold text-[#DC2626]">{error}</p>
          <button
            type="button"
            onClick={() => switchDemoRole('Admin')}
            className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <AppShell>
      <ActivePageRouter />
    </AppShell>
  );
}

export default function App() {
  return (
    <ClassbookProvider>
      <ClassbookAppView />
    </ClassbookProvider>
  );
}
