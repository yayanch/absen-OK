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

  // 1. SQL Injection Signatures
  const sqliPatterns: { regex: RegExp; name: string }[] = [
    { regex: /(\%27)|(\')\s*(or|and)\s*[\'\d]/i, name: 'WAF-SQLI-001: SQL Quote OR/AND condition bypass' },
    { regex: /'\s*or\s*'[^']*'\s*=\s*'[^']*/i, name: 'WAF-SQLI-002: Tautological string bypass (\' or \'a\'=\'a\')' },
    { regex: /or\s+1\s*=\s*1/i, name: 'WAF-SQLI-003: Boolean-based OR 1=1 condition' },
    { regex: /union(\s|\+)+select/i, name: 'WAF-SQLI-004: UNION SELECT data exfiltration attempt' },
    { regex: /insert(\s|\+)+into/i, name: 'WAF-SQLI-005: Unauthorized INSERT statement injection' },
    { regex: /drop(\s|\+)+table/i, name: 'WAF-SQLI-006: Malicious DDL DROP TABLE command' },
    { regex: /select(\s|\+)+.*(\s|\+)+from/i, name: 'WAF-SQLI-007: Out-of-band SELECT FROM query' },
    { regex: /exec(\s|\+)+(s|x)p\w+/i, name: 'WAF-SQLI-008: Stored procedure execution injection' },
    { regex: /sleep\s*\(\s*\d+\s*\)/i, name: 'WAF-SQLI-009: Time-based blind SQLi SLEEP function' },
    { regex: /benchmark\s*\(\s*\d+/i, name: 'WAF-SQLI-010: MySQL BENCHMARK denial-of-service query' },
    { regex: /waitfor\s+delay\s+['"\d]/i, name: 'WAF-SQLI-011: SQL Server WAITFOR DELAY blind payload' },
    { regex: /admin'--/i, name: 'WAF-SQLI-012: Admin comment truncation authentication bypass' },
    { regex: /'\s*;\s*--/i, name: 'WAF-SQLI-013: Query termination and comment bypass' },
    { regex: /information_schema/i, name: 'WAF-SQLI-014: Database schema reconnaissance query' },
    { regex: /--\s*$/m, name: 'WAF-SQLI-015: Inline SQL comment operator' },
  ];

  for (const item of sqliPatterns) {
    if (item.regex.test(input)) {
      return {
        isMalicious: true,
        threatType: 'sqli',
        snippet: input.slice(0, 120),
        ruleMatched: item.name,
      };
    }
  }

  // 2. Cross-Site Scripting (XSS) Signatures
  const xssPatterns: { regex: RegExp; name: string }[] = [
    { regex: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, name: 'WAF-XSS-001: Malicious <script> block tag' },
    { regex: /javascript:\s*[^\n]*/i, name: 'WAF-XSS-002: javascript: URI pseudo-protocol' },
    { regex: /<img\b[^>]*\bonerror\s*=/i, name: 'WAF-XSS-003: <img> tag with inline onerror handler' },
    { regex: /<svg\b[^>]*\bonload\s*=/i, name: 'WAF-XSS-004: <svg> tag with inline onload event' },
    { regex: /<iframe\b[^>]*>/i, name: 'WAF-XSS-005: Arbitrary <iframe> frame injection' },
    { regex: /\bon(load|error|click|focus|mouseover|mouseenter|submit)\s*=\s*['"]?[^'"]+/i, name: 'WAF-XSS-006: DOM event handler injection' },
    { regex: /document\.(cookie|location|write|body)/i, name: 'WAF-XSS-007: Document object manipulation (Cookie/Location/Write)' },
    { regex: /alert\s*\(\s*[^)]*\)/i, name: 'WAF-XSS-008: JavaScript alert execution payload' },
    { regex: /fetch\s*\(\s*['"]https?:\/\//i, name: 'WAF-XSS-009: Data exfiltration via dynamic fetch()' },
    { regex: /eval\s*\(\s*[^)]+\)/i, name: 'WAF-XSS-010: Arbitrary code execution via eval()' },
  ];

  for (const item of xssPatterns) {
    if (item.regex.test(input)) {
      return {
        isMalicious: true,
        threatType: 'xss',
        snippet: input.slice(0, 120),
        ruleMatched: item.name,
      };
    }
  }

  // 3. Path Traversal
  const pathTraversalPatterns: { regex: RegExp; name: string }[] = [
    { regex: /(\.\.\/|\.\.\\)/i, name: 'WAF-DIR-001: Directory climbing sequence (../)' },
    { regex: /%2e%2e(%2f|\/|%5c|\\)/i, name: 'WAF-DIR-002: URL encoded traversal sequence (%2e%2e/)' },
    { regex: /\/etc\/(passwd|shadow|hosts|group)/i, name: 'WAF-DIR-003: Unix sensitive system file target (/etc/passwd)' },
    { regex: /c:\\(windows|boot\.ini|winnt)/i, name: 'WAF-DIR-004: Windows sensitive system path target' },
  ];

  for (const item of pathTraversalPatterns) {
    if (item.regex.test(input)) {
      return {
        isMalicious: true,
        threatType: 'path_traversal',
        snippet: input.slice(0, 120),
        ruleMatched: item.name,
      };
    }
  }

  // 4. Command Injection
  const cmdPatterns: { regex: RegExp; name: string }[] = [
    { regex: /;\s*(cat|whoami|id|ls|rm|curl|wget|bash|sh|nc|netcat)\b/i, name: 'WAF-RCE-001: Shell command chaining semicolon (;)' },
    { regex: /\|\s*(nc|bash|sh|whoami|cat)\b/i, name: 'WAF-RCE-002: Pipe command shell redirection (|)' },
    { regex: /&&\s*(whoami|cat|id|curl|wget)\b/i, name: 'WAF-RCE-003: Logical AND command execution (&&)' },
    { regex: /`[^`]*\b(whoami|cat|id|ls)\b[^`]*`/i, name: 'WAF-RCE-004: Backtick command substitution' },
  ];

  for (const item of cmdPatterns) {
    if (item.regex.test(input)) {
      return {
        isMalicious: true,
        threatType: 'command_injection',
        snippet: input.slice(0, 120),
        ruleMatched: item.name,
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
  const found = blockedIps.find((b) => b.ip.trim() === ip.trim());
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

// Failed Login Attempts persistence helpers
export const getPersistentFailedAttempts = (username: string): number => {
  if (typeof window === 'undefined') return 0;
  try {
    const key = `sec_failed_logins_${username.toLowerCase().trim()}`;
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
};

export const setPersistentFailedAttempts = (username: string, count: number): void => {
  if (typeof window === 'undefined') return;
  try {
    const key = `sec_failed_logins_${username.toLowerCase().trim()}`;
    if (count <= 0) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, String(count));
      localStorage.setItem(key, String(count));
    }
  } catch {}
};

export const clearPersistentFailedAttempts = (username: string): void => {
  setPersistentFailedAttempts(username, 0);
};

// Clean expired locks
export const filterActiveLocks = (locks: LockedAccount[] = []): LockedAccount[] => {
  const now = Date.now();
  return locks.filter((l) => new Date(l.unlocksAt).getTime() > now);
};

// Clean expired IP blocks
export const filterActiveBlockedIps = (ips: BlockedIp[] = []): BlockedIp[] => {
  const now = Date.now();
  return ips.filter((b) => {
    if (!b.expiresAt) return true;
    return new Date(b.expiresAt).getTime() > now;
  });
};
