import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Printer,
  QrCode,
  RotateCcw,
  Smartphone,
} from 'lucide-react';
import { BAWASLU_LOGO_DATA_URI } from '../assets/bawasluLogo';

export type QrServiceTarget = 'pendaftaran' | 'survei' | 'lacak';

interface PtspQrBarcodePanelProps {
  /** 'officer' = diakses dari Meja Petugas, 'applicant' = diakses dari Portal Pemohon */
  mode?: 'officer' | 'applicant';
}

const OFFICIAL_PUBLIC_ORIGIN =
  'https://pelayanan-terpadu-satu-pintu-ptsp.vercel.app';

const SERVICE_TARGETS: Array<{
  id: QrServiceTarget;
  label: string;
  posterHeadline: string;
  posterSubtitle: string;
  pathSuffix: string;
  steps: [string, string, string];
}> = [
  {
    id: 'pendaftaran',
    label: 'Pendaftaran Pelayanan PTSP',
    posterHeadline: 'SCAN UNTUK AKSES PELAYANAN PTSP',
    posterSubtitle:
      'Pendaftaran Permohonan Informasi, Konsultasi, Pengaduan & Layanan Publik',
    pathSuffix: '/pelayanan',
    steps: [
      'Buka aplikasi Kamera HP atau Google Lens',
      'Arahkan kamera ke QR Code di atas lalu ketuk tautan',
      'Isi Formulir Pendaftaran Pelayanan PTSP secara mandiri',
    ],
  },
  {
    id: 'survei',
    label: 'Survei Kepuasan Masyarakat',
    posterHeadline: 'SCAN UNTUK SURVEI KEPUASAN (SKM)',
    posterSubtitle:
      'Penilaian Mutu Layanan PTSP Bawaslu Kabupaten Subang (8 Unsur Pelayanan)',
    pathSuffix: '/pelayanan?layanan=survei',
    steps: [
      'Buka aplikasi Kamera HP atau Google Lens',
      'Arahkan kamera ke QR Code di atas lalu buka tautan',
      'Berikan penilaian Anda untuk peningkatan kualitas layanan',
    ],
  },
  {
    id: 'lacak',
    label: 'Lacak Status Permohonan',
    posterHeadline: 'SCAN UNTUK LACAK STATUS BERKAS',
    posterSubtitle:
      'Pantau Perkembangan Berkas PTSP Secara Real-Time dengan Nomor Registrasi',
    pathSuffix: '/pelayanan?layanan=lacak',
    steps: [
      'Buka aplikasi Kamera HP atau Google Lens',
      'Arahkan kamera ke QR Code di atas lalu ketuk tautan',
      'Masukkan Nomor Registrasi PTSP untuk cek status berkas',
    ],
  },
];

const QR_CUSTOM_URL_STORAGE_KEY = 'bawaslu_subang_ptsp_qr_url_v1';

function detectInitialOrigin(): string {
  if (typeof window === 'undefined') return OFFICIAL_PUBLIC_ORIGIN;
  try {
    const saved = localStorage.getItem(QR_CUSTOM_URL_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // ignore storage errors
  }
  const { hostname, origin } = window.location;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0';
  return isLocal ? OFFICIAL_PUBLIC_ORIGIN : origin;
}

function resolveTargetUrl(
  raw: string,
  pathSuffix: string
): { url: string; isDirectShortLink: boolean } {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return {
      url: `${OFFICIAL_PUBLIC_ORIGIN}${pathSuffix}`,
      isDirectShortLink: false,
    };
  }
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const cleanPath = parsed.pathname.replace(/\/+$/, '').toLowerCase();
    // Jika link punya slug/path khusus seperti s.id/ptsp-bawaslu-subang atau bit.ly/..., pakai persis apa adanya
    if (cleanPath && cleanPath !== '/pelayanan') {
      return {
        url: parsed.href.replace(/\/+$/, ''),
        isDirectShortLink: true,
      };
    }
    return {
      url: `${parsed.origin}${pathSuffix}`,
      isDirectShortLink: false,
    };
  } catch {
    return {
      url: `${withProtocol.replace(/\/pelayanan(\?.*)?$/i, '')}${pathSuffix}`,
      isDirectShortLink: false,
    };
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let line = '';
  let y = startY;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, centerX, y);
      line = words[i];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, centerX, y);
    y += lineHeight;
  }
  return y;
}

export function PtspQrBarcodePanel({
  mode = 'officer',
}: PtspQrBarcodePanelProps) {
  const [selectedTarget, setSelectedTarget] =
    useState<QrServiceTarget>('pendaftaran');
  const [customOrigin, setCustomOrigin] = useState<string>(() =>
    detectInitialOrigin()
  );
  const [includeCenterLogo, setIncludeCenterLogo] = useState<boolean>(true);
  const [showUrlOnPoster, setShowUrlOnPoster] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [qrError, setQrError] = useState<string>('');

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activePreset = useMemo(
    () =>
      SERVICE_TARGETS.find((item) => item.id === selectedTarget) ||
      SERVICE_TARGETS[0],
    [selectedTarget]
  );

  const currentWindowOrigin =
    typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    try {
      if (customOrigin.trim()) {
        localStorage.setItem(QR_CUSTOM_URL_STORAGE_KEY, customOrigin.trim());
      }
    } catch {
      // ignore storage errors
    }
  }, [customOrigin]);

  const { url: targetUrl, isDirectShortLink } = useMemo(
    () => resolveTargetUrl(customOrigin, activePreset.pathSuffix),
    [customOrigin, activePreset.pathSuffix]
  );

  const isLocalTarget = useMemo(() => {
    return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(
      targetUrl
    );
  }, [targetUrl]);

  // Render crisp high-resolution QR Code onto preview canvas
  useEffect(() => {
    let cancelled = false;

    async function renderPreviewQr() {
      const canvas = qrCanvasRef.current;
      if (!canvas) return;

      try {
        setQrError('');
        const size = 640;
        await QRCode.toCanvas(canvas, targetUrl, {
          width: size,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#111827',
            light: '#FFFFFF',
          },
        });

        if (cancelled) return;

        if (includeCenterLogo) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            try {
              const logoImg = await loadImage(BAWASLU_LOGO_DATA_URI);
              if (cancelled) return;
              // Keep center emblem <= 18% of total QR width for instant scanning on all phones
              const boxSize = Math.round(size * 0.2);
              const boxX = Math.round((size - boxSize) / 2);
              const boxY = Math.round((size - boxSize) / 2);

              ctx.save();
              ctx.fillStyle = '#FFFFFF';
              drawRoundedRect(ctx, boxX, boxY, boxSize, boxSize, 18);
              ctx.fill();
              ctx.strokeStyle = '#E7E5E4';
              ctx.lineWidth = 3;
              ctx.stroke();

              const padding = 14;
              ctx.drawImage(
                logoImg,
                boxX + padding,
                boxY + padding,
                boxSize - padding * 2,
                boxSize - padding * 2
              );
              ctx.restore();
            } catch {
              // QR remains valid without center logo if image fails
            }
          }
        }
      } catch {
        if (!cancelled) {
          setQrError(
            'Gagal membuat QR Code. Periksa kembali format tautan URL tujuan.'
          );
        }
      }
    }

    void renderPreviewQr();
    return () => {
      cancelled = true;
    };
  }, [targetUrl, includeCenterLogo]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback copy via temporary input
      const temp = document.createElement('input');
      temp.value = targetUrl;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownloadQrOnly = async () => {
    try {
      const exportCanvas = document.createElement('canvas');
      const size = 1024;
      await QRCode.toCanvas(exportCanvas, targetUrl, {
        width: size,
        margin: 3,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#111827',
          light: '#FFFFFF',
        },
      });

      if (includeCenterLogo) {
        const ctx = exportCanvas.getContext('2d');
        if (ctx) {
          try {
            const logoImg = await loadImage(BAWASLU_LOGO_DATA_URI);
            const boxSize = Math.round(size * 0.2);
            const boxX = Math.round((size - boxSize) / 2);
            const boxY = Math.round((size - boxSize) / 2);

            ctx.save();
            ctx.fillStyle = '#FFFFFF';
            drawRoundedRect(ctx, boxX, boxY, boxSize, boxSize, 26);
            ctx.fill();
            ctx.strokeStyle = '#E7E5E4';
            ctx.lineWidth = 4;
            ctx.stroke();

            const padding = 22;
            ctx.drawImage(
              logoImg,
              boxX + padding,
              boxY + padding,
              boxSize - padding * 2,
              boxSize - padding * 2
            );
            ctx.restore();
          } catch {
            // keep pure QR
          }
        }
      }

      const dataUrl = exportCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `QR_PTSP_${activePreset.id}_Bawaslu_Subang.png`;
      link.click();

      setDownloadStatus('QR Code PNG berhasil diunduh.');
      window.setTimeout(() => setDownloadStatus(''), 2600);
    } catch {
      setQrError('Gagal mengunduh gambar QR Code.');
    }
  };

  const handleDownloadPosterPng = async () => {
    try {
      const posterWidth = 1240;
      const posterHeight = 1754; // A4 proportion @ 150 DPI
      const canvas = document.createElement('canvas');
      canvas.width = posterWidth;
      canvas.height = posterHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clean white A4 canvas
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, posterWidth, posterHeight);

      // Subtle outer frame
      ctx.strokeStyle = '#D6D3D1';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, 40, 40, posterWidth - 80, posterHeight - 80, 28);
      ctx.stroke();

      // Maroon Institutional Header Banner
      const headerGrad = ctx.createLinearGradient(40, 40, posterWidth - 40, 340);
      headerGrad.addColorStop(0, '#6B1114');
      headerGrad.addColorStop(0.55, '#7F1D1D');
      headerGrad.addColorStop(1, '#4C0519');
      ctx.save();
      drawRoundedRect(ctx, 40, 40, posterWidth - 80, 310, 28);
      ctx.clip();
      ctx.fillStyle = headerGrad;
      ctx.fillRect(40, 40, posterWidth - 80, 310);
      // Flatten bottom corners of banner
      ctx.fillRect(40, 280, posterWidth - 80, 70);
      ctx.restore();

      // Gold accent bar below header
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(40, 346, posterWidth - 80, 10);

      // Centered Bawaslu Logo inside white rounded frame
      try {
        const logoImg = await loadImage(BAWASLU_LOGO_DATA_URI);
        const logoBox = 112;
        const logoX = (posterWidth - logoBox) / 2;
        const logoY = 72;
        ctx.fillStyle = '#FFFFFF';
        drawRoundedRect(ctx, logoX, logoY, logoBox, logoBox, 22);
        ctx.fill();
        ctx.drawImage(logoImg, logoX + 14, logoY + 14, logoBox - 28, logoBox - 28);
      } catch {
        // ignore logo failure
      }

      // Header Institutional Text
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FDE68A';
      ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        'BADAN PENGAWAS PEMILIHAN UMUM KABUPATEN SUBANG',
        posterWidth / 2,
        232
      );

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 38px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        'PELAYANAN TERPADU SATU PINTU (PTSP)',
        posterWidth / 2,
        286
      );

      ctx.fillStyle = '#FEF3C7';
      ctx.font = '500 21px "Public Sans", sans-serif';
      ctx.fillText(
        'Akses Cepat Layanan Publik Digital Secara Mandiri',
        posterWidth / 2,
        324
      );

      // Main Scan Headline
      ctx.fillStyle = '#7F1D1D';
      ctx.font = '800 40px "Plus Jakarta Sans", sans-serif';
      const afterHeadlineY = wrapCanvasText(
        ctx,
        activePreset.posterHeadline,
        posterWidth / 2,
        438,
        posterWidth - 200,
        52
      );

      ctx.fillStyle = '#475569';
      ctx.font = '500 24px "Public Sans", sans-serif';
      const afterSubY = wrapCanvasText(
        ctx,
        activePreset.posterSubtitle,
        posterWidth / 2,
        afterHeadlineY + 8,
        posterWidth - 240,
        34
      );

      // Render high-res QR Code onto offscreen canvas
      const qrSize = 620;
      const qrOffscreen = document.createElement('canvas');
      await QRCode.toCanvas(qrOffscreen, targetUrl, {
        width: qrSize,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#111827',
          light: '#FFFFFF',
        },
      });

      const qrBoxPad = 32;
      const qrBoxSize = qrSize + qrBoxPad * 2;
      const qrBoxX = (posterWidth - qrBoxSize) / 2;
      const qrBoxY = Math.max(afterSubY + 26, 540);

      // Clean QR Frame
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
      ctx.fill();
      ctx.strokeStyle = '#7F1D1D';
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.drawImage(
        qrOffscreen,
        qrBoxX + qrBoxPad,
        qrBoxY + qrBoxPad,
        qrSize,
        qrSize
      );

      // Center Bawaslu Emblem on Poster QR
      if (includeCenterLogo) {
        try {
          const logoImg = await loadImage(BAWASLU_LOGO_DATA_URI);
          const emblemSize = Math.round(qrSize * 0.2);
          const emblemX = qrBoxX + qrBoxPad + Math.round((qrSize - emblemSize) / 2);
          const emblemY = qrBoxY + qrBoxPad + Math.round((qrSize - emblemSize) / 2);

          ctx.fillStyle = '#FFFFFF';
          drawRoundedRect(ctx, emblemX, emblemY, emblemSize, emblemSize, 20);
          ctx.fill();
          ctx.strokeStyle = '#E7E5E4';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.drawImage(
            logoImg,
            emblemX + 14,
            emblemY + 14,
            emblemSize - 28,
            emblemSize - 28
          );
        } catch {
          // ignore
        }
      }

      // Optional Monospace Target URL Strip (hidden by default so vercel.app is not shown on poster)
      let stepsBoxY = qrBoxY + qrBoxSize + 44;
      if (showUrlOnPoster) {
        const urlY = qrBoxY + qrBoxSize + 52;
        ctx.fillStyle = '#0F172A';
        ctx.font = '600 22px "JetBrains Mono", monospace';
        ctx.fillText(targetUrl, posterWidth / 2, urlY);
        stepsBoxY = urlY + 38;
      }

      // 3-Step Guide Box
      const stepsBoxW = posterWidth - 180;
      const stepsBoxX = 90;
      const stepsBoxH = 210;

      ctx.fillStyle = '#FAF8F5';
      drawRoundedRect(ctx, stepsBoxX, stepsBoxY, stepsBoxW, stepsBoxH, 20);
      ctx.fill();
      ctx.strokeStyle = '#E7E5E4';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#7F1D1D';
      ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('CARA PENGGUNAAN', posterWidth / 2, stepsBoxY + 44);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#1E293B';
      ctx.font = '500 22px "Public Sans", sans-serif';
      activePreset.steps.forEach((step, idx) => {
        ctx.fillText(
          `${idx + 1}.  ${step}`,
          stepsBoxX + 56,
          stepsBoxY + 94 + idx * 42
        );
      });

      // Official Footer
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#E7E5E4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(90, posterHeight - 135);
      ctx.lineTo(posterWidth - 90, posterHeight - 135);
      ctx.stroke();

      ctx.fillStyle = '#7F1D1D';
      ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        'Bawaslu Kabupaten Subang · Pelayanan Terpadu Satu Pintu (PTSP)',
        posterWidth / 2,
        posterHeight - 94
      );

      ctx.fillStyle = '#475569';
      ctx.font = '500 19px "Public Sans", sans-serif';
      ctx.fillText(
        'Jl. Palabuan No. 9 Kel. Sukamelang Kec. Subang · Telp. (0260) 42423530 · set.subangkab@bawaslu.go.id',
        posterWidth / 2,
        posterHeight - 62
      );

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Poster_QR_PTSP_${activePreset.id}_Bawaslu_Subang.png`;
      link.click();

      setDownloadStatus('Poster A4 siap cetak (PNG HD) berhasil diunduh.');
      window.setTimeout(() => setDownloadStatus(''), 2800);
    } catch {
      setQrError('Gagal menyiapkan Poster PNG siap cetak.');
    }
  };

  return (
    <div className="space-y-6 animate-ptsp-fade-in">
      {/* Intro Header (Hidden on Print) */}
      <div className="no-print bg-white border border-stone-200/90 rounded-xl overflow-hidden shadow-2xs">
        <div className="bg-gradient-to-r from-[#7F1D1D] via-[#6B1114] to-[#4C0519] text-white px-6 py-5 border-b-2 border-amber-400/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-white/10 border border-amber-300/40 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {mode === 'officer'
                  ? 'QR Code / Barcode Akses Pelayanan PTSP'
                  : 'QR Code Akses Cepat Pelayanan PTSP'}
              </h2>
              <p className="text-xs text-amber-100/85 mt-0.5 leading-relaxed">
                {mode === 'officer'
                  ? 'Cetak atau unduh QR Code resmi untuk ditempel di meja layanan, ruang tunggu, atau papan informasi agar pemohon dapat langsung masuk ke halaman pelayanan lewat kamera HP.'
                  : 'Pindai (scan) QR Code di bawah menggunakan kamera HP Anda untuk langsung membuka halaman pelayanan PTSP Bawaslu Kabupaten Subang di perangkat pribadi.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-red-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Poster Meja</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workspace: Left = Printable Official Poster, Right = Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: PRINTABLE OFFICIAL STANDEE / POSTER CARD */}
        <div className="lg:col-span-7 print:col-span-12">
          <div className="print-only-sheet print-exact-colors bg-white border border-stone-200/90 rounded-xl overflow-hidden shadow-xs max-w-[600px] mx-auto print:max-w-[640px] print:border print:border-stone-300">
            {/* Institutional Header inside Poster */}
            <div className="bg-gradient-to-r from-[#6B1114] via-[#7F1D1D] to-[#4C0519] text-white px-6 py-6 text-center border-b-4 border-amber-400">
              <div className="w-14 h-14 mx-auto rounded-xl bg-white p-2 shadow-xs flex items-center justify-center border border-amber-300/60">
                <img
                  src={BAWASLU_LOGO_DATA_URI}
                  alt="Logo Bawaslu Kabupaten Subang"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-3 text-[11px] font-bold tracking-wider text-amber-200">
                BADAN PENGAWAS PEMILIHAN UMUM KABUPATEN SUBANG
              </div>
              <h3 className="mt-1 text-lg sm:text-xl font-extrabold tracking-tight text-white">
                PELAYANAN TERPADU SATU PINTU (PTSP)
              </h3>
            </div>

            {/* Poster Body */}
            <div className="px-6 py-7 sm:px-8 text-center space-y-5">
              <div>
                <div className="text-base sm:text-lg font-extrabold text-red-950 tracking-tight">
                  {activePreset.posterHeadline}
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
                  {activePreset.posterSubtitle}
                </p>
              </div>

              {/* High-Contrast Scannable QR Container */}
              <div className="inline-flex flex-col items-center justify-center p-4 bg-white border-2 border-red-900/90 rounded-2xl shadow-2xs">
                {qrError ? (
                  <div className="w-60 h-60 flex items-center justify-center text-xs text-red-700 px-4">
                    {qrError}
                  </div>
                ) : (
                  <canvas
                    ref={qrCanvasRef}
                    aria-label={`QR Code menuju ${targetUrl}`}
                    className="w-56 h-56 sm:w-64 sm:h-64 block"
                  />
                )}
              </div>

              {/* Optional Clean URL Readout (hidden by default so vercel.app is not displayed on poster) */}
              {showUrlOnPoster && (
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500">
                    Tautan Tujuan Layanan
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-900 break-all px-3 py-2 bg-stone-50 border border-stone-200/80 rounded-lg">
                    {targetUrl}
                  </div>
                </div>
              )}

              {/* Concise 3-Step Instructions */}
              <div className="text-left bg-[#FAF8F5] border border-stone-200/80 rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold text-red-950 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-red-800 shrink-0" />
                  <span>Cara Scan QR Code Pelayanan</span>
                </div>
                <ol className="space-y-1.5 text-xs text-slate-700 list-decimal pl-5 leading-relaxed">
                  {activePreset.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Institutional Footer inside Poster */}
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-200/80 text-center text-[11px] text-slate-600 space-y-0.5">
              <div className="font-bold text-red-950">
                Bawaslu Kabupaten Subang · Meja Pelayanan PTSP
              </div>
              <div>
                Jl. Palabuan No. 9 Kel. Sukamelang Kec. Subang · Telp.{' '}
                <span className="font-mono tabular-nums">(0260) 42423530</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SETTINGS, URL & DOWNLOAD ACTIONS (HIDDEN ON PRINT) */}
        <div className="no-print lg:col-span-5 space-y-5">
          {/* 1. Target Page Selector */}
          <div className="bg-white border border-stone-200/90 rounded-xl p-5 space-y-3.5 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-red-950">
                1. Pilih Tujuan Halaman Scan
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Tentukan halaman pemohon yang otomatis terbuka saat barcode dipindai.
              </p>
            </div>

            <div className="space-y-2">
              {SERVICE_TARGETS.map((item) => {
                const isSelected = selectedTarget === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedTarget(item.id)}
                    className={`w-full text-left px-3.5 py-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-red-800 bg-red-50/70 text-red-950 ring-1 ring-red-800/15'
                        : 'border-stone-200 hover:border-red-300 hover:bg-stone-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-mono truncate">
                      {item.pathSuffix}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Target Domain / URL Settings */}
          <div className="bg-white border border-stone-200/90 rounded-xl p-5 space-y-3.5 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-red-950">
                2. Alamat Web Tujuan QR Code
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Bisa diisi link pendek seperti <span className="font-mono font-semibold text-slate-800">s.id/ptsp-bawaslu-subang</span> atau alamat web Vercel / domain resmi Anda.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="ptsp-qr-origin-input"
                className="block text-xs font-semibold text-slate-700"
              >
                Link Pendek (s.id) / Domain Web PTSP
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="ptsp-qr-origin-input"
                  type="url"
                  value={customOrigin}
                  onChange={(e) => setCustomOrigin(e.target.value)}
                  placeholder="https://s.id/ptsp-bawaslu-subang"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-stone-300 rounded-lg focus:outline-none focus:border-red-800"
                />
              </div>

              {isDirectShortLink && (
                <div className="text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200/90 rounded-lg px-3 py-2 leading-relaxed">
                  Mode Link Pendek aktif — QR Code langsung mengarah ke{' '}
                  <span className="font-mono font-semibold break-all">
                    {targetUrl}
                  </span>{' '}
                  secara utuh.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCustomOrigin(OFFICIAL_PUBLIC_ORIGIN)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-red-900 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-md transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Gunakan Link Vercel Resmi</span>
                </button>
                {currentWindowOrigin &&
                  currentWindowOrigin !== OFFICIAL_PUBLIC_ORIGIN && (
                    <button
                      type="button"
                      onClick={() => setCustomOrigin(currentWindowOrigin)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors cursor-pointer"
                    >
                      <span>Gunakan Link Browser Ini</span>
                    </button>
                  )}
              </div>

              {isLocalTarget && (
                <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200/90 rounded-lg px-3 py-2 leading-relaxed">
                  Alamat saat ini memakai <span className="font-mono font-semibold">localhost</span> yang hanya bisa dibuka di komputer ini. Klik <strong>Gunakan Link Vercel Resmi</strong> atau tempel link <span className="font-mono font-semibold">s.id</span> Anda sebelum mencetak poster.
                </div>
              )}
            </div>

            {/* Center Emblem & URL Visibility Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-stone-100">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-xs font-medium text-slate-700">
                  Tampilkan Logo Bawaslu di tengah QR Code
                </span>
                <input
                  type="checkbox"
                  checked={includeCenterLogo}
                  onChange={(e) => setIncludeCenterLogo(e.target.checked)}
                  className="w-4 h-4 accent-red-900 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-xs font-medium text-slate-700">
                  Tampilkan teks alamat link di poster
                </span>
                <input
                  type="checkbox"
                  checked={showUrlOnPoster}
                  onChange={(e) => setShowUrlOnPoster(e.target.checked)}
                  className="w-4 h-4 accent-red-900 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* 3. Download, Copy & Print Actions */}
          <div className="bg-white border border-stone-200/90 rounded-xl p-5 space-y-3 shadow-2xs">
            <h3 className="text-sm font-bold text-red-950">
              3. Unduh &amp; Cetak Barcode Pelayanan
            </h3>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => void handleDownloadPosterPng()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#7F1D1D] to-[#58111A] hover:from-[#6B1114] hover:to-[#4C0519] rounded-lg transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-300" />
                <span>Unduh Poster A4 Siap Cetak (PNG HD)</span>
              </button>

              <button
                type="button"
                onClick={() => void handleDownloadQrOnly()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-950 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 rounded-lg transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-red-900" />
                <span>Unduh Gambar QR Code Saja (PNG)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyUrl()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-emerald-800">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Link</span>
                    </>
                  )}
                </button>

                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Uji Buka Link</span>
                </a>
              </div>
            </div>

            {downloadStatus && (
              <div className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {downloadStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
