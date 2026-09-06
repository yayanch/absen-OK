import React from 'react';
import { Sparkles, Users, GraduationCap } from 'lucide-react';
import { AppData } from '../../types';
import { PageHeader } from '../common/UIComponents';
import AttendanceTestingTool from './AttendanceTestingTool';
import DisciplineAndHomeVisitGenerator from './DisciplineAndHomeVisitGenerator';
import {
  generate36StudentsForAllClasses,
  randomizeWaliKelasForClasses,
} from '../../data/initialData';

interface DataDemoViewProps {
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

export const DataDemoView: React.FC<DataDemoViewProps> = ({
  appData,
  readOnly,
  onUpdateAppData,
  onShowToast,
  onConfirmModal,
}) => {
  const handleGenerateSampleData = () => {
    if (!appData.kelas || appData.kelas.length === 0) {
      onShowToast('Silakan tambahkan data Kelas terlebih dahulu.', 'warning');
      return;
    }
    const doGenerate = () => {
      const sampleStudents = generate36StudentsForAllClasses(appData.kelas);
      const updatedAppData = { ...appData, siswa: sampleStudents };
      onUpdateAppData(updatedAppData);
      onShowToast(`Berhasil membuat ${sampleStudents.length} data siswa (36 siswa per kelas)!`, 'success');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Buat Sample Data (36 Siswa / Kelas)',
        `Aksi ini akan membuat 36 data siswa otomatis untuk setiap kelas (${appData.kelas.length} kelas = total ${appData.kelas.length * 36} siswa). Data siswa saat ini akan diperbarui dengan data sample. Lanjutkan?`,
        'emerald',
        doGenerate
      );
    } else {
      doGenerate();
    }
  };

  const handleRandomizeWaliKelas = () => {
    if (!appData.kelas || appData.kelas.length === 0) {
      onShowToast('Silakan tambahkan data Kelas terlebih dahulu.', 'warning');
      return;
    }
    if (!appData.waliKelas || appData.waliKelas.length === 0) {
      onShowToast('Silakan tambahkan data Wali Kelas terlebih dahulu.', 'warning');
      return;
    }

    const doGenerate = () => {
      const updatedKelas = randomizeWaliKelasForClasses(appData.kelas, appData.waliKelas);
      const updatedAppData = { ...appData, kelas: updatedKelas };
      onUpdateAppData(updatedAppData);
      onShowToast(`Berhasil mengacak Wali Kelas untuk seluruh ${updatedKelas.length} kelas!`, 'success');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Acak Penugasan Wali Kelas',
        `Aksi ini akan menetapkan Wali Kelas secara acak untuk seluruh ${appData.kelas.length} kelas yang ada. Lanjutkan?`,
        'emerald',
        doGenerate
      );
    } else {
      doGenerate();
    }
  };

  const handleGenerateStudentUsers = () => {
    if (!appData.siswa || appData.siswa.length === 0) {
      onShowToast('Silakan tambahkan atau buat data Siswa terlebih dahulu.', 'warning');
      return;
    }

    const doGenerate = () => {
      const updatedSiswa = appData.siswa.map((s) => ({
        ...s,
        username: s.nisn,
        password: s.nisn,
      }));

      const updatedAppData = {
        ...appData,
        siswa: updatedSiswa,
      };

      onUpdateAppData(updatedAppData);
      onShowToast(
        `Berhasil membuat/memperbarui akun login untuk seluruh ${updatedSiswa.length} murid! Username & Password diset NISN dengan Role Murid.`,
        'success'
      );
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Buat Akun User Semua Murid (Role: Murid)',
        `Aksi ini akan membuat dan memperbarui kredensial akun login untuk seluruh ${appData.siswa.length} murid. Username dan Password akan diset menggunakan NISN masing-masing murid, dengan Role Murid untuk login ke Portal Siswa. Lanjutkan?`,
        'emerald',
        doGenerate
      );
    } else {
      doGenerate();
    }
  };

  const handleClearStudentUsers = () => {
    if (!appData.siswa || appData.siswa.length === 0) {
      onShowToast('Tidak ada data siswa.', 'warning');
      return;
    }

    const doClear = () => {
      const updatedSiswa = appData.siswa.map((s) => ({
        ...s,
        username: undefined,
        password: undefined,
      }));

      const updatedAppData = {
        ...appData,
        siswa: updatedSiswa,
      };

      onUpdateAppData(updatedAppData);
      onShowToast(
        `Berhasil menghapus/mereset akun login untuk seluruh ${updatedSiswa.length} murid.`,
        'success'
      );
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Hapus Akun Login Semua Murid',
        `Aksi ini akan menghapus username dan password untuk seluruh ${appData.siswa.length} murid sehingga mereka tidak dapat login kembali sebagai murid sampai dibuat ulang. Lanjutkan?`,
        'danger',
        doClear
      );
    } else {
      doClear();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={Sparkles}
        title="Data Demo & Generator Simulasi"
        description="Kelola dan buat data sampel otomatis untuk pengujian aplikasi presensi sekolah."
        badge="Simulasi Data"
        actions={
          <span className="px-4 py-2 bg-amber-400 text-slate-950 rounded-2xl text-xs font-black shadow-lg shadow-amber-500/20">
            36 Siswa per Kelas
          </span>
        }
      />

      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">Generator Data Demo</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pilih skenario simulasi untuk menghasilkan data demo secara instan</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                Generate Sample Data Siswa (36 Siswa / Kelas)
              </div>
              <div className="text-[11px] text-indigo-700 dark:text-indigo-300/80 mt-0.5">
                Otomatis membuat 36 data siswa realistis (Laki-laki &amp; Perempuan, NISN, Nama Orang Tua &amp; No WA) untuk setiap kelas ({appData.kelas?.length || 0} kelas = { (appData.kelas?.length || 0) * 36 } siswa).
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerateSampleData}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Buat Sample Data</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-amber-950 dark:text-amber-200">
                Generate Wali Kelas Random untuk Tiap Kelas
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-0.5">
                Menetapkan pengampu Wali Kelas secara acak dan merata dari daftar guru/wali kelas untuk seluruh {appData.kelas?.length || 0} kelas.
              </div>
            </div>
            <button
              type="button"
              onClick={handleRandomizeWaliKelas}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Acak Wali Kelas</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-teal-950 dark:text-teal-200">
                Generate Akun User Login Semua Murid (Username &amp; Password = NISN)
              </div>
              <div className="text-[11px] text-teal-700 dark:text-teal-300/80 mt-0.5">
                Otomatis membuat akun login pengguna untuk seluruh murid ({appData.siswa?.length || 0} siswa). Username dan Password diset menggunakan NISN masing-masing murid dengan Role Murid.
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerateStudentUsers}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Buat User Semua Murid</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-rose-950 dark:text-rose-200">
                Hapus Akun Login Semua Murid
              </div>
              <div className="text-[11px] text-rose-700 dark:text-rose-300/80 mt-0.5">
                Menghapus kredensial username dan password untuk seluruh murid sehingga akses login portal siswa dinonaktifkan.
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearStudentUsers}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Hapus User Semua Murid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tool Testing Generator Presensi Interaktif */}
      <AttendanceTestingTool
        appData={appData}
        onUpdateAppData={onUpdateAppData}
        onShowToast={onShowToast}
      />

      {/* Generator Catatan Kedisiplinan & Home Visit */}
      <DisciplineAndHomeVisitGenerator
        appData={appData}
        onUpdateAppData={onUpdateAppData}
        onShowToast={onShowToast}
      />
    </div>
  );
};
