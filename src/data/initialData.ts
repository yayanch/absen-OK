import { AppData, Siswa, Kelas, WaliKelas, HomeVisit, ChatMessage, Pelanggaran, PresensiStatus, PresensiMap, ViolationTemplate, HariLibur, JadwalMengajarGuru, AbsensiMengajarGuruItem, PengumumanSekolah, MataPelajaran, GuruMapelKelasItem, PetugasPiket, CatatanPiketHarian, AuditLog } from '../types';

export const INITIAL_PENGUMUMAN: PengumumanSekolah[] = [
  {
    id: 'PGM_0',
    judul: 'Kegiatan Ujian Akhir Semester',
    isi: 'Ujian akan dilaksanakan mulai tanggal 2 - 10 Juni 2025.\nHarap semua siswa mempersiapkan diri.',
    tanggal: '2026-06-02',
    kategori: 'kegiatan',
    target: 'siswa',
    aktif: true,
    pinToRunningText: true,
    pinToLoginBanner: true,
    pinToDashboard: true,
    penulis: 'Panitia Ujian Sekolah',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'PGM_1',
    judul: 'Pelaksanaan Penilaian Tengah Semester (PTS) Ganjil',
    isi: 'Diberitahukan kepada seluruh Guru dan Siswa bahwa PTS Semester Ganjil akan dimulai sesuai kalender akademik. Mohon kehadiran dan kedisiplinan presensi dipantau secara berkala.',
    tanggal: '2026-08-25',
    kategori: 'penting',
    target: 'semua',
    aktif: true,
    pinToRunningText: true,
    pinToLoginBanner: true,
    pinToDashboard: true,
    penulis: 'WKS Kurikulum & Kesiswaan',
    createdAt: '2026-08-25',
  },
  {
    id: 'PGM_2',
    judul: 'Batas Akhir Validasi Rekap Presensi Bulanan Guru',
    isi: 'Seluruh Bapak/Ibu Guru dan Wali Kelas dimohon untuk menyelesaikan sinkronisasi data presensi dan rekap ketidakhadiran sebelum tanggal 30 bulan berjalan.',
    tanggal: '2026-08-20',
    kategori: 'info',
    target: 'guru',
    aktif: true,
    pinToRunningText: false,
    pinToLoginBanner: false,
    pinToDashboard: true,
    penulis: 'Kepala Tata Usaha',
    createdAt: '2026-08-20',
  },
  {
    id: 'PGM_3',
    judul: 'Pemantauan Ketertiban Atribut & Kedisiplinan Siswa',
    isi: 'Tim Kesiswaan dan Bimbingan Konseling akan mengadakan pemantauan kedisiplinan atribut serta seragam lengkap di gerbang utama sekolah setiap hari Senin & Rabu.',
    tanggal: '2026-08-15',
    kategori: 'peringatan',
    target: 'siswa',
    aktif: true,
    pinToRunningText: true,
    pinToLoginBanner: false,
    pinToDashboard: true,
    penulis: 'Tim Kesiswaan & BP/BK',
    createdAt: '2026-08-15',
  },
];

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

export const INITIAL_PELANGGARAN: Pelanggaran[] = [
  {
    id: 'PLG_1',
    tanggal: getTodayString(),
    siswaId: 'SISWA_KEL_1_2',
    kelasId: 'KEL_1',
    kategori: 'ringan',
    namaPelanggaran: 'Terlambat datang ke sekolah (lebih dari 15 menit)',
    poin: 5,
    keterangan: 'Datang pukul 07.25 WIB tanpa izin.',
    pelapor: 'Tim Ketertiban / Guru Piket',
    tindakan: 'Peringatan lisan & mencatat di buku piket',
    status: 'selesai',
    createdAt: getTodayString(),
  },
  {
    id: 'PLG_2',
    tanggal: '2026-08-05',
    siswaId: 'SISWA_KEL_2_3',
    kelasId: 'KEL_2',
    kategori: 'sedang',
    namaPelanggaran: 'Atribut seragam tidak lengkap (tidak memakai dasi & kaos kaki putih polos)',
    poin: 15,
    keterangan: 'Razia kedisiplinan rutin mingguan.',
    pelapor: 'Koordinator Kesiswaan',
    tindakan: 'Pembinaan dan diminta melengkapi atribut keesokan hari',
    status: 'perlu_tindak_lanjut',
    createdAt: '2026-08-04',
  },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

export const INITIAL_HOME_VISITS: HomeVisit[] = [
  {
    id: 'HV_1',
    tanggal: getTodayString(),
    siswaId: 'SISWA_KEL_1_1',
    kelasId: 'KEL_1',
    petugas: 'Budi Santoso, S.Kom (Wali Kelas) & Tim BP BK',
    alasan: 'Sering Tidak Hadir (Alpha 3 Hari Berturut-turut)',
    catatan: 'Siswa tidak masuk sekolah tanpa keterangan. Pesan WhatsApp Wali Kelas ke orang tua tidak dibalas.',
    hasil: 'Bertemu dengan orang tua siswa di rumah. Orang tua kaget karena siswa pamit berangkat dari rumah. Terjadi koordinasi pembinaan bersama.',
    tindakLanjut: 'Siswa membuat surat pernyataan bermaterai dan dipantau presensinya secara harian oleh Wali Kelas.',
    status: 'proses',
    createdAt: getTodayString(),
  },
  {
    id: 'HV_2',
    tanggal: '2026-08-04',
    siswaId: 'SISWA_KEL_2_1',
    kelasId: 'KEL_2',
    petugas: 'Siti Rahma, M.Pd (Wali Kelas) & BP BK',
    alasan: 'Sakit Berkelanjutan (Pemulihan Medis)',
    catatan: 'Kunjungan kasih menjenguk siswa yang sakit dan mengonfirmasi surat dokter.',
    hasil: 'Kondisi siswa sudah mulai membaik. Wali murid menyampaikan terima kasih atas kunjungan dukungan sekolah.',
    tindakLanjut: 'Memberikan materi dan tugas BDR (Belajar dari Rumah) secara bertahap.',
    status: 'selesai',
    createdAt: '2026-08-04',
  }
];

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

const todayStr = getTodayString();

const DEFAULT_KELAS: Kelas[] = [
  { id: "KEL_1", nama: "XII RPL 1", jurusanId: "JUR_1", waliKelasId: "WAL_1" },
  { id: "KEL_2", nama: "XII TKJ 1", jurusanId: "JUR_2", waliKelasId: "WAL_2" },
  { id: "KEL_3", nama: "XI DKV 1", jurusanId: "JUR_3", waliKelasId: "WAL_3" },
  { id: "KEL_4", nama: "X TSM 1", jurusanId: "JUR_4", waliKelasId: "WAL_4" }
];

const DEFAULT_SISWA = generate36StudentsForAllClasses(DEFAULT_KELAS);

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

// Generate sample presensi from start date to yesterday including 4 special high-absence students
const initialPresensi = generateRandomPresensiRange(
  DEFAULT_KELAS,
  DEFAULT_SISWA,
  "2026-07-15",
  yesterdayStr
);

export const DEFAULT_MATA_PELAJARAN: MataPelajaran[] = [
  {
    id: "MP_5",
    kode: "TKJ-AIJ",
    nama: "Administrasi Infrastruktur Jaringan",
    kategori: "Kelompok C (Kejuruan/Peminatan)",
    tingkat: "XII",
    jurusanNama: "Teknik Komputer dan Jaringan (TKJ)",
    alokasiJp: 6,
    kkm: 76,
    deskripsi: "Konfigurasi VLAN, Routing Static/Dynamic, Firewall, dan NAT."
  },
  {
    id: "MP_4",
    kode: "TKJ-ASJ",
    nama: "Administrasi Sistem Jaringan",
    kategori: "Kelompok C (Kejuruan/Peminatan)",
    tingkat: "XI",
    jurusanNama: "Teknik Komputer dan Jaringan (TKJ)",
    alokasiJp: 4,
    kkm: 75,
    deskripsi: "Instalasi Server Linux, DHCP, DNS, Web Server, dan FTP Server."
  },
  {
    id: "MP_7",
    kode: "UM-BINDO",
    nama: "Bahasa Indonesia",
    kategori: "Kelompok A (Nasional)",
    tingkat: "Semua Tingkat",
    alokasiJp: 4,
    kkm: 75,
    deskripsi: "Teks Laporan, Prosedur, Negosiasi, Debat, dan Karya Ilmiah."
  },
  {
    id: "MP_8",
    kode: "UM-BING",
    nama: "Bahasa Inggris",
    kategori: "Kelompok A (Nasional)",
    tingkat: "Semua Tingkat",
    alokasiJp: 3,
    kkm: 75,
    deskripsi: "Grammar, Listening, Speaking, dan Business Communication."
  },
  {
    id: "MP_2",
    kode: "RPL-BD",
    nama: "Basis Data",
    kategori: "Kelompok C (Kejuruan/Peminatan)",
    tingkat: "XI",
    jurusanNama: "Rekayasa Perangkat Lunak (RPL)",
    alokasiJp: 4,
    kkm: 75,
    deskripsi: "Materi DDL, DML, Relasi Entitas, Normalisasi, dan Query SQL."
  },
  {
    id: "MP_6",
    kode: "UM-MAT",
    nama: "Matematika Wajib",
    kategori: "Kelompok A (Nasional)",
    tingkat: "Semua Tingkat",
    alokasiJp: 4,
    kkm: 75,
    deskripsi: "Aljabar, Trigonometri, Matriks, Barisan & Deret, Kalkulus."
  },
  {
    id: "MP_9",
    kode: "UM-PAI",
    nama: "Pendidikan Agama & Budi Pekerti",
    kategori: "Kelompok A (Nasional)",
    tingkat: "Semua Tingkat",
    alokasiJp: 3,
    kkm: 80,
    deskripsi: "Akidah, Akhlak, Fiqih, Sejarah Kebudayaan Islam, dan Toleransi."
  },
  {
    id: "MP_11",
    kode: "UM-PJOK",
    nama: "Pendidikan Jasmani & Olahraga (PJOK)",
    kategori: "Kelompok B (Kewilayahan)",
    tingkat: "Semua Tingkat",
    alokasiJp: 3,
    kkm: 75,
    deskripsi: "Permainan Bola Besar, Atletik, Kebugaran Jasmani, dan Kesehatan."
  },
  {
    id: "MP_10",
    kode: "UM-PPKN",
    nama: "Pendidikan Pancasila (PPKn)",
    kategori: "Kelompok A (Nasional)",
    tingkat: "Semua Tingkat",
    alokasiJp: 2,
    kkm: 78,
    deskripsi: "Nilai Pancasila, UUD 1945, Bhinneka Tunggal Ika, dan NKRI."
  },
  {
    id: "MP_3",
    kode: "RPL-PBO",
    nama: "Pemrograman Berorientasi Objek (PBO)",
    kategori: "Kelompok C (Kejuruan/Peminatan)",
    tingkat: "XI",
    jurusanNama: "Rekayasa Perangkat Lunak (RPL)",
    alokasiJp: 4,
    kkm: 75,
    deskripsi: "Konsep OOP: Encapsulation, Inheritance, Polymorphism, Abstraction."
  },
  {
    id: "MP_1",
    kode: "RPL-PWPB",
    nama: "Pemrograman Web & Perangkat Bergerak",
    kategori: "Kelompok C (Kejuruan/Peminatan)",
    tingkat: "XI",
    jurusanNama: "Rekayasa Perangkat Lunak (RPL)",
    alokasiJp: 6,
    kkm: 78,
    deskripsi: "Materi HTML5, CSS3, JavaScript, React, REST API, dan Mobile Apps."
  },
  {
    id: "MP_12",
    kode: "UM-PKK",
    nama: "Produk Kreatif & Kewirausahaan (PKK)",
    kategori: "Kelompok C (Kejuruan/Peminatan)",
    tingkat: "XII",
    alokasiJp: 5,
    kkm: 78,
    deskripsi: "Pembuatan Prototype Produk Kreatif, Business Plan, dan Pemasaran Digital."
  }
];

export const DEFAULT_WALI_KELAS: WaliKelas[] = [
  {
    id: "WAL_1",
    nip: "198501012010011001",
    nama: "Budi Santoso, S.Kom",
    username: "1037",
    password: "123",
    noHp: "6281234567890",
    role: "wali",
    mataPelajaran: "Pemrograman Web & Perangkat Bergerak",
    hariMengajar: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    batasiLoginHariMengajar: false
  },
  {
    id: "WAL_2",
    nip: "198802022012022002",
    nama: "Siti Rahma, M.Pd",
    username: "siti",
    password: "123",
    noHp: "6281987654321",
    role: "wali",
    mataPelajaran: "Administrasi Sistem Jaringan",
    hariMengajar: ["Senin", "Rabu", "Jumat"],
    batasiLoginHariMengajar: false
  },
  {
    id: "WAL_3",
    nip: "199003032014031003",
    nama: "Agus Hermawan, S.T",
    username: "agus",
    password: "123",
    noHp: "6285712345678",
    role: "wali",
    mataPelajaran: "Desain Grafis & Multimedia",
    hariMengajar: ["Selasa", "Kamis", "Sabtu"],
    batasiLoginHariMengajar: false
  },
  {
    id: "WAL_4",
    nip: "199204042016042004",
    nama: "Dewi Lestari, S.Pd",
    username: "dewi",
    password: "123",
    noHp: "6287812345678",
    role: "wali",
    mataPelajaran: "Matematika Terapan & Statistika",
    hariMengajar: ["Senin", "Selasa", "Kamis"],
    batasiLoginHariMengajar: false
  },
  {
    id: "WAL_GURU_1",
    nip: "198705122015021005",
    nama: "Hendra Gunawan, S.Pd",
    username: "guru_matematika",
    password: "123",
    noHp: "6281233445566",
    role: "guru",
    mataPelajaran: "Matematika Wajib",
    hariMengajar: ["Senin", "Rabu", "Jumat"],
    batasiLoginHariMengajar: false
  },
  {
    id: "WAL_GURU_2",
    nip: "199108232018012003",
    nama: "Ratna Sari, S.Kom",
    username: "guru_rpl",
    password: "123",
    noHp: "6281998877665",
    role: "guru",
    mataPelajaran: "Basis Data & Pemrograman Web",
    hariMengajar: ["Selasa", "Kamis"],
    batasiLoginHariMengajar: false
  }
];

export const DEFAULT_PETUGAS_PIKET: PetugasPiket[] = [
  {
    id: "PIKET_1",
    nama: "Diana Lestari, S.Pd",
    tipe: "piket_guru",
    nip: "199202022016012004",
    noHp: "6285987654321",
    hariPiket: ["Senin", "Rabu", "Jumat"],
    shiftPiket: "Pagi",
    username: "piket_guru",
    password: "123",
    status: "aktif",
    keterangan: "Petugas Guru Piket Harian Shift Pagi"
  },
  {
    id: "PIKET_2",
    nama: "Fahrul Rozi, S.Pd",
    tipe: "piket_kesiswaan",
    nip: "199001012015011002",
    noHp: "6285123456789",
    hariPiket: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    shiftPiket: "Semua",
    username: "piket_kesiswaan",
    password: "123",
    status: "aktif",
    keterangan: "Petugas Piket Tim Kesiswaan & Kedisiplinan Gerbang"
  },
  {
    id: "PIKET_3",
    nama: "Hendra Wijaya, S.Pd",
    tipe: "piket_guru",
    nip: "198904122014021003",
    noHp: "6281345678901",
    hariPiket: ["Selasa", "Kamis"],
    shiftPiket: "Siang",
    username: "piket_siang",
    password: "123",
    status: "aktif",
    keterangan: "Petugas Guru Piket Harian Shift Siang"
  }
];

export const DEFAULT_JADWAL_MENGAJAR: JadwalMengajarGuru[] = [];

export const DEFAULT_PRESENSI_MENGAJAR_GURU: AbsensiMengajarGuruItem[] = [];

export const DEFAULT_GURU_MAPEL_KELAS: GuruMapelKelasItem[] = [
  {
    id: "GMK_1",
    guruId: "WAL_1",
    guruUsername: "1037",
    guruNama: "Budi Santoso, S.Kom",
    guruNip: "198501012010011001",
    kodeMapel: "RPL-PWPB",
    namaMapel: "Pemrograman Web & Perangkat Bergerak",
    kategori: "Kelompok C (Kejuruan/Peminatan)",
    tingkat: "XI",
    alokasiJp: 6,
    kkm: 78,
    deskripsi: "Materi HTML5, CSS3, JavaScript, React, REST API, dan Mobile Apps.",
    kelasIds: ["KEL_1", "KEL_3"],
    catatan: "Fokus kejuruan RPL & DKV",
    createdAt: "2026-07-15"
  },
  {
    id: "GMK_2",
    guruId: "WAL_1",
    guruUsername: "1037",
    guruNama: "Budi Santoso, S.Kom",
    guruNip: "198501012010011001",
    kodeMapel: "RPL-PBO",
    namaMapel: "Pemrograman Berorientasi Objek (PBO)",
    kategori: "Kelompok C (Kejuruan/Peminatan)",
    tingkat: "XI",
    alokasiJp: 4,
    kkm: 75,
    deskripsi: "Konsep OOP: Encapsulation, Inheritance, Polymorphism, Abstraction.",
    kelasIds: ["KEL_1"],
    catatan: "Praktikum Lab Komputer RPL",
    createdAt: "2026-07-15"
  },
  {
    id: "GMK_3",
    guruId: "WAL_GURU_1",
    guruUsername: "guru_matematika",
    guruNama: "Hendra Gunawan, S.Pd",
    guruNip: "198705122015021005",
    kodeMapel: "MAT-WJB",
    namaMapel: "Matematika Wajib",
    kategori: "Kelompok A (Nasional)",
    tingkat: "Semua Tingkat",
    alokasiJp: 4,
    kkm: 75,
    deskripsi: "Aljabar, Trigonometri, Geometri, dan Kalkulus Dasar.",
    kelasIds: ["KEL_1", "KEL_2", "KEL_4"],
    catatan: "Pembelajaran teori dan latihan soal rutin",
    createdAt: "2026-07-15"
  },
  {
    id: "GMK_4",
    guruId: "WAL_GURU_1",
    guruUsername: "guru_matematika",
    guruNama: "Hendra Gunawan, S.Pd",
    guruNip: "198705122015021005",
    kodeMapel: "MAT-MINAT",
    namaMapel: "Matematika Terapan & Statistika",
    kategori: "Kelompok C (Kejuruan/Peminatan)",
    tingkat: "XII",
    alokasiJp: 3,
    kkm: 78,
    deskripsi: "Statistika terapan, probabilitas, dan data analitik kejuruan.",
    kelasIds: ["KEL_1", "KEL_2"],
    catatan: "Kelas XII persiapan ujian kompetensi",
    createdAt: "2026-07-15"
  },
  {
    id: "GMK_5",
    guruId: "WAL_GURU_2",
    guruUsername: "guru_rpl",
    guruNama: "Ratna Sari, S.Kom",
    guruNip: "199108232018012003",
    kodeMapel: "RPL-BD",
    namaMapel: "Basis Data & Cloud Database",
    kategori: "Kelompok C (Kejuruan/Peminatan)",
    tingkat: "XI",
    alokasiJp: 4,
    kkm: 76,
    deskripsi: "SQL, Normalisasi Data, DDL, DML, Relational DB, NoSQL.",
    kelasIds: ["KEL_1", "KEL_2"],
    catatan: "Praktikum MySQL Server dan PostgreSQL",
    createdAt: "2026-07-15"
  },
  {
    id: "GMK_6",
    guruId: "WAL_2",
    guruUsername: "siti",
    guruNama: "Siti Rahma, M.Pd",
    guruNip: "198802022012022002",
    kodeMapel: "TKJ-ASJ",
    namaMapel: "Administrasi Sistem Jaringan",
    kategori: "Kelompok C (Kejuruan/Peminatan)",
    tingkat: "XII",
    alokasiJp: 5,
    kkm: 78,
    deskripsi: "Instalasi Linux Server, DNS, Web Server, DHCP, Firewall.",
    kelasIds: ["KEL_2"],
    catatan: "Server Debian 12 & Mikrotik",
    createdAt: "2026-07-15"
  },
  {
    id: "GMK_7",
    guruId: "WAL_3",
    guruUsername: "agus",
    guruNama: "Agus Hermawan, S.T",
    guruNip: "199003032014031003",
    kodeMapel: "DKV-DG",
    namaMapel: "Desain Grafis & Multimedia",
    kategori: "Kelompok C (Kejuruan/Peminatan)",
    tingkat: "XI",
    alokasiJp: 5,
    kkm: 77,
    deskripsi: "Vektor grafis, UI/UX, tipografi, dan komposisi layout.",
    kelasIds: ["KEL_3"],
    catatan: "Adobe Illustrator & Figma",
    createdAt: "2026-07-15"
  },
  {
    id: "GMK_8",
    guruId: "user_guru",
    guruUsername: "guru",
    guruNama: "Guru / Staf Pengajar",
    kodeMapel: "UM-PPKN",
    namaMapel: "Pendidikan Pancasila & Kewarganegaraan",
    kategori: "Kelompok A (Nasional)",
    tingkat: "Semua Tingkat",
    alokasiJp: 2,
    kkm: 78,
    deskripsi: "Nilai-nilai luhur Pancasila, konstitusi dan wawasan kebangsaan.",
    kelasIds: ["KEL_1", "KEL_2", "KEL_3", "KEL_4"],
    catatan: "KBM umum lintas jurusan",
    createdAt: "2026-07-15"
  }
];

export const DEFAULT_TOGA_LOGO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232563EB' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M22 10v6M2 10l10-5 10 5-10 5z'/><path d='M6 12v5c3 3 9 3 12 0v-5'/></svg>";

export const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: "LOG_01",
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 menit lalu
    role: "admin",
    username: "admin",
    nama: "Administrator Utama",
    aksi: "SINKRONISASI_DATABASE_SERVER",
    detail: "Verifikasi skema tabel relasional MySQL server & penyesuaian index tabel presensi, siswa, dan sekolah_config.",
    ipAddress: "192.168.1.10"
  },
  {
    id: "LOG_02",
    timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(), // 1 jam 15 menit lalu
    role: "kesiswaan",
    username: "kesiswaan",
    nama: "Tim WKS Kesiswaan & BP BK",
    aksi: "VERIFIKASI_PRESENSI_HARIAN",
    detail: "Penguncian data presensi harian siswa shift pagi: 142 Hadir, 3 Sakit, 2 Izin, 0 Alpa dengan status valid.",
    ipAddress: "192.168.1.24"
  },
  {
    id: "LOG_03",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3.5).toISOString(), // 3.5 jam lalu
    role: "kurikulum",
    username: "kurikulum",
    nama: "Tim WKS Kurikulum & Akademik",
    aksi: "UPDATE_JADWAL_MENGAJAR",
    detail: "Penyesuaian jadwal mengajar guru mapel Pemrograman Web & Perangkat Bergerak di ruang Lab Komputer RPL 1.",
    ipAddress: "192.168.1.33"
  },
  {
    id: "LOG_04",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), // Kemarin
    role: "admin",
    username: "admin",
    nama: "Administrator Utama",
    aksi: "UPDATE_PENGATURAN_SEKOLAH",
    detail: "Pembaruan profil sekolah, logo instansi, dan konfigurasi tahun ajaran baru 2026/2027.",
    ipAddress: "192.168.1.10"
  },
  {
    id: "LOG_05",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // Kemarin
    role: "kesiswaan",
    username: "kesiswaan",
    nama: "Tim WKS Kesiswaan & BP BK",
    aksi: "PENCATATAN_PELANGGARAN",
    detail: "Pencatatan sanksi disiplin siswa terlambat masuk gerbang utama sekolah (+5 poin).",
    ipAddress: "192.168.1.24"
  },
  {
    id: "LOG_06",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2.5).toISOString(), // 2 hari lalu
    role: "admin",
    username: "admin",
    nama: "Administrator Utama",
    aksi: "IMPORT_DATA_SISWA",
    detail: "Impor massal 36 berkas siswa baru kelas X RPL 1 melalui integrasi dokumen Excel XLSX.",
    ipAddress: "192.168.1.10"
  },
  {
    id: "LOG_07",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3.2).toISOString(), // 3 hari lalu
    role: "admin",
    username: "admin",
    nama: "Administrator Utama",
    aksi: "KONFIGURASI_DATABASE_ENV",
    detail: "Pembaruan koneksi database server menggunakan variabel lingkungan .env (Host: localhost, DB: sistem_presensi_sekolah).",
    ipAddress: "127.0.0.1"
  },
  {
    id: "LOG_08",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4.8).toISOString(), // 4 hari lalu
    role: "admin",
    username: "admin",
    nama: "Administrator Utama",
    aksi: "AUTO_BACKUP_SISTEM",
    detail: "Penyimpanan snapshot cadangan data lokal dan sinkronisasi berkas json cache server.",
    ipAddress: "127.0.0.1"
  }
];

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
    headerSubtitle: "Sistem Absensi Siswa",
    footerTeks: "© 2026 SMKN 6 Garut. Sistem Presensi & Manajemen Sekolah.",
    footerSubTeks: "Dikembangkan untuk efisiensi dan transparansi rekap kehadiran.",
    appVersion: "v2.5.0",
    showAppVersion: true,
    showFooter: true,
    enableLiveChat: true,
    enableRunningText: true,
    runningTextAnnouncement: "Selamat datang di Sistem Presensi Digital SMKN 6 Garut Tahun Ajaran 2026/2027. Budayakan disiplin hadir tepat waktu setiap hari!",
    runningTextSpeed: "normal",
    loginAnnouncementModal: false,
    maintenanceMode: false,
    maintenanceMessage: "Sistem saat ini sedang dalam pemeliharaan berkala (Maintenance Mode). Akses dibatasi hanya untuk Administrator.",
    loginCustomLinksDisplayMode: "dropdown",
    loginCustomLinksTitle: "Tautan Cepat & Bantuan",
    loginCustomLinks: [
      {
        id: 'LNK_1',
        label: 'Website Sekolah Resmi',
        description: 'Kunjungi portal website utama SMK Negeri 6 Garut',
        url: 'https://smkn6garut.sch.id',
        iconName: 'Globe',
        openInNewTab: true,
      },
      {
        id: 'LNK_2',
        label: 'Pusat Bantuan WhatsApp',
        description: 'Layanan konsultasi & kendala teknis presensi',
        url: 'https://wa.me/6281234567890',
        iconName: 'Phone',
        openInNewTab: true,
      },
      {
        id: 'LNK_3',
        label: 'Panduan & Pengumuman',
        description: 'Petunjuk cara absensi siswa & tata tertib',
        url: '#',
        iconName: 'BookOpen',
        openInNewTab: false,
      },
    ],
    theme: "indigo",
    sidebarBehavior: "collapsed",
  },
  admin: {
    username: "admin",
    password: "admin123",
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
    mataPelajaran: "Pendidikan Pancasila & Kewarganegaraan",
    hariMengajar: ["Senin", "Rabu", "Jumat"],
    batasiLoginHariMengajar: false,
    foto: ""
  },
  jurusan: [
    { id: "JUR_1", kode: "RPL", nama: "Rekayasa Perangkat Lunak" },
    { id: "JUR_2", kode: "TKJ", nama: "Teknik Komputer & Jaringan" },
    { id: "JUR_3", kode: "DKV", nama: "Desain Komunikasi Visual" },
    { id: "JUR_4", kode: "TSM", nama: "Teknik Sepeda Motor" }
  ],
  ekstrakurikuler: [
    { id: "EKS_1", nama: "Pramuka Wajib", pembinaId: "WAL_1", pembinaNama: "Eko Prasetyo, S.Pd", jadwalHari: "Sabtu", jamMulai: "08:00", jamSelesai: "11:00", tempat: "Lapangan Utama", deskripsi: "Kegiatan kepramukaan kepemimpinan dan kemandirian siswa." },
    { id: "EKS_2", nama: "PMR (Palang Merah Remaja)", pembinaId: "WAL_2", pembinaNama: "Siti Rahmawati, M.Pd", jadwalHari: "Jumat", jamMulai: "14:00", jamSelesai: "16:00", tempat: "Ruang UKS", deskripsi: "Pelatihan pertolongan pertama, kesehatan, dan aksi sosial." },
    { id: "EKS_3", nama: "Paskibra Sekolah", pembinaId: "WAL_3", pembinaNama: "Agus Budiman, S.T", jadwalHari: "Sabtu", jamMulai: "13:00", jamSelesai: "16:00", tempat: "Lapangan Upacara", deskripsi: "Latihan baris-berbaris, formasi, kedisiplinan, dan upacara kenegaraan." },
    { id: "EKS_4", nama: "Klub Futsal", pembinaId: "WAL_4", pembinaNama: "Dewi Lestari, S.Pd", jadwalHari: "Kamis", jamMulai: "15:30", jamSelesai: "17:30", tempat: "Lapangan Olahraga", deskripsi: "Latihan teknik futsal, taktik bermain, dan turnamen antarkelas." }
  ],
  anggotaEkskul: [
    { id: "AE_1", ekskulId: "EKS_1", siswaId: "SIS_1", tanggalBergabung: "2026-07-15" },
    { id: "AE_2", ekskulId: "EKS_1", siswaId: "SIS_2", tanggalBergabung: "2026-07-15" },
    { id: "AE_3", ekskulId: "EKS_1", siswaId: "SIS_3", tanggalBergabung: "2026-07-15" },
    { id: "AE_4", ekskulId: "EKS_2", siswaId: "SIS_4", tanggalBergabung: "2026-07-18" },
    { id: "AE_5", ekskulId: "EKS_2", siswaId: "SIS_5", tanggalBergabung: "2026-07-18" },
    { id: "AE_6", ekskulId: "EKS_3", siswaId: "SIS_1", tanggalBergabung: "2026-07-20" },
    { id: "AE_7", ekskulId: "EKS_3", siswaId: "SIS_4", tanggalBergabung: "2026-07-20" },
    { id: "AE_8", ekskulId: "EKS_4", siswaId: "SIS_2", tanggalBergabung: "2026-07-22" },
    { id: "AE_9", ekskulId: "EKS_4", siswaId: "SIS_3", tanggalBergabung: "2026-07-22" },
    { id: "AE_10", ekskulId: "EKS_4", siswaId: "SIS_5", tanggalBergabung: "2026-07-22" }
  ],
  presensiEkskul: {
    "2026-09-12_EKS_1": [
      { siswaId: "SIS_1", status: "H", catatan: "Hadir tepat waktu" },
      { siswaId: "SIS_2", status: "H", catatan: "" },
      { siswaId: "SIS_3", status: "I", catatan: "Izin acara keluarga" }
    ],
    "2026-09-19_EKS_1": [
      { siswaId: "SIS_1", status: "H", catatan: "" },
      { siswaId: "SIS_2", status: "S", catatan: "Sakit demam" },
      { siswaId: "SIS_3", status: "H", catatan: "" }
    ],
    "2026-09-11_EKS_2": [
      { siswaId: "SIS_4", status: "H", catatan: "" },
      { siswaId: "SIS_5", status: "H", catatan: "" }
    ]
  },
  waliKelas: DEFAULT_WALI_KELAS,
  kelas: DEFAULT_KELAS,
  siswa: DEFAULT_SISWA,
  presensi: initialPresensi,
  homeVisits: INITIAL_HOME_VISITS,
  pelanggaran: INITIAL_PELANGGARAN,
  violationTemplates: DEFAULT_VIOLATION_TEMPLATES,
  chatMessages: INITIAL_CHAT_MESSAGES,
  enableLiveChat: true,
  hariLibur: DEFAULT_HARI_LIBUR,
  jadwalMengajar: DEFAULT_JADWAL_MENGAJAR,
  mataPelajaran: DEFAULT_MATA_PELAJARAN,
  guruMapelKelas: DEFAULT_GURU_MAPEL_KELAS,
  presensiMengajarGuru: DEFAULT_PRESENSI_MENGAJAR_GURU,
  pengumuman: INITIAL_PENGUMUMAN,
  petugasPiket: DEFAULT_PETUGAS_PIKET,
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
  auditLogs: DEFAULT_AUDIT_LOGS
};
