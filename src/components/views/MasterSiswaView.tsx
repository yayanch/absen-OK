import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import { Users, Plus, Edit, Trash, Trash2, FileSpreadsheet, Download, Upload, AlertTriangle, Eye, EyeOff, Search, Phone, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, QrCode, Printer, Copy, Check, User, MapPin, Calendar, Lock, GraduationCap, Camera, LayoutGrid, List, Settings, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AppData, Siswa, Kelas, UserSession } from '../../types';
import { randomizeWaForStudents, generateRandomWaNumber, sortKelasList } from '../../data/initialData';
import { compressBase64Image, addAuditLog, formatTTL, extractKelasTingkat } from '../../utils/helpers';
import { Pagination } from '../Pagination';
import { ImportSiswaModal } from './ImportSiswaModal';
import { PageHeader } from '../common/UIComponents';

interface MasterSiswaViewProps {
  appData: AppData;
  currentUser?: UserSession;
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

interface SiswaQrModalContentProps {
  siswa: Siswa;
  kelasNama: string;
  sekolahNama: string;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onClose: () => void;
}

const SiswaQrModalContent: React.FC<SiswaQrModalContentProps> = ({
  siswa,
  kelasNama,
  sekolahNama,
  onShowToast,
  onClose,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const payload = JSON.stringify({
      nisn: siswa.nisn,
      nama: siswa.nama,
      id: siswa.id,
      siswaId: siswa.id,
      kelas: kelasNama,
      sekolah: sekolahNama,
    });
    QRCode.toDataURL(payload, { width: 320, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } })
      .then((url) => setQrUrl(url))
      .catch((err) => console.error('QR Error:', err));
  }, [siswa, kelasNama, sekolahNama]);

  const handleCopyNisn = () => {
    if (!siswa.nisn) return;
    navigator.clipboard.writeText(siswa.nisn);
    setCopied(true);
    onShowToast(`NISN ${siswa.nisn} disalin ke clipboard!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `QR_Siswa_${siswa.nisn || siswa.nama.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast('Gambar QR Code berhasil diunduh!', 'success');
  };

  const handlePrintCard = () => {
    if (!qrUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      onShowToast('Gagal membuka jendela cetak. Izinkan pop-up di browser.', 'warning');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kartu QR Presensi - ${siswa.nama}</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f8fafc; margin: 0; padding: 20px; }
            .card { width: 320px; background: #ffffff; border-radius: 16px; border: 2px solid #cbd5e1; padding: 20px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
            .header { background: #0f172a; color: white; padding: 8px; border-radius: 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
            .title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
            .subtitle { font-size: 12px; font-weight: bold; color: #2563eb; margin-bottom: 12px; font-family: monospace; }
            .details { font-size: 11px; color: #475569; margin-bottom: 16px; text-align: left; background: #f1f5f9; padding: 10px; border-radius: 8px; }
            .details p { margin: 4px 0; }
            .qr-img { width: 200px; height: 200px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 8px; background: white; margin: 0 auto; }
            .footer { font-size: 9px; color: #94a3b8; margin-top: 14px; text-transform: uppercase; font-weight: 600; }
            @media print { body { background: none; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">${sekolahNama || 'KARTU PRESENSI DIGITAL'}</div>
            <h2 class="title">${siswa.nama}</h2>
            <div class="subtitle">NISN: ${siswa.nisn || '-'}</div>
            <div class="details">
              <p><strong>Kelas:</strong> ${kelasNama || '-'}</p>
              <p><strong>Gender:</strong> ${siswa.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
              <p><strong>Orang Tua:</strong> ${siswa.namaOrangTua || '-'}</p>
            </div>
            <img src="${qrUrl}" class="qr-img" />
            <div class="footer">Scan QR Code ini untuk pencatatan presensi sekolah</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5 py-2">
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden border border-slate-700/60">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-indigo-200 font-semibold uppercase tracking-wider">
          <span>{sekolahNama || 'Kartu Digital Siswa'}</span>
          <span className="bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full font-mono text-[10px]">
            {kelasNama || '-'}
          </span>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center gap-5">
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div>
              <div className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Nama Siswa</div>
              <div className="text-lg font-black text-white leading-snug">{siswa.nama}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">NISN / Token</div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5 font-mono text-sm font-bold text-emerald-300">
                <span>{siswa.nisn || '-'}</span>
                {siswa.nisn && (
                  <button
                    type="button"
                    onClick={handleCopyNisn}
                    className="p-1 hover:bg-white/10 rounded-md transition text-xs cursor-pointer text-indigo-200"
                    title="Salin NISN"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-300">
              <div>
                <span className="text-slate-400">Gender: </span>
                <span className="font-semibold">{siswa.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
              </div>
              <div>
                <span className="text-slate-400">Ortu: </span>
                <span className="font-semibold truncate">{siswa.namaOrangTua || '-'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl shadow-lg border-2 border-indigo-100 shrink-0 flex flex-col items-center">
            {qrUrl ? (
              <img src={qrUrl} alt={`QR Code ${siswa.nama}`} className="w-36 h-36 object-contain" />
            ) : (
              <div className="w-36 h-36 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400">
                Memuat QR...
              </div>
            )}
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">
              Presensi Digital
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
        <button
          type="button"
          onClick={handleCopyNisn}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Tersalin' : 'Salin NISN'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadQr}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh QR</span>
          </button>

          <button
            type="button"
            onClick={handlePrintCard}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Kartu</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const MasterSiswaView: React.FC<MasterSiswaViewProps> = ({
  appData,
  currentUser,
  readOnly = false,
  onUpdateAppData,
  onOpenModal,
  onCloseModal,
  onConfirmModal,
  onShowToast,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isWali = currentUser?.role === 'wali';
  const isKesiswaan = currentUser?.role === 'kesiswaan';

  const canEdit = !readOnly || isAdmin || isWali || isKesiswaan;
  const canAdd = !readOnly || isAdmin || isWali || isKesiswaan;
  const canDelete = !readOnly && (isAdmin || isKesiswaan);
  const canMassDelete = !readOnly && (isAdmin || isKesiswaan);

  const sortedKelas = sortKelasList(appData.kelas);
  const waliClasses = isWali
    ? sortedKelas.filter((k) => k.waliKelasId === (currentUser?.data as any)?.id)
    : sortedKelas;

  const [filterKelasId, setFilterKelasId] = useState<string>(
    isWali && waliClasses.length > 0 ? waliClasses[0].id : ''
  );
  const [filterStatus, setFilterStatus] = useState<string>('semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<'nama' | 'nisn' | 'gender' | 'kelas' | 'status'>('nama');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'list'));
  const [activeTingkatDetail, setActiveTingkatDetail] = useState<'X' | 'XI' | 'XII' | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasJurusan = appData.jurusan && appData.jurusan.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  let filteredSiswa = appData.siswa;
  if (isWali) {
    const waliClassIds = waliClasses.map((k) => k.id);
    filteredSiswa = filteredSiswa.filter((s) => waliClassIds.includes(s.kelasId));
  }
  if (filterKelasId) {
    filteredSiswa = filteredSiswa.filter((s) => s.kelasId === filterKelasId);
  }
  if (filterStatus === 'aktif') {
    filteredSiswa = filteredSiswa.filter(
      (s) => s.status !== 'tidak_aktif' && (s as any).status !== 'nonaktif' && s.kelasId && appData.kelas.some((k) => k.id === s.kelasId)
    );
  } else if (filterStatus === 'tidak_aktif') {
    filteredSiswa = filteredSiswa.filter(
      (s) => s.status === 'tidak_aktif' || (s as any).status === 'nonaktif' || !s.kelasId || !appData.kelas.some((k) => k.id === s.kelasId)
    );
  }
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    filteredSiswa = filteredSiswa.filter(
      (s) => s.nama.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q)
    );
  }

  // Sorting
  filteredSiswa = [...filteredSiswa].sort((a, b) => {
    let valA = '';
    let valB = '';
    if (sortField === 'nama') {
      valA = a.nama || '';
      valB = b.nama || '';
    } else if (sortField === 'nisn') {
      valA = a.nisn || '';
      valB = b.nisn || '';
    } else if (sortField === 'gender') {
      valA = a.gender || '';
      valB = b.gender || '';
    } else if (sortField === 'kelas') {
      valA = appData.kelas.find((k) => k.id === a.kelasId)?.nama || '';
      valB = appData.kelas.find((k) => k.id === b.kelasId)?.nama || '';
    } else if (sortField === 'status') {
      valA = a.status || 'aktif';
      valB = b.status || 'aktif';
    }

    const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: 'nama' | 'nisn' | 'gender' | 'kelas' | 'status') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const validPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
  const validCurrentPage = Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1;
  const totalPages = Math.ceil(filteredSiswa.length / validPageSize) || 1;
  const startIdx = (validCurrentPage - 1) * validPageSize;
  const pagedSiswa = filteredSiswa.slice(startIdx, startIdx + validPageSize);

  const handleRandomizeOrangTuaDanWa = () => {
    if (appData.siswa.length === 0) {
      onShowToast('Data siswa masih kosong!', 'warning');
      return;
    }

    const hasFilters = !!filterKelasId || filterStatus !== 'semua' || !!searchTerm.trim();
    const targetClass = appData.kelas.find((k) => k.id === filterKelasId);

    if (hasFilters) {
      if (filteredSiswa.length === 0) {
        onShowToast('Tidak ada data siswa yang sesuai filter untuk diacak!', 'warning');
        return;
      }

      let filterDesc = '';
      if (filterKelasId && targetClass) filterDesc = `di kelas ${targetClass.nama}`;
      else if (filterStatus === 'tidak_aktif') filterDesc = 'berstatus Tidak Aktif';
      else if (filterStatus === 'aktif') filterDesc = 'berstatus Aktif';
      else if (searchTerm) filterDesc = `sesuai pencarian "${searchTerm}"`;
      else filterDesc = 'sesuai filter';

      const msg = `Apakah Anda ingin mengacak nama orang tua dan nomor WhatsApp untuk ${filteredSiswa.length} data siswa ${filterDesc}?`;

      onConfirmModal('Acak Orang Tua & WA', msg, 'info', () => {
        const parentFirstNames = ["Bpk.", "Bapak", "Bpk.", "Bapak", "Bapak/Ibu"];
        const parentLastNames = ["Santoso", "Wijaya", "Kusuma", "Hidayat", "Pratama", "Setiawan", "Nugraha", "Lestari", "Sari", "Anggraini", "Wibowo", "Ramadhan", "Saputra"];
        
        const idsToRandomize = new Set(filteredSiswa.map((s) => s.id));
        const updatedSiswa = appData.siswa.map((s) => {
          if (idsToRandomize.has(s.id)) {
            const parts = s.nama.split(' ');
            const lastName = parts.length > 1 ? parts[parts.length - 1] : parentLastNames[Math.floor(Math.random() * parentLastNames.length)];
            const pTitle = parentFirstNames[Math.floor(Math.random() * parentFirstNames.length)];
            
            return {
              ...s,
              namaOrangTua: `${pTitle} ${lastName}`,
              noWa: s.noWa && s.noWa.includes('-') ? s.noWa : generateRandomWaNumber(),
              noWaOrangTua: generateRandomWaNumber(),
            };
          }
          return s;
        });

        const nextAppData = addAuditLog(
          { ...appData, siswa: updatedSiswa },
          'Acak Orang Tua & WA Siswa',
          `Mengacak nama orang tua dan No. WA untuk ${filteredSiswa.length} siswa`
        );
        onUpdateAppData(nextAppData);
        onShowToast(`Berhasil mengacak nama orang tua dan nomor WA untuk ${filteredSiswa.length} siswa!`, 'success');
      });
    } else {
      const msg = `Apakah Anda ingin mengacak atau mengisi ulang nama orang tua dan nomor WhatsApp untuk SELURUH ${appData.siswa.length} siswa?`;

      onConfirmModal('Acak Orang Tua & WA Seluruh Siswa', msg, 'info', () => {
        const parentFirstNames = ["Bpk.", "Bapak", "Bpk.", "Bapak", "Bapak/Ibu"];
        const parentLastNames = ["Santoso", "Wijaya", "Kusuma", "Hidayat", "Pratama", "Setiawan", "Nugraha", "Lestari", "Sari", "Anggraini", "Wibowo", "Ramadhan", "Saputra"];
        
        const updatedSiswa = appData.siswa.map((s) => {
          const parts = s.nama.split(' ');
          const lastName = parts.length > 1 ? parts[parts.length - 1] : parentLastNames[Math.floor(Math.random() * parentLastNames.length)];
          const pTitle = parentFirstNames[Math.floor(Math.random() * parentFirstNames.length)];
          
          return {
            ...s,
            namaOrangTua: `${pTitle} ${lastName}`,
            noWa: s.noWa && s.noWa.includes('-') ? s.noWa : generateRandomWaNumber(),
            noWaOrangTua: generateRandomWaNumber(),
          };
        });

        const nextAppData = addAuditLog(
          { ...appData, siswa: updatedSiswa },
          'Acak Orang Tua & WA Seluruh Siswa',
          `Mengacak nama orang tua dan No. WA untuk seluruh (${appData.siswa.length}) siswa`
        );
        onUpdateAppData(nextAppData);
        onShowToast('Berhasil mengacak nama orang tua dan nomor WA untuk seluruh siswa!', 'success');
      });
    }
  };

  const handleSaveSiswa = (
    id: string | null,
    nisn: string,
    nama: string,
    gender: 'L' | 'P',
    kelasId: string,
    status: 'aktif' | 'tidak_aktif' = 'aktif',
    noWa: string = '',
    namaOrangTua: string = '',
    noWaOrangTua: string = '',
    alamat: string = '',
    tempatLahir: string = '',
    tanggalLahir: string = '',
    password: string = '',
    foto: string = ''
  ) => {
    let newSiswa = [...appData.siswa];
    if (id) {
      newSiswa = newSiswa.map((s) =>
        s.id === id
          ? {
              ...s,
              nisn,
              nama,
              gender,
              kelasId,
              status,
              noWa,
              namaOrangTua,
              noWaOrangTua,
              alamat,
              tempatLahir,
              tanggalLahir,
              password: password.trim() ? password.trim() : (s.password || s.nisn || ''),
              foto,
            }
          : s
      );
      onShowToast('Data Siswa & Profil berhasil diperbarui!', 'success');
    } else {
      newSiswa.push({
        id: 'SIS_' + Date.now(),
        nisn,
        nama,
        gender,
        kelasId,
        status,
        noWa: noWa || generateRandomWaNumber(),
        namaOrangTua: namaOrangTua || 'Bapak / Ibu',
        noWaOrangTua: noWaOrangTua || generateRandomWaNumber(),
        alamat,
        tempatLahir,
        tanggalLahir,
        password: password.trim() || nisn || '',
        foto,
      });
      onShowToast('Siswa baru berhasil ditambahkan!', 'success');
    }

    let nextAppData = { ...appData, siswa: newSiswa };
    if (id) {
      nextAppData = addAuditLog(nextAppData, 'Mengubah data siswa', `Mengubah data siswa: ${nama} (NISN: ${nisn})`);
    } else {
      nextAppData = addAuditLog(nextAppData, 'Menambah siswa baru', `Menambah siswa baru: ${nama} (NISN: ${nisn})`);
    }
    onUpdateAppData(nextAppData);

    onCloseModal();
  };

  const openDetailSiswaModal = (s: Siswa) => {
    const k = appData.kelas.find((item) => item.id === s.kelasId);
    const kelasNama = k ? k.nama : '-';
    const ttlFormatted = formatTTL(s.tempatLahir, s.tanggalLahir);

    const DetailContent = () => (
      <div className="space-y-5 py-1">
        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-md overflow-hidden shrink-0">
            {s.foto ? (
              <img src={s.foto} alt={s.nama} className="w-full h-full object-cover rounded-[14px]" />
            ) : (
              <div className={`w-full h-full rounded-[14px] flex items-center justify-center font-black text-white text-2xl ${
                s.gender === 'L' ? 'bg-gradient-to-tr from-blue-600 to-indigo-600' : 'bg-gradient-to-tr from-pink-500 to-rose-500'
              }`}>
                {s.nama ? s.nama.charAt(0).toUpperCase() : 'S'}
              </div>
            )}
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h3 className="text-base font-black text-slate-900 dark:text-white truncate">{s.nama}</h3>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 rounded-full font-mono font-bold text-xs">
                NISN: {s.nisn}
              </span>
              <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded-full font-bold text-xs">
                Kelas: {kelasNama}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                  s.gender === 'L' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300'
                }`}
              >
                {s.gender === 'L' ? 'Laki-Laki (L)' : 'Perempuan (P)'}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                  s.status === 'tidak_aktif' ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                {s.status === 'tidak_aktif' ? 'Tidak Aktif / Lulus' : 'Aktif'}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Siswa</span>
            <div className="font-bold text-slate-800 dark:text-white mt-0.5">
              {s.status === 'tidak_aktif' ? 'Tidak Aktif / Lulus / Pindah' : 'Aktif'}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tempat, Tanggal Lahir</span>
            <div className="font-bold text-slate-800 dark:text-white mt-0.5">
              {ttlFormatted && ttlFormatted !== '-' ? ttlFormatted : 'Belum Diisi'}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 sm:col-span-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alamat Tempat Tinggal</span>
            <div className="font-bold text-slate-800 dark:text-white mt-0.5">{s.alamat || 'Belum Diisi'}</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. WhatsApp Siswa</span>
            <div className="mt-1">
              {s.noWa ? (
                <a
                  href={`https://wa.me/${s.noWa.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(s.nama)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg text-xs font-bold transition"
                  title="Chat WhatsApp Siswa"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{s.noWa}</span>
                </a>
              ) : (
                <span className="text-slate-400 italic text-xs">Belum Diisi</span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password Login Akun</span>
            <div className="font-mono font-bold text-slate-800 dark:text-white mt-0.5">
              {s.password || s.nisn || '-'}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Orang Tua / Wali</span>
            <div className="font-bold text-slate-800 dark:text-white mt-0.5">{s.namaOrangTua || 'Belum Diisi'}</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. WA Orang Tua / Wali</span>
            <div className="mt-1">
              {s.noWaOrangTua ? (
                <a
                  href={`https://wa.me/${s.noWaOrangTua.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=Halo%20Bapak/Ibu%20Wali%20dari%20${encodeURIComponent(s.nama)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg text-xs font-bold transition"
                  title="Chat WhatsApp Orang Tua"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{s.noWaOrangTua}</span>
                </a>
              ) : (
                <span className="text-slate-400 italic text-xs">Belum Diisi</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onCloseModal}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Tutup
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                onCloseModal();
                setTimeout(() => openFormSiswa(s), 150);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Data Siswa</span>
            </button>
          )}
        </div>
      </div>
    );

    onOpenModal(`Profil & Biodata - ${s.nama}`, <DetailContent />);
  };

  const openFormSiswa = (siswa?: Siswa) => {
    if (!hasJurusan) {
      onShowToast('Data Jurusan belum ada! Silakan isi Data Jurusan terlebih dahulu.', 'warning');
      return;
    }

    const isEdit = !!siswa;

    const FormContent = () => {
      const [nisn, setNisn] = useState(siswa ? siswa.nisn : '');
      const [nama, setNama] = useState(siswa ? siswa.nama : '');
      const [gender, setGender] = useState<'L' | 'P'>(siswa ? siswa.gender : 'L');
      const [status, setStatus] = useState<'aktif' | 'tidak_aktif'>(siswa ? siswa.status || 'aktif' : 'aktif');
      const [noWa, setNoWa] = useState(siswa ? siswa.noWa || '' : generateRandomWaNumber());
      const [namaOrangTua, setNamaOrangTua] = useState(siswa ? siswa.namaOrangTua || '' : '');
      const [noWaOrangTua, setNoWaOrangTua] = useState(siswa ? siswa.noWaOrangTua || '' : generateRandomWaNumber());
      const [alamat, setAlamat] = useState(siswa ? siswa.alamat || '' : '');
      const [tempatLahir, setTempatLahir] = useState(siswa ? siswa.tempatLahir || '' : '');
      const [tanggalLahir, setTanggalLahir] = useState(siswa ? siswa.tanggalLahir || '' : '');
      const [password, setPassword] = useState(siswa ? siswa.password || '' : '');
      const [showPassword, setShowPassword] = useState(false);
      const [foto, setFoto] = useState(siswa ? siswa.foto || '' : '');
      const [isUploadingFoto, setIsUploadingFoto] = useState(false);

      const [kelasId, setKelasId] = useState<string>(
        siswa
          ? siswa.kelasId
          : filterKelasId
          ? filterKelasId
          : appData.kelas.length > 0
          ? appData.kelas[0].id
          : ''
      );

      const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
          onShowToast('Ukuran berkas foto terlalu besar (Maksimal 5MB)!', 'warning');
          return;
        }

        setIsUploadingFoto(true);
        try {
          const compressed = await compressBase64Image(file, 400, 0.75);
          setFoto(compressed);
          onShowToast('Foto profil berhasil dimuat!', 'success');
        } catch (err) {
          onShowToast('Gagal memproses unggahan foto.', 'error');
        } finally {
          setIsUploadingFoto(false);
        }
      };

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveSiswa(
              siswa ? siswa.id : null,
              nisn.trim(),
              nama.trim(),
              gender,
              kelasId,
              status,
              noWa.trim(),
              namaOrangTua.trim(),
              noWaOrangTua.trim(),
              alamat.trim(),
              tempatLahir.trim(),
              tanggalLahir.trim(),
              password.trim(),
              foto
            );
          }}
          className="space-y-4 max-h-[75vh] overflow-y-auto pr-1"
        >
          {/* Upload Foto Profil */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-md overflow-hidden shrink-0 relative">
              {foto ? (
                <img src={foto} alt="Foto Profil" className="w-full h-full object-cover rounded-[14px]" />
              ) : (
                <div className="w-full h-full bg-slate-200 dark:bg-slate-700 rounded-[14px] flex items-center justify-center text-slate-400">
                  <GraduationCap className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="space-y-1 flex-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">Foto Profil Siswa</label>
              <div className="flex items-center gap-2">
                <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm inline-flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingFoto ? 'Memproses...' : 'Unggah Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFotoUpload}
                    disabled={isUploadingFoto}
                    className="hidden"
                  />
                </label>
                {foto && (
                  <button
                    type="button"
                    onClick={() => setFoto('')}
                    className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition cursor-pointer border border-rose-200"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                NISN <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                placeholder="Nomor NISN siswa..."
                className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Nama Lengkap Siswa <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama lengkap siswa..."
                className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Jenis Kelamin
              </label>
              <select
                required
                value={gender}
                onChange={(e) => setGender(e.target.value as 'L' | 'P')}
                className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="L">Laki-Laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Penempatan Kelas
              </label>
              <select
                required
                value={kelasId}
                onChange={(e) => setKelasId(e.target.value)}
                className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {(isWali ? waliClasses : appData.kelas).map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Tempat Lahir
              </label>
              <input
                type="text"
                value={tempatLahir}
                onChange={(e) => setTempatLahir(e.target.value)}
                placeholder="Contoh: Bandung"
                className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={tanggalLahir}
                onChange={(e) => setTanggalLahir(e.target.value)}
                className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Alamat Tempat Tinggal
              </label>
              <textarea
                rows={2}
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Alamat lengkap domisili siswa..."
                className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                No. WhatsApp Siswa
              </label>
              <input
                type="text"
                value={noWa}
                onChange={(e) => setNoWa(e.target.value)}
                placeholder="0812-3456-7890"
                className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Nama Orang Tua / Wali
              </label>
              <input
                type="text"
                value={namaOrangTua}
                onChange={(e) => setNamaOrangTua(e.target.value)}
                placeholder="Nama Orang Tua / Wali..."
                className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                No. WhatsApp Orang Tua / Wali
              </label>
              <input
                type="text"
                value={noWaOrangTua}
                onChange={(e) => setNoWaOrangTua(e.target.value)}
                placeholder="0812-3456-7890"
                className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Status Siswa
              </label>
              <select
                required
                value={status}
                onChange={(e) => setStatus(e.target.value as 'aktif' | 'tidak_aktif')}
                className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="aktif">Aktif</option>
                <option value="tidak_aktif">Tidak Aktif / Lulus / Pindah</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Password Login Akun Siswa
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password akun login..."
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onCloseModal}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              Simpan Data Siswa
            </button>
          </div>
        </form>
      );
    };

    onOpenModal(isEdit ? 'Edit Data Siswa & Profil' : 'Tambah Siswa Baru', <FormContent />);
  };

  const handleOpenQrModal = (s: Siswa) => {
    const k = appData.kelas.find((item) => item.id === s.kelasId);
    const kelasNama = k ? k.nama : '';
    const sekolahNama = appData.sekolah?.nama || 'SMK';

    onOpenModal(
      `Kartu & QR Code Presensi - ${s.nama}`,
      <SiswaQrModalContent
        siswa={s}
        kelasNama={kelasNama}
        sekolahNama={sekolahNama}
        onShowToast={onShowToast}
        onClose={onCloseModal}
      />
    );
  };

  const handlePrintAllQr = async () => {
    if (filteredSiswa.length === 0) {
      onShowToast('Tidak ada siswa untuk dicetak QR-nya!', 'warning');
      return;
    }

    onShowToast('Menyiapkan kartu QR untuk dicetak...', 'info');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      onShowToast('Gagal membuka jendela cetak. Mohon izinkan pop-up di browser.', 'warning');
      return;
    }

    const sekolahNama = appData.sekolah?.nama || 'SMK';

    const items = await Promise.all(
      filteredSiswa.map(async (s) => {
        const k = appData.kelas.find((item) => item.id === s.kelasId);
        const kelasNama = k ? k.nama : '-';
        const payload = JSON.stringify({
          nisn: s.nisn,
          nama: s.nama,
          id: s.id,
          siswaId: s.id,
          kelas: kelasNama,
          sekolah: sekolahNama,
        });
        const qrDataUrl = await QRCode.toDataURL(payload, {
          width: 200,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        return { siswa: s, kelasNama, qrDataUrl };
      })
    );

    const cardsHtml = items
      .map(
        ({ siswa: s, kelasNama, qrDataUrl }) => `
        <div class="card">
          <div class="header">${sekolahNama}</div>
          <div class="title">${s.nama}</div>
          <div class="subtitle">NISN: ${s.nisn || '-'}</div>
          <div class="kelas">Kelas: ${kelasNama}</div>
          <img src="${qrDataUrl}" class="qr-img" />
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Kartu QR Presensi Siswa (${items.length} Siswa)</title>
          <style>
            body { font-family: sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; justify-content: center; }
            .card { background: white; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 12px; text-align: center; page-break-inside: avoid; }
            .header { background: #0f172a; color: white; padding: 4px 6px; border-radius: 6px; font-size: 9px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; }
            .title { font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .subtitle { font-size: 10px; font-weight: bold; color: #2563eb; font-family: monospace; margin-bottom: 2px; }
            .kelas { font-size: 10px; color: #64748b; margin-bottom: 8px; font-weight: 600; }
            .qr-img { width: 140px; height: 140px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; }
            @media print {
              body { background: none; padding: 0; }
              .grid { gap: 10px; }
            }
          </style>
        </head>
        <body>
          <h2 style="text-align: center; font-size: 16px; margin-bottom: 16px; font-family: sans-serif; color: #0f172a;">KARTU PRESENSI QR DIGITAL SISWA (${items.length} SISWA)</h2>
          <div class="grid">
            ${cardsHtml}
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDeleteSiswa = (id: string) => {
    onConfirmModal('Hapus Data Siswa', 'Apakah Anda yakin ingin menghapus siswa ini?', 'danger', () => {
      const targetSiswa = appData.siswa.find((s) => s.id === id);
      const targetName = targetSiswa ? targetSiswa.nama : id;
      const targetNisn = targetSiswa ? targetSiswa.nisn : '';
      const newSiswa = appData.siswa.filter((s) => s.id !== id);
      const nextAppData = addAuditLog(
        { ...appData, siswa: newSiswa },
        'Hapus data siswa',
        `Menghapus data siswa: ${targetName} (NISN: ${targetNisn})`
      );
      onUpdateAppData(nextAppData);
      onShowToast('Data siswa telah dihapus!', 'info');
    });
  };

  const handleHapusSeluruh = () => {
    if (appData.siswa.length === 0) {
      onShowToast('Data Siswa sudah kosong!', 'warning');
      return;
    }

    const hasFilters = !!filterKelasId || filterStatus !== 'semua' || !!searchTerm.trim();
    const targetClass = appData.kelas.find((k) => k.id === filterKelasId);

    if (hasFilters) {
      if (filteredSiswa.length === 0) {
        onShowToast('Tidak ada data siswa yang sesuai filter untuk dihapus!', 'warning');
        return;
      }

      let filterDesc = '';
      if (filterKelasId && targetClass) filterDesc = `di kelas ${targetClass.nama}`;
      else if (filterStatus === 'tidak_aktif') filterDesc = 'berstatus Tidak Aktif';
      else if (filterStatus === 'aktif') filterDesc = 'berstatus Aktif';
      else if (searchTerm) filterDesc = `sesuai pencarian "${searchTerm}"`;
      else filterDesc = 'sesuai filter yang dipilih';

      const msg = `Apakah Anda yakin ingin menghapus ${filteredSiswa.length} data siswa ${filterDesc}?`;

      onConfirmModal('Konfirmasi Hapus Massal', msg, 'danger', () => {
        const idsToDelete = new Set(filteredSiswa.map((s) => s.id));
        const newSiswaList = appData.siswa.filter((s) => !idsToDelete.has(s.id));
        const nextAppData = addAuditLog(
          { ...appData, siswa: newSiswaList },
          'Hapus massal siswa',
          `Menghapus secara massal ${filteredSiswa.length} siswa ${filterDesc}`
        );
        onUpdateAppData(nextAppData);
        onShowToast(`Berhasil menghapus ${filteredSiswa.length} data siswa!`, 'success');
      });
    } else {
      const msg = `Apakah Anda yakin ingin menghapus SELURUH ${appData.siswa.length} data siswa di sistem?`;

      onConfirmModal('Konfirmasi Hapus Seluruh Siswa', msg, 'danger', () => {
        const nextAppData = addAuditLog(
          { ...appData, siswa: [] },
          'Hapus seluruh siswa',
          `Menghapus seluruh (${appData.siswa.length}) data siswa`
        );
        onUpdateAppData(nextAppData);
        onShowToast('Seluruh data siswa berhasil dibersihkan!', 'success');
      });
    }
  };

  const handleResetDataOrangTuaDanWa = () => {
    if (appData.siswa.length === 0) {
      onShowToast('Data siswa masih kosong!', 'warning');
      return;
    }

    const hasFilters = !!filterKelasId || filterStatus !== 'semua' || !!searchTerm.trim();
    const targetClass = appData.kelas.find((k) => k.id === filterKelasId);

    if (hasFilters) {
      if (filteredSiswa.length === 0) {
        onShowToast('Tidak ada data siswa yang sesuai filter untuk direset!', 'warning');
        return;
      }

      let filterDesc = '';
      if (filterKelasId && targetClass) filterDesc = `di kelas ${targetClass.nama}`;
      else if (filterStatus === 'tidak_aktif') filterDesc = 'berstatus Tidak Aktif';
      else if (filterStatus === 'aktif') filterDesc = 'berstatus Aktif';
      else if (searchTerm) filterDesc = `sesuai pencarian "${searchTerm}"`;
      else filterDesc = 'sesuai filter';

      const msg = `Apakah Anda yakin ingin mereset (mengosongkan) Nama Orang Tua, No. WA Orang Tua, dan No. WA Siswa untuk ${filteredSiswa.length} data siswa ${filterDesc}?`;

      onConfirmModal('Reset Data Orang Tua & WA', msg, 'warning', () => {
        const idsToReset = new Set(filteredSiswa.map((s) => s.id));
        const newSiswaList = appData.siswa.map((s) => {
          if (idsToReset.has(s.id)) {
            return {
              ...s,
              namaOrangTua: '',
              noWaOrangTua: '',
              noWa: '',
            };
          }
          return s;
        });
        const nextAppData = addAuditLog(
          { ...appData, siswa: newSiswaList },
          'Reset data orang tua & WA',
          `Mereset data orang tua & WA untuk ${filteredSiswa.length} siswa ${filterDesc}`
        );
        onUpdateAppData(nextAppData);
        onShowToast(`Berhasil mereset Nama Orang Tua, No. WA Ortu, & No. WA ${filteredSiswa.length} siswa!`, 'success');
      });
    } else {
      const msg = `Apakah Anda yakin ingin mereset (mengosongkan) Nama Orang Tua, No. WA Orang Tua, dan No. WA Siswa untuk SELURUH ${appData.siswa.length} data siswa?`;

      onConfirmModal('Reset Data Orang Tua & WA Seluruh Siswa', msg, 'warning', () => {
        const newSiswaList = appData.siswa.map((s) => ({
          ...s,
          namaOrangTua: '',
          noWaOrangTua: '',
          noWa: '',
        }));
        const nextAppData = addAuditLog(
          { ...appData, siswa: newSiswaList },
          'Reset data ortu & WA seluruh siswa',
          `Mereset data orang tua & WA seluruh (${appData.siswa.length}) siswa`
        );
        onUpdateAppData(nextAppData);
        onShowToast('Nama Orang Tua, No. WA Orang Tua, dan No. WA Siswa seluruh siswa berhasil direset!', 'success');
      });
    }
  };

  const handleExportExcel = () => {
    if (filteredSiswa.length === 0) {
      onShowToast('Tidak ada data siswa untuk diexport!', 'warning');
      return;
    }

    const exportData = filteredSiswa.map((s, idx) => {
      const classObj = appData.kelas.find((k) => k.id === s.kelasId);
      return {
        No: idx + 1,
        NISN: s.nisn,
        'Nama Lengkap': s.nama,
        'Jenis Kelamin': s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
        Kelas: classObj ? classObj.nama : '-',
        Status: s.status === 'tidak_aktif' ? 'Tidak Aktif' : 'Aktif',
        'No WA Siswa': s.noWa || '-',
        'Nama Orang Tua': s.namaOrangTua || '-',
        'No WA Orang Tua': s.noWaOrangTua || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 16 },
      { wch: 30 },
      { wch: 15 },
      { wch: 18 },
      { wch: 12 },
      { wch: 16 },
      { wch: 25 },
      { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    const fileName = currentKelas ? `Data_Siswa_${currentKelas.nama.replace(/\s+/g, '_')}.xlsx` : 'Data_Seluruh_Siswa.xlsx';
    XLSX.writeFile(wb, fileName);
    onShowToast(`Berhasil mengexport ${exportData.length} data siswa ke Excel!`, 'success');
  };

  const handleDownloadTemplate = () => {
    const sampleClass = appData.kelas.length > 0 ? appData.kelas[0].nama : 'X RPL 1';

    const templateData = [
      {
        NISN: '0061234567',
        NAMA: 'Ahmad Rizky Pratama',
        JK: 'L',
        KELAS: sampleClass,
        'NAMA ORANG TUA': 'Bpk. Pratama / Ibu',
        'NO WA ORANG TUA': '081234567890',
        'NO WA SISWA': '081234567891',
        ALAMAT: 'Jl. Merdeka No. 10',
        'TEMPAT LAHIR': 'Bandung',
        'TANGGAL LAHIR': '2008-05-15',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    ws['!cols'] = [
      { wch: 18 }, // NISN
      { wch: 30 }, // NAMA
      { wch: 8 },  // JK
      { wch: 20 }, // KELAS
      { wch: 26 }, // NAMA ORANG TUA
      { wch: 18 }, // NO WA ORANG TUA
      { wch: 18 }, // NO WA SISWA
      { wch: 25 }, // ALAMAT
      { wch: 18 }, // TEMPAT LAHIR
      { wch: 16 }, // TANGGAL LAHIR
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    XLSX.writeFile(wb, 'Template_Import_Data_Siswa_Siap_Diisi.xlsx');
    onShowToast(`Template Excel Siswa Siap Diisi berhasil diunduh!`, 'success');
  };

  const handleImportSuccess = (importedCount: number, updatedCount: number, newSiswaList: Siswa[], newKelasList?: Kelas[]) => {
    const nextAppData = addAuditLog(
      { 
        ...appData, 
        siswa: newSiswaList,
        ...(newKelasList ? { kelas: newKelasList } : {})
      },
      'Import data siswa via Excel',
      `Mengimpor data siswa: ${importedCount} siswa baru, ${updatedCount} siswa diperbarui${newKelasList && newKelasList.length > appData.kelas.length ? `, ${newKelasList.length - appData.kelas.length} kelas baru dibuat` : ''}`
    );
    onUpdateAppData(nextAppData);
    if (updatedCount > 0 && importedCount > 0) {
      onShowToast(`Berhasil menambahkan ${importedCount} siswa baru dan memperbarui ${updatedCount} data siswa!`, 'success');
    } else if (updatedCount > 0) {
      onShowToast(`Berhasil memperbarui ${updatedCount} data siswa!`, 'success');
    } else {
      onShowToast(`Berhasil mengimpor ${importedCount} data siswa!`, 'success');
    }
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

        if (!rows || rows.length === 0) {
          onShowToast('File Excel kosong atau format tidak sesuai!', 'error');
          return;
        }

        let addedCount = 0;
        const newSiswaList = [...appData.siswa];

        rows.forEach((r) => {
          const nisn = String(r.NISN || r.nisn || r.Nisn || r['No Induk'] || '').trim();
          const nama = String(r.NAMA || r.nama || r.Nama || r['Nama Lengkap'] || r['NAMA LENGKAP'] || '').trim();
          const namaOrangTua = String(r['NAMA ORANG TUA'] || r['Nama Orang Tua'] || r['orang_tua'] || r['wali'] || '').trim();
          const noWaOrangTua = String(r['NO WA ORANG TUA'] || r['No WA Orang Tua'] || r['no_wa_ortu'] || r['wa_ortu'] || '').trim();
          const genderStr = String(r.GENDER || r.gender || r.JK || r.jk || r['Jenis Kelamin'] || 'L').toUpperCase();
          const gender: 'L' | 'P' = genderStr.startsWith('P') ? 'P' : 'L';
          const namaKelas = String(r.KELAS || r.kelas || r.Kelas || r['Nama Kelas'] || '').trim();
          const noWa = String(r['NO WA SISWA'] || r['NO WA'] || r['No WA'] || r['whatsapp'] || r['No HP'] || '').trim();

          // Helper to normalize class names for flexible matching (e.g. "X BUSANA 1" vs "X-BUSANA-1" vs "10 BUSANA 1")
          const cleanClassName = (s: string) =>
            s
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
              .replace(/^10/, 'X')
              .replace(/^11/, 'XI')
              .replace(/^12/, 'XII');

          const rawNorm = cleanClassName(namaKelas);

          // 1. Exact match
          let classObj = appData.kelas.find((k) => k.nama.toLowerCase() === namaKelas.toLowerCase());

          // 2. Normalized match
          if (!classObj && rawNorm) {
            classObj = appData.kelas.find((k) => cleanClassName(k.nama) === rawNorm);
          }

          // 3. Fallback to currently active filter class if available, or classObj.id
          let targetKelasId = classObj ? classObj.id : filterKelasId || '';

          // 4. Fallback to first class only if no active filter and no match
          if (!targetKelasId && appData.kelas.length > 0) {
            targetKelasId = appData.kelas[0].id;
          }

          if (nama && targetKelasId) {
            newSiswaList.push({
              id: 'SIS_' + Date.now() + Math.random().toString(36).substr(2, 4),
              nisn: nisn || '-',
              nama,
              gender,
              kelasId: targetKelasId,
              status: 'aktif',
              noWa: noWa || generateRandomWaNumber(),
              namaOrangTua: namaOrangTua || 'Bapak / Ibu',
              noWaOrangTua: noWaOrangTua || generateRandomWaNumber(),
            });
            addedCount++;
          }
        });

        if (addedCount === 0) {
          onShowToast('Tidak ada data valid yang dapat diimpor. Gunakan template yang disediakan.', 'warning');
          return;
        }

        const nextAppData = addAuditLog(
          { ...appData, siswa: newSiswaList },
          'Import data siswa via Drag & Drop',
          `Mengimpor ${addedCount} data siswa baru via Excel drag & drop / langsung`
        );
        onUpdateAppData(nextAppData);

        onShowToast(`Berhasil mengimpor ${addedCount} data Siswa!`, 'success');
      } catch (err) {
        onShowToast('Gagal memproses file Excel!', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentKelas = appData.kelas.find((k) => k.id === filterKelasId);
  const countTotal = filteredSiswa.length;
  const countLaki = filteredSiswa.filter((s) => s.gender === 'L').length;
  const countPerempuan = filteredSiswa.filter((s) => s.gender === 'P').length;
  const pctLaki = countTotal > 0 ? Math.round((countLaki / countTotal) * 100) : 0;
  const pctPerempuan = countTotal > 0 ? Math.round((countPerempuan / countTotal) * 100) : 0;

  const pieData = [
    { name: 'Laki-Laki', value: countLaki, color: '#3b82f6' },
    { name: 'Perempuan', value: countPerempuan, color: '#ec4899' },
  ];

  // Grade level (Tingkat X, XI, XII) calculations across all active students
  const activeStudentsList = appData.siswa.filter(
    (s) => s.status !== 'tidak_aktif' && (s as any).status !== 'nonaktif'
  );

  const siswaTingkatX = activeStudentsList.filter((s) => {
    const k = appData.kelas.find((kl) => kl.id === s.kelasId);
    return k && extractKelasTingkat(k.nama) === 'X';
  });

  const siswaTingkatXI = activeStudentsList.filter((s) => {
    const k = appData.kelas.find((kl) => kl.id === s.kelasId);
    return k && extractKelasTingkat(k.nama) === 'XI';
  });

  const siswaTingkatXII = activeStudentsList.filter((s) => {
    const k = appData.kelas.find((kl) => kl.id === s.kelasId);
    return k && extractKelasTingkat(k.nama) === 'XII';
  });

  const countLakiX = siswaTingkatX.filter((s) => s.gender === 'L').length;
  const countPerempuanX = siswaTingkatX.filter((s) => s.gender === 'P').length;

  const countLakiXI = siswaTingkatXI.filter((s) => s.gender === 'L').length;
  const countPerempuanXI = siswaTingkatXI.filter((s) => s.gender === 'P').length;

  const countLakiXII = siswaTingkatXII.filter((s) => s.gender === 'L').length;
  const countPerempuanXII = siswaTingkatXII.filter((s) => s.gender === 'P').length;

  const getJurusanBreakdownForTingkat = (tingkat: 'X' | 'XI' | 'XII') => {
    const targetStudents =
      tingkat === 'X' ? siswaTingkatX : tingkat === 'XI' ? siswaTingkatXI : siswaTingkatXII;

    const listJurusan =
      appData.jurusan && appData.jurusan.length > 0
        ? appData.jurusan
        : [
            { id: 'JUR_1', kode: 'TJKT', nama: 'Teknik Jaringan Komputer & Telekomunikasi' },
            { id: 'JUR_2', kode: 'TO', nama: 'Teknik Otomotif' },
            { id: 'JUR_3', kode: 'AKL', nama: 'Akuntansi & Keuangan Lembaga' },
            { id: 'JUR_4', kode: 'MPLB', nama: 'Manajemen Perkantoran & Layanan Bisnis' },
            { id: 'JUR_5', kode: 'BUSANA', nama: 'Busana' },
            { id: 'JUR_6', kode: 'TE', nama: 'Teknik Elektronika' },
          ];

    return listJurusan.map((jur) => {
      const matchingClasses = appData.kelas.filter((k) => {
        if (extractKelasTingkat(k.nama) !== tingkat) return false;
        if (k.jurusanId === jur.id) return true;
        const kn = k.nama.toUpperCase();
        return (
          kn.includes(jur.kode.toUpperCase()) ||
          (jur.nama && kn.includes(jur.nama.toUpperCase()))
        );
      });

      const classIds = new Set(matchingClasses.map((k) => k.id));
      const jurStudents = targetStudents.filter((s) => classIds.has(s.kelasId));

      const countLaki = jurStudents.filter((s) => s.gender === 'L').length;
      const countPerempuan = jurStudents.filter((s) => s.gender === 'P').length;

      return {
        jurusan: jur,
        totalSiswa: jurStudents.length,
        countLaki,
        countPerempuan,
        totalKelas: matchingClasses.length,
        classList: matchingClasses,
      };
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {readOnly && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3 text-purple-900">
          <Eye className="w-5 h-5 shrink-0 text-purple-600" />
          <div className="text-xs font-semibold">
            <span className="font-bold">Mode View Only:</span> Anda dapat memantau data seluruh siswa, namun tidak dapat mengubah atau menghapus data.
          </div>
        </div>
      )}

      <PageHeader
        icon={Users}
        title="Master Data Siswa"
        description={`Total ${countTotal} Siswa Terdata${currentKelas ? ` • Kelas ${currentKelas.nama}` : ''}`}
        badge="Statistik Siswa"
      />

      {/* Card Rekap Siswa: Jika Wali Kelas, tampilkan Rekapitulasi Kelas Binaan; Jika Admin/Kesiswaan, tampilkan Rekapitulasi Per Tingkat Kelas (X, XI, XII) */}
      {isWali ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Rekapitulasi Kelas Binaan
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Wali Kelas
                  </span>
                </div>
                {currentUser?.data?.nama && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Wali Kelas: <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser.data.nama}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {waliClasses.length} Kelas Binaan
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                {appData.siswa.filter((s) => waliClasses.some((k) => k.id === s.kelasId) && s.status !== 'tidak_aktif' && (s as any).status !== 'nonaktif').length} Total Siswa
              </span>
            </div>
          </div>

          {/* Card / Grid Kelas Binaan Wali Kelas Memenuhi Space dengan Statistik Informatif */}
          <div className="grid grid-cols-1 gap-3.5">
            {waliClasses.map((kelas) => {
              const siswaKelas = appData.siswa.filter(
                (s) => s.kelasId === kelas.id && s.status !== 'tidak_aktif' && (s as any).status !== 'nonaktif'
              );
              const countLaki = siswaKelas.filter((s) => s.gender === 'L').length;
              const countPerempuan = siswaKelas.filter((s) => s.gender === 'P').length;
              const pctL = siswaKelas.length > 0 ? Math.round((countLaki / siswaKelas.length) * 100) : 0;
              const pctP = siswaKelas.length > 0 ? Math.round((countPerempuan / siswaKelas.length) * 100) : 0;
              const isSelected = filterKelasId === kelas.id;
              const jur = appData.jurusan?.find((j) => j.id === kelas.jurusanId);

              return (
                <div
                  key={kelas.id}
                  onClick={() => {
                    setFilterKelasId(kelas.id);
                    setCurrentPage(1);
                    onShowToast(`Menampilkan siswa kelas ${kelas.nama}`, 'info');
                  }}
                  className={`p-4 md:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-500 shadow-md ring-2 ring-indigo-400/30'
                      : 'bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Info Kelas */}
                    <div className="flex items-center gap-3.5 min-w-[200px]">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                          : 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        {kelas.nama.substring(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                            Kelas {kelas.nama}
                          </h4>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold shadow-xs">
                              Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {jur?.nama || jur?.kode || 'Kelas Binaan'}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Statistik Total, Laki-laki, Perempuan (Memanfaatkan space penuh) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 flex-1 max-w-2xl bg-white dark:bg-slate-900/90 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                      {/* Total Siswa */}
                      <div className="text-center px-2 py-1 border-r border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Total Siswa
                        </span>
                        <span className="text-base md:text-lg font-black text-slate-900 dark:text-white">
                          {siswaKelas.length} <span className="text-xs font-semibold text-slate-400">Orang</span>
                        </span>
                      </div>

                      {/* Laki-laki */}
                      <div className="text-center px-2 py-1 border-r border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block mb-0.5 flex items-center justify-center gap-1">
                          <span>♂ Laki-laki</span>
                        </span>
                        <span className="text-base md:text-lg font-black text-blue-600 dark:text-blue-400">
                          {countLaki} <span className="text-[11px] font-bold text-slate-400">({pctL}%)</span>
                        </span>
                      </div>

                      {/* Perempuan */}
                      <div className="text-center px-2 py-1">
                        <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wider block mb-0.5 flex items-center justify-center gap-1">
                          <span>♀ Perempuan</span>
                        </span>
                        <span className="text-base md:text-lg font-black text-pink-600 dark:text-pink-400">
                          {countPerempuan} <span className="text-[11px] font-bold text-slate-400">({pctP}%)</span>
                        </span>
                      </div>
                    </div>

                    {/* Right: Action button */}
                    <div className="flex items-center justify-end md:self-center">
                      <span className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}>
                        {isSelected ? '✓ Sedang Ditampilkan' : 'Pilih Kelas →'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Rekapitulasi Siswa Per Tingkat Kelas
                  <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 lowercase">
                    (klik kartu untuk melihat rincian per jurusan)
                  </span>
                </span>
                {activeTingkatDetail && (
                  <button
                    type="button"
                    onClick={() => setActiveTingkatDetail(null)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    ✕ Tutup Rincian
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* CARD KELAS X */}
                <button
                  type="button"
                  onClick={() => setActiveTingkatDetail(activeTingkatDetail === 'X' ? null : 'X')}
                  className={`text-left p-4.5 rounded-2xl border transition-all duration-150 relative overflow-hidden group cursor-pointer ${
                    activeTingkatDetail === 'X'
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500 shadow-md ring-2 ring-blue-400/30'
                      : 'bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300 font-black text-sm shadow-xs">
                        X
                      </div>
                      <div>
                        <span className="block text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase">KELAS X</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Tingkat Pertama</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wide ${
                      activeTingkatDetail === 'X'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800'
                    }`}>
                      {siswaTingkatX.length} Siswa
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 mt-2">
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-blue-600 dark:text-blue-400">♂ {countLakiX}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-pink-600 dark:text-pink-400">♀ {countPerempuanX}</span>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      {activeTingkatDetail === 'X' ? 'Tutup ▲' : 'Rincian Jurusan ▼'}
                    </span>
                  </div>
                </button>

                {/* CARD KELAS XI */}
                <button
                  type="button"
                  onClick={() => setActiveTingkatDetail(activeTingkatDetail === 'XI' ? null : 'XI')}
                  className={`text-left p-4.5 rounded-2xl border transition-all duration-150 relative overflow-hidden group cursor-pointer ${
                    activeTingkatDetail === 'XI'
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-500 shadow-md ring-2 ring-indigo-400/30'
                      : 'bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-black text-sm shadow-xs">
                        XI
                      </div>
                      <div>
                        <span className="block text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase">KELAS XI</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Tingkat Kedua</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wide ${
                      activeTingkatDetail === 'XI'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800'
                    }`}>
                      {siswaTingkatXI.length} Siswa
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 mt-2">
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-blue-600 dark:text-blue-400">♂ {countLakiXI}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-pink-600 dark:text-pink-400">♀ {countPerempuanXI}</span>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      {activeTingkatDetail === 'XI' ? 'Tutup ▲' : 'Rincian Jurusan ▼'}
                    </span>
                  </div>
                </button>

                {/* CARD KELAS XII */}
                <button
                  type="button"
                  onClick={() => setActiveTingkatDetail(activeTingkatDetail === 'XII' ? null : 'XII')}
                  className={`text-left p-4.5 rounded-2xl border transition-all duration-150 relative overflow-hidden group cursor-pointer ${
                    activeTingkatDetail === 'XII'
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 shadow-md ring-2 ring-amber-400/30'
                      : 'bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-800 dark:text-amber-300 font-black text-sm shadow-xs">
                        XII
                      </div>
                      <div>
                        <span className="block text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase">KELAS XII</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Tingkat Akhir</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wide ${
                      activeTingkatDetail === 'XII'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800'
                    }`}>
                      {siswaTingkatXII.length} Siswa
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 mt-2">
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-blue-600 dark:text-blue-400">♂ {countLakiXII}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-pink-600 dark:text-pink-400">♀ {countPerempuanXII}</span>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      {activeTingkatDetail === 'XII' ? 'Tutup ▲' : 'Rincian Jurusan ▼'}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* EXPANDED PANEL: RINCIAN SISWA PER JURUSAN */}
            {activeTingkatDetail && (
              <div className="bg-slate-50/80 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 sm:p-5 space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        Rincian Siswa Kelas {activeTingkatDetail} Per Jurusan
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                          {activeTingkatDetail === 'X' ? siswaTingkatX.length : activeTingkatDetail === 'XI' ? siswaTingkatXI.length : siswaTingkatXII.length} Siswa
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Jumlah siswa tiap jurusan pada Kelas {activeTingkatDetail}. Klik "Pilih Kelas" untuk memfilter daftar siswa.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTingkatDetail(null)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    ✕ Tutup
                  </button>
                </div>

                {/* Grid Jurusan Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getJurusanBreakdownForTingkat(activeTingkatDetail).map((item) => {
                    const isJurusanSelected = item.classList.some((k) => k.id === filterKelasId);
                    return (
                      <div
                        key={item.jurusan.id}
                        className={`p-3.5 rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                          isJurusanSelected
                            ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-500 shadow-sm ring-1 ring-indigo-400/40'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-black uppercase border border-indigo-200 dark:border-indigo-800">
                              {item.jurusan.kode}
                            </span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                              {item.totalKelas} Kelas
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1 mb-2" title={item.jurusan.nama}>
                            {item.jurusan.nama}
                          </h5>

                          <div className="flex items-baseline justify-between mb-2">
                            <span className="text-xl font-black text-slate-900 dark:text-white">{item.totalSiswa} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Siswa</span></span>
                            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                              <span className="text-blue-600 dark:text-blue-400">♂ {item.countLaki}</span>
                              <span className="text-pink-600 dark:text-pink-400">♀ {item.countPerempuan}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                            {item.classList.map((c) => c.nama).join(', ') || 'Belum ada kelas'}
                          </span>
                          {item.classList.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setFilterKelasId(item.classList[0].id);
                                setCurrentPage(1);
                                onShowToast(`Menampilkan siswa kelas ${item.classList[0].nama}`, 'info');
                              }}
                              className="shrink-0 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                            >
                              Pilih Kelas
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter bar / Header */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-5 md:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Pilih Kelas</label>
          <select
            value={filterKelasId}
            onChange={(e) => {
              setFilterKelasId(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {!isWali && <option value="">-- Semua Kelas ({appData.siswa.filter(s => s.status !== 'tidak_aktif' && (s as any).status !== 'nonaktif').length} Siswa Aktif) --</option>}
            {waliClasses.map((k) => {
              const count = appData.siswa.filter((s) => s.kelasId === k.id && s.status !== 'tidak_aktif' && (s as any).status !== 'nonaktif').length;
              return (
                <option key={k.id} value={k.id}>
                  {k.nama} ({count} siswa)
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Status Siswa</label>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="semua">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="tidak_aktif">Tidak Aktif</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Urutkan Berdasarkan</label>
          <div className="flex gap-2">
            <select
              value={sortField}
              onChange={(e) => handleSort(e.target.value as any)}
              className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="nama">Nama Siswa</option>
              <option value="nisn">NISN</option>
              <option value="kelas">Kelas</option>
              <option value="gender">Gender</option>
              <option value="status">Status</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title={`Urutan: ${sortDirection === 'asc' ? 'A-Z / Naik' : 'Z-A / Turun'}`}
            >
              {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Cari Siswa</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari NISN atau nama siswa..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {!hasJurusan && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          <div className="text-xs font-bold">Data Jurusan Belum Ada!</div>
        </div>
      )}

      {/* Student List Card */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden mb-6">
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">
              {currentKelas ? `Daftar Siswa Kelas ${currentKelas.nama}` : 'Daftar Seluruh Siswa'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Total {filteredSiswa.length} siswa terdaftar. {canEdit ? 'Anda dapat menambah atau mengedit data siswa.' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* View Mode Switcher: List & Grid */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
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
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Tampilan Kartu / Grid"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>

            {/* Menu Pengaturan Data Siswa Terpadu */}
            <div className="relative" ref={settingsMenuRef}>
              <button
                type="button"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                  showSettingsMenu
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
                title="Menu Pengaturan & Kelola Data Siswa"
              >
                <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Pengaturan Siswa</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showSettingsMenu ? 'rotate-180 text-indigo-600' : ''}`} />
              </button>

              {showSettingsMenu && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-indigo-600" />
                      Pengaturan Data Siswa
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {filteredSiswa.length} Siswa
                    </span>
                  </div>

                  <div className="space-y-1">
                    {/* Bagian: Impor & Ekspor */}
                    <div className="px-2.5 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Impor & Ekspor Data
                    </div>

                    {canAdd && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowSettingsMenu(false);
                          setShowImportModal(true);
                        }}
                        className="w-full px-3 py-2 text-left rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 transition flex items-center gap-2.5 text-xs font-semibold cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold">Import Siswa (Excel/CSV)</div>
                          <div className="text-[10px] text-slate-400 group-hover:text-emerald-600/70">Upload massal data siswa</div>
                        </div>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsMenu(false);
                        handleDownloadTemplate();
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition flex items-center gap-2.5 text-xs font-semibold cursor-pointer group"
                    >
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-700 group-hover:text-white transition shrink-0">
                        <Download className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold">Unduh Format Template</div>
                        <div className="text-[10px] text-slate-400">Template file Excel untuk import</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsMenu(false);
                        handleExportExcel();
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300 transition flex items-center gap-2.5 text-xs font-semibold cursor-pointer group"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition shrink-0">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold">Export Data ke Excel</div>
                        <div className="text-[10px] text-slate-400 group-hover:text-blue-600/70">Unduh daftar siswa terfilter (.xlsx)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsMenu(false);
                        handlePrintAllQr();
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 transition flex items-center gap-2.5 text-xs font-semibold cursor-pointer group"
                    >
                      <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition shrink-0">
                        <Printer className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold">Cetak Semua Kartu QR</div>
                        <div className="text-[10px] text-slate-400 group-hover:text-indigo-600/70">Cetak lembar kartu QR kelas</div>
                      </div>
                    </button>

                    {/* Bagian: Utilitas & Kontak */}
                    {canEdit && appData.siswa.length > 0 && (
                      <>
                        <div className="px-2.5 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-t border-slate-100 dark:border-slate-800 mt-1">
                          Utilitas Kontak Ortu & WA
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowSettingsMenu(false);
                            handleRandomizeOrangTuaDanWa();
                          }}
                          className="w-full px-3 py-2 text-left rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 hover:text-purple-700 dark:hover:text-purple-300 transition flex items-center gap-2.5 text-xs font-semibold cursor-pointer group"
                        >
                          <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition shrink-0">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold">Acak Data Ortu & WA</div>
                            <div className="text-[10px] text-slate-400 group-hover:text-purple-600/70">Isi acak nama ortu & no. WA untuk testing</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowSettingsMenu(false);
                            handleResetDataOrangTuaDanWa();
                          }}
                          className="w-full px-3 py-2 text-left rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 transition flex items-center gap-2.5 text-xs font-semibold cursor-pointer group"
                        >
                          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition shrink-0">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold">Reset Data Ortu & WA</div>
                            <div className="text-[10px] text-slate-400 group-hover:text-amber-600/70">Kosongkan nama ortu & no. WA</div>
                          </div>
                        </button>
                      </>
                    )}

                    {/* Bagian: Hapus Massal */}
                    {canMassDelete && appData.siswa.length > 0 && (
                      <>
                        <div className="px-2.5 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-500 border-t border-slate-100 dark:border-slate-800 mt-1">
                          Zona Bahaya
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowSettingsMenu(false);
                            handleHapusSeluruh();
                          }}
                          className="w-full px-3 py-2 text-left rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 transition flex items-center gap-2.5 text-xs font-semibold cursor-pointer group"
                        >
                          <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold">Hapus Semua Data Siswa</div>
                            <div className="text-[10px] text-rose-500/80">Hapus massal seluruh siswa terdaftar</div>
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Utama: Tambah Siswa */}
            {canAdd && hasJurusan && (
              <button
                type="button"
                onClick={() => openFormSiswa()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Siswa</span>
              </button>
            )}
          </div>
        </div>

        {filteredSiswa.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Users className="w-8 h-8 mx-auto mb-3 text-slate-300" />
            Tidak ada data siswa ditemukan.
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View: Responsive Profile Cards showing NISN, Nama, Kelas */
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pagedSiswa.map((s, idx) => {
                const k = appData.kelas.find((item) => item.id === s.kelasId);

                return (
                  <div
                    key={s.id}
                    className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700/60 transition duration-150 flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header: Avatar, Nama, NISN, Kelas */}
                      <div className="flex items-start justify-between gap-2.5 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {s.foto ? (
                            <img
                              src={s.foto}
                              alt={s.nama}
                              className="w-11 h-11 rounded-2xl object-cover shrink-0 border border-slate-200 shadow-xs"
                            />
                          ) : (
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-sm shrink-0 shadow-xs ${
                              s.gender === 'L' ? 'bg-gradient-to-tr from-blue-600 to-indigo-600' : 'bg-gradient-to-tr from-pink-500 to-rose-500'
                            }`}>
                              {s.nama ? s.nama.charAt(0).toUpperCase() : 'S'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                #{startIdx + idx + 1}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate" title={s.nama}>
                              {s.nama}
                            </h4>
                            <p className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                              NISN: <span className="text-slate-700 dark:text-slate-300">{s.nisn}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Kelas Badge */}
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg border border-indigo-100 dark:border-indigo-800 text-xs">
                          Kelas {k ? k.nama : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: Detail, QR, Edit, Hapus */}
                    <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetailSiswaModal(s)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 text-indigo-700 border border-indigo-200/80 dark:border-indigo-800 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                          title="Detail Profil & Biodata Siswa"
                        >
                          <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Detail</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenQrModal(s)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 text-emerald-700 border border-emerald-200/80 dark:border-emerald-800 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                          title="Lihat Kartu & QR Code Siswa"
                        >
                          <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>QR</span>
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openFormSiswa(s)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 text-blue-600 border border-blue-200/80 dark:border-blue-800 rounded-xl transition cursor-pointer"
                            title="Edit Siswa"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSiswa(s.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 text-rose-600 border border-rose-200/80 dark:border-rose-800 rounded-xl transition cursor-pointer"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List View: Clean Data Table with No, NISN, Nama Siswa, Kelas, and Aksi */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4 cursor-pointer hover:text-indigo-600 transition select-none w-44" onClick={() => handleSort('nisn')}>
                    <div className="flex items-center gap-1.5">
                      <span>NISN</span>
                      {sortField === 'nisn' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-indigo-600 transition select-none" onClick={() => handleSort('nama')}>
                    <div className="flex items-center gap-1.5">
                      <span>Nama Siswa</span>
                      {sortField === 'nama' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-indigo-600 transition select-none w-40" onClick={() => handleSort('kelas')}>
                    <div className="flex items-center gap-1.5">
                      <span>Kelas</span>
                      {sortField === 'kelas' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 text-center w-44">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {pagedSiswa.map((s, idx) => {
                  const k = appData.kelas.find((item) => item.id === s.kelasId);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4 text-center font-extrabold text-slate-400">{startIdx + idx + 1}</td>
                      <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">{s.nisn}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                        <div className="flex items-center gap-2.5">
                          {s.foto ? (
                            <img src={s.foto} alt={s.nama} className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 shadow-2xs" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-[11px] shrink-0 ${
                              s.gender === 'L' ? 'bg-gradient-to-tr from-blue-600 to-indigo-600' : 'bg-gradient-to-tr from-pink-500 to-rose-500'
                            }`}>
                              {s.nama ? s.nama.charAt(0).toUpperCase() : 'S'}
                            </div>
                          )}
                          <span className="text-sm font-semibold">{s.nama}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold rounded-lg text-xs border border-indigo-100 dark:border-indigo-800">
                          {k ? k.nama : '-'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetailSiswaModal(s)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-xl border border-indigo-200/80 dark:border-indigo-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Detail Profil & Biodata Siswa"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenQrModal(s)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-xl border border-emerald-200/80 dark:border-emerald-800 transition cursor-pointer"
                            title="Lihat Kartu & QR Code Siswa"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openFormSiswa(s)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 rounded-xl border border-blue-200/80 dark:border-blue-800 transition cursor-pointer"
                              title="Edit Siswa"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSiswa(s.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl border border-rose-200/80 dark:border-rose-800 transition cursor-pointer"
                              title="Hapus Siswa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredSiswa.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Modal Import Siswa Massal */}
      <ImportSiswaModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        appData={appData}
        defaultKelasId={filterKelasId}
        onImportSuccess={handleImportSuccess}
        onShowToast={onShowToast}
      />
    </div>
  );
};
