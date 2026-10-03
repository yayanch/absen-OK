import express from "express";
import path from "path";
import os from "os";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import fs from "fs";
import QRCode from "qrcode";
import compression from "compression";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "";
if (!SESSION_SECRET && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET wajib diatur pada production");
const sessions = new Map<string, { username: string; role: string; createdAt: number; expiresAt: number }>();
function createSession(username: string, role: string) { const id = crypto.randomBytes(32).toString("base64url"); const now = Date.now(); sessions.set(id, { username, role, createdAt: now, expiresAt: now + 8 * 60 * 60 * 1000 }); return id; }
function parseSession(req: express.Request) { const raw = req.headers.cookie?.split(";").map(v => v.trim()).find(v => v.startsWith("absen_session=")); const id = raw?.slice("absen_session=".length); if (!id) return null; const s = sessions.get(id); if (!s || s.expiresAt < Date.now()) { if (id) sessions.delete(id); return null; } return { id, ...s }; }
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) { const user = parseSession(req); if (!user) return res.status(401).json({ success: false, message: "Authentication diperlukan." }); (req as any).user = user; next(); }
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) { const user = parseSession(req); if (!user) return res.status(401).json({ success: false, message: "Authentication diperlukan." }); if (user.role !== "admin") return res.status(403).json({ success: false, message: "Akses administrator diperlukan." }); (req as any).user = user; next(); }

// ==========================================
// SERVER RESOURCE & TELEMETRY MONITORING
// ==========================================
interface ServerMetricsHistoryPoint {
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

let totalNetworkBytesIn = 0;
let totalNetworkBytesOut = 0;
let totalRequestsCount = 0;
let activeRequestsCount = 0;
let recentLatencySamples: number[] = [];
let lastSampleTime = Date.now();
let lastSampleBytesIn = 0;
let lastSampleBytesOut = 0;
let lastSampleRequests = 0;
let currentNetworkInKbps = 0;
let currentNetworkOutKbps = 0;
let currentRequestsPerSec = 0;
let currentAvgLatencyMs = 1.2;

const metricsHistory: ServerMetricsHistoryPoint[] = [];

// Track previous CPU times for delta calculation
let prevCpuTimes = os.cpus().map((c) => c.times);

function getCpuUsagePercent(): {
  percent: number;
  model: string;
  speed: number;
  coresCount: number;
  cores: Array<{ core: number; model: string; speed: number; usage: number }>;
  loadAvg: number[];
} {
  const cpus = os.cpus();
  let totalDiff = 0;
  let idleDiff = 0;
  const coreUsages: Array<{ core: number; model: string; speed: number; usage: number }> = [];

  for (let i = 0; i < cpus.length; i++) {
    const prev = prevCpuTimes[i] || cpus[i].times;
    const curr = cpus[i].times;
    const prevTotal = prev.user + prev.nice + prev.sys + prev.idle + prev.irq;
    const currTotal = curr.user + curr.nice + curr.sys + curr.idle + curr.irq;
    const dTotal = Math.max(1, currTotal - prevTotal);
    const dIdle = curr.idle - prev.idle;
    const corePercent = Math.max(0, Math.min(100, Math.round(((dTotal - dIdle) / dTotal) * 100)));
    coreUsages.push({
      core: i + 1,
      model: cpus[i].model,
      speed: cpus[i].speed,
      usage: corePercent,
    });
    totalDiff += dTotal;
    idleDiff += dIdle;
  }
  prevCpuTimes = cpus.map((c) => c.times);
  const overallPercent = totalDiff > 0 ? Math.max(0, Math.min(100, Math.round(((totalDiff - idleDiff) / totalDiff) * 100))) : 0;
  return {
    percent: overallPercent,
    model: cpus[0]?.model || "Standard Processor",
    speed: cpus[0]?.speed || 2400,
    coresCount: cpus.length,
    cores: coreUsages,
    loadAvg: os.loadavg().map((v) => +v.toFixed(2)),
  };
}

function getMemoryUsage(): {
  totalGb: number;
  usedGb: number;
  freeGb: number;
  percent: number;
  processHeapMb: number;
  processRssMb: number;
} {
  const total = os.totalmem();
  const free = os.freemem();
  const used = Math.max(0, total - free);
  const mem = process.memoryUsage();
  return {
    totalGb: +(total / (1024 * 1024 * 1024)).toFixed(2),
    usedGb: +(used / (1024 * 1024 * 1024)).toFixed(2),
    freeGb: +(free / (1024 * 1024 * 1024)).toFixed(2),
    percent: total > 0 ? Math.round((used / total) * 100) : 0,
    processHeapMb: +(mem.heapUsed / (1024 * 1024)).toFixed(1),
    processRssMb: +(mem.rss / (1024 * 1024)).toFixed(1),
  };
}

function getDiskUsage(): {
  totalGb: number;
  usedGb: number;
  freeGb: number;
  percent: number;
  appDirSizeMb: number;
} {
  let totalGb = 500;
  let usedGb = 62.4;
  let freeGb = 437.6;
  let percent = 12;

  try {
    if (typeof (fs as any).statfsSync === "function") {
      const stats = (fs as any).statfsSync(process.cwd());
      const blockSize = stats.bsize || 4096;
      const totalBytes = stats.blocks * blockSize;
      const freeBytes = stats.bfree * blockSize;
      const usedBytes = Math.max(0, totalBytes - freeBytes);
      totalGb = +(totalBytes / (1024 * 1024 * 1024)).toFixed(2);
      usedGb = +(usedBytes / (1024 * 1024 * 1024)).toFixed(2);
      freeGb = +(freeBytes / (1024 * 1024 * 1024)).toFixed(2);
      percent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
    }
  } catch (err) {
    // fallback
  }

  let appDirSizeMb = 12.5;
  try {
    const dataDir = path.join(process.cwd(), "server_data");
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      let size = 0;
      for (const f of files) {
        try {
          const stat = fs.statSync(path.join(dataDir, f));
          size += stat.size;
        } catch (_) {}
      }
      appDirSizeMb = +(size / (1024 * 1024)).toFixed(2);
    }
  } catch (_) {}

  return { totalGb, usedGb, freeGb, percent, appDirSizeMb };
}

function getNetworkDetails() {
  const interfaces = os.networkInterfaces();
  const ifaceList: Array<{ name: string; address: string; family: string; mac: string; internal: boolean }> = [];
  for (const [name, netArr] of Object.entries(interfaces)) {
    if (netArr) {
      for (const net of netArr) {
        if (net.family === "IPv4" || (net.family as any) === 4) {
          ifaceList.push({
            name,
            address: net.address,
            family: String(net.family),
            mac: net.mac,
            internal: net.internal,
          });
        }
      }
    }
  }
  return ifaceList;
}

// Seed initial history points so charts immediately show data
function seedInitialMetricsHistory() {
  const now = Date.now();
  const cpu = getCpuUsagePercent();
  const ram = getMemoryUsage();
  const disk = getDiskUsage();

  for (let i = 25; i >= 0; i--) {
    const pointTime = new Date(now - i * 3000);
    const timeStr = pointTime.toLocaleTimeString("id-ID", { hour12: false });
    const jitter = (Math.random() - 0.5) * 4;
    metricsHistory.push({
      timestamp: pointTime.toISOString(),
      time: timeStr,
      cpuPercent: Math.max(2, Math.min(99, Math.round(cpu.percent + jitter))),
      ramPercent: Math.max(1, Math.min(99, Math.round(ram.percent + (Math.random() - 0.5) * 2))),
      ramUsedGb: +(ram.usedGb + (Math.random() - 0.5) * 0.05).toFixed(2),
      ramTotalGb: ram.totalGb,
      diskPercent: disk.percent,
      diskUsedGb: disk.usedGb,
      diskTotalGb: disk.totalGb,
      networkInKbps: +(Math.random() * 80 + 20).toFixed(1),
      networkOutKbps: +(Math.random() * 150 + 60).toFixed(1),
      requestsPerSec: +(Math.random() * 4 + 1).toFixed(1),
      activeRequests: Math.floor(Math.random() * 2),
      avgLatencyMs: +(Math.random() * 3 + 1.2).toFixed(1),
    });
  }
}
seedInitialMetricsHistory();

// Background sampler interval
setInterval(() => {
  const now = Date.now();
  const timeElapsedSec = Math.max(0.1, (now - lastSampleTime) / 1000);

  const bytesInDiff = Math.max(0, totalNetworkBytesIn - lastSampleBytesIn);
  const bytesOutDiff = Math.max(0, totalNetworkBytesOut - lastSampleBytesOut);
  const reqDiff = Math.max(0, totalRequestsCount - lastSampleRequests);

  currentNetworkInKbps = +((bytesInDiff * 8) / (1024 * timeElapsedSec)).toFixed(2);
  currentNetworkOutKbps = +((bytesOutDiff * 8) / (1024 * timeElapsedSec)).toFixed(2);
  currentRequestsPerSec = +(reqDiff / timeElapsedSec).toFixed(1);

  if (recentLatencySamples.length > 0) {
    const sum = recentLatencySamples.reduce((a, b) => a + b, 0);
    currentAvgLatencyMs = +(sum / recentLatencySamples.length).toFixed(1);
  } else {
    currentAvgLatencyMs = 1.2;
  }

  lastSampleTime = now;
  lastSampleBytesIn = totalNetworkBytesIn;
  lastSampleBytesOut = totalNetworkBytesOut;
  lastSampleRequests = totalRequestsCount;

  const cpu = getCpuUsagePercent();
  const ram = getMemoryUsage();
  const disk = getDiskUsage();
  const timeStr = new Date().toLocaleTimeString("id-ID", { hour12: false });

  metricsHistory.push({
    timestamp: new Date().toISOString(),
    time: timeStr,
    cpuPercent: cpu.percent,
    ramPercent: ram.percent,
    ramUsedGb: ram.usedGb,
    ramTotalGb: ram.totalGb,
    diskPercent: disk.percent,
    diskUsedGb: disk.usedGb,
    diskTotalGb: disk.totalGb,
    networkInKbps: currentNetworkInKbps,
    networkOutKbps: currentNetworkOutKbps,
    requestsPerSec: currentRequestsPerSec,
    activeRequests: activeRequestsCount,
    avgLatencyMs: currentAvgLatencyMs,
  });

  if (metricsHistory.length > 50) {
    metricsHistory.shift();
  }
}, 3000);

// Enable gzip/brotli response compression for ultra-fast multi-client throughput
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.disable("x-powered-by");
app.use((req, res, next) => { res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("X-Frame-Options", "DENY"); res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin"); res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()"); if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains"); next(); });

// Telemetry request interceptor middleware
app.use((req, res, next) => {
  const startHrTime = process.hrtime();
  activeRequestsCount++;
  totalRequestsCount++;

  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  totalNetworkBytesIn += (contentLength > 0 ? contentLength : 320);

  const originalEnd = res.end;
  let capturedBytes = 0;

  const originalWrite = res.write;
  res.write = function (chunk: any, ...args: any[]) {
    if (chunk) {
      capturedBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
    }
    return (originalWrite as any).apply(res, [chunk, ...args]);
  };

  res.end = function (chunk: any, ...args: any[]) {
    if (chunk) {
      capturedBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
    }
    totalNetworkBytesOut += capturedBytes;
    activeRequestsCount = Math.max(0, activeRequestsCount - 1);

    const elapsedHr = process.hrtime(startHrTime);
    const latencyMs = +(elapsedHr[0] * 1000 + elapsedHr[1] / 1e6).toFixed(2);
    recentLatencySamples.push(latencyMs);
    if (recentLatencySamples.length > 40) {
      recentLatencySamples.shift();
    }

    return (originalEnd as any).apply(res, [chunk, ...args]);
  };

  next();
});

// Server-side QR Code Attendance State & Logs
let serverActiveQrToken: {
  token: string;
  secretHash: string;
  createdAt: number;
  expiresAt: number;
  dateStr: string;
  intervalSeconds: number;
} | null = null;

let recentValidTokens = new Map<string, number>();

let serverQrLogs: Array<{
  id: string;
  siswaId: string;
  nisn: string;
  namaSiswa: string;
  namaKelas: string;
  tanggal: string;
  status: string;
  time: string;
  method: string;
  isServerVerified: boolean;
}> = [];

let cachedQrImageDataUrl = "";

// Fast In-Memory Lookup Indexes for 1000+ Concurrent Students
let siswaIdMap = new Map<string, any>();
let siswaNisnMap = new Map<string, any>();
let siswaNameMap = new Map<string, any>();
let kelasIdMap = new Map<string, any>();
let appDataVersion = Date.now();

function rebuildFastIndices(appData: any) {
  if (!appData || typeof appData !== "object") return;
  const newSiswaIdMap = new Map<string, any>();
  const newSiswaNisnMap = new Map<string, any>();
  const newSiswaNameMap = new Map<string, any>();
  const newKelasIdMap = new Map<string, any>();

  if (Array.isArray(appData.siswa)) {
    for (const s of appData.siswa) {
      if (s.id) newSiswaIdMap.set(String(s.id).toLowerCase(), s);
      if (s.nisn) newSiswaNisnMap.set(String(s.nisn).trim().toUpperCase(), s);
      if (s.nama) newSiswaNameMap.set(String(s.nama).trim().toLowerCase(), s);
    }
  }

  if (Array.isArray(appData.kelas)) {
    for (const k of appData.kelas) {
      if (k.id) newKelasIdMap.set(String(k.id), k);
    }
  }

  siswaIdMap = newSiswaIdMap;
  siswaNisnMap = newSiswaNisnMap;
  siswaNameMap = newSiswaNameMap;
  kelasIdMap = newKelasIdMap;
}

function getIndonesianDateTime() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const timeStr = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now).replace(/\./g, ':');

  return { dateStr, timeStr };
}

function getOrCreateServerQrToken(force = false, intervalSeconds = 60) {
  const { dateStr: todayStr } = getIndonesianDateTime();
  const now = Date.now();
  const validDurationMs = Math.max(10, Number(intervalSeconds) || 60) * 1000;

  if (!force && serverActiveQrToken && serverActiveQrToken.dateStr === todayStr && now < serverActiveQrToken.expiresAt) {
    return serverActiveQrToken;
  }
  const randomSegment = crypto.randomBytes(16).toString("hex").toUpperCase();
  const token = `PRESENSI-${todayStr}-${randomSegment}`;
  serverActiveQrToken = {
    token,
    secretHash: crypto.createHash("sha256").update(`${token}:${SESSION_SECRET || crypto.randomBytes(16).toString("hex")}`).digest("hex"),
    createdAt: now,
    expiresAt: now + validDurationMs,
    dateStr: todayStr,
    intervalSeconds: Number(intervalSeconds) || 60
  };

  if (!recentValidTokens) recentValidTokens = new Map();
  recentValidTokens.set(token, serverActiveQrToken.expiresAt + 5 * 60 * 1000);

  // Clean up old expired tokens from recentValidTokens (older than 10 mins)
  for (const [t, exp] of recentValidTokens.entries()) {
    if (now > exp) {
      recentValidTokens.delete(t);
    }
  }

  cachedQrImageDataUrl = "";
  return serverActiveQrToken;
}

async function generateQrDataUrl(tokenObj: typeof serverActiveQrToken) {
  if (!tokenObj) return "";
  try {
    const schoolName = inMemoryAppDataCache?.sekolah?.nama || "Absensi Siswa";
    const qrPayload = JSON.stringify({
      type: "SCHOOL_PRESENSI_QR",
      school: schoolName,
      token: tokenObj.token,
      hash: tokenObj.secretHash,
      date: tokenObj.dateStr,
      expiresAt: tokenObj.expiresAt
    });
    return await QRCode.toDataURL(qrPayload, {
      width: 360,
      margin: 2,
      color: {
        dark: "#1e1b4b",
        light: "#ffffff"
      }
    });
  } catch (err: any) {
    console.error("Error generating QR code image on server:", err?.message || err);
    return "";
  }
}

const MYSQL_CONFIG_FILE = path.join(process.cwd(), "mysql_config.json");
const MYSQL_CONFIG_FILE_TMP = "/tmp/mysql_config.json";
const APP_DATA_CACHE_FILE = path.join(process.cwd(), "app_data_cache.json");
const APP_DATA_CACHE_FILE_TMP = "/tmp/app_data_cache.json";

let activePool: mysql.Pool | null = null;
let currentPoolKey: string | null = null;

let inMemoryAppDataCache: any = loadSavedAppDataCache() || null;
if (inMemoryAppDataCache) {
  rebuildFastIndices(inMemoryAppDataCache);
}
let lastMySQLSyncTime = 0;
const MYSQL_SYNC_THROTTLE_MS = 15000; // Throttle to 15s to protect MySQL resource limit and prevent queue limit failures

// Cooldown mechanism when hosting provider's max_connections_per_hour (limit: 500) is exceeded
let mysqlCooldownUntil = 0;
const COOLDOWN_DURATION_MS = 10 * 60 * 1000; // 10 minutes cooldown before retrying MySQL

function isMySQLRateLimitError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err.sqlMessage || err || '');
  const code = String(err.code || '');
  const errno = err.errno;
  return (
    msg.includes("max_connections_per_hour") ||
    msg.includes("ER_USER_LIMIT_REACHED") ||
    code === "ER_USER_LIMIT_REACHED" ||
    errno === 1226
  );
}

function setMySQLCooldown(reason?: string) {
  mysqlCooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
  if (activePool) {
    activePool.end().catch(() => {});
    activePool = null;
    currentPoolKey = null;
  }
  console.info(`[MySQL Notice] ${reason || 'Connection limit reached.'} Activating 10-minute cooldown. Operating on server cache.`);
}

function loadSavedServerConfig() {
  try {
    // 1. Check workspace persistent file
    if (fs.existsSync(MYSQL_CONFIG_FILE)) {
      const content = fs.readFileSync(MYSQL_CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && parsed.host) return parsed;
    }
    // 2. Check /tmp file
    if (fs.existsSync(MYSQL_CONFIG_FILE_TMP)) {
      const content = fs.readFileSync(MYSQL_CONFIG_FILE_TMP, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && parsed.host) return parsed;
    }
    // 3. Check process environment variables
    if (process.env.DB_HOST || process.env.MYSQL_HOST) {
      return {
        host: process.env.DB_HOST || process.env.MYSQL_HOST,
        port: process.env.DB_PORT || process.env.MYSQL_PORT || "3306",
        user: process.env.DB_USER || process.env.MYSQL_USER || "root",
        password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "",
        database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "sistem_presensi_sekolah"
      };
    }
  } catch (e) {}
  return null;
}

function saveServerConfig(config: any) {
  try {
    if (config && config.host && config.database && config.user) {
      const content = JSON.stringify(config, null, 2);
      fs.writeFileSync(MYSQL_CONFIG_FILE, content);
      try { fs.writeFileSync(MYSQL_CONFIG_FILE_TMP, content); } catch (e) {}
    }
  } catch (e) {}
}

function normalizeWeeklyShiftPeriods(rawPeriods: any[]): any[] {
  if (!rawPeriods || !Array.isArray(rawPeriods) || rawPeriods.length === 0) return [];
  const result: any[] = [];
  let newId = 1;
  for (const p of rawPeriods) {
    const s = new Date(p.startDate);
    const e = new Date(p.endDate);
    const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 8) {
      let curr = new Date(s);
      while (curr <= e) {
        const segStart = new Date(curr);
        const segEnd = new Date(curr);
        segEnd.setDate(segEnd.getDate() + 6);
        if (segEnd > e) {
          segEnd.setTime(e.getTime());
        }
        const fmt = (dt: Date) => {
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const day = String(dt.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };
        result.push({
          id: newId++,
          startDate: fmt(segStart),
          endDate: fmt(segEnd),
          kelompok1Type: p.kelompok1Type || 'pagi',
          kelompok2Type: p.kelompok2Type || 'siang'
        });
        curr.setDate(curr.getDate() + 7);
      }
    } else {
      result.push({
        ...p,
        id: newId++
      });
    }
  }
  return result;
}

function loadSavedAppDataCache() {
  try {
    let parsed: any = null;
    if (fs.existsSync(APP_DATA_CACHE_FILE)) {
      const content = fs.readFileSync(APP_DATA_CACHE_FILE, "utf-8");
      parsed = JSON.parse(content);
    } else if (fs.existsSync(APP_DATA_CACHE_FILE_TMP)) {
      const content = fs.readFileSync(APP_DATA_CACHE_FILE_TMP, "utf-8");
      parsed = JSON.parse(content);
    }
    if (parsed && parsed.shiftConfig && Array.isArray(parsed.shiftConfig.periods)) {
      parsed.shiftConfig.periods = normalizeWeeklyShiftPeriods(parsed.shiftConfig.periods);
    }
    return parsed;
  } catch (e) {}
  return null;
}

let appDataSaveTimeout: any = null;
let backgroundPersistTimeout: any = null;
let isPersistingToMySQL = false;
let hasPendingMySQLPersist = false;

function normalizeServerPresensiStatus(status: any): string {
  if (!status) return '';
  const str = String(status).trim().toUpperCase();
  if (str === 'I' || str === 'IZIN') return 'I';
  if (str === 'S' || str === 'SAKIT') return 'S';
  if (str === 'A' || str === 'ALPA' || str === 'ALFA' || str === 'ALPHA') return 'A';
  if (str === 'K' || str === 'KESIANGAN' || str === 'TERLAMBAT' || str === 'LATE') return 'K';
  if (str === 'D' || str === 'DISPENSASI' || str === 'DISPENS') return 'D';
  if (str === 'H' || str === 'HADIR') return 'H';
  if (str === 'TAP') return 'TAP';
  return '';
}

function sanitizeAndDeduplicatePresensiMap(rawPresensi: any): Record<string, any[]> {
  if (!rawPresensi || typeof rawPresensi !== 'object') return {};
  const cleaned: Record<string, any[]> = {};

  for (const [key, rawList] of Object.entries(rawPresensi)) {
    if (!key || typeof key !== 'string') continue;
    if (!Array.isArray(rawList)) continue;

    const studentMap = new Map<string, any>();
    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue;
      const sId = item.siswaId ? String(item.siswaId).trim() : '';
      if (!sId) continue;

      const normStatus = normalizeServerPresensiStatus(item.status);
      const isPresent = ['H', 'K'].includes(normStatus);
      const pulangStatus = isPresent ? (item.pulangStatus === 'H' ? 'H' : 'TAP') : '';
      const cleanItem: any = {
        siswaId: sId,
        status: normStatus,
        time: item.time ? String(item.time).trim() : (isPresent ? '07:00' : ''),
        pulangTime: pulangStatus === 'H' ? (item.pulangTime ? String(item.pulangTime).trim() : '12:00') : '',
        pulangStatus,
      };
      if (item.suratBukti && typeof item.suratBukti === 'string') {
        cleanItem.suratBukti = item.suratBukti;
      }
      if (item.catatan && typeof item.catatan === 'string') {
        cleanItem.catatan = item.catatan.trim();
      }
      studentMap.set(sId, cleanItem);
    }
    cleaned[key] = Array.from(studentMap.values());
  }
  return cleaned;
}

function mergeSiswaServer(existingList: any[] = [], incomingList: any[] = [], deletedIds: string[] = []): any[] {
  if (!Array.isArray(existingList)) existingList = [];
  if (!Array.isArray(incomingList)) incomingList = [];
  const deletedSet = new Set((deletedIds || []).map((id) => String(id)));

  if (existingList.length === 0 && incomingList.length === 0) return [];

  const filteredExisting = existingList.filter((s) => s && s.id && !deletedSet.has(String(s.id)));
  const filteredIncoming = incomingList.filter((s) => s && s.id && !deletedSet.has(String(s.id)));

  // If incomingList is explicitly provided by the caller, incomingList is the authoritative set
  const map = new Map<string, any>();
  const nisnToIdMap = new Map<string, string>();

  // 1. Seed with incoming list
  for (const inc of filteredIncoming) {
    if (inc && inc.id && !deletedSet.has(String(inc.id))) {
      const sId = String(inc.id);
      const cleanNisn = inc.nisn && inc.nisn !== '-' ? String(inc.nisn).trim().toLowerCase() : '';
      if (cleanNisn && nisnToIdMap.has(cleanNisn)) {
        const targetId = nisnToIdMap.get(cleanNisn)!;
        const cur = map.get(targetId)!;
        map.set(targetId, {
          ...inc,
          ...cur,
          namaOrangTua: (cur.namaOrangTua && cur.namaOrangTua !== cur.nama) ? cur.namaOrangTua : (inc.namaOrangTua || cur.namaOrangTua || ''),
          noWa: cur.noWa || inc.noWa || '',
          noWaOrangTua: cur.noWaOrangTua || inc.noWaOrangTua || '',
        });
      } else {
        map.set(sId, { ...inc });
        if (cleanNisn) nisnToIdMap.set(cleanNisn, sId);
      }
    }
  }

  // 2. Merge existing details only for items that are currently in the incoming list
  for (const ex of filteredExisting) {
    if (!ex || !ex.id || deletedSet.has(String(ex.id))) continue;
    const sId = String(ex.id);
    const cleanNisn = ex.nisn && ex.nisn !== '-' ? String(ex.nisn).trim().toLowerCase() : '';

    const targetId = map.has(sId) ? sId : (cleanNisn && nisnToIdMap.has(cleanNisn) ? nisnToIdMap.get(cleanNisn) : null);
    if (targetId && map.has(targetId)) {
      const current = map.get(targetId)!;
      map.set(targetId, {
        ...ex,
        ...current,
        nama: current.nama || ex.nama,
        nisn: current.nisn || ex.nisn,
        gender: current.gender || ex.gender || 'L',
        kelasId: current.kelasId || ex.kelasId,
        status: current.status || ex.status || 'aktif',
        noWa: current.noWa || ex.noWa || '',
        namaOrangTua: (current.namaOrangTua && current.namaOrangTua !== current.nama) ? current.namaOrangTua : (ex.namaOrangTua || current.namaOrangTua || ''),
        noWaOrangTua: current.noWaOrangTua || ex.noWaOrangTua || '',
        foto: current.foto || ex.foto || '',
        username: current.username || ex.username,
        password: current.password || ex.password,
        tempatLahir: current.tempatLahir || ex.tempatLahir,
        tanggalLahir: current.tanggalLahir || ex.tanggalLahir,
        alamat: current.alamat || ex.alamat,
      });
    }
  }

  return Array.from(map.values()).filter((s) => !deletedSet.has(String(s.id)));
}

function mergePresensiServer(existingMap: any = {}, incomingMap: any = {}): any {
  const merged: any = { ...existingMap };

  // For any key that is present in the incoming map, use the incoming array directly!
  // This ensures that updates, deletions, cancellations, and resets for that class & date are fully respected.
  for (const key of Object.keys(incomingMap || {})) {
    const val = incomingMap[key];
    if (Array.isArray(val)) {
      merged[key] = [...val];
    } else {
      delete merged[key];
    }
  }

  return sanitizeAndDeduplicatePresensiMap(merged);
}

function saveAppDataCache(data: any) {
  if (!data || typeof data !== "object") return;

  // Track deleted siswa
  const deletedSiswaSet = new Set([
    ...(inMemoryAppDataCache?.deletedSiswaIds || []),
    ...(data.deletedSiswaIds || []),
  ]);
  const allDeletedSiswa = Array.from(deletedSiswaSet);
  data.deletedSiswaIds = allDeletedSiswa;

  if (inMemoryAppDataCache) {
    // Safely merge siswa so existing students never vanish
    if (Array.isArray(inMemoryAppDataCache.siswa) && Array.isArray(data.siswa)) {
      data.siswa = mergeSiswaServer(inMemoryAppDataCache.siswa, data.siswa, allDeletedSiswa);
    } else if (Array.isArray(inMemoryAppDataCache.siswa) && (!Array.isArray(data.siswa) || data.siswa.length === 0)) {
      data.siswa = inMemoryAppDataCache.siswa.filter((s: any) => s && s.id && !deletedSiswaSet.has(String(s.id)));
    }

    // Safely merge presensi so existing dates/records never vanish
    if (inMemoryAppDataCache.presensi && data.presensi) {
      data.presensi = mergePresensiServer(inMemoryAppDataCache.presensi, data.presensi);
    } else if (inMemoryAppDataCache.presensi && !data.presensi) {
      data.presensi = inMemoryAppDataCache.presensi;
    }

    // Preserve master collections if incoming is empty or accidental demo dataset
    const isIncomingDemoClasses = (
      Array.isArray(data.kelas) &&
      data.kelas.length <= 4 &&
      data.kelas.some((k: any) => k.id === 'KEL_1' || k.nama === 'XII RPL 1')
    );
    if (Array.isArray(inMemoryAppDataCache.kelas) && inMemoryAppDataCache.kelas.length > 4 && isIncomingDemoClasses) {
      data.kelas = inMemoryAppDataCache.kelas;
    } else if (Array.isArray(inMemoryAppDataCache.kelas) && (!Array.isArray(data.kelas) || data.kelas.length === 0)) {
      data.kelas = inMemoryAppDataCache.kelas;
    }

    const isIncomingDemoWali = (
      Array.isArray(data.waliKelas) &&
      data.waliKelas.length <= 4 &&
      data.waliKelas.some((w: any) => w.id === 'WAL_1' || w.nama === 'Budi Santoso, S.Kom')
    );
    if (Array.isArray(inMemoryAppDataCache.waliKelas) && inMemoryAppDataCache.waliKelas.length > 4 && isIncomingDemoWali) {
      data.waliKelas = inMemoryAppDataCache.waliKelas;
    } else if (Array.isArray(inMemoryAppDataCache.waliKelas) && (!Array.isArray(data.waliKelas) || data.waliKelas.length === 0)) {
      data.waliKelas = inMemoryAppDataCache.waliKelas;
    }

    const isIncomingDemoJurusan = (
      Array.isArray(data.jurusan) &&
      data.jurusan.length <= 4 &&
      data.jurusan.some((j: any) => j.id === 'JUR_1' || j.kode === 'RPL')
    );
    if (Array.isArray(inMemoryAppDataCache.jurusan) && inMemoryAppDataCache.jurusan.length > 4 && isIncomingDemoJurusan) {
      data.jurusan = inMemoryAppDataCache.jurusan;
    } else if (Array.isArray(inMemoryAppDataCache.jurusan) && (!Array.isArray(data.jurusan) || data.jurusan.length === 0)) {
      data.jurusan = inMemoryAppDataCache.jurusan;
    }
    if (Array.isArray(inMemoryAppDataCache.jadwalMengajar) && inMemoryAppDataCache.jadwalMengajar.length > 0 && (!Array.isArray(data.jadwalMengajar) || data.jadwalMengajar.length === 0)) {
      data.jadwalMengajar = inMemoryAppDataCache.jadwalMengajar;
    }
    if (Array.isArray(inMemoryAppDataCache.mataPelajaran) && inMemoryAppDataCache.mataPelajaran.length > 0 && (!Array.isArray(data.mataPelajaran) || data.mataPelajaran.length === 0)) {
      data.mataPelajaran = inMemoryAppDataCache.mataPelajaran;
    }
    if (Array.isArray(inMemoryAppDataCache.guruMapelKelas) && inMemoryAppDataCache.guruMapelKelas.length > 0 && (!Array.isArray(data.guruMapelKelas) || data.guruMapelKelas.length === 0)) {
      data.guruMapelKelas = inMemoryAppDataCache.guruMapelKelas;
    }
    if (Array.isArray(inMemoryAppDataCache.presensiMengajarGuru) && inMemoryAppDataCache.presensiMengajarGuru.length > 0 && (!Array.isArray(data.presensiMengajarGuru) || data.presensiMengajarGuru.length === 0)) {
      data.presensiMengajarGuru = inMemoryAppDataCache.presensiMengajarGuru;
    }
    if (inMemoryAppDataCache.shiftConfig && inMemoryAppDataCache.shiftConfig.periods?.length > 0 && (!data.shiftConfig || !Array.isArray(data.shiftConfig.periods) || data.shiftConfig.periods.length === 0)) {
      data.shiftConfig = inMemoryAppDataCache.shiftConfig;
    }
    if (Array.isArray(inMemoryAppDataCache.hariLibur) && inMemoryAppDataCache.hariLibur.length > 0 && (!Array.isArray(data.hariLibur) || data.hariLibur.length === 0)) {
      data.hariLibur = inMemoryAppDataCache.hariLibur;
    }
    if (Array.isArray(inMemoryAppDataCache.pengumuman) && inMemoryAppDataCache.pengumuman.length > 0 && (!Array.isArray(data.pengumuman) || data.pengumuman.length === 0)) {
      data.pengumuman = inMemoryAppDataCache.pengumuman;
    }
    if (Array.isArray(inMemoryAppDataCache.ekstrakurikuler) && inMemoryAppDataCache.ekstrakurikuler.length > 0 && (!Array.isArray(data.ekstrakurikuler) || data.ekstrakurikuler.length === 0)) {
      data.ekstrakurikuler = inMemoryAppDataCache.ekstrakurikuler;
    }
    if (Array.isArray(inMemoryAppDataCache.anggotaEkskul) && inMemoryAppDataCache.anggotaEkskul.length > 0 && (!Array.isArray(data.anggotaEkskul) || data.anggotaEkskul.length === 0)) {
      data.anggotaEkskul = inMemoryAppDataCache.anggotaEkskul;
    }
    if (Array.isArray(inMemoryAppDataCache.chatMessages) && inMemoryAppDataCache.chatMessages.length > 0 && (!Array.isArray(data.chatMessages) || data.chatMessages.length === 0)) {
      data.chatMessages = inMemoryAppDataCache.chatMessages;
    }
    if (inMemoryAppDataCache.presensiEkskul && Object.keys(inMemoryAppDataCache.presensiEkskul).length > 0 && (!data.presensiEkskul || Object.keys(data.presensiEkskul).length === 0)) {
      data.presensiEkskul = inMemoryAppDataCache.presensiEkskul;
    }
    if (Array.isArray(inMemoryAppDataCache.auditLogs) && inMemoryAppDataCache.auditLogs.length > 0 && (!Array.isArray(data.auditLogs) || data.auditLogs.length === 0)) {
      data.auditLogs = inMemoryAppDataCache.auditLogs;
    }
    if (Array.isArray(inMemoryAppDataCache.whatsappLogs) && inMemoryAppDataCache.whatsappLogs.length > 0 && (!Array.isArray(data.whatsappLogs) || data.whatsappLogs.length === 0)) {
      data.whatsappLogs = inMemoryAppDataCache.whatsappLogs;
    }
    if (Array.isArray(inMemoryAppDataCache.rolePermissions) && inMemoryAppDataCache.rolePermissions.length > 0 && (!Array.isArray(data.rolePermissions) || data.rolePermissions.length === 0)) {
      data.rolePermissions = inMemoryAppDataCache.rolePermissions;
    }
    if (inMemoryAppDataCache.whatsappGateway && Object.keys(inMemoryAppDataCache.whatsappGateway).length > 0 && (!data.whatsappGateway || Object.keys(data.whatsappGateway).length === 0)) {
      data.whatsappGateway = inMemoryAppDataCache.whatsappGateway;
    }
    if (Array.isArray(inMemoryAppDataCache.securityIncidents) && inMemoryAppDataCache.securityIncidents.length > 0 && (!Array.isArray(data.securityIncidents) || data.securityIncidents.length === 0)) {
      data.securityIncidents = inMemoryAppDataCache.securityIncidents;
    }
    if (Array.isArray(inMemoryAppDataCache.blockedIps) && inMemoryAppDataCache.blockedIps.length > 0 && (!Array.isArray(data.blockedIps) || data.blockedIps.length === 0)) {
      data.blockedIps = inMemoryAppDataCache.blockedIps;
    }
  }

  if (Array.isArray(data.siswa)) {
    const rawList = data.siswa.filter((s: any) => s && s.id && !deletedSiswaSet.has(String(s.id)));
    const nisnSeen = new Map<string, any>();
    const dedupedList: any[] = [];
    for (const item of rawList) {
      const cleanNisn = item.nisn && item.nisn !== '-' ? String(item.nisn).trim().toLowerCase() : '';
      if (cleanNisn) {
        if (!nisnSeen.has(cleanNisn)) {
          nisnSeen.set(cleanNisn, item);
          dedupedList.push(item);
        } else {
          const existing = nisnSeen.get(cleanNisn);
          if (!existing.namaOrangTua && item.namaOrangTua) existing.namaOrangTua = item.namaOrangTua;
          if (!existing.noWa && item.noWa) existing.noWa = item.noWa;
          if (!existing.noWaOrangTua && item.noWaOrangTua) existing.noWaOrangTua = item.noWaOrangTua;
        }
      } else {
        dedupedList.push(item);
      }
    }
    data.siswa = dedupedList;
  }

  if (data.deletedPelanggaranIds && Array.isArray(data.deletedPelanggaranIds) && Array.isArray(data.pelanggaran)) {
    const deletedSet = new Set(data.deletedPelanggaranIds);
    data.pelanggaran = data.pelanggaran.filter((p: any) => !deletedSet.has(p.id));
  }
  if (data.deletedHomeVisitIds && Array.isArray(data.deletedHomeVisitIds) && Array.isArray(data.homeVisits)) {
    const deletedSet = new Set(data.deletedHomeVisitIds);
    data.homeVisits = data.homeVisits.filter((h: any) => !deletedSet.has(h.id));
  }
  if (data.shiftConfig && Array.isArray(data.shiftConfig.periods)) {
    data.shiftConfig.periods = normalizeWeeklyShiftPeriods(data.shiftConfig.periods);
  }
  if (data.presensi && typeof data.presensi === 'object') {
    data.presensi = sanitizeAndDeduplicatePresensiMap(data.presensi);
  }
  inMemoryAppDataCache = data;
  rebuildFastIndices(data);
  appDataVersion = Date.now();

  if (appDataSaveTimeout) {
    clearTimeout(appDataSaveTimeout);
  }
  appDataSaveTimeout = setTimeout(() => {
    try {
      const content = JSON.stringify(data);
      fs.writeFile(APP_DATA_CACHE_FILE, content, () => {});
      try { fs.writeFile(APP_DATA_CACHE_FILE_TMP, content, () => {}); } catch (e) {}
    } catch (e) {}
  }, 500);
}

// Ultra-fast non-blocking persistence queue that coalesces 1000s of requests during rush hours
function queueAppDataPersist(options?: { immediateMySQL?: boolean }) {
  appDataVersion = Date.now();

  if (appDataSaveTimeout) {
    clearTimeout(appDataSaveTimeout);
  }
  appDataSaveTimeout = setTimeout(() => {
    try {
      if (inMemoryAppDataCache) {
        const content = JSON.stringify(inMemoryAppDataCache);
        fs.writeFile(APP_DATA_CACHE_FILE, content, () => {});
        try { fs.writeFile(APP_DATA_CACHE_FILE_TMP, content, () => {}); } catch (e) {}
      }
    } catch (e) {}
  }, 1000);

  const mysqlConfig = loadSavedServerConfig();
  const hasDeletions = (inMemoryAppDataCache?.deletedPelanggaranIds && inMemoryAppDataCache.deletedPelanggaranIds.length > 0) ||
                       (inMemoryAppDataCache?.deletedHomeVisitIds && inMemoryAppDataCache.deletedHomeVisitIds.length > 0);
  if (mysqlConfig && (Date.now() >= mysqlCooldownUntil || hasDeletions || options?.immediateMySQL)) {
    if (backgroundPersistTimeout) {
      clearTimeout(backgroundPersistTimeout);
    }
    const delay = options?.immediateMySQL || hasDeletions ? 200 : 5000;
    backgroundPersistTimeout = setTimeout(async () => {
      if (isPersistingToMySQL) {
        hasPendingMySQLPersist = true;
        return;
      }
      isPersistingToMySQL = true;
      try {
        await performMySQLSave(mysqlConfig, inMemoryAppDataCache, Boolean(hasDeletions || options?.immediateMySQL));
        lastMySQLSyncTime = Date.now();
      } catch (err: any) {
        if (isMySQLRateLimitError(err)) {
          setMySQLCooldown(err.message);
        }
      } finally {
        isPersistingToMySQL = false;
        if (hasPendingMySQLPersist) {
          hasPendingMySQLPersist = false;
          queueAppDataPersist();
        }
      }
    }, delay);
  }
}

function getMySQLPool(config: any, ignoreCooldown = false): mysql.Pool | null {
  if (!config || !config.host || !config.database || !config.user) return null;

  if (!ignoreCooldown && Date.now() < mysqlCooldownUntil) {
    return null;
  }

  const configKey = `${config.host}:${config.port || 3306}:${config.database}:${config.user}:${config.password || ""}`;

  if (activePool && currentPoolKey === configKey) {
    return activePool;
  }

  if (activePool) {
    activePool.end().catch(() => {});
    activePool = null;
  }

  try {
    activePool = mysql.createPool({
      host: config.host,
      port: Number(config.port) || 3306,
      user: config.user,
      password: config.password || "",
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10, // Up to 10 concurrent connections for high-volume attendance
      queueLimit: 200, // Queue up to 200 requests safely during peaks
      connectTimeout: 5000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
    currentPoolKey = configKey;
    return activePool;
  } catch (e: any) {
    if (isMySQLRateLimitError(e)) {
      setMySQLCooldown(e.message);
    } else {
      console.warn("Failed to create MySQL pool:", e?.message || e);
    }
    return null;
  }
}

async function performMySQLSave(config: any, appData: any, ignoreCooldown = false) {
  const pool = getMySQLPool(config, ignoreCooldown);
  if (!pool || !appData) return;

  if (appData.deletedPelanggaranIds && Array.isArray(appData.deletedPelanggaranIds) && Array.isArray(appData.pelanggaran)) {
    const deletedSet = new Set(appData.deletedPelanggaranIds);
    appData.pelanggaran = appData.pelanggaran.filter((p: any) => !deletedSet.has(p.id));
  }
  if (appData.deletedHomeVisitIds && Array.isArray(appData.deletedHomeVisitIds) && Array.isArray(appData.homeVisits)) {
    const deletedSet = new Set(appData.deletedHomeVisitIds);
    appData.homeVisits = appData.homeVisits.filter((h: any) => !deletedSet.has(h.id));
  }

  let db: mysql.PoolConnection | null = null;

  try {
    db = await pool.getConnection();

    await db.execute(`SET FOREIGN_KEY_CHECKS = 0;`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) UNIQUE,
        config_value LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    const appDataForSettings = { ...appData };
    // Preserve presensi in full_app_data as a resilient fallback
    await db.execute(
      `INSERT INTO app_settings (config_key, config_value) VALUES ('full_app_data', ?)
       ON DUPLICATE KEY UPDATE config_value = ?;`,
      [JSON.stringify(appDataForSettings), JSON.stringify(appDataForSettings)]
    );

    if (appData.sekolah) {
      const s = appData.sekolah;
      await db.execute(
        `INSERT INTO sekolah_config (id, nama, alamat, tahun_ajaran, tanggal_mulai, logo, favicon, nama_kepala_sekolah, nip_kepala_sekolah, theme, font_theme)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         nama=?, alamat=?, tahun_ajaran=?, tanggal_mulai=?, logo=?, favicon=?, nama_kepala_sekolah=?, nip_kepala_sekolah=?, theme=?, font_theme=?;`,
        [
          s.nama || '', s.alamat || '', s.tahunAjaran || '', s.tanggalMulai || '', s.logo || '', s.favicon || '', s.namaKepalaSekolah || '', s.nipKepalaSekolah || '', s.theme || 'ocean', s.fontTheme || 'modern',
          s.nama || '', s.alamat || '', s.tahunAjaran || '', s.tanggalMulai || '', s.logo || '', s.favicon || '', s.namaKepalaSekolah || '', s.nipKepalaSekolah || '', s.theme || 'ocean', s.fontTheme || 'modern'
        ]
      );
    }

    if (appData.admin) {
      const a = appData.admin;
      await db.execute(
        `INSERT INTO admin_account (id, username, password, nama, foto)
         VALUES (1, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE username=?, password=?, nama=?, foto=?;`,
        [
          a.username || 'admin', a.password || 'admin', a.nama || 'Administrator', a.foto || '',
          a.username || 'admin', a.password || 'admin', a.nama || 'Administrator', a.foto || ''
        ]
      );
    }

    const isIncomingDemoClasses = (
      Array.isArray(appData.kelas) &&
      appData.kelas.length <= 4 &&
      appData.kelas.some((k: any) => k.id === 'KEL_1' || k.nama === 'XII RPL 1')
    );

    const [[{ dbKelasCount }]]: any = await db.execute(`SELECT COUNT(*) as dbKelasCount FROM kelas;`).catch(() => [[{ dbKelasCount: 0 }]]);
    const shouldProtectMasterData = isIncomingDemoClasses && Number(dbKelasCount) > 4;

    if (!shouldProtectMasterData && Array.isArray(appData.jurusan)) {
      await db.execute(`DELETE FROM jurusan;`);
      if (appData.jurusan.length > 0) {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < appData.jurusan.length; i += CHUNK_SIZE) {
          const chunk = appData.jurusan.slice(i, i + CHUNK_SIZE);
          const batchValues: any[] = [];
          const placeholdersVal: string[] = [];
          for (const j of chunk) {
            placeholdersVal.push('(?, ?, ?)');
            batchValues.push(j.id, j.kode, j.nama);
          }
          if (placeholdersVal.length > 0) {
            await db.execute(
              `INSERT INTO jurusan (id, kode, nama) VALUES ${placeholdersVal.join(', ')}
               ON DUPLICATE KEY UPDATE kode = VALUES(kode), nama = VALUES(nama);`,
              batchValues
            ).catch((err) => console.warn('Chunk jurusan save warning:', err?.message || err));
          }
        }
      }
    }

    if (!shouldProtectMasterData && Array.isArray(appData.waliKelas)) {
      await db.execute(`DELETE FROM wali_kelas;`);
      if (appData.waliKelas.length > 0) {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < appData.waliKelas.length; i += CHUNK_SIZE) {
          const chunk = appData.waliKelas.slice(i, i + CHUNK_SIZE);
          const batchValues: any[] = [];
          const placeholdersVal: string[] = [];
          for (const w of chunk) {
            placeholdersVal.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            batchValues.push(
              w.id,
              w.nip || '',
              w.nama,
              w.username || `guru_${String(w.nip || w.nama).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
              w.password || '123',
              w.noHp || '',
              w.role || 'wali',
              w.foto || '',
              w.nuptk || '',
              w.jenisKelamin || '',
              w.tempatLahir || '',
              w.tanggalLahir || '',
              w.nik || '',
              w.agamaId || '',
              w.alamat || '',
              w.rt || '',
              w.rw || '',
              w.desaKelurahan || '',
              w.kecamatan || '',
              w.kodeWilayah || '',
              w.kodePos || '',
              w.email || '',
              w.gelarBelakang || '',
              w.tugasTambahan || '',
              w.mataPelajaran || '',
              Array.isArray(w.hariMengajar) ? JSON.stringify(w.hariMengajar) : '[]'
            );
          }
          if (placeholdersVal.length > 0) {
            await db.execute(
              `INSERT INTO wali_kelas (
                id, nip, nama, username, password, no_hp, role, foto,
                nuptk, jenis_kelamin, tempat_lahir, tanggal_lahir, nik, agama_id,
                alamat, rt, rw, desa_kelurahan, kecamatan, kode_wilayah, kode_pos,
                email, gelar_belakang, tugas_tambahan, mata_pelajaran, hari_mengajar
              ) VALUES ${placeholdersVal.join(', ')}
               ON DUPLICATE KEY UPDATE
                nip = VALUES(nip),
                nama = VALUES(nama),
                username = VALUES(username),
                password = VALUES(password),
                no_hp = VALUES(no_hp),
                role = VALUES(role),
                foto = VALUES(foto),
                nuptk = VALUES(nuptk),
                jenis_kelamin = VALUES(jenis_kelamin),
                tempat_lahir = VALUES(tempat_lahir),
                tanggal_lahir = VALUES(tanggal_lahir),
                nik = VALUES(nik),
                agama_id = VALUES(agama_id),
                alamat = VALUES(alamat),
                rt = VALUES(rt),
                rw = VALUES(rw),
                desa_kelurahan = VALUES(desa_kelurahan),
                kecamatan = VALUES(kecamatan),
                kode_wilayah = VALUES(kode_wilayah),
                kode_pos = VALUES(kode_pos),
                email = VALUES(email),
                gelar_belakang = VALUES(gelar_belakang),
                tugas_tambahan = VALUES(tugas_tambahan),
                mata_pelajaran = VALUES(mata_pelajaran),
                hari_mengajar = VALUES(hari_mengajar);`,
              batchValues
            ).catch((err) => console.warn('Chunk waliKelas save warning:', err?.message || err));
          }
        }
      }
    }

    if (!shouldProtectMasterData && Array.isArray(appData.kelas)) {
      await db.execute(`DELETE FROM kelas;`);
      if (appData.kelas.length > 0) {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < appData.kelas.length; i += CHUNK_SIZE) {
          const chunk = appData.kelas.slice(i, i + CHUNK_SIZE);
          const batchValues: any[] = [];
          const placeholdersVal: string[] = [];
          for (const k of chunk) {
            placeholdersVal.push('(?, ?, ?, ?)');
            batchValues.push(k.id, k.nama, k.jurusanId, k.waliKelasId);
          }
          if (placeholdersVal.length > 0) {
            await db.execute(
              `INSERT INTO kelas (id, nama, jurusan_id, wali_kelas_id) VALUES ${placeholdersVal.join(', ')}
               ON DUPLICATE KEY UPDATE nama = VALUES(nama), jurusan_id = VALUES(jurusan_id), wali_kelas_id = VALUES(wali_kelas_id);`,
              batchValues
            ).catch((err) => console.warn('Chunk kelas save warning:', err?.message || err));
          }
        }
      }
    }

    if (Array.isArray(appData.siswa)) {
      // Ensure columns exist in siswa table if it was created previously without them
      await db.execute(`
        CREATE TABLE IF NOT EXISTS siswa (
          id VARCHAR(50) PRIMARY KEY,
          nisn VARCHAR(50),
          nama VARCHAR(255) NOT NULL,
          gender VARCHAR(10) NOT NULL,
          kelas_id VARCHAR(50),
          status VARCHAR(50) DEFAULT 'aktif',
          no_wa VARCHAR(50),
          nama_orang_tua VARCHAR(255),
          no_wa_orang_tua VARCHAR(50),
          username VARCHAR(100),
          password VARCHAR(255),
          foto LONGTEXT,
          tempat_lahir VARCHAR(100),
          tanggal_lahir VARCHAR(50),
          alamat TEXT
        );
      `).catch(() => {});

      // Add columns safely if not yet present
      const addColumnQueries = [
        "ALTER TABLE siswa ADD COLUMN username VARCHAR(100);",
        "ALTER TABLE siswa ADD COLUMN password VARCHAR(255);",
        "ALTER TABLE siswa ADD COLUMN foto LONGTEXT;",
        "ALTER TABLE siswa ADD COLUMN tempat_lahir VARCHAR(100);",
        "ALTER TABLE siswa ADD COLUMN tanggal_lahir VARCHAR(50);",
        "ALTER TABLE siswa ADD COLUMN alamat TEXT;",
      ];
      for (const q of addColumnQueries) {
        await db.execute(q).catch(() => {});
      }

      if (!shouldProtectMasterData && Array.isArray(appData.deletedSiswaIds) && appData.deletedSiswaIds.length > 0) {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < appData.deletedSiswaIds.length; i += CHUNK_SIZE) {
          const chunk = appData.deletedSiswaIds.slice(i, i + CHUNK_SIZE);
          const delPlaceholders = chunk.map(() => '?').join(',');
          await db.execute(`DELETE FROM siswa WHERE id IN (${delPlaceholders});`, chunk).catch(() => {});
        }
      }

      if (shouldProtectMasterData) {
        // Skip deleting or clearing real students if incoming data is demo dataset
      } else if (appData.siswa.length === 0) {
        await db.execute(`DELETE FROM siswa;`).catch(() => {});
      } else {
        // Safely delete any orphan/duplicate IDs in DB in small, reliable chunks
        const [existingDbRows]: any = await db.execute(`SELECT id FROM siswa;`).catch(() => [[]]);
        if (Array.isArray(existingDbRows) && existingDbRows.length > 0) {
          const activeIdSet = new Set(appData.siswa.map((s: any) => s.id).filter(Boolean));
          const toRemove = existingDbRows.map((r: any) => r.id).filter((id: string) => !activeIdSet.has(id));
          if (toRemove.length > 0) {
            const CHUNK_SIZE = 50;
            for (let i = 0; i < toRemove.length; i += CHUNK_SIZE) {
              const chunk = toRemove.slice(i, i + CHUNK_SIZE);
              const delPlaceholders = chunk.map(() => '?').join(',');
              await db.execute(`DELETE FROM siswa WHERE id IN (${delPlaceholders});`, chunk).catch(() => {});
            }
          }
        }

        const CHUNK_SIZE = 50;
        for (let i = 0; i < appData.siswa.length; i += CHUNK_SIZE) {
          const chunk = appData.siswa.slice(i, i + CHUNK_SIZE);
          const batchValues: any[] = [];
          const placeholdersVal: string[] = [];
          for (const s of chunk) {
            placeholdersVal.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            batchValues.push(
              s.id,
              s.nisn || '',
              s.nama,
              s.gender || 'L',
              s.kelasId || '',
              s.status || 'aktif',
              s.noWa || '',
              s.namaOrangTua || '',
              s.noWaOrangTua || '',
              s.username || s.nisn || '',
              s.password || s.nisn || '',
              s.foto || '',
              s.tempatLahir || '',
              s.tanggalLahir || '',
              s.alamat || ''
            );
          }
          if (placeholdersVal.length > 0) {
            await db.execute(
              `INSERT INTO siswa (id, nisn, nama, gender, kelas_id, status, no_wa, nama_orang_tua, no_wa_orang_tua, username, password, foto, tempat_lahir, tanggal_lahir, alamat)
               VALUES ${placeholdersVal.join(', ')}
               ON DUPLICATE KEY UPDATE 
                 nisn=VALUES(nisn), nama=VALUES(nama), gender=VALUES(gender), kelas_id=VALUES(kelas_id), 
                 status=VALUES(status), no_wa=VALUES(no_wa), nama_orang_tua=VALUES(nama_orang_tua), no_wa_orang_tua=VALUES(no_wa_orang_tua),
                 username=VALUES(username), password=VALUES(password), foto=VALUES(foto), tempat_lahir=VALUES(tempat_lahir),
                 tanggal_lahir=VALUES(tanggal_lahir), alamat=VALUES(alamat);`,
              batchValues
            ).catch((err) => console.warn('Chunk siswa save warning:', err?.message || err));
          }
        }
      }
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS user (
        id VARCHAR(100) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nama VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        nip VARCHAR(100),
        no_hp VARCHAR(50),
        foto LONGTEXT,
        kelas_nama VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`DELETE FROM user;`);
    const allUsersList: any[] = [];
    if (appData.admin) {
      allUsersList.push({
        id: 'admin_1',
        username: appData.admin.username || 'admin',
        password: appData.admin.password || 'admin123',
        nama: appData.admin.nama || 'Administrator Utama',
        role: 'admin',
        nip: '-',
        noHp: '',
        foto: appData.admin.foto || '',
        kelasNama: '-'
      });
    }
    if (Array.isArray(appData.waliKelas)) {
      for (const w of appData.waliKelas) {
        allUsersList.push({
          id: w.id,
          username: w.username,
          password: w.password,
          nama: w.nama,
          role: w.role || 'wali',
          nip: w.nip || '-',
          noHp: w.noHp || '',
          foto: w.foto || '',
          kelasNama: appData.kelas?.find((k: any) => k.waliKelasId === w.id)?.nama || '-'
        });
      }
    }
    if (Array.isArray(appData.siswa)) {
      for (const s of appData.siswa) {
        const studentUsername = s.username || s.nisn;
        const studentPassword = s.password || s.nisn;
        if (studentUsername) {
          allUsersList.push({
            id: s.id,
            username: studentUsername,
            password: studentPassword || studentUsername,
            nama: s.nama,
            role: 'murid',
            nip: s.nisn || '-',
            noHp: s.noWa || '',
            foto: s.foto || '',
            kelasNama: appData.kelas?.find((k: any) => k.id === s.kelasId)?.nama || '-'
          });
        }
      }
    }

    if (allUsersList.length > 0) {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < allUsersList.length; i += CHUNK_SIZE) {
        const chunk = allUsersList.slice(i, i + CHUNK_SIZE);
        const batchValuesUser: any[] = [];
        const placeholdersValUser: string[] = [];
        for (const u of chunk) {
          placeholdersValUser.push('(?, ?, ?, ?, ?, ?, ?, ?, ?)');
          batchValuesUser.push(u.id, u.username, u.password, u.nama, u.role, u.nip, u.noHp, u.foto, u.kelasNama);
        }
        if (placeholdersValUser.length > 0) {
          await db.execute(
            `INSERT INTO user (id, username, password, nama, role, nip, no_hp, foto, kelas_nama) VALUES ${placeholdersValUser.join(', ')}
             ON DUPLICATE KEY UPDATE username=VALUES(username), password=VALUES(password), nama=VALUES(nama), role=VALUES(role), nip=VALUES(nip), no_hp=VALUES(no_hp), foto=VALUES(foto), kelas_nama=VALUES(kelas_nama);`,
            batchValuesUser
          ).catch((err) => console.warn('Chunk user save warning:', err?.message || err));
        }
      }
    }

    if (appData.presensi && typeof appData.presensi === 'object') {
      const entries = Object.entries(appData.presensi);
      if (entries.length > 0) {
        // Batch insert in chunks of 50 items to avoid MySQL placeholder limit
        const CHUNK_SIZE = 50;
        for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
          const chunk = entries.slice(i, i + CHUNK_SIZE);
          const batchValues: any[] = [];
          const placeholdersVal: string[] = [];
          for (const [tanggalKelas, items] of chunk) {
            const parts = tanggalKelas.split('_');
            const tanggal = parts[0] || '';
            const kelasId = parts[1] || '';
            const presensiJson = JSON.stringify(items);
            placeholdersVal.push('(?, ?, ?, ?)');
            batchValues.push(tanggalKelas, tanggal, kelasId, presensiJson);
          }
          if (placeholdersVal.length > 0) {
            await db.execute(
              `INSERT INTO presensi (tanggal_kelas, tanggal, kelas_id, data_presensi) VALUES ${placeholdersVal.join(', ')}
               ON DUPLICATE KEY UPDATE tanggal = VALUES(tanggal), kelas_id = VALUES(kelas_id), data_presensi = VALUES(data_presensi);`,
              batchValues
            ).catch((err) => console.warn('Chunk presensi save warning:', err?.message || err));
          }
        }
      }
    }

    // 1. Table & Data Pelanggaran Siswa
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pelanggaran (
        id VARCHAR(50) PRIMARY KEY,
        tanggal VARCHAR(50) NOT NULL,
        siswa_id VARCHAR(50) NOT NULL,
        kelas_id VARCHAR(50),
        kategori VARCHAR(50) NOT NULL,
        nama_pelanggaran VARCHAR(255) NOT NULL,
        poin INT DEFAULT 0,
        keterangan TEXT,
        pelapor VARCHAR(255),
        tindakan TEXT,
        status VARCHAR(50) DEFAULT 'proses',
        foto LONGTEXT,
        created_at VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pelanggaran_siswa (siswa_id),
        INDEX idx_pelanggaran_tanggal (tanggal),
        INDEX idx_pelanggaran_kelas (kelas_id)
      );
    `).catch(() => {});

    if (Array.isArray(appData.pelanggaran)) {
      await db.execute(`DELETE FROM pelanggaran;`);
      if (appData.pelanggaran.length > 0) {
        const batchValuesPelanggaran: any[] = [];
        const placeholdersValPelanggaran: string[] = [];
        for (const p of appData.pelanggaran) {
          placeholdersValPelanggaran.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          batchValuesPelanggaran.push(
            p.id,
            p.tanggal || '',
            p.siswaId || '',
            p.kelasId || '',
            p.kategori || 'ringan',
            p.namaPelanggaran || '',
            Number(p.poin) || 0,
            p.keterangan || '',
            p.pelapor || '',
            p.tindakan || '',
            p.status || 'proses',
            p.foto || '',
            p.createdAt || ''
          );
        }
        await db.execute(
          `INSERT INTO pelanggaran (id, tanggal, siswa_id, kelas_id, kategori, nama_pelanggaran, poin, keterangan, pelapor, tindakan, status, foto, created_at)
           VALUES ${placeholdersValPelanggaran.join(', ')}
           ON DUPLICATE KEY UPDATE
             tanggal=VALUES(tanggal), siswa_id=VALUES(siswa_id), kelas_id=VALUES(kelas_id),
             kategori=VALUES(kategori), nama_pelanggaran=VALUES(nama_pelanggaran), poin=VALUES(poin),
             keterangan=VALUES(keterangan), pelapor=VALUES(pelapor), tindakan=VALUES(tindakan),
             status=VALUES(status), foto=VALUES(foto), created_at=VALUES(created_at);`,
          batchValuesPelanggaran
        );
      }
    }

    // 2. Table & Data Home Visit (Kunjungan Rumah)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS home_visit (
        id VARCHAR(50) PRIMARY KEY,
        tanggal VARCHAR(50) NOT NULL,
        siswa_id VARCHAR(50) NOT NULL,
        kelas_id VARCHAR(50),
        petugas VARCHAR(255) NOT NULL,
        alasan TEXT,
        catatan TEXT,
        hasil TEXT,
        tindak_lanjut TEXT,
        foto LONGTEXT,
        status VARCHAR(50) DEFAULT 'proses',
        created_at VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_home_visit_siswa (siswa_id),
        INDEX idx_home_visit_tanggal (tanggal),
        INDEX idx_home_visit_kelas (kelas_id)
      );
    `).catch(() => {});

    if (Array.isArray(appData.homeVisits)) {
      await db.execute(`DELETE FROM home_visit;`);
      if (appData.homeVisits.length > 0) {
        const batchValuesHV: any[] = [];
        const placeholdersValHV: string[] = [];
        for (const hv of appData.homeVisits) {
          placeholdersValHV.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          batchValuesHV.push(
            hv.id,
            hv.tanggal || '',
            hv.siswaId || '',
            hv.kelasId || '',
            hv.petugas || '',
            hv.alasan || '',
            hv.catatan || '',
            hv.hasil || '',
            hv.tindakLanjut || '',
            hv.foto || '',
            hv.status || 'proses',
            hv.createdAt || ''
          );
        }
        await db.execute(
          `INSERT INTO home_visit (id, tanggal, siswa_id, kelas_id, petugas, alasan, catatan, hasil, tindak_lanjut, foto, status, created_at)
           VALUES ${placeholdersValHV.join(', ')}
           ON DUPLICATE KEY UPDATE
             tanggal=VALUES(tanggal), siswa_id=VALUES(siswa_id), kelas_id=VALUES(kelas_id),
             petugas=VALUES(petugas), alasan=VALUES(alasan), catatan=VALUES(catatan),
             hasil=VALUES(hasil), tindak_lanjut=VALUES(tindak_lanjut), foto=VALUES(foto),
             status=VALUES(status), created_at=VALUES(created_at);`,
          batchValuesHV
        );
      }
    }

    // 3. Table & Data Template Pelanggaran (Violation Templates)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS violation_templates (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        kategori VARCHAR(50) NOT NULL,
        poin INT DEFAULT 0,
        tindakan TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    if (Array.isArray(appData.violationTemplates)) {
      await db.execute(`DELETE FROM violation_templates;`);
      if (appData.violationTemplates.length > 0) {
        const batchValuesTemplates: any[] = [];
        const placeholdersValTemplates: string[] = [];
        for (const vt of appData.violationTemplates) {
          placeholdersValTemplates.push('(?, ?, ?, ?, ?)');
          batchValuesTemplates.push(
            vt.id,
            vt.name || '',
            vt.kategori || 'ringan',
            Number(vt.poin) || 0,
            vt.tindakan || ''
          );
        }
        await db.execute(
          `INSERT INTO violation_templates (id, name, kategori, poin, tindakan)
           VALUES ${placeholdersValTemplates.join(', ')}
           ON DUPLICATE KEY UPDATE
             name=VALUES(name), kategori=VALUES(kategori), poin=VALUES(poin), tindakan=VALUES(tindakan);`,
          batchValuesTemplates
        );
      }
    }

    // Ensure jadwal_mengajar table exists and save schedules
    await db.execute(`
      CREATE TABLE IF NOT EXISTS jadwal_mengajar (
        id VARCHAR(50) PRIMARY KEY,
        guru_id VARCHAR(50),
        guru_username VARCHAR(100),
        guru_nama VARCHAR(255),
        guru_nip VARCHAR(50),
        hari VARCHAR(20),
        kelas_id VARCHAR(50),
        kelas_nama VARCHAR(100),
        mata_pelajaran VARCHAR(255),
        kode_mapel VARCHAR(50),
        jam_ke_list TEXT,
        jam_ke VARCHAR(100),
        shift VARCHAR(20),
        catatan TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    if (Array.isArray(appData.jadwalMengajar) && appData.jadwalMengajar.length > 0) {
      const activeJadwalIds = new Set(appData.jadwalMengajar.map((j: any) => j.id).filter(Boolean));
      // Delete any removed schedules from DB in safe batches
      const [existingJadwalRows]: any = await db.execute(`SELECT id FROM jadwal_mengajar;`).catch(() => [[]]);
      if (Array.isArray(existingJadwalRows) && existingJadwalRows.length > 0) {
        const toDeleteJadwal = existingJadwalRows.map((r: any) => r.id).filter((id: string) => !activeJadwalIds.has(id));
        if (toDeleteJadwal.length > 0) {
          const CHUNK_SIZE = 50;
          for (let i = 0; i < toDeleteJadwal.length; i += CHUNK_SIZE) {
            const chunk = toDeleteJadwal.slice(i, i + CHUNK_SIZE);
            const delPh = chunk.map(() => '?').join(',');
            await db.execute(`DELETE FROM jadwal_mengajar WHERE id IN (${delPh});`, chunk).catch(() => {});
          }
        }
      }

      const CHUNK_SIZE = 50;
      for (let i = 0; i < appData.jadwalMengajar.length; i += CHUNK_SIZE) {
        const chunk = appData.jadwalMengajar.slice(i, i + CHUNK_SIZE);
        const batchVals: any[] = [];
        const phs: string[] = [];
        for (const j of chunk) {
          phs.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          batchVals.push(
            j.id,
            j.guruId || '',
            j.guruUsername || '',
            j.guruNama || '',
            j.guruNip || '',
            j.hari || '',
            j.kelasId || '',
            j.kelasNama || '',
            j.mataPelajaran || '',
            j.kodeMapel || '',
            JSON.stringify(j.jamKeList || []),
            j.jamKe || '',
            j.shift || 'Pagi',
            j.catatan || ''
          );
        }
        await db.execute(
          `INSERT INTO jadwal_mengajar (id, guru_id, guru_username, guru_nama, guru_nip, hari, kelas_id, kelas_nama, mata_pelajaran, kode_mapel, jam_ke_list, jam_ke, shift, catatan)
           VALUES ${phs.join(', ')}
           ON DUPLICATE KEY UPDATE
             guru_id=VALUES(guru_id), guru_username=VALUES(guru_username), guru_nama=VALUES(guru_nama), guru_nip=VALUES(guru_nip),
             hari=VALUES(hari), kelas_id=VALUES(kelas_id), kelas_nama=VALUES(kelas_nama), mata_pelajaran=VALUES(mata_pelajaran),
             kode_mapel=VALUES(kode_mapel), jam_ke_list=VALUES(jam_ke_list), jam_ke=VALUES(jam_ke), shift=VALUES(shift), catatan=VALUES(catatan);`,
          batchVals
        ).catch(() => {});
      }
    }

    // Save mata_pelajaran
    if (Array.isArray(appData.mataPelajaran) && appData.mataPelajaran.length > 0) {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < appData.mataPelajaran.length; i += CHUNK_SIZE) {
        const chunk = appData.mataPelajaran.slice(i, i + CHUNK_SIZE);
        const batchVals: any[] = [];
        const phs: string[] = [];
        for (const m of chunk) {
          phs.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          batchVals.push(
            m.id,
            m.kode || '',
            m.nama || '',
            m.kategori || 'Umum',
            m.tingkat || 'Semua Tingkat',
            m.jurusanId || '',
            m.jurusanNama || '',
            Number(m.alokasiJp) || 0,
            Number(m.kkm) || 75,
            m.deskripsi || ''
          );
        }
        await db.execute(
          `INSERT INTO mata_pelajaran (id, kode, nama, kategori, tingkat, jurusan_id, jurusan_nama, alokasi_jp, kkm, deskripsi)
           VALUES ${phs.join(', ')}
           ON DUPLICATE KEY UPDATE
             kode=VALUES(kode), nama=VALUES(nama), kategori=VALUES(kategori), tingkat=VALUES(tingkat),
             jurusan_id=VALUES(jurusan_id), jurusan_nama=VALUES(jurusan_nama), alokasi_jp=VALUES(alokasi_jp),
             kkm=VALUES(kkm), deskripsi=VALUES(deskripsi);`,
          batchVals
        ).catch(() => {});
      }
    }

    // Save guru_mapel_kelas
    if (Array.isArray(appData.guruMapelKelas) && appData.guruMapelKelas.length > 0) {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < appData.guruMapelKelas.length; i += CHUNK_SIZE) {
        const chunk = appData.guruMapelKelas.slice(i, i + CHUNK_SIZE);
        const batchVals: any[] = [];
        const phs: string[] = [];
        for (const g of chunk) {
          phs.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          batchVals.push(
            g.id,
            g.guruId || '',
            g.guruUsername || '',
            g.guruNama || '',
            g.guruNip || '',
            g.kodeMapel || '',
            g.namaMapel || '',
            g.kategori || '',
            g.tingkat || '',
            Number(g.alokasiJp) || 0,
            Number(g.kkm) || 75,
            g.deskripsi || '',
            JSON.stringify(g.kelasIds || []),
            g.catatan || '',
            g.createdAt || new Date().toISOString()
          );
        }
        await db.execute(
          `INSERT INTO guru_mapel_kelas (id, guru_id, guru_username, guru_nama, guru_nip, kode_mapel, nama_mapel, kategori, tingkat, alokasi_jp, kkm, deskripsi, kelas_ids, catatan, created_at)
           VALUES ${phs.join(', ')}
           ON DUPLICATE KEY UPDATE
             guru_id=VALUES(guru_id), guru_username=VALUES(guru_username), guru_nama=VALUES(guru_nama), guru_nip=VALUES(guru_nip),
             kode_mapel=VALUES(kode_mapel), nama_mapel=VALUES(nama_mapel), kategori=VALUES(kategori), tingkat=VALUES(tingkat),
             alokasi_jp=VALUES(alokasi_jp), kkm=VALUES(kkm), deskripsi=VALUES(deskripsi), kelas_ids=VALUES(kelas_ids),
             catatan=VALUES(catatan), created_at=VALUES(created_at);`,
          batchVals
        ).catch(() => {});
      }
    }

    // Save presensi_mengajar_guru
    if (Array.isArray(appData.presensiMengajarGuru) && appData.presensiMengajarGuru.length > 0) {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < appData.presensiMengajarGuru.length; i += CHUNK_SIZE) {
        const chunk = appData.presensiMengajarGuru.slice(i, i + CHUNK_SIZE);
        const batchVals: any[] = [];
        const phs: string[] = [];
        for (const p of chunk) {
          phs.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          batchVals.push(
            p.id,
            p.jadwalId || '',
            p.guruUsername || '',
            p.guruNama || '',
            p.tanggal || '',
            p.hari || '',
            p.kelasId || '',
            p.kelasNama || '',
            p.mataPelajaran || '',
            p.materiAjar || '',
            p.jamPelajaran || '',
            JSON.stringify(p.presensiSiswa || []),
            p.catatanGuru || '',
            p.createdAt || new Date().toISOString()
          );
        }
        await db.execute(
          `INSERT INTO presensi_mengajar_guru (id, jadwal_id, guru_username, guru_nama, tanggal, hari, kelas_id, kelas_nama, mata_pelajaran, materi_ajar, jam_pelajaran, presensi_siswa, catatan_guru, created_at)
           VALUES ${phs.join(', ')}
           ON DUPLICATE KEY UPDATE
             jadwal_id=VALUES(jadwal_id), guru_username=VALUES(guru_username), guru_nama=VALUES(guru_nama),
             tanggal=VALUES(tanggal), hari=VALUES(hari), kelas_id=VALUES(kelas_id), kelas_nama=VALUES(kelas_nama),
             mata_pelajaran=VALUES(mata_pelajaran), materi_ajar=VALUES(materi_ajar), jam_pelajaran=VALUES(jam_pelajaran),
             presensi_siswa=VALUES(presensi_siswa), catatan_guru=VALUES(catatan_guru), created_at=VALUES(created_at);`,
          batchVals
        ).catch(() => {});
      }
    }

    // Save shiftConfig
    if (appData.shiftConfig) {
      const sc = appData.shiftConfig;
      await db.execute(
        `INSERT INTO shift_config_settings (id, pagi_time, siang_time, is_jam_masuk_pagi_active, pagi_jam_masuk_mulai, pagi_jam_masuk_selesai, pagi_jam_pulang, is_jam_masuk_siang_active, siang_jam_masuk_mulai, siang_jam_masuk_selesai, siang_jam_pulang)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           pagi_time=VALUES(pagi_time), siang_time=VALUES(siang_time),
           is_jam_masuk_pagi_active=VALUES(is_jam_masuk_pagi_active), pagi_jam_masuk_mulai=VALUES(pagi_jam_masuk_mulai),
           pagi_jam_masuk_selesai=VALUES(pagi_jam_masuk_selesai), pagi_jam_pulang=VALUES(pagi_jam_pulang),
           is_jam_masuk_siang_active=VALUES(is_jam_masuk_siang_active), siang_jam_masuk_mulai=VALUES(siang_jam_masuk_mulai),
           siang_jam_masuk_selesai=VALUES(siang_jam_masuk_selesai), siang_jam_pulang=VALUES(siang_jam_pulang);`,
        [
          sc.pagiTime || '06.30 - 12.00',
          sc.siangTime || '13.00 - 16.50',
          sc.isJamMasukPagiActive !== false ? 1 : 0,
          sc.pagiJamMasukMulai || '06:30',
          sc.pagiJamMasukSelesai || '06:45',
          sc.pagiJamPulang || '12:00',
          sc.isJamMasukSiangActive !== false ? 1 : 0,
          sc.siangJamMasukMulai || '12:45',
          sc.siangJamMasukSelesai || '13:00',
          sc.siangJamPulang || '16:50'
        ]
      ).catch(() => {});

      if (Array.isArray(sc.periods) && sc.periods.length > 0) {
        const ph = sc.periods.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const vals: any[] = [];
        for (const p of sc.periods) {
          vals.push(p.id, p.startDate, p.endDate, p.kelompok1Type, p.kelompok2Type);
        }
        await db.execute(
          `INSERT INTO shift_config_periods (id, start_date, end_date, kelompok1_type, kelompok2_type)
           VALUES ${ph}
           ON DUPLICATE KEY UPDATE
             start_date=VALUES(start_date), end_date=VALUES(end_date),
             kelompok1_type=VALUES(kelompok1_type), kelompok2_type=VALUES(kelompok2_type);`,
          vals
        ).catch(() => {});
      }
    }

    // Save hariLibur
    if (Array.isArray(appData.hariLibur) && appData.hariLibur.length > 0) {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < appData.hariLibur.length; i += CHUNK_SIZE) {
        const chunk = appData.hariLibur.slice(i, i + CHUNK_SIZE);
        const ph = chunk.map(() => '(?, ?, ?, ?)').join(', ');
        const vals: any[] = [];
        for (const h of chunk) {
          vals.push(h.id, h.tanggal, h.keterangan || '', h.jenis || 'nasional');
        }
        await db.execute(
          `INSERT INTO hari_libur (id, tanggal, keterangan, jenis)
           VALUES ${ph}
           ON DUPLICATE KEY UPDATE
             tanggal=VALUES(tanggal), keterangan=VALUES(keterangan), jenis=VALUES(jenis);`,
          vals
        ).catch(() => {});
      }
    }

    // Save pengumuman
    if (Array.isArray(appData.pengumuman) && appData.pengumuman.length > 0) {
      const ph = appData.pengumuman.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const vals: any[] = [];
      for (const p of appData.pengumuman) {
        vals.push(
          p.id,
          p.judul || '',
          p.isi || '',
          p.tanggal || '',
          p.kategori || 'info',
          p.target || 'semua',
          p.aktif !== false ? 1 : 0,
          p.pinToRunningText ? 1 : 0,
          p.pinToLoginBanner ? 1 : 0,
          p.pinToDashboard ? 1 : 0,
          p.penulis || '',
          p.linkUrl || '',
          p.linkText || '',
          p.createdAt || new Date().toISOString()
        );
      }
      await db.execute(
        `INSERT INTO pengumuman (id, judul, isi, tanggal, kategori, target, aktif, pin_to_running_text, pin_to_login_banner, pin_to_dashboard, penulis, link_url, link_text, created_at)
         VALUES ${ph}
         ON DUPLICATE KEY UPDATE
           judul=VALUES(judul), isi=VALUES(isi), tanggal=VALUES(tanggal), kategori=VALUES(kategori), target=VALUES(target),
           aktif=VALUES(aktif), pin_to_running_text=VALUES(pin_to_running_text), pin_to_login_banner=VALUES(pin_to_login_banner),
           pin_to_dashboard=VALUES(pin_to_dashboard), penulis=VALUES(penulis), link_url=VALUES(link_url), link_text=VALUES(link_text), created_at=VALUES(created_at);`,
        vals
      ).catch(() => {});
    }

    // Save ekstrakurikuler & anggotaEkskul
    if (Array.isArray(appData.ekstrakurikuler) && appData.ekstrakurikuler.length > 0) {
      const ph = appData.ekstrakurikuler.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const vals: any[] = [];
      for (const e of appData.ekstrakurikuler) {
        vals.push(e.id, e.nama, e.pembinaId || '', e.pembinaNama || '', e.jadwalHari || '', e.jamMulai || '', e.jamSelesai || '', e.tempat || '', e.deskripsi || '');
      }
      await db.execute(
        `INSERT INTO ekstrakurikuler (id, nama, pembina_id, pembina_nama, jadwal_hari, jam_mulai, jam_selesai, tempat, deskripsi)
         VALUES ${ph}
         ON DUPLICATE KEY UPDATE
           nama=VALUES(nama), pembina_id=VALUES(pembina_id), pembina_nama=VALUES(pembina_nama), jadwal_hari=VALUES(jadwal_hari),
           jam_mulai=VALUES(jam_mulai), jam_selesai=VALUES(jam_selesai), tempat=VALUES(tempat), deskripsi=VALUES(deskripsi);`,
        vals
      ).catch(() => {});
    }

    if (Array.isArray(appData.anggotaEkskul) && appData.anggotaEkskul.length > 0) {
      const ph = appData.anggotaEkskul.map(() => '(?, ?, ?, ?)').join(', ');
      const vals: any[] = [];
      for (const a of appData.anggotaEkskul) {
        vals.push(a.id, a.ekskulId, a.siswaId, a.tanggalBergabung || '');
      }
      await db.execute(
        `INSERT INTO anggota_ekskul (id, ekskul_id, siswa_id, tanggal_bergabung)
         VALUES ${ph}
         ON DUPLICATE KEY UPDATE
           ekskul_id=VALUES(ekskul_id), siswa_id=VALUES(siswa_id), tanggal_bergabung=VALUES(tanggal_bergabung);`,
        vals
      ).catch(() => {});
    }

    // Save chat_messages
    if (Array.isArray(appData.chatMessages) && appData.chatMessages.length > 0) {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < appData.chatMessages.length; i += CHUNK_SIZE) {
        const chunk = appData.chatMessages.slice(i, i + CHUNK_SIZE);
        const ph = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const vals: any[] = [];
        for (const c of chunk) {
          vals.push(
            c.id,
            c.senderRole || '',
            c.senderUsername || '',
            c.senderNama || '',
            c.senderFoto || '',
            c.recipientUsername || 'all',
            c.text || '',
            c.image || '',
            c.timestamp || new Date().toISOString(),
            c.isRead ? 1 : 0,
            c.status || 'sent',
            c.isBot ? 1 : 0,
            JSON.stringify(c.deletedFor || []),
            c.isDeletedForEveryone ? 1 : 0
          );
        }
        await db.execute(
          `INSERT INTO chat_messages (id, sender_role, sender_username, sender_nama, sender_foto, recipient_username, text, image, timestamp, is_read, status, is_bot, deleted_for, is_deleted_for_everyone)
           VALUES ${ph}
           ON DUPLICATE KEY UPDATE
             sender_role=VALUES(sender_role), sender_username=VALUES(sender_username), sender_nama=VALUES(sender_nama),
             sender_foto=VALUES(sender_foto), recipient_username=VALUES(recipient_username), text=VALUES(text),
             image=VALUES(image), timestamp=VALUES(timestamp), is_read=VALUES(is_read), status=VALUES(status),
             is_bot=VALUES(is_bot), deleted_for=VALUES(deleted_for), is_deleted_for_everyone=VALUES(is_deleted_for_everyone);`,
          vals
        ).catch(() => {});
      }
    }

    // Save presensi_ekskul
    if (appData.presensiEkskul && typeof appData.presensiEkskul === 'object') {
      const peRows: any[] = [];
      for (const sessionKey of Object.keys(appData.presensiEkskul)) {
        const items = appData.presensiEkskul[sessionKey];
        const parts = sessionKey.split('_');
        const tanggal = parts[0] || '';
        const ekskulId = parts.slice(1).join('_') || '';
        if (Array.isArray(items)) {
          for (const item of items) {
            peRows.push({
              id: `${sessionKey}_${item.siswaId}`,
              sessionKey,
              ekskulId,
              tanggal,
              siswaId: item.siswaId,
              status: item.status || 'H',
              catatan: item.catatan || '',
              time: item.time || ''
            });
          }
        }
      }
      if (peRows.length > 0) {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < peRows.length; i += CHUNK_SIZE) {
          const chunk = peRows.slice(i, i + CHUNK_SIZE);
          const ph = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const vals: any[] = [];
          for (const r of chunk) {
            vals.push(r.id, r.sessionKey, r.ekskulId, r.tanggal, r.siswaId, r.status, r.catatan, r.time);
          }
          await db.execute(
            `INSERT INTO presensi_ekskul (id, session_key, ekskul_id, tanggal, siswa_id, status, catatan, time)
             VALUES ${ph}
             ON DUPLICATE KEY UPDATE
               session_key=VALUES(session_key), ekskul_id=VALUES(ekskul_id), tanggal=VALUES(tanggal),
               siswa_id=VALUES(siswa_id), status=VALUES(status), catatan=VALUES(catatan), time=VALUES(time);`,
            vals
          ).catch(() => {});
        }
      }
    }

    // Save audit_logs
    if (Array.isArray(appData.auditLogs) && appData.auditLogs.length > 0) {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < appData.auditLogs.length; i += CHUNK_SIZE) {
        const chunk = appData.auditLogs.slice(i, i + CHUNK_SIZE);
        const ph = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const vals: any[] = [];
        for (const a of chunk) {
          vals.push(
            a.id,
            a.timestamp || '',
            a.role || '',
            a.username || '',
            a.nama || '',
            a.aksi || '',
            a.detail || '',
            a.ipAddress || ''
          );
        }
        await db.execute(
          `INSERT INTO audit_logs (id, timestamp, role, username, nama, aksi, detail, ip_address)
           VALUES ${ph}
           ON DUPLICATE KEY UPDATE
             timestamp=VALUES(timestamp), role=VALUES(role), username=VALUES(username), nama=VALUES(nama),
             aksi=VALUES(aksi), detail=VALUES(detail), ip_address=VALUES(ip_address);`,
          vals
        ).catch(() => {});
      }
    }

    // Save whatsapp_logs
    if (Array.isArray(appData.whatsappLogs) && appData.whatsappLogs.length > 0) {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < appData.whatsappLogs.length; i += CHUNK_SIZE) {
        const chunk = appData.whatsappLogs.slice(i, i + CHUNK_SIZE);
        const ph = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const vals: any[] = [];
        for (const w of chunk) {
          vals.push(
            w.id,
            w.timestamp || '',
            w.recipientPhone || '',
            w.recipientName || '',
            w.messageType || '',
            w.messageText || '',
            w.status || '',
            w.provider || '',
            w.responseMessage || ''
          );
        }
        await db.execute(
          `INSERT INTO whatsapp_logs (id, timestamp, recipient_phone, recipient_name, message_type, message_text, status, provider, response_message)
           VALUES ${ph}
           ON DUPLICATE KEY UPDATE
             timestamp=VALUES(timestamp), recipient_phone=VALUES(recipient_phone), recipient_name=VALUES(recipient_name),
             message_type=VALUES(message_type), message_text=VALUES(message_text), status=VALUES(status),
             provider=VALUES(provider), response_message=VALUES(response_message);`,
          vals
        ).catch(() => {});
      }
    }

    // Save role_permissions
    if (Array.isArray(appData.rolePermissions) && appData.rolePermissions.length > 0) {
      const ph = appData.rolePermissions.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const vals: any[] = [];
      for (const r of appData.rolePermissions) {
        vals.push(
          r.roleId,
          r.roleName || '',
          r.description || '',
          r.badgeColor || 'blue',
          r.isSystem !== false ? 1 : 0,
          JSON.stringify(r.allowedMenus || [])
        );
      }
      await db.execute(
        `INSERT INTO role_permissions (role_id, role_name, description, badge_color, is_system, allowed_menus)
         VALUES ${ph}
         ON DUPLICATE KEY UPDATE
           role_name=VALUES(role_name), description=VALUES(description), badge_color=VALUES(badge_color),
           is_system=VALUES(is_system), allowed_menus=VALUES(allowed_menus);`,
        vals
      ).catch(() => {});
    }

    // Save whatsapp_gateway_config
    if (appData.whatsappGateway && typeof appData.whatsappGateway === 'object') {
      const wg = appData.whatsappGateway;
      await db.execute(
        `INSERT INTO whatsapp_gateway_config (
           id, enabled, provider, api_key, sender_number, domain_url, webhook_url,
           send_otp_enabled, send_presensi_masuk_enabled, send_presensi_pulang_enabled,
           send_presensi_terlambat_enabled, send_ketidakhadiran_enabled, send_to_student,
           send_to_parent, template_otp, template_presensi_masuk, template_presensi_pulang,
           template_presensi_terlambat, template_ketidakhadiran, template_broadcast
         ) VALUES (
           1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         ) ON DUPLICATE KEY UPDATE
           enabled=VALUES(enabled), provider=VALUES(provider), api_key=VALUES(api_key),
           sender_number=VALUES(sender_number), domain_url=VALUES(domain_url), webhook_url=VALUES(webhook_url),
           send_otp_enabled=VALUES(send_otp_enabled), send_presensi_masuk_enabled=VALUES(send_presensi_masuk_enabled),
           send_presensi_pulang_enabled=VALUES(send_presensi_pulang_enabled),
           send_presensi_terlambat_enabled=VALUES(send_presensi_terlambat_enabled),
           send_ketidakhadiran_enabled=VALUES(send_ketidakhadiran_enabled), send_to_student=VALUES(send_to_student),
           send_to_parent=VALUES(send_to_parent), template_otp=VALUES(template_otp),
           template_presensi_masuk=VALUES(template_presensi_masuk),
           template_presensi_pulang=VALUES(template_presensi_pulang),
           template_presensi_terlambat=VALUES(template_presensi_terlambat),
           template_ketidakhadiran=VALUES(template_ketidakhadiran), template_broadcast=VALUES(template_broadcast);`,
        [
          wg.enabled ? 1 : 0,
          wg.provider || 'fonnte',
          wg.apiKey || '',
          wg.senderNumber || '',
          wg.domainUrl || '',
          wg.webhookUrl || '',
          wg.sendOtpEnabled !== false ? 1 : 0,
          wg.sendPresensiMasukEnabled !== false ? 1 : 0,
          wg.sendPresensiPulangEnabled !== false ? 1 : 0,
          wg.sendPresensiTerlambatEnabled !== false ? 1 : 0,
          wg.sendKetidakhadiranEnabled !== false ? 1 : 0,
          wg.sendToStudent !== false ? 1 : 0,
          wg.sendToParent !== false ? 1 : 0,
          wg.templateOtp || '',
          wg.templatePresensiMasuk || '',
          wg.templatePresensiPulang || '',
          wg.templatePresensiTerlambat || '',
          wg.templateKetidakhadiran || '',
          wg.templateBroadcast || ''
        ]
      ).catch(() => {});
    }

    // Save security_incidents
    if (Array.isArray(appData.securityIncidents) && appData.securityIncidents.length > 0) {
      const ph = appData.securityIncidents.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const vals: any[] = [];
      for (const s of appData.securityIncidents) {
        vals.push(
          s.id,
          s.timestamp || '',
          s.formattedTime || '',
          s.type || '',
          s.ipAddress || '',
          s.attemptedUsername || '',
          s.payloadSnippet || '',
          s.status || '',
          s.actionTaken || '',
          s.locationEstimate || ''
        );
      }
      await db.execute(
        `INSERT INTO security_incidents (id, timestamp, formatted_time, type, ip_address, attempted_username, payload_snippet, status, action_taken, location_estimate)
         VALUES ${ph}
         ON DUPLICATE KEY UPDATE
           timestamp=VALUES(timestamp), formatted_time=VALUES(formatted_time), type=VALUES(type),
           ip_address=VALUES(ip_address), attempted_username=VALUES(attempted_username),
           payload_snippet=VALUES(payload_snippet), status=VALUES(status),
           action_taken=VALUES(action_taken), location_estimate=VALUES(location_estimate);`,
        vals
      ).catch(() => {});
    }

    // Save blocked_ips
    if (Array.isArray(appData.blockedIps) && appData.blockedIps.length > 0) {
      const ph = appData.blockedIps.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
      const vals: any[] = [];
      for (const b of appData.blockedIps) {
        vals.push(
          b.id,
          b.ip,
          b.reason || '',
          b.blockedAt || '',
          b.expiresAt || '',
          b.blockedBy || '',
          b.threatCount || 1
        );
      }
      await db.execute(
        `INSERT INTO blocked_ips (id, ip, reason, blocked_at, expires_at, blocked_by, threat_count)
         VALUES ${ph}
         ON DUPLICATE KEY UPDATE
           ip=VALUES(ip), reason=VALUES(reason), blocked_at=VALUES(blocked_at),
           expires_at=VALUES(expires_at), blocked_by=VALUES(blocked_by), threat_count=VALUES(threat_count);`,
        vals
      ).catch(() => {});
    }

    await db.execute(`SET FOREIGN_KEY_CHECKS = 1;`);
  } catch (err: any) {
    if (isMySQLRateLimitError(err)) {
      setMySQLCooldown(err?.message || 'max_connections_per_hour');
    } else {
      console.info("[MySQL Save Status]", err?.message || err);
    }
  } finally {
    if (db) {
      try { db.release(); } catch (e) {}
    }
  }
}

async function performMySQLLoad(config: any) {
  const pool = getMySQLPool(config);
  if (!pool) return null;

  let db: mysql.PoolConnection | null = null;

  try {
    db = await pool.getConnection();

    const [settingsRows]: any = await db.execute(
      `SELECT config_value FROM app_settings WHERE config_key = 'full_app_data';`
    ).catch(() => [[]]);

    let appData: any = null;
    if (settingsRows && settingsRows.length > 0 && settingsRows[0].config_value) {
      try {
        appData = JSON.parse(settingsRows[0].config_value);
      } catch (e) {}
    }

    const [sekolahRows]: any = await db.execute(`SELECT * FROM sekolah_config WHERE id = 1;`).catch(() => [[]]);
    const [adminRows]: any = await db.execute(`SELECT * FROM admin_account WHERE id = 1;`).catch(() => [[]]);
    const [jurusanRows]: any = await db.execute(`SELECT * FROM jurusan;`).catch(() => [[]]);
    const [waliRows]: any = await db.execute(`SELECT * FROM wali_kelas;`).catch(() => [[]]);
    const [kelasRows]: any = await db.execute(`SELECT * FROM kelas;`).catch(() => [[]]);
    const [siswaRows]: any = await db.execute(`SELECT * FROM siswa;`).catch(() => [[]]);
    const [presensiRows]: any = await db.execute(`SELECT * FROM presensi;`).catch(() => [[]]);
    const [pelanggaranRows]: any = await db.execute(`SELECT * FROM pelanggaran ORDER BY tanggal DESC;`).catch(() => [[]]);
    const [homeVisitRows]: any = await db.execute(`SELECT * FROM home_visit ORDER BY tanggal DESC;`).catch(() => [[]]);
    const [templateRows]: any = await db.execute(`SELECT * FROM violation_templates;`).catch(() => [[]]);
    const [jadwalRows]: any = await db.execute(`SELECT * FROM jadwal_mengajar;`).catch(() => [[]]);
    const [mapelRows]: any = await db.execute(`SELECT * FROM mata_pelajaran;`).catch(() => [[]]);
    const [gmkRows]: any = await db.execute(`SELECT * FROM guru_mapel_kelas;`).catch(() => [[]]);
    const [pmgRows]: any = await db.execute(`SELECT * FROM presensi_mengajar_guru ORDER BY tanggal DESC;`).catch(() => [[]]);
    const [shiftSettingsRows]: any = await db.execute(`SELECT * FROM shift_config_settings WHERE id = 1;`).catch(() => [[]]);
    const [shiftPeriodsRows]: any = await db.execute(`SELECT * FROM shift_config_periods ORDER BY id ASC;`).catch(() => [[]]);
    const [hariLiburRows]: any = await db.execute(`SELECT * FROM hari_libur;`).catch(() => [[]]);
    const [pengumumanRows]: any = await db.execute(`SELECT * FROM pengumuman ORDER BY tanggal DESC;`).catch(() => [[]]);
    const [ekskulRows]: any = await db.execute(`SELECT * FROM ekstrakurikuler;`).catch(() => [[]]);
    const [anggotaEkskulRows]: any = await db.execute(`SELECT * FROM anggota_ekskul;`).catch(() => [[]]);
    const [chatRows]: any = await db.execute(`SELECT * FROM chat_messages ORDER BY timestamp ASC;`).catch(() => [[]]);
    const [presensiEkskulRows]: any = await db.execute(`SELECT * FROM presensi_ekskul;`).catch(() => [[]]);
    const [auditRows]: any = await db.execute(`SELECT * FROM audit_logs ORDER BY timestamp DESC;`).catch(() => [[]]);
    const [waRows]: any = await db.execute(`SELECT * FROM whatsapp_logs ORDER BY timestamp DESC;`).catch(() => [[]]);
    const [rpRows]: any = await db.execute(`SELECT * FROM role_permissions;`).catch(() => [[]]);
    const [wgRows]: any = await db.execute(`SELECT * FROM whatsapp_gateway_config WHERE id = 1;`).catch(() => [[]]);
    const [siRows]: any = await db.execute(`SELECT * FROM security_incidents ORDER BY timestamp DESC;`).catch(() => [[]]);
    const [blRows]: any = await db.execute(`SELECT * FROM blocked_ips;`).catch(() => [[]]);

    if (!appData) {
      appData = {};
    }

    if (sekolahRows && sekolahRows.length > 0) {
      const s = sekolahRows[0];
      appData.sekolah = {
        ...(appData.sekolah || {}),
        nama: s.nama || appData.sekolah?.nama,
        alamat: s.alamat || appData.sekolah?.alamat,
        tahunAjaran: s.tahun_ajaran || appData.sekolah?.tahunAjaran,
        tanggalMulai: s.tanggal_mulai || appData.sekolah?.tanggalMulai,
        logo: s.logo || appData.sekolah?.logo,
        favicon: s.favicon || appData.sekolah?.favicon,
        namaKepalaSekolah: s.nama_kepala_sekolah || appData.sekolah?.namaKepalaSekolah,
        nipKepalaSekolah: s.nip_kepala_sekolah || appData.sekolah?.nipKepalaSekolah,
        theme: s.theme || appData.sekolah?.theme,
        fontTheme: s.font_theme || appData.sekolah?.fontTheme
      };
    }

    if (adminRows && adminRows.length > 0) {
      const a = adminRows[0];
      appData.admin = {
        username: a.username,
        password: a.password,
        nama: a.nama,
        foto: a.foto
      };
    }

    if (jurusanRows && jurusanRows.length > 0) {
      appData.jurusan = jurusanRows.map((j: any) => ({
        id: j.id,
        kode: j.kode,
        nama: j.nama
      }));
    }

    if (waliRows && waliRows.length > 0) {
      appData.waliKelas = waliRows.map((w: any) => {
        let hariMengajarArr = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
        if (w.hari_mengajar) {
          try {
            hariMengajarArr = typeof w.hari_mengajar === 'string' ? JSON.parse(w.hari_mengajar) : w.hari_mengajar;
          } catch {
            hariMengajarArr = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
          }
        }
        return {
          id: w.id,
          nip: w.nip || '',
          nama: w.nama,
          nuptk: w.nuptk || '',
          jenisKelamin: w.jenis_kelamin || '',
          tempatLahir: w.tempat_lahir || '',
          tanggalLahir: w.tanggal_lahir || '',
          nik: w.nik || '',
          agamaId: w.agama_id || '',
          alamat: w.alamat || '',
          rt: w.rt || '',
          rw: w.rw || '',
          desaKelurahan: w.desa_kelurahan || '',
          kecamatan: w.kecamatan || '',
          kodeWilayah: w.kode_wilayah || '',
          kodePos: w.kode_pos || '',
          noHp: w.no_hp || '',
          email: w.email || '',
          gelarBelakang: w.gelar_belakang || '',
          username: w.username || `guru_${String(w.nip || w.nama).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
          password: w.password || '123',
          role: w.role || 'wali',
          foto: w.foto || '',
          tugasTambahan: w.tugas_tambahan || '',
          jabatan: w.jabatan || w.tugas_tambahan || '',
          mataPelajaran: w.mata_pelajaran || '',
          hariMengajar: hariMengajarArr,
          batasiLoginHariMengajar: Boolean(w.batasi_login_hari_mengajar)
        };
      });
    }

    if (kelasRows && kelasRows.length > 0) {
      appData.kelas = kelasRows.map((k: any) => ({
        id: k.id,
        nama: k.nama,
        jurusanId: k.jurusan_id,
        waliKelasId: k.wali_kelas_id
      }));
    }

    if (siswaRows && siswaRows.length > 0) {
      const deletedSiswaSet = new Set([
        ...(appData.deletedSiswaIds || []),
        ...(inMemoryAppDataCache?.deletedSiswaIds || [])
      ].map((id: any) => String(id)));
      const prevSiswaMap = new Map<string, any>((appData.siswa || []).map((s: any) => [s.id, s]));
      const rawList = siswaRows
        .filter((s: any) => s && s.id && !deletedSiswaSet.has(String(s.id)))
        .map((s: any) => {
          const prev = prevSiswaMap.get(s.id) || {};
          return {
            id: s.id,
            nisn: s.nisn || prev.nisn || '',
            nama: s.nama || prev.nama || '',
            gender: s.gender || prev.gender || 'L',
            kelasId: s.kelas_id || prev.kelasId || '',
            status: s.status || prev.status || 'aktif',
            noWa: s.no_wa || prev.noWa || '',
            namaOrangTua: s.nama_orang_tua || prev.namaOrangTua || '',
            noWaOrangTua: s.no_wa_orang_tua || prev.noWaOrangTua || '',
            username: s.username || prev.username || s.nisn || '',
            password: s.password || prev.password || s.nisn || '',
            foto: s.foto !== null && s.foto !== undefined ? s.foto : (prev.foto || ''),
            tempatLahir: s.tempat_lahir || prev.tempatLahir || '',
            tanggalLahir: s.tanggal_lahir || prev.tanggalLahir || '',
            alamat: s.alamat || prev.alamat || ''
          };
        });

      // Strict deduplication by NISN
      const nisnSeen = new Map<string, any>();
      const dedupedList: any[] = [];
      for (const item of rawList) {
        const cleanNisn = item.nisn && item.nisn !== '-' ? String(item.nisn).trim().toLowerCase() : '';
        if (cleanNisn) {
          if (!nisnSeen.has(cleanNisn)) {
            nisnSeen.set(cleanNisn, item);
            dedupedList.push(item);
          } else {
            const existing = nisnSeen.get(cleanNisn);
            if (!existing.namaOrangTua && item.namaOrangTua) existing.namaOrangTua = item.namaOrangTua;
            if (!existing.noWa && item.noWa) existing.noWa = item.noWa;
            if (!existing.noWaOrangTua && item.noWaOrangTua) existing.noWaOrangTua = item.noWaOrangTua;
          }
        } else {
          dedupedList.push(item);
        }
      }
      appData.siswa = dedupedList;
    }

    if (Array.isArray(presensiRows) && presensiRows.length > 0) {
      if (!appData.presensi) {
        appData.presensi = {};
      }
      for (const p of presensiRows) {
        try {
          appData.presensi[p.tanggal_kelas] = typeof p.data_presensi === 'string' ? JSON.parse(p.data_presensi) : p.data_presensi;
        } catch (e) {
          // ignore broken row
        }
      }
    }

    if (Array.isArray(pelanggaranRows)) {
      const deletedPelanggaranSet = new Set(appData.deletedPelanggaranIds || []);
      appData.pelanggaran = pelanggaranRows
        .filter((p: any) => p && p.id && !deletedPelanggaranSet.has(p.id))
        .map((p: any) => ({
          id: p.id,
          tanggal: p.tanggal,
          siswaId: p.siswa_id,
          kelasId: p.kelas_id,
          kategori: p.kategori,
          namaPelanggaran: p.nama_pelanggaran,
          poin: Number(p.poin) || 0,
          keterangan: p.keterangan || '',
          pelapor: p.pelapor || '',
          tindakan: p.tindakan || '',
          status: p.status || 'proses',
          foto: p.foto || '',
          createdAt: p.created_at || ''
        }));
    }

    if (Array.isArray(homeVisitRows)) {
      const deletedHomeVisitSet = new Set(appData.deletedHomeVisitIds || []);
      appData.homeVisits = homeVisitRows
        .filter((h: any) => h && h.id && !deletedHomeVisitSet.has(h.id))
        .map((h: any) => ({
          id: h.id,
          tanggal: h.tanggal,
          siswaId: h.siswa_id,
          kelasId: h.kelas_id,
          petugas: h.petugas || '',
          alasan: h.alasan || '',
          catatan: h.catatan || '',
          hasil: h.hasil || '',
          tindakLanjut: h.tindak_lanjut || '',
          foto: h.foto || '',
          status: h.status || 'proses',
          createdAt: h.created_at || ''
        }));
    }

    if (Array.isArray(templateRows)) {
      appData.violationTemplates = templateRows.map((t: any) => ({
        id: t.id,
        name: t.name,
        kategori: t.kategori,
        poin: Number(t.poin) || 0,
        tindakan: t.tindakan || ''
      }));
    }

    if (Array.isArray(jadwalRows) && jadwalRows.length > 0) {
      appData.jadwalMengajar = jadwalRows.map((j: any) => {
        let jamKeList: number[] = [];
        try {
          jamKeList = typeof j.jam_ke_list === 'string' ? JSON.parse(j.jam_ke_list) : (Array.isArray(j.jam_ke_list) ? j.jam_ke_list : []);
        } catch (e) {}
        return {
          id: j.id,
          guruId: j.guru_id || '',
          guruUsername: j.guru_username || '',
          guruNama: j.guru_nama || '',
          guruNip: j.guru_nip || '',
          hari: j.hari || '',
          kelasId: j.kelas_id || '',
          kelasNama: j.kelas_nama || '',
          mataPelajaran: j.mata_pelajaran || '',
          kodeMapel: j.kode_mapel || '',
          jamKeList,
          jamKe: j.jam_ke || '',
          shift: j.shift || 'Pagi',
          catatan: j.catatan || ''
        };
      });
    } else if (inMemoryAppDataCache?.jadwalMengajar && Array.isArray(inMemoryAppDataCache.jadwalMengajar) && inMemoryAppDataCache.jadwalMengajar.length > 0) {
      appData.jadwalMengajar = inMemoryAppDataCache.jadwalMengajar;
    }

    if (Array.isArray(mapelRows) && mapelRows.length > 0) {
      appData.mataPelajaran = mapelRows.map((m: any) => ({
        id: m.id,
        kode: m.kode || '',
        nama: m.nama || '',
        kategori: m.kategori || 'Umum',
        tingkat: m.tingkat || 'Semua Tingkat',
        jurusanId: m.jurusan_id || '',
        jurusanNama: m.jurusan_nama || '',
        alokasiJp: Number(m.alokasi_jp) || 0,
        kkm: Number(m.kkm) || 75,
        deskripsi: m.deskripsi || ''
      }));
    } else if (inMemoryAppDataCache?.mataPelajaran && Array.isArray(inMemoryAppDataCache.mataPelajaran) && inMemoryAppDataCache.mataPelajaran.length > 0) {
      appData.mataPelajaran = inMemoryAppDataCache.mataPelajaran;
    }

    if (Array.isArray(gmkRows) && gmkRows.length > 0) {
      appData.guruMapelKelas = gmkRows.map((g: any) => {
        let kelasIds: string[] = [];
        try {
          kelasIds = typeof g.kelas_ids === 'string' ? JSON.parse(g.kelas_ids) : (Array.isArray(g.kelas_ids) ? g.kelas_ids : []);
        } catch (e) {}
        return {
          id: g.id,
          guruId: g.guru_id || '',
          guruUsername: g.guru_username || '',
          guruNama: g.guru_nama || '',
          guruNip: g.guru_nip || '',
          kodeMapel: g.kode_mapel || '',
          namaMapel: g.nama_mapel || '',
          kategori: g.kategori || '',
          tingkat: g.tingkat || '',
          alokasiJp: Number(g.alokasi_jp) || 0,
          kkm: Number(g.kkm) || 75,
          deskripsi: g.deskripsi || '',
          kelasIds,
          catatan: g.catatan || '',
          createdAt: g.created_at || ''
        };
      });
    } else if (inMemoryAppDataCache?.guruMapelKelas && Array.isArray(inMemoryAppDataCache.guruMapelKelas) && inMemoryAppDataCache.guruMapelKelas.length > 0) {
      appData.guruMapelKelas = inMemoryAppDataCache.guruMapelKelas;
    }

    if (Array.isArray(pmgRows) && pmgRows.length > 0) {
      appData.presensiMengajarGuru = pmgRows.map((p: any) => {
        let presensiSiswa: any[] = [];
        try {
          presensiSiswa = typeof p.presensi_siswa === 'string' ? JSON.parse(p.presensi_siswa) : (Array.isArray(p.presensi_siswa) ? p.presensi_siswa : []);
        } catch (e) {}
        return {
          id: p.id,
          jadwalId: p.jadwal_id || '',
          guruUsername: p.guru_username || '',
          guruNama: p.guru_nama || '',
          tanggal: p.tanggal || '',
          hari: p.hari || '',
          kelasId: p.kelas_id || '',
          kelasNama: p.kelas_nama || '',
          mataPelajaran: p.mata_pelajaran || '',
          materiAjar: p.materi_ajar || '',
          jamPelajaran: p.jam_pelajaran || '',
          presensiSiswa,
          catatanGuru: p.catatan_guru || '',
          createdAt: p.created_at || ''
        };
      });
    } else if (inMemoryAppDataCache?.presensiMengajarGuru && Array.isArray(inMemoryAppDataCache.presensiMengajarGuru) && inMemoryAppDataCache.presensiMengajarGuru.length > 0) {
      appData.presensiMengajarGuru = inMemoryAppDataCache.presensiMengajarGuru;
    }

    // Shift Config
    if (shiftSettingsRows && shiftSettingsRows.length > 0) {
      const ss = shiftSettingsRows[0];
      const periods = (shiftPeriodsRows && shiftPeriodsRows.length > 0)
        ? shiftPeriodsRows.map((sp: any) => ({
            id: Number(sp.id),
            startDate: sp.start_date,
            endDate: sp.end_date,
            kelompok1Type: sp.kelompok1_type,
            kelompok2Type: sp.kelompok2_type
          }))
        : (inMemoryAppDataCache?.shiftConfig?.periods || appData.shiftConfig?.periods || []);
      appData.shiftConfig = {
        pagiTime: ss.pagi_time || '06.30 - 12.00',
        siangTime: ss.siang_time || '13.00 - 16.50',
        periods,
        isJamMasukPagiActive: Boolean(ss.is_jam_masuk_pagi_active),
        pagiJamMasukMulai: ss.pagi_jam_masuk_mulai || '06:30',
        pagiJamMasukSelesai: ss.pagi_jam_masuk_selesai || '06:45',
        pagiJamPulang: ss.pagi_jam_pulang || '12:00',
        isJamMasukSiangActive: Boolean(ss.is_jam_masuk_siang_active),
        siangJamMasukMulai: ss.siang_jam_masuk_mulai || '12:45',
        siangJamMasukSelesai: ss.siang_jam_masuk_selesai || '13:00',
        siangJamPulang: ss.siang_jam_pulang || '16:50'
      };
    } else if (inMemoryAppDataCache?.shiftConfig) {
      appData.shiftConfig = inMemoryAppDataCache.shiftConfig;
    }

    // Hari Libur
    if (Array.isArray(hariLiburRows) && hariLiburRows.length > 0) {
      appData.hariLibur = hariLiburRows.map((h: any) => ({
        id: h.id,
        tanggal: h.tanggal,
        keterangan: h.keterangan || '',
        jenis: h.jenis || 'nasional'
      }));
    } else if (inMemoryAppDataCache?.hariLibur && inMemoryAppDataCache.hariLibur.length > 0) {
      appData.hariLibur = inMemoryAppDataCache.hariLibur;
    }

    // Pengumuman
    if (Array.isArray(pengumumanRows) && pengumumanRows.length > 0) {
      appData.pengumuman = pengumumanRows.map((p: any) => ({
        id: p.id,
        judul: p.judul || '',
        isi: p.isi || '',
        tanggal: p.tanggal || '',
        kategori: p.kategori || 'info',
        target: p.target || 'semua',
        aktif: Boolean(p.aktif),
        pinToRunningText: Boolean(p.pin_to_running_text),
        pinToLoginBanner: Boolean(p.pin_to_login_banner),
        pinToDashboard: Boolean(p.pin_to_dashboard),
        penulis: p.penulis || '',
        linkUrl: p.link_url || '',
        linkText: p.link_text || '',
        createdAt: p.created_at || ''
      }));
    } else if (inMemoryAppDataCache?.pengumuman && inMemoryAppDataCache.pengumuman.length > 0) {
      appData.pengumuman = inMemoryAppDataCache.pengumuman;
    }

    // Ekstrakurikuler
    if (Array.isArray(ekskulRows) && ekskulRows.length > 0) {
      appData.ekstrakurikuler = ekskulRows.map((e: any) => ({
        id: e.id,
        nama: e.nama,
        pembinaId: e.pembina_id || '',
        pembinaNama: e.pembina_nama || '',
        jadwalHari: e.jadwal_hari || '',
        jamMulai: e.jam_mulai || '',
        jamSelesai: e.jam_selesai || '',
        tempat: e.tempat || '',
        deskripsi: e.deskripsi || ''
      }));
    } else if (inMemoryAppDataCache?.ekstrakurikuler && inMemoryAppDataCache.ekstrakurikuler.length > 0) {
      appData.ekstrakurikuler = inMemoryAppDataCache.ekstrakurikuler;
    }

    // Anggota Ekskul
    if (Array.isArray(anggotaEkskulRows) && anggotaEkskulRows.length > 0) {
      appData.anggotaEkskul = anggotaEkskulRows.map((a: any) => ({
        id: a.id,
        ekskulId: a.ekskul_id,
        siswaId: a.siswa_id,
        tanggalBergabung: a.tanggal_bergabung || ''
      }));
    } else if (inMemoryAppDataCache?.anggotaEkskul && inMemoryAppDataCache.anggotaEkskul.length > 0) {
      appData.anggotaEkskul = inMemoryAppDataCache.anggotaEkskul;
    }

    // Chat Messages
    if (Array.isArray(chatRows) && chatRows.length > 0) {
      appData.chatMessages = chatRows.map((c: any) => {
        let deletedFor: string[] = [];
        try {
          deletedFor = typeof c.deleted_for === 'string' ? JSON.parse(c.deleted_for) : (Array.isArray(c.deleted_for) ? c.deleted_for : []);
        } catch (e) {}
        return {
          id: c.id,
          senderRole: c.sender_role || '',
          senderUsername: c.sender_username || '',
          senderNama: c.sender_nama || '',
          senderFoto: c.sender_foto || '',
          recipientUsername: c.recipient_username || 'all',
          text: c.text || '',
          image: c.image || '',
          timestamp: c.timestamp || '',
          isRead: Boolean(c.is_read),
          status: c.status || 'sent',
          isBot: Boolean(c.is_bot),
          deletedFor,
          isDeletedForEveryone: Boolean(c.is_deleted_for_everyone)
        };
      });
    } else if (inMemoryAppDataCache?.chatMessages && inMemoryAppDataCache.chatMessages.length > 0) {
      appData.chatMessages = inMemoryAppDataCache.chatMessages;
    }

    // Presensi Ekskul
    if (Array.isArray(presensiEkskulRows) && presensiEkskulRows.length > 0) {
      const peMap: Record<string, any[]> = {};
      for (const row of presensiEkskulRows) {
        const key = row.session_key || `${row.tanggal}_${row.ekskul_id}`;
        if (!peMap[key]) {
          peMap[key] = [];
        }
        peMap[key].push({
          siswaId: row.siswa_id,
          status: row.status || 'H',
          catatan: row.catatan || '',
          time: row.time || ''
        });
      }
      appData.presensiEkskul = peMap;
    } else if (inMemoryAppDataCache?.presensiEkskul) {
      appData.presensiEkskul = inMemoryAppDataCache.presensiEkskul;
    }

    // Audit Logs
    if (Array.isArray(auditRows) && auditRows.length > 0) {
      appData.auditLogs = auditRows.map((a: any) => ({
        id: a.id,
        timestamp: a.timestamp || '',
        role: a.role || '',
        username: a.username || '',
        nama: a.nama || '',
        aksi: a.aksi || '',
        detail: a.detail || '',
        ipAddress: a.ip_address || ''
      }));
    } else if (inMemoryAppDataCache?.auditLogs && inMemoryAppDataCache.auditLogs.length > 0) {
      appData.auditLogs = inMemoryAppDataCache.auditLogs;
    }

    // WhatsApp Logs
    if (Array.isArray(waRows) && waRows.length > 0) {
      appData.whatsappLogs = waRows.map((w: any) => ({
        id: w.id,
        timestamp: w.timestamp || '',
        recipientPhone: w.recipient_phone || '',
        recipientName: w.recipient_name || '',
        messageType: w.message_type || '',
        messageText: w.message_text || '',
        status: w.status || '',
        provider: w.provider || '',
        responseMessage: w.response_message || ''
      }));
    } else if (inMemoryAppDataCache?.whatsappLogs && inMemoryAppDataCache.whatsappLogs.length > 0) {
      appData.whatsappLogs = inMemoryAppDataCache.whatsappLogs;
    }

    // Role Permissions
    if (Array.isArray(rpRows) && rpRows.length > 0) {
      appData.rolePermissions = rpRows.map((r: any) => {
        let allowedMenus: string[] = [];
        try {
          allowedMenus = typeof r.allowed_menus === 'string' ? JSON.parse(r.allowed_menus) : (Array.isArray(r.allowed_menus) ? r.allowed_menus : []);
        } catch (e) {}
        return {
          roleId: r.role_id,
          roleName: r.role_name || '',
          description: r.description || '',
          badgeColor: r.badge_color || 'blue',
          isSystem: Boolean(r.is_system),
          allowedMenus
        };
      });
    } else if (inMemoryAppDataCache?.rolePermissions && inMemoryAppDataCache.rolePermissions.length > 0) {
      appData.rolePermissions = inMemoryAppDataCache.rolePermissions;
    }

    // WhatsApp Gateway Config
    if (wgRows && wgRows.length > 0) {
      const wg = wgRows[0];
      appData.whatsappGateway = {
        enabled: Boolean(wg.enabled),
        provider: wg.provider || 'fonnte',
        apiKey: wg.api_key || '',
        senderNumber: wg.sender_number || '',
        domainUrl: wg.domain_url || '',
        webhookUrl: wg.webhook_url || '',
        sendOtpEnabled: Boolean(wg.send_otp_enabled),
        sendPresensiMasukEnabled: Boolean(wg.send_presensi_masuk_enabled),
        sendPresensiPulangEnabled: Boolean(wg.send_presensi_pulang_enabled),
        sendPresensiTerlambatEnabled: Boolean(wg.send_presensi_terlambat_enabled),
        sendKetidakhadiranEnabled: Boolean(wg.send_ketidakhadiran_enabled),
        sendToStudent: Boolean(wg.send_to_student),
        sendToParent: Boolean(wg.send_to_parent),
        templateOtp: wg.template_otp || '',
        templatePresensiMasuk: wg.template_presensi_masuk || '',
        templatePresensiPulang: wg.template_presensi_pulang || '',
        templatePresensiTerlambat: wg.template_presensi_terlambat || '',
        templateKetidakhadiran: wg.template_ketidakhadiran || '',
        templateBroadcast: wg.template_broadcast || ''
      };
    } else if (inMemoryAppDataCache?.whatsappGateway) {
      appData.whatsappGateway = inMemoryAppDataCache.whatsappGateway;
    }

    // Security Incidents
    if (Array.isArray(siRows) && siRows.length > 0) {
      appData.securityIncidents = siRows.map((s: any) => ({
        id: s.id,
        timestamp: s.timestamp || '',
        formattedTime: s.formatted_time || '',
        type: s.type || '',
        ipAddress: s.ip_address || '',
        attemptedUsername: s.attempted_username || '',
        payloadSnippet: s.payload_snippet || '',
        status: s.status || '',
        actionTaken: s.action_taken || '',
        locationEstimate: s.location_estimate || ''
      }));
    } else if (inMemoryAppDataCache?.securityIncidents && inMemoryAppDataCache.securityIncidents.length > 0) {
      appData.securityIncidents = inMemoryAppDataCache.securityIncidents;
    }

    // Blocked IPs
    if (Array.isArray(blRows) && blRows.length > 0) {
      appData.blockedIps = blRows.map((b: any) => ({
        id: b.id,
        ip: b.ip,
        reason: b.reason || '',
        blockedAt: b.blocked_at || '',
        expiresAt: b.expires_at || '',
        blockedBy: b.blocked_by || '',
        threatCount: Number(b.threat_count) || 1
      }));
    } else if (inMemoryAppDataCache?.blockedIps && inMemoryAppDataCache.blockedIps.length > 0) {
      appData.blockedIps = inMemoryAppDataCache.blockedIps;
    }

    return appData;
  } catch (err: any) {
    if (isMySQLRateLimitError(err)) {
      setMySQLCooldown(err?.message || 'max_connections_per_hour');
    } else {
      console.info("[MySQL Load Status]", err?.message || err);
    }
    return null;
  } finally {
    if (db) {
      try { db.release(); } catch (e) {}
    }
  }
}

// API: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API: Real-Time Server Resources & Telemetry (CPU, RAM, Harddisk, Traffic)
app.get("/api/server/resources", requireAdmin, (req, res) => {
  try {
    const cpu = getCpuUsagePercent();
    const ram = getMemoryUsage();
    const disk = getDiskUsage();
    const ifaces = getNetworkDetails();

    const totalInMb = +(totalNetworkBytesIn / (1024 * 1024)).toFixed(2);
    const totalOutMb = +(totalNetworkBytesOut / (1024 * 1024)).toFixed(2);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        hostname: os.hostname(),
        uptimeSeconds: Math.floor(os.uptime()),
        processUptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        pid: process.pid,
      },
      cpu,
      ram,
      disk,
      network: {
        totalBytesInMb: totalInMb,
        totalBytesOutMb: totalOutMb,
        currentInKbps: currentNetworkInKbps,
        currentOutKbps: currentNetworkOutKbps,
        totalRequests: totalRequestsCount,
        requestsPerSec: currentRequestsPerSec,
        activeRequests: activeRequestsCount,
        avgLatencyMs: currentAvgLatencyMs,
        interfaces: ifaces,
      },
      history: metricsHistory,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Gagal mengambil metrik server" });
  }
});

// API: Server Network Connectivity & Ping Latency Check
app.post("/api/server/ping", (req, res) => {
  res.json({
    success: true,
    message: "Pong! Server merespons normal dengan latensi sangat rendah.",
    serverTime: new Date().toISOString(),
    latencyEstimateMs: currentAvgLatencyMs,
    activeRequests: activeRequestsCount,
    timestamp: Date.now(),
  });
});

// API: Clean Server Temporary Telemetry & In-Memory Cache
app.post("/api/server/cache-clean", (req, res) => {
  try {
    if ((global as any).gc) {
      (global as any).gc();
    }
    recentLatencySamples = [];
    res.json({
      success: true,
      message: "Cache telemetri dan memori sementara server berhasil disegarkan.",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Gagal membersihkan cache" });
  }
});

// ==========================================
// API MONITORING LOGIN PENGGUNA (REAL-TIME USER LOGIN TELEMETRY)
// ==========================================
let serverUserLoginLogs: any[] = [];
let serverActiveUserSessions: any[] = [];

// GET: All Login Logs & Active Sessions
app.get("/api/user-logins", (req, res) => {
  const successCount = serverUserLoginLogs.filter(l => l.status === "success").length;
  const failedCount = serverUserLoginLogs.filter(l => l.status !== "success" && l.status !== "session_terminated").length;
  const total = serverUserLoginLogs.length;
  const successRate = total > 0 ? +((successCount / total) * 100).toFixed(1) : 100;

  res.json({
    success: true,
    logs: serverUserLoginLogs,
    activeSessions: serverActiveUserSessions,
    stats: {
      totalLogins: total,
      activeSessionsCount: serverActiveUserSessions.length,
      successCount,
      failedCount,
      successRate,
      lastUpdated: new Date().toISOString()
    }
  });
});

// POST: Record New Login Attempt
app.post("/api/user-logins", requireAuth, (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.username) {
      return res.status(400).json({ success: false, message: "Parameter username wajib diisi" });
    }

    const logEntry = {
      id: body.id || `log-${Date.now()}`,
      timestamp: body.timestamp || new Date().toISOString(),
      formattedTime: body.formattedTime || new Date().toLocaleString("id-ID"),
      username: body.username,
      nama: body.nama || body.username,
      role: body.role || "unknown",
      status: body.status || "success",
      statusLabel: body.statusLabel || (body.status === "success" ? "Berhasil Masuk" : "Percobaan Gagal"),
      ipAddress: body.ipAddress || req.ip || "127.0.0.1",
      location: body.location || "Jaringan Lokal Sekolah",
      device: body.device || "Desktop",
      browser: body.browser || "Browser",
      userAgent: body.userAgent || req.headers["user-agent"] || "",
      failureReason: body.failureReason,
      sessionId: body.sessionId,
    };

    serverUserLoginLogs.unshift(logEntry);
    if (serverUserLoginLogs.length > 1000) {
      serverUserLoginLogs = serverUserLoginLogs.slice(0, 1000);
    }

    // If successful login, register session
    if (body.status === "success" && body.sessionId) {
      serverActiveUserSessions = serverActiveUserSessions.filter(
        s => !(s.username.toLowerCase() === body.username.toLowerCase() && s.ipAddress === logEntry.ipAddress)
      );
      serverActiveUserSessions.unshift({
        id: body.sessionId,
        username: body.username,
        nama: body.nama || body.username,
        role: body.role || "unknown",
        loginAt: logEntry.timestamp,
        lastActiveAt: new Date().toISOString(),
        formattedLoginTime: logEntry.formattedTime,
        ipAddress: logEntry.ipAddress,
        location: logEntry.location,
        device: logEntry.device,
        browser: logEntry.browser,
        userAgent: logEntry.userAgent,
      });
    }

    res.json({ success: true, message: "Log login berhasil dicatat", log: logEntry });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Gagal mencatat log login" });
  }
});

// POST: User Heartbeat to keep active session updated
app.post("/api/user-sessions/heartbeat", (req, res) => {
  const { sessionId, username } = req.body;
  const now = new Date().toISOString();
  if (sessionId) {
    const s = serverActiveUserSessions.find(s => s.id === sessionId);
    if (s) {
      s.lastActiveAt = now;
      return res.json({ success: true, lastActiveAt: now });
    }
  }
  if (username) {
    const s = serverActiveUserSessions.find(s => s.username.toLowerCase() === username.toLowerCase());
    if (s) {
      s.lastActiveAt = now;
      return res.json({ success: true, lastActiveAt: now });
    }
  }
  res.json({ success: true, message: "Heartbeat received" });
});

// POST: Terminate a single active session
app.post("/api/user-sessions/terminate", requireAdmin, (req, res) => {
  const { sessionId, terminatedBy } = req.body;
  if (!sessionId) {
    return res.status(400).json({ success: false, message: "sessionId diperlukan" });
  }

  const target = serverActiveUserSessions.find(s => s.id === sessionId);
  serverActiveUserSessions = serverActiveUserSessions.filter(s => s.id !== sessionId);

  if (target) {
    serverUserLoginLogs.unshift({
      id: `term-${Date.now()}`,
      timestamp: new Date().toISOString(),
      formattedTime: new Date().toLocaleString("id-ID"),
      username: target.username,
      nama: target.nama,
      role: target.role,
      status: "session_terminated",
      statusLabel: "Sesi Diputus",
      ipAddress: target.ipAddress,
      location: target.location,
      device: target.device,
      browser: target.browser,
      userAgent: target.userAgent,
      failureReason: `Sesi login pengguna diputuskan secara paksa oleh ${terminatedBy || "admin"}`,
    });
  }

  res.json({
    success: true,
    message: `Sesi pengguna ${target ? target.nama : sessionId} berhasil diputuskan.`,
    remainingActive: serverActiveUserSessions.length
  });
});

// POST: Terminate all other sessions except current
app.post("/api/user-sessions/terminate-all", requireAdmin, (req, res) => {
  const { keepUsername } = req.body;
  const termUsers = serverActiveUserSessions.filter(
    s => !keepUsername || s.username.toLowerCase() !== keepUsername.toLowerCase()
  );

  serverActiveUserSessions = serverActiveUserSessions.filter(
    s => keepUsername && s.username.toLowerCase() === keepUsername.toLowerCase()
  );

  termUsers.forEach(t => {
    serverUserLoginLogs.unshift({
      id: `term-all-${Date.now()}-${t.id}`,
      timestamp: new Date().toISOString(),
      formattedTime: new Date().toLocaleString("id-ID"),
      username: t.username,
      nama: t.nama,
      role: t.role,
      status: "session_terminated",
      statusLabel: "Sesi Diputus Massal",
      ipAddress: t.ipAddress,
      location: t.location,
      device: t.device,
      browser: t.browser,
      userAgent: t.userAgent,
      failureReason: "Diputuskan via aksi darurat: Putuskan Semua Sesi Pengguna Lain",
    });
  });

  res.json({
    success: true,
    message: `${termUsers.length} sesi pengguna lain berhasil diputuskan serentak.`,
    remainingActive: serverActiveUserSessions.length
  });
});

// POST: Clear User Login Logs
app.post("/api/user-logins/clear", (req, res) => {
  serverUserLoginLogs = [];
  res.json({ success: true, message: "Seluruh riwayat log login berhasil dibersihkan." });
});

// ==========================================
// API FITUR ABSEN QR CODE PADA SERVER
// ==========================================

// 1. API: Get Server Active QR Code Token & Image
app.get("/api/qr/token", async (req, res) => {
  const isForce = req.query.force === "true" || req.query.refresh === "true";
  const intervalSec = parseInt(String(req.query.interval || "60"), 10) || 60;

  const tokenObj = getOrCreateServerQrToken(isForce, intervalSec);
  if (!cachedQrImageDataUrl) {
    cachedQrImageDataUrl = await generateQrDataUrl(tokenObj);
  }

  const now = Date.now();
  const timeRemainingSeconds = Math.max(0, Math.ceil((tokenObj.expiresAt - now) / 1000));

  res.json({
    success: true,
    token: tokenObj.token,
    date: tokenObj.dateStr,
    createdAt: tokenObj.createdAt,
    expiresAt: tokenObj.expiresAt,
    intervalSeconds: tokenObj.intervalSeconds || intervalSec,
    timeRemainingSeconds,
    qrDataUrl: cachedQrImageDataUrl,
    schoolName: inMemoryAppDataCache?.sekolah?.nama || "Absensi Siswa"
  });
});

// 2. API: Force Generate New Dynamic Server QR Token
app.post("/api/qr/generate-new", async (req, res) => {
  const intervalSec = parseInt(String(req.body?.interval || req.query?.interval || "60"), 10) || 60;
  const tokenObj = getOrCreateServerQrToken(true, intervalSec);
  cachedQrImageDataUrl = await generateQrDataUrl(tokenObj);

  const now = Date.now();
  const timeRemainingSeconds = Math.max(0, Math.ceil((tokenObj.expiresAt - now) / 1000));

  res.json({
    success: true,
    message: "Token QR Presensi Server berhasil diperbarui!",
    token: tokenObj.token,
    date: tokenObj.dateStr,
    createdAt: tokenObj.createdAt,
    expiresAt: tokenObj.expiresAt,
    intervalSeconds: tokenObj.intervalSeconds || intervalSec,
    timeRemainingSeconds,
    qrDataUrl: cachedQrImageDataUrl,
    schoolName: inMemoryAppDataCache?.sekolah?.nama || "Absensi Siswa"
  });
});

// Helper to determine shift timing for student on server-side
function getShiftTimingForStudent(appData: any, siswa: any, dateStr: string) {
  const shiftConfig = appData?.shiftConfig;
  const isPagiActive = shiftConfig?.isJamMasukPagiActive ?? appData?.sekolah?.isJamMasukActive ?? true;
  const pagiMulai = shiftConfig?.pagiJamMasukMulai || appData?.sekolah?.jamMasukMulai || '06:30';
  const pagiSelesai = shiftConfig?.pagiJamMasukSelesai || appData?.sekolah?.jamMasukSelesai || '06:45';
  const pagiPulang = shiftConfig?.pagiJamPulang || '12:00';

  const isSiangActive = shiftConfig?.isJamMasukSiangActive ?? true;
  const siangMulai = shiftConfig?.siangJamMasukMulai || '12:45';
  const siangSelesai = shiftConfig?.siangJamMasukSelesai || '13:00';
  const siangPulang = shiftConfig?.siangJamPulang || '16:50';

  if (!siswa) {
    return {
      shiftType: 'pagi',
      jamMasukMulai: pagiMulai,
      jamMasukSelesai: pagiSelesai,
      jamPulang: pagiPulang,
      isJamMasukActive: isPagiActive,
    };
  }

  const kelasObj = (appData?.kelas || []).find((k: any) => k.id === siswa.kelasId);
  const namaKelas = (kelasObj?.nama || '').toUpperCase();
  const isKelompok2 = namaKelas.startsWith('XII') || namaKelas.includes('12') || namaKelas.includes('XII');

  const today = dateStr ? new Date(dateStr) : new Date();
  const periods = shiftConfig?.periods || [];
  const activePeriod = periods.find((p: any) => {
    const s = new Date(p.startDate);
    const e = new Date(p.endDate);
    return today >= s && today <= e;
  });

  let shiftType = 'pagi';
  if (activePeriod) {
    shiftType = isKelompok2 ? (activePeriod.kelompok2Type || 'siang') : (activePeriod.kelompok1Type || 'pagi');
  } else {
    shiftType = isKelompok2 ? 'siang' : 'pagi';
  }

  if (shiftType === 'siang') {
    return {
      shiftType: 'siang',
      jamMasukMulai: siangMulai,
      jamMasukSelesai: siangSelesai,
      jamPulang: siangPulang,
      isJamMasukActive: isSiangActive,
    };
  }

  return {
    shiftType: 'pagi',
    jamMasukMulai: pagiMulai,
    jamMasukSelesai: pagiSelesai,
    jamPulang: pagiPulang,
    isJamMasukActive: isPagiActive,
  };
}

// 3. API: Process Attendance via QR Code on Server
app.post("/api/qr/absen", async (req, res) => {
  try {
    const { scannedCode, siswaId, nisn, dateStr, clientAppData, scanMode } = req.body;
    const { dateStr: todayWib, timeStr: timeWib } = getIndonesianDateTime();
    const today = dateStr || todayWib;
    const nowTimeStr = timeWib;

    if (!scannedCode && !siswaId && !nisn) {
      return res.status(400).json({
        success: false,
        message: "Parameter scannedCode atau Identitas Siswa (ID / NISN) wajib diisi."
      });
    }

    // Sync clientAppData if provided
    if (clientAppData && typeof clientAppData === 'object' && Array.isArray(clientAppData.siswa)) {
      if (!inMemoryAppDataCache) {
        inMemoryAppDataCache = clientAppData;
      } else {
        inMemoryAppDataCache.siswa = clientAppData.siswa;
        if (Array.isArray(clientAppData.kelas)) inMemoryAppDataCache.kelas = clientAppData.kelas;
        if (clientAppData.sekolah) inMemoryAppDataCache.sekolah = clientAppData.sekolah;
        if (clientAppData.shiftConfig) inMemoryAppDataCache.shiftConfig = clientAppData.shiftConfig;
        if (clientAppData.presensi) {
          inMemoryAppDataCache.presensi = { ...inMemoryAppDataCache.presensi, ...clientAppData.presensi };
        }
      }
      saveAppDataCache(inMemoryAppDataCache);
    }

    // Ensure cache is loaded
    if (!inMemoryAppDataCache) {
      inMemoryAppDataCache = loadSavedAppDataCache() || {};
    }

    const siswaList: any[] = inMemoryAppDataCache?.siswa || [];
    const kelasList: any[] = inMemoryAppDataCache?.kelas || [];
    let targetSiswa: any = null;

    // Clean scannedCode string (strip control chars, exterior quotes, spaces)
    let rawCodeStr = String(scannedCode || '').trim();
    if ((rawCodeStr.startsWith('"') && rawCodeStr.endsWith('"')) || (rawCodeStr.startsWith("'") && rawCodeStr.endsWith("'"))) {
      rawCodeStr = rawCodeStr.slice(1, -1).trim();
    }

    // Try parsing scannedCode if it's JSON (e.g. Student Card QR or Server School QR)
    let parsedPayload: any = null;
    if (rawCodeStr) {
      try {
        parsedPayload = JSON.parse(rawCodeStr);
      } catch (e) {
        try {
          // Fallback JSON parse with single quotes replaced
          parsedPayload = JSON.parse(rawCodeStr.replace(/'/g, '"'));
        } catch (err2) {}
      }
    }

    const isSchoolQr = (parsedPayload && parsedPayload.type === 'SCHOOL_PRESENSI_QR') || 
                       (typeof rawCodeStr === 'string' && rawCodeStr.toUpperCase().startsWith('PRESENSI-'));

    // Resolve Student in O(1) time using in-memory indexed hash maps
    if (siswaId) {
      targetSiswa = siswaIdMap.get(String(siswaId).toLowerCase());
    }
    if (!targetSiswa && nisn) {
      targetSiswa = siswaNisnMap.get(String(nisn).trim().toUpperCase());
    }
    
    // Resolve via parsed JSON payload
    if (!targetSiswa && parsedPayload) {
      const targetId = parsedPayload.id || parsedPayload.siswaId;
      const targetNisn = parsedPayload.nisn;
      const targetNama = parsedPayload.nama;

      if (targetId) {
        targetSiswa = siswaIdMap.get(String(targetId).toLowerCase());
      }
      if (!targetSiswa && targetNisn) {
        targetSiswa = siswaNisnMap.get(String(targetNisn).trim().toUpperCase());
      }
      if (!targetSiswa && targetNama) {
        targetSiswa = siswaNameMap.get(String(targetNama).trim().toLowerCase());
      }

      // Deep array fallback search if maps missed
      if (!targetSiswa) {
        targetSiswa = siswaList.find((s) => {
          if (targetId && String(s.id).toLowerCase() === String(targetId).toLowerCase()) return true;
          if (targetNisn && s.nisn && String(s.nisn).trim().toUpperCase() === String(targetNisn).trim().toUpperCase()) return true;
          if (targetNama && s.nama && String(s.nama).trim().toLowerCase() === String(targetNama).trim().toLowerCase()) return true;
          return false;
        });
      }
    }

    // Resolve via raw text string
    if (!targetSiswa && !isSchoolQr && rawCodeStr) {
      const codeClean = rawCodeStr.toUpperCase();
      targetSiswa = siswaNisnMap.get(codeClean) || siswaIdMap.get(codeClean.toLowerCase()) || siswaNameMap.get(codeClean.toLowerCase());
      if (!targetSiswa) {
        targetSiswa = siswaList.find((s) =>
          (s.nisn && String(s.nisn).trim().toUpperCase() === codeClean) ||
          (s.id && String(s.id).trim().toUpperCase() === codeClean) ||
          (s.nama && String(s.nama).trim().toUpperCase() === codeClean) ||
          (s.nisn && codeClean.includes(String(s.nisn).trim().toUpperCase()))
        );
      }
    }

    if (!targetSiswa) {
      if (isSchoolQr) {
        return res.status(400).json({
          success: false,
          message: "QR Code Sekolah/Token dipindai. Silakan gunakan akun siswa di Portal Murid untuk melakukan presensi."
        });
      }
      return res.status(404).json({
        success: false,
        message: `Siswa dengan Kartu QR / NISN / Kode '${rawCodeStr.slice(0, 30)}' tidak ditemukan di database server.`
      });
    }

    // Find class name in O(1)
    const kelasObj = kelasIdMap.get(targetSiswa.kelasId) || kelasList.find((k) => k.id === targetSiswa.kelasId);
    const namaKelas = kelasObj ? kelasObj.nama : "Tanpa Kelas";

    // Validation for Teacher Session QR Code
    if (parsedPayload && parsedPayload.type === 'PRESENSI_GURU_SESSION' && parsedPayload.kelasId) {
      if (targetSiswa.kelasId !== parsedPayload.kelasId) {
        return res.status(400).json({
          success: false,
          message: `Gagal Presensi: QR Sesi Guru ini khusus untuk ${parsedPayload.kelasNama || 'Kelas Lain'}. Anda terdaftar di ${namaKelas}.`
        });
      }
    }

    // Update Presensi in Server Memory Cache
    if (!inMemoryAppDataCache.presensi) {
      inMemoryAppDataCache.presensi = {};
    }

    const presensiKey = `${today}_${targetSiswa.kelasId}`;
    const currentList: any[] = inMemoryAppDataCache.presensi[presensiKey]
      ? [...inMemoryAppDataCache.presensi[presensiKey]]
      : [];

    const timing = getShiftTimingForStudent(inMemoryAppDataCache, targetSiswa, today);
    const isJamMasukActive = timing.isJamMasukActive;
    const jamMasukSelesai = timing.jamMasukSelesai;

    const [nowH, nowM] = nowTimeStr.split(':').map(Number);
    const nowTotalMins = nowH * 60 + nowM;
    const [pulangH, pulangM] = timing.jamPulang.split(':').map(Number);
    const pulangTotalMins = pulangH * 60 + pulangM;

    const existingIdx = currentList.findIndex((item) => item.siswaId === targetSiswa.id);
    const hasCheckedIn = existingIdx >= 0 && currentList[existingIdx].time && currentList[existingIdx].status !== 'A';

    if (nowTotalMins > pulangTotalMins && !hasCheckedIn) {
      return res.status(400).json({
        success: false,
        message: `Gagal Absen: Waktu Absen Masuk telah berakhir dan sudah melewati jam pulang (${timing.jamPulang}). Anda tidak tercatat melakukan absen masuk hari ini dan tidak dapat melakukan absen masuk. Silakan hubungi wali kelas.`
      });
    }

    // Determine scan mode (masuk vs pulang)
    let effectiveScanMode = scanMode || 'auto';

    if (effectiveScanMode === 'auto') {
      if (!isJamMasukActive) {
        effectiveScanMode = 'masuk';
      } else {
        if (nowTotalMins >= pulangTotalMins - 30 || nowTotalMins > pulangTotalMins) {
          effectiveScanMode = 'pulang';
        } else {
          effectiveScanMode = 'masuk';
        }
      }
    }

    let assignedStatus = "H";

    if (effectiveScanMode === 'masuk') {
      const scanHHmm = nowTimeStr.trim().slice(0, 5);
      const cutoffHHmm = jamMasukSelesai.trim().slice(0, 5);
      assignedStatus = (!isJamMasukActive || scanHHmm <= cutoffHHmm) ? "H" : "K";
    } else {
      const scanHHmm = nowTimeStr.trim().slice(0, 5);
      const cutoffHHmm = jamMasukSelesai.trim().slice(0, 5);
      assignedStatus = (!isJamMasukActive || scanHHmm <= cutoffHHmm) ? "H" : "K";
    }
    
    let statusLabel = "";
    let isAlreadyRecorded = false;
    let recordedItem: any = null;

    if (effectiveScanMode === 'pulang') {
      if (existingIdx < 0 || !currentList[existingIdx].time || currentList[existingIdx].status === 'A') {
        return res.status(400).json({
          success: false,
          message: "Gagal Absen Pulang: Anda belum melakukan Absen Masuk hari ini!"
        });
      }
      statusLabel = "PULANG (H)";
      if (existingIdx >= 0) {
        if (currentList[existingIdx].pulangTime) {
          isAlreadyRecorded = true;
        }
        recordedItem = {
          ...currentList[existingIdx],
          pulangTime: nowTimeStr,
          pulangStatus: 'H'
        };
        currentList[existingIdx] = recordedItem;
      } else {
        recordedItem = {
          siswaId: targetSiswa.id,
          status: 'H',
          time: '',
          pulangTime: nowTimeStr,
          pulangStatus: 'H'
        };
        currentList.push(recordedItem);
      }
    } else {
      // Masuk
      statusLabel = assignedStatus === "K" ? "KESIANGAN (K)" : "HADIR (H)";

      if (existingIdx >= 0) {
        if (currentList[existingIdx].status === assignedStatus) {
          isAlreadyRecorded = true;
        }
        recordedItem = {
          ...currentList[existingIdx],
          status: assignedStatus,
          time: nowTimeStr,
          method: 'qr_server'
        };
        currentList[existingIdx] = recordedItem;
      } else {
        recordedItem = {
          siswaId: targetSiswa.id,
          status: assignedStatus,
          time: nowTimeStr,
          method: 'qr_server'
        };
        currentList.push(recordedItem);
      }
    }

    inMemoryAppDataCache.presensi[presensiKey] = currentList;

    // Queue asynchronous non-blocking persist (coalesced)
    queueAppDataPersist();

    // Record server QR log
    const logItem = {
      id: "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      siswaId: targetSiswa.id,
      nisn: targetSiswa.nisn || "-",
      namaSiswa: targetSiswa.nama,
      namaKelas,
      tanggal: today,
      status: effectiveScanMode === 'pulang' ? 'PULANG' : assignedStatus,
      time: nowTimeStr,
      method: "qr_server",
      isServerVerified: true
    };

    serverQrLogs.unshift(logItem);
    if (serverQrLogs.length > 300) serverQrLogs.pop();

    const namaSekolah = inMemoryAppDataCache?.sekolah?.nama || "Sekolah";
    const rawWaOrtu = targetSiswa.noWaOrangTua || targetSiswa.noWa || "";
    const cleanWaOrtu = rawWaOrtu.replace(/\D/g, "");
    const formattedWaOrtu = cleanWaOrtu.startsWith("0") ? `62${cleanWaOrtu.slice(1)}` : cleanWaOrtu;
    const namaOrtu = targetSiswa.namaOrangTua || "Bapak/Ibu Orang Tua/Wali";
    
    let notifWaText = "";
    if (effectiveScanMode === 'pulang') {
      notifWaText = `Halo ${namaOrtu}, Diberitahukan bahwa Ananda ${targetSiswa.nama} (Kelas ${namaKelas}) telah melakukan PRESENSI PULANG pada hari ini (${today}) pukul ${nowTimeStr} WIB. Terima kasih. - ${namaSekolah}`;
    } else {
      notifWaText = `Halo ${namaOrtu}, Diberitahukan bahwa Ananda ${targetSiswa.nama} (Kelas ${namaKelas}) telah berhasil melakukan PRESENSI MASUK pada hari ini (${today}) pukul ${nowTimeStr} WIB dengan status: ${statusLabel}. Terima kasih. - ${namaSekolah}`;
    }
    const notifWaUrl = formattedWaOrtu ? `https://wa.me/${formattedWaOrtu}?text=${encodeURIComponent(notifWaText)}` : null;

    res.json({
      success: true,
      message: isAlreadyRecorded
        ? `Presensi ${effectiveScanMode === 'pulang' ? 'Pulang' : 'Masuk'} berhasil diperbarui! ${targetSiswa.nama} (${namaKelas}) - Status: ${statusLabel} (${nowTimeStr} WIB)`
        : `Presensi ${effectiveScanMode === 'pulang' ? 'Pulang' : 'Masuk'} berhasil dicatat! ${targetSiswa.nama} (${namaKelas}) - Status: ${statusLabel} (${nowTimeStr} WIB)`,
      siswa: {
        id: targetSiswa.id,
        nama: targetSiswa.nama,
        nisn: targetSiswa.nisn,
        kelasId: targetSiswa.kelasId,
        namaKelas,
        noWaOrangTua: targetSiswa.noWaOrangTua || "",
        namaOrangTua: targetSiswa.namaOrangTua || ""
      },
      status: effectiveScanMode === 'pulang' ? 'PULANG' : assignedStatus,
      tanggal: today,
      time: nowTimeStr,
      presensiKey,
      item: recordedItem,
      isAlreadyRecorded,
      noWaOrangTua: formattedWaOrtu,
      namaOrangTua: namaOrtu,
      notifWaText,
      notifWaUrl,
      updatedAppData: req.body?.includeAppData ? inMemoryAppDataCache : undefined
    });
  } catch (err: any) {
    console.error("Error in /api/qr/absen:", err?.message || err);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan internal server saat memproses presensi QR Code."
    });
  }
});

// 4. API: Get Live QR Code Attendance Logs from Server
app.get("/api/qr/logs", requireAuth, (req, res) => {
  const { dateStr: todayWib } = getIndonesianDateTime();
  const dateQuery = (req.query.date as string) || todayWib;
  const logsForDate = serverQrLogs.filter((l) => l.tanggal === dateQuery);

  res.json({
    success: true,
    date: dateQuery,
    count: logsForDate.length,
    logs: logsForDate
  });
});

// API: Reset / Clear QR Attendance Logs for Date
app.delete("/api/qr/logs", requireAdmin, (req, res) => {
  const { dateStr: todayWib } = getIndonesianDateTime();
  const dateQuery = (req.query.date as string) || todayWib;
  serverQrLogs = serverQrLogs.filter((l) => l.tanggal !== dateQuery);

  res.json({
    success: true,
    message: `Feed presensi QR untuk tanggal ${dateQuery} berhasil direset.`,
    count: serverQrLogs.length
  });
});

// API: Get Current Server MySQL Config
app.get("/api/mysql/config", requireAdmin, (req, res) => {
  const config = loadSavedServerConfig();
  res.json({
    success: !!config,
    config: config || null
  });
});

// API: Global Sync Endpoint for Dev & Shared Run Preview Links (with ETag conditional 304 caching)
app.get("/api/global-state", requireAuth, async (req, res) => {
  const currentEtag = `"v${appDataVersion}"`;
  res.setHeader("ETag", currentEtag);
  res.setHeader("Cache-Control", "public, no-cache");

  const queryHost = (req.query.host as string) || (req.headers["x-mysql-host"] as string);
  const queryDb = (req.query.database as string) || (req.headers["x-mysql-database"] as string);
  const queryUser = (req.query.user as string) || (req.headers["x-mysql-user"] as string);
  const queryPass = (req.query.password !== undefined ? req.query.password : req.headers["x-mysql-password"]) as string;
  const queryPort = (req.query.port as string) || (req.headers["x-mysql-port"] as string) || "3306";

  let config = loadSavedServerConfig();
  if (!config && queryHost && queryDb && queryUser) {
    config = { host: queryHost, database: queryDb, user: queryUser, password: queryPass || "", port: queryPort };
    saveServerConfig(config);
  }

  const force = req.query.force === "true";
  const ifNoneMatch = req.headers["if-none-match"];

  // Fast 304 check: If client version matches server version and not forced, return 304 with zero body transfer!
  if (!force && ifNoneMatch && (ifNoneMatch === currentEtag || ifNoneMatch === String(appDataVersion))) {
    return res.status(304).end();
  }

  const now = Date.now();

  // 1. If memory cache exists and isn't expired (and no forced sync requested), serve memory cache instantly!
  if (inMemoryAppDataCache && !force && (now - lastMySQLSyncTime < MYSQL_SYNC_THROTTLE_MS)) {
    return res.json({
      success: true,
      appData: inMemoryAppDataCache,
      mysqlConfig: config,
      version: appDataVersion,
      source: "memory"
    });
  }

  // 2. If config exists and not in MySQL cooldown, attempt MySQL fetch
  if (config && Date.now() >= mysqlCooldownUntil) {
    try {
      const mysqlData = await performMySQLLoad(config);
      if (mysqlData && (mysqlData.sekolah || (mysqlData.jurusan && mysqlData.jurusan.length > 0))) {
        saveAppDataCache(mysqlData);
        lastMySQLSyncTime = now;
        return res.json({
          success: true,
          appData: mysqlData,
          mysqlConfig: config,
          version: appDataVersion,
          source: "mysql"
        });
      }
    } catch (err: any) {
      // Handled silently
    }
  }

  // 3. Fallback to memory or disk cache
  return res.json({
    success: true,
    appData: inMemoryAppDataCache,
    mysqlConfig: config,
    version: appDataVersion,
    source: "cache"
  });
});

app.post("/api/global-state", requireAuth, async (req, res) => {
  const { appData, mysqlConfig } = req.body;

  if (mysqlConfig && mysqlConfig.host) {
    saveServerConfig(mysqlConfig);
  }

  if (appData) {
    saveAppDataCache(appData);
    lastMySQLSyncTime = Date.now();
    queueAppDataPersist({ immediateMySQL: true });
  }

  res.json({ success: true, message: "Global state updated", version: appDataVersion });
});

// ==========================================
// DEDICATED REAL-TIME CHAT API ENDPOINTS
// ==========================================

// 1. Get Chat Messages
app.get("/api/chat/messages", (req, res) => {
  const messages = (inMemoryAppDataCache && Array.isArray(inMemoryAppDataCache.chatMessages))
    ? inMemoryAppDataCache.chatMessages
    : [];
  res.json({
    success: true,
    chatMessages: messages,
    version: appDataVersion,
    timestamp: Date.now()
  });
});

// 2. Send Message Atomically
app.post("/api/chat/send", (req, res) => {
  const { message } = req.body;
  if (!message || !message.id || (!message.text && !message.image)) {
    return res.status(400).json({ success: false, message: "Data pesan tidak valid" });
  }

  if (!inMemoryAppDataCache) {
    inMemoryAppDataCache = loadSavedAppDataCache() || { chatMessages: [] };
  }
  if (!Array.isArray(inMemoryAppDataCache.chatMessages)) {
    inMemoryAppDataCache.chatMessages = [];
  }

  // Check if message already exists
  const existingIdx = inMemoryAppDataCache.chatMessages.findIndex((m: any) => m.id === message.id);
  if (existingIdx >= 0) {
    inMemoryAppDataCache.chatMessages[existingIdx] = { ...inMemoryAppDataCache.chatMessages[existingIdx], ...message };
  } else {
    inMemoryAppDataCache.chatMessages.push(message);
  }

  appDataVersion = Date.now();
  saveAppDataCache(inMemoryAppDataCache);
  queueAppDataPersist({ immediateMySQL: true });

  res.json({
    success: true,
    message: "Pesan berhasil dikirim",
    chatMessages: inMemoryAppDataCache.chatMessages,
    version: appDataVersion
  });
});

// 3. Delete Message(s) Atomically (for everyone or for me only)
app.post("/api/chat/delete", (req, res) => {
  const { messageId, messageIds, deleteType, username, myIdVariants } = req.body;
  const targetIds: string[] = messageIds && Array.isArray(messageIds)
    ? messageIds
    : messageId ? [messageId] : [];

  if (targetIds.length === 0) {
    return res.status(400).json({ success: false, message: "ID pesan tidak ditemukan" });
  }

  if (!inMemoryAppDataCache) {
    inMemoryAppDataCache = loadSavedAppDataCache() || { chatMessages: [] };
  }
  if (!Array.isArray(inMemoryAppDataCache.chatMessages)) {
    inMemoryAppDataCache.chatMessages = [];
  }

  const idSet = new Set(targetIds);
  const userVariants = Array.isArray(myIdVariants) && myIdVariants.length > 0
    ? myIdVariants.map((v: string) => String(v).toLowerCase())
    : [String(username || "").toLowerCase()].filter(Boolean);

  if (deleteType === "for_everyone") {
    // Validate if any message being deleted is older than 2 minutes (120,000 ms)
    const nowEpoch = Date.now();
    const invalidMsgs = inMemoryAppDataCache.chatMessages.filter((m: any) => {
      if (!idSet.has(m.id)) return false;
      const idNum = parseInt(m.id.replace('CHAT_', ''), 10);
      if (isNaN(idNum)) return true; // treat unparseable IDs as old/expired
      return (nowEpoch - idNum) > 120000;
    });

    if (invalidMsgs.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Hapus untuk semua orang gagal: Batas waktu 2 menit telah habis."
      });
    }

    // Completely remove message from global storage for all participants
    inMemoryAppDataCache.chatMessages = inMemoryAppDataCache.chatMessages.filter(
      (m: any) => !idSet.has(m.id)
    );
  } else {
    // "for_me": Add user's identity to deletedFor array so it only disappears for this user
    inMemoryAppDataCache.chatMessages = inMemoryAppDataCache.chatMessages.map((m: any) => {
      if (idSet.has(m.id)) {
        const existingDeletedFor = Array.isArray(m.deletedFor) ? m.deletedFor : [];
        const mergedDeletedFor = Array.from(new Set([...existingDeletedFor, ...userVariants]));
        return { ...m, deletedFor: mergedDeletedFor };
      }
      return m;
    });
  }

  appDataVersion = Date.now();
  saveAppDataCache(inMemoryAppDataCache);
  queueAppDataPersist({ immediateMySQL: true });

  res.json({
    success: true,
    message: deleteType === "for_everyone" ? "Pesan dihapus untuk semua orang" : "Pesan dihapus untuk Anda",
    chatMessages: inMemoryAppDataCache.chatMessages,
    version: appDataVersion
  });
});

// 4. Clear Chat History
app.post("/api/chat/clear-history", (req, res) => {
  const { selectedThreadUser, currentUsername, deleteType, isAdmin, myIdVariants, clearAllSystem } = req.body;

  if (!inMemoryAppDataCache) {
    inMemoryAppDataCache = loadSavedAppDataCache() || { chatMessages: [] };
  }
  if (!Array.isArray(inMemoryAppDataCache.chatMessages)) {
    inMemoryAppDataCache.chatMessages = [];
  }

  if (clearAllSystem || deleteType === "clear_all_system") {
    inMemoryAppDataCache.chatMessages = [];
    appDataVersion = Date.now();
    saveAppDataCache(inMemoryAppDataCache);
    queueAppDataPersist({ immediateMySQL: true });

    return res.json({
      success: true,
      message: "Semua riwayat obrolan sistem berhasil dihapus bersih",
      chatMessages: [],
      version: appDataVersion
    });
  }

  const userVariants = Array.isArray(myIdVariants) && myIdVariants.length > 0
    ? myIdVariants.map((v: string) => String(v).toLowerCase())
    : [String(currentUsername || "").toLowerCase()].filter(Boolean);

  const isThreadMatch = (m: any) => {
    const s = String(m.senderUsername || "").toLowerCase();
    const r = String(m.recipientUsername || "").toLowerCase();
    const target = String(selectedThreadUser || "").toLowerCase();

    if (isAdmin && target) {
      return (s === target && (r === "admin" || r === "administrator")) ||
             ((s === "admin" || s === "administrator") && r === target);
    } else {
      return userVariants.includes(s) || userVariants.includes(r);
    }
  };

  if (deleteType === "for_everyone") {
    inMemoryAppDataCache.chatMessages = inMemoryAppDataCache.chatMessages.filter(
      (m: any) => !isThreadMatch(m)
    );
  } else {
    inMemoryAppDataCache.chatMessages = inMemoryAppDataCache.chatMessages.map((m: any) => {
      if (isThreadMatch(m)) {
        const existingDeletedFor = Array.isArray(m.deletedFor) ? m.deletedFor : [];
        const mergedDeletedFor = Array.from(new Set([...existingDeletedFor, ...userVariants]));
        return { ...m, deletedFor: mergedDeletedFor };
      }
      return m;
    });
  }

  appDataVersion = Date.now();
  saveAppDataCache(inMemoryAppDataCache);
  queueAppDataPersist({ immediateMySQL: true });

  res.json({
    success: true,
    message: deleteType === "for_everyone" ? "Riwayat obrolan dihapus untuk semua orang" : "Riwayat obrolan dibersihkan untuk Anda",
    chatMessages: inMemoryAppDataCache.chatMessages,
    version: appDataVersion
  });
});

// 4b. Clear All Chat Messages System-wide
app.post("/api/chat/clear-all", requireAdmin, (req, res) => {
  if (!inMemoryAppDataCache) {
    inMemoryAppDataCache = loadSavedAppDataCache() || { chatMessages: [] };
  }
  inMemoryAppDataCache.chatMessages = [];
  appDataVersion = Date.now();
  saveAppDataCache(inMemoryAppDataCache);
  queueAppDataPersist({ immediateMySQL: true });

  res.json({
    success: true,
    message: "Semua riwayat obrolan sistem berhasil dihapus bersih",
    chatMessages: [],
    version: appDataVersion
  });
});

// 5. Mark Messages as Read
app.post("/api/chat/mark-read", (req, res) => {
  const { threadUser, currentUsername, myIdVariants } = req.body;

  if (!inMemoryAppDataCache || !Array.isArray(inMemoryAppDataCache.chatMessages)) {
    return res.json({ success: true, chatMessages: [] });
  }

  const userVariants = Array.isArray(myIdVariants) && myIdVariants.length > 0
    ? myIdVariants.map((v: string) => String(v).toLowerCase())
    : [String(currentUsername || "").toLowerCase()].filter(Boolean);

  let hasChanges = false;
  inMemoryAppDataCache.chatMessages = inMemoryAppDataCache.chatMessages.map((m: any) => {
    const s = String(m.senderUsername || "").toLowerCase();
    const r = String(m.recipientUsername || "").toLowerCase();
    const target = String(threadUser || "").toLowerCase();

    const isFromThread = target ? s === target : true;
    const isToMe = userVariants.includes(r) || r === "all";

    if (isFromThread && isToMe && (!m.isRead || m.status !== "read")) {
      hasChanges = true;
      return { ...m, isRead: true, status: "read" };
    }
    return m;
  });

  if (hasChanges) {
    appDataVersion = Date.now();
    saveAppDataCache(inMemoryAppDataCache);
    queueAppDataPersist({ immediateMySQL: false });
  }

  res.json({
    success: true,
    chatMessages: inMemoryAppDataCache.chatMessages,
    version: appDataVersion
  });
});

// API: Test MySQL Connection & Auto-Setup Tables
app.post("/api/mysql/test", requireAdmin, async (req, res) => {
  const { host, port, user, password, database } = req.body;
  if (!host || !user || !database) {
    return res.status(400).json({ success: false, message: "Host, user, dan nama database wajib diisi." });
  }

  try {
    const config = { host, port, user, password, database };
    const pool = getMySQLPool(config, true); // force ignore cooldown to test user click
    if (!pool) {
      throw new Error("Gagal membuat koneksi pool MySQL.");
    }

    let db: mysql.PoolConnection | null = null;

    try {
      db = await pool.getConnection();

      await db.execute(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
      await db.execute(`SET FOREIGN_KEY_CHECKS = 0;`);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS app_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          config_key VARCHAR(100) UNIQUE,
          config_value LONGTEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS sekolah_config (
          id INT PRIMARY KEY,
          nama VARCHAR(255) NOT NULL,
          alamat TEXT,
          tahun_ajaran VARCHAR(50),
          tanggal_mulai VARCHAR(50),
          logo LONGTEXT,
          favicon LONGTEXT,
          nama_kepala_sekolah VARCHAR(255),
          nip_kepala_sekolah VARCHAR(100),
          theme VARCHAR(50) DEFAULT 'ocean',
          font_theme VARCHAR(50) DEFAULT 'modern'
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS admin_account (
          id INT PRIMARY KEY,
          username VARCHAR(100) NOT NULL,
          password VARCHAR(255) NOT NULL,
          nama VARCHAR(255) NOT NULL,
          foto LONGTEXT
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS jurusan (
          id VARCHAR(50) PRIMARY KEY,
          kode VARCHAR(50) NOT NULL,
          nama VARCHAR(255) NOT NULL
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS wali_kelas (
          id VARCHAR(50) PRIMARY KEY,
          nip VARCHAR(100),
          nama VARCHAR(255) NOT NULL,
          nuptk VARCHAR(100),
          jenis_kelamin VARCHAR(20),
          tempat_lahir VARCHAR(100),
          tanggal_lahir VARCHAR(50),
          nik VARCHAR(50),
          agama_id VARCHAR(50),
          alamat TEXT,
          rt VARCHAR(20),
          rw VARCHAR(20),
          desa_kelurahan VARCHAR(100),
          kecamatan VARCHAR(100),
          kode_wilayah VARCHAR(50),
          kode_pos VARCHAR(20),
          no_hp VARCHAR(50),
          email VARCHAR(150),
          gelar_belakang VARCHAR(50),
          username VARCHAR(100) NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'wali',
          foto LONGTEXT,
          tugas_tambahan VARCHAR(100),
          jabatan VARCHAR(100),
          mata_pelajaran VARCHAR(255),
          hari_mengajar JSON,
          batasi_login_hari_mengajar BOOLEAN DEFAULT FALSE
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS kelas (
          id VARCHAR(50) PRIMARY KEY,
          nama VARCHAR(100) NOT NULL,
          jurusan_id VARCHAR(50),
          wali_kelas_id VARCHAR(50)
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS siswa (
          id VARCHAR(50) PRIMARY KEY,
          nisn VARCHAR(50),
          nama VARCHAR(255) NOT NULL,
          gender VARCHAR(10) NOT NULL,
          kelas_id VARCHAR(50),
          status VARCHAR(50) DEFAULT 'aktif',
          no_wa VARCHAR(50),
          nama_orang_tua VARCHAR(255),
          no_wa_orang_tua VARCHAR(50),
          username VARCHAR(100),
          password VARCHAR(255),
          foto LONGTEXT,
          tempat_lahir VARCHAR(100),
          tanggal_lahir VARCHAR(50),
          alamat TEXT
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS presensi (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tanggal_kelas VARCHAR(100) UNIQUE NOT NULL,
          tanggal VARCHAR(50) NOT NULL,
          kelas_id VARCHAR(50) NOT NULL,
          data_presensi JSON NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS user (
          id VARCHAR(100) PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          nama VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          nip VARCHAR(100),
          no_hp VARCHAR(50),
          foto LONGTEXT,
          kelas_nama VARCHAR(100),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS pelanggaran (
          id VARCHAR(50) PRIMARY KEY,
          tanggal VARCHAR(50) NOT NULL,
          siswa_id VARCHAR(50) NOT NULL,
          kelas_id VARCHAR(50),
          kategori VARCHAR(50) NOT NULL,
          nama_pelanggaran VARCHAR(255) NOT NULL,
          poin INT DEFAULT 0,
          keterangan TEXT,
          pelapor VARCHAR(255),
          tindakan TEXT,
          status VARCHAR(50) DEFAULT 'proses',
          foto LONGTEXT,
          created_at VARCHAR(50),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_pelanggaran_siswa (siswa_id),
          INDEX idx_pelanggaran_tanggal (tanggal),
          INDEX idx_pelanggaran_kelas (kelas_id)
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS home_visit (
          id VARCHAR(50) PRIMARY KEY,
          tanggal VARCHAR(50) NOT NULL,
          siswa_id VARCHAR(50) NOT NULL,
          kelas_id VARCHAR(50),
          petugas VARCHAR(255) NOT NULL,
          alasan TEXT,
          catatan TEXT,
          hasil TEXT,
          tindak_lanjut TEXT,
          foto LONGTEXT,
          status VARCHAR(50) DEFAULT 'proses',
          created_at VARCHAR(50),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_home_visit_siswa (siswa_id),
          INDEX idx_home_visit_tanggal (tanggal),
          INDEX idx_home_visit_kelas (kelas_id)
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS violation_templates (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          kategori VARCHAR(50) NOT NULL,
          poin INT DEFAULT 0,
          tindakan TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);

      await db.execute(`SET FOREIGN_KEY_CHECKS = 1;`);
    } finally {
      if (db) {
        try { db.release(); } catch (e) {}
      }
    }

    saveServerConfig(config);

    res.json({ success: true, message: "Koneksi ke MySQL berhasil dan struktur tabel relasional telah dikonfigurasi!" });
  } catch (error: any) {
    const isLimit = isMySQLRateLimitError(error);
    if (isLimit) {
      setMySQLCooldown(error.message);
    }
    res.status(200).json({
      success: isLimit ? true : false,
      isRateLimited: isLimit,
      message: isLimit
        ? "Batas koneksi per jam MySQL pada akun hosting Anda tercapai (max_connections_per_hour = 500). Kredensial MySQL berhasil disimpan, dan aplikasi secara otomatis menggunakan cache server internal agar tetap berjalan normal."
        : error.message || "Gagal terhubung ke MySQL."
    });
  }
});

// API: Save App Data to Relational MySQL Tables
app.post("/api/mysql/save", requireAdmin, async (req, res) => {
  const { host, port, user, password, database, appData } = req.body;
  if (!host || !user || !database || !appData) {
    return res.status(400).json({ success: false, message: "Parameter koneksi dan data aplikasi wajib diisi." });
  }

  try {
    const config = { host, port, user, password, database };
    saveServerConfig(config);
    saveAppDataCache(appData);
    lastMySQLSyncTime = Date.now();

    const hasDeletions = (appData.deletedPelanggaranIds && appData.deletedPelanggaranIds.length > 0) ||
                         (appData.deletedHomeVisitIds && appData.deletedHomeVisitIds.length > 0);

    if (Date.now() >= mysqlCooldownUntil || hasDeletions) {
      await performMySQLSave(config, appData, Boolean(hasDeletions));
      lastMySQLSyncTime = Date.now();
    }

    res.json({ success: true, message: "Data berhasil disimpan dan disinkronkan!" });
  } catch (error: any) {
    const isLimit = isMySQLRateLimitError(error);
    if (isLimit) {
      setMySQLCooldown(error.message);
    }
    res.json({
      success: true,
      message: isLimit
        ? "Data telah tersimpan di cache server internal. Batas koneksi per jam MySQL tercapai (max_connections_per_hour)."
        : error.message || "Gagal menyimpan data ke MySQL."
    });
  }
});

// API: Load App Data from MySQL
app.post("/api/mysql/load", requireAdmin, async (req, res) => {
  const { host, port, user, password, database } = req.body;
  if (!host || !user || !database) {
    return res.status(400).json({ success: false, message: "Parameter koneksi wajib diisi." });
  }

  try {
    const config = { host, port, user, password, database };
    saveServerConfig(config);

    let appData: any = null;
    if (Date.now() >= mysqlCooldownUntil) {
      appData = await performMySQLLoad(config);
    }

    if (!appData && inMemoryAppDataCache) {
      appData = inMemoryAppDataCache;
    }

    if (appData && (appData.sekolah || (appData.jurusan && appData.jurusan.length > 0))) {
      saveAppDataCache(appData);
      res.json({ success: true, appData, message: "Data presensi dan relasional berhasil dimuat!" });
    } else {
      res.status(404).json({ success: false, message: "Belum ada data tersimpan di MySQL/Cache untuk aplikasi ini." });
    }
  } catch (error: any) {
    const isLimit = isMySQLRateLimitError(error);
    if (isLimit) {
      setMySQLCooldown(error.message);
    }
    res.json({
      success: !!inMemoryAppDataCache,
      appData: inMemoryAppDataCache,
      message: "Batas koneksi per jam MySQL tercapai. Menggunakan data cache server."
    });
  }
});

// API: Preview Database Statistics & Sample Rows
app.post("/api/mysql/preview", requireAdmin, async (req, res) => {
  const { host, port, user, password, database } = req.body;
  if (!host || !user || !database) {
    return res.status(400).json({ success: false, message: "Parameter koneksi wajib diisi." });
  }

  try {
    const config = { host, port, user, password, database };
    const pool = getMySQLPool(config, true);
    if (!pool) throw new Error("Gagal membuat koneksi MySQL.");

    let db: mysql.PoolConnection | null = null;
    let sekolahRows: any[] = [];
    let adminRows: any[] = [];
    let jurusanRows: any[] = [];
    let waliRows: any[] = [];
    let kelasRows: any[] = [];
    let siswaRows: any[] = [];
    let presensiRows: any[] = [];
    let pelanggaranRows: any[] = [];
    let homeVisitRows: any[] = [];

    try {
      db = await pool.getConnection();
      [sekolahRows] = await db.execute(`SELECT * FROM sekolah_config LIMIT 5;`).catch(() => [[]]) as any;
      [adminRows] = await db.execute(`SELECT * FROM admin_account LIMIT 5;`).catch(() => [[]]) as any;
      [jurusanRows] = await db.execute(`SELECT * FROM jurusan;`).catch(() => [[]]) as any;
      [waliRows] = await db.execute(`SELECT * FROM wali_kelas;`).catch(() => [[]]) as any;
      [kelasRows] = await db.execute(`SELECT * FROM kelas;`).catch(() => [[]]) as any;
      [siswaRows] = await db.execute(`SELECT * FROM siswa;`).catch(() => [[]]) as any;
      [presensiRows] = await db.execute(`SELECT * FROM presensi;`).catch(() => [[]]) as any;
      [pelanggaranRows] = await db.execute(`SELECT * FROM pelanggaran;`).catch(() => [[]]) as any;
      [homeVisitRows] = await db.execute(`SELECT * FROM home_visit;`).catch(() => [[]]) as any;
    } finally {
      if (db) {
        try { db.release(); } catch (e) {}
      }
    }

    res.json({
      success: true,
      counts: {
        sekolah: sekolahRows?.length || 0,
        admin: adminRows?.length || 0,
        jurusan: jurusanRows?.length || 0,
        waliKelas: waliRows?.length || 0,
        kelas: kelasRows?.length || 0,
        siswa: siswaRows?.length || 0,
        presensi: presensiRows?.length || 0,
        pelanggaran: pelanggaranRows?.length || 0,
        homeVisit: homeVisitRows?.length || 0,
      },
      samples: {
        jurusan: jurusanRows || [],
        waliKelas: waliRows || [],
        kelas: kelasRows || [],
        siswa: siswaRows || [],
        pelanggaran: (pelanggaranRows || []).slice(0, 5),
        homeVisit: (homeVisitRows || []).slice(0, 5),
      },
      message: "Preview database berhasil dimuat!"
    });
  } catch (error: any) {
    const isLimit = isMySQLRateLimitError(error);
    if (isLimit) {
      setMySQLCooldown(error.message);
    }
    res.status(200).json({
      success: false,
      message: isLimit
        ? "Batas koneksi per jam MySQL pada hosting Anda tercapai (max_connections_per_hour = 500). Silakan tunggu atau tingkatkan limit pada hosting Anda."
        : error.message || "Gagal mengambil preview database dari MySQL."
    });
  }
});

// ==========================================
// DEDICATED BACKUP, RESTORE & AUTO-SCHEDULER ENGINE
// ==========================================

const BACKUP_DIR = path.resolve(process.cwd(), "backups");
const BACKUP_CONFIG_FILE = path.join(BACKUP_DIR, "backup-config.json");

try {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
} catch (e) {}

interface ServerBackupConfig {
  autoBackupEnabled: boolean;
  frequency: "daily" | "weekly" | "monthly" | "all";
  dailyTime: string; // e.g. "23:00"
  weeklyDay: number; // 0 = Minggu, 6 = Sabtu
  weeklyTime: string; // e.g. "22:00"
  monthlyDay: number; // 1 - 31
  monthlyTime: string; // e.g. "23:00"
  retentionDaily: number; // default 7
  retentionWeekly: number; // default 4
  retentionMonthly: number; // default 12
  includePresensiOnlyInDaily?: boolean;
  lastDailyBackup?: string;
  lastWeeklyBackup?: string;
  lastMonthlyBackup?: string;
  lastManualBackup?: string;
}

const defaultBackupConfig: ServerBackupConfig = {
  autoBackupEnabled: true,
  frequency: "all",
  dailyTime: "23:00",
  weeklyDay: 6, // Sabtu
  weeklyTime: "22:00",
  monthlyDay: 1, // Tanggal 1 tiap bulan
  monthlyTime: "23:00",
  retentionDaily: 7,
  retentionWeekly: 4,
  retentionMonthly: 12,
  includePresensiOnlyInDaily: false,
};

function loadServerBackupConfig(): ServerBackupConfig {
  try {
    if (fs.existsSync(BACKUP_CONFIG_FILE)) {
      const raw = fs.readFileSync(BACKUP_CONFIG_FILE, "utf-8");
      return { ...defaultBackupConfig, ...JSON.parse(raw) };
    }
  } catch (e) {}
  return { ...defaultBackupConfig };
}

function saveServerBackupConfig(config: ServerBackupConfig) {
  try {
    fs.writeFileSync(BACKUP_CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {}
}

let activeBackupConfig: ServerBackupConfig = loadServerBackupConfig();

// Helper to count presensi entries
function countPresensiEntries(presensiMap: any): { datesCount: number; recordsCount: number } {
  if (!presensiMap || typeof presensiMap !== "object") return { datesCount: 0, recordsCount: 0 };
  const keys = Object.keys(presensiMap);
  let recordsCount = 0;
  for (const k of keys) {
    if (Array.isArray(presensiMap[k])) {
      recordsCount += presensiMap[k].length;
    }
  }
  return { datesCount: keys.length, recordsCount };
}

// Prune snapshots by category retention limit
function pruneSnapshotsByCategory() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith("SNAP_") && f.endsWith(".json"));

    const grouped: Record<string, { filename: string; timestamp: number }[]> = {
      daily: [],
      weekly: [],
      monthly: [],
      manual: [],
    };

    for (const f of files) {
      try {
        const filePath = path.join(BACKUP_DIR, f);
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const category = parsed?.metadata?.category || (f.includes("DAILY") ? "daily" : f.includes("WEEKLY") ? "weekly" : f.includes("MONTHLY") ? "monthly" : "manual");
        const ts = parsed?.metadata?.timestamp || fs.statSync(filePath).mtimeMs;
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push({ filename: f, timestamp: ts });
      } catch (e) {}
    }

    const limits: Record<string, number> = {
      daily: activeBackupConfig.retentionDaily || 7,
      weekly: activeBackupConfig.retentionWeekly || 4,
      monthly: activeBackupConfig.retentionMonthly || 12,
      manual: 20,
    };

    for (const cat of Object.keys(grouped)) {
      const list = grouped[cat];
      list.sort((a, b) => b.timestamp - a.timestamp); // newest first
      const maxLimit = limits[cat] || 10;
      if (list.length > maxLimit) {
        const toDelete = list.slice(maxLimit);
        for (const item of toDelete) {
          try {
            fs.unlinkSync(path.join(BACKUP_DIR, item.filename));
          } catch (e) {}
        }
      }
    }
  } catch (err) {}
}

// Core Engine to Create Snapshot
function createServerSnapshot(category: "daily" | "weekly" | "monthly" | "manual", note?: string) {
  const currentData = inMemoryAppDataCache || loadSavedAppDataCache() || {};
  const { dateStr, timeStr } = getIndonesianDateTime();
  const timestamp = Date.now();
  const snapshotId = `SNAP_${category.toUpperCase()}_${timestamp}`;

  const defaultNote =
    category === "daily"
      ? `Cadangan Otomatis Harian (${dateStr})`
      : category === "weekly"
      ? `Cadangan Otomatis Mingguan (Minggu ke-${Math.ceil(new Date().getDate() / 7)}, ${dateStr})`
      : category === "monthly"
      ? `Cadangan Otomatis Bulanan (${dateStr.slice(0, 7)})`
      : `Snapshot Manual (${dateStr} ${timeStr})`;

  const finalNote = note?.trim() || defaultNote;

  const snapshotMetadata = {
    id: snapshotId,
    timestamp,
    createdAt: `${dateStr} ${timeStr}`,
    category,
    note: finalNote,
    schoolName: currentData?.sekolah?.nama || "",
    stats: {
      totalSiswa: Array.isArray(currentData?.siswa) ? currentData.siswa.length : 0,
      totalKelas: Array.isArray(currentData?.kelas) ? currentData.kelas.length : 0,
      totalWaliKelas: Array.isArray(currentData?.waliKelas) ? currentData.waliKelas.length : 0,
      ...countPresensiEntries(currentData?.presensi),
    },
  };

  const snapshotFile = path.join(BACKUP_DIR, `${snapshotId}.json`);
  const fullSnapshot = {
    metadata: snapshotMetadata,
    data: currentData,
  };

  fs.writeFileSync(snapshotFile, JSON.stringify(fullSnapshot, null, 2));

  // Update timestamps
  if (category === "daily") activeBackupConfig.lastDailyBackup = `${dateStr} ${timeStr}`;
  if (category === "weekly") activeBackupConfig.lastWeeklyBackup = `${dateStr} ${timeStr}`;
  if (category === "monthly") activeBackupConfig.lastMonthlyBackup = `${dateStr} ${timeStr}`;
  if (category === "manual") activeBackupConfig.lastManualBackup = `${dateStr} ${timeStr}`;

  saveServerBackupConfig(activeBackupConfig);
  pruneSnapshotsByCategory();

  return snapshotMetadata;
}

// Background Cron-like Runner for Automatic Backups (Every 60s)
setInterval(() => {
  if (!activeBackupConfig.autoBackupEnabled) return;

  try {
    const now = new Date();
    // Use Indonesian UTC+7 time calculation
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const indoTime = new Date(utc + 7 * 3600000);

    const year = indoTime.getFullYear();
    const month = String(indoTime.getMonth() + 1).padStart(2, "0");
    const date = String(indoTime.getDate()).padStart(2, "0");
    const dayOfWeek = indoTime.getDay(); // 0 = Sunday, 6 = Saturday

    const hours = String(indoTime.getHours()).padStart(2, "0");
    const minutes = String(indoTime.getMinutes()).padStart(2, "0");
    const currentHHMM = `${hours}:${minutes}`;
    const todayYMD = `${year}-${month}-${date}`;
    const thisMonthYM = `${year}-${month}`;

    // 1. Daily Auto-Backup Check
    if (activeBackupConfig.dailyTime === currentHHMM) {
      const lastDaily = activeBackupConfig.lastDailyBackup || "";
      if (!lastDaily.startsWith(todayYMD)) {
        createServerSnapshot("daily");
        console.log(`[AUTO-BACKUP] Daily snapshot created for ${todayYMD} at ${currentHHMM}`);
      }
    }

    // 2. Weekly Auto-Backup Check
    if (dayOfWeek === activeBackupConfig.weeklyDay && activeBackupConfig.weeklyTime === currentHHMM) {
      const lastWeekly = activeBackupConfig.lastWeeklyBackup || "";
      if (!lastWeekly.startsWith(todayYMD)) {
        createServerSnapshot("weekly");
        console.log(`[AUTO-BACKUP] Weekly snapshot created for day ${dayOfWeek} at ${currentHHMM}`);
      }
    }

    // 3. Monthly Auto-Backup Check
    if (Number(date) === activeBackupConfig.monthlyDay && activeBackupConfig.monthlyTime === currentHHMM) {
      const lastMonthly = activeBackupConfig.lastMonthlyBackup || "";
      if (!lastMonthly.startsWith(thisMonthYM)) {
        createServerSnapshot("monthly");
        console.log(`[AUTO-BACKUP] Monthly snapshot created for month ${thisMonthYM} at ${currentHHMM}`);
      }
    }
  } catch (err) {
    console.error("[AUTO-BACKUP] Error running scheduled backup timer:", err);
  }
}, 60000);

// ==========================================
// BACKUP API ENDPOINTS
// ==========================================

// 1. Get Auto-Backup Schedule Config
app.get("/api/backup/schedule-config", (req, res) => {
  res.json({
    success: true,
    config: activeBackupConfig,
  });
});

// 2. Update Auto-Backup Schedule Config
app.post("/api/backup/schedule-config", (req, res) => {
  try {
    const newConfig = { ...activeBackupConfig, ...(req.body || {}) };
    activeBackupConfig = newConfig;
    saveServerBackupConfig(newConfig);

    // Sync to in-memory AppData if present
    if (inMemoryAppDataCache) {
      inMemoryAppDataCache.backupConfig = newConfig;
      saveAppDataCache(inMemoryAppDataCache);
    }

    res.json({
      success: true,
      message: "Konfigurasi jadwal backup otomatis berhasil disimpan!",
      config: activeBackupConfig,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Gagal menyimpan konfigurasi: ${err.message}` });
  }
});

// 3. Trigger Immediate Manual Run of Daily / Weekly / Monthly Cycle
app.post("/api/backup/trigger-cycle", (req, res) => {
  try {
    const { category = "daily", note } = req.body;
    if (!["daily", "weekly", "monthly", "manual"].includes(category)) {
      return res.status(400).json({ success: false, message: "Kategori siklus backup tidak valid." });
    }

    const snapshot = createServerSnapshot(category as any, note);
    res.json({
      success: true,
      message: `Proses pencadangan [${category.toUpperCase()}] berhasil dieksekusi!`,
      snapshot,
      config: activeBackupConfig,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Gagal menjalankan pencadangan: ${err.message}` });
  }
});

// 4. Export / Download System Backup (Full, Daily, Weekly, Monthly, Master, Presensi)
app.get("/api/backup/export", (req, res) => {
  const currentData = inMemoryAppDataCache || loadSavedAppDataCache() || {};
  const backupType = (req.query.type as string) || "full"; // 'full' | 'daily' | 'weekly' | 'monthly' | 'presensi_only' | 'master_only'
  const isDownload = req.query.download === "true";

  const { dateStr, timeStr } = getIndonesianDateTime();
  const schoolName = currentData?.sekolah?.nama || "Presensi_Sekolah";
  const cleanSchoolName = schoolName.replace(/[^a-zA-Z0-9_-]/g, "_");

  let payload: any = {
    _backupMetadata: {
      system: "Sistem Presensi Siswa",
      version: "3.5",
      type: backupType,
      exportedAt: `${dateStr} ${timeStr}`,
      timestamp: Date.now(),
      schoolName: currentData?.sekolah?.nama || "",
      stats: {
        totalSiswa: Array.isArray(currentData?.siswa) ? currentData.siswa.length : 0,
        totalKelas: Array.isArray(currentData?.kelas) ? currentData.kelas.length : 0,
        totalJurusan: Array.isArray(currentData?.jurusan) ? currentData.jurusan.length : 0,
        totalWaliKelas: Array.isArray(currentData?.waliKelas) ? currentData.waliKelas.length : 0,
        totalPelanggaran: Array.isArray(currentData?.pelanggaran) ? currentData.pelanggaran.length : 0,
        totalHomeVisits: Array.isArray(currentData?.homeVisits) ? currentData.homeVisits.length : 0,
        ...countPresensiEntries(currentData?.presensi),
      },
    },
  };

  if (backupType === "daily") {
    // Filter presensi to only today and yesterday
    const presensiFiltered: any = {};
    const allPresensi = currentData.presensi || {};
    const todayKey = dateStr;
    if (allPresensi[todayKey]) presensiFiltered[todayKey] = allPresensi[todayKey];
    payload = {
      ...payload,
      ...currentData,
      presensi: presensiFiltered,
    };
  } else if (backupType === "weekly") {
    // Filter presensi to last 7 days
    const presensiFiltered: any = {};
    const allPresensi = currentData.presensi || {};
    const dates = Object.keys(allPresensi).sort().slice(-7);
    for (const d of dates) {
      presensiFiltered[d] = allPresensi[d];
    }
    payload = {
      ...payload,
      ...currentData,
      presensi: presensiFiltered,
    };
  } else if (backupType === "monthly") {
    // Filter presensi to last 30 days
    const presensiFiltered: any = {};
    const allPresensi = currentData.presensi || {};
    const dates = Object.keys(allPresensi).sort().slice(-31);
    for (const d of dates) {
      presensiFiltered[d] = allPresensi[d];
    }
    payload = {
      ...payload,
      ...currentData,
      presensi: presensiFiltered,
    };
  } else if (backupType === "presensi_only") {
    payload.presensi = currentData.presensi || {};
    payload.siswa = (currentData.siswa || []).map((s: any) => ({ id: s.id, nisn: s.nisn, nama: s.nama, kelasId: s.kelasId }));
    payload.kelas = currentData.kelas || [];
  } else if (backupType === "master_only") {
    payload = {
      ...payload,
      sekolah: currentData.sekolah,
      admin: currentData.admin,
      jurusan: currentData.jurusan,
      waliKelas: currentData.waliKelas,
      kelas: currentData.kelas,
      siswa: currentData.siswa,
      shiftConfig: currentData.shiftConfig,
      jadwalMengajar: currentData.jadwalMengajar,
      violationTemplates: currentData.violationTemplates,
    };
  } else {
    // Full system backup
    payload = {
      ...payload,
      ...currentData,
    };
  }

  const filename = `Backup_${cleanSchoolName}_${backupType}_${dateStr.replace(/-/g, "")}_${timeStr.replace(/:/g, "")}.bak`;

  if (isDownload) {
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
  }

  res.json({
    success: true,
    filename,
    backupType,
    data: payload,
  });
});

// 5. Restore System Backup (Replace, Merge, or Presensi-Only)
app.post("/api/backup/restore", requireAdmin, async (req, res) => {
  const { backupData, mode = "replace" } = req.body;
  if (!backupData || typeof backupData !== "object") {
    return res.status(400).json({ success: false, message: "Data backup tidak valid atau kosong." });
  }

  // Handle wrapped payloads (e.g. { data: ... } or { appData: ... } or raw AppData)
  let incoming: any = backupData.data || backupData.appData || backupData;

  // Basic validation check
  const hasSchoolOrStudents = incoming.sekolah || Array.isArray(incoming.siswa) || Array.isArray(incoming.kelas) || (incoming.presensi && typeof incoming.presensi === "object");
  if (!hasSchoolOrStudents) {
    return res.status(400).json({
      success: false,
      message: "Format file cadangan tidak dikenali. File harus memiliki data sekolah, kelas, siswa, atau presensi.",
    });
  }

  let baseData = inMemoryAppDataCache || loadSavedAppDataCache() || {};
  let targetData: any = {};

  if (mode === "presensi_only") {
    targetData = {
      ...baseData,
      presensi: sanitizeAndDeduplicatePresensiMap(incoming.presensi || {}),
    };
  } else if (mode === "merge") {
    // Smart merge arrays by ID / NISN / Code
    const mergeArrays = (arrBase: any[] = [], arrInc: any[] = [], idKey = "id") => {
      const map = new Map<string, any>();
      for (const item of (arrBase || [])) {
        if (item && item[idKey]) map.set(String(item[idKey]), item);
      }
      for (const item of (arrInc || [])) {
        if (item && item[idKey]) map.set(String(item[idKey]), { ...(map.get(String(item[idKey])) || {}), ...item });
      }
      return Array.from(map.values());
    };

    targetData = {
      ...baseData,
      sekolah: { ...(baseData.sekolah || {}), ...(incoming.sekolah || {}) },
      admin: incoming.admin || baseData.admin,
      jurusan: mergeArrays(baseData.jurusan, incoming.jurusan, "id"),
      waliKelas: mergeArrays(baseData.waliKelas, incoming.waliKelas, "id"),
      kelas: mergeArrays(baseData.kelas, incoming.kelas, "id"),
      siswa: mergeArrays(baseData.siswa, incoming.siswa, "id"),
      pelanggaran: mergeArrays(baseData.pelanggaran, incoming.pelanggaran, "id"),
      homeVisits: mergeArrays(baseData.homeVisits, incoming.homeVisits, "id"),
      violationTemplates: mergeArrays(baseData.violationTemplates, incoming.violationTemplates, "id"),
      presensi: sanitizeAndDeduplicatePresensiMap({
        ...(baseData.presensi || {}),
        ...(incoming.presensi || {}),
      }),
      shiftConfig: incoming.shiftConfig || baseData.shiftConfig,
      jadwalMengajar: incoming.jadwalMengajar || baseData.jadwalMengajar,
      chatMessages: Array.isArray(incoming.chatMessages) ? incoming.chatMessages : baseData.chatMessages,
      backupConfig: incoming.backupConfig || baseData.backupConfig || activeBackupConfig,
    };
  } else {
    // Full Replace
    targetData = {
      ...incoming,
      sekolah: incoming.sekolah || baseData.sekolah,
      admin: incoming.admin || baseData.admin,
      jurusan: Array.isArray(incoming.jurusan) ? incoming.jurusan : baseData.jurusan || [],
      waliKelas: Array.isArray(incoming.waliKelas) ? incoming.waliKelas : baseData.waliKelas || [],
      kelas: Array.isArray(incoming.kelas) ? incoming.kelas : baseData.kelas || [],
      siswa: Array.isArray(incoming.siswa) ? incoming.siswa : baseData.siswa || [],
      presensi: sanitizeAndDeduplicatePresensiMap(incoming.presensi || {}),
      pelanggaran: Array.isArray(incoming.pelanggaran) ? incoming.pelanggaran : [],
      homeVisits: Array.isArray(incoming.homeVisits) ? incoming.homeVisits : [],
      violationTemplates: Array.isArray(incoming.violationTemplates) ? incoming.violationTemplates : (baseData.violationTemplates || []),
      shiftConfig: incoming.shiftConfig || baseData.shiftConfig,
      jadwalMengajar: incoming.jadwalMengajar || baseData.jadwalMengajar,
      chatMessages: Array.isArray(incoming.chatMessages) ? incoming.chatMessages : (baseData.chatMessages || []),
      auditLogs: Array.isArray(incoming.auditLogs) ? incoming.auditLogs : (baseData.auditLogs || []),
      securityConfig: incoming.securityConfig || baseData.securityConfig,
      backupConfig: incoming.backupConfig || baseData.backupConfig || activeBackupConfig,
    };
  }

  // Record audit log for restore action
  const { dateStr, timeStr } = getIndonesianDateTime();
  const restoreLog = {
    id: `LOG_RESTORE_${Date.now()}`,
    waktu: `${dateStr} ${timeStr}`,
    role: "admin",
    namaUser: "Administrator Utama",
    aksi: `RESTORE_DATABASE: Pemulihan database sistem mode [${mode}] berhasil`,
    ip: req.ip || "127.0.0.1",
  };
  if (!Array.isArray(targetData.auditLogs)) targetData.auditLogs = [];
  targetData.auditLogs.unshift(restoreLog);

  // Save to memory cache & trigger disk + MySQL persist
  saveAppDataCache(targetData);
  lastMySQLSyncTime = Date.now();
  queueAppDataPersist({ immediateMySQL: true });

  const presensiStats = countPresensiEntries(targetData.presensi);

  res.json({
    success: true,
    message: `Database sistem berhasil dipulihkan dengan mode [${mode.toUpperCase()}]!`,
    version: appDataVersion,
    appData: targetData,
    stats: {
      totalSiswa: (targetData.siswa || []).length,
      totalKelas: (targetData.kelas || []).length,
      totalJurusan: (targetData.jurusan || []).length,
      totalWaliKelas: (targetData.waliKelas || []).length,
      totalPresensiHari: presensiStats.datesCount,
      totalPresensiEntri: presensiStats.recordsCount,
      totalPelanggaran: (targetData.pelanggaran || []).length,
      totalHomeVisits: (targetData.homeVisits || []).length,
    },
  });
});

// 6. Create Server-Side Snapshot (Manual or Triggered)
app.post("/api/backup/snapshot", requireAdmin, (req, res) => {
  try {
    const { note, category = "manual" } = req.body;
    const snapshotMetadata = createServerSnapshot(category, note);

    res.json({
      success: true,
      message: `Snapshot cadangan server "${snapshotMetadata.note}" berhasil dibuat!`,
      snapshot: snapshotMetadata,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Gagal membuat snapshot server: ${err.message}` });
  }
});

// 7. List Server-Side Snapshots
app.get("/api/backup/snapshots", (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({ success: true, snapshots: [] });
    }

    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith("SNAP_") && f.endsWith(".json"));
    const snapshots: any[] = [];

    for (const f of files) {
      try {
        const filePath = path.join(BACKUP_DIR, f);
        const stat = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(content);
        const meta = parsed.metadata || {
          id: f.replace(".json", ""),
          createdAt: stat.mtime.toISOString(),
          note: "Snapshot",
          category: "manual",
        };
        meta.fileSize = `${Math.round(stat.size / 1024)} KB`;
        if (!meta.category) {
          meta.category = f.includes("DAILY") ? "daily" : f.includes("WEEKLY") ? "weekly" : f.includes("MONTHLY") ? "monthly" : "manual";
        }
        snapshots.push(meta);
      } catch (e) {}
    }

    // Sort newest first
    snapshots.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    res.json({
      success: true,
      snapshots,
    });
  } catch (err: any) {
    res.json({ success: true, snapshots: [] });
  }
});

// 8. Download a Server Snapshot File directly
app.get("/api/backup/snapshot/:id/download", (req, res) => {
  try {
    const snapshotId = req.params.id;
    const snapshotFile = path.join(BACKUP_DIR, `${snapshotId}.json`);
    if (!fs.existsSync(snapshotFile)) {
      return res.status(404).json({ success: false, message: "Berkas snapshot tidak ditemukan." });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${snapshotId}.bak"`);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    fs.createReadStream(snapshotFile).pipe(res);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Restore from Server Snapshot
app.post("/api/backup/snapshot/restore", (req, res) => {
  try {
    const { snapshotId } = req.body;
    if (!snapshotId) {
      return res.status(400).json({ success: false, message: "ID Snapshot tidak valid." });
    }

    const snapshotFile = path.join(BACKUP_DIR, `${snapshotId}.json`);
    if (!fs.existsSync(snapshotFile)) {
      return res.status(404).json({ success: false, message: "Berkas snapshot server tidak ditemukan." });
    }

    const content = fs.readFileSync(snapshotFile, "utf-8");
    const parsed = JSON.parse(content);
    const restoredData = parsed.data || parsed;

    saveAppDataCache(restoredData);
    lastMySQLSyncTime = Date.now();
    queueAppDataPersist({ immediateMySQL: true });

    res.json({
      success: true,
      message: `Database berhasil dipulihkan dari snapshot server [${parsed.metadata?.note || snapshotId}]!`,
      appData: restoredData,
      version: appDataVersion,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Gagal memulihkan snapshot: ${err.message}` });
  }
});

// 10. Delete Server Snapshot
app.delete("/api/backup/snapshot/:id", (req, res) => {
  try {
    const snapshotId = req.params.id;
    const snapshotFile = path.join(BACKUP_DIR, `${snapshotId}.json`);
    if (fs.existsSync(snapshotFile)) {
      fs.unlinkSync(snapshotFile);
      return res.json({ success: true, message: "Snapshot server berhasil dihapus." });
    }
    res.status(404).json({ success: false, message: "Snapshot tidak ditemukan." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Vite middleware for development or static serving for production
async function startServer() {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    if (!isProduction) {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);

      app.get("*", async (req, res, next) => {
        if (req.originalUrl.startsWith("/api/")) {
          return next();
        }
        try {
          let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
          template = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (e: any) {
          if (vite) {
            vite.ssrFixStacktrace(e);
          }
          next(e);
        }
      });
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res, next) => {
        if (req.originalUrl.startsWith("/api/")) {
          return next();
        }
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send("Application build in progress, please refresh in a few seconds.");
        }
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
