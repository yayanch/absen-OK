import React from 'react';
import { Clock, BookOpen, Users, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppData, UserSession, ViewType } from '../../types';
import { cleanMapelName, normalizeWeeklyShiftPeriods, getTodayString } from '../../utils/helpers';
import { determineKelasKelompok, parseJamKeList } from '../views/JadwalMengajarView';
import { cardContainerVariants, cardItemVariants } from '../common/UIComponents';

interface TeacherScheduleWidgetProps {
  appData: AppData;
  currentUser: UserSession;
  selectedDate: string;
  onNavigateToInput: (kelasId?: string) => void;
  onNavigateView: (view: ViewType) => void;
}

export const TeacherScheduleWidget: React.FC<TeacherScheduleWidgetProps> = ({
  appData,
  currentUser,
  selectedDate,
  onNavigateToInput,
  onNavigateView,
}) => {
  // Parse Indonesian Day Name accurately from selectedDate string (e.g. '2026-09-07' -> 'Senin')
  const currentDayName = React.useMemo(() => {
    if (!selectedDate) return 'Senin';
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m, d);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[dateObj.getDay()];
    }
    return 'Senin';
  }, [selectedDate]);

  // Find schedules associated with current teacher (or all for admin/kurikulum without teacher match)
  const teacherClasses = React.useMemo(() => {
    if (!appData.jadwalMengajar || !Array.isArray(appData.jadwalMengajar)) {
      return [];
    }

    const d = (currentUser.data || {}) as any;
    const rawUser = String((currentUser as any)?.username || d?.username || '').toLowerCase().trim();
    const uid = String(d?.id || '').trim();
    const uname = rawUser;
    const unip = String(d?.nip || '').toLowerCase().trim();
    const unama = String(d?.nama || '').toLowerCase().trim();

    const matchedWali = (appData.waliKelas || []).find((w) => {
      if (uid && w.id === uid) return true;
      if (uname && w.username && String(w.username).toLowerCase().trim() === uname) return true;
      if (unip && w.nip && String(w.nip).toLowerCase().trim() === unip) return true;
      if (unama && w.nama && String(w.nama).toLowerCase().trim() === unama) return true;
      return false;
    });

    const profId = (matchedWali?.id || uid).toLowerCase();
    const profUser = (matchedWali?.username || d?.username || rawUser || '').toLowerCase().trim();
    const profNip = (matchedWali?.nip || d?.nip || '').toLowerCase().trim();
    const profNama = (matchedWali?.nama || d?.nama || '').toLowerCase().trim();

    const canManageAll = currentUser.role === 'admin' || currentUser.role === 'kurikulum';

    // Filter schedules for current teacher (or all if admin/kurikulum and no specific teacher logged in)
    const teacherJadwal = appData.jadwalMengajar.filter((j: any) => {
      if (canManageAll && !matchedWali) return true;

      const jId = String(j.guruId || '').toLowerCase().trim();
      const jUser = String(j.guruUsername || '').toLowerCase().trim();
      const jNip = String(j.guruNip || '').toLowerCase().trim();
      const jNama = String(j.guruNama || '').toLowerCase().trim();

      if (profId && jId && profId === jId) return true;
      if (profUser && jUser && profUser === jUser) return true;
      if (profNip && jNip && profNip === jNip) return true;
      if (profUser && jNip && profUser === jNip) return true;
      if (profNip && jUser && profNip === jUser) return true;
      if (profNama && jNama && profNama === jNama) return true;
      return false;
    });

    // Strictly filter by currentDayName! NO FALLBACK to all days!
    const dayJadwal = teacherJadwal.filter(
      (j: any) => String(j.hari || '').toLowerCase().trim() === currentDayName.toLowerCase().trim()
    );

    // Resolve active shift for selectedDate's week
    const shiftPeriods = normalizeWeeklyShiftPeriods(appData.shiftConfig?.periods);
    const targetDateStr = selectedDate || getTodayString();
    const currentPeriod = shiftPeriods.find((p) => {
      const s = p.startDate.slice(0, 10);
      const e = p.endDate.slice(0, 10);
      return targetDateStr >= s && targetDateStr <= e;
    }) || shiftPeriods[0];

    const k1Type = currentPeriod?.kelompok1Type || 'pagi';
    const k2Type = currentPeriod?.kelompok2Type || 'siang';

    // Only keep schedules where the schedule's shift matches the active shift for that class's Kelompok in current week
    const todayJadwal = dayJadwal.filter((j: any) => {
      const targetK = (appData.kelas || []).find(
        (k: any) => k.id === j.kelasId || k.nama === j.kelasNama || k.id === j.kelasNama
      );
      const kelasNamaDisplay = targetK?.nama || j.kelasNama || j.kelasId || 'Kelas';
      const kelompok = determineKelasKelompok(kelasNamaDisplay);

      const activeShiftForKelompok = (kelompok === 1 ? k1Type : k2Type).toLowerCase().trim();
      const itemShift = String(j.shift || 'pagi').toLowerCase().trim();

      return itemShift === activeShiftForKelompok;
    });

    // Sort chronologically by shift ('Pagi' first, then 'Siang') and by start jam ke
    const getStartJam = (j: any) => {
      if (Array.isArray(j.jamKeList) && j.jamKeList.length > 0) return j.jamKeList[0];
      if (typeof j.jamKe === 'string') {
        const match = j.jamKe.match(/\d+/);
        if (match) return parseInt(match[0], 10);
      }
      return 1;
    };

    todayJadwal.sort((a: any, b: any) => {
      const shiftA = (a.shift || 'Pagi').toLowerCase() === 'siang' ? 2 : 1;
      const shiftB = (b.shift || 'Pagi').toLowerCase() === 'siang' ? 2 : 1;
      if (shiftA !== shiftB) return shiftA - shiftB;
      return getStartJam(a) - getStartJam(b);
    });

    return todayJadwal.map((j: any) => {
      // Accurately resolve target class object
      const targetK = (appData.kelas || []).find(
        (k: any) => k.id === j.kelasId || k.nama === j.kelasNama || k.id === j.kelasNama
      );

      const kelasNamaDisplay = targetK?.nama || j.kelasNama || j.kelasId || 'Kelas';
      const kelasIdDisplay = targetK?.id || j.kelasId;

      return {
        ...j,
        id: j.id,
        jamList: parseJamKeList(j.jamKe, j.jamKeList),
        jamDisplay: j.jamKe || (j.jamMulai && j.jamSelesai ? `${j.jamMulai} - ${j.jamSelesai}` : 'Shift Pagi'),
        kelasId: kelasIdDisplay,
        kelasNama: kelasNamaDisplay,
        mapel: cleanMapelName(j.mataPelajaran),
        targetK,
      };
    });
  }, [appData.jadwalMengajar, appData.waliKelas, appData.kelas, appData.shiftConfig, currentUser, currentDayName, selectedDate]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-theme-primary" />
            <span>Jadwal Mengajar Hari Ini ({currentDayName})</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar sesi mengajar &amp; status pengisian presensi kelas
          </p>
        </div>
        <button
          onClick={() => onNavigateView('jadwal_mengajar')}
          className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1 cursor-pointer"
        >
          Lihat Matriks Jadwal <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {teacherClasses.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Tidak ada jadwal mengajar pada hari {currentDayName}.
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Gunakan kalender dashboard untuk memilih tanggal KBM lain atau klik "Lihat Matriks Schedule" untuk melihat jadwal mingguan.
          </p>
        </div>
      ) : (
        <motion.div
          className="space-y-3"
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
        >
          {teacherClasses.map((item: any, idx: number) => {
            const targetK = item.targetK || (appData.kelas || []).find((k) => k.id === item.kelasId || k.nama === item.kelasNama);
            const classStudents = targetK
              ? (appData.siswa || []).filter((s) => s.kelasId === targetK.id && s.status !== 'tidak_aktif')
              : [];
            const totalSiswa = classStudents.length;

            const presensiKey = targetK ? `${selectedDate}_${targetK.id}` : `${selectedDate}_${item.kelasId}`;
            const recs = (appData.presensi || {})[presensiKey];
            const isFilled = Boolean(recs && Array.isArray(recs) && recs.length > 0);
            let hadir = 0;
            if (isFilled && Array.isArray(recs)) {
              recs.forEach((r) => {
                if (r.status === 'H' || (r.status as string) === 'hadir') hadir++;
              });
            }

            return (
              <motion.div
                variants={cardItemVariants}
                whileHover={{ scale: 1.01 }}
                key={item.id || idx}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-theme-primary/10 text-theme-primary text-[10px] font-black">
                      {item.jamDisplay ? `${item.shift === 'Siang' ? '🌤️ Siang • ' : '☀️ Pagi • '}${item.jamDisplay}` : 'Shift Pagi'}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {item.kelasNama}
                    </h4>
                    {item.guruNama && (currentUser.role === 'admin' || currentUser.role === 'kurikulum') && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                        {item.guruNama}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{item.mapel || 'Mata Pelajaran'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      {totalSiswa} Siswa
                    </span>
                    <span>•</span>
                    <span className={isFilled ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                      {isFilled ? `${hadir} Hadir (${totalSiswa - hadir} Belum)` : 'Belum Presensi'}
                    </span>
                  </div>

                  {/* Bulatan Jam 1-10 Proposional */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 mt-2">
                    <div className="flex items-center justify-between gap-1 w-full max-w-xs my-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                        const isScheduled = Array.isArray(item.jamList) && item.jamList.includes(n);
                        return isScheduled ? (
                          <div
                            key={n}
                            className="flex-1 max-w-[28px] aspect-square rounded-full bg-blue-600 text-white font-black text-[10px] sm:text-xs flex flex-col items-center justify-center border-2 border-blue-400 dark:border-blue-500 ring-2 ring-blue-300/80 dark:ring-blue-500/40 shadow-xs leading-none select-none"
                            title={`Jam ke-${n} (Mengajar)`}
                          >
                            <span className="leading-none pt-0.5">{n}</span>
                            <span className="w-1 h-1 rounded-full bg-white mt-0.5 shrink-0"></span>
                          </div>
                        ) : (
                          <div
                            key={n}
                            className="flex-1 max-w-[28px] aspect-square rounded-full bg-white dark:bg-slate-800 text-blue-500 dark:text-blue-400 font-bold text-[10px] sm:text-xs flex items-center justify-center border-2 border-blue-300 dark:border-blue-700/80 leading-none select-none opacity-80"
                            title={`Jam ke-${n}`}
                          >
                            <span>{n}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};
