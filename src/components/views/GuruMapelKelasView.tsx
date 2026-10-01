import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  BookOpen,
  Layers,
  Plus,
  Search,
  Trash2,
  Edit,
  Users,
  DoorOpen,
  GraduationCap,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  FileSpreadsheet,
  Download,
  Filter,
  X,
  Award,
  Info,
  Calendar,
  Sparkles,
  LayoutGrid,
  List,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AppData,
  GuruMapelKelasItem,
  Kelas,
  MataPelajaran,
  Siswa,
  UserSession,
  ViewType,
  WaliKelas,
} from '../../types';
import { PageHeader } from '../common/UIComponents';
import { addAuditLog, cleanMapelName } from '../../utils/helpers';
import { DEFAULT_MATA_PELAJARAN } from '../../data/initialData';

interface GuruMapelKelasViewProps {
  appData: AppData;
  currentUser: UserSession;
  readOnly?: boolean;
  onUpdateAppData: (updated: AppData) => void;
  onOpenModal: (title: string, content: React.ReactNode, maxWidth?: string) => void;
  onCloseModal: () => void;
  onConfirmModal: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigateToInput?: (kelasId?: string) => void;
  onNavigateView?: (view: ViewType) => void;
}

export const GuruMapelKelasView: React.FC<GuruMapelKelasViewProps> = ({
  appData,
  currentUser,
  readOnly = false,
  onUpdateAppData,
  onOpenModal,
  onCloseModal,
  onConfirmModal,
  onShowToast,
  onNavigateToInput,
  onNavigateView,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isKurikulum = currentUser.role === 'kurikulum';
  const isTeacher =
    currentUser.role === 'guru' ||
    currentUser.role === 'user' ||
    currentUser.role === 'wali';

  // Identify active teacher (diurutkan alfabetis)
  const allTeachers: WaliKelas[] = useMemo(() => {
    return [...(appData.waliKelas || [])].sort((a, b) =>
      (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' })
    );
  }, [appData.waliKelas]);

  // If logged in as teacher, default to current teacher.
  // If admin/kurikulum, allow selecting teacher or viewing all.
  const loggedTeacherObj: WaliKelas | undefined = useMemo(() => {
    const uData = currentUser.data as any;
    if (!uData) return undefined;
    return (
      allTeachers.find(
        (w) =>
          w.id === uData.id ||
          (w.username && w.username.toLowerCase() === String(uData.username).toLowerCase()) ||
          (w.nip && w.nip === uData.nip) ||
          (w.nama && uData.nama && w.nama.trim().toLowerCase() === String(uData.nama).trim().toLowerCase())
      ) || undefined
    );
  }, [allTeachers, currentUser]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => {
    if (isTeacher && loggedTeacherObj) {
      return loggedTeacherObj.id;
    }
    return loggedTeacherObj ? loggedTeacherObj.id : allTeachers[0]?.id || 'all';
  });

  // Otomatis sinkronisasi ID guru aktif saat akun guru/wali kelas berganti
  useEffect(() => {
    if (isTeacher && loggedTeacherObj && selectedTeacherId !== loggedTeacherObj.id) {
      setSelectedTeacherId(loggedTeacherObj.id);
    }
  }, [isTeacher, loggedTeacherObj]);

  const activeTeacher = useMemo(() => {
    if (selectedTeacherId === 'all') return undefined;
    return allTeachers.find((t) => t.id === selectedTeacherId) || loggedTeacherObj;
  }, [allTeachers, selectedTeacherId, loggedTeacherObj]);

  // Master lists (diurutkan alfabetis secara natural)
  const masterKelasList: Kelas[] = useMemo(() => {
    return [...(appData.kelas || [])].sort((a, b) =>
      (a.nama || '').localeCompare(b.nama || '', 'id', { numeric: true, sensitivity: 'base' })
    );
  }, [appData.kelas]);

  const masterSiswaList: Siswa[] = useMemo(() => {
    return appData.siswa || [];
  }, [appData.siswa]);

  const masterMapelList: MataPelajaran[] = useMemo(() => {
    const list = appData.mataPelajaran || DEFAULT_MATA_PELAJARAN;
    return list
      .map((m) => ({
        ...m,
        nama: cleanMapelName(m.nama),
      }))
      .sort((a, b) =>
        (a.nama || '').localeCompare(b.nama || '', 'id', { numeric: true, sensitivity: 'base' })
      );
  }, [appData.mataPelajaran]);

  // Centralized guruMapelKelas list
  const allMapelKelasList: GuruMapelKelasItem[] = useMemo(() => {
    return appData.guruMapelKelas || [];
  }, [appData.guruMapelKelas]);

  // Filtered by selected teacher if not 'all'
  const teacherMapelList = useMemo(() => {
    if (selectedTeacherId === 'all') {
      return allMapelKelasList;
    }
    return allMapelKelasList.filter(
      (m) =>
        m.guruId === selectedTeacherId ||
        (activeTeacher &&
          m.guruUsername &&
          activeTeacher.username &&
          m.guruUsername.toLowerCase() === activeTeacher.username.toLowerCase())
    );
  }, [allMapelKelasList, selectedTeacherId, activeTeacher]);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTingkat, setFilterTingkat] = useState<string>('semua');
  const [filterKategori, setFilterKategori] = useState<string>('semua');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedMapelIds, setExpandedMapelIds] = useState<Record<string, boolean>>({});

  // Modal Form State (Tambah / Edit Mapel & Kelas)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formSource, setFormSource] = useState<'katalog' | 'manual'>('katalog');
  const [selectedCatalogMapelId, setSelectedCatalogMapelId] = useState<string>('');
  const [formData, setFormData] = useState<{
    guruId: string;
    kodeMapel: string;
    namaMapel: string;
    kategori: string;
    tingkat: string;
    alokasiJp: number;
    kkm: number;
    deskripsi: string;
    kelasIds: string[];
    catatan: string;
  }>({
    guruId: activeTeacher?.id || (loggedTeacherObj?.id || ''),
    kodeMapel: '',
    namaMapel: '',
    kategori: 'Kelompok C (Kejuruan/Peminatan)',
    tingkat: 'Semua Tingkat',
    alokasiJp: 4,
    kkm: 75,
    deskripsi: '',
    kelasIds: [],
    catatan: '',
  });

  // Modal Quick Add Kelas to specific mapel
  const [quickAddModalItem, setQuickAddModalItem] = useState<GuruMapelKelasItem | null>(null);
  const [quickSelectedKelasIds, setQuickSelectedKelasIds] = useState<string[]>([]);

  // Modal Roster Siswa
  const [studentRosterKelas, setStudentRosterKelas] = useState<Kelas | null>(null);
  const [rosterSearch, setRosterSearch] = useState('');

  // Helper to resolve JP strictly referencing master Mata Pelajaran catalog
  const getMapelJp = useCallback(
    (item: { kodeMapel?: string; namaMapel?: string; alokasiJp?: number }) => {
      const master = masterMapelList.find(
        (m) =>
          (m.kode && item.kodeMapel && m.kode.trim().toLowerCase() === item.kodeMapel.trim().toLowerCase()) ||
          (cleanMapelName(m.nama).toLowerCase() === cleanMapelName(item.namaMapel || '').toLowerCase())
      );
      if (master && typeof master.alokasiJp === 'number' && master.alokasiJp > 0) {
        return master.alokasiJp;
      }
      return item.alokasiJp && item.alokasiJp > 0 ? item.alokasiJp : 4;
    },
    [masterMapelList]
  );

  // Computed summary metrics
  const stats = useMemo(() => {
    const totalMapel = teacherMapelList.length;
    // Set of unique class IDs taught by this teacher across all subjects
    const uniqueClassIds = new Set<string>();
    let totalJp = 0;
    let totalRombelTercatat = 0;

    teacherMapelList.forEach((m) => {
      const classCount = (m.kelasIds || []).length;
      (m.kelasIds || []).forEach((cId) => uniqueClassIds.add(cId));
      totalRombelTercatat += classCount;
      const jpPerClass = getMapelJp(m);
      totalJp += jpPerClass * classCount;
    });

    // Total unique students across these classes
    const uniqueStudents = masterSiswaList.filter((s) =>
      uniqueClassIds.has(s.kelasId)
    );

    return {
      totalMapel,
      totalKelas: uniqueClassIds.size,
      totalRombelTercatat,
      totalSiswa: uniqueStudents.length,
      totalJp,
    };
  }, [teacherMapelList, masterSiswaList, getMapelJp]);

  // Filtered displayed subject list (diurutkan alfabetis)
  const filteredMapelList = useMemo(() => {
    return teacherMapelList
      .filter((m) => {
        const q = searchQuery.toLowerCase().trim();
        const matchSearch =
          !q ||
          m.namaMapel.toLowerCase().includes(q) ||
          m.kodeMapel.toLowerCase().includes(q) ||
          (m.guruNama && m.guruNama.toLowerCase().includes(q)) ||
          (m.kategori && m.kategori.toLowerCase().includes(q)) ||
          (m.kelasIds || []).some((cId) => {
            const k = masterKelasList.find((item) => item.id === cId);
            return k && k.nama.toLowerCase().includes(q);
          });

        const matchTingkat =
          filterTingkat === 'semua' ||
          m.tingkat === filterTingkat ||
          m.tingkat === 'Semua Tingkat' ||
          (m.kelasIds || []).some((cId) => {
            const k = masterKelasList.find((item) => item.id === cId);
            return k && k.nama.toUpperCase().startsWith(filterTingkat);
          });

        const matchKategori =
          filterKategori === 'semua' || m.kategori === filterKategori;

        return matchSearch && matchTingkat && matchKategori;
      })
      .sort((a, b) => {
        const comp = (a.namaMapel || '').localeCompare(b.namaMapel || '', 'id', {
          numeric: true,
          sensitivity: 'base',
        });
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [teacherMapelList, searchQuery, filterTingkat, filterKategori, masterKelasList, sortOrder]);

  // Accordion toggle helpers
  const toggleAccordion = (id: string) => {
    setExpandedMapelIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isAllExpanded = useMemo(() => {
    if (filteredMapelList.length === 0) return false;
    return filteredMapelList.every((m) => !!expandedMapelIds[m.id]);
  }, [filteredMapelList, expandedMapelIds]);

  const handleToggleAllAccordions = () => {
    const next = !isAllExpanded;
    const newMap: Record<string, boolean> = {};
    filteredMapelList.forEach((m) => {
      newMap[m.id] = next;
    });
    setExpandedMapelIds(newMap);
  };

  // Helper to open Add Form
  const handleOpenAddForm = () => {
    const defaultGuruId = activeTeacher?.id || (loggedTeacherObj?.id || allTeachers[0]?.id || '');
    setEditingItemId(null);
    setFormSource('katalog');
    setSelectedCatalogMapelId(masterMapelList[0]?.id || '');
    const firstMapel = masterMapelList[0];
    setFormData({
      guruId: defaultGuruId,
      kodeMapel: firstMapel?.kode || 'MP-001',
      namaMapel: firstMapel?.nama || '',
      kategori: firstMapel?.kategori || 'Kelompok C (Kejuruan/Peminatan)',
      tingkat: firstMapel?.tingkat || 'Semua Tingkat',
      alokasiJp: firstMapel?.alokasiJp || 4,
      kkm: firstMapel?.kkm || 75,
      deskripsi: firstMapel?.deskripsi || '',
      kelasIds: [],
      catatan: '',
    });
    setIsFormOpen(true);
  };

  // Helper to open Edit Form
  const handleOpenEditForm = (item: GuruMapelKelasItem) => {
    setEditingItemId(item.id);
    // Check if item matches master mapel
    const matched = masterMapelList.find(
      (m) =>
        m.kode.toLowerCase() === item.kodeMapel.toLowerCase() ||
        m.nama.toLowerCase() === item.namaMapel.toLowerCase()
    );
    if (matched) {
      setFormSource('katalog');
      setSelectedCatalogMapelId(matched.id);
    } else {
      setFormSource('manual');
      setSelectedCatalogMapelId('');
    }
    setFormData({
      guruId: item.guruId,
      kodeMapel: item.kodeMapel,
      namaMapel: item.namaMapel,
      kategori: item.kategori || 'Kelompok C (Kejuruan/Peminatan)',
      tingkat: item.tingkat || 'Semua Tingkat',
      alokasiJp: item.alokasiJp || 4,
      kkm: item.kkm || 75,
      deskripsi: item.deskripsi || '',
      kelasIds: [...(item.kelasIds || [])],
      catatan: item.catatan || '',
    });
    setIsFormOpen(true);
  };

  // Handler catalog selection change
  const handleCatalogMapelChange = (mapelId: string) => {
    setSelectedCatalogMapelId(mapelId);
    const m = masterMapelList.find((item) => item.id === mapelId);
    if (m) {
      setFormData((prev) => ({
        ...prev,
        kodeMapel: m.kode,
        namaMapel: m.nama,
        kategori: m.kategori || prev.kategori,
        tingkat: m.tingkat || prev.tingkat,
        alokasiJp: m.alokasiJp || prev.alokasiJp,
        kkm: m.kkm || prev.kkm,
        deskripsi: m.deskripsi || prev.deskripsi,
      }));
    }
  };

  // Handler toggle class in form
  const handleToggleKelasInForm = (kelasId: string) => {
    setFormData((prev) => {
      const exists = prev.kelasIds.includes(kelasId);
      const nextKelasIds = exists
        ? prev.kelasIds.filter((id) => id !== kelasId)
        : [...prev.kelasIds, kelasId];
      return { ...prev, kelasIds: nextKelasIds };
    });
  };

  // Quick selection helpers
  const handleSelectAllKelasInForm = () => {
    setFormData((prev) => ({
      ...prev,
      kelasIds: masterKelasList.map((k) => k.id),
    }));
  };

  const handleClearAllKelasInForm = () => {
    setFormData((prev) => ({
      ...prev,
      kelasIds: [],
    }));
  };

  const handleSelectKelasByGrade = (gradePrefix: string) => {
    const matchingIds = masterKelasList
      .filter((k) => k.nama.toUpperCase().startsWith(gradePrefix))
      .map((k) => k.id);
    setFormData((prev) => {
      const combined = Array.from(new Set([...prev.kelasIds, ...matchingIds]));
      return { ...prev, kelasIds: combined };
    });
  };

  // Save Form (Tambah / Edit Mapel & Kelas)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.namaMapel.trim()) {
      onShowToast('Nama Mata Pelajaran wajib diisi!', 'error');
      return;
    }

    if (formData.kelasIds.length === 0) {
      onShowToast('Pilih minimal 1 kelas untuk disatukan dengan mapel ini!', 'warning');
      return;
    }

    const targetGuru = allTeachers.find((t) => t.id === formData.guruId) || activeTeacher;
    if (!targetGuru) {
      onShowToast('Pilih guru pengampu yang valid!', 'error');
      return;
    }

    const finalKodeMapel = (formData.kodeMapel.trim() || formData.namaMapel.trim().slice(0, 8)).toUpperCase();

    let updatedList: GuruMapelKelasItem[];
    let dataWithAudit = appData;

    if (editingItemId) {
      // Update existing item
      updatedList = allMapelKelasList.map((item) => {
        if (item.id === editingItemId) {
          return {
            ...item,
            guruId: targetGuru.id,
            guruUsername: targetGuru.username,
            guruNama: targetGuru.nama,
            guruNip: targetGuru.nip,
            kodeMapel: finalKodeMapel,
            namaMapel: cleanMapelName(formData.namaMapel.trim()),
            kategori: formData.kategori,
            tingkat: formData.tingkat,
            alokasiJp: Number(formData.alokasiJp) || 4,
            kkm: Number(formData.kkm) || 75,
            deskripsi: formData.deskripsi.trim(),
            kelasIds: formData.kelasIds,
            catatan: formData.catatan.trim(),
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      });

      dataWithAudit = addAuditLog(
        appData,
        'Edit Mapel & Kelas Guru',
        `Memperbarui mapel ${formData.namaMapel} dengan ${formData.kelasIds.length} kelas untuk guru ${targetGuru.nama}`
      );
      onShowToast(`Berhasil memperbarui Mapel "${formData.namaMapel}"!`, 'success');
    } else {
      // Add new item
      const newItem: GuruMapelKelasItem = {
        id: `GMK_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        guruId: targetGuru.id,
        guruUsername: targetGuru.username,
        guruNama: targetGuru.nama,
        guruNip: targetGuru.nip,
        kodeMapel: finalKodeMapel,
        namaMapel: cleanMapelName(formData.namaMapel.trim()),
        kategori: formData.kategori,
        tingkat: formData.tingkat,
        alokasiJp: Number(formData.alokasiJp) || 4,
        kkm: Number(formData.kkm) || 75,
        deskripsi: formData.deskripsi.trim(),
        kelasIds: formData.kelasIds,
        catatan: formData.catatan.trim(),
        createdAt: new Date().toISOString(),
      };

      updatedList = [newItem, ...allMapelKelasList];

      dataWithAudit = addAuditLog(
        appData,
        'Tambah Mapel & Kelas Guru',
        `Menambahkan mapel baru ${formData.namaMapel} dengan ${formData.kelasIds.length} kelas untuk guru ${targetGuru.nama}`
      );
      onShowToast(`Berhasil menambahkan Mapel "${formData.namaMapel}" dengan ${formData.kelasIds.length} kelas!`, 'success');
    }

    // Also synchronize to teacher's mapelAjar array
    const updatedWaliKelas = (appData.waliKelas || []).map((w) => {
      if (w.id === targetGuru.id) {
        const teacherItems = updatedList.filter((item) => item.guruId === w.id);
        return {
          ...w,
          mapelAjar: teacherItems,
        };
      }
      return w;
    });

    onUpdateAppData({
      ...dataWithAudit,
      guruMapelKelas: updatedList,
      waliKelas: updatedWaliKelas,
    });

    setIsFormOpen(false);
  };

  // Delete Subject & its paired classes
  const handleDeleteMapel = (item: GuruMapelKelasItem) => {
    onConfirmModal(
      'Hapus Mata Pelajaran & Kelas Ajar',
      `Apakah Anda yakin ingin menghapus mapel "${item.namaMapel}" (${item.kodeMapel}) beserta tautan ${item.kelasIds.length} kelasnya?`,
      'danger',
      () => {
        const updatedList = allMapelKelasList.filter((m) => m.id !== item.id);
        const updatedWaliKelas = (appData.waliKelas || []).map((w) => {
          if (w.id === item.guruId) {
            const teacherItems = updatedList.filter((i) => i.guruId === w.id);
            return {
              ...w,
              mapelAjar: teacherItems,
            };
          }
          return w;
        });

        const dataWithAudit = addAuditLog(
          appData,
          'Hapus Mapel & Kelas Guru',
          `Menghapus mapel ${item.namaMapel} dari guru ${item.guruNama || item.guruId}`
        );

        onUpdateAppData({
          ...dataWithAudit,
          guruMapelKelas: updatedList,
          waliKelas: updatedWaliKelas,
        });

        onShowToast(`Mapel "${item.namaMapel}" berhasil dihapus.`, 'info');
      }
    );
  };

  // Quick Remove Single Class from a Subject
  const handleRemoveClassFromMapel = (item: GuruMapelKelasItem, kelasIdToRemove: string) => {
    const kName = masterKelasList.find((k) => k.id === kelasIdToRemove)?.nama || kelasIdToRemove;
    onConfirmModal(
      'Lepas Kelas dari Mapel',
      `Keluarkan kelas "${kName}" dari mata pelajaran "${item.namaMapel}"?`,
      'warning',
      () => {
        const updatedKelasIds = (item.kelasIds || []).filter((cId) => cId !== kelasIdToRemove);
        const updatedList = allMapelKelasList.map((m) => {
          if (m.id === item.id) {
            return { ...m, kelasIds: updatedKelasIds, updatedAt: new Date().toISOString() };
          }
          return m;
        });

        onUpdateAppData({
          ...appData,
          guruMapelKelas: updatedList,
        });

        onShowToast(`Kelas ${kName} berhasil dilepas dari ${item.namaMapel}.`, 'info');
      }
    );
  };

  // Quick Add Classes Modal
  const handleOpenQuickAddModal = (item: GuruMapelKelasItem) => {
    setQuickAddModalItem(item);
    setQuickSelectedKelasIds([...(item.kelasIds || [])]);
  };

  const handleSaveQuickAddModal = () => {
    if (!quickAddModalItem) return;

    if (quickSelectedKelasIds.length === 0) {
      onShowToast('Pilih minimal 1 kelas untuk mapel ini!', 'warning');
      return;
    }

    const updatedList = allMapelKelasList.map((m) => {
      if (m.id === quickAddModalItem.id) {
        return {
          ...m,
          kelasIds: quickSelectedKelasIds,
          updatedAt: new Date().toISOString(),
        };
      }
      return m;
    });

    onUpdateAppData({
      ...appData,
      guruMapelKelas: updatedList,
    });

    onShowToast(
      `Daftar kelas untuk "${quickAddModalItem.namaMapel}" berhasil diperbarui (${quickSelectedKelasIds.length} kelas)!`,
      'success'
    );
    setQuickAddModalItem(null);
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const rows = teacherMapelList.map((m, idx) => {
        const kelasNames = (m.kelasIds || [])
          .map((cId) => masterKelasList.find((k) => k.id === cId)?.nama || cId)
          .join(', ');
        const totalSiswa = masterSiswaList.filter((s) => (m.kelasIds || []).includes(s.kelasId)).length;

        const jpPerClass = getMapelJp(m);
        const numClasses = m.kelasIds?.length || 0;
        const totalJpWeek = jpPerClass * numClasses;

        return {
          No: idx + 1,
          'Nama Guru': m.guruNama || activeTeacher?.nama || '-',
          'NIP Guru': m.guruNip || activeTeacher?.nip || '-',
          'Kode Mapel': m.kodeMapel,
          'Mata Pelajaran': m.namaMapel,
          Kategori: m.kategori || '-',
          Tingkat: m.tingkat || 'Semua Tingkat',
          'Alokasi JP / Kelas (Kurikulum)': jpPerClass,
          'Jumlah Kelas Diajar': numClasses,
          'Total Beban JP / Minggu': totalJpWeek,
          KKM: m.kkm || 75,
          'Daftar Kelas': kelasNames,
          'Total Siswa': totalSiswa,
          Catatan: m.catatan || '-',
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Mapel & Kelas Ajar');

      const teacherNameSafe = (activeTeacher?.nama || 'Guru').replace(/[^a-zA-Z0-9]/g, '_');
      XLSX.writeFile(wb, `Mapel_dan_Kelas_Ajar_${teacherNameSafe}.xlsx`);
      onShowToast('File Excel berhasil diekspor!', 'success');
    } catch (e) {
      onShowToast('Gagal mengekspor file Excel.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        icon={Layers}
        title="Kelola Mata Pelajaran & Kelas Ajar"
        description="Atur daftar mata pelajaran yang diampu dan satukan tiap mapel dengan 1 atau beberapa kelas yang diajar."
        badge={
          activeTeacher
            ? `Akun Guru: ${activeTeacher.nama}`
            : selectedTeacherId === 'all'
            ? 'Semua Guru'
            : 'Akun Guru'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 shadow-xs transition cursor-pointer"
              title="Unduh data mapel & kelas ke format Excel"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export Excel</span>
            </button>

            {!readOnly && (
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Mapel &amp; Kelas</span>
              </button>
            )}
          </div>
        }
      />

      {/* 2. Teacher Context & Switcher Bar (Visible for Admin/Kurikulum or Teacher Profile Overview) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-lg shadow-xs shrink-0">
              {activeTeacher ? activeTeacher.nama.charAt(0) : <Users className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {activeTeacher ? activeTeacher.nama : 'Ringkasan Seluruh Guru'}
                </h2>
                {activeTeacher?.role && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {activeTeacher.role === 'wali' ? 'Wali Kelas & Guru' : 'Guru Pengajar'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeTeacher
                  ? `NIP: ${activeTeacher.nip || '-'}`
                  : `Menampilkan total ${allMapelKelasList.length} penugasan mapel dari seluruh guru`}
              </p>
            </div>
          </div>

          {/* Teacher Selector for Admin / Kurikulum */}
          {(isAdmin || isKurikulum) && (
            <div className="flex items-center gap-2 self-start md:self-auto w-full md:w-auto">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Pilih Guru:
              </span>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="flex-1 md:w-64 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              >
                <option value="all">-- Semua Guru (Seluruh Data) --</option>
                {allTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama} {t.nip ? `(${t.nip})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 3. Summary Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span>Total Mapel</span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
              {stats.totalMapel}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">Mapel</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <DoorOpen className="w-3.5 h-3.5 text-blue-500" />
              <span>Kelas Diajar</span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
              {stats.totalKelas}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">Kelas</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Beban JP / Minggu</span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 flex items-baseline gap-1">
              <span>{stats.totalJp}</span>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">JP/Minggu</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5" title="Total alokasi jam pelajaran mengacu pada kurikulum mata pelajaran dikali jumlah kelas diajar">
              {stats.totalMapel} Mapel • {stats.totalRombelTercatat} Rombel Diajar
            </p>
          </div>
        </div>
      </div>

      {/* 5. Subject Cards List ("Pisahkan tiap mapel berikut kelasnya. Satukan mapel dan kelasnya tersebut") */}
      {filteredMapelList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200/80 dark:border-slate-800 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Belum Ada Mata Pelajaran &amp; Kelas Ajar
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              {searchQuery
                ? 'Tidak ditemukan mapel atau kelas yang sesuai dengan kata kunci pencarian Anda.'
                : 'Mata pelajaran yang Anda ampu belum ditambahkan. Klik tombol di bawah untuk menambahkan mapel dan menentukan kelas binaannya.'}
            </p>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenAddForm}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Mapel &amp; Kelas Sekarang</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredMapelList.map((mapelItem, mapelIdx) => {
            const assignedClasses = masterKelasList.filter((k) =>
              (mapelItem.kelasIds || []).includes(k.id)
            );
            const totalSiswaInMapel = masterSiswaList.filter((s) =>
              (mapelItem.kelasIds || []).includes(s.kelasId)
            ).length;

            // Unassigned classes available to add to this subject
            const unassignedClasses = masterKelasList.filter(
              (k) => !(mapelItem.kelasIds || []).includes(k.id)
            );

            const isExpanded = searchQuery.trim()
              ? expandedMapelIds[mapelItem.id] !== false
              : !!expandedMapelIds[mapelItem.id];

            const jpPerClass = getMapelJp(mapelItem);
            const totalJpMapel = jpPerClass * assignedClasses.length;

            return (
              <div
                key={mapelItem.id}
                className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition hover:border-emerald-500/40 dark:hover:border-emerald-500/30"
              >
                {/* Subject Header Banner (Click to toggle accordion) */}
                <div
                  onClick={() => toggleAccordion(mapelItem.id)}
                  className={`p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-800/70 dark:via-slate-900 dark:to-slate-800/70 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none transition group/header ${
                    isExpanded ? 'border-b border-slate-200/80 dark:border-slate-800' : ''
                  } hover:bg-slate-100/60 dark:hover:bg-slate-800/80`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 border border-emerald-500/20 group-hover/header:bg-emerald-500 group-hover/header:text-white transition-colors">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {mapelItem.kodeMapel}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                          {mapelItem.namaMapel}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                        {mapelItem.kategori && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {mapelItem.kategori}
                          </span>
                        )}
                        {mapelItem.tingkat && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Tingkat: {mapelItem.tingkat}
                          </span>
                        )}
                        <span
                          className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200/80 dark:border-amber-800/60"
                          title={`Mengacu pada alokasi jam di kurikulum mata pelajaran: ${jpPerClass} JP / rombel per minggu`}
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{jpPerClass} JP / Kelas</span>
                        </span>
                        <span
                          className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/60"
                          title={`Total jam mengajar per minggu untuk mapel ini: ${assignedClasses.length} kelas × ${jpPerClass} JP = ${totalJpMapel} JP / minggu`}
                        >
                          <span>Total {totalJpMapel} JP / Minggu</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Award className="w-3.5 h-3.5 text-emerald-500" />
                          <span>KKM: {mapelItem.kkm || 75}</span>
                        </span>
                        {selectedTeacherId === 'all' && mapelItem.guruNama && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Guru: {mapelItem.guruNama}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Accordion Toggle */}
                  <div
                    className="flex items-center gap-2 self-end md:self-auto shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Accordion Toggle Pill Button */}
                    <button
                      type="button"
                      onClick={() => toggleAccordion(mapelItem.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                        isExpanded
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                      }`}
                      title={isExpanded ? 'Klik untuk menutup daftar kelas' : 'Klik untuk melihat daftar kelas'}
                    >
                      <span>{assignedClasses.length} Kelas • {totalJpMapel} JP</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {!readOnly && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenQuickAddModal(mapelItem)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                          title="Tambah atau ubah kelas yang mengikuti mapel ini"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Atur Kelas</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditForm(mapelItem)}
                          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs transition cursor-pointer"
                          title="Edit detail mata pelajaran"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMapel(mapelItem)}
                          className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 shadow-xs transition cursor-pointer"
                          title="Hapus mata pelajaran ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Subject Body: Accordion Content (Classes Grid) */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-slate-50/40 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <DoorOpen className="w-4 h-4 text-emerald-500" />
                        <span>
                          Daftar Kelas yang Mengikuti Mapel Ini ({assignedClasses.length} Kelas • Total {totalJpMapel} JP/Minggu)
                        </span>
                      </div>

                      {assignedClasses.length > 0 && !readOnly && (
                        <button
                          type="button"
                          onClick={() => handleOpenQuickAddModal(mapelItem)}
                          className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Kelas ke Mapel Ini</span>
                        </button>
                      )}
                    </div>

                    {assignedClasses.length === 0 ? (
                      <div className="bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl p-6 border border-dashed border-amber-200 dark:border-amber-800/80 text-center space-y-2">
                        <DoorOpen className="w-8 h-8 text-amber-500 mx-auto" />
                        <div className="text-xs font-bold text-amber-800 dark:text-amber-200">
                          Belum ada kelas yang disatukan dengan mapel ini
                        </div>
                        <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 max-w-sm mx-auto">
                          Tiap mapel harus terdiri dari 1 atau beberapa kelas. Klik tombol di bawah untuk memilih kelas.
                        </p>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleOpenQuickAddModal(mapelItem)}
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Pilih Kelas untuk Mapel Ini</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {assignedClasses.map((kelasItem) => {
                          return (
                            <div
                              key={kelasItem.id}
                              className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between gap-3 hover:border-emerald-500/50 transition group"
                            >
                              <div className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                                {kelasItem.nama}
                              </div>

                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveClassFromMapel(mapelItem, kelasItem.id)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer shrink-0"
                                  title="Keluarkan kelas ini dari mapel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Deskripsi atau catatan silabus jika ada */}
                    {mapelItem.deskripsi && (
                      <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold not-italic">Catatan Materi: </span>
                        {mapelItem.deskripsi}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 6. MODAL: Tambah / Edit Mapel & Kelas */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingItemId ? 'Edit Mapel & Kelas Ajar' : 'Tambah Mapel & Kelas Ajar'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tiap mapel terdiri dari 1 atau beberapa kelas yang disatukan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Teacher Selector (if multiple teachers available & user is admin) */}
              {(isAdmin || isKurikulum) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Guru Pengampu:
                  </label>
                  <select
                    value={formData.guruId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, guruId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    {allTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nama} {t.nip ? `(${t.nip})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Source Tab: Pilih dari Katalog vs Input Manual */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pilihan Mata Pelajaran:
                  </label>
                  <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFormSource('katalog')}
                      className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                        formSource === 'katalog'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Pilih dari Katalog Sekolah
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormSource('manual')}
                      className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                        formSource === 'manual'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Ketik Manual / Baru
                    </button>
                  </div>
                </div>

                {formSource === 'katalog' ? (
                  <div className="space-y-2">
                    <select
                      value={selectedCatalogMapelId}
                      onChange={(e) => handleCatalogMapelChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                    >
                      <option value="">-- Pilih Mata Pelajaran Sekolah --</option>
                      {masterMapelList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nama} ({m.kategori || 'Umum'})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Memilih dari katalog mata pelajaran kurikulum sekolah.
                    </p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={formData.namaMapel}
                      onChange={(e) => setFormData((prev) => ({ ...prev, namaMapel: e.target.value }))}
                      placeholder="Nama Mata Pelajaran (Contoh: Pemrograman Web Lanjut)"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                      required
                    />
                  </div>
                )}
              </div>

              {/* CORE REQUIREMENT: Multi-Select Kelas ("Tiap mapel terdiri dari 1 atau beberapa kelas. Satukan mapel dan kelasnya tersebut") */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <DoorOpen className="w-4 h-4 text-emerald-500" />
                      <span>Satukan Kelas ke Mapel Ini ({formData.kelasIds.length} Dipilih)</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Centang 1 atau beberapa kelas yang mengikuti mapel ini.
                    </p>
                  </div>

                  {/* Fast selection shortcuts */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSelectKelasByGrade('X ')}
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      + Semua X
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectKelasByGrade('XI ')}
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      + Semua XI
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectKelasByGrade('XII ')}
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      + Semua XII
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllKelasInForm}
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllKelasInForm}
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Checklist of available classes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  {masterKelasList.map((k) => {
                    const isChecked = formData.kelasIds.includes(k.id);

                    return (
                      <label
                        key={k.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                          isChecked
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleKelasInForm(k.id)}
                          className="w-4 h-4 rounded-md text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-xs truncate leading-tight">
                            {k.nama}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {formData.kelasIds.length > 0 && (
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                    <span className="font-bold">Kelas Terpilih: </span>
                    {formData.kelasIds
                      .map((id) => masterKelasList.find((k) => k.id === id)?.nama || id)
                      .join(', ')}
                  </div>
                )}
              </div>

              {/* Alokasi JP & Beban Jam Mingguan (Mengacu pada Jam di Mata Pelajaran) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Alokasi Jam Pelajaran (JP):</span>
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={formData.alokasiJp}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          alokasiJp: Math.max(1, Number(e.target.value) || 1),
                        }))
                      }
                      className="w-24 px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      JP / Rombel
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-800/90 dark:text-amber-300/90 mt-1">
                    Mengacu pada kurikulum mata pelajaran.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Total Beban JP / Minggu:</span>
                  </label>
                  <div className="p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-amber-200/60 dark:border-amber-800/50">
                    <div className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                      {(formData.alokasiJp || 4) * (formData.kelasIds.length || 0)} JP / Minggu
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {formData.kelasIds.length} kelas × {formData.alokasiJp || 4} JP
                    </div>
                  </div>
                </div>
              </div>

              {/* Catatan / Keterangan opsional */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Keterangan Silabus (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={formData.catatan}
                  onChange={(e) => setFormData((prev) => ({ ...prev, catatan: e.target.value }))}
                  placeholder="Catatan tambahan seperti jam praktikum, ruang lab, atau materi khusus..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingItemId ? 'Simpan Perubahan' : 'Satukan & Simpan Mapel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: Atur / Quick Add Kelas to Specific Subject */}
      {quickAddModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-800/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Atur Kelas untuk {quickAddModalItem.namaMapel}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Centang kelas yang mengikuti mata pelajaran ini
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddModalItem(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Daftar Kelas Sekolah:
                </span>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setQuickSelectedKelasIds(masterKelasList.map((k) => k.id))}
                    className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSelectedKelasIds([])}
                    className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold cursor-pointer"
                  >
                    Hapus Semua
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                {masterKelasList.map((k) => {
                  const isChecked = quickSelectedKelasIds.includes(k.id);

                  return (
                    <label
                      key={k.id}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                        isChecked
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setQuickSelectedKelasIds((prev) =>
                            prev.includes(k.id)
                              ? prev.filter((id) => id !== k.id)
                              : [...prev, k.id]
                          );
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-xs truncate leading-tight">
                          {k.nama}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {quickSelectedKelasIds.length} Kelas Terpilih:{' '}
                </span>
                {quickSelectedKelasIds
                  .map((id) => masterKelasList.find((k) => k.id === id)?.nama || id)
                  .join(', ') || 'Belum ada kelas dipilih'}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setQuickAddModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveQuickAddModal}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Perubahan Kelas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: Roster Siswa Kelas */}
      {studentRosterKelas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Daftar Siswa {studentRosterKelas.nama}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Total {masterSiswaList.filter((s) => s.kelasId === studentRosterKelas.id).length} Siswa Terdaftar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudentRosterKelas(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Cari nama atau NISN siswa..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 dark:divide-slate-800">
              {masterSiswaList
                .filter((s) => s.kelasId === studentRosterKelas.id)
                .filter((s) => {
                  const q = rosterSearch.toLowerCase();
                  return !q || s.nama.toLowerCase().includes(q) || s.nisn.includes(q);
                })
                .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }))
                .map((siswa, sIdx) => (
                  <div key={siswa.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[11px] font-mono font-bold text-slate-400 w-6 text-right shrink-0">
                        {sIdx + 1}.
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {siswa.nama}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          NISN: {siswa.nisn || '-'} • Gender: {siswa.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        siswa.gender === 'L'
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : 'bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300'
                      }`}
                    >
                      {siswa.gender}
                    </span>
                  </div>
                ))}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-right shrink-0">
              <button
                type="button"
                onClick={() => setStudentRosterKelas(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer"
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
