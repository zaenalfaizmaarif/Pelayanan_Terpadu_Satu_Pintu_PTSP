import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_PTSP_RECORDS,
  INITIAL_PTSP_SURVEYS,
  PTSP_SERVICE_TYPE_LABELS,
} from './src/types/ptsp.ts';
import type { PtspRecord, PtspSurveyEntry } from './src/types/ptsp.ts';
import { BAWASLU_LOGO_DATA_URI } from './src/assets/bawasluLogo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StoredOfficerAccount {
  id: string;
  username: string;
  nipNik: string;
  fullName: string;
  roleTitle: string;
  accessLevel: 'petugas_penerima' | 'ketua_pelaksana';
  salt: string;
  passwordHash: string;
}

interface PublicOfficerProfile {
  id: string;
  username: string;
  nipNik: string;
  fullName: string;
  roleTitle: string;
  accessLevel: 'petugas_penerima' | 'ketua_pelaksana';
}

interface StoreData {
  officers: StoredOfficerAccount[];
  ptspRecords: PtspRecord[];
  ptspSurveys: PtspSurveyEntry[];
}

const DATA_DIR = path.join(__dirname, '.data');
const STORE_PATH = path.join(DATA_DIR, 'ptsp_store.json');

// Supabase Configuration (via REST API when SUPABASE_URL & SUPABASE_ANON_KEY are set in .env)
const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://mtcfzbaelbjpmvearlmk.supabase.co'
)
  .trim()
  .replace(/\/+$/, '');

const SUPABASE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_azGR9nlfXHPOYc_8tzTvog_dvmoZ9Xc'
).trim();

function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

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

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): boolean {
  const actualBuffer = Buffer.from(hashPassword(password, salt), 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function createInitialOfficers(): StoredOfficerAccount[] {
  const salt1 = crypto.randomBytes(16).toString('hex');
  const salt2 = crypto.randomBytes(16).toString('hex');

  return [
    {
      id: 'off-1',
      username: 'petugas',
      nipNik: '19910412 201902 2 004',
      fullName: 'Rina Kartika, S.I.P.',
      roleTitle: 'Petugas Penerima Layanan PTSP Bawaslu Kabupaten Subang',
      accessLevel: 'petugas_penerima',
      salt: salt1,
      passwordHash: hashPassword('bawaslu2026', salt1),
    },
    {
      id: 'off-2',
      username: 'ketua',
      nipNik: '19840817 201101 1 002',
      fullName: 'H. Imanudin, S.H., M.H.',
      roleTitle: 'Koordinator Sekretariat / Penanggung Jawab PTSP',
      accessLevel: 'ketua_pelaksana',
      salt: salt2,
      passwordHash: hashPassword('subang2026', salt2),
    },
  ];
}

function loadStore(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      if (
        Array.isArray(parsed.officers) &&
        Array.isArray(parsed.ptspRecords) &&
        Array.isArray(parsed.ptspSurveys)
      ) {
        return {
          officers: parsed.officers,
          ptspRecords: parsed.ptspRecords,
          ptspSurveys: parsed.ptspSurveys,
        };
      }
    }
  } catch (err) {
    console.error('Failed to read store, initializing default store:', err);
  }

  const initial: StoreData = {
    officers: createInitialOfficers(),
    ptspRecords: INITIAL_PTSP_RECORDS,
    ptspSurveys: INITIAL_PTSP_SURVEYS,
  };
  saveStore(initial);
  return initial;
}

function saveStore(data: StoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write store:', err);
  }
}

const store: StoreData = loadStore();

async function supabaseUpsertRecord(rec: PtspRecord): Promise<void> {
  if (!isSupabaseConfigured()) return;
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

  const res = await fetch(`${SUPABASE_URL}/rest/v1/ptsp_records?on_conflict=id`, {
    method: 'POST',
    headers: getSupabaseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Supabase upsert ptsp_records failed (${res.status}): ${await res.text()}`);
  }
}

async function supabaseFetchRecords(): Promise<PtspRecord[] | null> {
  if (!isSupabaseConfigured()) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ptsp_records?select=record_json&order=created_at.desc`,
    {
      headers: getSupabaseHeaders(),
    }
  );
  if (!res.ok) {
    throw new Error(`Supabase fetch ptsp_records failed (${res.status}): ${await res.text()}`);
  }
  const rows = (await res.json()) as Array<{ record_json: PtspRecord | string }>;
  if (rows.length === 0) {
    for (const rec of store.ptspRecords) {
      await supabaseUpsertRecord(rec);
    }
    return store.ptspRecords;
  }
  return rows.map((r) =>
    typeof r.record_json === 'string'
      ? (JSON.parse(r.record_json) as PtspRecord)
      : r.record_json
  );
}

async function supabaseUpsertSurvey(survey: PtspSurveyEntry): Promise<void> {
  if (!isSupabaseConfigured()) return;
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

  const res = await fetch(`${SUPABASE_URL}/rest/v1/ptsp_surveys?on_conflict=id`, {
    method: 'POST',
    headers: getSupabaseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Supabase upsert ptsp_surveys failed (${res.status}): ${await res.text()}`);
  }
}

async function supabaseFetchSurveys(): Promise<PtspSurveyEntry[] | null> {
  if (!isSupabaseConfigured()) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ptsp_surveys?select=survey_json&order=created_at.desc`,
    {
      headers: getSupabaseHeaders(),
    }
  );
  if (!res.ok) {
    throw new Error(`Supabase fetch ptsp_surveys failed (${res.status}): ${await res.text()}`);
  }
  const rows = (await res.json()) as Array<{ survey_json: PtspSurveyEntry | string }>;
  if (rows.length === 0) {
    for (const srv of store.ptspSurveys) {
      await supabaseUpsertSurvey(srv);
    }
    return store.ptspSurveys;
  }
  return rows.map((r) =>
    typeof r.survey_json === 'string'
      ? (JSON.parse(r.survey_json) as PtspSurveyEntry)
      : r.survey_json
  );
}

async function initSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const [records, surveys] = await Promise.all([
      supabaseFetchRecords(),
      supabaseFetchSurveys(),
    ]);
    if (records) store.ptspRecords = records;
    if (surveys) store.ptspSurveys = surveys;
    saveStore(store);
    console.log(
      `[Supabase Cloud] Terhubung ke ${SUPABASE_URL} (${store.ptspRecords.length} berkas PTSP, ${store.ptspSurveys.length} survei SKM tersinkronisasi).`
    );
  } catch (err) {
    console.error(
      `[Supabase Cloud] Gagal menyinkronkan tabel Supabase (pastikan supabase_schema.sql sudah dijalankan di SQL Editor Supabase):`,
      (err as Error)?.message || err
    );
  }
}

// In-memory active cryptographic session tokens & rate-limiting tracker
const activeSessions = new Map<
  string,
  { officerId: string; expiresAt: number }
>();

const loginAttempts = new Map<
  string,
  { count: number; lockedUntil: number; lastAttempt: number }
>();

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function toPublicProfile(acc: StoredOfficerAccount): PublicOfficerProfile {
  return {
    id: acc.id,
    username: acc.username,
    nipNik: acc.nipNik,
    fullName: acc.fullName,
    roleTitle: acc.roleTitle,
    accessLevel: acc.accessLevel,
  };
}

function getAuthenticatedOfficer(req: Request): StoredOfficerAccount | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  const session = activeSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }

  const officer = store.officers.find((o) => o.id === session.officerId);
  if (!officer) return null;

  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return officer;
}

function requireOfficerAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const officer = getAuthenticatedOfficer(req);
  if (!officer) {
    res.status(401).json({
      error:
        'Sesi petugas tidak valid atau telah berakhir. Silakan login kembali ke Meja Petugas.',
    });
    return;
  }
  (req as Request & { officer?: StoredOfficerAccount }).officer = officer;
  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  void initSupabase();

  app.use(express.json({ limit: '5mb' }));

  // Serve embedded Bawaslu logo even when /public/assets/aistudio is missing in exported ZIP
  app.get(
    '/assets/aistudio/logo_bawaslu-01_1cf173b0.png',
    (_req: Request, res: Response) => {
      const b64 = BAWASLU_LOGO_DATA_URI.replace(
        /^data:image\/png;base64,/,
        ''
      );
      const buf = Buffer.from(b64, 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(buf);
    }
  );

  // --- AUTHENTICATION API ROUTES ---

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { usernameOrNip, password } = req.body as {
      usernameOrNip?: string;
      password?: string;
    };

    const clientIp =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      'local';
    const normalizedInput = String(usernameOrNip || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
    const attemptKey = `${clientIp}:${normalizedInput || 'unknown'}`;

    const attemptRecord = loginAttempts.get(attemptKey);
    const now = Date.now();

    if (attemptRecord && attemptRecord.lockedUntil > now) {
      const waitSeconds = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
      res.status(429).json({
        error: `Terlalu banyak percobaan login gagal. Akun dikunci sementara, silakan coba lagi dalam ${waitSeconds} detik.`,
      });
      return;
    }

    if (!normalizedInput || !password) {
      res.status(400).json({
        error: 'ID Pengguna/NIP dan Kata Sandi wajib diisi.',
      });
      return;
    }

    const matchedOfficer = store.officers.find((acc) => {
      const cleanNip = acc.nipNik.replace(/\s+/g, '').toLowerCase();
      return (
        acc.username.toLowerCase() === normalizedInput ||
        cleanNip === normalizedInput
      );
    });

    const isPasswordValid =
      matchedOfficer &&
      verifyPassword(
        String(password),
        matchedOfficer.salt,
        matchedOfficer.passwordHash
      );

    if (!matchedOfficer || !isPasswordValid) {
      const prevCount =
        attemptRecord && now - attemptRecord.lastAttempt < 10 * 60 * 1000
          ? attemptRecord.count
          : 0;
      const nextCount = prevCount + 1;
      const lockedUntil =
        nextCount >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_DURATION_MS : 0;

      loginAttempts.set(attemptKey, {
        count: nextCount,
        lockedUntil,
        lastAttempt: now,
      });

      const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - nextCount);
      res.status(401).json({
        error:
          remainingAttempts > 0
            ? `ID Pengguna/NIP atau Kata Sandi tidak sesuai. Sisa percobaan sebelum dikunci sementara: ${remainingAttempts} kali.`
            : 'Terlalu banyak percobaan gagal. Akses login dikunci selama 5 menit.',
      });
      return;
    }

    loginAttempts.delete(attemptKey);

    const token = crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, {
      officerId: matchedOfficer.id,
      expiresAt: now + SESSION_TTL_MS,
    });

    res.json({
      token,
      officer: toPublicProfile(matchedOfficer),
    });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const officer = getAuthenticatedOfficer(req);
    if (!officer) {
      res.status(401).json({ error: 'Belum terautentikasi.' });
      return;
    }
    res.json({ officer: toPublicProfile(officer) });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      activeSessions.delete(token);
    }
    res.json({ success: true });
  });

  app.post(
    '/api/auth/change-password',
    requireOfficerAuth,
    (req: Request, res: Response) => {
      const officer = (req as Request & { officer: StoredOfficerAccount })
        .officer;
      const { currentPassword, newPassword } = req.body as {
        currentPassword?: string;
        newPassword?: string;
      };

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          error: 'Kata sandi saat ini dan kata sandi baru wajib diisi.',
        });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({
          error: 'Kata sandi baru minimal harus terdiri dari 8 karakter.',
        });
        return;
      }

      const validCurrent = verifyPassword(
        currentPassword,
        officer.salt,
        officer.passwordHash
      );
      if (!validCurrent) {
        res.status(401).json({
          error: 'Kata sandi saat ini tidak sesuai.',
        });
        return;
      }

      const newSalt = crypto.randomBytes(16).toString('hex');
      officer.salt = newSalt;
      officer.passwordHash = hashPassword(newPassword, newSalt);
      saveStore(store);

      res.json({
        success: true,
        message:
          'Kata sandi petugas berhasil diperbarui secara terenkripsi di server.',
      });
    }
  );

  // --- PTSP RECORDS & SURVEYS API ROUTES (SUPABASE CLOUD -> LOCAL JSON FALLBACK) ---

  app.get('/api/ptsp/records', async (_req: Request, res: Response) => {
    if (isSupabaseConfigured()) {
      try {
        const records = await supabaseFetchRecords();
        if (records) {
          store.ptspRecords = records;
          saveStore(store);
          res.json({ records, storage: 'supabase' });
          return;
        }
      } catch (err) {
        console.error('Supabase read records error:', err);
      }
    }

    res.json({ records: store.ptspRecords, storage: 'local_json' });
  });

  app.post('/api/ptsp/records', async (req: Request, res: Response) => {
    const incoming = req.body as PtspRecord;
    if (!incoming || !incoming.id || !incoming.registrationNumber) {
      res.status(400).json({ error: 'Data permohonan PTSP tidak lengkap.' });
      return;
    }

    store.ptspRecords = [
      incoming,
      ...store.ptspRecords.filter((r) => r.id !== incoming.id),
    ];
    saveStore(store);

    if (isSupabaseConfigured()) {
      try {
        await supabaseUpsertRecord(incoming);
      } catch (err) {
        console.error('Supabase insert record error:', err);
      }
    }

    res.status(201).json({ record: incoming });
  });

  app.put('/api/ptsp/records/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = req.body as PtspRecord;
    if (!updated || !updated.id) {
      res.status(400).json({ error: 'Data pembaruan berkas tidak valid.' });
      return;
    }

    const idx = store.ptspRecords.findIndex((r) => r.id === id);
    if (idx !== -1) {
      store.ptspRecords[idx] = updated;
    } else {
      store.ptspRecords = [updated, ...store.ptspRecords];
    }
    saveStore(store);

    if (isSupabaseConfigured()) {
      try {
        await supabaseUpsertRecord(updated);
      } catch (err) {
        console.error('Supabase update record error:', err);
      }
    }

    res.json({ record: updated });
  });

  app.get('/api/ptsp/surveys', async (_req: Request, res: Response) => {
    if (isSupabaseConfigured()) {
      try {
        const surveys = await supabaseFetchSurveys();
        if (surveys) {
          store.ptspSurveys = surveys;
          saveStore(store);
          res.json({ surveys, storage: 'supabase' });
          return;
        }
      } catch (err) {
        console.error('Supabase read surveys error:', err);
      }
    }

    res.json({ surveys: store.ptspSurveys, storage: 'local_json' });
  });

  app.post('/api/ptsp/surveys', async (req: Request, res: Response) => {
    const incoming = req.body as PtspSurveyEntry;
    if (!incoming || !incoming.id) {
      res.status(400).json({ error: 'Data survei kepuasan tidak lengkap.' });
      return;
    }

    store.ptspSurveys = [
      incoming,
      ...store.ptspSurveys.filter((s) => s.id !== incoming.id),
    ];
    saveStore(store);

    if (isSupabaseConfigured()) {
      try {
        await supabaseUpsertSurvey(incoming);
      } catch (err) {
        console.error('Supabase insert survey error:', err);
      }
    }

    res.status(201).json({ survey: incoming });
  });

  // Vite middleware for development vs static serving for production
  if (process.env.NODE_ENV !== 'production') {
    process.env.DISABLE_HMR = 'true';
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const startListening = (portToTry: number) => {
    const httpServer = app.listen(portToTry, '0.0.0.0', () => {
      console.log(
        `\n==================================================================`
      );
      console.log(
        `Server PTSP Bawaslu Kabupaten Subang berhasil berjalan!`
      );
      console.log(
        `Link Khusus Pemohon : http://localhost:${portToTry}/pelayanan`
      );
      console.log(
        `Link Khusus Petugas : http://localhost:${portToTry}/petugas`
      );
      console.log(
        `==================================================================\n`
      );
    });

    httpServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && portToTry < 3010) {
        console.log(
          `[INFO] Port ${portToTry} sedang terpakai, mengalihkan otomatis ke port ${
            portToTry + 1
          }...`
        );
        startListening(portToTry + 1);
      } else {
        console.error('Gagal menjalankan server:', err.message);
      }
    });
  };

  startListening(PORT);
}

startServer();
