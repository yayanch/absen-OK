import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  Calendar,
  Search,
  CheckCircle2,
  Save,
  RotateCcw,
  CheckCheck,
  Clock,
  AlertCircle,
  Filter,
  Award,
  BookOpen,
  CalendarDays,
  Sparkles,
  Info,
  Check,
  X,
  FileText,
  ShieldCheck,
  Globe,
  RefreshCw
} from 'lucide-react';
import { AppData, UserSession, GuruPresensiItem, WaliKelas, SyncResult } from '../../types';
import {
  getIndonesianDayName,
  formatDateIndo,
  isTeacherScheduledOnDay,
  getTeacherScheduleSummaryOnDay,
  getTodayString,
  isWeekend,
  getHariLiburInfo
} from '../../utils/helpers';
import { DatePickerWithStatus } from '../DatePickerWithStatus';

interface TeacherManualAttendanceTabProps {
  appData: AppData;
  currentUser: UserSession;
  selectedTanggal: string;
  setSelectedTanggal: (date: string) => void;
  onSavePresensi: (updatedData: AppData) => Promise<SyncResult> | void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const TeacherManualAttendanceTab: React.FC<TeacherManualAttendanceTabProps> = ({
  appData,
  currentUser,
  selectedTanggal,
  setSelectedTanggal,
  onSavePresensi,
  onShowToast
}) => {
  const [filterOnlyScheduled, setFilterOnlyScheduled] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const currentUserName = (currentUser.data as any)?.nama || (currentUser.data as any)?.username || currentUser.role || 'System';

  // Day context
  const dayName = useMemo(() => getIndonesianDayName(selectedTanggal), [selectedTanggal]);
  const formattedDateIndo = useMemo(() => formatDateIndo(selectedTanggal), [selectedTanggal]);
  const hariLiburInfo = useMemo(() => getHariLiburInfo(selectedTanggal, appData), [selectedTanggal, appData]);
  const isWeekendDay = useMemo(() => isWeekend(selectedTanggal), [selectedTanggal]);

  // All teachers master list
  const allTeachers: WaliKelas[] = useMemo(() => {
    return appData.waliKelas || [];
  }, [appData.waliKelas]);

  // Teachers scheduled for target date
  const scheduledTeachers = useMemo(() => {
    if (!filterOnlyScheduled) {
      return allTeachers;
    }
    return allTeachers.filter((teacher) =>
      isTeacherScheduledOnDay(teacher, selectedTanggal, appData.jadwalMengajar)
    );
  }, [allTeachers, filterOnlyScheduled, selectedTanggal, appData.jadwalMengajar]);

  // Filtered teachers based on search query
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return scheduledTeachers;
    const q = searchQuery.toLowerCase().trim();
    return scheduledTeachers.filter((t) => {
      const matchNama = t.nama.toLowerCase().includes(q);
      const matchNip = t.nip ? t.nip.toLowerCase().includes(q) : false;
      const matchMapel = t.mataPelajaran ? t.mataPelajaran.toLowerCase().includes(q) : false;
      const matchUsername = t.username ? t.username.toLowerCase().includes(q) : false;
      return matchNama || matchNip || matchMapel || matchUsername;
    });
  }, [scheduledTeachers, searchQuery]);

  // Local state for current date attendance records map: teacherId -> GuruPresensiItem
  const [recordsMap, setRecordsMap] = useState<Record<string, GuruPresensiItem>>({});

  // Initialize/load attendance records when selectedTanggal or appData changes
  useEffect(() => {
    const existingList: GuruPresensiItem[] = appData.presensiGuru?.[selectedTanggal] || [];
    const map: Record<string, GuruPresensiItem> = {};

    // Load existing items into map
    existingList.forEach((item) => {
      if (item.guruId) {
        map[item.guruId] = { ...item };
      }
    });

    // Populate defaults for teachers who don't have a record yet
    allTeachers.forEach((teacher) => {
      if (!map[teacher.id]) {
        const scheduleSummary = getTeacherScheduleSummaryOnDay(teacher, selectedTanggal, appData.jadwalMengajar);
        map[teacher.id] = {
          id: `GP_${selectedTanggal}_${teacher.id}`,
          guruId: teacher.id,
          guruUsername: teacher.username,
          guruNama: teacher.nama,
          guruNip: teacher.nip || '',
          tanggal: selectedTanggal,
          hari: dayName,
          status: '',
          jamMasuk: '06:45',
          jamPulang: '14:00',
          catatan: '',
          jadwalHariIni: scheduleSummary,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUserName
        };
      }
    });

    setRecordsMap(map);
  }, [selectedTanggal, appData.presensiGuru, appData.jadwalMengajar, allTeachers, dayName, currentUserName]);

  // Handler to update a single field for a teacher
  const handleUpdateRecord = (teacherId: string, updates: Partial<GuruPresensiItem>) => {
    setRecordsMap((prev) => {
      const existing = prev[teacherId] || {
        id: `GP_${selectedTanggal}_${teacherId}`,
        guruId: teacherId,
        guruNama: '',
        tanggal: selectedTanggal,
        hari: dayName,
        status: '',
        jamMasuk: '06:45',
        jamPulang: '14:00',
        catatan: ''
      };

      const isStatusChanged = updates.status !== undefined && updates.status !== existing.status;

      return {
        ...prev,
        [teacherId]: {
          ...existing,
          ...updates,
          isOverridden: isStatusChanged ? true : existing.isOverridden,
          overriddenBy: isStatusChanged ? currentUserName : existing.overriddenBy,
          sumberPresensi: isStatusChanged ? 'Manual' : (existing.sumberPresensi || 'Manual'),
          updatedAt: new Date().toISOString(),
          updatedBy: currentUserName
        }
      };
    });
  };

  // Quick Action: Set all displayed teachers to Hadir (H)
  const handleSetAllHadir = () => {
    setRecordsMap((prev) => {
      const nextMap = { ...prev };
      filteredTeachers.forEach((t) => {
        const existing = nextMap[t.id] || {
          id: `GP_${selectedTanggal}_${t.id}`,
          guruId: t.id,
          guruNama: t.nama,
          tanggal: selectedTanggal,
          hari: dayName,
          status: '',
          jamMasuk: '06:45',
          jamPulang: '14:00',
          catatan: ''
        };
        nextMap[t.id] = {
          ...existing,
          status: 'H',
          jamMasuk: existing.jamMasuk || '06:45',
          jamPulang: existing.jamPulang || '14:00',
          isOverridden: true,
          overriddenBy: currentUserName,
          sumberPresensi: 'Manual',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUserName
        };
      });
      return nextMap;
    });
    onShowToast(`Status ${filteredTeachers.length} guru diubah menjadi Hadir (H)`, 'info');
  };

  // Quick Action: Reset status for displayed teachers
  const handleResetAll = () => {
    setRecordsMap((prev) => {
      const nextMap = { ...prev };
      filteredTeachers.forEach((t) => {
        if (nextMap[t.id]) {
          nextMap[t.id] = {
            ...nextMap[t.id],
            status: '',
            catatan: '',
            updatedAt: new Date().toISOString()
          };
        }
      });
      return nextMap;
    });
    onShowToast('Status absensi guru berhasil direset.', 'info');
  };

  // Save attendance to appData & server
  const handleSaveAttendance = async () => {
    setIsSaving(true);
    try {
      const updatedListForDate = Object.values(recordsMap).filter((item) => {
        // Save items for all scheduled teachers or those with filled status
        return item.status !== '' || scheduledTeachers.some((t) => t.id === item.guruId);
      });

      const nextPresensiGuru = {
        ...(appData.presensiGuru || {}),
        [selectedTanggal]: updatedListForDate
      };

      const updatedAppData: AppData = {
        ...appData,
        presensiGuru: nextPresensiGuru
      };

      await onSavePresensi(updatedAppData);
      onShowToast(`Data absensi ${updatedListForDate.length} guru untuk ${formattedDateIndo} berhasil disimpan!`, 'success');
    } catch (err: any) {
      onShowToast(`Gagal menyimpan absensi guru: ${err.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Statistics calculation for displayed teachers
  const stats = useMemo(() => {
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let dinas = 0;
    let alpha = 0;
    let belum = 0;

    scheduledTeachers.forEach((t) => {
      const rec = recordsMap[t.id];
      const st = rec?.status || '';
      if (st === 'H') hadir++;
      else if (st === 'T') terlambat++;
      else if (st === 'I') izin++;
      else if (st === 'S') sakit++;
      else if (st === 'D') dinas++;
      else if (st === 'A') alpha++;
      else belum++;
    });

    return {
      total: scheduledTeachers.length,
      hadir,
      terlambat,
      izin,
      sakit,
      dinas,
      alpha,
      belum
    };
  }, [scheduledTeachers, recordsMap]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* CONTEXT & FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <DatePickerWithStatus
              label="Tanggal Absensi Guru"
              selectedDate={selectedTanggal}
              onChangeDate={setSelectedTanggal}
              appData={appData}
              currentUser={currentUser}
            />
          </div>

          <div className="flex flex-col justify-end space-y-2">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50">
              <div className="flex items-center gap-2.5">
                <Filter className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                    Filter Matriks Jadwal Guru
                  </span>
                  <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80 block">
                    {filterOnlyScheduled
                      ? `Hanya menampilkan guru yang mengajar pada hari ${dayName}`
                      : 'Menampilkan seluruh master guru sekolah'}
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={filterOnlyScheduled}
                  onChange={(e) => setFilterOnlyScheduled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* DAY CONTEXT BANNER */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Hari {dayName}</span>
            </span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              {formattedDateIndo}
            </span>
            {isWeekendDay && (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                Akhir Pekan
              </span>
            )}
            {hariLiburInfo && (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Hari Libur: {hariLiburInfo.keterangan}
              </span>
            )}
          </div>

          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Terdaftar: <strong className="text-slate-800 dark:text-slate-200 font-bold">{scheduledTeachers.length} Guru</strong> {filterOnlyScheduled ? `Mengajar pada hari ${dayName}` : 'Keseluruhan'}
          </div>
        </div>
      </div>

      {/* OVERRIDE BANNER */}
      <div className="p-3.5 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 font-bold">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="font-extrabold text-indigo-950 dark:text-indigo-100 block">
              Sistem Manual Override Kehadiran Online
            </span>
            <span className="text-indigo-800/80 dark:text-indigo-300/80 text-[11px] block">
              Catatan kehadiran yang tercatat secara online / presensi otomatis dapat disesuaikan atau dioverride secara manual kapan saja oleh Admin, Kurikulum, atau Guru Piket.
            </span>
          </div>
        </div>
      </div>

      {/* STATS SUMMARY GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Guru Terjadwal
          </span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums block">
            {stats.total}
          </span>
          <span className="text-[10px] text-slate-400 block truncate">
            Hari {dayName}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
            Hadir (H)
          </span>
          <span className="text-xl font-extrabold text-emerald-800 dark:text-emerald-300 tabular-nums block">
            {stats.hadir}
          </span>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block">
            Tepat Waktu
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
            Terlambat (T)
          </span>
          <span className="text-xl font-extrabold text-amber-800 dark:text-amber-300 tabular-nums block">
            {stats.terlambat}
          </span>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 block">
            Hadir Terlambat
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
            Izin / Sakit (I/S)
          </span>
          <span className="text-xl font-extrabold text-blue-800 dark:text-blue-300 tabular-nums block">
            {stats.izin + stats.sakit}
          </span>
          <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 block">
            {stats.izin} Izin · {stats.sakit} Sakit
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-400 block">
            Dinas Luar (D)
          </span>
          <span className="text-xl font-extrabold text-purple-800 dark:text-purple-300 tabular-nums block">
            {stats.dinas}
          </span>
          <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80 block">
            Tugas Instansi
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
            Alpha / Belum
          </span>
          <span className="text-xl font-extrabold text-rose-800 dark:text-rose-300 tabular-nums block">
            {stats.alpha + stats.belum}
          </span>
          <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 block">
            {stats.alpha} Alpha · {stats.belum} Belum
          </span>
        </div>
      </div>

      {/* ACTION TOOLBAR & SEARCH */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama guru, NIP, atau mata pelajaran..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSetAllHadir}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            title="Ubah semua status guru yang tampil menjadi Hadir (H)"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Set Semua Hadir</span>
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Kosongkan pilihan status absensi guru"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Status</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Absensi Guru'}</span>
          </button>
        </div>
      </div>

      {/* TEACHER ATTENDANCE TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredTeachers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Tidak Ada Guru Terdaftar untuk Hari {dayName}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {filterOnlyScheduled
                  ? `Tidak ada guru yang memiliki jam mengajar atau terdaftar pada hari ${dayName}. Matriks jadwal otomatis memfilter guru agar tidak muncul pada hari libur mengajar mereka.`
                  : 'Tidak ditemukan data guru yang sesuai dengan pencarian Anda.'}
              </p>
            </div>
            {filterOnlyScheduled && (
              <button
                type="button"
                onClick={() => setFilterOnlyScheduled(false)}
                className="mt-2 px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition cursor-pointer"
              >
                Tampilkan Seluruh Master Guru
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4 min-w-[220px]">Nama Guru & NIP</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Hari & Matriks Jadwal Hari Ini</th>
                  <th className="py-3.5 px-4 min-w-[290px]">Status Kehadiran Guru</th>
                  <th className="py-3.5 px-4 min-w-[170px]">Jam Masuk / Pulang</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredTeachers.map((teacher, index) => {
                  const record = recordsMap[teacher.id] || {
                    id: `GP_${selectedTanggal}_${teacher.id}`,
                    guruId: teacher.id,
                    guruNama: teacher.nama,
                    tanggal: selectedTanggal,
                    hari: dayName,
                    status: '',
                    jamMasuk: '06:45',
                    jamPulang: '14:00',
                    catatan: ''
                  };

                  const currentStatus = record.status || '';
                  const scheduleSummary = getTeacherScheduleSummaryOnDay(teacher, selectedTanggal, appData.jadwalMengajar);
                  const isScheduled = isTeacherScheduledOnDay(teacher, selectedTanggal, appData.jadwalMengajar);
                  const teachingDaysText = teacher.hariMengajar && teacher.hariMengajar.length > 0
                    ? teacher.hariMengajar.join(', ')
                    : 'Senin - Jumat';

                  return (
                    <tr
                      key={teacher.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        currentStatus === 'H'
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                          : currentStatus === 'T'
                          ? 'bg-amber-50/20 dark:bg-amber-950/10'
                          : currentStatus === 'I' || currentStatus === 'S'
                          ? 'bg-blue-50/20 dark:bg-blue-950/10'
                          : currentStatus === 'D'
                          ? 'bg-purple-50/20 dark:bg-purple-950/10'
                          : currentStatus === 'A'
                          ? 'bg-rose-50/20 dark:bg-rose-950/10'
                          : ''
                      }`}
                    >
                      {/* NO */}
                      <td className="py-3 px-4 text-center text-slate-400 font-bold tabular-nums">
                        {index + 1}
                      </td>

                      {/* GURU & NIP */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-extrabold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                            {teacher.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 dark:text-slate-100 block leading-snug">
                                {teacher.nama}
                              </span>
                              {record.isOverridden ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded border border-amber-300/80 dark:border-amber-800/80" title={`Dioverride manual oleh ${record.overriddenBy || 'Admin'}`}>
                                  <ShieldCheck className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                  <span>Override</span>
                                </span>
                              ) : record.sumberPresensi === 'Online' || record.sumberPresensi === 'QR Scan' ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-300/80 dark:border-emerald-800/80">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>Online</span>
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {teacher.nip && <span>NIP: {teacher.nip}</span>}
                              {teacher.mataPelajaran && (
                                <>
                                  <span aria-hidden="true">•</span>
                                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                                    {teacher.mataPelajaran}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* HARI & MATRIKS JADWAL */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              {scheduleSummary}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              Hari Mengajar:
                            </span>
                            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-900/40">
                              {teachingDaysText}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* STATUS KEHADIRAN (BUTTONS) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* HADIR (H) */}
                          <button
                            type="button"
                            onClick={() => handleUpdateRecord(teacher.id, { status: 'H' })}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer border ${
                              currentStatus === 'H'
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50'
                            }`}
                            title="Hadir tepat waktu"
                          >
                            <span>H</span>
                            <span className="text-[10px] font-normal">Hadir</span>
                          </button>

                          {/* TERLAMBAT (T) */}
                          <button
                            type="button"
                            onClick={() => handleUpdateRecord(teacher.id, { status: 'T' })}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer border ${
                              currentStatus === 'T'
                                ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/50'
                            }`}
                            title="Hadir Terlambat"
                          >
                            <span>T</span>
                            <span className="text-[10px] font-normal">Telat</span>
                          </button>

                          {/* IZIN (I) */}
                          <button
                            type="button"
                            onClick={() => handleUpdateRecord(teacher.id, { status: 'I' })}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer border ${
                              currentStatus === 'I'
                                ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/50'
                            }`}
                            title="Izin Kepentingan"
                          >
                            <span>I</span>
                            <span className="text-[10px] font-normal">Izin</span>
                          </button>

                          {/* SAKIT (S) */}
                          <button
                            type="button"
                            onClick={() => handleUpdateRecord(teacher.id, { status: 'S' })}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer border ${
                              currentStatus === 'S'
                                ? 'bg-orange-600 text-white border-orange-700 shadow-xs ring-2 ring-orange-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950/50'
                            }`}
                            title="Sakit dengan Keterangan"
                          >
                            <span>S</span>
                            <span className="text-[10px] font-normal">Sakit</span>
                          </button>

                          {/* DINAS LUAR (D) */}
                          <button
                            type="button"
                            onClick={() => handleUpdateRecord(teacher.id, { status: 'D' })}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer border ${
                              currentStatus === 'D'
                                ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/50'
                            }`}
                            title="Dinas Luar / Tugas Kantor"
                          >
                            <span>D</span>
                            <span className="text-[10px] font-normal">Dinas</span>
                          </button>

                          {/* ALPHA (A) */}
                          <button
                            type="button"
                            onClick={() => handleUpdateRecord(teacher.id, { status: 'A' })}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer border ${
                              currentStatus === 'A'
                                ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50'
                            }`}
                            title="Tanpa Keterangan / Alpha"
                          >
                            <span>A</span>
                            <span className="text-[10px] font-normal">Alpa</span>
                          </button>
                        </div>
                      </td>

                      {/* JAM MASUK / PULANG */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="relative">
                            <input
                              type="text"
                              value={record.jamMasuk || ''}
                              onChange={(e) => handleUpdateRecord(teacher.id, { jamMasuk: e.target.value })}
                              placeholder="06:45"
                              className="w-16 px-2 py-1 text-center text-xs font-bold font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <span className="text-slate-400 font-bold">-</span>
                          <div className="relative">
                            <input
                              type="text"
                              value={record.jamPulang || ''}
                              onChange={(e) => handleUpdateRecord(teacher.id, { jamPulang: e.target.value })}
                              placeholder="14:00"
                              className="w-16 px-2 py-1 text-center text-xs font-bold font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </td>

                      {/* CATATAN */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={record.catatan || ''}
                          onChange={(e) => handleUpdateRecord(teacher.id, { catatan: e.target.value })}
                          placeholder="Catatan / tugas dinas / Keterangan..."
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
