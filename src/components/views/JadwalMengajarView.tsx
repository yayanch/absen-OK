import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Calendar,
  CalendarRange,
  Clock,
  BookOpen,
  Users,
  UserCheck,
  GraduationCap,
  Plus,
  Search,
  Trash2,
  Edit,
  Copy,
  Download,
  Upload,
  Printer,
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  List,
  DoorOpen,
  Sun,
  Sunset,
  Sparkles,
  Flag,
  HeartHandshake,
  Info,
  X,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Table2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AppData, JadwalMengajarGuru, UserSession, WaliKelas, Kelas, MataPelajaran, ViewType, GuruMapelKelasItem } from '../../types';
import { PageHeader } from '../common/UIComponents';
import { Pagination } from '../Pagination';
import { SearchableSelect, SearchableOption } from '../common/SearchableSelect';
import { addAuditLog, cleanMapelName, determineKelasKelompok, extractKelasTingkat } from '../../utils/helpers';
import { DEFAULT_MATA_PELAJARAN } from '../../data/initialData';
import { AbsenHarianGuruTab } from './AbsenHarianGuruTab';
import { isMenuAllowed } from '../../utils/rolePermissionEngine';

export { determineKelasKelompok, extractKelasTingkat };

interface JadwalMengajarViewProps {
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

// Exactly the 5 working days: Senin - Jumat
export const HARI_SENIN_JUMAT = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const;
export type HariKerja = (typeof HARI_SENIN_JUMAT)[number];

// Standard lesson periods 1 to 10 (Both Shift Pagi and Shift Siang have 10 jam pelajaran)
export const LIST_JAM_ANGKA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// Jam Pelajaran timing configuration per shift
// Shift Pagi: Mulai 06.30, 30 menit/JP, Istirahat 08.30-09.00, Berakhir 12.00
// Shift Siang: Mulai 13.00, 20 menit/JP, Istirahat 15.00-15.30, Berakhir 16.50
export const JAM_PELAJARAN_TIMES = {
  Pagi: {
    1: '06.30 - 07.00',
    2: '07.00 - 07.30',
    3: '07.30 - 08.00',
    4: '08.00 - 08.30',
    5: '09.00 - 09.30',
    6: '09.30 - 10.00',
    7: '10.00 - 10.30',
    8: '10.30 - 11.00',
    9: '11.00 - 11.30',
    10: '11.30 - 12.00',
  },
  Siang: {
    1: '13.00 - 13.20',
    2: '13.20 - 13.40',
    3: '13.40 - 14.00',
    4: '14.00 - 14.20',
    5: '14.20 - 14.40',
    6: '14.40 - 15.00',
    7: '15.30 - 15.50',
    8: '15.50 - 16.10',
    9: '16.10 - 16.30',
    10: '16.30 - 16.50',
  },
} as const;

export function getJamPelajaranTime(jamNum: number, shift: 'Pagi' | 'Siang' = 'Pagi'): string {
  const normShift = shift === 'Siang' ? 'Siang' : 'Pagi';
  return JAM_PELAJARAN_TIMES[normShift]?.[jamNum as keyof (typeof JAM_PELAJARAN_TIMES)['Pagi']] || '';
}

// 4 Matrix Shift & Kelompok Configurations
export type MatrixShiftOptionId = 'pagi_k1' | 'siang_k2' | 'pagi_k2' | 'siang_k1';

export interface MatrixShiftOption {
  id: MatrixShiftOptionId;
  label: string;
  shift: 'Pagi' | 'Siang';
  kelompok: 1 | 2;
  kelompokLabel: string;
  tingkatLabel: string;
  icon: typeof Sun;
  activeColor: string;
}

export const MATRIX_SHIFT_OPTIONS: MatrixShiftOption[] = [
  {
    id: 'pagi_k1',
    label: 'Shift Pagi Kelas X & XI',
    shift: 'Pagi',
    kelompok: 1,
    kelompokLabel: 'Kelas X & XI',
    tingkatLabel: 'Kelas X & XI',
    icon: Sun,
    activeColor: 'bg-amber-500 text-white shadow-xs',
  },
  {
    id: 'siang_k1',
    label: 'Shift Siang Kelas X & XI',
    shift: 'Siang',
    kelompok: 1,
    kelompokLabel: 'Kelas X & XI',
    tingkatLabel: 'Kelas X & XI',
    icon: Sunset,
    activeColor: 'bg-indigo-600 text-white shadow-xs',
  },
  {
    id: 'pagi_k2',
    label: 'Shift Pagi Kelas XII',
    shift: 'Pagi',
    kelompok: 2,
    kelompokLabel: 'Kelas XII',
    tingkatLabel: 'Kelas XII',
    icon: Sun,
    activeColor: 'bg-amber-500 text-white shadow-xs',
  },
  {
    id: 'siang_k2',
    label: 'Shift Siang Kelas XII',
    shift: 'Siang',
    kelompok: 2,
    kelompokLabel: 'Kelas XII',
    tingkatLabel: 'Kelas XII',
    icon: Sunset,
    activeColor: 'bg-indigo-600 text-white shadow-xs',
  },
];

export interface TableShiftGroup {
  id: MatrixShiftOptionId;
  kelompok: 1 | 2;
  shift: 'Pagi' | 'Siang';
  kelompokTitle: string;
  kelompokTingkat: string;
  shiftTitle: string;
  shiftWaktu: string;
  icon: typeof Sun;
  headerColor: string;
  badgeColor: string;
  accentBorder: string;
}

export const TABLE_SHIFT_GROUPS: TableShiftGroup[] = [
  {
    id: 'pagi_k1',
    kelompok: 1,
    shift: 'Pagi',
    kelompokTitle: 'Kelompok 1 (Kelas X & XI)',
    kelompokTingkat: 'Kelas X & XI',
    shiftTitle: 'Shift Pagi',
    shiftWaktu: 'Jam Ke 1 s.d. 10 • 06.30 - 12.00 WIB (30 mnt/JP • Istirahat 08.30-09.00)',
    icon: Sun,
    headerColor: 'from-amber-500/15 via-amber-500/5 to-transparent border-amber-300 dark:border-amber-700/80',
    badgeColor: 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    accentBorder: 'border-l-4 border-l-amber-500',
  },
  {
    id: 'siang_k1',
    kelompok: 1,
    shift: 'Siang',
    kelompokTitle: 'Kelompok 1 (Kelas X & XI)',
    kelompokTingkat: 'Kelas X & XI',
    shiftTitle: 'Shift Siang',
    shiftWaktu: 'Jam Ke 1 s.d. 10 • 13.00 - 17.20 WIB (20 mnt/JP • Istirahat 15.00-15.30)',
    icon: Sunset,
    headerColor: 'from-indigo-500/15 via-indigo-500/5 to-transparent border-indigo-300 dark:border-indigo-700/80',
    badgeColor: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700',
    accentBorder: 'border-l-4 border-l-indigo-600',
  },
  {
    id: 'pagi_k2',
    kelompok: 2,
    shift: 'Pagi',
    kelompokTitle: 'Kelompok 2 (Kelas XII)',
    kelompokTingkat: 'Kelas XII',
    shiftTitle: 'Shift Pagi',
    shiftWaktu: 'Jam Ke 1 s.d. 10 • 06.30 - 12.00 WIB (30 mnt/JP • Istirahat 08.30-09.00)',
    icon: Sun,
    headerColor: 'from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-300 dark:border-emerald-700/80',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
    accentBorder: 'border-l-4 border-l-emerald-600',
  },
  {
    id: 'siang_k2',
    kelompok: 2,
    shift: 'Siang',
    kelompokTitle: 'Kelompok 2 (Kelas XII)',
    kelompokTingkat: 'Kelas XII',
    shiftTitle: 'Shift Siang',
    shiftWaktu: 'Jam Ke 1 s.d. 10 • 13.00 - 17.20 WIB (20 mnt/JP • Istirahat 15.00-15.30)',
    icon: Sunset,
    headerColor: 'from-sky-500/15 via-sky-500/5 to-transparent border-sky-300 dark:border-sky-700/80',
    badgeColor: 'bg-sky-100 dark:bg-sky-950/80 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-700',
    accentBorder: 'border-l-4 border-l-sky-500',
  },
];

export type ScheduleSortField = 'kelompok_shift' | 'hari' | 'mapel' | 'guru' | 'kelas' | 'jam';

// Helper to parse jamKe string (e.g. "1 - 3" or "1,2,3") to numbers array
export function parseJamKeList(jamKeStr?: string, existingList?: number[]): number[] {
  if (existingList && existingList.length > 0) {
    return Array.from(new Set(existingList)).sort((a, b) => a - b);
  }
  if (!jamKeStr) return [];
  const clean = jamKeStr.trim();
  const rangeMatch = clean.match(/^(\d+)\s*[-–s.d]+\s*(\d+)$/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    const list: number[] = [];
    for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
      if (i >= 1 && i <= 10) list.push(i);
    }
    return list;
  }
  // Comma or space separated
  const numbers = clean.match(/\d+/g);
  if (numbers) {
    return Array.from(
      new Set(numbers.map((n) => parseInt(n, 10)).filter((n) => n >= 1 && n <= 10))
    ).sort((a, b) => a - b);
  }
  return [];
}

export function formatJamKeDisplay(list: number[]): string {
  if (!list || list.length === 0) return '-';
  const sorted = [...list].sort((a, b) => a - b);
  if (sorted.length === 1) return `Jam ke-${sorted[0]}`;

  // Check if consecutive
  const isConsecutive = sorted.every((val, idx) => idx === 0 || val === sorted[idx - 1] + 1);
  if (isConsecutive) {
    return `Jam ke-${sorted[0]} - ${sorted[sorted.length - 1]} (${sorted.length} JP)`;
  }
  return `Jam ke-${sorted.join(', ')} (${sorted.length} JP)`;
}

export const JadwalMengajarView: React.FC<JadwalMengajarViewProps> = ({
  appData,
  currentUser,
  readOnly = false,
  onUpdateAppData,
  onOpenModal,
  onCloseModal,
  onConfirmModal,
  onShowToast,
  onNavigateView,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Main Tab: 'matriks' (Grid Jadwal Mingguan) vs 'tabel' (Daftar & Kelola) vs 'absen_guru' (Absen Harian Guru)
  const [activeTab, setActiveTab] = useState<'matriks' | 'tabel' | 'absen_guru'>('matriks');
  // Modal state untuk formulir input/edit jadwal (hanya muncul saat klik "+ Isi" pada matriks atau edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // Master Data collections (excludes piket petugas from teaching schedules)
  const canAccessAbsenGuru = useMemo(() => {
    const r = currentUser.role;
    return (
      r === 'kurikulum' ||
      r === 'admin_kurikulum' ||
      r === 'piket_guru' ||
      r === 'piket' ||
      r === 'admin' ||
      r === 'superadmin' ||
      isMenuAllowed(r, 'absen_harian_guru', appData)
    );
  }, [currentUser.role, appData]);

  const guruList: WaliKelas[] = useMemo(() => {
    return (appData.waliKelas || [])
      .filter((g) => {
        const r = String(g.role || '').toLowerCase();
        const u = String(g.username || '').toLowerCase();
        const n = String(g.nama || '').toLowerCase();
        return !(
          r === 'piket' ||
          r === 'piket_guru' ||
          r === 'piket_kesiswaan' ||
          u === 'piket_guru' ||
          u === 'piket_kesiswaan' ||
          u.startsWith('piket_') ||
          n.includes('(piket')
        );
      })
      .sort((a, b) =>
        (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' })
      );
  }, [appData.waliKelas]);

  const kelasList: Kelas[] = useMemo(() => {
    return [...(appData.kelas || [])].sort((a, b) =>
      (a.nama || '').localeCompare(b.nama || '', 'id', { numeric: true })
    );
  }, [appData.kelas]);

  const mapelList: MataPelajaran[] = useMemo(() => {
    const list = appData.mataPelajaran || DEFAULT_MATA_PELAJARAN;
    return list
      .map((m) => ({
        ...m,
        nama: cleanMapelName(m.nama),
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
  }, [appData.mataPelajaran]);

  // User Role & Teacher Identity Detection
  const isAdmin = currentUser.role === 'admin';
  const isKurikulum = currentUser.role === 'kurikulum';
  const isStafJadwal = currentUser.role === 'staf_jadwal';
  const isGuruMapel = currentUser.role === 'guru' || currentUser.role === 'wali' || currentUser.role === 'user';
  const canManageAll = isAdmin || isKurikulum || isStafJadwal;
  const isTeacher = !canManageAll;

  // Resolve current logged-in teacher's profile
  const currentTeacherProfile = useMemo(() => {
    if (canManageAll || !currentUser) return null;
    const d = (currentUser.data || {}) as any;
    const rawUser = String((currentUser as any)?.username || d.username || '').toLowerCase().trim();
    const uid = String(d.id || '').trim();
    const uname = rawUser;
    const unip = String(d.nip || '').toLowerCase().trim();
    const unama = String(d.nama || '').toLowerCase().trim();

    // Look up in waliKelas for complete teacher profile
    const matchedInWali = (appData.waliKelas || []).find((w) => {
      if (uid && w.id === uid) return true;
      if (uname && w.username && String(w.username).toLowerCase().trim() === uname) return true;
      if (unip && w.nip && String(w.nip).toLowerCase().trim() === unip) return true;
      if (unama && w.nama && String(w.nama).toLowerCase().trim() === unama) return true;
      return false;
    });

    return {
      id: matchedInWali?.id || uid,
      username: matchedInWali?.username || d.username || rawUser || '',
      nip: matchedInWali?.nip || d.nip || '',
      nama: matchedInWali?.nama || d.nama || rawUser || 'Guru',
      mataPelajaran: matchedInWali?.mataPelajaran || d.mataPelajaran || '',
    };
  }, [canManageAll, currentUser, appData.waliKelas]);

  // Predicate: Does this schedule belong to the logged-in teacher?
  const isMySchedule = useCallback(
    (j: JadwalMengajarGuru) => {
      if (canManageAll) return true;
      if (!currentTeacherProfile) return false;

      const profId = currentTeacherProfile.id?.toLowerCase().trim();
      const profUser = currentTeacherProfile.username?.toLowerCase().trim();
      const profNip = currentTeacherProfile.nip?.toLowerCase().trim();
      const profNama = currentTeacherProfile.nama?.toLowerCase().trim();

      const jId = String(j.guruId || '').toLowerCase().trim();
      const jUser = String(j.guruUsername || '').toLowerCase().trim();
      const jNip = String(j.guruNip || '').toLowerCase().trim();
      const jNama = String(j.guruNama || '').toLowerCase().trim();

      // Check ID
      if (profId && jId && profId === jId) return true;
      // Check Username
      if (profUser && jUser && profUser === jUser) return true;
      // Check NIP
      if (profNip && jNip && profNip === jNip) return true;
      // Cross Check Username <-> NIP
      if (profUser && jNip && profUser === jNip) return true;
      if (profNip && jUser && profNip === jUser) return true;
      // Check Teacher Name
      if (profNama && jNama && profNama === jNama) return true;

      // Fallback directly to session data
      const rawUser = String((currentUser as any)?.username || (currentUser?.data as any)?.username || '').toLowerCase().trim();
      const rawNama = String((currentUser?.data as any)?.nama || '').toLowerCase().trim();
      if (rawUser && jUser && rawUser === jUser) return true;
      if (rawNama && jNama && rawNama === jNama) return true;

      return false;
    },
    [canManageAll, currentTeacherProfile, currentUser]
  );

  // Raw master schedules
  const allJadwalList: JadwalMengajarGuru[] = useMemo(() => {
    return appData.jadwalMengajar || [];
  }, [appData.jadwalMengajar]);

  // Active schedules: strictly only current teacher's schedules if teacher, or all if admin/kurikulum
  const jadwalList: JadwalMengajarGuru[] = useMemo(() => {
    if (canManageAll) return allJadwalList;
    return allJadwalList.filter(isMySchedule);
  }, [canManageAll, allJadwalList, isMySchedule]);

  /* =========================================================================
     FORM STATE: Specific format requested by User
     - Nama Guru (dropdown)
     - Hari (dropdown senin-jumat)
     - Kelas (dropdown)
     - Shift: Shift Pagi atau Shift Siang
     - Jam dengan angka 1-10 (bulatan biru)
     ========================================================================= */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formGuruUsername, setFormGuruUsername] = useState<string>(
    isTeacher && currentTeacherProfile ? currentTeacherProfile.username : guruList[0]?.username || ''
  );
  const [formHari, setFormHari] = useState<HariKerja>('Senin');
  const [formKelasId, setFormKelasId] = useState<string>(kelasList[0]?.id || '');
  const [formShift, setFormShift] = useState<'Pagi' | 'Siang'>('Pagi');
  const [formSelectedJam, setFormSelectedJam] = useState<number[]>([1, 2, 3]);

  // Additional fields
  const [formMataPelajaran, setFormMataPelajaran] = useState<string>(
    isTeacher && currentTeacherProfile?.mataPelajaran ? currentTeacherProfile.mataPelajaran : mapelList[0]?.nama || ''
  );
  const [formKodeMapel, setFormKodeMapel] = useState<string>(mapelList[0]?.kode || '');
  const [formCatatan, setFormCatatan] = useState<string>('');

  // Helper to resolve kelompok for a class (with fallback to lookup by id)
  const getKelasKelompok = (kelasNama?: string, kelasId?: string): 1 | 2 => {
    if (kelasNama) return determineKelasKelompok(kelasNama);
    if (kelasId) {
      const found = kelasList.find((k) => k.id === kelasId);
      if (found) return determineKelasKelompok(found.nama);
    }
    return 1;
  };

  /* =========================================================================
     FILTER & SEARCH STATES FOR TABLE & MATRIX
     ========================================================================= */
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState<string>('semua');
  const [filterKelompok, setFilterKelompok] = useState<'semua' | 1 | 2>('semua');
  const [tableShiftOption, setTableShiftOption] = useState<'semua' | MatrixShiftOptionId>('semua');
  const [tableLayoutMode, setTableLayoutMode] = useState<'grouped' | 'flat'>('grouped');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleSelectTableShiftOption = (option: 'semua' | MatrixShiftOptionId) => {
    setTableShiftOption(option);
    setCurrentPage(1);
    if (option === 'semua') {
      setFilterShift('semua');
      setFilterKelompok('semua');
    } else if (option === 'pagi_k1') {
      setFilterShift('Pagi');
      setFilterKelompok(1);
    } else if (option === 'siang_k1') {
      setFilterShift('Siang');
      setFilterKelompok(1);
    } else if (option === 'pagi_k2') {
      setFilterShift('Pagi');
      setFilterKelompok(2);
    } else if (option === 'siang_k2') {
      setFilterShift('Siang');
      setFilterKelompok(2);
    }
  };

  const handleFilterShiftChange = (newShift: string) => {
    setFilterShift(newShift);
    setCurrentPage(1);
    if (newShift === 'semua' && filterKelompok === 'semua') {
      setTableShiftOption('semua');
    } else if (newShift === 'Pagi' && filterKelompok === 1) {
      setTableShiftOption('pagi_k1');
    } else if (newShift === 'Siang' && filterKelompok === 1) {
      setTableShiftOption('siang_k1');
    } else if (newShift === 'Pagi' && filterKelompok === 2) {
      setTableShiftOption('pagi_k2');
    } else if (newShift === 'Siang' && filterKelompok === 2) {
      setTableShiftOption('siang_k2');
    } else {
      setTableShiftOption('semua');
    }
  };

  const handleFilterKelompokChange = (newKel: 'semua' | 1 | 2) => {
    setFilterKelompok(newKel);
    setCurrentPage(1);
    if (newKel === 'semua' && filterShift === 'semua') {
      setTableShiftOption('semua');
    } else if (newKel === 1 && filterShift === 'Pagi') {
      setTableShiftOption('pagi_k1');
    } else if (newKel === 1 && filterShift === 'Siang') {
      setTableShiftOption('siang_k1');
    } else if (newKel === 2 && filterShift === 'Pagi') {
      setTableShiftOption('pagi_k2');
    } else if (newKel === 2 && filterShift === 'Siang') {
      setTableShiftOption('siang_k2');
    } else {
      setTableShiftOption('semua');
    }
  };

  const handleOpenAddWithShiftAndKelompok = (shift: 'Pagi' | 'Siang', kelompok: 1 | 2) => {
    resetForm();
    setFormShift(shift);
    const matchingClass = kelasList.find((k) => determineKelasKelompok(k.nama) === kelompok);
    if (matchingClass) {
      setFormKelasId(matchingClass.id);
    }
    setIsFormModalOpen(true);
  };

  const [filterHari, setFilterHari] = useState<string>('semua');
  const [filterKelas, setFilterKelas] = useState<string>('semua');
  const [filterGuru, setFilterGuru] = useState<string>('semua');
  const [filterAcuan, setFilterAcuan] = useState<'semua' | 'sesuai' | 'di_luar'>('semua');
  const [sortField, setSortField] = useState<ScheduleSortField>('kelompok_shift');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleHeaderSort = (field: ScheduleSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Matrix Filter State (per Kelas atau per Guru) & 4 Shift/Kelompok Matrix
  const [matrixMode, setMatrixMode] = useState<'kelas' | 'guru'>('guru');
  const [matrixShiftOption, setMatrixShiftOption] = useState<MatrixShiftOptionId>('pagi_k1');

  const activeMatrixOption = useMemo(() => {
    return MATRIX_SHIFT_OPTIONS.find((o) => o.id === matrixShiftOption) || MATRIX_SHIFT_OPTIONS[0];
  }, [matrixShiftOption]);

  const [matrixSelectedKelasId, setMatrixSelectedKelasId] = useState<string>(() => {
    const firstMatching = kelasList.find((k) => determineKelasKelompok(k.nama) === 1);
    return firstMatching?.id || kelasList[0]?.id || '';
  });
  const [matrixSelectedGuruUsername, setMatrixSelectedGuruUsername] = useState<string>(
    isTeacher && currentTeacherProfile ? currentTeacherProfile.username : guruList[0]?.username || ''
  );

  const handleSelectMatrixOption = (optionId: MatrixShiftOptionId) => {
    setMatrixShiftOption(optionId);
    const targetOpt = MATRIX_SHIFT_OPTIONS.find((o) => o.id === optionId);
    if (targetOpt && matrixMode === 'kelas') {
      const curKelompok = getKelasKelompok(undefined, matrixSelectedKelasId);
      if (curKelompok !== targetOpt.kelompok) {
        const match = kelasList.find((k) => determineKelasKelompok(k.nama) === targetOpt.kelompok);
        if (match) {
          setMatrixSelectedKelasId(match.id);
        }
      }
    }
  };

  // Horizontal Matrix Table Scroll Controls
  const matrixScrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollPosition = useCallback(() => {
    const el = matrixScrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = matrixScrollContainerRef.current;
    if (!el) return;

    checkScrollPosition();
    el.addEventListener('scroll', checkScrollPosition, { passive: true });
    window.addEventListener('resize', checkScrollPosition);

    // Initial check after paint and after layout updates
    const timer1 = setTimeout(checkScrollPosition, 50);
    const timer2 = setTimeout(checkScrollPosition, 200);
    const timer3 = setTimeout(checkScrollPosition, 500);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        checkScrollPosition();
      });
      resizeObserver.observe(el);
    }

    return () => {
      el.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [checkScrollPosition, activeTab, matrixShiftOption, matrixMode, matrixSelectedKelasId, matrixSelectedGuruUsername]);

  const handleScrollMatrix = (direction: 'left' | 'right') => {
    const el = matrixScrollContainerRef.current;
    if (!el) return;
    const scrollAmount = 350;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Statistics Summary
  const shiftStats = useMemo(() => {
    let pagi = 0;
    let siang = 0;
    let totalJp = 0;
    let pagiJp = 0;
    let siangJp = 0;
    const guruSet = new Set<string>();

    jadwalList.forEach((j) => {
      const s = (j.shift || 'Pagi').toLowerCase();
      const jpCount = parseJamKeList(j.jamKe, j.jamKeList).length || 1;
      totalJp += jpCount;

      if (s === 'siang') {
        siang++;
        siangJp += jpCount;
      } else {
        pagi++;
        pagiJp += jpCount;
      }
      if (j.guruUsername) guruSet.add(j.guruUsername);
    });

    return {
      total: jadwalList.length,
      pagi,
      siang,
      totalGuru: guruSet.size,
      totalJp,
      pagiJp,
      siangJp,
    };
  }, [jadwalList]);

  // Toggle Jam Bulatan Biru
  const toggleJam = (jamNum: number) => {
    if (formHari === 'Senin' && formShift === 'Pagi' && (jamNum === 1 || jamNum === 2)) {
      onShowToast('Jam pelajaran 1-2 shift pagi adalah Upacara Bendera, bukan jam pelajaran!', 'warning');
      return;
    }
    if (formSelectedJam.includes(jamNum)) {
      setFormSelectedJam(formSelectedJam.filter((j) => j !== jamNum));
    } else {
      setFormSelectedJam([...formSelectedJam, jamNum].sort((a, b) => a - b));
    }
  };

  // Auto-clear jam 1 and 2 if user selects Hari Senin on Shift Pagi
  useEffect(() => {
    if (formHari === 'Senin' && formShift === 'Pagi') {
      setFormSelectedJam((prev) => prev.filter((j) => j !== 1 && j !== 2));
    }
  }, [formHari, formShift]);

  // =========================================================================
  // ACUAN MAPEL & KELAS GURU LOGIC & SYNCHRONIZATION
  // =========================================================================

  // Helper to get all assigned subject-class items for a specific teacher
  const getGuruAssignedItems = useCallback(
    (guruUsername?: string, guruId?: string, guruNama?: string, guruNip?: string): GuruMapelKelasItem[] => {
      const list = appData.guruMapelKelas || [];
      const gUser = String(guruUsername || '').toLowerCase().trim();
      const gId = String(guruId || '').toLowerCase().trim();
      const gNama = String(guruNama || '').toLowerCase().trim();
      const gNip = String(guruNip || '').toLowerCase().trim();

      const teacherInList = guruList.find(
        (g) =>
          (gUser && g.username.toLowerCase() === gUser) ||
          (gId && g.id.toLowerCase() === gId) ||
          (gNama && g.nama.toLowerCase() === gNama) ||
          (gNip && g.nip && g.nip.toLowerCase() === gNip)
      );

      const refId = (teacherInList?.id || gId).toLowerCase();
      const refUser = (teacherInList?.username || gUser).toLowerCase();
      const refNama = (teacherInList?.nama || gNama).toLowerCase();
      const refNip = (teacherInList?.nip || gNip).toLowerCase();

      return list.filter((item) => {
        const iId = String(item.guruId || '').toLowerCase().trim();
        const iUser = String(item.guruUsername || '').toLowerCase().trim();
        const iNama = String(item.guruNama || '').toLowerCase().trim();
        const iNip = String(item.guruNip || '').toLowerCase().trim();

        if (refId && iId && refId === iId) return true;
        if (refUser && iUser && refUser === iUser) return true;
        if (refNip && iNip && refNip === iNip) return true;
        if (refNama && iNama && refNama === iNama) return true;
        return false;
      });
    },
    [appData.guruMapelKelas, guruList]
  );

  // Helper to check if a schedule row matches the teacher's official assignment (acuan)
  const isJadwalMatchingAcuan = useCallback(
    (item: JadwalMengajarGuru): boolean => {
      const assigned = getGuruAssignedItems(item.guruUsername, item.guruId, item.guruNama, item.guruNip);
      if (assigned.length === 0) return false;

      const cleanItemMapel = cleanMapelName(item.mataPelajaran).toLowerCase().trim();
      return assigned.some((a) => {
        const cleanAssignedMapel = cleanMapelName(a.namaMapel).toLowerCase().trim();
        const mapelMatches =
          cleanItemMapel === cleanAssignedMapel ||
          (a.kodeMapel && item.kodeMapel && a.kodeMapel.toLowerCase() === item.kodeMapel.toLowerCase());
        const kelasMatches = (a.kelasIds || []).includes(item.kelasId);
        return mapelMatches && kelasMatches;
      });
    },
    [getGuruAssignedItems]
  );

  // Resolved teacher object for the current form
  const formSelectedTeacherObj = useMemo(() => {
    return guruList.find((g) => g.username === formGuruUsername);
  }, [guruList, formGuruUsername]);

  // Assigned mapels for the teacher currently selected in the form
  const assignedMapelForFormGuru = useMemo(() => {
    if (!formGuruUsername && !formSelectedTeacherObj) return [];
    return getGuruAssignedItems(
      formGuruUsername,
      formSelectedTeacherObj?.id,
      formSelectedTeacherObj?.nama,
      formSelectedTeacherObj?.nip
    );
  }, [formGuruUsername, formSelectedTeacherObj, getGuruAssignedItems]);

  // Matching assigned mapel item in form (if teacher is assigned to this mapel)
  const matchingAcuanMapel = useMemo(() => {
    const cleanInput = cleanMapelName(formMataPelajaran).toLowerCase().trim();
    if (!cleanInput) return null;
    return (
      assignedMapelForFormGuru.find(
        (m) =>
          cleanMapelName(m.namaMapel).toLowerCase().trim() === cleanInput ||
          (m.kodeMapel && formKodeMapel && m.kodeMapel.toLowerCase() === formKodeMapel.toLowerCase())
      ) || null
    );
  }, [assignedMapelForFormGuru, formMataPelajaran, formKodeMapel]);

  // Assigned classes for the selected teacher & mapel
  const formAssignedKelasList = useMemo(() => {
    if (matchingAcuanMapel && matchingAcuanMapel.kelasIds && matchingAcuanMapel.kelasIds.length > 0) {
      return kelasList.filter((k) => matchingAcuanMapel.kelasIds.includes(k.id));
    }
    if (assignedMapelForFormGuru.length > 0) {
      const allAssignedIds = new Set<string>();
      assignedMapelForFormGuru.forEach((m) => {
        (m.kelasIds || []).forEach((cId) => allAssignedIds.add(cId));
      });
      return kelasList.filter((k) => allAssignedIds.has(k.id));
    }
    return [];
  }, [matchingAcuanMapel, assignedMapelForFormGuru, kelasList]);

  // Classes outside the assigned list (if any)
  const formOtherKelasList = useMemo(() => {
    const assignedIds = new Set(formAssignedKelasList.map((k) => k.id));
    return kelasList.filter((k) => !assignedIds.has(k.id));
  }, [kelasList, formAssignedKelasList]);

  // Ensure formKelasId is valid whenever formAssignedKelasList changes
  useEffect(() => {
    if (isFormModalOpen && formAssignedKelasList.length > 0) {
      if (!formAssignedKelasList.some((k) => k.id === formKelasId)) {
        setFormKelasId(formAssignedKelasList[0].id);
      }
    }
  }, [isFormModalOpen, formAssignedKelasList, formKelasId]);

  // Ensure formMataPelajaran is valid when modal opens with assigned items
  useEffect(() => {
    if (isFormModalOpen && assignedMapelForFormGuru.length > 0) {
      const isCurrentValid = assignedMapelForFormGuru.some(
        (a) => cleanMapelName(a.namaMapel).toLowerCase().trim() === cleanMapelName(formMataPelajaran).toLowerCase().trim()
      );
      if (!isCurrentValid && !editingId) {
        const first = assignedMapelForFormGuru[0];
        setFormMataPelajaran(cleanMapelName(first.namaMapel));
        if (first.kodeMapel) setFormKodeMapel(first.kodeMapel);
        if (first.kelasIds && first.kelasIds.length > 0) {
          setFormKelasId(first.kelasIds[0]);
        }
      }
    }
  }, [isFormModalOpen, assignedMapelForFormGuru, formMataPelajaran, editingId]);

  // Existing scheduled JP for this teacher, class, and mapel (excluding current editing item)
  const existingScheduledJpForForm = useMemo(() => {
    if (!formGuruUsername || !formKelasId || !formMataPelajaran) return 0;
    const cleanInput = cleanMapelName(formMataPelajaran).toLowerCase().trim();
    let totalJp = 0;
    allJadwalList.forEach((j) => {
      if (editingId && j.id === editingId) return;
      if (j.guruUsername === formGuruUsername && j.kelasId === formKelasId) {
        if (cleanMapelName(j.mataPelajaran).toLowerCase().trim() === cleanInput) {
          const jList = parseJamKeList(j.jamKe, j.jamKeList);
          totalJp += jList.length;
        }
      }
    });
    return totalJp;
  }, [allJadwalList, editingId, formGuruUsername, formKelasId, formMataPelajaran]);

  // Fast-select an assigned Mapel & its first Class as the Acuan
  const handleSelectAcuanMapel = (item: GuruMapelKelasItem) => {
    setFormMataPelajaran(cleanMapelName(item.namaMapel));
    setFormKodeMapel(item.kodeMapel || '');
    if (item.kelasIds && item.kelasIds.length > 0) {
      if (!item.kelasIds.includes(formKelasId)) {
        setFormKelasId(item.kelasIds[0]);
      }
    }
    const targetJp = item.alokasiJp || 4;
    if (formSelectedJam.length <= 1) {
      const hours: number[] = [];
      for (let i = 1; i <= Math.min(targetJp, 4); i++) {
        hours.push(i);
      }
      setFormSelectedJam(hours.length > 0 ? hours : [1, 2]);
    }
  };

  // Quick schedule directly from Acuan widget
  const handleQuickScheduleFromAcuan = (item: GuruMapelKelasItem, targetKelasId: string) => {
    setEditingId(null);
    const teacherUser =
      item.guruUsername ||
      (guruList.find((g) => g.id === item.guruId)?.username) ||
      formGuruUsername ||
      guruList[0]?.username ||
      '';
    setFormGuruUsername(teacherUser);
    setFormMataPelajaran(cleanMapelName(item.namaMapel));
    setFormKodeMapel(item.kodeMapel || '');
    setFormKelasId(targetKelasId);

    const targetKelasObj = kelasList.find((k) => k.id === targetKelasId);
    const targetKelompok = getKelasKelompok(targetKelasObj?.nama, targetKelasId);
    setFormShift(activeMatrixOption.kelompok === targetKelompok ? activeMatrixOption.shift : 'Pagi');
    setFormHari('Senin');

    const targetJp = Math.min(item.alokasiJp || 3, 4);
    const preJam: number[] = [];
    for (let i = 1; i <= targetJp; i++) {
      preJam.push(i);
    }
    setFormSelectedJam(preJam.length > 0 ? preJam : [1, 2, 3]);
    setFormCatatan(`KBM ${cleanMapelName(item.namaMapel)}`);
    setIsFormModalOpen(true);
  };

  // When teacher changes, auto-suggest their assigned subjects & classes from Acuan
  const handleGuruChange = (username: string) => {
    setFormGuruUsername(username);
    const foundTeacher = guruList.find((g) => g.username === username);
    const assigned = getGuruAssignedItems(
      username,
      foundTeacher?.id,
      foundTeacher?.nama,
      foundTeacher?.nip
    );
    if (assigned.length > 0) {
      const firstItem = assigned[0];
      setFormMataPelajaran(cleanMapelName(firstItem.namaMapel));
      setFormKodeMapel(firstItem.kodeMapel || '');
      if (firstItem.kelasIds && firstItem.kelasIds.length > 0) {
        setFormKelasId(firstItem.kelasIds[0]);
      }
    } else if (foundTeacher && foundTeacher.mataPelajaran) {
      setFormMataPelajaran(cleanMapelName(foundTeacher.mataPelajaran));
      const mapelObj = mapelList.find((m) => m.nama === cleanMapelName(foundTeacher.mataPelajaran));
      if (mapelObj) setFormKodeMapel(mapelObj.kode);
    }
  };

  // When mapel select changes, synchronize code and check assigned classes
  const handleMapelChange = (mapelNama: string) => {
    const cleaned = cleanMapelName(mapelNama);
    setFormMataPelajaran(cleaned);
    const foundInMaster = mapelList.find((m) => m.nama === cleaned);
    if (foundInMaster) setFormKodeMapel(foundInMaster.kode);

    const matchedAssigned = assignedMapelForFormGuru.find(
      (item) => cleanMapelName(item.namaMapel).toLowerCase() === cleaned.toLowerCase()
    );
    if (matchedAssigned) {
      if (matchedAssigned.kodeMapel) setFormKodeMapel(matchedAssigned.kodeMapel);
      if (matchedAssigned.kelasIds && matchedAssigned.kelasIds.length > 0) {
        if (!matchedAssigned.kelasIds.includes(formKelasId)) {
          setFormKelasId(matchedAssigned.kelasIds[0]);
        }
      }
    }
  };

  // Searchable Options for Pilihan Guru: Cukup nama guru saja
  const guruSearchableOptions: SearchableOption[] = useMemo(() => {
    return guruList.map((g) => ({
      value: g.username,
      label: g.nama,
      keywords: [g.nama, g.username],
    }));
  }, [guruList]);

  // Searchable Options for Pilihan Mata Pelajaran: Cukup nama mapel saja
  const mapelSearchableOptions: SearchableOption[] = useMemo(() => {
    const list: SearchableOption[] = [];
    const addedNames = new Set<string>();

    // 1. Mapel acuan guru jika ada
    assignedMapelForFormGuru.forEach((item) => {
      const cleanName = cleanMapelName(item.namaMapel);
      if (cleanName && !addedNames.has(cleanName.toLowerCase())) {
        addedNames.add(cleanName.toLowerCase());
        list.push({
          value: cleanName,
          label: item.namaMapel,
          keywords: [item.namaMapel, cleanName],
        });
      }
    });

    // 2. Mapel master lainnya
    mapelList.forEach((m) => {
      const cleanName = cleanMapelName(m.nama);
      if (cleanName && !addedNames.has(cleanName.toLowerCase())) {
        addedNames.add(cleanName.toLowerCase());
        list.push({
          value: cleanName,
          label: m.nama,
          keywords: [m.nama, cleanName],
        });
      }
    });

    return list;
  }, [assignedMapelForFormGuru, mapelList]);

  // Reset form to clean state, prioritizing teacher's official Acuan
  const resetForm = () => {
    setEditingId(null);
    const teacherUser =
      isTeacher && currentTeacherProfile ? currentTeacherProfile.username : guruList[0]?.username || '';
    setFormGuruUsername(teacherUser);
    setFormHari('Senin');
    setFormShift('Pagi');

    const teacherObj = guruList.find((g) => g.username === teacherUser);
    const assigned = getGuruAssignedItems(teacherUser, teacherObj?.id, teacherObj?.nama, teacherObj?.nip);

    if (assigned.length > 0) {
      const firstItem = assigned[0];
      setFormMataPelajaran(cleanMapelName(firstItem.namaMapel));
      setFormKodeMapel(firstItem.kodeMapel || '');
      if (firstItem.kelasIds && firstItem.kelasIds.length > 0) {
        setFormKelasId(firstItem.kelasIds[0]);
      } else {
        setFormKelasId(kelasList[0]?.id || '');
      }
      const defaultHours: number[] = [];
      const target = Math.min(firstItem.alokasiJp || 3, 4);
      for (let i = 1; i <= target; i++) defaultHours.push(i);
      setFormSelectedJam(defaultHours.length > 0 ? defaultHours : [1, 2, 3]);
    } else {
      setFormKelasId(kelasList[0]?.id || '');
      setFormSelectedJam([1, 2, 3]);
      const defaultMapel = cleanMapelName(
        isTeacher && currentTeacherProfile?.mataPelajaran
          ? currentTeacherProfile.mataPelajaran
          : mapelList[0]?.nama || ''
      );
      setFormMataPelajaran(defaultMapel);
      const defaultKode =
        mapelList.find((m) => m.nama === defaultMapel)?.kode || mapelList[0]?.kode || '';
      setFormKodeMapel(defaultKode);
    }
    setFormCatatan('');
  };

  // Edit item handler
  const handleStartEdit = (item: JadwalMengajarGuru) => {
    setEditingId(item.id);
    setFormGuruUsername(item.guruUsername);
    setFormHari((HARI_SENIN_JUMAT.includes(item.hari as any) ? item.hari : 'Senin') as HariKerja);
    setFormKelasId(item.kelasId);
    setFormShift(item.shift === 'Siang' ? 'Siang' : 'Pagi');

    const parsedJam = parseJamKeList(item.jamKe, item.jamKeList);
    setFormSelectedJam(parsedJam.length > 0 ? parsedJam : [1, 2]);

    setFormMataPelajaran(cleanMapelName(item.mataPelajaran) || '');
    setFormKodeMapel(item.kodeMapel || '');
    setFormCatatan(item.catatan || '');

    setIsFormModalOpen(true);
  };

  // Duplicate schedule handler
  const handleDuplicate = (item: JadwalMengajarGuru) => {
    setEditingId(null);
    setFormGuruUsername(
      isTeacher && currentTeacherProfile ? currentTeacherProfile.username : item.guruUsername
    );
    setFormHari((HARI_SENIN_JUMAT.includes(item.hari as any) ? item.hari : 'Senin') as HariKerja);
    setFormKelasId(item.kelasId);
    setFormShift(item.shift === 'Siang' ? 'Siang' : 'Pagi');
    setFormSelectedJam(parseJamKeList(item.jamKe, item.jamKeList));
    setFormMataPelajaran(cleanMapelName(item.mataPelajaran));
    setFormKodeMapel(item.kodeMapel || '');
    setFormCatatan(item.catatan || '');

    setIsFormModalOpen(true);
    onShowToast(`Duplikasi form jadwal: ${cleanMapelName(item.mataPelajaran)}. Silakan sesuaikan lalu simpan!`, 'info');
  };

  // Open Form modal for specific cell in the Matrix
  const handleOpenFormForCell = useCallback(
    (hari: HariKerja, jamNum: number) => {
      if (activeMatrixOption.shift === 'Pagi' && hari === 'Senin' && (jamNum === 1 || jamNum === 2)) {
        onShowToast('Jam pelajaran 1-2 shift pagi adalah Upacara Bendera, bukan jam pelajaran!', 'warning');
        return;
      }
      resetForm();
      setFormHari(hari);
      setFormShift(activeMatrixOption.shift);
      if (matrixMode === 'kelas') {
        setFormKelasId(matrixSelectedKelasId);
        const classAcuan = (appData.guruMapelKelas || []).find((item) =>
          (item.kelasIds || []).includes(matrixSelectedKelasId)
        );
        if (classAcuan && classAcuan.guruUsername) {
          setFormGuruUsername(classAcuan.guruUsername);
          setFormMataPelajaran(cleanMapelName(classAcuan.namaMapel));
          setFormKodeMapel(classAcuan.kodeMapel || '');
        }
      } else {
        const targetGuruUser =
          isTeacher && currentTeacherProfile
            ? currentTeacherProfile.username
            : matrixSelectedGuruUsername;
        setFormGuruUsername(targetGuruUser);
        const tObj = guruList.find((g) => g.username === targetGuruUser);
        const tAssigned = getGuruAssignedItems(
          targetGuruUser,
          tObj?.id,
          tObj?.nama,
          tObj?.nip
        );
        if (tAssigned.length > 0) {
          let chosen = tAssigned[0];
          let chosenClassId = chosen.kelasIds?.[0] || '';
          for (const item of tAssigned) {
            const matchCId = (item.kelasIds || []).find(
              (cId) => getKelasKelompok(undefined, cId) === activeMatrixOption.kelompok
            );
            if (matchCId) {
              chosen = item;
              chosenClassId = matchCId;
              break;
            }
          }
          setFormMataPelajaran(cleanMapelName(chosen.namaMapel));
          setFormKodeMapel(chosen.kodeMapel || '');
          if (chosenClassId) {
            setFormKelasId(chosenClassId);
          }
        } else {
          const matchingKelas = kelasList.find(
            (k) => determineKelasKelompok(k.nama) === activeMatrixOption.kelompok
          );
          if (matchingKelas) {
            setFormKelasId(matchingKelas.id);
          }
        }
      }
      setFormSelectedJam([jamNum]);
      setIsFormModalOpen(true);
    },
    [
      resetForm,
      activeMatrixOption,
      matrixMode,
      matrixSelectedKelasId,
      appData.guruMapelKelas,
      isTeacher,
      currentTeacherProfile,
      matrixSelectedGuruUsername,
      guruList,
      getGuruAssignedItems,
      getKelasKelompok,
      kelasList,
    ]
  );

  // Delete schedule handler
  const handleDelete = (item: JadwalMengajarGuru) => {
    if (readOnly) return;
    onConfirmModal(
      'Hapus Jadwal Mengajar',
      `Yakin ingin menghapus jadwal mengajar mata pelajaran "${item.mataPelajaran}" untuk kelas ${item.kelasNama} (${item.hari}, Shift ${item.shift || 'Pagi'}, ${item.jamKe || 'Jam terpilih'})?`,
      'danger',
      () => {
        const nextList = allJadwalList.filter((j) => j.id !== item.id);
        const updatedDeletedIds = Array.from(new Set([...(appData.deletedJadwalIds || []), String(item.id)]));
        const updatedAppData = addAuditLog(
          { ...appData, jadwalMengajar: nextList, deletedJadwalIds: updatedDeletedIds },
          'Hapus Jadwal Mengajar',
          `Menghapus jadwal ${item.mataPelajaran} (${item.kelasNama} - ${item.guruNama}) pada ${item.hari} Shift ${item.shift || 'Pagi'}`
        );
        onUpdateAppData(updatedAppData);
        onShowToast(`Jadwal ${item.mataPelajaran} berhasil dihapus.`, 'success');
      }
    );
  };

  // Delete all schedules handler
  const handleDeleteAll = () => {
    if (readOnly || allJadwalList.length === 0) return;
    onConfirmModal(
      'Kosongkan Seluruh Jadwal Pelajaran',
      `Apakah Anda yakin ingin menghapus seluruh (${allJadwalList.length}) jadwal pelajaran tiap kelas? Tindakan ini akan mengosongkan seluruh daftar jadwal.`,
      'danger',
      () => {
        const allDeletedIds = Array.from(new Set([...(appData.deletedJadwalIds || []), ...allJadwalList.map((j) => String(j.id))]));
        const updatedAppData = addAuditLog(
          { ...appData, jadwalMengajar: [], deletedJadwalIds: allDeletedIds },
          'Kosongkan Jadwal Pelajaran',
          `Menghapus seluruh ${allJadwalList.length} jadwal pelajaran tiap kelas.`
        );
        onUpdateAppData(updatedAppData);
        onShowToast('Seluruh jadwal pelajaran berhasil dikosongkan.', 'success');
      }
    );
  };

  /* =========================================================================
     SMART ANTI-BENTROK (CONFLICT DETECTION) REALTIME
     Checks for collisions on the SAME Day, SAME Shift, SAME Kelompok, and Overlapping Jam Ke (1-10)
     Note: Kelompok 1 (Kelas X & XI) and Kelompok 2 (Kelas XII) have different shift schedules,
     so schedules across different Kelompok do not conflict!
     ========================================================================= */
  const conflictWarnings = useMemo(() => {
    if (formSelectedJam.length === 0) return [];
    const warnings: string[] = [];

    const otherSchedules = allJadwalList.filter((j) => j.id !== editingId);

    // Resolve Kelompok for the current form class
    const selectedKelasObj = kelasList.find((k) => k.id === formKelasId);
    const formKelompok = getKelasKelompok(selectedKelasObj?.nama, formKelasId);

    // 1. Check Guru Bentrok (Teacher teaching another class in the SAME KELOMPOK at same day, same shift, and overlapping hour)
    for (const other of otherSchedules) {
      const otherKelompok = getKelasKelompok(other.kelasNama, other.kelasId);

      // CRITICAL FIX: Bentrok ONLY applies within the SAME KELOMPOK (Satu Kelompok)!
      // Kelompok 1 and Kelompok 2 have different shift schedules, so a teacher teaching Kelompok 1 & 2 never collides!
      if (otherKelompok !== formKelompok) {
        continue;
      }

      const otherShift = other.shift === 'Siang' ? 'Siang' : 'Pagi';
      if (other.guruUsername === formGuruUsername && other.hari === formHari && otherShift === formShift) {
        const otherJamList = parseJamKeList(other.jamKe, other.jamKeList);
        const overlap = formSelectedJam.filter((j) => otherJamList.includes(j));
        if (overlap.length > 0) {
          warnings.push(
            `Guru Bentrok (Kelompok ${formKelompok}): ${other.guruNama} sudah dijadwalkan di kelas ${other.kelasNama} (${other.mataPelajaran}) pada hari ${formHari} Shift ${formShift} Jam ke-${overlap.join(', ')}!`
          );
        }
      }
    }

    // 2. Check Kelas Bentrok (Class already taught by another teacher at same day, same shift, and overlapping hour)
    for (const other of otherSchedules) {
      const otherShift = other.shift === 'Siang' ? 'Siang' : 'Pagi';
      if (other.kelasId === formKelasId && other.hari === formHari && otherShift === formShift) {
        const otherJamList = parseJamKeList(other.jamKe, other.jamKeList);
        const overlap = formSelectedJam.filter((j) => otherJamList.includes(j));
        if (overlap.length > 0) {
          warnings.push(
            `Kelas Bentrok: Kelas ${other.kelasNama} sudah dijadwalkan mapel "${other.mataPelajaran}" bersama ${other.guruNama} pada hari ${formHari} Shift ${formShift} Jam ke-${overlap.join(', ')}!`
          );
        }
      }
    }

    return warnings;
  }, [formSelectedJam, formGuruUsername, formHari, formKelasId, formShift, editingId, allJadwalList, kelasList]);

  // Form Submit Handler
  const handleSaveJadwal = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    if (!formGuruUsername) {
      onShowToast('Silakan pilih Nama Guru terlebih dahulu.', 'error');
      return;
    }
    if (!formHari) {
      onShowToast('Silakan pilih Hari mengajar (Senin - Jumat).', 'error');
      return;
    }
    if (!formKelasId) {
      onShowToast('Silakan pilih Kelas mengajar.', 'error');
      return;
    }
    if (formSelectedJam.length === 0) {
      onShowToast('Pilih minimal 1 jam pelajaran pada bulatan biru angka 1 - 10!', 'warning');
      return;
    }
    if (formShift === 'Pagi' && formHari === 'Senin' && formSelectedJam.some((j) => j === 1 || j === 2)) {
      onShowToast('Jam pelajaran 1-2 shift pagi pada hari Senin adalah Upacara Bendera, bukan jam pelajaran!', 'error');
      return;
    }
    if (!formMataPelajaran.trim()) {
      onShowToast('Nama Mata Pelajaran wajib diisi.', 'error');
      return;
    }

    const selectedGuru = guruList.find((g) => g.username === formGuruUsername);
    const selectedKelas = kelasList.find((k) => k.id === formKelasId);

    const sortedJam = [...formSelectedJam].sort((a, b) => a - b);
    const formattedJamKe = formatJamKeDisplay(sortedJam);

    const newSchedule: JadwalMengajarGuru = {
      id: editingId || `JADWAL_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      guruId: selectedGuru?.id,
      guruUsername: formGuruUsername,
      guruNama: selectedGuru ? selectedGuru.nama : formGuruUsername,
      guruNip: selectedGuru?.nip || '',
      hari: formHari,
      kelasId: formKelasId,
      kelasNama: selectedKelas ? selectedKelas.nama : formKelasId,
      mataPelajaran: cleanMapelName(formMataPelajaran),
      kodeMapel: formKodeMapel.trim() || undefined,
      jamKeList: sortedJam,
      jamKe: formattedJamKe,
      shift: formShift,
      catatan: formCatatan.trim(),
    };

    let nextList: JadwalMengajarGuru[];
    if (editingId) {
      nextList = allJadwalList.map((j) => (j.id === editingId ? newSchedule : j));
    } else {
      nextList = [newSchedule, ...allJadwalList];
    }

    const updatedDeleted = (appData.deletedJadwalIds || []).filter((id) => id !== newSchedule.id);
    const updatedAppData = addAuditLog(
      { ...appData, jadwalMengajar: nextList, deletedJadwalIds: updatedDeleted },
      editingId ? 'Edit Jadwal Mengajar Guru' : 'Tambah Jadwal Mengajar Guru',
      `${editingId ? 'Memperbarui' : 'Menambahkan'} jadwal ${newSchedule.mataPelajaran} (${newSchedule.kelasNama} - ${newSchedule.guruNama}) pada hari ${newSchedule.hari} Shift ${newSchedule.shift} ${newSchedule.jamKe}`
    );

    const targetKelompok = getKelasKelompok(newSchedule.kelasNama, newSchedule.kelasId);
    const targetShift = newSchedule.shift === 'Siang' ? 'siang' : 'pagi';
    const targetOptionId: MatrixShiftOptionId =
      targetShift === 'siang'
        ? targetKelompok === 2
          ? 'siang_k2'
          : 'siang_k1'
        : targetKelompok === 2
        ? 'pagi_k2'
        : 'pagi_k1';

    // Auto-focus matrix view to match the newly added/edited schedule so it's immediately visible
    setMatrixShiftOption(targetOptionId);
    if (matrixMode === 'kelas') {
      setMatrixSelectedKelasId(newSchedule.kelasId);
    } else if (matrixMode === 'guru') {
      setMatrixSelectedGuruUsername(newSchedule.guruUsername);
    }
    setActiveTab('matriks');

    onUpdateAppData(updatedAppData);
    onShowToast(
      editingId
        ? `Jadwal ${newSchedule.mataPelajaran} berhasil diperbarui!`
        : `Jadwal mengajar ${newSchedule.mataPelajaran} untuk ${newSchedule.kelasNama} (${formShift === 'Siang' ? 'Shift Siang' : 'Shift Pagi'}) berhasil disimpan!`,
      'success'
    );

    resetForm();
    setIsFormModalOpen(false);
  };

  /* =========================================================================
     TABLE REALTIME GROUP COUNTS & FILTERED/SORTED JADWAL
     ========================================================================= */
  const tableGroupCounts = useMemo(() => {
    const base = jadwalList.filter((item) => {
      const matchSearch =
        searchTerm === '' ||
        item.mataPelajaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.guruNama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kelasNama.toLowerCase().includes(searchTerm.toLowerCase());
      const matchHari = filterHari === 'semua' || item.hari === filterHari;
      const matchKelas = filterKelas === 'semua' || item.kelasId === filterKelas;
      const matchGuru = filterGuru === 'semua' || item.guruUsername === filterGuru;
      const matchAcuan =
        filterAcuan === 'semua' ||
        (filterAcuan === 'sesuai' ? isJadwalMatchingAcuan(item) : !isJadwalMatchingAcuan(item));
      return matchSearch && matchHari && matchKelas && matchGuru && matchAcuan;
    });

    const counts = {
      all: base.length,
      pagi_k1: 0,
      siang_k1: 0,
      pagi_k2: 0,
      siang_k2: 0,
      jp_pagi_k1: 0,
      jp_siang_k1: 0,
      jp_pagi_k2: 0,
      jp_siang_k2: 0,
    };

    base.forEach((item) => {
      const kel = getKelasKelompok(item.kelasNama, item.kelasId);
      const isSiang = (item.shift || 'Pagi') === 'Siang';
      const jp = parseJamKeList(item.jamKe, item.jamKeList).length;
      if (kel === 1) {
        if (isSiang) {
          counts.siang_k1++;
          counts.jp_siang_k1 += jp;
        } else {
          counts.pagi_k1++;
          counts.jp_pagi_k1 += jp;
        }
      } else {
        if (isSiang) {
          counts.siang_k2++;
          counts.jp_siang_k2 += jp;
        } else {
          counts.pagi_k2++;
          counts.jp_pagi_k2 += jp;
        }
      }
    });

    return counts;
  }, [jadwalList, searchTerm, filterHari, filterKelas, filterGuru, filterAcuan, isJadwalMatchingAcuan, getKelasKelompok]);

  const filteredJadwal = useMemo(() => {
    const list = jadwalList.filter((item) => {
      const matchSearch =
        searchTerm === '' ||
        item.mataPelajaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.guruNama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kelasNama.toLowerCase().includes(searchTerm.toLowerCase());

      const itemShift = item.shift === 'Siang' ? 'Siang' : 'Pagi';
      const matchShift = filterShift === 'semua' || itemShift === filterShift;

      const itemKelompok = getKelasKelompok(item.kelasNama, item.kelasId);
      const matchKelompok = filterKelompok === 'semua' || itemKelompok === filterKelompok;

      const matchHari = filterHari === 'semua' || item.hari === filterHari;
      const matchKelas = filterKelas === 'semua' || item.kelasId === filterKelas;
      const matchGuru = filterGuru === 'semua' || item.guruUsername === filterGuru;
      const matchAcuan =
        filterAcuan === 'semua' ||
        (filterAcuan === 'sesuai' ? isJadwalMatchingAcuan(item) : !isJadwalMatchingAcuan(item));

      return matchSearch && matchShift && matchKelompok && matchHari && matchKelas && matchGuru && matchAcuan;
    });

    const dayOrderMap: Record<string, number> = {
      Senin: 1,
      Selasa: 2,
      Rabu: 3,
      Kamis: 4,
      Jumat: 5,
      Sabtu: 6,
      Minggu: 7,
    };

    return [...list].sort((a, b) => {
      let comp = 0;
      if (sortField === 'kelompok_shift') {
        const kelA = getKelasKelompok(a.kelasNama, a.kelasId);
        const kelB = getKelasKelompok(b.kelasNama, b.kelasId);
        if (kelA !== kelB) {
          comp = kelA - kelB;
        } else {
          const shiftA = (a.shift || 'Pagi') === 'Siang' ? 2 : 1;
          const shiftB = (b.shift || 'Pagi') === 'Siang' ? 2 : 1;
          if (shiftA !== shiftB) {
            comp = shiftA - shiftB;
          } else {
            const orderA = dayOrderMap[a.hari] || 99;
            const orderB = dayOrderMap[b.hari] || 99;
            if (orderA !== orderB) {
              comp = orderA - orderB;
            } else {
              const jamA = parseJamKeList(a.jamKe, a.jamKeList)[0] || 1;
              const jamB = parseJamKeList(b.jamKe, b.jamKeList)[0] || 1;
              if (jamA !== jamB) {
                comp = jamA - jamB;
              } else {
                comp = (a.kelasNama || '').localeCompare(b.kelasNama || '', 'id', { numeric: true });
              }
            }
          }
        }
      } else if (sortField === 'hari') {
        const orderA = dayOrderMap[a.hari] || 99;
        const orderB = dayOrderMap[b.hari] || 99;
        if (orderA !== orderB) {
          comp = orderA - orderB;
        } else {
          const kelA = getKelasKelompok(a.kelasNama, a.kelasId);
          const kelB = getKelasKelompok(b.kelasNama, b.kelasId);
          if (kelA !== kelB) {
            comp = kelA - kelB;
          } else {
            const shiftA = (a.shift || 'Pagi') === 'Siang' ? 2 : 1;
            const shiftB = (b.shift || 'Pagi') === 'Siang' ? 2 : 1;
            if (shiftA !== shiftB) {
              comp = shiftA - shiftB;
            } else {
              const jamA = parseJamKeList(a.jamKe, a.jamKeList)[0] || 1;
              const jamB = parseJamKeList(b.jamKe, b.jamKeList)[0] || 1;
              comp = jamA - jamB;
            }
          }
        }
      } else if (sortField === 'mapel') {
        comp = cleanMapelName(a.mataPelajaran).localeCompare(cleanMapelName(b.mataPelajaran), 'id', { sensitivity: 'base' });
      } else if (sortField === 'guru') {
        comp = (a.guruNama || '').localeCompare(b.guruNama || '', 'id', { sensitivity: 'base' });
      } else if (sortField === 'kelas') {
        comp = (a.kelasNama || '').localeCompare(b.kelasNama || '', 'id', { numeric: true });
      } else if (sortField === 'jam') {
        const jamA = parseJamKeList(a.jamKe, a.jamKeList)[0] || 1;
        const jamB = parseJamKeList(b.jamKe, b.jamKeList)[0] || 1;
        comp = jamA - jamB;
      }

      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [jadwalList, searchTerm, filterShift, filterKelompok, filterHari, filterKelas, filterGuru, filterAcuan, isJadwalMatchingAcuan, sortField, sortOrder, getKelasKelompok]);

  const totalPages = Math.ceil(filteredJadwal.length / itemsPerPage) || 1;
  const paginatedJadwal = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredJadwal.slice(start, start + itemsPerPage);
  }, [filteredJadwal, currentPage, itemsPerPage]);

  /* =========================================================================
     EXCEL EXPORT, IMPORT & PRINT
     ========================================================================= */
  const handleExportExcel = () => {
    if (jadwalList.length === 0) {
      onShowToast('Tidak ada data jadwal untuk diekspor.', 'warning');
      return;
    }

    const exportRows = jadwalList.map((j, idx) => {
      const jamList = parseJamKeList(j.jamKe, j.jamKeList);
      const kel = getKelasKelompok(j.kelasNama, j.kelasId);
      return {
        No: idx + 1,
        'Kelompok Tingkat': kel === 1 ? 'Kelompok 1 (Kelas X & XI)' : 'Kelompok 2 (Kelas XII)',
        Shift: j.shift === 'Siang' ? 'Shift Siang' : 'Shift Pagi',
        'Hari Mengajar': j.hari,
        'Nama Guru': j.guruNama,
        'NIP Guru': j.guruNip || '-',
        'Kelas Ajar': j.kelasNama,
        'Mata Pelajaran': j.mataPelajaran,
        'Kode Mapel': j.kodeMapel || '-',
        'Jam Ke (1-10)': jamList.length > 0 ? jamList.join(', ') : j.jamKe || '-',
        'Total JP': jamList.length > 0 ? `${jamList.length} JP` : '-',
        Catatan: j.catatan || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jadwal Mengajar');
    const fileName = isTeacher
      ? `Jadwal_Mengajar_${(currentTeacherProfile?.nama || 'Guru').replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
      : `Jadwal_Mengajar_Guru_${appData.sekolah?.nama || 'Sekolah'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    onShowToast(
      isTeacher
        ? 'Jadwal mengajar Anda berhasil diekspor ke file Excel!'
        : 'Data jadwal mengajar berhasil diekspor ke file Excel!',
      'success'
    );
  };

  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        HARI: 'Senin',
        SHIFT: 'Pagi',
        'NAMA GURU': guruList[0]?.nama || 'Budi Santoso, S.Kom',
        'USERNAME / NIP': guruList[0]?.username || '1037',
        KELAS: kelasList[0]?.nama || 'X RPL 1',
        'MATA PELAJARAN': 'Pemrograman Web',
        'JAM KE (1-10)': '1, 2, 3',
        CATATAN: 'Materi Dasar HTML & CSS',
      },
      {
        HARI: 'Selasa',
        SHIFT: 'Siang',
        'NAMA GURU': guruList[1]?.nama || 'Siti Rahma, M.Pd',
        'USERNAME / NIP': guruList[1]?.username || 'siti',
        KELAS: kelasList[1]?.nama || 'XI RPL 1',
        'MATA PELAJARAN': 'Matematika Wajib',
        'JAM KE (1-10)': '1, 2, 3, 4',
        CATATAN: 'Aljabar Linear',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Jadwal');
    XLSX.writeFile(wb, 'Template_Import_Jadwal_Guru.xlsx');
    onShowToast('Template import jadwal guru berhasil diunduh.', 'info');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || readOnly) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
          onShowToast('File Excel kosong atau format tidak sesuai.', 'error');
          return;
        }

        let importedCount = 0;
        const newItems: JadwalMengajarGuru[] = [];

        rows.forEach((r, idx) => {
          const hariRaw = String(r['HARI'] || r['Hari'] || r['hari'] || 'Senin').trim();
          const matchedHari = (HARI_SENIN_JUMAT.find(
            (h) => h.toLowerCase() === hariRaw.toLowerCase()
          ) || 'Senin') as HariKerja;

          const shiftRaw = String(r['SHIFT'] || r['Shift'] || r['shift'] || 'Pagi').trim().toLowerCase();
          const finalShift: 'Pagi' | 'Siang' = shiftRaw.includes('siang') ? 'Siang' : 'Pagi';

          const guruStr = String(r['NAMA GURU'] || r['Nama Guru'] || r['guru'] || '').trim();
          const userStr = String(r['USERNAME / NIP'] || r['Username'] || r['nip'] || '').trim();

          const matchedGuru = guruList.find(
            (g) =>
              g.username === userStr ||
              g.nama.toLowerCase() === guruStr.toLowerCase() ||
              (g.nip && g.nip === userStr)
          );

          const kelasStr = String(r['KELAS'] || r['Kelas'] || r['kelas'] || '').trim();
          const matchedKelas = kelasList.find(
            (k) =>
              k.nama.toLowerCase() === kelasStr.toLowerCase() ||
              k.id.toLowerCase() === kelasStr.toLowerCase()
          );

          const mapelStr = String(
            r['MATA PELAJARAN'] || r['Mata Pelajaran'] || r['mapel'] || 'Pelajaran'
          ).trim();

          const jamRaw = String(r['JAM KE (1-10)'] || r['JAM KE (1-11)'] || r['Jam Ke'] || r['jam'] || '1, 2').trim();
          const parsedJam = parseJamKeList(jamRaw);
          const finalJam = parsedJam.length > 0 ? parsedJam : [1, 2];
          const sorted = [...finalJam].sort((a, b) => a - b);

          newItems.push({
            id: `JADWAL_IMP_${Date.now()}_${idx}`,
            guruId: matchedGuru?.id,
            guruUsername: matchedGuru?.username || userStr || guruList[0]?.username || 'guru',
            guruNama: matchedGuru?.nama || guruStr || 'Guru Pengampu',
            guruNip: matchedGuru?.nip || '',
            hari: matchedHari,
            shift: finalShift,
            kelasId: matchedKelas?.id || kelasList[0]?.id || 'KELAS_1',
            kelasNama: matchedKelas?.nama || kelasStr || 'Kelas',
            mataPelajaran: mapelStr,
            jamKeList: sorted,
            jamKe: formatJamKeDisplay(sorted),
            catatan: String(r['CATATAN'] || r['Catatan'] || '').trim(),
          });
          importedCount++;
        });

        if (newItems.length > 0) {
          const updatedAppData = addAuditLog(
            { ...appData, jadwalMengajar: [...newItems, ...allJadwalList] },
            'Import Jadwal Mengajar',
            `Mengimport ${importedCount} jadwal pelajaran guru dari file Excel`
          );
          onUpdateAppData(updatedAppData);
          onShowToast(`Berhasil mengimport ${importedCount} jadwal pelajaran!`, 'success');
        }
      } catch (err: any) {
        onShowToast(`Gagal membaca file Excel: ${err.message}`, 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePrint = () => {
    window.print();
  };

  /* =========================================================================
     RENDER MATRIX DATA (Per Kelas atau Per Guru, Filtered by 4 Shift & Kelompok)
     ========================================================================= */
  const matrixSchedules = useMemo(() => {
    const targetShift = activeMatrixOption.shift;
    const targetKelompok = activeMatrixOption.kelompok;

    return jadwalList.filter((j) => {
      const matchesTarget =
        isTeacher
          ? true
          : matrixMode === 'kelas'
          ? j.kelasId === matrixSelectedKelasId
          : j.guruUsername === matrixSelectedGuruUsername;

      if (!matchesTarget) return false;

      const itemShift = (j.shift || 'Pagi').toLowerCase() === 'siang' ? 'Siang' : 'Pagi';
      if (itemShift !== targetShift) return false;

      const itemKelompok = getKelasKelompok(j.kelasNama, j.kelasId);
      if (itemKelompok !== targetKelompok) return false;

      return true;
    });
  }, [
    jadwalList,
    matrixMode,
    matrixSelectedKelasId,
    matrixSelectedGuruUsername,
    activeMatrixOption,
    isTeacher,
    kelasList,
  ]);

  // Realtime counts for all 4 Shift & Kelompok matrix tabs for the currently selected class / teacher
  const matrixOptionCounts = useMemo(() => {
    const counts: Record<MatrixShiftOptionId, number> = {
      pagi_k1: 0,
      siang_k1: 0,
      pagi_k2: 0,
      siang_k2: 0,
    };

    MATRIX_SHIFT_OPTIONS.forEach((opt) => {
      const targetShift = opt.shift;
      const targetKelompok = opt.kelompok;
      const matchCount = jadwalList.filter((j) => {
        const matchesTarget =
          isTeacher
            ? true
            : matrixMode === 'kelas'
            ? j.kelasId === matrixSelectedKelasId
            : j.guruUsername === matrixSelectedGuruUsername;
        if (!matchesTarget) return false;
        const itemShift = (j.shift || 'Pagi').toLowerCase() === 'siang' ? 'Siang' : 'Pagi';
        if (itemShift !== targetShift) return false;
        const itemKelompok = getKelasKelompok(j.kelasNama, j.kelasId);
        if (itemKelompok !== targetKelompok) return false;
        return true;
      }).length;
      counts[opt.id] = matchCount;
    });

    return counts;
  }, [
    jadwalList,
    isTeacher,
    matrixMode,
    matrixSelectedKelasId,
    matrixSelectedGuruUsername,
    getKelasKelompok,
  ]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <PageHeader
        icon={Calendar}
        title={isTeacher ? 'Jadwal Mengajar Saya' : 'Jadwal Mengajar Guru'}
        description={
          isTeacher
            ? `Jadwal mengajar dan pembagian jam pelajaran untuk ${currentTeacherProfile?.nama || 'Anda'} (Jam 1 s.d. 10).`
            : 'Kelola jadwal pelajaran mingguan guru per hari (Senin - Jumat), shift (Pagi / Siang), kelas, dan jam pelajaran 1 s.d. 10'
        }
        badge={
          isTeacher
            ? `${jadwalList.length} Sesi (${shiftStats.totalJp} JP)`
            : `${jadwalList.length} Jadwal Terjadwal`
        }
        actions={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Group Excel Actions */}
            <div className="inline-flex items-center p-0.5 bg-white/15 rounded-xl border border-white/20 backdrop-blur-xs">
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white hover:bg-white/15 transition cursor-pointer"
                title={isTeacher ? 'Ekspor Jadwal Mengajar Saya ke Excel' : 'Ekspor Jadwal ke Excel'}
              >
                <Download className="w-3.5 h-3.5 text-emerald-300" />
                <span>Ekspor</span>
              </button>

              {!readOnly && (
                <>
                  <div className="w-px h-3.5 bg-white/20 my-auto" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white hover:bg-white/15 transition cursor-pointer"
                    title="Import Jadwal dari Excel"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-200" />
                    <span>Import</span>
                  </button>
                  <div className="w-px h-3.5 bg-white/20 my-auto" />
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white hover:bg-white/15 transition cursor-pointer"
                    title="Unduh Template Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
                    <span>Template</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleImportExcel}
                    className="hidden"
                  />
                </>
              )}
            </div>

            {/* Cetak */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/20 transition cursor-pointer backdrop-blur-xs"
              title="Cetak Jadwal Pelajaran"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>Cetak</span>
            </button>

            {/* Kosongkan */}
            {!readOnly && allJadwalList.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 transition cursor-pointer"
                title="Hapus / Kosongkan Seluruh Jadwal Pelajaran"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>
        }
      />



      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('matriks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'matriks'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>{isTeacher ? 'Matriks Mingguan Saya' : 'Matriks Mingguan (Senin - Jumat)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tabel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'tabel'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <List className="w-4 h-4" />
            <span>{isTeacher ? `Jadwal Saya (${jadwalList.length})` : `Daftar Tabel (${jadwalList.length})`}</span>
          </button>

          {canAccessAbsenGuru && (
            <button
              type="button"
              onClick={() => {
                if (onNavigateView) onNavigateView('absen_harian_guru');
                else setActiveTab('absen_guru');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'absen_guru'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-500 group-hover:text-emerald-600 dark:text-emerald-400" />
              <span>Absen Harian Guru</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'absen_guru' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              }`}>
                Hari Ini
              </span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <span>Shift Pagi &amp; Siang masing-masing Jam 1 s.d. 10</span>
        </div>
      </div>

      {/* =====================================================================
          MODAL: FORM INPUT / EDIT JADWAL MENGAJAR
          Hanya muncul saat klik "+ Isi" pada Matriks (atau Edit)
          ===================================================================== */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => {
              resetForm();
              setIsFormModalOpen(false);
            }}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl my-6 overflow-hidden z-10 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      {editingId
                        ? isTeacher
                          ? `Edit Jadwal Mengajar: ${formMataPelajaran || 'Sesi Pelajaran'}`
                          : `Edit Jadwal Mengajar Guru: ${formMataPelajaran || 'Sesi Pelajaran'}`
                        : isTeacher
                        ? 'Isi Jadwal Mengajar Saya'
                        : 'Isi Jadwal Mengajar Guru'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span>Hari {formHari}</span>
                    <span>•</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">Shift {formShift}</span>
                    <span>•</span>
                    <span>Jam ke-{formSelectedJam.join(', ') || '-'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsFormModalOpen(false);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Tutup (Batal)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">

          {/* Special Routine Slot Notice (Shift Pagi: Senin Jam 1-2 Upacara, Jumat Jam 1-2 Pembiasaan Baik. Shift Siang: SEMUA KELAS TIDAK ADA Upacara/Pembiasaan, KBM Reguler) */}
          {formShift === 'Pagi' && formHari === 'Senin' && formSelectedJam.some((j) => j === 1 || j === 2) && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 flex items-center gap-2.5 text-xs font-semibold">
              <Flag className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Informasi Rutinitas (Shift Pagi):</strong> Hari Senin Jam ke-1 &amp; 2 digunakan untuk <strong>Upacara Bendera</strong> (wajib seluruh guru &amp; siswa Shift Pagi).
              </span>
            </div>
          )}
          {formShift === 'Pagi' && formHari === 'Jumat' && formSelectedJam.some((j) => j === 1 || j === 2) && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Informasi Rutinitas (Shift Pagi):</strong> Hari Jumat Jam ke-1 &amp; 2 digunakan untuk <strong>Pembiasaan Baik</strong> (Karakter, Literasi &amp; Rohis).
              </span>
            </div>
          )}
          {formShift === 'Siang' && (formHari === 'Senin' || formHari === 'Jumat') && formSelectedJam.some((j) => j === 1 || j === 2) && (
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 text-indigo-800 dark:text-indigo-200 flex items-center gap-2.5 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Ketentuan Shift Siang:</strong> Jadwal shift siang semua kelas hari <strong>{formHari} tidak ada {formHari === 'Senin' ? 'upacara' : 'pembiasaan baik'}</strong>. Jam ke-1 s.d. 2 langsung aktif untuk KBM reguler.
              </span>
            </div>
          )}

          {/* Conflict Warnings Alert */}
          {conflictWarnings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 space-y-1.5 text-xs font-semibold">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Deteksi Bentrok Jadwal Terdeteksi!</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-2 font-normal">
                {conflictWarnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-600 dark:text-amber-400/80 italic mt-1">
                * Anda tetap dapat menyimpan jika jadwal ini merupakan kelas gabungan atau ketentuan khusus.
              </p>
            </div>
          )}

          <form onSubmit={handleSaveJadwal} className="space-y-6">
            {/* ROW 1: Guru & Hari */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. NAMA GURU */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. Nama Guru</span>
                  <span className="text-rose-500">*</span>
                </label>
                {isTeacher ? (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-bold text-xs">
                    <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate">{currentTeacherProfile?.nama || (currentUser as any)?.username || (currentUser?.data as any)?.nama || 'Guru'}</span>
                  </div>
                ) : (
                  <SearchableSelect
                    value={formGuruUsername}
                    onChange={handleGuruChange}
                    options={guruSearchableOptions}
                    placeholder="-- Pilih Guru --"
                    searchPlaceholder="Ketik nama guru..."
                    emptyMessage="Tidak ada guru yang sesuai pencarian"
                    required
                  />
                )}
              </div>

              {/* 2. HARI (Dropdown Senin - Jumat) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Hari (Senin - Jumat)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formHari}
                  onChange={(e) => setFormHari(e.target.value as HariKerja)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                  required
                >
                  {HARI_SENIN_JUMAT.map((h) => (
                    <option key={h} value={h}>
                      Hari {h}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">Senin, Selasa, Rabu, Kamis, atau Jumat</p>
              </div>
            </div>

            {/* ROW 2: Mata Pelajaran & Kelas (Dibatasi Khusus Mapel & Kelas Ajar Terpilih) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 3. MATA PELAJARAN */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3. Mata Pelajaran</span>
                  <span className="text-rose-500">*</span>
                </label>

                <SearchableSelect
                  value={formMataPelajaran}
                  onChange={handleMapelChange}
                  options={mapelSearchableOptions}
                  placeholder="-- Pilih Mata Pelajaran --"
                  searchPlaceholder="Ketik nama mata pelajaran..."
                  emptyMessage="Tidak ada mapel yang cocok dengan pencarian"
                  allowCustomInput={true}
                  customInputLabel="Gunakan mapel"
                  required
                />
              </div>

              {/* 4. KELAS AJAR */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                    <span>4. Kelas</span>
                    <span className="text-rose-500">*</span>
                  </span>
                  {formAssignedKelasList.length > 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {formAssignedKelasList.length} Kelas Terpilih
                    </span>
                  )}
                </label>
                <select
                  value={formKelasId}
                  onChange={(e) => setFormKelasId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                  required
                >
                  <option value="">-- Pilih Kelas --</option>
                  {formAssignedKelasList.length > 0 ? (
                    formAssignedKelasList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))
                  ) : assignedMapelForFormGuru.length > 0 ? (
                    <option value="" disabled>
                      (Belum ada kelas yang ditentukan untuk mapel ini)
                    </option>
                  ) : (
                    kelasList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[11px] text-slate-400">
                  {formAssignedKelasList.length > 0
                    ? 'Kelas ajar yang ditugaskan untuk mata pelajaran ini'
                    : 'Rombongan belajar siswa yang diajar'}
                </p>
              </div>
            </div>

            {/* Status Alokasi JP Acuan vs Terjadwal */}
            {matchingAcuanMapel && formKelasId && (
              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-slate-700 dark:text-slate-300">
                    Alokasi Target Mapel: <strong className="text-blue-700 dark:text-blue-300">{matchingAcuanMapel.alokasiJp || 4} JP/minggu</strong>
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    Di kelas ini: {existingScheduledJpForForm} JP terjadwal + {formSelectedJam.length} JP sesi ini = <strong className="text-slate-800 dark:text-slate-200">{existingScheduledJpForForm + formSelectedJam.length} JP</strong>
                  </span>
                </div>
                <div>
                  {existingScheduledJpForForm + formSelectedJam.length === (matchingAcuanMapel.alokasiJp || 4) ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                      ✓ Pas Target ({matchingAcuanMapel.alokasiJp || 4} JP)
                    </span>
                  ) : existingScheduledJpForForm + formSelectedJam.length < (matchingAcuanMapel.alokasiJp || 4) ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                      Kurang {(matchingAcuanMapel.alokasiJp || 4) - (existingScheduledJpForForm + formSelectedJam.length)} JP
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                      Lebih +{(existingScheduledJpForForm + formSelectedJam.length) - (matchingAcuanMapel.alokasiJp || 4)} JP
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* SHIFT & KELOMPOK SELECTOR (Hanya menampilkan shift yang sesuai) */}
            {(() => {
              const currentFormKelasObj = kelasList.find((k) => k.id === formKelasId);
              const currentFormKelompok = getKelasKelompok(currentFormKelasObj?.nama, formKelasId);
              const isPagi = formShift === 'Pagi';
              return (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {isPagi ? (
                        <Sun className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Sunset className="w-4 h-4 text-indigo-500" />
                      )}
                      <span>5. Shift Mengajar</span>
                      <span className="text-rose-500">*</span>
                    </label>
                  </div>

                  {/* Single appropriate shift card with Kelompok badge inside */}
                  <div
                    className={`px-4 py-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
                      isPagi
                        ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
                        : 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800/80 text-sky-900 dark:text-sky-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        isPagi ? 'bg-amber-500 text-white' : 'bg-sky-500 text-white'
                      }`}>
                        {isPagi ? <Sun className="w-4 h-4" /> : <Sunset className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-extrabold text-xs sm:text-sm">
                          {isPagi ? '☀️ Shift Pagi' : '🌤️ Shift Siang'}
                        </div>
                        <div className="text-[11px] font-medium opacity-80">
                          {isPagi ? 'Sesi Jam Pelajaran Pagi (Jam 1 - 10)' : 'Sesi Jam Pelajaran Siang (Jam 1 - 10)'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center shrink-0">
                      <span className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border ${
                        currentFormKelompok === 1
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                      }`}>
                        {currentFormKelompok === 1 ? 'Kelompok 1 (Kelas X & XI)' : 'Kelompok 2 (Kelas XII)'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ROW 4: JAM DENGAN ANGKA 1-10 (BULATAN BIRU) */}
            <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-200 dark:border-blue-900/60 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-blue-950 dark:text-blue-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>6. Jam Pelajaran: Angka 1-10 (Bulatan Biru)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Klik bulatan angka 1 sampai 10 di bawah untuk {formShift === 'Siang' ? 'Shift Siang' : 'Shift Pagi'}:
                </p>
              </div>

              {/* Bulatan Biru Angka 1 - 10 Container */}
              <div className="pt-2 pb-1">
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  {LIST_JAM_ANGKA.map((num) => {
                    const isSeninPagiUpacara = formHari === 'Senin' && formShift === 'Pagi' && (num === 1 || num === 2);
                    const isSelected = formSelectedJam.includes(num);
                    const timeStr = getJamPelajaranTime(num, formShift);

                    if (isSeninPagiUpacara) {
                      return (
                        <div
                          key={num}
                          className="group relative w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black transition-all select-none bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-2 border-rose-300 dark:border-rose-800 shadow-2xs cursor-not-allowed"
                          title={`Jam ke-${num} (${formShift}: ${timeStr}) - Upacara Bendera (Bukan Jam Pelajaran)`}
                        >
                          <Flag className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span className="text-[9px] font-black uppercase text-rose-700 dark:text-rose-300">Upacara</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => toggleJam(num)}
                        className={`group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black transition-all duration-150 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-4 ring-blue-300 dark:ring-blue-800 scale-105 z-10'
                            : 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-800 hover:bg-blue-100/70 hover:border-blue-500 hover:scale-105'
                        }`}
                        title={`Jam ke-${num} (${formShift}: ${timeStr})`}
                      >
                        <span className="text-sm sm:text-base">{num}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {formHari === 'Senin' && formShift === 'Pagi' && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                  <Flag className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Pemberitahuan:</strong> Jam ke-1 &amp; 2 Shift Pagi dialokasikan khusus untuk <strong>Upacara Bendera</strong> (bukan jam pelajaran). KBM reguler dimulai dari <strong>Jam ke-3 (07.30 WIB)</strong>.
                  </span>
                </div>
              )}

              {/* Live Info Banner for Selected Hours */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-600 text-white shadow-xs">
                    {formSelectedJam.length} JP Terpilih
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatJamKeDisplay(formSelectedJam)}
                    {formSelectedJam.length > 0 && (
                      <span className="ml-1 text-blue-600 dark:text-blue-400 font-extrabold">
                        ({getJamPelajaranTime(Math.min(...formSelectedJam), formShift).split(' - ')[0]} - {getJamPelajaranTime(Math.max(...formSelectedJam), formShift).split(' - ')[1]})
                      </span>
                    )}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    {formShift === 'Siang' ? (
                      <>
                        <Sunset className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Shift Siang (20 mnt/JP • Istirahat 15.00-15.30)</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>Shift Pagi (30 mnt/JP • Istirahat 08.30-09.00)</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>



            {/* Catatan / Keterangan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Catatan / Keterangan Pelajaran (Opsional)
              </label>
              <input
                type="text"
                value={formCatatan}
                onChange={(e) => setFormCatatan(e.target.value)}
                placeholder="misal: Praktik koding HTML & CSS / Teori Matematika"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>

                {/* Form Submit & Cancel Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setIsFormModalOpen(false);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingId ? 'Simpan Perubahan Jadwal' : 'Simpan Jadwal Mengajar'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: DAFTAR TABEL JADWAL MENGAJAR
          ===================================================================== */}
      {activeTab === 'tabel' && (
        <div className="space-y-4">
          {/* Teacher Profile Info Banner (Shown for teacher accounts) */}
          {isTeacher && (
            <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {currentTeacherProfile?.nama}
                    </span>
                    {currentTeacherProfile?.nip && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold">
                        NIP: {currentTeacherProfile.nip}
                      </span>
                    )}
                    {currentTeacherProfile?.mataPelajaran && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                        {cleanMapelName(currentTeacherProfile.mataPelajaran)}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                    Menampilkan khusus jadwal mengajar resmi akun Anda ({jadwalList.length} sesi mengajar, {shiftStats.totalJp} Jam Pelajaran).
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-600 text-white shadow-xs">
                  {jadwalList.length} Sesi Terjadwal ({shiftStats.totalJp} JP)
                </span>
              </div>
            </div>
          )}

          {/* Shift & Kelompok Switcher & Layout Toggle Bar */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Quick Shift & Kelompok Filters */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => handleSelectTableShiftOption('semua')}
                className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  tableShiftOption === 'semua'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>Semua Shift & Kelompok</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  tableShiftOption === 'semua' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {tableGroupCounts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTableShiftOption('pagi_k1')}
                className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  tableShiftOption === 'pagi_k1'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                }`}
                title="Shift Pagi: Kelas X & XI (06.30 - 12.00 WIB)"
              >
                <Sun className="w-3.5 h-3.5 shrink-0" />
                <span>Shift Pagi • Kelas X & XI</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  tableShiftOption === 'pagi_k1' ? 'bg-white/20 text-white' : 'bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-100'
                }`}>
                  {tableGroupCounts.pagi_k1}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTableShiftOption('siang_k1')}
                className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  tableShiftOption === 'siang_k1'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                }`}
                title="Shift Siang: Kelas X & XI (13.00 - 17.20 WIB)"
              >
                <Sunset className="w-3.5 h-3.5 shrink-0" />
                <span>Shift Siang • Kelas X & XI</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  tableShiftOption === 'siang_k1' ? 'bg-white/20 text-white' : 'bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100'
                }`}>
                  {tableGroupCounts.siang_k1}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTableShiftOption('pagi_k2')}
                className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  tableShiftOption === 'pagi_k2'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                }`}
                title="Shift Pagi: Kelas XII (06.30 - 12.00 WIB)"
              >
                <Sun className="w-3.5 h-3.5 shrink-0" />
                <span>Shift Pagi • Kelas XII</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  tableShiftOption === 'pagi_k2' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100'
                }`}>
                  {tableGroupCounts.pagi_k2}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTableShiftOption('siang_k2')}
                className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  tableShiftOption === 'siang_k2'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-50/80 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800/60 hover:bg-sky-100 dark:hover:bg-sky-900/60'
                }`}
                title="Shift Siang: Kelas XII (13.00 - 17.20 WIB)"
              >
                <Sunset className="w-3.5 h-3.5 shrink-0" />
                <span>Shift Siang • Kelas XII</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  tableShiftOption === 'siang_k2' ? 'bg-white/20 text-white' : 'bg-sky-200/80 dark:bg-sky-900 text-sky-900 dark:text-sky-100'
                }`}>
                  {tableGroupCounts.siang_k2}
                </span>
              </button>
            </div>

            {/* Layout Toggle (Grouped vs Flat) */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setTableLayoutMode('grouped')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  tableLayoutMode === 'grouped'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilkan jadwal dalam kelompok kartu per Shift dan Tingkat Kelas"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tampilan Berkelompok</span>
                <span className="sm:hidden">Grup</span>
              </button>
              <button
                type="button"
                onClick={() => setTableLayoutMode('flat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  tableLayoutMode === 'flat'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilkan semua jadwal dalam satu tabel tunggal"
              >
                <Table2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabel Tunggal</span>
                <span className="sm:hidden">Tabel</span>
              </button>
            </div>

            {/* Quick Action: Buka Absen Harian Guru */}
            {canAccessAbsenGuru && (
              <button
                type="button"
                onClick={() => {
                  if (onNavigateView) onNavigateView('absen_harian_guru');
                  else setActiveTab('absen_guru');
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-emerald-500/20 transition cursor-pointer shrink-0"
                title="Buka Menu Absen Harian Guru Mengajar"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Absen Harian Guru</span>
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {/* Search Bar */}
              <div className="relative md:col-span-2 lg:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari mapel, guru, kelas..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Shift */}
              <div>
                <select
                  value={filterShift}
                  onChange={(e) => handleFilterShiftChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                  title="Filter Shift Mengajar"
                >
                  <option value="semua">Semua Shift</option>
                  <option value="Pagi">☀️ Shift Pagi (06.30 - 12.00)</option>
                  <option value="Siang">🌤️ Shift Siang (13.00 - 17.20)</option>
                </select>
              </div>

              {/* Filter Kelompok */}
              <div>
                <select
                  value={filterKelompok}
                  onChange={(e) => {
                    const val = e.target.value === 'semua' ? 'semua' : (Number(e.target.value) as 1 | 2);
                    handleFilterKelompokChange(val);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                  title="Filter Kelompok Kelas"
                >
                  <option value="semua">Semua Kelompok</option>
                  <option value="1">Kelompok 1 (Kelas X & XI)</option>
                  <option value="2">Kelompok 2 (Kelas XII)</option>
                </select>
              </div>

              {/* Filter Hari */}
              <div>
                <select
                  value={filterHari}
                  onChange={(e) => {
                    setFilterHari(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                >
                  <option value="semua">Semua Hari</option>
                  {HARI_SENIN_JUMAT.map((h) => (
                    <option key={h} value={h}>
                      Hari {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Kelas */}
              <div>
                <select
                  value={filterKelas}
                  onChange={(e) => {
                    setFilterKelas(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                >
                  <option value="semua">Semua Kelas</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Guru */}
              <div>
                {canManageAll ? (
                  <select
                    value={filterGuru}
                    onChange={(e) => {
                      setFilterGuru(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                  >
                    <option value="semua">Semua Guru</option>
                    {guruList.map((g) => (
                      <option key={g.id} value={g.username}>
                        {g.nama}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center px-3 py-2 text-xs rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold truncate">
                    <UserCheck className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    <span className="truncate">{currentTeacherProfile?.nama}</span>
                  </div>
                )}
              </div>

              {/* Urutan / Filter Sorting (ASC vs DESC) */}
              <div className="flex items-center gap-1.5">
                <select
                  value={sortField}
                  onChange={(e) => {
                    setSortField(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                  title="Pilih Kolom Urutan"
                >
                  <option value="kelompok_shift">👥 Urut Shift & Kelompok</option>
                  <option value="hari">📅 Urut Hari & Shift</option>
                  <option value="mapel">📚 Urut Mata Pelajaran</option>
                  <option value="guru">👨‍🏫 Urut Guru Pengampu</option>
                  <option value="kelas">🏫 Urut Kelas</option>
                  <option value="jam">⏰ Urut Jam Ke</option>
                </select>

                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2.5 py-2 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs flex items-center justify-center gap-1 shrink-0 transition active:scale-95 cursor-pointer"
                  title={`Ganti Urutan: ${sortOrder === 'asc' ? 'ASC (A-Z / Lama ke Baru)' : 'DESC (Z-A / Baru ke Lama)'}`}
                >
                  {sortOrder === 'asc' ? (
                    <>
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">ASC</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">DESC</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ===============================================================
              VIEW 1: TAMPILAN BERKELOMPOK (SHIFT PAGI & SIANG PER KELOMPOK)
              =============================================================== */}
          {tableLayoutMode === 'grouped' ? (
            <div className="space-y-5">
              {TABLE_SHIFT_GROUPS.filter((grp) => {
                if (tableShiftOption !== 'semua' && grp.id !== tableShiftOption) return false;
                if (filterKelompok !== 'semua' && grp.kelompok !== filterKelompok) return false;
                if (filterShift !== 'semua' && grp.shift !== filterShift) return false;
                return true;
              }).map((grp) => {
                const groupSchedules = filteredJadwal.filter(
                  (j) => getKelasKelompok(j.kelasNama, j.kelasId) === grp.kelompok && (j.shift || 'Pagi') === grp.shift
                );
                const groupTotalJp = groupSchedules.reduce((acc, j) => acc + parseJamKeList(j.jamKe, j.jamKeList).length, 0);
                const isCollapsed = !!collapsedGroups[grp.id];
                const Icon = grp.icon;

                return (
                  <div
                    key={grp.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all ${grp.accentBorder}`}
                  >
                    {/* Group Header Banner */}
                    <div className={`p-4 sm:p-5 bg-gradient-to-r ${grp.headerColor} border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-xs border ${grp.badgeColor}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                              {grp.kelompokTitle} • {grp.shiftTitle}
                            </h3>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${grp.badgeColor}`}>
                              {grp.kelompokTingkat}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                              {grp.shift === 'Pagi' ? '☀️ Shift Pagi' : '🌤️ Shift Siang'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{grp.shiftWaktu}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs">
                          {groupSchedules.length} Sesi ({groupTotalJp} JP)
                        </span>
                        {canAccessAbsenGuru && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateView) {
                                onNavigateView('absen_harian_guru');
                              } else {
                                setTableShiftOption(grp.id);
                                setActiveTab('absen_guru');
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition flex items-center gap-1 cursor-pointer"
                            title={`Buka Absen Harian Guru untuk ${grp.shiftTitle} (${grp.kelompokTingkat})`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Absen Guru</span>
                          </button>
                        )}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleOpenAddWithShiftAndKelompok(grp.shift, grp.kelompok)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition flex items-center gap-1 cursor-pointer"
                            title={`Tambah Jadwal Baru di ${grp.shiftTitle} (${grp.kelompokTingkat})`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Tambah Jadwal</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleGroupCollapse(grp.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title={isCollapsed ? 'Buka Tabel' : 'Ciutkan Tabel'}
                        >
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Subtable Content */}
                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        {groupSchedules.length === 0 ? (
                          <div className="py-10 px-4 text-center text-slate-400 dark:text-slate-500">
                            <Calendar className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                            <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                              Belum ada jadwal pada {grp.shiftTitle} {grp.kelompokTitle}
                              {searchTerm || filterHari !== 'semua' || filterKelas !== 'semua' || filterGuru !== 'semua' ? ' yang sesuai dengan filter.' : '.'}
                            </p>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => handleOpenAddWithShiftAndKelompok(grp.shift, grp.kelompok)}
                                className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Tambah Jadwal untuk Shift & Kelompok ini
                              </button>
                            )}
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 select-none">
                                <th className="py-2.5 px-4 font-bold text-center w-12">No</th>
                                <th className="py-2.5 px-4 font-bold">Hari</th>
                                <th className="py-2.5 px-4 font-bold">Mata Pelajaran</th>
                                <th className="py-2.5 px-4 font-bold">Guru Pengampu</th>
                                <th className="py-2.5 px-4 font-bold">Kelas</th>
                                <th className="py-2.5 px-4 font-bold">Jam Ke (1 - 10) & Waktu</th>
                                <th className="py-2.5 px-4 font-bold text-center w-28">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {groupSchedules.map((item, idx) => {
                                const itemJamList = parseJamKeList(item.jamKe, item.jamKeList);
                                const isSiang = (item.shift || 'Pagi') === 'Siang';
                                const timeStr = itemJamList.length > 0
                                  ? `${getJamPelajaranTime(Math.min(...itemJamList), isSiang ? 'Siang' : 'Pagi').split(' - ')[0]} - ${getJamPelajaranTime(Math.max(...itemJamList), isSiang ? 'Siang' : 'Pagi').split(' - ')[1]}`
                                  : '';
                                return (
                                  <tr
                                    key={item.id}
                                    className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition"
                                  >
                                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                                      {idx + 1}
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        <span>{item.hari}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-extrabold text-blue-600 dark:text-blue-400">
                                          {cleanMapelName(item.mataPelajaran)}
                                        </span>
                                        {isJadwalMatchingAcuan(item) ? (
                                          <span
                                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                            title="Sesuai penugasan resmi guru di menu Mapel & Kelas Ajar"
                                          >
                                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                                            <span>Acuan ✓</span>
                                          </span>
                                        ) : (
                                          <span
                                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                            title="Di luar penugasan resmi guru di menu Mapel & Kelas Ajar"
                                          >
                                            <span>Di Luar Acuan</span>
                                          </span>
                                        )}
                                      </div>
                                      {item.catatan && (
                                        <div className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
                                          {item.catatan}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                                        {item.guruNama}
                                      </div>
                                      {item.guruNip && (
                                        <div className="text-[11px] text-slate-400 font-mono">
                                          NIP: {item.guruNip}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                        {item.kelasNama}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      {itemJamList.length > 0 ? (
                                        <div className="space-y-1">
                                          <div className="flex flex-wrap items-center gap-1">
                                            {itemJamList.map((j) => (
                                              <span
                                                key={j}
                                                className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center shadow-2xs ${
                                                  isSiang ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'
                                                }`}
                                                title={`Jam ke-${j} (${item.shift || 'Pagi'}: ${getJamPelajaranTime(j, isSiang ? 'Siang' : 'Pagi')})`}
                                              >
                                                {j}
                                              </span>
                                            ))}
                                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 ml-1">
                                              ({itemJamList.length} JP)
                                            </span>
                                          </div>
                                          {timeStr && (
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                              {timeStr} WIB
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="font-mono text-slate-600 dark:text-slate-400">
                                          {item.jamKe || '-'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        {!readOnly && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => handleStartEdit(item)}
                                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                              title="Edit Jadwal"
                                            >
                                              <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDuplicate(item)}
                                              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                              title="Duplikat Jadwal"
                                            >
                                              <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDelete(item)}
                                              className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                              title="Hapus Jadwal"
                                            >
                                              <Trash2 className="w-4 h-4" />
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
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ===============================================================
               VIEW 2: TAMPILAN TABEL TUNGGAL (FLAT LIST WITH SHIFT & KELOMPOK)
               =============================================================== */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-4 font-bold text-center w-12">No</th>

                      <th
                        onClick={() => handleHeaderSort('kelompok_shift')}
                        className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 select-none transition"
                        title="Klik untuk mengurutkan berdasarkan Kelompok & Shift"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Kelompok & Shift</span>
                          {sortField === 'kelompok_shift' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-black" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-black" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleHeaderSort('hari')}
                        className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 select-none transition"
                        title="Klik untuk mengurutkan berdasarkan Hari"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Hari</span>
                          {sortField === 'hari' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-black" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-black" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleHeaderSort('mapel')}
                        className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 select-none transition"
                        title="Klik untuk mengurutkan berdasarkan Mata Pelajaran"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Mata Pelajaran</span>
                          {sortField === 'mapel' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-black" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-black" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleHeaderSort('guru')}
                        className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 select-none transition"
                        title="Klik untuk mengurutkan berdasarkan Guru Pengampu"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Guru Pengampu</span>
                          {sortField === 'guru' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-black" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-black" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleHeaderSort('kelas')}
                        className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 select-none transition"
                        title="Klik untuk mengurutkan berdasarkan Kelas"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Kelas</span>
                          {sortField === 'kelas' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-black" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-black" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleHeaderSort('jam')}
                        className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 select-none transition"
                        title="Klik untuk mengurutkan berdasarkan Jam Ke"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Jam Ke (1 - 10)</span>
                          {sortField === 'jam' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-black" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-black" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      <th className="py-3 px-4 font-bold text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedJadwal.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                            <p className="font-semibold">
                              {isTeacher
                                ? 'Belum ada jadwal mengajar yang terdaftar untuk akun Anda.'
                                : 'Belum ada jadwal mengajar yang sesuai filter.'}
                            </p>
                            {isTeacher ? (
                              <p className="text-xs text-slate-400 max-w-md">
                                Jadwal mengajar resmi ditentukan oleh bagian Kurikulum. Hubungi staf kurikulum jika jadwal Anda belum muncul.
                              </p>
                            ) : !readOnly ? (
                              <button
                                type="button"
                                onClick={() => setActiveTab('matriks')}
                                className="text-xs text-blue-600 hover:underline font-bold mt-1 cursor-pointer"
                              >
                                Buka Matriks Mingguan untuk Mengisi Jadwal (+)
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedJadwal.map((item, idx) => {
                        const itemJamList = parseJamKeList(item.jamKe, item.jamKeList);
                        const isSiang = (item.shift || 'Pagi') === 'Siang';
                        const kel = getKelasKelompok(item.kelasNama, item.kelasId);
                        const timeStr = itemJamList.length > 0
                          ? `${getJamPelajaranTime(Math.min(...itemJamList), isSiang ? 'Siang' : 'Pagi').split(' - ')[0]} - ${getJamPelajaranTime(Math.max(...itemJamList), isSiang ? 'Siang' : 'Pagi').split(' - ')[1]}`
                          : '';

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition"
                          >
                            <td className="py-3 px-4 text-center text-slate-400 font-mono">
                              {(currentPage - 1) * itemsPerPage + idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                  kel === 1
                                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                }`}>
                                  {kel === 1 ? 'Kelas X & XI' : 'Kelas XII'}
                                </span>
                                {isSiang ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                                    <Sunset className="w-3 h-3" /> Shift Siang
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    <Sun className="w-3 h-3" /> Shift Pagi
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>{item.hari}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-blue-600 dark:text-blue-400">
                                  {cleanMapelName(item.mataPelajaran)}
                                </span>
                                {isJadwalMatchingAcuan(item) ? (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    title="Sesuai penugasan resmi guru di menu Mapel & Kelas Ajar"
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                                    <span>Acuan ✓</span>
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                    title="Di luar penugasan resmi guru di menu Mapel & Kelas Ajar"
                                  >
                                    <span>Di Luar Acuan</span>
                                  </span>
                                )}
                              </div>
                              {item.catatan && (
                                <div className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
                                  {item.catatan}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.guruNama}
                              </div>
                              {item.guruNip && (
                                <div className="text-[11px] text-slate-400 font-mono">
                                  NIP: {item.guruNip}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                {item.kelasNama}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {itemJamList.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-1">
                                    {itemJamList.map((j) => (
                                      <span
                                        key={j}
                                        className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center shadow-2xs ${
                                          isSiang ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'
                                        }`}
                                        title={`Jam ke-${j} (${item.shift || 'Pagi'}: ${getJamPelajaranTime(j, isSiang ? 'Siang' : 'Pagi')})`}
                                      >
                                        {j}
                                      </span>
                                    ))}
                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 ml-1">
                                      ({itemJamList.length} JP)
                                    </span>
                                  </div>
                                  {timeStr && (
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                      {timeStr} WIB
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="font-mono text-slate-600 dark:text-slate-400">
                                  {item.jamKe || '-'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {!readOnly && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(item)}
                                      className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                      title="Edit Jadwal"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicate(item)}
                                      className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                      title="Duplikat Jadwal"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(item)}
                                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                      title="Hapus Jadwal"
                                    >
                                      <Trash2 className="w-4 h-4" />
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

              {/* Pagination Controls */}
              {filteredJadwal.length > itemsPerPage && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={itemsPerPage}
                    totalItems={filteredJadwal.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setItemsPerPage}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB: ABSEN HARIAN GURU (Terintegrasi dari Jadwal Mengajar & Bilah Switcher Cepat Shift/Kelompok)
          ===================================================================== */}
      {activeTab === 'absen_guru' && canAccessAbsenGuru && (
        <AbsenHarianGuruTab
          appData={appData}
          currentUser={currentUser}
          readOnly={readOnly}
          onUpdateAppData={onUpdateAppData}
          onShowToast={onShowToast}
          onBackToTable={() => setActiveTab('tabel')}
          initialShiftOption={tableShiftOption}
        />
      )}

      {/* =====================================================================
          TAB 3: MATRIKS MINGGUAN (Senin - Jumat vs Jam 1 - 10)
          Filtered by 4 Bagian: Shift Pagi Kelompok 1, Shift Siang Kelompok 2,
                               Shift Pagi Kelompok 2, Shift Siang Kelompok 1
          ===================================================================== */}
      {activeTab === 'matriks' && (
        <div className="space-y-4">
          {/* Controls Bar: Mode Per Kelas / Per Guru & 4-Bagian Shift Tab Selector - Sticky Container */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 sticky top-14 sm:top-16 z-20 transition-all">
            <div className="flex flex-wrap items-center gap-3">
              {/* 4 Shift & Kelompok Switcher */}
              <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                {MATRIX_SHIFT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = matrixShiftOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectMatrixOption(opt.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isActive
                          ? opt.activeColor
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{opt.label}</span>
                      {matrixOptionCounts[opt.id] > 0 && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {matrixOptionCounts[opt.id]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* View Mode Switcher for Admin / Kurikulum */}
              {canManageAll && (
                <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                  <button
                    type="button"
                    onClick={() => setMatrixMode('kelas')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      matrixMode === 'kelas'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Per Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixMode('guru')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      matrixMode === 'guru'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Per Guru
                  </button>
                </div>
              )}
            </div>

            {/* Selector based on mode or Teacher badge */}
            <div className="flex-1 max-w-sm">
              {canManageAll ? (
                matrixMode === 'kelas' ? (
                  <select
                    value={matrixSelectedKelasId}
                    onChange={(e) => setMatrixSelectedKelasId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                  >
                    <optgroup label={`${activeMatrixOption.label} (${activeMatrixOption.tingkatLabel})`}>
                      {kelasList
                        .filter((k) => determineKelasKelompok(k.nama) === activeMatrixOption.kelompok)
                        .map((k) => (
                          <option key={k.id} value={k.id}>
                            Jadwal Kelas: {k.nama}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label={activeMatrixOption.kelompok === 1 ? 'Kelas XII' : 'Kelas X & XI'}>
                      {kelasList
                        .filter((k) => determineKelasKelompok(k.nama) !== activeMatrixOption.kelompok)
                        .map((k) => (
                          <option key={k.id} value={k.id}>
                            Jadwal Kelas: {k.nama}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                ) : (
                  <select
                    value={matrixSelectedGuruUsername}
                    onChange={(e) => setMatrixSelectedGuruUsername(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                  >
                    {guruList.map((g) => (
                      <option key={g.id} value={g.username}>
                        {g.nama}
                      </option>
                    ))}
                  </select>
                )
              ) : (
                <div className="flex items-center justify-end">
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-200 text-xs font-bold">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>Matriks Mengajar: {currentTeacherProfile?.nama}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contextual Information Badge for active matrix view & Routine Activities */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Filter Matriks Aktif:
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  activeMatrixOption.shift === 'Pagi'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                }`}
              >
                {activeMatrixOption.shift === 'Pagi' ? (
                  <Sun className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Sunset className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                )}
                <span>{activeMatrixOption.label}</span>
                <span className="font-medium opacity-80">({activeMatrixOption.tingkatLabel} • Jam 1-10)</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {matrixSchedules.length} Sesi Terjadwal
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleScrollMatrix('left')}
                  disabled={!canScrollLeft}
                  className={`p-1.5 rounded-md transition flex items-center justify-center ${
                    canScrollLeft
                      ? 'text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700 shadow-2xs cursor-pointer'
                      : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                  title="Geser tabel ke kiri"
                  aria-label="Geser ke kiri"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleScrollMatrix('right')}
                  disabled={!canScrollRight}
                  className={`p-1.5 rounded-md transition flex items-center justify-center ${
                    canScrollRight
                      ? 'text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700 shadow-2xs cursor-pointer'
                      : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                  title="Geser tabel ke kanan"
                  aria-label="Geser ke kanan"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Matrix Timetable Table */}
          <div className="relative group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div
              ref={matrixScrollContainerRef}
              className="overflow-x-auto scroll-smooth rounded-2xl"
            >
              <table className="w-full text-left text-xs border-collapse min-w-[1550px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200 w-36 min-w-[130px] border-r border-slate-200 dark:border-slate-700 sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-[1px_0_0_0_#cbd5e1] dark:shadow-[1px_0_0_0_#334155]">
                      <div className="flex items-center gap-2">
                        <CalendarRange className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Hari</span>
                      </div>
                    </th>
                    {LIST_JAM_ANGKA.map((jamNum) => {
                      const timeStr = getJamPelajaranTime(jamNum, activeMatrixOption.shift);
                      return (
                        <th
                          key={jamNum}
                          className="py-3 px-2 font-bold text-center min-w-[145px] border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0"
                              title={`Jam ke-${jamNum} (${activeMatrixOption.shift}: ${timeStr})`}
                            >
                              {jamNum}
                            </span>
                            <span className="font-bold text-[11px] text-slate-700 dark:text-slate-200 whitespace-nowrap">
                              {timeStr}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {HARI_SENIN_JUMAT.map((hari) => {
                    return (
                      <tr key={hari} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        {/* Hari Column (Sticky Left) - Clean, only day name */}
                        <td className="py-3.5 px-4 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 shadow-[1px_0_0_0_#cbd5e1] dark:shadow-[1px_0_0_0_#334155] align-middle">
                          <div className="font-black text-sm text-slate-900 dark:text-white">
                            {hari}
                          </div>
                        </td>

                        {/* Columns for Jam 1 s.d. 10 */}
                        {LIST_JAM_ANGKA.map((jamNum) => {
                          // Shift Siang untuk semua kelas: Senin TIDAK ADA upacara dan Jumat TIDAK ADA pembiasaan (KBM penuh Jam 1 s.d. 10)
                          const isUpacara = activeMatrixOption.shift === 'Pagi' && hari === 'Senin' && (jamNum === 1 || jamNum === 2);
                          const isPembiasaan = activeMatrixOption.shift === 'Pagi' && hari === 'Jumat' && (jamNum === 1 || jamNum === 2);

                          // Find all schedules on this day covering this jamNum and matching shift
                          const matchedSchedules = matrixSchedules.filter((item) => {
                            if (item.hari !== hari) return false;
                            const itemJamList = parseJamKeList(item.jamKe, item.jamKeList);
                            return itemJamList.includes(jamNum);
                          });

                          return (
                            <td
                              key={jamNum}
                              className={`py-2 px-2.5 min-w-[135px] border-r border-slate-200 dark:border-slate-700 last:border-r-0 align-top ${
                                matchedSchedules.length === 0 && isUpacara
                                  ? 'bg-rose-50/30 dark:bg-rose-950/15'
                                  : matchedSchedules.length === 0 && isPembiasaan
                                  ? 'bg-emerald-50/30 dark:bg-emerald-950/15'
                                  : ''
                              }`}
                            >
                              {matchedSchedules.length > 0 ? (
                                <div className="space-y-1.5">
                                  {matchedSchedules.map((matchedSchedule, sIdx) => (
                                    <div
                                      key={matchedSchedule.id || sIdx}
                                      className={`p-2 rounded-xl border space-y-1 ${
                                        matchedSchedules.length > 1
                                          ? 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 shadow-2xs'
                                          : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60'
                                      }`}
                                    >
                                      {matchedSchedules.length > 1 && sIdx === 0 && (
                                        <div className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 mb-0.5">
                                          <span>Tumpang Tindih ({matchedSchedules.length} Jadwal)</span>
                                        </div>
                                      )}
                                      {isUpacara && (
                                        <div className="inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 mb-0.5">
                                          <Flag className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                          <span>Upacara</span>
                                        </div>
                                      )}
                                      {isPembiasaan && (
                                        <div className="inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 mb-0.5">
                                          <Sparkles className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                          <span>Pembiasaan</span>
                                        </div>
                                      )}
                                      <div className="font-extrabold text-blue-700 dark:text-blue-300 text-xs line-clamp-2">
                                        {cleanMapelName(matchedSchedule.mataPelajaran)}
                                      </div>
                                      <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                                        {matrixMode === 'kelas'
                                          ? matchedSchedule.guruNama
                                          : matchedSchedule.kelasNama}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-0.5">
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100/60 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold">
                                          {matchedSchedule.shift || 'Pagi'}
                                        </span>
                                        {!readOnly && (isAdmin || isKurikulum || isStafJadwal || isGuruMapel) && (
                                          <div className="flex items-center gap-0.5 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => handleStartEdit(matchedSchedule)}
                                              className="p-1 rounded-md text-blue-600 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 transition cursor-pointer"
                                              title="Edit Jadwal"
                                              aria-label="Edit Jadwal"
                                            >
                                              <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDelete(matchedSchedule)}
                                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                                              title="Hapus Jadwal"
                                              aria-label="Hapus Jadwal"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : isUpacara ? (
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/50 dark:to-red-950/30 border border-rose-200 dark:border-rose-900/70 space-y-1 shadow-2xs">
                                  <div className="flex items-center gap-1.5 font-black text-rose-700 dark:text-rose-300 text-xs">
                                    <Flag className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                    <span className="truncate">Upacara Bendera</span>
                                  </div>
                                  <div className="text-[10px] font-semibold text-rose-700/80 dark:text-rose-300/80 leading-tight">
                                    Bukan Pelajaran (Wajib Bersama)
                                  </div>
                                </div>
                              ) : isPembiasaan ? (
                                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-900/70 space-y-1 shadow-2xs">
                                  <div className="flex items-center gap-1 font-black text-emerald-700 dark:text-emerald-300 text-xs">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span className="truncate">Pembiasaan Baik</span>
                                  </div>
                                  <div className="text-[10px] font-medium text-emerald-700/90 dark:text-emerald-300/90 flex items-center justify-between gap-1">
                                    <span className="truncate">Karakter/Rohis</span>
                                    {!readOnly && (isAdmin || isKurikulum || isStafJadwal || isGuruMapel) && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenFormForCell(hari, jamNum)}
                                        className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
                                        title={`Isi penugasan / catatan Hari ${hari}, Jam ${jamNum}`}
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Isi</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full min-h-[44px] flex items-center justify-center text-slate-300 dark:text-slate-700 text-[11px]">
                                  {!readOnly ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenFormForCell(hari, jamNum)}
                                      className="w-6 h-6 rounded-md inline-flex items-center justify-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition cursor-pointer"
                                      title={`Isi jadwal hari ${hari}, Jam ke-${jamNum} (${activeMatrixOption.label})`}
                                      aria-label={`Isi jadwal hari ${hari}, Jam ke-${jamNum}`}
                                    >
                                      <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" strokeWidth={3} />
                                    </button>
                                  ) : (
                                    <span>-</span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
