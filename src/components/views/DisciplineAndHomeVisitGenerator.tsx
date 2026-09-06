import React, { useState } from 'react';
import {
  ShieldAlert,
  Home,
  Sparkles,
  CheckCircle2,
  Sliders,
  Play,
  Layers,
  FileText,
  AlertTriangle,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import { AppData, Pelanggaran, HomeVisit, PelanggaranKategori } from '../../types';
import { getTodayString } from '../../data/initialData';

interface DisciplineAndHomeVisitGeneratorProps {
  appData: AppData;
  onUpdateAppData: (data: AppData) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const SAMPLE_PELANGGARAN_TEMPLATES = [
  // Ringan
  {
    kategori: 'ringan' as PelanggaranKategori,
    nama: 'Atribut seragam tidak lengkap (tidak mengenakan dasi/gesper resmi)',
    poin: 10,
    tindakan: 'Teguran lisan & diminta melengkapi atribut keesokan harinya',
    keterangan: 'Pemeriksaan rutin kelengkapan seragam pada saat apel pagi',
  },
  {
    kategori: 'ringan' as PelanggaranKategori,
    nama: 'Terlambat hadir ke sekolah lebih dari 15 menit tanpa alasan darurat',
    poin: 10,
    tindakan: 'Pencatatan di buku piket & pembinaan literasi di perpustakaan',
    keterangan: 'Terjaring di gerbang piket sekolah saat jam masuk sudah ditutup',
  },
  {
    kategori: 'ringan' as PelanggaranKategori,
    nama: 'Rambut tidak rapi / tidak sesuai standar ketentuan tata tertib sekolah',
    poin: 5,
    tindakan: 'Peringatan pertama dan diberi tenggat waktu 2 hari untuk memotong rambut rapi',
    keterangan: 'Pemeriksaan kedisiplinan dan kerapian siswa',
  },
  {
    kategori: 'ringan' as PelanggaranKategori,
    nama: 'Makan/minum di ruang kelas saat jam pembelajaran berlangsung',
    poin: 5,
    tindakan: 'Teguran langsung oleh guru pengajar dan diminta merapikan kelas',
    keterangan: 'Ditemukan saat jam pelajaran ke-3',
  },
  // Sedang
  {
    kategori: 'sedang' as PelanggaranKategori,
    nama: 'Meninggalkan lingkungan sekolah tanpa izin saat jam pembelajaran (Bolos Jam KBM)',
    poin: 25,
    tindakan: 'Pemanggilan ke ruang BK dan pembinaan bersama Wali Kelas',
    keterangan: 'Terpantau meninggalkan area sekolah setelah jam istirahat pertama',
  },
  {
    kategori: 'sedang' as PelanggaranKategori,
    nama: 'Menggunakan ponsel/gadget untuk bermain game saat guru menjelaskan materi',
    poin: 20,
    tindakan: 'Ponsel diamankan sementara di ruang piket sampai jam pulang sekolah',
    keterangan: 'Kedapatan bermain game online pada jam pembelajaran efektif',
  },
  {
    kategori: 'sedang' as PelanggaranKategori,
    nama: 'Membuat surat izin palsu mengatasnamakan orang tua/wali murid',
    poin: 30,
    tindakan: 'Konfirmasi langsung ke nomor wali murid & penandatanganan berita acara komitmen',
    keterangan: 'Tanda tangan izin sakit tidak sesuai dengan spesimen data wali murid',
  },
  // Berat
  {
    kategori: 'berat' as PelanggaranKategori,
    nama: 'Terlibat perkelahian / perselisihan fisik di lingkungan sekitar sekolah',
    poin: 50,
    tindakan: 'Pemanggilan orang tua secara resmi, mediasi tertutup, dan skorsing 3 hari kerja',
    keterangan: 'Perselisihan antarsiswa pasca jam kepulangan di area parkir luar',
  },
  {
    kategori: 'berat' as PelanggaranKategori,
    nama: 'Merusak fasilitas sarana prasarana sekolah secara sengaja',
    poin: 45,
    tindakan: 'Ganti rugi perbaikan sarana bersama orang tua & kerja bakti sosial di sekolah',
    keterangan: 'Merusak pintu kamar mandi dan meja kelas',
  },
];

const SAMPLE_HOME_VISIT_SCENARIOS = [
  {
    alasan: 'Sering Tidak Hadir Tanpa Keterangan (Alpha berulang > 3 hari)',
    catatan: 'Siswa tidak masuk sekolah berturut-turut tanpa surat izin. Dihubungi via WhatsApp tidak merespons.',
    hasil: 'Bertemu langsung dengan orang tua siswa di kediaman. Orang tua mengira siswa berangkat setiap pagi. Terungkap siswa nongkrong di luar. Orang tua berkomitmen mengantar langsung ke sekolah.',
    tindakLanjut: 'Siswa menandatangani surat komitmen kehadiran disaksikan orang tua. Pemantauan ketat presensi harian oleh Wali Kelas & Guru BK.',
    status: 'selesai' as const,
  },
  {
    alasan: 'Sakit Berkelanjutan & Koordinasi Tugas Belajar Mandiri (BDR)',
    catatan: 'Kunjungan kepedulian sekolah untuk menjenguk siswa yang sedang rawat jalan pasca sakit tifus.',
    hasil: 'Kondisi kesehatan siswa berangsur membaik dan sedang masa pemulihan 4 hari ke depan. Pihak keluarga menyambut baik perhatian tim sekolah.',
    tindakLanjut: 'Menyerahkan modul pembelajaran dan tugas susulan yang dapat dikerjakan secara santai di rumah.',
    status: 'selesai' as const,
  },
  {
    alasan: 'Pembinaan Sikap & Penurunan Motivasi Belajar Siswa',
    catatan: 'Siswa sering tertidur di kelas, jarang mengumpulkan tugas harian, dan tampak murung.',
    hasil: 'Diskusi mendalam bersama orang tua. Diketahui siswa membantu usaha toko keluarga hingga larut malam. Orang tua setuju membatasi jam kerja anak agar fokus belajar.',
    tindakLanjut: 'Jadwal konseling berkala seminggu sekali di ruang BK untuk memantau progres akademik.',
    status: 'proses' as const,
  },
  {
    alasan: 'Klarifikasi Laporan Indikasi Masalah Kedisiplinan di Luar Sekolah',
    catatan: 'Ditemukan laporan warga terkait dugaan keterlibatan perkumpulan remaja sepulang sekolah.',
    hasil: 'Orang tua berterima kasih atas informasi cepat dari sekolah. Orang tua akan meningkatkan pengawasan pergaulan anak di lingkungan rumah.',
    tindakLanjut: 'Kolaborasi monitoring antara pihak orang tua dan tim Kesiswaan sekolah.',
    status: 'perlu_followup' as const,
  },
  {
    alasan: 'Konsultasi Perencanaan Studi Lanjutan & Minat Karir',
    catatan: 'Kunjungan apresiasi dan arahan bimbingan karir siswa berprestasi yang membutuhkan dukungan beasiswa.',
    hasil: 'Orang tua menyepakati rencana pendaftaran seleksi beasiswa perguruan tinggi / magang industri.',
    tindakLanjut: 'Pendampingan berkas portofolio prestasi oleh tim BK sekolah.',
    status: 'selesai' as const,
  },
];

export const DisciplineAndHomeVisitGenerator: React.FC<DisciplineAndHomeVisitGeneratorProps> = ({
  appData,
  onUpdateAppData,
  onShowToast,
}) => {
  // Tab selector between Kedisiplinan & Home Visit
  const [activeTab, setActiveTab] = useState<'kedisiplinan' | 'home_visit'>('kedisiplinan');

  // Pelanggaran Generator States
  const [pelanggaranKelasId, setPelanggaranKelasId] = useState<string>('all');
  const [pelanggaranCount, setPelanggaranCount] = useState<number>(5);
  const [pelanggaranCategoryFilter, setPelanggaranCategoryFilter] = useState<'all' | 'ringan' | 'sedang' | 'berat'>('all');
  const [pelanggaranMode, setPelanggaranMode] = useState<'append' | 'replace'>('append');
  const [isGeneratingPelanggaran, setIsGeneratingPelanggaran] = useState<boolean>(false);

  // Home Visit Generator States
  const [homeVisitKelasId, setHomeVisitKelasId] = useState<string>('all');
  const [homeVisitCount, setHomeVisitCount] = useState<number>(3);
  const [homeVisitMode, setHomeVisitMode] = useState<'append' | 'replace'>('append');
  const [isGeneratingHomeVisit, setIsGeneratingHomeVisit] = useState<boolean>(false);

  // Summary state
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  // Helper date generator around recent weeks
  const getRandomRecentDate = () => {
    const today = new Date();
    const daysAgo = Math.floor(Math.random() * 20); // 0 to 20 days ago
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  // 1. Generate Pelanggaran Kedisiplinan
  const handleGeneratePelanggaran = () => {
    if (!appData.siswa || appData.siswa.length === 0) {
      onShowToast('Silakan buat data siswa terlebih dahulu.', 'warning');
      return;
    }
    if (!appData.kelas || appData.kelas.length === 0) {
      onShowToast('Silakan buat data kelas terlebih dahulu.', 'warning');
      return;
    }

    setIsGeneratingPelanggaran(true);

    setTimeout(() => {
      try {
        const availableStudents = pelanggaranKelasId === 'all'
          ? appData.siswa
          : appData.siswa.filter((s) => s.kelasId === pelanggaranKelasId);

        if (availableStudents.length === 0) {
          onShowToast('Tidak ada siswa yang ditemukan pada kelas yang dipilih.', 'warning');
          setIsGeneratingPelanggaran(false);
          return;
        }

        const filteredTemplates = pelanggaranCategoryFilter === 'all'
          ? SAMPLE_PELANGGARAN_TEMPLATES
          : SAMPLE_PELANGGARAN_TEMPLATES.filter((t) => t.kategori === pelanggaranCategoryFilter);

        const newPelanggaranList: Pelanggaran[] = [];
        const statuses: Pelanggaran['status'][] = ['selesai', 'proses', 'perlu_tindak_lanjut'];

        for (let i = 0; i < pelanggaranCount; i++) {
          const student = availableStudents[Math.floor(Math.random() * availableStudents.length)];
          const template = filteredTemplates[Math.floor(Math.random() * filteredTemplates.length)];
          const targetKelas = appData.kelas.find((k) => k.id === student.kelasId);
          const waliKelas = appData.waliKelas?.find((w) => w.id === targetKelas?.waliKelasId);
          const pelapor = waliKelas ? `${waliKelas.nama} (Wali Kelas)` : 'Tim Ketertiban Kesiswaan & BP BK';
          const tanggal = getRandomRecentDate();
          const status = statuses[Math.floor(Math.random() * statuses.length)];

          newPelanggaranList.push({
            id: `PEL_${Date.now()}_${i + 1}`,
            tanggal,
            siswaId: student.id,
            kelasId: student.kelasId,
            kategori: template.kategori,
            namaPelanggaran: template.nama,
            poin: template.poin,
            keterangan: template.keterangan,
            pelapor,
            tindakan: template.tindakan,
            status,
            createdAt: tanggal,
          });
        }

        const currentPelanggaran = pelanggaranMode === 'replace' ? [] : (appData.pelanggaran || []);
        const updatedPelanggaran = [...currentPelanggaran, ...newPelanggaranList];

        onUpdateAppData({
          ...appData,
          pelanggaran: updatedPelanggaran,
        });

        const msg = `Sukses ${pelanggaranMode === 'replace' ? 'memperbarui (reset & isi)' : 'menambahkan'} ${newPelanggaranList.length} data catatan pelanggaran kedisiplinan!`;
        setLastActionMessage(msg);
        onShowToast(msg, 'success');
      } catch (err) {
        console.error(err);
        onShowToast('Gagal membuat data catatan kedisiplinan.', 'error');
      } finally {
        setIsGeneratingPelanggaran(false);
      }
    }, 250);
  };

  // 2. Generate Home Visit
  const handleGenerateHomeVisit = () => {
    if (!appData.siswa || appData.siswa.length === 0) {
      onShowToast('Silakan buat data siswa terlebih dahulu.', 'warning');
      return;
    }
    if (!appData.kelas || appData.kelas.length === 0) {
      onShowToast('Silakan buat data kelas terlebih dahulu.', 'warning');
      return;
    }

    setIsGeneratingHomeVisit(true);

    setTimeout(() => {
      try {
        const availableStudents = homeVisitKelasId === 'all'
          ? appData.siswa
          : appData.siswa.filter((s) => s.kelasId === homeVisitKelasId);

        if (availableStudents.length === 0) {
          onShowToast('Tidak ada siswa yang ditemukan pada kelas yang dipilih.', 'warning');
          setIsGeneratingHomeVisit(false);
          return;
        }

        const newHomeVisitList: HomeVisit[] = [];

        for (let i = 0; i < homeVisitCount; i++) {
          const student = availableStudents[Math.floor(Math.random() * availableStudents.length)];
          const scenario = SAMPLE_HOME_VISIT_SCENARIOS[i % SAMPLE_HOME_VISIT_SCENARIOS.length];
          const targetKelas = appData.kelas.find((k) => k.id === student.kelasId);
          const waliKelas = appData.waliKelas?.find((w) => w.id === targetKelas?.waliKelasId);
          const petugas = waliKelas
            ? `${waliKelas.nama} (Wali Kelas) & Tim Bimbingan Konseling (BK)`
            : 'Guru Bimbingan Konseling & Staf Kesiswaan';
          const tanggal = getRandomRecentDate();

          newHomeVisitList.push({
            id: `HV_${Date.now()}_${i + 1}`,
            tanggal,
            siswaId: student.id,
            kelasId: student.kelasId,
            petugas,
            alasan: scenario.alasan,
            catatan: scenario.catatan,
            hasil: scenario.hasil,
            tindakLanjut: scenario.tindakLanjut,
            status: scenario.status,
            createdAt: tanggal,
          });
        }

        const currentHomeVisits = homeVisitMode === 'replace' ? [] : (appData.homeVisits || []);
        const updatedHomeVisits = [...currentHomeVisits, ...newHomeVisitList];

        onUpdateAppData({
          ...appData,
          homeVisits: updatedHomeVisits,
        });

        const msg = `Sukses ${homeVisitMode === 'replace' ? 'memperbarui (reset & isi)' : 'menambahkan'} ${newHomeVisitList.length} rekor kunjungan rumah (Home Visit)!`;
        setLastActionMessage(msg);
        onShowToast(msg, 'success');
      } catch (err) {
        console.error(err);
        onShowToast('Gagal membuat data simulasi Home Visit.', 'error');
      } finally {
        setIsGeneratingHomeVisit(false);
      }
    }, 250);
  };

  return (
    <div id="discipline-home-visit-generator" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Generator Catatan Kedisiplinan &amp; Home Visit
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                Simulasi Kasus
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Buat data simulasi pelanggaran tata tertib dan laporan kunjungan rumah (Home Visit) untuk pengujian sistem pembinaan siswa.
            </p>
          </div>
        </div>

        {lastActionMessage && (
          <button
            type="button"
            onClick={() => setLastActionMessage(null)}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 self-start sm:self-center transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tutup Info
          </button>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('kedisiplinan')}
          className={`py-2.5 px-4 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'kedisiplinan'
              ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Catatan Pelanggaran Kedisiplinan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('home_visit')}
          className={`py-2.5 px-4 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'home_visit'
              ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Home className="w-4 h-4 text-rose-500" />
          <span>Laporan Home Visit (Kunjungan)</span>
        </button>
      </div>

      {/* Tab 1: Generator Catatan Kedisiplinan / Pelanggaran */}
      {activeTab === 'kedisiplinan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          <div className="lg:col-span-7 space-y-4">
            {/* Target Kelas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                Target Kelas Siswa
              </label>
              <select
                value={pelanggaranKelasId}
                onChange={(e) => setPelanggaranKelasId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              >
                <option value="all">🌐 Semua Kelas (Acak ke Seluruh Siswa)</option>
                {appData.kelas?.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama} ({k.jurusanId})
                  </option>
                ))}
              </select>
            </div>

            {/* Jumlah Kasus & Kategori */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Jumlah Kasus Simulasi:
                </label>
                <div className="flex gap-2">
                  {[3, 5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPelanggaranCount(num)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                        pelanggaranCount === num
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {num} Kasus
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Filter Kategori Pelanggaran:
                </label>
                <select
                  value={pelanggaranCategoryFilter}
                  onChange={(e) => setPelanggaranCategoryFilter(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-medium outline-none"
                >
                  <option value="all">Campuran (Ringan, Sedang, Berat)</option>
                  <option value="ringan">Hanya Pelanggaran Ringan (5-10 Poin)</option>
                  <option value="sedang">Hanya Pelanggaran Sedang (20-30 Poin)</option>
                  <option value="berat">Hanya Pelanggaran Berat (45-50 Poin)</option>
                </select>
              </div>
            </div>

            {/* Mode Tambah / Timpa */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Metode Penyimpanan:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Saat ini terdapat {appData.pelanggaran?.length || 0} rekor pelanggaran aktif di database.
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPelanggaranMode('append')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    pelanggaranMode === 'append'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  + Tambahkan
                </button>
                <button
                  type="button"
                  onClick={() => setPelanggaranMode('replace')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    pelanggaranMode === 'replace'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Reset &amp; Timpa
                </button>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Preview & Tombol Eksekusi */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-amber-50/50 dark:bg-amber-950/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/40">
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Preview Skenario Pelanggaran
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300/80 leading-relaxed">
                Akan menghasilkan <strong className="font-bold">{pelanggaranCount} catatan pelanggaran</strong> lengkap dengan poin penalti resmi, keterangan kejadian, nama pelapor otomatis, dan status penanganan tindak lanjut.
              </p>
            </div>

            <button
              type="button"
              disabled={isGeneratingPelanggaran}
              onClick={handleGeneratePelanggaran}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isGeneratingPelanggaran ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses Catatan Pelanggaran...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Generate Catatan Kedisiplinan</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Generator Home Visit (Kunjungan Rumah) */}
      {activeTab === 'home_visit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          <div className="lg:col-span-7 space-y-4">
            {/* Target Kelas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-rose-500" />
                Target Kelas Siswa Kunjungan
              </label>
              <select
                value={homeVisitKelasId}
                onChange={(e) => setHomeVisitKelasId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
              >
                <option value="all">🌐 Semua Kelas (Acak ke Seluruh Siswa)</option>
                {appData.kelas?.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama} ({k.jurusanId})
                  </option>
                ))}
              </select>
            </div>

            {/* Jumlah Kasus Home Visit */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Jumlah Laporan Home Visit:
              </label>
              <div className="flex gap-2">
                {[2, 3, 5, 8].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setHomeVisitCount(num)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      homeVisitCount === num
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {num} Laporan
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Tambah / Timpa */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Metode Penyimpanan:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Saat ini terdapat {appData.homeVisits?.length || 0} rekor Home Visit aktif di database.
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setHomeVisitMode('append')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    homeVisitMode === 'append'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  + Tambahkan
                </button>
                <button
                  type="button"
                  onClick={() => setHomeVisitMode('replace')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    homeVisitMode === 'replace'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Reset &amp; Timpa
                </button>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Preview & Tombol Eksekusi */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-rose-50/50 dark:bg-rose-950/20 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/40">
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Preview Skenario Home Visit
              </div>
              <p className="text-[11px] text-rose-800 dark:text-rose-300/80 leading-relaxed">
                Akan membuat <strong className="font-bold">{homeVisitCount} laporan kunjungan rumah</strong> mencakup kasus ketidakhadiran beruntun, pendampingan belajar BDR akibat sakit, serta pembinaan motivasi dengan narasi hasil &amp; rencana tindak lanjut formal.
              </p>
            </div>

            <button
              type="button"
              disabled={isGeneratingHomeVisit}
              onClick={handleGenerateHomeVisit}
              className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isGeneratingHomeVisit ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses Laporan Home Visit...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Generate Laporan Home Visit</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisciplineAndHomeVisitGenerator;
