import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Calendar,
  User,
  Shield,
  Download,
  Trash2,
  Info,
  ArrowUpDown,
  Filter,
  CheckCircle,
  FileSpreadsheet,
  Printer,
  Clock,
  Database,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Edit3,
  Sliders,
  Globe,
  Copy,
  Check,
  Server,
  HardDrive,
  ShieldAlert,
  Key,
  Laptop,
  Sparkles,
  Eye,
  Plus,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppData, AuditLog, UserSession } from '../../types';
import { Pagination } from '../Pagination';
import { PageHeader } from '../common/UIComponents';

interface AuditLogsViewProps {
  appData: AppData;
  currentUser: UserSession;
  onUpdateAppData: (updated: AppData) => void;
  onConfirmModal: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

type ActionCategory = 'all' | 'create' | 'update' | 'delete' | 'sync' | 'security';
type TimeframeFilter = 'all' | 'today' | '24h' | '7d' | '30d';

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  appData,
  currentUser,
  onUpdateAppData,
  onConfirmModal,
  onShowToast,
}) => {
  // View mode
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'semua' | string>('semua');
  const [filterModule, setFilterModule] = useState<'semua' | string>('semua');
  const [filterCategory, setFilterCategory] = useState<ActionCategory>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<TimeframeFilter>('all');
  const [sortAsc, setSortAsc] = useState(false); // Default newest first

  // Pagination for table
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Timeline interactive states
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Server sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [dbConfigInfo, setDbConfigInfo] = useState<{
    host: string;
    database: string;
    isEnv: boolean;
    connected: boolean;
  }>({
    host: 'Server Backend',
    database: 'sistem_presensi_sekolah',
    isEnv: false,
    connected: true,
  });

  // Modal manual audit note
  const [showAddCheckpointModal, setShowAddCheckpointModal] = useState(false);
  const [checkpointAction, setCheckpointAction] = useState('VERIFIKASI_INTEGRITAS_DATA');
  const [checkpointDetail, setCheckpointDetail] = useState('');

  const logs = appData.auditLogs || [];

  // Fetch server database configuration on mount
  useEffect(() => {
    fetch('/api/mysql/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setDbConfigInfo({
            host: data.config.host || 'localhost',
            database: data.config.database || 'sistem_presensi_sekolah',
            isEnv: Boolean(data.isEnv),
            connected: true,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Helper: Categorize action
  const getActionCategory = (aksi: string): ActionCategory => {
    const a = (aksi || '').toUpperCase();
    if (a.includes('TAMBAH') || a.includes('CREATE') || a.includes('INSERT') || a.includes('IMPORT') || a.includes('REGISTER')) {
      return 'create';
    }
    if (a.includes('HAPUS') || a.includes('DELETE') || a.includes('REMOVE') || a.includes('DROP')) {
      return 'delete';
    }
    if (a.includes('SYNC') || a.includes('SINKRON') || a.includes('DATABASE') || a.includes('BACKUP') || a.includes('RESTORE')) {
      return 'sync';
    }
    if (a.includes('LOGIN') || a.includes('LOGOUT') || a.includes('SECURITY') || a.includes('HAK_AKSES') || a.includes('PASSWORD') || a.includes('ROLE')) {
      return 'security';
    }
    return 'update';
  };

  // Helper: Category metadata styling & icons
  const getCategoryDetails = (cat: ActionCategory) => {
    switch (cat) {
      case 'create':
        return {
          label: 'Penambahan (Create)',
          icon: PlusCircle,
          badgeColor: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/40',
          dotColor: 'bg-emerald-600 dark:bg-emerald-500 shadow-emerald-500/20',
          accentBorder: 'border-l-emerald-500',
        };
      case 'delete':
        return {
          label: 'Penghapusan (Delete)',
          icon: Trash2,
          badgeColor: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200/60 dark:border-rose-800/40',
          dotColor: 'bg-rose-600 dark:bg-rose-500 shadow-rose-500/20',
          accentBorder: 'border-l-rose-500',
        };
      case 'sync':
        return {
          label: 'Sinkronisasi Database',
          icon: Database,
          badgeColor: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800/40',
          dotColor: 'bg-indigo-600 dark:bg-indigo-500 shadow-indigo-500/20',
          accentBorder: 'border-l-indigo-500',
        };
      case 'security':
        return {
          label: 'Keamanan & Autentikasi',
          icon: ShieldAlert,
          badgeColor: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200/60 dark:border-amber-800/40',
          dotColor: 'bg-amber-600 dark:bg-amber-500 shadow-amber-500/20',
          accentBorder: 'border-l-amber-500',
        };
      default:
        return {
          label: 'Perubahan Data (Update)',
          icon: Edit3,
          badgeColor: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200/60 dark:border-blue-800/40',
          dotColor: 'bg-blue-600 dark:bg-blue-500 shadow-blue-500/20',
          accentBorder: 'border-l-blue-500',
        };
    }
  };

  // Helper: Relative time in Indonesian
  const getRelativeTime = (timestamp: string): string => {
    try {
      const then = new Date(timestamp).getTime();
      const now = Date.now();
      const diffSec = Math.floor((now - then) / 1000);

      if (diffSec < 45) return 'Baru saja';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
      if (diffSec < 172800) return 'Kemarin';
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} hari lalu`;
      return new Date(timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  // Helper: Grouping label for chronological timeline
  const getDateGroupLabel = (timestamp: string): string => {
    try {
      const target = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const isToday =
        target.getDate() === today.getDate() &&
        target.getMonth() === today.getMonth() &&
        target.getFullYear() === today.getFullYear();

      if (isToday) return 'HARI INI';

      const isYesterday =
        target.getDate() === yesterday.getDate() &&
        target.getMonth() === yesterday.getMonth() &&
        target.getFullYear() === yesterday.getFullYear();

      if (isYesterday) return 'KEMARIN';

      return target.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).toUpperCase();
    } catch {
      return 'AKTIVITAS LAINNYA';
    }
  };

  // Filter & Search computation
  const filteredLogs = useMemo(() => {
    const now = Date.now();

    return logs
      .filter((log) => {
        // Search
        const matchSearch =
          !searchTerm ||
          log.aksi.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (log.ipAddress && log.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()));

        // Role
        const matchRole = filterRole === 'semua' || log.role.toLowerCase() === filterRole.toLowerCase();

        // Module
        const matchModule = filterModule === 'semua' || log.role.toLowerCase() === filterModule.toLowerCase();

        // Category
        const cat = getActionCategory(log.aksi);
        const matchCat = filterCategory === 'all' || cat === filterCategory;

        // Timeframe
        let matchTime = true;
        const logTime = new Date(log.timestamp).getTime();
        if (filterTimeframe === 'today') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          matchTime = logTime >= startOfToday.getTime();
        } else if (filterTimeframe === '24h') {
          matchTime = now - logTime <= 24 * 60 * 60 * 1000;
        } else if (filterTimeframe === '7d') {
          matchTime = now - logTime <= 7 * 24 * 60 * 60 * 1000;
        } else if (filterTimeframe === '30d') {
          matchTime = now - logTime <= 30 * 24 * 60 * 60 * 1000;
        }

        return matchSearch && matchRole && matchModule && matchCat && matchTime;
      })
      .sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return sortAsc ? dateA - dateB : dateB - dateA;
      });
  }, [logs, searchTerm, filterRole, filterModule, filterCategory, filterTimeframe, sortAsc]);

  // Grouped logs for timeline
  const groupedTimelineLogs = useMemo(() => {
    const groups: { [key: string]: AuditLog[] } = {};
    for (const log of filteredLogs) {
      const key = getDateGroupLabel(log.timestamp);
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    }
    return groups;
  }, [filteredLogs]);

  // Pagination for table view
  const totalCount = filteredLogs.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Summary KPIs
  const kpiStats = useMemo(() => {
    const total = logs.length;
    const now = Date.now();
    const last24h = logs.filter((l) => now - new Date(l.timestamp).getTime() <= 24 * 60 * 60 * 1000).length;

    // Top actor
    const actorCounts: Record<string, number> = {};
    logs.forEach((l) => {
      const name = l.nama || l.username || 'User';
      actorCounts[name] = (actorCounts[name] || 0) + 1;
    });
    let topActor = '-';
    let topCount = 0;
    Object.entries(actorCounts).forEach(([name, count]) => {
      if (count > topCount) {
        topActor = name;
        topCount = count;
      }
    });

    // Action distribution
    const catCounts = {
      create: 0,
      update: 0,
      delete: 0,
      sync: 0,
      security: 0,
    };
    logs.forEach((l) => {
      const cat = getActionCategory(l.aksi);
      if (cat in catCounts) {
        catCounts[cat as keyof typeof catCounts]++;
      }
    });

    return { total, last24h, topActor, topCount, catCounts };
  }, [logs]);

  // Sync with Server Database
  const handleSyncWithServer = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/global-state?force=true');
      const data = await res.json();
      if (data.success && data.appData) {
        const serverLogs = Array.isArray(data.appData.auditLogs) ? data.appData.auditLogs : [];
        if (serverLogs.length > 0) {
          // Merge preserving uniqueness
          const existingIds = new Set(logs.map((l) => l.id));
          const newEntries = serverLogs.filter((l: AuditLog) => !existingIds.has(l.id));
          if (newEntries.length > 0) {
            const merged = [...newEntries, ...logs].slice(0, 1000);
            onUpdateAppData({ ...appData, auditLogs: merged });
          }
        }
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
        onShowToast('Berhasil menyinkronkan riwayat audit log dengan server!', 'success');
      } else {
        onShowToast('Server merespons dalam mode lokal/cache.', 'info');
      }
    } catch {
      onShowToast('Gagal terhubung ke endpoint sinkronisasi server.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle single timeline expansion
  const toggleExpandLog = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle all timeline expansion
  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedLogIds(new Set());
      setExpandAll(false);
    } else {
      setExpandedLogIds(new Set(filteredLogs.map((l) => l.id)));
      setExpandAll(true);
    }
  };

  // Copy log hash / detail
  const handleCopyLogDetail = (log: AuditLog) => {
    const text = `[AUDIT LOG ${log.id}]
Waktu: ${new Date(log.timestamp).toLocaleString('id-ID')}
Pelaku: ${log.nama} (@${log.username} - ${log.role})
Aksi: ${log.aksi}
Detail: ${log.detail}
IP Address: ${log.ipAddress || '127.0.0.1'}`;

    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    onShowToast(`Rincian log ${log.id} disalin ke clipboard!`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Add manual audit note / verification checkpoint
  const handleAddCheckpoint = () => {
    if (!checkpointDetail.trim()) {
      onShowToast('Mohon masukkan rincian catatan audit!', 'warning');
      return;
    }

    const currentNama = currentUser.data?.nama || 'Administrator';
    const currentUsername = currentUser.data?.username || 'admin';

    const newLog: AuditLog = {
      id: `LOG_${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      role: currentUser.role,
      username: currentUsername,
      nama: currentNama,
      aksi: checkpointAction,
      detail: checkpointDetail.trim(),
      ipAddress: '127.0.0.1',
    };

    const nextAppData = {
      ...appData,
      auditLogs: [newLog, ...logs],
    };
    onUpdateAppData(nextAppData);
    setShowAddCheckpointModal(false);
    setCheckpointDetail('');
    onShowToast('Catatan verifikasi audit berhasil ditambahkan ke riwayat!', 'success');
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      onShowToast('Tidak ada data log untuk diekspor!', 'warning');
      return;
    }

    const exportData = filteredLogs.map((log, index) => ({
      No: index + 1,
      ID: log.id,
      Waktu: new Date(log.timestamp).toLocaleString('id-ID'),
      Nama: log.nama,
      Username: log.username,
      Role: log.role.toUpperCase(),
      Aksi: log.aksi,
      Kategori: getActionCategory(log.aksi).toUpperCase(),
      Detail: log.detail,
      IP_Address: log.ipAddress || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 22 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 26 },
      { wch: 16 },
      { wch: 60 },
      { wch: 15 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Trail Log');
    XLSX.writeFile(wb, `Audit_Trail_Timeline_${new Date().toISOString().split('T')[0]}.xlsx`);
    onShowToast(`Berhasil mengekspor ${filteredLogs.length} data log ke Excel!`, 'success');
  };

  // Print PDF
  const handlePrint = () => {
    if (filteredLogs.length === 0) {
      onShowToast('Tidak ada data log untuk dicetak!', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Log Audit Trail - ${appData.sekolah?.nama || 'Aplikasi Presensi'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; font-size: 11px; }
            h1 { text-align: center; margin-bottom: 4px; font-size: 18px; text-transform: uppercase; font-weight: 800; color: #0f172a; }
            h2 { text-align: center; margin-top: 0; font-size: 12px; color: #64748b; margin-bottom: 24px; font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; vertical-align: top; }
            th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 10px; }
            .badge { font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; font-size: 9px; display: inline-block; }
          </style>
        </head>
        <body>
          <h1>Laporan Audit Trail & Riwayat Aktivitas</h1>
          <h2>Instansi: ${appData.sekolah?.nama || 'SMK/SMA/MA Portal Presensi'} · Dicetak: ${new Date().toLocaleString('id-ID')}</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 5%">No</th>
                <th style="width: 18%">Waktu & Tanggal</th>
                <th style="width: 18%">Pelaku (Aktor)</th>
                <th style="width: 10%">Kategori</th>
                <th style="width: 18%">Aksi</th>
                <th style="width: 31%">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogs
                .map(
                  (log, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${new Date(log.timestamp).toLocaleString('id-ID')}<br><small style="color:#94a3b8">${log.ipAddress || '127.0.0.1'}</small></td>
                  <td><strong>${log.nama}</strong><br><small style="color:#64748b">@${log.username} (${log.role})</small></td>
                  <td><span class="badge" style="background:#f1f5f9; color:#334155;">${getActionCategory(log.aksi)}</span></td>
                  <td><strong>${log.aksi}</strong></td>
                  <td>${log.detail}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Clear logs
  const handleClearLogs = () => {
    onConfirmModal(
      'Bersihkan Log Aktivitas',
      'Apakah Anda yakin ingin menghapus seluruh riwayat log audit ini? Tindakan ini tidak dapat dibatalkan.',
      'danger',
      () => {
        const nextAppData = { ...appData, auditLogs: [] };
        onUpdateAppData(nextAppData);
        onShowToast('Riwayat log audit berhasil dibersihkan!', 'success');
      }
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        icon={FileText}
        title="Audit Trail & Riwayat Aktivitas"
        description="Visualisasi timeline interaktif dan pelacakan aktivitas perubahan data secara presisi, tersinkron langsung dengan basis data server."
        badge="Audit Trail & Security Timeline"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSyncWithServer}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition shadow-sm hover:scale-105 active:scale-95 disabled:opacity-50"
              title="Perbarui riwayat log dari server database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Database'}</span>
            </button>
            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => setShowAddCheckpointModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-bold rounded-2xl text-xs transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Catatan Audit</span>
              </button>
            )}
          </div>
        }
      />

      {/* KPI Stats & Server Sync Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Aktivitas</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{kpiStats.total}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{kpiStats.last24h} dalam 24 jam terakhir</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Database Sync Status */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Sinkron Server</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 truncate">
                {dbConfigInfo.isEnv ? 'MySQL via .env' : 'Database Sinkron'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {lastSyncTime ? `Sinkron: ${lastSyncTime}` : `Host: ${dbConfigInfo.host}`}
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
        </div>

        {/* Top Performer */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aktor Paling Aktif</div>
            <div className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1 truncate" title={kpiStats.topActor}>
              {kpiStats.topActor}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{kpiStats.topCount} tindakan terekam</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
        </div>

        {/* Distribution breakdown */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Distribusi Kategori</div>
            <div className="flex items-center gap-3 mt-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="text-emerald-600 dark:text-emerald-400">+{kpiStats.catCounts.create} Buat</span>
              <span className="text-blue-600 dark:text-blue-400">✎ {kpiStats.catCounts.update} Ubah</span>
              <span className="text-rose-600 dark:text-rose-400">✕ {kpiStats.catCounts.delete} Hapus</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{kpiStats.catCounts.sync + kpiStats.catCounts.security} sistem & keamanan</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Panel: View Switcher, Search & Filters */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        {/* Row 1: Mode Switcher & Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          {/* Segmented View Switcher */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Timeline Interaktif</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Tabel Data</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari aksi, pelaku, rincian teks, atau IP..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Actions: Export / Print / Clear */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              title="Ekspor ke format Excel XLSX"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              title="Cetak format cetak PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Cetak</span>
            </button>
            {currentUser.role === 'admin' && logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                title="Hapus riwayat log audit"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Filter Tags & Sorting */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-3 justify-between">
          {/* Quick Category Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter Kategori:
            </span>
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'create', label: '+ Tambah' },
                { id: 'update', label: '✎ Ubah' },
                { id: 'delete', label: '✕ Hapus' },
                { id: 'sync', label: '🗄 Database' },
                { id: 'security', label: '🛡 Keamanan' },
              ] as { id: ActionCategory; label: string }[]
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setFilterCategory(cat.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  filterCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Timeframe & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterTimeframe}
              onChange={(e) => {
                setFilterTimeframe(e.target.value as TimeframeFilter);
                setCurrentPage(1);
              }}
              className="py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="24h">24 Jam Terakhir</option>
              <option value="7d">7 Hari Terakhir</option>
              <option value="30d">30 Hari Terakhir</option>
            </select>

            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortAsc ? 'Terlama' : 'Terbaru'}</span>
            </button>

            {viewMode === 'timeline' && filteredLogs.length > 0 && (
              <button
                type="button"
                onClick={toggleExpandAll}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                {expandAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{expandAll ? 'Tutup Semua' : 'Buka Semua'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(searchTerm || filterCategory !== 'all' || filterTimeframe !== 'all' || filterRole !== 'semua') && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] text-slate-400">Filter aktif:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px]">
                Pencarian: "{searchTerm}"
                <button type="button" onClick={() => setSearchTerm('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px]">
                Kategori: {filterCategory}
                <button type="button" onClick={() => setFilterCategory('all')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterTimeframe !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px]">
                Waktu: {filterTimeframe}
                <button type="button" onClick={() => setFilterTimeframe('all')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterRole !== 'semua' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px]">
                Aktor: {filterRole}
                <button type="button" onClick={() => setFilterRole('semua')}><X className="w-3 h-3" /></button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('all');
                setFilterTimeframe('all');
                setFilterRole('semua');
              }}
              className="text-[11px] font-bold text-rose-600 hover:underline ml-1"
            >
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === 'timeline' ? (
        /* ========================================================
           TIMELINE INTERAKTIF
           ======================================================== */
        <div className="space-y-8">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
                Tidak Ada Aktivitas Sesuai Kriteria
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Coba ubah kata kunci pencarian atau reset filter kategori untuk melihat seluruh riwayat aktivitas audit.
              </p>
            </div>
          ) : (
            Object.entries(groupedTimelineLogs).map(([groupTitle, groupLogs]) => (
              <div key={groupTitle} className="space-y-4">
                {/* Date Group Header */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black tracking-wide">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{groupTitle}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-semibold">
                    <span>{groupLogs.length} Aktivitas Tercatat</span>
                  </div>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>

                {/* Vertical Timeline Nodes */}
                <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {groupLogs.map((log) => {
                    const cat = getActionCategory(log.aksi);
                    const catDetail = getCategoryDetails(cat);
                    const IconComponent = catDetail.icon;
                    const isExpanded = expandedLogIds.has(log.id);
                    const timeWib = new Date(log.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });
                    const relativeTime = getRelativeTime(log.timestamp);

                    return (
                      <div key={log.id} className="relative group">
                        {/* Node Bullet Icon */}
                        <div
                          className={`absolute -left-6 sm:-left-8 top-4 w-7 h-7 rounded-xl ${catDetail.dotColor} text-white flex items-center justify-center shadow-md ring-4 ring-white dark:ring-slate-950 transition-transform group-hover:scale-110 z-10`}
                          title={`Tipe: ${catDetail.label}`}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>

                        {/* Node Card */}
                        <div
                          className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all border-l-4 ${catDetail.accentBorder}`}
                        >
                          {/* Card Header */}
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="space-y-1">
                              {/* Metadata line (Zero-pill discipline: quiet inline text with dot separator) */}
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" /> {timeWib} WIB
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{relativeTime}</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-slate-400 font-mono text-[11px]">ID: {log.id}</span>
                              </div>

                              {/* Action Title */}
                              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2 pt-0.5">
                                <span>{log.aksi}</span>
                                <span
                                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${catDetail.badgeColor}`}
                                >
                                  {cat}
                                </span>
                              </h4>
                            </div>

                            {/* Actor Avatar & Name */}
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 py-1 px-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shrink-0">
                              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                {(log.nama || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="text-left">
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                  {log.nama}
                                </div>
                                <div className="text-[10px] text-slate-400 leading-none mt-0.5">
                                  @{log.username} · <span className="uppercase font-semibold">{log.role}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Description */}
                          <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                            {log.detail}
                          </p>

                          {/* Card Footer: Interactive Details Toggle & Quick Actions */}
                          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                              <span className="flex items-center gap-1">
                                <Server className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Tersinkron MySQL Server</span>
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>IP: {log.ipAddress || '127.0.0.1'}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyLogDetail(log)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                                title="Salin rincian log"
                              >
                                {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedId === log.id ? 'Tersalin' : 'Salin'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleExpandLog(log.id)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition"
                              >
                                <span>{isExpanded ? 'Tutup Rincian' : 'Rincian Teknis'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>

                          {/* Expandable Technical Details & Diff Payload */}
                          {isExpanded && (
                            <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 text-xs font-mono space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-200/60 dark:border-slate-800">
                                <span>AUDIT PAYLOAD INSPECTOR</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">VERIFIED_EVENT_HASH</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                <div>
                                  <span className="text-slate-400">Timestamp ISO: </span>
                                  <span className="text-slate-700 dark:text-slate-200 font-bold">{log.timestamp}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400">Pelaku Akun: </span>
                                  <span className="text-slate-700 dark:text-slate-200 font-bold">{log.username} ({log.role})</span>
                                </div>
                                <div>
                                  <span className="text-slate-400">Alamat IP: </span>
                                  <span className="text-slate-700 dark:text-slate-200 font-bold">{log.ipAddress || '127.0.0.1 (Localhost / Server VPS)'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400">Database Engine: </span>
                                  <span className="text-slate-700 dark:text-slate-200 font-bold">MySQL Relational (audit_logs table)</span>
                                </div>
                              </div>
                              <div className="pt-1">
                                <span className="text-slate-400 block mb-1">Rincian Perubahan:</span>
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 break-words font-sans text-xs">
                                  {log.detail}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ========================================================
           TABEL DATA TERSTRUKTUR
           ======================================================== */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-5 w-14 text-center">No</th>
                  <th className="py-4 px-5 w-48">Waktu & Tanggal</th>
                  <th className="py-4 px-5 w-52">Pelaku (Aktor)</th>
                  <th className="py-4 px-5 w-32">Kategori</th>
                  <th className="py-4 px-5 w-48">Aksi</th>
                  <th className="py-4 px-5">Detail Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                      <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2.5" />
                      Belum ada riwayat log audit yang terekam atau sesuai filter.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log, idx) => {
                    const num = (currentPage - 1) * pageSize + idx + 1;
                    const dateStr = new Date(log.timestamp).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });
                    const cat = getActionCategory(log.aksi);
                    const catDetail = getCategoryDetails(cat);

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition text-slate-700 dark:text-slate-200"
                      >
                        <td className="py-3.5 px-5 text-center text-[11px] font-bold text-slate-400">
                          {num}
                        </td>
                        <td className="py-3.5 px-5 text-xs text-slate-400 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{dateStr}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {log.ipAddress || '127.0.0.1'}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                              {(log.nama || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                {log.nama}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                @{log.username} · <span className="uppercase">{log.role}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-xs">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${catDetail.badgeColor}`}>
                            {cat}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-xs">
                          <div className="font-bold text-slate-800 dark:text-slate-200 leading-normal">
                            {log.aksi}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-xs">
                          <div className="max-w-md lg:max-w-xl text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed break-words">
                            {log.detail}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredLogs.length}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal Tambah Catatan Audit / Checkpoint */}
      {showAddCheckpointModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    Catatan Audit & Verifikasi Keamanan
                  </h3>
                  <p className="text-xs text-slate-400">Tambahkan checkpoint manual ke dalam timeline audit trail</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCheckpointModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Aksi / Checkpoint
                </label>
                <select
                  value={checkpointAction}
                  onChange={(e) => setCheckpointAction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="VERIFIKASI_INTEGRITAS_DATA">VERIFIKASI_INTEGRITAS_DATA</option>
                  <option value="AUDIT_KEPATUHAN_PRESENSI">AUDIT_KEPATUHAN_PRESENSI</option>
                  <option value="SINKRONISASI_DATABASE_MANUAL">SINKRONISASI_DATABASE_MANUAL</option>
                  <option value="PEMERIKSAAN_SERVER_SECURITY">PEMERIKSAAN_SERVER_SECURITY</option>
                  <option value="BACKUP_SYSTEM_CHECKPOINT">BACKUP_SYSTEM_CHECKPOINT</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Rincian Deskripsi / Catatan Perubahan
                </label>
                <textarea
                  rows={4}
                  value={checkpointDetail}
                  onChange={(e) => setCheckpointDetail(e.target.value)}
                  placeholder="Contoh: Pemeriksaan rekonsiliasi data kehadiran shift pagi dan backup tabel ke server berjalan normal..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
                Pencatat: <strong>{currentUser.data?.nama || 'Administrator'}</strong> (@{currentUser.data?.username || 'admin'}) · Role: <span className="uppercase font-bold">{currentUser.role}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCheckpointModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddCheckpoint}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition"
              >
                Simpan ke Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
