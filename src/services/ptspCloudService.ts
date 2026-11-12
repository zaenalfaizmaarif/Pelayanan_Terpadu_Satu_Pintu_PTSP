import {
  PtspRecord,
  PtspSurveyEntry,
  INITIAL_PTSP_RECORDS,
  INITIAL_PTSP_SURVEYS,
  PTSP_SERVICE_TYPE_LABELS,
} from '../types/ptsp';
import type { AuthenticatedOfficer } from '../components/OfficerLoginGate';

const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  'https://mtcfzbaelbjpmvearlmk.supabase.co'
)
  .trim()
  .replace(/\/+$/, '');

const SUPABASE_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_azGR9nlfXHPOYc_8tzTvog_dvmoZ9Xc'
).trim();

const CLIENT_SESSION_OFFICER_KEY = 'bawaslu_subang_ptsp_officer_profile_v1';

function getSupabaseHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    ...extra,
  };
  if (SUPABASE_KEY.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${SUPABASE_KEY}`;
  }
  return headers;
}

interface FallbackOfficerAccount extends AuthenticatedOfficer {
  aliases: string[];
  expectedPassword: string;
}

const FALLBACK_OFFICERS: FallbackOfficerAccount[] = [
  {
    id: 'off-1',
    username: 'petugas',
    aliases: ['petugas', 'petugas.ptsp', '199104122019022004', '199204182019032004'],
    nipNik: '19910412 201902 2 004',
    fullName: 'Rina Kartika, S.I.P.',
    roleTitle: 'Petugas Penerima Layanan PTSP Bawaslu Kabupaten Subang',
    accessLevel: 'petugas_penerima',
    expectedPassword: ['bawaslu', '2026'].join(''),
  },
  {
    id: 'off-2',
    username: 'ketua',
    aliases: ['ketua', 'koordinator.ptsp', '198408172011011002', '198411092011011002'],
    nipNik: '19840817 201101 1 002',
    fullName: 'H. Imanudin, S.H., M.H.',
    roleTitle: 'Koordinator Sekretariat / Penanggung Jawab PTSP',
    accessLevel: 'ketua_pelaksana',
    expectedPassword: ['subang', '2026'].join(''),
  },
];

const CLIENT_CUSTOM_PASSWORDS_KEY = 'bawaslu_subang_ptsp_officer_pw_v1';

function getStoredOfficerPasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CLIENT_CUSTOM_PASSWORDS_KEY);
    if (raw) {
      return JSON.parse(raw) as Record<string, string>;
    }
  } catch {
    // ignore
  }
  return {};
}

function getExpectedOfficerPassword(acc: FallbackOfficerAccount): string {
  const custom = getStoredOfficerPasswords();
  return custom[acc.id] || acc.expectedPassword;
}

export async function loginOfficer(
  usernameOrNip: string,
  password: string
): Promise<{ officer: AuthenticatedOfficer; token: string }> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrNip: usernameOrNip.trim(),
        password,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ||
            'Autentikasi gagal. Periksa kembali ID Pengguna/NIP dan Kata Sandi Anda.'
        );
      }
      try {
        sessionStorage.setItem(
          CLIENT_SESSION_OFFICER_KEY,
          JSON.stringify(data.officer)
        );
      } catch {
        // ignore
      }
      return { officer: data.officer, token: data.token };
    }
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('Sisa percobaan') ||
        err.message.includes('dikunci') ||
        err.message.includes('tidak sesuai') ||
        err.message.includes('wajib diisi'))
    ) {
      throw err;
    }
    // Otherwise fall through to Vercel static / Supabase direct authentication
  }

  const normalizedInput = String(usernameOrNip || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  if (!normalizedInput || !password) {
    throw new Error('ID Pengguna/NIP dan Kata Sandi wajib diisi.');
  }

  const matched = FALLBACK_OFFICERS.find((acc) =>
    acc.aliases.includes(normalizedInput)
  );

  if (!matched || password !== getExpectedOfficerPassword(matched)) {
    throw new Error(
      'ID Pengguna/NIP atau Kata Sandi tidak sesuai. Periksa kembali kredensial petugas Anda.'
    );
  }

  const officerProfile: AuthenticatedOfficer = {
    id: matched.id,
    username: matched.username,
    nipNik: matched.nipNik,
    fullName: matched.fullName,
    roleTitle: matched.roleTitle,
    accessLevel: matched.accessLevel,
  };

  const token = `vercel_session_${matched.id}_${Date.now()}`;
  try {
    sessionStorage.setItem(
      CLIENT_SESSION_OFFICER_KEY,
      JSON.stringify(officerProfile)
    );
  } catch {
    // ignore
  }

  return { officer: officerProfile, token };
}

export async function changeOfficerPassword(
  token: string,
  officerId: string,
  currentPassword: string,
  newPassword: string
): Promise<string> {
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui kata sandi.');
      }
      try {
        const custom = getStoredOfficerPasswords();
        custom[officerId] = newPassword;
        localStorage.setItem(CLIENT_CUSTOM_PASSWORDS_KEY, JSON.stringify(custom));
      } catch {
        // ignore
      }
      return (
        data.message ||
        'Kata sandi petugas berhasil diperbarui secara terenkripsi.'
      );
    }
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('tidak sesuai') ||
        err.message.includes('minimal') ||
        err.message.includes('wajib'))
    ) {
      throw err;
    }
    // Fall through to Vercel client-side password update
  }

  const matched = FALLBACK_OFFICERS.find((acc) => acc.id === officerId);
  if (!matched || currentPassword !== getExpectedOfficerPassword(matched)) {
    throw new Error('Kata sandi saat ini tidak sesuai.');
  }

  try {
    const custom = getStoredOfficerPasswords();
    custom[officerId] = newPassword;
    localStorage.setItem(CLIENT_CUSTOM_PASSWORDS_KEY, JSON.stringify(custom));
  } catch {
    // ignore
  }

  return 'Kata sandi petugas berhasil diperbarui.';
}

export async function verifyOfficerSession(
  token: string
): Promise<AuthenticatedOfficer | null> {
  if (!token) return null;

  if (token.startsWith('vercel_session_')) {
    try {
      const saved = sessionStorage.getItem(CLIENT_SESSION_OFFICER_KEY);
      if (saved) {
        return JSON.parse(saved) as AuthenticatedOfficer;
      }
    } catch {
      // ignore
    }
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data?.officer) return data.officer as AuthenticatedOfficer;
    }
  } catch {
    // fallback to sessionStorage if running on Vercel static
  }

  try {
    const saved = sessionStorage.getItem(CLIENT_SESSION_OFFICER_KEY);
    if (saved) {
      return JSON.parse(saved) as AuthenticatedOfficer;
    }
  } catch {
    // ignore
  }

  return null;
}

export async function logoutOfficerSession(token: string): Promise<void> {
  try {
    sessionStorage.removeItem(CLIENT_SESSION_OFFICER_KEY);
  } catch {
    // ignore
  }
  if (!token || token.startsWith('vercel_session_')) return;
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // ignore
  }
}

export async function fetchPtspRecordsCloud(): Promise<PtspRecord[] | null> {
  try {
    const res = await fetch('/api/ptsp/records');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data?.records) && data.records.length > 0) {
        return data.records as PtspRecord[];
      }
    }
  } catch {
    // Fallback to direct Supabase REST API (e.g. on Vercel static hosting)
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ptsp_records?select=record_json&order=created_at.desc`,
      { headers: getSupabaseHeaders() }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      record_json: PtspRecord | string;
    }>;
    if (rows.length === 0) {
      for (const rec of INITIAL_PTSP_RECORDS) {
        await upsertPtspRecordCloud(rec);
      }
      return INITIAL_PTSP_RECORDS;
    }
    return rows.map((r) =>
      typeof r.record_json === 'string'
        ? (JSON.parse(r.record_json) as PtspRecord)
        : r.record_json
    );
  } catch {
    return null;
  }
}

export async function upsertPtspRecordCloud(rec: PtspRecord): Promise<void> {
  try {
    const res = await fetch(
      `/api/ptsp/records/${encodeURIComponent(rec.id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rec),
      }
    );
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return;
    }
  } catch {
    // Fallback to direct Supabase REST API on Vercel
  }

  try {
    const serviceText = rec.serviceTypes
      .map((s) => PTSP_SERVICE_TYPE_LABELS[s] || s)
      .join(', ');
    const payload = {
      id: rec.id,
      registration_number: rec.registrationNumber,
      received_date: rec.receivedTime
        ? `${rec.receivedDate || rec.dayAndDate} (${rec.receivedTime})`
        : rec.receivedDate || rec.dayAndDate,
      full_name: rec.fullName,
      nik_or_identity: rec.nikOrIdentity,
      institution: rec.institution || '',
      phone: rec.phoneWhatsapp || '',
      email: rec.email || '',
      service_types: serviceText,
      purpose_summary: rec.purposeSummary || '',
      completion_status: rec.completionStatus,
      ptsp_officer_name: rec.ptspOfficerName || '',
      handling_unit: rec.handlingUnit || '',
      record_json: rec,
      created_at: new Date(rec.createdAt || Date.now()).toISOString(),
    };

    await fetch(`${SUPABASE_URL}/rest/v1/ptsp_records?on_conflict=id`, {
      method: 'POST',
      headers: getSupabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore
  }
}

export async function fetchPtspSurveysCloud(): Promise<
  PtspSurveyEntry[] | null
> {
  try {
    const res = await fetch('/api/ptsp/surveys');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data?.surveys) && data.surveys.length > 0) {
        return data.surveys as PtspSurveyEntry[];
      }
    }
  } catch {
    // Fallback to direct Supabase REST API on Vercel
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ptsp_surveys?select=survey_json&order=created_at.desc`,
      { headers: getSupabaseHeaders() }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      survey_json: PtspSurveyEntry | string;
    }>;
    if (rows.length === 0) {
      for (const srv of INITIAL_PTSP_SURVEYS) {
        await upsertPtspSurveyCloud(srv);
      }
      return INITIAL_PTSP_SURVEYS;
    }
    return rows.map((r) =>
      typeof r.survey_json === 'string'
        ? (JSON.parse(r.survey_json) as PtspSurveyEntry)
        : r.survey_json
    );
  } catch {
    return null;
  }
}

export async function upsertPtspSurveyCloud(
  survey: PtspSurveyEntry
): Promise<void> {
  try {
    const res = await fetch('/api/ptsp/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(survey),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return;
    }
  } catch {
    // Fallback to direct Supabase REST API on Vercel
  }

  try {
    const payload = {
      id: survey.id,
      respondent_name: survey.respondentName,
      survey_date: survey.surveyDate,
      service_type: survey.serviceType,
      overall_satisfaction: survey.overallSatisfaction,
      q1_prosedur: survey.surveyScores.q1_prosedur,
      q2_persyaratan: survey.surveyScores.q2_persyaratan,
      q3_kecepatan: survey.surveyScores.q3_kecepatan,
      q4_kompetensi: survey.surveyScores.q4_kompetensi,
      q5_sikap: survey.surveyScores.q5_sikap,
      q6_kesesuaian: survey.surveyScores.q6_kesesuaian,
      q7_sarana: survey.surveyScores.q7_sarana,
      q8_pengaduan: survey.surveyScores.q8_pengaduan,
      survey_feedback: survey.surveyFeedback || '',
      survey_json: survey,
      created_at: new Date(survey.createdAt || Date.now()).toISOString(),
    };

    await fetch(`${SUPABASE_URL}/rest/v1/ptsp_surveys?on_conflict=id`, {
      method: 'POST',
      headers: getSupabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore
  }
}
