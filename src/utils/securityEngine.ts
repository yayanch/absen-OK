import { AppData, BlockedIp, LockedAccount, SecurityConfig, SecurityIncident } from '../types';

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  idsEnabled: true,
  maxFailedLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  autoBanMaliciousIps: true,
  strictWafInspection: true,
  nightAnomalyAlertEnabled: true,
  notificationPopupOnCritical: true,
  ipWhitelist: ['127.0.0.1', '192.168.1.1', '::1'],
  usernameWhitelist: [],
};

// Seed sample realistic security incidents for initial IDS readiness
export const INITIAL_SECURITY_INCIDENTS: SecurityIncident[] = [
  {
    id: 'sec-inc-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    formattedTime: new Date(Date.now() - 1000 * 60 * 45).toLocaleString('id-ID'),
    type: 'brute_force_login',
    severity: 'high',
    title: 'Percobaan Brute Force Login Terdeteksi',
    description: 'Terdeteksi 4 kali percobaan login gagal berturut-turut pada username "admin" dalam rentang 30 detik.',
    targetUsername: 'admin',
    targetRole: 'admin',
    ipAddress: '182.253.140.22',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Python/Requests/2.31.0',
    payloadSnippet: 'admin / pass: [admin1234, admin2026, password123, toor]',
    status: 'blocked',
    actionTaken: 'rate_limited',
    locationEstimate: 'Bandung, Indonesia',
  },
  {
    id: 'sec-inc-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    formattedTime: new Date(Date.now() - 1000 * 60 * 120).toLocaleString('id-ID'),
    type: 'suspicious_payload',
    severity: 'critical',
    title: 'Injeksi SQL / WAF Rule Triggered',
    description: 'Input parameter form login memuat pola query SQL manipulatif (`UNION SELECT`) yang diblokir oleh Web Application Firewall.',
    targetUsername: "admin' UNION SELECT 1,2,3--",
    targetRole: 'unknown',
    ipAddress: '103.119.54.91',
    userAgent: 'sqlmap/1.7.2#stable (https://sqlmap.org)',
    payloadSnippet: "' UNION SELECT NULL, version(), user()-- -",
    status: 'blocked',
    actionTaken: 'request_dropped',
    locationEstimate: 'Jakarta, Indonesia',
  },
  {
    id: 'sec-inc-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    formattedTime: new Date(Date.now() - 1000 * 60 * 360).toLocaleString('id-ID'),
    type: 'anomaly_access_time',
    severity: 'low',
    title: 'Akses di Luar Jam Operasional Sekolah',
    description: 'Aktivitas sesi otorisasi guru terdeteksi pada pukul 02:45 WIB dini hari (di luar jadwal sekolah).',
    targetUsername: 'guru1',
    targetRole: 'guru',
    ipAddress: '114.122.204.18',
    userAgent: 'Mozilla/5.0 (Android 14; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0',
    payloadSnippet: 'Normal Auth Request',
    status: 'resolved',
    actionTaken: 'none',
    locationEstimate: 'Garut, Indonesia',
  },
];

// Initial Blocked IP sample
export const INITIAL_BLOCKED_IPS: BlockedIp[] = [
  {
    id: 'blk-1',
    ip: '103.119.54.91',
    reason: 'Upaya automated SQL Injection scanning berulang (WAF Signature Alert)',
    blockedAt: new Date(Date.now() - 1000 * 60 * 120).toLocaleString('id-ID'),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toLocaleString('id-ID'),
    blockedBy: 'IDS Engine (Auto)',
    threatCount: 7,
  },
];

// Format current timestamp
export const formatIndonesianDateTime = (date: Date = new Date()): string => {
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// Client fingerprint generator
export const getClientMetadata = (): { ip: string; userAgent: string; location: string } => {
  let storedIp = '';
  try {
    storedIp = sessionStorage.getItem('client_sim_ip') || '';
    if (!storedIp) {
      const octet3 = Math.floor(Math.random() * 200) + 10;
      const octet4 = Math.floor(Math.random() * 250) + 2;
      storedIp = `180.252.${octet3}.${octet4}`;
      sessionStorage.setItem('client_sim_ip', storedIp);
    }
  } catch {
    storedIp = '180.252.164.88';
  }

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Client Browser';
  const location = 'Garut, Jawa Barat, ID';

  return { ip: storedIp, userAgent, location };
};

// Payload Inspection Engine (WAF Signatures)
export interface PayloadInspectionResult {
  isMalicious: boolean;
  threatType?: 'sqli' | 'xss' | 'path_traversal' | 'command_injection';
  snippet?: string;
  ruleMatched?: string;
}

export const inspectInputPayload = (input: string): PayloadInspectionResult => {
  if (!input || typeof input !== 'string') {
    return { isMalicious: false };
  }

  const lower = input.toLowerCase();

  // 1. SQL Injection Signatures (Targeted exploit patterns, avoid matching single characters)
  const sqliPatterns = [
    /(\%27)|(\')\s*(or|and)\s*[\'\d]/i,
    /union(\s)+select/i,
    /insert(\s)+into/i,
    /drop(\s)+table/i,
    /select(\s)+.*(\s)+from/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /sleep\s*\(\s*\d+\s*\)/i,
    /benchmark\s*\(\s*\d+/i,
    /or\s+1\s*=\s*1/i,
    /'\s*or\s*'[^']*'\s*=\s*'[^']*/i,
    /admin'--/i,
    /--\s*$/m,
  ];

  for (const pattern of sqliPatterns) {
    if (pattern.test(input)) {
      return {
        isMalicious: true,
        threatType: 'sqli',
        snippet: input.slice(0, 100),
        ruleMatched: 'WAF-SQLI-001: SQL Injection Meta-Character / Query Bypass',
      };
    }
  }

  // 2. Cross-Site Scripting (XSS) Signatures
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:[^\n]*/i,
    /<img[^\>]+src[^\>]+onerror[^\>]*>/i,
    /<svg[^\>]+onload[^\>]*>/i,
    /on(load|error|click|focus|mouseover|mouseenter)\s*=/i,
    /document\.(cookie|location|write)/i,
    /alert\s*\(/i,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(input)) {
      return {
        isMalicious: true,
        threatType: 'xss',
        snippet: input.slice(0, 100),
        ruleMatched: 'WAF-XSS-002: Malicious JavaScript Payload / Tag Injection',
      };
    }
  }

  // 3. Path Traversal
  const pathTraversalPatterns = [
    /(\.\.\/|\.\.\\)/i,
    /\%2e\%2e\%2f/i,
    /\/etc\/passwd/i,
    /c:\\windows\\system32/i,
  ];

  for (const pattern of pathTraversalPatterns) {
    if (pattern.test(input)) {
      return {
        isMalicious: true,
        threatType: 'path_traversal',
        snippet: input.slice(0, 100),
        ruleMatched: 'WAF-DIR-003: Directory Path Traversal Sequence',
      };
    }
  }

  // 4. Command Injection
  const cmdPatterns = [/;\s*(cat|whoami|ls|rm|curl|wget|bash|sh|nc)\b/i, /\|\s*(nc|bash|sh)/i];
  for (const pattern of cmdPatterns) {
    if (pattern.test(input)) {
      return {
        isMalicious: true,
        threatType: 'command_injection',
        snippet: input.slice(0, 100),
        ruleMatched: 'WAF-RCE-004: OS Command Injection Shell Pattern',
      };
    }
  }

  return { isMalicious: false };
};

// Check if account is currently locked
export const checkAccountLockStatus = (
  username: string,
  lockedAccounts: LockedAccount[] = []
): { isLocked: boolean; remainingMinutes?: number; lockInfo?: LockedAccount } => {
  if (!username) return { isLocked: false };
  const target = username.toLowerCase().trim();
  const found = lockedAccounts.find((l) => l.username.toLowerCase().trim() === target);

  if (!found) return { isLocked: false };

  const now = Date.now();
  const unlocksTime = new Date(found.unlocksAt).getTime();

  if (now < unlocksTime) {
    const diffMs = unlocksTime - now;
    const remainingMinutes = Math.ceil(diffMs / (1000 * 60));
    return { isLocked: true, remainingMinutes, lockInfo: found };
  }

  return { isLocked: false };
};

// Check if IP is currently blocked
export const checkIpBlockedStatus = (
  ip: string,
  blockedIps: BlockedIp[] = []
): { isBlocked: boolean; blockInfo?: BlockedIp } => {
  if (!ip) return { isBlocked: false };
  const found = blockedIps.find((b) => b.ip === ip);
  if (!found) return { isBlocked: false };

  if (found.expiresAt) {
    const now = Date.now();
    const expiresTime = new Date(found.expiresAt).getTime();
    if (now > expiresTime) {
      return { isBlocked: false }; // Expired
    }
  }

  return { isBlocked: true, blockInfo: found };
};

// Check if current hour is night anomaly (e.g. 23:00 - 05:00)
export const isNightHourAccess = (): boolean => {
  const currentHour = new Date().getHours();
  return currentHour >= 23 || currentHour < 5;
};
