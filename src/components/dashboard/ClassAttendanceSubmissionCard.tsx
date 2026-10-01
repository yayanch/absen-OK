import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Send,
  Copy,
  ExternalLink,
  Edit3,
  Search,
  Filter,
  Users,
  GraduationCap,
  Building2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  MessageSquare,
  Check,
  PhoneCall,
  UserCheck,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { AppData, Kelas, Siswa, WaliKelas, ViewType } from '../../types';
import { formatDateIndo, cleanMapelName } from '../../utils/helpers';

interface ClassAttendanceSubmissionCardProps {
  appData: AppData;
  selectedDate: string;
  targetClasses: Kelas[];
  onNavigateToInput: (kelasId?: string) => void;
  onNavigateView?: (view: ViewType) => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  title?: string;
  subtitle?: string;
}

export interface ClassSubmissionStatus {
  kelas: Kelas;
  jurusanNama?: string;
  waliKelas?: WaliKelas;
  totalStudents: number;
  isSubmitted: boolean;
  recordsCount: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  kesiangan: number;
  dispensasi: number;
  attendanceRate: number; // percentage
  lastUpdated?: string;
}

export const ClassAttendanceSubmissionCard: React.FC<ClassAttendanceSubmissionCardProps> = ({
  appData,
  selectedDate,
  targetClasses,
  onNavigateToInput,
  onNavigateView,
  onShowToast,
  title = "Rekap Pengisian Presensi Kelas",
  subtitle,
}) => {
  // Filter States
  const [activeTab, setActiveTab] = useState<'all' | 'unsubmitted' | 'submitted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTingkat, setFilterTingkat] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isCopied, setIsCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Jurusan mapping
  const jurusanMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const j of appData.jurusan || []) {
      map.set(j.id, j.nama);
    }
    return map;
  }, [appData.jurusan]);

  // Active students mapping
  const activeStudentsByClass = useMemo(() => {
    const map = new Map<string, Siswa[]>();
    const allStudents = (appData.siswa || []).filter(
      (s) => s.status !== 'tidak_aktif' && (s as any).status !== 'nonaktif'
    );
    for (const s of allStudents) {
      const arr = map.get(s.kelasId) || [];
      arr.push(s);
      map.set(s.kelasId, arr);
    }
    return map;
  }, [appData.siswa]);

  // Wali kelas mapping
  const waliKelasMap = useMemo(() => {
    const map = new Map<string, WaliKelas>();
    for (const w of appData.waliKelas || []) {
      map.set(w.id, w);
    }
    return map;
  }, [appData.waliKelas]);

  // Compute status for all target classes
  const classStatuses: ClassSubmissionStatus[] = useMemo(() => {
    return (targetClasses || [])
      .filter((k): k is Kelas => Boolean(k && k.id))
      .map((k) => {
        // Find wali kelas
        const wali = k.waliKelasId ? waliKelasMap.get(k.waliKelasId) : undefined;
        const students = activeStudentsByClass.get(k.id) || [];
        const totalStudents = students.length;
        const jurNama = k.jurusanId ? (jurusanMap.get(k.jurusanId) || (k as any).jurusan || '') : ((k as any).jurusan || '');

        // Presensi records for this class & date
        const presensiKey = `${selectedDate}_${k.id}`;
        const records = appData.presensi ? appData.presensi[presensiKey] : undefined;
        const isSubmitted = Boolean(records && Array.isArray(records) && records.length > 0);

      let hadir = 0;
      let sakit = 0;
      let izin = 0;
      let alpa = 0;
      let kesiangan = 0;
      let dispensasi = 0;
      let lastUpdated: string | undefined = undefined;

      if (isSubmitted && Array.isArray(records)) {
        for (const r of records) {
          const st = String(r.status || '').toUpperCase();
          if (st === 'H' || st === 'HADIR') {
            hadir++;
          } else if (st === 'S' || st === 'SAKIT') {
            sakit++;
          } else if (st === 'I' || st === 'IZIN') {
            izin++;
          } else if (st === 'A' || st === 'ALPA' || st === 'ALFA') {
            alpa++;
          } else if (st === 'T' || st === 'TERLAMBAT' || st === 'KESIANGAN') {
            kesiangan++;
          } else if (st === 'D' || st === 'DISPENSASI') {
            dispensasi++;
          }

          if ((r as any).updatedAt) {
            lastUpdated = (r as any).updatedAt;
          } else if ((r as any).createdAt && !lastUpdated) {
            lastUpdated = (r as any).createdAt;
          }
        }
      }

      const effectivePresent = hadir + kesiangan + dispensasi;
      const attendanceRate = totalStudents > 0 ? Math.round((effectivePresent / totalStudents) * 100) : 0;

      return {
        kelas: k,
        jurusanNama: jurNama,
        waliKelas: wali,
        totalStudents,
        isSubmitted,
        recordsCount: Array.isArray(records) ? records.length : 0,
        hadir,
        sakit,
        izin,
        alpa,
        kesiangan,
        dispensasi,
        attendanceRate,
        lastUpdated,
      };
    });
  }, [targetClasses, waliKelasMap, activeStudentsByClass, appData.presensi, selectedDate]);

  // Aggregate Metrics
  const totalClassesCount = classStatuses.length;
  const submittedClasses = useMemo(() => classStatuses.filter((c) => c.isSubmitted), [classStatuses]);
  const unsubmittedClasses = useMemo(() => classStatuses.filter((c) => !c.isSubmitted), [classStatuses]);
  const submittedCount = submittedClasses.length;
  const unsubmittedCount = unsubmittedClasses.length;
  const submissionPercentage = totalClassesCount > 0 ? Math.round((submittedCount / totalClassesCount) * 100) : 0;

  // Filtered List based on tab, search, tingkat
  const filteredList = useMemo(() => {
    return classStatuses.filter((item) => {
      // Tab filter
      if (activeTab === 'submitted' && !item.isSubmitted) return false;
      if (activeTab === 'unsubmitted' && item.isSubmitted) return false;

      // Tingkat filter
      if (filterTingkat !== 'all') {
        const kName = String(item.kelas?.nama || '').toUpperCase();
        if (filterTingkat === 'X' && !kName.startsWith('X ') && !kName.startsWith('10 ')) return false;
        if (filterTingkat === 'XI' && !kName.startsWith('XI ') && !kName.startsWith('11 ')) return false;
        if (filterTingkat === 'XII' && !kName.startsWith('XII ') && !kName.startsWith('12 ')) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = String(searchQuery || '').toLowerCase().trim();
        const kName = String(item.kelas?.nama || '').toLowerCase();
        const jurusan = String(item.jurusanNama || '').toLowerCase();
        const waliName = String(item.waliKelas?.nama || '').toLowerCase();
        const nip = String(item.waliKelas?.nip || '').toLowerCase();
        return kName.includes(q) || jurusan.includes(q) || waliName.includes(q) || nip.includes(q);
      }

      return true;
    });
  }, [classStatuses, activeTab, filterTingkat, searchQuery]);

  // Homeroom WhatsApp reminder helper
  const handleSendWaReminder = (item: ClassSubmissionStatus) => {
    const waliPhone = item.waliKelas?.noHp ? item.waliKelas.noHp.replace(/\D/g, '').replace(/^0/, '62') : '';
    const dateFormatted = formatDateIndo(selectedDate);
    const msg = `Yth. Bapak/Ibu ${item.waliKelas?.nama || 'Wali Kelas'},\n\n` +
      `Mengingatkan bahwa pengisian presensi siswa untuk kelas *${item.kelas.nama}* pada hari *${dateFormatted}* belum terisi di sistem.\n\n` +
      `Mohon kesediaannya untuk segera melakukan pengisian kehadiran kelas binaan melalui aplikasi presensi sekolah. Terima kasih banyak. 🙏`;

    if (waliPhone) {
      const url = `https://wa.me/${waliPhone}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
      onShowToast?.(`Membuka WhatsApp untuk wali kelas ${item.kelas.nama}`, 'info');
    } else {
      // Fallback copy text
      navigator.clipboard?.writeText(msg);
      onShowToast?.(
        `Wali kelas ${item.kelas.nama} belum memiliki nomor WhatsApp. Pesan pengingat telah disalin ke clipboard!`,
        'warning'
      );
    }
  };

  // Bulk copy unsubmitted classes
  const handleCopyUnsubmittedList = () => {
    if (unsubmittedClasses.length === 0) {
      onShowToast?.('Seluruh kelas sudah mengisi presensi hari ini!', 'success');
      return;
    }

    const dateFormatted = formatDateIndo(selectedDate);
    const lines = unsubmittedClasses.map((item, idx) => {
      const waliText = item.waliKelas?.nama ? `${item.waliKelas.nama} (${item.waliKelas.noHp || 'No HP -'})` : 'Wali Belum Ditentukan';
      return `${idx + 1}. *${item.kelas.nama}* - Wali: ${waliText}`;
    });

    const fullText = `*DAFTAR KELAS BELUM MENGISI PRESENSI*\n` +
      `📅 Tanggal: *${dateFormatted}*\n` +
      `📊 Progres: *${submittedCount}/${totalClassesCount} Kelas (${submissionPercentage}%)*\n` +
      `⚠️ Belum Mengisi: *${unsubmittedCount} Kelas*\n\n` +
      lines.join('\n') +
      `\n\n_Mohon Bapak/Ibu Wali Kelas terkait untuk segera menginput kehadiran siswa. Terima kasih._`;

    navigator.clipboard?.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
    onShowToast?.(`Berhasil menyalin daftar ${unsubmittedCount} kelas yang belum mengisi presensi!`, 'success');
  };

  // Broadcast WA link for all unsubmitted classes
  const handleBroadcastUnsubmittedWa = () => {
    if (unsubmittedClasses.length === 0) {
      onShowToast?.('Seluruh kelas sudah mengisi presensi hari ini!', 'success');
      return;
    }

    const dateFormatted = formatDateIndo(selectedDate);
    const lines = unsubmittedClasses.map((item, idx) => {
      const waliText = item.waliKelas?.nama ? item.waliKelas.nama : 'Wali Kelas';
      return `${idx + 1}. *${item.kelas.nama}* (${waliText})`;
    });

    const fullText = `📢 *PENGINGAT PRESENSI HARIAN SISWA*\n` +
      `Tanggal: *${dateFormatted}*\n\n` +
      `Berikut daftar rombel yang *belum mengirimkan absensi hari ini*:\n` +
      lines.join('\n') +
      `\n\nMohon kerja sama Bapak/Ibu Wali Kelas untuk segera melakukan perekaman kehadiran melalui aplikasi presensi. Hatur nuhun. 🙏`;

    const url = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      id="rekap-pengisian-kelas"
      className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5 transition-all scroll-mt-20"
    >
      {/* 1. Header Section with Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-theme-primary to-blue-600 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-theme-primary/10 text-theme-primary">
                  {formatDateIndo(selectedDate)}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subtitle || "Monitoring status pengiriman absensi kelas yang sudah dan belum mengisi hari ini"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {unsubmittedCount > 0 && (
            <>
              <button
                type="button"
                onClick={handleCopyUnsubmittedList}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95"
                title="Salin daftar kelas yang belum mengisi ke clipboard"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{isCopied ? 'Tersalin!' : 'Salin Belum Isi'}</span>
              </button>

              <button
                type="button"
                onClick={handleBroadcastUnsubmittedWa}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer active:scale-95"
                title="Kirim pesan broadcast WhatsApp untuk kelas yang belum mengisi"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Broadcast WA</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isCollapsed ? 'Buka Rekap' : 'Tutup Rekap'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Progress Summary Bar & Quick Stat Cards */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card Total */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Rombel</p>
                <p className="text-xl font-black text-slate-900 dark:text-white leading-tight">{totalClassesCount} Kelas</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">100%</span>
          </div>

          {/* Card Sudah Mengisi */}
          <div 
            onClick={() => setActiveTab('submitted')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'submitted'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Sudah Mengisi</p>
                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-200 leading-tight">{submittedCount} Kelas</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                {submissionPercentage}%
              </span>
            </div>
          </div>

          {/* Card Belum Mengisi */}
          <div 
            onClick={() => setActiveTab('unsubmitted')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'unsubmitted'
                ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Belum Mengisi</p>
                  <p className="text-xl font-black text-rose-700 dark:text-rose-200 leading-tight">{unsubmittedCount} Kelas</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                unsubmittedCount > 0 ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 animate-pulse' : 'bg-slate-100 text-slate-600'
              }`}>
                {totalClassesCount > 0 ? 100 - submissionPercentage : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5 px-0.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <span>Kelengkapan Pengisian Presensi:</span>
              <strong className="text-slate-800 dark:text-slate-200">{submittedCount} dari {totalClassesCount} Rombel</strong>
            </span>
            <span className={submissionPercentage === 100 ? "text-emerald-600 font-extrabold" : "text-theme-primary font-extrabold"}>
              {submissionPercentage === 100 ? '🎉 100% Lengkap' : `${submissionPercentage}% Terisi`}
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 rounded-l-full"
              style={{ width: `${submissionPercentage}%` }}
              title={`Sudah Terisi: ${submittedCount} Kelas (${submissionPercentage}%)`}
            />
            <div
              className="h-full bg-rose-400 dark:bg-rose-600/70 transition-all duration-500 rounded-r-full"
              style={{ width: `${100 - submissionPercentage}%` }}
              title={`Belum Terisi: ${unsubmittedCount} Kelas (${100 - submissionPercentage}%)`}
            />
          </div>
        </div>
      </div>

      {/* 3. Controls: Tabs, Search, Tingkat Filter, View Mode */}
      {!isCollapsed && (
        <div className="space-y-4 pt-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span>Semua Kelas</span>
                <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px]">
                  {totalClassesCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('unsubmitted')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'unsubmitted'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Belum Mengisi</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  activeTab === 'unsubmitted' ? 'bg-rose-700 text-white' : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                }`}>
                  {unsubmittedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('submitted')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'submitted'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sudah Mengisi</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  activeTab === 'submitted' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                }`}>
                  {submittedCount}
                </span>
              </button>
            </div>

            {/* Search, Tingkat & View Mode Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full md:w-auto">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kelas / wali..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-theme-primary"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Tingkat Select */}
              <select
                value={filterTingkat}
                onChange={(e) => setFilterTingkat(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer outline-none"
              >
                <option value="all">Semua Tingkat</option>
                <option value="X">Kelas X</option>
                <option value="XI">Kelas XI</option>
                <option value="XII">Kelas XII</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded-lg transition ${
                    viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-theme-primary shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Tampilan Kartu Grid"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1 rounded-lg transition ${
                    viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-theme-primary shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Tampilan Tabel Rinci"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 4. Display Content: Cards Grid or Table */}
          {filteredList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tidak ada kelas yang sesuai dengan filter pencarian.
              </p>
              {activeTab === 'unsubmitted' && unsubmittedCount === 0 && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  Luar biasa! Seluruh rombel sudah tuntas mengisi absensi pada tanggal ini.
                </p>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredList.map((item) => {
                const k = item.kelas;
                const wali = item.waliKelas;
                const isDone = item.isSubmitted;

                return (
                  <div
                    key={k.id}
                    className={`p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between gap-3 ${
                      isDone
                        ? 'bg-white dark:bg-slate-800/70 border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:shadow-xs'
                        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/90 dark:border-rose-900/60 shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    {/* Top Row: Class Badge & Status Pill */}
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isDone ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                              {k.nama}
                            </h4>
                          </div>
                          {item.jurusanNama && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                              {item.jurusanNama}
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Sudah Terisi</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800 shrink-0">
                            <AlertCircle className="w-3 h-3" />
                            <span>Belum Diisi</span>
                          </span>
                        )}
                      </div>

                      {/* Wali Kelas Info */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Wali Kelas</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                            {wali?.nama || 'Belum Ditentukan'}
                          </p>
                        </div>
                        {wali?.noHp && (
                          <a
                            href={`https://wa.me/${wali.noHp.replace(/\D/g, '').replace(/^0/, '62')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition shrink-0"
                            title={`Chat WA Wali Kelas (${wali.noHp})`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Middle: Attendance Details / Status Stats */}
                    {isDone ? (
                      <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            {item.totalStudents} Siswa
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                            {item.attendanceRate}% Hadir
                          </span>
                        </div>

                        {/* Breakdown Pills */}
                        <div className="flex items-center gap-1 flex-wrap text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold" title="Hadir">
                            H: {item.hadir}
                          </span>
                          {item.sakit > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold" title="Sakit">
                              S: {item.sakit}
                            </span>
                          )}
                          {item.izin > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold" title="Izin">
                              I: {item.izin}
                            </span>
                          )}
                          {item.alpa > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold" title="Alpha">
                              A: {item.alpa}
                            </span>
                          )}
                          {item.kesiangan > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 font-bold" title="Terlambat">
                              T: {item.kesiangan}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-rose-100/50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200/80 dark:border-rose-900/40 text-[11px] text-rose-800 dark:text-rose-300 flex items-center justify-between">
                        <span className="flex items-center gap-1 font-semibold">
                          <Users className="w-3 h-3 text-rose-500" />
                          {item.totalStudents} Siswa terdaftar
                        </span>
                        <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400">
                          0 Tercatat
                        </span>
                      </div>
                    )}

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {isDone ? (
                        <button
                          type="button"
                          onClick={() => onNavigateToInput(k.id)}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-theme-primary" />
                          <span>Lihat / Edit Presensi</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onNavigateToInput(k.id)}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-theme-primary hover:bg-theme-primary-dark text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Input Presensi</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendWaReminder(item)}
                            className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                            title="Ingatkan Wali Kelas via WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="p-3">No</th>
                    <th className="p-3">Kelas &amp; Jurusan</th>
                    <th className="p-3">Wali Kelas</th>
                    <th className="p-3 text-center">Status Pengisian</th>
                    <th className="p-3 text-center">Rekap Kehadiran (H / S / I / A)</th>
                    <th className="p-3 text-center">% Hadir</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredList.map((item, idx) => {
                    const k = item.kelas;
                    const wali = item.waliKelas;
                    const isDone = item.isSubmitted;

                    return (
                      <tr
                        key={k.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition ${
                          !isDone ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                            {k.nama}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {item.jurusanNama || '-'} • {item.totalStudents} Siswa
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {wali?.nama || 'Belum Ditentukan'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {wali?.noHp ? (
                              <a
                                href={`https://wa.me/${wali.noHp.replace(/\D/g, '').replace(/^0/, '62')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:underline"
                              >
                                {wali.noHp}
                              </a>
                            ) : (
                              'No HP -'
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Sudah Terisi</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 animate-pulse">
                              <XCircle className="w-3 h-3" />
                              <span>Belum Mengisi</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isDone ? (
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              <span className="text-emerald-600">{item.hadir}</span> /{' '}
                              <span className="text-amber-600">{item.sakit}</span> /{' '}
                              <span className="text-blue-600">{item.izin}</span> /{' '}
                              <span className="text-rose-600">{item.alpa}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Belum ada data</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-extrabold">
                          {isDone ? (
                            <span className={item.attendanceRate >= 85 ? 'text-emerald-600' : 'text-amber-600'}>
                              {item.attendanceRate}%
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isDone ? (
                              <button
                                type="button"
                                onClick={() => onNavigateToInput(k.id)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                                title="Lihat / Edit Presensi Kelas"
                              >
                                Edit
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onNavigateToInput(k.id)}
                                  className="px-2.5 py-1 rounded-lg bg-theme-primary hover:bg-theme-primary-dark text-white text-xs font-bold transition shadow-xs"
                                  title="Input Presensi Kelas Sekarang"
                                >
                                  Input
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendWaReminder(item)}
                                  className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                                  title="Ingatkan Wali Kelas via WA"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
