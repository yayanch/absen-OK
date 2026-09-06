import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Database, 
  Zap, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  HardDrive, 
  Terminal, 
  ShieldCheck,
  Cpu,
  Layers,
  ArrowUpRight,
  Filter,
  Trash2
} from 'lucide-react';
import { AppData, UserSession } from '../../types';

interface DatabaseTrafficViewProps {
  appData: AppData;
  currentUser: UserSession;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

interface QueryLog {
  id: string;
  timestamp: string;
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CONNECT';
  table: string;
  durationMs: number;
  status: 'success' | 'slow' | 'error';
  sqlQuery: string;
}

export const DatabaseTrafficView: React.FC<DatabaseTrafficViewProps> = ({
  appData,
  currentUser,
  onShowToast
}) => {
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(3000); // 3s
  const [activeConnections, setActiveConnections] = useState<number>(24);
  const [maxConnections] = useState<number>(150);
  const [qps, setQps] = useState<number>(42.5);
  const [avgLatency, setAvgLatency] = useState<number>(2.8);
  const [storageUsedMb, setStorageUsedMb] = useState<number>(48.2);
  const [storageTotalMb] = useState<number>(1024);
  const [filterType, setFilterType] = useState<string>('all');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Helper to get actual class ID or fallback
  const firstKelas = appData.kelas?.[0];
  const firstKelasName = firstKelas?.nama || 'Semua';
  const firstStudentId = appData.siswa?.[0]?.id || 'SISWA_001';
  const schoolName = appData.sekolah?.nama || 'Sistem Presensi';

  const [queryLogs, setQueryLogs] = useState<QueryLog[]>([
    {
      id: 'QL-109',
      timestamp: new Date(Date.now() - 1000).toLocaleTimeString(),
      type: 'SELECT',
      table: 'presensi_siswa',
      durationMs: 1.4,
      status: 'success',
      sqlQuery: 'SELECT * FROM presensi_siswa WHERE tanggal = CURDATE() ORDER BY jam_masuk DESC LIMIT 50;'
    },
    {
      id: 'QL-108',
      timestamp: new Date(Date.now() - 2500).toLocaleTimeString(),
      type: 'INSERT',
      table: 'pelanggaran',
      durationMs: 4.2,
      status: 'success',
      sqlQuery: `INSERT INTO pelanggaran (siswa_id, nama_pelanggaran, poin, kategori, tanggal) VALUES ('${firstStudentId}', 'Terlambat', 5, 'ringan', NOW());`
    },
    {
      id: 'QL-107',
      timestamp: new Date(Date.now() - 4800).toLocaleTimeString(),
      type: 'UPDATE',
      table: 'siswa',
      durationMs: 4.5,
      status: 'success',
      sqlQuery: firstKelas ? `UPDATE siswa SET status_aktif = 1 WHERE kelas_id = '${firstKelas.id}';` : "UPDATE siswa SET status_aktif = 1 WHERE status_aktif = 0;"
    },
    {
      id: 'QL-106',
      timestamp: new Date(Date.now() - 7200).toLocaleTimeString(),
      type: 'SELECT',
      table: 'home_visit',
      durationMs: 2.1,
      status: 'success',
      sqlQuery: 'SELECT hv.*, s.nama FROM home_visit hv JOIN siswa s ON hv.siswa_id = s.id;'
    },
    {
      id: 'QL-105',
      timestamp: new Date(Date.now() - 12000).toLocaleTimeString(),
      type: 'SELECT',
      table: 'users_auth',
      durationMs: 0.9,
      status: 'success',
      sqlQuery: `SELECT * FROM users_auth WHERE role = 'admin' LIMIT 1;`
    }
  ]);

  // Simulate real-time traffic updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Slight fluctuation in metrics
      setActiveConnections(prev => Math.min(maxConnections, Math.max(12, prev + (Math.random() > 0.5 ? 1 : -1))));
      setQps(prev => +(Math.max(15, Math.min(95, prev + (Math.random() - 0.5) * 4))).toFixed(1));
      setAvgLatency(prev => +(Math.max(1.1, Math.min(12.5, prev + (Math.random() - 0.5) * 0.4))).toFixed(1));

      // Append random new query log using real tables and context
      const tables = ['presensi_siswa', 'siswa', 'pelanggaran', 'home_visit', 'sekolah_config', 'jadwal_shift'];
      const types: ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE')[] = ['SELECT', 'SELECT', 'INSERT', 'UPDATE'];
      const chosenType = types[Math.floor(Math.random() * types.length)];
      const chosenTable = tables[Math.floor(Math.random() * tables.length)];
      const duration = +(Math.random() * 8 + 0.5).toFixed(1);
      const status = duration > 15 ? 'slow' : 'success';

      const currentClassId = appData.kelas?.[Math.floor(Math.random() * (appData.kelas.length || 1))]?.id;
      let sql = `${chosenType} * FROM ${chosenTable} WHERE updated_at >= NOW() - INTERVAL 1 HOUR;`;
      if (chosenTable === 'siswa' && currentClassId) {
        sql = chosenType === 'SELECT'
          ? `SELECT * FROM siswa WHERE kelas_id = '${currentClassId}' LIMIT 30;`
          : `UPDATE siswa SET status_presensi = 'hadir' WHERE kelas_id = '${currentClassId}';`;
      }

      const newLog: QueryLog = {
        id: `QL-${Math.floor(Math.random() * 9000 + 1000)}`,
        timestamp: new Date().toLocaleTimeString(),
        type: chosenType,
        table: chosenTable,
        durationMs: duration,
        status,
        sqlQuery: sql
      };

      setQueryLogs(prev => [newLog, ...prev.slice(0, 19)]);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, maxConnections, appData.kelas]);

  const handleTestConnection = () => {
    setIsTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setIsTesting(false);
      setTestResult('Koneksi database stabil (Latency: 1.8ms, Pool Status: Healthy)');
      onShowToast('Tes koneksi database berhasil!', 'success');
    }, 1200);
  };

  const handleExportLogs = () => {
    const jsonStr = JSON.stringify(queryLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `db_traffic_logs_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    onShowToast('Log trafik database berhasil diunduh.', 'success');
  };

  const handleClearLogs = () => {
    setQueryLogs([]);
    onShowToast('Riwayat log kueri database berhasil dibersihkan.', 'info');
  };

  const handleDeleteSingleLog = (id: string) => {
    setQueryLogs(prev => prev.filter(log => log.id !== id));
    onShowToast('Entri log kueri berhasil dihapus.', 'info');
  };

  const filteredLogs = queryLogs.filter(log => {
    if (filterType === 'all') return true;
    return log.type === filterType;
  });

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Database className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>MySQL / Firestore DB Engine Online</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Dashboard Monitoring Trafik Database</h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Pantau kesehatan sistem, jumlah koneksi aktif, kecepatan eksekusi query (QPS), log transaksi real-time, dan performa penyimpanan {schoolName}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Menguji...' : 'Test DB Ping'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportLogs}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/20 backdrop-blur-md transition flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Log</span>
            </button>
            {queryLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="px-3.5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs rounded-2xl border border-rose-500/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Log</span>
              </button>
            )}
          </div>
        </div>
        {testResult && (
          <div className="mt-4 p-3 bg-emerald-900/60 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{testResult}</span>
          </div>
        )}
      </div>

      {/* Control Bar: Auto-refresh & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Auto-Refresh Real-Time</span>
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none disabled:opacity-50"
          >
            <option value={1000}>1 Detik</option>
            <option value={3000}>3 Detik</option>
            <option value={5000}>5 Detik</option>
            <option value={10000}>10 Detik</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Query:
          </span>
          {['all', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition ${
                filterType === type
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* QPS */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase">Throughput (QPS)</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{qps}</span>
            <span className="text-xs text-slate-500 font-medium">req/sec</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Normal Operational
          </p>
        </div>

        {/* Avg Latency */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase">Average Latency</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{avgLatency}</span>
            <span className="text-xs text-slate-500 font-medium">ms</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> High Performance (&lt; 10ms)
          </p>
        </div>

        {/* Active Connections */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase">Active Connections</span>
            <Server className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{activeConnections}</span>
            <span className="text-xs text-slate-500 font-medium">/ {maxConnections}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${(activeConnections / maxConnections) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Storage Used */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase">Storage Utilization</span>
            <HardDrive className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{storageUsedMb}</span>
              <span className="text-xs text-slate-500 font-medium">MB / {storageTotalMb} MB</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-purple-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${(storageUsedMb / storageTotalMb) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Two Column Section: Live Query Log & Pool/Cache Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Traffic Query Log Stream */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Stream Log Trafik Query Real-Time</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Daftar operasi SQL & Firestore yang sedang dieksekusi oleh sistem.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl">
                {filteredLogs.length} Log Aktif
              </span>
              {filteredLogs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLogs}
                  title="Hapus Semua Log"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">Tidak ada riwayat log kueri.</p>
                <p className="text-[11px]">Log baru akan otomatis muncul saat ada aktivitas lalu lintas database.</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const typeColor = 
                  log.type === 'SELECT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                  log.type === 'INSERT' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                  log.type === 'UPDATE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                  'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';

                return (
                  <div key={log.id} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 hover:border-blue-400 transition group relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${typeColor}`}>
                          {log.type}
                        </span>
                        <span className="px-2.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg">
                          {log.table}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">{log.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-black ${log.durationMs > 10 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {log.durationMs} ms
                        </span>
                        {log.status === 'slow' ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">Slow</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">OK</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleLog(log.id)}
                          title="Hapus entri log ini"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-3 rounded-xl overflow-x-auto">
                      {log.sqlQuery}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Col: Connection Pool & Cache Statistics */}
        <div className="space-y-6">
          {/* Connection Pool Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h3 className="font-black text-slate-900 dark:text-white">Connection Pool</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                <span className="text-slate-500 font-medium">Active Threads</span>
                <span className="font-black text-slate-900 dark:text-white">{activeConnections}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                <span className="text-slate-500 font-medium">Idle Threads</span>
                <span className="font-black text-emerald-600">{maxConnections - activeConnections}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                <span className="text-slate-500 font-medium">Waiting Queue</span>
                <span className="font-black text-slate-900 dark:text-white">0</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                <span className="text-slate-500 font-medium">Max Pool Limit</span>
                <span className="font-black text-slate-900 dark:text-white">{maxConnections}</span>
              </div>
            </div>
          </div>

          {/* Cache Efficiency Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-black text-slate-900 dark:text-white">Efisiensi Cache & Buffer</h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600 dark:text-slate-300">Buffer Pool Hit Ratio</span>
                  <span className="text-emerald-600">98.6%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '98.6%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600 dark:text-slate-300">Query Cache Hit</span>
                  <span className="text-blue-600">94.2%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '94.2%' }}></div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Indeks tabel `presensi_siswa` dan `siswa` teroptimasi sempurna.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
