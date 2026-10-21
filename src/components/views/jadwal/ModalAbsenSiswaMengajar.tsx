import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  BookOpen,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  Users,
  Search,
  Check,
  FileText,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import {
  AppData,
  JadwalMengajarGuru,
  Siswa,
  AbsensiMengajarGuruItem,
  SiswaPresensiSesiGuru
} from '../../../types';
import { getTodayString } from '../../../utils/helpers';

interface ModalAbsenSiswaMengajarProps {
  isOpen: boolean;
  onClose: () => void;
  jadwal: JadwalMengajarGuru | null;
  appData: AppData;
  currentUser: any;
  onSave: (sesi: AbsensiMengajarGuruItem) => Promise<void>;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  existingSesi?: AbsensiMengajarGuruItem | null;
}

export const ModalAbsenSiswaMengajar: React.FC<ModalAbsenSiswaMengajarProps> = ({
  isOpen,
  onClose,
  jadwal,
  appData,
  currentUser,
  onSave,
  onShowToast,
  existingSesi,
}) => {
  if (!isOpen || !jadwal) return null;

  // Tanggal KBM (default: hari ini)
  const [tanggal, setTanggal] = useState<string>(
    existingSesi?.tanggal || getTodayString()
  );

  // Materi / Topik Jurnal KBM
  const [materiAjar, setMateriAjar] = useState<string>(
    existingSesi?.materiAjar || ''
  );
  const [catatanGuru, setCatatanGuru] = useState<string>(
    existingSesi?.catatanGuru || ''
  );

  // Search filter siswa
  const [searchSiswa, setSearchSiswa] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter daftar siswa kelas ini
  const siswaListKelas: Siswa[] = useMemo(() => {
    const list = (appData.siswa || []).filter((s) => {
      const matchId = jadwal.kelasId && s.kelasId === jadwal.kelasId;
      const matchNama =
        jadwal.kelasNama &&
        String((s as any).kelas || s.kelasId || '').trim().toLowerCase() ===
          jadwal.kelasNama.trim().toLowerCase();
      return matchId || matchNama;
    });

    return list.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [appData.siswa, jadwal.kelasId, jadwal.kelasNama]);

  // Map state presensi per siswa: { [siswaId]: { status: 'H'|'S'|'I'|'A', catatan: string } }
  const [presensiMap, setPresensiMap] = useState<
    Record<string, { status: 'H' | 'S' | 'I' | 'A' | ''; catatan: string }>
  >({});

  // Inisialisasi status siswa dari existing sesi atau default kosong (tidak ada yang terpilih)
  useEffect(() => {
    const initMap: Record<string, { status: 'H' | 'S' | 'I' | 'A' | ''; catatan: string }> = {};

    if (existingSesi && Array.isArray(existingSesi.presensiSiswa) && existingSesi.presensiSiswa.length > 0) {
      existingSesi.presensiSiswa.forEach((item) => {
        const st = (item.status as any) || '';
        const cleanSt = ['H', 'S', 'I', 'A'].includes(st) ? st : '';
        initMap[item.siswaId] = {
          status: cleanSt,
          catatan: item.catatan || '',
        };
      });
      // Fallback for any missing students
      siswaListKelas.forEach((s) => {
        if (!initMap[s.id]) {
          initMap[s.id] = { status: '', catatan: '' };
        }
      });
    } else {
      // Default: tidak ada yang terpilih (kosong)
      siswaListKelas.forEach((s) => {
        initMap[s.id] = { status: '', catatan: '' };
      });
    }

    setPresensiMap(initMap);
    if (existingSesi?.materiAjar) setMateriAjar(existingSesi.materiAjar);
    if (existingSesi?.catatanGuru) setCatatanGuru(existingSesi.catatanGuru);
    if (existingSesi?.tanggal) setTanggal(existingSesi.tanggal);
  }, [existingSesi, siswaListKelas, jadwal]);

  // Statistik Realtime Sesi
  const stats = useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpha = 0;
    let belum = 0;

    siswaListKelas.forEach((s) => {
      const st = presensiMap[s.id]?.status;
      if (st === 'H') hadir++;
      else if (st === 'S') sakit++;
      else if (st === 'I') izin++;
      else if (st === 'A') alpha++;
      else belum++;
    });

    const total = siswaListKelas.length;
    const persen = total > 0 ? Math.round((hadir / total) * 100) : 0;
    return { total, hadir, sakit, izin, alpha, belum, persen };
  }, [siswaListKelas, presensiMap]);

  // Filtered siswa berdasarkan kata kunci pencarian
  const filteredSiswa = useMemo(() => {
    if (!searchSiswa.trim()) return siswaListKelas;
    const q = searchSiswa.toLowerCase().trim();
    return siswaListKelas.filter(
      (s) =>
        s.nama.toLowerCase().includes(q) ||
        (s.nisn && s.nisn.toLowerCase().includes(q))
    );
  }, [siswaListKelas, searchSiswa]);

  // Aksi Cepat: Set Semua Hadir
  const handleSetAllHadir = () => {
    const updated = { ...presensiMap };
    siswaListKelas.forEach((s) => {
      updated[s.id] = {
        status: 'H',
        catatan: updated[s.id]?.catatan || '',
      };
    });
    setPresensiMap(updated);
    onShowToast(`Semua ${siswaListKelas.length} siswa diset Hadir!`, 'info');
  };

  // Aksi Cepat: Reset Status
  const handleReset = () => {
    const updated = { ...presensiMap };
    siswaListKelas.forEach((s) => {
      updated[s.id] = { status: '', catatan: '' };
    });
    setPresensiMap(updated);
  };

  // Ubah status satu siswa
  const handleStatusChange = (siswaId: string, status: 'H' | 'S' | 'I' | 'A') => {
    setPresensiMap((prev) => ({
      ...prev,
      [siswaId]: {
        status: prev[siswaId]?.status === status ? '' : status,
        catatan: prev[siswaId]?.catatan || '',
      },
    }));
  };

  // Ubah catatan satu siswa
  const handleCatatanChange = (siswaId: string, catatan: string) => {
    setPresensiMap((prev) => ({
      ...prev,
      [siswaId]: {
        status: prev[siswaId]?.status || '',
        catatan,
      },
    }));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!materiAjar.trim()) {
      onShowToast('Mohon isi jurnal materi / topik pembelajaran hari ini.', 'error');
      return;
    }

    if (siswaListKelas.length === 0) {
      onShowToast('Kelas ini belum memiliki siswa yang terdaftar.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const presensiSiswaArray: SiswaPresensiSesiGuru[] = siswaListKelas.map((s) => {
        const item = presensiMap[s.id] || { status: '', catatan: '' };
        return {
          siswaId: s.id,
          siswaNama: s.nama,
          nisn: s.nisn || '',
          status: (item.status as any) || '',
          catatan: item.catatan || '',
        };
      });

      const sesiItem: AbsensiMengajarGuruItem = {
        id: existingSesi?.id || `PMG_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        jadwalId: jadwal.id,
        guruUsername: jadwal.guruUsername || currentUser?.username || 'guru',
        guruNama: jadwal.guruNama || currentUser?.nama || 'Guru',
        tanggal,
        hari: jadwal.hari,
        kelasId: jadwal.kelasId,
        kelasNama: jadwal.kelasNama,
        mataPelajaran: jadwal.mataPelajaran,
        jamPelajaran: jadwal.jamKe || 'Jam KBM',
        materiAjar: materiAjar.trim(),
        catatanGuru: catatanGuru.trim(),
        presensiSiswa: presensiSiswaArray,
        createdAt: existingSesi?.createdAt || new Date().toISOString(),
      };

      await onSave(sesiItem);
      onShowToast(
        `Presensi kelas mengajar (${jadwal.kelasNama} - ${jadwal.mataPelajaran}) berhasil disimpan!`,
        'success'
      );
      onClose();
    } catch (err: any) {
      onShowToast(`Gagal menyimpan presensi: ${err.message || err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={() => !isSaving && onClose()} />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl my-6 overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-slate-900 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Absensi Siswa Kelas Mengajar Guru
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Sesi Mandiri
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  <span className="font-bold text-blue-700 dark:text-blue-300">
                    {jadwal.mataPelajaran}
                  </span>{' '}
                  · Kelas <span className="font-bold text-slate-900 dark:text-white">{jadwal.kelasNama}</span> · Guru:{' '}
                  <span className="font-semibold">{jadwal.guruNama}</span>
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Hari {jadwal.hari} ({jadwal.shift || 'Pagi'})
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    {jadwal.jamKe || 'Jam KBM'}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                    <Users className="w-3.5 h-3.5" />
                    {siswaListKelas.length} Siswa
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Baris 1: Tanggal KBM & Info Isolasi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Tanggal Pertemuan KBM</span>
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 dark:text-blue-200">
                <span className="font-bold">Terpisah Mandiri:</span> Absensi ini khusus mencatat kehadiran siswa pada jam pelajaran Anda dan tidak akan mengubah absensi harian utama sekolah.
              </div>
            </div>
          </div>

          {/* Baris 2: Jurnal Pembelajaran KBM (Materi Ajar) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Jurnal Mengajar Hari Ini
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Topik / Materi Pembelajaran <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={materiAjar}
                  onChange={(e) => setMateriAjar(e.target.value)}
                  placeholder="Contoh: Modul 3 - Konfigurasi Routing Dinamis OSPF & Analisis Paket Data..."
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Catatan Khusus KBM / Sikap Kelas (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={catatanGuru}
                  onChange={(e) => setCatatanGuru(e.target.value)}
                  placeholder="Catatan keaktifan siswa, tugas praktikum, kendala perangkat laboratorium..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Baris 3: Rekap Cepat & Tombol Aksi Masal */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            {/* Realtime Stats Pills */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Rekap Kehadiran:
              </span>
              <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                H: {stats.hadir}
              </span>
              <span className="px-2 py-0.5 rounded-md font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                S: {stats.sakit}
              </span>
              <span className="px-2 py-0.5 rounded-md font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                I: {stats.izin}
              </span>
              <span className="px-2 py-0.5 rounded-md font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                A: {stats.alpha}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                ({stats.persen}% Hadir)
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetAllHadir}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 transition cursor-pointer flex items-center gap-1.5"
                title="Tandai semua siswa sebagai Hadir"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Semua Hadir</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                title="Reset status siswa"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Baris 4: Search Bar Siswa */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchSiswa}
              onChange={(e) => setSearchSiswa(e.target.value)}
              placeholder="Cari nama atau NISN siswa..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Baris 5: Tabel Siswa */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3 w-56 text-center">Status Kehadiran</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSiswa.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Tidak ditemukan data siswa di kelas ini.
                    </td>
                  </tr>
                ) : (
                  filteredSiswa.map((siswa, idx) => {
                    const currentItem = presensiMap[siswa.id] || { status: '', catatan: '' };
                    const currentStatus = currentItem.status;

                    return (
                      <tr
                        key={siswa.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {siswa.nama}
                          </div>
                          {siswa.nisn && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              NISN: {siswa.nisn}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {/* Segmented Control H / S / I / A */}
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(siswa.id, 'H')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                currentStatus === 'H'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                              title="Hadir"
                            >
                              H
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(siswa.id, 'S')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                currentStatus === 'S'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                              }`}
                              title="Sakit"
                            >
                              S
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(siswa.id, 'I')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                currentStatus === 'I'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-700'
                              }`}
                              title="Izin"
                            >
                              I
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(siswa.id, 'A')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                currentStatus === 'A'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-700'
                              }`}
                              title="Alpha"
                            >
                              A
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={currentItem.catatan}
                            onChange={(e) => handleCatatanChange(siswa.id, e.target.value)}
                            placeholder="Catatan..."
                            className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              Data sesi dan jurnal akan otomatis tersimpan ke tabel presensi mengajar guru.
            </span>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer flex items-center gap-2 shadow-md shadow-blue-500/20"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Presensi Kelas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
