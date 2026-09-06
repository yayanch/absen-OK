import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AppData,
  UserSession,
  HomeVisit,
  Siswa,
  Kelas
} from '../../types';
import {
  Home,
  Plus,
  Search,
  Printer,
  Edit3,
  Trash2,
  Eye,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Calendar,
  MapPin,
  X,
  Filter,
  Image as ImageIcon,
  ChevronRight,
  School,
  Download,
  Share2,
  Upload,
  Camera,
  RefreshCw,
  Lock
} from 'lucide-react';
import { getTodayString, sortKelasList } from '../../data/initialData';
import { compressBase64Image } from '../../utils/helpers';
import { PageHeader } from '../common/UIComponents';

interface HomeVisitViewProps {
  appData: AppData;
  currentUser: UserSession;
  onUpdateAppData: (newAppData: AppData) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onConfirmModal?: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
}

export const HomeVisitView: React.FC<HomeVisitViewProps> = ({
  appData,
  currentUser,
  onUpdateAppData,
  onShowToast,
  onConfirmModal,
}) => {
  const homeVisits = appData.homeVisits || [];
  const sortedKelas = useMemo(() => sortKelasList(appData.kelas || []), [appData.kelas]);

  const canEditHomeVisit = currentUser.role === 'admin' || currentUser.role === 'wali' || currentUser.role === 'kesiswaan';
  const isReadOnlyUser = !canEditHomeVisit;

  // Filter available classes according to user role
  const availableClasses = useMemo(() => {
    if (currentUser.role === 'wali') {
      return sortedKelas.filter((k) => k.waliKelasId === (currentUser.data as any).id);
    }
    return sortedKelas;
  }, [sortedKelas, currentUser]);

  const siswaList = appData.siswa || [];
  const sekolah = appData.sekolah;

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    if (currentUser.role === 'wali' && availableClasses.length > 0) {
      return availableClasses[0].id;
    }
    return 'all';
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HomeVisit | null>(null);
  const [viewingItem, setViewingItem] = useState<HomeVisit | null>(null);
  const [printItem, setPrintItem] = useState<HomeVisit | null>(null);

  // Form State
  const [formKelasId, setFormKelasId] = useState<string>('');
  const [formSiswaId, setFormSiswaId] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState<string>(getTodayString());
  const [formPetugas, setFormPetugas] = useState<string>('');
  const [formAlasan, setFormAlasan] = useState<string>('');
  const [formCatatan, setFormCatatan] = useState<string>('');
  const [formHasil, setFormHasil] = useState<string>('');
  const [formTindakLanjut, setFormTindakLanjut] = useState<string>('');
  const [formFoto, setFormFoto] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'selesai' | 'proses' | 'perlu_followup'>('proses');

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
      console.warn('Live camera stream error, falling back to native camera input:', err);
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        onShowToast('Gagal mengakses kamera. Silakan pilih foto dari galeri.', 'error');
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
      onShowToast('Foto berhasil diambil dari kamera!', 'success');
    }
    stopCameraStream();
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCameraStream(nextMode);
  };

  useEffect(() => {
    if (isCameraModalOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraModalOpen, cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('File harus berupa foto/gambar (JPG, PNG, WEBP)!', 'error');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const raw = event.target?.result as string;
        if (raw) {
          const compressed = await compressBase64Image(raw, 800, 0.8);
          setFormFoto(compressed);
          onShowToast('Foto dokumentasi berhasil diunggah!', 'success');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      onShowToast('Gagal memproses file foto dokumentasi.', 'error');
    }
  };

  // Pre-fill petugas based on current user
  const defaultPetugasName = useMemo(() => {
    if (currentUser.data?.nama) {
      return `${currentUser.data.nama} (${
        currentUser.role === 'admin'
          ? 'Admin'
          : currentUser.role === 'kesiswaan'
          ? 'WKS Kesiswaan'
          : currentUser.role === 'kurikulum'
          ? 'WKS Kurikulum'
          : currentUser.role === 'hubin'
          ? 'WKS Hubin'
          : currentUser.role === 'wali'
          ? 'Wali Kelas'
          : 'Guru'
      })`;
    }
    return 'Wali Kelas / Tim BP BK';
  }, [currentUser]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    const initialKelas = availableClasses.length > 0 ? availableClasses[0].id : '';
    setFormKelasId(initialKelas);
    const availableSiswa = siswaList
      .filter((s) => s.kelasId === initialKelas)
      .sort((a, b) => a.nama.localeCompare(b.nama));
    setFormSiswaId(availableSiswa.length > 0 ? availableSiswa[0].id : '');
    setFormTanggal(getTodayString());
    setFormPetugas(defaultPetugasName);
    setFormAlasan('Alpha 3 Hari Berturut-turut');
    setFormCatatan('');
    setFormHasil('');
    setFormTindakLanjut('');
    setFormFoto('');
    setFormStatus('proses');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: HomeVisit) => {
    setEditingItem(item);
    setFormKelasId(item.kelasId);
    setFormSiswaId(item.siswaId);
    setFormTanggal(item.tanggal);
    setFormPetugas(item.petugas);
    setFormAlasan(item.alasan);
    setFormCatatan(item.catatan);
    setFormHasil(item.hasil);
    setFormTindakLanjut(item.tindakLanjut);
    setFormFoto(item.foto || '');
    setFormStatus(item.status || 'proses');
    setIsAddModalOpen(true);
  };

  // Save Form (Create or Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSiswaId || !formKelasId || !formTanggal) {
      onShowToast('Mohon lengkapi data siswa, kelas, dan tanggal kunjungan!', 'error');
      return;
    }

    if (editingItem) {
      const updatedList = homeVisits.map((hv) => {
        if (hv.id === editingItem.id) {
          return {
            ...hv,
            kelasId: formKelasId,
            siswaId: formSiswaId,
            tanggal: formTanggal,
            petugas: formPetugas,
            alasan: formAlasan,
            catatan: formCatatan,
            hasil: formHasil,
            tindakLanjut: formTindakLanjut,
            foto: formFoto,
            status: formStatus,
          };
        }
        return hv;
      });
      onUpdateAppData({ ...appData, homeVisits: updatedList });
      onShowToast('Laporan Home Visit berhasil diperbarui!', 'success');
    } else {
      const newHV: HomeVisit = {
        id: `HV_${Date.now()}`,
        kelasId: formKelasId,
        siswaId: formSiswaId,
        tanggal: formTanggal,
        petugas: formPetugas || defaultPetugasName,
        alasan: formAlasan,
        catatan: formCatatan,
        hasil: formHasil,
        tindakLanjut: formTindakLanjut,
        foto: formFoto,
        status: formStatus,
        createdAt: getTodayString(),
      };
      onUpdateAppData({ ...appData, homeVisits: [newHV, ...homeVisits] });
      setSelectedKelasId(formKelasId || 'all');
      setSearchTerm('');
      setSelectedStatus('all');
      onShowToast('Laporan Home Visit baru berhasil ditambahkan!', 'success');
    }

    setIsAddModalOpen(false);
  };

  // Delete Home Visit
  const handleDelete = (id: string) => {
    const executeDelete = () => {
      const updated = homeVisits.filter((hv) => hv.id !== id);
      const deletedIds = Array.from(new Set([...(appData.deletedHomeVisitIds || []), id]));
      onUpdateAppData({ ...appData, homeVisits: updated, deletedHomeVisitIds: deletedIds });
      onShowToast('Laporan Home Visit berhasil dihapus.', 'info');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Hapus Laporan Home Visit',
        'Apakah Anda yakin ingin menghapus laporan Home Visit ini? Tindakan ini tidak dapat dibatalkan.',
        'danger',
        executeDelete
      );
    } else if (confirm('Apakah Anda yakin ingin menghapus laporan Home Visit ini?')) {
      executeDelete();
    }
  };

  // Filtered List
  const filteredHomeVisits = useMemo(() => {
    return homeVisits.filter((hv) => {
      // Role Wali filter constraint
      if (currentUser.role === 'wali') {
        const isWaliKelas = availableClasses.some((k) => k.id === hv.kelasId);
        if (!isWaliKelas) return false;
      }
      // Filter Kelas
      if (selectedKelasId !== 'all' && hv.kelasId !== selectedKelasId) {
        return false;
      }
      // Filter Status
      if (selectedStatus !== 'all' && hv.status !== selectedStatus) {
        return false;
      }
      // Search
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const siswaObj = siswaList.find((s) => s.id === hv.siswaId);
        const kelasObj = sortedKelas.find((k) => k.id === hv.kelasId);
        const namaSiswa = siswaObj?.nama.toLowerCase() || '';
        const nisnSiswa = siswaObj?.nisn.toLowerCase() || '';
        const namaKelas = kelasObj?.nama.toLowerCase() || '';
        const petugas = hv.petugas.toLowerCase();
        const alasan = hv.alasan.toLowerCase();

        return (
          namaSiswa.includes(query) ||
          nisnSiswa.includes(query) ||
          namaKelas.includes(query) ||
          petugas.includes(query) ||
          alasan.includes(query)
        );
      }
      return true;
    });
  }, [homeVisits, selectedKelasId, selectedStatus, searchTerm, siswaList, sortedKelas, currentUser, availableClasses]);

  // Available Siswa for Form based on selected formKelasId
  const availableSiswaForForm = useMemo(() => {
    if (!formKelasId) return [];
    return siswaList
      .filter((s) => s.kelasId === formKelasId)
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [siswaList, formKelasId]);

  // Helper getters
  const getSiswaName = (siswaId: string) => {
    const s = siswaList.find((x) => x.id === siswaId);
    return s ? s.nama : 'Siswa Tidak Ditemukan';
  };

  const getSiswaDetails = (siswaId: string) => {
    return siswaList.find((x) => x.id === siswaId);
  };

  const getKelasName = (kelasId: string) => {
    const k = sortedKelas.find((x) => x.id === kelasId);
    return k ? k.nama : '-';
  };

  // Helper Badge Color
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'selesai':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Selesai
          </span>
        );
      case 'perlu_followup':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Perlu Follow-up
          </span>
        );
      case 'proses':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Dalam Proses
          </span>
        );
    }
  };

  // Stats filtered by selected kelas & role
  const homeVisitsForStats = useMemo(() => {
    return homeVisits.filter((hv) => {
      if (currentUser.role === 'wali') {
        const isWaliKelas = availableClasses.some((k) => k.id === hv.kelasId);
        if (!isWaliKelas) return false;
      }
      if (selectedKelasId !== 'all' && hv.kelasId !== selectedKelasId) {
        return false;
      }
      return true;
    });
  }, [homeVisits, currentUser, availableClasses, selectedKelasId]);

  const totalVisits = homeVisitsForStats.length;
  const selesaiCount = homeVisitsForStats.filter((h) => h.status === 'selesai').length;
  const prosesCount = homeVisitsForStats.filter((h) => h.status === 'proses').length;
  const followupCount = homeVisitsForStats.filter((h) => h.status === 'perlu_followup').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        icon={Home}
        title="Laporan Home Visit (Kunjungan Rumah)"
        description="Pencatatan, pemantauan, dan penerbitan Berita Acara kunjungan rumah siswa untuk penanganan presensi, kedisiplinan, dan pendampingan siswa."
        badge="Modul Bimbingan & Layanan Kesiswaan"
        actions={
          canEditHomeVisit ? (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition-all text-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah Laporan Home Visit</span>
            </button>
          ) : undefined
        }
      />

      {/* Read Only Banner */}
      {isReadOnlyUser && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300 shadow-xs">
          <Lock className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="text-xs font-bold">Mode Read Only (User Biasa)</div>
            <div className="text-[11px]">Anda login sebagai User Biasa dengan akses Hanya Lihat (Read Only). Penambahan, pengubahan, dan penghapusan laporan Home Visit dinonaktifkan.</div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Total Kunjungan</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalVisits}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
            <Home className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Dalam Proses</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{prosesCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Perlu Follow-up</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{followupCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Selesai</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{selesaiCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa, NISN, petugas, atau alasan kunjungan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Kelas:</span>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {currentUser.role !== 'wali' && <option value="all">Semua Kelas</option>}
              {availableClasses.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="proses">Dalam Proses</option>
              <option value="perlu_followup">Perlu Follow-up</option>
              <option value="selesai">Selesai</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Cards List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredHomeVisits.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Home className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
              Tidak Ada Laporan Home Visit
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              Belum ada pencatatan kunjungan rumah sesuai filter atau pencarian saat ini.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Laporan Pertama</span>
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Tanggal & Siswa</th>
                    <th className="py-3.5 px-4">Kelas</th>
                    <th className="py-3.5 px-4">Petugas</th>
                    <th className="py-3.5 px-4">Alasan & Catatan</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-xs">
                  {filteredHomeVisits.map((item) => {
                    const siswaObj = getSiswaDetails(item.siswaId);
                    const kelasNama = getKelasName(item.kelasId);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100 dark:border-blue-900 mt-0.5">
                              <Home className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                                {siswaObj?.nama || 'Siswa N/A'}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                <span>NISN: {siswaObj?.nisn || '-'}</span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {item.tanggal}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {kelasNama}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                          {item.petugas || '-'}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {item.alasan}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {item.catatan || item.hasil || '-'}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {getStatusBadge(item.status)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingItem(item)}
                              title="Detail Kunjungan"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setPrintItem(item)}
                              title="Cetak Berita Acara Home Visit"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Laporan"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-lg transition cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              title="Hapus Laporan"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Grid View */}
            <div className="md:hidden p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredHomeVisits.map((item) => {
                const siswaObj = getSiswaDetails(item.siswaId);
                const kelasNama = getKelasName(item.kelasId);

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-3"
                  >
                    {/* Header: Siswa, Kelas & Status */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100 dark:border-blue-900">
                            <Home className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate">
                              {siswaObj?.nama || 'Siswa N/A'}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              NISN: {siswaObj?.nisn || '-'}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 font-bold text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                          {kelasNama}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.tanggal}</span>
                        </div>
                        <div>
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    </div>

                    {/* Alasan & Catatan */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                        <span className="text-slate-400 font-normal">Alasan: </span>
                        {item.alasan}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        <span className="text-slate-400 font-normal">Hasil: </span>
                        {item.catatan || item.hasil || '-'}
                      </p>
                      {item.petugas && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                          <span className="text-slate-400">Petugas: </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{item.petugas}</span>
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <span className="text-[11px] font-bold text-slate-400">Aksi Laporan</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingItem(item)}
                          title="Detail Kunjungan"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintItem(item)}
                          title="Cetak Berita Acara"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {canEditHomeVisit && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Laporan"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg transition cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              title="Hapus Laporan"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition cursor-pointer"
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
          </>
        )}
      </div>

      {/* Modal Form Tambah / Edit */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm animate-fadeIn p-3 sm:p-4">
          <div className="min-h-full flex items-start sm:items-center justify-center py-2 sm:py-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-4 sm:p-6 my-auto space-y-5 relative">
              <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 bg-white dark:bg-slate-900 pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                      {editingItem ? 'Edit Laporan Home Visit' : 'Tambah Laporan Home Visit'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Formulir pencatatan hasil kunjungan ke rumah siswa
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              {/* Row 1: Kelas & Siswa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                    Kelas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formKelasId}
                    onChange={(e) => {
                      const newK = e.target.value;
                      setFormKelasId(newK);
                      const matchingSiswa = siswaList
                        .filter((s) => s.kelasId === newK)
                        .sort((a, b) => a.nama.localeCompare(b.nama));
                      setFormSiswaId(matchingSiswa.length > 0 ? matchingSiswa[0].id : '');
                    }}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {availableClasses.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                    Nama Siswa <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formSiswaId}
                    onChange={(e) => {
                      const sId = e.target.value;
                      setFormSiswaId(sId);
                      const sObj = siswaList.find((s) => s.id === sId);
                      if (sObj && sObj.kelasId && sObj.kelasId !== formKelasId) {
                        setFormKelasId(sObj.kelasId);
                      }
                    }}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {availableSiswaForForm.length === 0 ? (
                      <option value="">(Tidak Ada Siswa di Kelas Ini)</option>
                    ) : (
                      availableSiswaForForm.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama} ({s.gender === 'L' ? 'L' : 'P'}) - NISN: {s.nisn}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Row 2: Tanggal & Petugas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                    Tanggal Kunjungan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                    Petugas / Pengunjung <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Wali Kelas / Guru BK / Kesiswaan"
                    value={formPetugas}
                    onChange={(e) => setFormPetugas(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Row 3: Alasan & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                    Alasan Kunjungan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Alpha 3 Hari Berturut-turut / Sakit Parah / Konseling"
                    value={formAlasan}
                    onChange={(e) => setFormAlasan(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                    Status Perkembangan
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="proses">Dalam Proses</option>
                    <option value="perlu_followup">Perlu Follow-up</option>
                    <option value="selesai">Selesai</option>
                  </select>
                </div>
              </div>

              {/* Catatan Permasalahan */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  Catatan / Deskripsi Permasalahan
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsikan latar belakang atau riwayat ketidakhadiran siswa..."
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Hasil Kunjungan & Kesepakatan Ortu */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  Hasil Kunjungan & Kesepakatan Orang Tua / Wali
                </label>
                <textarea
                  rows={3}
                  placeholder="Hasil diskusi dengan orang tua di rumah, klarifikasi alasan tidak masuk, serta tanggapan ortu..."
                  value={formHasil}
                  onChange={(e) => setFormHasil(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tindak Lanjut / Solusi */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  Rencana Tindak Lanjut / Solusi Sekolah
                </label>
                <textarea
                  rows={2}
                  placeholder="Langkah tindak lanjut yang disepakati (misal: pemantauan harian, konseling BK, surat pernyataan)..."
                  value={formTindakLanjut}
                  onChange={(e) => setFormTindakLanjut(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Upload / Ambil Foto Dokumentasi */}
              <div className="space-y-2">
                <label className="block text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm">
                  Foto Dokumentasi Kegiatan / Kunjungan
                </label>

                {/* Hidden File Input (Gallery) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFotoUpload}
                  className="hidden"
                />

                {/* Hidden Camera Input (Native Camera) */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFotoUpload}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startCameraStream('environment')}
                    className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/20 active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Ambil Foto (Kamera Langsung)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700 active:scale-95"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>Pilih dari Galeri</span>
                  </button>
                </div>

                {formFoto && (
                  <div className="mt-2.5 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={formFoto}
                        alt="Preview Dokumentasi"
                        className="w-14 h-14 object-cover rounded-xl border border-slate-300 dark:border-slate-600 shrink-0 shadow-sm"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                          Foto Berhasil Tersimpan
                        </p>
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Tersimpan & siap dicetak</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormFoto('')}
                      className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl transition cursor-pointer shrink-0 border border-rose-200/80 dark:border-rose-900/50"
                      title="Hapus Foto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Simpan Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* Modal Viewing Detail */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm animate-fadeIn p-3 sm:p-4">
          <div className="min-h-full flex items-start sm:items-center justify-center py-2 sm:py-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-4 sm:p-6 my-auto space-y-5 relative">
              <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 bg-white dark:bg-slate-900 pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                      Detail Laporan Home Visit
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {getSiswaName(viewingItem.siswaId)} - Kelas {getKelasName(viewingItem.kelasId)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingItem(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Tanggal Kunjungan</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{viewingItem.tanggal}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Status</p>
                  <div className="mt-0.5">{getStatusBadge(viewingItem.status)}</div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Petugas Kunjungan</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{viewingItem.petugas}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Alasan Kunjungan</p>
                  <p className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">{viewingItem.alasan}</p>
                </div>
              </div>

              {viewingItem.catatan && (
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan Permasalahan:</h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {viewingItem.catatan}
                  </div>
                </div>
              )}

              {viewingItem.hasil && (
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Hasil Kunjungan & Tanggapan Orang Tua:</h4>
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {viewingItem.hasil}
                  </div>
                </div>
              )}

              {viewingItem.tindakLanjut && (
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Rencana Tindak Lanjut:</h4>
                  <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/60 dark:border-blue-900/40 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {viewingItem.tindakLanjut}
                  </div>
                </div>
              )}

              {viewingItem.foto && (
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Dokumentasi Foto:</h4>
                  <img
                    src={viewingItem.foto}
                    alt="Dokumentasi Home Visit"
                    className="w-full h-48 object-cover rounded-2xl border border-slate-200 dark:border-slate-800"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setPrintItem(viewingItem);
                  setViewingItem(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Berita Acara</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Printable Modal: Berita Acara Home Visit */}
      {printItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-fadeIn p-3 sm:p-4">
          <div className="min-h-full flex items-start sm:items-center justify-center py-2 sm:py-6">
            <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full p-4 sm:p-10 my-auto space-y-6 relative overflow-hidden">
              {/* Header controls (Screen only) */}
              <div className="sticky top-0 z-20 flex items-center justify-between border-b pb-3 bg-white pt-1 print:hidden">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 min-w-0">
                  <Printer className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">Pratinjau Cetak Berita Acara</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Cetak / Download PDF</span>
                    <span className="sm:hidden">Cetak</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintItem(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

            {/* Print Document Content */}
            <div className="print-document font-serif text-slate-900 leading-relaxed text-sm">
              {/* Kop Surat */}
              <div className="border-b-4 border-double border-slate-900 pb-3 text-center relative mb-6">
                <div className="flex items-center justify-center gap-4 mb-1">
                  {sekolah.logo && (
                    <img src={sekolah.logo} alt="Logo Sekolah" className="w-16 h-16 object-contain" />
                  )}
                  <div>
                    <h2 className="font-extrabold text-lg uppercase tracking-tight text-slate-900">
                      {sekolah.nama || 'E-Rapor Kurikulum Merdeka'}
                    </h2>
                    <p className="text-xs font-sans text-slate-700">{sekolah.alamat || 'Jl. Raya Limbangan Km. 01 Bl. Limbangan, Garut, Jawa Barat'}</p>
                    <p className="text-[11px] font-sans text-slate-600 italic">
                      Tahun Ajaran {sekolah.tahunAjaran || '2026/2027'} • Portal Kesiswaan & Bimbingan Konseling
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center mb-6">
                <h3 className="font-bold text-base uppercase underline tracking-wider">
                  BERITA ACARA KUNJUNGAN RUMAH (HOME VISIT)
                </h3>
                <p className="text-xs font-sans text-slate-600 mt-1">
                  Nomor Surat: HV/{printItem.id.replace('HV_', '')}/{sekolah.tahunAjaran ? sekolah.tahunAjaran.replace('/', '') : '20262027'}
                </p>
              </div>

              {/* Text Intro */}
              <p className="font-sans text-xs mb-4">
                Pada hari ini, tanggal <span className="font-bold">{printItem.tanggal}</span>, telah dilaksanakan kunjungan rumah (Home Visit) terhadap siswa dengan data sebagai berikut:
              </p>

              {/* Student Details Table */}
              <div className="font-sans text-xs bg-slate-50 p-4 rounded-xl border border-slate-300 mb-6 space-y-2">
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Nama Siswa</span>
                  <span className="col-span-2 font-black text-slate-900">{getSiswaName(printItem.siswaId)}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">NISN</span>
                  <span className="col-span-2 font-medium">{getSiswaDetails(printItem.siswaId)?.nisn || '-'}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Kelas</span>
                  <span className="col-span-2 font-bold text-slate-800">{getKelasName(printItem.kelasId)}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Nama Orang Tua / Wali</span>
                  <span className="col-span-2 font-medium">{getSiswaDetails(printItem.siswaId)?.namaOrangTua || 'Bapak/Ibu Orang Tua Siswa'}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Petugas Kunjungan</span>
                  <span className="col-span-2 font-bold">{printItem.petugas}</span>
                </div>
              </div>

              {/* Reason & Findings */}
              <div className="font-sans text-xs space-y-4 mb-8">
                <div>
                  <h4 className="font-bold text-slate-800 underline mb-1">1. Alasan Kunjungan:</h4>
                  <p className="p-3 bg-slate-100 rounded-lg border border-slate-200">{printItem.alasan}</p>
                </div>

                {printItem.catatan && (
                  <div>
                    <h4 className="font-bold text-slate-800 underline mb-1">2. Catatan Keterangan Sekolah:</h4>
                    <p className="p-3 bg-slate-100 rounded-lg border border-slate-200">{printItem.catatan}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-slate-800 underline mb-1">3. Hasil Kunjungan & Kesepakatan Orang Tua/Wali:</h4>
                  <p className="p-3 bg-slate-100 rounded-lg border border-slate-200">{printItem.hasil || 'Orang tua siswa menyadari dan bersedia melakukan pengawasan lebih ketat terhadap kehadiran anak.'}</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 underline mb-1">4. Rencana Tindak Lanjut:</h4>
                  <p className="p-3 bg-slate-100 rounded-lg border border-slate-200">{printItem.tindakLanjut || 'Pemantauan kehadiran harian dan koordinasi berkala antara wali kelas dan orang tua.'}</p>
                </div>

                {printItem.foto && (
                  <div>
                    <h4 className="font-bold text-slate-800 underline mb-1">5. Lampiran Foto Dokumentasi:</h4>
                    <div className="p-2 bg-slate-100 rounded-lg border border-slate-200 text-center">
                      <img
                        src={printItem.foto}
                        alt="Foto Dokumentasi Home Visit"
                        className="max-h-52 max-w-full object-contain mx-auto rounded-md border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              <p className="font-sans text-xs mb-8">
                Demikian Berita Acara Kunjungan Rumah ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
              </p>

              {/* Signatures Grid */}
              <div className="font-sans text-xs grid grid-cols-2 gap-8 text-center pt-4">
                <div>
                  <p className="mb-16">Orang Tua / Wali Siswa,</p>
                  <p className="font-bold border-b border-slate-800 inline-block px-4 pb-0.5">
                    ( {getSiswaDetails(printItem.siswaId)?.namaOrangTua || '...........................................'} )
                  </p>
                </div>

                <div>
                  <p className="mb-16">Petugas / Wali Kelas,</p>
                  <p className="font-bold border-b border-slate-800 inline-block px-4 pb-0.5">
                    ( {printItem.petugas.split('(')[0].trim()} )
                  </p>
                </div>

                <div className="col-span-2 pt-6">
                  <p className="mb-16">Mengetahui,<br /><span className="font-bold">Kepala Sekolah / WKS Kesiswaan</span></p>
                  <p className="font-bold border-b border-slate-800 inline-block px-6 pb-0.5">
                    {sekolah.namaKepalaSekolah || 'Drs. H. Mulyadi, M.Pd.'}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">NIP: {sekolah.nipKepalaSekolah || '197205101998031004'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Live Camera Stream Modal */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-fadeIn p-3 sm:p-4">
          <div className="min-h-full flex items-center justify-center py-2 sm:py-6">
            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl max-w-lg w-full p-5 space-y-4 text-white relative">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-sm text-slate-100">Ambil Foto Dokumentasi</h3>
              </div>
              <button
                type="button"
                onClick={stopCameraStream}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                title="Beralih Kamera Depan / Belakang"
              >
                <RefreshCw className="w-4 h-4 text-blue-400" />
                <span>Ganti Kamera</span>
              </button>

              <button
                type="button"
                onClick={capturePhoto}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30 active:scale-95"
              >
                <Camera className="w-4.5 h-4.5" />
                <span>Jepret Foto</span>
              </button>

              <button
                type="button"
                onClick={stopCameraStream}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
