import { ActiveUserSession, AppData, LoginStatus, UserLoginLog } from '../types';
import { formatIndonesianDateTime, getClientMetadata } from './securityEngine';

/**
 * Parses user agent string to detect device type and browser
 */
export function parseUserAgent(uaString: string): { device: string; browser: string; isMobile: boolean } {
  if (!uaString) {
    return { device: 'Desktop Windows', browser: 'Google Chrome', isMobile: false };
  }

  const ua = uaString.toLowerCase();
  let device = 'Desktop PC';
  let isMobile = false;

  if (ua.includes('android')) {
    device = 'Smartphone Android';
    isMobile = true;
  } else if (ua.includes('iphone')) {
    device = 'Apple iPhone';
    isMobile = true;
  } else if (ua.includes('ipad')) {
    device = 'Apple iPad';
    isMobile = true;
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    device = 'Apple Mac OS';
  } else if (ua.includes('windows')) {
    device = 'Desktop Windows';
  } else if (ua.includes('cros')) {
    device = 'Chromebook';
  } else if (ua.includes('linux')) {
    device = 'Linux Workstation';
  }

  let browser = 'Browser';
  if (ua.includes('edg/') || ua.includes('edge/')) {
    browser = 'Microsoft Edge';
  } else if (ua.includes('opr/') || ua.includes('opera/')) {
    browser = 'Opera Browser';
  } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    browser = 'Google Chrome';
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browser = 'Apple Safari';
  } else if (ua.includes('firefox/')) {
    browser = 'Mozilla Firefox';
  } else if (ua.includes('python') || ua.includes('curl') || ua.includes('sqlmap')) {
    browser = 'Automated Script / Bot';
  }

  return { device, browser, isMobile };
}

/**
 * Helper to compute session online duration string
 */
export function formatOnlineDuration(loginAtIso: string): string {
  try {
    const start = new Date(loginAtIso).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - start) / 1000));
    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = diffSec % 60;

    if (hours > 0) return `${hours} jam ${minutes} mnt`;
    if (minutes > 0) return `${minutes} mnt ${seconds} dtk`;
    return `${seconds} dtk`;
  } catch {
    return '0 dtk';
  }
}

/**
 * Format status label & style
 */
export function getLoginStatusMeta(status: LoginStatus): {
  label: string;
  badgeClass: string;
  dotColor: string;
} {
  switch (status) {
    case 'success':
      return {
        label: 'Berhasil Masuk',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300',
        dotColor: 'bg-emerald-500',
      };
    case 'failed_password':
      return {
        label: 'Password Salah',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300',
        dotColor: 'bg-rose-500',
      };
    case 'account_locked':
      return {
        label: 'Akun Terkunci',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300',
        dotColor: 'bg-amber-500',
      };
    case 'ip_blocked':
      return {
        label: 'IP Diblokir',
        badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300',
        dotColor: 'bg-red-600',
      };
    case 'waf_rejected':
      return {
        label: 'Ditolak WAF',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:border-purple-800 dark:text-purple-300',
        dotColor: 'bg-purple-500',
      };
    case 'anomaly_time':
      return {
        label: 'Jam Dini Hari',
        badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:border-yellow-800 dark:text-yellow-300',
        dotColor: 'bg-yellow-500',
      };
    case 'session_terminated':
      return {
        label: 'Sesi Diputus',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300',
        dotColor: 'bg-slate-400',
      };
    case 'user_not_found':
    default:
      return {
        label: 'User Tidak Ada',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300',
        dotColor: 'bg-slate-400',
      };
  }
}

/**
 * Initial empty login logs and sessions (no dummy data)
 */
export const INITIAL_USER_LOGIN_LOGS: UserLoginLog[] = [];

export const INITIAL_ACTIVE_SESSIONS: ActiveUserSession[] = [];

/**
 * Filter out any legacy dummy records from appData
 */
export function cleanDummyUserLoginData(appData: AppData): AppData {
  const dummyLogPrefixes = ['log-login-', 'log-srv-'];
  const dummySessionIds = [
    'sess-admin-active',
    'sess-guru1-active',
    'sess-kesiswaan-active',
    'sess-siswa-active',
    'sess-srv-admin',
    'sess-srv-guru1',
    'sess-srv-kesiswaan',
    'sess-srv-siswa1',
  ];

  const cleanedLogs = (appData.userLoginLogs || []).filter(
    (l) => !dummyLogPrefixes.some((p) => l.id.startsWith(p))
  );

  const cleanedSessions = (appData.activeUserSessions || []).filter(
    (s) =>
      !dummySessionIds.includes(s.id) &&
      !s.id.startsWith('sess-srv-') &&
      !s.id.startsWith('sess-guru-') &&
      !s.id.startsWith('sess-kesiswaan-') &&
      !s.id.startsWith('sess-siswa-')
  );

  return {
    ...appData,
    userLoginLogs: cleanedLogs,
    activeUserSessions: cleanedSessions,
  };
}

/**
 * Record a login event into AppData
 */
export function recordLoginEvent(
  appData: AppData,
  params: {
    username: string;
    nama: string;
    role: string;
    status: LoginStatus;
    failureReason?: string;
    customIp?: string;
    customUserAgent?: string;
  }
): AppData {
  const client = getClientMetadata();
  const ipAddress = params.customIp || client.ip;
  const ua = params.customUserAgent || client.userAgent;
  const { device, browser } = parseUserAgent(ua);
  const now = new Date();
  const statusMeta = getLoginStatusMeta(params.status);

  const sessionId = params.status === 'success' ? `sess-${Date.now()}-${Math.floor(Math.random() * 1000)}` : undefined;

  const newLog: UserLoginLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: now.toISOString(),
    formattedTime: formatIndonesianDateTime(now),
    username: params.username,
    nama: params.nama || params.username,
    role: params.role || 'unknown',
    status: params.status,
    statusLabel: statusMeta.label,
    ipAddress,
    location: client.location || 'Jaringan Lokal Sekolah',
    device,
    browser,
    userAgent: ua,
    failureReason: params.failureReason,
    sessionId,
  };

  // Filter legacy dummy logs if any exist
  const existingLogs = (appData.userLoginLogs || []).filter(
    (l) => !l.id.startsWith('log-login-') && !l.id.startsWith('log-srv-')
  );

  let updatedSessions = (appData.activeUserSessions || []).filter(
    (s) =>
      !s.id.startsWith('sess-srv-') &&
      !s.id.startsWith('sess-guru-') &&
      !s.id.startsWith('sess-kesiswaan-') &&
      !s.id.startsWith('sess-siswa-') &&
      s.id !== 'sess-admin-active' &&
      s.id !== 'sess-guru1-active'
  );

  if (params.status === 'success' && sessionId) {
    // If user already had a session with same username, replace or keep latest
    const filtered = updatedSessions.filter(
      (s) => !(s.username.toLowerCase() === params.username.toLowerCase() && s.ipAddress === ipAddress)
    );
    const newSession: ActiveUserSession = {
      id: sessionId,
      username: params.username,
      nama: params.nama || params.username,
      role: params.role || 'unknown',
      loginAt: now.toISOString(),
      lastActiveAt: now.toISOString(),
      formattedLoginTime: formatIndonesianDateTime(now),
      ipAddress,
      location: client.location || 'Jaringan Lokal Sekolah',
      device,
      browser,
      userAgent: ua,
      isCurrent: true,
    };
    updatedSessions = [newSession, ...filtered];
  }

  // Also broadcast to backend if endpoint available
  try {
    fetch('/api/user-logins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog),
    }).catch(() => {});
  } catch {}

  return {
    ...appData,
    userLoginLogs: [newLog, ...existingLogs].slice(0, 500), // retain latest 500 logs
    activeUserSessions: updatedSessions,
  };
}

/**
 * Terminate a single active session
 */
export function terminateUserSession(
  appData: AppData,
  sessionId: string,
  terminatedBy: string = 'admin'
): AppData {
  const sessions = appData.activeUserSessions || [];
  const target = sessions.find((s) => s.id === sessionId);

  if (!target) return appData;

  const filteredSessions = sessions.filter((s) => s.id !== sessionId);

  const now = new Date();
  const termLog: UserLoginLog = {
    id: `term-${Date.now()}`,
    timestamp: now.toISOString(),
    formattedTime: formatIndonesianDateTime(now),
    username: target.username,
    nama: target.nama,
    role: target.role,
    status: 'session_terminated',
    statusLabel: 'Sesi Diputus',
    ipAddress: target.ipAddress,
    location: target.location,
    device: target.device,
    browser: target.browser,
    userAgent: target.userAgent,
    failureReason: `Sesi login pengguna diputuskan secara paksa oleh ${terminatedBy}`,
  };

  const existingLogs = appData.userLoginLogs || [];

  return {
    ...appData,
    activeUserSessions: filteredSessions,
    userLoginLogs: [termLog, ...existingLogs],
  };
}

/**
 * Terminate all other sessions except current user's session
 */
export function terminateAllOtherUserSessions(
  appData: AppData,
  currentUsername: string = 'admin'
): AppData {
  const sessions = appData.activeUserSessions || [];
  const currentSession = sessions.find(
    (s) => s.username.toLowerCase() === currentUsername.toLowerCase()
  );

  const terminated = sessions.filter(
    (s) => s.username.toLowerCase() !== currentUsername.toLowerCase()
  );

  const now = new Date();
  const termLogs: UserLoginLog[] = terminated.map((t, idx) => ({
    id: `term-all-${Date.now()}-${idx}`,
    timestamp: now.toISOString(),
    formattedTime: formatIndonesianDateTime(now),
    username: t.username,
    nama: t.nama,
    role: t.role,
    status: 'session_terminated',
    statusLabel: 'Sesi Diputus Massal',
    ipAddress: t.ipAddress,
    location: t.location,
    device: t.device,
    browser: t.browser,
    userAgent: t.userAgent,
    failureReason: 'Diputuskan via aksi Darurat: Putuskan Semua Sesi Pengguna Lain',
  }));

  const existingLogs = appData.userLoginLogs || [];

  return {
    ...appData,
    activeUserSessions: currentSession ? [currentSession] : [],
    userLoginLogs: [...termLogs, ...existingLogs],
  };
}
