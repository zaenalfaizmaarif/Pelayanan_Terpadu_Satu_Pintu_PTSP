import React, { useState, useMemo, useEffect } from 'react';
import {
  PtspRecord,
  PtspFormCode,
  PTSP_FORM_LIST,
  PTSP_SERVICE_TYPE_LABELS,
  PTSP_SUPPORTING_DOC_LABELS,
  PTSP_VERIFICATION_LABELS,
  PTSP_DISPOSITION_LABELS,
  PTSP_INITIAL_STATUS_LABELS,
  PTSP_COMPLETION_STATUS_LABELS,
  PTSP_SURVEY_QUESTIONS,
  PtspServiceType,
  PtspSupportingDocType,
  PtspVerificationCheck,
  PtspDispositionTarget,
  PtspInitialStatus,
  PtspCompletionStatus,
  PtspOverallSatisfaction,
  PtspSurveyEntry,
} from '../types/ptsp';
import { getRomanMonth } from '../types/mediation';
import { PtspOfficialSheets } from './PtspOfficialSheets';
import { SignaturePad } from './SignaturePad';
import { AuthenticatedOfficer } from './OfficerLoginGate';
import {
  Printer,
  CheckCircle2,
  Lock,
  Save,
  Download,
  RotateCcw,
  Loader2,
  Search,
  FolderOpen,
  Copy,
  Check,
  FileText,
  X,
} from 'lucide-react';

interface PtspWorkspaceProps {
  records: PtspRecord[];
  onSaveNewRecord: (rec: PtspRecord) => void;
  onUpdateRecord: (rec: PtspRecord) => void;
  authenticatedOfficer: AuthenticatedOfficer | null;
  onRequestOfficerLogin: () => void;
  externalFormCode?: PtspFormCode;
  onChangeFormCode?: (code: PtspFormCode) => void;
  workspaceRole?: 'applicant' | 'officer';
  selectedRecordIdExternal?: string;
  onChangeSelectedRecordId?: (id: string) => void;
  onSaveSurveyEntry?: (survey: PtspSurveyEntry) => void;
  onInspectPrintRecord?: (rec: PtspRecord, code: PtspFormCode) => void;
}

function formatIndonesianDayDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function formatIndonesianDateOnly(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function formatWibTime(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const hh = parts.find((p) => p.type === 'hour')?.value || '09';
  const mm = parts.find((p) => p.type === 'minute')?.value || '00';
  return `${hh.padStart(2, '0')}.${mm.padStart(2, '0')} WIB`;
}

export const PtspWorkspace: React.FC<PtspWorkspaceProps> = ({
  records,
  onSaveNewRecord,
  onUpdateRecord,
  authenticatedOfficer,
  onRequestOfficerLogin,
  externalFormCode,
  onChangeFormCode,
  workspaceRole = 'applicant',
  selectedRecordIdExternal,
  onChangeSelectedRecordId,
  onSaveSurveyEntry,
  onInspectPrintRecord,
}) => {
  const [internalFormCode, setInternalFormCode] = useState<PtspFormCode>(
    workspaceRole === 'officer' ? 'formulir_2' : 'formulir_1'
  );
  const activeFormCode = externalFormCode ?? internalFormCode;
  const setActiveFormCode = (code: PtspFormCode) => {
    setInternalFormCode(code);
    onChangeFormCode?.(code);
  };
  const [internalRecordId, setInternalRecordId] = useState<string>(
    workspaceRole === 'officer' ? '' : 'NEW_DRAFT'
  );
  const selectedRecordId = selectedRecordIdExternal ?? internalRecordId;
  const setSelectedRecordId = (id: string) => {
    setInternalRecordId(id);
    onChangeSelectedRecordId?.(id);
  };
  const [recordPickerQuery, setRecordPickerQuery] = useState('');
  const [noticeText, setNoticeText] = useState<string | null>(null);
  const [lastSubmittedApplicantRecord, setLastSubmittedApplicantRecord] =
    useState<PtspRecord | null>(null);
  const [copiedReceiptNumber, setCopiedReceiptNumber] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState<string>(
    'Menyimpan data ke sistem PTSP...'
  );
  const [featureActionText, setFeatureActionText] = useState<string | null>(
    null
  );

  const runFeatureAction = (label: string, fn: () => void) => {
    setFeatureActionText(label);
    fn();
    window.setTimeout(() => {
      setFeatureActionText(null);
    }, 350);
  };

  const isRegNumberAlreadyUsed = (
    candidateReg: string,
    existingList: PtspRecord[]
  ): boolean => {
    const normalized = candidateReg.trim().toUpperCase();
    if (!normalized) return true;
    const seqMatch = normalized.match(/^(\d+)/);
    const candidateSeq = seqMatch ? parseInt(seqMatch[1], 10) : null;

    return existingList.some((r) => {
      const existingNorm = r.registrationNumber.trim().toUpperCase();
      if (existingNorm === normalized) return true;
      if (candidateSeq !== null) {
        const rMatch = existingNorm.match(/^(\d+)/);
        if (rMatch && parseInt(rMatch[1], 10) === candidateSeq) {
          return true;
        }
      }
      return false;
    });
  };

  const nextRegNumber = useMemo(() => {
    const roman = getRomanMonth(new Date().getMonth() + 1);
    let maxSeq = records.length;
    for (const r of records) {
      const match = r.registrationNumber.trim().match(/^(\d+)/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!Number.isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    }
    let nextSeq = maxSeq + 1;
    let candidate = `${String(nextSeq).padStart(3, '0')}/PTSP/686138/${roman}/2026`;
    while (isRegNumberAlreadyUsed(candidate, records)) {
      nextSeq += 1;
      candidate = `${String(nextSeq).padStart(3, '0')}/PTSP/686138/${roman}/2026`;
    }
    return candidate;
  }, [records]);

  const createEmptyDraft = (
    customRegNumber?: string,
    nowDate: Date = new Date()
  ): PtspRecord => {
    const fullDayDate = formatIndonesianDayDate(nowDate);
    const dateOnly = formatIndonesianDateOnly(nowDate);
    const timeWib = formatWibTime(nowDate);

    return {
      id: `PTSP-2026-${String(records.length + 1).padStart(3, '0')}`,
      createdAt: nowDate.toISOString(),
      registrationNumber: customRegNumber || nextRegNumber,
      dayAndDate: fullDayDate,
      fullName: '',
      nikOrIdentity: '',
      institution: '',
      position: '',
      address: '',
      phoneWhatsapp: '',
      email: '',
      serviceTypes: ['ppid'],
      serviceOtherText: '',
      purposeSummary: '',
      supportingDocTypes: ['fotokopi_identitas'],
      supportingDocOtherText: '',
      receivedDate: dateOnly,
      receivedTime: timeWib,
      ptspOfficerName: authenticatedOfficer?.fullName || 'Rina Kartika, S.I.P.',
      verificationChecks: ['identitas_diperiksa', 'formulir_diisi'],
      verificationNotes: '',
      dispositionTargets: ['ppid_bawaslu'],
      dispositionOtherText: '',
      dispositionNotes: '',
      dispositionReceiverName: '',
      initialStatus: 'diterima',
      receiptRemarks: '',
      receiptDateText: dateOnly,
      handlingUnit: 'PPID Bawaslu Kabupaten Subang',
      forwardedDate: dateOnly,
      personInCharge: '',
      completionDate: '',
      completionStatus: 'menunggu_verifikasi',
      followUpResult: '',
      notesToApplicant: '',
      unitOfficerName: '',
      surveyDate: dateOnly,
      surveyScores: {
        q1_prosedur: 4,
        q2_persyaratan: 4,
        q3_kecepatan: 4,
        q4_kompetensi: 4,
        q5_sikap: 4,
        q6_kesesuaian: 4,
        q7_sarana: 4,
        q8_pengaduan: 4,
      },
      surveyFeedback: '',
      overallSatisfaction: 'sangat_puas',
    };
  };

  const [draftRecord, setDraftRecord] = useState<PtspRecord>(() =>
    createEmptyDraft()
  );

  // Keep draft registration time & date synchronized with real-time WIB clock
  useEffect(() => {
    const syncClock = () => {
      const now = new Date();
      setDraftRecord((prev) => ({
        ...prev,
        dayAndDate: formatIndonesianDayDate(now),
        receivedDate: formatIndonesianDateOnly(now),
        receivedTime: formatWibTime(now),
        receiptDateText: formatIndonesianDateOnly(now),
        forwardedDate: formatIndonesianDateOnly(now),
        surveyDate: formatIndonesianDateOnly(now),
      }));
    };
    const timer = setInterval(syncClock, 15000);
    return () => clearInterval(timer);
  }, []);

  const effectiveSelectedId =
    workspaceRole === 'applicant' ? 'NEW_DRAFT' : selectedRecordId;

  const currentRecord: PtspRecord = useMemo(() => {
    if (effectiveSelectedId === 'NEW_DRAFT') {
      const shouldSyncReg =
        !draftRecord.registrationNumber ||
        isRegNumberAlreadyUsed(draftRecord.registrationNumber, records);
      return {
        ...draftRecord,
        registrationNumber: shouldSyncReg
          ? nextRegNumber
          : draftRecord.registrationNumber,
      };
    }
    return (
      records.find((r) => r.id === effectiveSelectedId) ||
      records[0] ||
      draftRecord
    );
  }, [effectiveSelectedId, records, draftRecord, nextRegNumber]);

  const updateCurrentRecordField = <K extends keyof PtspRecord>(
    key: K,
    value: PtspRecord[K]
  ) => {
    if (effectiveSelectedId === 'NEW_DRAFT') {
      setDraftRecord((prev) => ({ ...prev, [key]: value }));
    } else {
      const updated = { ...currentRecord, [key]: value };
      onUpdateRecord(updated);
    }
  };

  const toggleArrayItem = <T extends string>(
    list: T[],
    item: T
  ): T[] => {
    return list.includes(item)
      ? list.filter((x) => x !== item)
      : [...list, item];
  };

  const handleSaveFormulir1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!currentRecord.fullName.trim()) {
      setNoticeText('Mohon isi Nama Lengkap Pemohon pada Pendaftaran Pelayanan PTSP.');
      return;
    }

    setNoticeText(null);
    setSavingMessage('Menyimpan Pendaftaran Pelayanan PTSP...');
    setIsSaving(true);

    setTimeout(() => {
      if (effectiveSelectedId === 'NEW_DRAFT') {
        const submitNow = new Date();
        const submitDayDate = formatIndonesianDayDate(submitNow);
        const submitDateOnly = formatIndonesianDateOnly(submitNow);
        const submitTimeWib = formatWibTime(submitNow);

        const syncedRegNumber = isRegNumberAlreadyUsed(
          currentRecord.registrationNumber,
          records
        )
          ? nextRegNumber
          : currentRecord.registrationNumber;

        const savedRec: PtspRecord = {
          ...currentRecord,
          id: `PTSP-2026-${String(records.length + 1).padStart(3, '0')}`,
          registrationNumber: syncedRegNumber,
          createdAt: submitNow.toISOString(),
          dayAndDate: currentRecord.dayAndDate.trim() || submitDayDate,
          receivedDate: submitDateOnly,
          receivedTime: submitTimeWib,
          receiptDateText: submitDateOnly,
          forwardedDate: submitDateOnly,
        };
        onSaveNewRecord(savedRec);

        if (workspaceRole === 'applicant') {
          setLastSubmittedApplicantRecord(savedRec);
          const updatedList = [savedRec, ...records];
          const roman = getRomanMonth(submitNow.getMonth() + 1);
          let maxSeq = updatedList.length;
          for (const r of updatedList) {
            const m = r.registrationNumber.trim().match(/^(\d+)/);
            if (m) {
              const p = parseInt(m[1], 10);
              if (!Number.isNaN(p) && p > maxSeq) maxSeq = p;
            }
          }
          const nextAvailable = `${String(maxSeq + 1).padStart(3, '0')}/PTSP/686138/${roman}/2026`;
          setDraftRecord(createEmptyDraft(nextAvailable, submitNow));
          setSelectedRecordId('NEW_DRAFT');
        } else {
          setSelectedRecordId(savedRec.id);
        }

        setIsSaving(false);
        setNoticeText(
          `Pendaftaran Pelayanan PTSP (${savedRec.registrationNumber}) berhasil disimpan pada pukul ${submitTimeWib} (${submitDateOnly}) dan langsung tersinkronisasi ke Database Supabase & Register Harian PTSP.`
        );
      } else {
        onUpdateRecord(currentRecord);
        setIsSaving(false);
        setNoticeText(
          `Perubahan Pendaftaran Pelayanan PTSP (${currentRecord.registrationNumber}) berhasil disimpan.`
        );
      }
      setTimeout(() => setNoticeText(null), 5000);
    }, 650);
  };

  const handleSaveOtherForm = (e: React.FormEvent, formLabel: string) => {
    e.preventDefault();
    if (isSaving) return;

    setNoticeText(null);
    setSavingMessage(`Menyimpan ${formLabel}...`);
    setIsSaving(true);

    setTimeout(() => {
      const officerFullName =
        currentRecord.ptspOfficerName.trim() ||
        authenticatedOfficer?.fullName ||
        'Rina Kartika, S.I.P.';

      const recordToSave: PtspRecord = {
        ...currentRecord,
        ptspOfficerName: officerFullName,
        completionStatus:
          activeFormCode === 'formulir_2' &&
          currentRecord.completionStatus === 'menunggu_verifikasi'
            ? 'dalam_proses'
            : currentRecord.completionStatus,
      };

      if (effectiveSelectedId === 'NEW_DRAFT') {
        const syncedRegNumber = isRegNumberAlreadyUsed(
          recordToSave.registrationNumber,
          records
        )
          ? nextRegNumber
          : recordToSave.registrationNumber;

        const savedRec: PtspRecord = {
          ...recordToSave,
          id: `PTSP-2026-${String(records.length + 1).padStart(3, '0')}`,
          registrationNumber: syncedRegNumber,
          createdAt: new Date().toISOString(),
        };
        onSaveNewRecord(savedRec);
        if (workspaceRole === 'officer') {
          setSelectedRecordId(savedRec.id);
        }
      } else {
        onUpdateRecord(recordToSave);
      }
      setIsSaving(false);
      setNoticeText(
        `Data ${formLabel} (${recordToSave.registrationNumber}) berhasil disimpan dan tersinkronisasi ke Database Supabase.`
      );
      setTimeout(() => setNoticeText(null), 4500);
    }, 650);
  };

  const handleSaveSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setNoticeText(null);
    setSavingMessage('Mengirim Penilaian Survei Kepuasan Masyarakat...');
    setIsSaving(true);

    setTimeout(() => {
      const newSurvey: PtspSurveyEntry = {
        id: `SKM-2026-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString(),
        respondentName:
          currentRecord.fullName.trim() || 'Responden Masyarakat',
        surveyDate: currentRecord.surveyDate || formatIndonesianDateOnly(new Date()),
        serviceType: currentRecord.serviceTypes[0] || 'ppid',
        surveyScores: { ...currentRecord.surveyScores },
        surveyFeedback: currentRecord.surveyFeedback.trim(),
        overallSatisfaction: currentRecord.overallSatisfaction,
      };

      onSaveSurveyEntry?.(newSurvey);

      if (effectiveSelectedId === 'NEW_DRAFT') {
        setDraftRecord((prev) => ({
          ...prev,
          fullName: '',
          surveyFeedback: '',
          overallSatisfaction: 'sangat_puas',
          surveyScores: {
            q1_prosedur: 4,
            q2_persyaratan: 4,
            q3_kecepatan: 4,
            q4_kompetensi: 4,
            q5_sikap: 4,
            q6_kesesuaian: 4,
            q7_sarana: 4,
            q8_pengaduan: 4,
          },
        }));
      } else {
        onUpdateRecord(currentRecord);
      }

      setIsSaving(false);
      setNoticeText(
        'Terima kasih! Penilaian Survei Kepuasan Masyarakat berhasil dikirim dan telah ditambahkan ke Indeks Kinerja Sistem pada Dashboard Pelayanan PTSP.'
      );
      setTimeout(() => setNoticeText(null), 4500);
    }, 650);
  };

  const exportPtspRegisterCsv = () => {
    const headers = [
      'No.',
      'Tanggal',
      'No. Registrasi',
      'Nama Pemohon',
      'Instansi/Organisasi',
      'Jenis Layanan',
      'Unit Tujuan',
      'Status Penyelesaian',
    ];
    const rows = records.map((r, idx) => [
      idx + 1,
      r.receivedDate || r.dayAndDate,
      r.registrationNumber,
      r.fullName,
      r.institution || '-',
      r.serviceTypes.map((s) => PTSP_SERVICE_TYPE_LABELS[s]).join('; '),
      r.dispositionTargets.map((d) => PTSP_DISPOSITION_LABELS[d]).join('; ') ||
        r.handlingUnit ||
        '-',
      PTSP_COMPLETION_STATUS_LABELS[r.completionStatus],
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Register_Harian_PTSP_Bawaslu_Subang.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeFormMeta =
    PTSP_FORM_LIST.find((f) => f.code === activeFormCode) ||
    PTSP_FORM_LIST[0];

  const isOfficerLocked =
    Boolean(activeFormMeta.officerOnlyEdit) && !authenticatedOfficer;

  const selectedOfficerRecord = useMemo(
    () => records.find((r) => r.id === selectedRecordId) || null,
    [records, selectedRecordId]
  );

  const isOfficerRecordRequiredForm =
    workspaceRole === 'officer' &&
    (activeFormCode === 'formulir_2' ||
      activeFormCode === 'formulir_3' ||
      activeFormCode === 'formulir_4');

  const mustSelectRecordFirst =
    isOfficerRecordRequiredForm && !selectedOfficerRecord;

  const filteredPickerRecords = useMemo(() => {
    const q = recordPickerQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.registrationNumber.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        r.nikOrIdentity.toLowerCase().includes(q) ||
        r.institution.toLowerCase().includes(q) ||
        r.purposeSummary.toLowerCase().includes(q)
    );
  }, [records, recordPickerQuery]);

  return (
    <div className="space-y-6">
      {/* RECORD SELECTOR & ACTION TOOLBAR FOR PTSP FORMS */}
      {activeFormCode !== 'formulir_5' && (
        <div className="no-print bg-gradient-to-r from-red-50/80 via-white to-amber-50/60 border border-red-200/80 rounded-xl px-5 py-3.5 space-y-4 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-bold text-red-950">
                {activeFormMeta.fullTitle}
              </span>
              <span className="text-slate-400">·</span>
              {activeFormCode === 'formulir_lampiran' ? (
                <span className="font-mono text-red-900 bg-amber-100/80 border border-amber-300/70 px-2.5 py-0.5 rounded-md font-bold">
                  Register Harian PTSP ({records.length} Berkas)
                </span>
              ) : mustSelectRecordFirst ? (
                <span className="font-semibold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md">
                  Pilih Berkas Terlebih Dahulu
                </span>
              ) : (
                <span className="font-mono text-red-900 bg-amber-100/80 border border-amber-300/70 px-2.5 py-0.5 rounded-md font-bold">
                  {currentRecord.registrationNumber}
                </span>
              )}
            </div>

            {/* Record Selector (Only for Officer Desk on Formulir 2, 3, 4) & Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {workspaceRole === 'officer' &&
                activeFormCode !== 'formulir_lampiran' && (
                  <>
                    <select
                      value={selectedOfficerRecord ? selectedRecordId : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        runFeatureAction(
                          val
                            ? 'Memuat Berkas Permohonan'
                            : 'Menampilkan Daftar Pilihan Berkas',
                          () => {
                            setSelectedRecordId(val);
                          }
                        );
                      }}
                      className="px-3 py-2 text-xs font-medium border border-stone-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-red-800 cursor-pointer"
                    >
                      <option value="">
                        -- Pilih Berkas Permohonan Terlebih Dahulu --
                      </option>
                      {records.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.registrationNumber} — {r.fullName || 'Tanpa Nama'}
                        </option>
                      ))}
                    </select>

                    {selectedOfficerRecord && (
                      <button
                        type="button"
                        onClick={() =>
                          runFeatureAction('Ganti Berkas Permohonan', () => {
                            setSelectedRecordId('');
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        Pilih Berkas Lain
                      </button>
                    )}
                  </>
                )}

              {activeFormCode !== 'formulir_1' && !mustSelectRecordFirst && (
                <button
                  type="button"
                  onClick={() =>
                    runFeatureAction(
                      `Menyiapkan Cetak ${activeFormMeta.shortTitle}`,
                      () => {
                        window.setTimeout(() => window.print(), 150);
                      }
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-900 hover:bg-red-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                  Cetak {activeFormMeta.shortTitle}
                </button>
              )}
            </div>
          </div>

          {(workspaceRole === 'officer' || !externalFormCode) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 border-t border-red-200/60">
              {(workspaceRole === 'officer'
                ? PTSP_FORM_LIST.filter(
                    (f) => f.officerOnlyEdit || f.code === 'formulir_lampiran'
                  )
                : PTSP_FORM_LIST
              ).map((item) => {
                const isSelected = item.code === activeFormCode;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() =>
                      runFeatureAction(item.shortTitle, () => {
                        if (
                          workspaceRole === 'officer' &&
                          item.code !== 'formulir_lampiran'
                        ) {
                          setSelectedRecordId('');
                        }
                        setActiveFormCode(item.code);
                      })
                    }
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-red-800 bg-red-50/70 text-slate-900 shadow-2xs'
                        : 'border-stone-200 hover:border-red-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-bold ${
                            isSelected ? 'text-red-900' : 'text-slate-900'
                          }`}
                        >
                          {item.shortTitle}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                          Petugas
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-600 mt-1 leading-snug line-clamp-2">
                        {item.fullTitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ANIMASI KLIK FITUR / MENU DI DALAM WORKSPACE */}
      {featureActionText && (
        <div className="no-print fixed bottom-5 left-5 z-50 bg-gradient-to-r from-[#7F1D1D] to-[#4C0519] text-white border border-amber-300/80 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2.5 text-xs font-semibold animate-ptsp-fade-in">
          <Loader2 className="w-4 h-4 text-amber-300 animate-spin shrink-0" />
          <span>{featureActionText}...</span>
        </div>
      )}

      {/* MODAL ANIMASI LOADING SAAT MENYIMPAN DATA */}
      {isSaving && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-amber-300/90 rounded-2xl px-7 py-6 shadow-xl max-w-sm w-full text-center space-y-3 animate-pulse">
            <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-[#7F1D1D] to-[#4C0519] flex items-center justify-center shadow-md border-2 border-amber-300">
              <Loader2 className="w-7 h-7 text-amber-300 animate-spin" />
            </div>
            <div className="text-sm font-bold text-red-950">{savingMessage}</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Menyinkronkan data ke Database Supabase &amp; Register Harian PTSP Bawaslu Kabupaten Subang...
            </p>
          </div>
        </div>
      )}

      {noticeText && (
        <div className="no-print bg-emerald-50 border-2 border-emerald-400 rounded-xl px-5 py-3.5 flex items-center gap-2.5 text-xs font-semibold text-emerald-950 shadow-xs transition-all duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 animate-bounce" />
          <span>{noticeText}</span>
        </div>
      )}

      {/* BUKTI PENDAFTARAN PEMOHON YANG BARU TERKIRIM (DENGAN SALIN RESI & CETAK BUKTI) */}
      {workspaceRole === 'applicant' &&
        activeFormCode === 'formulir_1' &&
        lastSubmittedApplicantRecord && (
          <div className="no-print max-w-4xl mx-auto w-full bg-gradient-to-r from-emerald-50 via-white to-amber-50/70 border-2 border-emerald-400/90 rounded-xl p-5 shadow-xs space-y-3 animate-ptsp-fade-in">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-950">
                    Bukti Pendaftaran Pelayanan PTSP Berhasil Diterbitkan
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Simpan atau cetak Nomor Registrasi di bawah ini untuk melacak status permohonan Anda pada menu{' '}
                    <strong>Lacak Status Permohonan</strong>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLastSubmittedApplicantRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                aria-label="Tutup bukti pendaftaran"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white border border-emerald-200 rounded-lg p-3.5 text-xs">
              <div>
                <div className="text-slate-500">Nomor Registrasi / Resi</div>
                <div className="font-mono font-bold text-red-900 text-sm mt-0.5">
                  {lastSubmittedApplicantRecord.registrationNumber}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Nama Pemohon</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {lastSubmittedApplicantRecord.fullName}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Waktu Pendaftaran</div>
                <div className="font-mono font-semibold text-slate-800 mt-0.5">
                  {lastSubmittedApplicantRecord.receivedDate} ·{' '}
                  {lastSubmittedApplicantRecord.receivedTime}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard
                      .writeText(lastSubmittedApplicantRecord.registrationNumber)
                      .catch(() => {});
                  }
                  setCopiedReceiptNumber(true);
                  window.setTimeout(() => setCopiedReceiptNumber(false), 1800);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-stone-300 hover:border-red-800 text-slate-800 transition-colors cursor-pointer"
              >
                {copiedReceiptNumber ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Nomor Resi Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Salin Nomor Registrasi</span>
                  </>
                )}
              </button>

              {onInspectPrintRecord && (
                <button
                  type="button"
                  onClick={() =>
                    onInspectPrintRecord(
                      lastSubmittedApplicantRecord,
                      'formulir_1'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#7F1D1D] to-[#58111A] hover:from-red-900 hover:to-red-950 transition-colors cursor-pointer shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-300" />
                  <span>Lihat &amp; Cetak Bukti Pendaftaran</span>
                </button>
              )}
            </div>
          </div>
        )}

      {/* MAIN WORKSPACE: INTERACTIVE FORM */}
      <div key={`${activeFormCode}-${selectedRecordId}`} className="grid grid-cols-1 gap-8 items-start animate-ptsp-fade-in">
        {/* INTERACTIVE FORM FOR SELECTED FORMULIR */}
        <div className="no-print max-w-4xl mx-auto w-full bg-white border border-stone-200/90 rounded-xl overflow-hidden shadow-2xs">
          {/* Header of current active form */}
          <div className="bg-gradient-to-r from-[#7F1D1D] via-[#6B1114] to-[#4C0519] text-white px-6 sm:px-8 py-5 border-b-2 border-amber-400/80 flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                {activeFormMeta.shortTitle}
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {activeFormMeta.fullTitle}
              </h3>
            </div>
            {selectedRecordId === 'NEW_DRAFT' &&
              activeFormCode === 'formulir_1' && (
                <button
                  type="button"
                  onClick={() =>
                    runFeatureAction('Mereset Isian Formulir', () => {
                      setDraftRecord(createEmptyDraft());
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-100 bg-white/10 hover:bg-white/20 border border-white/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                  Reset Isian
                </button>
              )}
          </div>

          <div className="p-6 sm:p-8">
            {/* Lock notice for officer-only forms when not logged in */}
            {isOfficerLocked && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-red-950 to-slate-900 text-white border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Lock className="w-4 h-4" />
                    <span>Khusus Petugas PTSP &amp; Unit Kerja</span>
                  </div>
                  <p className="text-xs text-amber-100/85 leading-relaxed">
                    Pengisian dan pengesahan {activeFormMeta.fullTitle} memerlukan login Meja Petugas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRequestOfficerLogin}
                  className="px-4 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-red-950 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Login Meja Petugas
                </button>
              </div>
            )}

            {/* 1. PENDAFTARAN PELAYANAN PTSP */}
            {activeFormCode === 'formulir_1' && (
              <form onSubmit={handleSaveFormulir1} className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-red-950 bg-red-50/75 border border-red-100 px-3.5 py-2 rounded-lg">
                    A. Identitas Pemohon
                  </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        1. Nomor Registrasi
                      </label>
                      <span className="text-[10.5px] font-semibold text-emerald-700">
                        Otomatis Tersinkronisasi
                      </span>
                    </div>
                    <input
                      type="text"
                      value={currentRecord.registrationNumber}
                      readOnly={workspaceRole === 'applicant'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (
                          effectiveSelectedId === 'NEW_DRAFT' &&
                          isRegNumberAlreadyUsed(val, records)
                        ) {
                          updateCurrentRecordField(
                            'registrationNumber',
                            nextRegNumber
                          );
                          setNoticeText(
                            `Nomor registrasi "${val}" sudah digunakan pada Register PTSP. Disinkronkan otomatis ke nomor terbaru: ${nextRegNumber}`
                          );
                          setTimeout(() => setNoticeText(null), 4000);
                        } else {
                          updateCurrentRecordField('registrationNumber', val);
                        }
                      }}
                      className={`w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-red-800 ${
                        workspaceRole === 'applicant'
                          ? 'bg-slate-50 text-slate-800 cursor-default'
                          : 'bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        2. Hari / Tanggal
                      </label>
                      <span className="text-[10.5px] font-mono font-semibold text-emerald-700">
                        Jam Daftar: {currentRecord.receivedTime}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={currentRecord.dayAndDate}
                      onChange={(e) =>
                        updateCurrentRecordField('dayAndDate', e.target.value)
                      }
                      placeholder="Rabu, 11 November 2026"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      3. Nama Lengkap <span className="text-red-700">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={currentRecord.fullName}
                      onChange={(e) =>
                        updateCurrentRecordField('fullName', e.target.value)
                      }
                      placeholder="Nama lengkap pemohon"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      4. NIK / Identitas (jika diperlukan)
                    </label>
                    <input
                      type="text"
                      value={currentRecord.nikOrIdentity}
                      onChange={(e) =>
                        updateCurrentRecordField(
                          'nikOrIdentity',
                          e.target.value
                        )
                      }
                      placeholder="Nomor KTP / Identitas"
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-red-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      5. Instansi / Organisasi (jika ada)
                    </label>
                    <input
                      type="text"
                      value={currentRecord.institution}
                      onChange={(e) =>
                        updateCurrentRecordField('institution', e.target.value)
                      }
                      placeholder="Nama Partai / Lembaga / Instansi"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      6. Jabatan (jika ada)
                    </label>
                    <input
                      type="text"
                      value={currentRecord.position}
                      onChange={(e) =>
                        updateCurrentRecordField('position', e.target.value)
                      }
                      placeholder="Jabatan pemohon"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    7. Alamat
                  </label>
                  <textarea
                    rows={2}
                    value={currentRecord.address}
                    onChange={(e) =>
                      updateCurrentRecordField('address', e.target.value)
                    }
                    placeholder="Alamat lengkap pemohon"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      8. Nomor Telepon / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={currentRecord.phoneWhatsapp}
                      onChange={(e) =>
                        updateCurrentRecordField(
                          'phoneWhatsapp',
                          e.target.value
                        )
                      }
                      placeholder="08xx-xxxx-xxxx"
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-red-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      9. Email
                    </label>
                    <input
                      type="email"
                      value={currentRecord.email}
                      onChange={(e) =>
                        updateCurrentRecordField('email', e.target.value)
                      }
                      placeholder="email@domain.id"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-800"
                    />
                  </div>
                </div>
              </div>

              {/* B. Jenis Layanan */}
              <div className="pt-4 border-t border-stone-200 space-y-3">
                <h4 className="text-sm font-bold text-red-950 bg-red-50/75 border border-red-100 px-3.5 py-2 rounded-lg">
                  B. Pilihan Jenis Layanan PTSP
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(PTSP_SERVICE_TYPE_LABELS) as PtspServiceType[]).map(
                    (srv) => {
                      const checked =
                        currentRecord.serviceTypes.includes(srv);
                      return (
                        <div
                          key={srv}
                          className={`p-2.5 rounded-lg border transition-colors ${
                            checked
                              ? 'border-red-800 bg-red-50/40'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-slate-800">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                updateCurrentRecordField(
                                  'serviceTypes',
                                  toggleArrayItem(
                                    currentRecord.serviceTypes,
                                    srv
                                  )
                                )
                              }
                              className="mt-0.5 accent-red-800"
                            />
                            <span>{PTSP_SERVICE_TYPE_LABELS[srv]}</span>
                          </label>
                          {srv === 'lainnya' && checked && (
                            <input
                              type="text"
                              value={currentRecord.serviceOtherText}
                              onChange={(e) =>
                                updateCurrentRecordField(
                                  'serviceOtherText',
                                  e.target.value
                                )
                              }
                              placeholder="Sebutkan layanan lainnya..."
                              className="mt-2 w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                            />
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* C. Uraian Maksud dan Tujuan Pelayanan */}
              <div className="pt-4 border-t border-stone-200 space-y-2.5">
                <label className="block text-sm font-bold text-red-950 bg-red-50/75 border border-red-100 px-3.5 py-2 rounded-lg">
                  C. Uraian Maksud dan Tujuan Pelayanan
                </label>
                <textarea
                  rows={3}
                  value={currentRecord.purposeSummary}
                  onChange={(e) =>
                    updateCurrentRecordField('purposeSummary', e.target.value)
                  }
                  placeholder="Tuliskan maksud dan tujuan permohonan pelayanan..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-800"
                />
              </div>

              {/* D. Dokumen Pendukung */}
              <div className="pt-4 border-t border-stone-200 space-y-3">
                <h4 className="text-sm font-bold text-red-950 bg-red-50/75 border border-red-100 px-3.5 py-2 rounded-lg">
                  D. Dokumen Pendukung
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    Object.keys(
                      PTSP_SUPPORTING_DOC_LABELS
                    ) as PtspSupportingDocType[]
                  ).map((doc) => {
                    const checked =
                      currentRecord.supportingDocTypes.includes(doc);
                    return (
                      <div
                        key={doc}
                        className={`p-2.5 rounded-lg border transition-colors ${
                          checked
                            ? 'border-red-800 bg-red-50/40'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-slate-800">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              updateCurrentRecordField(
                                'supportingDocTypes',
                                toggleArrayItem(
                                  currentRecord.supportingDocTypes,
                                  doc
                                )
                              )
                            }
                            className="mt-0.5 accent-red-800"
                          />
                          <span>{PTSP_SUPPORTING_DOC_LABELS[doc]}</span>
                        </label>
                        {doc === 'dokumen_lainnya' && checked && (
                          <input
                            type="text"
                            value={currentRecord.supportingDocOtherText}
                            onChange={(e) =>
                              updateCurrentRecordField(
                                'supportingDocOtherText',
                                e.target.value
                              )
                            }
                            placeholder="Sebutkan dokumen lainnya..."
                            className="mt-2 w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* E. Pernyataan & Tanda Tangan Pemohon */}
              <div className="pt-4 border-t border-stone-200 space-y-4">
                <h4 className="text-sm font-bold text-red-950 bg-red-50/75 border border-red-100 px-3.5 py-2 rounded-lg">
                  E. Pernyataan &amp; Tanda Tangan Pemohon
                </h4>
                <p className="text-xs text-slate-700 bg-amber-50/60 border border-amber-200/80 rounded-lg p-3.5 leading-relaxed">
                  Saya menyatakan bahwa informasi dan dokumen yang disampaikan
                  dalam formulir ini adalah benar dan dapat
                  dipertanggungjawabkan. Saya bersedia mengikuti prosedur
                  pelayanan yang berlaku di lingkungan Bawaslu Kabupaten Subang.
                </p>

                <SignaturePad
                  label="Tanda Tangan Pemohon"
                  value={currentRecord.applicantSignature}
                  onChange={(sig) =>
                    updateCurrentRecordField('applicantSignature', sig)
                  }
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#7F1D1D] to-[#58111A] hover:from-red-900 hover:to-red-950 disabled:opacity-70 rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                      <span>Menyimpan Pendaftaran...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-amber-300" />
                      <span>Simpan Pendaftaran PTSP</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

            {/* GATE: PILIH BERKAS PERMOHONAN TERLEBIH DAHULU UNTUK VERIFIKASI, TANDA TERIMA, ATAU MONITORING */}
            {mustSelectRecordFirst && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-red-950">
                      Pilih Berkas Permohonan Terlebih Dahulu
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Silakan pilih salah satu berkas permohonan di bawah ini untuk membuka{' '}
                      <strong>{activeFormMeta.fullTitle}</strong>.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-950 bg-white border border-amber-300 px-3 py-1.5 rounded-lg shrink-0">
                    {records.length} Berkas Terdaftar
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={recordPickerQuery}
                    onChange={(e) => setRecordPickerQuery(e.target.value)}
                    placeholder="Cari Nomor Registrasi, Nama Pemohon, NIK, atau Jenis Layanan..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-red-800"
                  />
                </div>

                <div className="w-full overflow-hidden border border-stone-200 rounded-lg">
                  <table className="w-full table-fixed text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-red-50/75 border-b border-red-200/80 text-[11px] font-bold uppercase text-red-950">
                        <th className="py-2.5 px-3 w-[24%]">No. Registrasi &amp; Tanggal</th>
                        <th className="py-2.5 px-3 w-[23%]">Pemohon &amp; Instansi</th>
                        <th className="py-2.5 px-3 w-[23%]">Jenis Layanan</th>
                        <th className="py-2.5 px-3 w-[16%]">Status</th>
                        <th className="py-2.5 px-3 w-[14%] text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {filteredPickerRecords.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-slate-500"
                          >
                            Tidak ada berkas permohonan yang sesuai dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredPickerRecords.map((r) => (
                          <tr
                            key={r.id}
                            className="hover:bg-amber-50/50 transition-colors"
                          >
                            <td className="py-3 px-3 font-mono tabular-nums break-all align-top">
                              <div className="font-bold text-red-900">
                                {r.registrationNumber}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 break-normal">
                                {r.receivedDate || r.dayAndDate}
                              </div>
                            </td>
                            <td className="py-3 px-3 break-words align-top">
                              <div className="font-semibold text-slate-900">
                                {r.fullName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {r.institution || 'Masyarakat Umum'}
                              </div>
                            </td>
                            <td className="py-3 px-3 break-words align-top">
                              {r.serviceTypes
                                .map((s) => PTSP_SERVICE_TYPE_LABELS[s])
                                .join(', ')}
                            </td>
                            <td className="py-3 px-3 break-words align-top">
                              <span
                                className={`font-semibold ${
                                  r.completionStatus === 'selesai'
                                    ? 'text-emerald-700'
                                    : r.completionStatus ===
                                      'menunggu_verifikasi'
                                    ? 'text-amber-700'
                                    : 'text-blue-700'
                                }`}
                              >
                                {
                                  PTSP_COMPLETION_STATUS_LABELS[
                                    r.completionStatus
                                  ]
                                }
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right align-top">
                              <button
                                type="button"
                                onClick={() =>
                                  runFeatureAction(
                                    `Membuka Berkas ${r.registrationNumber}`,
                                    () => {
                                      setSelectedRecordId(r.id);
                                    }
                                  )
                                }
                                className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#7F1D1D] to-[#58111A] hover:from-red-900 hover:to-red-950 rounded-md shadow-2xs cursor-pointer whitespace-nowrap"
                              >
                                Pilih Berkas
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. LEMBAR PENERIMAAN DAN VERIFIKASI PETUGAS PTSP */}
            {!mustSelectRecordFirst && activeFormCode === 'formulir_2' && (
              <form
                onSubmit={(e) => handleSaveOtherForm(e, 'Verifikasi Petugas')}
                className="space-y-6"
              >
              <fieldset disabled={isOfficerLocked} className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">
                    A. Data Penerimaan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        1. Nomor Registrasi
                      </label>
                      <input
                        type="text"
                        value={currentRecord.registrationNumber}
                        onChange={(e) =>
                          updateCurrentRecordField(
                            'registrationNumber',
                            e.target.value
                          )
                        }
                        className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        2. Tanggal Penerimaan
                      </label>
                      <input
                        type="text"
                        value={currentRecord.receivedDate}
                        onChange={(e) =>
                          updateCurrentRecordField(
                            'receivedDate',
                            e.target.value
                          )
                        }
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        3. Waktu Penerimaan
                      </label>
                      <input
                        type="text"
                        value={currentRecord.receivedTime}
                        onChange={(e) =>
                          updateCurrentRecordField(
                            'receivedTime',
                            e.target.value
                          )
                        }
                        className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        4. Nama Petugas PTSP
                      </label>
                      <input
                        type="text"
                        value={currentRecord.ptspOfficerName}
                        onChange={(e) =>
                          updateCurrentRecordField(
                            'ptspOfficerName',
                            e.target.value
                          )
                        }
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* B. Hasil Verifikasi Administratif */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">
                    B. Hasil Verifikasi Administratif
                  </h4>
                  <div className="space-y-2">
                    {(
                      Object.keys(
                        PTSP_VERIFICATION_LABELS
                      ) as PtspVerificationCheck[]
                    ).map((chk) => {
                      const checked =
                        currentRecord.verificationChecks.includes(chk);
                      return (
                        <label
                          key={chk}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs font-medium ${
                            checked
                              ? 'border-red-800 bg-red-50/40 text-slate-900'
                              : 'border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              updateCurrentRecordField(
                                'verificationChecks',
                                toggleArrayItem(
                                  currentRecord.verificationChecks,
                                  chk
                                )
                              )
                            }
                            className="mt-0.5 accent-red-800"
                          />
                          <span>{PTSP_VERIFICATION_LABELS[chk]}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Catatan hasil verifikasi:
                    </label>
                    <textarea
                      rows={2}
                      value={currentRecord.verificationNotes}
                      onChange={(e) =>
                        updateCurrentRecordField(
                          'verificationNotes',
                          e.target.value
                        )
                      }
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* C. Tujuan Disposisi */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">
                    C. Tujuan Disposisi
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(
                      Object.keys(
                        PTSP_DISPOSITION_LABELS
                      ) as PtspDispositionTarget[]
                    ).map((dsp) => {
                      const checked =
                        currentRecord.dispositionTargets.includes(dsp);
                      return (
                        <div
                          key={dsp}
                          className={`p-2.5 rounded-lg border ${
                            checked
                              ? 'border-red-800 bg-red-50/40'
                              : 'border-slate-200'
                          }`}
                        >
                          <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-slate-800">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                updateCurrentRecordField(
                                  'dispositionTargets',
                                  toggleArrayItem(
                                    currentRecord.dispositionTargets,
                                    dsp
                                  )
                                )
                              }
                              className="mt-0.5 accent-red-800"
                            />
                            <span>{PTSP_DISPOSITION_LABELS[dsp]}</span>
                          </label>
                          {dsp === 'unit_lainnya' && checked && (
                            <input
                              type="text"
                              value={currentRecord.dispositionOtherText}
                              onChange={(e) =>
                                updateCurrentRecordField(
                                  'dispositionOtherText',
                                  e.target.value
                                )
                              }
                              placeholder="Sebutkan unit kerja lainnya..."
                              className="mt-2 w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* D. Catatan dan Arahan */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <label className="block text-sm font-bold text-slate-900">
                    D. Catatan dan Arahan
                  </label>
                  <textarea
                    rows={3}
                    value={currentRecord.dispositionNotes}
                    onChange={(e) =>
                      updateCurrentRecordField(
                        'dispositionNotes',
                        e.target.value
                      )
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Pejabat / Unit Penerima Disposisi
                      </label>
                      <input
                        type="text"
                        value={currentRecord.dispositionReceiverName}
                        onChange={(e) =>
                          updateCurrentRecordField(
                            'dispositionReceiverName',
                            e.target.value
                          )
                        }
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <SignaturePad
                    label="Tanda Tangan Petugas PTSP"
                    value={currentRecord.ptspOfficerSignature}
                    onChange={(sig) =>
                      updateCurrentRecordField('ptspOfficerSignature', sig)
                    }
                    height={100}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 disabled:opacity-70 rounded-lg transition-all cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                        <span>Menyimpan Verifikasi...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Verifikasi Petugas</span>
                      </>
                    )}
                  </button>
                </div>
              </fieldset>
            </form>
          )}

          {/* 3. TANDA TERIMA PERMOHONAN PELAYANAN */}
          {!mustSelectRecordFirst && activeFormCode === 'formulir_3' && (
            <form
              onSubmit={(e) => handleSaveOtherForm(e, 'Tanda Terima Layanan')}
              className="space-y-5"
            >
              <fieldset disabled={isOfficerLocked} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nomor Registrasi
                    </label>
                    <input
                      type="text"
                      value={currentRecord.registrationNumber}
                      onChange={(e) =>
                        updateCurrentRecordField(
                          'registrationNumber',
                          e.target.value
                        )
                      }
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tanggal Tanda Terima (Subang, ... 20...)
                    </label>
                    <input
                      type="text"
                      value={currentRecord.receiptDateText}
                      onChange={(e) =>
                        updateCurrentRecordField(
                          'receiptDateText',
                          e.target.value
                        )
                      }
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Status Awal Permohonan
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(
                      Object.keys(
                        PTSP_INITIAL_STATUS_LABELS
                      ) as PtspInitialStatus[]
                    ).map((st) => (
                      <label
                        key={st}
                        className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer text-xs font-medium ${
                          currentRecord.initialStatus === st
                            ? 'border-red-800 bg-red-50/40 text-slate-900'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="ptsp_initial_status"
                          checked={currentRecord.initialStatus === st}
                          onChange={() =>
                            updateCurrentRecordField('initialStatus', st)
                          }
                          className="mt-0.5 accent-red-800"
                        />
                        <span>{PTSP_INITIAL_STATUS_LABELS[st]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Keterangan Tanda Terima
                  </label>
                  <textarea
                    rows={3}
                    value={currentRecord.receiptRemarks}
                    onChange={(e) =>
                      updateCurrentRecordField('receiptRemarks', e.target.value)
                    }
                    placeholder="Keterangan tambahan penerimaan berkas..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Tanda Terima
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 disabled:opacity-70 rounded-lg transition-all cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                        <span>Menyimpan Tanda Terima...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Tanda Terima</span>
                      </>
                    )}
                  </button>
                </div>
              </fieldset>
            </form>
          )}

          {/* 4. MONITORING DAN PENYELESAIAN PELAYANAN */}
          {!mustSelectRecordFirst && activeFormCode === 'formulir_4' && (
            <form
              onSubmit={(e) => handleSaveOtherForm(e, 'Monitoring Pelayanan')}
              className="space-y-5"
            >
              <fieldset disabled={isOfficerLocked} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      4. Unit Kerja yang Menangani
                    </label>
                    <input
                      type="text"
                      value={currentRecord.handlingUnit}
                      onChange={(e) =>
                        updateCurrentRecordField('handlingUnit', e.target.value)
                      }
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      5. Tanggal Diteruskan
                    </label>
                    <input
                      type="text"
                      value={currentRecord.forwardedDate}
                      onChange={(e) =>
                        updateCurrentRecordField(
                          'forwardedDate',
                          e.target.value
                        )
                      }
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      6. Petugas / Pejabat Penanggung Jawab
                    </label>
                    <input
                      type="text"
                      value={currentRecord.personInCharge}
                      onChange={(e) =>
                        updateCurrentRecordField(
                          'personInCharge',
                          e.target.value
                        )
                      }
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      7. Tanggal Penyelesaian
                    </label>
                    <input
                      type="text"
                      value={currentRecord.completionDate}
                      onChange={(e) =>
                        updateCurrentRecordField(
                          'completionDate',
                          e.target.value
                        )
                      }
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Status Penyelesaian
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(
                      Object.keys(
                        PTSP_COMPLETION_STATUS_LABELS
                      ) as PtspCompletionStatus[]
                    ).map((st) => (
                      <label
                        key={st}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs font-medium ${
                          currentRecord.completionStatus === st
                            ? 'border-red-800 bg-red-50/40 text-slate-900'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="ptsp_completion_status"
                          checked={currentRecord.completionStatus === st}
                          onChange={() =>
                            updateCurrentRecordField('completionStatus', st)
                          }
                          className="mt-0.5 accent-red-800"
                        />
                        <span>{PTSP_COMPLETION_STATUS_LABELS[st]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hasil / Tindak Lanjut
                  </label>
                  <textarea
                    rows={3}
                    value={currentRecord.followUpResult}
                    onChange={(e) =>
                      updateCurrentRecordField('followUpResult', e.target.value)
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan kepada Pemohon
                  </label>
                  <textarea
                    rows={2}
                    value={currentRecord.notesToApplicant}
                    onChange={(e) =>
                      updateCurrentRecordField(
                        'notesToApplicant',
                        e.target.value
                      )
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 disabled:opacity-70 rounded-lg transition-all cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                        <span>Menyimpan Monitoring...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Monitoring Pelayanan</span>
                      </>
                    )}
                  </button>
                </div>
              </fieldset>
            </form>
          )}

          {/* 5. SURVEI KEPUASAN MASYARAKAT TERHADAP PELAYANAN PTSP (TANPA NOMOR REGISTRASI -> MASUK INDEKS DASHBOARD) */}
          {activeFormCode === 'formulir_5' && (
            <form onSubmit={handleSaveSurvey} className="space-y-5">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                Penilaian ini <strong>tidak memerlukan Nomor Registrasi</strong>. Seluruh penilaian yang Anda berikan langsung dihitung ke dalam <strong>Indeks Kepuasan Masyarakat &amp; Kinerja Sistem Pelayanan</strong> pada Dashboard Pelayanan PTSP Bawaslu Kabupaten Subang.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Responden (Opsional)
                  </label>
                  <input
                    type="text"
                    value={currentRecord.fullName}
                    onChange={(e) =>
                      updateCurrentRecordField('fullName', e.target.value)
                    }
                    placeholder="Nama Anda / Anonim"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Penilaian
                  </label>
                  <input
                    type="text"
                    value={currentRecord.surveyDate}
                    onChange={(e) =>
                      updateCurrentRecordField('surveyDate', e.target.value)
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Layanan yang Dinilai
                  </label>
                  <select
                    value={currentRecord.serviceTypes[0] || 'ppid'}
                    onChange={(e) =>
                      updateCurrentRecordField('serviceTypes', [
                        e.target.value as PtspServiceType,
                      ])
                    }
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                  >
                    {(
                      Object.keys(PTSP_SERVICE_TYPE_LABELS) as PtspServiceType[]
                    ).map((srv) => (
                      <option key={srv} value={srv}>
                        {PTSP_SERVICE_TYPE_LABELS[srv]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-700">
                  Unsur Penilaian (1 = Tidak Baik | 2 = Kurang Baik | 3 = Baik |
                  4 = Sangat Baik)
                </div>

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                  {PTSP_SURVEY_QUESTIONS.map((q) => {
                    const currentScore = currentRecord.surveyScores[q.key];
                    return (
                      <div
                        key={q.key}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <span className="text-xs font-medium text-slate-800">
                          {q.no}. {q.label}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {([1, 2, 3, 4] as const).map((scoreVal) => (
                            <button
                              key={scoreVal}
                              type="button"
                              onClick={() =>
                                updateCurrentRecordField('surveyScores', {
                                  ...currentRecord.surveyScores,
                                  [q.key]: scoreVal,
                                })
                              }
                              className={`w-8 h-8 rounded-md text-xs font-bold font-mono transition-colors ${
                                currentScore === scoreVal
                                  ? 'bg-red-800 text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {scoreVal}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kritik dan Saran
                </label>
                <textarea
                  rows={3}
                  value={currentRecord.surveyFeedback}
                  onChange={(e) =>
                    updateCurrentRecordField('surveyFeedback', e.target.value)
                  }
                  placeholder="Tuliskan kritik dan saran untuk peningkatan layanan PTSP Bawaslu Kabupaten Subang..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Penilaian Keseluruhan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'sangat_puas', label: 'Sangat Puas' },
                      { id: 'puas', label: 'Puas' },
                      { id: 'kurang_puas', label: 'Kurang Puas' },
                      { id: 'tidak_puas', label: 'Tidak Puas' },
                    ] as { id: PtspOverallSatisfaction; label: string }[]
                  ).map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs font-semibold ${
                        currentRecord.overallSatisfaction === opt.id
                          ? 'border-red-800 bg-red-50/50 text-red-900'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="overall_satisfaction"
                        checked={currentRecord.overallSatisfaction === opt.id}
                        onChange={() =>
                          updateCurrentRecordField(
                            'overallSatisfaction',
                            opt.id
                          )
                        }
                        className="accent-red-800"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 disabled:opacity-70 rounded-lg transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                      <span>Mengirim Penilaian...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Survei Kepuasan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* 6. PEDOMAN PENGELOLAAN DOKUMEN & REGISTER HARIAN PTSP */}
          {activeFormCode === 'formulir_lampiran' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Daftar seluruh permohonan layanan yang tercatat secara detail dalam{' '}
                  <strong>Format Register Harian PTSP</strong> Bawaslu Kabupaten Subang.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      runFeatureAction('Mengunduh CSV Register PTSP', () => {
                        exportPtspRegisterCsv();
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh CSV Register PTSP
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      runFeatureAction('Menyiapkan Cetak Pedoman & Register PTSP', () => {
                        window.setTimeout(() => window.print(), 150);
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-red-900 hover:bg-red-950 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-300" />
                    Cetak Register &amp; Pedoman
                  </button>
                </div>
              </div>

              <div className="w-full overflow-hidden border border-stone-200 rounded-lg">
                <table className="w-full table-fixed text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-red-50/75 border-b border-red-200/80 text-[11px] font-bold uppercase text-red-950">
                      <th className="py-2.5 px-3 w-[6%]">No.</th>
                      <th className="py-2.5 px-3 w-[20%]">No. Registrasi &amp; Waktu</th>
                      <th className="py-2.5 px-3 w-[20%]">Pemohon &amp; Identitas</th>
                      <th className="py-2.5 px-3 w-[22%]">Jenis Layanan &amp; Keperluan</th>
                      <th className="py-2.5 px-3 w-[18%]">Unit Tujuan &amp; Petugas</th>
                      <th className="py-2.5 px-3 w-[14%]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {records.map((r, idx) => (
                      <tr key={r.id} className="hover:bg-amber-50/40">
                        <td className="py-3 px-3 font-mono tabular-nums align-top">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums break-all align-top">
                          <div className="font-bold text-red-900">
                            {r.registrationNumber}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 break-normal">
                            {r.receivedDate || r.dayAndDate}
                            {r.receivedTime ? ` · ${r.receivedTime}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-3 break-words align-top">
                          <div className="font-semibold text-slate-900">
                            {r.fullName}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            {r.institution || 'Masyarakat Umum'}
                          </div>
                          {r.nikOrIdentity && (
                            <div className="text-[10.5px] font-mono text-slate-400 mt-0.5">
                              NIK/ID: {r.nikOrIdentity}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 break-words align-top">
                          <div className="font-medium text-slate-900">
                            {r.serviceTypes
                              .map((s) => PTSP_SERVICE_TYPE_LABELS[s])
                              .join(', ')}
                          </div>
                          {r.purposeSummary && (
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                              {r.purposeSummary}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 break-words align-top">
                          <div className="font-medium text-slate-800">
                            {r.dispositionTargets
                              .map((d) => PTSP_DISPOSITION_LABELS[d])
                              .join(', ') ||
                              r.handlingUnit ||
                              '-'}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Petugas: {r.ptspOfficerName || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-3 break-words align-top">
                          <span
                            className={`font-semibold ${
                              r.completionStatus === 'selesai'
                                ? 'text-emerald-700'
                                : r.completionStatus === 'menunggu_verifikasi'
                                ? 'text-amber-700'
                                : 'text-blue-700'
                            }`}
                          >
                            {PTSP_COMPLETION_STATUS_LABELS[r.completionStatus]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* OFFICIAL DETAILED PTSP DOCUMENT SHEET (SHOWN ON OFFICER DESK & WHEN PRINTING) */}
        {activeFormCode !== 'formulir_1' && !mustSelectRecordFirst && (
          <div
            className={
              workspaceRole === 'officer'
                ? 'block max-w-4xl mx-auto w-full space-y-3 print:max-w-none print:space-y-0'
                : 'hidden print:block'
            }
          >
            {workspaceRole === 'officer' && (
              <div className="no-print bg-gradient-to-r from-amber-50 via-white to-red-50/60 border border-amber-300/80 rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-red-950">
                    Pratinjau Dokumen Resmi Detail (Siap Cetak PDF / Kertas)
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Lembar resmi di bawah ini otomatis terisi penuh sesuai data berkas dan langsung tercetak saat tombol Cetak diklik.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    runFeatureAction(
                      `Menyiapkan Cetak ${activeFormMeta.shortTitle}`,
                      () => {
                        window.setTimeout(() => window.print(), 150);
                      }
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Dokumen Detail
                </button>
              </div>
            )}
            <PtspOfficialSheets
              formCode={activeFormCode}
              record={currentRecord}
              allRecords={records}
            />
          </div>
        )}
      </div>
    </div>
  );
};
