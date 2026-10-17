import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  BookOpenCheck,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Search,
  Plus,
  Trash2,
  Edit,
  Printer,
  Download,
  Sparkles,
  Filter,
  Check,
  X,
  ChevronRight,
  Info,
  FileSpreadsheet,
  Layers,
  GraduationCap,
  UserCheck,
  RefreshCw,
  Send,
  Table2,
  FileText,
  Sun,
  Sunset,
  User,
  Save,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckSquare
} from 'lucide-react';
import {
  AppData,
  UserSession,
  AbsensiMengajarGuruItem,
  SiswaPresensiSesiGuru,
  JadwalMengajarGuru,
  ViewType,
  Siswa,
  Kelas,
  WaliKelas
} from '../../types';
import { PageHeader } from '../common/UIComponents';
import {
  getTodayString,
  formatDateIndo,
  getIndonesianDayName,
  cleanMapelName,
  addAuditLog
} from '../../utils/helpers';

interface PresensiKbmGuruViewProps {
  appData: AppData;
  currentUser: UserSession;
  readOnly?: boolean;
  onUpdateAppData: (updated: AppData) => void;
  onOpenModal: (title: string, content: React.ReactNode) => void;
  onCloseModal: () => void;
  onConfirmModal: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigateView?: (view: ViewType) => void;
}

export const PresensiKbmGuruView: React.FC<PresensiKbmGuruViewProps> = ({
  appData,
  currentUser,
  readOnly = false,
  onUpdateAppData,
  onOpenModal,
  onCloseModal,
  onConfirmModal,
  onShowToast,
  onNavigateView
}) => {
  const [activeTab, setActiveTab] = useState<'mengabsen' | 'riwayat_tabel'>('mengabsen');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [selectedGuruUsername, setSelectedGuruUsername] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterKelasId, setFilterKelasId] = useState<string>('all');

  // Modal states
  const [activeSession, setActiveSession] = useState<{
    jadwal: JadwalMengajarGuru;
    existingLog?: AbsensiMengajarGuruItem;
  } | null>(null);

  const [materiAjar, setMateriAjar] = useState<string>('');
  const [catatanGuru, setCatatanGuru] = useState<string>('');
  const [presensiSiswaMap, setPresensiSiswaMap] = useState<
    Record<string, { status: 'H' | 'S' | 'I' | 'A' | 'T' | 'K' | 'D' | ''; catatan: string }>
  >({});

  const [detailLog, setDetailLog] = useState<AbsensiMengajarGuruItem | null>(null);

  // User details
  const loggedUsername = (currentUser.data as any)?.username || (currentUser.data as any)?.nama || '';
  const loggedNama = (currentUser.data as any)?.nama || '';

  // List of all teachers
  const listGuru = useMemo(() => {
    return (appData.waliKelas || []).filter((w) => w.nama);
  }, [appData.waliKelas]);

  // Determine current active teacher
  useEffect(() => {
    if (selectedGuruUsername) return;

    // If logged in user is a teacher
    const loggedTeacher = listGuru.find(
      (g) => g.username?.toLowerCase() === loggedUsername?.toLowerCase() || g.nama === loggedNama
    );

    if (loggedTeacher) {
      setSelectedGuruUsername(loggedTeacher.username || loggedTeacher.nama);
    } else if (listGuru.length > 0) {
      setSelectedGuruUsername(listGuru[0].username || listGuru[0].nama);
    }
  }, [currentUser, listGuru, selectedGuruUsername, loggedUsername, loggedNama]);

  // Selected teacher object
  const currentGuru = useMemo(() => {
    return (
      listGuru.find(
        (g) =>
          g.username?.toLowerCase() === selectedGuruUsername?.toLowerCase() ||
          g.nama === selectedGuruUsername
      ) || listGuru[0]
    );
  }, [listGuru, selectedGuruUsername]);

  // Selected Day Name (e.g. 'Senin')
  const selectedDayName = useMemo(() => {
    return getIndonesianDayName(selectedDate);
  }, [selectedDate]);

  // Teacher's Schedule for the selected day
  const teacherSchedules = useMemo(() => {
    if (!currentGuru) return [];

    const allJadwal = appData.jadwalMengajar || [];
    const matched = allJadwal.filter((j) => {
      const matchTeacher =
        (j.guruUsername && j.guruUsername.toLowerCase() === currentGuru.username?.toLowerCase()) ||
        (j.guruNama && j.guruNama.toLowerCase() === currentGuru.nama?.toLowerCase()) ||
        (j.guruId && j.guruId === currentGuru.id);

      const matchHari = j.hari?.toLowerCase() === selectedDayName?.toLowerCase();
      return matchTeacher && matchHari;
    });

    // Sort by jam ke / jam mulai
    return matched.sort((a, b) => {
      const jamA = Array.isArray(a.jamKe) ? a.jamKe[0] : Number(a.jamKe || 0);
      const jamB = Array.isArray(b.jamKe) ? b.jamKe[0] : Number(b.jamKe || 0);
      return jamA - jamB;
    });
  }, [appData.jadwalMengajar, currentGuru, selectedDayName]);

  // Saved Logs for selected date
  const logsForSelectedDate = useMemo(() => {
    const allLogs = appData.presensiMengajarGuru || [];
    return allLogs.filter((l) => l.tanggal === selectedDate);
  }, [appData.presensiMengajarGuru, selectedDate]);

  // Check existing log for a specific schedule
  const getLogForSchedule = (jadwal: JadwalMengajarGuru) => {
    return logsForSelectedDate.find((l) => {
      if (l.jadwalId && l.jadwalId === jadwal.id) return true;
      return (
        l.kelasId === jadwal.kelasId &&
        (l.mataPelajaran === jadwal.mataPelajaran || cleanMapelName(l.mataPelajaran) === cleanMapelName(jadwal.mataPelajaran))
      );
    });
  };

  // Open Presensi KBM Form for a schedule
  const handleOpenAbsenSession = (jadwal: JadwalMengajarGuru) => {
    const existing = getLogForSchedule(jadwal);
    setActiveSession({ jadwal, existingLog: existing });

    // Find students for this class
    const siswaInKelas = (appData.siswa || []).filter((s) => s.kelasId === jadwal.kelasId && s.status !== 'tidak_aktif');

    // Key in main school attendance map: YYYY-MM-DD_kelasId
    const mainPresensiKey = `${selectedDate}_${jadwal.kelasId}`;
    const mainPresensiList = appData.presensi?.[mainPresensiKey] || [];

    const initialMap: Record<string, { status: 'H' | 'S' | 'I' | 'A' | 'T' | 'K' | 'D' | ''; catatan: string }> = {};

    siswaInKelas.forEach((s) => {
      // If there is an existing KBM log
      const existingStudentLog = existing?.presensiSiswa?.find((ps) => ps.siswaId === s.id);
      if (existingStudentLog) {
        initialMap[s.id] = {
          status: existingStudentLog.status || 'H',
          catatan: existingStudentLog.catatan || ''
        };
      } else {
        // Fallback to main daily attendance if present
        const mainItem = mainPresensiList.find((p) => p.siswaId === s.id);
        let defaultStatus: 'H' | 'S' | 'I' | 'A' | 'T' | 'K' | 'D' | '' = 'H';

        if (mainItem?.status) {
          if (['H', 'S', 'I', 'A', 'T', 'K', 'D'].includes(mainItem.status)) {
            defaultStatus = mainItem.status as any;
          }
        }

        initialMap[s.id] = {
          status: defaultStatus,
          catatan: mainItem?.catatan || ''
        };
      }
    });

    setPresensiSiswaMap(initialMap);
    setMateriAjar(existing?.materiAjar || '');
    setCatatanGuru(existing?.catatanGuru || '');
  };

  // Bulk action: Set all students status in form
  const handleSetAllStatus = (status: 'H' | 'S' | 'I' | 'A' | 'T' | 'K' | 'D') => {
    setPresensiSiswaMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((sId) => {
        next[sId] = { ...next[sId], status };
      });
      return next;
    });
  };

  // Bulk action: Match daily main attendance
  const handleSyncWithMainDailyPresensi = () => {
    if (!activeSession) return;

    const mainPresensiKey = `${selectedDate}_${activeSession.jadwal.kelasId}`;
    const mainPresensiList = appData.presensi?.[mainPresensiKey] || [];

    setPresensiSiswaMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((sId) => {
        const mainItem = mainPresensiList.find((p) => p.siswaId === sId);
        if (mainItem?.status && ['H', 'S', 'I', 'A', 'T', 'K', 'D'].includes(mainItem.status)) {
          next[sId] = {
            ...next[sId],
            status: mainItem.status as any,
            catatan: mainItem.catatan || next[sId]?.catatan || ''
          };
        }
      });
      return next;
    });

    onShowToast('Presensi KBM disesuaikan dengan Presensi Harian Sekolah!', 'info');
  };

  // Save Presensi KBM Kelas
  const handleSavePresensiKbm = () => {
    if (!activeSession || !currentGuru) return;

    const { jadwal, existingLog } = activeSession;
    const siswaInKelas = (appData.siswa || []).filter((s) => s.kelasId === jadwal.kelasId && s.status !== 'tidak_aktif');

    const presensiSiswaList: SiswaPresensiSesiGuru[] = siswaInKelas.map((s) => ({
      siswaId: s.id,
      siswaNama: s.nama,
      status: presensiSiswaMap[s.id]?.status || 'H',
      catatan: presensiSiswaMap[s.id]?.catatan || ''
    }));

    const jamPelajaranStr = Array.isArray(jadwal.jamKe)
      ? `Jam ke-${jadwal.jamKe.join(', ')} (${jadwal.jamMulai || ''} - ${jadwal.jamSelesai || ''})`
      : `Jam ke-${jadwal.jamKe || 1} (${jadwal.jamMulai || ''} - ${jadwal.jamSelesai || ''})`;

    const newLogItem: AbsensiMengajarGuruItem = {
      id: existingLog?.id || `pmg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      jadwalId: jadwal.id,
      guruUsername: currentGuru.username || currentGuru.nama,
      guruNama: currentGuru.nama,
      tanggal: selectedDate,
      hari: selectedDayName,
      kelasId: jadwal.kelasId,
      kelasNama: jadwal.kelasNama,
      mataPelajaran: jadwal.mataPelajaran,
      materiAjar: materiAjar.trim(),
      jamPelajaran: jamPelajaranStr,
      presensiSiswa: presensiSiswaList,
      catatanGuru: catatanGuru.trim(),
      createdAt: existingLog?.createdAt || new Date().toISOString()
    };

    const currentPmg = appData.presensiMengajarGuru || [];
    const filteredPmg = currentPmg.filter((l) => l.id !== newLogItem.id);
    const updatedPmg = [newLogItem, ...filteredPmg];

    let updatedAppData: AppData = {
      ...appData,
      presensiMengajarGuru: updatedPmg
    };

    updatedAppData = addAuditLog(
      updatedAppData,
      'Absen KBM Guru',
      `Menyimpan presensi KBM kelas ${jadwal.kelasNama} - ${jadwal.mataPelajaran} (${formatDateIndo(selectedDate)})`
    );

    onUpdateAppData(updatedAppData);
    setActiveSession(null);
    onShowToast(`Presensi KBM Kelas ${jadwal.kelasNama} berhasil disimpan!`, 'success');
  };

  // Delete a KBM Log
  const handleDeleteLog = (logId: string) => {
    onConfirmModal(
      'Hapus Log KBM Guru',
      'Apakah Anda yakin ingin menghapus data presensi KBM ini? Tindakan ini tidak dapat dibatalkan.',
      'danger',
      () => {
        const currentPmg = appData.presensiMengajarGuru || [];
        const updatedPmg = currentPmg.filter((l) => l.id !== logId);

        let updatedAppData: AppData = {
          ...appData,
          presensiMengajarGuru: updatedPmg
        };

        updatedAppData = addAuditLog(
          updatedAppData,
          'Hapus Log KBM Guru',
          `Menghapus data presensi KBM ID ${logId}`
        );

        onUpdateAppData(updatedAppData);
        onShowToast('Data log presensi KBM berhasil dihapus.', 'info');
      }
    );
  };

  // Filtered Riwayat Logs for Table view
  const filteredRiwayatLogs = useMemo(() => {
    let list = appData.presensiMengajarGuru || [];

    if (filterKelasId !== 'all') {
      list = list.filter((l) => l.kelasId === filterKelasId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.guruNama?.toLowerCase().includes(q) ||
          l.kelasNama?.toLowerCase().includes(q) ||
          l.mataPelajaran?.toLowerCase().includes(q) ||
          l.materiAjar?.toLowerCase().includes(q) ||
          l.tanggal?.includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [appData.presensiMengajarGuru, filterKelasId, searchQuery]);

  // Export Riwayat to Excel
  const handleExportExcel = () => {
    if (filteredRiwayatLogs.length === 0) {
      onShowToast('Tidak ada data untuk diexport!', 'warning');
      return;
    }

    const exportRows = filteredRiwayatLogs.map((l, index) => {
      const totalSiswa = l.presensiSiswa?.length || 0;
      const hadirCount = l.presensiSiswa?.filter((ps) => ps.status === 'H').length || 0;
      const sakitCount = l.presensiSiswa?.filter((ps) => ps.status === 'S').length || 0;
      const izinCount = l.presensiSiswa?.filter((ps) => ps.status === 'I').length || 0;
      const alphaCount = l.presensiSiswa?.filter((ps) => ps.status === 'A').length || 0;
      const terlambatCount = l.presensiSiswa?.filter((ps) => ps.status === 'T' || ps.status === 'K').length || 0;

      return {
        No: index + 1,
        Tanggal: l.tanggal,
        Hari: l.hari,
        Jam: l.jamPelajaran || '-',
        Guru: l.guruNama,
        Kelas: l.kelasNama,
        'Mata Pelajaran': l.mataPelajaran,
        'Materi Pembelajaran / Jurnal': l.materiAjar || '-',
        'Total Siswa': totalSiswa,
        Hadir: hadirCount,
        Sakit: sakitCount,
        Izin: izinCount,
        Alpha: alphaCount,
        Terlambat: terlambatCount,
        'Catatan Guru': l.catatanGuru || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Log Presensi KBM Guru');
    XLSX.writeFile(workbook, `Log_Presensi_KBM_Guru_${getTodayString()}.xlsx`);

    onShowToast('File Excel berhasil didownload!', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        icon={BookOpenCheck}
        title="Absen Mengajar Guru (KBM)"
        description="Fitur khusus pencatatan presensi siswa di kelas saat jam mengajar guru berlangsung, dilengkapi jurnal materi & tabel database log."
      />

      {/* Navigation Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('mengabsen')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'mengabsen'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Form Absen Kelas Guru</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('riwayat_tabel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'riwayat_tabel'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Table2 className="w-4 h-4" />
            <span>Tabel Database Log KBM</span>
            {appData.presensiMengajarGuru && appData.presensiMengajarGuru.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold">
                {appData.presensiMengajarGuru.length}
              </span>
            )}
          </button>
        </div>

        {/* Global Action Shortcuts */}
        <div className="flex items-center gap-2">
          {onNavigateView && (
            <button
              type="button"
              onClick={() => onNavigateView('jadwal_mengajar')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Kelola Jadwal Mengajar</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: FORM MENGABSEN KELAS GURU */}
      {activeTab === 'mengabsen' && (
        <div className="space-y-6">
          {/* Top Filter Bar: Select Teacher & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {/* Teacher Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Pilih Guru Mengajar</span>
              </label>
              <select
                value={selectedGuruUsername}
                onChange={(e) => setSelectedGuruUsername(e.target.value)}
                disabled={currentUser.role === 'guru'}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-80"
              >
                {listGuru.map((g) => (
                  <option key={g.id || g.username || g.nama} value={g.username || g.nama}>
                    {g.nama} {g.nip ? `(NIP: ${g.nip})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Tanggal Mengajar</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayString())}
                  className="px-3 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0 transition"
                >
                  Hari Ini
                </button>
              </div>
            </div>

            {/* Information Banner */}
            <div className="sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-blue-950 dark:text-blue-100 truncate">
                  {selectedDayName}, {formatDateIndo(selectedDate)}
                </p>
                <p className="text-[11px] text-blue-800 dark:text-blue-300">
                  {teacherSchedules.length} Sesi Jam Mengajar Terjadwal
                </p>
              </div>
            </div>
          </div>

          {/* List of Scheduled Classes for Teacher on Selected Day */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Jadwal Mengajar {currentGuru?.nama} (Hari {selectedDayName})</span>
              </h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total: {teacherSchedules.length} Sesi Kelas
              </span>
            </div>

            {teacherSchedules.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Tidak ada jadwal mengajar pada hari {selectedDayName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Guru {currentGuru?.nama} tidak memiliki alokasi jam mengajar di sistem pada hari {selectedDayName}. Pastikan data jadwal mengajar sudah diinput.
                  </p>
                </div>
                {onNavigateView && (
                  <button
                    type="button"
                    onClick={() => onNavigateView('jadwal_mengajar')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah / Edit Jadwal Mengajar</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacherSchedules.map((jadwal) => {
                  const existingLog = getLogForSchedule(jadwal);
                  const isCompleted = Boolean(existingLog);

                  // Count attendance status breakdown if completed
                  const hadirCount = existingLog?.presensiSiswa?.filter((p) => p.status === 'H').length || 0;
                  const sakitCount = existingLog?.presensiSiswa?.filter((p) => p.status === 'S').length || 0;
                  const izinCount = existingLog?.presensiSiswa?.filter((p) => p.status === 'I').length || 0;
                  const alphaCount = existingLog?.presensiSiswa?.filter((p) => p.status === 'A').length || 0;
                  const terlambatCount = existingLog?.presensiSiswa?.filter((p) => p.status === 'T' || p.status === 'K').length || 0;

                  return (
                    <div
                      key={jadwal.id}
                      className={`relative bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between ${
                        isCompleted
                          ? 'border-emerald-300 dark:border-emerald-900/60 ring-1 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Status Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            {Array.isArray(jadwal.jamKe)
                              ? `Jam Ke-${jadwal.jamKe.join(', ')}`
                              : `Jam Ke-${jadwal.jamKe || 1}`}
                          </span>

                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Sudah Diabsen</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Belum Diabsen</span>
                            </span>
                          )}
                        </div>

                        {/* Class & Subject */}
                        <div>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <h4 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                              Kelas {jadwal.kelasNama}
                            </h4>
                          </div>
                          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                            {jadwal.mataPelajaran}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Waktu: {jadwal.jamMulai || '07.30'} - {jadwal.jamSelesai || '09.00'}</span>
                          </p>
                        </div>

                        {/* Completed Summary or Jurnal Preview */}
                        {isCompleted && existingLog && (
                          <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                            {existingLog.materiAjar && (
                              <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 italic">
                                "{existingLog.materiAjar}"
                              </p>
                            )}

                            <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                H: {hadirCount}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                S: {sakitCount}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                I: {izinCount}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                A: {alphaCount}
                              </span>
                              {terlambatCount > 0 && (
                                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                  T: {terlambatCount}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAbsenSession(jadwal)}
                          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-extrabold transition shadow-xs ${
                            isCompleted
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          <BookOpenCheck className="w-4 h-4" />
                          <span>{isCompleted ? 'Edit Absen KBM Kelas' : 'Mulai Absen KBM Kelas'}</span>
                        </button>

                        {isCompleted && existingLog && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(existingLog.id)}
                            className="p-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-slate-700 transition"
                            title="Hapus Log KBM ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FORM MODAL: MENGABSEN KELAS KBM */}
      {activeSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white uppercase tracking-wider">
                  Absen KBM Guru - Kelas {activeSession.jadwal.kelasNama}
                </span>
                <h3 className="text-lg font-black tracking-tight">
                  {activeSession.jadwal.mataPelajaran}
                </h3>
                <p className="text-xs text-blue-100">
                  Guru: {currentGuru?.nama} • Tanggal: {formatDateIndo(selectedDate)} ({selectedDayName})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveSession(null)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {/* Jurnal / Topic of Lesson Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Jurnal / Materi Pembelajaran (KBM) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={materiAjar}
                    onChange={(e) => setMateriAjar(e.target.value)}
                    placeholder="Contoh: Bab 3 - Pemrograman Web dengan React JS & Tailwind"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Catatan Guru / Tugas Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={catatanGuru}
                    onChange={(e) => setCatatanGuru(e.target.value)}
                    placeholder="Catatan kelas, tugas dikumpulkan minggu depan, dsb."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quick Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Set Massal:</span>
                  <button
                    type="button"
                    onClick={() => handleSetAllStatus('H')}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    Set Semua Hadir (H)
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncWithMainDailyPresensi}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    Sesuai Presensi Harian Sekolah
                  </button>
                </div>

                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Total Siswa: {(appData.siswa || []).filter((s) => s.kelasId === activeSession.jadwal.kelasId && s.status !== 'tidak_aktif').length}
                </div>
              </div>

              {/* Student Attendance Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3 w-12 text-center">No</th>
                        <th className="p-3">NISN / Nama Siswa</th>
                        <th className="p-3 text-center">Presensi Harian</th>
                        <th className="p-3 text-center">Status KBM Kelas</th>
                        <th className="p-3">Catatan Individual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(appData.siswa || [])
                        .filter((s) => s.kelasId === activeSession.jadwal.kelasId && s.status !== 'tidak_aktif')
                        .map((siswa, idx) => {
                          const statusItem = presensiSiswaMap[siswa.id] || { status: 'H', catatan: '' };

                          // Reference daily main attendance
                          const mainPresensiKey = `${selectedDate}_${activeSession.jadwal.kelasId}`;
                          const mainList = appData.presensi?.[mainPresensiKey] || [];
                          const mainRecord = mainList.find((p) => p.siswaId === siswa.id);

                          return (
                            <tr key={siswa.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                              <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900 dark:text-white">{siswa.nama}</div>
                                <div className="text-[10px] text-slate-500">NISN: {siswa.nisn || '-'}</div>
                              </td>
                              <td className="p-3 text-center">
                                {mainRecord?.status ? (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                    mainRecord.status === 'H' ? 'bg-emerald-100 text-emerald-800' :
                                    mainRecord.status === 'S' ? 'bg-blue-100 text-blue-800' :
                                    mainRecord.status === 'I' ? 'bg-amber-100 text-amber-800' :
                                    mainRecord.status === 'A' ? 'bg-rose-100 text-rose-800' :
                                    'bg-purple-100 text-purple-800'
                                  }`}>
                                    {mainRecord.status}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-semibold">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                  {[
                                    { code: 'H', label: 'Hadir', bg: 'bg-emerald-600 text-white' },
                                    { code: 'S', label: 'Sakit', bg: 'bg-blue-600 text-white' },
                                    { code: 'I', label: 'Izin', bg: 'bg-amber-600 text-white' },
                                    { code: 'A', label: 'Alpha', bg: 'bg-rose-600 text-white' },
                                    { code: 'T', label: 'Terlambat', bg: 'bg-purple-600 text-white' }
                                  ].map((btn) => (
                                    <button
                                      key={btn.code}
                                      type="button"
                                      onClick={() =>
                                        setPresensiSiswaMap((prev) => ({
                                          ...prev,
                                          [siswa.id]: { ...prev[siswa.id], status: btn.code as any }
                                        }))
                                      }
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                        statusItem.status === btn.code
                                          ? `${btn.bg} shadow-xs scale-105`
                                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                      }`}
                                    >
                                      {btn.code}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={statusItem.catatan || ''}
                                  onChange={(e) =>
                                    setPresensiSiswaMap((prev) => ({
                                      ...prev,
                                      [siswa.id]: { ...prev[siswa.id], catatan: e.target.value }
                                    }))
                                  }
                                  placeholder="Catatan..."
                                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveSession(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSavePresensiKbm}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Presensi KBM Kelas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TABEL DATABASE LOG PRESENSI KBM GURU */}
      {activeTab === 'riwayat_tabel' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Table2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Log KBM
                </p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                  {(appData.presensiMengajarGuru || []).length}
                </h4>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  KBM Hari Ini
                </p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                  {logsForSelectedDate.length}
                </h4>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Kelas Terdata
                </p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                  {new Set((appData.presensiMengajarGuru || []).map((l) => l.kelasId)).size}
                </h4>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Guru Mengabsen
                </p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                  {new Set((appData.presensiMengajarGuru || []).map((l) => l.guruUsername)).size}
                </h4>
              </div>
            </div>
          </div>

          {/* Table Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari berdasarkan Guru, Kelas, Mapel, atau Materi..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={filterKelasId}
                onChange={(e) => setFilterKelasId(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100"
              >
                <option value="all">Semua Kelas</option>
                {(appData.kelas || []).map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition shadow-xs shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export File Excel</span>
            </button>
          </div>

          {/* Database Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5 w-12 text-center">No</th>
                    <th className="p-3.5">Tanggal & Jam</th>
                    <th className="p-3.5">Guru Mengajar</th>
                    <th className="p-3.5">Kelas & Mapel</th>
                    <th className="p-3.5">Materi Pembelajaran (Jurnal)</th>
                    <th className="p-3.5 text-center">Kehadiran Siswa</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRiwayatLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        Belum ada data log presensi KBM guru.
                      </td>
                    </tr>
                  ) : (
                    filteredRiwayatLogs.map((log, index) => {
                      const hadirCount = log.presensiSiswa?.filter((p) => p.status === 'H').length || 0;
                      const sakitCount = log.presensiSiswa?.filter((p) => p.status === 'S').length || 0;
                      const izinCount = log.presensiSiswa?.filter((p) => p.status === 'I').length || 0;
                      const alphaCount = log.presensiSiswa?.filter((p) => p.status === 'A').length || 0;
                      const terlambatCount = log.presensiSiswa?.filter((p) => p.status === 'T' || p.status === 'K').length || 0;

                      return (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="p-3.5 text-center font-bold text-slate-500">{index + 1}</td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {formatDateIndo(log.tanggal)}
                            </div>
                            <div className="text-[11px] text-slate-500">{log.jamPelajaran || '-'}</div>
                          </td>
                          <td className="p-3.5 font-extrabold text-blue-600 dark:text-blue-400">
                            {log.guruNama}
                          </td>
                          <td className="p-3.5">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              Kelas {log.kelasNama}
                            </span>
                            <div className="text-[11px] text-slate-500">{log.mataPelajaran}</div>
                          </td>
                          <td className="p-3.5 max-w-xs">
                            <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                              {log.materiAjar || '-'}
                            </p>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center gap-1 text-[10px] font-extrabold">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">H: {hadirCount}</span>
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">S: {sakitCount}</span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">I: {izinCount}</span>
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">A: {alphaCount}</span>
                              {terlambatCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">T: {terlambatCount}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDetailLog(log)}
                                className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
                                title="Lihat Rincian Presensi"
                              >
                                <Info className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLog(log.id)}
                                className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition"
                                title="Hapus Log KBM"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL RINCIAN MODAL */}
      {detailLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-5 bg-blue-600 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold">Detail Log KBM Kelas {detailLog.kelasNama}</h3>
                <p className="text-xs text-blue-100">
                  {detailLog.mataPelajaran} • {formatDateIndo(detailLog.tanggal)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailLog(null)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Guru Mengajar</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{detailLog.guruNama}</p>
                <p className="text-xs font-bold text-slate-500 uppercase mt-2">Materi Pembelajaran (Jurnal)</p>
                <p className="text-xs text-slate-800 dark:text-slate-200">{detailLog.materiAjar || '-'}</p>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-bold uppercase">
                    <tr>
                      <th className="p-2.5 w-10 text-center">No</th>
                      <th className="p-2.5">Nama Siswa</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(detailLog.presensiSiswa || []).map((ps, idx) => (
                      <tr key={ps.siswaId + idx}>
                        <td className="p-2.5 text-center">{idx + 1}</td>
                        <td className="p-2.5 font-bold">{ps.siswaNama}</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
                            {ps.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500">{ps.catatan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailLog(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 font-bold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
