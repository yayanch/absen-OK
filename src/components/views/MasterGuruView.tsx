import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  UserCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  FileSpreadsheet,
  Download,
  ArrowUpDown,
  Phone,
  CheckCircle2,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  Info,
  Mail,
  MapPin,
  Calendar,
  Building2,
  Hash,
  User,
  FileText,
  Filter,
  Check,
  LayoutGrid,
  List,
  Camera,
  Upload,
  X,
  ShieldCheck,
  Sparkles,
  Layers,
  Briefcase,
  Sliders,
  Award,
  Clock,
  ChevronRight
} from 'lucide-react';
import { AppData, WaliKelas, UserSession, ViewType } from '../../types';
import { Pagination } from '../Pagination';
import { PageHeader } from '../common/UIComponents';
import { addAuditLog, compressBase64Image } from '../../utils/helpers';
import { ImportGuruModal } from './ImportGuruModal';
import {
  getAllRolePermissions,
  getRoleBadgeMeta,
  normalizeRoleKey,
  mapDutyToRole,
  mapDutiesToRoles,
  reconcileRolesAndDuties,
} from '../../utils/rolePermissionEngine';

// Strict helper to distinguish picket accounts (Piket Guru & Piket Kesiswaan) from teaching teachers
export const isPiketAccount = (g: any): boolean => {
  if (!g) return false;
  const r = String(g.role || '').toLowerCase();
  const u = String(g.username || '').toLowerCase();
  const n = String(g.nama || '').toLowerCase();
  const t = String(g.tugasTambahan || '').toLowerCase();
  const j = String(g.jabatan || '').toLowerCase();
  return (
    r === 'piket' ||
    r === 'piket_guru' ||
    r === 'piket_kesiswaan' ||
    u === 'piket' ||
    u === 'piket_guru' ||
    u === 'piket_kesiswaan' ||
    u.startsWith('piket_') ||
    n.includes('(piket kesiswaan)') ||
    n.includes('(piket guru)') ||
    n.includes('piket kesiswaan') ||
    n.includes('piket guru') ||
    t.includes('piket') ||
    j.includes('piket')
  );
};

const NAMA_BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const formatTanggalIndonesia = (dateStr?: string): string => {
  if (!dateStr || !dateStr.trim()) return '';
  const trimmed = dateStr.trim();
  
  // Format YYYY-MM-DD
  const matchIso = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (matchIso) {
    const year = matchIso[1];
    const month = parseInt(matchIso[2], 10) - 1;
    const day = parseInt(matchIso[3], 10);
    if (month >= 0 && month < 12) {
      return `${day} ${NAMA_BULAN_INDONESIA[month]} ${year}`;
    }
  }

  // Format DD-MM-YYYY
  const matchDmy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (matchDmy) {
    const day = parseInt(matchDmy[1], 10);
    const month = parseInt(matchDmy[2], 10) - 1;
    const year = matchDmy[3];
    if (month >= 0 && month < 12) {
      return `${day} ${NAMA_BULAN_INDONESIA[month]} ${year}`;
    }
  }

  // Fallback: Date object
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();
    return `${day} ${NAMA_BULAN_INDONESIA[month]} ${year}`;
  }

  return trimmed;
};

export const formatTTL = (tempatLahir?: string, tanggalLahir?: string): string => {
  const tempat = tempatLahir ? tempatLahir.trim() : '';
  const tglIndo = formatTanggalIndonesia(tanggalLahir);

  if (tempat && tglIndo) {
    return `${tempat}, ${tglIndo}`;
  }
  return tempat || tglIndo || '-';
};

interface MasterGuruViewProps {
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
  initialSearchQuery?: string;
}

export const AGAMA_OPTIONS = [
  { id: '1', label: '1 - Islam' },
  { id: '2', label: '2 - Kristen' },
  { id: '3', label: '3 - Katolik' },
  { id: '4', label: '4 - Hindu' },
  { id: '5', label: '5 - Buddha' },
  { id: '6', label: '6 - Khonghucu' },
  { id: '7', label: '7 - Lainnya' },
];

export const getAgamaLabel = (id?: string) => {
  if (!id) return '-';
  const match = AGAMA_OPTIONS.find((a) => a.id === String(id).trim());
  if (match) return match.label.replace(/^\d+\s*-\s*/, '');
  return id;
};

interface GuruFormModalContentProps {
  guruToEdit?: WaliKelas;
  appData: AppData;
  onUpdateAppData: (appData: AppData) => void;
  onCloseModal: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const ALL_DAYS_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

interface RoundDaySelectorProps {
  selectedDays: string[];
  onChange: (days: string[]) => void;
  size?: 'normal' | 'small' | 'large';
  readOnly?: boolean;
}

export const RoundDaySelector: React.FC<RoundDaySelectorProps> = ({
  selectedDays = [],
  onChange,
  size = 'normal',
  readOnly = false,
}) => {
  const toggleDay = (day: string) => {
    if (readOnly) return;
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter((d) => d !== day));
    } else {
      onChange([...selectedDays, day]);
    }
  };

  const handleSelect5Days = () => !readOnly && onChange(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
  const handleSelect6Days = () => !readOnly && onChange(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']);
  const handleSelectAll = () => !readOnly && onChange([...ALL_DAYS_LIST]);
  const handleClear = () => !readOnly && onChange([]);

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="font-bold text-slate-500 dark:text-slate-400">Pilihan Cepat:</span>
          <button
            type="button"
            onClick={handleSelect5Days}
            className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            5 Hari (Sen-Jum)
          </button>
          <button
            type="button"
            onClick={handleSelect6Days}
            className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            6 Hari (Sen-Sab)
          </button>
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            Semua Hari
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            Kosongkan
          </button>
        </div>
      )}

      {/* Pemilihan hari berbentuk bulat untuk checklist */}
      <div className="flex flex-wrap items-center gap-2">
        {ALL_DAYS_LIST.map((day) => {
          const isSelected = selectedDays.includes(day);
          const shortName = day.substring(0, 3).toUpperCase();
          return (
            <button
              key={day}
              type="button"
              disabled={readOnly}
              onClick={() => toggleDay(day)}
              className={`rounded-full flex items-center justify-center font-extrabold transition-all duration-200 cursor-pointer ${
                size === 'small'
                  ? 'w-7 h-7 text-[9px]'
                  : size === 'large'
                  ? 'w-12 h-12 text-xs'
                  : 'w-10 h-10 text-[10px]'
              } ${
                isSelected
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-sm ring-2 ring-emerald-400/30 border-2 border-emerald-300 scale-105'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
              title={`${day}: ${isSelected ? 'Aktif Mengajar (Dicentang)' : 'Tidak Mengajar'}`}
            >
              <div className="flex flex-col items-center justify-center leading-none">
                <span>{shortName}</span>
                {isSelected ? (
                  <Check className={size === 'small' ? 'w-2.5 h-2.5 stroke-[3]' : 'w-3 h-3 stroke-[3] mt-0.5'} />
                ) : (
                  <div className={`rounded-full bg-slate-300 dark:bg-slate-600 ${size === 'small' ? 'w-1 h-1' : 'w-1.5 h-1.5 mt-0.5'}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface PengaturanHariMengajarModalContentProps {
  appData: AppData;
  onUpdateAppData: (appData: AppData) => void;
  onCloseModal: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const PengaturanHariMengajarModalContent: React.FC<PengaturanHariMengajarModalContentProps> = ({
  appData,
  onUpdateAppData,
  onCloseModal,
  onShowToast,
}) => {
  const [shiftFilter, setShiftFilter] = useState<'semua' | 'pagi' | 'siang' | 'normal'>('semua');
  const [kelompokFilter, setKelompokFilter] = useState<'semua' | 'guru' | 'wali' | 'struktural' | 'staf'>('semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Days state
  const [bulkDays, setBulkDays] = useState<string[]>(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
  const [bulkBatasiLogin, setBulkBatasiLogin] = useState<boolean>(false);

  // Local Teachers list state for fine-tuning before saving (strictly excludes piket)
  const [guruList, setGuruList] = useState<WaliKelas[]>(() => {
    return (appData.waliKelas || [])
      .filter((g) => !isPiketAccount(g))
      .map((g) => ({
        ...g,
        hariMengajar: Array.isArray(g.hariMengajar) && g.hariMengajar.length > 0 ? [...g.hariMengajar] : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
        batasiLoginHariMengajar: Boolean(g.batasiLoginHariMengajar),
      }));
  });

  // Filter teachers based on shift, kelompok, and search
  const filteredGuru = useMemo(() => {
    return guruList.filter((g) => {
      // Search
      const matchesSearch =
        !searchQuery ||
        g.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.nip && g.nip.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (g.username && g.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (g.mataPelajaran && g.mataPelajaran.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Kelompok Filter
      if (kelompokFilter === 'guru') {
        if (g.role !== 'guru' && (!g.roles || !g.roles.includes('guru'))) return false;
      } else if (kelompokFilter === 'wali') {
        const isWali = g.role === 'wali' || (g.additionalRoles && g.additionalRoles.includes('wali')) || (g.tugasTambahanList && g.tugasTambahanList.some(t => t.toLowerCase().includes('wali')));
        if (!isWali) return false;
      } else if (kelompokFilter === 'struktural') {
        const isStruktural = ['kesiswaan', 'kurikulum', 'hubin', 'admin'].includes(g.role) || (g.additionalRoles && g.additionalRoles.some(r => ['kesiswaan', 'kurikulum', 'hubin', 'admin'].includes(r)));
        if (!isStruktural) return false;
      } else if (kelompokFilter === 'staf') {
        const isStaf = g.role === 'staf_jadwal' || (g.additionalRoles && g.additionalRoles.includes('staf_jadwal'));
        if (!isStaf) return false;
      }

      // Shift Filter (based on class assignments or default heuristics)
      if (shiftFilter !== 'semua') {
        const hasSiangClass = (appData.kelas || []).some((k) => k.waliKelasId === g.id && k.nama.toLowerCase().includes('siang'));
        if (shiftFilter === 'pagi' && hasSiangClass) return false;
        if (shiftFilter === 'siang' && !hasSiangClass) return false;
      }

      return true;
    });
  }, [guruList, searchQuery, shiftFilter, kelompokFilter, appData.kelas]);

  // Apply Bulk Days to currently filtered teachers
  const handleApplyBulkToFiltered = () => {
    if (filteredGuru.length === 0) {
      onShowToast('Tidak ada guru yang sesuai dengan filter saat ini.', 'warning');
      return;
    }

    const filteredIds = new Set(filteredGuru.map((g) => g.id));
    setGuruList((prev) =>
      prev.map((g) => {
        if (filteredIds.has(g.id)) {
          return {
            ...g,
            hariMengajar: [...bulkDays],
            batasiLoginHariMengajar: bulkBatasiLogin,
          };
        }
        return g;
      })
    );

    onShowToast(`Hari mengajar berhasil diterapkan ke ${filteredGuru.length} guru terpilih!`, 'success');
  };

  // Toggle single teacher day
  const handleTeacherDaysChange = (teacherId: string, days: string[]) => {
    setGuruList((prev) =>
      prev.map((g) => (g.id === teacherId ? { ...g, hariMengajar: days } : g))
    );
  };

  // Toggle single teacher batasi login
  const handleTeacherBatasiLoginToggle = (teacherId: string) => {
    setGuruList((prev) =>
      prev.map((g) => (g.id === teacherId ? { ...g, batasiLoginHariMengajar: !g.batasiLoginHariMengajar } : g))
    );
  };

  // Save changes back to appData
  const handleSaveAll = () => {
    const updatedWaliKelas = appData.waliKelas.map((g) => {
      const updated = guruList.find((x) => x.id === g.id);
      if (updated) {
        return {
          ...g,
          hariMengajar: updated.hariMengajar,
          batasiLoginHariMengajar: updated.batasiLoginHariMengajar,
        };
      }
      return g;
    });

    const updatedAppData = addAuditLog(
      { ...appData, waliKelas: updatedWaliKelas },
      'Pengaturan Hari Mengajar Guru',
      'Memperbarui jadwal & hari mengajar guru pada semua shift dan kelompok'
    );

    onUpdateAppData(updatedAppData);
    onCloseModal();
    onShowToast('Pengaturan hari mengajar seluruh shift & kelompok berhasil disimpan!', 'success');
  };

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100 max-h-[80vh] overflow-y-auto pr-1">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-200 shrink-0" />
            <h3 className="font-black text-sm uppercase tracking-wide">
              Pengaturan Hari Mengajar (Semua Shift &amp; Kelompok)
            </h3>
          </div>
          <p className="text-xs text-amber-100 leading-relaxed">
            Kelola hari efektif mengajar tenaga pendidik per shift KBM (Pagi/Siang) dan kelompok fungsional (Wali Kelas, Mapel, Struktural).
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end shrink-0">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 backdrop-blur-md text-white border border-white/30 font-mono">
            {guruList.length} Guru
          </span>
        </div>
      </div>

      {/* Filter Toolbar: Shift & Kelompok */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Shift Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Filter Shift KBM</span>
            </label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="semua">Semua Shift (Pagi &amp; Siang)</option>
              <option value="pagi">Shift Pagi (Kelompok 1 / Reguler)</option>
              <option value="siang">Shift Siang (Kelompok 2 / Sore)</option>
              <option value="normal">Shift Normal / Karyawan</option>
            </select>
          </div>

          {/* Kelompok Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filter Kelompok Peran</span>
            </label>
            <select
              value={kelompokFilter}
              onChange={(e) => setKelompokFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="semua">Semua Kelompok Peran Guru</option>
              <option value="guru">Guru Pengampu Mapel Pokok</option>
              <option value="wali">Kelompok Wali Kelas</option>
              <option value="struktural">Kelompok Struktural &amp; WKS</option>
              <option value="staf">Kelompok Staf Pengelola Jadwal</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-amber-600" />
              <span>Cari Nama / NIP / Mapel</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari guru..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Box A: Mass / Batch Apply Hari Mengajar (Round Circular Checklist) */}
      <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Terapkan Hari Mengajar Massal ({filteredGuru.length} Guru Terpilih)</span>
          </h4>
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
            Batch Selector
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Pilih Hari Mengajar Massal (Gunakan tombol berbentuk bulat untuk centang hari):
            </label>
            <RoundDaySelector
              selectedDays={bulkDays}
              onChange={(days) => setBulkDays(days)}
              size="normal"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={bulkBatasiLogin}
                onChange={(e) => setBulkBatasiLogin(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
              />
              <span>Batasi Login Akun Hanya Pada Hari Mengajar yang Dicentang</span>
            </label>

            <button
              type="button"
              onClick={handleApplyBulkToFiltered}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Terapkan Ke {filteredGuru.length} Guru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Box B: Individual Teacher Fine-Tuning List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Rincian Hari Mengajar Per-Guru ({filteredGuru.length})</span>
          </h4>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Gunakan tombol bulat di samping nama guru untuk penyesuaian khusus.
          </span>
        </div>

        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          {filteredGuru.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400 font-medium text-xs">
              Tidak ada data guru yang cocok dengan kriteria filter atau pencarian.
            </div>
          ) : (
            filteredGuru.map((guru) => {
              const primaryBadge = getRoleBadgeMeta(guru.role, appData);
              const days = guru.hariMengajar || [];
              return (
                <div
                  key={guru.id}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    {guru.foto ? (
                      <img
                        src={guru.foto}
                        alt={guru.nama}
                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {guru.nama ? guru.nama.charAt(0).toUpperCase() : 'G'}
                      </div>
                    )}
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                        {guru.nama}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${primaryBadge.badgeClass}`}>
                          {primaryBadge.label}
                        </span>
                        {guru.nip && (
                          <span className="text-[10px] font-mono text-slate-400">NIP: {guru.nip}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pemilihan Hari Bulat untuk checklist per Guru */}
                  <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 w-full">
                    <RoundDaySelector
                      selectedDays={days}
                      onChange={(newDays) => handleTeacherDaysChange(guru.id, newDays)}
                      size="small"
                    />

                    <button
                      type="button"
                      onClick={() => handleTeacherBatasiLoginToggle(guru.id)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer border ${
                        guru.batasiLoginHariMengajar
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                      title="Batasi Login"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>{guru.batasiLoginHariMengajar ? 'Login Dibatasi' : 'Login Bebas'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCloseModal}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSaveAll}
          className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Simpan Perubahan Hari Mengajar</span>
        </button>
      </div>
    </div>
  );
};

const GuruFormModalContent: React.FC<GuruFormModalContentProps> = ({
  guruToEdit,
  appData,
  onUpdateAppData,
  onCloseModal,
  onShowToast,
}) => {
  const [nip, setNip] = useState(guruToEdit?.nip || '');
  const [nama, setNama] = useState(guruToEdit?.nama || '');
  const [nuptk, setNuptk] = useState(guruToEdit?.nuptk || '');
  const [jenisKelamin, setJenisKelamin] = useState(guruToEdit?.jenisKelamin || 'L');
  const [tempatLahir, setTempatLahir] = useState(guruToEdit?.tempatLahir || '');
  const [tanggalLahir, setTanggalLahir] = useState(guruToEdit?.tanggalLahir || '');
  const [nik, setNik] = useState(guruToEdit?.nik || '');
  const [agamaId, setAgamaId] = useState(guruToEdit?.agamaId || '1');
  const [alamat, setAlamat] = useState(guruToEdit?.alamat || '');
  const [rt, setRt] = useState(guruToEdit?.rt || '');
  const [rw, setRw] = useState(guruToEdit?.rw || '');
  const [desaKelurahan, setDesaKelurahan] = useState(guruToEdit?.desaKelurahan || '');
  const [kecamatan, setKecamatan] = useState(guruToEdit?.kecamatan || '');
  const [kota, setKota] = useState(guruToEdit?.kota || '');
  const [kodeWilayah, setKodeWilayah] = useState(guruToEdit?.kodeWilayah || '');
  const [kodePos, setKodePos] = useState(guruToEdit?.kodePos || '');
  const [noHp, setNoHp] = useState(guruToEdit?.noHp || '');
  const [email, setEmail] = useState(guruToEdit?.email || '');

  const [foto, setFoto] = useState(guruToEdit?.foto || '');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // System login fields
  const [username, setUsername] = useState(
    guruToEdit?.username || (nip ? nip : `guru_${Math.floor(1000 + Math.random() * 9000)}`)
  );
  const [password, setPassword] = useState(guruToEdit?.password || '123');
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState('');

  // Role, Multi-Role & Tugas Tambahan fields
  const allRoles = useMemo(() => getAllRolePermissions(appData), [appData]);
  const [role, setRole] = useState<string>(guruToEdit?.role || 'guru');
  const [additionalRoles, setAdditionalRoles] = useState<string[]>(() => {
    if (Array.isArray(guruToEdit?.additionalRoles)) return [...guruToEdit.additionalRoles];
    return [];
  });
  const [tugasTambahanList, setTugasTambahanList] = useState<string[]>(() => {
    if (Array.isArray(guruToEdit?.tugasTambahanList) && guruToEdit.tugasTambahanList.length > 0) {
      return [...guruToEdit.tugasTambahanList];
    }
    if (guruToEdit?.tugasTambahan) {
      return guruToEdit.tugasTambahan.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  });
  const [mataPelajaran, setMataPelajaran] = useState(guruToEdit?.mataPelajaran || '');
  const [customTugasInput, setCustomTugasInput] = useState('');
  const [hariMengajar, setHariMengajar] = useState<string[]>(
    guruToEdit?.hariMengajar && guruToEdit.hariMengajar.length > 0
      ? [...guruToEdit.hariMengajar]
      : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']
  );
  const [batasiLoginHariMengajar, setBatasiLoginHariMengajar] = useState<boolean>(
    Boolean(guruToEdit?.batasiLoginHariMengajar)
  );

  const COMMON_TUGAS_PRESETS = [
    'Wali Kelas',
    'Pembina OSIS',
    'Koordinator BP / BK',
    'Kepala Perpustakaan',
    'Bendahara BOS / Sekolah',
    'Koordinator P5',
    'Tim Ketertiban & Disiplin (Tatib)',
    'Kepala Lab Komputer',
    'Kepala Bengkel / Lab Kejuruan',
    'WKS Kurikulum',
    'WKS Kesiswaan',
    'WKS Hubin & Humas',
    'WKS Sarana & Prasarana',
    'Pembina Pramuka',
    'Pembina Ekstrakurikuler',
  ];

  const handleToggleAdditionalRole = (roleKey: string) => {
    if (roleKey === role) return; // Cannot be both primary and secondary
    const isRemoving = additionalRoles.includes(roleKey);
    const nextAddRoles = isRemoving
      ? additionalRoles.filter((r) => r !== roleKey)
      : [...additionalRoles, roleKey];
    setAdditionalRoles(nextAddRoles);

    // If removing an additional role, also remove any duties mapped to it
    if (isRemoving) {
      setTugasTambahanList((prev) =>
        prev.filter((d) => mapDutyToRole(d, appData.customRoles) !== roleKey)
      );
    }
  };

  const handleToggleTugasTambahan = (tugas: string) => {
    setTugasTambahanList((prev) => {
      const nextList = prev.includes(tugas) ? prev.filter((t) => t !== tugas) : [...prev, tugas];
      // Automatically keep role & additionalRoles in sync
      const reconciled = reconcileRolesAndDuties(role, additionalRoles, nextList, appData, guruToEdit?.id);
      setRole(reconciled.primaryRole);
      setAdditionalRoles(reconciled.additionalRoles);
      return nextList;
    });
  };

  const handleAddCustomTugas = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTugasInput.trim();
    if (!clean) return;
    if (!tugasTambahanList.includes(clean)) {
      const nextList = [...tugasTambahanList, clean];
      setTugasTambahanList(nextList);
      const reconciled = reconcileRolesAndDuties(role, additionalRoles, nextList, appData, guruToEdit?.id);
      setRole(reconciled.primaryRole);
      setAdditionalRoles(reconciled.additionalRoles);
    }
    setCustomTugasInput('');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressBase64Image(file, 400, 0.85);
        setFoto(compressed);
      } catch (err) {
        console.error('Error compressing teacher photo:', err);
        onShowToast('Gagal memproses foto guru. Silakan coba file gambar lain.', 'error');
      }
    }
  };

  const handleGeneratePass = () => {
    const rand = Math.floor(100000 + Math.random() * 900000).toString();
    setPassword(rand);
    setShowPass(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');

    if (!nama.trim()) {
      setErr('Nama Guru wajib diisi.');
      return;
    }

    const cleanUsername = (username.trim() || nip.trim() || `guru_${String(nama).toLowerCase().replace(/[^a-z0-9]/g, '')}`).toLowerCase();

    // Check username duplication
    const isDup = appData.waliKelas.some(
      (w) => w.username.toLowerCase() === cleanUsername && w.id !== guruToEdit?.id
    );
    if (isDup) {
      setErr(`Username "${cleanUsername}" sudah digunakan oleh guru lain.`);
      return;
    }

    const guruId = guruToEdit ? guruToEdit.id : `GURU_${Date.now()}`;
    const reconciled = reconcileRolesAndDuties(role, additionalRoles, tugasTambahanList, appData, guruToEdit?.id);

    const newGuruObj: WaliKelas = {
      id: guruId,
      nip: nip.trim(),
      nama: nama.trim(),
      nuptk: nuptk.trim(),
      jenisKelamin: jenisKelamin.trim().toUpperCase(),
      tempatLahir: tempatLahir.trim(),
      tanggalLahir: tanggalLahir.trim(),
      nik: nik.trim(),
      agamaId: agamaId.trim(),
      alamat: alamat.trim(),
      rt: rt.trim(),
      rw: rw.trim(),
      desaKelurahan: desaKelurahan.trim(),
      kecamatan: kecamatan.trim(),
      kota: kota.trim(),
      kodeWilayah: kodeWilayah.trim(),
      kodePos: kodePos.trim(),
      noHp: noHp.trim(),
      email: email.trim(),
      username: cleanUsername,
      password: password.trim() || '123',
      role: reconciled.primaryRole,
      roles: reconciled.roles,
      additionalRoles: reconciled.additionalRoles,
      tugasTambahan: tugasTambahanList.join(', '),
      tugasTambahanList: tugasTambahanList,
      jabatan: tugasTambahanList.join(', '),
      foto: foto.trim(),
      mataPelajaran: mataPelajaran.trim() || guruToEdit?.mataPelajaran || '',
      hariMengajar: hariMengajar,
      batasiLoginHariMengajar: batasiLoginHariMengajar,
    };

    let updatedWali: WaliKelas[];
    if (guruToEdit) {
      updatedWali = appData.waliKelas.map((w) => (w.id === guruToEdit.id ? newGuruObj : w));
    } else {
      updatedWali = [newGuruObj, ...appData.waliKelas];
    }

    // If teacher is no longer assigned as Wali Kelas, detach from any classes
    let updatedKelas = appData.kelas;
    if (guruToEdit && !reconciled.isWaliActive) {
      updatedKelas = (appData.kelas || []).map((k) =>
        k.waliKelasId === guruToEdit.id ? { ...k, waliKelasId: '' } : k
      );
    }

    const updatedAppData = addAuditLog(
      { ...appData, waliKelas: updatedWali, kelas: updatedKelas },
      guruToEdit ? 'Edit Biodata Guru' : 'Tambah Biodata Guru Baru',
      `${guruToEdit ? 'Mengubah' : 'Menambah'} biodata guru ${nama.trim()}`
    );
    onUpdateAppData(updatedAppData);

    onCloseModal();
    onShowToast(
      guruToEdit
        ? `Biodata guru ${nama.trim()} berhasil diperbarui!`
        : `Biodata guru baru ${nama.trim()} berhasil ditambahkan!`,
      'success'
    );
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 text-slate-800 dark:text-slate-100 max-h-[80vh] overflow-y-auto pr-1">
      {err && (
        <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* Foto Guru Section */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
        <h4 className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5" />
          <span>Foto Profil Guru</span>
        </h4>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group shrink-0">
            {foto ? (
              <img
                src={foto}
                alt="Preview Foto Guru"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-700 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600">
                <User className="w-8 h-8 opacity-60" />
                <span className="text-[9px] font-semibold mt-1">Tanpa Foto</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2 w-full text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <input
                type="file"
                ref={photoInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Foto Guru</span>
              </button>

              {foto && (
                <button
                  type="button"
                  onClick={() => setFoto('')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hapus Foto</span>
                </button>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Atau masukkan URL / Link Gambar Foto Guru
              </label>
              <input
                type="text"
                value={foto}
                onChange={(e) => setFoto(e.target.value)}
                placeholder="https://... / data:image/..."
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Identitas Pokok */}
      <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <h4 className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          <span>1. Identitas Pokok Guru</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              NIP
            </label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="misal: 198501012010011001"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama lengkap beserta gelar..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              NUPTK
            </label>
            <input
              type="text"
              value={nuptk}
              onChange={(e) => setNuptk(e.target.value)}
              placeholder="16 Digit NUPTK"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Jenis Kelamin
            </label>
            <select
              value={jenisKelamin}
              onChange={(e) => setJenisKelamin(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-semibold"
            >
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tempat Lahir
            </label>
            <input
              type="text"
              value={tempatLahir}
              onChange={(e) => setTempatLahir(e.target.value)}
              placeholder="misal: Kota Bandung"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tanggal Lahir
            </label>
            <input
              type="date"
              value={tanggalLahir}
              onChange={(e) => setTanggalLahir(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              NIK (No. KTP)
            </label>
            <input
              type="text"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              placeholder="16 Digit NIK"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Agama
            </label>
            <select
              value={agamaId}
              onChange={(e) => setAgamaId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-semibold"
            >
              {AGAMA_OPTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Alamat & Kontak */}
      <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <h4 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          <span>2. Tempat Tinggal & Kontak Guru</span>
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Alamat Jalan / Kampung
            </label>
            <input
              type="text"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="misal: Jl. Merdeka No. 45"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                RT
              </label>
              <input
                type="text"
                value={rt}
                onChange={(e) => setRt(e.target.value)}
                placeholder="001"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                RW
              </label>
              <input
                type="text"
                value={rw}
                onChange={(e) => setRw(e.target.value)}
                placeholder="005"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Desa / Kelurahan
              </label>
              <input
                type="text"
                value={desaKelurahan}
                onChange={(e) => setDesaKelurahan(e.target.value)}
                placeholder="Kelurahan..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kecamatan
              </label>
              <input
                type="text"
                value={kecamatan}
                onChange={(e) => setKecamatan(e.target.value)}
                placeholder="Kecamatan..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kota / Kabupaten
              </label>
              <input
                type="text"
                value={kota}
                onChange={(e) => setKota(e.target.value)}
                placeholder="misal: Kota Bandung"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kode Wilayah
              </label>
              <input
                type="text"
                value={kodeWilayah}
                onChange={(e) => setKodeWilayah(e.target.value)}
                placeholder="32.73.05"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kode Pos
              </label>
              <input
                type="text"
                value={kodePos}
                onChange={(e) => setKodePos(e.target.value)}
                placeholder="40235"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                No. HP / WhatsApp
              </label>
              <input
                type="text"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="081234567890"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Guru
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guru@sekolah.sch.id"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Akun Login Sistem */}
      <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <h4 className="text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5" />
          <span>3. Akun Login Sistem Guru</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Username <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username login..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Password</span>
              <button
                type="button"
                onClick={handleGeneratePass}
                className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold underline cursor-pointer"
              >
                Acak Password
              </button>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password login"
                className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Peran Akun & Hak Akses Sistem (Hak Akses Aplikasi) */}
      <div className="space-y-3.5 p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/60">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>4. Peran Akun &amp; Hak Akses Sistem</span>
          </h4>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Hak Akses Aplikasi
          </span>
        </div>

        {/* 1. Role Utama */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
            Role Utama / Level Akses Sistem <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={role}
              onChange={(e) => {
                const newR = e.target.value;
                setRole(newR);
                // Remove from additional roles if chosen as primary
                setAdditionalRoles((prev) => prev.filter((r) => r !== newR));
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition font-semibold"
            >
              <optgroup label="Role Sistem Standar">
                <option value="guru">Guru Pengampu (Default)</option>
                <option value="wali">Wali Kelas</option>
                <option value="kesiswaan">WKS Kesiswaan / BP BK</option>
                <option value="kurikulum">WKS Kurikulum</option>
                <option value="staf_jadwal">Staf Pengelola Jadwal</option>
                <option value="hubin">WKS Hubin &amp; Humas</option>
                <option value="admin">Administrator</option>
              </optgroup>
              {allRoles.filter((r) => !r.isSystem).length > 0 && (
                <optgroup label="Role Kustom Sekolah">
                  {allRoles
                    .filter((r) => !r.isSystem)
                    .map((cr) => (
                      <option key={cr.roleId} value={cr.roleId}>
                        {cr.roleName} (Kustom)
                      </option>
                    ))}
                </optgroup>
              )}
            </select>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Badge Akses:</span>
              {(() => {
                const badge = getRoleBadgeMeta(role, appData);
                return (
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${badge.badgeClass}`}>
                    {badge.label}
                  </span>
                );
              })()}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Menentukan role utama saat akun login dan hak akses navigasi menu sidebar yang diberikan secara default.
          </p>
        </div>

        {/* 2. Role Tambahan / Multi-Role Access */}
        <div className="space-y-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Role Tambahan / Multi-Role Akses (Opsional)
            </label>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {additionalRoles.length} role tambahan aktif
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Guru ini juga akan otomatis mendapatkan seluruh akses menu dari role tambahan yang dicentang:
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {allRoles
              .filter((r) => r.roleId !== 'murid' && r.roleId !== normalizeRoleKey(role))
              .map((rItem) => {
                const isChecked = additionalRoles.includes(rItem.roleId);
                const meta = getRoleBadgeMeta(rItem.roleId, appData);
                return (
                  <button
                    key={rItem.roleId}
                    type="button"
                    onClick={() => handleToggleAdditionalRole(rItem.roleId)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      isChecked
                        ? `${meta.badgeClass} ring-2 ring-indigo-500/40 shadow-xs`
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] ${
                        isChecked
                          ? 'bg-indigo-600 text-white font-black'
                          : 'border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span>{meta.label}</span>
                    {meta.isCustom && (
                      <span className="text-[9px] px-1 rounded bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
                        Kustom
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCloseModal}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{guruToEdit ? 'Simpan Perubahan' : 'Tambah Guru'}</span>
        </button>
      </div>
    </form>
  );
};

interface QuickRoleModalContentProps {
  guru: WaliKelas;
  appData: AppData;
  onUpdateAppData: (appData: AppData) => void;
  onCloseModal: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const QuickRoleModalContent: React.FC<QuickRoleModalContentProps> = ({
  guru,
  appData,
  onUpdateAppData,
  onCloseModal,
  onShowToast,
}) => {
  const allRoles = useMemo(() => getAllRolePermissions(appData), [appData]);
  const [activeTab, setActiveTab] = useState<'role' | 'tugas'>('role');
  const [role, setRole] = useState<string>(guru.role || 'guru');
  const [additionalRoles, setAdditionalRoles] = useState<string[]>(() => {
    if (Array.isArray(guru.additionalRoles)) return [...guru.additionalRoles];
    return [];
  });
  const [tugasList, setTugasList] = useState<string[]>(() => {
    if (Array.isArray(guru.tugasTambahanList) && guru.tugasTambahanList.length > 0) {
      return [...guru.tugasTambahanList];
    }
    if (guru.tugasTambahan) {
      return guru.tugasTambahan.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  });
  const [customTugas, setCustomTugas] = useState('');

  const COMMON_PRESETS = [
    'Wali Kelas',
    'Pembina OSIS',
    'Koordinator BP / BK',
    'Kepala Perpustakaan',
    'Bendahara BOS / Sekolah',
    'Koordinator P5',
    'Tim Ketertiban & Disiplin (Tatib)',
    'Kepala Lab Komputer',
    'Kepala Bengkel / Lab Kejuruan',
    'WKS Kurikulum',
    'WKS Kesiswaan',
    'WKS Hubin & Humas',
    'WKS Sarana & Prasarana',
    'Pembina Pramuka',
    'Pembina Ekstrakurikuler',
  ];

  const handleToggleAddRole = (rKey: string) => {
    if (rKey === role) return;
    const isRemoving = additionalRoles.includes(rKey);
    const nextAddRoles = isRemoving
      ? additionalRoles.filter((r) => r !== rKey)
      : [...additionalRoles, rKey];
    setAdditionalRoles(nextAddRoles);

    // If removing an additional role, also remove any duties mapped to it
    if (isRemoving) {
      setTugasList((prev) =>
        prev.filter((d) => mapDutyToRole(d, appData.customRoles) !== rKey)
      );
    }
  };

  const handleToggleTugas = (t: string) => {
    setTugasList((prev) => {
      const nextList = prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t];
      const reconciled = reconcileRolesAndDuties(role, additionalRoles, nextList, appData, guru.id);
      setRole(reconciled.primaryRole);
      setAdditionalRoles(reconciled.additionalRoles);
      return nextList;
    });
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTugas.trim();
    if (!clean) return;
    if (!tugasList.includes(clean)) {
      const nextList = [...tugasList, clean];
      setTugasList(nextList);
      const reconciled = reconcileRolesAndDuties(role, additionalRoles, nextList, appData, guru.id);
      setRole(reconciled.primaryRole);
      setAdditionalRoles(reconciled.additionalRoles);
    }
    setCustomTugas('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const reconciled = reconcileRolesAndDuties(role, additionalRoles, tugasList, appData, guru.id);

    const updatedWali = (appData.waliKelas || []).map((w) => {
      if (w.id === guru.id) {
        return {
          ...w,
          role: reconciled.primaryRole,
          roles: reconciled.roles,
          additionalRoles: reconciled.additionalRoles,
          tugasTambahan: tugasList.join(', '),
          tugasTambahanList: tugasList,
          jabatan: tugasList.join(', '),
        };
      }
      return w;
    });

    let updatedKelas = appData.kelas;
    if (!reconciled.isWaliActive) {
      updatedKelas = (appData.kelas || []).map((k) =>
        k.waliKelasId === guru.id ? { ...k, waliKelasId: '' } : k
      );
    }

    const updatedAppData = addAuditLog(
      { ...appData, waliKelas: updatedWali, kelas: updatedKelas },
      'Ubah Role & Tugas Guru',
      `Memperbarui role utama (${getRoleBadgeMeta(reconciled.primaryRole, appData).label}), role tambahan (${reconciled.additionalRoles.length}), dan tugas tambahan (${tugasList.length}) guru ${guru.nama}`
    );
    onUpdateAppData(updatedAppData);
    onShowToast(`Peran & Tugas Tambahan "${guru.nama}" berhasil diperbarui!`, 'success');
    onCloseModal();
  };

  const primaryBadge = getRoleBadgeMeta(role, appData);

  return (
    <form onSubmit={handleSave} className="space-y-3.5 text-slate-800 dark:text-slate-100 max-h-[78vh] overflow-y-auto pr-1">
      {/* Profil Singkat Guru */}
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-sm shrink-0 shadow-xs">
          {guru.nama ? guru.nama.charAt(0).toUpperCase() : 'G'}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">{guru.nama}</h4>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block truncate">
            @{guru.username} | NIP: {guru.nip || '-'}
          </span>
        </div>
      </div>

      {/* Segmented Tab Switcher: Terpisah Antara Peran Akun & Tugas Tambahan */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab('role')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'role'
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="truncate">1. Peran Akun &amp; Hak Akses</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono">
            {1 + additionalRoles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tugas')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'tugas'
              ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="truncate">2. Tugas Tambahan Sekolah</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-mono">
            {tugasList.length}
          </span>
        </button>
      </div>

      {/* KONTEN TAB 1: PERAN AKUN & HAK AKSES SISTEM */}
      {activeTab === 'role' && (
        <div className="space-y-3 p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/60 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
            <div>
              <h5 className="font-extrabold text-xs text-indigo-800 dark:text-indigo-300 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Pengaturan Peran &amp; Akses Sistem</span>
              </h5>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Mengatur hak akses akun saat login dan menu-menu yang dapat dibuka di sidebar.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 shrink-0">
              Hak Akses
            </span>
          </div>

          {/* Role Utama */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Role Utama Sistem (Primary Role) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={role}
                onChange={(e) => {
                  const nextR = e.target.value;
                  setRole(nextR);
                  setAdditionalRoles((prev) => prev.filter((r) => r !== nextR));
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <optgroup label="Role Sistem Standar">
                  <option value="guru">Guru Pengampu (Default)</option>
                  <option value="wali">Wali Kelas</option>
                  <option value="kesiswaan">WKS Kesiswaan / BP BK</option>
                  <option value="kurikulum">WKS Kurikulum</option>
                  <option value="staf_jadwal">Staf Pengelola Jadwal</option>
                  <option value="hubin">WKS Hubin &amp; Humas</option>
                  <option value="admin">Administrator</option>
                </optgroup>
                {allRoles.filter((r) => !r.isSystem).length > 0 && (
                  <optgroup label="Role Kustom Sekolah">
                    {allRoles
                      .filter((r) => !r.isSystem)
                      .map((cr) => (
                        <option key={cr.roleId} value={cr.roleId}>
                          {cr.roleName} (Kustom)
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Badge Akses:</span>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${primaryBadge.badgeClass}`}>
                  {primaryBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Role Tambahan (Multi-Role) */}
          <div className="space-y-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Role Tambahan / Multi-Role Akses (Opsional)
              </label>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {additionalRoles.length} role tambahan aktif
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Guru ini juga dapat mengakses seluruh menu dari role tambahan yang dicentang di bawah ini:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {allRoles
                .filter((r) => r.roleId !== 'murid' && r.roleId !== normalizeRoleKey(role))
                .map((rItem) => {
                  const isChecked = additionalRoles.includes(rItem.roleId);
                  const meta = getRoleBadgeMeta(rItem.roleId, appData);
                  return (
                    <button
                      key={rItem.roleId}
                      type="button"
                      onClick={() => handleToggleAddRole(rItem.roleId)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                        isChecked
                          ? `${meta.badgeClass} ring-2 ring-indigo-500/40 shadow-xs`
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] ${
                          isChecked ? 'bg-indigo-600 text-white font-bold' : 'border border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>{meta.label}</span>
                      {meta.isCustom && (
                        <span className="text-[9px] px-1 rounded bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
                          Kustom
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* KONTEN TAB 2: TUGAS TAMBAHAN & FUNGSIONAL SEKOLAH */}
      {activeTab === 'tugas' && (
        <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-amber-100 dark:border-amber-900/40">
            <div>
              <h5 className="font-extrabold text-xs text-amber-800 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Pengaturan Tugas Tambahan Sekolah</span>
              </h5>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Tanggung jawab struktural dan fungsional di sekolah (tanpa mengubah role sistem pokok).
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 shrink-0">
              Fungsional
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Pilihan Cepat Tugas Tambahan
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {COMMON_PRESETS.map((tName) => {
                const isSel = tugasList.includes(tName);
                return (
                  <button
                    key={tName}
                    type="button"
                    onClick={() => handleToggleTugas(tName)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      isSel
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border-amber-400 dark:border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] ${
                        isSel ? 'bg-amber-600 text-white font-bold' : 'border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSel && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span>{tName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Tambah Tugas Khusus Lainnya
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTugas}
                onChange={(e) => setCustomTugas(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustom(e);
                  }
                }}
                placeholder="Ketik nama tugas fungsional lain..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition cursor-pointer shrink-0 shadow-xs"
              >
                + Tambah
              </button>
            </div>
          </div>

          {/* Active Tugas List */}
          {tugasList.length > 0 && (
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Daftar Tugas Tambahan Terpasang ({tugasList.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tugasList.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1"
                  >
                    <Award className="w-3 h-3 text-amber-600" />
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleTugas(t)}
                      className="hover:text-rose-600 cursor-pointer ml-0.5"
                      title="Hapus tugas ini"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ringkasan Konfigurasi Sebelum Simpan */}
      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 font-semibold">Peran Sistem:</span>
          <div className="flex flex-wrap items-center gap-1">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${primaryBadge.badgeClass}`}>
              {primaryBadge.label} (Utama)
            </span>
            {additionalRoles.map((rId) => (
              <span key={rId} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                +{getRoleBadgeMeta(rId, appData).label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
          <span className="text-slate-500 dark:text-slate-400 font-semibold">Tugas Tambahan:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {tugasList.length > 0 ? `${tugasList.length} tugas terpasang` : 'Tidak ada tugas tambahan'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCloseModal}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Simpan Peran &amp; Tugas</span>
        </button>
      </div>
    </form>
  );
};

export const MasterGuruView: React.FC<MasterGuruViewProps> = ({
  appData,
  currentUser,
  readOnly = false,
  onUpdateAppData,
  onOpenModal,
  onCloseModal,
  onConfirmModal,
  onShowToast,
  onNavigateView,
  initialSearchQuery,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery || '');

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchTerm(initialSearchQuery);
    }
  }, [initialSearchQuery]);
  const [jkFilter, setJkFilter] = useState<'semua' | 'L' | 'P'>('semua');
  const [agamaFilter, setAgamaFilter] = useState<string>('semua');
  const [roleFilter, setRoleFilter] = useState<string>('semua');
  const [sortField, setSortField] = useState<'nama' | 'nip' | 'nuptk' | 'nik' | 'tempatLahir' | 'desaKelurahan' | 'kecamatan' | 'kota' | 'role'>('nama');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'list'));
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // List of all registered roles
  const allRoles = useMemo(() => getAllRolePermissions(appData), [appData]);

  // List of all teachers (biodata) - strictly excludes piket accounts
  const guruList: WaliKelas[] = (appData.waliKelas || []).filter((g) => !isPiketAccount(g));

  // Filter list
  let filteredGuru = guruList.filter((g) => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch =
      !q ||
      (g.nama && g.nama.toLowerCase().includes(q)) ||
      (g.nip && g.nip.toLowerCase().includes(q)) ||
      (g.nuptk && g.nuptk.toLowerCase().includes(q)) ||
      (g.nik && g.nik.toLowerCase().includes(q)) ||
      (g.tempatLahir && g.tempatLahir.toLowerCase().includes(q)) ||
      (g.alamat && g.alamat.toLowerCase().includes(q)) ||
      (g.desaKelurahan && g.desaKelurahan.toLowerCase().includes(q)) ||
      (g.kecamatan && g.kecamatan.toLowerCase().includes(q)) ||
      (g.kota && g.kota.toLowerCase().includes(q)) ||
      (g.email && g.email.toLowerCase().includes(q)) ||
      (g.noHp && g.noHp.toLowerCase().includes(q)) ||
      (g.tugasTambahan && g.tugasTambahan.toLowerCase().includes(q)) ||
      (g.jabatan && g.jabatan.toLowerCase().includes(q)) ||
      (g.mataPelajaran && g.mataPelajaran.toLowerCase().includes(q));

    const gJk = (g.jenisKelamin || '').toUpperCase();
    const matchJk = jkFilter === 'semua' || gJk === jkFilter || (jkFilter === 'L' && (gJk.startsWith('L') || gJk === 'PRIA')) || (jkFilter === 'P' && (gJk.startsWith('P') || gJk === 'WANITA'));

    const matchAgama = agamaFilter === 'semua' || String(g.agamaId || '').trim() === agamaFilter || getAgamaLabel(g.agamaId).toLowerCase() === agamaFilter.toLowerCase();

    const gRole = normalizeRoleKey(g.role || 'guru');
    const gAddRoles = Array.isArray(g.additionalRoles) ? g.additionalRoles.map(normalizeRoleKey) : [];
    const matchRole =
      roleFilter === 'semua' ||
      gRole === roleFilter ||
      gAddRoles.includes(roleFilter) ||
      (roleFilter === 'wali' && (g.tugasTambahan?.toLowerCase().includes('wali') || g.tugasTambahanList?.includes('Wali Kelas')));

    return matchSearch && matchJk && matchAgama && matchRole;
  });

  // Sort list
  filteredGuru = [...filteredGuru].sort((a, b) => {
    let valA: string = '';
    let valB: string = '';

    if (sortField === 'nama') {
      valA = a.nama || '';
      valB = b.nama || '';
    } else if (sortField === 'nip') {
      valA = a.nip || '';
      valB = b.nip || '';
    } else if (sortField === 'nuptk') {
      valA = a.nuptk || '';
      valB = b.nuptk || '';
    } else if (sortField === 'nik') {
      valA = a.nik || '';
      valB = b.nik || '';
    } else if (sortField === 'tempatLahir') {
      valA = a.tempatLahir || '';
      valB = b.tempatLahir || '';
    } else if (sortField === 'desaKelurahan') {
      valA = a.desaKelurahan || '';
      valB = b.desaKelurahan || '';
    } else if (sortField === 'kecamatan') {
      valA = a.kecamatan || '';
      valB = b.kecamatan || '';
    } else if (sortField === 'kota') {
      valA = a.kota || '';
      valB = b.kota || '';
    } else if (sortField === 'role') {
      valA = a.role || '';
      valB = b.role || '';
    }

    const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: 'nama' | 'nip' | 'nuptk' | 'nik' | 'tempatLahir' | 'desaKelurahan' | 'kecamatan' | 'kota' | 'role') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Pagination calculation
  const validPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
  const validCurrentPage = Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1;
  const totalPages = Math.ceil(filteredGuru.length / validPageSize) || 1;
  const startIdx = (validCurrentPage - 1) * validPageSize;
  const pagedGuru = filteredGuru.slice(startIdx, startIdx + validPageSize);

  // Statistics
  const totalGuru = guruList.length;
  const totalLaki = guruList.filter((g) => {
    const jk = (g.jenisKelamin || '').toUpperCase();
    return jk === 'L' || jk.startsWith('L') || jk === 'PRIA';
  }).length;
  const totalPerempuan = guruList.filter((g) => {
    const jk = (g.jenisKelamin || '').toUpperCase();
    return jk === 'P' || jk.startsWith('P') || jk === 'WANITA';
  }).length;
  const totalNuptk = guruList.filter((g) => g.nuptk && g.nuptk.trim() !== '' && g.nuptk !== '-').length;
  const totalMultiRole = guruList.filter((g) => (g.additionalRoles && g.additionalRoles.length > 0) || (g.tugasTambahanList && g.tugasTambahanList.length > 0)).length;

  // Open Quick Role & Duty Modal
  const handleOpenRoleModal = (guru: WaliKelas) => {
    if (readOnly) return;
    onOpenModal(
      `Kelola Role & Tugas: ${guru.nama}`,
      <QuickRoleModalContent
        guru={guru}
        appData={appData}
        onUpdateAppData={onUpdateAppData}
        onCloseModal={onCloseModal}
        onShowToast={onShowToast}
      />
    );
  };

  // View Teacher Detail Modal
  const handleViewDetailGuru = (guru: WaliKelas) => {
    const primaryBadge = getRoleBadgeMeta(guru.role || 'guru', appData);
    const addRoles = Array.isArray(guru.additionalRoles) ? guru.additionalRoles : [];
    const duties = Array.isArray(guru.tugasTambahanList) && guru.tugasTambahanList.length > 0
      ? guru.tugasTambahanList
      : guru.tugasTambahan ? guru.tugasTambahan.split(',').map(s => s.trim()).filter(Boolean) : [];

    onOpenModal(
      `Biodata Guru: ${guru.nama}`,
      <div className="space-y-4 text-slate-800 dark:text-slate-100 max-h-[80vh] overflow-y-auto pr-1">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-850 border border-blue-100 dark:border-slate-700">
          {guru.foto ? (
            <img
              src={guru.foto}
              alt={guru.nama}
              className="w-14 h-14 rounded-2xl object-cover shadow-md shrink-0 border-2 border-white dark:border-slate-700"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
              {guru.nama ? guru.nama.charAt(0).toUpperCase() : 'G'}
            </div>
          )}
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{guru.nama}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${primaryBadge.badgeClass}`}>
                {primaryBadge.label} (Role Utama)
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-mono">
                NIP: {guru.nip || '-'}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 font-mono">
                NUPTK: {guru.nuptk || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Dua Kotak Terpisah: Peran Sistem & Hak Akses vs Tugas Tambahan Sekolah */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Box A: Peran Sistem & Hak Akses Akun */}
          <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>1. Peran Akun &amp; Hak Akses</span>
              </h4>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseModal();
                    setTimeout(() => handleOpenRoleModal(guru), 200);
                  }}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Ubah Role</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">Role Utama Sistem</span>
                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${primaryBadge.badgeClass}`}>
                  {primaryBadge.label}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                  Role Tambahan / Multi-Role ({addRoles.length})
                </span>
                {addRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {addRoles.map((rId) => {
                      const rMeta = getRoleBadgeMeta(rId, appData);
                      return (
                        <span key={rId} className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${rMeta.badgeClass}`}>
                          +{rMeta.label}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs italic">Tidak ada role tambahan</span>
                )}
              </div>
            </div>
          </div>

          {/* Box B: Tugas Tambahan & Fungsional Sekolah */}
          <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-400">
                <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>2. Tugas Tambahan Sekolah</span>
              </h4>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {duties.length} Tugas
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                  Tugas Fungsional Terpasang
                </span>
                {duties.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {duties.map((duty) => (
                      <span
                        key={duty}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1"
                      >
                        <Award className="w-3 h-3 text-amber-600" />
                        <span>{duty}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs italic">Tidak ada tugas tambahan</span>
                )}
              </div>

              {guru.mataPelajaran && (
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Mata Pelajaran Diampu</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{guru.mataPelajaran}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Box 1: Identitas Pribadi */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <User className="w-3.5 h-3.5" />
              <span>Identitas Pribadi</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block">NIK</span>
                <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{guru.nik || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Agama</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{getAgamaLabel(guru.agamaId)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Tempat Lahir</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{guru.tempatLahir || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Tanggal Lahir</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatTanggalIndonesia(guru.tanggalLahir) || guru.tanggalLahir || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Box 2: Kontak & Komunikasi */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Phone className="w-3.5 h-3.5" />
              <span>Kontak & Akun</span>
            </h4>
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 block">Nomor HP / WhatsApp</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  {guru.noHp || '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Email</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{guru.email || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Username Login</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">@{guru.username}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Box 3: Domisili / Alamat Lengkap */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <MapPin className="w-3.5 h-3.5" />
            <span>Alamat & Wilayah Tempat Tinggal</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="col-span-2 sm:col-span-4">
              <span className="text-[10px] text-slate-400 block">Alamat Lengkap</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{guru.alamat || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">RT / RW</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {guru.rt ? `RT ${guru.rt}` : '-'} / {guru.rw ? `RW ${guru.rw}` : '-'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Desa / Kelurahan</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{guru.desaKelurahan || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Kecamatan</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{guru.kecamatan || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Kota / Kabupaten</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{guru.kota || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Kode Pos / Wilayah</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {guru.kodePos || '-'} {guru.kodeWilayah ? `(${guru.kodeWilayah})` : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onCloseModal}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  };

  // Reset Password Handler
  const handleResetPassword = (guru: WaliKelas) => {
    if (readOnly) return;
    onConfirmModal(
      'Reset Password Guru',
      `Apakah Anda yakin ingin mereset password untuk guru "${guru.nama}" menjadi default: 123 ?`,
      'warning',
      () => {
        const updatedWali = appData.waliKelas.map((w) =>
          w.id === guru.id ? { ...w, password: '123' } : w
        );
        const updatedAppData = addAuditLog(
          { ...appData, waliKelas: updatedWali },
          'Reset Password Guru',
          `Reset password guru ${guru.nama} (${guru.username}) ke default 123`
        );
        onUpdateAppData(updatedAppData);
        onShowToast(`Password untuk ${guru.nama} berhasil direset ke "123"!`, 'success');
      }
    );
  };

  // Delete Handler
  const handleDeleteGuru = (guru: WaliKelas) => {
    if (readOnly) return;

    onConfirmModal(
      'Hapus Data Guru',
      `Apakah Anda yakin ingin menghapus data biodata guru "${guru.nama}" (${guru.nip || guru.nuptk || guru.username})? Tindakan ini tidak dapat dibatalkan.`,
      'danger',
      () => {
        const updatedWali = appData.waliKelas.filter((w) => w.id !== guru.id);
        const updatedKelas = appData.kelas.map((k) =>
          k.waliKelasId === guru.id ? { ...k, waliKelasId: '' } : k
        );

        const updatedAppData = addAuditLog(
          { ...appData, waliKelas: updatedWali, kelas: updatedKelas },
          'Hapus Data Guru',
          `Menghapus guru ${guru.nama} (${guru.username})`
        );
        onUpdateAppData(updatedAppData);
        onShowToast(`Data guru ${guru.nama} berhasil dihapus.`, 'success');
      }
    );
  };

  // Delete All Guru Handler
  const handleDeleteAllGuru = () => {
    if (readOnly || (appData.waliKelas || []).length === 0) return;

    onConfirmModal(
      'Hapus SEMUA Data Guru',
      `PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA biodata guru (${appData.waliKelas.length} data guru)? Tindakan ini akan mengosongkan seluruh data biodata guru.`,
      'danger',
      () => {
        const updatedKelas = (appData.kelas || []).map((k) => ({
          ...k,
          waliKelasId: '',
        }));

        const updatedAppData = addAuditLog(
          { ...appData, waliKelas: [], kelas: updatedKelas },
          'Hapus Semua Data Guru',
          `Menghapus seluruh biodata guru (${appData.waliKelas.length} guru).`
        );
        onUpdateAppData(updatedAppData);
        onShowToast('Semua data guru berhasil dihapus.', 'success');
      }
    );
  };

  // Open Form Modal (Add / Edit) - Strictly Biodata
  const handleOpenGuruModal = (guruToEdit?: WaliKelas) => {
    if (readOnly) return;

    onOpenModal(
      guruToEdit ? `Edit Biodata Guru: ${guruToEdit.nama}` : 'Tambah Biodata Guru Baru',
      <GuruFormModalContent
        guruToEdit={guruToEdit}
        appData={appData}
        onUpdateAppData={onUpdateAppData}
        onCloseModal={onCloseModal}
        onShowToast={onShowToast}
      />
    );
  };

  // Handle successful import from ImportGuruModal
  const handleImportSuccess = (importedCount: number, updatedCount: number, newWaliList: WaliKelas[]) => {
    const updatedAppData = addAuditLog(
      { ...appData, waliKelas: newWaliList },
      'Import Biodata Guru',
      `Import Excel biodata guru selesai: ${importedCount} guru baru ditambahkan, ${updatedCount} diperbarui. Total guru: ${newWaliList.length}.`
    );
    onUpdateAppData(updatedAppData);
    onShowToast(
      `Import Selesai! ${importedCount} data guru baru ditambahkan, ${updatedCount} diperbarui. Total guru sekarang: ${newWaliList.length}.`,
      'success'
    );
  };

  // Download Clean 18-Column Excel Template (Only 1 clear sample guide row)
  const handleDownloadTemplate = (isDemo = false) => {
    let templateRows: any[] = [];

    if (!isDemo) {
      templateRows = [
        {
          nip: '198501012010011001',
          nama: 'Ahmad Fauzi',
          nuptk: '1234567890123456',
          nik: '3201234567890001',
          jenis_kelamin: 'L',
          tempat_lahir: 'Bandung',
          tanggal_lahir: '1985-01-01',
          agama_id: '1',
          alamat: 'Jl. Merdeka No. 45',
          rt: '03',
          rw: '05',
          desa_kelurahan: 'Cibaduyut',
          kecamatan: 'Bojongloa Kidul',
          kota: 'Kota Bandung',
          kode_wilayah: '32.73.05',
          kode_pos: '40235',
          no_hp: '081234567890',
          email: 'ahmad.fauzi@sekolah.sch.id',
          mata_pelajaran: 'Matematika Wajib',
          jabatan: 'Guru Pengampu / Wali Kelas',
        },
      ];
    } else {
      templateRows = [
        {
          nip: '198501012010011001',
          nama: 'Ahmad Fauzi',
          nuptk: '1234567890123456',
          nik: '3201234567890001',
          jenis_kelamin: 'L',
          tempat_lahir: 'Bandung',
          tanggal_lahir: '1985-01-01',
          agama_id: '1',
          alamat: 'Jl. Merdeka No. 45',
          rt: '03',
          rw: '05',
          desa_kelurahan: 'Cibaduyut',
          kecamatan: 'Bojongloa Kidul',
          kota: 'Kota Bandung',
          kode_wilayah: '32.73.05',
          kode_pos: '40235',
          no_hp: '081234567890',
          email: 'ahmad.fauzi@sekolah.sch.id',
          mata_pelajaran: 'Matematika Wajib',
          jabatan: 'Wali Kelas X RPL 1',
        },
        {
          nip: '199002022015022002',
          nama: 'Siti Nurhaliza',
          nuptk: '9876543210987654',
          nik: '3201234567890002',
          jenis_kelamin: 'P',
          tempat_lahir: 'Jakarta',
          tanggal_lahir: '1990-02-02',
          agama_id: '1',
          alamat: 'Jl. Melati No. 12',
          rt: '01',
          rw: '02',
          desa_kelurahan: 'Sukasari',
          kecamatan: 'Sukasari',
          kota: 'Kota Bandung',
          kode_wilayah: '32.73.08',
          kode_pos: '40152',
          no_hp: '085712345678',
          email: 'siti.nurhaliza@sekolah.sch.id',
          mata_pelajaran: 'Bahasa Indonesia',
          jabatan: 'Wali Kelas XI TKJ 1',
        },
        {
          nip: '198203032008011003',
          nama: 'Budi Santoso',
          nuptk: '5566778899001122',
          nik: '3201234567890003',
          jenis_kelamin: 'L',
          tempat_lahir: 'Surabaya',
          tanggal_lahir: '1982-03-03',
          agama_id: '1',
          alamat: 'Jl. Pemuda No. 8',
          rt: '04',
          rw: '01',
          desa_kelurahan: 'Dago',
          kecamatan: 'Coblong',
          kota: 'Kota Bandung',
          kode_wilayah: '32.73.02',
          kode_pos: '40135',
          no_hp: '081398765432',
          email: 'budi.santoso@sekolah.sch.id',
          mata_pelajaran: 'Pemrograman Web',
          jabatan: 'Ketua Program Keahlian RPL',
        },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(templateRows);
    ws['!cols'] = [
      { wch: 22 }, // nip
      { wch: 25 }, // nama
      { wch: 20 }, // nuptk
      { wch: 20 }, // nik
      { wch: 15 }, // jenis_kelamin
      { wch: 18 }, // tempat_lahir
      { wch: 15 }, // tanggal_lahir
      { wch: 10 }, // agama_id
      { wch: 30 }, // alamat
      { wch: 8 },  // rt
      { wch: 8 },  // rw
      { wch: 20 }, // desa_kelurahan
      { wch: 20 }, // kecamatan
      { wch: 20 }, // kota
      { wch: 15 }, // kode_wilayah
      { wch: 12 }, // kode_pos
      { wch: 16 }, // no_hp
      { wch: 28 }, // email
      { wch: 22 }, // mata_pelajaran
      { wch: 24 }, // jabatan
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isDemo ? 'Demo Guru' : 'Template Guru');
    XLSX.writeFile(wb, isDemo ? 'Template_Demo_Guru_Lengkap.xlsx' : 'Template_Import_Guru_Siap_Diisi.xlsx');
    onShowToast(`Template Excel Guru ${isDemo ? 'Demo' : 'Siap Diisi'} berhasil diunduh!`, 'info');
  };

  // Export Data Guru in Exact Columns
  const handleExportExcel = () => {
    const dataToExport = filteredGuru.map((g) => ({
      nip: g.nip || '',
      nama: g.nama || '',
      nuptk: g.nuptk || '',
      nik: g.nik || '',
      jenis_kelamin: g.jenisKelamin || '',
      tempat_lahir: g.tempatLahir || '',
      tanggal_lahir: g.tanggalLahir || '',
      agama_id: g.agamaId || '',
      alamat: g.alamat || '',
      rt: g.rt || '',
      rw: g.rw || '',
      desa_kelurahan: g.desaKelurahan || '',
      kecamatan: g.kecamatan || '',
      kota: g.kota || '',
      kode_wilayah: g.kodeWilayah || '',
      kode_pos: g.kodePos || '',
      no_hp: g.noHp || '',
      email: g.email || '',
      mata_pelajaran: g.mataPelajaran || '',
      role_utama: getRoleBadgeMeta(g.role, appData).label,
      role_tambahan: (g.additionalRoles || []).map((r) => getRoleBadgeMeta(r, appData).label).join(', '),
      tugas_tambahan: (g.tugasTambahanList || []).join(', ') || g.tugasTambahan || g.jabatan || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [
      { wch: 22 }, // nip
      { wch: 25 }, // nama
      { wch: 20 }, // nuptk
      { wch: 20 }, // nik
      { wch: 15 }, // jenis_kelamin
      { wch: 18 }, // tempat_lahir
      { wch: 15 }, // tanggal_lahir
      { wch: 10 }, // agama_id
      { wch: 30 }, // alamat
      { wch: 8 },  // rt
      { wch: 8 },  // rw
      { wch: 20 }, // desa_kelurahan
      { wch: 20 }, // kecamatan
      { wch: 20 }, // kota
      { wch: 15 }, // kode_wilayah
      { wch: 12 }, // kode_pos
      { wch: 16 }, // no_hp
      { wch: 28 }, // email
      { wch: 22 }, // mata_pelajaran
      { wch: 20 }, // role_utama
      { wch: 25 }, // role_tambahan
      { wch: 30 }, // tugas_tambahan
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Master Guru');
    XLSX.writeFile(wb, `Master_Data_Guru_Biodata_${new Date().toISOString().slice(0, 10)}.xlsx`);
    onShowToast('Master Biodata Guru berhasil diexport ke Excel!', 'success');
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Master Data Biodata & Peran Guru"
        description="Pusat data biodata lengkap tenaga pendidik serta pengelolaan penugasan Role Utama, Role Tambahan (Multi-Role), dan Tugas Fungsional Sekolah (Wali Kelas, Pembina OSIS, Kepala Lab, BP/BK, dll.)."
        icon={Users}
        actions={
          !readOnly ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenModal(
                    'Pengaturan Hari Mengajar Guru (Semua Shift & Kelompok)',
                    <PengaturanHariMengajarModalContent
                      appData={appData}
                      onUpdateAppData={onUpdateAppData}
                      onCloseModal={onCloseModal}
                      onShowToast={onShowToast}
                    />
                  );
                }}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                title="Atur Hari Mengajar Seluruh Shift & Kelompok Guru"
              >
                <Calendar className="w-4 h-4" />
                <span>Pengaturan Hari Mengajar</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenGuruModal()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Guru Baru</span>
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{totalGuru}</div>
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Total Guru</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{totalLaki}</div>
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Laki-laki (L)</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{totalPerempuan}</div>
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Perempuan (P)</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{totalNuptk}</div>
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">NUPTK Tercatat</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{totalMultiRole}</div>
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Multi-Role / Tugas</div>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari NAMA, NIP, PERAN, TUGAS TAMBAHAN, MAPEL, ALAMAT, NO HP..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: List & Grid */}
            <div className="flex items-center bg-slate-150 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Tampilan Tabel / List"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Tampilan Kartu / Grid"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
            >
              <option value="semua">Semua Role & Tugas</option>
              <option value="guru">Guru Pengampu</option>
              <option value="wali">Wali Kelas</option>
              <option value="kesiswaan">WKS Kesiswaan / BK</option>
              <option value="kurikulum">WKS Kurikulum</option>
              <option value="staf_jadwal">Staf Pengelola Jadwal</option>
              <option value="hubin">WKS Hubin & Humas</option>
              <option value="admin">Administrator</option>
              {allRoles
                .filter((r) => !r.isSystem)
                .map((cr) => (
                  <option key={cr.roleId} value={cr.roleId}>
                    {cr.roleName} (Kustom)
                  </option>
                ))}
            </select>

            {/* JK Filter */}
            <select
              value={jkFilter}
              onChange={(e) => {
                setJkFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
            >
              <option value="semua">Semua Gender</option>
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>

            {/* Excel & Schedule Actions */}
            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onOpenModal(
                      'Pengaturan Hari Mengajar Guru (Semua Shift & Kelompok)',
                      <PengaturanHariMengajarModalContent
                        appData={appData}
                        onUpdateAppData={onUpdateAppData}
                        onCloseModal={onCloseModal}
                        onShowToast={onShowToast}
                      />
                    );
                  }}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Pengaturan Hari Mengajar Massal Semua Shift & Kelompok"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Hari Mengajar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Buka Wizard Import Excel Guru"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Import Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadTemplate(false)}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Unduh Format Template Excel Biodata Guru"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Template</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Export Data Biodata & Peran Guru ke Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {!readOnly && (appData.waliKelas || []).length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllGuru}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Hapus Seluruh Data Guru"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hapus Semua</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area: List View or Grid View */}
      {viewMode === 'grid' ? (
        <div className="space-y-4">
          {pagedGuru.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-12 text-center text-slate-400">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Users className="w-8 h-8 opacity-40" />
                <p className="font-bold">Tidak ada data guru ditemukan.</p>
                <p className="text-[11px] text-slate-500">
                  Coba sesuaikan kata kunci pencarian atau filter role.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {pagedGuru.map((guru, index) => {
                const globalIdx = startIdx + index + 1;
                const fullNama = guru.nama;
                const ttl = formatTTL(guru.tempatLahir, guru.tanggalLahir);
                const primaryBadge = getRoleBadgeMeta(guru.role, appData);
                const addRoles = Array.isArray(guru.additionalRoles) ? guru.additionalRoles : [];
                const duties = Array.isArray(guru.tugasTambahanList) && guru.tugasTambahanList.length > 0
                  ? guru.tugasTambahanList
                  : guru.tugasTambahan ? guru.tugasTambahan.split(',').map(s => s.trim()).filter(Boolean) : [];

                return (
                  <div
                    key={guru.id}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700/60 transition duration-150 flex flex-col justify-between p-4"
                  >
                    <div>
                      {/* Card Header: Avatar, Nama, No */}
                      <div className="flex items-start justify-between gap-2.5 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {guru.foto ? (
                            <img
                              src={guru.foto}
                              alt={guru.nama}
                              className="w-10 h-10 rounded-2xl object-cover shrink-0 shadow-xs border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-sm shrink-0 shadow-xs">
                              {guru.nama ? guru.nama.charAt(0).toUpperCase() : 'G'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate" title={fullNama}>
                              {fullNama}
                            </h4>
                            <span className="text-[11px] text-slate-400 font-mono block truncate">
                              @{guru.username}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                          #{globalIdx}
                        </span>
                      </div>

                      {/* Card Body: Roles & Badges Terpisah Rapi */}
                      <div className="space-y-2 py-2.5 border-t border-b border-slate-100 dark:border-slate-800 text-xs">
                        {/* 1. Bagian Peran Sistem */}
                        <div className="p-2 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/40">
                          <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            <ShieldCheck className="w-3 h-3 text-indigo-600" />
                            <span>Peran Sistem (Akses)</span>
                          </span>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${primaryBadge.badgeClass}`}>
                              {primaryBadge.label}
                            </span>
                            {addRoles.map((rId) => {
                              const rMeta = getRoleBadgeMeta(rId, appData);
                              return (
                                <span key={rId} className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${rMeta.badgeClass}`}>
                                  +{rMeta.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Bagian Tugas Tambahan Sekolah */}
                        <div className="p-2 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100/80 dark:border-amber-900/40">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                              <Award className="w-3 h-3 text-amber-600" />
                              <span>Tugas Tambahan</span>
                            </span>
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300">
                              {duties.length > 0 ? `${duties.length}` : '0'}
                            </span>
                          </div>
                          {duties.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {duties.map((duty) => (
                                <span
                                  key={duty}
                                  className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                >
                                  {duty}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Tidak ada tugas tambahan</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[11px] font-semibold text-slate-400">NIP</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {guru.nip || <span className="text-slate-400 font-normal font-sans">-</span>}
                          </span>
                        </div>

                        {guru.mataPelajaran && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-400">Mapel</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[150px]">
                              {guru.mataPelajaran}
                            </span>
                          </div>
                        )}

                        {/* 3. Baris Hari Mengajar */}
                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-600" />
                            <span>Hari Mengajar</span>
                          </span>
                          <div className="flex items-center gap-1">
                            {(guru.hariMengajar && guru.hariMengajar.length > 0 ? guru.hariMengajar : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']).map((d) => (
                              <span
                                key={d}
                                className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[8px] font-black flex items-center justify-center shadow-2xs"
                                title={`Hari Mengajar: ${d}`}
                              >
                                {d.substring(0, 1)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Action Buttons */}
                    <div className="flex items-center justify-between gap-1.5 pt-3 mt-1">
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => handleOpenRoleModal(guru)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 transition flex items-center gap-1 cursor-pointer border border-indigo-200 dark:border-indigo-800"
                          title="Kelola Role & Tugas Tambahan Guru Ini"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Atur Role</span>
                        </button>
                      ) : <div />}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleViewDetailGuru(guru)}
                          className="p-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                          title="Lihat Detail Lengkap Biodata Guru"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {!readOnly && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenGuruModal(guru)}
                              className="p-1.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                              title="Edit Biodata Lengkap"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteGuru(guru)}
                              className="p-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                              title="Hapus Data Guru"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination for Grid View */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-4">
            <Pagination
              currentPage={validCurrentPage}
              totalPages={totalPages}
              pageSize={validPageSize}
              totalItems={filteredGuru.length}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      ) : (
        /* Table Data Guru Biodata (List View) */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition w-44"
                    onClick={() => handleSort('nip')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>NIP & Akun</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
                    onClick={() => handleSort('nama')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nama Guru</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition w-64"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Peran & Tugas Tambahan</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition hidden md:table-cell"
                    onClick={() => handleSort('tempatLahir')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>TTL & Kontak</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center w-40">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-200">
                {pagedGuru.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="w-8 h-8 opacity-40" />
                        <p className="font-bold">Tidak ada data guru ditemukan.</p>
                        <p className="text-[11px] text-slate-500">
                          Coba sesuaikan kata kunci pencarian atau filter role.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedGuru.map((guru, index) => {
                    const globalIdx = startIdx + index + 1;
                    const fullNama = guru.nama;
                    const ttl = formatTTL(guru.tempatLahir, guru.tanggalLahir);
                    const primaryBadge = getRoleBadgeMeta(guru.role, appData);
                    const addRoles = Array.isArray(guru.additionalRoles) ? guru.additionalRoles : [];
                    const duties = Array.isArray(guru.tugasTambahanList) && guru.tugasTambahanList.length > 0
                      ? guru.tugasTambahanList
                      : guru.tugasTambahan ? guru.tugasTambahan.split(',').map(s => s.trim()).filter(Boolean) : [];

                    return (
                      <tr
                        key={guru.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition duration-150"
                      >
                        <td className="py-3 px-3 text-center font-bold text-slate-400">
                          {globalIdx}
                        </td>

                        {/* NIP & Username */}
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {guru.nip || <span className="text-slate-400 font-normal font-sans">-</span>}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            @{guru.username}
                          </div>
                        </td>

                        {/* Nama */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {guru.foto ? (
                              <img
                                src={guru.foto}
                                alt={guru.nama}
                                className="w-8 h-8 rounded-full object-cover shrink-0 shadow-xs border border-slate-200 dark:border-slate-700"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                                {guru.nama ? guru.nama.charAt(0).toUpperCase() : 'G'}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {fullNama}
                              </div>
                              {guru.mataPelajaran && (
                                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate max-w-[180px]">
                                  {guru.mataPelajaran}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Peran & Tugas Tambahan Column (Terpisah Rapi) */}
                        <td className="py-3 px-4">
                          <div className="space-y-1.5 min-w-[210px]">
                            {/* 1. Baris Peran Sistem */}
                            <div>
                              <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1 mb-0.5">
                                <ShieldCheck className="w-2.5 h-2.5 text-indigo-600" />
                                <span>Peran Sistem</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1">
                                <span
                                  onClick={() => !readOnly && handleOpenRoleModal(guru)}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${primaryBadge.badgeClass} ${!readOnly ? 'cursor-pointer hover:opacity-80' : ''}`}
                                  title={!readOnly ? 'Klik untuk mengubah role / tugas' : undefined}
                                >
                                  {primaryBadge.label}
                                </span>
                                {addRoles.map((rId) => {
                                  const rMeta = getRoleBadgeMeta(rId, appData);
                                  return (
                                    <span key={rId} className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${rMeta.badgeClass}`}>
                                      +{rMeta.label}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {/* 2. Baris Tugas Tambahan Sekolah */}
                            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                              <div className="text-[9px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1 mb-0.5">
                                <Award className="w-2.5 h-2.5 text-amber-600" />
                                <span>Tugas Tambahan</span>
                              </div>
                              {duties.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {duties.map((duty) => (
                                    <span
                                      key={duty}
                                      className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                    >
                                      {duty}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Tidak ada tugas tambahan</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* TTL & Kontak */}
                        <td className="py-3 px-4 hidden md:table-cell">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {ttl}
                          </div>
                          {guru.noHp && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{guru.noHp}</span>
                            </div>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => handleOpenRoleModal(guru)}
                                className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
                                title="Kelola Role & Tugas Tambahan Guru Ini"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleViewDetailGuru(guru)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Lihat Detail Lengkap Biodata Guru"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            {!readOnly && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleResetPassword(guru)}
                                  className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                                  title="Reset Password ke default 123"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenGuruModal(guru)}
                                  className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                                  title="Edit Biodata Guru"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteGuru(guru)}
                                  className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                  title="Hapus Biodata Guru"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Pagination
              currentPage={validCurrentPage}
              totalPages={totalPages}
              pageSize={validPageSize}
              totalItems={filteredGuru.length}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal Wizard Import Guru */}
      <ImportGuruModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        appData={appData}
        onImportSuccess={handleImportSuccess}
        onShowToast={onShowToast}
      />
    </div>
  );
};
