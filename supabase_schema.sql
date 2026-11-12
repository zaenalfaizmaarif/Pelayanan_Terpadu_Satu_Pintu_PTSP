-- ============================================================================
-- SKEMA DATABASE SUPABASE (POSTGRESQL) - PTSP BAWASLU KABUPATEN SUBANG
-- Cara Pakai: Copy & Paste seluruh isi file ini ke menu "SQL Editor" di
-- dashboard Supabase Anda (https://supabase.com), lalu klik tombol "Run".
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ptsp_records (
  id TEXT PRIMARY KEY,
  registration_number TEXT NOT NULL,
  received_date TEXT NOT NULL,
  full_name TEXT NOT NULL,
  nik_or_identity TEXT NOT NULL,
  institution TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  service_types TEXT NOT NULL,
  purpose_summary TEXT NOT NULL,
  completion_status TEXT NOT NULL DEFAULT 'menunggu_verifikasi',
  ptsp_officer_name TEXT DEFAULT '',
  handling_unit TEXT DEFAULT '',
  record_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ptsp_surveys (
  id TEXT PRIMARY KEY,
  respondent_name TEXT NOT NULL,
  survey_date TEXT NOT NULL,
  service_type TEXT NOT NULL,
  overall_satisfaction TEXT NOT NULL,
  q1_prosedur SMALLINT NOT NULL DEFAULT 4,
  q2_persyaratan SMALLINT NOT NULL DEFAULT 4,
  q3_kecepatan SMALLINT NOT NULL DEFAULT 4,
  q4_kompetensi SMALLINT NOT NULL DEFAULT 4,
  q5_sikap SMALLINT NOT NULL DEFAULT 4,
  q6_kesesuaian SMALLINT NOT NULL DEFAULT 4,
  q7_sarana SMALLINT NOT NULL DEFAULT 4,
  q8_pengaduan SMALLINT NOT NULL DEFAULT 4,
  survey_feedback TEXT DEFAULT '',
  survey_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Buka akses baca & simpan untuk Publishable Key (anon / authenticated)
ALTER TABLE public.ptsp_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptsp_surveys DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.ptsp_records TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ptsp_surveys TO anon, authenticated, service_role;
