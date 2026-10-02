import React from 'react';
import {
  BookOpen,
  Calendar,
  Users,
  DoorOpen,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  GraduationCap,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppData, UserSession, ViewType } from '../../types';
import { formatDateIndo, cleanMapelName } from '../../utils/helpers';
import { RoleQuickActions } from './RoleQuickActions';
import { PageHeader, StatCard, cardContainerVariants, cardItemVariants } from '../common/UIComponents';

interface KurikulumDashboardViewProps {
  appData: AppData;
  currentUser: UserSession;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  onNavigateView: (view: ViewType) => void;
}

export const KurikulumDashboardView: React.FC<KurikulumDashboardViewProps> = ({
  appData,
  currentUser,
  selectedDate,
  setSelectedDate,
  onNavigateView,
}) => {
  const mapelList = appData.mataPelajaran || [];
  const jadwalList = appData.jadwalMengajar || [];
  const guruList = appData.waliKelas || [];
  const kelasList = appData.kelas || [];
  const jurusanList = appData.jurusan || [];

  // Hitung metrik kurikulum
  const totalMapel = mapelList.length;
  const totalJadwal = jadwalList.length;
  const totalGuru = guruList.length;
  const totalKelas = kelasList.length;

  // Rombel yang sudah memiliki jadwal
  const kelasWithSchedule = new Set(jadwalList.map((j) => j.kelasId));
  const rombelScheduledPercent = totalKelas > 0 
    ? Math.round((kelasWithSchedule.size / totalKelas) * 100) 
    : 0;

  // Guru yang sudah terplot dalam jadwal
  const guruWithSchedule = new Set(jadwalList.map((j) => j.guruNip || j.guruUsername || j.guruNama));

  // Distribusi jadwal per hari
  const hariList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const jadwalPerHari = React.useMemo(() => {
    const map: Record<string, number> = {};
    hariList.forEach((h) => { map[h] = 0; });
    jadwalList.forEach((j) => {
      if (map[j.hari] !== undefined) {
        map[j.hari]++;
      }
    });
    return map;
  }, [jadwalList]);

  // Jadwal hari ini berdasarkan nama hari
  const currentDayName = React.useMemo(() => {
    try {
      const parts = selectedDate.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[d.getDay()];
    } catch {
      return 'Senin';
    }
  }, [selectedDate]);

  const todaySchedules = React.useMemo(() => {
    return jadwalList.filter((j) => j.hari.toLowerCase() === currentDayName.toLowerCase());
  }, [jadwalList, currentDayName]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        title="Dashboard Kurikulum & Akademik"
        description="Pusat manajemen plotting jadwal mengajar, mata pelajaran, beban jam pendidik, dan efektivitas KBM."
        badge={formatDateIndo(selectedDate)}
        actions={
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer"
          />
        }
      />

      {/* Aksi Cepat Tim Kurikulum */}
      <RoleQuickActions role="kurikulum" onNavigateView={onNavigateView} />

      {/* Statistik Ringkasan Kurikulum */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3.5"
        variants={cardContainerVariants}
        initial="hidden"
        animate="show"
      >
        <StatCard
          index={0}
          label="Total Mata Pelajaran"
          value={totalMapel}
          subtitle="Mapel aktif terdaftar"
          icon={BookOpen}
          variant="primary"
          onClick={() => onNavigateView('master_mapel')}
        />
        <StatCard
          index={1}
          label="Jadwal Terplotting"
          value={totalJadwal}
          subtitle={`${todaySchedules.length} jadwal pada hari ${currentDayName}`}
          icon={Calendar}
          variant="success"
          onClick={() => onNavigateView('jadwal_mengajar')}
        />
        <StatCard
          index={2}
          label="Pendidik & Guru"
          value={totalGuru}
          subtitle={`${guruWithSchedule.size} guru aktif mengajar`}
          icon={Users}
          variant="neutral"
          onClick={() => onNavigateView('master_guru')}
        />
        <StatCard
          index={3}
          label="Kesiapan Rombel"
          value={`${rombelScheduledPercent}%`}
          subtitle={`${kelasWithSchedule.size} dari ${totalKelas} kelas terplotting`}
          icon={DoorOpen}
          variant="warning"
          onClick={() => onNavigateView('master_kelas')}
        />
      </motion.div>

      {/* Grid Distribusi & Monitoring KBM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribusi Beban Jadwal per Hari */}
        <motion.div
          variants={cardItemVariants}
          initial="hidden"
          animate="show"
          className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" />
                <span>Distribusi Jadwal KBM per Hari</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sebaran alokasi jam mengajar guru pada setiap hari KBM
              </p>
            </div>
            <button
              onClick={() => onNavigateView('jadwal_mengajar')}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <span>Detail Plotting</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {hariList.map((hari) => {
              const count = jadwalPerHari[hari] || 0;
              const isToday = hari.toLowerCase() === currentDayName.toLowerCase();
              return (
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  key={hari}
                  className={`p-3.5 rounded-2xl border text-center transition ${
                    isToday
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 shadow-xs ring-1 ring-indigo-400/50'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60'
                  }`}
                >
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {hari}
                    {isToday && (
                      <span className="block text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">
                        Hari Ini
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-black text-slate-800 dark:text-white mt-1">
                    {count}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Sesi KBM
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Jadwal Hari Ini Preview */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Jadwal Mengajar Terdaftar Hari Ini ({currentDayName})
              </h4>
              <span className="text-[11px] font-semibold text-slate-500">
                {todaySchedules.length} Sesi Aktif
              </span>
            </div>

            {todaySchedules.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                Tidak ada jadwal KBM yang terplotting pada hari {currentDayName}.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {todaySchedules.slice(0, 8).map((sched, idx) => (
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    key={sched.id || idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-extrabold text-slate-800 dark:text-white truncate">
                        {cleanMapelName(sched.mataPelajaran)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{sched.guruNama}</span>
                        <span>•</span>
                        <span>{sched.kelasNama || sched.kelasId}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                        {sched.jamKe ? `Jam Ke-${sched.jamKe}` : sched.shift || 'KBM'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Panel Ringkasan Struktur Akademik */}
        <div className="space-y-6">
          <motion.div
            variants={cardItemVariants}
            initial="hidden"
            animate="show"
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
          >
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-500" />
              <span>Struktur &amp; Kelengkapan Kurikulum</span>
            </h3>

            <div className="space-y-3">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateView('master_mapel')}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-white">Mata Pelajaran</div>
                    <div className="text-[10px] text-slate-500">{totalMapel} Mata Pelajaran Terdaftar</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateView('master_jurusan')}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-white">Program Keahlian</div>
                    <div className="text-[10px] text-slate-500">{jurusanList.length} Kompetensi Keahlian</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateView('jadwal_shift')}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-300">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-white">Konfigurasi Jam &amp; Shift</div>
                    <div className="text-[10px] text-slate-500">
                      Pagi: {appData.shiftConfig?.pagiTime || '06.30 - 12.00'} • Siang: {appData.shiftConfig?.siangTime || '13.00 - 16.50'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateView('hari_libur')}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-white">Kalender &amp; Hari Libur</div>
                    <div className="text-[10px] text-slate-500">{(appData.hariLibur || []).length} Hari Libur Terjadwal</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
