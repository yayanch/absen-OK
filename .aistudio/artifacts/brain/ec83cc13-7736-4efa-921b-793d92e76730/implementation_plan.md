# Implementasi Selesai: Switch Peran (Dashboard & Sidebar) untuk Guru dengan Tugas Tambahan

Fitur switch ruang kerja (*Role Workspace Switcher*) telah berhasil diimplementasikan untuk guru yang memiliki tugas tambahan (seperti **Wali Kelas**, **Wakil Kepala Sekolah Bidang Kurikulum**, **Kesiswaan**, **Hubin**, atau tugas tambahan lainnya).

---

## 1. Ringkasan Implementasi

1. **Tombol Switcher di Header (Dekat Profil Pengguna)**:
   - Ditempatkan tepat di samping foto profil pada Header navigasi atas.
   - Hanya muncul jika akun guru memiliki lebih dari satu peran/tugas tambahan.
   - Menampilkan ikon mode aktif, label peran aktif (misal: *Mode Peran: Wali (XII RPL 1)* atau *Mode Peran: Guru Mapel*), status indikator aktif, dan tombol dropdown.
   - Menu dropdown memuat seluruh daftar ruang kerja yang berhak diakses oleh guru bersangkutan lengkap dengan deskripsi fungsional masing-masing mode.

2. **Perilaku Navigasi Otomatis**:
   - Saat memilih mode baru, sistem langsung mengarahkan tampilan ke **Dashboard** khusus peran tersebut (`dashboard`).
   - Pilihan mode disimpan secara persisten di `localStorage` sehingga preferensi pengguna tidak hilang saat memuat ulang halaman.
   - Memberikan notifikasi toast informatif yang mengonfirmasi peralihan peran.

3. **Penyesuaian Sidebar Dinamis**:
   - Menu di Sidebar kini disaring secara instan berdasarkan mode peran yang sedang aktif:
     - **Mode Guru Mapel**: Menu berfokus pada kegiatan belajar mengajar: Jadwal Mengajar, Presensi KBM Kelas, Jurnal Harian Guru, Agenda Pembelajaran.
     - **Mode Wali Kelas**: Menampilkan menu kelola siswa binaan: Presensi Siswa Kelas Binaan, Rekap Presensi Kelas, Catatan Pelanggaran Siswa Binaan, Home Visit Siswa Binaan, Data Siswa Kelas Binaan.
     - **Mode Kurikulum**: Menampilkan menu supervisi KBM, jadwal pelajaran sekolah, master mata pelajaran.
     - **Mode Kesiswaan**: Menampilkan menu pemantauan kedisiplinan, catatan pelanggaran seluruh siswa, rekap presensi harian sekolah, dispensasi.
   - Ditambahkan kartu indikator **Ruang Kerja Aktif** di bagian atas menu Sidebar (dengan tombol pintas ganti mode cepat).

4. **Penyesuaian Dashboard Otomatis**:
   - **Mode Guru Mapel**: Merender `GuruDashboardView` untuk KBM dan jam mengajar guru.
   - **Mode Wali Kelas**: Merender `WaliKelasDashboardView` yang otomatis terikat (*scoped*) ke kelas binaan guru tersebut.
   - **Mode Kurikulum**: Merender `KurikulumDashboardView`.
   - **Mode Kesiswaan**: Merender `KesiswaanDashboardView`.

---

## 2. Pengujian & Verifikasi

- `compile_applet`: Berhasil tanpa error.
- `lint_applet` (`tsc --noEmit`): Berhasil tanpa error.
