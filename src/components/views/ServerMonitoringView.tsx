import React, { useState, useEffect, useRef, useId } from 'react';
import {
  Cpu,
  Server,
  HardDrive,
  Activity,
  Zap,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowDown,
  ArrowUp,
  Sliders,
  Download,
  Trash2,
  Terminal,
  ShieldCheck,
  Radio,
  Globe,
  Layers,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { AppData, UserSession, ViewType } from '../../types';

interface ServerMonitoringViewProps {
  appData: AppData;
  currentUser: UserSession;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigateView?: (view: ViewType) => void;
}

interface CoreInfo {
  core: number;
  model: string;
  speed: number;
  usage: number;
}

interface NetworkInterfaceInfo {
  name: string;
  address: string;
  family: string;
  mac: string;
  internal: boolean;
}

interface MetricsHistoryPoint {
  timestamp: string;
  time: string;
  cpuPercent: number;
  ramPercent: number;
  ramUsedGb: number;
  ramTotalGb: number;
  diskPercent: number;
  diskUsedGb: number;
  diskTotalGb: number;
  networkInKbps: number;
  networkOutKbps: number;
  requestsPerSec: number;
  activeRequests: number;
  avgLatencyMs: number;
}

interface ServerResourcesData {
  success: boolean;
  timestamp: string;
  system: {
    platform: string;
    arch: string;
    release: string;
    hostname: string;
    uptimeSeconds: number;
    processUptimeSeconds: number;
    nodeVersion: string;
    pid: number;
  };
  cpu: {
    percent: number;
    model: string;
    speed: number;
    coresCount: number;
    cores: CoreInfo[];
    loadAvg: number[];
  };
  ram: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    percent: number;
    processHeapMb: number;
    processRssMb: number;
  };
  disk: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    percent: number;
    appDirSizeMb: number;
  };
  network: {
    totalBytesInMb: number;
    totalBytesOutMb: number;
    currentInKbps: number;
    currentOutKbps: number;
    totalRequests: number;
    requestsPerSec: number;
    activeRequests: number;
    avgLatencyMs: number;
    interfaces: NetworkInterfaceInfo[];
  };
  history: MetricsHistoryPoint[];
}

export const ServerMonitoringView: React.FC<ServerMonitoringViewProps> = ({
  appData,
  currentUser,
  onShowToast,
  onNavigateView
}) => {
  const [data, setData] = useState<ServerResourcesData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [intervalSec, setIntervalSec] = useState<number>(3);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cpu' | 'ram' | 'disk' | 'network' | 'system'>('overview');
  const [chartMetric, setChartMetric] = useState<'cpu_ram' | 'network' | 'latency'>('cpu_ram');
  const [pingResult, setPingResult] = useState<{ latency: number; time: string; status: 'ok' | 'error' } | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [isCleaningCache, setIsCleaningCache] = useState<boolean>(false);

  const fetchMetrics = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch('/api/server/resources');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err: any) {
      console.warn('Gagal memuat telemetri server:', err?.message || err);
      // Fallback mock if running standalone in static preview without server
      if (!data) {
        setData(generateFallbackData());
      }
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchMetrics();
    }, intervalSec * 1000);
    return () => clearInterval(timer);
  }, [autoRefresh, intervalSec]);

  // Ping Diagnostic Tool
  const handlePing = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/server/ping', { method: 'POST' });
      const duration = Math.round(performance.now() - start);
      if (res.ok) {
        setPingResult({
          latency: duration,
          time: new Date().toLocaleTimeString(),
          status: 'ok'
        });
        onShowToast(`Ping Server Sukses: ${duration} ms (Koneksi Sangat Cepat)`, 'success');
      } else {
        throw new Error('Gagal merespons');
      }
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      setPingResult({
        latency: duration,
        time: new Date().toLocaleTimeString(),
        status: 'error'
      });
      onShowToast(`Tes Ping Gagal atau Timeout`, 'error');
    } finally {
      setIsPinging(false);
    }
  };

  // Cache Clean Tool
  const handleCleanCache = async () => {
    setIsCleaningCache(true);
    try {
      const res = await fetch('/api/server/cache-clean', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        onShowToast(json.message || 'Cache telemetri server berhasil dibersihkan', 'success');
        fetchMetrics(true);
      }
    } catch (err) {
      onShowToast('Gagal membersihkan cache server', 'error');
    } finally {
      setIsCleaningCache(false);
    }
  };

  // Export Telemetry
  const handleExportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server_telemetry_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Laporan telemetri server berhasil diunduh', 'success');
  };

  // Helper formatting
  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d} hari`);
    if (h > 0) parts.push(`${h} jam`);
    if (m > 0) parts.push(`${m} mnt`);
    if (parts.length === 0) parts.push(`${s} dtk`);
    return parts.join(' ');
  };

  const getStatusColor = (percent: number) => {
    if (percent >= 85) return 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300';
    if (percent >= 65) return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-300';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300';
  };

  const getProgressBarColor = (percent: number) => {
    if (percent >= 85) return 'bg-rose-500';
    if (percent >= 65) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // SVG Chart Helper
  const history = data?.history || [];
  const renderSvgLineChart = () => {
    if (history.length < 2) {
      return (
        <div className="h-56 flex items-center justify-center text-xs text-slate-400">
          Mengumpulkan data telemetri historis...
        </div>
      );
    }

    const width = 800;
    const height = 200;
    const padding = { top: 20, right: 30, bottom: 30, left: 45 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const pointsCount = history.length;
    const getX = (index: number) => padding.left + (index / (pointsCount - 1)) * chartWidth;

    if (chartMetric === 'cpu_ram') {
      const maxY = 100;
      const getY = (val: number) => padding.top + chartHeight - (val / maxY) * chartHeight;

      const cpuPath = history
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.cpuPercent)}`)
        .join(' ');

      const ramPath = history
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.ramPercent)}`)
        .join(' ');

      const cpuArea = `${cpuPath} L ${getX(pointsCount - 1)} ${padding.top + chartHeight} L ${getX(0)} ${padding.top + chartHeight} Z`;

      return (
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 select-none">
            <defs>
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((val) => {
              const y = getY(val);
              return (
                <g key={val}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
                  >
                    {val}%
                  </text>
                </g>
              );
            })}

            {/* Area */}
            <path d={cpuArea} fill="url(#cpuGradient)" />

            {/* Lines */}
            <path
              d={cpuPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={ramPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Current points dot */}
            {pointsCount > 0 && (
              <>
                <circle
                  cx={getX(pointsCount - 1)}
                  cy={getY(history[pointsCount - 1].cpuPercent)}
                  r="4.5"
                  className="fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-slate-900"
                  strokeWidth="2"
                />
                <circle
                  cx={getX(pointsCount - 1)}
                  cy={getY(history[pointsCount - 1].ramPercent)}
                  r="4.5"
                  className="fill-emerald-500 dark:fill-emerald-400 stroke-white dark:stroke-slate-900"
                  strokeWidth="2"
                />
              </>
            )}

            {/* Time labels bottom */}
            {history
              .filter((_, i) => i % Math.max(1, Math.floor(pointsCount / 6)) === 0 || i === pointsCount - 1)
              .map((p, i, arr) => {
                const idx = history.findIndex((h) => h.timestamp === p.timestamp);
                return (
                  <text
                    key={p.timestamp + i}
                    x={getX(idx)}
                    y={height - 8}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
                  >
                    {p.time}
                  </text>
                );
              })}
          </svg>
        </div>
      );
    }

    if (chartMetric === 'network') {
      const maxVal = Math.max(
        100,
        ...history.map((p) => Math.max(p.networkInKbps, p.networkOutKbps))
      );
      const getY = (val: number) => padding.top + chartHeight - (val / maxVal) * chartHeight;

      const inPath = history
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.networkInKbps)}`)
        .join(' ');

      const outPath = history
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.networkOutKbps)}`)
        .join(' ');

      return (
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 select-none">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const val = Math.round(maxVal * ratio);
              const y = getY(val);
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
                  >
                    {val} KB/s
                  </text>
                </g>
              );
            })}

            <path
              d={inPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={outPath}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {pointsCount > 0 && (
              <>
                <circle
                  cx={getX(pointsCount - 1)}
                  cy={getY(history[pointsCount - 1].networkInKbps)}
                  r="4"
                  className="fill-cyan-500 stroke-white dark:stroke-slate-900"
                  strokeWidth="2"
                />
                <circle
                  cx={getX(pointsCount - 1)}
                  cy={getY(history[pointsCount - 1].networkOutKbps)}
                  r="4"
                  className="fill-purple-500 stroke-white dark:stroke-slate-900"
                  strokeWidth="2"
                />
              </>
            )}

            {history
              .filter((_, i) => i % Math.max(1, Math.floor(pointsCount / 6)) === 0 || i === pointsCount - 1)
              .map((p, i) => {
                const idx = history.findIndex((h) => h.timestamp === p.timestamp);
                return (
                  <text
                    key={p.timestamp + i}
                    x={getX(idx)}
                    y={height - 8}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
                  >
                    {p.time}
                  </text>
                );
              })}
          </svg>
        </div>
      );
    }

    // Latency & Requests
    const maxVal = Math.max(10, ...history.map((p) => Math.max(p.avgLatencyMs, p.requestsPerSec)));
    const getY = (val: number) => padding.top + chartHeight - (val / maxVal) * chartHeight;

    const latPath = history
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.avgLatencyMs)}`)
      .join(' ');

    const reqPath = history
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.requestsPerSec)}`)
      .join(' ');

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 select-none">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const val = +(maxVal * ratio).toFixed(1);
            const y = getY(val);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          <path
            d={latPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={reqPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {pointsCount > 0 && (
            <circle
              cx={getX(pointsCount - 1)}
              cy={getY(history[pointsCount - 1].avgLatencyMs)}
              r="4"
              className="fill-amber-500 stroke-white dark:stroke-slate-900"
              strokeWidth="2"
            />
          )}

          {history
            .filter((_, i) => i % Math.max(1, Math.floor(pointsCount / 6)) === 0 || i === pointsCount - 1)
            .map((p, i) => {
              const idx = history.findIndex((h) => h.timestamp === p.timestamp);
              return (
                <text
                  key={p.timestamp + i}
                  x={getX(idx)}
                  y={height - 8}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
                >
                  {p.time}
                </text>
              );
            })}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Monitoring Sumber Daya Server
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Telemetri real-time beban kerja CPU, pemakaian RAM, kapasitas Harddisk, serta lalu lintas Jaringan server.
                </p>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Auto Refresh Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  autoRefresh
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
                title={autoRefresh ? 'Jeda pembaruan otomatis' : 'Aktifkan pembaruan otomatis'}
              >
                <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse' : ''}`} />
                <span>{autoRefresh ? 'Live' : 'Jeda'}</span>
              </button>

              {autoRefresh && (
                <div className="flex items-center gap-1 px-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                  {[2, 5, 10].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setIntervalSec(sec)}
                      className={`px-2 py-1 rounded-lg transition text-[11px] ${
                        intervalSec === sec
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                          : 'hover:bg-slate-200 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Refresh */}
            <button
              type="button"
              onClick={() => fetchMetrics(true)}
              disabled={isRefreshing}
              className="p-2.5 sm:px-3.5 sm:py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              title="Refresh metrik sekarang"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Ping Test */}
            <button
              type="button"
              onClick={handlePing}
              disabled={isPinging}
              className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              title="Cek respon dan latensi server"
            >
              <Activity className={`w-4 h-4 ${isPinging ? 'animate-bounce' : ''}`} />
              <span>{isPinging ? 'Menguji...' : 'Uji Ping'}</span>
              {pingResult && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-200/80 dark:bg-blue-800 text-blue-900 dark:text-blue-100 font-mono">
                  {pingResult.latency}ms
                </span>
              )}
            </button>

            {/* Clean Cache */}
            <button
              type="button"
              onClick={handleCleanCache}
              disabled={isCleaningCache}
              className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              title="Bersihkan cache telemetri dan memori sementara server"
            >
              <Trash2 className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Bersihkan Cache</span>
            </button>

            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportJson}
              className="p-2.5 sm:px-3.5 sm:py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              title="Unduh laporan status telemetri server dalam format JSON"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Ekspor JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 PRIMARY RESOURCE METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. CPU CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-blue-300 dark:hover:border-blue-700 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/50">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Beban CPU</h3>
                <p className="text-[11px] text-slate-400">{data?.cpu.coresCount || 4} Core Virtual</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${getStatusColor(
                data?.cpu.percent ?? 0
              )}`}
            >
              {data?.cpu.percent ?? 0}%
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Penggunaan Prosesor</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                {data?.cpu.percent ?? 0}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${getProgressBarColor(
                  data?.cpu.percent ?? 0
                )}`}
                style={{ width: `${Math.min(100, Math.max(2, data?.cpu.percent ?? 0))}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Load Average (1m)</span>
              <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                {data?.cpu.loadAvg?.[0] ?? '0.35'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Kecepatan Core</span>
              <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                {data?.cpu.speed ? `${data.cpu.speed} MHz` : '2.4 GHz'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. RAM CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Memori RAM</h3>
                <p className="text-[11px] text-slate-400">Total {data?.ram.totalGb ?? 16} GB</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${getStatusColor(
                data?.ram.percent ?? 0
              )}`}
            >
              {data?.ram.percent ?? 0}%
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Terpakai / Total</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                {data?.ram.usedGb ?? 0} GB / {data?.ram.totalGb ?? 0} GB
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${getProgressBarColor(
                  data?.ram.percent ?? 0
                )}`}
                style={{ width: `${Math.min(100, Math.max(2, data?.ram.percent ?? 0))}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">RAM Bebas</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {data?.ram.freeGb ?? 0} GB
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Node.js Heap</span>
              <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                {data?.ram.processHeapMb ?? 0} MB
              </span>
            </div>
          </div>
        </div>

        {/* 3. HARDDISK CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-amber-300 dark:hover:border-amber-700 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/50">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Penyimpanan Disk</h3>
                <p className="text-[11px] text-slate-400">Storage Root File</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${getStatusColor(
                data?.disk.percent ?? 0
              )}`}
            >
              {data?.disk.percent ?? 0}%
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Terpakai / Kapasitas</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                {data?.disk.usedGb ?? 0} GB / {data?.disk.totalGb ?? 0} GB
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${getProgressBarColor(
                  data?.disk.percent ?? 0
                )}`}
                style={{ width: `${Math.min(100, Math.max(2, data?.disk.percent ?? 0))}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Sisa Ruang Kosong</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {data?.disk.freeGb ?? 0} GB
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Ukuran Data App</span>
              <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                {data?.disk.appDirSizeMb ?? 12.5} MB
              </span>
            </div>
          </div>
        </div>

        {/* 4. NETWORK TRAFFIC CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-cyan-300 dark:hover:border-cyan-700 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-100 dark:border-cyan-900/50">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Traffic Jaringan</h3>
                <p className="text-[11px] text-slate-400">{data?.network.requestsPerSec ?? 0} req/detik</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold border bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:border-cyan-800 dark:text-cyan-300 font-mono">
              {data?.network.avgLatencyMs ?? 1.2} ms
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <ArrowDown className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[10px] text-slate-400 block truncate">Inbound (Down)</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                  {data?.network.currentInKbps ?? 0} KB/s
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUp className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[10px] text-slate-400 block truncate">Outbound (Up)</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                  {data?.network.currentOutKbps ?? 0} KB/s
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Total Permintaan</span>
              <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                {(data?.network.totalRequests ?? 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Koneksi Aktif</span>
              <span className="font-bold font-mono text-cyan-600 dark:text-cyan-400">
                {data?.network.activeRequests ?? 0} request
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* REAL-TIME CHARTS SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span>Grafik Riwayat Telemetri Real-Time</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tren 30 sampel interval terakhir dengan pembaruan otomatis langsung dari sistem server.
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setChartMetric('cpu_ram')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                chartMetric === 'cpu_ram'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>CPU &amp; RAM (%)</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('network')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                chartMetric === 'network'
                  ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Traffic Jaringan (KB/s)</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('latency')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                chartMetric === 'latency'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Latensi &amp; RPS</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-1">
          {chartMetric === 'cpu_ram' && (
            <>
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span>Beban CPU (%) : {data?.cpu.percent ?? 0}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span>Memori RAM (%) : {data?.ram.percent ?? 0}%</span>
              </div>
            </>
          )}
          {chartMetric === 'network' && (
            <>
              <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                <span>Download / Inbound : {data?.network.currentInKbps ?? 0} KB/s</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                <span>Upload / Outbound : {data?.network.currentOutKbps ?? 0} KB/s</span>
              </div>
            </>
          )}
          {chartMetric === 'latency' && (
            <>
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span>Latensi Respons (ms) : {data?.network.avgLatencyMs ?? 1.2} ms</span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <span className="w-3 h-1 border-t-2 border-dashed border-blue-500"></span>
                <span>Permintaan / detik : {data?.network.requestsPerSec ?? 0} rps</span>
              </div>
            </>
          )}
        </div>

        {/* Chart View */}
        <div className="bg-slate-50/70 dark:bg-slate-950/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
          {renderSvgLineChart()}
        </div>
      </div>

      {/* DETAIL TABS: CPU CORES, MEMORY BREAKDOWN, DISK & NETWORK INTERFACES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Detail 1: Core CPU Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>Detail Beban Setiap Core Prosesor</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {data?.cpu.model || 'Multi-Core Processor'}
            </span>
          </div>

          <div className="space-y-3">
            {(data?.cpu.cores || [
              { core: 1, model: 'Core 1', speed: 2400, usage: 14 },
              { core: 2, model: 'Core 2', speed: 2400, usage: 22 },
              { core: 3, model: 'Core 3', speed: 2400, usage: 18 },
              { core: 4, model: 'Core 4', speed: 2400, usage: 9 }
            ]).map((c) => (
              <div key={c.core} className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    CPU Core #{c.core}
                  </span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {c.usage}% ({c.speed} MHz)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(c.usage)}`}
                    style={{ width: `${Math.max(2, c.usage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              Algoritma penyeimbang beban mendistribusikan komputasi presensi QR dan transaksi database secara merata di seluruh core.
            </span>
          </div>
        </div>

        {/* Detail 2: Network Interfaces & Adapter Info */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-500" />
              <span>Antarmuka Jaringan Server (NIC)</span>
            </h3>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              IPv4 Aktif
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-2 font-bold">Interface</th>
                  <th className="pb-2 font-bold">Alamat IP</th>
                  <th className="pb-2 font-bold">MAC Address</th>
                  <th className="pb-2 font-bold text-right">Tipe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {(data?.network.interfaces && data.network.interfaces.length > 0
                  ? data.network.interfaces
                  : [
                      { name: 'eth0', address: '172.17.0.2', family: 'IPv4', mac: '02:42:ac:11:00:02', internal: false },
                      { name: 'lo', address: '127.0.0.1', family: 'IPv4', mac: '00:00:00:00:00:00', internal: true }
                    ]
                ).map((iface, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200 font-sans">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                        {iface.name}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">
                      {iface.address}
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 text-[11px]">
                      {iface.mac || '-'}
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          iface.internal
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            : 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300'
                        }`}
                      >
                        {iface.internal ? 'Internal' : 'External'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Total Data Masuk</span>
              <span className="font-bold text-sm font-mono text-cyan-600 dark:text-cyan-400">
                {data?.network.totalBytesInMb ?? 0} MB
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Total Data Keluar</span>
              <span className="font-bold text-sm font-mono text-purple-600 dark:text-purple-400">
                {data?.network.totalBytesOutMb ?? 0} MB
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SYSTEM SPECIFICATIONS & ENVIRONMENT */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Informasi Spesifikasi Mesin &amp; Lingkungan Eksekusi Server</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Detail runtime host operasi dan status proses backend.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            PID: {data?.system.pid || 1}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block">Sistem Operasi</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
              {data?.system.platform || 'Linux'} ({data?.system.arch || 'x64'})
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block">Kernel / Release</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono truncate block">
              {data?.system.release || '6.6.x-cloud'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block">Node.js Runtime</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {data?.system.nodeVersion || 'v20.x'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block">Server Hostname</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
              {data?.system.hostname || 'ais-server'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block">Uptime Mesin</span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
              {formatUptime(data?.system.uptimeSeconds || 3600)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block">Uptime Aplikasi</span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 font-mono">
              {formatUptime(data?.system.processUptimeSeconds || 1200)}
            </span>
          </div>
        </div>

        {/* Quick Shortcut to Database Traffic */}
        {onNavigateView && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-800/40 dark:to-indigo-950/20 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Ingin memantau query dan lalu lintas MySQL secara spesifik?
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Lihat QPS, durasi eksekusi query, tabel terbanyak diakses, dan latensi koneksi database.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateView('database_traffic')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
            >
              <span>Buka Trafik Database</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Fallback data generator in case preview is detached
function generateFallbackData(): ServerResourcesData {
  const history: MetricsHistoryPoint[] = [];
  const now = Date.now();
  for (let i = 25; i >= 0; i--) {
    const t = new Date(now - i * 3000);
    history.push({
      timestamp: t.toISOString(),
      time: t.toLocaleTimeString('id-ID', { hour12: false }),
      cpuPercent: Math.round(15 + Math.sin(i) * 8),
      ramPercent: 28,
      ramUsedGb: 4.48,
      ramTotalGb: 16,
      diskPercent: 14,
      diskUsedGb: 75.6,
      diskTotalGb: 540,
      networkInKbps: Math.round(45 + Math.random() * 30),
      networkOutKbps: Math.round(120 + Math.random() * 60),
      requestsPerSec: 3.2,
      activeRequests: 1,
      avgLatencyMs: 1.4
    });
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
    system: {
      platform: 'linux',
      arch: 'x64',
      release: '6.6.137-cloud',
      hostname: 'cloud-run-srv',
      uptimeSeconds: 86400 * 3 + 14200,
      processUptimeSeconds: 18400,
      nodeVersion: 'v20.18.0',
      pid: 1
    },
    cpu: {
      percent: 18,
      model: 'Intel(R) Xeon(R) CPU @ 2.80GHz',
      speed: 2800,
      coresCount: 4,
      cores: [
        { core: 1, model: 'Core 1', speed: 2800, usage: 19 },
        { core: 2, model: 'Core 2', speed: 2800, usage: 14 },
        { core: 3, model: 'Core 3', speed: 2800, usage: 24 },
        { core: 4, model: 'Core 4', speed: 2800, usage: 15 }
      ],
      loadAvg: [0.38, 0.42, 0.45]
    },
    ram: {
      totalGb: 16,
      usedGb: 4.52,
      freeGb: 11.48,
      percent: 28,
      processHeapMb: 94.2,
      processRssMb: 178.6
    },
    disk: {
      totalGb: 540,
      usedGb: 75.6,
      freeGb: 464.4,
      percent: 14,
      appDirSizeMb: 14.8
    },
    network: {
      totalBytesInMb: 18.4,
      totalBytesOutMb: 42.6,
      currentInKbps: 48.2,
      currentOutKbps: 135.8,
      totalRequests: 1840,
      requestsPerSec: 3.2,
      activeRequests: 1,
      avgLatencyMs: 1.4,
      interfaces: [
        { name: 'eth0', address: '172.17.0.2', family: 'IPv4', mac: '02:42:ac:11:00:02', internal: false },
        { name: 'lo', address: '127.0.0.1', family: 'IPv4', mac: '00:00:00:00:00:00', internal: true }
      ]
    },
    history
  };
}
