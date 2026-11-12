import React, { useState, useMemo } from 'react';
import { AuthenticatedOfficer } from './OfficerLoginGate';
import {
  PtspRecord,
  PtspFormCode,
  PtspSurveyEntry,
  INITIAL_PTSP_SURVEYS,
  PTSP_SURVEY_QUESTIONS,
  PTSP_OVERALL_SATISFACTION_LABELS,
  PTSP_SERVICE_TYPE_LABELS,
  PTSP_COMPLETION_STATUS_LABELS,
  PTSP_DISPOSITION_LABELS,
} from '../types/ptsp';
import { PtspWorkspace } from './PtspWorkspace';
import { ApplicationTrackerCard } from './ApplicationTrackerCard';
import {
  CheckCircle2,
  Clock,
  FileText,
  KeyRound,
  X,
  TrendingUp,
  Calendar,
  Users,
  ClipboardCheck,
  Award,
  BarChart3,
  MessageSquareQuote,
  Loader2,
} from 'lucide-react';

export type OfficerWorkspaceTab = 'dashboard' | 'ptsp_desk';

interface OfficerDeskPanelProps {
  currentOfficer: AuthenticatedOfficer;
  authToken: string;
  onLogoutOfficer: () => void;
  ptspRecords: PtspRecord[];
  ptspSurveys?: PtspSurveyEntry[];
  onSaveSurveyEntry?: (survey: PtspSurveyEntry) => void;
  onSaveNewPtspRecord: (rec: PtspRecord) => void;
  onUpdatePtspRecord: (rec: PtspRecord) => void;
  officerSubTab?: OfficerWorkspaceTab;
  onChangeOfficerSubTab?: (tab: OfficerWorkspaceTab) => void;
  officerPtspFormCode?: PtspFormCode;
  onChangeOfficerPtspFormCode?: (code: PtspFormCode) => void;
  selectedPtspRecordId?: string;
  onChangeSelectedPtspRecordId?: (id: string) => void;
  onInspectPrintRecord?: (rec: PtspRecord, code: PtspFormCode) => void;
}

export const OfficerDeskPanel: React.FC<OfficerDeskPanelProps> = ({
  currentOfficer,
  authToken,
  ptspRecords,
  ptspSurveys = INITIAL_PTSP_SURVEYS,
  onSaveSurveyEntry,
  onSaveNewPtspRecord,
  onUpdatePtspRecord,
  officerSubTab = 'dashboard',
  onChangeOfficerSubTab,
  officerPtspFormCode,
  onChangeOfficerPtspFormCode,
  selectedPtspRecordId,
  onChangeSelectedPtspRecordId,
  onInspectPrintRecord,
}) => {
  const [internalSubTab, setInternalSubTab] =
    useState<OfficerWorkspaceTab>(officerSubTab);
  const activeSubTab = officerSubTab ?? internalSubTab;
  const setActiveSubTab = (tab: OfficerWorkspaceTab) => {
    setInternalSubTab(tab);
    onChangeOfficerSubTab?.(tab);
  };

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Dashboard metrics calculations (PTSP records + standalone SKM Index)
  const dashboardStats = useMemo(() => {
    const totalPtsp = ptspRecords.length;

    const pendingPtsp = ptspRecords.filter(
      (r) => r.completionStatus === 'menunggu_verifikasi'
    ).length;

    const inProgressPtsp = ptspRecords.filter(
      (r) =>
        r.completionStatus === 'dalam_proses' ||
        r.completionStatus === 'telah_dikoordinasikan' ||
        r.completionStatus === 'diteruskan_instansi_berwenang'
    ).length;

    const donePtsp = ptspRecords.filter(
      (r) => r.completionStatus === 'selesai'
    ).length;

    const revisionPtsp = ptspRecords.filter(
      (r) =>
        r.initialStatus === 'perlu_kelengkapan_dokumen' ||
        r.completionStatus === 'menunggu_kelengkapan_dokumen' ||
        r.completionStatus === 'tidak_dapat_diproses'
    ).length;

    const activeSurveys =
      ptspSurveys.length > 0 ? ptspSurveys : INITIAL_PTSP_SURVEYS;
    const totalRespondents = activeSurveys.length;

    // Average SKM score from standalone PtspSurveyEntry list
    const skmAverages = activeSurveys.map((s) => {
      const vals = Object.values(s.surveyScores);
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    });
    const avgSkmNum =
      skmAverages.length > 0
        ? skmAverages.reduce((a, b) => a + b, 0) / skmAverages.length
        : 4;
    const avgSkm = avgSkmNum.toFixed(2);
    const ikmScore100 = (avgSkmNum * 25).toFixed(1);
    const ikmNumeric = parseFloat(ikmScore100);

    let mutuGrade = 'A';
    let mutuLabel = 'Sangat Baik';
    if (ikmNumeric >= 88.31) {
      mutuGrade = 'A';
      mutuLabel = 'Sangat Baik';
    } else if (ikmNumeric >= 76.61) {
      mutuGrade = 'B';
      mutuLabel = 'Baik';
    } else if (ikmNumeric >= 65.0) {
      mutuGrade = 'C';
      mutuLabel = 'Cukup Baik';
    } else {
      mutuGrade = 'D';
      mutuLabel = 'Perlu Peningkatan';
    }

    const perQuestionStats = PTSP_SURVEY_QUESTIONS.map((q, idx) => {
      const sum = activeSurveys.reduce(
        (acc, s) => acc + (s.surveyScores[q.key] || 4),
        0
      );
      const avg = totalRespondents > 0 ? sum / totalRespondents : 4;
      const pctScore = Math.round((avg / 4) * 100);
      return {
        index: idx + 1,
        key: q.key,
        label: q.label,
        avgScore: avg.toFixed(2),
        pctScore,
      };
    });

    const satisfactionCounts = {
      sangat_puas: activeSurveys.filter(
        (s) => s.overallSatisfaction === 'sangat_puas'
      ).length,
      puas: activeSurveys.filter((s) => s.overallSatisfaction === 'puas')
        .length,
      kurang_puas: activeSurveys.filter(
        (s) => s.overallSatisfaction === 'kurang_puas'
      ).length,
      tidak_puas: activeSurveys.filter(
        (s) => s.overallSatisfaction === 'tidak_puas'
      ).length,
    };

    const pct = (count: number) =>
      totalPtsp > 0 ? Math.round((count / totalPtsp) * 100) : 0;

    return {
      totalPtsp,
      pendingPtsp,
      inProgressPtsp,
      donePtsp,
      revisionPtsp,
      totalRespondents,
      avgSkm,
      ikmScore100,
      mutuGrade,
      mutuLabel,
      perQuestionStats,
      satisfactionCounts,
      recentSurveys: activeSurveys.slice(0, 5),
      pctPending: pct(pendingPtsp),
      pctInProgress: pct(inProgressPtsp),
      pctDone: pct(donePtsp),
      pctRevision: pct(revisionPtsp),
    };
  }, [ptspRecords, ptspSurveys]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 8) {
      setPasswordStatus({
        type: 'error',
        text: 'Kata sandi baru minimal harus terdiri dari 8 karakter.',
      });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordStatus({
        type: 'error',
        text: 'Konfirmasi kata sandi baru tidak cocok.',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordStatus({
          type: 'error',
          text: data.error || 'Gagal memperbarui kata sandi.',
        });
      } else {
        setPasswordStatus({
          type: 'success',
          text:
            data.message ||
            'Kata sandi petugas berhasil diperbarui di server.',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch {
      setPasswordStatus({
        type: 'error',
        text: 'Tidak dapat menghubungi server.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar inside Meja Petugas PTSP */}
      <div className="no-print bg-white border border-stone-200/90 rounded-xl p-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'dashboard'
                ? 'bg-gradient-to-r from-[#7F1D1D] to-[#58111A] text-white shadow-xs'
                : 'text-slate-700 hover:text-red-950'
            }`}
          >
            Dashboard Pelayanan PTSP
          </button>
          <button
            type="button"
            onClick={() => {
              onChangeSelectedPtspRecordId?.('');
              onChangeOfficerPtspFormCode?.('formulir_2');
              setActiveSubTab('ptsp_desk');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'ptsp_desk' &&
              officerPtspFormCode === 'formulir_2'
                ? 'bg-gradient-to-r from-[#7F1D1D] to-[#58111A] text-white shadow-xs'
                : 'text-slate-700 hover:text-red-950'
            }`}
          >
            Verifikasi Petugas
          </button>
          <button
            type="button"
            onClick={() => {
              onChangeSelectedPtspRecordId?.('');
              onChangeOfficerPtspFormCode?.('formulir_3');
              setActiveSubTab('ptsp_desk');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'ptsp_desk' &&
              officerPtspFormCode === 'formulir_3'
                ? 'bg-gradient-to-r from-[#7F1D1D] to-[#58111A] text-white shadow-xs'
                : 'text-slate-700 hover:text-red-950'
            }`}
          >
            Tanda Terima Layanan
          </button>
          <button
            type="button"
            onClick={() => {
              onChangeSelectedPtspRecordId?.('');
              onChangeOfficerPtspFormCode?.('formulir_4');
              setActiveSubTab('ptsp_desk');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'ptsp_desk' &&
              officerPtspFormCode === 'formulir_4'
                ? 'bg-gradient-to-r from-[#7F1D1D] to-[#58111A] text-white shadow-xs'
                : 'text-slate-700 hover:text-red-950'
            }`}
          >
            Monitoring Pelayanan
          </button>
          <button
            type="button"
            onClick={() => {
              onChangeOfficerPtspFormCode?.('formulir_lampiran');
              setActiveSubTab('ptsp_desk');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'ptsp_desk' &&
              officerPtspFormCode === 'formulir_lampiran'
                ? 'bg-gradient-to-r from-[#7F1D1D] to-[#58111A] text-white shadow-xs'
                : 'text-slate-700 hover:text-red-950'
            }`}
          >
            Pedoman &amp; Register PTSP
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setPasswordStatus(null);
              setShowPasswordModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <KeyRound className="w-3.5 h-3.5 text-red-800" />
            Ubah Kata Sandi Petugas
          </button>
        </div>
      </div>

      {/* KOLOM PENCARIAN / LACAK STATUS PERMOHONAN PADA MEJA PETUGAS */}
      <ApplicationTrackerCard
        records={ptspRecords}
        mode="officer"
        onInspectPrintRecord={onInspectPrintRecord}
        onSelectRecordForOfficer={(rec, code) => {
          onChangeSelectedPtspRecordId?.(rec.id);
          onChangeOfficerPtspFormCode?.(code);
          setActiveSubTab('ptsp_desk');
        }}
      />

      {/* VIEW 1: DASHBOARD MEJA PETUGAS PTSP */}
      {activeSubTab === 'dashboard' && (
        <div className="no-print space-y-6">
          {/* Page Header */}
          <div className="bg-gradient-to-r from-[#7F1D1D] via-[#6B1114] to-[#4C0519] text-white rounded-xl p-6 border-b-2 border-amber-400/80 shadow-xs">
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-1">
              Meja Petugas PTSP · Bawaslu Kabupaten Subang
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Dashboard Pelayanan Terpadu Satu Pintu (PTSP) Bawaslu Subang
            </h1>
            <p className="text-xs sm:text-sm text-amber-100/85 mt-1">
              Ringkasan permohonan pelayanan publik, monitoring tindak lanjut unit kerja, dan capaian kepuasan masyarakat Bawaslu Kabupaten Subang.
            </p>
          </div>

          {/* 3-Column Register & Service Metrics Strip (Exclusive to Meja Petugas) */}
          <div className="bg-gradient-to-r from-amber-50/70 via-white to-red-50/50 border border-amber-200/80 rounded-xl px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-slate-600">
                Kode Register Bawaslu Subang
              </div>
              <div className="text-base font-bold font-mono tabular-nums text-red-950 mt-0.5">
                /PTSP/686138/2026
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600">
                Total Permohonan Tercatat
              </div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {dashboardStats.totalPtsp} Berkas
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600">Diproses &amp; Selesai</div>
              <div className="text-base font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                {dashboardStats.inProgressPtsp + dashboardStats.donePtsp} Layanan
              </div>
            </div>
          </div>

          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Card 1: Total Permohonan */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold text-slate-600">
                  Total Permohonan PTSP
                </span>
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                    {dashboardStats.totalPtsp}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    Berkas Masuk
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Terdaftar pada Register Harian PTSP Bawaslu Subang
                </p>
              </div>
            </div>

            {/* Card 2: Indeks Kinerja Sistem & SKM */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold text-slate-600">
                  Indeks Kinerja &amp; Kepuasan (SKM)
                </span>
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                    {dashboardStats.ikmScore100}
                  </span>
                  <span className="text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    Mutu {dashboardStats.mutuGrade} ({dashboardStats.mutuLabel})
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Skor {dashboardStats.avgSkm} / 4.00 dari{' '}
                  <strong>{dashboardStats.totalRespondents} Responden</strong>
                </p>
              </div>
            </div>

            {/* Card 3: Menunggu Verifikasi Petugas (Amber tinted card) */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold text-amber-900">
                  Menunggu Verifikasi Petugas
                </span>
                <div className="w-9 h-9 rounded-lg bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold font-mono tabular-nums text-amber-900">
                    {dashboardStats.pendingPtsp}
                  </span>
                  <span className="text-xs font-semibold text-amber-800">
                    Perlu Tindakan
                  </span>
                </div>
                <p className="text-xs text-amber-800/80 mt-2">
                  Pemeriksaan awal kelengkapan berkas &amp; disposisi unit
                </p>
              </div>
            </div>

            {/* Card 4: Layanan Selesai (Emerald tinted card) */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold text-emerald-900">
                  Pelayanan Selesai
                </span>
                <div className="w-9 h-9 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold font-mono tabular-nums text-emerald-900">
                    {dashboardStats.donePtsp}
                  </span>
                  <span className="text-xs font-semibold text-emerald-800">
                    Berkas Tuntas
                  </span>
                </div>
                <p className="text-xs text-emerald-800/80 mt-2">
                  Telah diterbitkan Tanda Terima &amp; diselesaikan
                </p>
              </div>
            </div>
          </div>

          {/* INDEKS KINERJA SISTEM & KEPUASAN MASYARAKAT (SKM) PANEL */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Indeks Kinerja Sistem &amp; Survei Kepuasan Masyarakat (SKM)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluasi mutu kinerja sistem pelayanan PTSP berdasarkan penilaian langsung masyarakat (terpisah dari nomor registrasi permohonan).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <div className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#7F1D1D] to-[#58111A] text-white flex items-center gap-2.5 shadow-2xs">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-amber-200 font-semibold">
                      Indeks Kinerja Sistem (IKM)
                    </div>
                    <div className="text-sm font-bold font-mono tabular-nums">
                      {dashboardStats.ikmScore100} / 100 · Mutu{' '}
                      {dashboardStats.mutuGrade} ({dashboardStats.mutuLabel})
                    </div>
                  </div>
                </div>
                <div className="px-3.5 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
                  <div className="text-[10px] uppercase tracking-wider text-blue-700 font-semibold">
                    Total Partisipasi Survei
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums">
                    {dashboardStats.totalRespondents} Responden ({dashboardStats.avgSkm} / 4.00)
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Cols: Skor Per 8 Unsur Penilaian Kinerja Sistem */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Capaian 8 Unsur Penilaian Kinerja Pelayanan PTSP
                  </h3>
                  <span className="text-xs text-slate-500">
                    Skala 1.00 – 4.00
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {dashboardStats.perQuestionStats.map((item) => (
                    <div
                      key={item.key}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-800 leading-snug">
                          {item.index}. {item.label}
                        </span>
                        <span className="font-mono tabular-nums font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded shrink-0">
                          {item.avgScore} / 4.00
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${item.pctScore}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Tingkat Kinerja Unsur</span>
                        <span className="font-mono font-semibold text-slate-700">
                          {item.pctScore}% (
                          {item.pctScore >= 88
                            ? 'Sangat Baik'
                            : item.pctScore >= 76
                            ? 'Baik'
                            : 'Cukup'}
                          )
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 5 Cols: Distribusi Kepuasan & Riwayat Masukan Responden */}
              <div className="lg:col-span-5 space-y-5">
                {/* Distribusi Tingkat Kepuasan */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Distribusi Kepuasan Umum
                    </h3>
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-white border border-emerald-200 rounded-lg p-2.5">
                      <div className="text-lg font-bold font-mono tabular-nums text-emerald-700">
                        {dashboardStats.satisfactionCounts.sangat_puas}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-600">
                        Sangat Puas
                      </div>
                    </div>
                    <div className="bg-white border border-blue-200 rounded-lg p-2.5">
                      <div className="text-lg font-bold font-mono tabular-nums text-blue-700">
                        {dashboardStats.satisfactionCounts.puas}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-600">
                        Puas
                      </div>
                    </div>
                    <div className="bg-white border border-amber-200 rounded-lg p-2.5">
                      <div className="text-lg font-bold font-mono tabular-nums text-amber-700">
                        {dashboardStats.satisfactionCounts.kurang_puas}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-600">
                        Kurang Puas
                      </div>
                    </div>
                    <div className="bg-white border border-red-200 rounded-lg p-2.5">
                      <div className="text-lg font-bold font-mono tabular-nums text-red-700">
                        {dashboardStats.satisfactionCounts.tidak_puas}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-600">
                        Tidak Puas
                      </div>
                    </div>
                  </div>
                </div>

                {/* Masukan & Penilaian Terbaru */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <MessageSquareQuote className="w-3.5 h-3.5 text-blue-700" />
                      <span>Penilaian &amp; Masukan Responden Terbaru</span>
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white max-h-[290px] overflow-y-auto">
                    {dashboardStats.recentSurveys.map((srv) => {
                      const vals = Object.values(srv.surveyScores);
                      const srvAvg = (
                        vals.reduce((a, b) => a + b, 0) / vals.length
                      ).toFixed(2);
                      return (
                        <div key={srv.id} className="p-3.5 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">
                              {srv.respondentName}
                            </span>
                            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                              Skor {srvAvg} ·{' '}
                              {
                                PTSP_OVERALL_SATISFACTION_LABELS[
                                  srv.overallSatisfaction
                                ]
                              }
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Layanan:{' '}
                            <strong className="text-slate-700">
                              {PTSP_SERVICE_TYPE_LABELS[srv.serviceType]}
                            </strong>{' '}
                            · Tanggal: {srv.surveyDate}
                          </div>
                          {srv.surveyFeedback && (
                            <p className="text-xs text-slate-700 italic bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200/80">
                              &ldquo;{srv.surveyFeedback}&rdquo;
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom 2-Column Analytics & Actionable Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Card: Distribusi Status Permohonan PTSP */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Distribusi Status Pelayanan PTSP
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Visualisasi perbandingan status penanganan permohonan pelayanan
                  </p>
                </div>
                <TrendingUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
              </div>

              <div className="space-y-4 pt-1">
                {/* Bar 1: Menunggu Verifikasi */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Menunggu Verifikasi
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {dashboardStats.pendingPtsp} ({dashboardStats.pctPending}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${Math.max(dashboardStats.pctPending, 4)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Bar 2: Dalam Proses / Dikoordinasikan */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Dalam Proses / Dikoordinasikan Unit
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {dashboardStats.inProgressPtsp} (
                      {dashboardStats.pctInProgress}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{
                        width: `${Math.max(dashboardStats.pctInProgress, 4)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Bar 3: Selesai */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Selesai Dilayani
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {dashboardStats.donePtsp} ({dashboardStats.pctDone}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{
                        width: `${Math.max(dashboardStats.pctDone, 4)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Bar 4: Perlu Kelengkapan Dokumen */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Perlu Kelengkapan / Perbaikan Dokumen
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {dashboardStats.revisionPtsp} (
                      {dashboardStats.pctRevision}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 rounded-full"
                      style={{
                        width: `${
                          dashboardStats.revisionPtsp > 0
                            ? Math.max(dashboardStats.pctRevision, 6)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>Akses Cepat Layanan Petugas:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onChangeSelectedPtspRecordId?.('');
                      onChangeOfficerPtspFormCode?.('formulir_2');
                      setActiveSubTab('ptsp_desk');
                    }}
                    className="font-semibold text-red-800 hover:underline"
                  >
                    Verifikasi &amp; Monitoring
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeOfficerPtspFormCode?.('formulir_lampiran');
                      setActiveSubTab('ptsp_desk');
                    }}
                    className="font-semibold text-red-800 hover:underline"
                  >
                    Register Harian PTSP
                  </button>
                </div>
              </div>
            </div>

            {/* Right Card: Antrean Permohonan & Monitoring Layanan PTSP */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Daftar Pengajuan &amp; Monitoring Pelayanan PTSP
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Berkas permohonan pelayanan publik pada buku register harian PTSP Bawaslu Kabupaten Subang
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onChangeSelectedPtspRecordId?.('');
                      onChangeOfficerPtspFormCode?.('formulir_2');
                      setActiveSubTab('ptsp_desk');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Proses Verifikasi PTSP
                  </button>
                  <span className="text-xs font-mono tabular-nums font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                    {ptspRecords.length} Permohonan
                  </span>
                </div>
              </div>

              {/* PTSP Records List */}
              <div className="divide-y divide-slate-200">
                {ptspRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {rec.fullName}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-mono tabular-nums text-red-800 font-semibold">
                          {rec.registrationNumber}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        <span>
                          NIK/ID: <span className="font-mono">{rec.nikOrIdentity}</span>
                        </span>{' '}
                        · <span>{rec.institution || 'Masyarakat Umum'}</span>
                      </div>
                      <div className="text-xs text-slate-700">
                        Layanan:{' '}
                        <strong>
                          {rec.serviceTypes
                            .map((s) => PTSP_SERVICE_TYPE_LABELS[s])
                            .join(', ')}
                        </strong>{' '}
                        · Unit Tujuan:{' '}
                        <span>
                          {rec.dispositionTargets
                            .map((d) => PTSP_DISPOSITION_LABELS[d])
                            .join(', ') || rec.handlingUnit}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        Tanggal: <strong className="font-mono">{rec.receivedDate}</strong>{' '}
                        · Status:{' '}
                        <span
                          className={`font-semibold ${
                            rec.completionStatus === 'selesai'
                              ? 'text-emerald-700'
                              : rec.completionStatus === 'menunggu_verifikasi'
                              ? 'text-amber-700'
                              : 'text-blue-700'
                          }`}
                        >
                          {PTSP_COMPLETION_STATUS_LABELS[rec.completionStatus]}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                      {onInspectPrintRecord && (
                        <button
                          type="button"
                          onClick={() =>
                            onInspectPrintRecord(rec, 'formulir_1')
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-600" />
                          <span>Lihat &amp; Cetak</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onChangeSelectedPtspRecordId?.(rec.id);
                          onChangeOfficerPtspFormCode?.('formulir_2');
                          setActiveSubTab('ptsp_desk');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5 text-red-800" />
                        <span>Verifikasi &amp; Monitoring</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: MEJA PETUGAS PTSP */}
      {activeSubTab === 'ptsp_desk' && (
        <PtspWorkspace
          records={ptspRecords}
          onSaveNewRecord={onSaveNewPtspRecord}
          onUpdateRecord={onUpdatePtspRecord}
          onSaveSurveyEntry={onSaveSurveyEntry}
          authenticatedOfficer={currentOfficer}
          onRequestOfficerLogin={() => {}}
          workspaceRole="officer"
          externalFormCode={officerPtspFormCode}
          onChangeFormCode={onChangeOfficerPtspFormCode}
          selectedRecordIdExternal={selectedPtspRecordId}
          onChangeSelectedRecordId={onChangeSelectedPtspRecordId}
        />
      )}

      {/* Modal Ubah Kata Sandi Petugas (Server-Side Encrypted) */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Ubah Kata Sandi Petugas PTSP
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentOfficer.fullName} ({currentOfficer.username})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi Saat Ini
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi Baru (Minimal 8 Karakter)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-800"
                />
              </div>

              {passwordStatus && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium border ${
                    passwordStatus.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {passwordStatus.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 disabled:opacity-70 rounded-lg cursor-pointer"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                      <span>Memperbarui...</span>
                    </>
                  ) : (
                    <span>Simpan Kata Sandi Baru</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
