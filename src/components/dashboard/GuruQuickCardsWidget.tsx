import React from 'react';
import {
  BookOpen,
  Clock,
  BarChart3,
  Calendar,
  AlertTriangle,
  Home,
  QrCode,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  ShieldOff,
  BookOpenCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppData, UserSession, ViewType } from '../../types';
import { cardContainerVariants, cardItemVariants } from '../common/UIComponents';
import { getEffectiveUserRoles, hasMenuAccess } from '../../utils/rolePermissionEngine';

interface GuruQuickCardsWidgetProps {
  appData: AppData;
  currentUser: UserSession;
  selectedDate: string;
  onNavigateView: (view: ViewType) => void;
  onNavigateToInput?: (kelasId?: string) => void;
}

export const GuruQuickCardsWidget: React.FC<GuruQuickCardsWidgetProps> = ({
  appData,
  currentUser,
  selectedDate,
  onNavigateView,
}) => {
  // Calculate effective roles for current user
  const effectiveRoles = React.useMemo(() => {
    return getEffectiveUserRoles(currentUser, appData);
  }, [currentUser, appData]);

  // Determine current day name from selectedDate (e.g. "Senin")
  const currentDayName = React.useMemo(() => {
    if (!selectedDate) return 'Senin';
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[dt.getDay()] || 'Senin';
    }
    return 'Senin';
  }, [selectedDate]);

  // Calculate teacher's schedules for today
  const teacherTodaySchedules = React.useMemo(() => {
    const rawJadwal = appData.jadwalMengajar || [];
    const userUn = String(currentUser.data?.username || '').toLowerCase().trim();
    const userNip = String((currentUser.data as any)?.nip || '').toLowerCase().trim();
    const userNama = String(currentUser.data?.nama || '').toLowerCase().trim();

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
  }, [appData.jadwalMengajar, currentUser, currentDayName]);

  // Calculate weekly total JP for this teacher
  const weeklyTotalJp = React.useMemo(() => {
    const rawJadwal = appData.jadwalMengajar || [];
    const userUn = String(currentUser.data?.username || '').toLowerCase().trim();
    const userNip = String((currentUser.data as any)?.nip || '').toLowerCase().trim();
    const userNama = String(currentUser.data?.nama || '').toLowerCase().trim();

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
  }, [appData.jadwalMengajar, currentUser]);

  // Teacher's attendance status today
  const teacherPresensiToday = React.useMemo(() => {
    const todayRecords = appData.presensiGuru ? appData.presensiGuru[selectedDate] : undefined;
    if (!todayRecords || !Array.isArray(todayRecords)) return null;

    const userUn = String(currentUser.data?.username || '').toLowerCase().trim();
    const userNip = String((currentUser.data as any)?.nip || '').toLowerCase().trim();
    const userNama = String(currentUser.data?.nama || '').toLowerCase().trim();

    return todayRecords.find((r) => {
      const rUn = String(r.guruUsername || '').toLowerCase().trim();
      const rNip = String(r.guruNip || '').toLowerCase().trim();
      const rNama = String(r.guruNama || '').toLowerCase().trim();
      return (userUn && rUn === userUn) || (userNip && rNip === userNip) || (userNama && rNama === userNama);
    });
  }, [appData.presensiGuru, selectedDate, currentUser]);

  // Teacher's monthly attendance percentage
  const teacherMonthlyRate = React.useMemo(() => {
    const currentMonthPrefix = selectedDate.substring(0, 7); // e.g. "2026-09"
    const userUn = String(currentUser.data?.username || '').toLowerCase().trim();
    const userNip = String((currentUser.data as any)?.nip || '').toLowerCase().trim();
    const userNama = String(currentUser.data?.nama || '').toLowerCase().trim();

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
  }, [appData.presensiGuru, selectedDate, currentUser]);

  // Total violations logged today
  const violationsTodayCount = React.useMemo(() => {
    return (appData.pelanggaran || []).filter((p) => p.tanggal === selectedDate).length;
  }, [appData.pelanggaran, selectedDate]);

  // Total home visit records
  const homeVisitsTotalCount = React.useMemo(() => {
    return (appData.homeVisits || []).length;
  }, [appData.homeVisits]);

  // Master List of Quick Cards
  const cards = React.useMemo(() => [
    {
      id: 'rekap_mengajar_per_kelas',
      title: 'Rekap Pengisian Presensi Kelas',
      description: 'Monitoring keterisian absensi rombel kelas hari ini',
      icon: BookOpenCheck,
      badgeText: 'Status Sudah / Belum Isi',
      badgeStyle: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      iconBg: 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-emerald-500/25',
      hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-600',
      view: 'rekap_pengisian_kelas' as ViewType,
      highlight: true,
    },
    {
      id: 'presensi_kbm_guru',
      title: 'Absen Mengajar Guru (KBM)',
      description: 'Input presensi kehadiran siswa per jam pelajaran mengajar & jurnal KBM',
      icon: BookOpen,
      badgeText: teacherTodaySchedules.length > 0 ? `${teacherTodaySchedules.length} Sesi Mengajar Hari Ini` : 'Tidak Ada Jadwal Hari Ini',
      badgeStyle: teacherTodaySchedules.length > 0 
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800' 
        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/25',
      hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-600',
      view: 'presensi_kbm_guru' as ViewType,
      highlight: true,
    },
    {
      id: 'jadwal_minggu_ini',
      title: 'Jadwal Mengajar Saya',
      description: 'Matriks jadwal mengajar mingguan & alokasi JP kelas',
      icon: Calendar,
      badgeText: `${weeklyTotalJp} JP Beban Mengajar`,
      badgeStyle: 'bg-sky-50 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sky-500/25',
      hoverBorder: 'hover:border-sky-400 dark:hover:border-sky-600',
      view: 'jadwal_minggu_ini' as ViewType,
      highlight: true,
    },
    {
      id: 'absen_harian_guru',
      title: 'Absen Harian Guru',
      description: 'Rekam presensi kehadiran & jam kerja mandiri guru',
      icon: Clock,
      badgeText: teacherPresensiToday
        ? teacherPresensiToday.status === 'H'
          ? `Hadir (${teacherPresensiToday.jamMasuk || '07:00'})`
          : teacherPresensiToday.status === 'S'
          ? 'Sakit'
          : teacherPresensiToday.status === 'I'
          ? 'Izin'
          : 'Terlambat'
        : 'Belum Presensi Hari Ini',
      badgeStyle: teacherPresensiToday
        ? teacherPresensiToday.status === 'H'
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/25',
      hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-600',
      view: 'absen_harian_guru' as ViewType,
    },
    {
      id: 'rekap_absensi_pribadi_guru',
      title: 'Rekap Absensi Pribadi Saya',
      description: 'Riwayat rekapitulasi presensi harian, jam masuk & log KBM pribadi',
      icon: BarChart3,
      badgeText: `${teacherMonthlyRate}% Kehadiran Bulan Ini`,
      badgeStyle: 'bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      iconBg: 'bg-gradient-to-br from-purple-600 to-violet-600 text-white shadow-purple-500/25',
      hoverBorder: 'hover:border-purple-400 dark:hover:border-purple-600',
      view: 'rekap_absensi_pribadi_guru' as ViewType,
      highlight: true,
    },
    {
      id: 'catatan_pelanggaran',
      title: 'Catatan Pelanggaran Siswa',
      description: 'Catat poin kedisiplinan & sanksi tata tertib siswa',
      icon: AlertTriangle,
      badgeText: violationsTodayCount > 0 ? `${violationsTodayCount} Catatan Hari Ini` : 'Input Kedisiplinan',
      badgeStyle: violationsTodayCount > 0
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      iconBg: 'bg-gradient-to-br from-rose-500 to-amber-600 text-white shadow-rose-500/25',
      hoverBorder: 'hover:border-rose-400 dark:hover:border-rose-600',
      view: 'catatan_pelanggaran' as ViewType,
    },
    {
      id: 'home_visit',
      title: 'Home Visit (Kunjungan Rumah)',
      description: 'Dokumentasi & hasil tindak lanjut kunjungan rumah siswa',
      icon: Home,
      badgeText: homeVisitsTotalCount > 0 ? `${homeVisitsTotalCount} Laporan Kunjungan` : 'Kunjungan Rumah',
      badgeStyle: 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/25',
      hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600',
      view: 'home_visit' as ViewType,
    },
    {
      id: 'absen_qr',
      title: 'Scan QR Presensi Siswa',
      description: 'Pemindai QR Code presensi siswa & kartu identitas',
      icon: QrCode,
      badgeText: 'Kamera / QR Scanner',
      badgeStyle: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white shadow-indigo-500/25',
      hoverBorder: 'hover:border-indigo-400 dark:hover:border-indigo-600',
      view: 'absen_qr' as ViewType,
    },
    {
      id: 'live_chat',
      title: 'Pesan & Live Chat Sekolah',
      description: 'Komunikasi langsung dengan sesama guru, wali & staf',
      icon: MessageSquare,
      badgeText: 'Live Chat Sekolah',
      badgeStyle: 'bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-teal-500/25',
      hoverBorder: 'hover:border-teal-400 dark:hover:border-teal-600',
      view: 'live_chat' as ViewType,
    },
  ], [teacherTodaySchedules.length, teacherPresensiToday, teacherMonthlyRate, weeklyTotalJp, violationsTodayCount, homeVisitsTotalCount]);

  // Filter cards strictly based on current user's menu access permissions
  const visibleCards = React.useMemo(() => {
    return cards.filter((card) => hasMenuAccess(effectiveRoles, card.view, appData));
  }, [cards, effectiveRoles, appData]);

  // If no cards are permitted for this user role, hide the widget or show notice
  if (visibleCards.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 text-center">
        <ShieldOff className="w-6 h-6 text-slate-400 mx-auto mb-1" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Tidak ada kartu aksi cepat yang tersedia sesuai hak akses peran Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            <span>Kartu Cepat Guru (Quick Action Cards)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Akses langsung 1-klik untuk tugas mengajar, presensi harian, jadwal &amp; administrasi KBM Anda
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Menampilkan {visibleCards.length} kartu aktif</span>
        </div>
      </div>

      {/* Responsive Grid of Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={cardContainerVariants}
        initial="hidden"
        animate="show"
      >
        {visibleCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.id}
              variants={cardItemVariants}
              whileHover={{ y: -4, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigateView(card.view)}
              className={`group relative bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between ${card.hoverBorder}`}
            >
              <div>
                {/* Top Header Row in Card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-2xl ${card.iconBg} flex items-center justify-center shrink-0 shadow-md transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="w-5.5 h-5.5" />
                  </div>
                  <div className="flex items-center gap-1">
                    {card.highlight && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Utama
                      </span>
                    )}
                    <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-theme-primary group-hover:text-white text-slate-400 dark:text-slate-500 flex items-center justify-center transition-colors">
                      <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-theme-primary transition-colors line-clamp-1">
                  {card.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                  {card.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

