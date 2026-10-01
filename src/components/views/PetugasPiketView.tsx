import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  UserCheck,
  Users,
  ShieldCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Clock,
  Calendar,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  QrCode,
  ClipboardCheck,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Info,
  Check,
  X,
  Eye,
  EyeOff,
  Building2,
  MessageSquare
} from 'lucide-react';
import { AppData, PetugasPiket, CatatanPiketHarian, UserSession, ViewType } from '../../types';
import { PageHeader } from '../common/UIComponents';
import { addAuditLog } from '../../utils/helpers';
import { DEFAULT_PETUGAS_PIKET } from '../../data/initialData';

interface PetugasPiketViewProps {
  appData: AppData;
  currentUser: UserSession;
  onUpdateAppData: (appData: AppData) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigateView?: (view: ViewType) => void;
  onOpenServerQrModal?: () => void;
  readOnly?: boolean;
}

const ALL_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const PetugasPiketView: React.FC<PetugasPiketViewProps> = ({
  appData,
  currentUser,
  onUpdateAppData,
  onShowToast,
  onNavigateView,
  onOpenServerQrModal,
  readOnly = false,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isKesiswaan = currentUser.role === 'kesiswaan';
  const isPiket = currentUser.role === 'piket_guru' || currentUser.role === 'piket_kesiswaan' || currentUser.role === 'piket';
  const canManage = (isAdmin || isKesiswaan) && !readOnly;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'petugas' | 'jadwal' | 'logbook' | 'aksi_cepat'>('petugas');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [tipeFilter, setTipeFilter] = useState<'semua' | 'piket_guru' | 'piket_kesiswaan'>('semua');
  const [hariFilter, setHariFilter] = useState<string>('semua');

  // Modal State for Add / Edit Petugas Piket
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPetugas, setEditingPetugas] = useState<PetugasPiket | null>(null);

  // Form State
  const [formNama, setFormNama] = useState('');
  const [formTipe, setFormTipe] = useState<'piket_guru' | 'piket_kesiswaan'>('piket_guru');
  const [formNip, setFormNip] = useState('');
  const [formNoHp, setFormNoHp] = useState('');
  const [formShift, setFormShift] = useState<'Pagi' | 'Siang' | 'Semua'>('Pagi');
  const [formHariPiket, setFormHariPiket] = useState<string[]>(['Senin', 'Rabu', 'Jumat']);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('123');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Modal State for Add Log Kejadian
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logTanggal, setLogTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [logShift, setLogShift] = useState<'Pagi' | 'Siang'>('Pagi');
  const [logKejadian, setLogKejadian] = useState('');
  const [logTindakan, setLogTindakan] = useState('');
  const [logStatus, setLogStatus] = useState<'selesai' | 'tindak_lanjut' | 'info'>('selesai');
  const [logSearch, setLogSearch] = useState('');

  // Get Petugas Piket List
  const petugasList: PetugasPiket[] = useMemo(() => {
    if (Array.isArray(appData.petugasPiket) && appData.petugasPiket.length > 0) {
      return appData.petugasPiket;
    }
    return DEFAULT_PETUGAS_PIKET;
  }, [appData.petugasPiket]);

  // Log List
  const logList: CatatanPiketHarian[] = useMemo(() => {
    return Array.isArray(appData.catatanPiketHarian) ? appData.catatanPiketHarian : [];
  }, [appData.catatanPiketHarian]);

  // Today's Day Name
  const todayDayName = useMemo(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[new Date().getDay()];
  }, []);

  // Today's active picket officers
  const todayPiketOfficers = useMemo(() => {
    return petugasList.filter((p) => (p.hariPiket || []).includes(todayDayName));
  }, [petugasList, todayDayName]);

  // Filtered Petugas
  const filteredPetugas = useMemo(() => {
    return petugasList.filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.nama.toLowerCase().includes(q) ||
        (p.nip && p.nip.toLowerCase().includes(q)) ||
        p.username.toLowerCase().includes(q) ||
        (p.noHp && p.noHp.includes(q)) ||
        (p.keterangan && p.keterangan.toLowerCase().includes(q));

      const matchTipe = tipeFilter === 'semua' || p.tipe === tipeFilter;
      const matchHari = hariFilter === 'semua' || (p.hariPiket || []).includes(hariFilter);

      return matchSearch && matchTipe && matchHari;
    });
  }, [petugasList, searchTerm, tipeFilter, hariFilter]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logList.filter((l) => {
      if (!logSearch.trim()) return true;
      const q = logSearch.toLowerCase();
      return (
        l.kejadian.toLowerCase().includes(q) ||
        (l.tindakan && l.tindakan.toLowerCase().includes(q)) ||
        l.petugasNama.toLowerCase().includes(q) ||
        l.tanggal.includes(q)
      );
    });
  }, [logList, logSearch]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingPetugas(null);
    setFormNama('');
    setFormTipe('piket_guru');
    setFormNip('');
    setFormNoHp('');
    setFormShift('Pagi');
    setFormHariPiket(['Senin', 'Rabu', 'Jumat']);
    setFormUsername(`piket_guru_${Date.now().toString().slice(-4)}`);
    setFormPassword('123');
    setFormKeterangan('Petugas Guru Piket Harian');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: PetugasPiket) => {
    setEditingPetugas(p);
    setFormNama(p.nama);
    setFormTipe(p.tipe);
    setFormNip(p.nip || '');
    setFormNoHp(p.noHp || '');
    setFormShift(p.shiftPiket || 'Pagi');
    setFormHariPiket(p.hariPiket || ['Senin', 'Rabu', 'Jumat']);
    setFormUsername(p.username);
    setFormPassword(p.password || '123');
    setFormKeterangan(p.keterangan || '');
    setIsModalOpen(true);
  };

  // Toggle Day in Form
  const toggleFormDay = (day: string) => {
    if (formHariPiket.includes(day)) {
      setFormHariPiket(formHariPiket.filter((d) => d !== day));
    } else {
      setFormHariPiket([...formHariPiket, day]);
    }
  };

  // Save Petugas
  const handleSavePetugas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      onShowToast('Nama Petugas Piket wajib diisi!', 'warning');
      return;
    }
    if (!formUsername.trim()) {
      onShowToast('Username akun login wajib diisi!', 'warning');
      return;
    }
    if (formHariPiket.length === 0) {
      onShowToast('Pilih minimal 1 hari tugas piket!', 'warning');
      return;
    }

    const cleanUsername = formUsername.trim().toLowerCase();

    // Check duplicate username
    const isDup = petugasList.some(
      (p) => p.username.toLowerCase() === cleanUsername && p.id !== editingPetugas?.id
    );
    if (isDup) {
      onShowToast(`Username "${cleanUsername}" sudah digunakan oleh petugas lain!`, 'error');
      return;
    }

    const newPetugas: PetugasPiket = {
      id: editingPetugas ? editingPetugas.id : `PIKET_${Date.now()}`,
      nama: formNama.trim(),
      tipe: formTipe,
      nip: formNip.trim() || undefined,
      noHp: formNoHp.trim() || undefined,
      shiftPiket: formShift,
      hariPiket: formHariPiket,
      username: cleanUsername,
      password: formPassword.trim() || '123',
      keterangan: formKeterangan.trim() || undefined,
      status: 'aktif',
      createdAt: editingPetugas?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedList: PetugasPiket[];
    if (editingPetugas) {
      updatedList = petugasList.map((p) => (p.id === editingPetugas.id ? newPetugas : p));
      onShowToast(`Petugas Piket "${newPetugas.nama}" berhasil diperbarui!`, 'success');
    } else {
      updatedList = [newPetugas, ...petugasList];
      onShowToast(`Petugas Piket baru "${newPetugas.nama}" berhasil ditambahkan!`, 'success');
    }

    const updatedAppData: AppData = {
      ...appData,
      petugasPiket: updatedList,
    };

    const withAudit = addAuditLog(
      updatedAppData,
      editingPetugas ? 'Mengubah Data Petugas Piket' : 'Menambah Petugas Piket Baru',
      `Petugas Piket: ${newPetugas.nama} (${newPetugas.tipe})`
    );

    onUpdateAppData(withAudit);
    setIsModalOpen(false);
  };

  // Delete Petugas
  const handleDeletePetugas = (p: PetugasPiket) => {
    if (readOnly) return;
    if (window.confirm(`Apakah Anda yakin ingin menghapus petugas piket "${p.nama}"?`)) {
      const updatedList = petugasList.filter((item) => item.id !== p.id);
      const updatedAppData: AppData = {
        ...appData,
        petugasPiket: updatedList,
      };

      const withAudit = addAuditLog(
        updatedAppData,
        'Menghapus Petugas Piket',
        `Hapus Petugas Piket: ${p.nama}`
      );

      onUpdateAppData(withAudit);
      onShowToast(`Petugas Piket "${p.nama}" berhasil dihapus.`, 'info');
    }
  };

  // Save Log
  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logKejadian.trim()) {
      onShowToast('Deskripsi kejadian wajib diisi!', 'warning');
      return;
    }

    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const logDateObj = new Date(logTanggal);
    const dayName = days[logDateObj.getDay()] || todayDayName;

    const newLog: CatatanPiketHarian = {
      id: `LOG_PIKET_${Date.now()}`,
      tanggal: logTanggal,
      hari: dayName,
      shift: logShift,
      petugasNama: (currentUser.data as any)?.nama || currentUser.role,
      petugasUsername: (currentUser as any)?.username || currentUser.role,
      tipePiket: currentUser.role === 'piket_kesiswaan' ? 'piket_kesiswaan' : 'piket_guru',
      kejadian: logKejadian.trim(),
      tindakan: logTindakan.trim() || undefined,
      status: logStatus,
      createdAt: new Date().toISOString(),
    };

    const updatedLogs = [newLog, ...logList];
    const updatedAppData: AppData = {
      ...appData,
      catatanPiketHarian: updatedLogs,
    };

    onUpdateAppData(updatedAppData);
    onShowToast('Catatan buku piket harian berhasil disimpan!', 'success');
    setLogKejadian('');
    setLogTindakan('');
    setIsLogModalOpen(false);
  };

  // Delete Log
  const handleDeleteLog = (id: string) => {
    if (readOnly) return;
    if (window.confirm('Hapus catatan logbook piket ini?')) {
      const updatedLogs = logList.filter((l) => l.id !== id);
      onUpdateAppData({
        ...appData,
        catatanPiketHarian: updatedLogs,
      });
      onShowToast('Catatan logbook berhasil dihapus.', 'info');
    }
  };

  // Print schedule
  const handlePrint = () => {
    window.print();
  };

  // Stats
  const totalPetugas = petugasList.length;
  const totalGuruPiket = petugasList.filter((p) => p.tipe === 'piket_guru').length;
  const totalKesiswaanPiket = petugasList.filter((p) => p.tipe === 'piket_kesiswaan').length;

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Master Data Petugas Piket"
        description="Kelola master data penugasan guru piket harian, plotting jadwal shift mingguan, dan buku logbook catatan ketertiban sekolah."
        icon={ClipboardList}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Jadwal</span>
            </button>

            {canManage && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Petugas Piket</span>
              </button>
            )}
          </div>
        }
      />

      {/* BANNER STATUS PIKET HARI INI */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900 border border-amber-300/80 dark:border-amber-800/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                Piket Bertugas Hari Ini: {todayDayName}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200/90 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                {todayPiketOfficers.length} Petugas Siaga
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-medium">
              {todayPiketOfficers.length > 0 ? (
                <span>
                  Petugas aktif:{' '}
                  <strong>{todayPiketOfficers.map((p) => `${p.nama} (${p.tipe === 'piket_kesiswaan' ? 'Kesiswaan' : 'Guru Piket'})`).join(', ')}</strong>
                </span>
              ) : (
                <span className="text-slate-500 italic">Belum ada penugasan petugas piket aktif untuk hari {todayDayName}.</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2 self-start md:self-center">
          {onOpenServerQrModal && (
            <button
              type="button"
              onClick={onOpenServerQrModal}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Buka Layar QR Presensi Gerbang"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Gerbang</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Tulis Buku Piket</span>
          </button>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              {totalPetugas}
            </div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
              Total Petugas Piket
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              {totalGuruPiket}
            </div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
              Petugas Piket Guru
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              {totalKesiswaanPiket}
            </div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
              Piket Kesiswaan & Tatib
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              {todayPiketOfficers.length}
            </div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
              Piket Hari {todayDayName}
            </div>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('petugas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'petugas'
              ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Petugas Piket ({totalPetugas})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('jadwal')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'jadwal'
              ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Jadwal Piket Mingguan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logbook')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'logbook'
              ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Buku Log Piket ({logList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('aksi_cepat')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'aksi_cepat'
              ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Aksi Cepat Kerja Piket</span>
        </button>
      </div>

      {/* TAB 1: DAFTAR PETUGAS PIKET */}
      {activeTab === 'petugas' && (
        <div className="space-y-4">
          {/* FILTER BAR */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama petugas piket, NIP, username, no hp..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={tipeFilter}
                onChange={(e) => setTipeFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="semua">Semua Tipe Piket</option>
                <option value="piket_guru">Piket Guru (Harian)</option>
                <option value="piket_kesiswaan">Piket Kesiswaan (Tatib)</option>
              </select>

              <select
                value={hariFilter}
                onChange={(e) => setHariFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="semua">Semua Hari Piket</option>
                {ALL_DAYS.map((d) => (
                  <option key={d} value={d}>
                    Hari {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PETUGAS GRID / LIST */}
          {filteredPetugas.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
              <ClipboardList className="w-10 h-10 mx-auto opacity-40 text-amber-500" />
              <p className="font-bold text-sm text-slate-600 dark:text-slate-300">
                Tidak ada petugas piket yang sesuai kriteria pencarian.
              </p>
              <p className="text-xs">
                Klik tombol "Tambah Petugas Piket" di atas untuk menambahkan petugas piket baru.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPetugas.map((p) => {
                const isGuru = p.tipe === 'piket_guru';
                const isTodayActive = (p.hariPiket || []).includes(todayDayName);

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 ${
                      isTodayActive
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-900 shadow-2xs'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-base shrink-0 shadow-xs ${
                            isGuru
                              ? 'bg-gradient-to-tr from-orange-600 to-amber-500'
                              : 'bg-gradient-to-tr from-purple-700 to-indigo-600'
                          }`}
                        >
                          {p.nama.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {p.nama}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                isGuru
                                  ? 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200'
                                  : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200'
                              }`}
                            >
                              {isGuru ? 'Piket Guru' : 'Piket Kesiswaan'}
                            </span>
                            {isTodayActive && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                Piket Hari Ini
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition cursor-pointer"
                            title="Edit Petugas Piket"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePetugas(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                            title="Hapus Petugas Piket"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Middle Info */}
                    <div className="py-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 text-[11px]">NIP / Identitas:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {p.nip || '-'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 text-[11px]">Shift Tugas:</span>
                        <span className="font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                          {p.shiftPiket === 'Semua' ? 'Shift Pagi & Siang' : `Shift ${p.shiftPiket || 'Pagi'}`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 text-[11px]">Username Login:</span>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-[11px]">
                          {p.username}
                        </span>
                      </div>

                      {p.noHp && (
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="text-slate-400 text-[11px]">WhatsApp:</span>
                          <a
                            href={`https://wa.me/${p.noHp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:underline font-bold flex items-center gap-1 text-[11px]"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{p.noHp}</span>
                          </a>
                        </div>
                      )}

                      {/* Days Pills */}
                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Hari Bertugas Piket:
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          {ALL_DAYS.map((day) => {
                            const isSelected = (p.hariPiket || []).includes(day);
                            const isToday = day === todayDayName;
                            return (
                              <span
                                key={day}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isSelected
                                    ? isToday
                                      ? 'bg-amber-600 text-white font-black shadow-2xs'
                                      : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                    : 'bg-slate-100 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 opacity-60'
                                }`}
                              >
                                {day.slice(0, 3)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Footer note */}
                    {p.keterangan && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 italic">
                        "{p.keterangan}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: JADWAL PIKET MINGGUAN */}
      {activeTab === 'jadwal' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>Matriks Jadwal Piket Mingguan (Senin - Jumat)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pembagian tugas harian Petugas Piket Guru Shift Pagi, Shift Siang, dan Petugas Kesiswaan Gerbang.
                </p>
              </div>

              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-xl border border-amber-200 dark:border-amber-900">
                Tahun Ajaran 2026/2027
              </span>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-3.5 font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider w-28">
                      Hari
                    </th>
                    <th className="py-3 px-3.5 font-black text-orange-700 dark:text-orange-300 uppercase tracking-wider">
                      Piket Guru (Shift Pagi • 06.30 - 12.00)
                    </th>
                    <th className="py-3 px-3.5 font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                      Piket Guru (Shift Siang • 13.00 - 16.50)
                    </th>
                    <th className="py-3 px-3.5 font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      Piket Kesiswaan / Tatib Gerbang
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => {
                    const isToday = day === todayDayName;
                    const pagiOfficers = petugasList.filter(
                      (p) =>
                        (p.hariPiket || []).includes(day) &&
                        p.tipe === 'piket_guru' &&
                        (p.shiftPiket === 'Pagi' || p.shiftPiket === 'Semua' || !p.shiftPiket)
                    );
                    const siangOfficers = petugasList.filter(
                      (p) =>
                        (p.hariPiket || []).includes(day) &&
                        p.tipe === 'piket_guru' &&
                        (p.shiftPiket === 'Siang' || p.shiftPiket === 'Semua')
                    );
                    const kesiswaanOfficers = petugasList.filter(
                      (p) => (p.hariPiket || []).includes(day) && p.tipe === 'piket_kesiswaan'
                    );

                    return (
                      <tr
                        key={day}
                        className={`transition ${
                          isToday
                            ? 'bg-amber-50/60 dark:bg-amber-950/20 font-medium'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-3.5 font-black text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{day}</span>
                            {isToday && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-amber-600 text-white">
                                Hari Ini
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Shift Pagi */}
                        <td className="py-3.5 px-3.5">
                          {pagiOfficers.length > 0 ? (
                            <div className="space-y-1">
                              {pagiOfficers.map((o) => (
                                <div key={o.id} className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                                  <span>{o.nama}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">- Belum diplot -</span>
                          )}
                        </td>

                        {/* Shift Siang */}
                        <td className="py-3.5 px-3.5">
                          {siangOfficers.length > 0 ? (
                            <div className="space-y-1">
                              {siangOfficers.map((o) => (
                                <div key={o.id} className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                  <span>{o.nama}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">- Belum diplot -</span>
                          )}
                        </td>

                        {/* Piket Kesiswaan */}
                        <td className="py-3.5 px-3.5">
                          {kesiswaanOfficers.length > 0 ? (
                            <div className="space-y-1">
                              {kesiswaanOfficers.map((o) => (
                                <div key={o.id} className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-200">
                                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
                                  <span>{o.nama}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">- Tim Kesiswaan Standby -</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SOP Piket Sekolah */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600" />
              <span>Standar Operasional Prosedur (SOP) Petugas Piket Sekolah</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
              <li>Hadir 15 menit sebelum bel masuk berbunyi dan menjaga gerbang sekolah bersama Tim Kesiswaan.</li>
              <li>Membantu proses Scan QR Presensi Siswa dan mencatat siswa yang datang terlambat.</li>
              <li>Mengawasi ketertiban pergantian jam pelajaran (KBM) serta mengisi kelas kosong jika guru berhalangan.</li>
              <li>Mencatat izin keluar masuk siswa dan tamu sekolah ke dalam Buku Log Piket Harian.</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 3: BUKU LOG PIKET */}
      {activeTab === 'logbook' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Cari catatan kejadian, tindakan, nama petugas..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsLogModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Catatan Kejadian</span>
            </button>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto opacity-40 text-amber-500" />
              <p className="font-bold text-sm text-slate-600 dark:text-slate-300">
                Belum ada catatan kejadian di Buku Piket.
              </p>
              <p className="text-xs">
                Klik tombol "Tambah Catatan Kejadian" untuk mencatat keterlambatan, izin keluar, atau kejadian gerbang hari ini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                        📅 {log.hari}, {log.tanggal}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Shift {log.shift}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          log.status === 'selesai'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : log.status === 'tindak_lanjut'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {log.status === 'tindak_lanjut' ? 'Perlu Tindak Lanjut' : log.status}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteLog(log.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition cursor-pointer"
                      title="Hapus Catatan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                    {log.kejadian}
                  </div>

                  {log.tindakan && (
                    <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-900 dark:text-amber-200">
                      <strong>Tindakan Petugas:</strong> {log.tindakan}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                    <span>Pencatat: {log.petugasNama}</span>
                    <span>{new Date(log.createdAt).toLocaleTimeString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AKSI CEPAT PIKET */}
      {activeTab === 'aksi_cepat' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onOpenServerQrModal && onOpenServerQrModal()}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 shadow-2xs hover:shadow-md transition text-left space-y-3 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center group-hover:scale-105 transition shadow-xs">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-amber-600 transition">
                Scan QR Gerbang
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tampilkan server QR presensi dinamis di gerbang masuk sekolah.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateView && onNavigateView('presensi_input')}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 shadow-2xs hover:shadow-md transition text-left space-y-3 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center group-hover:scale-105 transition shadow-xs">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                Input Presensi Kelas
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Pencatatan presensi manual kelas dan siswa yang datang terlambat.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateView && onNavigateView('catatan_pelanggaran')}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 shadow-2xs hover:shadow-md transition text-left space-y-3 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center group-hover:scale-105 transition shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-rose-600 transition">
                Catatan Pelanggaran Siswa
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Buku pelanggaran tata tertib siswa, poin minus, dan tindak lanjut.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateView && onNavigateView('rekap_harian')}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-2xs hover:shadow-md transition text-left space-y-3 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center group-hover:scale-105 transition shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 transition">
                Rekap Kehadiran Harian
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Laporan pantauan kehadiran harian seluruh rombel kelas.
              </p>
            </div>
          </button>
        </div>
      )}

      {/* MODAL FORM TAMBAH / EDIT PETUGAS PIKET */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {editingPetugas ? 'Edit Data Petugas Piket' : 'Tambah Petugas Piket Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bagian khusus petugas piket guru &amp; kesiswaan sekolah
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePetugas} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Tipe Piket */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tipe Penugasan Piket <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormTipe('piket_guru')}
                    className={`p-3 rounded-2xl border text-left font-bold text-xs transition cursor-pointer flex items-center gap-2.5 ${
                      formTipe === 'piket_guru'
                        ? 'bg-orange-50 dark:bg-orange-950/50 border-orange-500 text-orange-900 dark:text-orange-200 ring-2 ring-orange-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-orange-600 shrink-0" />
                    <div>
                      <div>Piket Guru Harian</div>
                      <div className="text-[10px] font-normal opacity-80">Jaga KBM &amp; Gerbang</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormTipe('piket_kesiswaan')}
                    className={`p-3 rounded-2xl border text-left font-bold text-xs transition cursor-pointer flex items-center gap-2.5 ${
                      formTipe === 'piket_kesiswaan'
                        ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-500 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <div>Piket Kesiswaan</div>
                      <div className="text-[10px] font-normal opacity-80">Tatib &amp; Kedisiplinan</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Nama */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Lengkap &amp; Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Diana Lestari, S.Pd"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              {/* NIP & No HP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    NIP / No. Identitas
                  </label>
                  <input
                    type="text"
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value)}
                    placeholder="Contoh: 199202022016012004"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formNoHp}
                    onChange={(e) => setFormNoHp(e.target.value)}
                    placeholder="Contoh: 085212345678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
              </div>

              {/* Shift Piket */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Shift Piket
                </label>
                <div className="flex items-center gap-2">
                  {(['Pagi', 'Siang', 'Semua'] as const).map((shift) => (
                    <button
                      key={shift}
                      type="button"
                      onClick={() => setFormShift(shift)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        formShift === shift
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {shift === 'Semua' ? 'Semua Shift' : `Shift ${shift}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hari Bertugas Piket */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Hari Bertugas Piket <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {ALL_DAYS.map((day) => {
                    const isSelected = formHariPiket.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleFormDay(day)}
                        className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-bold text-[11px] transition cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs scale-105'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <span>{day.slice(0, 3)}</span>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Username & Password Akun Login */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Kredensial Akun Login Petugas Piket</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Username <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="username_piket"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Password login"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono pr-8 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Catatan / Keterangan Tugas
                </label>
                <textarea
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Contoh: Petugas Guru Piket Harian Shift Pagi"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition cursor-pointer"
                >
                  {editingPetugas ? 'Simpan Perubahan' : 'Tambahkan Petugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATATAN KEJADIAN PIKET */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Tulis Catatan Buku Piket
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dokumentasi kejadian gerbang, siswa terlambat, atau izin keluar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={logTanggal}
                    onChange={(e) => setLogTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Shift
                  </label>
                  <select
                    value={logShift}
                    onChange={(e) => setLogShift(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  >
                    <option value="Pagi">Shift Pagi</option>
                    <option value="Siang">Shift Siang</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Uraian Kejadian / Laporan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={logKejadian}
                  onChange={(e) => setLogKejadian(e.target.value)}
                  placeholder="Contoh: 5 siswa kelas X TSM terlambat 15 menit karena hujan deras di jalan..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tindakan Petugas / Follow-up
                </label>
                <textarea
                  rows={2}
                  value={logTindakan}
                  onChange={(e) => setLogTindakan(e.target.value)}
                  placeholder="Contoh: Diberi pembinaan kedisiplinan di ruang piket, dicatat kartu keterlambatan, diizinkan masuk kelas jam ke-2."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Status Penanganan
                </label>
                <select
                  value={logStatus}
                  onChange={(e) => setLogStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="selesai">Selesai Ditangani</option>
                  <option value="tindak_lanjut">Perlu Tindak Lanjut (Wali Kelas / BK)</option>
                  <option value="info">Hanya Informasi / Catatan</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition cursor-pointer"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
