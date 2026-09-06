import React from 'react';
import { Clock, BookOpen, Users, ClipboardCheck, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { AppData, UserSession, ViewType } from '../../types';
import { cleanMapelName } from '../../utils/helpers';

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
  // Find schedule associated with this teacher
  const teacherClasses = React.useMemo(() => {
    if (appData.jadwalMengajar && Array.isArray(appData.jadwalMengajar)) {
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

      const guruJadwal = appData.jadwalMengajar.filter((j: any) => {
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

      // Filter by today if there are schedules today
      const dayName = new Date(selectedDate || Date.now()).toLocaleDateString('id-ID', { weekday: 'long' });
      const todayJadwal = guruJadwal.filter((j) => j.hari.toLowerCase() === dayName.toLowerCase());
      const displayJadwal = todayJadwal.length > 0 ? todayJadwal : guruJadwal;

      if (displayJadwal.length > 0) {
        return displayJadwal.map((j) => ({
          ...j,
          id: j.id,
          jam: j.jamKe || (j.jamMulai && j.jamSelesai ? `${j.jamMulai} - ${j.jamSelesai}` : 'Shift Pagi'),
          kelasId: j.kelasId,
          kelasNama: j.kelasNama,
          mapel: cleanMapelName(j.mataPelajaran),
        }));
      }

      return [];
    }

    return [];
  }, [appData.jadwalMengajar, appData.waliKelas, currentUser, selectedDate]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-theme-primary" />
            <span>Jadwal Mengajar Hari Ini</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar sesi mengajar &amp; status pengisian presensi kelas
          </p>
        </div>
        <button
          onClick={() => onNavigateView('jadwal_mengajar')}
          className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1 cursor-pointer"
        >
          Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {teacherClasses.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum ada jadwal mengajar hari ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teacherClasses.slice(0, 4).map((item: any, idx: number) => {
            const kId = item.kelasId || item.id;
            const targetK = appData.kelas.find((k) => k.id === kId) || appData.kelas[0];
            const classStudents = appData.siswa.filter((s) => s.kelasId === targetK?.id && s.status !== 'tidak_aktif');
            const totalSiswa = classStudents.length;

            const presensiKey = `${selectedDate}_${targetK?.id}`;
            const recs = (appData.presensi || {})[presensiKey];
            const isFilled = Boolean(recs && Array.isArray(recs));
            let hadir = 0;
            if (isFilled && Array.isArray(recs)) {
              recs.forEach((r) => {
                if (r.status === 'H' || (r.status as string) === 'hadir') hadir++;
              });
            }

            return (
              <div
                key={idx}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-theme-primary/10 text-theme-primary text-[10px] font-black">
                      {item.jamKe ? `${item.shift === 'Siang' ? '🌤️ Siang • ' : '☀️ Pagi • '}${item.jamKe}` : item.jam || 'Shift Pagi'}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {targetK?.nama || item.kelasNama || 'Kelas'}
                    </h4>
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
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
                </div>

                <div className="shrink-0">
                  <button
                    onClick={() => onNavigateToInput(targetK?.id)}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-theme-primary hover:bg-theme-primary-dark text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>{isFilled ? 'Buka Presensi' : 'Isi Presensi Kelas'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
