import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Smartphone,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Key,
  Globe,
  Radio,
  Sliders,
  FileText,
  Users,
  Copy,
  ExternalLink,
  Trash2,
  Search,
  Check,
  Zap,
  Info,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Phone,
  Play,
  RotateCcw,
  Save,
  MessageCircle,
} from 'lucide-react';
import {
  AppData,
  SekolahConfig,
  WhatsAppGatewayConfig,
  WhatsAppLog,
  WhatsAppProvider,
  Siswa,
  Kelas,
  UserSession,
} from '../../types';
import {
  DEFAULT_GATEWAY_CONFIG,
  DEFAULT_WA_TEMPLATES,
  sendWhatsAppMessage,
  interpolateTemplate,
  normalizeIndonesianPhone,
  maskPhoneNumber,
  getFormattedDateNow,
  getFormattedTimeNow,
} from '../../utils/whatsappGatewayService';
import { addAuditLog } from '../../utils/helpers';

interface WhatsAppGatewayViewProps {
  appData: AppData;
  currentUser: UserSession;
  onUpdateAppData: (updated: AppData) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onConfirmModal?: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
}

type TabType = 'connection' | 'templates' | 'broadcast' | 'logs';

export const WhatsAppGatewayView: React.FC<WhatsAppGatewayViewProps> = ({
  appData,
  currentUser,
  onUpdateAppData,
  onShowToast,
  onConfirmModal,
}) => {
  const sekolah: Partial<SekolahConfig> = appData.sekolah || {};
  const currentConfig: WhatsAppGatewayConfig = useMemo(() => {
    return {
      ...DEFAULT_GATEWAY_CONFIG,
      ...(appData.whatsappGateway || {}),
    };
  }, [appData.whatsappGateway]);

  const [activeTab, setActiveTab] = useState<TabType>('connection');

  // Form states for Configuration
  const [config, setConfig] = useState<WhatsAppGatewayConfig>(currentConfig);

  // Test Message State
  const [testPhone, setTestPhone] = useState<string>('081234567890');
  const [testMessage, setTestMessage] = useState<string>(
    `Halo, ini adalah pesan uji coba koneksi WhatsApp Gateway resmi dari *${sekolah.nama || 'SMK NEGERI 6 GARUT'}*.\n\nSistem presensi terhubung dengan baik! ✅`
  );
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    directUrl?: string;
    provider?: string;
  } | null>(null);

  // Template Editor State
  const [activeTemplateType, setActiveTemplateType] = useState<
    'otp' | 'presensiMasuk' | 'presensiPulang' | 'presensiTerlambat' | 'ketidakhadiran' | 'broadcast'
  >('presensiMasuk');

  // Broadcast States
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'kelas' | 'jurusan' | 'guru'>('kelas');
  const [broadcastSelectedKelas, setBroadcastSelectedKelas] = useState<string>(appData.kelas[0]?.id || '');
  const [broadcastRecipientType, setBroadcastRecipientType] = useState<'orang_tua' | 'siswa' | 'keduanya'>('orang_tua');
  const [broadcastTitle, setBroadcastTitle] = useState<string>('Informasi Pembelajaran');
  const [broadcastContent, setBroadcastContent] = useState<string>(
    'Diberitahukan kepada seluruh siswa dan wali murid, bahwa kegiatan belajar mengajar besok dimulai tepat pukul 07.00 WIB. Mohon hadir tepat waktu dengan seragam lengkap.'
  );
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastProgress, setBroadcastProgress] = useState<{ total: number; sent: number; failed: number } | null>(null);

  // Log filter states
  const [logSearch, setLogSearch] = useState<string>('');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('all');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('all');

  const logs: WhatsAppLog[] = appData.whatsappLogs || [];

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        log.recipientName.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.recipientPhone.includes(logSearch) ||
        log.messageText.toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.responseMessage || '').toLowerCase().includes(logSearch.toLowerCase());

      const matchType = logTypeFilter === 'all' || log.messageType === logTypeFilter;
      const matchStatus = logStatusFilter === 'all' || log.status === logStatusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [logs, logSearch, logTypeFilter, logStatusFilter]);

  // Total log stats
  const logStats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) => l.status === 'success').length;
    const failed = logs.filter((l) => l.status === 'failed').length;
    return { total, success, failed };
  }, [logs]);

  // Target recipients count calculation for broadcast
  const targetRecipients = useMemo(() => {
    const list: { phone: string; name: string; info: string }[] = [];

    if (broadcastTarget === 'all') {
      appData.siswa.forEach((s) => {
        if (broadcastRecipientType === 'orang_tua' || broadcastRecipientType === 'keduanya') {
          if (s.noWaOrangTua) {
            list.push({ phone: s.noWaOrangTua, name: `Orang Tua ${s.nama}`, info: `${s.nama} (${s.nisn})` });
          }
        }
        if (broadcastRecipientType === 'siswa' || broadcastRecipientType === 'keduanya') {
          if (s.noWa) {
            list.push({ phone: s.noWa, name: s.nama, info: `Siswa - ${s.nisn}` });
          }
        }
      });
    } else if (broadcastTarget === 'kelas') {
      const siswaInKelas = appData.siswa.filter((s) => s.kelasId === broadcastSelectedKelas);
      const kelasObj = appData.kelas.find((k) => k.id === broadcastSelectedKelas);
      siswaInKelas.forEach((s) => {
        if (broadcastRecipientType === 'orang_tua' || broadcastRecipientType === 'keduanya') {
          if (s.noWaOrangTua) {
            list.push({ phone: s.noWaOrangTua, name: `Orang Tua ${s.nama}`, info: `${kelasObj?.nama || 'Kelas'} - ${s.nama}` });
          }
        }
        if (broadcastRecipientType === 'siswa' || broadcastRecipientType === 'keduanya') {
          if (s.noWa) {
            list.push({ phone: s.noWa, name: s.nama, info: `${kelasObj?.nama || 'Kelas'} - Siswa` });
          }
        }
      });
    } else if (broadcastTarget === 'guru') {
      appData.waliKelas.forEach((g) => {
        if (g.noHp) {
          list.push({ phone: g.noHp, name: g.nama, info: `Guru / Tenaga Pendidik` });
        }
      });
    }

    return list;
  }, [appData.siswa, appData.kelas, appData.waliKelas, broadcastTarget, broadcastSelectedKelas, broadcastRecipientType]);

  // Save Settings to AppData
  const handleSaveConfig = () => {
    let updatedAppData: AppData = {
      ...appData,
      whatsappGateway: config,
    };

    updatedAppData = addAuditLog(
      updatedAppData,
      'Pengaturan WhatsApp Gateway',
      `Memperbarui konfigurasi WA Gateway (Provider: ${config.provider}, Status: ${config.enabled ? 'Aktif' : 'Nonaktif'}).`
    );

    onUpdateAppData(updatedAppData);
    onShowToast('Pengaturan WhatsApp Gateway berhasil disimpan!', 'success');
  };

  // Reset to default
  const handleResetToDefault = () => {
    const doReset = () => {
      setConfig(DEFAULT_GATEWAY_CONFIG);
      let updatedAppData: AppData = {
        ...appData,
        whatsappGateway: DEFAULT_GATEWAY_CONFIG,
      };
      updatedAppData = addAuditLog(
        updatedAppData,
        'Reset WhatsApp Gateway',
        'Mengembalikan konfigurasi dan template WhatsApp Gateway ke pengaturan bawaan.'
      );
      onUpdateAppData(updatedAppData);
      onShowToast('Pengaturan WhatsApp Gateway dikembalikan ke bawaan.', 'info');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Kembalikan Pengaturan WA Gateway ke Bawaan?',
        'Seluruh konfigurasi API dan template pesan otomatis akan di-reset ke nilai default.',
        'warning',
        doReset
      );
    } else {
      doReset();
    }
  };

  // Handle Test Send Message
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      onShowToast('Silakan masukkan nomor WhatsApp tujuan uji coba.', 'warning');
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    const res = await sendWhatsAppMessage({
      phone: testPhone,
      recipientName: 'Uji Coba Administrator',
      message: testMessage,
      gatewayConfig: config,
      messageType: 'test',
    });

    setIsSendingTest(false);
    setTestResult({
      success: res.success,
      message: res.message,
      directUrl: res.directWaUrl,
      provider: res.providerUsed,
    });

    // Record to logs
    const updatedLogs = [res.log, ...(appData.whatsappLogs || [])].slice(0, 500);
    onUpdateAppData({
      ...appData,
      whatsappLogs: updatedLogs,
    });

    if (res.success) {
      onShowToast(`Pesan uji coba berhasil diproses via ${res.providerUsed}!`, 'success');
    } else {
      onShowToast(`Gagal: ${res.message}`, 'error');
    }
  };

  // Handle Execute Broadcast
  const handleStartBroadcast = async () => {
    if (targetRecipients.length === 0) {
      onShowToast('Tidak ada nomor WhatsApp yang ditemukan untuk target ini.', 'warning');
      return;
    }

    if (!broadcastContent.trim()) {
      onShowToast('Silakan masukkan isi pesan siaran.', 'warning');
      return;
    }

    const doBroadcast = async () => {
      setIsBroadcasting(true);
      setBroadcastProgress({ total: targetRecipients.length, sent: 0, failed: 0 });

      let sentCount = 0;
      let failedCount = 0;
      const newLogs: WhatsAppLog[] = [];

      const template = config.templateBroadcast || DEFAULT_WA_TEMPLATES.broadcast;
      const formattedMessage = interpolateTemplate(template, {
        sekolah: sekolah.nama || 'SMK NEGERI 6 GARUT',
        pesan_pengumuman: broadcastContent,
        tanggal: getFormattedDateNow(),
      });

      for (let i = 0; i < targetRecipients.length; i++) {
        const item = targetRecipients[i];
        try {
          const res = await sendWhatsAppMessage({
            phone: item.phone,
            recipientName: item.name,
            message: formattedMessage,
            gatewayConfig: config,
            messageType: 'broadcast',
          });

          if (res.success) sentCount++;
          else failedCount++;

          newLogs.push(res.log);
          setBroadcastProgress({
            total: targetRecipients.length,
            sent: sentCount,
            failed: failedCount,
          });

          // Artificial delay between messages to respect rate limits
          if (config.provider === 'fonnte' || config.provider === 'wablas') {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        } catch {
          failedCount++;
        }
      }

      setIsBroadcasting(false);
      const updatedLogs = [...newLogs, ...(appData.whatsappLogs || [])].slice(0, 500);
      onUpdateAppData({
        ...appData,
        whatsappLogs: updatedLogs,
      });

      onShowToast(`Siaran massal selesai: ${sentCount} sukses, ${failedCount} gagal.`, 'success');
    };

    if (onConfirmModal) {
      onConfirmModal(
        `Kirim Siaran Massal ke ${targetRecipients.length} Kontak?`,
        `Pesan akan dikirimkan secara berurutan ke nomor WhatsApp target yang terpilih.`,
        'emerald',
        doBroadcast
      );
    } else {
      doBroadcast();
    }
  };

  // Clear Logs Handler
  const handleClearLogs = () => {
    const doClear = () => {
      onUpdateAppData({
        ...appData,
        whatsappLogs: [],
      });
      onShowToast('Seluruh riwayat pengiriman pesan WA berhasil dibersihkan.', 'info');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Hapus Semua Riwayat Pengiriman WA?',
        'Semua riwayat pengiriman pesan dan log aktivitas akan dihapus permanen.',
        'danger',
        doClear
      );
    } else {
      doClear();
    }
  };

  // Insert variable into active template
  const handleInsertVariable = (variableTag: string) => {
    let key: keyof WhatsAppGatewayConfig = 'templatePresensiMasuk';
    if (activeTemplateType === 'otp') key = 'templateOtp';
    else if (activeTemplateType === 'presensiMasuk') key = 'templatePresensiMasuk';
    else if (activeTemplateType === 'presensiPulang') key = 'templatePresensiPulang';
    else if (activeTemplateType === 'presensiTerlambat') key = 'templatePresensiTerlambat';
    else if (activeTemplateType === 'ketidakhadiran') key = 'templateKetidakhadiran';
    else if (activeTemplateType === 'broadcast') key = 'templateBroadcast';

    const currentText = (config[key] as string) || '';
    setConfig({
      ...config,
      [key]: currentText + ' ' + variableTag,
    });
    onShowToast(`Variabel ${variableTag} ditambahkan!`, 'info');
  };

  // Get active template string for preview
  const getActiveTemplateText = (): string => {
    switch (activeTemplateType) {
      case 'otp': return config.templateOtp || DEFAULT_WA_TEMPLATES.otp;
      case 'presensiMasuk': return config.templatePresensiMasuk || DEFAULT_WA_TEMPLATES.presensiMasuk;
      case 'presensiPulang': return config.templatePresensiPulang || DEFAULT_WA_TEMPLATES.presensiPulang;
      case 'presensiTerlambat': return config.templatePresensiTerlambat || DEFAULT_WA_TEMPLATES.presensiTerlambat;
      case 'ketidakhadiran': return config.templateKetidakhadiran || DEFAULT_WA_TEMPLATES.ketidakhadiran;
      case 'broadcast': return config.templateBroadcast || DEFAULT_WA_TEMPLATES.broadcast;
      default: return '';
    }
  };

  // Set active template text
  const setActiveTemplateText = (text: string) => {
    switch (activeTemplateType) {
      case 'otp': setConfig({ ...config, templateOtp: text }); break;
      case 'presensiMasuk': setConfig({ ...config, templatePresensiMasuk: text }); break;
      case 'presensiPulang': setConfig({ ...config, templatePresensiPulang: text }); break;
      case 'presensiTerlambat': setConfig({ ...config, templatePresensiTerlambat: text }); break;
      case 'ketidakhadiran': setConfig({ ...config, templateKetidakhadiran: text }); break;
      case 'broadcast': setConfig({ ...config, templateBroadcast: text }); break;
    }
  };

  // Generate Sample Preview for the active template
  const samplePreviewText = useMemo(() => {
    const rawTemplate = getActiveTemplateText();
    return interpolateTemplate(rawTemplate, {
      sekolah: sekolah.nama || 'SMK NEGERI 6 GARUT',
      nama_siswa: 'Ahmad Fauzi',
      nisn: '0089123456',
      kelas: 'XII RPL 1',
      jam: getFormattedTimeNow(),
      tanggal: getFormattedDateNow(),
      status: 'SAKIT (Surat Dokter Terlampir)',
      keterangan: 'Toleransi keterlambatan lewat 15 menit',
      otp_code: '849201',
      pesan_pengumuman: broadcastContent,
    });
  }, [activeTemplateType, config, sekolah.nama, broadcastContent]);

  return (
    <div className="space-y-6">
      {/* HEADER CARD WITH QUICK STATS & ACTIONS */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-xs">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                WhatsApp Gateway & Notifikasi Otomatis
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  config.enabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${config.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {config.enabled ? 'Gateway Aktif' : 'Nonaktif'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Integrasi pengiriman OTP otomatis, notifikasi presensi orang tua, peringatan keterlambatan, dan broadcast massal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Bawaan</span>
          </button>
          <button
            type="button"
            onClick={handleSaveConfig}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>

      {/* QUICK SUMMARY METRICS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Provider Aktif</p>
            <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase">
              {config.provider}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pesan Sukses</p>
            <p className="text-xs sm:text-sm font-black text-emerald-600">
              {logStats.success} Pesan
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pesan Gagal</p>
            <p className="text-xs sm:text-sm font-black text-rose-600">
              {logStats.failed} Pesan
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Siswa Terdaftar</p>
            <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">
              {appData.siswa.length} Siswa
            </p>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION BUTTONS */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 max-w-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('connection')}
          className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'connection'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Koneksi & API</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Template Pesan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('broadcast')}
          className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'broadcast'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Siaran Massal (Broadcast)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Riwayat Log ({logs.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KONEKSI & API GATEWAY                                              */}
      {/* ========================================================================= */}
      {activeTab === 'connection' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Config Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Master Switch Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Status Utama Layanan WA Gateway
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Aktifkan agar sistem dapat mengeksekusi pengiriman pesan otomatis secara real-time.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Provider Selector Cards */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Pilih Layanan Provider WhatsApp Gateway</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Fonnte */}
                <div
                  onClick={() => setConfig({ ...config, provider: 'fonnte' })}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    config.provider === 'fonnte'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span>Fonnte.com</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">Rekomendasi</span>
                    </span>
                    {config.provider === 'fonnte' && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Provider populer Indonesia. Mudah digunakan, cukup masukkan 1 Token API perangkat Fonnte.
                  </p>
                </div>

                {/* Wablas */}
                <div
                  onClick={() => setConfig({ ...config, provider: 'wablas' })}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    config.provider === 'wablas'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800 dark:text-white">Wablas.com</span>
                    {config.provider === 'wablas' && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Platform gateway enterprise. Mendukung multi-server domain (contoh: solo.wablas.com).
                  </p>
                </div>

                {/* Starsender */}
                <div
                  onClick={() => setConfig({ ...config, provider: 'starsender' })}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    config.provider === 'starsender'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800 dark:text-white">Starsender.online</span>
                    {config.provider === 'starsender' && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Layanan WhatsApp API handal dengan endpoint REST API v1/v2 berkecepatan tinggi.
                  </p>
                </div>

                {/* Custom Webhook / Local Baileys */}
                <div
                  onClick={() => setConfig({ ...config, provider: 'custom_webhook' })}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    config.provider === 'custom_webhook'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800 dark:text-white">Custom Webhook / Baileys</span>
                    {config.provider === 'custom_webhook' && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Gunakan server bot WhatsApp mandiri Anda (Node.js Baileys / WPPConnect / Go-WhatsApp).
                  </p>
                </div>
              </div>

              {/* API Credentials Input Form */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Token API / API Key ({config.provider.toUpperCase()})</span>
                    <span className="text-[10px] text-slate-400 font-normal">Rahasia & Tersimpan Aman</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="Masukkan Token / API Key dari dashboard provider Anda"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {config.provider === 'wablas' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Domain Server Wablas
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Globe className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={config.domainUrl || ''}
                        onChange={(e) => setConfig({ ...config, domainUrl: e.target.value })}
                        placeholder="https://solo.wablas.com (atau domain server Anda)"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {config.provider === 'custom_webhook' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      URL Endpoint Webhook POST
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Globe className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        value={config.webhookUrl || ''}
                        onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                        placeholder="https://api.sekolah-anda.sch.id/send-whatsapp"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nomor WhatsApp Pengirim / Bot Sekolah (Opsional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={config.senderNumber || ''}
                      onChange={(e) => setConfig({ ...config, senderNumber: e.target.value })}
                      placeholder="Contoh: 081298765432"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Event Automation Switches */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>Pemicu Notifikasi Otomatis (Event Triggers)</span>
              </h4>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      🔐 Kirim Kode OTP Siswa (Login NISN)
                    </p>
                    <p className="text-[11px] text-slate-400">Kirim kode 6 digit otomatis ke nomor WA siswa/orang tua saat masuk</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.sendOtpEnabled}
                    onChange={(e) => setConfig({ ...config, sendOtpEnabled: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      ✅ Notifikasi Presensi Masuk (Scan QR / Input Kelas)
                    </p>
                    <p className="text-[11px] text-slate-400">Kirim notifikasi real-time saat siswa terdata HADIR masuk sekolah</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.sendPresensiMasukEnabled}
                    onChange={(e) => setConfig({ ...config, sendPresensiMasukEnabled: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      🏠 Notifikasi Presensi Pulang
                    </p>
                    <p className="text-[11px] text-slate-400">Kirim konfirmasi saat siswa melakukan scan kepulangan</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.sendPresensiPulangEnabled}
                    onChange={(e) => setConfig({ ...config, sendPresensiPulangEnabled: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      ⚠️ Notifikasi Keterlambatan / Kesiangan
                    </p>
                    <p className="text-[11px] text-slate-400">Kirim peringatan ke orang tua saat siswa terlambat lewat batas jam toleransi</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.sendPresensiTerlambatEnabled}
                    onChange={(e) => setConfig({ ...config, sendPresensiTerlambatEnabled: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      ❌ Notifikasi Ketidakhadiran (Alpa / Izin / Sakit)
                    </p>
                    <p className="text-[11px] text-slate-400">Kirim laporan harian ketidakhadiran ke nomor WhatsApp orang tua</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.sendKetidakhadiranEnabled}
                    onChange={(e) => setConfig({ ...config, sendKetidakhadiranEnabled: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Test Send Message Card (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 sticky top-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Uji Coba Kirim Pesan Langsung
                  </h4>
                  <p className="text-[11px] text-slate-400">Tes koneksi gateway ke nomor WhatsApp nyata</p>
                </div>
              </div>

              <form onSubmit={handleSendTest} className="space-y-3.5 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nomor WhatsApp Tujuan Uji Coba
                  </label>
                  <input
                    type="text"
                    required
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Isi Pesan Uji Coba
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengirim ke Server Gateway...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Pesan Percobaan</span>
                    </>
                  )}
                </button>
              </form>

              {testResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-2 ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                    <span>{testResult.success ? 'Berhasil Terkirim!' : 'Gagal Mengirim'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{testResult.message}</p>
                  {testResult.directUrl && (
                    <a
                      href={testResult.directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 underline hover:no-underline pt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka di WhatsApp Web / App</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TEMPLATE PESAN OTOMATIS                                            */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Template Editor (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Template Selector Pills */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'presensiMasuk', label: 'Presensi Masuk', icon: CheckCircle2 },
                  { id: 'presensiPulang', label: 'Presensi Pulang', icon: ArrowRight },
                  { id: 'presensiTerlambat', label: 'Terlambat', icon: Clock },
                  { id: 'ketidakhadiran', label: 'Ketidakhadiran', icon: AlertCircle },
                  { id: 'otp', label: 'OTP Siswa (NISN)', icon: Key },
                  { id: 'broadcast', label: 'Siaran Pengumuman', icon: Send },
                ].map((item) => {
                  const IconC = item.icon;
                  const isActive = activeTemplateType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTemplateType(item.id as any)}
                      className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                        isActive
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <IconC className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-xs truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template Textarea */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Editor Teks Template</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const defaultText = (DEFAULT_WA_TEMPLATES as any)[activeTemplateType] || '';
                    setActiveTemplateText(defaultText);
                    onShowToast('Template dikembalikan ke teks bawaan.', 'info');
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Template Ini</span>
                </button>
              </div>

              {/* Variable Chips */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Klik variabel untuk menyisipkan ke dalam pesan:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '{nama_siswa}',
                    '{nisn}',
                    '{kelas}',
                    '{jam}',
                    '{tanggal}',
                    '{status}',
                    '{sekolah}',
                    '{keterangan}',
                    '{otp_code}',
                    '{pesan_pengumuman}',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertVariable(tag)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/50 border border-slate-200/80 dark:border-slate-700 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={10}
                value={getActiveTemplateText()}
                onChange={(e) => setActiveTemplateText(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tip Format WhatsApp: Gunakan <code className="font-bold">*tebal*</code>, <code className="italic">_miring_</code>, atau <code className="line-through">~coret~</code>.
              </p>
            </div>
          </div>

          {/* Live WhatsApp Bubble Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 sticky top-6">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Simulasi Tampilan WhatsApp di HP</span>
              </h4>

              {/* Phone Mockup Window */}
              <div className="rounded-2xl bg-[#ECE5DD] dark:bg-zinc-950 p-4 border border-slate-300 dark:border-zinc-800 shadow-inner space-y-3">
                {/* Header Mockup */}
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2.5 text-xs text-slate-700 dark:text-zinc-300 font-bold">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                      WA
                    </div>
                    <div>
                      <p className="text-xs leading-none font-bold text-slate-900 dark:text-white">
                        {sekolah.nama || 'SMK NEGERI 6 GARUT'}
                      </p>
                      <span className="text-[9px] text-emerald-600 font-normal">Bot Resmi Presensi</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">{getFormattedTimeNow()}</span>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="bg-white dark:bg-[#005c4b]/30 p-3.5 rounded-2xl rounded-tl-none shadow-xs border border-emerald-500/20 text-xs sm:text-[13px] text-slate-800 dark:text-zinc-100 font-sans whitespace-pre-wrap leading-relaxed">
                  {samplePreviewText}
                  <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                    <span>{getFormattedTimeNow()}</span>
                    <span className="text-blue-500 font-black">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KIRIM SIARAN MASSAL (BROADCAST)                                    */}
      {/* ========================================================================= */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>Pengaturan Target Siaran Massal</span>
              </h4>

              {/* Target Type Radio */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBroadcastTarget('kelas')}
                  className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                    broadcastTarget === 'kelas'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="block text-xs">Per Rombel Kelas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastTarget('all')}
                  className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                    broadcastTarget === 'all'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="block text-xs">Seluruh Siswa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastTarget('guru')}
                  className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                    broadcastTarget === 'guru'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="block text-xs">Dewan Guru</span>
                </button>
              </div>

              {broadcastTarget === 'kelas' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pilih Rombongan Belajar / Kelas
                  </label>
                  <select
                    value={broadcastSelectedKelas}
                    onChange={(e) => setBroadcastSelectedKelas(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {appData.kelas.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama} ({appData.siswa.filter((s) => s.kelasId === k.id).length} Siswa)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {broadcastTarget !== 'guru' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kirimkan Pesan Ke
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'orang_tua', label: 'Nomor Orang Tua' },
                      { id: 'siswa', label: 'Nomor Siswa' },
                      { id: 'keduanya', label: 'Orang Tua & Siswa' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setBroadcastRecipientType(item.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition text-xs font-bold cursor-pointer ${
                          broadcastRecipientType === item.id
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Isi Surat / Pengumuman
                </label>
                <textarea
                  rows={5}
                  value={broadcastContent}
                  onChange={(e) => setBroadcastContent(e.target.value)}
                  placeholder="Ketikkan isi pengumuman atau surat pemberitahuan sekolah..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                />
              </div>

              {/* Broadcast Execution Button */}
              <button
                type="button"
                disabled={isBroadcasting || targetRecipients.length === 0}
                onClick={handleStartBroadcast}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isBroadcasting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Mengirim Siaran Massal...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Mulai Siaran Massal ({targetRecipients.length} Kontak)</span>
                  </>
                )}
              </button>

              {/* Progress Indicator */}
              {broadcastProgress && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Progress Pengiriman Siaran</span>
                    <span>
                      {broadcastProgress.sent + broadcastProgress.failed} / {broadcastProgress.total} (
                      {Math.round(((broadcastProgress.sent + broadcastProgress.failed) / broadcastProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${Math.round(((broadcastProgress.sent + broadcastProgress.failed) / broadcastProgress.total) * 100)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="text-emerald-600 font-bold">✓ {broadcastProgress.sent} Sukses</span>
                    <span className="text-rose-600 font-bold">✗ {broadcastProgress.failed} Gagal</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact List Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Daftar Penerima Terpilih ({targetRecipients.length})</span>
                </h4>
              </div>

              <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                {targetRecipients.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tidak ada kontak nomor WhatsApp pada filter ini.
                  </div>
                ) : (
                  targetRecipients.map((item, idx) => (
                    <div key={idx} className="pt-2 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white leading-tight">{item.name}</p>
                        <span className="text-[10px] text-slate-400">{item.info}</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {maskPhoneNumber(item.phone)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RIWAYAT LOG PENGIRIMAN PESAN                                       */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Cari penerima, nomor, atau kata kunci..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                <option value="all">Semua Jenis Pesan</option>
                <option value="otp">OTP Siswa</option>
                <option value="presensi_masuk">Presensi Masuk</option>
                <option value="presensi_pulang">Presensi Pulang</option>
                <option value="terlambat">Terlambat</option>
                <option value="alpa">Ketidakhadiran</option>
                <option value="broadcast">Siaran Massal</option>
                <option value="test">Uji Coba</option>
              </select>

              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                <option value="all">Semua Status</option>
                <option value="success">Sukses Terkirim</option>
                <option value="failed">Gagal</option>
              </select>

              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Log</span>
                </button>
              )}
            </div>
          </div>

          {/* Log Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Penerima & HP</th>
                  <th className="py-3 px-4">Jenis Notifikasi</th>
                  <th className="py-3 px-4">Ringkasan Pesan</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Belum ada riwayat pengiriman pesan WhatsApp.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                        {new Date(item.timestamp).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800 dark:text-white leading-tight">{item.recipientName}</p>
                        <span className="font-mono text-[10px] text-slate-400">{maskPhoneNumber(item.recipientPhone)}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 capitalize">
                          {item.messageType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-600 dark:text-slate-400" title={item.messageText}>
                        {item.messageText.replace(/\n/g, ' ')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-[10px] text-slate-500 dark:text-slate-400">
                        {item.provider}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'success'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {item.status === 'success' ? '✓ Sukses' : '✗ Gagal'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
