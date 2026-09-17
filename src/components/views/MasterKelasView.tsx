import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  DoorOpen,
  Plus,
  Edit,
  Trash,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Upload,
  Eye,
  Search,
  Shuffle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building,
  List,
  LayoutGrid,
  Users,
  Settings,
  ChevronDown,
  FileDown,
  SlidersHorizontal,
} from 'lucide-react';
import { AppData, Kelas } from '../../types';
import { randomizeWaliKelasForClasses, sortKelasList } from '../../data/initialData';
import { Pagination } from '../Pagination';
import { addAuditLog, extractKelasTingkat, determineKelasKelompok } from '../../utils/helpers';
import { PageHeader } from '../common/UIComponents';

interface MasterKelasViewProps {
  appData: AppData;
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
}

export const MasterKelasView: React.FC<MasterKelasViewProps> = ({
  appData,
  readOnly = false,
  onUpdateAppData,
  onOpenModal,
  onCloseModal,
  onConfirmModal,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const hasJurusan = appData.jurusan && appData.jurusan.length > 0;
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'list'));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJurusanId, setFilterJurusanId] = useState('');
  const [sortField, setSortField] = useState<'nama' | 'jurusan' | 'wali' | 'jumlahSiswa'>('nama');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsDropdownRef.current &&
        !settingsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  let filteredKelas = appData.kelas.filter((k) => {
    if (filterJurusanId && k.jurusanId !== filterJurusanId) return false;

    const q = searchTerm.toLowerCase();
    if (!q) return true;
    const jur = appData.jurusan.find((j) => j.id === k.jurusanId);
    const wali = appData.waliKelas.find((w) => w.id === k.waliKelasId);
    return (
      k.nama.toLowerCase().includes(q) ||
      (jur && jur.nama.toLowerCase().includes(q)) ||
      (wali && wali.nama.toLowerCase().includes(q))
    );
  });

  if (sortField === 'nama') {
    const sorted = sortKelasList(filteredKelas);
    filteredKelas = sortDirection === 'asc' ? sorted : sorted.reverse();
  } else {
    filteredKelas = [...filteredKelas].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'jurusan') {
        valA = appData.jurusan.find((j) => j.id === a.jurusanId)?.nama || '';
        valB = appData.jurusan.find((j) => j.id === b.jurusanId)?.nama || '';
      } else if (sortField === 'wali') {
        valA = appData.waliKelas.find((w) => w.id === a.waliKelasId)?.nama || '';
        valB = appData.waliKelas.find((w) => w.id === b.waliKelasId)?.nama || '';
      } else if (sortField === 'jumlahSiswa') {
        valA = appData.siswa.filter((s) => s.kelasId === a.id).length;
        valB = appData.siswa.filter((s) => s.kelasId === b.id).length;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }

  const handleSort = (field: 'nama' | 'jurusan' | 'wali' | 'jumlahSiswa') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const validPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
  const validCurrentPage = Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1;
  const totalPages = Math.ceil(filteredKelas.length / validPageSize) || 1;
  const startIdx = (validCurrentPage - 1) * validPageSize;
  const pagedKelas = filteredKelas.slice(startIdx, startIdx + validPageSize);

  const handleDownloadTemplate = () => {
    const defaultJurusanList = [
      'Rekayasa Perangkat Lunak',
      'Teknik Komputer dan Jaringan',
      'Desain Komunikasi Visual',
      'Teknik dan Bisnis Sepeda Motor',
      'Teknik Kendaraan Ringan Otomotif',
      'Akuntansi dan Keuangan Lembaga',
      'Otomatisasi dan Tata Kelola Perkantoran',
      'Bisnis Daring dan Pemasaran',
      'Tata Boga / Kuliner',
      'Teknik Audio Video',
    ];

    const availableJurusan = appData.jurusan.length > 0
      ? appData.jurusan.map((j) => j.nama)
      : defaultJurusanList;

    const maleFirst = ['Budi', 'Ahmad', 'Agus', 'Hendra', 'Dedi', 'Eko', 'Fajar', 'Herman', 'Irfan', 'Joko', 'Kurnia', 'Lukman', 'Mulyadi', 'Nugroho', 'Oki', 'Prabowo', 'Rahmat', 'Suryono', 'Taufik', 'Wahyu', 'Yudi', 'Zaenal', 'Andi', 'Bambang', 'Cecep', 'Dodi', 'Edi'];
    const femaleFirst = ['Siti', 'Dewi', 'Sri', 'Anisa', 'Rina', 'Nur', 'Endang', 'Fitri', 'Indah', 'Kartika', 'Lilis', 'Maya', 'Nining', 'Puspa', 'Ratna', 'Suci', 'Titi', 'Utami', 'Yuni', 'Ani', 'Beti', 'Cici', 'Dina', 'Erna', 'Gita', 'Hani', 'Ika'];
    const lastNames = ['Santoso', 'Aminah', 'Setiawan', 'Hidayat', 'Wibowo', 'Kurniawan', 'Suryadi', 'Pratama', 'Lestari', 'Sutrisno', 'Rahayu', 'Handayani', 'Mulyani', 'Saputra', 'Nugraha', 'Wijaya', 'Kusuma', 'Kusnadi', 'Firmansyah', 'Arifin', 'Baskoro', 'Puspasari', 'Syahputra', 'Subagyo', 'Supriatna', 'Widodo', 'Suhendra'];
    const titles = ['S.Pd.', 'M.Pd.', 'S.T.', 'M.T.', 'S.Ag.', 'M.M.', 'S.Kom.'];

    const getWaliName = (idx: number) => {
      if (appData.waliKelas && appData.waliKelas.length > 0) {
        return appData.waliKelas[idx % appData.waliKelas.length].nama;
      }
      const isMale = idx % 2 === 0;
      const fName = isMale ? maleFirst[idx % maleFirst.length] : femaleFirst[idx % femaleFirst.length];
      const lName = lastNames[(idx * 2) % lastNames.length];
      const title = titles[(idx * 3) % titles.length];
      return `${fName} ${lName}, ${title}`;
    };

    const levels = ['X', 'XI', 'XII'];
    const templateData: { KELAS: string; JURUSAN: string; 'WALI KELAS': string }[] = [];

    let count = 0;
    levels.forEach((level) => {
      // 18 classes per level = 54 total classes across X, XI, XII
      for (let i = 0; i < 18; i++) {
        const jurIndex = availableJurusan.length > 0 ? i % availableJurusan.length : 0;
        const jurusanNama = availableJurusan[jurIndex] || 'Umum';
        
        // Short code for class name
        const jurObj = appData.jurusan.find((j) => j.nama === jurusanNama);
        const jurCode = jurObj ? jurObj.kode : jurusanNama.split(' ').map(w => w[0]).join('').toUpperCase();
        const sectionNum = Math.floor(i / availableJurusan.length) + 1;

        const className = `${level} ${jurCode} ${sectionNum}`;
        const waliName = getWaliName(count);

        templateData.push({
          KELAS: className,
          JURUSAN: jurusanNama,
          'WALI KELAS': waliName,
        });
        count++;
      }
    });

    const ws = XLSX.utils.json_to_sheet(templateData);

    ws['!cols'] = [
      { wch: 18 }, // KELAS
      { wch: 40 }, // JURUSAN
      { wch: 35 }, // WALI KELAS
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template 54 Kelas');
    XLSX.writeFile(wb, 'Template_Import_54_Kelas.xlsx');
    onShowToast('Template Excel 54 Kelas berhasil diunduh!', 'success');
  };

  const handleExportExcel = () => {
    if (filteredKelas.length === 0) {
      onShowToast('Tidak ada data kelas untuk diekspor!', 'warning');
      return;
    }

    const dataToExport = filteredKelas.map((k, idx) => {
      const jur = appData.jurusan.find((j) => j.id === k.jurusanId);
      const wali = appData.waliKelas.find((w) => w.id === k.waliKelasId);
      const siswaInKelas = appData.siswa.filter((s) => s.kelasId === k.id);
      const maleCount = siswaInKelas.filter((s) => s.gender === 'L' || (s as any).jenisKelamin === 'L').length;
      const femaleCount = siswaInKelas.filter((s) => s.gender === 'P' || (s as any).jenisKelamin === 'P').length;

      // Extract tingkat (X, XI, XII)
      const t = extractKelasTingkat(k.nama);
      const tingkat = t !== 'LAIN' ? t : '-';
      const kelompok = determineKelasKelompok(k.nama);
      const kelompokLabel = kelompok === 1 ? 'Kelompok 1 (Kelas X & XI)' : 'Kelompok 2 (Kelas XII)';

      const waliNamaLengkap = wali ? wali.nama : '-';

      return {
        'No': idx + 1,
        'Nama Kelas': k.nama,
        'Tingkat': tingkat,
        'Kelompok Shift': kelompokLabel,
        'Jurusan': jur ? jur.nama : '-',
        'Kode Jurusan': jur ? jur.kode : '-',
        'Wali Kelas': waliNamaLengkap,
        'NIP Wali Kelas': wali?.nip || '-',
        'NUPTK Wali Kelas': wali?.nuptk || '-',
        'No. HP Wali': wali?.noHp || '-',
        'Laki-laki': maleCount,
        'Perempuan': femaleCount,
        'Total Siswa': siswaInKelas.length,
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 20 }, // Nama Kelas
      { wch: 10 }, // Tingkat
      { wch: 35 }, // Jurusan
      { wch: 15 }, // Kode Jurusan
      { wch: 32 }, // Wali Kelas
      { wch: 22 }, // NIP Wali Kelas
      { wch: 20 }, // NUPTK Wali Kelas
      { wch: 18 }, // No. HP Wali
      { wch: 12 }, // Laki-laki
      { wch: 12 }, // Perempuan
      { wch: 14 }, // Total Siswa
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Kelas');
    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Master_Data_Kelas_${timestamp}.xlsx`);
    onShowToast(`Berhasil mengekspor ${filteredKelas.length} data kelas ke Excel!`, 'success');
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        let addedCount = 0;
        const newKelasList = [...appData.kelas];

        rows.forEach((r) => {
          const nama = String(r.KELAS || r.kelas || r.NAMA || r.nama || r['NAMA KELAS'] || r['Nama Kelas'] || '').trim();
          const jurusanStr = String(r.JURUSAN || r.jurusan || r.JUR || r.jur || r.KODE || r.kode || '').trim();
          const waliStr = String(r['WALI KELAS'] || r.wali_kelas || r.WALI || r.wali || r['Wali Kelas'] || '').trim();

          const jurObj = appData.jurusan.find(
            (j) =>
              j.nama.toLowerCase() === jurusanStr.toLowerCase() ||
              j.kode.toLowerCase() === jurusanStr.toLowerCase()
          );
          const targetJurusanId = jurObj ? jurObj.id : appData.jurusan.length > 0 ? appData.jurusan[0].id : '';

          const waliObj = appData.waliKelas.find(
            (w) => waliStr && w.nama.toLowerCase().includes(waliStr.toLowerCase())
          );
          const targetWaliId = waliObj ? waliObj.id : appData.waliKelas.length > 0 ? appData.waliKelas[0].id : '';

          if (nama && targetJurusanId) {
            newKelasList.push({
              id: 'KEL_' + Date.now() + Math.random().toString(36).substr(2, 4),
              nama,
              jurusanId: targetJurusanId,
              waliKelasId: targetWaliId,
            });
            addedCount++;
          }
        });

        let nextAppData = { ...appData, kelas: newKelasList };
        nextAppData = addAuditLog(nextAppData, 'Impor Kelas Excel', `Mengimpor ${addedCount} data kelas dari file Excel.`);
        onUpdateAppData(nextAppData);

        onShowToast(`Berhasil mengimpor ${addedCount} data Kelas!`, 'success');
      } catch (err) {
        onShowToast('Gagal memproses file Excel!', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveKelas = (id: string | null, nama: string, jurusanId: string, waliKelasId: string) => {
    let newKelas = [...appData.kelas];
    let logAksi = '';
    let logDetail = '';

    if (id) {
      newKelas = newKelas.map((k) => (k.id === id ? { ...k, nama, jurusanId, waliKelasId } : k));
      onShowToast('Data Kelas berhasil diperbarui!', 'success');
      logAksi = 'Ubah Kelas';
      logDetail = `Mengubah informasi kelas ${nama}.`;
    } else {
      newKelas.push({
        id: 'KEL_' + Date.now(),
        nama,
        jurusanId,
        waliKelasId,
      });
      onShowToast('Kelas berhasil ditambahkan!', 'success');
      logAksi = 'Tambah Kelas';
      logDetail = `Menambahkan kelas baru ${nama}.`;
    }

    let nextAppData = { ...appData, kelas: newKelas };
    nextAppData = addAuditLog(nextAppData, logAksi, logDetail);
    onUpdateAppData(nextAppData);

    onCloseModal();
  };

  const openFormKelas = (kelas?: Kelas) => {
    if (!hasJurusan) {
      onShowToast('Data Jurusan belum ada! Silakan isi Data Jurusan terlebih dahulu.', 'warning');
      return;
    }

    const isEdit = !!kelas;

    const FormContent = () => {
      const sortedWaliKelas = [...appData.waliKelas].sort((a, b) =>
        a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' })
      );
      const [nama, setNama] = React.useState(kelas ? kelas.nama : '');
      const [jurusanId, setJurusanId] = React.useState(
        kelas ? kelas.jurusanId : appData.jurusan.length > 0 ? appData.jurusan[0].id : ''
      );
      const [waliKelasId, setWaliKelasId] = React.useState(
        kelas ? kelas.waliKelasId : sortedWaliKelas.length > 0 ? sortedWaliKelas[0].id : ''
      );

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveKelas(kelas ? kelas.id : null, nama.trim(), jurusanId, waliKelasId);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Nama Kelas</label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none"
              placeholder="Misal: XII RPL 1"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Jurusan</label>
            <select
              required
              value={jurusanId}
              onChange={(e) => setJurusanId(e.target.value)}
              className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              {appData.jurusan.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama} ({j.kode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Wali Kelas Penanggung Jawab
            </label>
            <select
              required
              value={waliKelasId}
              onChange={(e) => setWaliKelasId(e.target.value)}
              className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="">-- Pilih Wali Kelas --</option>
              {sortedWaliKelas.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={onCloseModal} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
              Batal
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-theme-primary hover:bg-theme-primary-dark text-white text-xs font-bold transition">
              Simpan
            </button>
          </div>
        </form>
      );
    };

    onOpenModal(isEdit ? 'Edit Data Kelas' : 'Tambah Kelas Baru', <FormContent />);
  };

  const handleDeleteKelas = (id: string) => {
    const targetKelas = appData.kelas.find((k) => k.id === id);
    onConfirmModal('Hapus Kelas', 'Apakah Anda yakin ingin menghapus kelas ini?', 'danger', () => {
      const newKelas = appData.kelas.filter((k) => k.id !== id);
      let nextAppData = { ...appData, kelas: newKelas };
      nextAppData = addAuditLog(nextAppData, 'Hapus Kelas', `Menghapus kelas ${targetKelas ? targetKelas.nama : id}.`);
      onUpdateAppData(nextAppData);
      onShowToast('Data kelas telah dihapus!', 'info');
    });
  };

  const handleHapusSeluruh = () => {
    if (appData.kelas.length === 0) {
      onShowToast('Data Kelas sudah kosong!', 'warning');
      return;
    }
    onConfirmModal('Konfirmasi Hapus Massal', 'Apakah Anda yakin ingin menghapus SELURUH data Kelas?', 'danger', () => {
      let nextAppData = { ...appData, kelas: [] };
      nextAppData = addAuditLog(nextAppData, 'Hapus Massal Kelas', 'Menghapus seluruh daftar kelas sekolah.');
      onUpdateAppData(nextAppData);
      onShowToast('Seluruh data kelas berhasil dihapus!', 'success');
    });
  };

  const handleAcakWaliKelas = () => {
    if (!appData.kelas || appData.kelas.length === 0) {
      onShowToast('Belum ada data Kelas!', 'warning');
      return;
    }
    if (!appData.waliKelas || appData.waliKelas.length === 0) {
      onShowToast('Belum ada data Wali Kelas! Silakan tambahkan data Wali Kelas terlebih dahulu.', 'warning');
      return;
    }

    const doRandomize = () => {
      const updatedKelas = randomizeWaliKelasForClasses(appData.kelas, appData.waliKelas);
      let nextAppData = { ...appData, kelas: updatedKelas };
      nextAppData = addAuditLog(nextAppData, 'Acak Wali Kelas', 'Melakukan pengacakan penugasan Wali Kelas ke seluruh kelas secara otomatis.');
      onUpdateAppData(nextAppData);
      onShowToast(`Berhasil mengacak Wali Kelas untuk seluruh ${updatedKelas.length} kelas!`, 'success');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Acak Wali Kelas',
        `Apakah Anda yakin ingin menetapkan Wali Kelas secara acak untuk seluruh ${appData.kelas.length} kelas?`,
        'info',
        doRandomize
      );
    } else {
      doRandomize();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {readOnly && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3 text-purple-900">
          <Eye className="w-5 h-5 shrink-0 text-purple-600" />
          <div className="text-xs font-semibold">
            <span className="font-bold">Mode View Only (WKS Kesiswaan / BP BK):</span> Anda dapat memantau daftar kelas, namun tidak dapat mengubah atau menghapus data master.
          </div>
        </div>
      )}

      <PageHeader
        icon={Building}
        title="Master Data Kelas"
        description={readOnly ? 'Daftar rombel/kelas beserta wali kelas dan informasi tingkat jurusan.' : 'Kelola data rombel/kelas, pembagian wali kelas, dan informasi tingkat jurusan.'}
        badge="Master Data Rombel"
        actions={
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                disabled={!hasJurusan}
                onClick={() => openFormKelas()}
                className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer ${
                  !hasJurusan ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kelas</span>
              </button>
            )}
          </div>
        }
      />

      {!hasJurusan && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-800">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          <div className="text-xs font-bold">Data Jurusan Belum Ada!</div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-30">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Filter Jurusan</label>
            <select
              value={filterJurusanId}
              onChange={(e) => {
                setFilterJurusanId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Jurusan ({appData.jurusan.length})</option>
              {appData.jurusan.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama} ({j.kode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Urutkan Berdasarkan</label>
            <div className="flex gap-2">
              <select
                value={sortField}
                onChange={(e) => handleSort(e.target.value as any)}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="nama">Nama Kelas</option>
                <option value="jurusan">Jurusan</option>
                <option value="wali">Wali Kelas</option>
                <option value="jumlahSiswa">Jumlah Siswa</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                title={`Urutan: ${sortDirection === 'asc' ? 'A-Z / Naik' : 'Z-A / Turun'}`}
              >
                {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 text-blue-600" /> : <ArrowDown className="w-4 h-4 text-blue-600" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Cari Kelas</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama kelas, jurusan, wali..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Toolbar di Atas Tabel: Pengaturan & View Switcher */}
        <div className="flex items-center gap-2 self-end md:self-end shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls"
            onChange={handleExcelImport}
            className="hidden"
          />

          {readOnly ? (
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Ekspor Data Kelas ke File Excel (.xlsx)"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          ) : (
            <div className="relative z-50" ref={settingsDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className={`px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition flex items-center gap-2 cursor-pointer ${
                  isSettingsOpen ? 'ring-2 ring-blue-500 border-transparent bg-white dark:bg-slate-800' : ''
                }`}
                title="Menu Pengaturan & Alat Data Kelas"
              >
                <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Pengaturan</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    isSettingsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isSettingsOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2.5rem)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] p-1.5 text-left text-xs divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in-50 zoom-in-95 duration-150">
                  {/* Grup 1: Import & Export Excel */}
                  <div className="p-1 space-y-0.5">
                    <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Import &amp; Export Excel
                    </div>
                    <button
                      type="button"
                      disabled={!hasJurusan}
                      onClick={() => {
                        setIsSettingsOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-semibold text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-700 dark:hover:text-teal-300 transition cursor-pointer ${
                        !hasJurusan ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs">Import Excel</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Unggah berkas data rombel (.xlsx)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        handleExportExcel();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 transition cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Download className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs">Export Excel</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Unduh data kelas saat ini</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        handleDownloadTemplate();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-700 dark:hover:text-purple-300 transition cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 shrink-0">
                        <FileDown className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs">Template Excel</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Format standar 54 rombel kelas</div>
                      </div>
                    </button>
                  </div>

                  {/* Grup 2: Utilitas & Pembagian */}
                  <div className="p-1 space-y-0.5">
                    <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Utilitas Kelas
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        handleAcakWaliKelas();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300 transition cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 shrink-0">
                        <Shuffle className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs">Acak Wali Kelas</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Penetapan wali otomatis ke rombel</div>
                      </div>
                    </button>
                  </div>

                  {/* Grup 3: Hapus Data */}
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        handleHapusSeluruh();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs">Hapus Seluruh Kelas</div>
                        <div className="text-[10px] text-rose-400/80 dark:text-rose-400/70">Kosongkan seluruh master rombel</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View Switcher: List & Grid */}
          <div className="flex items-center self-end sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="Tampilan Tabel / List"
            >
              <List className="w-4 h-4" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="Tampilan Kartu / Grid"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Grid</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {pagedKelas.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <DoorOpen className="w-8 h-8 mx-auto mb-3 text-slate-300" />
            {searchTerm ? 'Tidak ditemukan kelas yang sesuai.' : 'Belum ada data kelas tersimpan.'}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View: Responsive Cards */
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pagedKelas.map((k, idx) => {
                const jur = appData.jurusan.find((j) => j.id === k.jurusanId);
                const wali = appData.waliKelas.find((w) => w.id === k.waliKelasId);
                const studentCount = appData.siswa.filter((s) => s.kelasId === k.id).length;

                return (
                  <div
                    key={k.id}
                    className="p-4 bg-white dark:bg-slate-800/90 hover:shadow-md border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex flex-col justify-between shadow-xs transition duration-150"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-black text-xs shrink-0">
                            #{startIdx + idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight truncate">{k.nama}</h4>
                            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">{jur ? jur.nama : '-'}</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-full shrink-0 flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{studentCount} Siswa</span>
                        </span>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400 font-medium">Wali Kelas:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200 text-right truncate">{wali ? wali.nama : '-'}</span>
                        </div>
                      </div>
                    </div>

                    {!readOnly && (
                      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={!hasJurusan}
                          onClick={() => openFormKelas(k)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteKelas(k.id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List View: Full Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-4 text-center w-12">No</th>
                  <th className="p-4 cursor-pointer hover:text-blue-600 transition select-none" onClick={() => handleSort('nama')}>
                    <div className="flex items-center gap-1.5">
                      <span>Nama Kelas</span>
                      {sortField === 'nama' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-blue-600 transition select-none" onClick={() => handleSort('jurusan')}>
                    <div className="flex items-center gap-1.5">
                      <span>Jurusan</span>
                      {sortField === 'jurusan' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-blue-600 transition select-none" onClick={() => handleSort('wali')}>
                    <div className="flex items-center gap-1.5">
                      <span>Wali Kelas</span>
                      {sortField === 'wali' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-blue-600 transition select-none" onClick={() => handleSort('jumlahSiswa')}>
                    <div className="flex items-center gap-1.5">
                      <span>Jml Siswa</span>
                      {sortField === 'jumlahSiswa' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedKelas.map((k, idx) => {
                  const jur = appData.jurusan.find((j) => j.id === k.jurusanId);
                  const wali = appData.waliKelas.find((w) => w.id === k.waliKelasId);
                  const studentCount = appData.siswa.filter((s) => s.kelasId === k.id).length;

                  return (
                    <tr key={k.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4 text-center font-bold text-slate-400">
                        {startIdx + idx + 1}
                      </td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{k.nama}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{jur ? jur.nama : '-'}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{wali ? wali.nama : '-'}</td>
                      <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        <span className="inline-block px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-bold text-xs">
                          {studentCount}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {!readOnly ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              disabled={!hasJurusan}
                              onClick={() => openFormKelas(k)}
                              className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 rounded-xl border border-blue-200/80 dark:border-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              title="Edit Kelas"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteKelas(k.id)}
                              className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl border border-rose-200/80 dark:border-rose-800 transition cursor-pointer"
                              title="Hapus Kelas"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold rounded-lg text-[10px]">
                            View Only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredKelas.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};
