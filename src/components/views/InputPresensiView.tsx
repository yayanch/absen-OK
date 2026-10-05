import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ClipboardCheck,
  CheckCheck,
  CheckCircle2,
  Calendar,
  CalendarX,
  AlertTriangle,
  AlertCircle,
  Save,
  Users,
  Sparkles,
  Edit,
  Trash2,
  Plus,
  Phone,
  MessageCircle,
  X,
  Lock,
  RotateCcw,
  QrCode,
  Search,
  CalendarDays,
  Upload,
  Eye,
  Paperclip,
  Loader2,
  Check,
  ChevronDown,
  Clock,
  UserCheck,
  Wifi,
  WifiOff,
  FileText,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Undo2
} from 'lucide-react';
import { AppData, UserSession, PresensiStatus, SiswaPresensiItem, Siswa, SiswaPresensiSesiGuru, SyncResult } from '../../types';
import { sortKelasList } from '../../data/initialData';
import { PageHeader } from '../common/UIComponents';
import {
  getTodayString,
  formatDateIndo,
  isWeekend,
  isFutureDate,
  normalizePresensiStatus,
  getHariLiburInfo,
  getIndonesianDayName,
  getIndonesianTimeString,
  compressBase64Image,
  validateAttendanceBatch,
  deduplicateAttendanceRecords,
  isValidPresensiStatus
} from '../../utils/helpers';
import { DatePickerWithStatus } from '../DatePickerWithStatus';
import { StudentAttendanceRow } from './StudentAttendanceRow';
import { StudentQrScannerModal } from '../modals/StudentQrScannerModal';
import { TeacherManualAttendanceTab } from './TeacherManualAttendanceTab';
import { Camera } from 'lucide-react';

interface InputPresensiViewProps {
  appData: AppData;
  currentUser: UserSession;
  initialKelasId?: string;
  readOnly?: boolean;
  onSavePresensi: (updatedData: AppData) => Promise<SyncResult> | void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onConfirmModal?: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
  onOpenServerQrModal?: () => void;
}

export const InputPresensiView: React.FC<InputPresensiViewProps> = ({
  appData,
  currentUser,
  initialKelasId,
  readOnly = false,
  onSavePresensi,
  onShowToast,
  onConfirmModal,
  onOpenServerQrModal,
}) => {
  const sortedKelas = sortKelasList(appData.kelas);
  const isPiketKelas = useMemo(() => {
    const role = String(currentUser.role || '').toLowerCase();
    if (role === 'piket_kelas' || role === 'piketkelas') return true;
    if (Array.isArray(currentUser.roles) && currentUser.roles.some((r) => {
      const lr = String(r).toLowerCase();
      return lr === 'piket_kelas' || lr === 'piketkelas';
    })) return true;

    const userData = currentUser.data as any;
    if (userData) {
      const uRole = String(userData.role || '').toLowerCase();
      if (uRole === 'piket_kelas' || uRole === 'piketkelas') return true;
      if (Array.isArray(userData.roles) && userData.roles.some((r: string) => {
        const lr = String(r).toLowerCase();
        return lr === 'piket_kelas' || lr === 'piketkelas';
      })) return true;
      if (Array.isArray(userData.additionalRoles) && userData.additionalRoles.some((r: string) => {
        const lr = String(r).toLowerCase();
        return lr === 'piket_kelas' || lr === 'piketkelas';
      })) return true;

      const uId = String(userData.id || '').toLowerCase();
      if (uId.startsWith('piket-')) return true;

      const uNama = String(userData.nama || '').toLowerCase();
      if (uNama.startsWith('piket kelas') || uNama.includes('piket kelas') || uNama.startsWith('piket - kelas')) return true;

      const uTugas = String(userData.tugasTambahan || '').toLowerCase();
      if (uTugas.includes('piket kelas') || uTugas.includes('piket presensi kelas')) return true;

      const uJabatan = String(userData.jabatan || '').toLowerCase();
      if (uJabatan.includes('piket kelas')) return true;

      const uUsername = String(userData.username || '').toLowerCase().replace(/[\s\-_]+/g, '');
      const uNip = String(userData.nip || '').toLowerCase().replace(/[\s\-_]+/g, '');
      const matchesClassName = sortedKelas.some((k) => {
        const cName = String(k.nama || '').toLowerCase().replace(/[\s\-_]+/g, '');
        return cName && (uUsername === cName || uUsername === `piket${cName}` || uNip === cName);
      });
      if (matchesClassName && !['admin', 'superadmin', 'kesiswaan', 'kurikulum', 'hubin', 'staf_jadwal'].includes(role)) {
        return true;
      }
    }
    return false;
  }, [currentUser, sortedKelas]);

  const assignedPiketClass = useMemo(() => {
    if (!isPiketKelas) return null;
    const userData = currentUser.data as any;
    const uId = String(userData?.id || '');
    const uKelasId = String(userData?.kelasId || '');
    const uKelasNama = String(userData?.kelasNama || '').toLowerCase().replace(/[\s\-_]+/g, '');
    const uUsername = String(userData?.username || '').toLowerCase().replace(/[\s\-_]+/g, '');
    const uNama = String(userData?.nama || '').toLowerCase().replace(/[\s\-_]+/g, '');
    const uNip = String(userData?.nip || '').toLowerCase().replace(/[\s\-_]+/g, '');

    // 1. Direct ID match
    if (uKelasId) {
      const found = sortedKelas.find((k) => String(k.id) === uKelasId);
      if (found) return found;
    }
    // 2. piket-<id> or piket-<cleanName>
    if (uId.startsWith('piket-')) {
      const cleanId = uId.replace('piket-', '');
      const found = sortedKelas.find(
        (k) => String(k.id) === cleanId || String(k.nama).toLowerCase().replace(/[\s\-_]+/g, '') === cleanId
      );
      if (found) return found;
    }
    // 3. Match by kelasNama or nip
    if (uKelasNama) {
      const found = sortedKelas.find((k) => String(k.nama).toLowerCase().replace(/[\s\-_]+/g, '') === uKelasNama);
      if (found) return found;
    }
    if (uNip) {
      const found = sortedKelas.find((k) => String(k.nama).toLowerCase().replace(/[\s\-_]+/g, '') === uNip);
      if (found) return found;
    }
    // 4. Strip "piket" prefix from username (e.g. xakl1)
    const strippedUsername = uUsername.replace(/^piket(kelas)?/, '');
    if (strippedUsername) {
      const found = sortedKelas.find((k) => String(k.nama).toLowerCase().replace(/[\s\-_]+/g, '') === strippedUsername);
      if (found) return found;
    }
    // 5. Look for any class name substring in uNama or uUsername
    for (const k of sortedKelas) {
      const cleanK = String(k.nama || '').toLowerCase().replace(/[\s\-_]+/g, '');
      if (cleanK && (uNama.includes(cleanK) || uUsername.includes(cleanK))) {
        return k;
      }
    }
    return sortedKelas[0] || null;
  }, [isPiketKelas, currentUser, sortedKelas]);

  const isPiketOrKesiswaanOrAdmin = useMemo(() => {
    // Piket Kelas is strictly locked to their single class, NOT global piket!
    if (isPiketKelas) {
      return false;
    }
    const role = String(currentUser.role || '').toLowerCase();
    if (['admin', 'superadmin', 'administrator', 'kesiswaan', 'wks_kesiswaan', 'piket', 'guru_piket', 'piket_guru', 'piket_kesiswaan'].includes(role)) {
      return true;
    }
    const userData = currentUser.data as any;
    if (userData) {
      const tugas = String(userData.tugasTambahan || '').toLowerCase();
      const jabatan = String(userData.jabatan || '').toLowerCase();
      const userUsername = String(userData.username || '').toLowerCase();
      if (
        tugas.includes('piket_guru') ||
        tugas.includes('piket_kesiswaan') ||
        (tugas.includes('piket') && !tugas.includes('piket kelas') && !tugas.includes('piket_kelas')) ||
        tugas.includes('kesiswaan') ||
        jabatan.includes('piket_guru') ||
        jabatan.includes('piket_kesiswaan') ||
        jabatan.includes('kesiswaan') ||
        (userUsername.includes('piket') && !userUsername.includes('piket_kelas') && !userUsername.includes('piket-')) ||
        userUsername.includes('kesiswaan')
      ) {
        return true;
      }
      if (Array.isArray(userData.tugasTambahanList) && userData.tugasTambahanList.some((t: string) => {
        const l = String(t).toLowerCase();
        return (l.includes('piket') && !l.includes('piket_kelas') && !l.includes('piket kelas')) || l.includes('kesiswaan');
      })) return true;
      if (Array.isArray(userData.additionalRoles) && userData.additionalRoles.some((r: string) => {
        const l = String(r).toLowerCase();
        return l === 'kesiswaan' || (l.includes('piket') && l !== 'piket_kelas');
      })) return true;
    }
    return false;
  }, [currentUser, isPiketKelas]);

  const availableClasses = useMemo(() => {
    if (isPiketKelas) {
      return assignedPiketClass ? [assignedPiketClass] : (sortedKelas.length > 0 ? [sortedKelas[0]] : []);
    }

    if (isPiketOrKesiswaanOrAdmin) {
      return sortedKelas;
    }

    const role = String(currentUser.role || '').toLowerCase();
    const userData = currentUser.data as any;

    if (role === 'wali' || role === 'walikelas') {
      const myClasses = sortedKelas.filter((k) => {
        const waliObj = appData.waliKelas?.find((w) => w.id === k.waliKelasId);
        return (
          k.waliKelasId === userData?.id ||
          (userData?.nama && waliObj?.nama?.toLowerCase() === String(userData.nama).toLowerCase())
        );
      });
      return myClasses.length > 0 ? myClasses : sortedKelas;
    }
    return sortedKelas;
  }, [isPiketKelas, assignedPiketClass, isPiketOrKesiswaanOrAdmin, currentUser, appData.waliKelas, sortedKelas]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    if (isPiketKelas && assignedPiketClass) {
      return assignedPiketClass.id;
    }
    if (initialKelasId && availableClasses.some((k) => k.id === initialKelasId)) {
      return initialKelasId;
    }
    return availableClasses.length > 0 ? availableClasses[0].id : '';
  });

  // Ensure selectedKelasId stays locked to piket_kelas's class
  useEffect(() => {
    if (isPiketKelas && assignedPiketClass) {
      if (selectedKelasId !== assignedPiketClass.id) {
        setSelectedKelasId(assignedPiketClass.id);
      }
    }
  }, [isPiketKelas, assignedPiketClass, selectedKelasId]);

  const [selectedTanggal, setSelectedTanggal] = useState<string>(getTodayString());
  const [activeTab, setActiveTab] = useState<'presensi' | 'siswa' | 'guru'>('presensi');

  // Access control for Absensi Manual Guru: Admin, Kurikulum, and Guru Piket
  const canAccessTeacherAttendance = useMemo(() => {
    const role = String(currentUser.role || '').toLowerCase();
    if (['admin', 'superadmin', 'administrator', 'kurikulum', 'piket', 'guru_piket', 'piket_guru'].includes(role)) {
      return true;
    }

    const userData = currentUser.data as any;
    if (userData) {
      const tugas = String(userData.tugasTambahan || '').toLowerCase();
      const jabatan = String(userData.jabatan || '').toLowerCase();
      if (tugas.includes('piket') || tugas.includes('kurikulum') || jabatan.includes('piket') || jabatan.includes('kurikulum')) {
        return true;
      }

      if (Array.isArray(userData.tugasTambahanList)) {
        const hasMatch = userData.tugasTambahanList.some((t: string) => {
          const l = String(t).toLowerCase();
          return l.includes('piket') || l.includes('kurikulum');
        });
        if (hasMatch) return true;
      }

      if (Array.isArray(userData.additionalRoles)) {
        const hasMatch = userData.additionalRoles.some((r: string) => {
          const l = String(r).toLowerCase();
          return l === 'kurikulum' || l.includes('piket');
        });
        if (hasMatch) return true;
      }
    }

    return false;
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'guru' && !canAccessTeacherAttendance) {
      setActiveTab('presensi');
    }
  }, [activeTab, canAccessTeacherAttendance]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showDemoTools, setShowDemoTools] = useState(false);
  const [isClassQrScannerOpen, setIsClassQrScannerOpen] = useState(false);

  // Confirmed Server Baseline state (persisted baseline for 3-way diffing)
  const [confirmedBaseline, setConfirmedBaseline] = useState<Record<string, SiswaPresensiItem>>({});

  // Conflict Information state (Prompt 6A.6.2)
  interface ConflictStudentItem {
    siswaId: string;
    siswaNama: string;
    localStatus: PresensiStatus;
    localPulangStatus: string;
    serverStatus: PresensiStatus;
    serverPulangStatus: string;
    baselineStatus: PresensiStatus;
  }

  interface DetectedConflict {
    count: number;
    conflictingStudents: ConflictStudentItem[];
    serverSnapshotRecords: SiswaPresensiItem[];
    detectedAt: string;
  }

  const [detectedConflict, setDetectedConflict] = useState<DetectedConflict | null>(null);
  const saveRequestIdRef = useRef<number>(0);

  // Draft state and recovery management
  interface AttendanceDraft {
    schemaVersion: number;
    userId: string;
    kelasId: string;
    tanggal: string;
    updatedAt: string;
    updatedAtFormatted: string;
    studentStatus: Record<string, PresensiStatus>;
    studentTime: Record<string, string>;
    studentPulangStatus: Record<string, 'H' | 'TAP' | ''>;
    studentPulangTime: Record<string, string>;
    studentCatatan: Record<string, string>;
    studentSuratBukti: Record<string, string>;
    dirtyCount: number;
  }
  const [detectedDraft, setDetectedDraft] = useState<AttendanceDraft | null>(null);
  const [lastDraftSavedTime, setLastDraftSavedTime] = useState<string | null>(null);

  // Student editing modal state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [formNisn, setFormNisn] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formGender, setFormGender] = useState<'L' | 'P'>('L');
  const [formNoWa, setFormNoWa] = useState('');
  const [formStatus, setFormStatus] = useState<'aktif' | 'tidak_aktif'>('aktif');

  // Form local status state: Map of student ID to 'H' | 'I' | 'S' | 'A' | 'K' | 'D'
  const [studentStatus, setStudentStatus] = useState<Record<string, PresensiStatus>>({});
  const [studentTime, setStudentTime] = useState<Record<string, string>>({});
  const [studentPulangStatus, setStudentPulangStatus] = useState<Record<string, 'H' | 'TAP' | ''>>({});
  const [studentPulangTime, setStudentPulangTime] = useState<Record<string, string>>({});
  const [studentSuratBukti, setStudentSuratBukti] = useState<Record<string, string>>({});
  const [studentCatatan, setStudentCatatan] = useState<Record<string, string>>({});
  const [previewSuratModal, setPreviewSuratModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    studentName: string;
    status: string;
  } | null>(null);

  const currentKelas = availableClasses.find((k) => k.id === selectedKelasId);
  const siswaList = useMemo(() => {
    return currentKelas
      ? appData.siswa
          .filter((s) => s.kelasId === currentKelas.id && s.status !== 'tidak_aktif' && (s as any).status !== 'nonaktif')
          .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
      : [];
  }, [currentKelas, appData.siswa]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    setSearchQuery('');
    setStatusFilter('ALL');
  }, [selectedKelasId]);

  const filteredSiswaList = useMemo(() => {
    let list = siswaList;
    if (statusFilter === 'UNSET') {
      list = list.filter((s) => !studentStatus[s.id]);
    } else if (statusFilter === 'TAP') {
      list = list.filter((s) => ['H', 'K'].includes(studentStatus[s.id] || '') && studentPulangStatus[s.id] === 'TAP');
    } else if (statusFilter !== 'ALL') {
      list = list.filter((s) => {
        const st = studentStatus[s.id] || '';
        return st === statusFilter;
      });
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.nama.toLowerCase().includes(q) ||
        (s.nisn && s.nisn.toLowerCase().includes(q)) ||
        (s.noWa && s.noWa.toLowerCase().includes(q))
    );
  }, [siswaList, searchQuery, statusFilter, studentStatus, studentPulangStatus]);

  const attendanceStats = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alfa = 0;
    let kesiangan = 0;
    let dispensasi = 0;
    let belumAbsen = 0;
    let tapCount = 0;

    siswaList.forEach((s) => {
      const st = studentStatus[s.id] || '';
      if (st === 'H') hadir++;
      else if (st === 'I') izin++;
      else if (st === 'S') sakit++;
      else if (st === 'A') alfa++;
      else if (st === 'K') kesiangan++;
      else if (st === 'D') dispensasi++;
      else belumAbsen++;

      if (['H', 'K'].includes(st) && studentPulangStatus[s.id] === 'TAP') {
        tapCount++;
      }
    });

    const percentHadir = siswaList.length > 0
      ? Math.round(((hadir + kesiangan) / siswaList.length) * 100)
      : 0;

    return {
      total: siswaList.length,
      hadir,
      izin,
      sakit,
      alfa,
      kesiangan,
      dispensasi,
      belumAbsen,
      tapCount,
      percentHadir,
    };
  }, [siswaList, studentStatus, studentPulangStatus]);

  const isWeekendSelected = isWeekend(selectedTanggal);
  const isFutureSelected = isFutureDate(selectedTanggal);
  const isBeforeStartDate =
    appData.sekolah.tanggalMulai && selectedTanggal < appData.sekolah.tanggalMulai;

  const presensiKey = `${selectedTanggal}_${selectedKelasId}`;
  const isAlreadySaved = useMemo(() => {
    const records = (appData.presensi || {})[presensiKey];
    return Array.isArray(records) && records.length > 0;
  }, [appData.presensi, presensiKey]);

  // Draft storage key generator (scoped per user, class, and date)
  const currentUserId = (currentUser.data as any)?.username || (currentUser.data as any)?.id || currentUser.role || 'user';
  const draftStorageKey = useMemo(() => {
    if (!selectedKelasId || !selectedTanggal) return '';
    return `attendance-draft:${currentUserId}:${selectedKelasId}:${selectedTanggal}`;
  }, [currentUserId, selectedKelasId, selectedTanggal]);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Helper for fast field-level comparison (status, pulangStatus, catatan, suratBukti)
  const areAttendanceFieldsEqual = (
    f1: { status?: string; pulangStatus?: string; catatan?: string; suratBukti?: string },
    f2: { status?: string; pulangStatus?: string; catatan?: string; suratBukti?: string }
  ): boolean => {
    const s1 = normalizePresensiStatus(f1?.status || '') || '';
    const s2 = normalizePresensiStatus(f2?.status || '') || '';
    const p1 = f1?.pulangStatus || '';
    const p2 = f2?.pulangStatus || '';
    const c1 = (f1?.catatan || '').trim();
    const c2 = (f2?.catatan || '').trim();
    const b1 = (f1?.suratBukti || '').trim();
    const b2 = (f2?.suratBukti || '').trim();
    return s1 === s2 && p1 === p2 && c1 === c2 && b1 === b2;
  };

  // Compute dirty/unsaved changes count against confirmed server baseline
  const dirtyChangesCount = useMemo(() => {
    let changes = 0;
    siswaList.forEach((s) => {
      const baseRec = confirmedBaseline[s.id] || confirmedBaseline[s.nisn];
      const initialStatus = baseRec ? (normalizePresensiStatus(baseRec.status) || '') : '';
      const currentSt = studentStatus[s.id] || '';
      const initialPulang = ['H', 'K'].includes(initialStatus)
        ? (baseRec?.pulangStatus || 'TAP')
        : (baseRec?.pulangStatus || '');
      const currentPulang = studentPulangStatus[s.id] || '';
      const initialCatatan = (baseRec?.catatan || '').trim();
      const currentCat = (studentCatatan[s.id] || '').trim();
      const initialSurat = (baseRec?.suratBukti || '').trim();
      const currentSurat = (studentSuratBukti[s.id] || '').trim();

      if (
        initialStatus !== currentSt ||
        initialPulang !== currentPulang ||
        initialCatatan !== currentCat ||
        initialSurat !== currentSurat
      ) {
        changes++;
      }
    });
    return changes;
  }, [confirmedBaseline, siswaList, studentStatus, studentPulangStatus, studentCatatan, studentSuratBukti]);

  const isDirty = dirtyChangesCount > 0;

  // Navigation Guard / beforeunload listener when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'Terdapat perubahan presensi yang belum disimpan ke server.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Context tracking to distinguish user navigation vs background polling sync
  const prevContextRef = useRef<{ kelasId: string; tanggal: string }>({
    kelasId: selectedKelasId,
    tanggal: selectedTanggal,
  });

  // Load existing records, sync baseline, detect conflicts & drafts
  useEffect(() => {
    if (!selectedKelasId) return;

    const isContextChanged =
      prevContextRef.current.kelasId !== selectedKelasId ||
      prevContextRef.current.tanggal !== selectedTanggal;

    const incomingRecords = (appData.presensi || {})[presensiKey] || [];
    const serverMap: Record<string, SiswaPresensiItem> = {};
    incomingRecords.forEach((r) => {
      if (r.siswaId) serverMap[r.siswaId] = r;
    });

    if (isContextChanged) {
      // User switched class or date: full reset to new context
      prevContextRef.current = {
        kelasId: selectedKelasId,
        tanggal: selectedTanggal,
      };

      const baselineMap: Record<string, SiswaPresensiItem> = {};
      const statusMap: Record<string, PresensiStatus> = {};
      const timeMap: Record<string, string> = {};
      const pulangStatusMap: Record<string, 'H' | 'TAP' | ''> = {};
      const pulangTimeMap: Record<string, string> = {};
      const suratMap: Record<string, string> = {};
      const catatanMap: Record<string, string> = {};

      siswaList.forEach((s) => {
        const rec = serverMap[s.id] || serverMap[s.nisn];
        if (rec) baselineMap[s.id] = rec;
        const entryStatus = rec ? (normalizePresensiStatus(rec.status) || '') : '';
        statusMap[s.id] = entryStatus;
        timeMap[s.id] = rec?.time || '';
        
        if (['H', 'K'].includes(entryStatus)) {
          pulangStatusMap[s.id] = (rec?.pulangStatus || 'TAP') as 'H' | 'TAP';
        } else {
          pulangStatusMap[s.id] = (rec?.pulangStatus || '') as 'H' | 'TAP' | '';
        }
        pulangTimeMap[s.id] = rec?.pulangTime || '';

        if (rec?.suratBukti) suratMap[s.id] = rec.suratBukti;
        if (rec?.catatan) catatanMap[s.id] = rec.catatan;
      });

      setConfirmedBaseline(baselineMap);
      setStudentStatus(statusMap);
      setStudentTime(timeMap);
      setStudentPulangStatus(pulangStatusMap);
      setStudentPulangTime(pulangTimeMap);
      setStudentSuratBukti(suratMap);
      setStudentCatatan(catatanMap);
      setSaveError(null);
      setDetectedConflict(null);

      // Check if a valid local draft exists for this new context
      if (draftStorageKey) {
        try {
          const raw = localStorage.getItem(draftStorageKey);
          if (raw) {
            const draft: AttendanceDraft = JSON.parse(raw);
            const nowMs = Date.now();
            const draftTime = draft.updatedAt ? new Date(draft.updatedAt).getTime() : 0;
            const isExpired = !draftTime || (nowMs - draftTime > 7 * 24 * 60 * 60 * 1000);

            if (isExpired) {
              localStorage.removeItem(draftStorageKey);
              setDetectedDraft(null);
            } else if (draft.schemaVersion === 1 && draft.studentStatus) {
              let diffCount = 0;
              siswaList.forEach((s) => {
                const baseSt = statusMap[s.id] || '';
                const draftSt = draft.studentStatus[s.id] || '';
                const basePulang = pulangStatusMap[s.id] || '';
                const draftPulang = draft.studentPulangStatus?.[s.id] || '';
                const baseCatatan = catatanMap[s.id] || '';
                const draftCatatan = draft.studentCatatan?.[s.id] || '';
                const baseSurat = suratMap[s.id] || '';
                const draftSurat = draft.studentSuratBukti?.[s.id] || '';

                if (
                  baseSt !== draftSt ||
                  basePulang !== draftPulang ||
                  baseCatatan !== draftCatatan ||
                  baseSurat !== draftSurat
                ) {
                  diffCount++;
                }
              });

              if (diffCount > 0) {
                setDetectedDraft({ ...draft, dirtyCount: diffCount });
              } else {
                localStorage.removeItem(draftStorageKey);
                setDetectedDraft(null);
              }
            }
          } else {
            setDetectedDraft(null);
          }
        } catch (err) {
          setDetectedDraft(null);
        }
      }
      return;
    }

    // Context is SAME: Polling / BroadcastChannel server snapshot update arrived!
    // Execute 3-Way matrix comparison (Baseline B vs Local L vs Server S)
    const conflicts: ConflictStudentItem[] = [];
    const updatedStatusMap = { ...studentStatus };
    const updatedPulangMap = { ...studentPulangStatus };
    const updatedCatatanMap = { ...studentCatatan };
    const updatedSuratMap = { ...studentSuratBukti };
    const updatedTimeMap = { ...studentTime };
    const updatedPulangTimeMap = { ...studentPulangTime };
    const updatedBaselineMap = { ...confirmedBaseline };
    let hasCleanServerUpdates = false;

    siswaList.forEach((s) => {
      const baseRec = confirmedBaseline[s.id] || confirmedBaseline[s.nisn];
      const serverRec = serverMap[s.id] || serverMap[s.nisn];

      const baseFields = {
        status: baseRec ? (normalizePresensiStatus(baseRec.status) || '') : '',
        pulangStatus: baseRec?.pulangStatus || (['H', 'K'].includes(baseRec?.status || '') ? 'TAP' : ''),
        catatan: (baseRec?.catatan || '').trim(),
        suratBukti: (baseRec?.suratBukti || '').trim(),
      };

      const localFields = {
        status: studentStatus[s.id] || '',
        pulangStatus: studentPulangStatus[s.id] || '',
        catatan: (studentCatatan[s.id] || '').trim(),
        suratBukti: (studentSuratBukti[s.id] || '').trim(),
      };

      const serverFields = {
        status: serverRec ? (normalizePresensiStatus(serverRec.status) || '') : '',
        pulangStatus: serverRec?.pulangStatus || (['H', 'K'].includes(serverRec?.status || '') ? 'TAP' : ''),
        catatan: (serverRec?.catatan || '').trim(),
        suratBukti: (serverRec?.suratBukti || '').trim(),
      };

      const isLocalModified = !areAttendanceFieldsEqual(localFields, baseFields);
      const isServerModified = !areAttendanceFieldsEqual(serverFields, baseFields);

      if (!isLocalModified && isServerModified) {
        // Safe Server Update: User has not touched this student, server changed -> apply smoothly!
        updatedStatusMap[s.id] = serverFields.status as PresensiStatus;
        updatedPulangMap[s.id] = serverFields.pulangStatus as any;
        updatedCatatanMap[s.id] = serverRec?.catatan || '';
        updatedSuratMap[s.id] = serverRec?.suratBukti || '';
        updatedTimeMap[s.id] = serverRec?.time || '';
        updatedPulangTimeMap[s.id] = serverRec?.pulangTime || '';
        if (serverRec) updatedBaselineMap[s.id] = serverRec;
        else delete updatedBaselineMap[s.id];
        hasCleanServerUpdates = true;
      } else if (isLocalModified && isServerModified) {
        if (areAttendanceFieldsEqual(localFields, serverFields)) {
          // Local change matches incoming server change (safe/synced!)
          if (serverRec) updatedBaselineMap[s.id] = serverRec;
          else delete updatedBaselineMap[s.id];
          hasCleanServerUpdates = true;
        } else {
          // CONFLICT: Both changed to different values!
          conflicts.push({
            siswaId: s.id,
            siswaNama: s.nama,
            localStatus: localFields.status as PresensiStatus,
            localPulangStatus: localFields.pulangStatus,
            serverStatus: serverFields.status as PresensiStatus,
            serverPulangStatus: serverFields.pulangStatus,
            baselineStatus: baseFields.status as PresensiStatus,
          });
        }
      }
    });

    if (conflicts.length > 0) {
      setDetectedConflict({
        count: conflicts.length,
        conflictingStudents: conflicts,
        serverSnapshotRecords: incomingRecords,
        detectedAt: getIndonesianTimeString(new Date(), false),
      });
    } else if (detectedConflict && conflicts.length === 0) {
      setDetectedConflict(null);
    }

    if (hasCleanServerUpdates) {
      setStudentStatus(updatedStatusMap);
      setStudentPulangStatus(updatedPulangMap);
      setStudentCatatan(updatedCatatanMap);
      setStudentSuratBukti(updatedSuratMap);
      setStudentTime(updatedTimeMap);
      setStudentPulangTime(updatedPulangTimeMap);
      setConfirmedBaseline(updatedBaselineMap);
    }
  }, [selectedKelasId, selectedTanggal, presensiKey, appData.presensi, siswaList, draftStorageKey]);

  // Debounced Autosave Local Draft when user is editing
  useEffect(() => {
    if (!draftStorageKey || !selectedKelasId || !selectedTanggal || isSaving) return;

    if (dirtyChangesCount === 0) {
      try {
        if (localStorage.getItem(draftStorageKey)) {
          localStorage.removeItem(draftStorageKey);
        }
      } catch (e) {}
      return;
    }

    const timer = setTimeout(() => {
      try {
        const now = new Date();
        const timeStr = getIndonesianTimeString(now, false);
        const draftPayload: AttendanceDraft = {
          schemaVersion: 1,
          userId: currentUserId,
          kelasId: selectedKelasId,
          tanggal: selectedTanggal,
          updatedAt: now.toISOString(),
          updatedAtFormatted: `${timeStr} WIB`,
          studentStatus,
          studentTime,
          studentPulangStatus,
          studentPulangTime,
          studentCatatan,
          studentSuratBukti,
          dirtyCount: dirtyChangesCount,
        };
        localStorage.setItem(draftStorageKey, JSON.stringify(draftPayload));
        setLastDraftSavedTime(timeStr);
      } catch (err) {
        console.warn('Gagal menyimpan draf lokal:', err);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [
    dirtyChangesCount,
    studentStatus,
    studentPulangStatus,
    studentTime,
    studentPulangTime,
    studentCatatan,
    studentSuratBukti,
    draftStorageKey,
    selectedKelasId,
    selectedTanggal,
    currentUserId,
    isSaving,
  ]);

  // Restore Draft Action
  const handleRestoreDraft = () => {
    if (!detectedDraft) return;
    setStudentStatus(detectedDraft.studentStatus || {});
    setStudentTime(detectedDraft.studentTime || {});
    setStudentPulangStatus(detectedDraft.studentPulangStatus || {});
    setStudentPulangTime(detectedDraft.studentPulangTime || {});
    setStudentCatatan(detectedDraft.studentCatatan || {});
    setStudentSuratBukti(detectedDraft.studentSuratBukti || {});
    setDetectedDraft(null);
    onShowToast(`✓ Draf presensi berhasil dipulihkan (${detectedDraft.dirtyCount} perubahan lokal dimuat).`, 'success');
  };

  // Discard Draft Action
  const handleDiscardDraft = () => {
    if (!detectedDraft) return;
    const executeDiscard = () => {
      try {
        if (draftStorageKey) {
          localStorage.removeItem(draftStorageKey);
        }
      } catch (e) {}
      setDetectedDraft(null);
      onShowToast('Draf lokal telah dibuang.', 'info');
    };

    const confirmMsg = `Apakah Anda yakin ingin membuang draf perubahan lokal ini? Sebanyak ${detectedDraft.dirtyCount} perubahan yang belum tersimpan ke server akan dihapus.`;
    if (onConfirmModal) {
      onConfirmModal('Buang Draf Presensi', confirmMsg, 'danger', executeDiscard);
    } else if (window.confirm(confirmMsg)) {
      executeDiscard();
    }
  };

  // Conflict Resolution Action 1: Use Server Data (Prompt 6A.6.2)
  const handleResolveUseServer = () => {
    if (!detectedConflict) return;
    const serverRecords = detectedConflict.serverSnapshotRecords;
    const serverMap: Record<string, SiswaPresensiItem> = {};
    serverRecords.forEach((r) => {
      if (r.siswaId) serverMap[r.siswaId] = r;
    });

    const nextStatus = { ...studentStatus };
    const nextPulang = { ...studentPulangStatus };
    const nextCatatan = { ...studentCatatan };
    const nextSurat = { ...studentSuratBukti };
    const nextTime = { ...studentTime };
    const nextPulangTime = { ...studentPulangTime };
    const nextBaseline = { ...confirmedBaseline };

    detectedConflict.conflictingStudents.forEach((c) => {
      const sRec = serverMap[c.siswaId];
      const sStatus = sRec ? (normalizePresensiStatus(sRec.status) || '') : '';
      nextStatus[c.siswaId] = sStatus;
      nextPulang[c.siswaId] = (sRec?.pulangStatus || (['H', 'K'].includes(sStatus) ? 'TAP' : '')) as any;
      nextCatatan[c.siswaId] = sRec?.catatan || '';
      nextSurat[c.siswaId] = sRec?.suratBukti || '';
      nextTime[c.siswaId] = sRec?.time || '';
      nextPulangTime[c.siswaId] = sRec?.pulangTime || '';
      if (sRec) nextBaseline[c.siswaId] = sRec;
      else delete nextBaseline[c.siswaId];
    });

    setStudentStatus(nextStatus);
    setStudentPulangStatus(nextPulang);
    setStudentCatatan(nextCatatan);
    setStudentSuratBukti(nextSurat);
    setStudentTime(nextTime);
    setStudentPulangTime(nextPulangTime);
    setConfirmedBaseline(nextBaseline);
    setDetectedConflict(null);

    onShowToast(`✓ Data dari server diterapkan untuk ${detectedConflict.count} siswa yang berkonflik.`, 'info');
  };

  // Conflict Resolution Action 2: Use Local Changes (Prompt 6A.6.2)
  const handleResolveUseLocal = () => {
    if (!detectedConflict) return;
    const serverRecords = detectedConflict.serverSnapshotRecords;
    const serverMap: Record<string, SiswaPresensiItem> = {};
    serverRecords.forEach((r) => {
      if (r.siswaId) serverMap[r.siswaId] = r;
    });

    // Retain local modifications, but sync baseline with incoming server snapshot
    const nextBaseline = { ...confirmedBaseline };
    detectedConflict.conflictingStudents.forEach((c) => {
      const sRec = serverMap[c.siswaId];
      if (sRec) nextBaseline[c.siswaId] = sRec;
      else delete nextBaseline[c.siswaId];
    });

    setConfirmedBaseline(nextBaseline);
    const count = detectedConflict.count;
    setDetectedConflict(null);

    onShowToast(`Perubahan lokal (${count} siswa) dipertahankan. Klik 'Simpan' untuk mengirim ke server.`, 'success');
  };

  const handleUploadSurat = async (siswaId: string, file: File) => {
    try {
      if (!file.type.startsWith('image/')) {
        onShowToast('Mohon unggah file surat berupa gambar (JPG, PNG, JPEG)', 'warning');
        return;
      }
      const compressed = await compressBase64Image(file, 900, 0.75);
      setStudentSuratBukti((prev) => ({ ...prev, [siswaId]: compressed }));
      onShowToast('Surat keterangan berhasil diunggah!', 'success');
    } catch (err) {
      onShowToast('Gagal memproses file surat', 'error');
    }
  };

  const handleRemoveSurat = (siswaId: string) => {
    setStudentSuratBukti((prev) => {
      const next = { ...prev };
      delete next[siswaId];
      return next;
    });
    onShowToast('Surat berhasil dihapus', 'info');
  };

  const handleCatatanChange = (siswaId: string, text: string) => {
    setStudentCatatan((prev) => ({ ...prev, [siswaId]: text }));
  };

  const handleQrScanSuccess = (siswaId: string, status: PresensiStatus, time: string, isPulang?: boolean) => {
    const targetSiswa = appData.siswa.find((s) => s.id === siswaId);
    const targetNama = targetSiswa?.nama || 'Siswa';

    if (isPulang) {
      setStudentPulangStatus((prev) => ({ ...prev, [siswaId]: 'H' }));
      setStudentPulangTime((prev) => ({ ...prev, [siswaId]: time }));
      onShowToast(`Absen Pulang ${targetNama} tercatat (${time} WIB)`, 'success');
    } else {
      setStudentStatus((prev) => ({ ...prev, [siswaId]: status }));
      setStudentTime((prev) => ({ ...prev, [siswaId]: time }));
      if (['H', 'K'].includes(status)) {
        setStudentPulangStatus((prev) => {
          if (!prev[siswaId]) return { ...prev, [siswaId]: 'TAP' };
          return prev;
        });
      }
      onShowToast(
        `Presensi ${targetNama} tercatat: ${status === 'K' ? 'Kesiangan' : 'Hadir'} (${time} WIB)`,
        'success'
      );
    }
  };

  // Safe Context Switchers (Class, Date, Tab)
  const handleChangeKelas = (newKelasId: string) => {
    if (newKelasId === selectedKelasId) return;
    if (isDirty) {
      const confirmMsg = `Terdapat ${dirtyChangesCount} perubahan presensi di kelas ${currentKelas?.nama || ""} yang belum disimpan. Lanjutkan beralih kelas dan membuang perubahan?`;
      if (onConfirmModal) {
        onConfirmModal("Perubahan Belum Disimpan", confirmMsg, "warning", () => {
          setSelectedKelasId(newKelasId);
        });
        return;
      } else if (!window.confirm(confirmMsg)) {
        return;
      }
    }
    setSelectedKelasId(newKelasId);
  };

  const handleChangeTanggal = (newDate: string) => {
    if (newDate === selectedTanggal) return;
    if (isDirty) {
      const confirmMsg = `Terdapat ${dirtyChangesCount} perubahan presensi tanggal ${formatDateIndo(selectedTanggal)} yang belum disimpan. Lanjutkan beralih tanggal dan membuang perubahan?`;
      if (onConfirmModal) {
        onConfirmModal("Perubahan Belum Disimpan", confirmMsg, "warning", () => {
          setSelectedTanggal(newDate);
        });
        return;
      } else if (!window.confirm(confirmMsg)) {
        return;
      }
    }
    setSelectedTanggal(newDate);
  };

  const handleTabChange = (newTab: 'presensi' | 'siswa' | 'guru') => {
    if (newTab === activeTab) return;
    if (activeTab === "presensi" && isDirty) {
      const confirmMsg = `Terdapat ${dirtyChangesCount} perubahan presensi yang belum disimpan. Lanjutkan berpindah tab?`;
      if (onConfirmModal) {
        onConfirmModal("Perubahan Belum Disimpan", confirmMsg, "warning", () => {
          setActiveTab(newTab);
        });
        return;
      } else if (!window.confirm(confirmMsg)) {
        return;
      }
    }
    setActiveTab(newTab);
  };

  const handleSetAllHadir = () => {
    const nextMap: Record<string, PresensiStatus> = {};
    const nextPulangMap: Record<string, 'H' | 'TAP' | ''> = {};
    siswaList.forEach((s) => {
      nextMap[s.id] = 'H';
      nextPulangMap[s.id] = 'TAP';
    });
    setStudentStatus(nextMap);
    setStudentPulangStatus(nextPulangMap);
    onShowToast('Seluruh siswa diset Hadir (Pulang: TAP)', 'info');
  };

  const handleSetRandomStatus = () => {
    const nextMap: Record<string, PresensiStatus> = {};
    const nextPulangMap: Record<string, 'H' | 'TAP' | ''> = {};
    const nextPulangTimeMap: Record<string, string> = {};
    siswaList.forEach((s) => {
      const rand = Math.random();
      let status: PresensiStatus = 'H';
      if (rand > 0.95) status = 'A';      // 5% Alpa
      else if (rand > 0.90) status = 'S'; // 5% Sakit
      else if (rand > 0.84) status = 'I'; // 6% Izin
      else if (rand > 0.78) status = 'K'; // 6% Kesiangan
      else if (rand > 0.74) status = 'D'; // 4% Dispensasi
      nextMap[s.id] = status;

      if (['H', 'K'].includes(status)) {
        const randPulang = Math.random();
        if (randPulang > 0.4) {
          nextPulangMap[s.id] = 'H';
          nextPulangTimeMap[s.id] = '12:' + Math.floor(10 + Math.random() * 40);
        } else {
          nextPulangMap[s.id] = 'TAP';
        }
      } else {
        nextPulangMap[s.id] = '';
      }
    });
    setStudentStatus(nextMap);
    setStudentPulangStatus(nextPulangMap);
    setStudentPulangTime(nextPulangTimeMap);
    onShowToast('Status presensi kelas ini telah disimulasikan secara acak', 'info');
  };

  const handleResetKehadiran = () => {
    if (!currentKelas) return;

    const executeReset = async () => {
      const presensiKey = `${selectedTanggal}_${selectedKelasId}`;
      
      // Set explicit empty array [] for key so merge logic treats it as an intentional reset
      const updatedPresensi = { ...(appData.presensi || {}) };
      updatedPresensi[presensiKey] = [];

      const nextAppData: AppData = {
        ...appData,
        presensi: updatedPresensi,
      };

      setIsSaving(true);
      try {
        const res = await onSavePresensi(nextAppData);
        if (res && typeof res === 'object' && res.success === false) {
          onShowToast(`Gagal mereset presensi di server: ${res.message || 'Periksa koneksi'}`, 'error');
          return;
        }

        // Complete local state reset for all students
        setStudentStatus({});
        setStudentPulangStatus({});
        setStudentTime({});
        setStudentPulangTime({});
        setStudentSuratBukti({});
        setStudentCatatan({});
        setConfirmedBaseline({});
        setDetectedConflict(null);

        // Reset context tracking so next render re-syncs cleanly
        prevContextRef.current = { kelasId: '', tanggal: '' };

        if (draftStorageKey) {
          try {
            localStorage.removeItem(draftStorageKey);
          } catch (e) {}
        }
        setDetectedDraft(null);
        setLastSavedTimestamp(null);
        setSaveError(null);

        onShowToast(`Data presensi ${currentKelas.nama} tanggal ${formatDateIndo(selectedTanggal)} berhasil di-reset.`, 'success');
      } catch (err: any) {
        onShowToast('Gagal mereset data presensi ke server.', 'error');
      } finally {
        setIsSaving(false);
      }
    };

    const confirmMsg = `Apakah Anda yakin ingin mereset/menghapus seluruh rekaman presensi kelas ${currentKelas.nama} untuk tanggal ${formatDateIndo(selectedTanggal)}?`;

    if (onConfirmModal) {
      onConfirmModal(
        'Reset Data Presensi Kelas',
        confirmMsg,
        'danger',
        executeReset
      );
    } else if (window.confirm(confirmMsg)) {
      executeReset();
    }
  };

  const handleCancelUnsavedEdits = () => {
    const statusMap: Record<string, PresensiStatus> = {};
    const timeMap: Record<string, string> = {};
    const pulangStatusMap: Record<string, 'H' | 'TAP' | ''> = {};
    const pulangTimeMap: Record<string, string> = {};
    const suratMap: Record<string, string> = {};
    const catatanMap: Record<string, string> = {};

    siswaList.forEach((s) => {
      const rec = confirmedBaseline[s.id] || confirmedBaseline[s.nisn];
      const entryStatus = rec ? (normalizePresensiStatus(rec.status) || '') : '';
      statusMap[s.id] = entryStatus;
      timeMap[s.id] = rec?.time || '';
      
      if (['H', 'K'].includes(entryStatus)) {
        pulangStatusMap[s.id] = (rec?.pulangStatus || 'TAP') as 'H' | 'TAP';
      } else {
        pulangStatusMap[s.id] = (rec?.pulangStatus || '') as 'H' | 'TAP' | '';
      }
      pulangTimeMap[s.id] = rec?.pulangTime || '';

      if (rec?.suratBukti) suratMap[s.id] = rec.suratBukti;
      if (rec?.catatan) catatanMap[s.id] = rec.catatan;
    });

    setStudentStatus(statusMap);
    setStudentTime(timeMap);
    setStudentPulangStatus(pulangStatusMap);
    setStudentPulangTime(pulangTimeMap);
    setStudentSuratBukti(suratMap);
    setStudentCatatan(catatanMap);
    setSaveError(null);

    if (draftStorageKey) {
      try {
        localStorage.removeItem(draftStorageKey);
      } catch (e) {}
    }
    setDetectedDraft(null);

    onShowToast('Perubahan presensi telah dibatalkan dan dikembalikan ke data terkonfirmasi.', 'info');
  };

  const handleStatusChange = (siswaId: string, status: PresensiStatus) => {
    setStudentStatus((prev) => {
      const nextStatus = prev[siswaId] === status ? '' : status;
      if (['H', 'K'].includes(nextStatus)) {
        setStudentPulangStatus((p) => ({ ...p, [siswaId]: p[siswaId] || 'TAP' }));
      } else {
        setStudentPulangStatus((p) => ({ ...p, [siswaId]: '' }));
      }
      if (!nextStatus) {
        setStudentTime((t) => { const nt = { ...t }; delete nt[siswaId]; return nt; });
        setStudentPulangTime((pt) => { const npt = { ...pt }; delete npt[siswaId]; return npt; });
        setStudentSuratBukti((sb) => { const nsb = { ...sb }; delete nsb[siswaId]; return nsb; });
        setStudentCatatan((c) => { const nc = { ...c }; delete nc[siswaId]; return nc; });
      }
      return {
        ...prev,
        [siswaId]: nextStatus,
      };
    });
  };

  const handlePulangStatusChange = (siswaId: string, status: 'H' | 'TAP') => {
    setStudentPulangStatus((prev) => ({
      ...prev,
      [siswaId]: status,
    }));
    if (status === 'H') {
      const nowStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date()).replace(/\./g, ':');
      setStudentPulangTime((prev) => ({
        ...prev,
        [siswaId]: nowStr,
      }));
    }
  };

  const canEditPresensi = useMemo(() => {
    if (readOnly) return false;
    const role = String(currentUser.role || '').toLowerCase();

    // 1. Admin, Superadmin, Administrator
    if (['admin', 'superadmin', 'administrator'].includes(role)) {
      return true;
    }

    // 2. Kesiswaan (role)
    if (role === 'kesiswaan' || role === 'wks_kesiswaan') {
      return true;
    }

    // 3. Piket (Piket Kesiswaan / Piket Guru / Piket Kelas)
    if (['piket', 'guru_piket', 'piket_guru', 'piket_kesiswaan', 'piket_kelas'].includes(role)) {
      return true;
    }

    // 4. Wali Kelas / Hubin
    if (['wali', 'walikelas', 'hubin'].includes(role)) {
      return true;
    }

    // 5. Inspect userData attributes (tugasTambahan, jabatan, username, additionalRoles)
    const userData = currentUser.data as any;
    if (userData) {
      const tugas = String(userData.tugasTambahan || '').toLowerCase();
      const jabatan = String(userData.jabatan || '').toLowerCase();
      const userUsername = String(userData.username || '').toLowerCase();

      if (
        tugas.includes('piket') ||
        tugas.includes('kesiswaan') ||
        tugas.includes('wali') ||
        jabatan.includes('piket') ||
        jabatan.includes('kesiswaan') ||
        jabatan.includes('wali') ||
        userUsername.includes('piket') ||
        userUsername.includes('kesiswaan')
      ) {
        return true;
      }

      if (Array.isArray(userData.tugasTambahanList)) {
        const hasMatch = userData.tugasTambahanList.some((t: string) => {
          const l = String(t).toLowerCase();
          return l.includes('piket') || l.includes('kesiswaan') || l.includes('wali');
        });
        if (hasMatch) return true;
      }

      if (Array.isArray(userData.additionalRoles)) {
        const hasMatch = userData.additionalRoles.some((r: string) => {
          const l = String(r).toLowerCase();
          return l === 'kesiswaan' || l === 'wali' || l.includes('piket');
        });
        if (hasMatch) return true;
      }
    }

    // 6. Check if teacher is registered as Wali Kelas in appData.waliKelas
    if (role === 'guru' || role === 'user') {
      const isWali = appData.waliKelas?.some(
        (w) => (userData?.username && w.username?.toLowerCase() === String(userData.username).toLowerCase()) ||
               (userData?.nama && w.nama?.toLowerCase() === String(userData.nama).toLowerCase())
      );
      if (isWali) return true;
    }

    return false;
  }, [currentUser, readOnly, appData.waliKelas]);

  const canManageSiswa = canEditPresensi;
  const isReadOnlyUser = !canEditPresensi;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isSaving) return;

    if (!canEditPresensi) {
      onShowToast('Mode Read Only! Pengisian dan pengubahan presensi siswa dikelola oleh Admin, Wali Kelas, Tim Kesiswaan, Piket Kesiswaan, dan Piket Guru.', 'warning');
      return;
    }

    if (isWeekendSelected || isFutureSelected) {
      onShowToast('Tidak dapat menyimpan presensi pada hari libur atau tanggal masa depan!', 'error');
      return;
    }

    if (isBeforeStartDate) {
      onShowToast(
        `Tidak dapat menyimpan presensi sebelum tanggal mulai absensi (${formatDateIndo(
          appData.sekolah.tanggalMulai
        )})!`,
        'error'
      );
      return;
    }

    if (!currentKelas) {
      onShowToast('Data kelas tidak valid atau belum dipilih!', 'error');
      return;
    }

    if (!selectedTanggal || !/^\d{4}-\d{2}-\d{2}$/.test(selectedTanggal)) {
      onShowToast('Tanggal presensi tidak valid!', 'error');
      return;
    }

    const resRequestId = ++saveRequestIdRef.current;
    setSaveError(null);
    setIsSaving(true);

    try {
      const presensiKey = `${selectedTanggal}_${selectedKelasId}`;
      const validStudentIds = new Set(siswaList.map((s) => s.id));

      // Only include students who have an explicit status set
      const rawNewRecords: SiswaPresensiItem[] = [];
      siswaList.forEach((s) => {
        const entryStatus = studentStatus[s.id];
        if (entryStatus) {
          let pStatus: 'H' | 'TAP' | '' = '';
          if (['H', 'K'].includes(entryStatus)) {
            pStatus = studentPulangStatus[s.id] || 'TAP';
          }
          rawNewRecords.push({
            siswaId: s.id,
            status: entryStatus,
            time: studentTime[s.id] || (['H', 'K'].includes(entryStatus) ? '07:00' : ''),
            pulangTime: pStatus === 'H' ? (studentPulangTime[s.id] || '12:00') : '',
            pulangStatus: pStatus,
            suratBukti: studentSuratBukti[s.id] || undefined,
            catatan: studentCatatan[s.id] || undefined,
          });
        }
      });

      // Strict batch validation and deduplication (Prompt 6A.7)
      const batchValidation = validateAttendanceBatch(presensiKey, rawNewRecords, validStudentIds);
      if (!batchValidation.valid) {
        setIsSaving(false);
        const errMsg = batchValidation.errors.join(', ');
        setSaveError(errMsg);
        onShowToast(`Validasi Gagal: ${errMsg}`, 'error');
        return;
      }

      const newRecords = batchValidation.deduplicatedRecords;

      // Sync to presensiMengajarGuru if user is a teacher/wali/staff
      const currentGuruUsername = (currentUser.data as any)?.username || (currentUser.data as any)?.nip || 'guru';
      const currentGuruNama = (currentUser.data as any)?.nama || 'Guru';
      const dateObj = new Date(selectedTanggal);
      const dayName = getIndonesianDayName(dateObj);

      const presensiSiswaArray: SiswaPresensiSesiGuru[] = [];
      siswaList.forEach((s) => {
        const st = studentStatus[s.id];
        if (st) {
          const mappedStatus: 'H' | 'S' | 'I' | 'A' | 'T' = st === 'K' ? 'T' : (((st || 'H') as any));
          presensiSiswaArray.push({
            siswaId: s.id,
            siswaNama: s.nama,
            status: mappedStatus,
            catatan: studentCatatan[s.id] || '',
            suratBukti: studentSuratBukti[s.id] || '',
          });
        }
      });

      const existingGuruLogs = appData.presensiMengajarGuru || [];
      const existingLogIndex = existingGuruLogs.findIndex(
        (l) => l.tanggal === selectedTanggal && l.kelasId === selectedKelasId && (l.guruUsername === currentGuruUsername || currentUser.role === 'wali' || currentUser.role === 'walikelas')
      );

      let updatedGuruLogs = [...existingGuruLogs];
      if (existingLogIndex >= 0) {
        updatedGuruLogs[existingLogIndex] = {
          ...updatedGuruLogs[existingLogIndex],
          presensiSiswa: presensiSiswaArray,
        };
      } else if (currentKelas) {
        updatedGuruLogs.unshift({
          id: `LOG_GURU_${Date.now()}`,
          guruUsername: currentGuruUsername,
          guruNama: currentGuruNama,
          tanggal: selectedTanggal,
          hari: dayName,
          kelasId: selectedKelasId,
          kelasNama: currentKelas.nama,
          mataPelajaran: (currentUser.data as any)?.mataPelajaran || 'Presensi Harian Kelas',
          jamPelajaran: '07:00 - selesai',
          presensiSiswa: presensiSiswaArray,
          createdAt: new Date().toISOString(),
        });
      }

      // Safely merge with existing records for this key: keep updated records & remove explicitly cleared ones
      const existingForThisKey = (appData.presensi || {})[presensiKey] || [];
      const recMap = new Map<string, SiswaPresensiItem>();
      existingForThisKey.forEach((r) => { if (r && r.siswaId) recMap.set(r.siswaId, r); });
      
      siswaList.forEach((s) => {
        const st = studentStatus[s.id];
        if (st) {
          const matchingNew = newRecords.find((r) => r.siswaId === s.id);
          if (matchingNew) {
            recMap.set(s.id, matchingNew);
          }
        } else {
          // Explicitly cleared/unfilled in UI -> remove from saved records
          recMap.delete(s.id);
        }
      });

      const finalPresensiRecords = Array.from(recMap.values());

      const nextAppData: AppData = {
        ...appData,
        presensi: {
          ...appData.presensi,
          [presensiKey]: finalPresensiRecords,
        },
        presensiMengajarGuru: updatedGuruLogs,
      };

      const result = await onSavePresensi(nextAppData);
      if (resRequestId !== saveRequestIdRef.current) return;

      // Verify server persistence result (Prompt 6A.6.1)
      if (result && typeof result === 'object' && result.success === false) {
        setSaveError(result.message || 'Gagal menyimpan data presensi ke server. Perubahan Anda tetap aman dalam draf perangkat.');
        onShowToast(`Gagal menyimpan ke server: ${result.message || 'Periksa koneksi dan coba lagi.'}`, 'error');
        return;
      }

      // Update confirmed baseline to the newly saved records
      const newBaselineMap: Record<string, SiswaPresensiItem> = {};
      finalPresensiRecords.forEach((r) => {
        if (r.siswaId) newBaselineMap[r.siswaId] = r;
      });
      setConfirmedBaseline(newBaselineMap);
      setDetectedConflict(null);

      // ONLY on confirmed server persistence: clean up local draft!
      if (draftStorageKey) {
        try {
          localStorage.removeItem(draftStorageKey);
        } catch (e) {}
      }
      setDetectedDraft(null);
      const saveTime = getIndonesianTimeString(new Date(), false);
      setLastSavedTimestamp(saveTime);
      setSaveError(null);

      onShowToast(`✓ Presensi ${currentKelas.nama} tanggal ${formatDateIndo(selectedTanggal)} berhasil disimpan (${finalPresensiRecords.length} dari ${siswaList.length} siswa terisi)!`, 'success');
    } catch (error: any) {
      if (resRequestId !== saveRequestIdRef.current) return;
      const errorMsg = error?.message || 'Gagal menyimpan data presensi ke server. Perubahan Anda tetap aman dalam draf perangkat.';
      setSaveError(errorMsg);
      onShowToast(`Gagal menyimpan data presensi: ${errorMsg}`, 'error');
    } finally {
      if (resRequestId === saveRequestIdRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleOpenEditStudent = (s: Siswa) => {
    setEditingStudentId(s.id);
    setFormNisn(s.nisn);
    setFormNama(s.nama);
    setFormGender(s.gender || 'L');
    setFormNoWa(s.noWa || '');
    setFormStatus(s.status || 'aktif');
    setIsStudentModalOpen(true);
  };

  const handleOpenAddStudent = () => {
    setEditingStudentId(null);
    setFormNisn('');
    setFormNama('');
    setFormGender('L');
    setFormNoWa('08' + Math.floor(100000000 + Math.random() * 900000000));
    setFormStatus('aktif');
    setIsStudentModalOpen(true);
  };

  const handleSaveStudentForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formNisn.trim()) {
      onShowToast('NISN dan Nama siswa wajib diisi!', 'error');
      return;
    }
    if (!currentKelas) return;

    let updatedSiswa = [...appData.siswa];
    if (editingStudentId) {
      updatedSiswa = updatedSiswa.map((s) =>
        s.id === editingStudentId
          ? {
              ...s,
              nisn: formNisn.trim(),
              nama: formNama.trim(),
              gender: formGender,
              noWa: formNoWa.trim(),
              status: formStatus,
            }
          : s
      );
      onShowToast('Data siswa berhasil diperbarui!', 'success');
    } else {
      const newStudent: Siswa = {
        id: 'SIS_' + Date.now(),
        nisn: formNisn.trim(),
        nama: formNama.trim(),
        gender: formGender,
        kelasId: currentKelas.id,
        status: formStatus,
        noWa: formNoWa.trim(),
      };
      updatedSiswa.push(newStudent);
      onShowToast('Siswa baru berhasil ditambahkan ke kelas!', 'success');
    }

    const nextAppData: AppData = {
      ...appData,
      siswa: updatedSiswa,
    };
    onSavePresensi(nextAppData);
    setIsStudentModalOpen(false);
  };

  const waliKelasObj = appData.waliKelas?.find((w) => w.id === currentKelas?.waliKelasId);
  const hariLiburObj = getHariLiburInfo(selectedTanggal, appData);
  const contextBadgeText = currentKelas
    ? `${currentKelas.nama} • ${formatDateIndo(selectedTanggal)}`
    : formatDateIndo(selectedTanggal);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 sm:pb-8">
      {/* 1. PAGE HEADER */}
      <PageHeader
        icon={ClipboardCheck}
        title="Presensi Hari Ini"
        description="Kelola kehadiran siswa pada tanggal yang dipilih."
        badge={contextBadgeText}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {onOpenServerQrModal && (['admin', 'kesiswaan', 'piket_kesiswaan', 'piket_guru', 'piket'].includes(String(currentUser.role).toLowerCase())) && (
              <button
                type="button"
                onClick={onOpenServerQrModal}
                className="px-3.5 py-2 rounded-xl font-bold text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 transition flex items-center gap-2 cursor-pointer border border-emerald-400/30 active:scale-95"
                title="Buka Scanner QR / Kios Presensi Kartu Pelajar"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">Scan QR</span>
              </button>
            )}

            <div className="inline-flex p-1 bg-white/15 dark:bg-white/15 rounded-xl border border-white/20 backdrop-blur-xs">
              <button
                type="button"
                onClick={() => handleTabChange('presensi')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'presensi'
                    ? 'bg-white text-blue-950 shadow-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Input Presensi Siswa</span>
              </button>
              {canAccessTeacherAttendance && (
                <button
                  type="button"
                  onClick={() => handleTabChange('guru')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'guru'
                      ? 'bg-white text-blue-950 shadow-xs'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Absensi Manual Guru</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleTabChange('siswa')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'siswa'
                    ? 'bg-white text-blue-950 shadow-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Data Siswa Kelas</span>
              </button>
            </div>
          </div>
        }
      />

      {/* 2. READ ONLY & HOLIDAY BANNERS */}
      {!canEditPresensi && activeTab !== 'guru' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-200 text-xs shadow-2xs">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-bold">Akses Read-Only Presensi Kelas:</span> Pengisian dan pengubahan presensi siswa dikelola oleh Admin, Wali Kelas, Tim Kesiswaan, Piket Kesiswaan, dan Piket Guru.
          </div>
        </div>
      )}

      {/* 3. CONTEXT BAR FOR SISWA (KELAS + TANGGAL) */}
      {activeTab !== 'guru' && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Pilih Kelas
              </label>
              {isPiketKelas && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Terkunci (Kelas Anda)
                </span>
              )}
            </div>
            <div className="relative">
              <select
                value={selectedKelasId}
                disabled={isPiketKelas}
                onChange={(e) => handleChangeKelas(e.target.value)}
                className={`w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none transition ${
                  isPiketKelas
                    ? 'opacity-90 cursor-not-allowed bg-slate-100 dark:bg-slate-800/60 border-teal-300 dark:border-teal-800/60 shadow-inner'
                    : 'cursor-pointer focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary'
                }`}
              >
                {availableClasses.length === 0 && <option value="">Belum Ada Kelas</option>}
                {availableClasses.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama} {isPiketKelas ? '(Terkunci - Kelas Anda)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {waliKelasObj && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                Wali Kelas: <span className="text-slate-700 dark:text-slate-300 font-semibold">{waliKelasObj.nama}</span>
              </p>
            )}
          </div>

          {activeTab === 'presensi' && (
            <div>
              <DatePickerWithStatus
                label="Pilih Tanggal Presensi"
                selectedDate={selectedTanggal}
                onChangeDate={handleChangeTanggal}
                appData={appData}
                currentUser={currentUser}
                kelasId={selectedKelasId}
              />
            </div>
          )}
        </div>
      )}

      {/* Hari Libur Notification */}
      {activeTab === 'presensi' && hariLiburObj && (
        <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800/60 flex items-center gap-3 text-purple-900 dark:text-purple-200 text-xs shadow-2xs">
          <CalendarDays className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
          <div>
            <strong className="font-bold block text-xs sm:text-sm">
              {hariLiburObj.jenis === 'tanpa_presensi' ? 'Hari Tanpa Presensi KBM' : 'Hari Libur Nasional / Sekolah'}
            </strong>
            <span>{hariLiburObj.keterangan} — Tanggal ini ditandai sebagai hari libur atau tanpa presensi regular.</span>
          </div>
        </div>
      )}

      {/* TAB 1: INPUT PRESENSI */}
      {activeTab === 'presensi' && (
        <>
          {/* OFFLINE STATUS BANNER */}
          {!isOnline && (
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-2xl flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <WifiOff className="w-4 h-4 shrink-0 text-rose-500" />
                <div>
                  <span className="font-bold">Mode Offline Terdeteksi.</span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 ml-1">
                    Perubahan presensi tetap aman tersimpan dalam draf lokal perangkat ini. Klik tombol Simpan setelah jaringan online kembali.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CONFLICT RESOLUTION BANNER (Prompt 6A.6.2) */}
          {detectedConflict && detectedConflict.count > 0 && (
            <div className="p-4 sm:p-5 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 rounded-2xl md:rounded-3xl shadow-sm text-amber-950 dark:text-amber-100 flex flex-col gap-3.5 animate-in fade-in duration-300">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-200/80 dark:bg-amber-900/80 rounded-2xl text-amber-900 dark:text-amber-100 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-extrabold text-sm sm:text-base text-amber-950 dark:text-amber-100">
                      Konflik Data Presensi Terdeteksi
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-200 text-xs font-black">
                      {detectedConflict.count} Siswa Berbeda
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/80 dark:text-amber-200/80 mt-1 leading-relaxed">
                    Terdapat pembaruan data di server pada {detectedConflict.count} siswa yang sedang Anda ubah secara lokal. Pilih tindakan sinkronisasi di bawah ini:
                  </p>

                  {/* Conflicting Students List */}
                  <div className="mt-3 flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                    {detectedConflict.conflictingStudents.map((item) => (
                      <div
                        key={item.siswaId}
                        className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-amber-300/80 dark:border-amber-700/80 text-xs flex items-center gap-2 shadow-2xs"
                      >
                        <span className="font-bold text-slate-800 dark:text-white truncate max-w-[140px] sm:max-w-[200px]">
                          {item.siswaNama}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-amber-700 dark:text-amber-400 font-semibold">
                          Lokal: <span className="font-black underline">{item.localStatus ? `[${item.localStatus}]` : 'Kosong'}</span>
                        </span>
                        <span className="text-slate-400">≠</span>
                        <span className="text-blue-700 dark:text-blue-400 font-semibold">
                          Server: <span className="font-black underline">{item.serverStatus ? `[${item.serverStatus}]` : 'Kosong'}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-amber-200/80 dark:border-amber-800/80">
                <button
                  type="button"
                  onClick={handleResolveUseServer}
                  className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Gunakan Data Server</span>
                </button>
                <button
                  type="button"
                  onClick={handleResolveUseLocal}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Gunakan Perubahan Saya</span>
                </button>
              </div>
            </div>
          )}

          {/* DRAFT RECOVERY BANNER */}
          {detectedDraft && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-2xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/60 rounded-xl text-amber-700 dark:text-amber-300 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-amber-950 dark:text-amber-100">
                      Draf Perubahan Lokal Ditemukan
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-800/80 text-amber-900 dark:text-amber-200 text-[10px] font-black">
                      {detectedDraft.dirtyCount} Perubahan
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    Terdapat perubahan belum tersimpan dari sesi sebelumnya ({detectedDraft.updatedAtFormatted || 'terakhir diperbarui'}).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-900/60 rounded-xl transition cursor-pointer"
                >
                  Abaikan & Buang
                </button>
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Pulihkan Draf</span>
                </button>
              </div>
            </div>
          )}

          {/* SAVE ERROR BANNER WITH RETRY */}
          {saveError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 dark:text-rose-200 shadow-2xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs sm:text-sm text-rose-950 dark:text-rose-100 block">
                    Penyimpanan Presensi Gagal
                  </span>
                  <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 mt-0.5">
                    {saveError}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>Coba Simpan Lagi</span>
              </button>
            </div>
          )}

          {/* Status Alerts */}
          {isAlreadySaved && !isDirty && !isReadOnlyUser && !isFutureSelected && !isBeforeStartDate && !isWeekendSelected && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="font-bold">Data Presensi Tersimpan di Server.</span>
                  <span className="hidden sm:inline text-[11px] text-emerald-700 dark:text-emerald-300 ml-1">
                    {lastSavedTimestamp ? `Penyimpanan terakhir pada pukul ${lastSavedTimestamp} WIB.` : 'Anda dapat memperbarui status siswa kapan saja.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isFutureSelected && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs shadow-2xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <div className="font-bold">Salah Pilih Tanggal!</div>
                <div className="text-[11px]">Anda memilih tanggal di masa depan. Presensi hanya dapat dicatat untuk hari ini atau tanggal sebelumnya.</div>
              </div>
            </div>
          )}

          {isBeforeStartDate && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center gap-3 text-amber-700 dark:text-amber-300 text-xs shadow-2xs">
              <CalendarX className="w-5 h-5 shrink-0 text-amber-600" />
              <div>
                <div className="font-bold">Sebelum Tanggal Mulai Absensi!</div>
                <div className="text-[11px]">
                  Tanggal yang dipilih berada sebelum tanggal resmi mulai absensi ({formatDateIndo(appData.sekolah.tanggalMulai)}).
                </div>
              </div>
            </div>
          )}

          {isWeekendSelected && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center gap-3 text-amber-700 dark:text-amber-300 text-xs shadow-2xs">
              <CalendarX className="w-5 h-5 shrink-0 text-amber-600" />
              <div>
                <div className="font-bold">Hari Libur Akhir Pekan (Sabtu / Minggu)</div>
                <div className="text-[11px]">Tanggal yang dipilih jatuh pada akhir pekan. Input presensi KBM dinonaktifkan.</div>
              </div>
            </div>
          )}

          {/* Form Presensi */}
          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              
              {/* 4. SUMMARY PRESENSI (STRUCTURED HIERARCHY) */}
              {siswaList.length > 0 && (
                <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                  {/* Summary Header & Attendance Progress */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Rekap Presensi
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                          Kelas {currentKelas?.nama || '-'}
                        </span>
                        {isSaving ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-700 flex items-center gap-1.5" role="status" aria-live="polite">
                            <Loader2 className="w-3 h-3 animate-spin text-amber-600 dark:text-amber-400" />
                            Menyimpan ke Server...
                          </span>
                        ) : saveError ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[10px] font-bold border border-rose-300 dark:border-rose-700 flex items-center gap-1.5" role="status" aria-live="polite">
                            <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                            Gagal Menyimpan
                          </span>
                        ) : !isOnline ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-300 dark:border-slate-700 flex items-center gap-1.5" role="status" aria-live="polite">
                            <WifiOff className="w-3 h-3 text-rose-500" />
                            Offline (Draf Lokal)
                          </span>
                        ) : detectedConflict && detectedConflict.count > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-700 flex items-center gap-1.5" role="status" aria-live="polite">
                            <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Konflik Sinkronisasi ({detectedConflict.count} Siswa)
                          </span>
                        ) : isDirty ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-700 flex items-center gap-1.5" role="status" aria-live="polite">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Belum Disimpan ({dirtyChangesCount} perubahan)
                            {lastDraftSavedTime && <span className="opacity-75 font-normal ml-0.5">• Draf {lastDraftSavedTime}</span>}
                          </span>
                        ) : isAlreadySaved ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-700 flex items-center gap-1" role="status" aria-live="polite">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Semua Perubahan Tersimpan {lastSavedTimestamp ? `(${lastSavedTimestamp} WIB)` : ''}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                            Belum Diisi
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {formatDateIndo(selectedTanggal)} • {attendanceStats.total - attendanceStats.belumAbsen} dari {attendanceStats.total} Siswa Terisi ({attendanceStats.belumAbsen} Belum Diisi)
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Tingkat Kehadiran</div>
                        <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {attendanceStats.percentHadir}% Hadir
                        </div>
                      </div>
                      <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-600">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${attendanceStats.percentHadir}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Filter Cards Grid */}
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                      Filter Berdasarkan Status:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                      {/* 1. Semua Siswa (Primary Tier) */}
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        role="button"
                        aria-pressed={statusFilter === 'ALL'}
                        className={`p-2.5 rounded-xl border transition flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs ${
                          statusFilter === 'ALL'
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        title="Klik untuk tampilkan semua siswa"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Semua</span>
                        <span className="text-base font-black mt-0.5">{attendanceStats.total}</span>
                      </button>

                      {/* 2. Hadir (Primary Tier - Success) */}
                      <button
                        type="button"
                        onClick={() => setStatusFilter('H')}
                        role="button"
                        aria-pressed={statusFilter === 'H'}
                        className={`p-2.5 rounded-xl border transition flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs ${
                          statusFilter === 'H'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                        }`}
                        title="Klik untuk filter Hadir"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Hadir (H)</span>
                        <span className="text-base font-black mt-0.5">{attendanceStats.hadir}</span>
                      </button>

                      {/* 3. Sakit (Secondary Tier - Warning / Amber) */}
                      <button
                        type="button"
                        onClick={() => setStatusFilter('S')}
                        role="button"
                        aria-pressed={statusFilter === 'S'}
                        className={`p-2.5 rounded-xl border transition flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs ${
                          statusFilter === 'S'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                        }`}
                        title="Klik untuk filter Sakit"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Sakit (S)</span>
                        <span className="text-base font-black mt-0.5">{attendanceStats.sakit}</span>
                      </button>

                      {/* 4. Izin (Secondary Tier - Info / Blue) */}
                      <button
                        type="button"
                        onClick={() => setStatusFilter('I')}
                        role="button"
                        aria-pressed={statusFilter === 'I'}
                        className={`p-2.5 rounded-xl border transition flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs ${
                          statusFilter === 'I'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                        }`}
                        title="Klik untuk filter Izin"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Izin (I)</span>
                        <span className="text-base font-black mt-0.5">{attendanceStats.izin}</span>
                      </button>

                      {/* 5. Alpa (Secondary Tier - Danger / Rose) */}
                      <button
                        type="button"
                        onClick={() => setStatusFilter('A')}
                        role="button"
                        aria-pressed={statusFilter === 'A'}
                        className={`p-2.5 rounded-xl border transition flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs ${
                          statusFilter === 'A'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                        }`}
                        title="Klik untuk filter Alpa"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Alpa (A)</span>
                        <span className="text-base font-black mt-0.5">{attendanceStats.alfa}</span>
                      </button>

                      {/* 6. Kesiangan (Additional - Orange) */}
                      <button
                        type="button"
                        onClick={() => setStatusFilter('K')}
                        role="button"
                        aria-pressed={statusFilter === 'K'}
                        className={`p-2.5 rounded-xl border transition flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs ${
                          statusFilter === 'K'
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/50 text-orange-800 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40'
                        }`}
                        title="Klik untuk filter Kesiangan"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Kesiangan (K)</span>
                        <span className="text-base font-black mt-0.5">{attendanceStats.kesiangan}</span>
                      </button>

                      {/* 7. Dispensasi (Additional - Purple) */}
                      <button
                        type="button"
                        onClick={() => setStatusFilter('D')}
                        role="button"
                        aria-pressed={statusFilter === 'D'}
                        className={`p-2.5 rounded-xl border transition flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs ${
                          statusFilter === 'D'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/50 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                        }`}
                        title="Klik untuk filter Dispensasi"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Dispen (D)</span>
                        <span className="text-base font-black mt-0.5">{attendanceStats.dispensasi}</span>
                      </button>

                      {/* 8. Belum Diisi / TAP */}
                      <button
                        type="button"
                        onClick={() => setStatusFilter(attendanceStats.belumAbsen > 0 ? 'UNSET' : 'TAP')}
                        role="button"
                        aria-pressed={statusFilter === 'UNSET' || statusFilter === 'TAP'}
                        className={`p-2.5 rounded-xl border transition flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs ${
                          statusFilter === 'UNSET' || statusFilter === 'TAP'
                            ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title="Klik untuk filter Belum Diisi / TAP"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                          {attendanceStats.belumAbsen > 0 ? 'Belum Diisi' : 'TAP'}
                        </span>
                        <span className="text-base font-black mt-0.5">
                          {attendanceStats.belumAbsen > 0 ? attendanceStats.belumAbsen : attendanceStats.tapCount}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. SEARCH & QUICK ACTIONS BAR */}
              {siswaList.length > 0 && (
                <div className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama siswa, NISN, atau WhatsApp..."
                      className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition shadow-2xs"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                        aria-label="Bersihkan pencarian"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Actions & Tools */}
                  <div className="flex flex-wrap items-center gap-2">
                    {canEditPresensi && !isWeekendSelected && !isFutureSelected && !isBeforeStartDate && (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsClassQrScannerOpen(true)}
                          className="px-3 py-2 bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary font-bold text-xs rounded-xl border border-theme-primary/30 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Buka Kamera untuk Scan QR Siswa / Kartu Pelajar"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Scan QR Siswa</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSetAllHadir}
                          className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800/50 transition flex items-center gap-1.5 cursor-pointer"
                          title="Tandai seluruh siswa menjadi Hadir"
                        >
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Set Semua Siswa Hadir</span>
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowDemoTools(!showDemoTools)}
                            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-1 cursor-pointer"
                            title="Opsi Lanjutan & Simulasi"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span className="hidden sm:inline">Opsi Demo</span>
                            <ChevronDown className="w-3 h-3 opacity-60" />
                          </button>

                          {showDemoTools && (
                            <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                              <button
                                type="button"
                                onClick={() => {
                                  handleSetRandomStatus();
                                  setShowDemoTools(false);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 transition cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Acak Status (Simulasi)</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {(statusFilter !== 'ALL' || searchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter('ALL');
                          setSearchQuery('');
                        }}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold px-1 whitespace-nowrap">
                      {filteredSiswaList.length} dari {siswaList.length} siswa
                    </div>
                  </div>
                </div>
              )}

              {/* 6. DAFTAR SISWA (STUDENT LIST FOUNDATION) */}
              {siswaList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  <Users className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">Belum ada siswa terdaftar pada kelas ini.</p>
                  <p className="text-slate-400 mt-1">Silakan pilih kelas lain atau tambahkan siswa melalui tab "Data Siswa Kelas".</p>
                </div>
              ) : filteredSiswaList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  <Search className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">Tidak ditemukan siswa yang sesuai.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                    }}
                    className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    Bersihkan Pencarian & Filter
                  </button>
                </div>
              ) : (
                <div className="flex flex-col">
                  {/* Table Header (Visible on Desktop / Tablet) */}
                  <div className="hidden lg:grid grid-cols-12 items-center px-4 py-2.5 bg-slate-100/75 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                    <div className="col-span-1 flex items-center justify-center">No</div>
                    <div className="col-span-5">Identitas Siswa (Nama / NISN / Gender)</div>
                    <div className="col-span-6 flex items-center justify-end pr-2">Status Presensi & Tambahan</div>
                  </div>

                  {/* Student Rows List */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredSiswaList.map((s, idx) => {
                      const currentStatus = studentStatus[s.id] || "";
                      const isDisabled =
                        isReadOnlyUser ||
                        !canEditPresensi ||
                        isWeekendSelected ||
                        isFutureSelected ||
                        isBeforeStartDate;
                      
                      const conflictItem = detectedConflict?.conflictingStudents.find((c) => c.siswaId === s.id);
                      const conflictInfo = conflictItem
                        ? { serverStatus: conflictItem.serverStatus, serverPulangStatus: conflictItem.serverPulangStatus }
                        : undefined;

                      return (
                        <StudentAttendanceRow
                          key={s.id}
                          index={idx}
                          siswa={s}
                          currentStatus={currentStatus}
                          time={studentTime[s.id]}
                          pulangStatus={studentPulangStatus[s.id]}
                          pulangTime={studentPulangTime[s.id]}
                          suratBukti={studentSuratBukti[s.id]}
                          catatan={studentCatatan[s.id]}
                          isDisabled={isDisabled}
                          conflictInfo={conflictInfo}
                          density={appData.sekolah?.density || "comfortable"}
                          onStatusChange={handleStatusChange}
                          onPulangStatusChange={handlePulangStatusChange}
                          onUploadSurat={handleUploadSurat}
                          onRemoveSurat={handleRemoveSurat}
                          onCatatanChange={handleCatatanChange}
                          onPreviewSurat={(imageUrl, studentName, status) =>
                            setPreviewSuratModal({
                              isOpen: true,
                              imageUrl,
                              studentName,
                              status,
                            })
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 7. PRIMARY SAVE & RESET ACTIONS (DESKTOP) */}
            {canEditPresensi && siswaList.length > 0 && !isWeekendSelected && !isFutureSelected && !isBeforeStartDate && (
              <div className="flex items-center justify-end gap-3 pt-2">
                {isDirty && (
                  <button
                    type="button"
                    onClick={handleCancelUnsavedEdits}
                    disabled={isSaving}
                    className="px-4 py-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold rounded-xl border border-amber-200 dark:border-amber-800/50 text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Batalkan perubahan lokal dan kembalikan ke data terkonfirmasi"
                  >
                    <Undo2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Batalkan Perubahan</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetKehadiran}
                  disabled={isSaving}
                  className="px-4 py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold rounded-xl border border-rose-200 dark:border-rose-800/50 text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Reset seluruh kehadiran kelas ini menjadi kosong"
                >
                  <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Reset Kehadiran</span>
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-6 py-3 font-bold rounded-xl shadow-md text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    isDirty
                      ? 'bg-theme-primary hover:bg-theme-primary-hover text-white ring-2 ring-theme-primary/30 ring-offset-2 dark:ring-offset-slate-900'
                      : isAlreadySaved
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-theme-primary hover:bg-theme-primary-hover text-white'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke Server...</span>
                    </>
                  ) : saveError ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Coba Simpan Lagi</span>
                    </>
                  ) : isDirty ? (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Perubahan ({dirtyChangesCount})</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{isAlreadySaved ? 'Data Presensi Tersimpan' : 'Simpan Data Presensi'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>

          {/* 8. MOBILE STICKY ACTION BAR */}
          {canEditPresensi && siswaList.length > 0 && !isWeekendSelected && !isFutureSelected && !isBeforeStartDate && (
            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 shadow-xl flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                  {saveError ? 'Gagal Menyimpan' : isDirty ? 'Belum Disimpan' : 'Status Terisi'}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  {saveError ? 'Ketuk Coba Lagi' : isDirty ? `${dirtyChangesCount} Siswa Diubah` : `${attendanceStats.total - attendanceStats.belumAbsen} / ${attendanceStats.total} Siswa`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isDirty && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleCancelUnsavedEdits}
                    className="px-3 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-bold rounded-xl text-xs border border-amber-200 dark:border-amber-800/50 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Batal</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave()}
                  className={`px-4 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                    saveError
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md'
                      : isDirty
                      ? 'bg-theme-primary hover:bg-theme-primary-hover text-white shadow-md'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : saveError ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Coba Lagi</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{isDirty ? 'Simpan' : isAlreadySaved ? 'Tersimpan' : 'Simpan Presensi'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: DATA SISWA KELAS */}
      {activeTab === 'siswa' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                Daftar Siswa Kelas {currentKelas ? currentKelas.nama : ''}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Total {siswaList.length} siswa terdaftar pada kelas ini.
              </p>
            </div>
            {canManageSiswa && currentKelas && (
              <button
                type="button"
                onClick={handleOpenAddStudent}
                className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Siswa</span>
              </button>
            )}
          </div>

          {siswaList.length > 0 && (
            <div className="p-3.5 bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa atau NISN..."
                  className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-1">
                  Ditemukan: {filteredSiswaList.length} dari {siswaList.length} siswa
                </div>
              )}
            </div>
          )}

          {siswaList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              Belum ada data siswa untuk kelas ini. Klik "Tambah Siswa" untuk memasukkan siswa baru.
            </div>
          ) : filteredSiswaList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Search className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              Tidak ditemukan siswa yang cocok dengan kata kunci "{searchQuery}".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="p-3.5">No</th>
                    <th className="p-3.5">NISN</th>
                    <th className="p-3.5">Nama Siswa</th>
                    <th className="p-3.5">Gender</th>
                    <th className="p-3.5">No. WhatsApp</th>
                    <th className="p-3.5">Status</th>
                    {canManageSiswa && <th className="p-3.5 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredSiswaList.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-extrabold text-slate-400">{idx + 1}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">{s.nisn}</td>
                      <td className="p-3.5 font-bold text-slate-800 dark:text-white">{s.nama}</td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${s.gender === 'L' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300'}`}>
                          {s.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {s.noWa ? (
                          <a
                            href={`https://wa.me/${s.noWa.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(s.nama)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg text-xs font-bold transition"
                            title="Chat WhatsApp"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{s.noWa}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Belum ada</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${s.status === 'tidak_aktif' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'}`}>
                          {s.status === 'tidak_aktif' ? 'Tidak Aktif' : 'Aktif'}
                        </span>
                      </td>
                      {canManageSiswa && (
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditStudent(s)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                              title="Edit Siswa"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ABSENSI MANUAL GURU */}
      {activeTab === 'guru' && canAccessTeacherAttendance && (
        <TeacherManualAttendanceTab
          appData={appData}
          currentUser={currentUser}
          selectedTanggal={selectedTanggal}
          setSelectedTanggal={setSelectedTanggal}
          onSavePresensi={onSavePresensi}
          onShowToast={onShowToast}
        />
      )}

      {/* STUDENT EDIT/ADD MODAL */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="min-h-full flex items-start sm:items-center justify-center py-2 sm:py-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden my-auto">
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 z-20 bg-white dark:bg-slate-900">
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                  {editingStudentId ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStudentForm} className="p-5 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                    NISN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formNisn}
                    onChange={(e) => setFormNisn(e.target.value)}
                    placeholder="Contoh: 0071234567"
                    className="w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Nama Lengkap Siswa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Jenis Kelamin
                    </label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value as 'L' | 'P')}
                      className="w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
                    >
                      <option value="L">Laki-laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Status Siswa
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as 'aktif' | 'tidak_aktif')}
                      className="w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
                    >
                      <option value="aktif">Aktif</option>
                      <option value="tidak_aktif">Tidak Aktif</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Nomor WhatsApp Siswa / Orang Tua
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formNoWa}
                      onChange={(e) => setFormNoWa(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="flex-1 py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setFormNoWa('08' + Math.floor(100000000 + Math.random() * 900000000))}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                      title="Acak Nomor WA"
                    >
                      Acak WA
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsStudentModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Simpan Siswa
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW SURAT */}
      {previewSuratModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                  Surat Keterangan {previewSuratModal.status}
                </h3>
                <p className="text-xs text-slate-400 font-medium">{previewSuratModal.studentName}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSuratModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto rounded-2xl bg-slate-950 p-2 flex items-center justify-center">
              <img
                src={previewSuratModal.imageUrl}
                alt="Surat Bukti Full"
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewSuratModal(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SCANNER QR SISWA KELAS */}
      {isClassQrScannerOpen && (
        <StudentQrScannerModal
          isOpen={isClassQrScannerOpen}
          onClose={() => setIsClassQrScannerOpen(false)}
          appData={appData}
          selectedKelasId={selectedKelasId}
          selectedTanggal={selectedTanggal}
          studentStatus={studentStatus}
          studentTime={studentTime}
          studentPulangStatus={studentPulangStatus}
          studentPulangTime={studentPulangTime}
          onScanSuccess={handleQrScanSuccess}
          onShowToast={onShowToast}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
