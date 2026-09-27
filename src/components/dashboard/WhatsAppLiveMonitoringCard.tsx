import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  RotateCcw,
  ArrowUpRight,
  Filter,
  Search,
  Radio,
  Sliders,
  Check,
  Zap,
  Phone,
  Play,
  Key,
} from 'lucide-react';
import { AppData, WhatsAppLog, WhatsAppGatewayConfig, ViewType, UserSession } from '../../types';
import {
  sendWhatsAppMessage,
  maskPhoneNumber,
  DEFAULT_GATEWAY_CONFIG,
} from '../../utils/whatsappGatewayService';

interface WhatsAppLiveMonitoringCardProps {
  appData: AppData;
  currentUser?: UserSession;
  onNavigateView: (view: ViewType) => void;
  onUpdateAppData?: (updated: AppData) => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const WhatsAppLiveMonitoringCard: React.FC<WhatsAppLiveMonitoringCardProps> = ({
  appData,
  onNavigateView,
  onUpdateAppData,
  onShowToast,
}) => {
  const config: WhatsAppGatewayConfig = useMemo(() => {
    return {
      ...DEFAULT_GATEWAY_CONFIG,
      ...(appData.whatsappGateway || {}),
    };
  }, [appData.whatsappGateway]);

  const logs: WhatsAppLog[] = useMemo(() => {
    return appData.whatsappLogs || [];
  }, [appData.whatsappLogs]);

  const [activeTab, setActiveTab] = useState<'all' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [isRetryingAll, setIsRetryingAll] = useState<boolean>(false);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) => l.status === 'success').length;
    const failed = logs.filter((l) => l.status === 'failed').length;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 100;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter((l) => l.timestamp.startsWith(todayStr));
    const todaySuccess = todayLogs.filter((l) => l.status === 'success').length;
    const todayFailed = todayLogs.filter((l) => l.status === 'failed').length;

    return {
      total,
      success,
      failed,
      successRate,
      todayTotal: todayLogs.length,
      todaySuccess,
      todayFailed,
    };
  }, [logs]);

  // Filtered Logs
  const displayedLogs = useMemo(() => {
    let list = logs;
    if (activeTab === 'failed') {
      list = list.filter((l) => l.status === 'failed');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.recipientName.toLowerCase().includes(q) ||
          l.recipientPhone.includes(q) ||
          l.messageText.toLowerCase().includes(q) ||
          (l.responseMessage || '').toLowerCase().includes(q)
      );
    }

    return list.slice(0, 15);
  }, [logs, activeTab, searchQuery]);

  // Handle single message retry
  const handleRetrySingle = async (logItem: WhatsAppLog) => {
    if (retryingId) return;
    setRetryingId(logItem.id);

    try {
      const res = await sendWhatsAppMessage({
        phone: logItem.recipientPhone,
        recipientName: logItem.recipientName,
        message: logItem.messageText,
        gatewayConfig: config,
        messageType: logItem.messageType,
      });

      if (onUpdateAppData) {
        // Replace or add log
        const updated = logs.map((l) => (l.id === logItem.id ? res.log : l));
        onUpdateAppData({
          ...appData,
          whatsappLogs: updated,
        });
      }

      if (res.success) {
        onShowToast?.(`Pesan ke ${logItem.recipientName} berhasil dikirim ulang!`, 'success');
      } else {
        onShowToast?.(`Gagal mengirim ulang: ${res.message}`, 'error');
      }
    } catch (e: any) {
      onShowToast?.(`Terjadi kesalahan: ${e?.message || 'Gagal kirim ulang'}`, 'error');
    } finally {
      setRetryingId(null);
    }
  };

  // Handle Retry All Failed
  const handleRetryAllFailed = async () => {
    const failedList = logs.filter((l) => l.status === 'failed');
    if (failedList.length === 0) {
      onShowToast?.('Tidak ada pesan gagal untuk dikirim ulang.', 'info');
      return;
    }

    setIsRetryingAll(true);
    let successCount = 0;
    let failedCount = 0;
    let updatedLogs = [...logs];

    for (const item of failedList) {
      try {
        const res = await sendWhatsAppMessage({
          phone: item.recipientPhone,
          recipientName: item.recipientName,
          message: item.messageText,
          gatewayConfig: config,
          messageType: item.messageType,
        });

        if (res.success) {
          successCount++;
          updatedLogs = updatedLogs.map((l) => (l.id === item.id ? res.log : l));
        } else {
          failedCount++;
        }

        // Small interval
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        failedCount++;
      }
    }

    setIsRetryingAll(false);
    if (onUpdateAppData) {
      onUpdateAppData({
        ...appData,
        whatsappLogs: updatedLogs,
      });
    }

    onShowToast?.(
      `Selesai kirim ulang: ${successCount} pesan berhasil, ${failedCount} masih gagal.`,
      successCount > 0 ? 'success' : 'error'
    );
  };

  const getMessageTypeBadge = (type: WhatsAppLog['messageType']) => {
    switch (type) {
      case 'otp':
        return { label: 'OTP NISN', bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      case 'presensi_masuk':
        return { label: 'Presensi Masuk', bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      case 'presensi_pulang':
        return { label: 'Presensi Pulang', bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'terlambat':
        return { label: 'Keterlambatan', bg: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800' };
      case 'alpa':
        return { label: 'Ketidakhadiran', bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
      case 'broadcast':
        return { label: 'Siaran Massal', bg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      case 'test':
        return { label: 'Uji Coba', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
      default:
        return { label: 'Pesan WA', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    }
  };

  const formatLogTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white">
                Live Monitoring WhatsApp Gateway
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black border uppercase bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {config.enabled ? `${config.provider} (Aktif)` : 'Nonaktif'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Status telemetri pengiriman pesan OTP, notifikasi presensi orang tua, dan audit pesan gagal real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stats.failed > 0 && (
            <button
              type="button"
              onClick={handleRetryAllFailed}
              disabled={isRetryingAll}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition border border-rose-200 dark:border-rose-800 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRetryingAll ? 'animate-spin' : ''}`} />
              <span>{isRetryingAll ? 'Mengirim Ulang...' : `Kirim Ulang (${stats.failed} Gagal)`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigateView('whatsapp_gateway')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700 shadow-2xs group cursor-pointer"
          >
            <span>Kelola Gateway</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform text-emerald-600 dark:text-emerald-400" />
          </button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Pesan */}
        <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Pesan Diproses</span>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {stats.total} <span className="text-xs font-bold text-slate-400">Pesan</span>
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            Hari ini: {stats.todayTotal} aktivitas
          </span>
        </div>

        {/* Sukses */}
        <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Terkirim Sukses</span>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            {stats.success} <span className="text-xs font-bold text-emerald-500/70">({stats.successRate}%)</span>
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            Hari ini: {stats.todaySuccess} sukses
          </span>
        </div>

        {/* Gagal */}
        <div
          onClick={() => setActiveTab('failed')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer space-y-1 ${
            stats.failed > 0
              ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50'
              : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Pesan Gagal</span>
            {stats.failed > 0 && <span className="text-[9px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded-full">Perlu Cek</span>}
          </div>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400">
            {stats.failed} <span className="text-xs font-bold text-rose-500/70">Pesan</span>
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            {stats.failed > 0 ? 'Klik untuk filter gagal' : 'Semua pesan terkirim'}
          </span>
        </div>

        {/* Status Provider */}
        <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Provider &amp; Kecepatan</span>
          <div className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">
            {config.provider}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block truncate">
            ⚡ Latency: &lt; 500ms
          </span>
        </div>
      </div>

      {/* TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Semua Aktivitas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
              {stats.total}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('failed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'failed'
                ? 'bg-rose-500 text-white shadow-2xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Pesan Gagal</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'failed' ? 'bg-white text-rose-600' : 'bg-rose-100 dark:bg-rose-950 text-rose-700'}`}>
              {stats.failed}
            </span>
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari penerima / no WA / kata..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* LOGS TABLE / FEED */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-black">
              <th className="py-2.5 px-3">Waktu</th>
              <th className="py-2.5 px-3">Penerima &amp; Nomor</th>
              <th className="py-2.5 px-3">Jenis Notifikasi</th>
              <th className="py-2.5 px-3">Status Pengiriman</th>
              <th className="py-2.5 px-3 text-right">Aksi &amp; Respon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayedLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <MessageSquare className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {activeTab === 'failed'
                        ? 'Alhamdulillah, tidak ada pesan WhatsApp yang gagal terkirim!'
                        : 'Belum ada catatan aktivitas pengiriman pesan WhatsApp.'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Pesan OTP login dan notifikasi presensi otomatis akan tercatat di sini secara real-time.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              displayedLogs.map((log) => {
                const typeBadge = getMessageTypeBadge(log.messageType);
                const isSuccess = log.status === 'success';
                const isRetryingThis = retryingId === log.id;

                return (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    {/* Waktu */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                      {formatLogTime(log.timestamp)}
                    </td>

                    {/* Penerima */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <span className="truncate max-w-[140px]">{log.recipientName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {maskPhoneNumber(log.recipientPhone)}
                      </div>
                    </td>

                    {/* Jenis Notifikasi */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeBadge.bg}`}>
                        {typeBadge.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        {isSuccess ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        <span
                          className={`text-xs font-black ${
                            isSuccess ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isSuccess ? 'Terkirim' : 'Gagal'}
                        </span>
                      </div>
                      {log.responseMessage && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[180px]" title={log.responseMessage}>
                          {log.responseMessage}
                        </p>
                      )}
                    </td>

                    {/* Aksi & Respon */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isSuccess && (
                          <button
                            type="button"
                            onClick={() => handleRetrySingle(log)}
                            disabled={isRetryingThis}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Kirim ulang pesan ini ke WhatsApp"
                          >
                            <RotateCcw className={`w-3 h-3 ${isRetryingThis ? 'animate-spin' : ''}`} />
                            <span>{isRetryingThis ? 'Kirim...' : 'Kirim Ulang'}</span>
                          </button>
                        )}

                        <a
                          href={`https://api.whatsapp.com/send?phone=${log.recipientPhone}&text=${encodeURIComponent(log.messageText)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Buka Chat WhatsApp Web Langsung"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
