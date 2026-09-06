import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, Trash2, ShieldCheck, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { AppData, HariLibur } from '../../types';
import { PageHeader } from '../common/UIComponents';
import { formatDateIndo, getTodayString } from '../../utils/helpers';
import { OFFICIAL_NATIONAL_HOLIDAYS_2026_2027 } from '../../data/initialData';

interface HariLiburViewProps {
  appData: AppData;
  readOnly?: boolean;
  onUpdateAppData: (updated: AppData) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onConfirmModal?: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
}

export const HariLiburView: React.FC<HariLiburViewProps> = ({
  appData,
  readOnly,
  onUpdateAppData,
  onShowToast,
  onConfirmModal,
}) => {
  const [hariLiburList, setHariLiburList] = useState<HariLibur[]>(appData.hariLibur || []);
  const [newLiburTanggal, setNewLiburTanggal] = useState(getTodayString());
  const [newLiburKeterangan, setNewLiburKeterangan] = useState('');
  const [newLiburJenis, setNewLiburJenis] = useState<'nasional' | 'sekolah' | 'tanpa_presensi'>('nasional');

  useEffect(() => {
    setHariLiburList(appData.hariLibur || []);
  }, [appData.hariLibur]);

  const handleSave = (updatedList: HariLibur[]) => {
    setHariLiburList(updatedList);
    onUpdateAppData({
      ...appData,
      hariLibur: updatedList,
    });
  };

  const handleAdd = () => {
    if (!newLiburTanggal || !newLiburKeterangan.trim()) {
      onShowToast('Tanggal dan keterangan wajib diisi!', 'warning');
      return;
    }
    const newItem: HariLibur = {
      id: 'HL_' + Date.now(),
      tanggal: newLiburTanggal,
      keterangan: newLiburKeterangan.trim(),
      jenis: newLiburJenis,
    };
    const updated = [...hariLiburList, newItem];
    handleSave(updated);
    setNewLiburKeterangan('');
    onShowToast('Hari libur / tanpa presensi berhasil ditambahkan.', 'success');
  };

  const handleDelete = (id: string) => {
    const doDelete = () => {
      const updated = hariLiburList.filter((item) => item.id !== id);
      handleSave(updated);
      onShowToast('Hari libur berhasil dihapus dari daftar.', 'info');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Hapus Hari Libur',
        'Apakah Anda yakin ingin menghapus tanggal libur / tanpa presensi ini?',
        'danger',
        doDelete
      );
    } else {
      doDelete();
    }
  };

  const handleGenerateOfficial = () => {
    const existingDates = new Set(hariLiburList.map((h) => h.tanggal));
    const newItems = OFFICIAL_NATIONAL_HOLIDAYS_2026_2027.filter((h) => !existingDates.has(h.tanggal));
    if (newItems.length === 0) {
      onShowToast('Semua hari libur nasional resmi 2026-2027 sudah terdaftar!', 'info');
      return;
    }
    const updated = [...hariLiburList, ...newItems];
    handleSave(updated);
    onShowToast(`Berhasil menambahkan ${newItems.length} hari libur nasional resmi (2026-2027).`, 'success');
  };

  const handleDeleteAll = () => {
    if (hariLiburList.length === 0) {
      onShowToast('Daftar hari libur sudah kosong.', 'info');
      return;
    }
    const doDeleteAll = () => {
      handleSave([]);
      onShowToast('Semua daftar hari libur berhasil dihapus.', 'info');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Hapus Semua Hari Libur',
        'Apakah Anda yakin ingin menghapus SELURUH daftar hari libur dan hari tanpa presensi?',
        'danger',
        doDeleteAll
      );
    } else {
      doDeleteAll();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        icon={CalendarDays}
        title="Daftar Hari Libur Nasional & Hari Tanpa Presensi"
        description="Kelola tanggal-tanggal libur nasional, libur khusus sekolah, atau peniadaan presensi (hari tanpa presensi KBM). Sistem akan secara otomatis mendeteksi dan mengecualikan tanggal tersebut dari rekapitulasi absen harian."
        badge="Kalender Akademik & Hari Libur"
        actions={
          <div className="flex items-center gap-3">
            {!readOnly && (
              <button
                type="button"
                onClick={handleGenerateOfficial}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer"
                title="Generate Hari Libur Nasional Resmi 2026-2027"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Generate Libur Nasional Resmi</span>
              </button>
            )}
            <div className="bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-700 text-white">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total Terdaftar</div>
              <div className="text-base font-black">{hariLiburList.length} <span className="text-xs font-medium text-slate-400">Hari</span></div>
            </div>
          </div>
        }
      />

      {!readOnly && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4 text-theme-primary" />
            <span>Tambah Kalender Libur / Tanpa Presensi Baru</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Tanggal</label>
              <input
                type="date"
                value={newLiburTanggal}
                onChange={(e) => setNewLiburTanggal(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Jenis Kategori</label>
              <select
                value={newLiburJenis}
                onChange={(e) => setNewLiburJenis(e.target.value as any)}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-theme-primary"
              >
                <option value="nasional">Libur Nasional</option>
                <option value="sekolah">Libur Sekolah</option>
                <option value="tanpa_presensi">Hari Tanpa Presensi (Kegiatan)</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Keterangan / Nama Kegiatan</label>
              <input
                type="text"
                value={newLiburKeterangan}
                onChange={(e) => setNewLiburKeterangan(e.target.value)}
                placeholder="Misal: Studi Tour Sekolah / Hut Kemerdekaan"
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="button"
                onClick={handleAdd}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
            Daftar Hari Libur & Tanpa Presensi Aktif
          </h4>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Urut berdasarkan tanggal</span>
            {!readOnly && hariLiburList.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer border border-rose-500/20"
                title="Hapus Semua Hari Libur"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua</span>
              </button>
            )}
          </div>
        </div>

        {hariLiburList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Belum ada jadwal hari libur atau tanpa presensi yang ditambahkan.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {hariLiburList.sort((a, b) => a.tanggal.localeCompare(b.tanggal)).map((h) => (
              <div key={h.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-black text-xs ${
                    h.jenis === 'nasional' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:bg-rose-950/50 dark:text-rose-400' :
                    h.jenis === 'sekolah' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:bg-amber-950/50 dark:text-amber-400' :
                    'bg-purple-500/10 text-purple-600 border border-purple-500/20 dark:bg-purple-950/50 dark:text-purple-400'
                  }`}>
                    {h.jenis === 'nasional' ? 'NAS' : h.jenis === 'sekolah' ? 'SEK' : 'BEBAS'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{formatDateIndo(h.tanggal)}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        h.jenis === 'nasional' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800' :
                        h.jenis === 'sekolah' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                        'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      }`}>
                        {h.jenis === 'nasional' ? 'Libur Nasional' : h.jenis === 'sekolah' ? 'Libur Sekolah' : 'Hari Tanpa Presensi'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{h.keterangan}</p>
                  </div>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(h.id)}
                    className="p-2.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer shrink-0"
                    title="Hapus Hari Libur"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
