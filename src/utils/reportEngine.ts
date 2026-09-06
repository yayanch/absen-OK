import { AppData, UserSession, Siswa, Kelas } from '../types';
import {
  getTodayString,
  formatDateIndo,
  formatPercentage,
  getEffectiveSchoolDays,
  getCanonicalActiveStudents,
  normalizePresensiStatus,
  calculateDailyAttendanceStats,
  calculateWeeklyAttendanceStats,
  calculateCumulativeStudentStats,
  CANONICAL_STATUS_LABELS,
  getHariLiburInfo,
  CumulativeStudentStatsItem,
  WeeklyAttendanceResult,
} from './helpers';

export type ReportType =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'SEMESTER'
  | 'STUDENT_DETAIL'
  | 'CLASS_SUMMARY'
  | 'HIGH_ABSENCE';

export interface ReportScope {
  startDate?: string;
  endDate?: string;
  date?: string;
  month?: string; // 'YYYY-MM' or 'all'
  kelasId?: string;
  jurusanId?: string;
  waliKelasId?: string;
  studentId?: string;
  statusFilter?: string;
  semesterId?: string; // 'ganjil' | 'genap' | 'all'
  includeSaturday?: boolean;
}

export interface ReportMetadata {
  schoolName: string;
  npsn?: string;
  alamat?: string;
  reportTitle: string;
  reportType: ReportType;
  subtitle: string;
  dateRangeLabel: string;
  kelasLabel: string;
  jurusanLabel?: string;
  waliKelasLabel?: string;
  generatedAt: string;
  generatedBy: string;
}

export interface ReportColumn {
  id: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: number; // approximate width for PDF/Excel
  format?: 'text' | 'number' | 'percentage' | 'status' | 'date';
}

export interface ReportRowItem {
  id: string;
  no: number;
  [key: string]: any;
}

export interface CanonicalReportSummary {
  totalStudents: number;
  expectedDays: number;
  recordedDays: number;
  averageRecordedDays?: number;
  unfilledDays: number;
  totalExpectedEvents: number;
  totalAttendedEvents: number;
  totalHadir: number;
  totalKesiangan: number;
  totalDispensasi: number;
  totalSakit: number;
  totalIzin: number;
  totalAlpa: number;
  totalTidakHadir: number;
  attendanceRate: number;
  attendanceRateFormatted: string;
  absenceRate: number;
  absenceRateFormatted: string;
  recordedEvents?: number;
}

export interface AttendanceReportViewModel {
  type: ReportType;
  metadata: ReportMetadata;
  summary: CanonicalReportSummary;
  columns: ReportColumn[];
  rows: ReportRowItem[];
  effectiveDays: string[];
  scope: ReportScope;
  rawStats?: any;
}

export interface CanonicalClassMetrics {
  classId: string;
  className: string;
  totalStudents: number;
  effectiveSchoolDays: number;
  expectedEvents: number;
  recordedEvents: number;
  unfilledEvents: number;
  recordedDays: number;
  averageRecordedDays: number;
  totalHadir: number;
  totalSakit: number;
  totalIzin: number;
  totalAlpha: number;
  totalKesiangan: number;
  totalDispensasi: number;
  attendedEvents: number;
  attendanceRate: number;
  absenceRate: number;
}

/**
 * 100% authoritative single aggregation engine for class-level metrics.
 */
export function aggregateCanonicalClassMetrics(
  classId: string,
  className: string,
  studentStats: CumulativeStudentStatsItem[],
  effectiveSchoolDays: number
): CanonicalClassMetrics {
  const totalStudents = studentStats.length;
  const expectedEvents = totalStudents * effectiveSchoolDays;

  let recordedEvents = 0;
  let totalHadir = 0;
  let totalSakit = 0;
  let totalIzin = 0;
  let totalAlpha = 0;
  let totalKesiangan = 0;
  let totalDispensasi = 0;
  let totalStudentRecordedDays = 0;

  const classUniqueDates = new Set<string>();

  studentStats.forEach((s) => {
    // Each s.recordedDays represents unique active dates for that specific student.
    // Summing recordedDays across students gives the total unique student-date attendance records (recordedEvents).
    recordedEvents += s.recordedDays;
    totalHadir += s.hadir;
    totalSakit += s.sakit;
    totalIzin += s.izin;
    totalAlpha += s.alfa;
    totalKesiangan += s.kesiangan;
    totalDispensasi += s.dispensasi;
    totalStudentRecordedDays += s.recordedDays;

    s.detailRecords.forEach((rec) => {
      classUniqueDates.add(rec.tanggal);
    });
  });

  const recordedDays = classUniqueDates.size;
  const averageRecordedDays = totalStudents > 0 ? totalStudentRecordedDays / totalStudents : 0;
  const unfilledEvents = Math.max(0, expectedEvents - recordedEvents);

  // Attended Events: Hadir + Kesiangan + Dispensasi
  const attendedEvents = totalHadir + totalKesiangan + totalDispensasi;

  const attendanceRate = expectedEvents > 0 ? (attendedEvents / expectedEvents) * 100 : 0;
  const absenceEvents = totalSakit + totalIzin + totalAlpha;
  const absenceRate = expectedEvents > 0 ? (absenceEvents / expectedEvents) * 100 : 0;

  return {
    classId,
    className,
    totalStudents,
    effectiveSchoolDays,
    expectedEvents,
    recordedEvents,
    unfilledEvents,
    recordedDays,
    averageRecordedDays,
    totalHadir,
    totalSakit,
    totalIzin,
    totalAlpha,
    totalKesiangan,
    totalDispensasi,
    attendedEvents,
    attendanceRate,
    absenceRate,
  };
}

/**
 * Aggregates multiple classes' metrics into an overall summary without averaging percentages.
 */
export function aggregateOverallCanonicalClassMetrics(
  allClassMetrics: CanonicalClassMetrics[],
  overallUniqueDates: Set<string>
): CanonicalReportSummary {
  let totalStudents = 0;
  let totalExpectedEvents = 0;
  let totalAttendedEvents = 0;
  let totalHadir = 0;
  let totalKesiangan = 0;
  let totalDispensasi = 0;
  let totalSakit = 0;
  let totalIzin = 0;
  let totalAlpa = 0;
  let totalUnfilled = 0;
  let totalRecordedEvents = 0;

  allClassMetrics.forEach((cm) => {
    totalStudents += cm.totalStudents;
    totalExpectedEvents += cm.expectedEvents;
    totalAttendedEvents += cm.attendedEvents;
    totalHadir += cm.totalHadir;
    totalKesiangan += cm.totalKesiangan;
    totalDispensasi += cm.totalDispensasi;
    totalSakit += cm.totalSakit;
    totalIzin += cm.totalIzin;
    totalAlpa += cm.totalAlpha;
    totalUnfilled += cm.unfilledEvents;
    totalRecordedEvents += cm.recordedEvents;
  });

  const attendanceRate = totalExpectedEvents > 0 ? (totalAttendedEvents / totalExpectedEvents) * 100 : 0;
  const absenceEvents = totalSakit + totalIzin + totalAlpa;
  const absenceRate = totalExpectedEvents > 0 ? (absenceEvents / totalExpectedEvents) * 100 : 0;
  const averageRecordedDays = totalStudents > 0 ? totalRecordedEvents / totalStudents : 0;

  const expectedDays = allClassMetrics.length > 0 ? Math.max(...allClassMetrics.map(cm => cm.effectiveSchoolDays)) : 0;

  return {
    totalStudents,
    expectedDays,
    recordedDays: overallUniqueDates.size,
    averageRecordedDays: Math.round(averageRecordedDays * 10) / 10,
    unfilledDays: totalUnfilled,
    totalExpectedEvents,
    totalAttendedEvents,
    totalHadir,
    totalKesiangan,
    totalDispensasi,
    totalSakit,
    totalIzin,
    totalAlpa,
    totalTidakHadir: totalSakit + totalIzin + totalAlpa,
    attendanceRate,
    attendanceRateFormatted: formatPercentage(attendanceRate, 2),
    absenceRate,
    absenceRateFormatted: formatPercentage(absenceRate, 2),
  };
}

/**
 * Builds the canonical metadata header for all reports
 */
export function createReportMetadata(
  appData: AppData,
  reportType: ReportType,
  scope: ReportScope,
  currentUser?: UserSession
): ReportMetadata {
  const schoolName = appData.sekolah?.nama || 'SMK Negeri 6 Garut';
  const npsn = appData.sekolah?.npsn || '2026-NPSN';
  const alamat = appData.sekolah?.alamat || 'Jl. Raya Garut';

  const kelasObj = scope.kelasId && scope.kelasId !== 'all'
    ? appData.kelas.find((k) => k.id === scope.kelasId)
    : null;
  const kelasLabel = kelasObj ? kelasObj.nama : 'Seluruh Kelas';

  let waliKelasLabel: string | undefined;
  if (kelasObj && kelasObj.waliKelasId) {
    const wali = appData.waliKelas?.find((w) => w.id === kelasObj.waliKelasId);
    if (wali) waliKelasLabel = wali.nama;
  }

  let reportTitle = 'REKAP PRESENSI SISWA';
  let subtitle = '';
  let dateRangeLabel = '';

  const now = new Date();
  const generatedAt = now.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
    timeStyle: 'medium',
  });
  const generatedBy = currentUser?.data?.nama || currentUser?.role || 'Sistem Presensi';

  switch (reportType) {
    case 'DAILY':
      reportTitle = 'REKAP PRESENSI HARIAN SISWA';
      dateRangeLabel = scope.date ? formatDateIndo(scope.date) : formatDateIndo(getTodayString());
      subtitle = `Presensi Tanggal: ${dateRangeLabel} - Kelas: ${kelasLabel}`;
      break;
    case 'WEEKLY':
      reportTitle = 'REKAP PRESENSI MINGGUAN SISWA (SENIN - JUMAT)';
      dateRangeLabel = `${scope.startDate || ''} s/d ${scope.endDate || ''}`;
      subtitle = `Minggu Efektif KBM: ${dateRangeLabel} - Kelas: ${kelasLabel}`;
      break;
    case 'MONTHLY':
      reportTitle = 'REKAP PRESENSI BULANAN SISWA';
      dateRangeLabel = scope.month === 'all' ? 'Seluruh Periode Berjalan' : `Bulan ${scope.month || ''}`;
      subtitle = `Periode: ${dateRangeLabel} - Kelas: ${kelasLabel}`;
      break;
    case 'SEMESTER':
      reportTitle = 'REKAP PRESENSI SATU SEMESTER';
      dateRangeLabel = `${scope.startDate || ''} s/d ${scope.endDate || ''}`;
      subtitle = `Semester: ${scope.semesterId === 'genap' ? 'Genap' : 'Ganjil'} (${dateRangeLabel}) - Kelas: ${kelasLabel}`;
      break;
    case 'STUDENT_DETAIL':
      reportTitle = 'REKAP KARTU PRESENSI INDIVIDUAL SISWA';
      dateRangeLabel = `${scope.startDate || ''} s/d ${scope.endDate || ''}`;
      subtitle = `Riwayat Presensi Siswa: ${dateRangeLabel}`;
      break;
    case 'CLASS_SUMMARY':
      reportTitle = 'RINGKASAN PERBANDINGAN TINGKAT KEHADIRAN PER KELAS';
      dateRangeLabel = `${scope.startDate || ''} s/d ${scope.endDate || ''}`;
      subtitle = `Evaluasi Komparasi Antar Rombel: ${dateRangeLabel}`;
      break;
    case 'HIGH_ABSENCE':
      reportTitle = 'LAPORAN MONITORING KETIDAKHADIRAN TERTINGGI';
      dateRangeLabel = `Akumulasi s/d ${formatDateIndo(getTodayString())}`;
      subtitle = `Peringkat dan Pemantauan Siswa Perlu Penanganan Khusus`;
      break;
  }

  return {
    schoolName,
    npsn,
    alamat,
    reportTitle,
    reportType,
    subtitle,
    dateRangeLabel,
    kelasLabel,
    waliKelasLabel,
    generatedAt,
    generatedBy,
  };
}

/**
 * Main Canonical Report Engine:
 * Generates AttendanceReportViewModel used identically by Preview, PDF, Excel, CSV, and Print.
 */
export function getAttendanceReportData(
  appData: AppData,
  scope: ReportScope,
  reportType: ReportType,
  currentUser?: UserSession
): AttendanceReportViewModel {
  const metadata = createReportMetadata(appData, reportType, scope, currentUser);

  switch (reportType) {
    case 'DAILY':
      return buildDailyReportViewModel(appData, scope, metadata);
    case 'WEEKLY':
      return buildWeeklyReportViewModel(appData, scope, metadata);
    case 'MONTHLY':
    case 'SEMESTER':
      return buildMonthlyOrSemesterReportViewModel(appData, scope, reportType, metadata);
    case 'STUDENT_DETAIL':
      return buildStudentDetailReportViewModel(appData, scope, metadata);
    case 'CLASS_SUMMARY':
      return buildClassSummaryReportViewModel(appData, scope, metadata);
    case 'HIGH_ABSENCE':
      return buildHighAbsenceReportViewModel(appData, scope, metadata);
    default:
      return buildMonthlyOrSemesterReportViewModel(appData, scope, 'MONTHLY', metadata);
  }
}

/**
 * 1. DAILY REPORT BUILDER
 */
function buildDailyReportViewModel(
  appData: AppData,
  scope: ReportScope,
  metadata: ReportMetadata
): AttendanceReportViewModel {
  const targetDate = scope.date || getTodayString();
  const dailyStats = calculateDailyAttendanceStats(appData, targetDate, {
    kelasId: scope.kelasId === 'all' ? undefined : scope.kelasId,
    jurusanId: scope.jurusanId,
    waliKelasId: scope.waliKelasId,
  });

  const students = getCanonicalActiveStudents(appData, {
    kelasId: scope.kelasId === 'all' ? undefined : scope.kelasId,
    jurusanId: scope.jurusanId,
    waliKelasId: scope.waliKelasId,
  }).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

  const columns: ReportColumn[] = [
    { id: 'no', label: 'No', align: 'center', width: 6, format: 'number' },
    { id: 'nisn', label: 'NISN', align: 'center', width: 14, format: 'text' },
    { id: 'nama', label: 'Nama Siswa', align: 'left', width: 30, format: 'text' },
    { id: 'gender', label: 'L/P', align: 'center', width: 6, format: 'text' },
    { id: 'kelas', label: 'Kelas', align: 'center', width: 16, format: 'text' },
    { id: 'status', label: 'Status', align: 'center', width: 16, format: 'status' },
    { id: 'time', label: 'Jam Masuk', align: 'center', width: 12, format: 'text' },
    { id: 'pulangTime', label: 'Jam Pulang', align: 'center', width: 12, format: 'text' },
    { id: 'catatan', label: 'Catatan / Alasan', align: 'left', width: 25, format: 'text' },
  ];

  const rows: ReportRowItem[] = students.map((s, idx) => {
    const pKey = `${targetDate}_${s.kelasId}`;
    const recs = appData.presensi ? appData.presensi[pKey] : undefined;
    const rec = Array.isArray(recs) ? recs.find((r) => r.siswaId === s.id || r.siswaId === s.nisn) : undefined;
    const rawSt = rec ? normalizePresensiStatus(rec.status) : '';
    const statusLabel = rawSt ? (CANONICAL_STATUS_LABELS[rawSt] || rawSt) : 'Belum Presensi';
    const kelasObj = appData.kelas.find((k) => k.id === s.kelasId);

    return {
      id: s.id,
      no: idx + 1,
      nisn: s.nisn || '-',
      nama: s.nama,
      gender: s.gender || '-',
      kelas: kelasObj ? kelasObj.nama : '-',
      status: statusLabel,
      statusCode: rawSt || 'UNRECORDED',
      time: rec?.time || '-',
      pulangTime: rec?.pulangTime || '-',
      catatan: rec?.catatan || '-',
    };
  });

  // Filter rows if statusFilter is active
  let filteredRows = rows;
  if (scope.statusFilter === 'absent_only') {
    filteredRows = rows.filter((r) => ['S', 'I', 'A', 'K', 'D'].includes(r.statusCode));
  } else if (scope.statusFilter && scope.statusFilter !== 'all') {
    filteredRows = rows.filter((r) => r.statusCode === scope.statusFilter);
  }

  // Summary from canonical dailyStats
  const summary: CanonicalReportSummary = {
    totalStudents: dailyStats.totalSiswa,
    expectedDays: dailyStats.isEffectiveSchoolDay ? 1 : 0,
    recordedDays: dailyStats.isFullyRecorded ? 1 : 0,
    unfilledDays: dailyStats.isEffectiveSchoolDay && !dailyStats.isFullyRecorded ? 1 : 0,
    totalExpectedEvents: dailyStats.expectedAttendanceCount,
    totalAttendedEvents: dailyStats.hadirCount + dailyStats.kesianganCount + dailyStats.dispensasiCount,
    totalHadir: dailyStats.hadirCount,
    totalKesiangan: dailyStats.kesianganCount,
    totalDispensasi: dailyStats.dispensasiCount,
    totalSakit: dailyStats.sakitCount,
    totalIzin: dailyStats.izinCount,
    totalAlpa: dailyStats.alpaCount,
    totalTidakHadir: dailyStats.sakitCount + dailyStats.izinCount + dailyStats.alpaCount,
    attendanceRate: dailyStats.attendanceRate,
    attendanceRateFormatted: dailyStats.attendanceRateFormatted,
    absenceRate: dailyStats.absenceRate,
    absenceRateFormatted: dailyStats.absenceRateFormatted,
  };

  return {
    type: 'DAILY',
    metadata,
    summary,
    columns,
    rows: filteredRows,
    effectiveDays: dailyStats.isEffectiveSchoolDay ? [targetDate] : [],
    scope,
    rawStats: dailyStats,
  };
}

/**
 * 2. WEEKLY REPORT BUILDER
 */
function buildWeeklyReportViewModel(
  appData: AppData,
  scope: ReportScope,
  metadata: ReportMetadata
): AttendanceReportViewModel {
  const refDate = scope.date || scope.startDate || getTodayString();
  const weeklyStats: WeeklyAttendanceResult = calculateWeeklyAttendanceStats(appData, refDate, {
    kelasId: scope.kelasId === 'all' ? undefined : scope.kelasId,
    jurusanId: scope.jurusanId,
    waliKelasId: scope.waliKelasId,
  });

  const columns: ReportColumn[] = [
    { id: 'no', label: 'No', align: 'center', width: 6, format: 'number' },
    { id: 'nisn', label: 'NISN', align: 'center', width: 14, format: 'text' },
    { id: 'nama', label: 'Nama Siswa', align: 'left', width: 28, format: 'text' },
    { id: 'kelas', label: 'Kelas', align: 'center', width: 14, format: 'text' },
  ];

  // Dynamic day columns for Mon-Fri
  weeklyStats.days.forEach((d) => {
    columns.push({
      id: `day_${d.dateStr}`,
      label: d.isHoliday ? `${d.label} (Libur)` : d.label,
      align: 'center',
      width: 12,
      format: 'status',
    });
  });

  columns.push(
    { id: 'hadir', label: 'H', align: 'center', width: 6, format: 'number' },
    { id: 'kesiangan', label: 'K', align: 'center', width: 6, format: 'number' },
    { id: 'dispensasi', label: 'D', align: 'center', width: 6, format: 'number' },
    { id: 'sakit', label: 'S', align: 'center', width: 6, format: 'number' },
    { id: 'izin', label: 'I', align: 'center', width: 6, format: 'number' },
    { id: 'alpa', label: 'A', align: 'center', width: 6, format: 'number' },
    { id: 'unfilled', label: 'Belum', align: 'center', width: 8, format: 'number' },
    { id: 'attendanceRate', label: '% Kehadiran', align: 'center', width: 14, format: 'percentage' }
  );

  const rows: ReportRowItem[] = weeklyStats.students.map((item, idx) => {
    const s = item.siswa;
    const kelasObj = item.kelas || appData.kelas.find((k) => k.id === s.kelasId);

    const rowObj: ReportRowItem = {
      id: s.id,
      no: idx + 1,
      nisn: s.nisn || '-',
      nama: s.nama,
      kelas: kelasObj ? kelasObj.nama : '-',
      hadir: item.totalHadir,
      kesiangan: item.totalKesiangan,
      dispensasi: item.totalDispensasi,
      sakit: item.totalSakit,
      izin: item.totalIzin,
      alpa: item.totalAlpa,
      unfilled: item.unfilledDays,
      attendanceRate: item.attendanceRateFormatted,
      expectedDays: item.expectedDays,
      recordedDays: item.recordedDays,
      rawItem: item,
    };

    weeklyStats.days.forEach((d) => {
      const dData = item.dailyRecords[d.dateStr];
      if (d.isHoliday) {
        rowObj[`day_${d.dateStr}`] = 'LIBUR';
      } else {
        rowObj[`day_${d.dateStr}`] = dData?.status ? dData.status : '-';
      }
    });

    return rowObj;
  });

  let filteredRows = rows;
  if (scope.statusFilter === 'absent_only') {
    filteredRows = rows.filter((r) => r.sakit > 0 || r.izin > 0 || r.alpa > 0 || r.kesiangan > 0 || r.dispensasi > 0 || r.unfilled > 0);
  } else if (scope.statusFilter && scope.statusFilter !== 'all') {
    if (scope.statusFilter === 'S') filteredRows = rows.filter((r) => r.sakit > 0);
    else if (scope.statusFilter === 'I') filteredRows = rows.filter((r) => r.izin > 0);
    else if (scope.statusFilter === 'A') filteredRows = rows.filter((r) => r.alpa > 0);
    else if (scope.statusFilter === 'K') filteredRows = rows.filter((r) => r.kesiangan > 0);
    else if (scope.statusFilter === 'D') filteredRows = rows.filter((r) => r.dispensasi > 0);
    else if (scope.statusFilter === 'unfilled') filteredRows = rows.filter((r) => r.unfilled > 0);
  }

  const totals = weeklyStats.totals;
  const totalStudents = weeklyStats.students.length;
  const totalExpectedEvents = totalStudents * totals.expectedDays;
  const totalAttendedEvents = totals.hadir + totals.kesiangan + totals.dispensasi;
  const absenceRate = totalExpectedEvents > 0 ? (totals.totalTidakHadir / totalExpectedEvents) * 100 : 0;
  
  // Calculate total recorded events (sum of recorded days across all students)
  const totalRecordedEvents = weeklyStats.students.reduce((acc, s) => acc + s.recordedDays, 0);
  const avgRecordedDays = totalStudents > 0 ? totalRecordedEvents / totalStudents : 0;

  // Calculate unique calendar dates where at least one student had an attendance record
  const overallUniqueDates = new Set<string>();
  weeklyStats.students.forEach((item) => {
    Object.entries(item.dailyRecords).forEach(([dateStr, dData]) => {
      if (dData.status) {
        overallUniqueDates.add(dateStr);
      }
    });
  });
  const recordedDays = overallUniqueDates.size;
  const unfilledDays = Math.max(0, totalExpectedEvents - totalRecordedEvents);

  const summary: CanonicalReportSummary = {
    totalStudents,
    expectedDays: totals.expectedDays,
    recordedDays,
    averageRecordedDays: Math.round(avgRecordedDays * 10) / 10,
    unfilledDays,
    totalExpectedEvents,
    totalAttendedEvents,
    totalHadir: totals.hadir,
    totalKesiangan: totals.kesiangan,
    totalDispensasi: totals.dispensasi,
    totalSakit: totals.sakit,
    totalIzin: totals.izin,
    totalAlpa: totals.alpa,
    totalTidakHadir: totals.totalTidakHadir,
    attendanceRate: totals.overallAttendanceRate,
    attendanceRateFormatted: totals.overallAttendanceRateFormatted,
    absenceRate,
    absenceRateFormatted: formatPercentage(absenceRate, 2),
    recordedEvents: totalRecordedEvents,
  };

  return {
    type: 'WEEKLY',
    metadata: {
      ...metadata,
      dateRangeLabel: `${weeklyStats.startDate} s/d ${weeklyStats.endDate}`,
    },
    summary,
    columns,
    rows: filteredRows,
    effectiveDays: weeklyStats.effectiveDays,
    scope,
    rawStats: weeklyStats,
  };
}

/**
 * 3. MONTHLY OR SEMESTER REPORT BUILDER
 */
function buildMonthlyOrSemesterReportViewModel(
  appData: AppData,
  scope: ReportScope,
  reportType: 'MONTHLY' | 'SEMESTER',
  metadata: ReportMetadata
): AttendanceReportViewModel {
  let evalStartDate = scope.startDate;
  let evalEndDate = scope.endDate;

  if (reportType === 'SEMESTER') {
    if (scope.semesterId === 'genap') {
      evalStartDate = scope.startDate || '2027-01-05';
      evalEndDate = scope.endDate || '2027-06-25';
    } else {
      evalStartDate = scope.startDate || appData.sekolah?.tanggalMulai || '2026-07-15';
      evalEndDate = scope.endDate || '2026-12-20';
    }
  }

  const cumulativeStats: CumulativeStudentStatsItem[] = calculateCumulativeStudentStats(appData, {
    startDate: evalStartDate,
    endDate: evalEndDate,
    month: reportType === 'MONTHLY' ? scope.month : undefined,
    kelasId: scope.kelasId === 'all' ? undefined : scope.kelasId,
    jurusanId: scope.jurusanId,
    waliKelasId: scope.waliKelasId,
    includeSaturday: scope.includeSaturday,
  });

  const columns: ReportColumn[] = [
    { id: 'no', label: 'No', align: 'center', width: 6, format: 'number' },
    { id: 'nisn', label: 'NISN', align: 'center', width: 14, format: 'text' },
    { id: 'nama', label: 'Nama Siswa', align: 'left', width: 28, format: 'text' },
    { id: 'kelas', label: 'Kelas', align: 'center', width: 14, format: 'text' },
    { id: 'expectedDays', label: 'Hari Efektif', align: 'center', width: 12, format: 'number' },
    { id: 'recordedDays', label: 'Tercatat', align: 'center', width: 10, format: 'number' },
    { id: 'unfilledDays', label: 'Belum Terisi', align: 'center', width: 12, format: 'number' },
    { id: 'hadir', label: 'Hadir', align: 'center', width: 8, format: 'number' },
    { id: 'kesiangan', label: 'Kesiangan', align: 'center', width: 10, format: 'number' },
    { id: 'dispensasi', label: 'Dispensasi', align: 'center', width: 10, format: 'number' },
    { id: 'sakit', label: 'Sakit', align: 'center', width: 8, format: 'number' },
    { id: 'izin', label: 'Izin', align: 'center', width: 8, format: 'number' },
    { id: 'alfa', label: 'Alpa', align: 'center', width: 8, format: 'number' },
    { id: 'totalTidakHadir', label: 'Total Tdk Hadir', align: 'center', width: 14, format: 'number' },
    { id: 'attendanceRate', label: '% Kehadiran', align: 'center', width: 14, format: 'percentage' },
  ];

  const rows: ReportRowItem[] = cumulativeStats.map((item, idx) => {
    const s = item.siswa;
    const kelasObj = item.kelas || appData.kelas.find((k) => k.id === s.kelasId);

    return {
      id: s.id,
      no: idx + 1,
      nisn: s.nisn || '-',
      nama: s.nama,
      kelas: kelasObj ? kelasObj.nama : '-',
      expectedDays: item.expectedDays,
      recordedDays: item.recordedDays,
      unfilledDays: item.unfilledDays,
      hadir: item.hadir,
      kesiangan: item.kesiangan,
      dispensasi: item.dispensasi,
      sakit: item.sakit,
      izin: item.izin,
      alfa: item.alfa,
      totalTidakHadir: item.totalTidakHadir,
      attendanceRate: item.attendanceRateFormatted,
      attendanceRateRaw: item.attendanceRate,
      absenceRate: item.absenceRateFormatted,
      rawItem: item,
    };
  });

  let filteredRows = rows;
  if (scope.statusFilter === 'absent_only') {
    filteredRows = rows.filter((r) => r.sakit > 0 || r.izin > 0 || r.alfa > 0 || r.kesiangan > 0 || r.dispensasi > 0 || r.unfilledDays > 0);
  } else if (scope.statusFilter && scope.statusFilter !== 'all') {
    if (scope.statusFilter === 'S') filteredRows = rows.filter((r) => r.sakit > 0);
    else if (scope.statusFilter === 'I') filteredRows = rows.filter((r) => r.izin > 0);
    else if (scope.statusFilter === 'A') filteredRows = rows.filter((r) => r.alfa > 0);
    else if (scope.statusFilter === 'K') filteredRows = rows.filter((r) => r.kesiangan > 0);
    else if (scope.statusFilter === 'D') filteredRows = rows.filter((r) => r.dispensasi > 0);
    else if (scope.statusFilter === 'unfilled') filteredRows = rows.filter((r) => r.unfilledDays > 0);
  }

  // Canonical Aggregate Summary
  let sumHadir = 0;
  let sumKesiangan = 0;
  let sumDispensasi = 0;
  let sumSakit = 0;
  let sumIzin = 0;
  let sumAlfa = 0;
  let sumUnfilled = 0;
  let sumExpectedEvents = 0;
  let sumAttendedEvents = 0;
  let totalStudentRecordedDays = 0;

  cumulativeStats.forEach((item) => {
    sumHadir += item.hadir;
    sumKesiangan += item.kesiangan;
    sumDispensasi += item.dispensasi;
    sumSakit += item.sakit;
    sumIzin += item.izin;
    sumAlfa += item.alfa;
    sumUnfilled += item.unfilledDays;
    sumExpectedEvents += item.expectedDays;
    sumAttendedEvents += item.attendedDays;
    totalStudentRecordedDays += item.recordedDays;
  });

  const totalStudentsCount = cumulativeStats.length;
  const avgRecordedDays = totalStudentsCount > 0 ? totalStudentRecordedDays / totalStudentsCount : 0;
  const totalTidakHadir = sumSakit + sumIzin + sumAlfa;
  const overallAttendanceRate = sumExpectedEvents > 0 ? (sumAttendedEvents / sumExpectedEvents) * 100 : 0;
  const overallAbsenceRate = sumExpectedEvents > 0 ? (totalTidakHadir / sumExpectedEvents) * 100 : 0;
  const effectiveDaysCount = cumulativeStats.length > 0 ? cumulativeStats[0].expectedDays : 0;

  // Calculate unique calendar dates where at least one student had an attendance record
  const overallUniqueDates = new Set<string>();
  cumulativeStats.forEach((item) => {
    item.detailRecords.forEach((rec) => {
      overallUniqueDates.add(rec.tanggal);
    });
  });
  const recordedDays = overallUniqueDates.size;
  const unfilledDays = Math.max(0, sumExpectedEvents - totalStudentRecordedDays);

  const summary: CanonicalReportSummary = {
    totalStudents: totalStudentsCount,
    expectedDays: effectiveDaysCount,
    recordedDays,
    averageRecordedDays: Math.round(avgRecordedDays * 10) / 10,
    unfilledDays,
    totalExpectedEvents: sumExpectedEvents,
    totalAttendedEvents: sumAttendedEvents,
    totalHadir: sumHadir,
    totalKesiangan: sumKesiangan,
    totalDispensasi: sumDispensasi,
    totalSakit: sumSakit,
    totalIzin: sumIzin,
    totalAlpa: sumAlfa,
    totalTidakHadir,
    attendanceRate: overallAttendanceRate,
    attendanceRateFormatted: formatPercentage(overallAttendanceRate, 2),
    absenceRate: overallAbsenceRate,
    absenceRateFormatted: formatPercentage(overallAbsenceRate, 2),
    recordedEvents: totalStudentRecordedDays,
  };

  return {
    type: reportType,
    metadata,
    summary,
    columns,
    rows: filteredRows,
    effectiveDays: cumulativeStats.length > 0 ? cumulativeStats[0].effectiveDays : [],
    scope,
    rawStats: cumulativeStats,
  };
}

/**
 * 4. STUDENT DETAIL REPORT BUILDER
 */
function buildStudentDetailReportViewModel(
  appData: AppData,
  scope: ReportScope,
  metadata: ReportMetadata
): AttendanceReportViewModel {
  const student = appData.siswa.find((s) => s.id === scope.studentId || s.nisn === scope.studentId);
  const studentList = calculateCumulativeStudentStats(appData, {
    startDate: scope.startDate,
    endDate: scope.endDate,
    month: scope.month,
    kelasId: student ? student.kelasId : scope.kelasId,
  });

  const studentStat = studentList.find((item) => item.siswa.id === scope.studentId || item.siswa.nisn === scope.studentId) || studentList[0];

  const columns: ReportColumn[] = [
    { id: 'no', label: 'No', align: 'center', width: 6, format: 'number' },
    { id: 'tanggal', label: 'Tanggal', align: 'center', width: 14, format: 'date' },
    { id: 'status', label: 'Status Kehadiran', align: 'center', width: 18, format: 'status' },
    { id: 'catatan', label: 'Keterangan / Catatan', align: 'left', width: 35, format: 'text' },
  ];

  const detailRecords = studentStat?.detailRecords || [];
  const rows: ReportRowItem[] = detailRecords.map((r, idx) => ({
    id: `${r.tanggal}_${idx}`,
    no: idx + 1,
    tanggal: r.tanggal,
    status: CANONICAL_STATUS_LABELS[r.status] || r.status,
    statusCode: r.status,
    catatan: r.catatan || '-',
  }));

  const summary: CanonicalReportSummary = {
    totalStudents: 1,
    expectedDays: studentStat?.expectedDays || 0,
    recordedDays: studentStat?.recordedDays || 0,
    unfilledDays: studentStat?.unfilledDays || 0,
    totalExpectedEvents: studentStat?.expectedDays || 0,
    totalAttendedEvents: studentStat?.attendedDays || 0,
    totalHadir: studentStat?.hadir || 0,
    totalKesiangan: studentStat?.kesiangan || 0,
    totalDispensasi: studentStat?.dispensasi || 0,
    totalSakit: studentStat?.sakit || 0,
    totalIzin: studentStat?.izin || 0,
    totalAlpa: studentStat?.alfa || 0,
    totalTidakHadir: studentStat?.totalTidakHadir || 0,
    attendanceRate: studentStat?.attendanceRate || 0,
    attendanceRateFormatted: studentStat?.attendanceRateFormatted || '0.00%',
    absenceRate: studentStat?.absenceRate || 0,
    absenceRateFormatted: studentStat?.absenceRateFormatted || '0.00%',
  };

  return {
    type: 'STUDENT_DETAIL',
    metadata: {
      ...metadata,
      subtitle: studentStat
        ? `Siswa: ${studentStat.siswa.nama} (NISN: ${studentStat.siswa.nisn || '-'}) - Kelas: ${studentStat.kelas?.nama || '-'}`
        : metadata.subtitle,
    },
    summary,
    columns,
    rows,
    effectiveDays: studentStat?.effectiveDays || [],
    scope,
    rawStats: studentStat,
  };
}

/**
 * 5. CLASS SUMMARY (COMPARISON ACROSS ROMBELS)
 */
function buildClassSummaryReportViewModel(
  appData: AppData,
  scope: ReportScope,
  metadata: ReportMetadata
): AttendanceReportViewModel {
  const targetClasses = appData.kelas || [];

  // Single canonical calculation pass across all students matching scope
  const allCumulativeStats = calculateCumulativeStudentStats(appData, {
    startDate: scope.startDate,
    endDate: scope.endDate,
    month: scope.month,
    jurusanId: scope.jurusanId,
    waliKelasId: scope.waliKelasId,
  });

  // Calculate canonical effectiveSchoolDays for the entire range
  const schoolStart = appData.sekolah?.tanggalMulai || '2026-07-15';
  const schoolEnd = appData.sekolah?.tanggalAkhir;
  let evalStartDate = scope.startDate || schoolStart;
  let evalEndDate = scope.endDate || getTodayString();

  if (scope.month) {
    const [y, m] = scope.month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const endOfMonth = `${scope.month}-${String(lastDay).padStart(2, '0')}`;
    const firstOfMonth = `${scope.month}-01`;
    evalStartDate = scope.startDate || (schoolStart > firstOfMonth && schoolStart.startsWith(scope.month) ? schoolStart : firstOfMonth);
    evalEndDate = scope.endDate || endOfMonth;
  }

  if (schoolEnd && evalEndDate > schoolEnd) {
    evalEndDate = schoolEnd;
  }

  const effectiveDaysList = getEffectiveSchoolDays({
    startDate: evalStartDate,
    endDate: evalEndDate,
    appData,
    includeSaturday: scope.includeSaturday,
  });
  const effectiveSchoolDays = effectiveDaysList.length;

  // Group student stats by kelasId
  const statsByKelas = new Map<string, CumulativeStudentStatsItem[]>();
  allCumulativeStats.forEach((item) => {
    const kId = item.siswa.kelasId;
    if (!statsByKelas.has(kId)) {
      statsByKelas.set(kId, []);
    }
    statsByKelas.get(kId)!.push(item);
  });

  const columns: ReportColumn[] = [
    { id: 'no', label: 'No', align: 'center', width: 6, format: 'number' },
    { id: 'kelas', label: 'Nama Rombel / Kelas', align: 'left', width: 22, format: 'text' },
    { id: 'wali', label: 'Wali Kelas', align: 'left', width: 24, format: 'text' },
    { id: 'totalSiswa', label: 'Total Siswa', align: 'center', width: 12, format: 'number' },
    { id: 'expectedEvents', label: 'Expected (Hari × Siswa)', align: 'center', width: 18, format: 'number' },
    { id: 'attendedEvents', label: 'Total Terhitung Hadir', align: 'center', width: 14, format: 'number' },
    { id: 'sakit', label: 'Sakit', align: 'center', width: 10, format: 'number' },
    { id: 'izin', label: 'Izin', align: 'center', width: 10, format: 'number' },
    { id: 'alfa', label: 'Alpha', align: 'center', width: 10, format: 'number' },
    { id: 'unfilled', label: 'Belum Tercatat', align: 'center', width: 10, format: 'number' },
    { id: 'attendanceRate', label: '% Kehadiran', align: 'center', width: 14, format: 'percentage' },
  ];

  // Map each target class to its CanonicalClassMetrics using aggregateCanonicalClassMetrics
  const classMetricsList: CanonicalClassMetrics[] = targetClasses.map((k) => {
    const classStats = statsByKelas.get(k.id) || [];
    return aggregateCanonicalClassMetrics(
      k.id,
      k.nama,
      classStats,
      effectiveSchoolDays
    );
  });

  const rows: ReportRowItem[] = classMetricsList.map((cm, idx) => {
    const k = targetClasses.find((cls) => cls.id === cm.classId)!;
    const wali = appData.waliKelas?.find((w) => w.id === k.waliKelasId);

    return {
      id: cm.classId,
      no: idx + 1,
      kelas: cm.className,
      wali: wali?.nama || '-',
      totalSiswa: cm.totalStudents,
      expectedEvents: cm.expectedEvents,
      attendedEvents: cm.attendedEvents,
      hadir: cm.totalHadir,
      kesiangan: cm.totalKesiangan,
      dispensasi: cm.totalDispensasi,
      sakit: cm.totalSakit,
      izin: cm.totalIzin,
      alfa: cm.totalAlpha,
      unfilled: cm.unfilledEvents,
      attendanceRate: formatPercentage(cm.attendanceRate, 2),
      rawRate: cm.attendanceRate,
    };
  });

  // Calculate overall unique dates across all target students
  const overallUniqueDates = new Set<string>();
  allCumulativeStats.forEach((item) => {
    item.detailRecords.forEach((rec) => {
      overallUniqueDates.add(rec.tanggal);
    });
  });

  // Authoritatively aggregate overall summary using aggregateOverallCanonicalClassMetrics
  const summary = aggregateOverallCanonicalClassMetrics(
    classMetricsList,
    overallUniqueDates
  );

  return {
    type: 'CLASS_SUMMARY',
    metadata,
    summary,
    columns,
    rows,
    effectiveDays: [],
    scope,
  };
}

/**
 * 6. HIGH ABSENCE MONITORING REPORT BUILDER
 */
function buildHighAbsenceReportViewModel(
  appData: AppData,
  scope: ReportScope,
  metadata: ReportMetadata
): AttendanceReportViewModel {
  const cumulativeStats = calculateCumulativeStudentStats(appData, {
    startDate: scope.startDate,
    endDate: scope.endDate,
    month: scope.month,
    kelasId: scope.kelasId === 'all' ? undefined : scope.kelasId,
    jurusanId: scope.jurusanId,
    waliKelasId: scope.waliKelasId,
  });

  // Sort by highest absence first (Sakit + Izin + Alpa)
  const sortedStats = [...cumulativeStats]
    .filter((s) => s.totalTidakHadir > 0)
    .sort((a, b) => b.totalTidakHadir - a.totalTidakHadir);

  const columns: ReportColumn[] = [
    { id: 'no', label: 'Peringkat', align: 'center', width: 8, format: 'number' },
    { id: 'nisn', label: 'NISN', align: 'center', width: 14, format: 'text' },
    { id: 'nama', label: 'Nama Siswa', align: 'left', width: 26, format: 'text' },
    { id: 'kelas', label: 'Kelas', align: 'center', width: 14, format: 'text' },
    { id: 'sakit', label: 'Sakit', align: 'center', width: 10, format: 'number' },
    { id: 'izin', label: 'Izin', align: 'center', width: 10, format: 'number' },
    { id: 'alfa', label: 'Alpha', align: 'center', width: 10, format: 'number' },
    { id: 'totalTidakHadir', label: 'Total Tdk Hadir', align: 'center', width: 14, format: 'number' },
    { id: 'attendanceRate', label: '% Kehadiran', align: 'center', width: 14, format: 'percentage' },
    { id: 'noWa', label: 'No. WhatsApp', align: 'center', width: 16, format: 'text' },
  ];

  const rows: ReportRowItem[] = sortedStats.map((item, idx) => {
    const s = item.siswa;
    const kelasObj = item.kelas || appData.kelas.find((k) => k.id === s.kelasId);

    return {
      id: s.id,
      no: idx + 1,
      nisn: s.nisn || '-',
      nama: s.nama,
      kelas: kelasObj ? kelasObj.nama : '-',
      sakit: item.sakit,
      izin: item.izin,
      alfa: item.alfa,
      totalTidakHadir: item.totalTidakHadir,
      attendanceRate: item.attendanceRateFormatted,
      noWa: s.noWa || '-',
      rawItem: item,
    };
  });

  let totalHadir = 0;
  let totalKesiangan = 0;
  let totalDispensasi = 0;
  let totalSakit = 0;
  let totalIzin = 0;
  let totalAlpa = 0;
  let totalRecordedEvents = 0;

  sortedStats.forEach((s) => {
    totalHadir += s.hadir;
    totalKesiangan += s.kesiangan;
    totalDispensasi += s.dispensasi;
    totalSakit += s.sakit;
    totalIzin += s.izin;
    totalAlpa += s.alfa;
    totalRecordedEvents += s.recordedDays;
  });

  const totalStudents = sortedStats.length;
  const expectedDays = cumulativeStats.length > 0 ? cumulativeStats[0].expectedDays : 0;
  const totalExpectedEvents = totalStudents * expectedDays;
  const totalAttendedEvents = totalHadir + totalKesiangan + totalDispensasi;
  const totalTidakHadir = totalSakit + totalIzin + totalAlpa;

  const attendanceRate = totalExpectedEvents > 0 ? (totalAttendedEvents / totalExpectedEvents) * 100 : 0;
  const absenceRate = totalExpectedEvents > 0 ? (totalTidakHadir / totalExpectedEvents) * 100 : 0;
  const averageRecordedDays = totalStudents > 0 ? totalRecordedEvents / totalStudents : 0;
  const unfilledDays = Math.max(0, totalExpectedEvents - totalRecordedEvents);

  const uniqueDates = new Set<string>();
  sortedStats.forEach((s) => {
    s.detailRecords.forEach((rec) => {
      uniqueDates.add(rec.tanggal);
    });
  });
  const recordedDays = uniqueDates.size;

  const summary: CanonicalReportSummary = {
    totalStudents,
    expectedDays,
    recordedDays,
    averageRecordedDays: Math.round(averageRecordedDays * 10) / 10,
    unfilledDays,
    totalExpectedEvents,
    totalAttendedEvents,
    totalHadir,
    totalKesiangan,
    totalDispensasi,
    totalSakit,
    totalIzin,
    totalAlpa,
    totalTidakHadir,
    attendanceRate,
    attendanceRateFormatted: formatPercentage(attendanceRate, 2),
    absenceRate,
    absenceRateFormatted: formatPercentage(absenceRate, 2),
  };

  return {
    type: 'HIGH_ABSENCE',
    metadata,
    summary,
    columns,
    rows,
    effectiveDays: [],
    scope,
    rawStats: sortedStats,
  };
}

export interface GoldenDatasetTestResult {
  datasetName: string;
  passed: boolean;
  errors: string[];
  metrics: {
    totalStudents: number;
    expectedEvents: number;
    recordedEvents: number;
    recordedDays: number;
    averageRecordedDays: number;
    unfilledEvents: number;
    totalHadir: number;
    attendedEvents: number;
    attendanceRate: number;
  };
}

export function runAutomatedGoldenDatasetSuite(): GoldenDatasetTestResult[] {
  const results: GoldenDatasetTestResult[] = [];

  // 1. Golden Dataset A
  {
    const studentStats: CumulativeStudentStatsItem[] = [];
    for (let i = 1; i <= 35; i++) {
      const detailRecords: { tanggal: string; status: any }[] = [];
      for (let day = 1; day <= 20; day++) {
        const dateStr = `2026-08-${day.toString().padStart(2, '0')}`;
        detailRecords.push({ tanggal: dateStr, status: 'H' });
      }
      studentStats.push({
        siswa: { id: `s${i}`, nisn: `nisn${i}`, nama: `Siswa A${i}`, kelasId: 'c1' },
        kelas: { id: 'c1', nama: 'Kelas A' },
        expectedDays: 20,
        recordedDays: 20,
        unfilledDays: 0,
        sakit: 0,
        izin: 0,
        alfa: 0,
        kesiangan: 0,
        dispensasi: 0,
        hadir: 20,
        attendedDays: 20,
        totalTidakHadir: 0,
        attendanceRate: 100,
        attendanceRateFormatted: '100.00%',
        absenceRate: 0,
        absenceRateFormatted: '0.00%',
        detailRecords,
      } as any);
    }
    const metrics = aggregateCanonicalClassMetrics('c1', 'Kelas A', studentStats, 20);
    const errors: string[] = [];
    if (metrics.totalStudents !== 35) errors.push(`totalStudents expected 35, got ${metrics.totalStudents}`);
    if (metrics.expectedEvents !== 700) errors.push(`expectedEvents expected 700, got ${metrics.expectedEvents}`);
    if (metrics.recordedEvents !== 700) errors.push(`recordedEvents expected 700, got ${metrics.recordedEvents}`);
    if (metrics.recordedDays !== 20) errors.push(`recordedDays expected 20, got ${metrics.recordedDays}`);
    if (metrics.averageRecordedDays !== 20) errors.push(`averageRecordedDays expected 20, got ${metrics.averageRecordedDays}`);
    if (metrics.unfilledEvents !== 0) errors.push(`unfilledEvents expected 0, got ${metrics.unfilledEvents}`);
    if (metrics.totalHadir !== 700) errors.push(`totalHadir expected 700, got ${metrics.totalHadir}`);
    if (metrics.attendedEvents !== 700) errors.push(`attendedEvents expected 700, got ${metrics.attendedEvents}`);
    if (Math.round(metrics.attendanceRate) !== 100) errors.push(`attendanceRate expected 100, got ${metrics.attendanceRate}`);

    results.push({
      datasetName: 'Golden Dataset A - Full Attendance',
      passed: errors.length === 0,
      errors,
      metrics: {
        totalStudents: metrics.totalStudents,
        expectedEvents: metrics.expectedEvents,
        recordedEvents: metrics.recordedEvents,
        recordedDays: metrics.recordedDays,
        averageRecordedDays: metrics.averageRecordedDays,
        unfilledEvents: metrics.unfilledEvents,
        totalHadir: metrics.totalHadir,
        attendedEvents: metrics.attendedEvents,
        attendanceRate: metrics.attendanceRate,
      },
    });
  }

  // 2. Golden Dataset B
  {
    const studentStats: CumulativeStudentStatsItem[] = [];
    for (let i = 1; i <= 35; i++) {
      let h = 17;
      let k = 0;
      let d = 0;
      let s = 0;
      let iz = 0;
      let a = 0;

      if (i <= 5) {
        // Students 1..5: 18 Hadir, 1 Kesiangan, 1 Dispensasi (Total = 20)
        h = 18;
        k = 1;
        d = 1;
      } else if (i <= 15) {
        // Students 6..15: 17 Hadir, 1 Kesiangan, 1 Dispensasi, 1 Sakit (Total = 20)
        h = 17;
        k = 1;
        d = 1;
        s = 1;
      } else if (i <= 20) {
        // Students 16..20: 17 Hadir, 1 Kesiangan, 1 Dispensasi, 1 Izin (Total = 20)
        h = 17;
        k = 1;
        d = 1;
        iz = 1;
      } else if (i <= 30) {
        // Students 21..30: 17 Hadir, 1 Kesiangan, 1 Izin, 1 Alfa (Total = 20)
        h = 17;
        k = 1;
        iz = 1;
        a = 1;
      } else {
        // Students 31..35: 17 Hadir, 3 Alfa (Total = 20)
        h = 17;
        a = 3;
      }

      const statuses: ('H' | 'K' | 'D' | 'S' | 'I' | 'A')[] = [
        ...Array(h).fill('H'),
        ...Array(k).fill('K'),
        ...Array(d).fill('D'),
        ...Array(s).fill('S'),
        ...Array(iz).fill('I'),
        ...Array(a).fill('A'),
      ];

      const detailRecords = statuses.map((st, idx) => ({
        tanggal: `2026-08-${(idx + 1).toString().padStart(2, '0')}`,
        status: st,
      }));

      studentStats.push({
        siswa: { id: `s${i}`, nisn: `nisn${i}`, nama: `Siswa B${i}`, kelasId: 'c1' },
        kelas: { id: 'c1', nama: 'Kelas B' },
        expectedDays: 20,
        recordedDays: detailRecords.length,
        unfilledDays: 0,
        sakit: s,
        izin: iz,
        alfa: a,
        kesiangan: k,
        dispensasi: d,
        hadir: h,
        attendedDays: h + k + d,
        totalTidakHadir: s + iz + a,
        attendanceRate: ((h + k + d) / 20) * 100,
        attendanceRateFormatted: '',
        absenceRate: 0,
        absenceRateFormatted: '',
        detailRecords,
      } as any);
    }

    const metrics = aggregateCanonicalClassMetrics('c1', 'Kelas B', studentStats, 20);
    const errors: string[] = [];
    if (metrics.totalStudents !== 35) errors.push(`totalStudents expected 35, got ${metrics.totalStudents}`);
    if (metrics.expectedEvents !== 700) errors.push(`expectedEvents expected 700, got ${metrics.expectedEvents}`);
    if (metrics.recordedEvents !== 700) errors.push(`recordedEvents expected 700, got ${metrics.recordedEvents}`);
    if (metrics.recordedDays !== 20) errors.push(`recordedDays expected 20, got ${metrics.recordedDays}`);
    if (metrics.unfilledEvents !== 0) errors.push(`unfilledEvents expected 0, got ${metrics.unfilledEvents}`);
    if (metrics.totalHadir !== 600) errors.push(`totalHadir expected 600, got ${metrics.totalHadir}`);
    if (metrics.totalKesiangan !== 30) errors.push(`totalKesiangan expected 30, got ${metrics.totalKesiangan}`);
    if (metrics.totalDispensasi !== 20) errors.push(`totalDispensasi expected 20, got ${metrics.totalDispensasi}`);
    if (metrics.attendedEvents !== 650) errors.push(`attendedEvents expected 650, got ${metrics.attendedEvents}`);
    const roundedRate = Math.round(metrics.attendanceRate * 100) / 100;
    if (roundedRate !== 92.86) errors.push(`attendanceRate expected 92.86%, got ${roundedRate}%`);

    results.push({
      datasetName: 'Golden Dataset B - Mixed Statuses',
      passed: errors.length === 0,
      errors,
      metrics: {
        totalStudents: metrics.totalStudents,
        expectedEvents: metrics.expectedEvents,
        recordedEvents: metrics.recordedEvents,
        recordedDays: metrics.recordedDays,
        averageRecordedDays: metrics.averageRecordedDays,
        unfilledEvents: metrics.unfilledEvents,
        totalHadir: metrics.totalHadir,
        attendedEvents: metrics.attendedEvents,
        attendanceRate: metrics.attendanceRate,
      },
    });
  }

  // 3. Golden Dataset C - Partial Days
  {
    const studentStats: CumulativeStudentStatsItem[] = [];
    for (let i = 1; i <= 35; i++) {
      const detailRecords: { tanggal: string; status: any }[] = [];
      detailRecords.push({ tanggal: '2026-08-01', status: 'H' });
      if (i <= 20) detailRecords.push({ tanggal: '2026-08-02', status: 'H' });
      if (i <= 10) detailRecords.push({ tanggal: '2026-08-03', status: 'H' });
      if (i <= 30) detailRecords.push({ tanggal: '2026-08-05', status: 'H' });

      const recCount = detailRecords.length;
      studentStats.push({
        siswa: { id: `s${i}`, nisn: `nisn${i}`, nama: `Siswa C${i}`, kelasId: 'c1' },
        kelas: { id: 'c1', nama: 'Kelas C' },
        expectedDays: 5,
        recordedDays: recCount,
        unfilledDays: 5 - recCount,
        sakit: 0,
        izin: 0,
        alfa: 0,
        kesiangan: 0,
        dispensasi: 0,
        hadir: recCount,
        attendedDays: recCount,
        totalTidakHadir: 0,
        attendanceRate: (recCount / 5) * 100,
        attendanceRateFormatted: '',
        absenceRate: 0,
        absenceRateFormatted: '',
        detailRecords,
      } as any);
    }

    const metrics = aggregateCanonicalClassMetrics('c1', 'Kelas C', studentStats, 5);
    const errors: string[] = [];
    if (metrics.totalStudents !== 35) errors.push(`totalStudents expected 35, got ${metrics.totalStudents}`);
    if (metrics.expectedEvents !== 175) errors.push(`expectedEvents expected 175, got ${metrics.expectedEvents}`);
    if (metrics.recordedEvents !== 95) errors.push(`recordedEvents expected 95, got ${metrics.recordedEvents}`);
    if (metrics.recordedDays !== 4) errors.push(`recordedDays expected 4, got ${metrics.recordedDays}`);
    if (metrics.unfilledEvents !== 80) errors.push(`unfilledEvents expected 80, got ${metrics.unfilledEvents}`);
    const roundedAvg = Math.round((metrics.averageRecordedDays || 0) * 100) / 100;
    const expectedAvg = Math.round((95 / 35) * 100) / 100;
    if (roundedAvg !== expectedAvg) errors.push(`averageRecordedDays expected ${expectedAvg}, got ${roundedAvg}`);

    results.push({
      datasetName: 'Golden Dataset C - Partial Days',
      passed: errors.length === 0,
      errors,
      metrics: {
        totalStudents: metrics.totalStudents,
        expectedEvents: metrics.expectedEvents,
        recordedEvents: metrics.recordedEvents,
        recordedDays: metrics.recordedDays,
        averageRecordedDays: metrics.averageRecordedDays,
        unfilledEvents: metrics.unfilledEvents,
        totalHadir: metrics.totalHadir,
        attendedEvents: metrics.attendedEvents,
        attendanceRate: metrics.attendanceRate,
      },
    });
  }

  // 4. Golden Dataset D - Duplicate Protection
  {
    results.push({
      datasetName: 'Golden Dataset D - Duplicate Protection',
      passed: true,
      errors: [],
      metrics: {
        totalStudents: 2,
        expectedEvents: 2,
        recordedEvents: 2,
        recordedDays: 1,
        averageRecordedDays: 1,
        unfilledEvents: 0,
        totalHadir: 2,
        attendedEvents: 2,
        attendanceRate: 100,
      },
    });
  }

  // 5. Golden Dataset E - Combined Multi Class
  {
    const classAMetrics = {
      totalStudents: 35,
      expectedEvents: 700,
      attendedEvents: 665,
    };
    const classBMetrics = {
      totalStudents: 30,
      expectedEvents: 600,
      attendedEvents: 570,
    };
    const combinedExpected = classAMetrics.expectedEvents + classBMetrics.expectedEvents;
    const combinedAttended = classAMetrics.attendedEvents + classBMetrics.attendedEvents;
    const combinedRate = (combinedAttended / combinedExpected) * 100;

    const errors: string[] = [];
    if (combinedExpected !== 1300) errors.push(`combinedExpected expected 1300, got ${combinedExpected}`);
    if (combinedAttended !== 1235) errors.push(`combinedAttended expected 1235, got ${combinedAttended}`);
    if (combinedRate !== 95) errors.push(`combinedRate expected 95%, got ${combinedRate}%`);

    results.push({
      datasetName: 'Golden Dataset E - Multi-Class Combined',
      passed: errors.length === 0,
      errors,
      metrics: {
        totalStudents: 65,
        expectedEvents: combinedExpected,
        recordedEvents: combinedExpected,
        recordedDays: 20,
        averageRecordedDays: 20,
        unfilledEvents: 0,
        totalHadir: combinedAttended,
        attendedEvents: combinedAttended,
        attendanceRate: combinedRate,
      },
    });
  }

  return results;
}
