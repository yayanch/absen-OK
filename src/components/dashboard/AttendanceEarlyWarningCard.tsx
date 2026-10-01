import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  Home,
  Info,
  Mail,
  MessageCircle,
  Phone,
  Printer,
  Search,
  Send,
  ShieldAlert,
  Sliders,
  Sparkles,
  Stethoscope,
  UserCheck,
  UserX,
  Users,
  X,
  Copy,
  Check,
  Calendar
} from 'lucide-react';
import { AppData, UserSession, Siswa, Kelas, ViewType } from '../../types';
import { formatDateIndo, getTodayString } from '../../utils/helpers';
import * as XLSX from 'xlsx';

export interface CumulativeStudentItem {
  siswa: Siswa;
  kelas?: Kelas;
  sakit: number;
  izin: number;
  alfa: number;
  kesiangan: number;
  dispensasi: number;
  hadir: number;
  totalTidakHadir: number;
  detailRecords: { tanggal: string; status: 'S' | 'I' | 'A' | 'K' | 'D' | 'H'; catatan?: string }[];
}

interface AttendanceEarlyWarningCardProps {
  appData: AppData;
  currentUser: UserSession;
  studentStats: CumulativeStudentItem[];
  targetClasses: Kelas[];
  onOpenDetail: (item: CumulativeStudentItem) => void;
  onNavigateView: (view: ViewType) => void;
  onUpdateAppData?: (updated: AppData) => void;
}

type ThresholdType = 'total' | 'alfa' | 'sakit' | 'izin';
type FollowUpStatus = 'belum' | 'wa_ortu' | 'panggilan_ortu' | 'home_visit' | 'selesai';

interface FollowUpRecord {
  status: FollowUpStatus;
  catatan?: string;
  updatedAt: string;
  updatedBy: string;
}

const LOCAL_STORAGE_FOLLOW_UP_KEY = 'presensi_follow_up_records';

export const AttendanceEarlyWarningCard: React.FC<AttendanceEarlyWarningCardProps> = ({
  appData,
  currentUser,
  studentStats,
  targetClasses,
  onOpenDetail,
  onNavigateView,
}) => {
  // Threshold state
  const [thresholdType, setThresholdType] = useState<ThresholdType>('total');
  const [thresholdValue, setThresholdValue] = useState<number>(3);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | 'kritis' | 'tinggi' | 'sedang'>('all');
  const [sortBy, setSortBy] = useState<'alfa' | 'total' | 'nama'>('alfa');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // WhatsApp template modal state
  const [activeWaStudent, setActiveWaStudent] = useState<CumulativeStudentItem | null>(null);
  const [waTemplateType, setWaTemplateType] = useState<'konfirmasi' | 'panggilan' | 'sakit'>('konfirmasi');
  const [customWaMessage, setCustomWaMessage] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Follow-up status persistence (local storage map keyed by siswa.id)
  const [followUpMap, setFollowUpMap] = useState<Record<string, FollowUpRecord>>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_FOLLOW_UP_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const handleUpdateFollowUp = (siswaId: string, status: FollowUpStatus) => {
    const updated: Record<string, FollowUpRecord> = {
      ...followUpMap,
      [siswaId]: {
        status,
        updatedAt: getTodayString(),
        updatedBy: (currentUser.data as any)?.nama || (currentUser.data as any)?.username || 'Petugas',
      },
    };
    setFollowUpMap(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_FOLLOW_UP_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Filter students based on threshold
  const flaggedStudents = useMemo(() => {
    return studentStats.filter((item) => {
      // Check threshold
      if (thresholdType === 'total') {
        if (item.totalTidakHadir < thresholdValue) return false;
      } else if (thresholdType === 'alfa') {
        if (item.alfa < thresholdValue) return false;
      } else if (thresholdType === 'sakit') {
        if (item.sakit < thresholdValue) return false;
      } else if (thresholdType === 'izin') {
        if (item.izin < thresholdValue) return false;
      }

      // Class filter
      if (selectedClassFilter !== 'all' && item.siswa.kelasId !== selectedClassFilter) {
        return false;
      }

      // Risk level filter
      const isKritis = item.alfa >= 3 || item.totalTidakHadir >= 5;
      const isTinggi = !isKritis && (item.alfa >= 2 || item.totalTidakHadir >= 4);
      const isSedang = !isKritis && !isTinggi;

      if (selectedRiskFilter === 'kritis' && !isKritis) return false;
      if (selectedRiskFilter === 'tinggi' && !isTinggi) return false;
      if (selectedRiskFilter === 'sedang' && !isSedang) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = String(searchQuery || '').toLowerCase();
        const matchName = item.siswa?.nama ? String(item.siswa.nama).toLowerCase().includes(q) : false;
        const matchNisn = item.siswa?.nisn ? String(item.siswa.nisn).toLowerCase().includes(q) : false;
        const matchKelas = item.kelas?.nama ? String(item.kelas.nama).toLowerCase().includes(q) : false;
        const matchOrtu = item.siswa?.namaOrangTua ? String(item.siswa.namaOrangTua).toLowerCase().includes(q) : false;
        if (!matchName && !matchNisn && !matchKelas && !matchOrtu) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'alfa') {
        if (b.alfa !== a.alfa) return b.alfa - a.alfa;
        return b.totalTidakHadir - a.totalTidakHadir;
      }
      if (sortBy === 'total') {
        if (b.totalTidakHadir !== a.totalTidakHadir) return b.totalTidakHadir - a.totalTidakHadir;
        return b.alfa - a.alfa;
      }
      return a.siswa.nama.localeCompare(b.siswa.nama);
    });
  }, [studentStats, thresholdType, thresholdValue, selectedClassFilter, selectedRiskFilter, searchQuery, sortBy]);

  // Overall counts for badges
  const totalKritisCount = useMemo(() => {
    return studentStats.filter((item) => item.alfa >= 3 || item.totalTidakHadir >= 5).length;
  }, [studentStats]);

  const totalHighAlfaCount = useMemo(() => {
    return studentStats.filter((item) => item.alfa >= 2).length;
  }, [studentStats]);

  // Generate WhatsApp message template
  const generateWaMessage = (item: CumulativeStudentItem, template: 'konfirmasi' | 'panggilan' | 'sakit') => {
    const namaOrtu = item.siswa.namaOrangTua || 'Bapak/Ibu Orang Tua / Wali';
    const namaSiswa = item.siswa.nama;
    const kelasNama = item.kelas?.nama || '-';
    const nisn = item.siswa.nisn || '-';
    const waliName = (currentUser.data as any)?.nama || 'Wali Kelas';

    if (template === 'panggilan') {
      return `*SURAT PANGGILAN ORANG TUA / WALI SISWA*
SMKN 6 GARUT

Yth. ${namaOrtu}
Wali dari: *${namaSiswa}* (NISN: ${nisn})
Kelas: *${kelasNama}*

Dengan hormat,
Sehubungan dengan akumulasi ketidakhadiran ananda di sekolah yang telah mencapai:
• *Alpa (Tanpa Keterangan): ${item.alfa} Hari*
• *Total Ketidakhadiran: ${item.totalTidakHadir} Hari*

Maka demi kelangsungan proses pendidikan ananda, kami mengundang Bapak/Ibu untuk hadir ke sekolah guna koordinasi dan pembinaan:
📅 Hari/Tanggal: Menyesuaikan waktu luang Bapak/Ibu (Mohon konfirmasi)
📍 Tempat: Ruang BP/BK / Ruang Guru SMKN 6 Garut
👥 Menemui: ${waliName} (Wali Kelas) & Tim BK

Mohon tanggapan atas pesan ini. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.

Hormat kami,
*${waliName}*
Wali Kelas ${kelasNama} SMKN 6 Garut`;
    }

    if (template === 'sakit') {
      return `*KONFIRMASI KESEHATAN SISWA*
SMKN 6 GARUT

Yth. ${namaOrtu}
Orang Tua / Wali dari: *${namaSiswa}* (Kelas: *${kelasNama}*)

Assalamu'alaikum Wr. Wb. / Salam sejahtera,
Kami dari pihak sekolah mengonfirmasi bahwa ananda *${namaSiswa}* tercatat telah izin sakit selama *${item.sakit} hari*.

Semoga ananda lekas pulih dan sehat kembali. Mohon izin mengonfirmasi perkembangan kondisi kesehatan ananda saat ini, dan apabila ada surat keterangan dokter mohon dapat dilampirkan foto/dokumennya kepada kami.

Terima kasih atas kerja sama dan informasinya.

Salam hormat,
*${waliName}*
Wali Kelas ${kelasNama} SMKN 6 Garut`;
    }

    // Default 'konfirmasi'
    return `*PEMBERITAHUAN KETIDAKHADIRAN SISWA*
SMKN 6 GARUT

Yth. ${namaOrtu}
Orang Tua / Wali dari: *${namaSiswa}* (Kelas: *${kelasNama}*)

Assalamu'alaikum Wr. Wb. / Salam sejahtera,
Kami dari pihak Wali Kelas / Sekolah SMKN 6 Garut menginformasikan rekapitulasi kehadiran ananda *${namaSiswa}* hingga saat ini tercatat tidak hadir sebanyak *${item.totalTidakHadir} hari*, dengan rincian:
• Alpa (Tanpa Keterangan): *${item.alfa} hari*
• Sakit: *${item.sakit} hari*
• Izin: *${item.izin} hari*

Kami mohon bantuan dan kerja sama Bapak/Ibu untuk mengawasi dan memotivasi ananda agar dapat mengikuti kegiatan belajar mengajar (KBM) dengan tertib.

Jika terdapat kendala atau hal yang perlu dikomunikasikan, Bapak/Ibu dapat menghubungi kami. Terima kasih atas perhatiannya.

Wassalamu'alaikum Wr. Wb.
*${waliName}*
Wali Kelas ${kelasNama} SMKN 6 Garut`;
  };

  const handleOpenWaModal = (item: CumulativeStudentItem) => {
    setActiveWaStudent(item);
    setWaTemplateType('konfirmasi');
    setCustomWaMessage(generateWaMessage(item, 'konfirmasi'));
    setIsCopied(false);
  };

  const handleChangeWaTemplate = (template: 'konfirmasi' | 'panggilan' | 'sakit') => {
    setWaTemplateType(template);
    if (activeWaStudent) {
      setCustomWaMessage(generateWaMessage(activeWaStudent, template));
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customWaMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    if (!activeWaStudent) return;
    const rawPhone = activeWaStudent.siswa.noWaOrangTua || activeWaStudent.siswa.noWa || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('0')) {
      formattedPhone = '62' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('62') && cleanPhone.length > 0) {
      formattedPhone = '62' + cleanPhone;
    }

    const encodedText = encodeURIComponent(customWaMessage);
    const url = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(url, '_blank');
    handleUpdateFollowUp(activeWaStudent.siswa.id, 'wa_ortu');
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = flaggedStudents.map((item, idx) => {
      const followUp = followUpMap[item.siswa.id]?.status || 'belum';
      const followUpLabels: Record<FollowUpStatus, string> = {
        belum: 'Belum Ada Tindakan',
        wa_ortu: 'Sudah Dihubungi WA Ortu',
        panggilan_ortu: 'Panggilan Orang Tua',
        home_visit: 'Jadwal Home Visit',
        selesai: 'Selesai / Terkonfirmasi',
      };
      return {
        'No': idx + 1,
        'NISN': item.siswa.nisn || '-',
        'Nama Siswa': item.siswa.nama,
        'Kelas': item.kelas?.nama || '-',
        'Alpa (A)': item.alfa,
        'Sakit (S)': item.sakit,
        'Izin (I)': item.izin,
        'Total Tidak Hadir': item.totalTidakHadir,
        'Nama Orang Tua / Wali': item.siswa.namaOrangTua || '-',
        'No. WA Ortu / Siswa': item.siswa.noWaOrangTua || item.siswa.noWa || '-',
        'Tingkat Risiko': item.alfa >= 3 || item.totalTidakHadir >= 5 ? 'Kritis' : item.alfa >= 2 || item.totalTidakHadir >= 4 ? 'Tinggi' : 'Sedang',
        'Status Penanganan': followUpLabels[followUp] || 'Belum Ada Tindakan',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Peringatan_Ketidakhadiran');
    XLSX.writeFile(wb, `Rekap_Peringatan_Ketidakhadiran_${getTodayString()}.xlsx`);
  };

  const getRiskBadge = (item: CumulativeStudentItem) => {
    if (item.alfa >= 3 || item.totalTidakHadir >= 5) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-xs">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>KRITIS</span>
        </span>
      );
    }
    if (item.alfa >= 2 || item.totalTidakHadir >= 4) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500 text-white shadow-xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>TINGGI</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        <Clock className="w-3.5 h-3.5" />
        <span>PERINGATAN</span>
      </span>
    );
  };

  const getFollowUpStatusBadge = (status?: FollowUpStatus) => {
    switch (status) {
      case 'wa_ortu':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <MessageCircle className="w-3 h-3" />
            <span>Sudah Dihubungi WA</span>
          </span>
        );
      case 'panggilan_ortu':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <Users className="w-3 h-3" />
            <span>Panggilan Ortu</span>
          </span>
        );
      case 'home_visit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Home className="w-3 h-3" />
            <span>Jadwal Home Visit</span>
          </span>
        );
      case 'selesai':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-900 text-white">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Selesai Ditangani</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3" />
            <span>Belum Ditangani</span>
          </span>
        );
    }
  };

  return (
    <div id="attendance-early-warning-section" className="mb-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg hover:scale-[1.02] overflow-hidden transition-all duration-300">
        {/* Card Header */}
        <div className="p-5 md:p-6 bg-gradient-to-r from-rose-50/70 via-amber-50/40 to-white dark:from-rose-950/30 dark:via-slate-900 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="relative p-3 rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-600/30 shrink-0">
                <Bell className="w-6 h-6 animate-bounce" />
                {flaggedStudents.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-900 text-[11px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs">
                    {flaggedStudents.length}
                  </span>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base md:text-lg tracking-tight">
                    Peringatan Dini & Sorotan Ketidakhadiran Siswa
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase tracking-wider">
                    Early Warning System
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium leading-relaxed max-w-3xl">
                  Notifikasi proaktif bagi <strong>Wali Kelas</strong> & <strong>BP/BK</strong> untuk mendeteksi dan menindaklanjuti siswa dengan akumulasi ketidakhadiran di atas ambang batas.
                </p>
              </div>
            </div>

            {/* Quick Action / Minimize Buttons */}
            <div className="flex items-center gap-2 self-end lg:self-center">
              {flaggedStudents.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Unduh Rekap Siswa Peringatan Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Export Excel</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title={isExpanded ? 'Sembunyikan Daftar' : 'Tampilkan Daftar'}
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-rose-100/60 dark:border-slate-800">
            <div className="p-3 bg-white/90 dark:bg-slate-800/80 rounded-2xl border border-rose-100 dark:border-slate-700 shadow-xs hover:scale-[1.02] hover:shadow-lg transition-all duration-200">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Perlu Ditangani</div>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                {flaggedStudents.length} <span className="text-xs font-normal text-slate-400">Siswa</span>
              </div>
            </div>
            <div className="p-3 bg-white/90 dark:bg-slate-800/80 rounded-2xl border border-rose-100 dark:border-slate-700 shadow-xs hover:scale-[1.02] hover:shadow-lg transition-all duration-200">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Tingkat Kritis (≥5 Hari / Alpa ≥3)</div>
              <div className="text-xl font-black text-rose-700 dark:text-rose-300 mt-0.5">
                {totalKritisCount} <span className="text-xs font-normal text-slate-400">Siswa</span>
              </div>
            </div>
            <div className="p-3 bg-white/90 dark:bg-slate-800/80 rounded-2xl border border-amber-100 dark:border-slate-700 shadow-xs hover:scale-[1.02] hover:shadow-lg transition-all duration-200">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Alpa Berulang (≥2 Hari)</div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {totalHighAlfaCount} <span className="text-xs font-normal text-slate-400">Siswa</span>
              </div>
            </div>
            <div className="p-3 bg-white/90 dark:bg-slate-800/80 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-xs hover:scale-[1.02] hover:shadow-lg transition-all duration-200">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Ambang Batas Aktif</div>
              <div className="text-xs font-bold text-blue-700 dark:text-blue-300 mt-1">
                {thresholdType === 'total' ? `Total Absen ≥ ${thresholdValue} Hari` :
                 thresholdType === 'alfa' ? `Khusus Alpa ≥ ${thresholdValue} Hari` :
                 thresholdType === 'sakit' ? `Khusus Sakit ≥ ${thresholdValue} Hari` : `Khusus Izin ≥ ${thresholdValue} Hari`}
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Bar (Ambang Batas & Quick Filter) */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Preset Buttons for Threshold */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" />
              <span>Ambang Batas:</span>
            </span>

            <button
              type="button"
              onClick={() => {
                setThresholdType('total');
                setThresholdValue(3);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                thresholdType === 'total' && thresholdValue === 3
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Standar (Total ≥ 3 Hari)
            </button>

            <button
              type="button"
              onClick={() => {
                setThresholdType('total');
                setThresholdValue(5);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                thresholdType === 'total' && thresholdValue === 5
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Kritis (Total ≥ 5 Hari)
            </button>

            <button
              type="button"
              onClick={() => {
                setThresholdType('alfa');
                setThresholdValue(2);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                thresholdType === 'alfa' && thresholdValue === 2
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Khusus Alpa (≥ 2 Hari)
            </button>

            <button
              type="button"
              onClick={() => {
                setThresholdType('sakit');
                setThresholdValue(3);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                thresholdType === 'sakit' && thresholdValue === 3
                  ? 'bg-theme-primary text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Khusus Sakit (≥ 3 Hari)
            </button>
          </div>

          {/* Custom value selector */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 shadow-xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mr-2">Batas Kustom:</span>
              <button
                type="button"
                onClick={() => setThresholdValue((prev) => Math.max(1, prev - 1))}
                className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                -
              </button>
              <span className="px-2 font-black text-xs text-slate-800 dark:text-white">
                {thresholdValue} Hari
              </span>
              <button
                type="button"
                onClick={() => setThresholdValue((prev) => prev + 1)}
                className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Filter and Search Controls within Early Warning */}
        {isExpanded && (
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari siswa / NISN / ortu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {targetClasses.length > 1 && (
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="all">Semua Kelas ({targetClasses.length})</option>
                  {targetClasses.map((k) => (
                    <option key={k.id} value={k.id}>
                      Kelas {k.nama}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <select
                value={selectedRiskFilter}
                onChange={(e) => setSelectedRiskFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="all">Semua Tingkat Risiko</option>
                <option value="kritis">Khusus Kritis (≥5 Hari / Alpa ≥3)</option>
                <option value="tinggi">Khusus Tinggi (4 Hari / Alpa 2)</option>
                <option value="sedang">Khusus Sedang (3 Hari)</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="alfa">Urutkan Alpa Terbanyak</option>
                <option value="total">Urutkan Total Absen Terbanyak</option>
                <option value="nama">Urutkan Nama Siswa (A-Z)</option>
              </select>
            </div>
          </div>
        )}

        {/* Content List */}
        {isExpanded && (
          <div className="p-4 md:p-5">
            {flaggedStudents.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-extrabold text-slate-800 dark:text-white text-base">
                  Kondisi Kehadiran Terjaga Sangat Baik!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1 font-medium">
                  Tidak ada siswa yang melebihi ambang batas ketidakhadiran ({thresholdType === 'total' ? `Total ≥ ${thresholdValue} hari` : `${thresholdType} ≥ ${thresholdValue} hari`}). Semua siswa terpantau aktif mengikuti kegiatan belajar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {flaggedStudents.map((item, idx) => {
                  const followUp = followUpMap[item.siswa.id]?.status || 'belum';
                  const rawPhone = item.siswa.noWaOrangTua || item.siswa.noWa || '';
                  const namaOrtu = item.siswa.namaOrangTua || 'Orang Tua / Wali';

                  return (
                    <div
                      key={item.siswa.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-4 shadow-xs hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between group"
                    >
                      <div>
                        {/* Top: Badges & Risk */}
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-700/70 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold rounded-lg text-xs border border-blue-100 dark:border-blue-900">
                              Kelas {item.kelas?.nama || '-'}
                            </span>
                          </div>
                          {getRiskBadge(item)}
                        </div>

                        {/* Student Name & NISN */}
                        <div className="mt-3">
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-sm leading-tight group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                            {item.siswa.nama}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                            <span>NISN: {item.siswa.nisn || '-'}</span>
                            <span>•</span>
                            <span className="font-sans">Gender: {item.siswa.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                          </div>
                        </div>

                        {/* Breakdown Metrics Grid */}
                        <div className="grid grid-cols-4 gap-1.5 text-center my-3 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                          <div className="bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-lg border border-rose-100 dark:border-rose-900/40">
                            <span className="block text-[9px] font-black uppercase text-rose-700 dark:text-rose-300">
                              Alpa (A)
                            </span>
                            <span className="text-sm font-black text-rose-700 dark:text-rose-300">
                              {item.alfa}
                            </span>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-100 dark:border-amber-900/40">
                            <span className="block text-[9px] font-black uppercase text-amber-700 dark:text-amber-300">
                              Sakit (S)
                            </span>
                            <span className="text-sm font-black text-amber-700 dark:text-amber-300">
                              {item.sakit}
                            </span>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-950/40 p-1.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                            <span className="block text-[9px] font-black uppercase text-blue-700 dark:text-blue-300">
                              Izin (I)
                            </span>
                            <span className="text-sm font-black text-blue-700 dark:text-blue-300">
                              {item.izin}
                            </span>
                          </div>
                          <div className="bg-slate-900 text-white p-1.5 rounded-lg">
                            <span className="block text-[9px] font-black uppercase text-slate-300">
                              Total
                            </span>
                            <span className="text-sm font-black text-white">
                              {item.totalTidakHadir} Hr
                            </span>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50 text-xs space-y-1">
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium">
                            <span className="text-[11px] text-slate-400">Orang Tua / Wali:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{namaOrtu}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                            <span className="text-[11px] text-slate-400">Kontak WA:</span>
                            {rawPhone ? (
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <MessageCircle className="w-3 h-3 inline" />
                                {rawPhone}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Belum ada nomor WA</span>
                            )}
                          </div>
                        </div>

                        {/* Follow Up Status Tracking */}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400 font-semibold">Tindak Lanjut:</span>
                          <select
                            value={followUp}
                            onChange={(e) => handleUpdateFollowUp(item.siswa.id, e.target.value as FollowUpStatus)}
                            className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                          >
                            <option value="belum">🔴 Belum Ditangani</option>
                            <option value="wa_ortu">🟢 Sudah Dihubungi WA</option>
                            <option value="panggilan_ortu">🟠 Panggilan Ortu</option>
                            <option value="home_visit">🔵 Jadwal Home Visit</option>
                            <option value="selesai">✅ Selesai Ditangani</option>
                          </select>
                        </div>
                      </div>

                      {/* Action Buttons Grid */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/70 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenWaModal(item)}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Notifikasi WA</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenDetail(item)}
                            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Rincian Absen</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => onNavigateView('home_visit')}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer border border-blue-100 dark:border-blue-900"
                            title="Buka Menu Kunjungan Rumah / Home Visit"
                          >
                            <Home className="w-3 h-3" />
                            <span>Home Visit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onNavigateView('catatan_pelanggaran')}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer border border-rose-100 dark:border-rose-900"
                            title="Buka Catatan Pelanggaran & Poin Kesiswaan"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Pelanggaran</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Kirim Pesan WhatsApp Proaktif */}
      {activeWaStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-fade-in flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                    Notifikasi WA Orang Tua / Wali
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                    {activeWaStudent.siswa.nama} (Kelas {activeWaStudent.kelas?.nama})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveWaStudent(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Recipient summary */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-800 dark:text-white">
                    Penerima: {activeWaStudent.siswa.namaOrangTua || 'Orang Tua / Wali Siswa'}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] mt-0.5">
                    No. Tujuan: {activeWaStudent.siswa.noWaOrangTua || activeWaStudent.siswa.noWa || 'Belum diisi'}
                  </div>
                </div>
                <div className="text-right font-bold text-slate-700 dark:text-slate-300">
                  <span className="text-rose-600">Alpa: {activeWaStudent.alfa}</span> •{' '}
                  <span className="text-amber-600">Sakit: {activeWaStudent.sakit}</span> •{' '}
                  <span className="text-blue-600">Izin: {activeWaStudent.izin}</span>
                </div>
              </div>

              {/* Template Selectors */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  Pilih Format Template Pesan Resmi:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChangeWaTemplate('konfirmasi')}
                    className={`p-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
                      waTemplateType === 'konfirmasi'
                        ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">1. Pemberitahuan</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">Rekapitulasi umum</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChangeWaTemplate('panggilan')}
                    className={`p-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
                      waTemplateType === 'panggilan'
                        ? 'bg-rose-50 dark:bg-rose-950 border-rose-500 text-rose-700 dark:text-rose-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">2. Panggilan Ortu</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">Tinggi Alpa / Kritis</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChangeWaTemplate('sakit')}
                    className={`p-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
                      waTemplateType === 'sakit'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">3. Konfirmasi Sakit</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">Surat dokter & pulih</div>
                  </button>
                </div>
              </div>

              {/* Editable Textarea Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Isi Pesan (Dapat Diedit):
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Teks</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={9}
                  value={customWaMessage}
                  onChange={(e) => setCustomWaMessage(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-white leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono shadow-inner"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveWaStudent(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
