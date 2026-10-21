import React from "react";
import { Clock, BookOpen, Users, CheckCircle2, ChevronRight, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { AppData, UserSession, ViewType, JadwalMengajarGuru, AbsensiMengajarGuruItem } from "../../types";
import { cleanMapelName, normalizeWeeklyShiftPeriods, getTodayString, addAuditLog, commitAppDataToServer } from "../../utils/helpers";
import { determineKelasKelompok, parseJamKeList } from "../views/JadwalMengajarView";
import { cardContainerVariants, cardItemVariants } from "../common/UIComponents";
import { ModalAbsenSiswaMengajar } from "../views/jadwal/ModalAbsenSiswaMengajar";

interface TeacherScheduleWidgetProps {
  appData: AppData;
  currentUser: UserSession;
  selectedDate: string;
  onNavigateToInput: (kelasId?: string) => void;
  onNavigateView: (view: ViewType) => void;
  onUpdateAppData?: (updated: AppData) => void;
  onShowToast?: (msg: string, type: "success" | "error" | "warning" | "info") => void;
}

export const TeacherScheduleWidget: React.FC<TeacherScheduleWidgetProps> = ({
  appData,
  currentUser,
  selectedDate,
  onNavigateToInput,
  onNavigateView,
  onUpdateAppData,
  onShowToast,
}) => {
  // Modal state for Absen Kelas & Jurnal KBM
  const [isAbsenSiswaModalOpen, setIsAbsenSiswaModalOpen] = React.useState<boolean>(false);
  const [selectedJadwalForAbsen, setSelectedJadwalForAbsen] = React.useState<JadwalMengajarGuru | null>(null);
  const [selectedExistingSesi, setSelectedExistingSesi] = React.useState<AbsensiMengajarGuruItem | null>(null);

  const handleOpenAbsenSiswa = (scheduleItem: any) => {
    setSelectedJadwalForAbsen(scheduleItem);
    const existing = (appData.presensiMengajarGuru || []).find(
      (p) => p.jadwalId === scheduleItem.id && p.tanggal === selectedDate
    );
    setSelectedExistingSesi(existing || null);
    setIsAbsenSiswaModalOpen(true);
  };

  const handleSaveSesiMengajar = async (sesi: AbsensiMengajarGuruItem) => {
    try {
      const res = await fetch("/api/presensi-mengajar/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sesi }),
      });
      const data = await res.json();
      if (data.success && data.sesi) {
        const existingList = appData.presensiMengajarGuru || [];
        const updatedList = existingList.some((s) => s.id === data.sesi.id)
          ? existingList.map((s) => (s.id === data.sesi.id ? data.sesi : s))
          : [data.sesi, ...existingList];
        const updatedAppData = addAuditLog(
          { ...appData, presensiMengajarGuru: updatedList },
          "Absensi Kelas Mengajar",
          `Guru ${data.sesi.guruNama} mengabsen kelas ${data.sesi.kelasNama} (${data.sesi.mataPelajaran})`
        );
        if (onUpdateAppData) onUpdateAppData(updatedAppData);
        return;
      }
    } catch (e) {
      console.warn("API save error, saving locally to appData", e);
    }
    const existingList = appData.presensiMengajarGuru || [];
    const updatedList = existingList.some((s) => s.id === sesi.id)
      ? existingList.map((s) => (s.id === sesi.id ? sesi : s))
      : [sesi, ...existingList];
    const updatedAppData = addAuditLog(
      { ...appData, presensiMengajarGuru: updatedList },
      "Absensi Kelas Mengajar",
      `Guru ${sesi.guruNama} mengabsen kelas ${sesi.kelasNama} (${sesi.mataPelajaran})`
    );
    if (onUpdateAppData) onUpdateAppData(updatedAppData);
    commitAppDataToServer(updatedAppData).catch(() => {});
  };

  // Parse Indonesian Day Name accurately from selectedDate string (e.g. "2026-09-07" -> "Senin")
  const currentDayName = React.useMemo(() => {
    if (!selectedDate) return "Senin";
    const parts = selectedDate.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      return days[dt.getDay()] || "Senin";
    }
    return "Senin";
  }, [selectedDate]);

  // Extract schedules matching currentUser (teacher username/nip/name) or all schedules if admin/kurikulum
  const teacherClasses = React.useMemo(() => {
    const rawJadwal = appData.jadwalMengajar || [];
    const userRole = currentUser.role;
    const isSpecialRole = userRole === "admin" || userRole === "kurikulum" || userRole === "staf_jadwal";

    // Filter by day
    const dayJadwal = rawJadwal.filter((j: any) => {
      if (!j.hari) return false;
      return String(j.hari).toLowerCase().trim() === currentDayName.toLowerCase().trim();
    });

    // Filter by teacher if normal teacher user
    const teacherFiltered = isSpecialRole
      ? dayJadwal
      : dayJadwal.filter((j: any) => {
          const userUn = String(currentUser.data?.username || "").toLowerCase().trim();
          const userNip = String(currentUser.data?.nip || "").toLowerCase().trim();
          const userNama = String(currentUser.data?.nama || "").toLowerCase().trim();

          const jUn = String(j.guruUsername || "").toLowerCase().trim();
          const jNip = String(j.guruNip || "").toLowerCase().trim();
          const jNama = String(j.guruNama || "").toLowerCase().trim();

          return (
            (userUn && jUn === userUn) ||
            (userNip && jNip === userNip) ||
            (userNama && jNama === userNama)
          );
        });

    // Normalize weekly shift rotation periods from shiftConfig
    const shiftPeriods = normalizeWeeklyShiftPeriods(appData.shiftConfig?.periods);
    const currentPeriod = shiftPeriods.find((p) => {
      if (!selectedDate) return false;
      return selectedDate >= p.startDate && selectedDate <= p.endDate;
    });

    const k1Type = currentPeriod?.kelompok1Type || "pagi";
    const k2Type = currentPeriod?.kelompok2Type || "siang";

    // Only keep schedules where the schedule shift matches the active shift for that class Kelompok in current week
    const todayJadwal = teacherFiltered.filter((j: any) => {
      const targetK = (appData.kelas || []).find(
        (k: any) => k.id === j.kelasId || k.nama === j.kelasNama || k.id === j.kelasNama
      );
      const kelasNamaDisplay = targetK?.nama || j.kelasNama || j.kelasId || "Kelas";
      const kelompok = determineKelasKelompok(kelasNamaDisplay);
      const activeShiftForKelompok = (kelompok === 1 ? k1Type : k2Type).toLowerCase().trim();
      const itemShift = String(j.shift || "pagi").toLowerCase().trim();
      return itemShift === activeShiftForKelompok;
    });

    // Sort chronologically by shift ("Pagi" first, then "Siang") and by start jam ke
    const getStartJam = (j: any) => {
      if (Array.isArray(j.jamKeList) && j.jamKeList.length > 0) return j.jamKeList[0];
      if (typeof j.jamKe === "string") {
        const match = j.jamKe.match(/\d+/);
        if (match) return parseInt(match[0], 10);
      }
      return 1;
    };

    todayJadwal.sort((a: any, b: any) => {
      const shiftA = (a.shift || "Pagi").toLowerCase() === "siang" ? 2 : 1;
      const shiftB = (b.shift || "Pagi").toLowerCase() === "siang" ? 2 : 1;
      if (shiftA !== shiftB) return shiftA - shiftB;
      return getStartJam(a) - getStartJam(b);
    });

    return todayJadwal.map((j: any) => {
      // Accurately resolve target class object
      const targetK = (appData.kelas || []).find(
        (k: any) => k.id === j.kelasId || k.nama === j.kelasNama || k.id === j.kelasNama
      );
      const kelasNamaDisplay = targetK?.nama || j.kelasNama || j.kelasId || "Kelas";
      const kelasIdDisplay = targetK?.id || j.kelasId;
      return {
        ...j,
        id: j.id,
        jamList: parseJamKeList(j.jamKe, j.jamKeList),
        jamDisplay: j.jamKe || (j.jamMulai && j.jamSelesai ? `${j.jamMulai} - ${j.jamSelesai}` : "Shift Pagi"),
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
          onClick={() => onNavigateView("jadwal_mengajar")}
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
              ? (appData.siswa || []).filter((s) => s.kelasId === targetK.id && s.status !== "tidak_aktif")
              : [];
            const totalSiswa = classStudents.length;
            const presensiKey = targetK ? `${selectedDate}_${targetK.id}` : `${selectedDate}_${item.kelasId}`;
            const recs = (appData.presensi || {})[presensiKey];
            const isFilled = Boolean(recs && Array.isArray(recs) && recs.length > 0);
            let hadir = 0;
            if (isFilled && Array.isArray(recs)) {
              recs.forEach((r) => {
                if (r.status === "H" || (r.status as string) === "hadir") hadir++;
              });
            }

            return (
              <motion.div
                variants={cardItemVariants}
                whileHover={{ scale: 1.01 }}
                key={item.id || idx}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-xs"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-theme-primary/10 text-theme-primary text-[10px] font-black">
                      {item.jamDisplay ? `${item.shift === "Siang" ? "🌤️ Siang • " : "☀️ Pagi • "}${item.jamDisplay}` : "Shift Pagi"}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {item.kelasNama}
                    </h4>
                    {item.guruNama && (currentUser.role === "admin" || currentUser.role === "kurikulum") && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                        {item.guruNama}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{item.mapel || "Mata Pelajaran"}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      {totalSiswa} Siswa
                    </span>
                    <span>•</span>
                    <span className={isFilled ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-600 dark:text-amber-400 font-bold"}>
                      {isFilled ? `${hadir} Hadir (${totalSiswa - hadir} Belum)` : "Belum Presensi"}
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

                {/* Tombol Absen Kelas (ModalAbsenSiswaMengajar) & Tombol Presensi Harian */}
                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-2 shrink-0 self-start md:self-center">
                  {(() => {
                    const todaySesi = (appData.presensiMengajarGuru || []).find(
                      (p) => p.jadwalId === item.id && p.tanggal === selectedDate
                    );
                    return (
                      <button
                        type="button"
                        onClick={() => handleOpenAbsenSiswa(item)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                          todaySesi
                            ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                        }`}
                        title={todaySesi ? "Edit Absensi Siswa Kelas Hari Ini" : "Buka Lembar Absen Kelas"}
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{todaySesi ? "Sudah Absen" : "Absen Kelas"}</span>
                      </button>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => onNavigateToInput(item.kelasId)}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                    title="Input Presensi Harian Siswa"
                  >
                    <span>Presensi Siswa</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Modal Absensi Siswa Kelas Mengajar Guru (Jurnal KBM Mandiri) */}
      <ModalAbsenSiswaMengajar
        isOpen={isAbsenSiswaModalOpen}
        onClose={() => {
          setIsAbsenSiswaModalOpen(false);
          setSelectedJadwalForAbsen(null);
          setSelectedExistingSesi(null);
        }}
        jadwal={selectedJadwalForAbsen}
        appData={appData}
        currentUser={currentUser}
        onSave={handleSaveSesiMengajar}
        onShowToast={onShowToast}
        existingSesi={selectedExistingSesi}
      />
    </div>
  );
};
