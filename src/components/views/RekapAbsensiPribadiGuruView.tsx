import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  Printer,
  Search,
  UserCheck,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  ArrowLeft,
  TrendingUp,
  Award,
  CalendarDays
} from 'lucide-react';
import { AppData, UserSession, ViewType, GuruPresensiItem, AbsensiMengajarGuruItem } from '../../types';
import {
  getTodayString,
  formatDateIndo,
  getIndonesianDayName,
  cleanMapelName
} from '../../utils/helpers';
import { PageHeader } from '../common/UIComponents';

interface RekapAbsensiPribadiGuruViewProps {
  appData: AppData;
  currentUser: UserSession;
  onUpdateAppData?: (newData: AppData) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigateView?: (view: ViewType) => void;
}

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const RekapAbsensiPribadiGuruView: React.FC<RekapAbsensiPribadiGuruViewProps> = ({
  appData,
  currentUser,
  onNavigateView,
  onShowToast,
}) => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0 - 11
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedSemester, setSelectedSemester] = useState<'semua' | 'ganjil' | 'genap'>('semua');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'harian' | 'kbm' | 'statistik'>('harian');

  // Identify current teacher
  const userData = currentUser.data as any;
  const teacherUsername = (userData?.username || userData?.nip || '').toString().toLowerCase().trim();
  const teacherNip = (userData?.nip || '').toString().toLowerCase().trim();
  const teacherNama = (userData?.nama || '').toString().trim();

  // Find detailed teacher profile match in master data
  const matchedMasterGuru = useMemo(() => {
    return (appData.waliKelas || []).find((w) => {
      if (userData?.id && w.id === userData.id) return true;
      if (teacherUsername && w.username?.toLowerCase() === teacherUsername) return true;
      if (teacherNip && w.nip && w.nip.toLowerCase() === teacherNip) return true;
      if (teacherNama && w.nama?.toLowerCase() === teacherNama.toLowerCase()) return true;
      return false;
    });
  }, [appData.waliKelas, userData, teacherUsername, teacherNip, teacherNama]);

  const displayNama = matchedMasterGuru?.nama || teacherNama || 'Guru Pengampu';
  const displayNip = matchedMasterGuru?.nip || userData?.nip || '-';
  const displayJabatan = matchedMasterGuru?.tugasTambahan || matchedMasterGuru?.jabatan || 'Guru Mata Pelajaran';
  const displayMapel = matchedMasterGuru?.mataPelajaran || 'Mata Pelajaran';

  // Extract all daily presensi entries for this teacher across appData.presensiGuru
  const teacherPresensiList = useMemo(() => {
    const list: GuruPresensiItem[] = [];
    const rawMap = appData.presensiGuru || {};

    Object.keys(rawMap).forEach((tanggal) => {
      const itemsForDay = rawMap[tanggal] || [];
      itemsForDay.forEach((item) => {
        const itemUser = (item.guruUsername || item.guruNip || '').toString().toLowerCase().trim();
        const itemNip = (item.guruNip || '').toString().toLowerCase().trim();
        const itemNama = (item.guruNama || '').toString().toLowerCase().trim();

        const isMatch =
          (teacherUsername && itemUser === teacherUsername) ||
          (teacherNip && itemNip === teacherNip) ||
          (teacherNama && itemNama === teacherNama.toLowerCase()) ||
          (matchedMasterGuru?.id && item.guruId === matchedMasterGuru.id);

        if (isMatch) {
          list.push(item);
        }
      });
    });

    // Sort by date descending
    return list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [appData.presensiGuru, teacherUsername, teacherNip, teacherNama, matchedMasterGuru]);

  // Extract all teaching sessions logged by this teacher in appData.presensiMengajarGuru
  const teacherKbmList = useMemo(() => {
    const rawKbm = appData.presensiMengajarGuru || [];
    const filtered = rawKbm.filter((item) => {
      const itemUser = (item.guruUsername || '').toString().toLowerCase().trim();
      const itemNama = (item.guruNama || '').toString().toLowerCase().trim();

      return (
        (teacherUsername && itemUser === teacherUsername) ||
        (teacherNama && itemNama === teacherNama.toLowerCase())
      );
    });

    return filtered.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [appData.presensiMengajarGuru, teacherUsername, teacherNama]);

  // Scheduled subjects / timetable for this teacher
  const teacherJadwalList = useMemo(() => {
    const rawJadwal = appData.jadwalMengajar || [];
    return rawJadwal.filter((j) => {
      const jUser = (j.guruUsername || j.guruNip || '').toString().toLowerCase().trim();
      const jNama = (j.guruNama || '').toString().toLowerCase().trim();
      return (
        (teacherUsername && jUser === teacherUsername) ||
        (teacherNip && jUser === teacherNip) ||
        (teacherNama && jNama === teacherNama.toLowerCase())
      );
    });
  }, [appData.jadwalMengajar, teacherUsername, teacherNip, teacherNama]);

  // Filtered daily presensi list based on Month, Year, Semester & Status
  const filteredPresensiList = useMemo(() => {
    return teacherPresensiList.filter((item) => {
      if (!item.tanggal) return false;
      const d = new Date(item.tanggal);
      if (isNaN(d.getTime())) return false;

      const m = d.getMonth();
      const y = d.getFullYear();

      // Month filter
      if (selectedMonth !== -1 && m !== selectedMonth) return false;

      // Year filter
      if (selectedYear !== -1 && y !== selectedYear) return false;

      // Semester filter (July - Dec = Ganjil, Jan - June = Genap)
      if (selectedSemester === 'ganjil' && (m < 6 || m > 11)) return false;
      if (selectedSemester === 'genap' && (m >= 6 && m <= 11)) return false;

      // Status filter
      if (statusFilter !== 'semua' && item.status !== statusFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNote = (item.catatan || '').toLowerCase().includes(query);
        const matchDay = (item.hari || '').toLowerCase().includes(query);
        const matchDate = (item.tanggal || '').includes(query);
        const matchSource = (item.sumberPresensi || '').toLowerCase().includes(query);
        if (!matchNote && !matchDay && !matchDate && !matchSource) return false;
      }

      return true;
    });
  }, [teacherPresensiList, selectedMonth, selectedYear, selectedSemester, statusFilter, searchTerm]);

  // Filtered KBM teaching log list
  const filteredKbmList = useMemo(() => {
    return teacherKbmList.filter((item) => {
      if (!item.tanggal) return false;
      const d = new Date(item.tanggal);
      if (isNaN(d.getTime())) return false;

      const m = d.getMonth();
      const y = d.getFullYear();

      if (selectedMonth !== -1 && m !== selectedMonth) return false;
      if (selectedYear !== -1 && y !== selectedYear) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchKelas = (item.kelasNama || '').toLowerCase().includes(query);
        const matchMapel = (item.mataPelajaran || '').toLowerCase().includes(query);
        const matchMateri = (item.materiAjar || '').toLowerCase().includes(query);
        if (!matchKelas && !matchMapel && !matchMateri) return false;
      }

      return true;
    });
  }, [teacherKbmList, selectedMonth, selectedYear, searchTerm]);

  // Statistics Summary
  const stats = useMemo(() => {
    const totalRecords = filteredPresensiList.length;
    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;
    let dinasLuar = 0;

    filteredPresensiList.forEach((item) => {
      switch (item.status) {
        case 'H':
          hadir++;
          break;
        case 'T':
          terlambat++;
          break;
        case 'S':
          sakit++;
          break;
        case 'I':
          izin++;
          break;
        case 'A':
          alpa++;
          break;
        case 'D':
          dinasLuar++;
          break;
        default:
          break;
      }
    });

    const totalHadirEffective = hadir + terlambat + dinasLuar;
    const rateHadir = totalRecords > 0 ? Math.round((totalHadirEffective / totalRecords) * 100) : 0;

    // Total KBM sessions and JP
    const totalKbmSessions = filteredKbmList.length;
    let totalJpMengajar = 0;
    teacherJadwalList.forEach((j) => {
      totalJpMengajar += j.jumlahJp || (j.jamKeList ? j.jamKeList.length : 2);
    });

    return {
      totalRecords,
      hadir,
      terlambat,
      sakit,
      izin,
      alpa,
      dinasLuar,
      rateHadir,
      totalKbmSessions,
      totalJpMengajar,
    };
  }, [filteredPresensiList, filteredKbmList, teacherJadwalList]);

  // Export to Excel / CSV
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredPresensiList.map((item, index) => ({
        No: index + 1,
        Tanggal: item.tanggal,
        Hari: item.hari,
        Shift: item.shift || 'Pagi',
        Status:
          item.status === 'H'
            ? 'Hadir'
            : item.status === 'T'
            ? 'Terlambat'
            : item.status === 'S'
            ? 'Sakit'
            : item.status === 'I'
            ? 'Izin'
            : item.status === 'A'
            ? 'Alpa'
            : item.status === 'D'
            ? 'Dinas Luar'
            : 'Tanpa Keterangan',
        'Jam Masuk': item.jamMasuk || '-',
        'Jam Pulang': item.jamPulang || '-',
        Catatan: item.catatan || '-',
        Sumber: item.sumberPresensi || 'Sistem',
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi Guru');
      const filename = `Rekap_Absensi_${displayNama.replace(/[^a-zA-Z0-9]/g, '_')}_${NAMA_BULAN[selectedMonth]}_${selectedYear}.xlsx`;
      XLSX.writeFile(workbook, filename);

      if (onShowToast) onShowToast('File Rekap Absensi Excel berhasil diunduh.', 'success');
    } catch (e) {
      if (onShowToast) onShowToast('Gagal mengekspor data ke Excel.', 'error');
    }
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Printable Area - Header Print Hidden on Screen */}
      <div className="hidden print:block font-serif text-slate-900 p-6 space-y-4">
        <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
          <h1 className="text-xl font-bold uppercase tracking-wide">{appData.sekolah?.nama || 'SMK NEGERI 6 GARUT'}</h1>
          <p className="text-xs">{appData.sekolah?.alamat || 'Jl. Raya Limbangan Garut'}</p>
          <h2 className="text-base font-bold underline pt-2">LAPORAN REKAPITULASI PRESENSI PRIBADI GURU</h2>
          <p className="text-xs font-semibold">
            Periode: {NAMA_BULAN[selectedMonth]} {selectedYear} | Tahun Ajaran: {appData.sekolah?.tahunAjaran || '2025/2026'}
          </p>
        </div>

        <div className="grid grid-cols-2 text-xs gap-2 pt-2 border-b pb-3">
          <div>
            <p><strong>Nama Guru:</strong> {displayNama}</p>
            <p><strong>NIP:</strong> {displayNip}</p>
          </div>
          <div>
            <p><strong>Tugas/Jabatan:</strong> {displayJabatan}</p>
            <p><strong>Mata Pelajaran:</strong> {displayMapel}</p>
          </div>
        </div>

        {/* Ringkasan Cetak */}
        <div className="grid grid-cols-6 gap-2 text-center text-xs my-3 border p-2 bg-slate-50">
          <div>
            <p className="font-semibold text-slate-600">Total Hari</p>
            <p className="font-bold text-sm">{stats.totalRecords}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-600">Hadir (H)</p>
            <p className="font-bold text-sm text-emerald-700">{stats.hadir}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-600">Terlambat (T)</p>
            <p className="font-bold text-sm text-amber-700">{stats.terlambat}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-600">Sakit/Izin (S/I)</p>
            <p className="font-bold text-sm text-blue-700">{stats.sakit + stats.izin}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-600">Alpa (A)</p>
            <p className="font-bold text-sm text-rose-700">{stats.alpa}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-600">% Kehadiran</p>
            <p className="font-bold text-sm text-indigo-700">{stats.rateHadir}%</p>
          </div>
        </div>

        {/* Tabel Cetak */}
        <table className="w-full text-[11px] border-collapse border border-slate-400">
          <thead>
            <tr className="bg-slate-200 text-slate-900">
              <th className="border border-slate-400 px-2 py-1">No</th>
              <th className="border border-slate-400 px-2 py-1">Tanggal</th>
              <th className="border border-slate-400 px-2 py-1">Hari</th>
              <th className="border border-slate-400 px-2 py-1">Jam Masuk</th>
              <th className="border border-slate-400 px-2 py-1">Jam Pulang</th>
              <th className="border border-slate-400 px-2 py-1">Status</th>
              <th className="border border-slate-400 px-2 py-1">Catatan / Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {filteredPresensiList.map((row, idx) => (
              <tr key={row.id || idx}>
                <td className="border border-slate-400 px-2 py-1 text-center">{idx + 1}</td>
                <td className="border border-slate-400 px-2 py-1 text-center">{formatDateIndo(row.tanggal)}</td>
                <td className="border border-slate-400 px-2 py-1 text-center">{row.hari}</td>
                <td className="border border-slate-400 px-2 py-1 text-center">{row.jamMasuk || '-'}</td>
                <td className="border border-slate-400 px-2 py-1 text-center">{row.jamPulang || '-'}</td>
                <td className="border border-slate-400 px-2 py-1 text-center font-bold">
                  {row.status === 'H' ? 'Hadir' : row.status === 'T' ? 'Terlambat' : row.status === 'S' ? 'Sakit' : row.status === 'I' ? 'Izin' : row.status === 'A' ? 'Alpa' : row.status}
                </td>
                <td className="border border-slate-400 px-2 py-1">{row.catatan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tanda Tangan */}
        <div className="grid grid-cols-2 text-xs pt-12 text-center">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Sekolah</p>
            <div className="h-16"></div>
            <p className="font-bold underline">{appData.sekolah?.namaKepalaSekolah || appData.sekolah?.kepalaSekolah || '(.........................................)'}</p>
            <p>NIP. {appData.sekolah?.nipKepalaSekolah || '-'}</p>
          </div>
          <div>
            <p>Garut, {formatDateIndo(getTodayString())}</p>
            <p className="font-bold">Guru Ybs.</p>
            <div className="h-16"></div>
            <p className="font-bold underline">{displayNama}</p>
            <p>NIP. {displayNip}</p>
          </div>
        </div>
      </div>

      {/* Screen Interactive UI (Hidden during print) */}
      <div className="print:hidden space-y-6">
        {/* Page Title & Teacher Banner */}
        <PageHeader
          title="Rekap Absensi Pribadi Saya"
          description={`Laporan riwayat presensi harian, jam masuk/pulang, dan sesi KBM guru (${displayNama})`}
          icon={UserCheck}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak PDF</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Ekspor Excel</span>
              </button>

              {onNavigateView && (
                <button
                  type="button"
                  onClick={() => onNavigateView('absen_harian_guru')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>Presensi Hari Ini</span>
                </button>
              )}
            </div>
          }
        />

        {/* Teacher Identity Badge & Status Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{displayNama}</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800/60">
                  NIP: {displayNip}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {displayJabatan} · <span className="text-slate-700 dark:text-slate-300 font-medium">{displayMapel}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <CalendarDays className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Tahun Ajaran {appData.sekolah?.tahunAjaran || '2025/2026'}
              </p>
              <p className="text-[11px] text-slate-500">
                Semester {appData.sekolah?.semester || 'Ganjil'} · SMKN 6 GARUT
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span>Filter Periode & Status Presensi</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedMonth(today.getMonth());
                setSelectedYear(today.getFullYear());
                setSelectedSemester('semua');
                setStatusFilter('semua');
                setSearchTerm('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Month Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Bulan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition"
              >
                <option value={-1}>Semua Bulan</option>
                {NAMA_BULAN.map((bln, idx) => (
                  <option key={bln} value={idx}>
                    {bln}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Tahun
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition"
              >
                <option value={-1}>Semua Tahun</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Status Kehadiran
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition"
              >
                <option value="semua">Semua Status (H/T/S/I/A)</option>
                <option value="H">Hadir (H)</option>
                <option value="T">Terlambat (T)</option>
                <option value="S">Sakit (S)</option>
                <option value="I">Izin (I)</option>
                <option value="A">Alpa (A)</option>
                <option value="D">Dinas Luar (D)</option>
              </select>
            </div>

            {/* Quick Search */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Cari Catatan / Tanggal
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ketik catatan / tanggal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Total Presensi Terdata */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-semibold">Total Hari</span>
              <Calendar className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {stats.totalRecords}
            </p>
            <p className="text-[10px] text-slate-500">Record terdata</p>
          </div>

          {/* Card 2: Hadir */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-[11px] font-semibold">Hadir Tepat Waktu</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {stats.hadir}
            </p>
            <p className="text-[10px] text-slate-500">
              {stats.totalRecords > 0 ? Math.round((stats.hadir / stats.totalRecords) * 100) : 0}% dari total
            </p>
          </div>

          {/* Card 3: Terlambat */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-amber-200/70 dark:border-amber-900/40 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="text-[11px] font-semibold">Terlambat</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {stats.terlambat}
            </p>
            <p className="text-[10px] text-slate-500">Presensi Kesiangan</p>
          </div>

          {/* Card 4: Sakit / Izin */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-blue-200/70 dark:border-blue-900/40 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
              <span className="text-[11px] font-semibold">Sakit & Izin</span>
              <Info className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
              {stats.sakit + stats.izin}
            </p>
            <p className="text-[10px] text-slate-500">S: {stats.sakit} · I: {stats.izin}</p>
          </div>

          {/* Card 5: Alpa */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-rose-200/70 dark:border-rose-900/40 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
              <span className="text-[11px] font-semibold">Alpa (Absen)</span>
              <AlertCircle className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {stats.alpa}
            </p>
            <p className="text-[10px] text-slate-500">Tanpa keterangan</p>
          </div>

          {/* Card 6: Persentase Kehadiran */}
          <div className="bg-indigo-600 text-white rounded-2xl p-4 shadow-sm space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-indigo-100">
              <span className="text-[11px] font-semibold">Tingkat Kehadiran</span>
              <TrendingUp className="w-4 h-4 text-indigo-200" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-white">
              {stats.rateHadir}%
            </p>
            <p className="text-[10px] text-indigo-200 font-medium">Persentase Kehadiran</p>
          </div>
        </div>

        {/* View Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl text-xs font-semibold w-full sm:w-auto self-start border border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveTab('harian')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'harian'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Riwayat Presensi Harian ({filteredPresensiList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kbm')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'kbm'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Jurnal & Sesi KBM ({filteredKbmList.length})</span>
          </button>
        </div>

        {/* TAB CONTENT 1: Riwayat Presensi Harian Guru */}
        {activeTab === 'harian' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Log Kehadiran Harian & Jam Masuk/Pulang</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Menampilkan {filteredPresensiList.length} tanggal terdata
              </span>
            </div>

            {filteredPresensiList.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Belum Ada Data Presensi
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Tidak ditemukan rekam presensi guru untuk periode atau filter yang dipilih. Cobalah mengubah bulan/tahun atau reset filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                      <th className="p-3.5 w-12 text-center">No</th>
                      <th className="p-3.5">Tanggal & Hari</th>
                      <th className="p-3.5">Shift</th>
                      <th className="p-3.5 text-center">Status Kehadiran</th>
                      <th className="p-3.5 text-center">Jam Masuk</th>
                      <th className="p-3.5 text-center">Jam Pulang</th>
                      <th className="p-3.5">Catatan / Keterangan</th>
                      <th className="p-3.5">Sumber Presensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredPresensiList.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3.5 text-center font-mono tabular-nums text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="p-3.5 font-medium whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {formatDateIndo(item.tanggal)}
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal">
                            {item.hari || getIndonesianDayName(item.tanggal)}
                          </div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700">
                            {item.shift || 'Pagi'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {item.status === 'H' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Hadir
                            </span>
                          )}
                          {item.status === 'T' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 font-bold text-[11px] border border-amber-200 dark:border-amber-800">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Terlambat
                            </span>
                          )}
                          {item.status === 'S' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800">
                              <Info className="w-3.5 h-3.5" />
                              Sakit
                            </span>
                          )}
                          {item.status === 'I' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 font-bold text-[11px] border border-purple-200 dark:border-purple-800">
                              <Info className="w-3.5 h-3.5" />
                              Izin
                            </span>
                          )}
                          {item.status === 'A' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-800">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Alpa
                            </span>
                          )}
                          {item.status === 'D' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 font-bold text-[11px] border border-cyan-200 dark:border-cyan-800">
                              <Award className="w-3.5 h-3.5" />
                              Dinas Luar
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                          {item.jamMasuk || '-'}
                        </td>
                        <td className="p-3.5 text-center font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                          {item.jamPulang || '-'}
                        </td>
                        <td className="p-3.5 max-w-xs truncate">
                          {item.catatan || <span className="text-slate-400 italic">-</span>}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium">
                            {item.sumberPresensi || 'Sistem'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT 2: Log Sesi KBM & Jurnal Mengajar */}
        {activeTab === 'kbm' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Log Jurnal Mengajar KBM di Kelas</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Total {filteredKbmList.length} sesi pembelajaran diisi
              </span>
            </div>

            {filteredKbmList.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Belum Ada Log Sesi Mengajar KBM
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Belum terdapat catatan jurnal KBM yang disimpan untuk periode ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                      <th className="p-3.5 w-12 text-center">No</th>
                      <th className="p-3.5">Tanggal</th>
                      <th className="p-3.5">Kelas</th>
                      <th className="p-3.5">Mata Pelajaran</th>
                      <th className="p-3.5">Materi / Jurnal KBM</th>
                      <th className="p-3.5 text-center">Rekap Absen Siswa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredKbmList.map((item, idx) => {
                      const presensiSiswa = item.presensiSiswa || [];
                      const hadirSiswa = presensiSiswa.filter((s) => s.status === 'H').length;
                      const sakitSiswa = presensiSiswa.filter((s) => s.status === 'S').length;
                      const izinSiswa = presensiSiswa.filter((s) => s.status === 'I').length;
                      const alpaSiswa = presensiSiswa.filter((s) => s.status === 'A').length;

                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="p-3.5 text-center font-mono tabular-nums text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="p-3.5 font-medium whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {formatDateIndo(item.tanggal)}
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              {item.hari} {item.jamPelajaran ? `(${item.jamPelajaran})` : ''}
                            </div>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800">
                              {item.kelasNama}
                            </span>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-900 dark:text-slate-100">
                            {cleanMapelName(item.mataPelajaran)}
                          </td>
                          <td className="p-3.5 max-w-md">
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {item.materiAjar || <span className="text-slate-400 italic">Tanpa ringkasan materi</span>}
                            </p>
                            {item.catatanGuru && (
                              <p className="text-[11px] text-slate-500 mt-0.5 italic">
                                Catatan: {item.catatanGuru}
                              </p>
                            )}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono tabular-nums bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                              <span className="text-emerald-600 font-bold">H:{hadirSiswa}</span>
                              <span className="text-slate-300 dark:text-slate-600">·</span>
                              <span className="text-blue-600 font-bold">S:{sakitSiswa}</span>
                              <span className="text-slate-300 dark:text-slate-600">·</span>
                              <span className="text-purple-600 font-bold">I:{izinSiswa}</span>
                              <span className="text-slate-300 dark:text-slate-600">·</span>
                              <span className="text-rose-600 font-bold">A:{alpaSiswa}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
