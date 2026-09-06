import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AppData,
  UserSession,
  Pelanggaran,
  PelanggaranKategori,
  Siswa,
  Kelas,
  ViolationTemplate
} from '../../types';
import {
  AlertTriangle,
  ShieldAlert,
  Plus,
  Search,
  Printer,
  Edit3,
  Trash2,
  Eye,
  FileText,
  CheckCircle2,
  Clock,
  Calendar,
  X,
  Filter,
  Camera,
  Image as ImageIcon,
  School,
  Download,
  Award,
  UserX,
  AlertCircle
} from 'lucide-react';
import { getTodayString, sortKelasList, DEFAULT_VIOLATION_TEMPLATES } from '../../data/initialData';
import { compressBase64Image } from '../../utils/helpers';
import { PageHeader } from '../common/UIComponents';

interface PelanggaranViewProps {
  appData: AppData;
  currentUser: UserSession;
  onUpdateAppData: (newAppData: AppData) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onConfirmModal?: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
}

export const PelanggaranView: React.FC<PelanggaranViewProps> = ({
  appData,
  currentUser,
  onUpdateAppData,
  onShowToast,
  onConfirmModal,
}) => {
  const pelanggaranList = appData.pelanggaran || [];
  const sortedKelas = useMemo(() => sortKelasList(appData.kelas || []), [appData.kelas]);
  const siswaList = appData.siswa || [];
  const sekolah = appData.sekolah;

  const isAdmin = currentUser.role === 'admin';
  const isKesiswaan = currentUser.role === 'kesiswaan';
  const isWali = currentUser.role === 'wali';
  const isGuru = currentUser.role === 'guru' || currentUser.role === 'user';
  const isMurid = currentUser.role === 'murid';

  const isGuruOnly = (currentUser.role === 'guru' || currentUser.role === 'user') && !isAdmin && !isKesiswaan && !isWali;
  const currentNama = (currentUser.data as any)?.nama?.trim() || '';
  const currentUsername = String((currentUser.data as any)?.username || (currentUser.data as any)?.nip || '').trim().toLowerCase();

  const canEdit = isAdmin || isKesiswaan || isWali || isGuru;

  // Filter available classes according to user role
  const availableClasses = useMemo(() => {
    if (isWali) {
      return sortedKelas.filter((k) => k.waliKelasId === (currentUser.data as any).id);
    }
    return sortedKelas;
  }, [sortedKelas, currentUser, isWali]);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    if (isWali && availableClasses.length > 0) {
      return availableClasses[0].id;
    }
    return 'all';
  });
  const [selectedKategori, setSelectedKategori] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'daftar' | 'akumulasi' | 'statistik'>('daftar');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Pelanggaran | null>(null);
  const [viewingItem, setViewingItem] = useState<Pelanggaran | null>(null);
  const [printItem, setPrintItem] = useState<Pelanggaran | null>(null);

  const violationTemplates = appData.violationTemplates && appData.violationTemplates.length > 0
    ? appData.violationTemplates
    : DEFAULT_VIOLATION_TEMPLATES;

  // Template management modal states
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ViolationTemplate | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplKategori, setTplKategori] = useState<PelanggaranKategori>('ringan');
  const [tplPoin, setTplPoin] = useState<number>(5);
  const [tplTindakan, setTplTindakan] = useState('');

  // Form states
  const [formKelasId, setFormKelasId] = useState<string>('');
  const [formSiswaId, setFormSiswaId] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState<string>(getTodayString());
  const [formKategori, setFormKategori] = useState<PelanggaranKategori>('ringan');
  const [formNamaPelanggaran, setFormNamaPelanggaran] = useState<string>('');
  const [formPoin, setFormPoin] = useState<number>(5);
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formPelapor, setFormPelapor] = useState<string>(
    currentUser.data?.nama || 'Tim Ketertiban Sekolah'
  );
  const [formTindakLanjut, setFormTindakLanjut] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'proses' | 'selesai' | 'perlu_tindak_lanjut'>('proses');
  const [formFoto, setFormFoto] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const startCameraStream = async (mode: 'environment' | 'user' = facingMode) => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraModalOpen(true);
      setFacingMode(mode);
    } catch (err) {
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        onShowToast('Gagal mengakses kamera. Pilih file dari perangkat.', 'error');
      }
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setIsCameraModalOpen(false);
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCameraStream(nextMode);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const raw = canvas.toDataURL('image/jpeg', 0.85);
      const compressed = await compressBase64Image(raw, 800, 0.8);
      setFormFoto(compressed);
      onShowToast('Foto bukti pelanggaran berhasil diambil!', 'success');
    }
    stopCameraStream();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowToast('File harus berupa gambar (JPG, PNG, WEBP)', 'error');
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const raw = ev.target?.result as string;
        if (raw) {
          const compressed = await compressBase64Image(raw, 800, 0.8);
          setFormFoto(compressed);
          onShowToast('Foto bukti berhasil diunggah!', 'success');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      onShowToast('Gagal memproses file foto.', 'error');
    }
  };

  const handleSelectPreset = (preset: ViolationTemplate) => {
    setFormNamaPelanggaran(preset.name);
    setFormKategori(preset.kategori);
    setFormPoin(preset.poin);
    setFormTindakLanjut(preset.tindakan);
  };

  const handleOpenAddTemplate = () => {
    setEditingTemplate(null);
    setTplName('');
    setTplKategori('ringan');
    setTplPoin(5);
    setTplTindakan('');
  };

  const handleOpenEditTemplate = (tpl: ViolationTemplate) => {
    setEditingTemplate(tpl);
    setTplName(tpl.name);
    setTplKategori(tpl.kategori);
    setTplPoin(tpl.poin);
    setTplTindakan(tpl.tindakan);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim()) {
      onShowToast('Bentuk/nama pelanggaran wajib diisi.', 'warning');
      return;
    }
    const currentTemplates = appData.violationTemplates && appData.violationTemplates.length > 0
      ? [...appData.violationTemplates]
      : [...DEFAULT_VIOLATION_TEMPLATES];

    if (editingTemplate) {
      const updated = currentTemplates.map(t => t.id === editingTemplate.id ? {
        ...t,
        name: tplName.trim(),
        kategori: tplKategori,
        poin: Number(tplPoin),
        tindakan: tplTindakan.trim()
      } : t);
      onUpdateAppData({ ...appData, violationTemplates: updated });
      onShowToast('Jenis pelanggaran berhasil diperbarui!', 'success');
    } else {
      const newTpl: ViolationTemplate = {
        id: 'TMP_' + Date.now(),
        name: tplName.trim(),
        kategori: tplKategori,
        poin: Number(tplPoin),
        tindakan: tplTindakan.trim()
      };
      onUpdateAppData({ ...appData, violationTemplates: [...currentTemplates, newTpl] });
      onShowToast('Jenis pelanggaran baru berhasil ditambahkan!', 'success');
    }
    setEditingTemplate(null);
    setTplName('');
    setTplPoin(5);
    setTplTindakan('');
  };

  const handleDeleteTemplate = (id: string) => {
    if (onConfirmModal) {
      onConfirmModal(
        'Hapus Jenis Pelanggaran',
        'Apakah Anda yakin ingin menghapus jenis pelanggaran ini dari daftar template?',
        'danger',
        () => {
          const currentTemplates = appData.violationTemplates && appData.violationTemplates.length > 0
            ? [...appData.violationTemplates]
            : [...DEFAULT_VIOLATION_TEMPLATES];
          const filtered = currentTemplates.filter(t => t.id !== id);
          onUpdateAppData({ ...appData, violationTemplates: filtered });
          onShowToast('Jenis pelanggaran berhasil dihapus.', 'success');
        }
      );
    }
  };

  const openAddModal = () => {
    if (!canEdit) {
      onShowToast('Akses dibatasi. Anda tidak memiliki izin mencatat pelanggaran.', 'warning');
      return;
    }
    setEditingItem(null);
    setFormKelasId(availableClasses[0]?.id || sortedKelas[0]?.id || '');
    setFormSiswaId('');
    setFormTanggal(getTodayString());
    setFormKategori('ringan');
    setFormNamaPelanggaran('');
    setFormPoin(5);
    setFormKeterangan('');
    setFormPelapor(currentUser.data?.nama || 'Tim Ketertiban');
    setFormTindakLanjut('Peringatan lisan & pembinaan');
    setFormStatus('proses');
    setFormFoto('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Pelanggaran) => {
    if (!canEdit) {
      onShowToast('Akses dibatasi.', 'warning');
      return;
    }
    setEditingItem(item);
    setFormKelasId(item.kelasId);
    setFormSiswaId(item.siswaId);
    setFormTanggal(item.tanggal);
    setFormKategori(item.kategori);
    setFormNamaPelanggaran(item.namaPelanggaran);
    setFormPoin(item.poin);
    setFormKeterangan(item.keterangan);
    setFormPelapor(item.pelapor);
    setFormTindakLanjut(item.tindakan);
    setFormStatus(item.status);
    setFormFoto(item.foto || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSiswaId || !formNamaPelanggaran.trim()) {
      onShowToast('Mohon pilih siswa dan isi nama pelanggaran!', 'error');
      return;
    }

    const newItem: Pelanggaran = {
      id: editingItem ? editingItem.id : `PLG_${Date.now()}`,
      tanggal: formTanggal,
      siswaId: formSiswaId,
      kelasId: formKelasId,
      kategori: formKategori,
      namaPelanggaran: formNamaPelanggaran.trim(),
      poin: Number(formPoin) || 5,
      keterangan: formKeterangan.trim(),
      pelapor: formPelapor.trim(),
      tindakan: formTindakLanjut.trim(),
      status: formStatus,
      foto: formFoto || undefined,
      createdAt: editingItem ? editingItem.createdAt : getTodayString(),
    };

    const updated = editingItem
      ? pelanggaranList.map((p) => (p.id === editingItem.id ? newItem : p))
      : [newItem, ...pelanggaranList];

    onUpdateAppData({
      ...appData,
      pelanggaran: updated,
    });

    if (!editingItem) {
      setSelectedKelasId(formKelasId || 'all');
      setSearchTerm('');
      setSelectedKategori('all');
      setSelectedStatus('all');
    }

    onShowToast(
      editingItem ? 'Catatan pelanggaran berhasil diperbarui!' : 'Catatan pelanggaran baru berhasil ditambahkan!',
      'success'
    );
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!canEdit) {
      onShowToast('Akses dibatasi.', 'warning');
      return;
    }
    const executeDelete = () => {
      const updated = pelanggaranList.filter((p) => p.id !== id);
      const deletedIds = Array.from(new Set([...(appData.deletedPelanggaranIds || []), id]));
      onUpdateAppData({ ...appData, pelanggaran: updated, deletedPelanggaranIds: deletedIds });
      onShowToast('Catatan pelanggaran berhasil dihapus.', 'info');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Hapus Catatan Pelanggaran',
        'Apakah Anda yakin ingin menghapus catatan pelanggaran ini? Tindakan ini tidak dapat dibatalkan.',
        'danger',
        executeDelete
      );
    } else if (window.confirm('Apakah Anda yakin ingin menghapus catatan pelanggaran ini?')) {
      executeDelete();
    }
  };

  // Helper to check if current teacher recorded this violation
  const isReporter = (p: Pelanggaran) => {
    if (!currentNama && !currentUsername) return false;
    const pelaporStr = (p.pelapor || '').trim().toLowerCase();
    if (!pelaporStr) return false;
    if (currentNama && (pelaporStr === currentNama.toLowerCase() || pelaporStr.includes(currentNama.toLowerCase()))) {
      return true;
    }
    if (currentUsername && pelaporStr.includes(currentUsername)) {
      return true;
    }
    return false;
  };

  // Filtered list for display according to user roles:
  // - Admin & Kesiswaan: Semua catatan pelanggaran
  // - Wali Kelas: Catatan siswa di kelas binaannya (+ catatan yang dicatat oleh guru tersebut jika ada)
  // - Guru Pengajar / Biasa: Catatan pelanggaran yang dicatat / dilaporkan oleh guru tersebut
  // - Murid: Catatan pelanggaran miliknya sendiri
  const scopePelanggaranList = useMemo(() => {
    if (isMurid) {
      const studentId = (currentUser.data as any)?.id;
      return pelanggaranList.filter((p) => p.siswaId === studentId);
    }
    if (isAdmin || isKesiswaan) {
      return pelanggaranList;
    }
    if (isWali) {
      const waliClassIds = availableClasses.map((k) => k.id);
      return pelanggaranList.filter((p) => waliClassIds.includes(p.kelasId) || isReporter(p));
    }
    if (isGuruOnly) {
      return pelanggaranList.filter((p) => isReporter(p));
    }
    return pelanggaranList;
  }, [pelanggaranList, isMurid, isAdmin, isKesiswaan, isWali, isGuruOnly, currentUser, availableClasses, currentNama, currentUsername]);

  const filteredList = useMemo(() => {
    let list = scopePelanggaranList;

    if (!isMurid) {
      if (selectedKelasId !== 'all') {
        list = list.filter((p) => p.kelasId === selectedKelasId);
      }
      if (selectedKategori !== 'all') {
        list = list.filter((p) => p.kategori === selectedKategori);
      }
      if (selectedStatus !== 'all') {
        list = list.filter((p) => p.status === selectedStatus);
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((p) => {
        const siswa = siswaList.find((s) => s.id === p.siswaId);
        const siswaName = siswa?.nama?.toLowerCase() || '';
        const nisn = siswa?.nisn?.toLowerCase() || '';
        const namaPlg = p.namaPelanggaran.toLowerCase();
        const ket = p.keterangan.toLowerCase();
        const pelapor = (p.pelapor || '').toLowerCase();
        return (
          siswaName.includes(term) ||
          nisn.includes(term) ||
          namaPlg.includes(term) ||
          ket.includes(term) ||
          pelapor.includes(term)
        );
      });
    }

    return [...list].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [scopePelanggaranList, isMurid, selectedKelasId, selectedKategori, selectedStatus, searchTerm, siswaList]);

  // Accumulated points per student
  const studentPointsSummary = useMemo(() => {
    const map: Record<string, { siswa: Siswa; totalPoin: number; totalKasus: number; kategoriCounts: Record<string, number> }> = {};

    scopePelanggaranList.forEach((p) => {
      const siswa = siswaList.find((s) => s.id === p.siswaId);
      if (!siswa) return;
      if (!map[p.siswaId]) {
        map[p.siswaId] = {
          siswa,
          totalPoin: 0,
          totalKasus: 0,
          kategoriCounts: { ringan: 0, sedang: 0, berat: 0, kriminal: 0 },
        };
      }
      map[p.siswaId].totalPoin += p.poin || 0;
      map[p.siswaId].totalKasus += 1;
      if (p.kategori in map[p.siswaId].kategoriCounts) {
        map[p.siswaId].kategoriCounts[p.kategori] += 1;
      }
    });

    let arr = Object.values(map).sort((a, b) => b.totalPoin - a.totalPoin);
    if (selectedKelasId !== 'all') {
      arr = arr.filter((item) => item.siswa.kelasId === selectedKelasId);
    }
    return arr;
  }, [scopePelanggaranList, siswaList, selectedKelasId]);

  const getKategoriBadge = (kategori: PelanggaranKategori) => {
    switch (kategori) {
      case 'ringan':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-bold">Ringan</span>;
      case 'sedang':
        return <span className="px-2 py-0.5 bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-lg text-[10px] font-bold">Sedang</span>;
      case 'berat':
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-[10px] font-bold">Berat</span>;
      case 'kriminal':
        return <span className="px-2 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-[10px] font-bold">Kriminal / Berat</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'selesai':
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg text-[10px] font-bold"><CheckCircle2 className="w-3 h-3" /> Selesai / Dibina</span>;
      case 'perlu_tindak_lanjut':
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-lg text-[10px] font-bold"><AlertCircle className="w-3 h-3" /> Perlu Follow-up</span>;
      case 'proses':
      default:
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-lg text-[10px] font-bold"><Clock className="w-3 h-3" /> Dalam Proses</span>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldAlert}
        title="Catatan Pelanggaran Siswa"
        description="Pencatatan pelanggaran, akumulasi poin tata tertib, dan pembinaan siswa."
        badge="Disiplin & Tata Tertib Siswa"
        actions={
          !isMurid && canEdit ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md font-bold rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer text-xs border border-white/20 active:scale-95"
              >
                <FileText className="w-4 h-4 text-amber-200 shrink-0" />
                <span className="whitespace-nowrap">Kelola Jenis Pelanggaran</span>
              </button>
              <button
                type="button"
                onClick={openAddModal}
                className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer text-xs active:scale-95"
              >
                <Plus className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="whitespace-nowrap">Catat Pelanggaran Baru</span>
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">{isMurid ? 'Total Pelanggaran Anda' : 'Total Catatan Kasus'}</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{scopePelanggaranList.length}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">Kasus Berat / Kriminal</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {scopePelanggaranList.filter((p) => p.kategori === 'berat' || p.kategori === 'kriminal').length}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">Perlu Tindak Lanjut</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {scopePelanggaranList.filter((p) => p.status === 'perlu_tindak_lanjut' || p.status === 'proses').length}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">Selesai Dibina</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {scopePelanggaranList.filter((p) => p.status === 'selesai').length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="grid grid-cols-1 sm:flex sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('daftar')}
              className={`px-4 py-2.5 sm:py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'daftar'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Daftar Pelanggaran ({filteredList.length})</span>
            </button>

            {!isMurid && (
              <button
                type="button"
                onClick={() => setActiveTab('akumulasi')}
                className={`px-4 py-2.5 sm:py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'akumulasi'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Award className="w-4 h-4 shrink-0" />
                <span>Akumulasi Poin Siswa</span>
              </button>
            )}
          </div>

          {!isMurid && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="all">Semua Kelas</option>
                {availableClasses.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>

              {activeTab === 'daftar' && (
                <>
                  <select
                    value={selectedKategori}
                    onChange={(e) => setSelectedKategori(e.target.value)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                  >
                    <option value="all">Semua Kategori</option>
                    <option value="ringan">Ringan</option>
                    <option value="sedang">Sedang</option>
                    <option value="berat">Berat</option>
                    <option value="kriminal">Kriminal / Berat</option>
                  </select>

                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                  >
                    <option value="all">Semua Status</option>
                    <option value="proses">Dalam Proses</option>
                    <option value="perlu_tindak_lanjut">Perlu Follow-up</option>
                    <option value="selesai">Selesai</option>
                  </select>
                </>
              )}
            </div>
          )}
        </div>

        {/* Search Bar */}
        {activeTab === 'daftar' && (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan nama siswa, NISN, bentuk pelanggaran, atau keterangan..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Tab 1: Daftar Pelanggaran */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          {filteredList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Belum ada catatan pelanggaran</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tidak ada data pelanggaran siswa yang sesuai dengan filter atau pencarian saat ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredList.map((item) => {
                const siswa = siswaList.find((s) => s.id === item.siswaId);
                const kelas = sortedKelas.find((k) => k.id === item.kelasId);

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4 relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {siswa?.foto ? (
                            <img src={siswa.foto} alt={siswa.nama} className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-extrabold flex items-center justify-center text-xs shrink-0">
                              {siswa?.nama?.slice(0, 2).toUpperCase() || 'SW'}
                            </div>
                          )}
                          <div>
                            <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {siswa?.nama || 'Siswa Tidak Ditemukan'}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>NISN: {siswa?.nisn || '-'}</span>
                              <span>•</span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">{kelas?.nama || 'Kelas'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {getKategoriBadge(item.kategori)}
                          <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                            +{item.poin} Poin
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{item.namaPelanggaran}</span>
                        </div>
                        {item.keterangan && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                            {item.keterangan}
                          </p>
                        )}
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between text-[10px] text-slate-500 gap-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {item.tanggal}
                          </span>
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            Pelapor: {item.pelapor}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Tindakan:</span> {item.tindakan || '-'}
                        </div>
                        <div>{getStatusBadge(item.status)}</div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {item.foto && (
                          <button
                            type="button"
                            onClick={() => setViewingItem(item)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                            <span>Lihat Bukti Foto</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPrintItem(item)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer"
                          title="Cetak Surat / Catatan Pelanggaran"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {!isMurid && canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="p-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 text-blue-600 rounded-xl transition cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 text-rose-600 rounded-xl transition cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </div>
      )}

      {/* Tab 2: Akumulasi Poin Siswa */}
      {activeTab === 'akumulasi' && !isMurid && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">Rekapitulasi Akumulasi Poin Pelanggaran Siswa</h3>
              <p className="text-xs text-slate-500 mt-0.5">Daftar siswa yang memiliki catatan pelanggaran diurutkan berdasarkan total poin tertinggi.</p>
            </div>
          </div>
          {studentPointsSummary.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Belum ada siswa yang tercatat melakukan pelanggaran.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-4">No</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">NISN</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4 text-center">Total Kasus</th>
                      <th className="py-3 px-4 text-center">Ringan / Sedang / Berat</th>
                      <th className="py-3 px-4 text-center">Akumulasi Poin</th>
                      <th className="py-3 px-4 text-center">Status Peringatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {studentPointsSummary.map((row, idx) => {
                      const kelas = sortedKelas.find((k) => k.id === row.siswa.kelasId);
                      const pts = row.totalPoin;
                      let warningStatus = <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg font-bold">Aman</span>;
                      if (pts >= 100) {
                        warningStatus = <span className="px-2 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded-lg font-bold">Skorsing / Drop Out</span>;
                      } else if (pts >= 75) {
                        warningStatus = <span className="px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-lg font-bold">Panggilan Ortu (SP 3)</span>;
                      } else if (pts >= 50) {
                        warningStatus = <span className="px-2 py-0.5 bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 rounded-lg font-bold">Peringatan Keras (SP 2)</span>;
                      } else if (pts >= 25) {
                        warningStatus = <span className="px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-lg font-bold">Peringatan Ringan (SP 1)</span>;
                      }

                      return (
                        <tr key={row.siswa.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-semibold text-slate-500">{idx + 1}</td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                            {row.siswa.foto && <img src={row.siswa.foto} alt="" className="w-7 h-7 rounded-lg object-cover" />}
                            <span>{row.siswa.nama}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono">{row.siswa.nisn || '-'}</td>
                          <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400">{kelas?.nama || '-'}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">{row.totalKasus}</td>
                          <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-300">
                            {row.kategoriCounts.ringan} / {row.kategoriCounts.sedang} / {row.kategoriCounts.berat + row.kategoriCounts.kriminal}
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-rose-600 dark:text-rose-400 text-sm">
                            {pts} Poin
                          </td>
                          <td className="py-3.5 px-4 text-center">{warningStatus}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Responsive Grid Layout */}
              <div className="block md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                {studentPointsSummary.map((row, idx) => {
                  const kelas = sortedKelas.find((k) => k.id === row.siswa.kelasId);
                  const pts = row.totalPoin;
                  let warningStatus = <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg font-bold">Aman</span>;
                  if (pts >= 100) {
                    warningStatus = <span className="px-2 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded-lg font-bold">Skorsing / Drop Out</span>;
                  } else if (pts >= 75) {
                    warningStatus = <span className="px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-lg font-bold">Panggilan Ortu (SP 3)</span>;
                  } else if (pts >= 50) {
                    warningStatus = <span className="px-2 py-0.5 bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 rounded-lg font-bold">Peringatan Keras (SP 2)</span>;
                  } else if (pts >= 25) {
                    warningStatus = <span className="px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-lg font-bold">Peringatan Ringan (SP 1)</span>;
                  }

                  return (
                    <div 
                      key={row.siswa.id} 
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4 text-xs"
                    >
                      {/* Rank & Student Photo/Name Header */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-400">#{idx + 1}</span>
                          <div className="flex items-center gap-2">
                            {row.siswa.foto && <img src={row.siswa.foto} alt="" className="w-8 h-8 rounded-lg object-cover" />}
                            <div>
                              <div className="font-extrabold text-slate-900 dark:text-white">{row.siswa.nama}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">NISN: {row.siswa.nisn || '-'}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detail Metrics */}
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kelas</div>
                          <div className="font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{kelas?.nama || '-'}</div>
                        </div>

                        <div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Kasus</div>
                          <div className="font-extrabold text-slate-700 dark:text-slate-300 mt-0.5">{row.totalKasus} Kasus</div>
                        </div>

                        <div className="col-span-2">
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tingkat Ringan / Sedang / Berat</div>
                          <div className="font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                            {row.kategoriCounts.ringan} Ringan / {row.kategoriCounts.sedang} Sedang / {row.kategoriCounts.berat + row.kategoriCounts.kriminal} Berat
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Akumulasi Poin</div>
                          <div className="font-black text-rose-600 dark:text-rose-400 mt-0.5 text-sm">{pts} Poin</div>
                        </div>

                        <div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</div>
                          <div className="mt-1 inline-block">{warningStatus}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between card-header-gradient text-white">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-300" />
                <h3 className="font-extrabold text-base">
                  {editingItem ? 'Edit Catatan Pelanggaran' : 'Catat Pelanggaran Siswa Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {!editingItem && (
                <div className="space-y-2 bg-blue-50/60 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-100 dark:border-blue-900">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold text-blue-900 dark:text-blue-200">
                      Pilih Jenis Pelanggaran Cepat (Preset)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsTemplateModalOpen(true)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      + Tambah / Edit Template
                    </button>
                  </div>
                  <select
                    onChange={(e) => {
                      const found = violationTemplates[Number(e.target.value)];
                      if (found) handleSelectPreset(found);
                    }}
                    defaultValue=""
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="" disabled>-- Pilih dari daftar pelanggaran umum --</option>
                    {violationTemplates.map((preset, idx) => (
                      <option key={preset.id || idx} value={idx}>
                        [{preset.kategori.toUpperCase()}] {preset.name} (+{preset.poin} Poin)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kelas Siswa <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formKelasId}
                    onChange={(e) => {
                      setFormKelasId(e.target.value);
                      const classStudents = siswaList.filter((s) => s.kelasId === e.target.value);
                      if (classStudents.length > 0) {
                        setFormSiswaId(classStudents[0].id);
                      } else {
                        setFormSiswaId('');
                      }
                    }}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="" disabled>Pilih Kelas</option>
                    {availableClasses.map((k) => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Siswa <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formSiswaId}
                    onChange={(e) => setFormSiswaId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="" disabled>Pilih Siswa</option>
                    {siswaList
                      .filter((s) => !formKelasId || s.kelasId === formKelasId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.nama} (NISN: {s.nisn || '-'})</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Kejadian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori Pelanggaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value as PelanggaranKategori)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="ringan">Ringan</option>
                    <option value="sedang">Sedang</option>
                    <option value="berat">Berat</option>
                    <option value="kriminal">Kriminal / Berat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jumlah Poin <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formPoin}
                    onChange={(e) => setFormPoin(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bentuk / Nama Pelanggaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formNamaPelanggaran}
                  onChange={(e) => setFormNamaPelanggaran(e.target.value)}
                  placeholder="Misal: Terlambat hadir / atribut tidak lengkap / merokok"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pelapor / Guru Pencatat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formPelapor}
                    onChange={(e) => setFormPelapor(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Penanganan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="proses">Dalam Proses</option>
                    <option value="perlu_tindak_lanjut">Perlu Follow-up (Panggilan Ortu)</option>
                    <option value="selesai">Selesai / Dibina</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tindakan / Sanksi yang Diberikan
                </label>
                <input
                  type="text"
                  value={formTindakLanjut}
                  onChange={(e) => setFormTindakLanjut(e.target.value)}
                  placeholder="Misal: Peringatan lisan, skorsing 3 hari, dll."
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Kronologi Kejadian
                </label>
                <textarea
                  rows={3}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Tuliskan detail kronologi atau catatan khusus pembinaan siswa..."
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none resize-none"
                />
              </div>

              {/* Photo Upload / Camera */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Bukti Foto / Dokumentasi (Opsional)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => startCameraStream()}
                    className="px-3.5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Ambil Foto Kamera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Unggah dari Galeri</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                {formFoto && (
                  <div className="relative inline-block mt-2">
                    <img src={formFoto} alt="Bukti" className="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-sm" />
                    <button
                      type="button"
                      onClick={() => setFormFoto('')}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow hover:bg-rose-700 transition"
                      title="Hapus foto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer text-center"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Live Stream Modal */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            <video ref={videoRef} autoPlay playsInline className="w-full h-[400px] object-cover bg-black" />
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="px-3 py-1.5 bg-white/20 backdrop-blur-md text-white rounded-xl text-xs font-bold hover:bg-white/30 transition"
              >
                Putar Kamera
              </button>
              <button
                type="button"
                onClick={stopCameraStream}
                className="p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 bg-slate-900 flex justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                className="px-6 py-3 bg-white text-slate-900 font-extrabold rounded-2xl shadow-lg hover:bg-slate-100 transition flex items-center gap-2 text-sm cursor-pointer"
              >
                <Camera className="w-5 h-5 text-blue-600" />
                <span>Ambil Foto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Photo Modal */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Bukti Foto Pelanggaran</h3>
              <button type="button" onClick={() => setViewingItem(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {viewingItem.foto ? (
              <img src={viewingItem.foto} alt="Bukti" className="w-full max-h-[450px] object-contain rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ) : (
              <p className="text-center text-slate-500 py-6">Tidak ada foto bukti.</p>
            )}
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <p className="font-bold">{viewingItem.namaPelanggaran}</p>
              <p className="text-slate-500 mt-1">{viewingItem.keterangan || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Print / Surat Pelanggaran Modal */}
      {printItem && (() => {
        const siswa = siswaList.find((s) => s.id === printItem.siswaId);
        const kelas = sortedKelas.find((k) => k.id === printItem.kelasId);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white text-slate-900 w-full max-w-3xl rounded-3xl p-8 shadow-2xl space-y-6 my-8 print:m-0 print:p-4 print:shadow-none">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  {sekolah.logo && <img src={sekolah.logo} alt="Logo" className="w-14 h-14 object-contain" />}
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight">{sekolah.nama || 'Absensi Siswa'}</h2>
                    <p className="text-xs text-slate-600">{sekolah.alamat || 'Alamat Sekolah'}</p>
                    <p className="text-[10px] text-slate-500">Tahun Ajaran: {sekolah.tahunAjaran || '2026/2027'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-black uppercase">
                    Surat Catatan / Peringatan Pelanggaran
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">ID: {printItem.id}</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Nama Siswa:</span>
                    <span className="font-extrabold text-sm">{siswa?.nama || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">NISN / Kelas:</span>
                    <span className="font-extrabold text-sm">{siswa?.nisn || '-'} / {kelas?.nama || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tanggal Kejadian:</span>
                    <span className="font-bold">{printItem.tanggal}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Kategori & Poin:</span>
                    <span className="font-bold text-rose-600 uppercase">{printItem.kategori} (+{printItem.poin} Poin)</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-extrabold text-slate-700 block">Bentuk Pelanggaran:</span>
                  <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl font-bold text-rose-900">
                    {printItem.namaPelanggaran}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-extrabold text-slate-700 block">Keterangan / Kronologi:</span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                    {printItem.keterangan || 'Tidak ada catatan khusus.'}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-extrabold text-slate-700 block">Tindakan / Sanksi yang Diberikan:</span>
                  <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl font-bold text-blue-900">
                    {printItem.tindakan || '-'}
                  </div>
                </div>

                {printItem.foto && (
                  <div className="space-y-1">
                    <span className="font-extrabold text-slate-700 block">Bukti Foto Dokumentasi:</span>
                    <img src={printItem.foto} alt="Bukti" className="w-48 h-48 object-cover rounded-xl border border-slate-200" />
                  </div>
                )}
              </div>

              <div className="pt-8 grid grid-cols-2 text-center text-xs">
                <div>
                  <p className="text-slate-600">Orang Tua / Wali Murid,</p>
                  <div className="h-16" />
                  <p className="font-bold underline">({siswa?.namaOrangTua || '...........................................'})</p>
                </div>
                <div>
                  <p className="text-slate-600">Guru BK / Tim Kesiswaan,</p>
                  <div className="h-16" />
                  <p className="font-bold underline">({printItem.pelapor || 'Tim Ketertiban'})</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
                <button
                  type="button"
                  onClick={() => setPrintItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow"
                >
                  Cetak Dokumen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Template Management Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-black">Kelola Template & Jenis Pelanggaran</h3>
                <p className="text-xs text-white/80 mt-0.5">Tambah, edit, atau hapus jenis pelanggaran, kategori, dan besaran poin.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Form Add / Edit Template */}
              <form onSubmit={handleSaveTemplate} className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>{editingTemplate ? 'Edit Jenis Pelanggaran' : 'Tambah Jenis Pelanggaran Baru'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bentuk / Nama Pelanggaran <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      placeholder="Contoh: Menggunakan HP saat KBM tanpa izin"
                      required
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Kategori Pelanggaran <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={tplKategori}
                      onChange={(e) => setTplKategori(e.target.value as PelanggaranKategori)}
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                    >
                      <option value="ringan">Ringan</option>
                      <option value="sedang">Sedang</option>
                      <option value="berat">Berat</option>
                      <option value="kriminal">Kriminal / Berat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Jumlah Poin Sanksi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={tplPoin}
                      onChange={(e) => setTplPoin(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Rekomendasi Tindakan / Sanksi
                    </label>
                    <input
                      type="text"
                      value={tplTindakan}
                      onChange={(e) => setTplTindakan(e.target.value)}
                      placeholder="Contoh: Peringatan lisan & penyitaan sementara"
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
                  {editingTemplate && (
                    <button
                      type="button"
                      onClick={handleOpenAddTemplate}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs hover:bg-slate-300 transition text-center cursor-pointer"
                    >
                      Batal Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>{editingTemplate ? 'Simpan Perubahan Template' : 'Tambah ke Template'}</span>
                  </button>
                </div>
              </form>

              {/* List of Existing Templates */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">
                    Daftar Template Pelanggaran Aktif ({violationTemplates.length})
                  </h4>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {violationTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs hover:shadow-md transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getKategoriBadge(tpl.kategori)}
                          <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {tpl.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                          <span className="font-bold text-amber-600 dark:text-amber-400">+{tpl.poin} Poin</span>
                          <span>•</span>
                          <span>Tindakan: {tpl.tindakan || '-'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTemplate(tpl)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition"
                          title="Edit Template"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition"
                          title="Hapus Template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs shadow text-center cursor-pointer"
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
