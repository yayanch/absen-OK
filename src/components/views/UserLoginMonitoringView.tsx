import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Ban,
  RefreshCw,
  Download,
  Trash2,
  Search,
  Filter,
  Globe,
  Laptop,
  Smartphone,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  LogOut,
  Key,
  FileSpreadsheet,
  Info,
  ChevronLeft,
  ChevronRight,
  Eye,
  Zap,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpDown,
  Check,
  X,
  FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ActiveUserSession, AppData, LoginStatus, UserLoginLog, UserSession } from '../../types';
import {
  formatOnlineDuration,
  getLoginStatusMeta,
  parseUserAgent,
  recordLoginEvent,
  terminateAllOtherUserSessions,
  terminateUserSession,
  cleanDummyUserLoginData,
} from '../../utils/loginMonitorEngine';
import { PageHeader } from '../common/UIComponents';

interface UserLoginMonitoringViewProps {
  appData: AppData;
  currentUser: UserSession;
  onUpdateAppData: (updated: AppData) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onConfirmModal: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
  onNavigateToView?: (view: any) => void;
}

export const UserLoginMonitoringView: React.FC<UserLoginMonitoringViewProps> = ({
  appData,
  currentUser,
  onUpdateAppData,
  onShowToast,
  onConfirmModal,
  onNavigateToView,
}) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'history' | 'analytics' | 'anomalies'>('sessions');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | LoginStatus>('all');
  const [filterRole, setFilterRole] = useState<'all' | string>('all');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<UserLoginLog | null>(null);
  const [timeNow, setTimeNow] = useState(Date.now());

  // Data references (pure real data, no dummy data)
  const loginLogs: UserLoginLog[] = useMemo(() => {
    return (appData.userLoginLogs || []).filter(
      (l) => !l.id.startsWith('log-login-') && !l.id.startsWith('log-srv-')
    );
  }, [appData.userLoginLogs]);

  const activeSessions: ActiveUserSession[] = useMemo(() => {
    return (appData.activeUserSessions || []).filter(
      (s) =>
        !s.id.startsWith('sess-srv-') &&
        !s.id.startsWith('sess-guru-') &&
        !s.id.startsWith('sess-kesiswaan-') &&
        !s.id.startsWith('sess-siswa-') &&
        s.id !== 'sess-admin-active' &&
        s.id !== 'sess-guru1-active'
    );
  }, [appData.activeUserSessions]);

  // Clean legacy dummy records from appData if detected on mount
  useEffect(() => {
    const hasDummyLogs = (appData.userLoginLogs || []).some(
      (l) => l.id.startsWith('log-login-') || l.id.startsWith('log-srv-')
    );
    const hasDummySessions = (appData.activeUserSessions || []).some(
      (s) =>
        s.id.startsWith('sess-srv-') ||
        s.id.startsWith('sess-guru-') ||
        s.id.startsWith('sess-kesiswaan-') ||
        s.id.startsWith('sess-siswa-') ||
        s.id === 'sess-admin-active' ||
        s.id === 'sess-guru1-active'
    );

    if (hasDummyLogs || hasDummySessions) {
      const cleaned = cleanDummyUserLoginData(appData);
      onUpdateAppData(cleaned);
    }
  }, []);

  // Keep live duration ticks
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeNow(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Poll backend for updates if autoRefresh is enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/user-logins');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.logs && data.activeSessions) {
            // Merge with local state
            onUpdateAppData({
              ...appData,
              userLoginLogs: data.logs,
              activeUserSessions: data.activeSessions,
            });
          }
        }
      } catch {}
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, appData, onUpdateAppData]);

  // Manual Refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/user-logins');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.logs && data.activeSessions) {
          onUpdateAppData({
            ...appData,
            userLoginLogs: data.logs,
            activeUserSessions: data.activeSessions,
          });
          onShowToast('Data log login & sesi aktif berhasil diperbarui!', 'success');
        }
      } else {
        onShowToast('Memperbarui tampilan dari status memori lokal.', 'info');
      }
    } catch {
      onShowToast('Terhubung dengan status lokal sistem.', 'info');
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayLogs = loginLogs.filter((l) => l.timestamp.startsWith(todayStr));
    const successfulLogins = loginLogs.filter((l) => l.status === 'success');
    const failedLogins = loginLogs.filter(
      (l) => l.status === 'failed_password' || l.status === 'user_not_found'
    );
    const lockedOrBlocked = loginLogs.filter(
      (l) => l.status === 'account_locked' || l.status === 'ip_blocked' || l.status === 'waf_rejected'
    );

    const successRate = loginLogs.length > 0
      ? Math.round((successfulLogins.length / loginLogs.length) * 100)
      : 100;

    return {
      total: loginLogs.length,
      todayCount: todayLogs.length,
      activeSessionsCount: activeSessions.length,
      successfulCount: successfulLogins.length,
      failedCount: failedLogins.length,
      threatsCount: lockedOrBlocked.length,
      successRate,
    };
  }, [loginLogs, activeSessions]);

  // Terminate Single Session Action
  const handleTerminateSession = (session: ActiveUserSession) => {
    const isSelf = session.username.toLowerCase() === (currentUser.data?.username || 'admin').toLowerCase();
    const confirmMessage = isSelf
      ? `PERINGATAN: Sesi ini adalah sesi Anda sendiri (${session.nama}). Memutuskan sesi ini akan membuat Anda keluar dari sistem!`
      : `Apakah Anda yakin ingin memutuskan paksa sesi login "${session.nama}" (${session.username}) dari IP ${session.ipAddress}?`;

    onConfirmModal(
      'Putuskan Sesi Pengguna',
      confirmMessage,
      isSelf ? 'danger' : 'warning',
      async () => {
        try {
          await fetch('/api/user-sessions/terminate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: session.id,
              terminatedBy: currentUser.data?.nama || 'Administrator',
            }),
          });
        } catch {}

        const updated = terminateUserSession(appData, session.id, currentUser.data?.nama || 'Admin');
        onUpdateAppData(updated);
        onShowToast(`Sesi login "${session.nama}" berhasil diputuskan.`, 'info');
      }
    );
  };

  // Terminate All Other Sessions
  const handleTerminateAllOtherSessions = () => {
    onConfirmModal(
      'Darurat: Putuskan Semua Sesi Pengguna Lain',
      'Tindakan ini akan mengakhiri semua sesi login guru, siswa, dan staf yang saat ini sedang aktif secara serentak, kecuali sesi Administrator Anda saat ini. Lanjutkan?',
      'danger',
      async () => {
        const myUsername = currentUser.data?.username || 'admin';
        try {
          await fetch('/api/user-sessions/terminate-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keepUsername: myUsername }),
          });
        } catch {}

        const updated = terminateAllOtherUserSessions(appData, myUsername);
        onUpdateAppData(updated);
        onShowToast('Seluruh sesi pengguna lain berhasil diputuskan serentak!', 'success');
      }
    );
  };

  // Clear Login History
  const handleClearHistory = () => {
    onConfirmModal(
      'Bersihkan Riwayat Log Login',
      'Apakah Anda yakin ingin menghapus seluruh rekaman riwayat log login pengguna? Tindakan ini tidak dapat dibatalkan.',
      'danger',
      async () => {
        try {
          await fetch('/api/user-logins/clear', { method: 'POST' });
        } catch {}

        onUpdateAppData({
          ...appData,
          userLoginLogs: [],
        });
        onShowToast('Seluruh riwayat log login berhasil dibersihkan.', 'success');
      }
    );
  };

  // Quick Action: Block IP Address from Log
  const handleQuickBlockIp = (ipToBlock: string, usernameTarget: string) => {
    onConfirmModal(
      'Blokir Alamat IP',
      `Apakah Anda yakin ingin memasukkan IP "${ipToBlock}" ke dalam daftar hitam (Blacklist Firewall IDS)? IP ini tidak akan dapat mengakses form login lagi.`,
      'danger',
      () => {
        const newBlock = {
          id: `blk-${Date.now()}`,
          ip: ipToBlock,
          reason: `Diblokir manual via Monitoring Login (Aktivitas akun ${usernameTarget})`,
          blockedAt: new Date().toLocaleString('id-ID'),
          blockedBy: currentUser.data?.nama || 'Admin IT',
          threatCount: 5,
        };

        const existingBlocks = appData.blockedIps || [];
        onUpdateAppData({
          ...appData,
          blockedIps: [newBlock, ...existingBlocks],
        });
        onShowToast(`Alamat IP ${ipToBlock} berhasil diblokir oleh sistem firewall.`, 'success');
      }
    );
  };

  // Quick Action: Lock or Unlock Account
  const handleToggleAccountLock = (targetUsername: string, isCurrentlyLocked: boolean) => {
    if (isCurrentlyLocked) {
      // Unlock
      const filteredLocks = (appData.lockedAccounts || []).filter(
        (l) => l.username.toLowerCase() !== targetUsername.toLowerCase()
      );
      onUpdateAppData({
        ...appData,
        lockedAccounts: filteredLocks,
      });
      onShowToast(`Kunci akun pengguna "${targetUsername}" berhasil dibuka.`, 'success');
    } else {
      // Lock
      onConfirmModal(
        'Kunci Akun Pengguna',
        `Kunci sementara akun "${targetUsername}" selama 30 menit demi keamanan sistem? Pengguna tidak dapat masuk hingga masa kunci berakhir.`,
        'warning',
        () => {
          const lockObj = {
            username: targetUsername,
            lockedAt: new Date().toISOString(),
            unlocksAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            failedAttempts: 5,
            reason: 'Terkunci manual oleh Administrator dari menu Monitoring Login',
            lastIp: 'Manual Lock',
          };
          const existingLocks = (appData.lockedAccounts || []).filter(
            (l) => l.username.toLowerCase() !== targetUsername.toLowerCase()
          );
          onUpdateAppData({
            ...appData,
            lockedAccounts: [lockObj, ...existingLocks],
          });
          onShowToast(`Akun "${targetUsername}" berhasil dikunci selama 30 menit.`, 'success');
        }
      );
    }
  };

  // Export to Excel / CSV / JSON
  const handleExportData = (format: 'xlsx' | 'csv' | 'json') => {
    if (loginLogs.length === 0) {
      onShowToast('Tidak ada data log login untuk diekspor.', 'warning');
      return;
    }

    const exportRows = loginLogs.map((log, idx) => ({
      No: idx + 1,
      Waktu: log.formattedTime,
      Username: log.username,
      Nama: log.nama,
      Peran: log.role,
      Status: log.statusLabel,
      'Status Code': log.status,
      'Alamat IP': log.ipAddress,
      Lokasi: log.location || '-',
      Perangkat: log.device,
      Peramban: log.browser,
      Keterangan: log.failureReason || 'Normal',
      'User Agent': log.userAgent,
    }));

    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(loginLogs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `log_login_pengguna_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      onShowToast('Log login berhasil diekspor ke JSON!', 'success');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Log_Login_Pengguna');

    if (format === 'csv') {
      XLSX.writeFile(wb, `log_login_pengguna_${new Date().toISOString().slice(0, 10)}.csv`, { bookType: 'csv' });
      onShowToast('Log login berhasil diekspor ke CSV!', 'success');
    } else {
      XLSX.writeFile(wb, `log_login_pengguna_${new Date().toISOString().slice(0, 10)}.xlsx`);
      onShowToast('Laporan log login berhasil diekspor ke Excel (.xlsx)!', 'success');
    }
  };

  // Filter logs for History Tab
  const filteredLogs = useMemo(() => {
    return loginLogs.filter((log) => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchSearch =
        !search ||
        log.username.toLowerCase().includes(search) ||
        log.nama.toLowerCase().includes(search) ||
        log.ipAddress.toLowerCase().includes(search) ||
        log.device.toLowerCase().includes(search) ||
        log.browser.toLowerCase().includes(search) ||
        log.statusLabel.toLowerCase().includes(search);

      // Status
      const matchStatus = filterStatus === 'all' || log.status === filterStatus;

      // Role
      const matchRole =
        filterRole === 'all' ||
        log.role.toLowerCase() === filterRole.toLowerCase() ||
        (filterRole === 'guru_wali' && (log.role === 'guru' || log.role === 'wali'));

      // Period
      let matchPeriod = true;
      const logDate = new Date(log.timestamp).getTime();
      const now = Date.now();
      if (filterPeriod === 'today') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        matchPeriod = logDate >= todayStart.getTime();
      } else if (filterPeriod === '7days') {
        matchPeriod = logDate >= now - 7 * 24 * 60 * 60 * 1000;
      } else if (filterPeriod === '30days') {
        matchPeriod = logDate >= now - 30 * 24 * 60 * 60 * 1000;
      }

      return matchSearch && matchStatus && matchRole && matchPeriod;
    });
  }, [loginLogs, searchTerm, filterStatus, filterRole, filterPeriod]);

  // Paginated logs
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Analytics Aggregations
  const analytics = useMemo(() => {
    // 1. Hourly distribution (0 - 23)
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${String(i).padStart(2, '0')}:00`,
      success: 0,
      failed: 0,
    }));

    loginLogs.forEach((l) => {
      try {
        const h = new Date(l.timestamp).getHours();
        if (h >= 0 && h < 24) {
          if (l.status === 'success') {
            hours[h].success += 1;
          } else {
            hours[h].failed += 1;
          }
        }
      } catch {}
    });

    const maxHourTotal = Math.max(...hours.map((h) => h.success + h.failed), 1);

    // 2. Device breakdown
    const devicesMap: { [key: string]: number } = {};
    loginLogs.forEach((l) => {
      const dev = l.device || 'Lainnya';
      devicesMap[dev] = (devicesMap[dev] || 0) + 1;
    });

    // 3. Browser breakdown
    const browsersMap: { [key: string]: number } = {};
    loginLogs.forEach((l) => {
      const br = l.browser || 'Lainnya';
      browsersMap[br] = (browsersMap[br] || 0) + 1;
    });

    // 4. Role breakdown
    const rolesMap: { [key: string]: number } = {};
    loginLogs.forEach((l) => {
      const r = l.role || 'unknown';
      rolesMap[r] = (rolesMap[r] || 0) + 1;
    });

    // 5. Top Users Login Count
    const userLoginsMap: { [key: string]: { username: string; nama: string; role: string; count: number } } = {};
    loginLogs.forEach((l) => {
      if (!userLoginsMap[l.username]) {
        userLoginsMap[l.username] = {
          username: l.username,
          nama: l.nama,
          role: l.role,
          count: 0,
        };
      }
      userLoginsMap[l.username].count += 1;
    });
    const topUsers = Object.values(userLoginsMap).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      hours,
      maxHourTotal,
      devicesMap,
      browsersMap,
      rolesMap,
      topUsers,
    };
  }, [loginLogs]);

  // Anomalies Detection
  const anomalies = useMemo(() => {
    // Multi-failure suspects
    const failedByIp: { [ip: string]: { count: number; targets: Set<string>; lastLog: UserLoginLog } } = {};
    loginLogs.forEach((l) => {
      if (l.status === 'failed_password' || l.status === 'account_locked' || l.status === 'ip_blocked') {
        if (!failedByIp[l.ipAddress]) {
          failedByIp[l.ipAddress] = { count: 0, targets: new Set(), lastLog: l };
        }
        failedByIp[l.ipAddress].count += 1;
        failedByIp[l.ipAddress].targets.add(l.username);
      }
    });

    const suspectIps = Object.entries(failedByIp)
      .filter(([_, data]) => data.count >= 2)
      .map(([ip, data]) => ({
        ip,
        count: data.count,
        targets: Array.from(data.targets),
        lastLog: data.lastLog,
      }))
      .sort((a, b) => b.count - a.count);

    // Night access logs (23:00 - 05:00)
    const nightLogs = loginLogs.filter((l) => {
      try {
        const h = new Date(l.timestamp).getHours();
        return h >= 23 || h < 5;
      } catch {
        return false;
      }
    });

    return {
      suspectIps,
      nightLogs,
    };
  }, [loginLogs]);

  // Helper to render role badge
  const renderRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            Admin Utama
          </span>
        );
      case 'guru':
      case 'wali':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            Guru / Wali
          </span>
        );
      case 'murid':
      case 'siswa':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            Siswa
          </span>
        );
      case 'kesiswaan':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            Kesiswaan / BK
          </span>
        );
      case 'kurikulum':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            Kurikulum
          </span>
        );
      case 'staf_jadwal':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
            Staf Jadwal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                  Monitoring Login Pengguna
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Real-Time Live
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Pantau seluruh sesi aktif, riwayat otentikasi login, serta deteksi anomali akses akun sekolah
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
              autoRefresh
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
            }`}
            title="Auto-refresh telemetri login"
          >
            <span
              className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}
            ></span>
            {autoRefresh ? 'Auto 10s: Aktif' : 'Auto: Jeda'}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-500' : ''}`} />
            Segarkan
          </button>

          {/* Export Menu Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition">
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              Ekspor Data
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-20 hidden group-hover:block hover:block">
              <button
                onClick={() => handleExportData('xlsx')}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Microsoft Excel (.xlsx)
              </button>
              <button
                onClick={() => handleExportData('csv')}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                Format CSV (.csv)
              </button>
              <button
                onClick={() => handleExportData('json')}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                Format JSON (.json)
              </button>
            </div>
          </div>

          {/* Terminate All Other Sessions */}
          <button
            onClick={handleTerminateAllOtherSessions}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Putuskan Sesi Lain
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Live Sessions */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pengguna Sedang Online</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.activeSessionsCount}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Sesi Aktif</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Termasuk Admin, Guru, dan Siswa yang terhubung
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
        </div>

        {/* Card 2: Total Logins Today */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Login Hari Ini</span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.todayCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">dari {stats.total} total riwayat</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Aktivitas masuk portal per tanggal hari ini
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500"></div>
        </div>

        {/* Card 3: Success Rate */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Keberhasilan Otentikasi</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.successRate}%
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              ({stats.successfulCount} Berhasil)
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.successRate}%` }}
            ></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500"></div>
        </div>

        {/* Card 4: Failed / Threats */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Percobaan Gagal / Ancaman</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {stats.failedCount + stats.threatsCount}
            </span>
            <span className="text-xs text-rose-500 font-medium">
              ({stats.threatsCount} Dicekal Firewall)
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {stats.failedCount} kata sandi salah, {appData.lockedAccounts?.length || 0} akun terkunci
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500"></div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-2xl px-3 pt-2">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-xs md:text-sm border-b-2 transition -mb-[1px] ${
            activeTab === 'sessions'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          Sesi Pengguna Aktif
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
            {activeSessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-xs md:text-sm border-b-2 transition -mb-[1px] ${
            activeTab === 'history'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          Riwayat Log Akses
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold">
            {filteredLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-xs md:text-sm border-b-2 transition -mb-[1px] ${
            activeTab === 'analytics'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Statistik & Analitik
        </button>

        <button
          onClick={() => setActiveTab('anomalies')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-xs md:text-sm border-b-2 transition -mb-[1px] ${
            activeTab === 'anomalies'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Deteksi Anomali
          {anomalies.suspectIps.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold">
              {anomalies.suspectIps.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT 1: ACTIVE LIVE SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Daftar Sesi Pengguna yang Sedang Terhubung ({activeSessions.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sesi login pengguna akan terus diperbarui melalui heartbeat aktif setiap beberapa detik.
              </p>
            </div>
            <div className="text-xs text-slate-400">
              Terakhir diperbarui: {new Date(timeNow).toLocaleTimeString('id-ID')}
            </div>
          </div>

          {activeSessions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Tidak ada sesi aktif lain yang tercatat saat ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSessions.map((session) => {
                const isCurrentSelf =
                  session.username.toLowerCase() ===
                  (currentUser.data?.username || 'admin').toLowerCase();
                const isMobile =
                  session.device.toLowerCase().includes('android') ||
                  session.device.toLowerCase().includes('phone');

                return (
                  <div
                    key={session.id}
                    className={`relative p-4 rounded-xl border transition-all duration-200 ${
                      isCurrentSelf
                        ? 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800 ring-2 ring-sky-500/20 shadow-sm'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:shadow-md'
                    }`}
                  >
                    {/* Top Row: User + Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                            session.role === 'admin'
                              ? 'bg-gradient-to-tr from-rose-500 to-red-600'
                              : session.role === 'guru' || session.role === 'wali'
                              ? 'bg-gradient-to-tr from-blue-500 to-indigo-600'
                              : session.role === 'murid' || session.role === 'siswa'
                              ? 'bg-gradient-to-tr from-emerald-500 to-teal-600'
                              : 'bg-gradient-to-tr from-purple-500 to-indigo-600'
                          }`}
                        >
                          {session.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                              {session.nama}
                            </h3>
                            {isCurrentSelf && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
                                ANDA
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            @{session.username}
                          </span>
                        </div>
                      </div>

                      {renderRoleBadge(session.role)}
                    </div>

                    {/* Metadata details */}
                    <div className="mt-3.5 space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700/60 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          {isMobile ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                          Perangkat & Browser:
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={`${session.device} - ${session.browser}`}>
                          {session.device} • {session.browser}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Globe className="w-3.5 h-3.5" />
                          Alamat IP:
                        </span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                          {session.ipAddress}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          Waktu Masuk:
                        </span>
                        <span>{session.formattedLoginTime || new Date(session.loginAt).toLocaleTimeString('id-ID')}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Activity className="w-3.5 h-3.5 text-emerald-500" />
                          Durasi Online:
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatOnlineDuration(session.loginAt)}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Status: Terhubung
                      </span>

                      <button
                        onClick={() => handleTerminateSession(session)}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                          isCurrentSelf
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                        title="Putuskan sesi login secara paksa"
                      >
                        <LogOut className="w-3 h-3" />
                        {isCurrentSelf ? 'Keluar' : 'Putuskan Sesi'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: LOGIN HISTORY AUDIT TRAIL */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          {/* Filter & Search Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari username, nama, IP..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Filter Status */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="all">Semua Status Otentikasi</option>
                <option value="success">Berhasil Masuk</option>
                <option value="failed_password">Password Salah</option>
                <option value="account_locked">Akun Terkunci</option>
                <option value="ip_blocked">IP Diblokir</option>
                <option value="waf_rejected">Ditolak WAF</option>
                <option value="session_terminated">Sesi Diputus</option>
                <option value="user_not_found">User Tidak Ditemukan</option>
              </select>
            </div>

            {/* Filter Role */}
            <div>
              <select
                value={filterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="all">Semua Peran Pengguna</option>
                <option value="admin">Administrator</option>
                <option value="guru_wali">Guru & Wali Kelas</option>
                <option value="murid">Siswa / Murid</option>
                <option value="kesiswaan">Tim Kesiswaan / BK</option>
                <option value="kurikulum">Tim Kurikulum</option>
                <option value="staf_jadwal">Staf Pengelola Jadwal</option>
              </select>
            </div>

            {/* Filter Period */}
            <div>
              <select
                value={filterPeriod}
                onChange={(e) => {
                  setFilterPeriod(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="all">Semua Waktu</option>
                <option value="today">Hari Ini</option>
                <option value="7days">7 Hari Terakhir</option>
                <option value="30days">30 Hari Terakhir</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Peran</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Alamat IP & Lokasi</th>
                  <th className="py-3 px-4">Perangkat / Browser</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ditemukan riwayat log login yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => {
                    const statusMeta = getLoginStatusMeta(log.status);
                    const isFailed = log.status !== 'success' && log.status !== 'session_terminated';
                    const isLocked = (appData.lockedAccounts || []).some(
                      (l) => l.username.toLowerCase() === log.username.toLowerCase()
                    );
                    const isIpBlocked = (appData.blockedIps || []).some(
                      (b) => b.ip === log.ipAddress
                    );

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                      >
                        {/* Waktu */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {log.formattedTime}
                          </div>
                        </td>

                        {/* Pengguna */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {log.nama}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            @{log.username}
                          </div>
                        </td>

                        {/* Peran */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderRoleBadge(log.role)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusMeta.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotColor}`}></span>
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* IP & Lokasi */}
                        <td className="py-3 px-4">
                          <div className="font-mono font-medium text-slate-800 dark:text-slate-200">
                            {log.ipAddress}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {log.location || 'Jaringan Lokal'}
                          </div>
                        </td>

                        {/* Perangkat / Browser */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {log.device}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {log.browser}
                          </div>
                        </td>

                        {/* Keterangan */}
                        <td className="py-3 px-4 max-w-[200px] truncate text-slate-500" title={log.failureReason || 'Login berhasil'}>
                          {log.failureReason ? (
                            <span className="text-rose-600 dark:text-rose-400 font-medium">
                              {log.failureReason}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Otentikasi sukses
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                              title="Lihat Detail Log Lengkap"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Block IP Quick Action */}
                            {!isIpBlocked && (
                              <button
                                onClick={() => handleQuickBlockIp(log.ipAddress, log.username)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                                title={`Blokir IP ${log.ipAddress}`}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Lock / Unlock Account */}
                            {log.role !== 'admin' && (
                              <button
                                onClick={() => handleToggleAccountLock(log.username, isLocked)}
                                className={`p-1.5 rounded-lg ${
                                  isLocked
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                                title={isLocked ? 'Buka Kunci Akun' : 'Kunci Akun Pengguna'}
                              >
                                {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination & Clean Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                Menampilkan {(currentPage - 1) * pageSize + 1} -{' '}
                {Math.min(currentPage * pageSize, filteredLogs.length)} dari {filteredLogs.length} rekaman
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="py-1 px-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                <option value={10}>10 / hal</option>
                <option value={15}>15 / hal</option>
                <option value={25}>25 / hal</option>
                <option value={50}>50 / hal</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition mr-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Semua Log
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Hal {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: ANALYTICS & INSIGHTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Hourly Login Activity Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-sky-600" />
                  Tren Waktu Akses Login per Jam (00:00 - 23:00 WIB)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Menampilkan jam-jam tersibuk saat siswa dan guru melakukan login presensi pagi
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-sky-500"></span> Berhasil
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500"></span> Gagal / Salah Pass
                </span>
              </div>
            </div>

            {/* SVG / Bar Chart Representation */}
            <div className="h-48 flex items-end gap-1 sm:gap-2 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800">
              {analytics.hours.map((item) => {
                const total = item.success + item.failed;
                const heightPct = Math.max(8, Math.round((total / analytics.maxHourTotal) * 100));
                const isPeak = item.hour >= 6 && item.hour <= 8;

                return (
                  <div
                    key={item.hour}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-12 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-10">
                      <div className="font-bold">{item.label}</div>
                      <div>Berhasil: {item.success}</div>
                      <div>Gagal: {item.failed}</div>
                    </div>

                    <div
                      className={`w-full rounded-t transition-all ${
                        isPeak
                          ? 'bg-sky-500 group-hover:bg-sky-400'
                          : 'bg-slate-300 dark:bg-slate-700 group-hover:bg-sky-400'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    >
                      {item.failed > 0 && (
                        <div
                          className="w-full bg-rose-500 rounded-t"
                          style={{
                            height: `${Math.round((item.failed / Math.max(1, total)) * 100)}%`,
                          }}
                        ></div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 rotate-45 sm:rotate-0 origin-left">
                      {item.hour % 2 === 0 ? item.hour : ''}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>00:00 (Dini Hari)</span>
              <span className="text-sky-600 font-semibold">06:00 - 08:00 (Jam Presensi Masuk)</span>
              <span>12:00 (Siang)</span>
              <span>23:00 (Malam)</span>
            </div>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Device Distribution */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-500" />
                Distribusi Perangkat
              </h4>
              <div className="space-y-2.5 pt-1">
                {Object.entries(analytics.devicesMap).map(([device, count]) => {
                  const pct = Math.round((count / Math.max(1, loginLogs.length)) * 100);
                  return (
                    <div key={device} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[180px]">
                          {device}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Browser Distribution */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-500" />
                Distribusi Peramban (Browser)
              </h4>
              <div className="space-y-2.5 pt-1">
                {Object.entries(analytics.browsersMap).map(([browser, count]) => {
                  const pct = Math.round((count / Math.max(1, loginLogs.length)) * 100);
                  return (
                    <div key={browser} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[180px]">
                          {browser}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-sky-500 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Active Users */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Top Pengguna Paling Aktif Login
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {analytics.topUsers.map((u, i) => (
                  <div key={u.username} className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                        {i + 1}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
                          {u.nama}
                        </div>
                        <div className="text-[11px] text-slate-400">@{u.username}</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                      {u.count}x Login
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: ANOMALIES & SECURITY ALERTS */}
      {activeTab === 'anomalies' && (
        <div className="space-y-5">
          {/* Suspect Brute-Force IPs Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  Alamat IP Mencurigakan (Banyak Percobaan Gagal)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Alamat IP yang terdeteksi melakukan percobaan password salah berulang kali atau menembus proteksi
                </p>
              </div>
              {onNavigateToView && (
                <button
                  onClick={() => onNavigateToView('intrusion_detection')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition"
                >
                  Buka Pengaturan IDS Firewall
                </button>
              )}
            </div>

            {anomalies.suspectIps.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Tidak terdeteksi serangan brute force atau IP mencurigakan aktif.
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sistem proteksi rate limiting dan firewall berjalan optimal.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {anomalies.suspectIps.map((suspect) => {
                  const isBlocked = (appData.blockedIps || []).some((b) => b.ip === suspect.ip);
                  return (
                    <div
                      key={suspect.ip}
                      className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                            {suspect.ip}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                            {suspect.count}x Percobaan Gagal
                          </span>
                          {isBlocked && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-white">
                              IP DIBLOKIR
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          Menargetkan username:{' '}
                          <span className="font-semibold">{suspect.targets.join(', ')}</span> • Lokasi:{' '}
                          {suspect.lastLog.location || 'Tidak diketahui'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isBlocked ? (
                          <button
                            onClick={() => handleQuickBlockIp(suspect.ip, suspect.targets[0] || 'Unknown')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Blokir IP Ini
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">
                            Sudah Terblokir di Blacklist
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Night Anomalies */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Login di Luar Jam Operasional Sekolah (23:00 - 05:00 WIB)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aktivitas login pada dini hari yang perlu ditinjau apakah otorisasi sah dari pengajar atau aktivitas anomali
              </p>
            </div>

            {anomalies.nightLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                Tidak ada riwayat login pada jam dini hari.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {anomalies.nightLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{log.nama}</span>{' '}
                      <span className="text-slate-400">(@{log.username})</span>
                      <div className="text-[11px] text-slate-500">
                        {log.formattedTime} • IP: {log.ipAddress} • {log.device}
                      </div>
                    </div>
                    {renderRoleBadge(log.role)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL DRAWER */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Detail Log Otentikasi
                  </h3>
                  <p className="text-xs text-slate-400">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div>
                  <span className="text-slate-400">Nama Pengguna:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {selectedLog.nama}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Username / ID:</span>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {selectedLog.username}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Peran Akun:</span>
                  <div className="mt-1">{renderRoleBadge(selectedLog.role)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Status Login:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedLog.statusLabel}
                  </div>
                </div>
              </div>

              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-slate-400">Waktu Lengkap:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedLog.formattedTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Alamat IP:</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {selectedLog.ipAddress}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Perkiraan Lokasi:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedLog.location || 'Jaringan Lokal'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tipe Perangkat:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedLog.device}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Peramban (Browser):</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedLog.browser}
                  </span>
                </div>
                {selectedLog.failureReason && (
                  <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-rose-500 font-medium">Alasan Kegagalan:</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {selectedLog.failureReason}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-400 block mb-1">User Agent Header Lengkap:</span>
                <p className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all select-all">
                  {selectedLog.userAgent}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
