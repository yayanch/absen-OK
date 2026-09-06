import React, { useState } from 'react';
import { WifiOff, RefreshCw, AlertTriangle, ShieldCheck, Database, HelpCircle, ArrowRight } from 'lucide-react';

interface OfflineViewProps {
  onRetry: () => void;
  onContinueOffline?: () => void;
}

export const OfflineView: React.FC<OfflineViewProps> = ({ onRetry, onContinueOffline }) => {
  const [isChecking, setIsChecking] = useState(false);

  const handleRetryClick = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      onRetry();
      if (typeof window !== 'undefined' && navigator.onLine && onContinueOffline) {
        onContinueOffline();
      }
    }, 1200);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-8 sm:p-10 space-y-8">
        
        {/* Top Icon & Title */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner animate-bounce">
            <WifiOff className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Koneksi Terputus (Offline)
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight pt-2">
              Anda Sedang Tidak Terhubung ke Internet
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              Aplikasi mendeteksi hilangnya koneksi jaringan ke server cloud dan database. Sistem beralih ke mode aman offline.
            </p>
          </div>
        </div>

        {/* Description Card */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Database className="w-4 h-4 text-theme-primary" />
            <span>Status Penyimpanan & Keamanan Data</span>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Semua data presensi dan master siswa yang tersimpan di perangkat ini (LocalStorage) tetap aman dan dapat diakses. Namun, sinkronisasi otomatis ke database pusat MySQL/Cloud sementara ditunda hingga koneksi pulih kembali.
          </p>
        </div>

        {/* Troubleshooting / Saran Perbaikan */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span>Saran Perbaikan & Troubleshooting</span>
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] flex items-center justify-center font-black">1</span>
                <span>Periksa Jaringan Wi-Fi / Seluler</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7">
                Pastikan router Wi-Fi atau paket data seluler Anda aktif dan memiliki sinyal yang stabil.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] flex items-center justify-center font-black">2</span>
                <span>Restart Perangkat Jaringan</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7">
                Nyalakan ulang modem atau lakukan toggle Mode Pesawat (Airplane Mode) selama 10 detik.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] flex items-center justify-center font-black">3</span>
                <span>Cek Pengaturan Firewall / VPN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7">
                Pastikan tidak ada VPN atau firewall kantor/sekolah yang memblokir akses koneksi web.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] flex items-center justify-center font-black">4</span>
                <span>Muat Ulang Halaman</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7">
                Klik tombol di bawah untuk menguji ulang koneksi ke server setelah jaringan tersambung.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          {onContinueOffline && (
            <button
              type="button"
              onClick={onContinueOffline}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Lanjutkan Mode Offline (Akses Lokal)
            </button>
          )}

          <button
            type="button"
            onClick={handleRetryClick}
            disabled={isChecking}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-theme-primary text-white font-bold text-xs shadow-lg hover:opacity-95 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Memeriksa Koneksi...' : 'Coba Sambungkan Ulang'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
