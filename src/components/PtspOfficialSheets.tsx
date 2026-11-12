import React from 'react';
import { BAWASLU_LOGO_DATA_URI } from '../assets/bawasluLogo';
import {
  PtspRecord,
  PtspFormCode,
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
} from '../types/ptsp';

interface PtspOfficialSheetsProps {
  formCode: PtspFormCode;
  record: PtspRecord;
  allRecords: PtspRecord[];
}

const CheckBoxSymbol: React.FC<{ checked: boolean }> = ({ checked }) => (
  <span
    className={`inline-flex items-center justify-center w-3.5 h-3.5 border border-black text-[10px] font-bold leading-none select-none shrink-0 mt-0.5 ${
      checked
        ? 'bg-slate-900 text-white print:bg-transparent print:text-black'
        : 'bg-white text-transparent'
    }`}
  >
    {checked ? '✓' : ''}
  </span>
);

const PtspDocumentHeader: React.FC = () => (
  <div className="mb-4 font-sans">
    <div className="grid grid-cols-12 border border-black">
      <div className="col-span-5 border-r border-black p-3 flex flex-col items-center justify-center text-center gap-1.5">
        <img
          src={BAWASLU_LOGO_DATA_URI}
          alt="Logo Bawaslu Kabupaten Subang"
          className="w-12 h-12 object-contain"
        />
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-900">
          BAWASLU KABUPATEN SUBANG
        </span>
      </div>
      <div className="col-span-7 p-3 flex flex-col items-center justify-center text-center">
        <p className="font-bold text-[13.5px] uppercase leading-snug text-black">
          BADAN PENGAWAS PEMILIHAN UMUM
        </p>
        <p className="font-bold text-[13.5px] uppercase leading-snug text-black">
          KABUPATEN SUBANG
        </p>
        <p className="font-bold text-[13.5px] uppercase leading-snug text-black mt-0.5">
          FORMULIR PELAYANAN TERPADU
        </p>
        <p className="font-bold text-[13.5px] uppercase leading-snug text-black">
          SATU PINTU (PTSP)
        </p>
      </div>
    </div>

    <div className="text-center text-[11.5px] text-slate-900 mt-2 space-y-0.5">
      <p>
        Alamat:{' '}
        <span className="border-b border-dotted border-black px-2">
          Jl. Palabuan No. 9 Kel. Sukamelang Kec. Subang, Kabupaten Subang
        </span>
      </p>
      <p>
        Telepon/WhatsApp:{' '}
        <span className="border-b border-dotted border-black px-2 font-mono tabular-nums">
          (0260) 42423530
        </span>{' '}
        Email:{' '}
        <span className="border-b border-dotted border-black px-2">
          set.subangkab@bawaslu.go.id
        </span>{' '}
        Website:{' '}
        <span className="border-b border-dotted border-black px-2">
          subang.bawaslu.go.id
        </span>
      </p>
    </div>

    <div className="border-b-2 border-[#1e4e79] mt-3" />
  </div>
);

const PageFooter: React.FC<{ pageNum?: number }> = () => (
  <div className="mt-8 pt-3 text-center text-[11px] text-slate-500 font-sans">
    PTSP BAWASLU KABUPATEN SUBANG
  </div>
);

export const PtspOfficialSheets: React.FC<PtspOfficialSheetsProps> = ({
  formCode,
  record,
  allRecords,
}) => {
  const serviceSummaryText =
    record.serviceTypes
      .map((s) =>
        s === 'lainnya' && record.serviceOtherText
          ? `Lainnya (${record.serviceOtherText})`
          : PTSP_SERVICE_TYPE_LABELS[s]
      )
      .join(', ') || '-';

  const dispositionUnitText =
    record.dispositionTargets
      .map((d) =>
        d === 'unit_lainnya' && record.dispositionOtherText
          ? record.dispositionOtherText
          : PTSP_DISPOSITION_LABELS[d]
      )
      .join(', ') ||
    record.handlingUnit ||
    '-';

  // --- FORMULIR 1: PENDAFTARAN PELAYANAN PTSP (HALAMAN 2 & 3) ---
  if (formCode === 'formulir_1') {
    const leftColServices: PtspServiceType[] = [
      'ppid',
      'konsultasi_kepemiluan',
      'aspirasi_saran_masukan',
      'pelaporan_dugaan_pelanggaran',
      'informasi_penyelesaian_sengketa',
      'permohonan_audiensi',
      'lainnya',
    ];
    const rightColServices: PtspServiceType[] = [
      'permohonan_data_dokumen',
      'pengaduan_pelayanan_publik',
      'konsultasi_bantuan_hukum',
      'informasi_penanganan_pelanggaran',
      'administrasi_persuratan',
      'kehumasan_dokumentasi',
    ];

    return (
      <div className="space-y-6 print:space-y-0 font-sans text-[12.5px] leading-relaxed">
        <div className="bg-white text-black border border-slate-300 shadow-sm p-8 sm:p-10 max-w-[820px] mx-auto print-only-sheet">
          <PtspDocumentHeader />

          <div className="text-center my-4">
            <p className="font-bold text-sm uppercase text-black">
              PENDAFTARAN PELAYANAN PTSP
            </p>
          </div>

          {/* A. Identitas Pemohon */}
          <div className="mb-4">
            <p className="font-bold text-[#2e6da4] mb-2">
              A. Identitas Pemohon
            </p>
            <div className="space-y-1.5 pl-1">
              {[
                {
                  no: '1.',
                  label: 'Nomor Registrasi',
                  val: record.registrationNumber,
                  mono: true,
                },
                { no: '2.', label: 'Hari/Tanggal', val: record.dayAndDate },
                { no: '3.', label: 'Nama Lengkap', val: record.fullName },
                {
                  no: '4.',
                  label: 'NIK/Identitas (jika diperlukan)',
                  val: record.nikOrIdentity,
                  mono: true,
                },
                {
                  no: '5.',
                  label: 'Instansi/Organisasi (jika ada)',
                  val: record.institution,
                },
                { no: '6.', label: 'Jabatan (jika ada)', val: record.position },
                { no: '7.', label: 'Alamat', val: record.address },
                {
                  no: '8.',
                  label: 'Nomor Telepon/WhatsApp',
                  val: record.phoneWhatsapp,
                  mono: true,
                },
                { no: '9.', label: 'Email', val: record.email },
              ].map((row) => (
                <div
                  key={row.no}
                  className="grid grid-cols-12 gap-2 items-baseline"
                >
                  <div className="col-span-5 flex gap-1.5 font-semibold">
                    <span className="w-4 shrink-0">{row.no}</span>
                    <span>{row.label}</span>
                  </div>
                  <div className="col-span-7 flex gap-2">
                    <span
                      className={`flex-1 border-b border-dotted border-black min-h-[19px] px-1 ${
                        row.mono ? 'font-mono tabular-nums' : ''
                      }`}
                    >
                      {row.val}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* B. Jenis Layanan */}
          <div className="mb-4">
            <p className="font-bold text-[#2e6da4] mb-2">B. Jenis Layanan</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pl-1 text-[12px]">
              <div className="space-y-1.5">
                {leftColServices.map((srv) => (
                  <div key={srv}>
                    <div className="flex items-start gap-2">
                      <CheckBoxSymbol
                        checked={record.serviceTypes.includes(srv)}
                      />
                      <span>
                        {PTSP_SERVICE_TYPE_LABELS[srv]}
                        {srv === 'lainnya' ? ':' : ''}
                      </span>
                    </div>
                    {srv === 'lainnya' && (
                      <div className="pl-5 mt-1 border-b border-dotted border-black min-h-[18px]">
                        {record.serviceTypes.includes('lainnya')
                          ? record.serviceOtherText
                          : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {rightColServices.map((srv) => (
                  <div key={srv} className="flex items-start gap-2">
                    <CheckBoxSymbol
                      checked={record.serviceTypes.includes(srv)}
                    />
                    <span>{PTSP_SERVICE_TYPE_LABELS[srv]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* C. Uraian Maksud dan Tujuan Pelayanan */}
          <div className="mb-4">
            <p className="font-bold text-[#2e6da4] mb-1.5">
              C. Uraian Maksud dan Tujuan Pelayanan
            </p>
            <div className="border border-dotted border-black p-2.5 min-h-[76px] whitespace-pre-wrap bg-slate-50/40 print:bg-transparent">
              {record.purposeSummary ||
                '................................................................................................................................................'}
            </div>
          </div>

          {/* D. Dokumen Pendukung */}
          <div className="mb-5">
            <p className="font-bold text-[#2e6da4] mb-2">
              D. Dokumen Pendukung
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pl-1 text-[12px]">
              <div className="space-y-1.5">
                {(
                  [
                    'fotokopi_identitas',
                    'dokumen_pendukung',
                  ] as PtspSupportingDocType[]
                ).map((doc) => (
                  <div key={doc} className="flex items-start gap-2">
                    <CheckBoxSymbol
                      checked={record.supportingDocTypes.includes(doc)}
                    />
                    <span>{PTSP_SUPPORTING_DOC_LABELS[doc]}</span>
                  </div>
                ))}
                <div className="flex items-baseline gap-2">
                  <CheckBoxSymbol
                    checked={record.supportingDocTypes.includes(
                      'dokumen_lainnya'
                    )}
                  />
                  <span className="shrink-0">Dokumen lainnya:</span>
                  <span className="flex-1 border-b border-dotted border-black min-h-[18px]">
                    {record.supportingDocTypes.includes('dokumen_lainnya')
                      ? record.supportingDocOtherText
                      : ''}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                {(
                  [
                    'surat_permohonan_resmi',
                    'bukti_dokumentasi',
                  ] as PtspSupportingDocType[]
                ).map((doc) => (
                  <div key={doc} className="flex items-start gap-2">
                    <CheckBoxSymbol
                      checked={record.supportingDocTypes.includes(doc)}
                    />
                    <span>{PTSP_SUPPORTING_DOC_LABELS[doc]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* E. Pernyataan Pemohon (Halaman 3) */}
          <div className="pt-3 border-t border-slate-200">
            <p className="font-bold text-[#2e6da4] mb-1.5">
              E. Pernyataan Pemohon
            </p>
            <p className="text-justify leading-relaxed">
              Saya menyatakan bahwa informasi dan dokumen yang disampaikan dalam
              formulir ini adalah benar dan dapat dipertanggungjawabkan. Saya
              bersedia mengikuti prosedur pelayanan yang berlaku di lingkungan
              Bawaslu Kabupaten Subang.
            </p>

            <div className="grid grid-cols-2 gap-8 text-center mt-6">
              <div className="flex flex-col items-center">
                <p className="font-bold">Pemohon</p>
                <div className="h-16 flex items-center justify-center my-1">
                  {record.applicantSignature && (
                    <img
                      src={record.applicantSignature}
                      alt="Tanda Tangan Pemohon"
                      className="max-h-14 object-contain"
                    />
                  )}
                </div>
                <p>
                  (
                  <span className="inline-block min-w-[160px] border-b border-dotted border-black px-2">
                    {record.fullName}
                  </span>
                  )
                </p>
              </div>

              <div className="flex flex-col items-center">
                <p className="font-bold">Petugas Penerima</p>
                <div className="h-16 flex items-center justify-center my-1">
                  {record.ptspOfficerSignature && (
                    <img
                      src={record.ptspOfficerSignature}
                      alt="Tanda Tangan Petugas"
                      className="max-h-14 object-contain"
                    />
                  )}
                </div>
                <p>
                  (
                  <span className="inline-block min-w-[160px] border-b border-dotted border-black px-2">
                    {record.ptspOfficerName}
                  </span>
                  )
                </p>
              </div>
            </div>
          </div>

          <PageFooter pageNum={2} />
        </div>
      </div>
    );
  }

  // --- FORMULIR 2: LEMBAR PENERIMAAN DAN VERIFIKASI PETUGAS PTSP (HALAMAN 4 & 5) ---
  if (formCode === 'formulir_2') {
    const leftDispositions: PtspDispositionTarget[] = [
      'ketua_bawaslu',
      'divisi_pp_datin',
      'divisi_hukum_sengketa',
      'sekretariat_administrasi',
    ];
    const rightDispositions: PtspDispositionTarget[] = [
      'kepala_sekretariat',
      'divisi_pencegahan_parmas_humas',
      'ppid_bawaslu',
      'unit_lainnya',
    ];

    return (
      <div className="bg-white text-black border border-slate-300 shadow-sm p-8 sm:p-10 max-w-[820px] mx-auto print-only-sheet font-sans text-[12.5px] leading-relaxed">
        <PtspDocumentHeader />

        <div className="text-center my-4">
          <p className="font-bold text-sm uppercase text-black">
            LEMBAR PENERIMAAN DAN VERIFIKASI PETUGAS PTSP
          </p>
        </div>

        {/* A. Data Penerimaan */}
        <div className="mb-4">
          <p className="font-bold text-[#2e6da4] mb-2">A. Data Penerimaan</p>
          <div className="space-y-1.5 pl-1">
            {[
              {
                no: '1.',
                label: 'Nomor Registrasi',
                val: record.registrationNumber,
                mono: true,
              },
              {
                no: '2.',
                label: 'Tanggal Penerimaan',
                val: record.receivedDate || record.dayAndDate,
              },
              {
                no: '3.',
                label: 'Waktu Penerimaan',
                val: record.receivedTime,
                mono: true,
              },
              {
                no: '4.',
                label: 'Nama Petugas PTSP',
                val: record.ptspOfficerName,
              },
            ].map((row) => (
              <div
                key={row.no}
                className="grid grid-cols-12 gap-2 items-baseline"
              >
                <div className="col-span-5 flex gap-1.5 font-semibold">
                  <span className="w-4 shrink-0">{row.no}</span>
                  <span>{row.label}</span>
                </div>
                <div className="col-span-7 flex gap-2">
                  <span
                    className={`flex-1 border-b border-dotted border-black min-h-[19px] px-1 ${
                      row.mono ? 'font-mono tabular-nums' : ''
                    }`}
                  >
                    {row.val}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* B. Hasil Verifikasi Administratif */}
        <div className="mb-4">
          <p className="font-bold text-[#2e6da4] mb-2">
            B. Hasil Verifikasi Administratif
          </p>
          <div className="space-y-1.5 pl-1 text-[12px]">
            {(
              [
                'identitas_diperiksa',
                'formulir_diisi',
                'dokumen_tersedia',
                'substansi_diidentifikasi',
                'perlu_dilengkapi',
                'diteruskan_unit_terkait',
              ] as PtspVerificationCheck[]
            ).map((chk) => (
              <div key={chk} className="flex items-start gap-2">
                <CheckBoxSymbol
                  checked={record.verificationChecks.includes(chk)}
                />
                <span>{PTSP_VERIFICATION_LABELS[chk]}</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5">
            <p className="mb-1">Catatan hasil verifikasi:</p>
            <div className="border border-dotted border-black p-2.5 min-h-[60px] whitespace-pre-wrap bg-slate-50/40 print:bg-transparent">
              {record.verificationNotes ||
                '................................................................................................................................................'}
            </div>
          </div>
        </div>

        {/* C. Tujuan Disposisi */}
        <div className="mb-4">
          <p className="font-bold text-[#2e6da4] mb-2">C. Tujuan Disposisi</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pl-1 text-[12px]">
            <div className="space-y-1.5">
              {leftDispositions.map((dsp) => (
                <div key={dsp} className="flex items-start gap-2">
                  <CheckBoxSymbol
                    checked={record.dispositionTargets.includes(dsp)}
                  />
                  <span>{PTSP_DISPOSITION_LABELS[dsp]}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {rightDispositions.map((dsp) => (
                <div key={dsp}>
                  <div className="flex items-start gap-2">
                    <CheckBoxSymbol
                      checked={record.dispositionTargets.includes(dsp)}
                    />
                    <span>
                      {PTSP_DISPOSITION_LABELS[dsp]}
                      {dsp === 'unit_lainnya' ? ':' : ''}
                    </span>
                  </div>
                  {dsp === 'unit_lainnya' && (
                    <div className="pl-5 mt-1 border-b border-dotted border-black min-h-[18px]">
                      {record.dispositionTargets.includes('unit_lainnya')
                        ? record.dispositionOtherText
                        : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* D. Catatan dan Arahan */}
        <div className="mb-5">
          <p className="font-bold text-[#2e6da4] mb-1.5">
            D. Catatan dan Arahan
          </p>
          <div className="border border-dotted border-black p-2.5 min-h-[64px] whitespace-pre-wrap bg-slate-50/40 print:bg-transparent">
            {record.dispositionNotes ||
              '................................................................................................................................................'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 text-center mt-6">
          <div className="flex flex-col items-center">
            <p className="font-bold">Petugas PTSP</p>
            <div className="h-16 flex items-center justify-center my-1">
              {record.ptspOfficerSignature && (
                <img
                  src={record.ptspOfficerSignature}
                  alt="Tanda Tangan Petugas PTSP"
                  className="max-h-14 object-contain"
                />
              )}
            </div>
            <p>
              (
              <span className="inline-block min-w-[160px] border-b border-dotted border-black px-2">
                {record.ptspOfficerName}
              </span>
              )
            </p>
          </div>

          <div className="flex flex-col items-center">
            <p className="font-bold">Pejabat/Unit Penerima Disposisi</p>
            <div className="h-16 flex items-center justify-center my-1">
              {record.dispositionReceiverSignature && (
                <img
                  src={record.dispositionReceiverSignature}
                  alt="Tanda Tangan Penerima Disposisi"
                  className="max-h-14 object-contain"
                />
              )}
            </div>
            <p>
              (
              <span className="inline-block min-w-[160px] border-b border-dotted border-black px-2">
                {record.dispositionReceiverName}
              </span>
              )
            </p>
          </div>
        </div>

        <PageFooter pageNum={4} />
      </div>
    );
  }

  // --- FORMULIR 3: TANDA TERIMA PERMOHONAN PELAYANAN (HALAMAN 6) ---
  if (formCode === 'formulir_3') {
    return (
      <div className="bg-white text-black border border-slate-300 shadow-sm p-8 sm:p-10 max-w-[820px] mx-auto print-only-sheet font-sans text-[12.5px] leading-relaxed">
        <PtspDocumentHeader />

        <div className="text-center my-4">
          <p className="font-bold text-sm uppercase text-black">
            TANDA TERIMA PERMOHONAN PELAYANAN
          </p>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-baseline gap-2">
            <span className="font-bold shrink-0">Nomor Registrasi:</span>
            <span className="flex-1 border-b border-dotted border-black font-mono tabular-nums px-1">
              {record.registrationNumber}
            </span>
          </div>
          <p className="pt-1">Telah diterima permohonan pelayanan dari:</p>

          <div className="space-y-2 pl-2">
            {[
              { label: 'Nama Pemohon', val: record.fullName },
              { label: 'Instansi/Organisasi', val: record.institution || '-' },
              { label: 'Jenis Pelayanan', val: serviceSummaryText },
              {
                label: 'Tanggal Penerimaan',
                val: record.receivedDate || record.dayAndDate,
              },
              {
                label: 'Waktu Penerimaan',
                val: record.receivedTime,
                mono: true,
              },
              { label: 'Petugas Penerima', val: record.ptspOfficerName },
            ].map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-12 gap-2 items-baseline"
              >
                <div className="col-span-4 font-bold">{row.label}</div>
                <div className="col-span-8 flex">
                  <span
                    className={`flex-1 border-b border-dotted border-black min-h-[19px] px-1 ${
                      row.mono ? 'font-mono tabular-nums' : ''
                    }`}
                  >
                    {row.val}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Awal Permohonan */}
        <div className="mb-4">
          <p className="font-bold text-[#2e6da4] mb-2">
            Status Awal Permohonan
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pl-2 text-[12px]">
            {(
              [
                'diterima',
                'dalam_verifikasi',
                'perlu_kelengkapan_dokumen',
                'diteruskan_unit_terkait',
              ] as PtspInitialStatus[]
            ).map((st) => (
              <div key={st} className="flex items-start gap-2">
                <CheckBoxSymbol checked={record.initialStatus === st} />
                <span>{PTSP_INITIAL_STATUS_LABELS[st]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Keterangan */}
        <div className="mb-6">
          <p className="font-bold text-[#2e6da4] mb-1.5">Keterangan</p>
          <div className="border border-dotted border-black p-2.5 min-h-[68px] whitespace-pre-wrap bg-slate-50/40 print:bg-transparent">
            {record.receiptRemarks ||
              '................................................................................................................................................'}
          </div>
        </div>

        <div className="flex flex-col items-center text-center mt-6">
          <p className="font-bold">
            Subang,{' '}
            <span className="border-b border-dotted border-black px-3 font-normal">
              {record.receiptDateText || record.receivedDate || '.................... 2026'}
            </span>
          </p>
          <p className="font-bold mt-2">Petugas PTSP</p>
          <div className="h-16 flex items-center justify-center my-1">
            {record.ptspOfficerSignature && (
              <img
                src={record.ptspOfficerSignature}
                alt="Tanda Tangan Petugas PTSP"
                className="max-h-14 object-contain"
              />
            )}
          </div>
          <p className="font-bold">
            (
            <span className="inline-block min-w-[180px] border-b border-dotted border-black px-2 font-normal">
              {record.ptspOfficerName}
            </span>
            )
          </p>
        </div>

        <p className="mt-6 text-[11.5px] text-justify">
          <span className="font-bold">Catatan:</span> Tanda terima ini merupakan
          bukti penerimaan permohonan dan bukan merupakan bukti bahwa substansi
          permohonan telah disetujui atau diputuskan.
        </p>

        <PageFooter pageNum={6} />
      </div>
    );
  }

  // --- FORMULIR 4: MONITORING DAN PENYELESAIAN PELAYANAN (HALAMAN 7) ---
  if (formCode === 'formulir_4') {
    const leftStatuses: PtspCompletionStatus[] = [
      'menunggu_verifikasi',
      'menunggu_kelengkapan_dokumen',
      'selesai',
      'tidak_dapat_diproses',
    ];
    const rightStatuses: PtspCompletionStatus[] = [
      'dalam_proses',
      'telah_dikoordinasikan',
      'diteruskan_instansi_berwenang',
    ];

    return (
      <div className="bg-white text-black border border-slate-300 shadow-sm p-8 sm:p-10 max-w-[820px] mx-auto print-only-sheet font-sans text-[12.5px] leading-relaxed">
        <PtspDocumentHeader />

        <div className="text-center my-4">
          <p className="font-bold text-sm uppercase text-black">
            MONITORING DAN PENYELESAIAN PELAYANAN
          </p>
        </div>

        <div className="space-y-2 mb-4 pl-1">
          {[
            {
              no: '1.',
              label: 'Nomor Registrasi',
              val: record.registrationNumber,
              mono: true,
            },
            { no: '2.', label: 'Nama Pemohon', val: record.fullName },
            { no: '3.', label: 'Jenis Pelayanan', val: serviceSummaryText },
            {
              no: '4.',
              label: 'Unit Kerja yang Menangani',
              val: record.handlingUnit || dispositionUnitText,
            },
            {
              no: '5.',
              label: 'Tanggal Diteruskan',
              val: record.forwardedDate,
            },
            {
              no: '6.',
              label: 'Petugas/Pejabat Penanggung Jawab',
              val: record.personInCharge,
            },
            {
              no: '7.',
              label: 'Tanggal Penyelesaian',
              val: record.completionDate,
            },
          ].map((row) => (
            <div
              key={row.no}
              className="grid grid-cols-12 gap-2 items-baseline"
            >
              <div className="col-span-5 flex gap-1.5 font-bold">
                <span className="w-4 shrink-0">{row.no}</span>
                <span>{row.label}</span>
              </div>
              <div className="col-span-7 flex">
                <span
                  className={`flex-1 border-b border-dotted border-black min-h-[19px] px-1 ${
                    row.mono ? 'font-mono tabular-nums' : ''
                  }`}
                >
                  {row.val}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Status Penyelesaian */}
        <div className="mb-4">
          <p className="font-bold text-[#2e6da4] mb-2">Status Penyelesaian</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pl-1 text-[12px]">
            <div className="space-y-1.5">
              {leftStatuses.map((st) => (
                <div key={st} className="flex items-start gap-2">
                  <CheckBoxSymbol checked={record.completionStatus === st} />
                  <span>{PTSP_COMPLETION_STATUS_LABELS[st]}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {rightStatuses.map((st) => (
                <div key={st} className="flex items-start gap-2">
                  <CheckBoxSymbol checked={record.completionStatus === st} />
                  <span>{PTSP_COMPLETION_STATUS_LABELS[st]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hasil/Tindak Lanjut */}
        <div className="mb-4">
          <p className="font-bold text-[#2e6da4] mb-1.5">Hasil/Tindak Lanjut</p>
          <div className="border border-dotted border-black p-2.5 min-h-[90px] whitespace-pre-wrap bg-slate-50/40 print:bg-transparent">
            {record.followUpResult ||
              '................................................................................................................................................'}
          </div>
        </div>

        {/* Catatan kepada Pemohon */}
        <div className="mb-6">
          <p className="font-bold text-[#2e6da4] mb-1.5">
            Catatan kepada Pemohon
          </p>
          <div className="border border-dotted border-black p-2.5 min-h-[54px] whitespace-pre-wrap bg-slate-50/40 print:bg-transparent">
            {record.notesToApplicant ||
              '................................................................................................................................................'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 text-center mt-6">
          <div className="flex flex-col items-center">
            <p className="font-bold">Petugas Unit Kerja</p>
            <div className="h-16 flex items-center justify-center my-1">
              {record.unitOfficerSignature && (
                <img
                  src={record.unitOfficerSignature}
                  alt="Tanda Tangan Unit Kerja"
                  className="max-h-14 object-contain"
                />
              )}
            </div>
            <p>
              (
              <span className="inline-block min-w-[160px] border-b border-dotted border-black px-2">
                {record.unitOfficerName || record.personInCharge}
              </span>
              )
            </p>
          </div>

          <div className="flex flex-col items-center">
            <p className="font-bold">Petugas PTSP</p>
            <div className="h-16 flex items-center justify-center my-1">
              {record.ptspOfficerSignature && (
                <img
                  src={record.ptspOfficerSignature}
                  alt="Tanda Tangan Petugas PTSP"
                  className="max-h-14 object-contain"
                />
              )}
            </div>
            <p>
              (
              <span className="inline-block min-w-[160px] border-b border-dotted border-black px-2">
                {record.ptspOfficerName}
              </span>
              )
            </p>
          </div>
        </div>

        <PageFooter pageNum={7} />
      </div>
    );
  }

  // --- FORMULIR 5: SURVEI KEPUASAN MASYARAKAT TERHADAP PELAYANAN PTSP (HALAMAN 8 & 9) ---
  if (formCode === 'formulir_5') {
    return (
      <div className="bg-white text-black border border-slate-300 shadow-sm p-8 sm:p-10 max-w-[820px] mx-auto print-only-sheet font-sans text-[12.5px] leading-relaxed">
        <PtspDocumentHeader />

        <div className="text-center my-4">
          <p className="font-bold text-sm uppercase text-black">
            SURVEI KEPUASAN MASYARAKAT TERHADAP PELAYANAN PTSP
          </p>
        </div>

        <div className="space-y-2 mb-3 pl-1">
          {[
            {
              label: 'Nama Responden',
              val: record.fullName || 'Masyarakat / Pengguna Layanan PTSP',
              mono: false,
            },
            {
              label: 'Tanggal Pelayanan',
              val: record.surveyDate || record.receivedDate || record.dayAndDate,
              mono: false,
            },
            { label: 'Jenis Pelayanan', val: serviceSummaryText, mono: false },
          ].map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-12 gap-2 items-baseline"
            >
              <div className="col-span-4 font-bold">{row.label}</div>
              <div className="col-span-8 flex">
                <span
                  className={`flex-1 border-b border-dotted border-black min-h-[19px] px-1 ${
                    row.mono ? 'font-mono tabular-nums' : ''
                  }`}
                >
                  {row.val}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[12px] mt-3">
          Petunjuk: Berikan tanda centang (✓) pada salah satu nilai sesuai
          pengalaman pelayanan yang diterima.
        </p>
        <p className="text-[12px] mb-3 font-medium">
          Skala penilaian: 1 = Tidak Baik | 2 = Kurang Baik | 3 = Baik | 4 =
          Sangat Baik
        </p>

        {/* Tabel 8 Unsur Penilaian */}
        <table className="w-full border-collapse border border-black text-[12px] mb-5">
          <thead>
            <tr className="bg-[#1e4e79] text-white print:bg-slate-800">
              <th className="border border-black py-1.5 px-2 text-center w-12">
                No.
              </th>
              <th className="border border-black py-1.5 px-3 text-left">
                Unsur Penilaian
              </th>
              <th className="border border-black py-1.5 px-2 text-center w-16">
                1
              </th>
              <th className="border border-black py-1.5 px-2 text-center w-16">
                2
              </th>
              <th className="border border-black py-1.5 px-2 text-center w-16">
                3
              </th>
              <th className="border border-black py-1.5 px-2 text-center w-16">
                4
              </th>
            </tr>
          </thead>
          <tbody>
            {PTSP_SURVEY_QUESTIONS.map((q) => {
              const score = record.surveyScores[q.key];
              return (
                <tr key={q.key}>
                  <td className="border border-black py-2 px-2 text-center font-mono tabular-nums">
                    {q.no}
                  </td>
                  <td className="border border-black py-2 px-3">{q.label}</td>
                  {[1, 2, 3, 4].map((val) => (
                    <td
                      key={val}
                      className="border border-black py-2 px-2 text-center"
                    >
                      <div className="inline-flex justify-center">
                        <CheckBoxSymbol checked={score === val} />
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Kritik dan Saran */}
        <div className="mb-4">
          <p className="font-bold text-[#2e6da4] mb-1.5">Kritik dan Saran</p>
          <div className="border border-dotted border-black p-2.5 min-h-[68px] whitespace-pre-wrap bg-slate-50/40 print:bg-transparent">
            {record.surveyFeedback ||
              '................................................................................................................................................'}
          </div>
        </div>

        {/* Penilaian Keseluruhan (Halaman 9) */}
        <div className="mb-4">
          <p className="font-bold text-[#2e6da4] mb-2">Penilaian Keseluruhan</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-1 text-[12px]">
            {(
              [
                { id: 'sangat_puas', label: 'Sangat Puas' },
                { id: 'puas', label: 'Puas' },
                { id: 'kurang_puas', label: 'Kurang Puas' },
                { id: 'tidak_puas', label: 'Tidak Puas' },
              ] as const
            ).map((opt) => (
              <div key={opt.id} className="flex items-center gap-2">
                <CheckBoxSymbol
                  checked={record.overallSatisfaction === opt.id}
                />
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center italic text-[12px] mt-6">
          Terima kasih atas partisipasi Anda dalam meningkatkan kualitas
          pelayanan publik Bawaslu Kabupaten Subang.
        </p>

        <PageFooter pageNum={8} />
      </div>
    );
  }

  // --- FORMULIR LAMPIRAN: PEDOMAN PENGELOLAAN DOKUMEN PTSP & FORMAT REGISTER HARIAN PTSP (HALAMAN 1 & 10) ---
  return (
    <div className="space-y-6 print:space-y-0 font-sans text-[12.5px] leading-relaxed">
      {/* HALAMAN 10: FORMULIR LAMPIRAN & FORMAT REGISTER HARIAN PTSP */}
      <div className="bg-white text-black border border-slate-300 shadow-sm p-8 sm:p-10 max-w-[820px] mx-auto print-only-sheet">
        <PtspDocumentHeader />

        <div className="text-center my-4">
          <p className="font-bold text-sm uppercase text-black">
            PEDOMAN PENGELOLAAN DOKUMEN PTSP
          </p>
        </div>

        {/* A. Ketentuan Pengelolaan */}
        <div className="mb-4">
          <p className="font-bold text-[#2e6da4] mb-1.5">
            A. Ketentuan Pengelolaan
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-[12px]">
            <li>
              Petugas PTSP menerima pemohon, mengidentifikasi kebutuhan layanan,
              dan memberikan penjelasan awal mengenai persyaratan serta alur
              pelayanan.
            </li>
            <li>
              Setiap permohonan yang masuk dicatat dalam buku register atau
              sistem pencatatan PTSP dan diberikan nomor registrasi serta tanda
              terima sesuai jenis layanan.
            </li>
            <li>
              Petugas PTSP melakukan pemeriksaan administratif awal dan
              meneruskan permohonan kepada unit kerja sesuai kewenangannya.
            </li>
            <li>
              Unit kerja terkait bertanggung jawab atas tindak lanjut dan
              penyelesaian substansi pelayanan.
            </li>
            <li>
              Petugas PTSP melakukan pemantauan status permohonan sampai
              memperoleh informasi penyelesaian dan menyampaikan perkembangan
              kepada pemohon.
            </li>
            <li>
              Dokumen pelayanan disimpan dan diarsipkan sesuai ketentuan
              kearsipan, klasifikasi keamanan, dan akses informasi.
            </li>
          </ol>
        </div>

        {/* B. Format Register Harian PTSP */}
        <div className="mb-4 w-full overflow-hidden">
          <p className="font-bold text-[#2e6da4] mb-2">
            B. Format Register Harian PTSP
          </p>
          <table className="w-full table-fixed border-collapse border border-black text-[10.5px]">
            <thead>
              <tr className="bg-[#1e4e79] text-white print:bg-slate-800">
                <th className="border border-black py-1.5 px-1 text-center w-[5%]">
                  No.
                </th>
                <th className="border border-black py-1.5 px-1.5 text-left w-[14%]">
                  Tanggal &amp; Jam
                </th>
                <th className="border border-black py-1.5 px-1.5 text-left w-[18%]">
                  No. Registrasi
                </th>
                <th className="border border-black py-1.5 px-1.5 text-left w-[18%]">
                  Nama Pemohon &amp; Instansi
                </th>
                <th className="border border-black py-1.5 px-1.5 text-left w-[19%]">
                  Jenis Layanan &amp; Keperluan
                </th>
                <th className="border border-black py-1.5 px-1.5 text-left w-[14%]">
                  Unit Tujuan &amp; Petugas
                </th>
                <th className="border border-black py-1.5 px-1.5 text-left w-[12%]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {allRecords.map((r, idx) => {
                const srvLabel =
                  r.serviceTypes
                    .map((s) => PTSP_SERVICE_TYPE_LABELS[s])
                    .join(', ') || '-';
                const unitLabel =
                  r.dispositionTargets
                    .map((d) => PTSP_DISPOSITION_LABELS[d])
                    .join(', ') ||
                  r.handlingUnit ||
                  '-';
                return (
                  <tr key={r.id}>
                    <td className="border border-black py-1.5 px-1 text-center font-mono tabular-nums align-top">
                      {idx + 1}
                    </td>
                    <td className="border border-black py-1.5 px-1.5 break-words align-top">
                      <div>{r.receivedDate || r.dayAndDate}</div>
                      {r.receivedTime && (
                        <div className="font-mono text-[9.5px]">
                          {r.receivedTime}
                        </div>
                      )}
                    </td>
                    <td className="border border-black py-1.5 px-1.5 font-mono tabular-nums break-all align-top font-semibold">
                      {r.registrationNumber}
                    </td>
                    <td className="border border-black py-1.5 px-1.5 break-words align-top">
                      <div className="font-bold">{r.fullName}</div>
                      <div className="text-[10px]">
                        {r.institution || 'Masyarakat Umum'}
                      </div>
                      {r.nikOrIdentity && (
                        <div className="font-mono text-[9.5px]">
                          NIK: {r.nikOrIdentity}
                        </div>
                      )}
                    </td>
                    <td className="border border-black py-1.5 px-1.5 break-words align-top">
                      <div className="font-semibold">{srvLabel}</div>
                      {r.purposeSummary && (
                        <div className="text-[10px] mt-0.5">
                          {r.purposeSummary}
                        </div>
                      )}
                    </td>
                    <td className="border border-black py-1.5 px-1.5 break-words align-top">
                      <div>{unitLabel}</div>
                      {r.ptspOfficerName && (
                        <div className="text-[9.5px] mt-0.5">
                          Petugas: {r.ptspOfficerName}
                        </div>
                      )}
                    </td>
                    <td className="border border-black py-1.5 px-1.5 break-words align-top font-semibold">
                      {PTSP_COMPLETION_STATUS_LABELS[r.completionStatus]}
                    </td>
                  </tr>
                );
              })}
              {/* Blank rows to match official register table appearance */}
              {Array.from({
                length: Math.max(1, 6 - allRecords.length),
              }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-7">
                  <td className="border border-black" />
                  <td className="border border-black" />
                  <td className="border border-black" />
                  <td className="border border-black" />
                  <td className="border border-black" />
                  <td className="border border-black" />
                  <td className="border border-black" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* C. Catatan Penerapan */}
        <div className="mb-4">
          <p className="font-bold text-[#2e6da4] mb-1">C. Catatan Penerapan</p>
          <p className="text-[12px] text-justify">
            Sebelum diberlakukan, paket formulir ini perlu diselaraskan dengan
            Standar Pelayanan, SOP PTSP, struktur organisasi, nomenklatur
            divisi/unit kerja, ketentuan PPID, serta peraturan Bawaslu dan
            peraturan pelayanan publik yang berlaku. Isian alamat, kontak,
            identitas visual, kode dokumen, dan pejabat penanggung jawab agar
            dilengkapi oleh Bawaslu Kabupaten Subang.
          </p>
        </div>

        <p className="text-center font-bold text-[#1e4e79] mt-4">
          BAWASLU KABUPATEN SUBANG
        </p>

        <PageFooter pageNum={10} />
      </div>
    </div>
  );
};
