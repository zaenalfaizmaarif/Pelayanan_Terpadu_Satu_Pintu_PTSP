import React, { useState, useMemo } from 'react';
import {
  PtspRecord,
  PtspFormCode,
  PTSP_SERVICE_TYPE_LABELS,
  PTSP_DISPOSITION_LABELS,
  PTSP_INITIAL_STATUS_LABELS,
  PTSP_COMPLETION_STATUS_LABELS,
} from '../types/ptsp';
import {
  CheckCircle2,
  Clock,
  FileText,
  Printer,
  ClipboardCheck,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';

interface ApplicationTrackerCardProps {
  records: PtspRecord[];
  mode: 'applicant' | 'officer';
  onInspectPrintRecord?: (record: PtspRecord, formCode: PtspFormCode) => void;
  onSelectRecordForOfficer?: (record: PtspRecord, formCode: PtspFormCode) => void;
}

export const ApplicationTrackerCard: React.FC<ApplicationTrackerCardProps> = ({
  records,
  mode,
  onInspectPrintRecord,
  onSelectRecordForOfficer,
}) => {
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const matchedRecords = useMemo(() => {
    if (!searchedQuery) return [];
    const qUpper = searchedQuery.trim().toUpperCase();
    if (!qUpper) return [];
    return records.filter((rec) => {
      const regUpper = rec.registrationNumber.trim().toUpperCase();
      const idUpper = rec.id.trim().toUpperCase();
      const nameUpper = rec.fullName.trim().toUpperCase();
      const nikUpper = rec.nikOrIdentity.trim().toUpperCase();

      const seqMatch = regUpper.match(/^(\d+)/);
      const queryNumMatch = qUpper.match(/^0*(\d+)$/);
      const isSeqEqual =
        seqMatch &&
        queryNumMatch &&
        parseInt(seqMatch[1], 10) === parseInt(queryNumMatch[1], 10);

      return (
        regUpper.includes(qUpper) ||
        idUpper.includes(qUpper) ||
        nameUpper.includes(qUpper) ||
        (nikUpper && nikUpper.includes(qUpper)) ||
        Boolean(isSeqEqual)
      );
    });
  }, [records, searchedQuery]);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSearching) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchedQuery(null);
      return;
    }

    setIsSearching(true);
    setTimeout(() => {
      setSearchedQuery(trimmed);
      setIsSearching(false);
    }, 400);
  };

  const handleQuickClear = () => {
    setQuery('');
    setSearchedQuery(null);
    setIsSearching(false);
  };

  return (
    <div className="no-print bg-gradient-to-b from-red-50/60 via-white to-amber-50/35 border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
      <div className="max-w-2xl mx-auto text-center">
        <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-red-900 bg-amber-100/80 border border-amber-300/70 px-3 py-0.5 rounded-md mb-2">
          Pelacakan Berkas PTSP
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-red-950 tracking-tight">
          Lacak Status Permohonan
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
          Masukkan Nomor Resi / Pendaftaran untuk mengetahui status terkini berkas Anda.
        </p>

        <form
          onSubmit={handleTrackSubmit}
          className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Contoh: PTSP-2026-001 atau 001/PTSP/686138/XI/2026"
              className="w-full px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 bg-white border-2 border-stone-300 focus:border-red-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/15 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={handleQuickClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label="Bersihkan pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-[#7F1D1D] to-[#58111A] hover:from-red-900 hover:to-red-950 disabled:opacity-75 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                <span>Melacak...</span>
              </>
            ) : (
              <span>Lacak Berkas</span>
            )}
          </button>
        </form>
      </div>

      {isSearching && (
        <div className="max-w-3xl mx-auto mt-6 pt-6 border-t border-slate-200 flex items-center justify-center gap-2.5 text-xs font-semibold text-red-900 py-4">
          <Loader2 className="w-4 h-4 text-red-800 animate-spin" />
          <span>Mencari berkas permohonan pada Register Harian PTSP...</span>
        </div>
      )}

      {/* SEARCH RESULTS */}
      {!isSearching && searchedQuery !== null && (
        <div className="max-w-3xl mx-auto mt-6 pt-6 border-t border-slate-200">
          {matchedRecords.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">
                  Berkas dengan nomor resi / kata kunci &ldquo;{searchedQuery}&rdquo; tidak ditemukan.
                </div>
                <p className="text-amber-800">
                  Pastikan Nomor Pendaftaran / Resi sesuai dengan bukti pendaftaran Anda (contoh:{' '}
                  <span className="font-mono font-semibold">PTSP-2026-001</span> atau{' '}
                  <span className="font-mono font-semibold">001/PTSP/686138/XI/2026</span>).
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Ditemukan <strong className="text-slate-900">{matchedRecords.length}</strong> berkas permohonan untuk{' '}
                  <span className="font-mono font-semibold text-slate-800">&ldquo;{searchedQuery}&rdquo;</span>
                </span>
                <button
                  type="button"
                  onClick={handleQuickClear}
                  className="text-slate-500 hover:text-slate-900 font-medium"
                >
                  Tutup Hasil
                </button>
              </div>

              {matchedRecords.map((rec) => {
                const isDone = rec.completionStatus === 'selesai';
                const isPending = rec.completionStatus === 'menunggu_verifikasi';
                const isNeedDocs =
                  rec.completionStatus === 'menunggu_kelengkapan_dokumen' ||
                  rec.initialStatus === 'perlu_kelengkapan_dokumen';

                return (
                  <div
                    key={rec.id}
                    className="border border-slate-200 rounded-xl p-5 bg-slate-50/60 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-slate-900 text-white">
                            {rec.id}
                          </span>
                          <span className="text-xs font-mono font-bold text-red-800">
                            {rec.registrationNumber}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-600">
                            Diterima: {rec.receivedDate || rec.dayAndDate} ({rec.receivedTime})
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1.5">
                          {rec.fullName}{' '}
                          <span className="text-xs font-normal text-slate-500">
                            ({rec.institution || 'Masyarakat Umum'})
                          </span>
                        </h3>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                            isDone
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : isNeedDocs
                              ? 'bg-red-50 border-red-200 text-red-800'
                              : isPending
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-blue-50 border-blue-200 text-blue-800'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {PTSP_COMPLETION_STATUS_LABELS[rec.completionStatus]}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Grid Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                        <div className="text-slate-500">Jenis Layanan PTSP</div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {rec.serviceTypes
                            .map((s) => PTSP_SERVICE_TYPE_LABELS[s])
                            .join(', ')}
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                        <div className="text-slate-500">Unit Kerja Tujuan / Penanganan</div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {rec.dispositionTargets
                            .map((d) => PTSP_DISPOSITION_LABELS[d])
                            .join(', ') ||
                            rec.handlingUnit ||
                            '-'}
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                        <div className="text-slate-500">Status Penerimaan Awal &amp; Petugas</div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {PTSP_INITIAL_STATUS_LABELS[rec.initialStatus]} · Petugas:{' '}
                          {rec.ptspOfficerName || '-'}
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                        <div className="text-slate-500">Tindak Lanjut / Catatan Petugas</div>
                        <div className="font-medium text-slate-800 mt-0.5">
                          {rec.notesToApplicant ||
                            rec.followUpResult ||
                            rec.receiptRemarks ||
                            'Berkas sedang dalam pemantauan petugas PTSP.'}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {onInspectPrintRecord && (
                        <>
                          <button
                            type="button"
                            onClick={() => onInspectPrintRecord(rec, 'formulir_1')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-600" />
                            <span>Lihat Bukti Pendaftaran</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onInspectPrintRecord(rec, 'formulir_3')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>Cetak Tanda Terima</span>
                          </button>
                        </>
                      )}

                      {mode === 'officer' && onSelectRecordForOfficer && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              onSelectRecordForOfficer(rec, 'formulir_2')
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 rounded-lg transition-colors"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>Buka &amp; Verifikasi Berkas</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onSelectRecordForOfficer(rec, 'formulir_4')
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <span>Update Monitoring</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
