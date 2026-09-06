import React, { useState, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Calendar,
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
  Info,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { AppData, JadwalMengajarGuru, UserSession, WaliKelas, Kelas, MataPelajaran, ViewType } from '../../types';
import { PageHeader } from '../common/UIComponents';
import { Pagination } from '../Pagination';
import { addAuditLog, cleanMapelName } from '../../utils/helpers';
import { DEFAULT_MATA_PELAJARAN } from '../../data/initialData';

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

  // Active Main Tab: 'tabel' (Daftar & Kelola) vs 'matriks' (Grid Jadwal Mingguan) vs 'form' (Input Jadwal)
  const [activeTab, setActiveTab] = useState<'tabel' | 'matriks' | 'form'>('tabel');

  // Master Data collections
  const guruList: WaliKelas[] = useMemo(() => {
    return appData.waliKelas || [];
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
  const isTeacher = !isAdmin;

  // Resolve current logged-in teacher's profile
  const currentTeacherProfile = useMemo(() => {
    if (isAdmin || !currentUser) return null;
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
  }, [isAdmin, currentUser, appData.waliKelas]);

  // Predicate: Does this schedule belong to the logged-in teacher?
  const isMySchedule = useCallback(
    (j: JadwalMengajarGuru) => {
      if (isAdmin) return true;
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
    [isAdmin, currentTeacherProfile, currentUser]
  );

  // Raw master schedules
  const allJadwalList: JadwalMengajarGuru[] = useMemo(() => {
    return appData.jadwalMengajar || [];
  }, [appData.jadwalMengajar]);

  // Active schedules: strictly only current teacher's schedules if teacher, or all if admin
  const jadwalList: JadwalMengajarGuru[] = useMemo(() => {
    if (isAdmin) return allJadwalList;
    return allJadwalList.filter(isMySchedule);
  }, [isAdmin, allJadwalList, isMySchedule]);

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
  const [formRuangan, setFormRuangan] = useState<string>('Ruang Kelas');
  const [formCatatan, setFormCatatan] = useState<string>('');

  /* =========================================================================
     FILTER & SEARCH STATES FOR TABLE & MATRIX
     ========================================================================= */
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState<string>('semua');
  const [filterHari, setFilterHari] = useState<string>('semua');
  const [filterKelas, setFilterKelas] = useState<string>('semua');
  const [filterGuru, setFilterGuru] = useState<string>('semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Matrix Filter State (per Kelas atau per Guru) & Shift Matrix
  const [matrixMode, setMatrixMode] = useState<'kelas' | 'guru'>('guru');
  const [matrixSelectedKelasId, setMatrixSelectedKelasId] = useState<string>(kelasList[0]?.id || '');
  const [matrixSelectedGuruUsername, setMatrixSelectedGuruUsername] = useState<string>(
    isTeacher && currentTeacherProfile ? currentTeacherProfile.username : guruList[0]?.username || ''
  );
  const [matrixShift, setMatrixShift] = useState<'Pagi' | 'Siang'>('Pagi');

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
    if (formSelectedJam.includes(jamNum)) {
      setFormSelectedJam(formSelectedJam.filter((j) => j !== jamNum));
    } else {
      setFormSelectedJam([...formSelectedJam, jamNum].sort((a, b) => a - b));
    }
  };

  // Quick Preset Handlers
  const selectJamRange = (start: number, end: number) => {
    const list: number[] = [];
    for (let i = start; i <= end; i++) list.push(i);
    setFormSelectedJam(list);
  };

  const selectAllJam = () => {
    setFormSelectedJam([...LIST_JAM_ANGKA]);
  };

  const resetJam = () => {
    setFormSelectedJam([]);
  };

  // When teacher changes, auto-suggest their subject if available
  const handleGuruChange = (username: string) => {
    setFormGuruUsername(username);
    const found = guruList.find((g) => g.username === username);
    if (found && found.mataPelajaran && !formMataPelajaran) {
      setFormMataPelajaran(cleanMapelName(found.mataPelajaran));
      const mapelObj = mapelList.find((m) => m.nama === cleanMapelName(found.mataPelajaran));
      if (mapelObj) setFormKodeMapel(mapelObj.kode);
    }
  };

  // When mapel select changes
  const handleMapelChange = (mapelNama: string) => {
    const cleaned = cleanMapelName(mapelNama);
    setFormMataPelajaran(cleaned);
    const found = mapelList.find((m) => m.nama === cleaned);
    if (found) setFormKodeMapel(found.kode);
  };

  // Reset form to clean state
  const resetForm = () => {
    setEditingId(null);
    const teacherUser =
      isTeacher && currentTeacherProfile ? currentTeacherProfile.username : guruList[0]?.username || '';
    setFormGuruUsername(teacherUser);
    setFormHari('Senin');
    setFormKelasId(kelasList[0]?.id || '');
    setFormShift('Pagi');
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
    setFormRuangan('Ruang Kelas');
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
    setFormRuangan(item.ruangan || 'Ruang Kelas');
    setFormCatatan(item.catatan || '');

    setActiveTab('form');
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
    setFormRuangan(item.ruangan || 'Ruang Kelas');
    setFormCatatan(item.catatan || '');

    setActiveTab('form');
    onShowToast(`Duplikasi form jadwal: ${cleanMapelName(item.mataPelajaran)}. Silakan sesuaikan lalu simpan!`, 'info');
  };

  // Delete schedule handler
  const handleDelete = (item: JadwalMengajarGuru) => {
    if (readOnly) return;
    onConfirmModal(
      'Hapus Jadwal Mengajar',
      `Yakin ingin menghapus jadwal mengajar mata pelajaran "${item.mataPelajaran}" untuk kelas ${item.kelasNama} (${item.hari}, Shift ${item.shift || 'Pagi'}, ${item.jamKe || 'Jam terpilih'})?`,
      'danger',
      () => {
        const nextList = allJadwalList.filter((j) => j.id !== item.id);
        const updatedAppData = addAuditLog(
          { ...appData, jadwalMengajar: nextList },
          'Hapus Jadwal Mengajar',
          `Menghapus jadwal ${item.mataPelajaran} (${item.kelasNama} - ${item.guruNama}) pada ${item.hari} Shift ${item.shift || 'Pagi'}`
        );
        onUpdateAppData(updatedAppData);
        onShowToast(`Jadwal ${item.mataPelajaran} berhasil dihapus.`, 'success');
      }
    );
  };

  /* =========================================================================
     SMART ANTI-BENTROK (CONFLICT DETECTION) REALTIME
     Checks for collisions on the SAME Day, SAME Shift, and Overlapping Jam Ke (1-10)
     ========================================================================= */
  const conflictWarnings = useMemo(() => {
    if (formSelectedJam.length === 0) return [];
    const warnings: string[] = [];

    const otherSchedules = allJadwalList.filter((j) => j.id !== editingId);

    // 1. Check Guru Bentrok (Teacher teaching another class at same day, same shift, and overlapping hour)
    for (const other of otherSchedules) {
      const otherShift = other.shift === 'Siang' ? 'Siang' : 'Pagi';
      if (other.guruUsername === formGuruUsername && other.hari === formHari && otherShift === formShift) {
        const otherJamList = parseJamKeList(other.jamKe, other.jamKeList);
        const overlap = formSelectedJam.filter((j) => otherJamList.includes(j));
        if (overlap.length > 0) {
          warnings.push(
            `Guru Bentrok: ${other.guruNama} sudah dijadwalkan di kelas ${other.kelasNama} (${other.mataPelajaran}) pada hari ${formHari} Shift ${formShift} Jam ke-${overlap.join(', ')}!`
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
  }, [formSelectedJam, formGuruUsername, formHari, formKelasId, formShift, editingId, allJadwalList]);

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
      ruangan: formRuangan.trim() || 'Ruang Kelas',
      catatan: formCatatan.trim(),
    };

    let nextList: JadwalMengajarGuru[];
    if (editingId) {
      nextList = allJadwalList.map((j) => (j.id === editingId ? newSchedule : j));
    } else {
      nextList = [newSchedule, ...allJadwalList];
    }

    const updatedAppData = addAuditLog(
      { ...appData, jadwalMengajar: nextList },
      editingId ? 'Edit Jadwal Mengajar Guru' : 'Tambah Jadwal Mengajar Guru',
      `${editingId ? 'Memperbarui' : 'Menambahkan'} jadwal ${newSchedule.mataPelajaran} (${newSchedule.kelasNama} - ${newSchedule.guruNama}) pada hari ${newSchedule.hari} Shift ${newSchedule.shift} ${newSchedule.jamKe}`
    );

    onUpdateAppData(updatedAppData);
    onShowToast(
      editingId
        ? `Jadwal ${newSchedule.mataPelajaran} berhasil diperbarui!`
        : `Jadwal mengajar ${newSchedule.mataPelajaran} untuk ${newSchedule.kelasNama} (${formShift === 'Siang' ? 'Shift Siang' : 'Shift Pagi'}) berhasil disimpan!`,
      'success'
    );

    resetForm();
    setActiveTab('tabel');
  };

  /* =========================================================================
     FILTERED JADWAL FOR TABLE
     ========================================================================= */
  const filteredJadwal = useMemo(() => {
    return jadwalList.filter((item) => {
      const matchSearch =
        searchTerm === '' ||
        item.mataPelajaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.guruNama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kelasNama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.ruangan || '').toLowerCase().includes(searchTerm.toLowerCase());

      const itemShift = item.shift === 'Siang' ? 'Siang' : 'Pagi';
      const matchShift = filterShift === 'semua' || itemShift === filterShift;
      const matchHari = filterHari === 'semua' || item.hari === filterHari;
      const matchKelas = filterKelas === 'semua' || item.kelasId === filterKelas;
      const matchGuru = filterGuru === 'semua' || item.guruUsername === filterGuru;

      return matchSearch && matchShift && matchHari && matchKelas && matchGuru;
    });
  }, [jadwalList, searchTerm, filterShift, filterHari, filterKelas, filterGuru]);

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
      return {
        No: idx + 1,
        'Hari Mengajar': j.hari,
        Shift: j.shift === 'Siang' ? 'Shift Siang' : 'Shift Pagi',
        'Nama Guru': j.guruNama,
        'NIP Guru': j.guruNip || '-',
        'Kelas Ajar': j.kelasNama,
        'Mata Pelajaran': j.mataPelajaran,
        'Kode Mapel': j.kodeMapel || '-',
        'Jam Ke (1-10)': jamList.length > 0 ? jamList.join(', ') : j.jamKe || '-',
        'Total JP': jamList.length > 0 ? `${jamList.length} JP` : '-',
        Ruangan: j.ruangan || 'Ruang Kelas',
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
        RUANGAN: 'Lab Komputer 1',
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
        RUANGAN: 'Ruang Teori 2',
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
            ruangan: String(r['RUANGAN'] || r['Ruangan'] || 'Ruang Kelas').trim(),
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
     RENDER MATRIX DATA (Per Kelas atau Per Guru, Filtered by Shift)
     ========================================================================= */
  const matrixSchedules = useMemo(() => {
    return jadwalList.filter((j) => {
      const matchesTarget =
        !isAdmin
          ? true
          : matrixMode === 'kelas'
          ? j.kelasId === matrixSelectedKelasId
          : j.guruUsername === matrixSelectedGuruUsername;
      const itemShift = j.shift === 'Siang' ? 'Siang' : 'Pagi';
      return matchesTarget && itemShift === matrixShift;
    });
  }, [jadwalList, matrixMode, matrixSelectedKelasId, matrixSelectedGuruUsername, matrixShift, isAdmin]);

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
          <div className="flex flex-wrap items-center gap-2">
            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveTab('form');
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isTeacher ? 'Tambah Jadwal Saya' : 'Tambah Jadwal Baru'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              title={isTeacher ? 'Ekspor Jadwal Mengajar Saya ke Excel' : 'Ekspor Jadwal ke Excel'}
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">{isTeacher ? 'Ekspor Jadwal Saya' : 'Ekspor Excel'}</span>
            </button>

            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                  title="Import Jadwal dari Excel"
                >
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">Import Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                  title="Unduh Template Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  <span className="hidden sm:inline">Template</span>
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

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Cetak Jadwal Pelajaran"
            >
              <Printer className="w-4 h-4 text-purple-600" />
              <span className="hidden sm:inline">{isTeacher ? 'Cetak Jadwal Saya' : 'Cetak'}</span>
            </button>
          </div>
        }
      />

      {/* SHIFT OVERVIEW STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Jadwal / Sesi Mengajar Saya */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isTeacher ? 'Total Sesi Mengajar Saya' : 'Total Jadwal'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{shiftStats.total}</span>
            <span className="text-xs font-medium text-slate-400">
              {isTeacher ? `${shiftStats.totalJp} Total JP` : 'Sesi Pelajaran'}
            </span>
          </div>
        </div>

        {/* Card 2: Shift Pagi (10 Jam) */}
        <div
          onClick={() => {
            setFilterShift('Pagi');
            setActiveTab('tabel');
          }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 p-4 shadow-xs hover:border-amber-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5" /> Shift Pagi
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              Jam 1 - 10
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{shiftStats.pagi}</span>
            <span className="text-xs font-medium text-slate-400">
              {isTeacher ? `${shiftStats.pagiJp} JP Terjadwal` : 'Sesi Terjadwal'}
            </span>
          </div>
        </div>

        {/* Card 3: Shift Siang (10 Jam) */}
        <div
          onClick={() => {
            setFilterShift('Siang');
            setActiveTab('tabel');
          }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/40 p-4 shadow-xs hover:border-indigo-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
              <Sunset className="w-3.5 h-3.5" /> Shift Siang
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              Jam 1 - 10
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{shiftStats.siang}</span>
            <span className="text-xs font-medium text-slate-400">
              {isTeacher ? `${shiftStats.siangJp} JP Terjadwal` : 'Sesi Terjadwal'}
            </span>
          </div>
        </div>

        {/* Card 4: Total Guru / Beban Mengajar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isTeacher ? 'Beban Mengajar (JP)' : 'Guru Terjadwal'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
              {isTeacher ? <BookOpen className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {isTeacher ? `${shiftStats.totalJp} JP` : shiftStats.totalGuru}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {isTeacher
                ? currentTeacherProfile?.mataPelajaran || 'Mata Pelajaran Aktif'
                : `dari ${guruList.length} Guru`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
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

          {!readOnly && (
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'form'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{editingId ? 'Edit Jadwal' : 'Form Input Jadwal'}</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <span>Shift Pagi &amp; Siang masing-masing Jam 1 s.d. 10</span>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: FORM INPUT JADWAL MENGAJAR
          - Nama Guru (dropdown)
          - Hari (dropdown senin-jumat)
          - Kelas (dropdown)
          - Shift (☀️ Shift Pagi / 🌤️ Shift Siang)
          - Jam dengan angka 1-10 (bulatan biru)
          ===================================================================== */}
      {activeTab === 'form' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>
                  {editingId
                    ? isTeacher
                      ? `Edit Jadwal Mengajar: ${formMataPelajaran || 'Sesi Pelajaran'}`
                      : `Edit Jadwal Mengajar Guru: ${formMataPelajaran || 'Sesi Pelajaran'}`
                    : isTeacher
                    ? 'Formulir Tambah Jadwal Mengajar Saya'
                    : 'Formulir Jadwal Mengajar Guru'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isTeacher
                  ? 'Sesuaikan Hari (Senin-Jumat), Kelas, Shift (Pagi/Siang), Jam Pelajaran 1-10 (Bulatan Biru), dan Mata Pelajaran Anda.'
                  : 'Pilih Nama Guru, Hari (Senin-Jumat), Kelas, Shift (Pagi/Siang), dan Jam Pelajaran 1-10 (Bulatan Biru)'}
              </p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4" /> Batal Edit
              </button>
            )}
          </div>

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
            {/* ROW 1: Guru, Hari, Kelas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. NAMA GURU (Dropdown) */}
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
                  <select
                    value={formGuruUsername}
                    onChange={(e) => handleGuruChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                    required
                  >
                    <option value="">-- Pilih Guru Pengampu --</option>
                    {guruList.map((g) => (
                      <option key={g.id} value={g.username}>
                        {g.nama} {g.nip ? `(NIP: ${g.nip})` : ''} - [{g.username}]
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-slate-400">Pendidik yang mengampu sesi ini</p>
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

              {/* 3. KELAS (Dropdown) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                  <span>3. Kelas</span>
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formKelasId}
                  onChange={(e) => setFormKelasId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                  required
                >
                  <option value="">-- Pilih Kelas --</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">Rombongan belajar siswa yang diajar</p>
              </div>
            </div>

            {/* ROW 2: SHIFT SELECTION (Pagi vs Siang) */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>4. Pilihan Shift Mengajar</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opsi Shift Pagi */}
                <button
                  type="button"
                  onClick={() => setFormShift('Pagi')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                    formShift === 'Pagi'
                      ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        formShift === 'Pagi'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Sun className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white">Shift Pagi</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Jam ke-1 s.d. 10</div>
                    </div>
                  </div>
                  {formShift === 'Pagi' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">
                      Aktif
                    </span>
                  )}
                </button>

                {/* Opsi Shift Siang */}
                <button
                  type="button"
                  onClick={() => setFormShift('Siang')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                    formShift === 'Siang'
                      ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        formShift === 'Siang'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Sunset className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white">Shift Siang</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Jam ke-1 s.d. 10</div>
                    </div>
                  </div>
                  {formShift === 'Siang' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                      Aktif
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* ROW 3: JAM DENGAN ANGKA 1-10 (BULATAN BIRU) */}
            <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-200 dark:border-blue-900/60 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-extrabold text-blue-950 dark:text-blue-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>5. Jam Pelajaran: Angka 1-10 (Bulatan Biru)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Klik bulatan angka 1 sampai 10 di bawah untuk {formShift === 'Siang' ? 'Shift Siang' : 'Shift Pagi'}:
                  </p>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => selectJamRange(1, 2)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer"
                  >
                    Jam 1-2
                  </button>
                  <button
                    type="button"
                    onClick={() => selectJamRange(3, 4)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer"
                  >
                    Jam 3-4
                  </button>
                  <button
                    type="button"
                    onClick={() => selectJamRange(5, 6)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer"
                  >
                    Jam 5-6
                  </button>
                  <button
                    type="button"
                    onClick={() => selectJamRange(7, 8)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer"
                  >
                    Jam 7-8
                  </button>
                  <button
                    type="button"
                    onClick={() => selectJamRange(9, 10)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer"
                  >
                    Jam 9-10
                  </button>
                  <button
                    type="button"
                    onClick={selectAllJam}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer"
                  >
                    Pilih 1-10
                  </button>
                  <button
                    type="button"
                    onClick={resetJam}
                    className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:text-rose-600 transition cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Bulatan Biru Angka 1 - 10 Container */}
              <div className="pt-2 pb-1">
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  {LIST_JAM_ANGKA.map((num) => {
                    const isSelected = formSelectedJam.includes(num);
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => toggleJam(num)}
                        className={`group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex flex-col items-center justify-center font-black transition-all duration-150 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-4 ring-blue-300 dark:ring-blue-800 scale-105 z-10'
                            : 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-800 hover:bg-blue-100/70 hover:border-blue-500 hover:scale-105'
                        }`}
                        title={`Jam ke-${num} (${formShift === 'Siang' ? 'Shift Siang' : 'Shift Pagi'})`}
                      >
                        <span className="text-sm sm:text-base">{num}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white absolute bottom-1"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Info Banner for Selected Hours */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-600 text-white shadow-xs">
                    {formSelectedJam.length} JP Terpilih
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatJamKeDisplay(formSelectedJam)}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    {formShift === 'Siang' ? (
                      <>
                        <Sunset className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Shift Siang</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>Shift Pagi</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* ROW 4: Mata Pelajaran & Ruangan */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Mata Pelajaran (Dropdown / Manual) */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mata Pelajaran</span> <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Pilih dari Master atau ketik manual
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={formMataPelajaran}
                    onChange={(e) => handleMapelChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                  >
                    <option value="">-- Pilih dari Master Mapel --</option>
                    {mapelList.map((m) => (
                      <option key={m.id} value={m.nama}>
                        {m.nama}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formMataPelajaran}
                    onChange={(e) => setFormMataPelajaran(e.target.value)}
                    placeholder="Atau ketik nama mapel kustom..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* Ruangan / Tempat Belajar */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5 text-purple-600" />
                  <span>Ruangan / Laboratorium</span>
                </label>
                <input
                  type="text"
                  value={formRuangan}
                  onChange={(e) => setFormRuangan(e.target.value)}
                  placeholder="Lab Komputer 1 / Ruang 10"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
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
                  setActiveTab('tabel');
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

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Bar */}
              <div className="relative lg:col-span-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari mapel, guru, kelas..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Shift */}
              <div>
                <select
                  value={filterShift}
                  onChange={(e) => {
                    setFilterShift(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                >
                  <option value="semua">Semua Shift</option>
                  <option value="Pagi">☀️ Shift Pagi (Jam 1-10)</option>
                  <option value="Siang">🌤️ Shift Siang (Jam 1-10)</option>
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
                  <option value="semua">Semua Hari (Senin - Jumat)</option>
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

              {/* Filter Guru (Admin) vs Profile Badge (Teacher) */}
              <div>
                {isAdmin ? (
                  <select
                    value={filterGuru}
                    onChange={(e) => {
                      setFilterGuru(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                  >
                    <option value="semua">Semua Guru Pengampu</option>
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
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-4 font-bold text-center w-12">No</th>
                    <th className="py-3 px-4 font-bold">Hari & Shift</th>
                    <th className="py-3 px-4 font-bold">Mata Pelajaran</th>
                    <th className="py-3 px-4 font-bold">Guru Pengampu</th>
                    <th className="py-3 px-4 font-bold">Kelas</th>
                    <th className="py-3 px-4 font-bold">Jam Ke (1 - 10)</th>
                    <th className="py-3 px-4 font-bold">Ruangan</th>
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
                              onClick={() => {
                                resetForm();
                                setActiveTab('form');
                              }}
                              className="text-xs text-blue-600 hover:underline font-bold mt-1"
                            >
                              + Buat Jadwal Baru Sekarang
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedJadwal.map((item, idx) => {
                      const itemJamList = parseJamKeList(item.jamKe, item.jamKeList);
                      const isSiang = item.shift === 'Siang';
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="py-3 px-4 text-center text-slate-400 font-mono">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{item.hari}</span>
                            </div>
                            <div className="mt-1">
                              {isSiang ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
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
                            <div className="font-extrabold text-blue-600 dark:text-blue-400">
                              {cleanMapelName(item.mataPelajaran)}
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
                              <div className="flex flex-wrap items-center gap-1">
                                {itemJamList.map((j) => (
                                  <span
                                    key={j}
                                    className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shadow-xs"
                                    title={`Jam ke-${j}`}
                                  >
                                    {j}
                                  </span>
                                ))}
                                <span className="text-[11px] font-semibold text-slate-500 ml-1">
                                  ({itemJamList.length} JP)
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono text-slate-600 dark:text-slate-400">
                                {item.jamKe || '-'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {item.ruangan || 'Ruang Kelas'}
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
        </div>
      )}

      {/* =====================================================================
          TAB 3: MATRIKS MINGGUAN (Senin - Jumat vs Jam 1 - 10)
          Filtered by Shift (Shift Pagi / Shift Siang)
          ===================================================================== */}
      {activeTab === 'matriks' && (
        <div className="space-y-4">
          {/* Controls Bar: Mode Per Kelas / Per Guru & Shift Tab Selector */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Shift Switcher */}
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setMatrixShift('Pagi')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    matrixShift === 'Pagi'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Shift Pagi (Jam 1-10)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixShift('Siang')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    matrixShift === 'Siang'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Sunset className="w-3.5 h-3.5" />
                  <span>Shift Siang (Jam 1-10)</span>
                </button>
              </div>

              {/* View Mode Switcher for Admin */}
              {isAdmin && (
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
              {isAdmin ? (
                matrixMode === 'kelas' ? (
                  <select
                    value={matrixSelectedKelasId}
                    onChange={(e) => setMatrixSelectedKelasId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                  >
                    {kelasList.map((k) => (
                      <option key={k.id} value={k.id}>
                        Jadwal Kelas: {k.nama}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={matrixSelectedGuruUsername}
                    onChange={(e) => setMatrixSelectedGuruUsername(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                  >
                    {guruList.map((g) => (
                      <option key={g.id} value={g.username}>
                        Jadwal Guru: {g.nama}
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

          {/* Matrix Timetable Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-3 font-bold text-center w-24 border-r border-slate-200 dark:border-slate-700">
                      Jam Ke
                    </th>
                    {HARI_SENIN_JUMAT.map((h) => (
                      <th
                        key={h}
                        className="py-3 px-4 font-bold text-center border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                      >
                        Hari {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {LIST_JAM_ANGKA.map((jamNum) => {
                    return (
                      <tr key={jamNum} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        {/* Jam Pelajaran Column with Bulatan Biru */}
                        <td className="py-3 px-3 text-center bg-slate-50/80 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                              {jamNum}
                            </span>
                            <span className="font-bold text-[11px] text-slate-600 dark:text-slate-300">
                              Jam {jamNum}
                            </span>
                          </div>
                        </td>

                        {/* Columns for Senin to Jumat */}
                        {HARI_SENIN_JUMAT.map((hari) => {
                          // Find schedule on this day covering this jamNum and matching shift
                          const matchedSchedule = matrixSchedules.find((item) => {
                            if (item.hari !== hari) return false;
                            const itemJamList = parseJamKeList(item.jamKe, item.jamKeList);
                            return itemJamList.includes(jamNum);
                          });

                          return (
                            <td
                              key={hari}
                              className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 last:border-r-0 align-top"
                            >
                              {matchedSchedule ? (
                                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-1">
                                  <div className="font-extrabold text-blue-700 dark:text-blue-300 text-xs">
                                    {cleanMapelName(matchedSchedule.mataPelajaran)}
                                  </div>
                                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                    {matrixMode === 'kelas'
                                      ? matchedSchedule.guruNama
                                      : matchedSchedule.kelasNama}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                                    <span>{matchedSchedule.ruangan || 'R. Kelas'}</span>
                                    {!readOnly && (
                                      <button
                                        type="button"
                                        onClick={() => handleStartEdit(matchedSchedule)}
                                        className="text-blue-600 hover:underline font-bold"
                                      >
                                        Edit
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full min-h-[44px] flex items-center justify-center text-slate-300 dark:text-slate-700 text-[11px]">
                                  {!readOnly ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        resetForm();
                                        setFormHari(hari);
                                        setFormShift(matrixShift);
                                        if (matrixMode === 'kelas') {
                                          setFormKelasId(matrixSelectedKelasId);
                                        } else {
                                          setFormGuruUsername(matrixSelectedGuruUsername);
                                        }
                                        setFormSelectedJam([jamNum]);
                                        setActiveTab('form');
                                      }}
                                      className="opacity-0 hover:opacity-100 text-[10px] text-blue-600 font-bold px-2 py-1 rounded bg-blue-50 transition cursor-pointer"
                                    >
                                      + Isi
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
