-- SMART CLASSBOOK AI – Supabase PostgreSQL Schema
-- Run this script once in the Supabase SQL Editor before deploying to Vercel.

CREATE TABLE IF NOT EXISTS cb_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cb_classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade INT NOT NULL,
  homeroom_teacher TEXT NOT NULL,
  lpht_name TEXT NOT NULL,
  lpht_user_id TEXT,
  student_count INT NOT NULL DEFAULT 40,
  expected_periods_per_week INT NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'Hoạt động',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cb_subjects (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Đang giảng dạy',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cb_users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  contact TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  assigned_class_id TEXT,
  assigned_class_name TEXT,
  status TEXT NOT NULL DEFAULT 'Hoạt động',
  last_login_at TIMESTAMPTZ,
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cb_timetable (
  id TEXT PRIMARY KEY,
  school_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  class_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  day_of_week INT NOT NULL,
  period INT NOT NULL,
  subject_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'Bình thường',
  change_note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cb_lessons (
  id TEXT PRIMARY KEY,
  school_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  week INT NOT NULL,
  date TEXT NOT NULL,
  day_of_week INT NOT NULL,
  class_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  grade INT NOT NULL,
  period INT NOT NULL,
  subject_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  lesson_content TEXT NOT NULL,
  scores JSONB NOT NULL,
  total_score NUMERIC(5,2) NOT NULL,
  rating TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  teacher_comment TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Đã lưu',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cb_lessons_year_week ON cb_lessons (school_year, week);
CREATE INDEX IF NOT EXISTS idx_cb_lessons_class ON cb_lessons (class_id);

CREATE TABLE IF NOT EXISTS cb_locked_weeks (
  id TEXT PRIMARY KEY,
  week INT NOT NULL,
  school_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  locked_by TEXT NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

CREATE TABLE IF NOT EXISTS cb_digital_books (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  school_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  total_lessons INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Đang mở',
  version TEXT NOT NULL DEFAULT 'v1.0',
  closed_at TIMESTAMPTZ,
  closed_by TEXT
);

CREATE TABLE IF NOT EXISTS cb_audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  class_name TEXT,
  summary TEXT NOT NULL,
  before_data TEXT,
  after_data TEXT,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_cb_audit_logs_ts ON cb_audit_logs (timestamp DESC);

CREATE TABLE IF NOT EXISTS cb_resolved_alerts (
  id TEXT PRIMARY KEY,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (all access passes through authenticated Express API routes via service_role key)
ALTER TABLE cb_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_locked_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_digital_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_resolved_alerts ENABLE ROW LEVEL SECURITY;
