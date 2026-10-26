import React from 'react';
import {
  Building2,
  Users,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  BookOpen,
  Calendar,
  Layers,
  GraduationCap,
  Sparkles,
  ShieldAlert,
  Home,
  Clock,
  ArrowRight,
  TrendingUp,
  Percent,
  CalendarDays,
  Send,
  AlertCircle,
  FileText,
  BadgeAlert,
  ChevronRight,
  Briefcase,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppData, UserSession, ViewType } from '../../types';
import { formatDateIndo, normalizePresensiStatus } from '../../utils/helpers';
import { StatCard, cardContainerVariants, cardItemVariants } from '../common/UIComponents';

export interface TeacherRoleStatusInfo {
  isGuru: boolean;
  isGuruBiasa: boolean;
  hasWaliKelas: boolean;
  hasKurikulum: boolean;
  hasKesiswaan: boolean;
  hasHubin: boolean;
  hasStafJadwal: boolean;
  hasPiket: boolean;
  hasEkskul: boolean;
  assignedClass?: any;
  allAssignedClasses: any[];
  dutiesList: string[];
  activeRolesList: { key: string; label: string; color: string }[];
}

interface TeacherAdditionalRoleStatsWidgetProps {
  appData: AppData;
  currentUser: UserSession;
  selectedDate: string;
  roleStatus: TeacherRoleStatusInfo;
  activeTabFilter: string; // 'all' | 'wali' | 'kurikulum' | 'kesiswaan' | 'hubin' | 'piket' | 'ekskul'
  onNavigateView: (view: ViewType) => void;
  onNavigateToInput: (kelasId?: string) => void;
  studentCumulativeStats?: any[];
  onShowToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const TeacherAdditionalRoleStatsWidget: React.FC<TeacherAdditionalRoleStatsWidgetProps> = ({
  appData,
  currentUser,
  selectedDate,
  roleStatus,
  activeTabFilter,
  onNavigateView,
  onNavigateToInput,
  studentCumulativeStats = [],
  onShowToast,
}) => {
  // If teacher is a regular teacher (Guru Biasa) and has no additional roles, return null
  if (roleStatus.isGuruBiasa) {
    return null;
  }

  // -------------------------------------------------------------
  // 1. WALI KELAS METRICS
  // -------------------------------------------------------------
  const waliClass = roleStatus.assignedClass || roleStatus.allAssignedClasses[0];
  const waliClassName = waliClass?.nama || 'Kelas Binaan';

  const waliClassStudents = React.useMemo(() => {
    if (!waliClass?.id) return [];
    return (appData.siswa || []).filter(
      (s) => s.kelasId === waliClass.id && s.status !== 'tidak_aktif' && (s as any).status !== 'nonaktif'
    );
  }, [appData.siswa, waliClass]);

  const waliClassPresensiRecords = React.useMemo(() => {
    if (!waliClass?.id) return [];
    const presensiKey = `${selectedDate}_${waliClass.id}`;
    return appData.presensi?.[presensiKey] || [];
  }, [appData.presensi, selectedDate, waliClass]);

  const isWaliClassRecorded = waliClassPresensiRecords.length > 0;

  const waliClassStats = React.useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;
    let kesiangan = 0;

    waliClassPresensiRecords.forEach((r) => {
      const st = normalizePresensiStatus(r.status);
      if (st === 'H') hadir++;
      else if (st === 'S') sakit++;
      else if (st === 'I') izin++;
      else if (st === 'A') alpa++;
      else if (st === 'K') kesiangan++;
    });

    const total = waliClassStudents.length;
    const rate = total > 0 ? ((hadir / total) * 100).toFixed(1) : '0';

    return { hadir, sakit, izin, alpa, kesiangan, total, rate };
  }, [waliClassPresensiRecords, waliClassStudents]);

  // Students requiring attention in homeroom class
  const classAttentionCount = React.useMemo(() => {
    if (!waliClass?.id) return 0;
    return studentCumulativeStats.filter(
      (item) => item.siswa?.kelasId === waliClass.id && (item.alfa >= 2 || item.totalTidakHadir >= 4)
    ).length;
  }, [studentCumulativeStats, waliClass]);

  // -------------------------------------------------------------
  // 2. WAKIL KEPALA (KURIKULUM) METRICS
  // -------------------------------------------------------------
  const currentDayName = React.useMemo(() => {
    if (!selectedDate) return 'Senin';
    try {
      const parts = selectedDate.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[d.getDay()] || 'Senin';
    } catch {
      return 'Senin';
    }
  }, [selectedDate]);

  const jadwalList = appData.jadwalMengajar || [];
  const todaySchedulesSchool = React.useMemo(() => {
    return jadwalList.filter((j) => (j.hari || '').toLowerCase() === currentDayName.toLowerCase());
  }, [jadwalList, currentDayName]);

  const totalTeachersScheduledToday = React.useMemo(() => {
    const teacherSet = new Set<string>();
    todaySchedulesSchool.forEach((j) => {
      const key = j.guruNip || j.guruUsername || j.guruNama;
      if (key) teacherSet.add(key);
    });
    return teacherSet.size;
  }, [todaySchedulesSchool]);

  const guruPresensiTodayRecords = appData.presensiGuru?.[selectedDate] || [];
  const guruHadirCount = React.useMemo(() => {
    return guruPresensiTodayRecords.filter((r) => r.status === 'H' || r.status === 'T').length;
  }, [guruPresensiTodayRecords]);

  const guruIzinSakitCount = React.useMemo(() => {
    return guruPresensiTodayRecords.filter((r) => r.status === 'I' || r.status === 'S' || r.status === 'D').length;
  }, [guruPresensiTodayRecords]);

  const completedKbmSessionsToday = React.useMemo(() => {
    const completedList = (appData.presensiMengajarGuru || []).filter((p) => p.tanggal === selectedDate);
    return completedList.length;
  }, [appData.presensiMengajarGuru, selectedDate]);

  const totalJpScheduledToday = React.useMemo(() => {
    return todaySchedulesSchool.reduce((acc, j) => {
      if (typeof j.jumlahJp === 'number') return acc + j.jumlahJp;
      if (Array.isArray(j.jamKeList)) return acc + j.jamKeList.length;
      return acc + 1;
    }, 0);
  }, [todaySchedulesSchool]);

  const totalKelasCount = (appData.kelas || []).length;
  const classesWithScheduleCount = React.useMemo(() => {
    const s = new Set(jadwalList.map((j) => j.kelasId));
    return s.size;
  }, [jadwalList]);

  const rombelScheduledPct = totalKelasCount > 0 ? Math.round((classesWithScheduleCount / totalKelasCount) * 100) : 0;
  const kbmCompletionRatePct =
    todaySchedulesSchool.length > 0 ? Math.round((completedKbmSessionsToday / todaySchedulesSchool.length) * 100) : 0;

  // -------------------------------------------------------------
  // 3. WAKIL KEPALA (KESISWAAN) METRICS
  // -------------------------------------------------------------
  const schoolTotalActiveStudents = React.useMemo(() => {
    return (appData.siswa || []).filter((s) => s.status !== 'tidak_aktif' && (s as any).status !== 'nonaktif').length;
  }, [appData.siswa]);

  const schoolDailyStats = React.useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;
    let kesiangan = 0;

    (appData.kelas || []).forEach((k) => {
      const records = appData.presensi?.[`${selectedDate}_${k.id}`] || [];
      records.forEach((r) => {
        const st = normalizePresensiStatus(r.status);
        if (st === 'H') hadir++;
        else if (st === 'S') sakit++;
        else if (st === 'I') izin++;
        else if (st === 'A') alpa++;
        else if (st === 'K') kesiangan++;
      });
    });

    const rate = schoolTotalActiveStudents > 0 ? ((hadir / schoolTotalActiveStudents) * 100).toFixed(1) : '0';
    return { hadir, sakit, izin, alpa, kesiangan, rate };
  }, [appData.kelas, appData.presensi, selectedDate, schoolTotalActiveStudents]);

  const violationsToday = React.useMemo(() => {
    return (appData.pelanggaran || []).filter((p) => p.tanggal === selectedDate);
  }, [appData.pelanggaran, selectedDate]);

  const violationsPointsToday = React.useMemo(() => {
    return violationsToday.reduce((acc, p) => acc + (p.poin || 0), 0);
  }, [violationsToday]);

  const activeHomeVisitsCount = React.useMemo(() => {
    return (appData.homeVisits || []).filter(
      (h) => h.status === 'proses' || h.status === 'perlu_followup' || !h.status
    ).length;
  }, [appData.homeVisits]);

  // -------------------------------------------------------------
  // 4. WAKIL KEPALA (HUBIN) METRICS
  // -------------------------------------------------------------
  const totalJurusan = (appData.jurusan || []).length;

  // Decide which role blocks to render based on activeTabFilter
  const showWali = roleStatus.hasWaliKelas && (activeTabFilter === 'all' || activeTabFilter === 'wali');
  const showKurikulum = roleStatus.hasKurikulum && (activeTabFilter === 'all' || activeTabFilter === 'kurikulum');
  const showKesiswaan = roleStatus.hasKesiswaan && (activeTabFilter === 'all' || activeTabFilter === 'kesiswaan');
  const showHubin = roleStatus.hasHubin && (activeTabFilter === 'all' || activeTabFilter === 'hubin');

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------------
          SECTION A: WALI KELAS SUMMARY CARDS
      -------------------------------------------------------- */}
      {showWali && (
        <motion.div
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
          className="rounded-3xl p-5 md:p-6 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/15">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                <Building2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Ringkasan Tugas Tambahan: Wali Kelas ({waliClassName})
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    Kelas Binaan
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Statistik kehadiran, kepatuhan presensi, dan pembinaan siswa kelas {waliClassName} hari ini ({formatDateIndo(selectedDate)})
                </p>
              </div>
            </div>

            {/* Quick 1-click action buttons */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={() => onNavigateToInput(waliClass?.id)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Input Presensi Kelas</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateView('rekap_harian')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Rekap Kelas</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateView('broadcast_wa')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs transition cursor-pointer"
                title="Kirim Broadcast WhatsApp ke Orang Tua / Siswa Kelas"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Broadcast</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              title="Kehadiran Kelas Hari Ini"
              value={`${waliClassStats.rate}%`}
              subtitle={`${waliClassStats.hadir} dari ${waliClassStats.total} Siswa Hadir`}
              icon={UserCheck}
              variant={parseFloat(waliClassStats.rate) >= 90 ? 'success' : 'warning'}
              badge={{
                label: parseFloat(waliClassStats.rate) >= 90 ? 'Sangat Baik' : 'Perlu Pantauan',
                type: parseFloat(waliClassStats.rate) >= 90 ? 'success' : 'warning',
              }}
              onClick={() => onNavigateView('rekap_harian')}
            />

            <StatCard
              title="Status Pengisian Presensi"
              value={isWaliClassRecorded ? 'Sudah Terisi' : 'Belum Diisi'}
              subtitle={
                isWaliClassRecorded
                  ? `${waliClassPresensiRecords.length} Data presensi terekam`
                  : 'Klik untuk mengisi kehadiran hari ini'
              }
              icon={isWaliClassRecorded ? CheckCircle2 : AlertCircle}
              variant={isWaliClassRecorded ? 'success' : 'danger'}
              badge={{
                label: isWaliClassRecorded ? 'Lengkap' : 'Menunggu Input',
                type: isWaliClassRecorded ? 'success' : 'danger',
              }}
              onClick={() => onNavigateToInput(waliClass?.id)}
            />

            <StatCard
              title="Ketidakhadiran Kelas"
              value={`${waliClassStats.alpa + waliClassStats.sakit + waliClassStats.izin} Siswa`}
              subtitle={`${waliClassStats.sakit} Sakit • ${waliClassStats.izin} Izin • ${waliClassStats.alpa} Alpha`}
              icon={AlertTriangle}
              variant={waliClassStats.alpa > 0 ? 'danger' : waliClassStats.sakit + waliClassStats.izin > 0 ? 'warning' : 'neutral'}
              badge={{
                label: waliClassStats.alpa > 0 ? `${waliClassStats.alpa} Alpha` : 'Nihil Alpha',
                type: waliClassStats.alpa > 0 ? 'danger' : 'success',
              }}
              onClick={() => onNavigateView('rekap_harian')}
            />

            <StatCard
              title="Siswa Perlu Perhatian"
              value={`${classAttentionCount} Siswa`}
              subtitle={
                classAttentionCount > 0
                  ? 'Memiliki riwayat absensi tinggi di kelas'
                  : 'Seluruh siswa berdisiplin baik'
              }
              icon={BadgeAlert}
              variant={classAttentionCount > 0 ? 'warning' : 'success'}
              badge={{
                label: classAttentionCount > 0 ? 'Perlu Pembinaan' : 'Aman',
                type: classAttentionCount > 0 ? 'warning' : 'success',
              }}
              onClick={() => onNavigateView('rekap_ketidakhadiran_tertinggi')}
            />
          </div>
        </motion.div>
      )}

      {/* --------------------------------------------------------
          SECTION B: WAKIL KEPALA (KURIKULUM) SUMMARY CARDS
      -------------------------------------------------------- */}
      {showKurikulum && (
        <motion.div
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
          className="rounded-3xl p-5 md:p-6 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-blue-500/15">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                <BookOpen className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Ringkasan Tugas Tambahan: Wakil Kepala Bidang Kurikulum
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                    Manajemen KBM &amp; Akademik
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Monitoring kesiapan jadwal, beban mengajar pendidik, presensi guru, dan keterisian jurnal KBM sekolah hari ini
                </p>
              </div>
            </div>

            {/* Quick 1-click action buttons */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={() => onNavigateView('presensi_kbm_guru')}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Monitoring KBM</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateView('jadwal_mengajar')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs transition cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Plotting Jadwal</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateView('rekap_pengisian_kelas')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Status Kelas</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              title="Presensi Guru Hari Ini"
              value={`${guruHadirCount}/${totalTeachersScheduledToday || (appData.waliKelas || []).length}`}
              subtitle={
                guruIzinSakitCount > 0
                  ? `${guruIzinSakitCount} Guru Izin/Sakit/Dinas`
                  : 'Kehadiran pendidik terpantau tertib'
              }
              icon={UserCheck}
              variant={guruHadirCount > 0 ? 'success' : 'neutral'}
              badge={{
                label: totalTeachersScheduledToday > 0 ? `${Math.round((guruHadirCount / (totalTeachersScheduledToday || 1)) * 100)}% Hadir` : 'Jadwal Hari Ini',
                type: 'info',
              }}
              onClick={() => onNavigateView('absen_harian_guru')}
            />

            <StatCard
              title="Keterisian Jurnal KBM"
              value={`${completedKbmSessionsToday}/${todaySchedulesSchool.length || 0}`}
              subtitle={`${kbmCompletionRatePct}% Sesi KBM telah mengunggah jurnal kelas`}
              icon={CheckCircle2}
              variant={kbmCompletionRatePct >= 75 ? 'success' : kbmCompletionRatePct > 0 ? 'warning' : 'neutral'}
              badge={{
                label: `${completedKbmSessionsToday} Sesi Diabsen`,
                type: kbmCompletionRatePct >= 75 ? 'success' : 'warning',
              }}
              onClick={() => onNavigateView('presensi_kbm_guru')}
            />

            <StatCard
              title="Beban JP KBM Hari Ini"
              value={`${totalJpScheduledToday} JP`}
              subtitle={`Terdistribusi di ${todaySchedulesSchool.length} sesi pertemuan KBM`}
              icon={Clock}
              variant="info"
              badge={{
                label: currentDayName,
                type: 'info',
              }}
              onClick={() => onNavigateView('jadwal_minggu_ini')}
            />

            <StatCard
              title="Efektivitas Rombel KBM"
              value={`${rombelScheduledPct}%`}
              subtitle={`${classesWithScheduleCount} dari ${totalKelasCount} Rombel telah terplot jadwal`}
              icon={Layers}
              variant={rombelScheduledPct >= 90 ? 'success' : 'warning'}
              badge={{
                label: `${classesWithScheduleCount} Kelas Aktif`,
                type: rombelScheduledPct >= 90 ? 'success' : 'warning',
              }}
              onClick={() => onNavigateView('jadwal_mengajar')}
            />
          </div>
        </motion.div>
      )}

      {/* --------------------------------------------------------
          SECTION C: WAKIL KEPALA (KESISWAAN) SUMMARY CARDS
      -------------------------------------------------------- */}
      {showKesiswaan && (
        <motion.div
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
          className="rounded-3xl p-5 md:p-6 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-transparent border border-purple-500/20 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-purple-500/15">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/20">
                <Users className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Ringkasan Tugas Tambahan: Wakil Kepala Bidang Kesiswaan
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                    Kedisiplinan &amp; Pembinaan Siswa
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Rekapitulasi kehadiran siswa sekolah, penindakan kedisiplinan &amp; sanksi tata tertib, serta pemantauan home visit
                </p>
              </div>
            </div>

            {/* Quick 1-click action buttons */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={() => onNavigateView('rekap_ketidakhadiran_tertinggi')}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Peringkat Ketidakhadiran</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateView('catatan_pelanggaran')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-xs transition cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Pelanggaran Siswa</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateView('home_visit')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-xs transition cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home Visit</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              title="Kehadiran Siswa Sekolah"
              value={`${schoolDailyStats.rate}%`}
              subtitle={`${schoolDailyStats.hadir} dari ${schoolTotalActiveStudents} Siswa Hadir`}
              icon={UserCheck}
              variant={parseFloat(schoolDailyStats.rate) >= 90 ? 'success' : 'warning'}
              badge={{
                label: parseFloat(schoolDailyStats.rate) >= 90 ? 'Tertib' : 'Pantauan Khusus',
                type: parseFloat(schoolDailyStats.rate) >= 90 ? 'success' : 'warning',
              }}
              onClick={() => onNavigateView('rekap_harian')}
            />

            <StatCard
              title="Ketidakhadiran Sekolah Hari Ini"
              value={`${schoolDailyStats.alpa + schoolDailyStats.sakit + schoolDailyStats.izin} Siswa`}
              subtitle={`${schoolDailyStats.alpa} Alpha • ${schoolDailyStats.sakit} Sakit • ${schoolDailyStats.izin} Izin`}
              icon={AlertTriangle}
              variant={schoolDailyStats.alpa > 0 ? 'danger' : 'warning'}
              badge={{
                label: schoolDailyStats.alpa > 0 ? `${schoolDailyStats.alpa} Alpha Sekolah` : 'Nihil Alpha',
                type: schoolDailyStats.alpa > 0 ? 'danger' : 'success',
              }}
              onClick={() => onNavigateView('rekap_ketidakhadiran_tertinggi')}
            />

            <StatCard
              title="Kedisiplinan & Pelanggaran"
              value={`${violationsToday.length} Kasus`}
              subtitle={
                violationsToday.length > 0
                  ? `Total ${violationsPointsToday} poin sanksi tercatat hari ini`
                  : 'Tidak ada laporan pelanggaran hari ini'
              }
              icon={ShieldAlert}
              variant={violationsToday.length > 0 ? 'danger' : 'success'}
              badge={{
                label: violationsToday.length > 0 ? 'Perlu Tindak Lanjut' : 'Nihil Kasus',
                type: violationsToday.length > 0 ? 'danger' : 'success',
              }}
              onClick={() => onNavigateView('catatan_pelanggaran')}
            />

            <StatCard
              title="Kunjungan Rumah (Home Visit)"
              value={`${activeHomeVisitsCount} Kasus`}
              subtitle={
                activeHomeVisitsCount > 0
                  ? 'Kunjungan rumah sedang proses/perlu follow-up'
                  : 'Semua kasus siswa telah selesai ditangani'
              }
              icon={Home}
              variant={activeHomeVisitsCount > 0 ? 'warning' : 'neutral'}
              badge={{
                label: activeHomeVisitsCount > 0 ? 'Aktif' : 'Tuntas',
                type: activeHomeVisitsCount > 0 ? 'warning' : 'neutral',
              }}
              onClick={() => onNavigateView('home_visit')}
            />
          </div>
        </motion.div>
      )}

      {/* --------------------------------------------------------
          SECTION D: WAKIL KEPALA (HUBIN / HUMAS) SUMMARY CARDS
      -------------------------------------------------------- */}
      {showHubin && (
        <motion.div
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
          className="rounded-3xl p-5 md:p-6 bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/20 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-teal-500/15">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
                <Briefcase className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Ringkasan Tugas Tambahan: Wakil Kepala Bidang Hubungan Industri &amp; Humas
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-300 dark:border-teal-700">
                    Kemitraan &amp; Vokasi
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pantauan kesiapan siswa vokasi, kompetensi jurusan keahlian, dan kedisiplinan peserta didik
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={() => onNavigateView('master_jurusan')}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Data Jurusan</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateView('master_siswa')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold text-xs transition cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Siswa Kejuruan</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <StatCard
              title="Kompetensi Jurusan"
              value={`${totalJurusan} Konsentrasi`}
              subtitle="Program keahlian terdaftar di sistem"
              icon={Briefcase}
              variant="info"
              badge={{ label: 'Vokasi Aktif', type: 'info' }}
              onClick={() => onNavigateView('master_jurusan')}
            />

            <StatCard
              title="Total Siswa Kejuruan"
              value={`${schoolTotalActiveStudents} Siswa`}
              subtitle="Terdaftar aktif di seluruh kompetensi keahlian"
              icon={Users}
              variant="primary"
              badge={{ label: `${(appData.kelas || []).length} Rombel`, type: 'neutral' }}
              onClick={() => onNavigateView('master_siswa')}
            />

            <StatCard
              title="Kesiapan Kedisiplinan Kerja"
              value={`${schoolDailyStats.rate}%`}
              subtitle="Tingkat kehadiran siswa sekolah hari ini"
              icon={ShieldCheck}
              variant={parseFloat(schoolDailyStats.rate) >= 90 ? 'success' : 'warning'}
              badge={{
                label: parseFloat(schoolDailyStats.rate) >= 90 ? 'Siap Kerja' : 'Perlu Binaan',
                type: parseFloat(schoolDailyStats.rate) >= 90 ? 'success' : 'warning',
              }}
              onClick={() => onNavigateView('rekap_harian')}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};
