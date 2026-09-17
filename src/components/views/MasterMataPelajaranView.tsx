import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  FileSpreadsheet,
  Download,
  ArrowUpDown,
  CheckCircle2,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  LayoutGrid,
  List,
  Layers,
  Tag,
  Award,
  Hash,
  BookmarkPlus,
  Clock,
} from 'lucide-react';
import { AppData, MataPelajaran, UserSession } from '../../types';
import { Pagination } from '../Pagination';
import { PageHeader } from '../common/UIComponents';
import { addAuditLog, cleanMapelName } from '../../utils/helpers';
import { DEFAULT_MATA_PELAJARAN } from '../../data/initialData';

interface MasterMataPelajaranViewProps {
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
}

const MAPEL_KATEGORI_OPTIONS: Array<NonNullable<MataPelajaran['kategori']>> = [
  'Kelompok A (Nasional)',
  'Kelompok B (Kewilayahan)',
  'Kelompok C (Kejuruan/Peminatan)',
  'Muatan Lokal',
  'Bimbingan Konseling',
  'Umum',
];

const TINGKAT_OPTIONS: Array<NonNullable<MataPelajaran['tingkat']>> = [
  'Semua Tingkat',
  'X',
  'XI',
  'XII',
];

export const MasterMataPelajaranView: React.FC<MasterMataPelajaranViewProps> = ({
  appData,
  readOnly = false,
  onUpdateAppData,
  onOpenModal,
  onCloseModal,
  onConfirmModal,
  onShowToast,
}) => {
  const mapelCatalogFileInputRef = useRef<HTMLInputElement>(null);

  // Master Mapel List
  const mapelList: MataPelajaran[] = useMemo(() => {
    const list = appData.mataPelajaran || DEFAULT_MATA_PELAJARAN;
    return list
      .map((m) => ({
        ...m,
        nama: cleanMapelName(m.nama),
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
  }, [appData.mataPelajaran]);

  const [mapelViewMode, setMapelViewMode] = useState<'list' | 'grid'>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'list'));
  const [mapelSearch, setMapelSearch] = useState('');
  const [mapelFilterKategori, setMapelFilterKategori] = useState<string>('semua');
  const [mapelFilterTingkat, setMapelFilterTingkat] = useState<string>('semua');
  const [mapelSortField, setMapelSortField] = useState<'kode' | 'nama' | 'kategori' | 'alokasiJp'>('nama');
  const [mapelSortDirection, setMapelSortDirection] = useState<'asc' | 'desc'>('asc');
  const [mapelPage, setMapelPage] = useState(1);
  const [mapelPageSize, setMapelPageSize] = useState(10);

  const filteredMapel = useMemo(() => {
    return mapelList.filter((m) => {
      const q = mapelSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.kode.toLowerCase().includes(q) ||
        m.nama.toLowerCase().includes(q) ||
        (m.deskripsi && m.deskripsi.toLowerCase().includes(q)) ||
        (m.jurusanNama && m.jurusanNama.toLowerCase().includes(q));

      const matchKategori =
        mapelFilterKategori === 'semua' || m.kategori === mapelFilterKategori;

      const matchTingkat =
        mapelFilterTingkat === 'semua' ||
        m.tingkat === mapelFilterTingkat ||
        m.tingkat === 'Semua Tingkat';

      return matchSearch && matchKategori && matchTingkat;
    });
  }, [mapelList, mapelSearch, mapelFilterKategori, mapelFilterTingkat]);

  const sortedMapel = useMemo(() => {
    return [...filteredMapel].sort((a, b) => {
      let cmp = 0;
      if (mapelSortField === 'kode') {
        cmp = a.kode.localeCompare(b.kode, undefined, { numeric: true });
      } else if (mapelSortField === 'nama') {
        cmp = a.nama.localeCompare(b.nama, undefined, { numeric: true });
      } else if (mapelSortField === 'kategori') {
        cmp = (a.kategori || '').localeCompare(b.kategori || '');
      } else if (mapelSortField === 'alokasiJp') {
        cmp = (a.alokasiJp || 0) - (b.alokasiJp || 0);
      }
      return mapelSortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredMapel, mapelSortField, mapelSortDirection]);

  const mapelTotalPages = Math.ceil(sortedMapel.length / mapelPageSize) || 1;
  const mapelStartIdx = (mapelPage - 1) * mapelPageSize;
  const pagedMapel = sortedMapel.slice(mapelStartIdx, mapelStartIdx + mapelPageSize);

  const handleMapelSort = (field: 'kode' | 'nama' | 'kategori' | 'alokasiJp') => {
    if (mapelSortField === field) {
      setMapelSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setMapelSortField(field);
      setMapelSortDirection('asc');
    }
  };

  // Open Form Modal (Add / Edit Master Mapel)
  const handleOpenMasterMapelModal = (itemToEdit?: MataPelajaran) => {
    if (readOnly) return;

    const initialKode = itemToEdit?.kode || '';
    const initialNama = itemToEdit?.nama || '';
    const initialKategori = itemToEdit?.kategori || 'Kelompok A (Nasional)';
    const initialTingkat = itemToEdit?.tingkat || 'Semua Tingkat';
    const initialJurusanNama = itemToEdit?.jurusanNama || '';
    const initialAlokasiJp = itemToEdit?.alokasiJp || 4;
    const initialKkm = itemToEdit?.kkm || 75;
    const initialDeskripsi = itemToEdit?.deskripsi || '';

    const FormModal: React.FC = () => {
      const [kode, setKode] = useState(initialKode);
      const [nama, setNama] = useState(initialNama);
      const [kategori, setKategori] = useState<MataPelajaran['kategori']>(initialKategori);
      const [tingkat, setTingkat] = useState<MataPelajaran['tingkat']>(initialTingkat);
      const [jurusanNama, setJurusanNama] = useState(initialJurusanNama);
      const [alokasiJp, setAlokasiJp] = useState(initialAlokasiJp);
      const [kkm, setKkm] = useState(initialKkm);
      const [deskripsi, setDeskripsi] = useState(initialDeskripsi);
      const [err, setErr] = useState('');

      const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setErr('');

        if (!kode.trim()) {
          setErr('Kode Mata Pelajaran wajib diisi (misal: MAT-01, RPL-PW).');
          return;
        }
        if (!nama.trim()) {
          setErr('Nama Mata Pelajaran wajib diisi.');
          return;
        }

        // Duplicate code check
        const currentMList = appData.mataPelajaran || DEFAULT_MATA_PELAJARAN;
        const isDuplicate = currentMList.some(
          (m) =>
            m.kode.trim().toLowerCase() === kode.trim().toLowerCase() &&
            (!itemToEdit || m.id !== itemToEdit.id)
        );
        if (isDuplicate) {
          setErr(`Kode Mapel "${kode.trim().toUpperCase()}" sudah digunakan pada mapel lain.`);
          return;
        }

        const newMapelItem: MataPelajaran = {
          id: itemToEdit ? itemToEdit.id : `MP_${Date.now()}`,
          kode: kode.trim().toUpperCase(),
          nama: cleanMapelName(nama),
          kategori: kategori,
          tingkat: tingkat,
          jurusanNama: jurusanNama.trim() || undefined,
          alokasiJp: Number(alokasiJp) || 0,
          kkm: Number(kkm) || 75,
          deskripsi: deskripsi.trim() || undefined,
        };

        let updatedList: MataPelajaran[];
        if (itemToEdit) {
          updatedList = currentMList.map((m) => (m.id === itemToEdit.id ? newMapelItem : m));
        } else {
          updatedList = [newMapelItem, ...currentMList];
        }

        const updatedAppData = addAuditLog(
          { ...appData, mataPelajaran: updatedList },
          itemToEdit ? 'Edit Master Mapel' : 'Tambah Master Mapel',
          `${itemToEdit ? 'Mengubah' : 'Menambahkan'} master mata pelajaran ${nama.trim()} (${kode.trim().toUpperCase()})`
        );

        onUpdateAppData(updatedAppData);
        onCloseModal();
        onShowToast(
          itemToEdit
            ? `Mata Pelajaran ${nama.trim()} berhasil diperbarui!`
            : `Mata Pelajaran ${nama.trim()} berhasil ditambahkan ke Katalog Master!`,
          'success'
        );
      };

      return (
        <form onSubmit={handleSave} className="space-y-4 text-slate-800 dark:text-slate-100">
          {err && (
            <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-600" />
                <span>Kode Mapel</span> <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                placeholder="misal: RPL-PWPB"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nama Mata Pelajaran</span> <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="misal: Pemrograman Web & Perangkat Bergerak"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-600" />
                <span>Kelompok / Kategori</span>
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                {MAPEL_KATEGORI_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                <span>Tingkat Kelas Sasaran</span>
              </label>
              <select
                value={tingkat}
                onChange={(e) => setTingkat(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                {TINGKAT_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t === 'Semua Tingkat' ? 'Semua Tingkat (X, XI, XII)' : `Khusus Kelas ${t}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Alokasi (JP/Minggu)</span>
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={alokasiJp}
                onChange={(e) => setAlokasiJp(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>KKM Standar</span>
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={kkm}
                onChange={(e) => setKkm(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jurusan (Opsional)
              </label>
              <input
                type="text"
                value={jurusanNama}
                onChange={(e) => setJurusanNama(e.target.value)}
                placeholder="misal: RPL, TKJ, DKV"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi & Silabus Ringkas (Opsional)
            </label>
            <textarea
              rows={2}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Deskripsi ringkas materi pokok atau capaian pembelajaran..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
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
              <span>{itemToEdit ? 'Simpan Perubahan' : 'Simpan Master Mapel'}</span>
            </button>
          </div>
        </form>
      );
    };

    onOpenModal(
      itemToEdit ? `Edit Master Mapel: ${itemToEdit.nama}` : 'Tambah Master Mata Pelajaran Baru',
      <FormModal />
    );
  };

  // Delete Master Mapel
  const handleDeleteMasterMapel = (item: MataPelajaran) => {
    if (readOnly) return;
    onConfirmModal(
      'Hapus Master Mata Pelajaran',
      `Apakah Anda yakin ingin menghapus "${item.nama}" (${item.kode}) dari Katalog Master Mapel?`,
      'danger',
      () => {
        const currentList = appData.mataPelajaran || DEFAULT_MATA_PELAJARAN;
        const updatedList = currentList.filter((m) => m.id !== item.id);
        const updatedAppData = addAuditLog(
          { ...appData, mataPelajaran: updatedList },
          'Hapus Master Mapel',
          `Menghapus master mata pelajaran ${item.nama} (${item.kode})`
        );
        onUpdateAppData(updatedAppData);
        onShowToast(`Mata pelajaran ${item.nama} berhasil dihapus dari katalog master.`, 'success');
      }
    );
  };

  // Delete All Master Mapel Catalog
  const handleDeleteAllMasterMapel = () => {
    if (readOnly || mapelList.length === 0) return;
    onConfirmModal(
      'Hapus SEMUA Master Mata Pelajaran',
      `PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data katalog mata pelajaran (${mapelList.length} mapel)? Tindakan ini akan mengosongkan seluruh daftar mata pelajaran baku dan tidak dapat dibatalkan.`,
      'danger',
      () => {
        const updatedAppData = addAuditLog(
          { ...appData, mataPelajaran: [] },
          'Hapus Semua Master Mapel',
          `Menghapus seluruh katalog master mata pelajaran (${mapelList.length} mapel).`
        );
        onUpdateAppData(updatedAppData);
        onShowToast('Semua data master mata pelajaran berhasil dihapus.', 'success');
      }
    );
  };

  // Export Master Mapel Catalog
  const handleExportMapelCatalog = () => {
    const dataToExport = sortedMapel.map((m, idx) => ({
      NO: idx + 1,
      KODE_MAPEL: m.kode,
      NAMA_MATA_PELAJARAN: m.nama,
      KELOMPOK_KATEGORI: m.kategori || 'Umum',
      TINGKAT_KELAS: m.tingkat || 'Semua Tingkat',
      JURUSAN: m.jurusanNama || 'Semua Jurusan',
      ALOKASI_JP: m.alokasiJp || 4,
      KKM: m.kkm || 75,
      DESKRIPSI_SILABUS: m.deskripsi || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [
      { wch: 5 },  // NO
      { wch: 15 }, // KODE_MAPEL
      { wch: 35 }, // NAMA_MATA_PELAJARAN
      { wch: 28 }, // KELOMPOK_KATEGORI
      { wch: 16 }, // TINGKAT_KELAS
      { wch: 22 }, // JURUSAN
      { wch: 12 }, // ALOKASI_JP
      { wch: 8 },  // KKM
      { wch: 45 }, // DESKRIPSI_SILABUS
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Katalog Mata Pelajaran');
    XLSX.writeFile(wb, `Katalog_Master_Mata_Pelajaran_${new Date().toISOString().slice(0, 10)}.xlsx`);
    onShowToast('Katalog Master Mata Pelajaran berhasil diexport ke Excel!', 'success');
  };

  // Download Template Master Mapel
  const handleDownloadMapelCatalogTemplate = () => {
    const templateData = [
      {
        KODE_MAPEL: 'RPL-PWPB',
        NAMA_MATA_PELAJARAN: 'Pemrograman Web & Perangkat Bergerak',
        KELOMPOK_KATEGORI: 'Kelompok C (Kejuruan/Peminatan)',
        TINGKAT_KELAS: 'XI',
        JURUSAN: 'Rekayasa Perangkat Lunak (RPL)',
        ALOKASI_JP: 6,
        KKM: 78,
        DESKRIPSI_SILABUS: 'Materi HTML5, CSS3, JavaScript, React, REST API, dan Mobile Apps.',
      },
      {
        KODE_MAPEL: 'UM-MAT',
        NAMA_MATA_PELAJARAN: 'Matematika Wajib',
        KELOMPOK_KATEGORI: 'Kelompok A (Nasional)',
        TINGKAT_KELAS: 'Semua Tingkat',
        JURUSAN: 'Semua Jurusan',
        ALOKASI_JP: 4,
        KKM: 75,
        DESKRIPSI_SILABUS: 'Aljabar, Trigonometri, Matriks, Barisan & Deret, Kalkulus.',
      },
      {
        KODE_MAPEL: 'TKJ-ASJ',
        NAMA_MATA_PELAJARAN: 'Administrasi Sistem Jaringan',
        KELOMPOK_KATEGORI: 'Kelompok C (Kejuruan/Peminatan)',
        TINGKAT_KELAS: 'XI',
        JURUSAN: 'Teknik Komputer dan Jaringan (TKJ)',
        ALOKASI_JP: 4,
        KKM: 75,
        DESKRIPSI_SILABUS: 'Instalasi Server Linux, DHCP, DNS, Web Server, dan FTP Server.',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 35 },
      { wch: 28 },
      { wch: 16 },
      { wch: 25 },
      { wch: 12 },
      { wch: 8 },
      { wch: 45 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Master Mapel');
    XLSX.writeFile(wb, 'Template_Import_Master_Mata_Pelajaran.xlsx');
    onShowToast('Template Excel Master Mata Pelajaran berhasil diunduh!', 'info');
  };

  // Import Master Mapel Catalog
  const handleImportMapelCatalog = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (!data || data.length === 0) {
          onShowToast('File Excel kosong atau format tidak sesuai.', 'error');
          return;
        }

        let addedCount = 0;
        let updatedCount = 0;
        const currentMList = [...(appData.mataPelajaran || DEFAULT_MATA_PELAJARAN)];

        data.forEach((row, index) => {
          const rawNama = cleanMapelName(String(
            row.NAMA_MATA_PELAJARAN || row.NAMA_MAPEL || row.Nama_Mata_Pelajaran || row.MATA_PELAJARAN || ''
          ).trim());
          if (!rawNama) return;

          let rawKode = String(
            row.KODE_MAPEL || row.KODE || row.Kode_Mapel || row.KODE_PELAJARAN || ''
          ).trim().toUpperCase();

          if (!rawKode) {
            rawKode = `MP-${rawNama.slice(0, 3).toUpperCase()}-${index + 1}`;
          }

          const rawKategori = String(row.KELOMPOK_KATEGORI || row.KATEGORI || row.KELOMPOK || 'Umum').trim();
          const rawTingkat = String(row.TINGKAT_KELAS || row.TINGKAT || 'Semua Tingkat').trim();
          const rawJurusan = String(row.JURUSAN || '').trim();
          const rawAlokasiJp = Number(row.ALOKASI_JP || row.JP || 4);
          const rawKkm = Number(row.KKM || 75);
          const rawDeskripsi = String(row.DESKRIPSI_SILABUS || row.DESKRIPSI || '').trim();

          const existingIdx = currentMList.findIndex(
            (m) =>
              m.kode.trim().toLowerCase() === rawKode.toLowerCase() ||
              m.nama.trim().toLowerCase() === rawNama.toLowerCase()
          );

          if (existingIdx >= 0) {
            currentMList[existingIdx] = {
              ...currentMList[existingIdx],
              nama: rawNama,
              kategori: rawKategori as any,
              tingkat: rawTingkat as any,
              jurusanNama: rawJurusan || undefined,
              alokasiJp: rawAlokasiJp,
              kkm: rawKkm,
              deskripsi: rawDeskripsi || undefined,
            };
            updatedCount++;
          } else {
            currentMList.push({
              id: `MP_IMP_${Date.now()}_${index}`,
              kode: rawKode,
              nama: rawNama,
              kategori: rawKategori as any,
              tingkat: rawTingkat as any,
              jurusanNama: rawJurusan || undefined,
              alokasiJp: rawAlokasiJp,
              kkm: rawKkm,
              deskripsi: rawDeskripsi || undefined,
            });
            addedCount++;
          }
        });

        const updatedAppData = addAuditLog(
          { ...appData, mataPelajaran: currentMList },
          'Import Master Mapel',
          `Import Katalog Master Mapel: ${addedCount} baru, ${updatedCount} diperbarui.`
        );
        onUpdateAppData(updatedAppData);

        onShowToast(
          `Import Katalog Selesai! ${addedCount} mapel baru ditambahkan, ${updatedCount} diperbarui.`,
          'success'
        );
      } catch (err: any) {
        onShowToast(`Gagal meng-import katalog mapel: ${err.message}`, 'error');
      } finally {
        if (mapelCatalogFileInputRef.current) mapelCatalogFileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title="Master Mata Pelajaran"
        description="Pusat kelola katalog kurikulum mata pelajaran baku sekolah, kategori kelompok, beban jam (JP), dan standar KKM."
        icon={BookOpen}
        actions={
          !readOnly ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenMasterMapelModal()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Master Mapel</span>
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{mapelList.length}</div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Mata Pelajaran</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {mapelList.filter((m) => m.kategori?.includes('Kelompok C') || m.kategori?.includes('Kejuruan')).length}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Mapel Produktif / Kejuruan</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {mapelList.filter((m) => m.kategori?.includes('Kelompok A') || m.kategori?.includes('Nasional')).length}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Muatan Nasional (Kelompok A)</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {mapelList.reduce((acc, m) => acc + (m.alokasiJp || 0), 0)} JP
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Beban Jam (JP)</div>
            </div>
          </div>
        </div>

        {/* Filter & Toolbar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={mapelSearch}
                onChange={(e) => {
                  setMapelSearch(e.target.value);
                  setMapelPage(1);
                }}
                placeholder="Cari KODE, NAMA MAPEL, JURUSAN, SILABUS..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={mapelFilterKategori}
                onChange={(e) => {
                  setMapelFilterKategori(e.target.value);
                  setMapelPage(1);
                }}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                <option value="semua">Semua Kategori</option>
                {MAPEL_KATEGORI_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>

              <select
                value={mapelFilterTingkat}
                onChange={(e) => {
                  setMapelFilterTingkat(e.target.value);
                  setMapelPage(1);
                }}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                <option value="semua">Semua Tingkat</option>
                {TINGKAT_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t === 'Semua Tingkat' ? 'Tingkat Gabungan' : `Kelas ${t}`}
                  </option>
                ))}
              </select>

              {/* View Switcher */}
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setMapelViewMode('list')}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    mapelViewMode === 'list'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Tampilan Tabel / List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMapelViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    mapelViewMode === 'grid'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Tampilan Kartu / Grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Row: Export, Download Template, Import */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportMapelCatalog}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </button>

              {!readOnly && (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadMapelCatalogTemplate}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Download Template</span>
                  </button>

                  <label className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Import Excel</span>
                    <input
                      ref={mapelCatalogFileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImportMapelCatalog}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>

            {!readOnly && mapelList.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllMasterMapel}
                className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua Mapel</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Views */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          {mapelViewMode === 'grid' ? (
            /* Grid Card View */
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {pagedMapel.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <BookOpen className="w-8 h-8 opacity-40" />
                    <p className="font-bold">Tidak ada mata pelajaran ditemukan.</p>
                  </div>
                </div>
              ) : (
                pagedMapel.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 bg-slate-50/50 dark:bg-slate-800/40 transition hover:shadow-md flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {item.kode}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.tingkat || 'Semua Tingkat'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{item.nama}</span>
                        </h4>
                        <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                          {item.kategori || 'Umum'}
                        </p>
                      </div>

                      {item.deskripsi && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {item.deskripsi}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 font-semibold text-slate-600 dark:text-slate-300">
                        <span title="Alokasi Beban Jam Pelajaran (JP)">
                          <Clock className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                          {item.alokasiJp || 0} JP
                        </span>
                        <span title="Kriteria Ketuntasan Minimal">
                          <Award className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                          KKM {item.kkm || 75}
                        </span>
                      </div>

                      {!readOnly && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenMasterMapelModal(item)}
                            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                            title="Edit Mapel"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMasterMapel(item)}
                            className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                            title="Hapus Mapel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th
                      className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition w-32"
                      onClick={() => handleMapelSort('kode')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Kode</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
                      onClick={() => handleMapelSort('nama')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Nama Mata Pelajaran</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
                      onClick={() => handleMapelSort('kategori')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Kategori / Kelompok</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center">Tingkat</th>
                    <th
                      className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition w-24"
                      onClick={() => handleMapelSort('alokasiJp')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Beban (JP)</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center w-20">KKM</th>
                    <th className="py-3 px-3">Deskripsi / Silabus</th>
                    {!readOnly && <th className="py-3 px-4 text-center w-24">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-200">
                  {pagedMapel.length === 0 ? (
                    <tr>
                      <td colSpan={readOnly ? 8 : 9} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <BookOpen className="w-8 h-8 opacity-40" />
                          <p className="font-bold">Tidak ada mata pelajaran ditemukan dalam katalog master.</p>
                          <p className="text-[11px] text-slate-500">
                            Gunakan tombol "+ Tambah Master Mapel" atau "Import Excel" untuk menambahkan kurikulum baru.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedMapel.map((item, index) => {
                      const globalIdx = mapelStartIdx + index + 1;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {globalIdx}
                          </td>

                          <td className="py-3 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              {item.kode}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>{item.nama}</span>
                            </div>
                            {item.jurusanNama && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Jurusan: {item.jurusanNama}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {item.kategori || 'Umum'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {item.tingkat || 'Semua Tingkat'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {item.alokasiJp || 0} JP
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center font-bold text-amber-600 dark:text-amber-400">
                            {item.kkm || 75}
                          </td>

                          <td className="py-3 px-3 max-w-[240px]">
                            <p className="text-slate-600 dark:text-slate-400 text-xs truncate" title={item.deskripsi || '-'}>
                              {item.deskripsi || '-'}
                            </p>
                          </td>

                          {!readOnly && (
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenMasterMapelModal(item)}
                                  className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                                  title="Edit Mapel"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMasterMapel(item)}
                                  className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                  title="Hapus Mapel"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination for Master Mapel */}
          {sortedMapel.length > 0 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Pagination
                currentPage={mapelPage}
                totalPages={mapelTotalPages}
                onPageChange={setMapelPage}
                pageSize={mapelPageSize}
                onPageSizeChange={(newSize) => {
                  setMapelPageSize(newSize);
                  setMapelPage(1);
                }}
                totalItems={sortedMapel.length}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
