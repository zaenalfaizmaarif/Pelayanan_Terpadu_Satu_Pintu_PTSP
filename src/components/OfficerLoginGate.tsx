import React, { useState, useEffect } from 'react';
import {
  Lock,
  UserCheck,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  BadgeCheck,
  ShieldAlert,
} from 'lucide-react';
import { BAWASLU_LOGO_DATA_URI } from '../assets/bawasluLogo';
import {
  loginOfficer,
  getRecoveryStatus,
  setupRecoveryCode,
  resetOfficerPassword,
} from '../services/ptspCloudService';

export interface AuthenticatedOfficer {
  id: string;
  username: string;
  fullName: string;
  nipNik: string;
  roleTitle: string;
  accessLevel: 'petugas_penerima' | 'ketua_pelaksana';
}

interface OfficerLoginGateProps {
  onLoginSuccess: (officer: AuthenticatedOfficer, token: string) => void;
}

type GateView = 'login' | 'forgot';

export const OfficerLoginGate: React.FC<OfficerLoginGateProps> = ({
  onLoginSuccess,
}) => {
  const [view, setView] = useState<GateView>('login');

  // Login form state
  const [usernameOrNip, setUsernameOrNip] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Forgot password & recovery setup state
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(false);
  const [isRecoveryConfigured, setIsRecoveryConfigured] = useState<boolean>(true);
  const [setupCode, setSetupCode] = useState('');
  const [setupCodeConfirm, setSetupCodeConfirm] = useState('');
  const [showSetupCode, setShowSetupCode] = useState(false);

  const [resetUsername, setResetUsername] = useState('');
  const [resetNip, setResetNip] = useState('');
  const [resetRecoveryCode, setResetRecoveryCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  const triggerShake = () => {
    setIsShaking(false);
    window.requestAnimationFrame(() => {
      setIsShaking(true);
    });
  };

  useEffect(() => {
    if (!isShaking) return;
    const timer = window.setTimeout(() => {
      setIsShaking(false);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [isShaking]);

  const openForgotView = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setResetUsername(usernameOrNip);
    setView('forgot');
    setIsCheckingRecovery(true);
    try {
      const status = await getRecoveryStatus();
      setIsRecoveryConfigured(status.configured);
    } catch {
      setIsRecoveryConfigured(false);
    } finally {
      setIsCheckingRecovery(false);
    }
  };

  const backToLoginView = () => {
    setErrorMsg(null);
    setView('login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const result = await loginOfficer(usernameOrNip, password);
      onLoginSuccess(result.officer, result.token);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Autentikasi gagal. Periksa kembali ID Pengguna/NIP dan Kata Sandi Anda.'
      );
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmed = setupCode.trim();
    if (trimmed.length < 6) {
      setErrorMsg('Kode Pemulihan Admin minimal harus terdiri dari 6 karakter.');
      triggerShake();
      return;
    }
    if (trimmed !== setupCodeConfirm.trim()) {
      setErrorMsg('Konfirmasi Kode Pemulihan Admin tidak cocok.');
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    try {
      const msg = await setupRecoveryCode(trimmed);
      setIsRecoveryConfigured(true);
      setResetRecoveryCode(trimmed);
      setSetupCode('');
      setSetupCodeConfirm('');
      setSuccessMsg(msg);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal mengaktifkan Kode Pemulihan Admin.'
      );
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (resetNewPassword.length < 8) {
      setErrorMsg('Kata sandi baru minimal harus terdiri dari 8 karakter.');
      triggerShake();
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMsg('Konfirmasi kata sandi baru tidak cocok.');
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetOfficerPassword({
        usernameOrNip: resetUsername,
        nipVerification: resetNip,
        recoveryCode: resetRecoveryCode,
        newPassword: resetNewPassword,
      });
      setUsernameOrNip(result.username);
      setPassword('');
      setResetNip('');
      setResetRecoveryCode('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setSuccessMsg(result.message);
      setView('login');
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Verifikasi gagal. Pastikan ID Pengguna, NIP Petugas, dan Kode Pemulihan Admin benar.'
      );
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`max-w-md mx-auto bg-white border rounded-2xl overflow-hidden shadow-sm transition-colors ${
        isShaking ? 'animate-ptsp-shake' : ''
      } ${
        errorMsg
          ? 'border-red-400 shadow-red-900/10'
          : 'border-stone-200/90'
      }`}
    >
      <div className="bg-gradient-to-b from-[#7F1D1D] via-[#6B1114] to-[#4C0519] text-white px-6 py-6 border-b-2 border-amber-400/80 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-white p-2 shadow-xs border border-amber-300/60 flex items-center justify-center mb-3">
          <img
            src={BAWASLU_LOGO_DATA_URI}
            alt="Logo Bawaslu Kabupaten Subang"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="text-xs sm:text-sm font-bold tracking-tight text-amber-200 leading-snug">
          BADAN PENGAWAS PEMILIHAN UMUM
          <br />
          KABUPATEN SUBANG
        </div>
        <h3 className="text-lg font-bold text-white mt-2">
          {view === 'login'
            ? 'Masuk ke Meja Petugas PTSP'
            : 'Pemulihan Kata Sandi Petugas'}
        </h3>
        <p className="text-xs text-amber-100/85 mt-1">
          {view === 'login'
            ? 'Masukkan ID Pengguna atau NIP beserta Kata Sandi petugas Bawaslu Kabupaten Subang.'
            : 'Verifikasi ID Pengguna, NIP Petugas, dan Kode Pemulihan Admin untuk mengatur kata sandi baru.'}
        </p>
      </div>

      {view === 'login' ? (
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ID Pengguna atau NIP Petugas
            </label>
            <div className="relative">
              <UserCheck
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                  errorMsg ? 'text-red-500' : 'text-slate-400'
                }`}
              />
              <input
                type="text"
                required
                autoComplete="username"
                value={usernameOrNip}
                onChange={(e) => {
                  setUsernameOrNip(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Masukkan ID Pengguna atau NIP"
                className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errorMsg
                    ? 'border-red-400 bg-red-50/40 focus:ring-red-800/25 focus:border-red-700'
                    : 'border-slate-300 focus:ring-red-800/20 focus:border-red-800'
                }`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Kata Sandi
              </label>
              <button
                type="button"
                onClick={openForgotView}
                className="text-xs font-semibold text-red-800 hover:text-red-950 hover:underline cursor-pointer"
              >
                Lupa Kata Sandi?
              </button>
            </div>
            <div className="relative">
              <KeyRound
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                  errorMsg ? 'text-red-500' : 'text-slate-400'
                }`}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Masukkan kata sandi petugas"
                className={`w-full pl-10 pr-10 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errorMsg
                    ? 'border-red-400 bg-red-50/40 focus:ring-red-800/25 focus:border-red-700'
                    : 'border-slate-300 focus:ring-red-800/20 focus:border-red-800'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Tampilkan kata sandi"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              className={`p-3 rounded-lg bg-red-50 border border-red-300 text-xs font-medium text-red-800 flex items-start gap-2 ${
                isShaking ? 'animate-ptsp-shake' : ''
              }`}
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 disabled:opacity-70 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                  <span>Memverifikasi di Server...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Masuk ke Meja Petugas</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Autentikasi Terenkripsi Server (Scrypt Hash &amp; Token Sesi)</span>
          </div>
        </form>
      ) : (
        <div className="p-6 sm:p-8 space-y-4">
          <button
            type="button"
            onClick={backToLoginView}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-900 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Login</span>
          </button>

          {isCheckingRecovery ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-5 h-5 text-red-800 animate-spin" />
              <span>Memeriksa status pemulihan keamanan...</span>
            </div>
          ) : !isRecoveryConfigured ? (
            <form onSubmit={handleActivateRecoveryCode} className="space-y-4">
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Aktivasi Kode Pemulihan Admin (Sekali Pakai)</span>
                </div>
                <p className="text-amber-900/85 leading-relaxed">
                  Kode Pemulihan Admin belum diatur. Buat kode pemulihan rahasia minimal 6 karakter sekarang agar fitur reset kata sandi petugas dapat digunakan dengan aman.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Buat Kode Pemulihan Admin (Min. 6 Karakter)
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showSetupCode ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={setupCode}
                    onChange={(e) => {
                      setSetupCode(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Contoh: BAWASLU-SUBANG-2026"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupCode((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label="Tampilkan kode pemulihan"
                  >
                    {showSetupCode ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Konfirmasi Kode Pemulihan Admin
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showSetupCode ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={setupCodeConfirm}
                    onChange={(e) => {
                      setSetupCodeConfirm(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Ulangi Kode Pemulihan Admin"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                  />
                </div>
              </div>

              {errorMsg && (
                <div
                  className={`p-3 rounded-lg bg-red-50 border border-red-300 text-xs font-medium text-red-800 flex items-start gap-2 ${
                    isShaking ? 'animate-ptsp-shake' : ''
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 disabled:opacity-70 rounded-lg transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                    <span>Mengaktifkan Kode Pemulihan...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Aktifkan Kode Pemulihan &amp; Lanjut Reset</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              {successMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Pengguna Petugas
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={resetUsername}
                    onChange={(e) => {
                      setResetUsername(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Masukkan ID Pengguna (misal: petugas / ketua)"
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verifikasi NIP Petugas
                </label>
                <div className="relative">
                  <BadgeCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={resetNip}
                    onChange={(e) => {
                      setResetNip(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Masukkan NIP resmi petugas terdaftar"
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Pemulihan Admin
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showRecoveryCode ? 'text' : 'password'}
                    required
                    value={resetRecoveryCode}
                    onChange={(e) => {
                      setResetRecoveryCode(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Masukkan Kode Pemulihan Admin"
                    className="w-full pl-10 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryCode((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label="Tampilkan kode pemulihan"
                  >
                    {showRecoveryCode ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi Baru (Minimal 8 Karakter)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showResetNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={resetNewPassword}
                    onChange={(e) => {
                      setResetNewPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Masukkan kata sandi baru"
                    className="w-full pl-10 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetNewPassword((prev) => {
                        const next = !prev;
                        setShowResetConfirmPassword(next);
                        return next;
                      });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label="Tampilkan kata sandi baru"
                  >
                    {showResetNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showResetConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={resetConfirmPassword}
                    onChange={(e) => {
                      setResetConfirmPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pl-10 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label="Tampilkan konfirmasi kata sandi baru"
                  >
                    {showResetConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div
                  className={`p-3 rounded-lg bg-red-50 border border-red-300 text-xs font-medium text-red-800 flex items-start gap-2 ${
                    isShaking ? 'animate-ptsp-shake' : ''
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 disabled:opacity-70 rounded-lg transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                      <span>Memverifikasi &amp; Mereset Sandi...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Simpan Kata Sandi Baru</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};


