import React, { useMemo, useState } from 'react';
import {
  Calendar,
  UserCheck,
  Clock,
  BookOpen,
  BarChart3,
  Sparkles,
  ShieldCheck,
  Building2,
  Users,
  Briefcase,
  Layers,
  ChevronRight,
  Filter,
  Eye,
  SlidersHorizontal,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppData, UserSession, ViewType } from '../../types';
import { formatDateIndo, normalizePresensiStatus } from '../../utils/helpers';
import { TeacherScheduleWidget } from './TeacherScheduleWidget';
import { RoleQuickActions } from './RoleQuickActions';
import { TeacherAdditionalRoleStatsWidget, TeacherRoleStatusInfo } from './TeacherAdditionalRoleStatsWidget';
import { PageHeader, StatCard, cardContainerVariants, cardItemVariants } from '../common/UIComponents';
import { getEffectiveUserRoles } from '../../utils/rolePermissionEngine';

interface GuruDashboardViewProps {
  appData: AppData;
  currentUser: UserSession;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  hadirCount?: number;
  totalStudents?: number;
  hadirPercentage?: string;
  recentLogs?: any[];
  targetClasses?: any[];
  waliStudents?: any[];
  studentCumulativeStats?: any[];
  sakitCount?: number;
  izinCount?: number;
  alpaCount?: number;
  kesianganCount?: number;
  trendData?: any[];
  unrecordedClasses?: any[];
  setSelectedStudentDetail?: (item: any) => void;
  onNavigateToInput: (kelasId?: string) => void;
  onNavigateView: (view: ViewType) => void;
  onUpdateAppData?: (updated: AppData) => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onOpenQuickActionSettings?: (roleKey?: string) => void;
}

export type TeacherStatusSimulationOption =
  | 'auto'
  | 'guru_biasa'
  | 'guru_wali'
  | 'guru_kurikulum'
  | 'guru_kesiswaan'
  | 'guru_multi_peran';

export const GuruDashboardView: React.FC<GuruDashboardViewProps> = ({
  appData,
  currentUser,
  selectedDate,
  setSelectedDate,
  hadirCount,
  totalStudents,
  hadirPercentage,
  recentLogs,
  targetClasses = [],
  waliStudents = [],
  studentCumulativeStats = [],
  onNavigateToInput,
  onNavigateView,
  onUpdateAppData,
  onShowToast,
  onOpenQuickActionSettings,
}) => {
  // Simulator mode for user testing / review of dynamic states
  const [statusSimulator, setStatusSimulator] = useState<TeacherStatusSimulationOption>('auto');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'tugas_tambahan' | 'mengajar' | 'wali' | 'kurikulum' | 'kesiswaan' | 'hubin'>('all');
  const [showSimulatorBar, setShowSimulatorBar] = useState<boolean>(false);

  // 1. Resolve Teacher Data & Natural Roles
  const teacherData = useMemo(() => {
    const username = currentUser.data?.username?.toLowerCase();
    const id = (currentUser.data as any)?.id;
    const nip = (currentUser.data as any)?.nip;
    if (!appData.waliKelas) return currentUser.data;
    const found = appData.waliKelas.find(
      (w) =>
        (id && w.id === id) ||
        (username && w.username?.toLowerCase() === username) ||
        (nip && w.nip && w.nip === nip)
    );
    return found || currentUser.data;
  }, [currentUser, appData.waliKelas]);

  const effectiveRoles = useMemo(() => getEffectiveUserRoles(currentUser, appData), [currentUser, appData]);

  // Extract all duties (tugasTambahan)
  const naturalDutiesList = useMemo(() => {
    const list: string[] = [];
    const tData = teacherData as any;
    if (tData?.tugasTambahanList && Array.isArray(tData.tugasTambahanList)) {
      list.push(...tData.tugasTambahanList);
    }
    if (typeof tData?.tugasTambahan === 'string') {
      list.push(...tData.tugasTambahan.split(',').map((s: string) => s.trim()).filter(Boolean));
    }
    return Array.from(new Set(list));
  }, [teacherData]);

  // Extract natural additional roles
  const naturalAdditionalRoles = useMemo(() => {
    const list: string[] = [];
    const tData = teacherData as any;
    if (Array.isArray(tData?.additionalRoles)) {
      list.push(...tData.additionalRoles.map((r: string) => r.toLowerCase()));
    }
    if (Array.isArray(currentUser.roles)) {
      list.push(...currentUser.roles.map((r: string) => r.toLowerCase()));
    }
    effectiveRoles.forEach((r) => list.push(r.toLowerCase()));
    return Array.from(new Set(list));
  }, [teacherData, currentUser.roles, effectiveRoles]);

  // Natural Homeroom Class
  const naturalAssignedClass = useMemo(() => {
    const tData = teacherData as any;
    if (!tData?.id && !tData?.username) {
      return targetClasses[0] || appData.kelas?.[0];
    }
    const found = appData.kelas?.find(
      (k) =>
        (tData.id && k.waliKelasId === tData.id) ||
        (tData.username && k.waliKelasId === tData.username)
    );
    return found || targetClasses[0] || appData.kelas?.[0];
  }, [teacherData, appData.kelas, targetClasses]);

  // 2. Synthesize Role Status (incorporating simulation options if active)
  const roleStatus: TeacherRoleStatusInfo = useMemo(() => {
    if (statusSimulator === 'guru_biasa') {
      return {
        isGuru: true,
        isGuruBiasa: true,
        hasWaliKelas: false,
        hasKurikulum: false,
        hasKesiswaan: false,
        hasHubin: false,
        hasStafJadwal: false,
        hasPiket: false,
        hasEkskul: false,
        allAssignedClasses: [],
        dutiesList: [],
        activeRolesList: [
          { key: 'guru', label: 'Guru Mata Pelajaran (Reguler)', color: 'indigo' },
        ],
      };
    }

    if (statusSimulator === 'guru_wali') {
      const cls = naturalAssignedClass || appData.kelas?.[0] || { id: 'K_1', nama: 'XII RPL 1' };
      return {
        isGuru: true,
        isGuruBiasa: false,
        hasWaliKelas: true,
        hasKurikulum: false,
        hasKesiswaan: false,
        hasHubin: false,
        hasStafJadwal: false,
        hasPiket: false,
        hasEkskul: false,
        assignedClass: cls,
        allAssignedClasses: [cls],
        dutiesList: ['Wali Kelas ' + cls.nama],
        activeRolesList: [
          { key: 'guru', label: 'Guru Mata Pelajaran', color: 'indigo' },
          { key: 'wali', label: `Wali Kelas (${cls.nama})`, color: 'emerald' },
        ],
      };
    }

    if (statusSimulator === 'guru_kurikulum') {
      return {
        isGuru: true,
        isGuruBiasa: false,
        hasWaliKelas: false,
        hasKurikulum: true,
        hasKesiswaan: false,
        hasHubin: false,
        hasStafJadwal: false,
        hasPiket: false,
        hasEkskul: false,
        allAssignedClasses: [],
        dutiesList: ['Wakil Kepala Bidang Kurikulum (WKS Kurikulum)'],
        activeRolesList: [
          { key: 'guru', label: 'Guru Mata Pelajaran', color: 'indigo' },
          { key: 'kurikulum', label: 'Wakil Kepala (Kurikulum)', color: 'blue' },
        ],
      };
    }

    if (statusSimulator === 'guru_kesiswaan') {
      return {
        isGuru: true,
        isGuruBiasa: false,
        hasWaliKelas: false,
        hasKurikulum: false,
        hasKesiswaan: true,
        hasHubin: false,
        hasStafJadwal: false,
        hasPiket: false,
        hasEkskul: false,
        allAssignedClasses: [],
        dutiesList: ['Wakil Kepala Bidang Kesiswaan (WKS Kesiswaan)'],
        activeRolesList: [
          { key: 'guru', label: 'Guru Mata Pelajaran', color: 'indigo' },
          { key: 'kesiswaan', label: 'Wakil Kepala (Kesiswaan)', color: 'purple' },
        ],
      };
    }

    if (statusSimulator === 'guru_multi_peran') {
      const cls = naturalAssignedClass || appData.kelas?.[0] || { id: 'K_1', nama: 'XII RPL 1' };
      return {
        isGuru: true,
        isGuruBiasa: false,
        hasWaliKelas: true,
        hasKurikulum: true,
        hasKesiswaan: false,
        hasHubin: false,
        hasStafJadwal: false,
        hasPiket: false,
        hasEkskul: false,
        assignedClass: cls,
        allAssignedClasses: [cls],
        dutiesList: ['Wali Kelas ' + cls.nama, 'Wakil Kepala Bidang Kurikulum'],
        activeRolesList: [
          { key: 'guru', label: 'Guru Mata Pelajaran', color: 'indigo' },
          { key: 'wali', label: `Wali Kelas (${cls.nama})`, color: 'emerald' },
          { key: 'kurikulum', label: 'Wakil Kepala (Kurikulum)', color: 'blue' },
        ],
      };
    }

    // Default 'auto' mode: Evaluate real user bindings
    const hasWali =
      naturalAdditionalRoles.includes('wali') ||
      Boolean((teacherData as any)?.id && appData.kelas?.some((k) => k.waliKelasId === (teacherData as any)?.id)) ||
      naturalDutiesList.some((d) => d.toLowerCase().includes('wali'));

    const hasKurikulum =
      naturalAdditionalRoles.includes('kurikulum') ||
      naturalDutiesList.some((d) => d.toLowerCase().includes('kurikulum') || d.toLowerCase().includes('wks kurikulum'));

    const hasKesiswaan =
      naturalAdditionalRoles.includes('kesiswaan') ||
      naturalDutiesList.some((d) => d.toLowerCase().includes('kesiswaan') || d.toLowerCase().includes('wks kesiswaan') || d.toLowerCase().includes('bp bk'));

    const hasHubin =
      naturalAdditionalRoles.includes('hubin') ||
      naturalDutiesList.some((d) => d.toLowerCase().includes('hubin') || d.toLowerCase().includes('humas') || d.toLowerCase().includes('hubungan industri'));

    const hasStafJadwal =
      naturalAdditionalRoles.includes('staf_jadwal') ||
      naturalDutiesList.some((d) => d.toLowerCase().includes('jadwal'));

    const hasPiket =
      naturalAdditionalRoles.includes('piket_guru') ||
      naturalAdditionalRoles.includes('piket_kesiswaan') ||
      Boolean(appData.petugasPiket?.some((p) => p.username === (teacherData as any)?.username && p.status !== 'nonaktif'));

    const hasEkskul =
      Boolean(appData.ekstrakurikuler?.some((e) => e.pembinaId === (teacherData as any)?.id || e.pembinaNama?.toLowerCase() === (teacherData as any)?.nama?.toLowerCase())) ||
      naturalDutiesList.some((d) => d.toLowerCase().includes('ekskul') || d.toLowerCase().includes('ekstrakurikuler'));

    const isGuruBiasa = !hasWali && !hasKurikulum && !hasKesiswaan && !hasHubin && !hasStafJadwal && !hasPiket && !hasEkskul;

    const activeRolesList: { key: string; label: string; color: string }[] = [];
    if (isGuruBiasa) {
      activeRolesList.push({ key: 'guru', label: 'Guru Mata Pelajaran (Reguler)', color: 'indigo' });
    } else {
      activeRolesList.push({ key: 'guru', label: 'Guru Mata Pelajaran', color: 'indigo' });
      if (hasWali) {
        activeRolesList.push({
          key: 'wali',
          label: `Wali Kelas (${naturalAssignedClass?.nama || 'Kelas Binaan'})`,
          color: 'emerald',
        });
      }
      if (hasKurikulum) {
        activeRolesList.push({ key: 'kurikulum', label: 'Wakil Kepala (Kurikulum)', color: 'blue' });
      }
      if (hasKesiswaan) {
        activeRolesList.push({ key: 'kesiswaan', label: 'Wakil Kepala (Kesiswaan)', color: 'purple' });
      }
      if (hasHubin) {
        activeRolesList.push({ key: 'hubin', label: 'Wakil Kepala (Hubin & Humas)', color: 'teal' });
      }
      if (hasPiket) {
        activeRolesList.push({ key: 'piket', label: 'Petugas Piket', color: 'amber' });
      }
      if (hasEkskul) {
        activeRolesList.push({ key: 'ekskul', label: 'Pembina Ekstrakurikuler', color: 'rose' });
      }
    }

    return {
      isGuru: true,
      isGuruBiasa,
      hasWaliKelas: hasWali,
      hasKurikulum,
      hasKesiswaan,
      hasHubin,
      hasStafJadwal,
      hasPiket,
      hasEkskul,
      assignedClass: naturalAssignedClass,
      allAssignedClasses: hasWali && naturalAssignedClass ? [naturalAssignedClass] : [],
      dutiesList: naturalDutiesList,
      activeRolesList,
    };
  }, [statusSimulator, naturalDutiesList, naturalAdditionalRoles, naturalAssignedClass, appData.kelas, appData.petugasPiket, appData.ekstrakurikuler, teacherData]);

  // 3. Teacher Personal Schedule & Attendance Stats
  const currentDayName = useMemo(() => {
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

  const teacherTodaySchedules = useMemo(() => {
    const rawJadwal = appData.jadwalMengajar || [];
    const userUn = String(teacherData?.username || '').toLowerCase().trim();
    const userNip = String((teacherData as any)?.nip || '').toLowerCase().trim();
    const userNama = String(teacherData?.nama || '').toLowerCase().trim();

    return rawJadwal.filter((j: any) => {
      const matchesDay = String(j.hari || '').toLowerCase().trim() === currentDayName.toLowerCase().trim();
      if (!matchesDay) return false;

      const jUn = String(j.guruUsername || '').toLowerCase().trim();
      const jNip = String(j.guruNip || '').toLowerCase().trim();
      const jNama = String(j.guruNama || '').toLowerCase().trim();

      return (
        (userUn && jUn === userUn) ||
        (userNip && jNip === userNip) ||
        (userNama && jNama === userNama)
      );
    });
  }, [appData.jadwalMengajar, teacherData, currentDayName]);

  const weeklyTotalJp = useMemo(() => {
    const rawJadwal = appData.jadwalMengajar || [];
    const userUn = String(teacherData?.username || '').toLowerCase().trim();
    const userNip = String((teacherData as any)?.nip || '').toLowerCase().trim();
    const userNama = String(teacherData?.nama || '').toLowerCase().trim();

    const mySchedules = rawJadwal.filter((j: any) => {
      const jUn = String(j.guruUsername || '').toLowerCase().trim();
      const jNip = String(j.guruNip || '').toLowerCase().trim();
      const jNama = String(j.guruNama || '').toLowerCase().trim();

      return (
        (userUn && jUn === userUn) ||
        (userNip && jNip === userNip) ||
        (userNama && jNama === userNama)
      );
    });

    return mySchedules.reduce((acc, j) => {
      if (typeof j.jumlahJp === 'number') return acc + j.jumlahJp;
      if (Array.isArray(j.jamKeList)) return acc + j.jamKeList.length;
      return acc + 1;
    }, 0);
  }, [appData.jadwalMengajar, teacherData]);

  const teacherPresensiToday = useMemo(() => {
    const todayRecords = appData.presensiGuru ? appData.presensiGuru[selectedDate] : undefined;
    if (!todayRecords || !Array.isArray(todayRecords)) return null;

    const userUn = String(teacherData?.username || '').toLowerCase().trim();
    const userNip = String((teacherData as any)?.nip || '').toLowerCase().trim();
    const userNama = String(teacherData?.nama || '').toLowerCase().trim();

    return todayRecords.find((r) => {
      const rUn = String(r.guruUsername || '').toLowerCase().trim();
      const rNip = String(r.guruNip || '').toLowerCase().trim();
      const rNama = String(r.guruNama || '').toLowerCase().trim();
      return (userUn && rUn === userUn) || (userNip && rNip === userNip) || (userNama && rNama === userNama);
    });
  }, [appData.presensiGuru, selectedDate, teacherData]);

  const teacherMonthlyRate = useMemo(() => {
    const currentMonthPrefix = selectedDate.substring(0, 7);
    const userUn = String(teacherData?.username || '').toLowerCase().trim();
    const userNip = String((teacherData as any)?.nip || '').toLowerCase().trim();
    const userNama = String(teacherData?.nama || '').toLowerCase().trim();

    let totalRecorded = 0;
    let totalHadir = 0;

    Object.keys(appData.presensiGuru || {}).forEach((dateKey) => {
      if (dateKey.startsWith(currentMonthPrefix)) {
        const records = appData.presensiGuru?.[dateKey];
        if (Array.isArray(records)) {
          const myRec = records.find((r) => {
            const rUn = String(r.guruUsername || '').toLowerCase().trim();
            const rNip = String(r.guruNip || '').toLowerCase().trim();
            const rNama = String(r.guruNama || '').toLowerCase().trim();
            return (userUn && rUn === userUn) || (userNip && rNip === userNip) || (userNama && rNama === userNama);
          });
          if (myRec && myRec.status) {
            totalRecorded++;
            if (myRec.status === 'H' || myRec.status === 'T' || myRec.status === 'D') {
              totalHadir++;
            }
          }
        }
      }
    });

    if (totalRecorded === 0) return 100;
    return Math.round((totalHadir / totalRecorded) * 100);
  }, [appData.presensiGuru, selectedDate, teacherData]);

  const showStandardSchedule = activeTabFilter === 'all' || activeTabFilter === 'mengajar';
  const showAdditionalSummary = !roleStatus.isGuruBiasa && activeTabFilter !== 'mengajar';

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------------------
          1. PAGE HEADER DENGAN STATUS GURU DINAMIS
      ------------------------------------------------------------- */}
      <PageHeader
        icon={Calendar}
        title={`Selamat Datang, ${currentUser.data.nama}`}
        description={
          roleStatus.isGuruBiasa
            ? 'Portal presensi harian, administrasi kelas mengajar, dan jadwal pelajaran Anda hari ini.'
            : `Akses terpadu tugas mengajar KBM serta tugas tambahan (${roleStatus.activeRolesList.map((r) => r.label).join(', ')}).`
        }
        badge={formatDateIndo(selectedDate)}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowSimulatorBar((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="Uji Tampilan Berdasarkan Status & Peran Tambahan Guru"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Simulasi Status Guru</span>
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            />
          </div>
        }
      />

      {/* -------------------------------------------------------------
          SIMULATOR / PREVIEW BAR (Untuk Memverifikasi Status Guru)
      ------------------------------------------------------------- */}
      <AnimatePresence>
        {showSimulatorBar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Uji Dinamis Status &amp; Peran Tambahan Guru:
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pilih opsi di bawah untuk melihat perbedaan kartu ringkasan secara instan.
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'auto', label: 'Otomatis (Data Asli Login)' },
                  { id: 'guru_biasa', label: '1. Guru Biasa (Standar)' },
                  { id: 'guru_wali', label: '2. Guru + Wali Kelas' },
                  { id: 'guru_kurikulum', label: '3. Guru + WKS Kurikulum' },
                  { id: 'guru_kesiswaan', label: '4. Guru + WKS Kesiswaan' },
                  { id: 'guru_multi_peran', label: '5. Guru Multi-Peran (Wali + WKS)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setStatusSimulator(opt.id as TeacherStatusSimulationOption);
                      if (onShowToast) {
                        onShowToast(`Mode simulasi beralih ke: ${opt.label}`, 'info');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      statusSimulator === opt.id
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-300 dark:hover:border-amber-700'
                    }`}
                  >
                    {statusSimulator === opt.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          2. STATUS & PERAN GURU BADGE BAR
      ------------------------------------------------------------- */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold">
            <Award className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Status Penugasan Pendidik:
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {roleStatus.activeRolesList.map((r, idx) => {
                const colorClasses: Record<string, string> = {
                  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
                  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800',
                  teal: 'bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border-teal-200 dark:border-teal-800',
                  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800',
                };
                const cls = colorClasses[r.color] || colorClasses.indigo;
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${cls}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{r.label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab / Filter Switcher if teacher holds additional roles */}
        {!roleStatus.isGuruBiasa && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 self-start md:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTabFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer shrink-0 ${
                activeTabFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Semua Ringkasan &amp; KBM
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('tugas_tambahan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer shrink-0 ${
                activeTabFilter === 'tugas_tambahan'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Tugas Tambahan Saja
            </button>

            {roleStatus.hasWaliKelas && (
              <button
                type="button"
                onClick={() => setActiveTabFilter('wali')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer shrink-0 ${
                  activeTabFilter === 'wali'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700'
                }`}
              >
                Wali Kelas
              </button>
            )}

            {roleStatus.hasKurikulum && (
              <button
                type="button"
                onClick={() => setActiveTabFilter('kurikulum')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer shrink-0 ${
                  activeTabFilter === 'kurikulum'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700'
                }`}
              >
                WKS Kurikulum
              </button>
            )}

            {roleStatus.hasKesiswaan && (
              <button
                type="button"
                onClick={() => setActiveTabFilter('kesiswaan')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer shrink-0 ${
                  activeTabFilter === 'kesiswaan'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-700'
                }`}
              >
                WKS Kesiswaan
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTabFilter('mengajar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer shrink-0 ${
                activeTabFilter === 'mengajar'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Jadwal &amp; KBM Saya
            </button>
          </div>
        )}
      </div>



      {/* -------------------------------------------------------------
          4. KARTU STATISTIK RINGKASAN TAMBAHAN (DINAMIS BERDASARKAN PERAN)
      ------------------------------------------------------------- */}
      {showAdditionalSummary && (
        <TeacherAdditionalRoleStatsWidget
          appData={appData}
          currentUser={currentUser}
          selectedDate={selectedDate}
          roleStatus={roleStatus}
          activeTabFilter={activeTabFilter === 'tugas_tambahan' ? 'all' : activeTabFilter}
          onNavigateView={onNavigateView}
          onNavigateToInput={onNavigateToInput}
          studentCumulativeStats={studentCumulativeStats}
          onShowToast={onShowToast}
        />
      )}

      {/* -------------------------------------------------------------
          5. KARTU CEPAT GURU (QUICK ACTION CARDS)
      ------------------------------------------------------------- */}
      {showStandardSchedule && (
        <div className="space-y-4">
          <RoleQuickActions
            role="guru"
            appData={appData}
            currentUser={currentUser}
            onNavigateView={onNavigateView}
            onNavigateToInput={onNavigateToInput}
            onOpenQuickActionSettings={onOpenQuickActionSettings}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          6. WIDGET UTAMA GURU: JADWAL MENGAJAR HARI INI & JURNAL KBM
      ------------------------------------------------------------- */}
      {showStandardSchedule && (
        <TeacherScheduleWidget
          appData={appData}
          currentUser={currentUser}
          selectedDate={selectedDate}
          onNavigateToInput={onNavigateToInput}
          onNavigateView={onNavigateView}
          onUpdateAppData={onUpdateAppData}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
