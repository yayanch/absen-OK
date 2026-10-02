import React, { useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Users,
  DoorOpen,
  Clock,
  Layers,
  Sparkles,
  CalendarDays,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppData, UserSession, ViewType } from '../../types';
import { formatDateIndo, cleanMapelName } from '../../utils/helpers';
import { RoleQuickActions } from './RoleQuickActions';
import { PageHeader, StatCard, cardContainerVariants, cardItemVariants } from '../common/UIComponents';

interface StafJadwalDashboardViewProps {
  appData: AppData;
  currentUser: UserSession;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  onNavigateView: (view: ViewType) => void;
}

export const StafJadwalDashboardView: React.FC<StafJadwalDashboardViewProps> = ({
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

  // Hitung metrik jadwal
  const totalMapel = mapelList.length;
  const totalJadwal = jadwalList.length;
  const totalGuru = guruList.length;
  const totalKelas = kelasList.length;

  // Total JP (Jam Pelajaran) terhitung
  const totalJp = useMemo(() => {
    return jadwalList.reduce((acc, j) => {
      const jp = Array.isArray(j.jamKeList) && j.jamKeList.length > 0 ? j.jamKeList.length : (j.jumlahJp || 2);
      return acc + jp;
    }, 0);
  }, [jadwalList]);

  // Rombel yang sudah memiliki jadwal
  const kelasWithSchedule = new Set(jadwalList.map((j) => j.kelasId));
  const rombelScheduledPercent = totalKelas > 0 
    ? Math.round((kelasWithSchedule.size / totalKelas) * 100) 
    : 0;

  // Guru yang sudah terplot dalam jadwal
  const guruWithSchedule = new Set(jadwalList.map((j) => j.guruNip || j.guruUsername || j.guruNama));

  // Distribusi jadwal per hari
  const hariList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const jadwalPerHari = useMemo(() => {
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
  const currentDayName = useMemo(() => {
    try {
      const parts = selectedDate.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[d.getDay()];
    } catch {
      return 'Senin';
    }
  }, [selectedDate]);

  const todaySchedules = useMemo(() => {
    return jadwalList.filter((j) => j.hari.toLowerCase() === currentDayName.toLowerCase());
  }, [jadwalList, currentDayName]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Calendar}
        title="Dashboard Pengelola Jadwal Mengajar"
        description="Portal operasional pemetaan, plotting jam pelajaran, dan monitoring jadwal KBM seluruh guru."
        badge={`Hari ${currentDayName} • ${formatDateIndo(selectedDate)}`}
        actions={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            />
            <button
              type="button"
              onClick={() => onNavigateView('jadwal_mengajar')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Kelola Jadwal</span>
            </button>
          </div>
        }
      />

      {/* Role Badge Info */}
      <div className="bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-indigo-500/10 border border-sky-200 dark:border-sky-900/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-sky-800 dark:text-sky-300">
                Hak Akses Khusus: Pengelola Jadwal (Non-Guru)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                Akses Penuh Edit Jadwal Guru
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Akun ini didesain khusus untuk mengelola, menambah, mengubah, dan memvalidasi seluruh jadwal mengajar guru tanpa hak akses data sensitif administratif sekolah.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigateView('jadwal_mengajar')}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 text-xs font-bold border border-sky-200 dark:border-sky-800 transition flex items-center gap-1.5 shrink-0 self-start sm:self-center shadow-2xs cursor-pointer"
        >
          <span>Buka Editor Jadwal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Aksi Cepat Tim Jadwal */}
      <RoleQuickActions role="staf_jadwal" onNavigateView={onNavigateView} />

      {/* Statistik Ringkasan */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3.5"
        variants={cardContainerVariants}
        initial="hidden"
        animate="show"
      >
        <StatCard
          index={0}
          label="Total Jadwal Terplotting"
          value={totalJadwal}
          subtitle={`${todaySchedules.length} jadwal pada hari ${currentDayName}`}
          icon={Calendar}
          variant="primary"
          onClick={() => onNavigateView('jadwal_mengajar')}
        />
        <StatCard
          index={1}
          label="Guru Terjadwal"
          value={guruWithSchedule.size}
          subtitle={`dari ${totalGuru} guru terdaftar`}
          icon={Users}
          variant="success"
          onClick={() => onNavigateView('jadwal_mengajar')}
        />
        <StatCard
          index={2}
          label="Kesiapan Rombel"
          value={`${rombelScheduledPercent}%`}
          subtitle={`${kelasWithSchedule.size} dari ${totalKelas} kelas aktif`}
          icon={DoorOpen}
          variant="warning"
          onClick={() => onNavigateView('jadwal_mengajar')}
        />
        <StatCard
          index={3}
          label="Total Jam Pelajaran"
          value={`${totalJp} JP`}
          subtitle={`Rata-rata ${Math.round(totalJp / (hariList.length || 1))} JP / hari`}
          icon={Clock}
          variant="neutral"
          onClick={() => onNavigateView('jadwal_mengajar')}
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
                <CalendarDays className="w-5 h-5 text-sky-500" />
                <span>Distribusi Jadwal KBM per Hari</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pemetaan sebaran jam mengajar guru dari Senin hingga Jumat
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateView('jadwal_mengajar')}
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Matriks Jadwal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {hariList.map((h) => {
              const count = jadwalPerHari[h] || 0;
              const isToday = h.toLowerCase() === currentDayName.toLowerCase();
              return (
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  key={h}
                  onClick={() => onNavigateView('jadwal_mengajar')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isToday
                      ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 shadow-xs ring-2 ring-sky-500/20'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black uppercase ${isToday ? 'text-sky-700 dark:text-sky-300' : 'text-slate-600 dark:text-slate-300'}`}>
                      {h}
                    </span>
                    {isToday && (
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-xl font-black text-slate-900 dark:text-white">{count}</span>
                    <span className="text-[10px] font-bold text-slate-400">sesi</span>
                  </div>
                  <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isToday ? 'bg-sky-500' : 'bg-slate-400 dark:bg-slate-500'}`}
                      style={{ width: `${totalJadwal > 0 ? Math.min(100, Math.round((count / (totalJadwal / 3 || 1)) * 100)) : 0}%` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Jadwal Hari Ini Preview */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Jadwal Mengajar Hari Ini ({currentDayName})</span>
              </h4>
              <span className="text-xs font-bold text-slate-500">
                {todaySchedules.length} Jadwal
              </span>
            </div>

            {todaySchedules.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                Tidak ada jadwal KBM yang terplot untuk hari {currentDayName}.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {todaySchedules.slice(0, 8).map((j) => {
                  const kelasObj = kelasList.find((k) => k.id === j.kelasId);
                  const displayJam = j.jamKeList && j.jamKeList.length > 0
                    ? `Jam ke-${j.jamKeList.join(', ')}`
                    : (j.jamMulai ? `${j.jamMulai} - ${j.jamSelesai}` : `${j.jumlahJp || 2} JP`);

                  return (
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      key={j.id}
                      onClick={() => onNavigateView('jadwal_mengajar')}
                      className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-sky-950/30 border border-slate-200/60 dark:border-slate-700/60 hover:border-sky-300 dark:hover:border-sky-800 transition cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                          {cleanMapelName(j.mataPelajaran)}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {j.guruNama || j.guruUsername}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {kelasObj?.nama || j.kelasNama || 'Kelas'}
                        </span>
                        <div className="text-[10px] font-bold text-slate-400 mt-1">
                          {displayJam}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Panel Informasi & Panduan Plotting */}
        <div className="space-y-4">
          <motion.div
            variants={cardItemVariants}
            initial="hidden"
            animate="show"
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
          >
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-500" />
              <span>Panduan Plotting Jadwal</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>1. Plotting Jadwal Guru</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Gunakan menu <strong>Jadwal Mengajar Guru</strong> untuk menambah atau mengedit jadwal KBM seluruh pendidik.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>2. Deteksi Bentrok Otomatis</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sistem otomatis mendeteksi bentrok jadwal jika guru atau kelas yang sama dijadwalkan pada jam yang bersamaan.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>3. Import Excel &amp; Matriks</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Dapat mengunggah file template Excel untuk mengisi seluruh jadwal semester secara massal.
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => onNavigateView('jadwal_mengajar')}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Buka Menu Jadwal Mengajar</span>
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
