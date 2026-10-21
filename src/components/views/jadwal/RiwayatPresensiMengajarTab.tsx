import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  Search,
  Download,
  Trash2,
  Edit,
  Eye,
  FileSpreadsheet,
  CheckCircle2,
  ArrowUpDown
} from 'lucide-react';
import { AppData, AbsensiMengajarGuruItem, UserSession } from '../../../types';
import { cleanMapelName } from '../../../utils/helpers';

interface RiwayatPresensiMengajarTabProps {
  appData: AppData;
  currentUser: UserSession | null;
  readOnly?: boolean;
  onOpenAbsenModal: (sesi: AbsensiMengajarGuruItem) => void;
  onDeleteSesi: (sesiId: string) => Promise<void>;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const RiwayatPresensiMengajarTab: React.FC<RiwayatPresensiMengajarTabProps> = ({
  appData,
  currentUser,
  readOnly,
  onOpenAbsenModal,
  onDeleteSesi,
  onShowToast,
}) => {
  const isTeacher = currentUser?.role === 'guru';
  const teacherUsername = String((currentUser as any)?.username || (currentUser?.data as any)?.username || '').trim().toLowerCase();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('semua');
  const [filterBulan, setFilterBulan] = useState('semua');

  // Ambil semua sesi presensi mengajar
  const allSesiList: AbsensiMengajarGuruItem[] = useMemo(() => {
    const list = appData.presensiMengajarGuru || [];
    if (isTeacher) {
      return list.filter(
        (s) => String(s.guruUsername || '').trim().toLowerCase() === teacherUsername
      );
    }
    return list;
  }, [appData.presensiMengajarGuru, isTeacher, teacherUsername]);

  // Daftar opsi kelas yang ada di sesi
  const availableKelasList = useMemo(() => {
    const set = new Set<string>();
    allSesiList.forEach((s) => {
      if (s.kelasNama) set.add(s.kelasNama);
    });
    return Array.from(set).sort();
  }, [allSesiList]);

  // Filtered Sesi
  const filteredSesiList = useMemo(() => {
    return allSesiList
      .filter((sesi) => {
        if (filterKelas !== 'semua' && sesi.kelasNama !== filterKelas) return false;
        if (filterBulan !== 'semua' && !sesi.tanggal.startsWith(filterBulan)) return false;

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchMapel = cleanMapelName(sesi.mataPelajaran).toLowerCase().includes(q);
          const matchKelas = (sesi.kelasNama || '').toLowerCase().includes(q);
          const matchMateri = (sesi.materiAjar || '').toLowerCase().includes(q);
          const matchGuru = (sesi.guruNama || '').toLowerCase().includes(q);
          if (!matchMapel && !matchKelas && !matchMateri && !matchGuru) return false;
        }

        return true;
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [allSesiList, filterKelas, filterBulan, searchTerm]);

  // Statistik Keseluruhan
  const stats = useMemo(() => {
    let totalHadir = 0;
    let totalSiswa = 0;
    filteredSesiList.forEach((sesi) => {
      if (Array.isArray(sesi.presensiSiswa)) {
        sesi.presensiSiswa.forEach((st) => {
          totalSiswa++;
          if (st.status === 'H') totalHadir++;
        });
      }
    });

    const avgKehadiran = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0;
    return {
      totalSesi: filteredSesiList.length,
      totalSiswaPresensi: totalSiswa,
      avgKehadiran,
    };
  }, [filteredSesiList]);

  // Ekspor Rekap ke Excel
  const handleExportExcel = () => {
    if (filteredSesiList.length === 0) {
      onShowToast('Tidak ada data riwayat presensi yang sesuai untuk diekspor.', 'info');
      return;
    }

    try {
      const rows: any[] = [];
      filteredSesiList.forEach((sesi, sIdx) => {
        let hadir = 0;
        let sakit = 0;
        let izin = 0;
        let alpha = 0;

        (sesi.presensiSiswa || []).forEach((st) => {
          if (st.status === 'H') hadir++;
          else if (st.status === 'S') sakit++;
          else if (st.status === 'I') izin++;
          else if (st.status === 'A') alpha++;
        });

        rows.push({
          'No': sIdx + 1,
          'Tanggal': sesi.tanggal,
          'Hari': sesi.hari,
          'Kelas': sesi.kelasNama,
          'Mata Pelajaran': cleanMapelName(sesi.mataPelajaran),
          'Guru Pengampu': sesi.guruNama,
          'Jam Pelajaran': sesi.jamPelajaran || '-',
          'Materi / Topik KBM': sesi.materiAjar || '-',
          'Hadir (H)': hadir,
          'Sakit (S)': sakit,
          'Izin (I)': izin,
          'Alpha (A)': alpha,
          'Total Siswa': (sesi.presensiSiswa || []).length,
          'Catatan Guru': sesi.catatanGuru || '-',
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Presensi KBM');
      XLSX.writeFile(
        workbook,
        `Rekap_Presensi_KBM_${isTeacher ? teacherUsername : 'Semua'}_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      onShowToast('Berhasil mengekspor rekap presensi kelas mengajar ke Excel!', 'success');
    } catch (err: any) {
      onShowToast(`Gagal mengekspor data: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Sesi KBM Terlaksana</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.totalSesi}
          </div>
          <div className="text-[11px] text-slate-400">Pertemuan tatap muka kelas</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rata-rata Kehadiran Siswa</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.avgKehadiran}%
          </div>
          <div className="text-[11px] text-slate-400">Dari total {stats.totalSiswaPresensi} catatan siswa</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ekspor Data</div>
          <button
            type="button"
            onClick={handleExportExcel}
            className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Rekap Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari materi, kelas, mapel..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Filter Kelas */}
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value="semua">Semua Kelas</option>
            {availableKelasList.map((k) => (
              <option key={k} value={k}>
                Kelas: {k}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
          Menampilkan {filteredSesiList.length} sesi pertemuan
        </div>
      </div>

      {/* Table Sesi */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Tanggal &amp; Hari</th>
                <th className="py-3 px-4">Kelas &amp; Mapel</th>
                {!isTeacher && <th className="py-3 px-4">Guru</th>}
                <th className="py-3 px-4 min-w-[220px]">Topik Materi Pembelajaran</th>
                <th className="py-3 px-4 text-center">Rekap Kehadiran</th>
                <th className="py-3 px-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSesiList.length === 0 ? (
                <tr>
                  <td colSpan={isTeacher ? 6 : 7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold">Belum ada riwayat presensi kelas mengajar.</p>
                      <p className="text-xs text-slate-400 max-w-md">
                        Klik tombol <strong>"Absen Kelas"</strong> pada kartu jadwal mengajar Anda untuk mulai merekam presensi dan jurnal harian.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSesiList.map((sesi, idx) => {
                  let hadir = 0;
                  let sakit = 0;
                  let izin = 0;
                  let alpha = 0;
                  (sesi.presensiSiswa || []).forEach((st) => {
                    if (st.status === 'H') hadir++;
                    else if (st.status === 'S') sakit++;
                    else if (st.status === 'I') izin++;
                    else if (st.status === 'A') alpha++;
                  });

                  return (
                    <tr key={sesi.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>{sesi.tanggal}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Hari {sesi.hari} · {sesi.jamPelajaran || 'Jam KBM'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-blue-700 dark:text-blue-400">
                          {cleanMapelName(sesi.mataPelajaran)}
                        </div>
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                            {sesi.kelasNama}
                          </span>
                        </div>
                      </td>
                      {!isTeacher && (
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {sesi.guruNama}
                          </div>
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                          {sesi.materiAjar || '-'}
                        </div>
                        {sesi.catatanGuru && (
                          <div className="text-[11px] text-slate-400 italic line-clamp-1 mt-0.5">
                            Catatan: {sesi.catatanGuru}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1 text-[11px] flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                            H: {hadir}
                          </span>
                          {sakit > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                              S: {sakit}
                            </span>
                          )}
                          {izin > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
                              I: {izin}
                            </span>
                          )}
                          {alpha > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold">
                              A: {alpha}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenAbsenModal(sesi)}
                            className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition cursor-pointer"
                            title="Buka / Edit Lembar Presensi Sesi Ini"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => onDeleteSesi(sesi.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                              title="Hapus Rekaman Sesi Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
