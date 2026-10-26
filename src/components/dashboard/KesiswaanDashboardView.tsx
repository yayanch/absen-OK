import React from 'react';
import {
  ShieldAlert,
  Calendar,
  AlertTriangle,
  UserX,
  Home,
  ChevronRight,
  TrendingUp,
  FileText,
  UserCheck,
  Mail,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppData, UserSession, ViewType } from '../../types';
import { formatDateIndo } from '../../utils/helpers';
import { RoleQuickActions } from './RoleQuickActions';
import { StudentAttentionWidget } from './StudentAttentionWidget';
import { PageHeader, StatCard, cardContainerVariants, cardItemVariants } from '../common/UIComponents';

interface KesiswaanDashboardViewProps {
  appData: AppData;
  currentUser: UserSession;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  activeSiswa: any[];
  studentCumulativeStats: any[];
  hadirCount: number;
  sakitCount: number;
  izinCount: number;
  alpaCount: number;
  unrecordedClasses: any[];
  targetClasses: any[];
  setSelectedStudentDetail: (item: any) => void;
  onNavigateView: (view: ViewType) => void;
  onNavigateToInput?: (kelasId?: string) => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const KesiswaanDashboardView: React.FC<KesiswaanDashboardViewProps> = ({
  appData,
  currentUser,
  selectedDate,
  setSelectedDate,
  activeSiswa,
  studentCumulativeStats,
  hadirCount,
  sakitCount,
  izinCount,
  alpaCount,
  unrecordedClasses,
  targetClasses,
  setSelectedStudentDetail,
  onNavigateView,
  onNavigateToInput,
  onShowToast,
}) => {
  // Map student risk levels (Prioritas, Perlu Perhatian)
  const studentsWithRisk = React.useMemo(() => {
    return studentCumulativeStats
      .map((item) => {
        let statusRisk: 'Normal' | 'Perlu Perhatian' | 'Prioritas' = 'Normal';
        if (item.alfa >= 3 || item.totalTidakHadir >= 7) {
          statusRisk = 'Prioritas';
        } else if (item.alfa >= 1 || item.totalTidakHadir >= 3) {
          statusRisk = 'Perlu Perhatian';
        }
        return {
          ...item,
          statusRisk,
        };
      })
      .filter((item) => item.statusRisk !== 'Normal')
      .sort((a, b) => {
        const riskOrder = { Prioritas: 0, 'Perlu Perhatian': 1, Normal: 2 };
        if (riskOrder[a.statusRisk] !== riskOrder[b.statusRisk]) {
          return riskOrder[a.statusRisk] - riskOrder[b.statusRisk];
        }
        return b.alfa - a.alfa || b.totalTidakHadir - a.totalTidakHadir;
      });
  }, [studentCumulativeStats]);

  const topAlphaStudents = React.useMemo(() => {
    return studentsWithRisk.filter((s) => s.alfa > 0).slice(0, 5);
  }, [studentsWithRisk]);

  const isPiketKesiswaan = currentUser.role === 'piket_kesiswaan';
  const isPiketGuru = currentUser.role === 'piket_guru' || currentUser.role === 'piket';
  const isAnyPiket = isPiketKesiswaan || isPiketGuru;

  let titleText = "Pusat Perhatian Kesiswaan & BP/BK";
  let descText = "Monitoring siswa berisiko, ketidakhadiran kumulatif, pelanggaran, dan tindak lanjut home visit.";
  let badgeText = "Pusat Pembinaan & Kedisiplinan Siswa";

  if (isPiketKesiswaan) {
    titleText = "Dashboard Kerja Piket Kesiswaan";
    descText = "Pindai QR kehadiran siswa, kelola draf presensi kelas, dan catat poin pelanggaran kedisiplinan harian.";
    badgeText = "Sistem Kerja Piket Kesiswaan";
  } else if (isPiketGuru) {
    titleText = "Dashboard Kerja Guru Piket Harian";
    descText = "Kelola kehadiran rombel hari ini, bantu input absen darurat, scan QR siswa, dan catat insiden kedisiplinan.";
    badgeText = "Petugas Piket Guru Harian";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldAlert}
        title={titleText}
        description={descText}
        badge={badgeText}
        actions={
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer"
          />
        }
      />

      {/* Quick Actions Kesiswaan / Piket */}
      <RoleQuickActions
        role={currentUser.role}
        onNavigateView={onNavigateView}
        onNavigateToInput={onNavigateToInput}
      />

      {/* Statistik Utama Kesiswaan */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-5 gap-3.5"
        variants={cardContainerVariants}
        initial="hidden"
        animate="show"
      >
        <StatCard
          index={0}
          label="Hadir Hari Ini"
          value={hadirCount}
          icon={UserCheck}
          variant="success"
          onClick={!isPiketGuru ? () => onNavigateView('rekap_harian') : undefined}
        />
        <StatCard
          index={1}
          label="Belum Presensi"
          value={Math.max(0, activeSiswa.length - (hadirCount + sakitCount + izinCount + alpaCount))}
          subtitle={unrecordedClasses.length > 0 ? `${unrecordedClasses.length} rombel belum kirim` : undefined}
          icon={Users}
          variant="neutral"
        />
        <StatCard
          index={2}
          label="Sakit"
          value={sakitCount}
          icon={Calendar}
          variant="warning"
        />
        <StatCard
          index={3}
          label="Izin"
          value={izinCount}
          icon={Calendar}
          variant="info"
        />
        <StatCard
          index={4}
          label="Alpha / Tanpa Ket."
          value={alpaCount}
          icon={AlertTriangle}
          variant="danger"
        />
      </motion.div>

      {/* Jika bukan Piket Guru: Tampilkan Widget Siswa Perlu Perhatian, Pelanggaran, Home Visit & Alpha Tinggi */}
      {!isPiketGuru ? (
        <>
          {/* Widget Utama: Siswa Perlu Perhatian */}
          <motion.div variants={cardItemVariants} initial="hidden" animate="show">
            <StudentAttentionWidget
              students={studentsWithRisk}
              title="Siswa Perlu Perhatian & Pembinaan"
              subtitle="Daftar siswa terpantau berdasarkan akumulasi ketidakhadiran (Alpha / Sakit / Izin)"
              onOpenDetail={setSelectedStudentDetail}
              onNavigateView={onNavigateView}
            />
          </motion.div>

          {/* Layout Grid 2 Kolom: Pelanggaran & Home Visit & Alpha Tinggi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Catatan Pelanggaran Terbaru */}
            <motion.div
              variants={cardItemVariants}
              initial="hidden"
              animate="show"
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-theme-primary" />
                  <span>Pelanggaran Siswa Terbaru</span>
                </h3>
                <button
                  onClick={() => onNavigateView('catatan_pelanggaran')}
                  className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {!appData.pelanggaran || appData.pelanggaran.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">Belum ada catatan pelanggaran terbaru.</div>
              ) : (
                <div className="space-y-2.5">
                  {appData.pelanggaran.slice(0, 4).map((p: any) => {
                    const s = activeSiswa.find((item) => item.id === p.siswaId || item.nisn === p.siswaId);
                    return (
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        key={p.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white">{s?.nama || p.siswaNama || 'Siswa'}</div>
                          <div className="text-[10px] text-slate-400">{p.jenisPelanggaran || p.kategori} • {p.tanggal}</div>
                        </div>
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-extrabold rounded-lg text-[10px]">
                          +{p.poin || 10} Poin
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Right: Status Kunjungan Rumah (Home Visit) & Top Alpha */}
            <div className="space-y-6">
              <motion.div
                variants={cardItemVariants}
                initial="hidden"
                animate="show"
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                    <Home className="w-5 h-5 text-cyan-600" />
                    <span>Home Visit Yang Perlu Ditindaklanjuti</span>
                  </h3>
                  <button
                    onClick={() => onNavigateView('home_visit')}
                    className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {!appData.homeVisits || appData.homeVisits.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">Belum ada agenda home visit.</div>
                ) : (
                  <div className="space-y-2.5">
                    {appData.homeVisits.slice(0, 3).map((hv: any) => (
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        key={hv.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white">{hv.siswaNama}</div>
                          <div className="text-[10px] text-slate-400">Petugas: {hv.petugasNama || 'Tim BK'} • {hv.tanggal}</div>
                        </div>
                        <span className="px-2.5 py-1 bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 font-extrabold rounded-lg text-[10px]">
                          {hv.status || 'Direncanakan'}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              <motion.div
                variants={cardItemVariants}
                initial="hidden"
                animate="show"
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
              >
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <UserX className="w-4 h-4 text-rose-600" />
                  <span>Siswa Dengan Akumulasi Alpha Tinggi</span>
                </h3>
                <div className="space-y-2">
                  {topAlphaStudents.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-white">{item.siswa.nama}</span>
                      <span className="font-black text-rose-600 dark:text-rose-400">{item.alfa} Hari Alpha</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </>
      ) : (
        /* Tampilan Khusus Piket Guru: Logbook Piket Harian & Layanan Presensi KBM */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Buku Log Catatan Piket Harian */}
          <motion.div
            variants={cardItemVariants}
            initial="hidden"
            animate="show"
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <span>Buku Log Catatan Piket Harian</span>
              </h3>
            </div>

            {(!appData.catatanPiketHarian || appData.catatanPiketHarian.length === 0) ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/60 space-y-2">
                <p>Belum ada catatan kejadian atau izin tamu di Buku Piket hari ini.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {appData.catatanPiketHarian.slice(0, 4).map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start justify-between text-xs gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 dark:text-white line-clamp-1">{log.judul || log.keterangan || 'Catatan Piket'}</div>
                      <div className="text-[10px] text-slate-400">
                        {log.tanggal} • Oleh: {log.petugasNama || log.petugas || 'Petugas Piket'}
                      </div>
                    </div>
                    {log.kategori && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold rounded-lg text-[10px] shrink-0">
                        {log.kategori}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Card 2: Layanan Piket KBM & Presensi Guru */}
          <motion.div
            variants={cardItemVariants}
            initial="hidden"
            animate="show"
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
          >
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>Layanan Piket KBM & Presensi Guru</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pintasan cepat pengelolaan presensi guru mengajar terjadwal dan bantuan kehadiran rombel:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigateView('absen_harian_guru')}
                className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/60 rounded-2xl text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2 font-bold text-xs text-blue-950 dark:text-blue-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>Absen Harian Guru</span>
                </div>
                <div className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-1 font-medium">
                  Cek guru terjadwal & isi presensi KBM
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateView('absen_qr')}
                className="p-3.5 bg-teal-50/80 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200/80 dark:border-teal-800/60 rounded-2xl text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2 font-bold text-xs text-teal-950 dark:text-teal-100 group-hover:text-teal-600 dark:group-hover:text-teal-400">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  <span>Scan Presensi QR</span>
                </div>
                <div className="text-[11px] text-teal-600/80 dark:text-teal-400/80 mt-1 font-medium">
                  Pemindai barcode kartu siswa
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
