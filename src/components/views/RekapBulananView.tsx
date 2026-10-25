import React, { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet, Search, CalendarDays, CheckCircle2, AlertTriangle, Activity, Users, Clock, Calendar } from 'lucide-react';
import { AppData, UserSession } from '../../types';
import { sortKelasList } from '../../data/initialData';
import {
  getTodayString,
  formatDateIndo,
  calculateCumulativeStudentStats,
} from '../../utils/helpers';
import { getAttendanceReportData, AttendanceReportViewModel } from '../../utils/reportEngine';
import { ReportExportButton } from '../common/ReportExportButton';
import { ReportPreviewModal } from '../common/ReportPreviewModal';
import { Pagination } from '../Pagination';
import { PageHeader, StatCard } from '../common/UIComponents';

function getWeekRangeForDate(dStr: string) {
  const parts = dStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2] || 1);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMon);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  const formatIso = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dayN = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayN}`;
  };

  const start = formatIso(monday);
  const end = formatIso(saturday);
  const label = `${formatDateIndo(start)} - ${formatDateIndo(end)}`;
  return { start, end, label };
}

interface RekapBulananViewProps {
  appData: AppData;
  currentUser: UserSession;
}

export const RekapBulananView: React.FC<RekapBulananViewProps> = ({ appData, currentUser }) => {
  const sortedKelas = sortKelasList(appData.kelas);
  const isWali = String(currentUser.role || '').toLowerCase() === 'wali' || String(currentUser.role || '').toLowerCase() === 'walikelas';

  const isPiketKelas = useMemo(() => {
    const role = String(currentUser.role || '').toLowerCase();
    if (role === 'piket_kelas' || role === 'piketkelas') return true;
    if (Array.isArray(currentUser.roles) && currentUser.roles.some((r) => {
      const lr = String(r).toLowerCase();
      return lr === 'piket_kelas' || lr === 'piketkelas';
    })) return true;

    const userData = currentUser.data as any;
    if (userData) {
      const uRole = String(userData.role || '').toLowerCase();
      if (uRole === 'piket_kelas' || uRole === 'piketkelas') return true;
      if (Array.isArray(userData.roles) && userData.roles.some((r: string) => {
        const lr = String(r).toLowerCase();
        return lr === 'piket_kelas' || lr === 'piketkelas';
      })) return true;
      if (Array.isArray(userData.additionalRoles) && userData.additionalRoles.some((r: string) => {
        const lr = String(r).toLowerCase();
        return lr === 'piket_kelas' || lr === 'piketkelas';
      })) return true;

      const uId = String(userData.id || '').toLowerCase();
      if (uId.startsWith('piket-')) return true;

      const uNama = String(userData.nama || '').toLowerCase();
      if (uNama.startsWith('piket kelas') || uNama.includes('piket kelas') || uNama.startsWith('piket - kelas')) return true;

      const uTugas = String(userData.tugasTambahan || '').toLowerCase();
      if (uTugas.includes('piket kelas') || uTugas.includes('piket presensi kelas')) return true;

      const uUsername = String(userData.username || '').toLowerCase().replace(/[\s\-_]+/g, '');
      const uNip = String(userData.nip || '').toLowerCase().replace(/[\s\-_]+/g, '');
      const matchesClassName = sortedKelas.some((k) => {
        const cName = String(k.nama || '').toLowerCase().replace(/[\s\-_]+/g, '');
        return cName && (uUsername === cName || uUsername === `piket${cName}` || uNip === cName);
      });
      if (matchesClassName && !['admin', 'superadmin', 'kesiswaan', 'kurikulum', 'hubin', 'staf_jadwal'].includes(role)) {
        return true;
      }
    }
    return false;
  }, [currentUser, sortedKelas]);

  const assignedPiketClass = useMemo(() => {
    if (!isPiketKelas) return null;
    const userData = currentUser.data as any;
    const uId = String(userData?.id || '');
    const uKelasId = String(userData?.kelasId || '');
    const uKelasNama = String(userData?.kelasNama || '').toLowerCase().replace(/[\s\-_]+/g, '');
    const uUsername = String(userData?.username || '').toLowerCase().replace(/[\s\-_]+/g, '');
    const uNama = String(userData?.nama || '').toLowerCase().replace(/[\s\-_]+/g, '');
    const uNip = String(userData?.nip || '').toLowerCase().replace(/[\s\-_]+/g, '');

    if (uKelasId) {
      const found = sortedKelas.find((k) => String(k.id) === uKelasId);
      if (found) return found;
    }
    if (uId.startsWith('piket-')) {
      const cleanId = uId.replace('piket-', '');
      const found = sortedKelas.find(
        (k) => String(k.id) === cleanId || String(k.nama).toLowerCase().replace(/[\s\-_]+/g, '') === cleanId
      );
      if (found) return found;
    }
    if (uKelasNama) {
      const found = sortedKelas.find((k) => String(k.nama).toLowerCase().replace(/[\s\-_]+/g, '') === uKelasNama);
      if (found) return found;
    }
    if (uNip) {
      const found = sortedKelas.find((k) => String(k.nama).toLowerCase().replace(/[\s\-_]+/g, '') === uNip);
      if (found) return found;
    }
    const strippedUsername = uUsername.replace(/^piket(kelas)?/, '');
    if (strippedUsername) {
      const found = sortedKelas.find((k) => String(k.nama).toLowerCase().replace(/[\s\-_]+/g, '') === strippedUsername);
      if (found) return found;
    }
    for (const k of sortedKelas) {
      const cleanK = String(k.nama || '').toLowerCase().replace(/[\s\-_]+/g, '');
      if (cleanK && (uNama.includes(cleanK) || uUsername.includes(cleanK))) {
        return k;
      }
    }
    return sortedKelas[0] || null;
  }, [isPiketKelas, currentUser, sortedKelas]);

  const availableClasses = useMemo(() => {
    if (isPiketKelas) {
      return assignedPiketClass ? [assignedPiketClass] : (sortedKelas.length > 0 ? [sortedKelas[0]] : []);
    }
    if (isWali) {
      return sortedKelas.filter((k) => k.waliKelasId === (currentUser.data as any).id);
    }
    return sortedKelas;
  }, [isPiketKelas, assignedPiketClass, isWali, currentUser, sortedKelas]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    if (isPiketKelas && assignedPiketClass) {
      return assignedPiketClass.id;
    }
    return (isWali || isPiketKelas) && availableClasses.length > 0 ? availableClasses[0].id : 'all';
  });

  useEffect(() => {
    if (isPiketKelas && assignedPiketClass) {
      if (selectedKelasId !== assignedPiketClass.id) {
        setSelectedKelasId(assignedPiketClass.id);
      }
    }
  }, [isPiketKelas, assignedPiketClass, selectedKelasId]);
  const [selectedBulan, setSelectedBulan] = useState<string>(getTodayString().slice(0, 7));
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [previewReport, setPreviewReport] = useState<AttendanceReportViewModel | null>(null);

  // Mode Rekap: 'bulan' (Per Bulan), 'minggu' (Per Minggu), 'semua' (Semua dari Awal)
  const [periodMode, setPeriodMode] = useState<'bulan' | 'minggu' | 'semua'>('bulan');
  const [selectedWeek, setSelectedWeek] = useState<string>('');

  const currentKelas = selectedKelasId === 'all' ? null : availableClasses.find((k) => k.id === selectedKelasId);

  // Available weeks from presensi records & current date
  const availableWeeks = useMemo(() => {
    const weeksMap = new Map<string, { start: string; end: string; label: string }>();

    // Current week
    const curW = getWeekRangeForDate(getTodayString());
    weeksMap.set(`${curW.start}_${curW.end}`, {
      start: curW.start,
      end: curW.end,
      label: `Minggu Ini (${curW.label})`
    });

    // Extract dates from appData.presensi
    const allKeys = Object.keys(appData.presensi || {});
    allKeys.forEach((key) => {
      const underscoreIdx = key.indexOf('_');
      if (underscoreIdx > 0) {
        const tgl = key.slice(0, underscoreIdx);
        const w = getWeekRangeForDate(tgl);
        const k = `${w.start}_${w.end}`;
        if (!weeksMap.has(k)) {
          weeksMap.set(k, {
            start: w.start,
            end: w.end,
            label: `Minggu ${w.label}`
          });
        }
      }
    });

    return Array.from(weeksMap.entries())
      .map(([key, item]) => ({ key, ...item }))
      .sort((a, b) => b.start.localeCompare(a.start));
  }, [appData.presensi]);

  useEffect(() => {
    if (!selectedWeek && availableWeeks.length > 0) {
      setSelectedWeek(availableWeeks[0].key);
    }
  }, [availableWeeks, selectedWeek]);

  const activeWeekObj = useMemo(() => {
    return availableWeeks.find((w) => w.key === selectedWeek) || availableWeeks[0];
  }, [availableWeeks, selectedWeek]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedKelasId, periodMode, selectedWeek, selectedBulan, selectedStatusFilter, searchQuery]);

  const availableMonths = useMemo(() => {
    const startStr = appData.sekolah?.tanggalMulai || '2026-07-15';
    const endStr = appData.sekolah?.tanggalAkhir || '2027-06-30';

    const [sYear, sMonth] = startStr.split('-').map(Number);
    const [eYear, eMonth] = endStr.split('-').map(Number);

    const months: { value: string; label: string }[] = [];
    const curr = new Date(sYear, sMonth - 1, 1);
    const end = new Date(eYear, eMonth - 1, 1);

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const val = `${y}-${m}`;
      months.push({
        value: val,
        label: `${monthNames[curr.getMonth()]} ${y}`,
      });
      curr.setMonth(curr.getMonth() + 1);
    }
    return months;
  }, [appData.sekolah?.tanggalMulai, appData.sekolah?.tanggalAkhir]);

  // Canonical Cumulative Stats for Month, Week, or All Period
  const cumulativeStats = useMemo(() => {
    if (periodMode === 'semua') {
      return calculateCumulativeStudentStats(appData, {
        month: 'all',
        kelasId: selectedKelasId === 'all' ? undefined : selectedKelasId,
        waliKelasId: isWali ? (currentUser.data as any).id : undefined,
      });
    }

    if (periodMode === 'minggu' && activeWeekObj) {
      return calculateCumulativeStudentStats(appData, {
        startDate: activeWeekObj.start,
        endDate: activeWeekObj.end,
        kelasId: selectedKelasId === 'all' ? undefined : selectedKelasId,
        waliKelasId: isWali ? (currentUser.data as any).id : undefined,
      });
    }

    return calculateCumulativeStudentStats(appData, {
      month: selectedBulan,
      kelasId: selectedKelasId === 'all' ? undefined : selectedKelasId,
      waliKelasId: isWali ? (currentUser.data as any).id : undefined,
    });
  }, [appData, periodMode, activeWeekObj, selectedBulan, selectedKelasId, isWali, currentUser]);

  const effectiveDaysCount = cumulativeStats.length > 0 ? cumulativeStats[0].expectedDays : 0;

  // Aggregate totals
  const aggregatedTotals = useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;
    let kesiangan = 0;
    let dispensasi = 0;
    let totalUnfilled = 0;
    let totalPossible = 0;
    let totalAttended = 0;

    cumulativeStats.forEach((item) => {
      hadir += item.hadir;
      sakit += item.sakit;
      izin += item.izin;
      alpa += item.alfa;
      kesiangan += item.kesiangan;
      dispensasi += item.dispensasi;
      totalUnfilled += item.unfilledDays;
      totalPossible += item.expectedDays;
      totalAttended += item.attendedDays;
    });

    const averageRate = totalPossible > 0 ? (totalAttended / totalPossible) * 100 : 0;

    return {
      hadir,
      sakit,
      izin,
      alpa,
      kesiangan,
      dispensasi,
      totalUnfilled,
      averageRateFormatted: `${averageRate.toFixed(2)}%`,
    };
  }, [cumulativeStats]);

  // Filter list
  const filteredList = useMemo(() => {
    return cumulativeStats.filter((item) => {
      if (selectedStatusFilter === 'absent_only') {
        if (item.totalTidakHadir === 0 && item.kesiangan === 0 && item.dispensasi === 0 && item.unfilledDays === 0) return false;
      } else if (selectedStatusFilter === 'S') {
        if (item.sakit === 0) return false;
      } else if (selectedStatusFilter === 'I') {
        if (item.izin === 0) return false;
      } else if (selectedStatusFilter === 'A') {
        if (item.alfa === 0) return false;
      } else if (selectedStatusFilter === 'K') {
        if (item.kesiangan === 0) return false;
      } else if (selectedStatusFilter === 'D') {
        if (item.dispensasi === 0) return false;
      } else if (selectedStatusFilter === 'unfilled') {
        if (item.unfilledDays === 0) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.siswa.nama.toLowerCase().includes(q) ||
          (item.siswa.nisn && item.siswa.nisn.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [cumulativeStats, selectedStatusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const pagedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getCanonicalReport = (): AttendanceReportViewModel => {
    return getAttendanceReportData(
      appData,
      {
        month: periodMode === 'semua' ? 'all' : (periodMode === 'bulan' ? selectedBulan : undefined),
        startDate: periodMode === 'minggu' && activeWeekObj ? activeWeekObj.start : undefined,
        endDate: periodMode === 'minggu' && activeWeekObj ? activeWeekObj.end : undefined,
        kelasId: selectedKelasId,
        waliKelasId: isWali ? (currentUser.data as any).id : undefined,
        statusFilter: selectedStatusFilter,
      },
      periodMode === 'minggu' ? 'WEEKLY' : 'MONTHLY',
      currentUser
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={CalendarDays}
        title="Rekap Presensi Siswa"
        description="Statistik kehadiran siswa berbasis Hari Efektif Sekolah dengan pilihan per minggu, per bulan, dan semua dari awal."
        badge={
          periodMode === 'semua'
            ? `Semua dari Awal (${effectiveDaysCount} Hari Efektif)`
            : periodMode === 'minggu'
            ? `${activeWeekObj?.label || 'Per Minggu'} (${effectiveDaysCount} Hari Efektif)`
            : `Bulan ${selectedBulan} (${effectiveDaysCount} Hari Efektif)`
        }
        actions={
          <ReportExportButton
            getReportViewModel={getCanonicalReport}
            onOpenPreview={(rep) => setPreviewReport(rep)}
            label={`Export Rekap (${periodMode === 'semua' ? 'Semua dari Awal' : periodMode === 'minggu' ? 'Mingguan' : 'Bulanan'})`}
          />
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
        <StatCard
          label="Hari Efektif"
          value={`${effectiveDaysCount} Hari`}
          icon={CalendarDays}
          variant="primary"
        />
        <StatCard
          label="Total Hadir (H)"
          value={aggregatedTotals.hadir}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          label="Total Sakit (S)"
          value={aggregatedTotals.sakit}
          icon={CalendarDays}
          variant="warning"
        />
        <StatCard
          label="Total Izin (I)"
          value={aggregatedTotals.izin}
          icon={CalendarDays}
          variant="info"
        />
        <StatCard
          label="Total Alpa (A)"
          value={aggregatedTotals.alpa}
          icon={AlertTriangle}
          variant="danger"
        />
        <StatCard
          label="Kesiangan (K)"
          value={aggregatedTotals.kesiangan}
          icon={Clock}
          variant="neutral"
        />
        <StatCard
          label="Kehadiran Rata-rata"
          value={aggregatedTotals.averageRateFormatted}
          icon={Activity}
          variant="success"
        />
      </div>

      {/* Filter Card */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        {/* Mode Rekap Selector: Per Bulan | Per Minggu | Semua dari Awal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Pilih Rentang Rekap:</span>
          </label>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setPeriodMode('bulan')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                periodMode === 'bulan'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Per Bulan
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('minggu')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                periodMode === 'minggu'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Per Minggu
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('semua')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                periodMode === 'semua'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua dari Awal
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Pilih Kelas
              </label>
              {isPiketKelas && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300">
                  Terkunci (Kelas Anda)
                </span>
              )}
            </div>
            <select
              value={selectedKelasId}
              disabled={isPiketKelas}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className={`w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none transition ${
                isPiketKelas ? 'opacity-90 cursor-not-allowed bg-slate-100 dark:bg-slate-800/60 border-teal-300 dark:border-teal-800/60' : 'cursor-pointer'
              }`}
            >
              {!isWali && !isPiketKelas && <option value="all">Seluruh Kelas ({appData.kelas.length} Rombel)</option>}
              {availableClasses.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama} {isPiketKelas ? '(Terkunci - Kelas Anda)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              {periodMode === 'bulan' ? 'Pilih Bulan Presensi' : periodMode === 'minggu' ? 'Pilih Minggu Presensi' : 'Periode Terpilih'}
            </label>
            {periodMode === 'bulan' && (
              <select
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(e.target.value)}
                className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}
            {periodMode === 'minggu' && (
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {availableWeeks.map((w) => (
                  <option key={w.key} value={w.key}>
                    {w.label}
                  </option>
                ))}
              </select>
            )}
            {periodMode === 'semua' && (
              <div className="py-3 px-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center justify-between">
                <span>Seluruh Tahun Ajaran</span>
                <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">Dari Awal Semester s/d Hari Ini</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Filter Tampilan
            </label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Siswa Terdaftar</option>
              <option value="absent_only">Hanya Siswa Pernah Tidak Hadir / Belum diisi</option>
              <option value="S">Siswa Pernah Sakit (S)</option>
              <option value="I">Siswa Pernah Izin (I)</option>
              <option value="A">Siswa Pernah Alpa (A)</option>
              <option value="K">Siswa Pernah Kesiangan (K)</option>
              <option value="D">Siswa Pernah Dispensasi (D)</option>
              <option value="unfilled">Siswa Memiliki Hari Belum Terisi (Belum diisi)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              Akumulasi Presensi Siswa: {currentKelas ? currentKelas.nama : 'Seluruh Kelas'} (
              {selectedBulan === 'all' ? 'Semua Periode' : selectedBulan})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Menampilkan {filteredList.length} dari {cumulativeStats.length} total siswa | Denominator: {effectiveDaysCount} Hari Efektif
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama / NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 pl-9 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>
        </div>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-4 text-center">No</th>
                <th className="p-4">NISN</th>
                <th className="p-4">Nama Siswa</th>
                <th className="p-4">Kelas</th>
                <th className="p-4 text-center text-slate-600">Efektif</th>
                <th className="p-4 text-center text-slate-600">Tercatat</th>
                <th className="p-4 text-center text-slate-600">Belum diisi</th>
                <th className="p-4 text-center text-emerald-600">Hadir</th>
                <th className="p-4 text-center text-amber-600">Izin</th>
                <th className="p-4 text-center text-indigo-600">Sakit</th>
                <th className="p-4 text-center text-rose-600">Alpa</th>
                <th className="p-4 text-center text-orange-600">Kesiangan</th>
                <th className="p-4 text-center text-purple-600">Dispensasi</th>
                <th className="p-4 text-center text-slate-700 dark:text-slate-300">Tdk Hadir</th>
                <th className="p-4 text-center text-blue-600">% Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagedList.length === 0 ? (
                <tr>
                  <td colSpan={15} className="p-8 text-center text-slate-400">
                    Tidak ada data siswa yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                pagedList.map((item, idx) => {
                  const s = item.siswa;
                  const kelasObj = item.kelas || appData.kelas.find((k) => k.id === s.kelasId);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4 text-center font-bold text-slate-400">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{s.nisn || '-'}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{s.nama}</td>
                      <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{kelasObj ? kelasObj.nama : '-'}</td>
                      <td className="p-4 text-center font-bold text-slate-600 bg-slate-50/30">{item.expectedDays}</td>
                      <td className="p-4 text-center font-bold text-slate-600 bg-slate-50/30">{item.recordedDays}</td>
                      <td className="p-4 text-center font-bold bg-slate-50/30">
                        {item.unfilledDays > 0 ? (
                          <span className="text-rose-500 font-extrabold">{item.unfilledDays}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/30">{item.hadir}</td>
                      <td className="p-4 text-center font-bold text-amber-600 bg-amber-50/30">{item.izin}</td>
                      <td className="p-4 text-center font-bold text-indigo-600 bg-indigo-50/30">{item.sakit}</td>
                      <td className="p-4 text-center font-bold text-rose-600 bg-rose-50/30">{item.alfa}</td>
                      <td className="p-4 text-center font-bold text-orange-600 bg-orange-50/30">{item.kesiangan}</td>
                      <td className="p-4 text-center font-bold text-purple-600 bg-purple-50/30">{item.dispensasi}</td>
                      <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50">
                        {item.totalTidakHadir}
                      </td>
                      <td className="p-4 text-center font-black text-blue-600 bg-blue-50/30">
                        {item.attendanceRateFormatted}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="block md:hidden p-4 divide-y divide-slate-100 dark:divide-slate-800">
          {pagedList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Tidak ada data siswa yang sesuai dengan kriteria filter.
            </div>
          ) : (
            pagedList.map((item, idx) => {
              const s = item.siswa;
              const kelasObj = item.kelas || appData.kelas.find((k) => k.id === s.kelasId);

              return (
                <div key={s.id} className="py-3.5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-xs leading-snug">{s.nama}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">NISN: {s.nisn || '-'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg text-[10px]">
                        {kelasObj ? kelasObj.nama : '-'}
                      </span>
                      <div className="text-blue-600 font-black text-[11px] mt-1">{item.attendanceRateFormatted}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-1.5 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/50">
                      <p className="text-[8px] font-bold text-emerald-600 uppercase">Hadir</p>
                      <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">{item.hadir}</p>
                    </div>
                    <div className="bg-amber-50/80 dark:bg-amber-950/40 p-1.5 rounded-xl text-center border border-amber-100 dark:border-amber-900/50">
                      <p className="text-[8px] font-bold text-amber-600 uppercase">Izin</p>
                      <p className="text-xs font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">{item.izin}</p>
                    </div>
                    <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-1.5 rounded-xl text-center border border-indigo-100 dark:border-indigo-900/50">
                      <p className="text-[8px] font-bold text-indigo-600 uppercase">Sakit</p>
                      <p className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 mt-0.5">{item.sakit}</p>
                    </div>
                    <div className="bg-rose-50/80 dark:bg-rose-950/40 p-1.5 rounded-xl text-center border border-rose-100 dark:border-rose-900/50">
                      <p className="text-[8px] font-bold text-rose-600 uppercase">Alpa</p>
                      <p className="text-xs font-extrabold text-rose-700 dark:text-rose-400 mt-0.5">{item.alfa}</p>
                    </div>
                    <div className="bg-slate-100/80 dark:bg-slate-800 p-1.5 rounded-xl text-center border border-slate-200/60 dark:border-slate-700">
                      <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase">Efektif</p>
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{item.expectedDays} hr</p>
                    </div>
                    <div className="bg-rose-50/80 dark:bg-rose-950/40 p-1.5 rounded-xl text-center border border-rose-200/60 dark:border-rose-900/50">
                      <p className="text-[8px] font-bold text-rose-600 dark:text-rose-400 uppercase">Belum diisi</p>
                      <p className="text-xs font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">{item.unfilledDays} hr</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredList.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <ReportPreviewModal
        report={previewReport}
        isOpen={Boolean(previewReport)}
        onClose={() => setPreviewReport(null)}
      />
    </div>
  );
};
