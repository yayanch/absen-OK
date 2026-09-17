import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Stethoscope,
  Mail,
  UserX,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  Phone,
  Eye,
  Calendar,
  Award,
  Users,
  CheckCircle2,
  X,
  ArrowLeft
} from 'lucide-react';
import { AppData, UserSession, ViewType } from '../../types';
import { sortKelasList } from '../../data/initialData';
import {
  getTodayString,
  normalizePresensiStatus,
  formatDateIndo,
  calculateCumulativeStudentStats,
  CumulativeStudentStatsItem,
} from '../../utils/helpers';
import { getAttendanceReportData, AttendanceReportViewModel } from '../../utils/reportEngine';
import { ReportExportButton } from '../common/ReportExportButton';
import { ReportPreviewModal } from '../common/ReportPreviewModal';
import { Pagination } from '../Pagination';
import { PageHeader } from '../common/UIComponents';

interface RekapKetidakhadiranTertinggiViewProps {
  appData: AppData;
  currentUser: UserSession;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onBack?: () => void;
}

export const RekapKetidakhadiranTertinggiView: React.FC<RekapKetidakhadiranTertinggiViewProps> = ({
  appData,
  currentUser,
  onShowToast,
  onBack,
}) => {
  const sortedKelas = sortKelasList(appData.kelas);
  let targetClasses = sortedKelas;
  if (currentUser.role === 'wali') {
    targetClasses = sortedKelas.filter((k) => k.waliKelasId === (currentUser.data as any).id);
  }

  const todayStr = getTodayString();
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(
    currentUser.role === 'wali' && targetClasses.length > 0 ? targetClasses[0].id : 'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'semua' | 'kesiangan' | 'dispensasi' | 'sakit' | 'izin' | 'alpa'>('semua');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [previewReport, setPreviewReport] = useState<AttendanceReportViewModel | null>(null);

  const [selectedStudentDetail, setSelectedStudentDetail] = useState<CumulativeStudentStatsItem | null>(null);

  const studentCumulativeStats = useMemo(() => {
    return calculateCumulativeStudentStats(appData, {
      maxDate: todayStr,
      waliKelasId: currentUser.role === 'wali' ? (currentUser.data as any).id : undefined,
    });
  }, [appData, todayStr, currentUser]);

  const totalCumSakit = studentCumulativeStats.reduce((acc, curr) => acc + curr.sakit, 0);
  const totalCumIzin = studentCumulativeStats.reduce((acc, curr) => acc + curr.izin, 0);
  const totalCumAlfa = studentCumulativeStats.reduce((acc, curr) => acc + curr.alfa, 0);
  const totalSiswaAdaAbsen = studentCumulativeStats.filter((curr) => curr.totalTidakHadir > 0).length;

  const topSakitStudents = useMemo(() => {
    return [...studentCumulativeStats]
      .filter((item) => item.sakit > 0)
      .sort((a, b) => b.sakit - a.sakit)
      .slice(0, 5);
  }, [studentCumulativeStats]);

  const topIzinStudents = useMemo(() => {
    return [...studentCumulativeStats]
      .filter((item) => item.izin > 0)
      .sort((a, b) => b.izin - a.izin)
      .slice(0, 5);
  }, [studentCumulativeStats]);

  const topAlpaStudents = useMemo(() => {
    return [...studentCumulativeStats]
      .filter((item) => item.alfa > 0)
      .sort((a, b) => b.alfa - a.alfa)
      .slice(0, 5);
  }, [studentCumulativeStats]);

  const filteredStats = useMemo(() => {
    return studentCumulativeStats.filter((item) => {
      if (selectedClassFilter !== 'all' && item.siswa.kelasId !== selectedClassFilter) {
        return false;
      }
      const matchSearch =
        item.siswa.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.siswa.nisn.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (activeTab === 'kesiangan') return item.kesiangan > 0;
      if (activeTab === 'dispensasi') return item.dispensasi > 0;
      if (activeTab === 'sakit') return item.sakit > 0;
      if (activeTab === 'izin') return item.izin > 0;
      if (activeTab === 'alpa') return item.alfa > 0;
      return item.totalTidakHadir > 0; // semua dengan total > 0
    }).sort((a, b) => {
      if (activeTab === 'kesiangan') return b.kesiangan - a.kesiangan;
      if (activeTab === 'dispensasi') return b.dispensasi - a.dispensasi;
      if (activeTab === 'sakit') return b.sakit - a.sakit;
      if (activeTab === 'izin') return b.izin - a.izin;
      if (activeTab === 'alpa') return b.alfa - a.alfa;
      return b.totalTidakHadir - a.totalTidakHadir;
    });
  }, [studentCumulativeStats, selectedClassFilter, searchQuery, activeTab]);

  const totalPages = Math.ceil(filteredStats.length / itemsPerPage) || 1;
  const pagedStats = filteredStats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getCanonicalReport = (): AttendanceReportViewModel => {
    return getAttendanceReportData(
      appData,
      {
        kelasId: selectedClassFilter,
        waliKelasId: currentUser.role === 'wali' ? (currentUser.data as any).id : undefined,
        statusFilter: activeTab,
      },
      'HIGH_ABSENCE',
      currentUser
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendWa = (item: any) => {
    const wa = item.siswa.noWa;
    if (!wa) {
      onShowToast('Nomor WhatsApp siswa belum tersedia.', 'warning');
      return;
    }
    const cleanWa = wa.replace(/\D/g, '');
    const formattedWa = cleanWa.startsWith('0') ? `62${cleanWa.slice(1)}` : cleanWa;
    const msg = `Halo, pemberitahuan dari ${appData.sekolah.nama || 'Sekolah'}. Berdasarkan catatan presensi kumulatif, Ananda ${item.siswa.nama} (${item.kelas?.nama || '-'}) tercatat memiliki ketidakhadiran: Sakit: ${item.sakit} hari, Izin: ${item.izin} hari, Alpa: ${item.alfa} hari. Mohon perhatian dan konfirmasinya. Terima kasih.`;
    window.open(`https://wa.me/${formattedWa}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={Award}
        title="Rekap Ketidakhadiran Tertinggi"
        description="Monitoring lengkap dan peringkat siswa berdasarkan akumulasi status Sakit (S), Izin (I), dan Alpa (A)."
        badge="Analisis Ketidakhadiran Kumulatif"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Kembali ke Halaman Sebelumnya"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
            )}
            <ReportExportButton
              getReportViewModel={getCanonicalReport}
              onOpenPreview={(rep) => setPreviewReport(rep)}
              label="Export Peringkat"
            />
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md shadow-slate-800/20 transition flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>
          </div>
        }
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Total Sakit (S)</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{totalCumSakit} <span className="text-xs font-normal text-slate-400">hari</span></div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Total Izin (I)</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{totalCumIzin} <span className="text-xs font-normal text-slate-400">hari</span></div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
            <Mail className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Total Alpa (A)</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{totalCumAlfa} <span className="text-xs font-normal text-slate-400">hari</span></div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Siswa Terdampak</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{totalSiswaAdaAbsen} <span className="text-xs font-normal text-slate-400">siswa</span></div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Top 5 Quick Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Sakit */}
        <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/50 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-100 dark:border-blue-900/40">
            <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-extrabold text-blue-950 dark:text-blue-200 text-xs uppercase tracking-wider">
              Top 5 Sakit Tertinggi
            </h3>
          </div>
          {topSakitStudents.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">Belum ada data</div>
          ) : (
            <div className="space-y-2.5">
              {topSakitStudents.map((item, idx) => (
                <div
                  key={item.siswa.id}
                  onClick={() => setSelectedStudentDetail(item)}
                  className="flex items-center justify-between p-2.5 bg-transparent border border-transparent rounded-xl hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:border-blue-200 dark:hover:border-blue-800 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-black text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {item.siswa.nama}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.kelas?.nama || '-'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-xs rounded-lg shrink-0">
                    {item.sakit} hari
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Izin */}
        <div className="bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/50 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-amber-100 dark:border-amber-900/40">
            <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="font-extrabold text-amber-950 dark:text-amber-200 text-xs uppercase tracking-wider">
              Top 5 Izin Tertinggi
            </h3>
          </div>
          {topIzinStudents.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">Belum ada data</div>
          ) : (
            <div className="space-y-2.5">
              {topIzinStudents.map((item, idx) => (
                <div
                  key={item.siswa.id}
                  onClick={() => setSelectedStudentDetail(item)}
                  className="flex items-center justify-between p-2.5 bg-transparent border border-transparent rounded-xl hover:bg-amber-50/60 dark:hover:bg-amber-950/40 hover:border-amber-200 dark:hover:border-amber-800 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-black text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {item.siswa.nama}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.kelas?.nama || '-'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-black text-xs rounded-lg shrink-0">
                    {item.izin} hari
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Alpa */}
        <div className="bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/50 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-rose-100 dark:border-rose-900/40">
            <UserX className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <h3 className="font-extrabold text-rose-950 dark:text-rose-200 text-xs uppercase tracking-wider">
              Top 5 Alpa Tertinggi
            </h3>
          </div>
          {topAlpaStudents.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">Belum ada data</div>
          ) : (
            <div className="space-y-2.5">
              {topAlpaStudents.map((item, idx) => (
                <div
                  key={item.siswa.id}
                  onClick={() => setSelectedStudentDetail(item)}
                  className="flex items-center justify-between p-2.5 bg-transparent border border-transparent rounded-xl hover:bg-rose-50/60 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-800 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 font-black text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {item.siswa.nama}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.kelas?.nama || '-'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-black text-xs rounded-lg shrink-0">
                    {item.alfa} hari
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comprehensive Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Controls & Tabs */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('semua')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'semua'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Semua Presensi
            </button>
            <button
              onClick={() => setActiveTab('kesiangan')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'kesiangan'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Fokus Kesiangan (K)
            </button>
            <button
              onClick={() => setActiveTab('dispensasi')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'dispensasi'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Fokus Dispensasi (D)
            </button>
            <button
              onClick={() => setActiveTab('sakit')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'sakit'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Fokus Sakit (S)
            </button>
            <button
              onClick={() => setActiveTab('izin')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'izin'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Fokus Izin (I)
            </button>
            <button
              onClick={() => setActiveTab('alpa')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'alpa'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Fokus Alpa (A)
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
            >
              {currentUser.role !== 'wali' && <option value="all">Semua Kelas</option>}
              {targetClasses.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>

            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama / NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-9 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Nama Siswa &amp; NISN</th>
                  <th className="p-4">Kelas</th>
                  <th className="p-3 text-center text-orange-600">Kesiangan (K)</th>
                  <th className="p-3 text-center text-purple-600">Dispensasi (D)</th>
                  <th className="p-3 text-center text-blue-600">Sakit (S)</th>
                  <th className="p-3 text-center text-amber-600">Izin (I)</th>
                  <th className="p-3 text-center text-rose-600">Alpa (A)</th>
                  <th className="p-3 text-center">Total</th>
                  <th className="p-4">No. WhatsApp</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {pagedStats.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-12 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                      Tidak ada data siswa yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  pagedStats.map((item, idx) => {
                    const absoluteIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr
                        key={item.siswa.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="p-4 text-center font-bold text-slate-400">{absoluteIdx}</td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800 dark:text-white">{item.siswa.nama}</div>
                          <div className="text-[11px] text-slate-400 font-mono">NISN: {item.siswa.nisn}</div>
                        </td>
                        <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">
                          {item.kelas?.nama || '-'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-lg font-black ${item.kesiangan > 0 ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300' : 'text-slate-400'}`}>
                            {item.kesiangan}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-lg font-black ${item.dispensasi > 0 ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' : 'text-slate-400'}`}>
                            {item.dispensasi}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-lg font-black ${item.sakit > 0 ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' : 'text-slate-400'}`}>
                            {item.sakit}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-lg font-black ${item.izin > 0 ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'text-slate-400'}`}>
                            {item.izin}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-lg font-black ${item.alfa > 0 ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' : 'text-slate-400'}`}>
                            {item.alfa}
                          </span>
                        </td>
                        <td className="p-3 text-center font-black text-slate-900 dark:text-white">
                          {item.totalTidakHadir}
                        </td>
                        <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                          {item.siswa.noWa ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {item.siswa.noWa}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedStudentDetail(item)}
                              className="p-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg transition"
                              title="Lihat Riwayat Ketidakhadiran"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {item.siswa.noWa && (
                              <button
                                onClick={() => handleSendWa(item)}
                                className="p-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg transition"
                                title="Kirim Notifikasi WhatsApp"
                              >
                                <Phone className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Grid Layout */}
          <div className="block md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pagedStats.length === 0 ? (
              <div className="p-12 text-center text-slate-400 col-span-full">
                <AlertCircle className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                Tidak ada data siswa yang sesuai dengan filter.
              </div>
            ) : (
              pagedStats.map((item, idx) => {
                const absoluteIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                return (
                  <div 
                    key={item.siswa.id} 
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4 text-xs"
                  >
                    {/* Header: rank & name */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-400">#{absoluteIdx}</span>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white">{item.siswa.nama}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">NISN: {item.siswa.nisn || '-'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedStudentDetail(item)}
                          className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl transition"
                          title="Lihat Riwayat"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {item.siswa.noWa && (
                          <button
                            onClick={() => handleSendWa(item)}
                            className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl transition"
                            title="WhatsApp"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Stats Matrix */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kelas</div>
                        <div className="font-bold text-slate-800 dark:text-white mt-0.5">{item.kelas?.nama || '-'}</div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">No. WhatsApp</div>
                        <div className="font-mono text-slate-700 dark:text-slate-300 mt-0.5 break-all">
                          {item.siswa.noWa || <span className="text-slate-400 italic">Belum ada</span>}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Detail Absensi</div>
                        <div className="grid grid-cols-5 gap-2 text-center">
                          <div className="bg-orange-50 dark:bg-orange-950/30 p-1.5 rounded-lg">
                            <div className="text-[9px] font-extrabold text-orange-600 uppercase">K</div>
                            <div className="font-black text-xs text-orange-700 dark:text-orange-300 mt-0.5">{item.kesiangan}</div>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-950/30 p-1.5 rounded-lg">
                            <div className="text-[9px] font-extrabold text-purple-600 uppercase">D</div>
                            <div className="font-black text-xs text-purple-700 dark:text-purple-300 mt-0.5">{item.dispensasi}</div>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded-lg">
                            <div className="text-[9px] font-extrabold text-amber-600 uppercase">S</div>
                            <div className="font-black text-xs text-amber-700 dark:text-amber-300 mt-0.5">{item.sakit}</div>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-1.5 rounded-lg">
                            <div className="text-[9px] font-extrabold text-blue-600 uppercase">I</div>
                            <div className="font-black text-xs text-blue-700 dark:text-blue-300 mt-0.5">{item.izin}</div>
                          </div>
                          <div className="bg-rose-50 dark:bg-rose-950/30 p-1.5 rounded-lg">
                            <div className="text-[9px] font-extrabold text-rose-600 uppercase">A</div>
                            <div className="font-black text-xs text-rose-700 dark:text-rose-300 mt-0.5">{item.alfa}</div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Absensi</span>
                        <span className="text-sm font-black text-slate-800 dark:text-white">{item.totalTidakHadir} Hari</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {filteredStats.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={itemsPerPage}
              onPageSizeChange={setItemsPerPage}
              totalItems={filteredStats.length}
            />
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
          <div className="min-h-full flex items-start sm:items-center justify-center py-2 sm:py-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-20 bg-white dark:bg-slate-900">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                  Riwayat Ketidakhadiran Siswa
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Detail akumulasi ketidakhadiran dan catatan harian.</p>
              </div>
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-2">
              <div className="text-sm font-extrabold text-slate-800 dark:text-white">
                {selectedStudentDetail.siswa.nama}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 grid grid-cols-2 gap-2">
                <div>NISN: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedStudentDetail.siswa.nisn}</span></div>
                <div>Kelas: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedStudentDetail.kelas?.nama || '-'}</span></div>
                <div>No. WA: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedStudentDetail.siswa.noWa || 'Belum ada'}</span></div>
                <div>Gender: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedStudentDetail.siswa.gender}</span></div>
              </div>

              <div className="grid grid-cols-5 gap-1.5 pt-2">
                <div className="bg-orange-50 dark:bg-orange-950/40 p-2 rounded-xl text-center border border-orange-100 dark:border-orange-900/50">
                  <div className="text-[9px] font-bold text-orange-600">Ksiangan (K)</div>
                  <div className="text-base font-black text-orange-950 dark:text-orange-200">{selectedStudentDetail.kesiangan}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/40 p-2 rounded-xl text-center border border-purple-100 dark:border-purple-900/50">
                  <div className="text-[9px] font-bold text-purple-600">Dispensasi (D)</div>
                  <div className="text-base font-black text-purple-950 dark:text-purple-200">{selectedStudentDetail.dispensasi}</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl text-center border border-amber-100 dark:border-amber-900/50">
                  <div className="text-[9px] font-bold text-amber-600">Sakit (S)</div>
                  <div className="text-base font-black text-amber-950 dark:text-amber-200">{selectedStudentDetail.sakit}</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/40 p-2 rounded-xl text-center border border-blue-100 dark:border-blue-900/50">
                  <div className="text-[9px] font-bold text-blue-600">Izin (I)</div>
                  <div className="text-base font-black text-blue-950 dark:text-blue-200">{selectedStudentDetail.izin}</div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl text-center border border-rose-100 dark:border-rose-900/50">
                  <div className="text-[9px] font-bold text-rose-600">Alpa (A)</div>
                  <div className="text-base font-black text-rose-950 dark:text-rose-200">{selectedStudentDetail.alfa}</div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                Daftar Tanggal Ketidakhadiran ({selectedStudentDetail.detailRecords.length} catatan)
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {selectedStudentDetail.detailRecords.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                    Tidak ada catatan ketidakhadiran tercatat.
                  </div>
                ) : (
                  selectedStudentDetail.detailRecords.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {formatDateIndo(rec.tanggal)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {rec.catatan && (
                          <span className="text-[11px] text-slate-500 italic max-w-[160px] truncate">
                            "{rec.catatan}"
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                            rec.status === 'K'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                              : rec.status === 'D'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : rec.status === 'S'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : rec.status === 'I'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {rec.status === 'K'
                            ? 'Kesiangan'
                            : rec.status === 'D'
                            ? 'Dispensasi'
                            : rec.status === 'S'
                            ? 'Sakit'
                            : rec.status === 'I'
                            ? 'Izin'
                            : 'Alpa'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              {selectedStudentDetail.siswa.noWa && (
                <button
                  type="button"
                  onClick={() => handleSendWa(selectedStudentDetail)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Kirim WA Orang Tua</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      <ReportPreviewModal
        report={previewReport}
        isOpen={Boolean(previewReport)}
        onClose={() => setPreviewReport(null)}
      />
    </div>
  );
};
