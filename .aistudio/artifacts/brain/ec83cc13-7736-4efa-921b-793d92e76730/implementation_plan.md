# Rencana Implementasi: Absensi Siswa Kelas Mengajar Guru (Mandiri & Terpisah)

Rencana arsitektur dan antarmuka untuk fitur **Absensi Siswa Kelas Mengajar Guru**. Fitur ini memungkinkan setiap guru mata pelajaran memiliki lembar presensi dan jurnal KBM mandiri untuk setiap sesi kelas mengajarnya, tersimpan pada tabel tersendiri, tanpa mempengaruhi atau mengubah absensi harian gerbang/wali kelas sekolah.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan Kunci Terkonfirmasi dari Tanya-Jawab:**
> 1. **Pintu Akses Guru**: Diakses langsung dari menu **Jadwal Mengajar** melalui tombol **"Absen Kelas"** pada setiap kartu sesi/slot jadwal mengajar (baik pada tampilan Matriks Mingguan maupun Daftar Tabel Jadwal).
> 2. **Isolasi Data**: Data tersimpan terpisah secara mandiri (`presensiMengajarGuru`) di tabel database dan state tersendiri untuk setiap guru, tanpa menimpa (*overwrite*) data absensi harian utama sekolah.
> 3. **Kelengkapan Pencatatan**: Mencakup status kehadiran siswa (**H/S/I/A**), **Jurnal Materi Pembelajaran** (topik bahasan KBM hari itu), jam pelajaran (JP), serta **Catatan Siswa** per individu.

---

## 1. Overview & Core Concept

* **Tujuan**: Memberikan guru mata pelajaran instrumen presensi kelas yang otonom dan rapi saat mengajar di ruang kelas, merekam keaktifan siswa pada jam pelajarannya, serta mencatat kemajuan jurnal materi ajar.
* **Target Pengguna**: 
  * **Guru Mata Pelajaran**: Mengisi kehadiran siswa kelas yang diajar, mengisi topik materi KBM, dan melihat riwayat pertemuan kelasnya.
  * **Wali Kelas & Kurikulum**: Memantau rekap kehadiran siswa khusus jam pelajaran tertentu (misal: apakah siswa hadir di sekolah tetapi membolos saat jam pelajaran matematika).
* **Nilai Utama**: Pemisahan yang tegas antara presensi gerbang/sekolah harian (yang dikelola wali kelas/piket) dengan presensi jam pelajaran ruang kelas (yang dikelola masing-masing guru mapel).

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Guru Membuka Menu Jadwal Mengajar (Matriks atau Tabel)              │
│    └─ Guru melihat jadwal mengajarnya hari ini (misal: XI TJKT 5)      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. Klik Tombol "Absen Kelas" pada Kartu Sesi                           │
│    └─ Membuka Lembar Presensi Kelas Mengajar (Modal / Slide-Over Drawer)│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. Pengisian Presensi Sesi KBM:                                        │
│    ├─ Header: Kelas, Mapel, Guru Pengampu, Hari/Tanggal, Jam Pelajaran │
│    ├─ Jurnal KBM: Form input "Materi / Topik Bahasan Hari Ini"         │
│    ├─ Tombol Cepat: "Set Semua Hadir" (Quick Action)                   │
│    └─ Daftar Siswa: Radio/Toggle H (Hadir), S (Sakit), I (Izin),       │
│       A (Alpha) + Kolom Catatan Kejadian Khusus                        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. Simpan Lembar Presensi Sesi:                                        │
│    ├─ Data tersimpan ke tabel mandiri: presensiMengajarGuru            │
│    ├─ Notifikasi sukses & update riwayat pertemuan kelas               │
│    └─ Status kartu jadwal menampilkan badge "Sudah Diabsen (34 Siswa)" │
└────────────────────────────────────────────────────────────────────────┘
```

### Visual Identity & Theme
* **Palet Warna**: Mengikuti tema profesional SIMAK berbasis Tailwind CSS:
  * Akses Presensi Sesi: Aksen Indigo & Biru (`blue-600`, `indigo-700`) untuk presensi kelas.
  * Status Kehadiran Siswa:
    * **H (Hadir)**: Emerald (`bg-emerald-50 text-emerald-700 border-emerald-200`)
    * **S (Sakit)**: Amber (`bg-amber-50 text-amber-700 border-amber-200`)
    * **I (Izin)**: Blue (`bg-blue-50 text-blue-700 border-blue-200`)
    * **A (Alpha)**: Rose (`bg-rose-50 text-rose-700 border-rose-200`)
* **Anti-Pill & Tipografi**:
  * Informasi sesi (tanggal, jam ke, jumlah siswa) menggunakan tipografi unboxed bersih dengan pemisah titik (`·`).
  * Pemilihan status kehadiran menggunakan segmented toggle button yang responsif dan mudah ditekan di layar sentuh ponsel maupun laptop.
* **Tampilan Riwayat & Rekap Per Guru**:
  * Tab sub-menu atau modal riwayat: Guru dapat meninjau rekaman pertemuan sebelumnya (Tanggal, Materi Ajar, % Kehadiran Siswa).
  * Opsi Unduh Rekap Absensi Kelas per Guru ke file Excel.

---

## 3. Key Product Decisions & Trade-Offs

* **Keputusan 1: Struktur Penyimpanan Data Terpisah (Isolated Table)**
  * *Pilihan*: Menggunakan koleksi data khusus `presensiMengajarGuru` (berisi sesi mengajar, materi ajar, dan array `presensiSiswa: [{ siswaId, status, catatan }]`) yang sepenuhnya independen dari objek `presensi` harian utama sekolah.
  * *Alasan*: Menjamin bahwa perubahan status di ruang kelas (misalnya guru mencatat siswa izin keluar KBM) tidak akan merusak atau mengganti data presensi gerbang/wali kelas sekolah.
* **Keputusan 2: Pemetaan Sesi Mengajar Berdasarkan Jadwal & Tanggal**
  * *Pilihan*: Kunci unik sesi berbasis `jadwalId` + `tanggal` (YYYY-MM-DD).
  * *Alasan*: Setiap guru mengajar sesi mingguan yang berulang; dengan kombinasi ID jadwal dan tanggal, guru dapat mengabsen kelas yang sama di minggu-minggu berikutnya secara tertata.
* **Keputusan 3: Penempatan Akses di Jadwal Mengajar**
  * *Pilihan*: Menempatkan tombol "Absen Kelas" langsung di setiap kartu jadwal matriks mingguan dan tabel sesi guru, serta tab "Riwayat Presensi Kelas Guru".
  * *Alasan*: Alur kerja alami guru adalah melihat jadwal hari ini, lalu langsung menekan tombol absen pada kelas yang sedang berlangsung.

---

## 4. Technical Architecture & Data Strategy

### Diagram Arsitektur & Aliran Data

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ANTARMUKA PENGGUNA (VITE + REACT)               │
│                                                                        │
│  [JadwalMengajarView] ────(Klik 'Absen Kelas')────► [ModalAbsenKelas]  │
│         │                                                    │         │
│         ▼                                                    ▼         │
│  [Matriks/Tabel Jadwal]                             [Form Presensi &]  │
│  Badge "Sudah Diabsen"                              [Jurnal Materi]    │
└──────────────────────────────────────────────────────────────┬─────────┘
                                                               │
                                         Submit / Simpan Presensi Sesi
                                                               │
                                                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   STATE MANAGEMENT & LOCAL HELPERS                     │
│                                                                        │
│  • appData.presensiMengajarGuru: AbsensiMengajarGuruItem[]             │
│  • Helper: getPresensiSesiGuru(jadwalId, tanggal)                      │
│  • Helper: savePresensiSesiGuru(sesiData)                              │
└──────────────────────────────────────────────────────────────┬─────────┘
                                                               │
                                          Sync API: /api/presensi-mengajar
                                                               │
                                                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     BACKEND & DATABASE PERSISTENCE                     │
│                                                                        │
│  • server.ts: Endpoint POST /api/presensi-mengajar                     │
│  • File Cache: app_data_cache.json (key: presensiMengajarGuru)         │
│  • Database SQL: Tabel 'presensi_mengajar_guru' (MySQL / Cloud SQL)    │
│    (id, jadwal_id, guru_username, guru_nama, kelas_id, tanggal,       │
│     mata_pelajaran, materi_ajar, presensi_siswa_json, created_at)      │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Skema Database

#### TypeScript Interface (`src/types.ts`)
```ts
export interface SiswaPresensiSesiGuru {
  siswaId: string;
  siswaNama: string;
  nisn?: string;
  status: 'H' | 'S' | 'I' | 'A';
  catatan?: string;
}

export interface AbsensiMengajarGuruItem {
  id: string; // e.g. "PMG_1792310441_1"
  jadwalId: string; // relasi ke JadwalMengajarGuru.id
  guruUsername: string;
  guruNama: string;
  tanggal: string; // "YYYY-MM-DD"
  hari: string; // "Senin", "Selasa", dll.
  kelasId: string;
  kelasNama: string;
  mataPelajaran: string;
  jamPelajaran: string; // e.g. "Jam ke-1 s.d 4 (4 JP)"
  materiAjar: string; // Jurnal bahasan materi guru
  catatanGuru?: string; // Catatan khusus kelas
  presensiSiswa: SiswaPresensiSesiGuru[];
  createdAt: string;
  updatedAt?: string;
}
```

#### Skema Tabel SQL (`server.ts`)
```sql
CREATE TABLE IF NOT EXISTS presensi_mengajar_guru (
  id VARCHAR(100) PRIMARY KEY,
  jadwal_id VARCHAR(100) NOT NULL,
  guru_username VARCHAR(100) NOT NULL,
  guru_nama VARCHAR(255) NOT NULL,
  tanggal DATE NOT NULL,
  hari VARCHAR(30) NOT NULL,
  kelas_id VARCHAR(100) NOT NULL,
  kelas_nama VARCHAR(100) NOT NULL,
  mata_pelajaran VARCHAR(255) NOT NULL,
  jam_pelajaran VARCHAR(100),
  materi_ajar TEXT,
  catatan_guru TEXT,
  presensi_siswa JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_guru_tanggal (guru_username, tanggal),
  INDEX idx_jadwal_tanggal (jadwal_id, tanggal),
  INDEX idx_kelas_tanggal (kelas_id, tanggal)
);
```

### Rencana File & Komponen yang Akan Dibuat / Dimodifikasi

1. **`src/types.ts`**:
   * Menyelaraskan interface `AbsensiMengajarGuruItem` dan `SiswaPresensiSesiGuru`.
2. **`server.ts`**:
   * Pembuatan tabel `presensi_mengajar_guru` secara otomatis saat inisialisasi database.
   * Endpoint `POST /api/presensi-mengajar/save`: Simpan atau perbarui lembar presensi sesi guru.
   * Endpoint `GET /api/presensi-mengajar/guru/:guruUsername`: Ambil riwayat presensi mengajar guru.
   * Integrasi sinkronisasi di `saveAppDataCache` dan migrasi database.
3. **`src/components/views/jadwal/ModalAbsenSiswaMengajar.tsx`** (Komponen Baru):
   * Modal antarmuka pengisian presensi siswa khusus kelas yang diajar guru.
   * Daftar siswa otomatis dari kelas terkait (mengambil dari `appData.siswa` berdasarkan `kelasId`).
   * Tombol pintas: "Semua Hadir", "Reset".
   * Input Form Jurnal: Materi pembelajaran yang diajarkan, catatan kedisiplinan siswa.
4. **`src/components/views/JadwalMengajarView.tsx`**:
   * Menambahkan tombol **"Absen Kelas"** berikon `UserCheck` pada kartu sesi di Matriks dan Tabel.
   * Indikator status visual pada kartu: Jika hari ini sudah diabsen, menampilkan tag hijau "Sudah Absen" dengan ringkasan kehadiran (misal: 34 Hadir, 2 Sakit).
   * Menambahkan tab/sub-menu **"Riwayat Presensi Mengajar"** agar guru dapat melihat rekap pertemuan kelas sebelumnya dan mencetak / ekspor ke Excel.
5. **`src/utils/helpers.ts`**:
   * Fungsi bantu penggabungan dan deduplikasi data sesi presensi mengajar guru.

---

## Verifikasi & Pengujian Rencana

1. **Uji Isolasi**: Memastikan pengisian status H/S/I/A di kelas mengajar guru sama sekali tidak mengubah data di menu **Presensi Siswa** utama (Wali Kelas / Absensi Harian Gerbang).
2. **Uji Multi-Guru**: Memastikan Guru A (misal: Bahasa Inggris) dan Guru B (misal: Matematika) yang mengajar di kelas yang sama memiliki lembar absensi masing-masing yang tersimpan terpisah pada database.
3. **Uji Persistensi**: Menyimpan presensi sesi, melakukan *refresh* browser, dan memastikan data riwayat serta jurnal materi tetap tersimpan dengan tepat dari server.
