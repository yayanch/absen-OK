import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, Send, Calendar, Search, Users, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AppData, UserSession } from '../../types';
import { sortKelasList } from '../../data/initialData';
import {
  getTodayString,
  formatDateIndo,
  normalizePresensiStatus,
  calculateDailyAttendanceStats,
  getCanonicalActiveStudents,
  CANONICAL_STATUS_LABELS,
  CANONICAL_STATUS_COLORS,
} from '../../utils/helpers';
import { getAttendanceReportData, AttendanceReportViewModel } from '../../utils/reportEngine';
import { ReportExportButton } from '../common/ReportExportButton';
import { ReportPreviewModal } from '../common/ReportPreviewModal';
import { DatePickerWithStatus } from '../DatePickerWithStatus';
import { Pagination } from '../Pagination';
import { PageHeader, StatCard } from '../common/UIComponents';

interface RekapHarianViewProps {
  appData: AppData;
  currentUser: UserSession;
}

export const RekapHarianView: React.FC<RekapHarianViewProps> = ({ appData, currentUser }) => {
  const sortedKelas = sortKelasList(appData.kelas);
  let availableClasses = sortedKelas;
  const isWali = currentUser.role === 'wali';
  if (isWali) {
    availableClasses = sortedKelas.filter((k) => k.waliKelasId === (currentUser.data as any).id);
  }

  const [selectedKelasId, setSelectedKelasId] = useState<string>(
    isWali && availableClasses.length > 0 ? availableClasses[0].id : 'all'
  );
  const [selectedTanggal, setSelectedTanggal] = useState<string>(getTodayString());
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('absent_only');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [previewReport, setPreviewReport] = useState<AttendanceReportViewModel | null>(null);

  const currentKelas = selectedKelasId === 'all' ? null : availableClasses.find((k) => k.id === selectedKelasId);

  // Canonical Daily Statistics for Selected Scope & Date
  const dailyStats = useMemo(() => {
    return calculateDailyAttendanceStats(appData, selectedTanggal, {
      kelasId: selectedKelasId === 'all' ? undefined : selectedKelasId,
      waliKelasId: isWali ? (currentUser.data as any).id : undefined,
    });
  }, [appData, selectedTanggal, selectedKelasId, isWali, currentUser]);

  // Canonical Active Students in selected scope
  const activeStudentsInScope = useMemo(() => {
    return getCanonicalActiveStudents(appData, {
      kelasId: selectedKelasId === 'all' ? undefined : selectedKelasId,
      waliKelasId: isWali ? (currentUser.data as any).id : undefined,
    }).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  }, [appData, selectedKelasId, isWali, currentUser]);

  const getPresensiForSiswa = (s: any) => {
    const pKey = `${selectedTanggal}_${s.kelasId}`;
    const pRecords = (appData.presensi || {})[pKey];
    if (!pRecords || !Array.isArray(pRecords)) return undefined;
    return pRecords.find((r) => r.siswaId === s.id || r.siswaId === s.nisn);
  };

  const processedSiswaList = useMemo(() => {
    return activeStudentsInScope.map((s) => {
      const rec = getPresensiForSiswa(s);
      const st = rec ? normalizePresensiStatus(rec.status) : '';
      return {
        siswa: s,
        rec,
        status: st,
        isRecorded: Boolean(rec),
      };
    });
  }, [activeStudentsInScope, selectedTanggal, appData.presensi]);

  const filteredList = useMemo(() => {
    return processedSiswaList.filter((item) => {
      const st = item.status;
      if (selectedStatusFilter === 'absent_only') {
        if (st !== 'S' && st !== 'I' && st !== 'A' && st !== 'K' && st !== 'D') return false;
      } else if (selectedStatusFilter !== 'all') {
        if (st !== selectedStatusFilter) return false;
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
  }, [processedSiswaList, selectedStatusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const pagedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Canonical Report View Model getter
  const getCanonicalReport = (): AttendanceReportViewModel => {
    return getAttendanceReportData(
      appData,
      {
        date: selectedTanggal,
        kelasId: selectedKelasId,
        waliKelasId: isWali ? (currentUser.data as any).id : undefined,
        statusFilter: selectedStatusFilter,
      },
      'DAILY',
      currentUser
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={Calendar}
        title="Rekap Presensi Harian"
        description="Laporan harian terverifikasi dengan kalkulasi data presensi canonical dan integrasi WhatsApp."
        badge={`Presensi Tanggal (${formatDateIndo(selectedTanggal)})`}
        actions={
          <ReportExportButton
            getReportViewModel={getCanonicalReport}
            onOpenPreview={(rep) => setPreviewReport(rep)}
            label="Export Laporan Harian"
          />
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
        <StatCard
          label="Total Siswa"
          value={dailyStats.totalSiswa}
          icon={Users}
          variant="neutral"
        />
        <StatCard
          label="Hadir (H)"
          value={dailyStats.hadirCount}
          subtitle={`Rate: ${dailyStats.attendanceRateFormatted}`}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          label="Sakit (S)"
          value={dailyStats.sakitCount}
          icon={Calendar}
          variant="warning"
        />
        <StatCard
          label="Izin (I)"
          value={dailyStats.izinCount}
          icon={Calendar}
          variant="info"
        />
        <StatCard
          label="Alpa (A)"
          value={dailyStats.alpaCount}
          icon={AlertTriangle}
          variant="danger"
        />
        <StatCard
          label="Kesiangan (K)"
          value={dailyStats.kesianganCount}
          icon={Activity}
          variant="neutral"
        />
        <StatCard
          label="Dispensasi (D)"
          value={dailyStats.dispensasiCount}
          icon={Activity}
          variant="primary"
        />
      </div>

      {/* Selectors */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Pilih Kelas</label>
          <select
            value={selectedKelasId}
            onChange={(e) => {
              setSelectedKelasId(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            {!isWali && <option value="all">Seluruh Kelas ({appData.kelas.length} Rombel)</option>}
            {availableClasses.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </div>
        <div>
          <DatePickerWithStatus
            label="Pilih Tanggal"
            selectedDate={selectedTanggal}
            onChangeDate={(d) => {
              setSelectedTanggal(d);
              setCurrentPage(1);
            }}
            appData={appData}
            currentUser={currentUser}
            kelasId={selectedKelasId === 'all' ? (availableClasses[0]?.id || '') : selectedKelasId}
            hideCalendarButton={true}
            hideUnfilledWarning={true}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Filter Tampilan Status</label>
          <select
            value={selectedStatusFilter}
            onChange={(e) => {
              setSelectedStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="absent_only">Hanya Siswa Tidak Hadir / Terlambat (S, I, A, K, D)</option>
            <option value="all">Semua Siswa Terdaftar (Termasuk Hadir)</option>
            <option value="H">Hadir Murni (H)</option>
            <option value="S">Sakit (S)</option>
            <option value="I">Izin (I)</option>
            <option value="A">Alpa / Tanpa Keterangan (A)</option>
            <option value="K">Kesiangan / Terlambat (K)</option>
            <option value="D">Dispensasi (D)</option>
          </select>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              Hasil Rekap: {currentKelas ? currentKelas.nama : 'Seluruh Kelas'} ({formatDateIndo(selectedTanggal)})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Menampilkan {filteredList.length} dari {dailyStats.totalSiswa} total siswa terdaftar
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama / NISN..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2 pl-9 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
            {selectedKelasId !== 'all' ? (
              (!((appData.presensi || {})[`${selectedTanggal}_${selectedKelasId}`]) || ((appData.presensi || {})[`${selectedTanggal}_${selectedKelasId}`]).length === 0) ? (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 font-extrabold rounded-full text-[10px] shrink-0">
                  Belum Diisi
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-extrabold rounded-full text-[10px] shrink-0">
                  Sudah Diisi
                </span>
              )
            ) : (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 font-extrabold rounded-full text-[10px] shrink-0">
                Semua Kelas
              </span>
            )}
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
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Waktu Masuk</th>
                <th className="p-4 text-center">Waktu Pulang</th>
                <th className="p-4 text-center">Aksi / WA Orang Tua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Tidak ada data siswa yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                pagedList.map((item, idx) => {
                  const absoluteIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  const s = item.siswa;
                  const st = item.status;
                  const rec = item.rec;
                  const kelasObj = appData.kelas.find((k) => k.id === s.kelasId);

                  const statusConfig = CANONICAL_STATUS_COLORS[st] || {
                    label: st ? st : 'Belum Presensi',
                    text: 'text-slate-600 dark:text-slate-400',
                    bg: 'bg-slate-100 dark:bg-slate-800',
                    border: 'border-slate-200 dark:border-slate-700',
                  };

                  const statusLabel = CANONICAL_STATUS_LABELS[st] || (st ? st : 'Belum Presensi');
                  const waText = encodeURIComponent(
                    `Yth. Orang Tua/Wali dari ${s.nama}, kami menginformasikan bahwa siswa ybs tercatat: *${statusLabel.toUpperCase()}* pada tanggal ${formatDateIndo(selectedTanggal)}. Terima kasih. (${appData.sekolah.nama})`
                  );

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4 text-center font-bold text-slate-400">{absoluteIdx}</td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{s.nisn || '-'}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{s.nama}</td>
                      <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{kelasObj ? kelasObj.nama : '-'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono text-slate-600 dark:text-slate-300">
                        {rec?.time || '-'}
                      </td>
                      <td className="p-4 text-center font-mono text-slate-600 dark:text-slate-300">
                        {rec?.pulangTime ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">{rec.pulangTime}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {st !== 'H' && st !== '' ? (
                          <a
                            href={`https://wa.me/?text=${waText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl font-bold text-[10px] inline-flex items-center gap-1 transition border border-emerald-200 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Kirim WA</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[10px] font-semibold">-</span>
                        )}
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
              Tidak ada data siswa yang cocok dengan filter.
            </div>
          ) : (
            pagedList.map((item, idx) => {
              const absoluteIdx = (currentPage - 1) * itemsPerPage + idx + 1;
              const s = item.siswa;
              const st = item.status;
              const rec = item.rec;
              const kelasObj = appData.kelas.find((k) => k.id === s.kelasId);

              const statusConfig = CANONICAL_STATUS_COLORS[st] || {
                label: st ? st : 'Belum Presensi',
                text: 'text-slate-600 dark:text-slate-400',
                bg: 'bg-slate-100 dark:bg-slate-800',
                border: 'border-slate-200 dark:border-slate-700',
              };

              const statusLabel = CANONICAL_STATUS_LABELS[st] || (st ? st : 'Belum Presensi');
              const waText = encodeURIComponent(
                `Yth. Orang Tua/Wali dari ${s.nama}, kami menginformasikan bahwa siswa ybs tercatat: *${statusLabel.toUpperCase()}* pada tanggal ${formatDateIndo(selectedTanggal)}. Terima kasih. (${appData.sekolah.nama})`
              );

              return (
                <div key={s.id} className="py-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {absoluteIdx}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-xs leading-snug">{s.nama}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">NISN: {s.nisn || '-'}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg text-[10px] shrink-0">
                      {kelasObj ? kelasObj.nama : '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-50 dark:border-slate-800/80">
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    {st !== 'H' && st !== '' && (
                      <a
                        href={`https://wa.me/?text=${waText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl font-bold text-[10px] inline-flex items-center gap-1 transition border border-emerald-200 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Kirim WA</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={itemsPerPage}
          totalItems={filteredList.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
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
