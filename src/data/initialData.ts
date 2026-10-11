import { AppData, Siswa, Kelas, WaliKelas, HomeVisit, ChatMessage, Pelanggaran, PresensiStatus, PresensiMap, ViolationTemplate, HariLibur, JadwalMengajarGuru, AbsensiMengajarGuruItem, PengumumanSekolah, MataPelajaran, GuruMapelKelasItem, PetugasPiket, CatatanPiketHarian, AuditLog } from '../types';

export const INITIAL_PENGUMUMAN: PengumumanSekolah[] = [];

export const OFFICIAL_NATIONAL_HOLIDAYS_2026_2027: HariLibur[] = [
  // 2026
  { id: 'HL_2026_1', tanggal: '2026-01-01', keterangan: 'Tahun Baru Masehi 2026', jenis: 'nasional' },
  { id: 'HL_2026_2', tanggal: '2026-01-16', keterangan: 'Isra Mikraj Nabi Muhammad SAW', jenis: 'nasional' },
  { id: 'HL_2026_3', tanggal: '2026-02-17', keterangan: 'Tahun Baru Imlek 2577 Kongzili', jenis: 'nasional' },
  { id: 'HL_2026_4', tanggal: '2026-03-19', keterangan: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', jenis: 'nasional' },
  { id: 'HL_2026_5', tanggal: '2026-03-20', keterangan: 'Hari Raya Idul Fitri 1447 Hijriah', jenis: 'nasional' },
  { id: 'HL_2026_6', tanggal: '2026-03-21', keterangan: 'Hari Raya Idul Fitri 1447 Hijriah (Hari Kedua)', jenis: 'nasional' },
  { id: 'HL_2026_7', tanggal: '2026-04-03', keterangan: 'Wafat Isa Almasih (Jumat Agung)', jenis: 'nasional' },
  { id: 'HL_2026_8', tanggal: '2026-05-01', keterangan: 'Hari Buruh Internasional', jenis: 'nasional' },
  { id: 'HL_2026_9', tanggal: '2026-05-14', keterangan: 'Kenaikan Isa Almasih', jenis: 'nasional' },
  { id: 'HL_2026_10', tanggal: '2026-05-27', keterangan: 'Hari Raya Idul Adha 1447 Hijriah', jenis: 'nasional' },
  { id: 'HL_2026_11', tanggal: '2026-05-31', keterangan: 'Hari Raya Waisak 2570 BE', jenis: 'nasional' },
  { id: 'HL_2026_12', tanggal: '2026-06-16', keterangan: 'Tahun Baru Islam 1448 Hijriah', jenis: 'nasional' },
  { id: 'HL_2026_13', tanggal: '2026-08-17', keterangan: 'HUT Kemerdekaan Republik Indonesia ke-81', jenis: 'nasional' },
  { id: 'HL_2026_14', tanggal: '2026-08-25', keterangan: 'Maulid Nabi Muhammad SAW', jenis: 'nasional' },
  { id: 'HL_2026_15', tanggal: '2026-10-01', keterangan: 'Hari Kesaktian Pancasila', jenis: 'nasional' },
  { id: 'HL_2026_16', tanggal: '2026-12-25', keterangan: 'Hari Raya Natal', jenis: 'nasional' },

  // 2027
  { id: 'HL_2027_1', tanggal: '2027-01-01', keterangan: 'Tahun Baru Masehi 2027', jenis: 'nasional' },
  { id: 'HL_2027_2', tanggal: '2027-01-05', keterangan: 'Isra Mikraj Nabi Muhammad SAW', jenis: 'nasional' },
  { id: 'HL_2027_3', tanggal: '2027-02-06', keterangan: 'Tahun Baru Imlek 2578 Kongzili', jenis: 'nasional' },
  { id: 'HL_2027_4', tanggal: '2027-03-08', keterangan: 'Hari Suci Nyepi (Tahun Baru Saka 1949)', jenis: 'nasional' },
  { id: 'HL_2027_5', tanggal: '2027-03-09', keterangan: 'Hari Raya Idul Fitri 1448 Hijriah', jenis: 'nasional' },
  { id: 'HL_2027_6', tanggal: '2027-03-10', keterangan: 'Hari Raya Idul Fitri 1448 Hijriah (Hari Kedua)', jenis: 'nasional' },
  { id: 'HL_2027_7', tanggal: '2027-03-26', keterangan: 'Wafat Isa Almasih (Jumat Agung)', jenis: 'nasional' },
  { id: 'HL_2027_8', tanggal: '2027-05-01', keterangan: 'Hari Buruh Internasional', jenis: 'nasional' },
  { id: 'HL_2027_9', tanggal: '2027-05-06', keterangan: 'Kenaikan Isa Almasih', jenis: 'nasional' },
  { id: 'HL_2027_10', tanggal: '2027-05-17', keterangan: 'Hari Raya Idul Adha 1448 Hijriah', jenis: 'nasional' },
  { id: 'HL_2027_11', tanggal: '2027-05-20', keterangan: 'Hari Raya Waisak 2571 BE', jenis: 'nasional' },
  { id: 'HL_2027_12', tanggal: '2027-06-06', keterangan: 'Tahun Baru Islam 1449 Hijriah', jenis: 'nasional' },
  { id: 'HL_2027_13', tanggal: '2027-08-17', keterangan: 'HUT Kemerdekaan Republik Indonesia ke-82', jenis: 'nasional' },
  { id: 'HL_2027_14', tanggal: '2027-08-15', keterangan: 'Maulid Nabi Muhammad SAW', jenis: 'nasional' },
  { id: 'HL_2027_15', tanggal: '2027-12-25', keterangan: 'Hari Raya Natal', jenis: 'nasional' },
];

export const DEFAULT_HARI_LIBUR: HariLibur[] = [...OFFICIAL_NATIONAL_HOLIDAYS_2026_2027];

export const DEFAULT_VIOLATION_TEMPLATES: ViolationTemplate[] = [
  { id: 'TMP_1', name: 'Terlambat datang ke sekolah (>15 menit)', kategori: 'ringan', poin: 5, tindakan: 'Peringatan lisan & piket' },
  { id: 'TMP_2', name: 'Atribut seragam tidak lengkap / tidak sesuai', kategori: 'ringan', poin: 10, tindakan: 'Pembinaan & melengkapi atribut' },
  { id: 'TMP_3', name: 'Tidak mengikuti kegiatan upacara bendera', kategori: 'sedang', poin: 15, tindakan: 'Peringatan tertulis & tugas merangkum' },
  { id: 'TMP_4', name: 'Keluar kelas tanpa izin saat jam pelajaran / KBM', kategori: 'sedang', poin: 15, tindakan: 'Teguran keras & lapor wali kelas' },
  { id: 'TMP_5', name: 'Membolos / Tidak masuk tanpa keterangan (Alpha)', kategori: 'berat', poin: 25, tindakan: 'Panggilan orang tua ke sekolah' },
  { id: 'TMP_6', name: 'Membawa / merokok di lingkungan sekolah', kategori: 'berat', poin: 35, tindakan: 'Penyitaan barang & skorsing 3 hari' },
  { id: 'TMP_7', name: 'Merusak fasilitas sekolah (Vandalisme / Perusakan)', kategori: 'berat', poin: 50, tindakan: 'Penggantian fasilitas & surat pernyataan bermaterai' },
  { id: 'TMP_8', name: 'Berkelahi / Tawuran / Melakukan perundungan (Bullying)', kategori: 'kriminal', poin: 100, tindakan: 'Skorsing berat / dikembalikan kepada orang tua' },
  { id: 'TMP_9', name: 'Membawa / menggunakan senjata tajam atau obat terlarang', kategori: 'kriminal', poin: 100, tindakan: 'Tindakan tegas kepolisian & dikembalikan ke orang tua' },
];

export const INITIAL_PELANGGARAN: Pelanggaran[] = [];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

export const INITIAL_HOME_VISITS: HomeVisit[] = [];

export function getTodayString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch (e) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

const FIRST_NAMES_L = [
  "Ahmad", "Andi", "Bagus", "Bayu", "Bima", "Daffa", "Deni", "Dewa", "Dimas", "Eka",
  "Fadhil", "Farhan", "Fatih", "Gilang", "Hafiz", "Ibrahim", "Irfan", "Joko", "Kevin", "Lukman",
  "Muhammad", "Naufal", "Pradana", "Rafi", "Rangga", "Reza", "Rian", "Rizky", "Satria", "Taufik",
  "Wahyu", "Yuda", "Zackya", "Zaidan", "Aldo", "Alif", "Bintang", "Cahyo", "Fahri", "Gading"
];

const FIRST_NAMES_P = [
  "Adinda", "Alya", "Anisa", "Ayu", "Citra", "Dewi", "Dina", "Fitri", "Gita", "Hana",
  "Indah", "Intan", "Kania", "Kartika", "Laras", "Maya", "Nabila", "Nadia", "Nayla", "Nurul",
  "Olivia", "Putri", "Qonita", "Rahma", "Rania", "Salma", "Siti", "Syafira", "Tania", "Tia",
  "Utami", "Vania", "Winda", "Zahra", "Aurelia", "Bening", "Cantika", "Dhea", "Elvira", "Febby"
];

const LAST_NAMES = [
  "Pratama", "Setiawan", "Nugraha", "Kurniawan", "Lestari", "Permata", "Sari", "Anggraini",
  "Hermawan", "Saputra", "Wibowo", "Ramadhan", "Wijaya", "Kusuma", "Hidayat", "Santoso",
  "Syahputra", "Utama", "Firmansyah", "Mahendra", "Pradipta", "Aditama", "Ardiansyah", "Budiman",
  "Cahyono", "Darmawan", "Gunawan", "Handoko", "Irawan", "Jatnika", "Kristianto", "Mulia",
  "Nugroho", "Oktaviani", "Purnama", "Rahman", "Suhendra", "Trianto", "Wahyudi", "Yulianto"
];

export function generateRandomWaNumber(): string {
  return '';
}

export function randomizeWaForStudents(siswaList: Siswa[]): Siswa[] {
  return siswaList;
}

export function sortKelasList(kelasList: Kelas[]): Kelas[] {
  return [...(kelasList || [])].sort((a, b) => {
    return (a.nama || '').localeCompare(b.nama || '', 'id', { numeric: true, sensitivity: 'base' });
  });
}


export function generate36StudentsForAllClasses(kelasList: Kelas[]): Siswa[] {
  const result: Siswa[] = [];

  kelasList.forEach((k, cIdx) => {
    for (let i = 1; i <= 36; i++) {
      const isMale = i % 2 === 1;
      const gender: 'L' | 'P' = isMale ? 'L' : 'P';
      
      const firstNameList = isMale ? FIRST_NAMES_L : FIRST_NAMES_P;
      const fName = firstNameList[(i + cIdx * 7) % firstNameList.length];
      const lName = LAST_NAMES[(i * 3 + cIdx * 5) % LAST_NAMES.length];
      
      const nisnPrefix = "006";
      const nisnNum = 1000000 + (cIdx + 1) * 1000 + i;
      const nisn = `${nisnPrefix}${nisnNum}`;

      result.push({
        id: `SIS_${k.id}_${i}`,
        nisn,
        nama: `${fName} ${lName}`,
        gender,
        kelasId: k.id,
        status: 'aktif',
        noWa: '',
        namaOrangTua: '',
        noWaOrangTua: '',
      });
    }
  });

  return result;
}

export function generateRandomPresensiRange(
  kelasList: Kelas[],
  siswaList: Siswa[],
  startDateStr: string,
  endDateStr: string,
  existingPresensi: PresensiMap = {}
): PresensiMap {
  const updatedPresensi: PresensiMap = { ...existingPresensi };

  if (!kelasList || kelasList.length === 0 || !siswaList || siswaList.length === 0) {
    return updatedPresensi;
  }

  // Generate list of valid school dates (Mon - Fri)
  const schoolDates: string[] = [];
  const curr = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  while (curr <= end) {
    const year = curr.getFullYear();
    const month = String(curr.getMonth() + 1).padStart(2, '0');
    const day = String(curr.getDate()).padStart(2, '0');
    const dStr = `${year}-${month}-${day}`;

    const dayOfWeek = curr.getDay(); // 0 = Sun, 6 = Sat
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      schoolDates.push(dStr);
    }

    curr.setDate(curr.getDate() + 1);
  }

  if (schoolDates.length === 0) return updatedPresensi;

  // Pick 4 random distinct students across all students
  const shuffledStudents = [...siswaList].sort(() => Math.random() - 0.5);
  const specialStudents = shuffledStudents.slice(0, 4);

  // Target absence counts requested by user:
  // Siswa 1: Alfa = 10
  // Siswa 2: Sakit = 8
  // Siswa 3: Izin = 5, Sakit = 3
  // Siswa 4: Izin = 10, Sakit = 10
  const targets: Record<string, { A: number; S: number; I: number }> = {};
  if (specialStudents[0]) targets[specialStudents[0].id] = { A: 10, S: 0, I: 0 };
  if (specialStudents[1]) targets[specialStudents[1].id] = { A: 0, S: 8, I: 0 };
  if (specialStudents[2]) targets[specialStudents[2].id] = { A: 0, S: 3, I: 5 };
  if (specialStudents[3]) targets[specialStudents[3].id] = { A: 0, S: 10, I: 10 };

  // Assign specific status to specific dates for special students
  const studentDateStatusMap: Record<string, Record<string, 'H' | 'I' | 'S' | 'A'>> = {};

  specialStudents.forEach((st) => {
    studentDateStatusMap[st.id] = {};
    const t = targets[st.id];
    if (!t) return;

    // Shuffle school dates for this student
    const datesShuffled = [...schoolDates].sort(() => Math.random() - 0.5);
    let idx = 0;

    // Assign 'A' (Alfa)
    const aCount = Math.min(t.A, datesShuffled.length);
    for (let i = 0; i < aCount && idx < datesShuffled.length; i++, idx++) {
      studentDateStatusMap[st.id][datesShuffled[idx]] = 'A';
    }

    // Assign 'S' (Sakit)
    const sCount = Math.min(t.S, datesShuffled.length - idx);
    for (let i = 0; i < sCount && idx < datesShuffled.length; i++, idx++) {
      studentDateStatusMap[st.id][datesShuffled[idx]] = 'S';
    }

    // Assign 'I' (Izin)
    const iCount = Math.min(t.I, datesShuffled.length - idx);
    for (let i = 0; i < iCount && idx < datesShuffled.length; i++, idx++) {
      studentDateStatusMap[st.id][datesShuffled[idx]] = 'I';
    }
  });

  // Populate presensi for all dates and all classes
  schoolDates.forEach((dStr) => {
    kelasList.forEach((k) => {
      const classStudents = siswaList.filter((s) => s.kelasId === k.id);
      if (classStudents.length > 0) {
        updatedPresensi[`${dStr}_${k.id}`] = classStudents.map((s) => {
          // Check if this student is special on this date
          if (studentDateStatusMap[s.id] && studentDateStatusMap[s.id][dStr]) {
            return { siswaId: s.id, status: studentDateStatusMap[s.id][dStr] };
          }

          // Random distribution for regular students
          const rand = Math.random();
          let status: 'H' | 'I' | 'S' | 'A' = 'H';
          if (rand > 0.98) status = 'A';      // ~2% Alpa
          else if (rand > 0.95) status = 'S'; // ~3% Sakit
          else if (rand > 0.91) status = 'I'; // ~4% Izin
          // ~91% Hadir

          return { siswaId: s.id, status };
        });
      }
    });
  });

  return updatedPresensi;
}

export function randomizeWaliKelasForClasses(kelasList: Kelas[], waliKelasList: WaliKelas[]): Kelas[] {
  if (!kelasList || kelasList.length === 0 || !waliKelasList || waliKelasList.length === 0) {
    return kelasList;
  }

  // Shuffle list of wali kelas IDs to distribute them randomly across classes
  const shuffledWaliIds = waliKelasList.map((w) => w.id).sort(() => Math.random() - 0.5);

  return kelasList.map((k, idx) => {
    const waliId = shuffledWaliIds[idx % shuffledWaliIds.length] || waliKelasList[Math.floor(Math.random() * waliKelasList.length)].id;
    return {
      ...k,
      waliKelasId: waliId,
    };
  });
}

export function generateRandomPresensiForToday(
  kelasList: Kelas[],
  siswaList: Siswa[],
  existingPresensi: PresensiMap
): PresensiMap {
  const todayStr = getTodayString();
  const updatedPresensi = { ...existingPresensi };

  kelasList.forEach((k) => {
    const classStudents = siswaList.filter((s) => s.kelasId === k.id);
    if (classStudents.length > 0) {
      updatedPresensi[`${todayStr}_${k.id}`] = classStudents.map((s) => {
        const rand = Math.random();
        let status: 'H' | 'I' | 'S' | 'A' = 'H';
        if (rand > 0.94) status = 'A';      // 6% Alpa
        else if (rand > 0.88) status = 'S'; // 6% Sakit
        else if (rand > 0.80) status = 'I'; // 8% Izin
        // 80% Hadir
        return { siswaId: s.id, status };
      });
    }
  });

  return updatedPresensi;
}

export const DEFAULT_KELAS: Kelas[] = [];
export const DEFAULT_SISWA: Siswa[] = [];
export const DEFAULT_MATA_PELAJARAN: MataPelajaran[] = [];
export const DEFAULT_WALI_KELAS: WaliKelas[] = [];
export const DEFAULT_PETUGAS_PIKET: PetugasPiket[] = [];
export const DEFAULT_JADWAL_MENGAJAR: JadwalMengajarGuru[] = [];
export const DEFAULT_PRESENSI_MENGAJAR_GURU: AbsensiMengajarGuruItem[] = [];
export const DEFAULT_GURU_MAPEL_KELAS: GuruMapelKelasItem[] = [];
export const DEFAULT_TOGA_LOGO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232563EB' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M22 10v6M2 10l10-5 10 5-10 5z'/><path d='M6 12v5c3 3 9 3 12 0v-5'/></svg>";
export const DEFAULT_AUDIT_LOGS: AuditLog[] = [];

export const DEMO_DATASET: AppData = {
  sekolah: {
    nama: "SMKN 6 Garut",
    alamat: "Jl. Raya Limbangan Km. 01 Bl. Limbangan, Garut, Jawa Barat",
    website: "https://smkn6garut.sch.id",
    email: "info@smkn6garut.sch.id",
    telepon: "(0262) 438123",
    tahunAjaran: "2026/2027",
    tanggalMulai: "2026-07-15",
    tanggalAkhir: "2027-06-30",
    jamMasukMulai: "06:30",
    jamMasukSelesai: "06:45",
    jamPulang: "15:00",
    isJamMasukActive: true,
    logo: DEFAULT_TOGA_LOGO,
    namaKepalaSekolah: "Drs. H. Mulyadi, M.Pd.",
    nipKepalaSekolah: "197205101998031004",
    headerTitle: "Sistem Informasi Presensi Digital",
    headerSubtitle: "SMKN 6 Garut",
    footerTeks: "© 2026 SMKN 6 Garut. Sistem Presensi & Manajemen Sekolah.",
    footerSubTeks: "Dikembangkan untuk efisiensi dan transparansi rekap kehadiran.",
    appVersion: "v2.5.0",
    showAppVersion: true,
    showFooter: true,
    enableLiveChat: true,
    enableRunningText: true,
    runningTextAnnouncement: "Selamat datang di Sistem Presensi Digital SMKN 6 Garut Tahun Ajaran 2026/2027.",
    runningTextSpeed: "normal",
    loginAnnouncementModal: false,
    maintenanceMode: false,
    maintenanceMessage: "Sistem saat ini sedang dalam pemeliharaan berkala (Maintenance Mode). Akses dibatasi hanya untuk Administrator.",
    loginCustomLinksDisplayMode: "dropdown",
    loginCustomLinksTitle: "Tautan Cepat & Bantuan",
    loginCustomLinks: [],
    theme: "indigo",
    sidebarBehavior: "collapsed",
  },
  admin: {
    username: "admin",
    password: "123",
    nama: "Administrator Utama",
    foto: ""
  },
  kesiswaan: {
    username: "kesiswaan",
    password: "123",
    nama: "Tim WKS Kesiswaan & BP BK",
    jabatan: "WKS Kesiswaan / BP BK",
    foto: ""
  },
  kurikulum: {
    username: "kurikulum",
    password: "123",
    nama: "Tim WKS Kurikulum & Akademik",
    jabatan: "WKS Kurikulum & Pembelajaran",
    foto: ""
  },
  stafJadwal: {
    username: "jadwal",
    password: "123",
    nama: "Fajar Pratama, S.Kom (Staf Jadwal)",
    jabatan: "Pengelola & Operator Plotting Jadwal (Non-Guru)",
    noHp: "6282112345678",
    foto: ""
  },
  userBiasa: {
    username: "guru",
    password: "123",
    nama: "Guru / Staf Pengajar",
    jabatan: "Guru Pengampu",
    mataPelajaran: "",
    hariMengajar: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    batasiLoginHariMengajar: false,
    foto: ""
  },
  jurusan: [],
  ekstrakurikuler: [],
  anggotaEkskul: [],
  presensiEkskul: {},
  waliKelas: [],
  kelas: [],
  siswa: [],
  presensi: {},
  homeVisits: [],
  pelanggaran: [],
  violationTemplates: DEFAULT_VIOLATION_TEMPLATES,
  chatMessages: [],
  enableLiveChat: true,
  hariLibur: DEFAULT_HARI_LIBUR,
  jadwalMengajar: [],
  mataPelajaran: [],
  guruMapelKelas: [],
  presensiMengajarGuru: [],
  pengumuman: [],
  petugasPiket: [],
  catatanPiketHarian: [],
  shiftConfig: {
    pagiTime: "06.30 - 12.00",
    siangTime: "13.00 - 16.50",
    isJamMasukPagiActive: true,
    pagiJamMasukMulai: "06:30",
    pagiJamMasukSelesai: "06:45",
    pagiJamPulang: "12:00",
    isJamMasukSiangActive: true,
    siangJamMasukMulai: "12:45",
    siangJamMasukSelesai: "13:00",
    siangJamPulang: "16:50",
    periods: []
  },
  auditLogs: []
};
