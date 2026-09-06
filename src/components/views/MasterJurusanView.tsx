import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { GraduationCap, Plus, Edit, Trash, Trash2, FileSpreadsheet, Download, Eye, Search, ArrowUpDown, ArrowUp, ArrowDown, List, LayoutGrid, Layers, Users } from 'lucide-react';
import { AppData, Jurusan } from '../../types';
import { Pagination } from '../Pagination';
import { addAuditLog } from '../../utils/helpers';
import { PageHeader } from '../common/UIComponents';

interface MasterJurusanViewProps {
  appData: AppData;
  readOnly?: boolean;
  onUpdateAppData: (updated: AppData) => void;
  onOpenModal: (title: string, content: React.ReactNode) => void;
  onCloseModal: () => void;
  onConfirmModal: (title: string, message: string, type: 'danger' | 'warning' | 'info' | 'emerald', onConfirm: () => void) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onRestoreDemo?: () => void;
}

export const MasterJurusanView: React.FC<MasterJurusanViewProps> = ({
  appData,
  readOnly = false,
  onUpdateAppData,
  onOpenModal,
  onCloseModal,
  onConfirmModal,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'kode' | 'nama' | 'jumlahKelas' | 'jumlahSiswa'>('kode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  let filteredJurusan = appData.jurusan.filter((j) => {
    const q = searchTerm.toLowerCase();
    return j.kode.toLowerCase().includes(q) || j.nama.toLowerCase().includes(q);
  });

  filteredJurusan = [...filteredJurusan].sort((a, b) => {
    let valA: string | number = '';
    let valB: string | number = '';

    if (sortField === 'kode') {
      valA = a.kode || '';
      valB = b.kode || '';
    } else if (sortField === 'nama') {
      valA = a.nama || '';
      valB = b.nama || '';
    } else if (sortField === 'jumlahKelas') {
      valA = appData.kelas.filter((k) => k.jurusanId === a.id).length;
      valB = appData.kelas.filter((k) => k.jurusanId === b.id).length;
    } else if (sortField === 'jumlahSiswa') {
      const kelasAIds = appData.kelas.filter((k) => k.jurusanId === a.id).map((k) => k.id);
      const kelasBIds = appData.kelas.filter((k) => k.jurusanId === b.id).map((k) => k.id);
      valA = appData.siswa.filter((s) => kelasAIds.includes(s.kelasId)).length;
      valB = appData.siswa.filter((s) => kelasBIds.includes(s.kelasId)).length;
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }

    const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: 'kode' | 'nama' | 'jumlahKelas' | 'jumlahSiswa') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const validPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
  const validCurrentPage = Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1;
  const totalPages = Math.ceil(filteredJurusan.length / validPageSize) || 1;
  const startIdx = (validCurrentPage - 1) * validPageSize;
  const pagedJurusan = filteredJurusan.slice(startIdx, startIdx + validPageSize);

  const handleDownloadTemplate = () => {
    const templateData = [
      { KODE: 'RPL', NAMA: 'Rekayasa Perangkat Lunak' },
      { KODE: 'TKJ', NAMA: 'Teknik Komputer dan Jaringan' },
      { KODE: 'DKV', NAMA: 'Desain Komunikasi Visual' },
      { KODE: 'TSM', NAMA: 'Teknik dan Bisnis Sepeda Motor' },
      { KODE: 'TKR', NAMA: 'Teknik Kendaraan Ringan Otomotif' },
      { KODE: 'AKL', NAMA: 'Akuntansi dan Keuangan Lembaga' },
      { KODE: 'OTKP', NAMA: 'Otomatisasi dan Tata Kelola Perkantoran' },
      { KODE: 'BDP', NAMA: 'Bisnis Daring dan Pemasaran' },
      { KODE: 'TB', NAMA: 'Tata Boga / Kuliner' },
      { KODE: 'TAV', NAMA: 'Teknik Audio Video' },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    ws['!cols'] = [
      { wch: 15 }, // KODE
      { wch: 42 }, // NAMA
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template 10 Jurusan');
    XLSX.writeFile(wb, 'Template_Import_10_Jurusan.xlsx');
    onShowToast('Template Excel 10 Jurusan berhasil diunduh!', 'success');
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!rows || rows.length === 0) {
          onShowToast('File Excel kosong atau format tidak sesuai!', 'error');
          return;
        }

        let addedCount = 0;
        const newJurusanList = [...appData.jurusan];

        rows.forEach((r, i) => {
          const kode = String(r.KODE || r.kode || r.Kode || r['Kode Jurusan'] || r['KODE JURUSAN'] || '').trim().toUpperCase();
          const nama = String(r.NAMA || r.nama || r.Nama || r['Nama Jurusan'] || r['NAMA JURUSAN'] || '').trim();

          if (kode || nama) {
            newJurusanList.push({
              id: 'JUR_' + Date.now() + '_' + i,
              kode: kode || ('JUR' + (newJurusanList.length + 1)),
              nama: nama || kode,
            });
            addedCount++;
          }
        });

        if (addedCount === 0) {
          onShowToast('Tidak ada data jurusan valid yang dapat diimpor.', 'warning');
          return;
        }

        let nextAppData = { ...appData, jurusan: newJurusanList };
        nextAppData = addAuditLog(nextAppData, 'Impor Jurusan Excel', `Mengimpor ${addedCount} data jurusan dari file Excel.`);
        onUpdateAppData(nextAppData);

        onShowToast(`Berhasil mengimpor ${addedCount} data Jurusan dari Excel!`, 'success');
      } catch (err) {
        onShowToast('Gagal membaca file Excel. Pastikan format file sesuai.', 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveJurusan = (id: string | null, kode: string, nama: string) => {
    let newJurusan = [...appData.jurusan];
    let logAksi = '';
    let logDetail = '';

    if (id) {
      newJurusan = newJurusan.map((j) => (j.id === id ? { ...j, kode, nama } : j));
      onShowToast('Jurusan berhasil diperbarui!', 'success');
      logAksi = 'Ubah Jurusan';
      logDetail = `Mengubah informasi jurusan dengan kode ${kode} (${nama}).`;
    } else {
      newJurusan.push({
        id: 'JUR_' + Date.now(),
        kode,
        nama,
      });
      onShowToast('Jurusan berhasil ditambahkan!', 'success');
      logAksi = 'Tambah Jurusan';
      logDetail = `Menambahkan jurusan baru: Kode ${kode} (${nama}).`;
    }

    let nextAppData = { ...appData, jurusan: newJurusan };
    nextAppData = addAuditLog(nextAppData, logAksi, logDetail);
    onUpdateAppData(nextAppData);

    onCloseModal();
  };

  const openFormJurusan = (jurusan?: Jurusan) => {
    const isEdit = !!jurusan;
    let kodeVal = jurusan ? jurusan.kode : '';
    let namaVal = jurusan ? jurusan.nama : '';

    const FormContent = () => {
      const [kode, setKode] = useState(kodeVal);
      const [nama, setNama] = useState(namaVal);

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveJurusan(jurusan ? jurusan.id : null, kode.trim().toUpperCase(), nama.trim());
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Kode Jurusan</label>
            <input
              type="text"
              required
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none"
              placeholder="Misal: RPL, TKJ"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Nama Jurusan</label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none"
              placeholder="Misal: Rekayasa Perangkat Lunak"
            />
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

    onOpenModal(isEdit ? 'Edit Data Jurusan' : 'Tambah Jurusan Baru', <FormContent />);
  };

  const handleDeleteJurusan = (id: string) => {
    const targetJurusan = appData.jurusan.find((j) => j.id === id);
    onConfirmModal('Hapus Jurusan', 'Apakah Anda yakin ingin menghapus jurusan ini?', 'danger', () => {
      const newJurusan = appData.jurusan.filter((j) => j.id !== id);
      let nextAppData = { ...appData, jurusan: newJurusan };
      nextAppData = addAuditLog(nextAppData, 'Hapus Jurusan', `Menghapus jurusan ${targetJurusan ? `${targetJurusan.kode} (${targetJurusan.nama})` : id}.`);
      onUpdateAppData(nextAppData);
      onShowToast('Jurusan telah dihapus!', 'info');
    });
  };

  const handleHapusSeluruh = () => {
    if (appData.jurusan.length === 0) {
      onShowToast('Data jurusan sudah kosong!', 'warning');
      return;
    }
    onConfirmModal('Konfirmasi Hapus Massal', 'Apakah Anda yakin ingin menghapus SELURUH data Jurusan?', 'danger', () => {
      let nextAppData = { ...appData, jurusan: [] };
      nextAppData = addAuditLog(nextAppData, 'Hapus Massal Jurusan', 'Menghapus seluruh daftar jurusan sekolah.');
      onUpdateAppData(nextAppData);
      onShowToast('Seluruh data jurusan berhasil dihapus!', 'success');
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {readOnly && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3 text-purple-900">
          <Eye className="w-5 h-5 shrink-0 text-purple-600" />
          <div className="text-xs font-semibold">
            <span className="font-bold">Mode View Only (WKS Kesiswaan / BP BK):</span> Anda dapat memantau daftar jurusan, namun tidak dapat mengubah atau menghapus data master.
          </div>
        </div>
      )}

      <PageHeader
        icon={GraduationCap}
        title="Master Data Jurusan"
        description={readOnly ? 'Daftar program keahlian dan kompetensi jurusan sekolah.' : 'Kelola daftar program keahlian, kode jurusan, dan kompetensi keahlian sekolah.'}
        badge="Master Data Sekolah"
        actions={
          !readOnly ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleExcelImport}
                accept=".xlsx, .xls"
                className="hidden"
              />
              <button
                onClick={handleHapusSeluruh}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition border border-rose-200 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Seluruh</span>
              </button>
              <button
                onClick={handleDownloadTemplate}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition border border-slate-200 flex items-center gap-1.5"
                title="Unduh Template Excel 10 Jurusan"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Template Excel</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                title="Impor Data Jurusan dari File Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </button>
              <button
                onClick={() => openFormJurusan()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Jurusan</span>
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Urutkan Berdasarkan</label>
            <div className="flex gap-2">
              <select
                value={sortField}
                onChange={(e) => handleSort(e.target.value as any)}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="kode">Kode Jurusan</option>
                <option value="nama">Nama Jurusan</option>
                <option value="jumlahKelas">Jumlah Kelas</option>
                <option value="jumlahSiswa">Jumlah Siswa</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 transition cursor-pointer"
                title={`Urutan: ${sortDirection === 'asc' ? 'A-Z / Naik' : 'Z-A / Turun'}`}
              >
                {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 text-blue-600" /> : <ArrowDown className="w-4 h-4 text-blue-600" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Cari Jurusan</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari kode atau nama jurusan..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>
        </div>

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

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {pagedJurusan.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <GraduationCap className="w-8 h-8 mx-auto mb-3 text-slate-300" />
            {searchTerm ? 'Tidak ditemukan jurusan yang sesuai pencarian.' : 'Belum ada jurusan tersimpan.'}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View: Responsive Profile Cards */
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pagedJurusan.map((j, idx) => {
                const kelasInJurusan = appData.kelas.filter((k) => k.jurusanId === j.id);
                const kelasIds = kelasInJurusan.map((k) => k.id);
                const siswaCount = appData.siswa.filter((s) => kelasIds.includes(s.kelasId)).length;

                return (
                  <div
                    key={j.id}
                    className="p-4 bg-white dark:bg-slate-800/90 hover:shadow-md border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex flex-col justify-between shadow-xs transition duration-150"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-black text-xs shrink-0">
                            #{startIdx + idx + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold text-[11px] border border-blue-100 dark:border-blue-800">
                              {j.kode}
                            </span>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight truncate mt-1.5" title={j.nama}>
                              {j.nama}
                            </h4>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs gap-2">
                        <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl flex items-center gap-1 border border-blue-100 dark:border-blue-800/50">
                          <Layers className="w-3.5 h-3.5" />
                          <span>{kelasInJurusan.length} Kelas</span>
                        </span>
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{siswaCount} Siswa</span>
                        </span>
                      </div>
                    </div>

                    {!readOnly && (
                      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openFormJurusan(j)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteJurusan(j.id)}
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
                  <th className="p-4 cursor-pointer hover:text-blue-600 transition select-none" onClick={() => handleSort('kode')}>
                    <div className="flex items-center gap-1.5">
                      <span>Kode</span>
                      {sortField === 'kode' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-blue-600 transition select-none" onClick={() => handleSort('nama')}>
                    <div className="flex items-center gap-1.5">
                      <span>Nama Jurusan</span>
                      {sortField === 'nama' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-blue-600 transition select-none" onClick={() => handleSort('jumlahKelas')}>
                    <div className="flex items-center gap-1.5">
                      <span>Jml Kelas</span>
                      {sortField === 'jumlahKelas' ? (
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
                {pagedJurusan.map((j, idx) => {
                  const kelasInJurusan = appData.kelas.filter((k) => k.jurusanId === j.id);
                  const kelasIds = kelasInJurusan.map((k) => k.id);
                  const siswaCount = appData.siswa.filter((s) => kelasIds.includes(s.kelasId)).length;

                  return (
                    <tr key={j.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4 text-center font-bold text-slate-400">
                        {startIdx + idx + 1}
                      </td>
                      <td className="p-4 font-bold text-blue-600 dark:text-blue-400 font-mono">{j.kode}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{j.nama}</td>
                      <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        <span className="inline-block px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full font-bold text-xs border border-blue-100 dark:border-blue-900">
                          {kelasInJurusan.length} Kelas
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        <span className="inline-block px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-bold text-xs">
                          {siswaCount} Siswa
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {!readOnly ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openFormJurusan(j)}
                              className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 rounded-xl border border-blue-200/80 dark:border-blue-800 transition cursor-pointer"
                              title="Edit Jurusan"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteJurusan(j.id)}
                              className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl border border-rose-200/80 dark:border-rose-800 transition cursor-pointer"
                              title="Hapus Jurusan"
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
          totalItems={filteredJurusan.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};
