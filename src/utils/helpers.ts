import * as XLSX from 'xlsx';
import { AppData, UserSession, SiswaPresensiItem, ShiftPeriod, ChatMessage, SyncResult, SyncStatus, Pelanggaran, HomeVisit } from '../types';
import { DEMO_DATASET, DEFAULT_TOGA_LOGO, getTodayString, randomizeWaForStudents } from '../data/initialData';
import {
  DEFAULT_SECURITY_CONFIG,
  INITIAL_BLOCKED_IPS,
  INITIAL_SECURITY_INCIDENTS,
} from './securityEngine';

export { getTodayString };

export function mergeChatMessages(
  localMsgs: ChatMessage[] = [],
  serverMsgs: ChatMessage[] = []
): ChatMessage[] {
  if (!Array.isArray(localMsgs)) localMsgs = [];
  if (!Array.isArray(serverMsgs)) serverMsgs = [];

  if (localMsgs.length === 0) return serverMsgs;
  if (serverMsgs.length === 0) return localMsgs;

  const serverMsgMap = new Map<string, ChatMessage>();
  for (const m of serverMsgs) {
    if (m && m.id) {
      serverMsgMap.set(m.id, m);
    }
  }

  const result: ChatMessage[] = [...serverMsgs];
  const now = Date.now();

  // Find local messages that might not have reached server yet (in-flight or optimistic)
  for (const localMsg of localMsgs) {
    if (!localMsg || !localMsg.id) continue;
    if (!serverMsgMap.has(localMsg.id)) {
      // Check if this message was created recently (within last 45 seconds)
      const tsMatch = localMsg.id.match(/^CHAT_(\d+)/);
      const msgTime = tsMatch ? parseInt(tsMatch[1], 10) : 0;
      const isRecent = !msgTime || (now - msgTime < 45000);

      // If it's a recent message or marked as pending/sent, keep it so it never vanishes
      if (isRecent || localMsg.status === 'pending' || localMsg.status === 'sent') {
        result.push(localMsg);
      }
    }
  }

  return result;
}

export function mergePelanggaran(
  localList: Pelanggaran[] = [],
  serverList: Pelanggaran[] = [],
  deletedIds: string[] = []
): Pelanggaran[] {
  if (!Array.isArray(localList)) localList = [];
  if (!Array.isArray(serverList)) serverList = [];
  const deletedSet = new Set(deletedIds || []);

  const filteredServer = serverList.filter(item => item && item.id && !deletedSet.has(item.id));
  const filteredLocal = localList.filter(item => item && item.id && !deletedSet.has(item.id));

  const serverMap = new Map<string, Pelanggaran>();
  for (const item of filteredServer) {
    if (item && item.id) {
      serverMap.set(item.id, item);
    }
  }

  const result: Pelanggaran[] = [...filteredServer];
  const now = Date.now();

  for (const localItem of filteredLocal) {
    if (!localItem || !localItem.id) continue;
    if (!serverMap.has(localItem.id)) {
      const tsMatch = localItem.id.match(/^PLG_(\d+)/);
      const itemTime = tsMatch ? parseInt(tsMatch[1], 10) : 0;
      const isRecent = !itemTime || (now - itemTime < 45000);

      if (isRecent) {
        result.push(localItem);
      }
    }
  }

  return result.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return b.id.localeCompare(a.id);
  });
}

export function mergeHomeVisits(
  localList: HomeVisit[] = [],
  serverList: HomeVisit[] = [],
  deletedIds: string[] = []
): HomeVisit[] {
  if (!Array.isArray(localList)) localList = [];
  if (!Array.isArray(serverList)) serverList = [];
  const deletedSet = new Set(deletedIds || []);

  const filteredServer = serverList.filter(item => item && item.id && !deletedSet.has(item.id));
  const filteredLocal = localList.filter(item => item && item.id && !deletedSet.has(item.id));

  const serverMap = new Map<string, HomeVisit>();
  for (const item of filteredServer) {
    if (item && item.id) {
      serverMap.set(item.id, item);
    }
  }

  const result: HomeVisit[] = [...filteredServer];
  const now = Date.now();

  for (const localItem of filteredLocal) {
    if (!localItem || !localItem.id) continue;
    if (!serverMap.has(localItem.id)) {
      const tsMatch = localItem.id.match(/^HV_(\d+)/);
      const itemTime = tsMatch ? parseInt(tsMatch[1], 10) : 0;
      const isRecent = !itemTime || (now - itemTime < 45000);

      if (isRecent) {
        result.push(localItem);
      }
    }
  }

  return result.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return b.id.localeCompare(a.id);
  });
}

export function normalizePresensiStatus(status: any): 'H' | 'I' | 'S' | 'A' | 'K' | 'D' | 'TAP' | '' {
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

export function isValidPresensiStatus(status: any): boolean {
  if (!status) return true; // Empty/unassigned is allowed before selection
  const normalized = normalizePresensiStatus(status);
  return ['H', 'I', 'S', 'A', 'K', 'D', 'TAP'].includes(normalized);
}

export function normalizeAttendanceRecord(raw: Partial<SiswaPresensiItem>): SiswaPresensiItem {
  const siswaId = String(raw.siswaId || '').trim();
  const status = normalizePresensiStatus(raw.status);
  
  let time = raw.time ? String(raw.time).trim() : '';
  let pulangTime = raw.pulangTime ? String(raw.pulangTime).trim() : '';
  let pulangStatus: 'H' | 'TAP' | '' = '';

  if (['H', 'K'].includes(status)) {
    pulangStatus = raw.pulangStatus === 'H' ? 'H' : 'TAP';
    if (!time) {
      time = '07:00';
    }
    if (pulangStatus === 'H' && !pulangTime) {
      pulangTime = '12:00';
    }
  } else {
    // For S, I, A, D - no active checkout
    pulangStatus = '';
    pulangTime = '';
    time = '';
  }

  const catatan = raw.catatan ? String(raw.catatan).trim() : undefined;
  const suratBukti = raw.suratBukti && typeof raw.suratBukti === 'string' && raw.suratBukti.trim() ? raw.suratBukti.trim() : undefined;

  return {
    siswaId,
    status,
    ...(time ? { time } : {}),
    ...(pulangTime ? { pulangTime } : {}),
    ...(pulangStatus ? { pulangStatus } : {}),
    ...(suratBukti ? { suratBukti } : {}),
    ...(catatan ? { catatan } : {}),
  };
}

export function deduplicateAttendanceRecords(records: SiswaPresensiItem[]): SiswaPresensiItem[] {
  if (!Array.isArray(records) || records.length === 0) return [];
  const map = new Map<string, SiswaPresensiItem>();
  for (const r of records) {
    if (!r || !r.siswaId) continue;
    const cleanId = String(r.siswaId).trim();
    if (!cleanId) continue;
    // Normalized entry
    map.set(cleanId, normalizeAttendanceRecord(r));
  }
  return Array.from(map.values());
}

export function validateAttendanceRecord(
  record: SiswaPresensiItem,
  validStudentIds?: Set<string>
): { valid: boolean; errors: string[]; normalizedRecord: SiswaPresensiItem } {
  const errors: string[] = [];
  const normalized = normalizeAttendanceRecord(record);

  if (!normalized.siswaId) {
    errors.push('Identitas siswa (siswaId) tidak boleh kosong.');
  } else if (validStudentIds && !validStudentIds.has(normalized.siswaId)) {
    errors.push(`Siswa dengan ID "${normalized.siswaId}" tidak ditemukan dalam daftar siswa aktif.`);
  }

  if (record.status && !isValidPresensiStatus(record.status)) {
    errors.push(`Status presensi "${record.status}" tidak valid.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    normalizedRecord: normalized,
  };
}

export function validateAttendanceBatch(
  key: string,
  records: SiswaPresensiItem[],
  validStudentIds?: Set<string>
): { valid: boolean; errors: string[]; deduplicatedRecords: SiswaPresensiItem[] } {
  const errors: string[] = [];
  if (!key || !key.includes('_')) {
    errors.push(`Kunci presensi "${key}" tidak valid (format yang diharapkan: YYYY-MM-DD_kelasId).`);
  }

  const [datePart, kelasIdPart] = (key || '').split('_');
  if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    errors.push(`Format tanggal presensi "${datePart}" tidak valid.`);
  }
  if (!kelasIdPart) {
    errors.push('Identitas kelas pada kunci presensi tidak boleh kosong.');
  }

  if (!Array.isArray(records)) {
    errors.push('Data rekaman presensi harus berupa array.');
    return { valid: false, errors, deduplicatedRecords: [] };
  }

  const seenIds = new Set<string>();
  const deduplicatedRecords: SiswaPresensiItem[] = [];

  for (const rec of records) {
    if (!rec || !rec.siswaId) continue;
    const cleanId = String(rec.siswaId).trim();
    if (!cleanId) continue;

    if (seenIds.has(cleanId)) {
      // Duplicate entry detected in incoming batch
      continue;
    }
    seenIds.add(cleanId);

    const check = validateAttendanceRecord(rec, validStudentIds);
    if (!check.valid) {
      errors.push(...check.errors);
    } else {
      deduplicatedRecords.push(check.normalizedRecord);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    deduplicatedRecords,
  };
}

export function formatPercentage(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value) || isNaN(value)) return '0.00%';
  const clamped = Math.max(0, Math.min(100, value));
  return `${clamped.toFixed(decimals)}%`;
}

export const CANONICAL_STATUS_LABELS: Record<string, string> = {
  H: 'Hadir',
  I: 'Izin',
  S: 'Sakit',
  A: 'Alpa',
  K: 'Kesiangan',
  D: 'Dispensasi',
  TAP: 'Tidak Absen Pulang',
};

export const CANONICAL_STATUS_COLORS: Record<string, { label: string; text: string; bg: string; border: string }> = {
  H: { label: 'Hadir', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/60', border: 'border-emerald-200 dark:border-emerald-800' },
  I: { label: 'Izin', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/60', border: 'border-amber-200 dark:border-amber-800' },
  S: { label: 'Sakit', text: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-950/60', border: 'border-indigo-200 dark:border-indigo-800' },
  A: { label: 'Alpa', text: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/60', border: 'border-rose-200 dark:border-rose-800' },
  K: { label: 'Kesiangan', text: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-950/60', border: 'border-orange-200 dark:border-orange-800' },
  D: { label: 'Dispensasi', text: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/60', border: 'border-purple-200 dark:border-purple-800' },
  TAP: { label: 'Tidak Absen Pulang', text: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700' },
};

export interface AttendanceDailyStats {
  tanggal: string;
  totalSiswa: number;
  expectedAttendanceCount: number;
  hadirCount: number;
  hadirMurniCount: number;
  sakitCount: number;
  izinCount: number;
  alpaCount: number;
  kesianganCount: number;
  dispensasiCount: number;
  recordedCount: number;
  unfilledCount: number;
  duplicatesDetected: number;
  invalidRecordsCount: number;
  attendanceRate: number; // 0-100 raw float
  attendanceRateFormatted: string; // e.g. "85.71%"
  absenceRate: number; // 0-100 raw float
  absenceRateFormatted: string; // e.g. "14.29%"
  isFullyRecorded: boolean;
  isEffectiveSchoolDay: boolean;
  isHoliday: boolean;
  holidayInfo?: any;
}

export interface EffectiveSchoolDaysOptions {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  appData: AppData;
  kelasId?: string;
  includeSaturday?: boolean;
}

export function getEffectiveSchoolDays(options: EffectiveSchoolDaysOptions): string[] {
  const { startDate, endDate, appData, includeSaturday = false } = options;
  if (!startDate || !endDate || startDate > endDate) return [];

  const schoolStart = appData?.sekolah?.tanggalMulai;
  const schoolEnd = appData?.sekolah?.tanggalAkhir;

  const holidayDates = new Set<string>();
  if (appData.hariLibur && Array.isArray(appData.hariLibur)) {
    for (const h of appData.hariLibur) {
      if (h && h.tanggal) {
        holidayDates.add(h.tanggal.trim().slice(0, 10));
      }
    }
  }

  const effectiveDays: string[] = [];
  const [startYear, startMonth, startDay] = startDate.split('-').map((v) => parseInt(v, 10));
  const [endYear, endMonth, endDay] = endDate.split('-').map((v) => parseInt(v, 10));

  const current = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);
  const endLimit = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);

  while (current <= endLimit) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const isSun = dayOfWeek === 0;
    const isSat = dayOfWeek === 6;

    const isWeekendDay = isSun || (!includeSaturday && isSat);
    const isHoliday = holidayDates.has(dateStr);
    const isBeforeSchoolStart = Boolean(schoolStart && dateStr < schoolStart);
    const isAfterSchoolEnd = Boolean(schoolEnd && dateStr > schoolEnd);

    if (!isWeekendDay && !isHoliday && !isBeforeSchoolStart && !isAfterSchoolEnd) {
      effectiveDays.push(dateStr);
    }

    current.setDate(current.getDate() + 1);
  }

  return effectiveDays;
}

export function getCanonicalActiveStudents(
  appData: AppData,
  scope?: { kelasId?: string; jurusanId?: string; waliKelasId?: string }
) {
  if (!appData || !Array.isArray(appData.siswa)) return [];
  
  let targetClasses = appData.kelas || [];
  if (scope?.waliKelasId) {
    targetClasses = targetClasses.filter((k) => k.waliKelasId === scope.waliKelasId);
  }
  if (scope?.jurusanId && scope.jurusanId !== 'all') {
    targetClasses = targetClasses.filter((k) => k.jurusanId === scope.jurusanId);
  }
  if (scope?.kelasId && scope.kelasId !== 'all') {
    targetClasses = targetClasses.filter((k) => k.id === scope.kelasId);
  }

  const targetClassIds = new Set(targetClasses.map((k) => k.id));

  return appData.siswa.filter((s) => {
    const isActive = s.status !== 'tidak_aktif' && (s as any).status !== 'nonaktif';
    if (!isActive) return false;
    return targetClassIds.has(s.kelasId);
  });
}

export function calculateDailyAttendanceStats(
  appData: AppData,
  tanggal: string,
  scope?: { kelasId?: string; jurusanId?: string; waliKelasId?: string }
): AttendanceDailyStats {
  const students = getCanonicalActiveStudents(appData, scope);
  const totalSiswa = students.length;

  const holidayInfo = getHariLiburInfo(tanggal, appData);
  const isHoliday = Boolean(holidayInfo);
  const isWeekendDay = isWeekend(tanggal);
  const isBeforeStart = Boolean(appData?.sekolah?.tanggalMulai && tanggal < appData.sekolah.tanggalMulai);
  const isAfterEnd = Boolean(appData?.sekolah?.tanggalAkhir && tanggal > appData.sekolah.tanggalAkhir);
  const isEffectiveSchoolDay = !isWeekendDay && !isHoliday && !isBeforeStart && !isAfterEnd;
  const expectedAttendanceCount = isEffectiveSchoolDay ? totalSiswa : 0;

  let targetClasses = appData.kelas || [];
  if (scope?.waliKelasId) {
    targetClasses = targetClasses.filter((k) => k.waliKelasId === scope.waliKelasId);
  }
  if (scope?.jurusanId && scope.jurusanId !== 'all') {
    targetClasses = targetClasses.filter((k) => k.jurusanId === scope.jurusanId);
  }
  if (scope?.kelasId && scope.kelasId !== 'all') {
    targetClasses = targetClasses.filter((k) => k.id === scope.kelasId);
  }

  const validStudentMap = new Map<string, any>();
  for (const s of students) {
    validStudentMap.set(s.id, s);
    if (s.nisn) validStudentMap.set(s.nisn, s);
  }

  let hadirMurniCount = 0;
  let kesianganCount = 0;
  let sakitCount = 0;
  let izinCount = 0;
  let alpaCount = 0;
  let dispensasiCount = 0;
  let duplicatesDetected = 0;
  let invalidRecordsCount = 0;

  // Track recorded student IDs to prevent duplicate counting in statistics
  const recordedStudentIds = new Set<string>();

  for (const k of targetClasses) {
    const pKey = `${tanggal}_${k.id}`;
    const pRecords = appData.presensi ? appData.presensi[pKey] : undefined;
    if (!pRecords || !Array.isArray(pRecords)) continue;

    const seenInClass = new Set<string>();

    for (const rec of pRecords) {
      if (!rec || !rec.siswaId) {
        invalidRecordsCount++;
        continue;
      }
      const rawId = String(rec.siswaId).trim();
      const student = validStudentMap.get(rawId);
      if (!student) {
        // Orphaned or student not in target scope
        continue;
      }

      if (seenInClass.has(student.id)) {
        duplicatesDetected++;
        continue; // Exclude duplicate from counting twice
      }
      seenInClass.add(student.id);
      recordedStudentIds.add(student.id);

      const st = normalizePresensiStatus(rec.status);
      if (st === 'H') hadirMurniCount++;
      else if (st === 'K') kesianganCount++;
      else if (st === 'S') sakitCount++;
      else if (st === 'I') izinCount++;
      else if (st === 'A') alpaCount++;
      else if (st === 'D') dispensasiCount++;
      else if (st !== '') invalidRecordsCount++;
    }
  }

  const hadirCount = hadirMurniCount + kesianganCount; // Both represent students attending school
  const recordedCount = recordedStudentIds.size;
  const unfilledCount = Math.max(0, totalSiswa - recordedCount);

  // Standard attendance rate in Indonesian schools: Hadir (termasuk Terlambat & Dispensasi) / Total Siswa
  const attendanceNumerator = hadirMurniCount + kesianganCount + dispensasiCount;
  const attendanceRate = totalSiswa > 0 ? (attendanceNumerator / totalSiswa) * 100 : 0;
  const absenceNumerator = sakitCount + izinCount + alpaCount;
  const absenceRate = totalSiswa > 0 ? (absenceNumerator / totalSiswa) * 100 : 0;

  const isFullyRecorded = totalSiswa > 0 && recordedCount >= totalSiswa;

  return {
    tanggal,
    totalSiswa,
    expectedAttendanceCount,
    hadirCount,
    hadirMurniCount,
    sakitCount,
    izinCount,
    alpaCount,
    kesianganCount,
    dispensasiCount,
    recordedCount,
    unfilledCount,
    duplicatesDetected,
    invalidRecordsCount,
    attendanceRate,
    attendanceRateFormatted: formatPercentage(attendanceRate, 2),
    absenceRate,
    absenceRateFormatted: formatPercentage(absenceRate, 2),
    isFullyRecorded,
    isEffectiveSchoolDay,
    isHoliday,
    holidayInfo,
  };
}

export interface CumulativeStudentStatsItem {
  siswa: any;
  kelas?: any;
  expectedDays: number;
  recordedDays: number;
  unfilledDays: number;
  sakit: number;
  izin: number;
  alfa: number;
  kesiangan: number;
  dispensasi: number;
  hadir: number;
  attendedDays: number;
  totalTidakHadir: number;
  totalRecordedDays: number; // Backward compatibility alias
  attendanceRate: number;
  attendanceRateFormatted: string;
  absenceRate: number;
  absenceRateFormatted: string;
  duplicateCount: number;
  effectiveDays: string[];
  detailRecords: { tanggal: string; status: 'S' | 'I' | 'A' | 'K' | 'D' | 'H'; catatan?: string }[];
}

export function calculateCumulativeStudentStats(
  appData: AppData,
  options?: {
    maxDate?: string;
    startDate?: string;
    endDate?: string;
    month?: string; // Format 'YYYY-MM' or 'all'
    kelasId?: string;
    jurusanId?: string;
    waliKelasId?: string;
    includeSaturday?: boolean;
  }
): CumulativeStudentStatsItem[] {
  let evalStartDate: string;
  let evalEndDate: string;

  const schoolStart = appData.sekolah?.tanggalMulai || '2026-07-15';
  const schoolEnd = appData.sekolah?.tanggalAkhir;

  if (options?.startDate && options?.endDate) {
    evalStartDate = options.startDate;
    evalEndDate = options.endDate;
  } else if (options?.month && options.month !== 'all') {
    const [y, m] = options.month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const endOfMonth = `${options.month}-${String(lastDay).padStart(2, '0')}`;
    const firstOfMonth = `${options.month}-01`;
    evalStartDate = options.startDate || (schoolStart > firstOfMonth && schoolStart.startsWith(options.month) ? schoolStart : firstOfMonth);
    evalEndDate = options.endDate || (options.maxDate && options.maxDate < endOfMonth ? options.maxDate : endOfMonth);
  } else {
    evalStartDate = options?.startDate || schoolStart;
    evalEndDate = options?.endDate || options?.maxDate || getTodayString();
  }

  if (schoolEnd && evalEndDate > schoolEnd) {
    evalEndDate = schoolEnd;
  }

  // Calculate canonical effective school days in range
  const effectiveDays = getEffectiveSchoolDays({
    startDate: evalStartDate,
    endDate: evalEndDate,
    appData,
    kelasId: options?.kelasId,
    includeSaturday: options?.includeSaturday,
  });
  const expectedDays = effectiveDays.length;

  const students = getCanonicalActiveStudents(appData, options);
  const targetClasses = appData.kelas || [];

  return students.map((s) => {
    let sakit = 0;
    let izin = 0;
    let alfa = 0;
    let kesiangan = 0;
    let dispensasi = 0;
    let hadir = 0;
    let duplicateCount = 0;
    const detailRecords: { tanggal: string; status: 'S' | 'I' | 'A' | 'K' | 'D' | 'H'; catatan?: string }[] = [];
    const seenDates = new Set<string>();

    if (appData.presensi && typeof appData.presensi === 'object') {
      Object.keys(appData.presensi).forEach((key) => {
        const underscoreIdx = key.indexOf('_');
        if (underscoreIdx === -1) return;

        const tgl = key.slice(0, underscoreIdx);
        const kId = key.slice(underscoreIdx + 1);

        if (kId === s.kelasId && tgl >= evalStartDate && tgl <= evalEndDate) {
          if (options?.month && options.month !== 'all' && !tgl.startsWith(`${options.month}-`)) return;

          const recs = appData.presensi[key];
          if (Array.isArray(recs)) {
            const matchedRecs = recs.filter((item) => item.siswaId === s.id || item.siswaId === s.nisn);
            if (matchedRecs.length > 1) {
              duplicateCount += matchedRecs.length - 1;
            }
            const r = matchedRecs[0];
            if (r) {
              if (seenDates.has(tgl)) {
                duplicateCount++;
                return;
              }
              seenDates.add(tgl);

              const st = normalizePresensiStatus(r.status);
              if (st === 'S') {
                sakit++;
                detailRecords.push({ tanggal: tgl, status: 'S', catatan: (r as any).catatan });
              } else if (st === 'I') {
                izin++;
                detailRecords.push({ tanggal: tgl, status: 'I', catatan: (r as any).catatan });
              } else if (st === 'A') {
                alfa++;
                detailRecords.push({ tanggal: tgl, status: 'A', catatan: (r as any).catatan });
              } else if (st === 'K') {
                kesiangan++;
                detailRecords.push({ tanggal: tgl, status: 'K', catatan: (r as any).catatan });
              } else if (st === 'D') {
                dispensasi++;
                detailRecords.push({ tanggal: tgl, status: 'D', catatan: (r as any).catatan });
              } else if (st === 'H') {
                hadir++;
                detailRecords.push({ tanggal: tgl, status: 'H', catatan: (r as any).catatan });
              }
            }
          }
        }
      });
    }

    detailRecords.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    const recordedDays = seenDates.size;
    const unfilledDays = Math.max(0, expectedDays - recordedDays);
    const attendedDays = hadir + kesiangan + dispensasi;
    const totalTidakHadir = sakit + izin + alfa;

    // Standard Canonical Formula:
    // Attendance Rate = (Attended Days / Expected Days) * 100
    const attendanceRate = expectedDays > 0 ? (attendedDays / expectedDays) * 100 : 0;
    const absenceRate = expectedDays > 0 ? (totalTidakHadir / expectedDays) * 100 : 0;

    return {
      siswa: s,
      kelas: targetClasses.find((k) => k.id === s.kelasId),
      expectedDays,
      recordedDays,
      unfilledDays,
      sakit,
      izin,
      alfa,
      kesiangan,
      dispensasi,
      hadir,
      attendedDays,
      totalTidakHadir,
      totalRecordedDays: recordedDays,
      attendanceRate,
      attendanceRateFormatted: formatPercentage(attendanceRate, 2),
      absenceRate,
      absenceRateFormatted: formatPercentage(absenceRate, 2),
      duplicateCount,
      effectiveDays,
      detailRecords,
    };
  });
}

export interface WeeklyStudentAttendanceItem {
  siswa: any;
  kelas?: any;
  expectedDays: number;
  recordedDays: number;
  unfilledDays: number;
  totalHadir: number;
  totalKesiangan: number;
  totalDispensasi: number;
  totalSakit: number;
  totalIzin: number;
  totalAlpa: number;
  totalTidakHadir: number;
  attendedDays: number;
  attendanceRate: number;
  attendanceRateFormatted: string;
  dailyRecords: Record<string, { status: string; rec?: any; isEffective: boolean; isHoliday: boolean }>;
}

export interface WeeklyAttendanceResult {
  startDate: string;
  endDate: string;
  effectiveDays: string[];
  days: { dateStr: string; label: string; isEffective: boolean; isHoliday: boolean; holidayInfo?: any }[];
  students: WeeklyStudentAttendanceItem[];
  totals: {
    expectedDays: number;
    hadir: number;
    kesiangan: number;
    dispensasi: number;
    sakit: number;
    izin: number;
    alpa: number;
    totalTidakHadir: number;
    unfilledDays: number;
    overallAttendanceRate: number;
    overallAttendanceRateFormatted: string;
  };
}

export function calculateWeeklyAttendanceStats(
  appData: AppData,
  referenceDateStr: string = getTodayString(),
  scope?: { kelasId?: string; jurusanId?: string; waliKelasId?: string }
): WeeklyAttendanceResult {
  const refDate = new Date(referenceDateStr + 'T00:00:00');
  const monday = new Date(refDate);
  const dayOfWeek = refDate.getDay();
  // Monday calculation: Sunday (0) -> -6, Monday (1) -> 0, etc.
  monday.setDate(refDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const schoolStart = appData?.sekolah?.tanggalMulai;
  const schoolEnd = appData?.sekolah?.tanggalAkhir;

  const days: { dateStr: string; label: string; isEffective: boolean; isHoliday: boolean; isBeforeStart?: boolean; holidayInfo?: any }[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const holidayInfo = getHariLiburInfo(dateStr, appData);
    const isHoliday = Boolean(holidayInfo);
    const isBeforeStart = Boolean(schoolStart && dateStr < schoolStart);
    const isAfterEnd = Boolean(schoolEnd && dateStr > schoolEnd);
    const isEffective = !isHoliday && !isBeforeStart && !isAfterEnd;

    days.push({
      dateStr,
      label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'numeric' }),
      isEffective,
      isHoliday,
      isBeforeStart,
      holidayInfo,
    });
  }

  const startDate = days[0].dateStr;
  const endDate = days[4].dateStr;
  const effectiveDays = days.filter((d) => d.isEffective).map((d) => d.dateStr);
  const expectedDays = effectiveDays.length;

  const studentsInScope = getCanonicalActiveStudents(appData, scope);
  const targetClasses = appData.kelas || [];

  let totalHadirAll = 0;
  let totalKesianganAll = 0;
  let totalDispensasiAll = 0;
  let totalSakitAll = 0;
  let totalIzinAll = 0;
  let totalAlpaAll = 0;
  let totalUnfilledAll = 0;

  const studentItems: WeeklyStudentAttendanceItem[] = studentsInScope.map((s) => {
    let totalHadir = 0;
    let totalKesiangan = 0;
    let totalDispensasi = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlpa = 0;
    const dailyRecords: Record<string, { status: string; rec?: any; isEffective: boolean; isHoliday: boolean }> = {};
    const seenRecordedDates = new Set<string>();

    days.forEach((d) => {
      const pKey = `${d.dateStr}_${s.kelasId}`;
      const pRecords = appData.presensi ? appData.presensi[pKey] : undefined;
      const rec = Array.isArray(pRecords) ? pRecords.find((r) => r.siswaId === s.id || r.siswaId === s.nisn) : undefined;
      const st = rec ? normalizePresensiStatus(rec.status) : '';

      if (rec && st) {
        seenRecordedDates.add(d.dateStr);
      }

      if (st === 'H') totalHadir++;
      else if (st === 'K') totalKesiangan++;
      else if (st === 'D') totalDispensasi++;
      else if (st === 'S') totalSakit++;
      else if (st === 'I') totalIzin++;
      else if (st === 'A') totalAlpa++;

      dailyRecords[d.dateStr] = {
        status: st,
        rec,
        isEffective: d.isEffective,
        isHoliday: d.isHoliday,
      };
    });

    const recordedDays = seenRecordedDates.size;
    const unfilledDays = Math.max(0, expectedDays - recordedDays);
    const attendedDays = totalHadir + totalKesiangan + totalDispensasi;
    const totalTidakHadir = totalSakit + totalIzin + totalAlpa;
    const attendanceRate = expectedDays > 0 ? (attendedDays / expectedDays) * 100 : 0;

    totalHadirAll += totalHadir;
    totalKesianganAll += totalKesiangan;
    totalDispensasiAll += totalDispensasi;
    totalSakitAll += totalSakit;
    totalIzinAll += totalIzin;
    totalAlpaAll += totalAlpa;
    totalUnfilledAll += unfilledDays;

    return {
      siswa: s,
      kelas: targetClasses.find((k) => k.id === s.kelasId),
      expectedDays,
      recordedDays,
      unfilledDays,
      totalHadir,
      totalKesiangan,
      totalDispensasi,
      totalSakit,
      totalIzin,
      totalAlpa,
      totalTidakHadir,
      attendedDays,
      attendanceRate,
      attendanceRateFormatted: formatPercentage(attendanceRate, 2),
      dailyRecords,
    };
  });

  const totalPossibleStudentDays = studentsInScope.length * expectedDays;
  const totalAttendedAll = totalHadirAll + totalKesianganAll + totalDispensasiAll;
  const overallAttendanceRate = totalPossibleStudentDays > 0 ? (totalAttendedAll / totalPossibleStudentDays) * 100 : 0;

  return {
    startDate,
    endDate,
    effectiveDays,
    days,
    students: studentItems,
    totals: {
      expectedDays,
      hadir: totalHadirAll,
      kesiangan: totalKesianganAll,
      dispensasi: totalDispensasiAll,
      sakit: totalSakitAll,
      izin: totalIzinAll,
      alpa: totalAlpaAll,
      totalTidakHadir: totalSakitAll + totalIzinAll + totalAlpaAll,
      unfilledDays: totalUnfilledAll,
      overallAttendanceRate,
      overallAttendanceRateFormatted: formatPercentage(overallAttendanceRate, 2),
    },
  };
}

export function determinePresensiStatusByTime(
  timeStr: string,
  jamMasukSelesai: string = '06:45',
  isJamMasukActive: boolean = true
): 'H' | 'K' {
  if (!isJamMasukActive) return 'H';
  if (!timeStr) return 'H';
  const scanHHmm = timeStr.trim().slice(0, 5);
  const cutoffHHmm = (jamMasukSelesai || '06:45').trim().slice(0, 5);
  return scanHHmm > cutoffHHmm ? 'K' : 'H';
}

export function normalizeWeeklyShiftPeriods(rawPeriods?: ShiftPeriod[]): ShiftPeriod[] {
  if (!rawPeriods || rawPeriods.length === 0) {
    return generateWeeklyShiftSchedules();
  }

  const result: ShiftPeriod[] = [];
  let newId = 1;

  for (const p of rawPeriods) {
    const s = new Date(p.startDate);
    const e = new Date(p.endDate);
    const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > 8) {
      // Split 14-day or multi-week periods into 7-day weekly increments
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
          kelompok2Type: p.kelompok2Type || 'siang',
        });

        curr.setDate(curr.getDate() + 7);
      }
    } else {
      result.push({
        ...p,
        id: newId++,
      });
    }
  }

  return result;
}

export function generateWeeklyShiftSchedules(): ShiftPeriod[] {
  const periods: ShiftPeriod[] = [];
  // Start date: Sunday, August 2, 2026 (or Monday August 3) matching 16-22 and 23-29
  let startDate = new Date(2026, 7, 2); // Month is 0-indexed (7 = August)
  const endDate = new Date(2027, 0, 2); // January 2, 2027

  let weekIndex = 0;
  while (startDate <= endDate) {
    const periodStart = new Date(startDate);
    const periodEnd = new Date(startDate);
    periodEnd.setDate(periodEnd.getDate() + 6); // 7 days (1 week: Sunday - Saturday)

    // Rotates every 2 weeks:
    // weeks 0 & 1 (Siklus 1: 02-08 Agu & 09-15 Agu) -> Siang / Pagi
    // weeks 2 & 3 (Siklus 2: 16-22 Agu & 23-29 Agu) -> Pagi / Siang
    // weeks 4 & 5 (Siklus 3: 30 Agu-05 Sep & 06-12 Sep) -> Siang / Pagi
    const rotationCycle = Math.floor(weekIndex / 2);
    const isKelompok1Pagi = rotationCycle % 2 === 1;

    const fmt = (dt: Date) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    periods.push({
      id: weekIndex + 1,
      startDate: fmt(periodStart),
      endDate: fmt(periodEnd),
      kelompok1Type: isKelompok1Pagi ? 'pagi' : 'siang',
      kelompok2Type: isKelompok1Pagi ? 'siang' : 'pagi',
    });

    startDate.setDate(startDate.getDate() + 7);
    weekIndex++;
  }
  return periods;
}

export function getShiftTimingForStudent(
  appData: AppData,
  siswa?: { id: string; kelasId: string } | null,
  dateStr?: string
): {
  shiftType: 'pagi' | 'siang' | 'libur';
  jamMasukMulai: string;
  jamMasukSelesai: string;
  jamPulang: string;
  isJamMasukActive: boolean;
} {
  const shiftConfig = appData.shiftConfig;
  const isPagiActive = shiftConfig?.isJamMasukPagiActive ?? appData.sekolah?.isJamMasukActive ?? true;
  const pagiMulai = shiftConfig?.pagiJamMasukMulai || appData.sekolah?.jamMasukMulai || '06:30';
  const pagiSelesai = shiftConfig?.pagiJamMasukSelesai || appData.sekolah?.jamMasukSelesai || '06:45';
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

  const kelasObj = appData.kelas.find(k => k.id === siswa.kelasId);
  const namaKelas = (kelasObj?.nama || '').toUpperCase();
  const isKelompok2 = namaKelas.startsWith('XII') || namaKelas.includes('12') || namaKelas.includes('XII');

  const targetDateStr = dateStr ? dateStr.slice(0, 10) : getTodayString();
  const periods = (shiftConfig?.periods && shiftConfig.periods.length > 0)
    ? shiftConfig.periods
    : generateWeeklyShiftSchedules();

  const activePeriod = periods.find(p => {
    const sStr = p.startDate.slice(0, 10);
    const eStr = p.endDate.slice(0, 10);
    return targetDateStr >= sStr && targetDateStr <= eStr;
  });

  let shiftType: 'pagi' | 'siang' | 'libur' = 'pagi';
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

const LOCAL_STORAGE_KEY = 'presensi_app_data';
const SESSION_STORAGE_KEY = 'presensi_session_user';
const PERSISTENT_SESSION_KEY = 'presensi_persistent_user';

export function loadAppData(): AppData {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const merged = { ...DEMO_DATASET, ...parsed };
      if (merged.sekolah) {
        if (!merged.sekolah.nama || merged.sekolah.nama === 'Absensi Siswa') {
          merged.sekolah.nama = 'SMKN 6 Garut';
        }
        if (!merged.sekolah.logo) {
          merged.sekolah.logo = DEFAULT_TOGA_LOGO;
        }
      }
      if (merged.waliKelas && Array.isArray(merged.waliKelas)) {
        merged.waliKelas = merged.waliKelas.map((w: any) => {
          if (w.id === 'WAL_1' && (w.username === 'budi' || !w.username)) {
            return { ...w, username: '1037' };
          }
          return w;
        });
      }
      if (merged.siswa && Array.isArray(merged.siswa)) {
        merged.siswa = randomizeWaForStudents(merged.siswa);
      }
      if (merged.shiftConfig) {
        if (merged.shiftConfig.periods && Array.isArray(merged.shiftConfig.periods)) {
          merged.shiftConfig.periods = normalizeWeeklyShiftPeriods(merged.shiftConfig.periods);
        }
        if (merged.shiftConfig.isJamMasukSiangActive === undefined || merged.shiftConfig.isJamMasukSiangActive === false) {
          merged.shiftConfig.isJamMasukSiangActive = true;
        }
      }
      if (!merged.securityConfig) {
        merged.securityConfig = DEFAULT_SECURITY_CONFIG;
      }
      if (!Array.isArray(merged.securityIncidents) || merged.securityIncidents.length === 0) {
        merged.securityIncidents = INITIAL_SECURITY_INCIDENTS;
      }
      if (!Array.isArray(merged.blockedIps)) {
        merged.blockedIps = INITIAL_BLOCKED_IPS;
      }
      if (!Array.isArray(merged.lockedAccounts)) {
        merged.lockedAccounts = [];
      }
      if (merged.jadwalMengajar && Array.isArray(merged.jadwalMengajar)) {
        // Filter out legacy demo schedules (JADWAL_1 - JADWAL_10, JADWAL_S1 - JADWAL_S8, FALLBACK_*)
        const DEMO_JADWAL_IDS = new Set([
          'JADWAL_1', 'JADWAL_2', 'JADWAL_3', 'JADWAL_4', 'JADWAL_5',
          'JADWAL_6', 'JADWAL_7', 'JADWAL_8', 'JADWAL_9', 'JADWAL_10',
          'JADWAL_S1', 'JADWAL_S2', 'JADWAL_S3', 'JADWAL_S4', 'JADWAL_S5',
          'JADWAL_S6', 'JADWAL_S7', 'JADWAL_S8'
        ]);
        merged.jadwalMengajar = merged.jadwalMengajar.filter((j: any) => {
          if (!j || !j.id) return false;
          const idStr = String(j.id);
          if (DEMO_JADWAL_IDS.has(idStr)) return false;
          if (idStr.startsWith('FALLBACK_')) return false;
          return true;
        });
      } else {
        merged.jadwalMengajar = [];
      }

      if (merged.presensiMengajarGuru && Array.isArray(merged.presensiMengajarGuru)) {
        const DEMO_LOG_IDS = new Set(['LOG_GURU_1', 'LOG_GURU_2']);
        merged.presensiMengajarGuru = merged.presensiMengajarGuru.filter((p: any) => {
          if (!p || !p.id) return false;
          if (DEMO_LOG_IDS.has(String(p.id))) return false;
          return true;
        });
      } else {
        merged.presensiMengajarGuru = [];
      }
      return merged;
    }
  } catch (e) {
    console.error('Failed to load local storage data', e);
  }
  const defaultData = JSON.parse(JSON.stringify(DEMO_DATASET));
  if (defaultData.siswa && Array.isArray(defaultData.siswa)) {
    defaultData.siswa = randomizeWaForStudents(defaultData.siswa);
  }
  if (!defaultData.securityConfig) {
    defaultData.securityConfig = DEFAULT_SECURITY_CONFIG;
  }
  if (!Array.isArray(defaultData.securityIncidents)) {
    defaultData.securityIncidents = INITIAL_SECURITY_INCIDENTS;
  }
  if (!Array.isArray(defaultData.blockedIps)) {
    defaultData.blockedIps = INITIAL_BLOCKED_IPS;
  }
  if (!Array.isArray(defaultData.lockedAccounts)) {
    defaultData.lockedAccounts = [];
  }
  return defaultData;
}

let syncTimeoutId: any = null;

export async function commitAppDataToServer(data: AppData, timeoutMs = 20000): Promise<SyncResult> {
  const host = typeof localStorage !== 'undefined' ? localStorage.getItem('mysql_host') : null;
  const database = typeof localStorage !== 'undefined' ? localStorage.getItem('mysql_database') : null;
  const user = typeof localStorage !== 'undefined' ? localStorage.getItem('mysql_user') : null;
  const port = (typeof localStorage !== 'undefined' ? localStorage.getItem('mysql_port') : null) || '3306';
  const password = (typeof localStorage !== 'undefined' ? localStorage.getItem('mysql_password') : null) || '';

  const mysqlConfig = host && database && user ? { host, port, user, password, database } : null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('/api/global-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appData: data, mysqlConfig }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status >= 400 && res.status < 500) {
        return {
          success: false,
          reason: 'validation',
          status: res.status,
          message: `Data presensi tidak dapat divalidasi oleh server (HTTP ${res.status}).`,
        };
      }
      return {
        success: false,
        reason: 'server',
        status: res.status,
        message: `Server mengalami kendala saat menyimpan data (HTTP ${res.status}).`,
      };
    }

    const resJson = await res.json();
    if (resJson && resJson.success === true) {
      // Trigger background MySQL persist if config exists (non-blocking)
      if (mysqlConfig) {
        fetch('/api/mysql/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...mysqlConfig, appData: data }),
        }).catch(() => {});
      }
      return {
        success: true,
        version: resJson.version,
        message: resJson.message || 'Data berhasil tersimpan di server',
      };
    }

    return {
      success: false,
      reason: 'unknown',
      message: resJson?.message || 'Status penyimpanan belum dapat dipastikan dari respon server.',
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        success: false,
        reason: 'timeout',
        message: 'Waktu tunggu koneksi habis (Timeout 20 detik). Status penyimpanan belum dapat dipastikan.',
      };
    }
    return {
      success: false,
      reason: 'network',
      message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
    };
  }
}

export function autoSyncMySQL(data: AppData): void {
  try {
    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId);
    }
    syncTimeoutId = setTimeout(() => {
      commitAppDataToServer(data).catch((err) => {
        console.warn('Background global state sync error:', err);
      });
    }, 50);
  } catch (e) {
    // ignore
  }
}

const appChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('presensi_app_sync') : null;

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    autoSyncMySQL(data);
    if (appChannel) {
      appChannel.postMessage({ type: 'UPDATE', timestamp: Date.now() });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('presensi-data-updated', { detail: data }));
    }
  } catch (e) {
    console.error('Failed to save data to local storage', e);
  }
}

export async function cleanLogoImage(dataUrl: string): Promise<string> {
  // Automatic background removal removed: returns original image data directly
  return dataUrl || '';
}

export async function makeImageBackgroundTransparent(dataUrl: string): Promise<string> {
  // Automatic background removal removed: returns original image data directly
  return dataUrl || '';
}

export async function compressBase64Image(
  dataUrl: string | File | Blob,
  maxDim = 1024,
  quality = 0.75,
  preserveTransparency = false
): Promise<string> {
  if (!dataUrl) return '';
  if (typeof Blob !== 'undefined' && dataUrl instanceof Blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const raw = e.target?.result as string;
        if (raw) {
          compressBase64Image(raw, maxDim, quality, preserveTransparency).then(resolve).catch(() => resolve(raw));
        } else {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(dataUrl);
    });
  }
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    return typeof dataUrl === 'string' ? dataUrl : '';
  }

  const isPng = (dataUrl.startsWith('data:image/png') || dataUrl.includes('image/png')) && preserveTransparency;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      if (isPng) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const resized = canvas.toDataURL('image/png');
        resolve(resized);
      } else {
        ctx.drawImage(img, 0, 0, w, h);
        const resized = canvas.toDataURL('image/jpeg', quality);
        resolve(resized);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function loadSessionUser(): UserSession | null {
  try {
    const sessionStored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionStored) {
      return JSON.parse(sessionStored);
    }
    const persistentStored = localStorage.getItem(PERSISTENT_SESSION_KEY);
    if (persistentStored) {
      const parsed = JSON.parse(persistentStored);
      sessionStorage.setItem(SESSION_STORAGE_KEY, persistentStored);
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load session user', e);
  }
  return null;
}

export function saveSessionUser(session: UserSession | null, rememberMe: boolean = true): void {
  try {
    if (session) {
      const jsonStr = JSON.stringify(session);
      sessionStorage.setItem(SESSION_STORAGE_KEY, jsonStr);
      if (rememberMe) {
        localStorage.setItem(PERSISTENT_SESSION_KEY, jsonStr);
      } else {
        localStorage.removeItem(PERSISTENT_SESSION_KEY);
      }
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(PERSISTENT_SESSION_KEY);
    }
  } catch (e) {
    console.error('Failed to save session user', e);
  }
}

export function isWeekend(dateStr: string): boolean {
  if (!dateStr) return false;
  const dt = new Date(dateStr + 'T00:00:00');
  const day = dt.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

export function isFutureDate(dateStr: string): boolean {
  if (!dateStr) return false;
  return dateStr > getTodayString();
}

export function getIndonesianTimeString(date: Date = new Date(), includeSeconds: boolean = true): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
      hour12: false,
    }).format(date).replace(/\./g, ':');
  } catch (e) {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
      hour12: false,
    }).replace(/\./g, ':');
  }
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '';
  const dt = new Date(dateStr + 'T00:00:00');
  return dt.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function exportRekapHarianExcel(
  namaKelas: string,
  tanggal: string,
  siswaList: any[],
  records: SiswaPresensiItem[] | Record<string, SiswaPresensiItem[]>,
  allClasses?: any[]
) {
  const exportData = siswaList.map((s, idx) => {
    let rec: SiswaPresensiItem | undefined;
    if (Array.isArray(records)) {
      rec = records.find((r) => r.siswaId === s.nisn || r.siswaId === s.id);
    } else {
      const key = `${tanggal}_${s.kelasId}`;
      const classRecs = records[key] || [];
      rec = classRecs.find((r) => r.siswaId === s.nisn || r.siswaId === s.id);
    }
    const st = rec ? normalizePresensiStatus(rec.status) : '';
    const statusLabel = st ? (CANONICAL_STATUS_LABELS[st] || st) : 'Belum Presensi';
    const kelasObj = allClasses?.find((k) => k.id === s.kelasId);
    return {
      No: idx + 1,
      NISN: s.nisn,
      'Nama Siswa': s.nama,
      'Jenis Kelamin': s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      Kelas: kelasObj ? kelasObj.nama : namaKelas,
      Tanggal: tanggal,
      'Status Presensi': statusLabel,
      'Waktu Masuk': rec?.time || '-',
      'Waktu Pulang': rec?.pulangTime || '-',
      'Status Pulang': rec?.pulangStatus === 'H' ? 'Hadir Pulang' : (rec?.pulangStatus === 'TAP' ? 'Tidak Absen Pulang' : '-'),
      Catatan: rec?.catatan || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Harian');
  saveExcelFile(wb, `Rekap_Harian_${namaKelas}_${tanggal}.xlsx`);
}

export function saveExcelFile(wb: XLSX.WorkBook, filename: string) {
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveBlobFile(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  } catch (err) {
    console.error('Error in saveExcelFile, falling back to XLSX.writeFile:', err);
    try {
      XLSX.writeFile(wb, filename);
    } catch (fallbackErr) {
      console.error('XLSX.writeFile failed:', fallbackErr);
    }
  }
}

export function saveBlobFile(content: string | Blob, filename: string, mimeType = 'text/plain') {
  try {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }, 2000);
  } catch (err) {
    console.error('Error in saveBlobFile:', err);
  }
}

export function getHariLiburInfo(dateStr: string, appData: AppData) {
  if (!appData.hariLibur || !Array.isArray(appData.hariLibur)) return null;
  return appData.hariLibur.find((h) => h.tanggal === dateStr) || null;
}

export const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;

export function getIndonesianDayName(dateOrStr: Date | string = new Date()): string {
  try {
    let dt: Date;
    if (typeof dateOrStr === 'string') {
      const cleanStr = dateOrStr.slice(0, 10);
      dt = new Date(cleanStr + 'T00:00:00');
    } else {
      dt = dateOrStr;
    }
    const dayName = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
    }).format(dt);
    return dayName.charAt(0).toUpperCase() + dayName.slice(1);
  } catch (e) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dt = typeof dateOrStr === 'string' ? new Date(dateOrStr) : dateOrStr;
    return days[dt.getDay()] || 'Senin';
  }
}

export function isTeacherTeachingToday(hariMengajar?: string[], targetDateOrStr: Date | string = new Date()): boolean {
  if (!hariMengajar || !Array.isArray(hariMengajar) || hariMengajar.length === 0) {
    return true; // Default: jika belum diatur, bisa mengajar setiap hari
  }
  const todayName = getIndonesianDayName(targetDateOrStr).toLowerCase();
  return hariMengajar.some((h) => String(h).trim().toLowerCase() === todayName);
}

export function formatHariMengajar(hariMengajar?: string[]): string {
  if (!hariMengajar || !Array.isArray(hariMengajar) || hariMengajar.length === 0) {
    return 'Setiap Hari Kerja (Senin - Jumat)';
  }
  return hariMengajar.join(', ');
}

export const NAMA_BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatTanggalIndonesia(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed === '-') return '';

  // Format: YYYY-MM-DD
  const matchYmd = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (matchYmd) {
    const year = matchYmd[1];
    const month = parseInt(matchYmd[2], 10) - 1;
    const day = parseInt(matchYmd[3], 10);
    if (month >= 0 && month < 12) {
      return `${day} ${NAMA_BULAN_INDONESIA[month]} ${year}`;
    }
  }

  // Format: DD-MM-YYYY or DD/MM/YYYY
  const matchDmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (matchDmy) {
    const day = parseInt(matchDmy[1], 10);
    const month = parseInt(matchDmy[2], 10) - 1;
    const year = matchDmy[3];
    if (month >= 0 && month < 12) {
      return `${day} ${NAMA_BULAN_INDONESIA[month]} ${year}`;
    }
  }

  // Fallback: Date object
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();
    return `${day} ${NAMA_BULAN_INDONESIA[month]} ${year}`;
  }

  return trimmed;
}

export function formatTTL(tempatLahir?: string, tanggalLahir?: string): string {
  const tempat = tempatLahir ? tempatLahir.trim() : '';
  const tglIndo = formatTanggalIndonesia(tanggalLahir);

  if (tempat && tglIndo) {
    return `${tempat}, ${tglIndo}`;
  }
  return tempat || tglIndo || '-';
}

export function addAuditLog(appData: AppData, aksi: string, detail: string): AppData {
  try {
    const session = loadSessionUser();
    if (!session) return appData;
    const role = session.role || 'unknown';
    
    // Specifically target admin and kesiswaan roles as requested
    if (role !== 'admin' && role !== 'kesiswaan') {
      return appData;
    }

    const username = session.data?.username || 'unknown';
    const nama = session.data?.nama || 'Pengguna';
    
    const now = new Date();
    const indonesianTime = getIndonesianTimeString(now, true);
    const datePart = getTodayString();
    const timestampStr = `${datePart} ${indonesianTime}`;

    const newLog = {
      id: 'AUDIT_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      timestamp: timestampStr,
      role,
      username,
      nama,
      aksi,
      detail,
    };

    const currentLogs = Array.isArray(appData.auditLogs) ? appData.auditLogs : [];
    const updatedLogs = [newLog, ...currentLogs].slice(0, 1000); // Limit to last 1000 records

    return {
      ...appData,
      auditLogs: updatedLogs,
    };
  } catch (e) {
    console.error('Failed to create audit log:', e);
    return appData;
  }
}

/**
 * Membersihkan kode elemen/nomor awalan pada nama Mata Pelajaran (misal: "[MP-PAI-1] PAI dan Budi Pekerti" -> "PAI dan Budi Pekerti")
 */
export function cleanMapelName(name?: string | null): string {
  if (!name || typeof name !== 'string') return '';
  // 1. Hapus kurung siku awalan seperti [MP-PAI-1], [MAT-01], [1], dll.
  let cleaned = name.replace(/^\s*\[[^\]]+\]\s*/g, '');
  // 2. Hapus format awalan seperti MP-PAI-1 -, MP-01 :, dll.
  cleaned = cleaned.replace(/^\s*(?:MP|Mapel|KD|CP|Elemen)[\w\s\-_./]*[:\-–]\s*/i, '');
  return cleaned.trim();
}

/**
 * Ekstraksi tingkat kelas ('X', 'XI', 'XII', atau 'LAIN') secara presisi
 * Mengakomodasi format Romawi (X, XI, XII), Angka (10, 11, 12), serta berbagai variasi penulisan sekolah.
 */
export function extractKelasTingkat(namaKelas?: string): 'X' | 'XI' | 'XII' | 'LAIN' {
  if (!namaKelas || typeof namaKelas !== 'string') return 'LAIN';
  const raw = namaKelas.trim();
  if (!raw) return 'LAIN';

  // Hapus awalan umum seperti "ROMBEL", "KELAS", "TINGKAT", "KLS", "RUANG"
  const clean = raw
    .toUpperCase()
    .replace(/^(?:ROMBONGAN\s*BELAJAR|ROMBEL|KELAS|TINGKAT|KLS|RUANG)\s*[:.\-_/]?\s*/i, '')
    .trim();

  // Pola 1: Tingkat XII / 12 di awal nama kelas (diuji sebelum XI dan X agar tidak tertimpa)
  // Contoh: XII RPL 1, XII-1, XII.A, XII/TKJ, 12 RPL 1, 12-1, 12.1, 12A, 12_TKJ
  if (
    /^(?:XII)(?:[\s.\-_/()]+|[A-Z0-9]|$)/i.test(clean) ||
    /^(?:12)(?:[\s.\-_/()]+|[A-Z]|$)/i.test(clean) ||
    clean === 'XII' ||
    clean === '12'
  ) {
    return 'XII';
  }

  // Pola 2: Tingkat XI / 11 di awal nama kelas (diuji sebelum X)
  // Contoh: XI RPL 1, XI-1, XI.A, XI/TKJ, 11 RPL 1, 11-1, 11.1, 11A, 11_TKJ
  if (
    /^(?:XI)(?:[\s.\-_/()]+|[A-Z0-9]|$)/i.test(clean) ||
    /^(?:11)(?:[\s.\-_/()]+|[A-Z]|$)/i.test(clean) ||
    clean === 'XI' ||
    clean === '11'
  ) {
    return 'XI';
  }

  // Pola 3: Tingkat X / 10 di awal nama kelas
  // Contoh: X RPL 1, X-1, X.A, X/TKJ, 10 RPL 1, 10-1, 10.1, 10A, 10_TKJ
  if (
    /^(?:X)(?:[\s.\-_/()]+|[A-Z0-9]|$)/i.test(clean) ||
    /^(?:10)(?:[\s.\-_/()]+|[A-Z]|$)/i.test(clean) ||
    clean === 'X' ||
    clean === '10'
  ) {
    return 'X';
  }

  // Fallback Pola 4: Cek token kata terpisah di seluruh nama (misal: "RPL XII A", "TKJ 12 1")
  const tokens = clean.split(/[\s.\-_/()]+/);
  if (tokens.includes('XII') || tokens.includes('12')) return 'XII';
  if (tokens.includes('XI') || tokens.includes('11')) return 'XI';
  if (tokens.includes('X') || tokens.includes('10')) return 'X';

  return 'LAIN';
}

/**
 * Menentukan pembagian kelompok shift untuk kelas secara akurat:
 * - Kelompok 1: Kelas X & XI (dan kelas tingkat X/XI/LAIN)
 * - Kelompok 2: Kelas XII
 */
export function determineKelasKelompok(namaKelas?: string): 1 | 2 {
  const tingkat = extractKelasTingkat(namaKelas);
  if (tingkat === 'XII') {
    return 2; // Kelompok 2: Kelas XII
  }
  return 1; // Kelompok 1: Kelas X & XI
}

/**
 * Waktu Jam Pelajaran Standar:
 * - Shift Pagi: Mulai 06:30, 1 JP = 30 Menit, Istirahat 08:30 - 09:00 (setelah Jam 4)
 * - Shift Siang: Mulai 13:00, 1 JP = 20 Menit, Istirahat 15:00 - 15:30 (setelah Jam 6)
 */
export const JAM_TIMES_PAGI: Record<number, string> = {
  1: '06.30 - 07.00',
  2: '07.00 - 07.30',
  3: '07.30 - 08.00',
  4: '08.00 - 08.30',
  5: '09.00 - 09.30',
  6: '09.30 - 10.00',
  7: '10.00 - 10.30',
  8: '10.30 - 11.00',
  9: '11.00 - 11.30',
  10: '11.30 - 12.00',
};

export const JAM_TIMES_SIANG: Record<number, string> = {
  1: '13.00 - 13.20',
  2: '13.20 - 13.40',
  3: '13.40 - 14.00',
  4: '14.00 - 14.20',
  5: '14.20 - 14.40',
  6: '14.40 - 15.00',
  7: '15.30 - 15.50',
  8: '15.50 - 16.10',
  9: '16.10 - 16.30',
  10: '16.30 - 16.50',
};

export const ISTIRAHAT_PAGI = {
  label: 'Istirahat Pagi',
  range: '08.30 - 09.00',
  durasiMenit: 30,
  setelahJam: 4,
};

export const ISTIRAHAT_SIANG = {
  label: 'Istirahat Siang',
  range: '15.00 - 15.30',
  durasiMenit: 30,
  setelahJam: 6,
};

export interface LiveJamStatus {
  detectedJam: number | null;
  detectedShift: 'Pagi' | 'Siang' | 'Di luar KBM';
  isIstirahat: boolean;
  istirahatShift?: 'Pagi' | 'Siang';
  statusLabel: string;
  timeString: string;
  dateString: string;
}

export function calculateLiveJamStatus(now: Date = new Date()): LiveJamStatus {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  let detectedJam: number | null = null;
  let detectedShift: 'Pagi' | 'Siang' | 'Di luar KBM' = 'Di luar KBM';
  let isIstirahat = false;
  let istirahatShift: 'Pagi' | 'Siang' | undefined = undefined;
  let statusLabel = 'Di luar Jam KBM';

  // Shift Pagi (06:30 - 12:00 -> 390 - 720)
  if (totalMinutes >= 390 && totalMinutes < 720) {
    detectedShift = 'Pagi';
    if (totalMinutes >= 390 && totalMinutes < 420) {
      detectedJam = 1;
      statusLabel = 'Jam ke-1 (06.30 - 07.00)';
    } else if (totalMinutes >= 420 && totalMinutes < 450) {
      detectedJam = 2;
      statusLabel = 'Jam ke-2 (07.00 - 07.30)';
    } else if (totalMinutes >= 450 && totalMinutes < 480) {
      detectedJam = 3;
      statusLabel = 'Jam ke-3 (07.30 - 08.00)';
    } else if (totalMinutes >= 480 && totalMinutes < 510) {
      detectedJam = 4;
      statusLabel = 'Jam ke-4 (08.00 - 08.30)';
    } else if (totalMinutes >= 510 && totalMinutes < 540) {
      isIstirahat = true;
      istirahatShift = 'Pagi';
      statusLabel = '☕ Istirahat Pagi (08.30 - 09.00)';
    } else if (totalMinutes >= 540 && totalMinutes < 570) {
      detectedJam = 5;
      statusLabel = 'Jam ke-5 (09.00 - 09.30)';
    } else if (totalMinutes >= 570 && totalMinutes < 600) {
      detectedJam = 6;
      statusLabel = 'Jam ke-6 (09.30 - 10.00)';
    } else if (totalMinutes >= 600 && totalMinutes < 630) {
      detectedJam = 7;
      statusLabel = 'Jam ke-7 (10.00 - 10.30)';
    } else if (totalMinutes >= 630 && totalMinutes < 660) {
      detectedJam = 8;
      statusLabel = 'Jam ke-8 (10.30 - 11.00)';
    } else if (totalMinutes >= 660 && totalMinutes < 690) {
      detectedJam = 9;
      statusLabel = 'Jam ke-9 (11.00 - 11.30)';
    } else if (totalMinutes >= 690 && totalMinutes < 720) {
      detectedJam = 10;
      statusLabel = 'Jam ke-10 (11.30 - 12.00)';
    }
  }
  // Shift Siang (13:00 - 16:50 -> 780 - 1010)
  else if (totalMinutes >= 780 && totalMinutes < 1010) {
    detectedShift = 'Siang';
    if (totalMinutes >= 780 && totalMinutes < 800) {
      detectedJam = 1;
      statusLabel = 'Jam ke-1 (13.00 - 13.20)';
    } else if (totalMinutes >= 800 && totalMinutes < 820) {
      detectedJam = 2;
      statusLabel = 'Jam ke-2 (13.20 - 13.40)';
    } else if (totalMinutes >= 820 && totalMinutes < 840) {
      detectedJam = 3;
      statusLabel = 'Jam ke-3 (13.40 - 14.00)';
    } else if (totalMinutes >= 840 && totalMinutes < 860) {
      detectedJam = 4;
      statusLabel = 'Jam ke-4 (14.00 - 14.20)';
    } else if (totalMinutes >= 860 && totalMinutes < 880) {
      detectedJam = 5;
      statusLabel = 'Jam ke-5 (14.20 - 14.40)';
    } else if (totalMinutes >= 880 && totalMinutes < 900) {
      detectedJam = 6;
      statusLabel = 'Jam ke-6 (14.40 - 15.00)';
    } else if (totalMinutes >= 900 && totalMinutes < 930) {
      isIstirahat = true;
      istirahatShift = 'Siang';
      statusLabel = '☕ Istirahat Siang (15.00 - 15.30)';
    } else if (totalMinutes >= 930 && totalMinutes < 950) {
      detectedJam = 7;
      statusLabel = 'Jam ke-7 (15.30 - 15.50)';
    } else if (totalMinutes >= 950 && totalMinutes < 970) {
      detectedJam = 8;
      statusLabel = 'Jam ke-8 (15.50 - 16.10)';
    } else if (totalMinutes >= 970 && totalMinutes < 990) {
      detectedJam = 9;
      statusLabel = 'Jam ke-9 (16.10 - 16.30)';
    } else if (totalMinutes >= 990 && totalMinutes < 1010) {
      detectedJam = 10;
      statusLabel = 'Jam ke-10 (16.30 - 16.50)';
    }
  } else if (totalMinutes >= 720 && totalMinutes < 780) {
    detectedShift = 'Di luar KBM';
    statusLabel = 'Jeda Transisi Shift (12.00 - 13.00)';
  } else {
    detectedShift = 'Di luar KBM';
    statusLabel = 'Di luar Jam KBM Sekolah';
  }

  return {
    detectedJam,
    detectedShift,
    isIstirahat,
    istirahatShift,
    statusLabel,
    timeString: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    dateString: formatDateIndo(getTodayString()),
  };
}




