import React, { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet, Search, Calendar, Users, Activity, CheckCircle2, AlertTriangle, CalendarDays, Clock, HelpCircle } from 'lucide-react';
import { AppData, UserSession } from '../../types';
import { sortKelasList } from '../../data/initialData';
import {
  getTodayString,
  calculateWeeklyAttendanceStats,
  CANONICAL_STATUS_LABELS,
  CANONICAL_STATUS_COLORS,
} from '../../utils/helpers';
import { getAttendanceReportData, AttendanceReportViewModel } from '../../utils/reportEngine';
import { ReportExportButton } from '../common/ReportExportButton';
import { ReportPreviewModal } from '../common/ReportPreviewModal';
import { Pagination } from '../Pagination';
import { PageHeader, StatCard } from '../common/UIComponents';

interface RekapMingguanViewProps {
  appData: AppData;
  currentUser: UserSession;
}

export const RekapMingguanView: React.FC<RekapMingguanViewProps> = ({ appData, currentUser }) => {
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
  const [selectedTanggal, setSelectedTanggal] = useState<string>(getTodayString());
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [previewReport, setPreviewReport] = useState<AttendanceReportViewModel | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedKelasId, selectedTanggal, selectedStatusFilter, searchQuery]);

  const currentKelas = selectedKelasId === 'all' ? null : availableClasses.find((k) => k.id === selectedKelasId);

  // Canonical Weekly Calculation Result
  const weeklyResult = useMemo(() => {
    return calculateWeeklyAttendanceStats(appData, selectedTanggal, {
      kelasId: selectedKelasId === 'all' ? undefined : selectedKelasId,
      waliKelasId: isWali ? (currentUser.data as any).id : undefined,
    });
  }, [appData, selectedTanggal, selectedKelasId, isWali, currentUser]);

  const { days, students, totals, effectiveDays } = weeklyResult;

  // Filter students based on status and search query
  const filteredStudents = useMemo(() => {
    return students.filter((item) => {
      if (selectedStatusFilter === 'absent_only') {
        if (item.totalTidakHadir === 0 && item.totalKesiangan === 0 && item.totalDispensasi === 0 && item.unfilledDays === 0) {
          return false;
        }
      } else if (selectedStatusFilter === 'S') {
        if (item.totalSakit === 0) return false;
      } else if (selectedStatusFilter === 'I') {
        if (item.totalIzin === 0) return false;
      } else if (selectedStatusFilter === 'A') {
        if (item.totalAlpa === 0) return false;
      } else if (selectedStatusFilter === 'K') {
        if (item.totalKesiangan === 0) return false;
      } else if (selectedStatusFilter === 'D') {
        if (item.totalDispensasi === 0) return false;
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
  }, [students, selectedStatusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const pagedList = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getCanonicalReport = (): AttendanceReportViewModel => {
    return getAttendanceReportData(
      appData,
      {
        date: selectedTanggal,
        kelasId: selectedKelasId,
        waliKelasId: isWali ? (currentUser.data as any).id : undefined,
        statusFilter: selectedStatusFilter,
      },
      'WEEKLY',
      currentUser
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={Calendar}
        title="Rekap Presensi Mingguan (Senin - Jumat)"
        description="Matriks kehadiran siswa mingguan berbasis Hari Efektif Sekolah dengan denominator canonical calculation."
        badge={`Minggu Efektif (${days[0]?.label || ''} - ${days[4]?.label || ''})`}
        actions={
          <ReportExportButton
            getReportViewModel={getCanonicalReport}
            onOpenPreview={(rep) => setPreviewReport(rep)}
            label="Export Laporan Mingguan"
          />
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
        <StatCard
          label="Hari Efektif KBM"
          value={`${effectiveDays.length} Hari`}
          icon={CalendarDays}
          variant="primary"
        />
        <StatCard
          label="Total Hadir (H)"
          value={totals.hadir}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          label="Total Sakit (S)"
          value={totals.sakit}
          icon={Calendar}
          variant="warning"
        />
        <StatCard
          label="Total Izin (I)"
          value={totals.izin}
          icon={Calendar}
          variant="info"
        />
        <StatCard
          label="Total Alpa (A)"
          value={totals.alpa}
          icon={AlertTriangle}
          variant="danger"
        />
        <StatCard
          label="Kesiangan (K)"
          value={totals.kesiangan}
          icon={Clock}
          variant="neutral"
        />
        <StatCard
          label="Kehadiran Rata-rata"
          value={totals.overallAttendanceRateFormatted}
          icon={Activity}
          variant={totals.overallAttendanceRate >= 90 ? 'success' : totals.overallAttendanceRate >= 75 ? 'warning' : 'danger'}
        />
      </div>

      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Pilih Tanggal Acuan Minggu
          </label>
          <input
            type="date"
            value={selectedTanggal}
            onChange={(e) => setSelectedTanggal(e.target.value)}
            className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Filter Tampilan</label>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">Semua Siswa Terdaftar</option>
            <option value="absent_only">Hanya Siswa Pernah Tidak Hadir / Unfilled</option>
            <option value="S">Siswa Pernah Sakit (S)</option>
            <option value="I">Siswa Pernah Izin (I)</option>
            <option value="A">Siswa Pernah Alpa (A)</option>
            <option value="K">Siswa Pernah Kesiangan (K)</option>
            <option value="D">Siswa Pernah Dispensasi (D)</option>
            <option value="unfilled">Siswa Memiliki Hari Belum Terisi (Unfilled)</option>
          </select>
        </div>
      </div>

      {/* Info Hari Libur jika ada dalam minggu terpilih */}
      {days.some((d) => d.isHoliday) && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs">
          <CalendarDays className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-bold">Informasi Hari Libur / Non-KBM Minggu Ini: </span>
            {days.filter((d) => d.isHoliday).map((d) => `${d.label} (${d.holidayInfo?.keterangan || 'Libur Resmi'})`).join(', ')}. Hari tersebut otomatis dikecualikan dari denominator hari efektif sekolah.
          </div>
        </div>
      )}

      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              Matriks Mingguan: {currentKelas ? currentKelas.nama : 'Seluruh Kelas'} ({days[0]?.label} - {days[4]?.label})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Menampilkan {filteredStudents.length} dari {students.length} total siswa (Hari Efektif: {effectiveDays.length} Hari)
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
                <th className="p-4">Nama Siswa</th>
                <th className="p-4">Kelas</th>
                {days.map((d) => (
                  <th key={d.dateStr} className={`p-4 text-center ${d.isHoliday ? 'bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' : ''}`}>
                    <div>{d.label}</div>
                    {d.isHoliday && <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-amber-200/80 text-amber-900 dark:bg-amber-900/80 dark:text-amber-100">Libur</span>}
                  </th>
                ))}
                <th className="p-4 text-center text-emerald-600">H</th>
                <th className="p-4 text-center text-amber-600">I</th>
                <th className="p-4 text-center text-indigo-600">S</th>
                <th className="p-4 text-center text-rose-600">A</th>
                <th className="p-4 text-center text-slate-600">Unfilled</th>
                <th className="p-4 text-center text-blue-600">Kehadiran (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagedList.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    Tidak ada siswa yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                pagedList.map((item, idx) => {
                  const s = item.siswa;
                  const kelasObj = item.kelas || appData.kelas.find((k) => k.id === s.kelasId);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4 text-center font-bold text-slate-400">{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{s.nama}</td>
                      <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{kelasObj ? kelasObj.nama : '-'}</td>
                      {days.map((d) => {
                        const dayData = item.dailyRecords[d.dateStr];
                        if (d.isHoliday) {
                          return (
                            <td key={d.dateStr} className="p-4 text-center bg-amber-50/20 dark:bg-amber-950/20">
                              <span className="text-[10px] font-bold text-amber-600/80 dark:text-amber-400/80">Libur</span>
                            </td>
                          );
                        }

                        const st = dayData?.status;
                        const config = st ? CANONICAL_STATUS_COLORS[st] : null;

                        return (
                          <td key={d.dateStr} className="p-4 text-center">
                            {st && config ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${config.bg} ${config.text} ${config.border}`}>
                                {st}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs font-mono font-bold" title="Belum Terisi">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/30">{item.totalHadir}</td>
                      <td className="p-4 text-center font-bold text-amber-600 bg-amber-50/30">{item.totalIzin}</td>
                      <td className="p-4 text-center font-bold text-indigo-600 bg-indigo-50/30">{item.totalSakit}</td>
                      <td className="p-4 text-center font-bold text-rose-600 bg-rose-50/30">{item.totalAlpa}</td>
                      <td className="p-4 text-center font-bold text-slate-500 bg-slate-50/30">
                        {item.unfilledDays > 0 ? (
                          <span className="text-rose-500 font-extrabold">{item.unfilledDays}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
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
              Tidak ada siswa yang sesuai dengan kriteria filter.
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

                  <div className="grid grid-cols-5 gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100/80 dark:border-slate-800">
                    {days.map((d) => {
                      const dayData = item.dailyRecords[d.dateStr];
                      if (d.isHoliday) {
                        return (
                          <div key={d.dateStr} className="flex flex-col items-center justify-center gap-1">
                            <span className="text-[9px] font-bold text-amber-500 truncate w-full text-center">
                              {d.label.split(',')[0]}
                            </span>
                            <span className="text-[8px] font-black text-amber-600">LIBUR</span>
                          </div>
                        );
                      }

                      const st = dayData?.status;
                      const config = st ? CANONICAL_STATUS_COLORS[st] : null;

                      return (
                        <div key={d.dateStr} className="flex flex-col items-center justify-center gap-1">
                          <span className="text-[9px] font-bold text-slate-400 truncate w-full text-center">
                            {d.label.split(',')[0]}
                          </span>
                          {st && config ? (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border uppercase ${config.bg} ${config.text} ${config.border}`}>
                              {st}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px] font-bold">-</span>
                          )}
                        </div>
                      );
                    })}
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
          totalItems={filteredStudents.length}
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
