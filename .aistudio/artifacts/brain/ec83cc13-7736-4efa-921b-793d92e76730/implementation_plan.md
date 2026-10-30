# Perbaikan Sistem Aktivasi & Penyimpanan Sakelar Kartu Cepat Dashboard

Solusi komprehensif untuk memastikan sakelar aktivasi kartu cepat (*Quick Action Cards*) tersimpan secara permanen di database/server, langsung aktif tanpa di-override otomatis, dan diterapkan tepat sasaran pada akun Guru maupun Guru dengan Tugas Tambahan (Wali Kelas, Kesiswaan, Kurikulum, Staf Jadwal, Piket, Hubin).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan konfirmasi kendala yang dialami:
> - **Kendala Utama**: Tombol sakelar aktif di modal pengaturan tidak tersimpan.
> - **Peran Terdampak**: Guru dan Guru dengan tugas tambahan (Wali Kelas, WKS Kesiswaan, WKS Kurikulum, Staf Jadwal, dll.).
> 
> Dari hasil investigasi mendalam, ditemukan 4 akar penyebab teknis:
> 1. **Role Context Mismatch di Dashboard Tugas Tambahan**: Pada `WaliKelasDashboardView` dan `KesiswaanDashboardView`, komponen `RoleQuickActions` menerima `role={currentUser.role}` (yang bernilai `'guru'`), bukan `role="wali"` atau `role="kesiswaan"`. Akibatnya, saat admin mengatur kartu untuk Wali Kelas/Kesiswaan, dashboard guru membaca konfigurasi role Guru sehingga perubahan sakelar seolah-olah tidak tersimpan.
> 2. **Auto-Reinjection Override**: Pada `RoleQuickActions.tsx`, filter awal hanya mengambil `c.enabled`. Jika kartu KBM dimatikan (`enabled: false`), fungsi pengecekan mengira kartu belum ada dan secara otomatis menginjeksi ulang kartu KBM dalam kondisi aktif (`enabled: true`), membatalkan sakelar nonaktif dari pengguna.
> 3. **Sinkronisasi Polling Server Mengesampingkan Local Draft**: Pada `App.tsx`, fungsi *real-time state polling* belum memprioritaskan timestamp mutasi lokal `dashboardQuickActions`. Jika server merespons data sebelum request penyimpanan selesai terproses, status sakelar lokal tertimpa data lama server.
> 4. **Inisialisasi Draft Modal**: State draft modal tidak melakukan resinkronisasi saat modal dibuka ulang atau saat mengganti peran, sehingga draft lama berpotensi menimpa data terbaru.

---

### 1. Overview & Core Concept

- **Tujuan**: Menjamin tombol sakelar aktif/nonaktif pada kartu cepat dapat disimpan secara andal, tidak ter-reset, dan langsung tercermin di dashboard masing-masing peran pendidik.
- **Sasaran Pengguna**: Administrator Sekolah saat mengonfigurasi kartu cepat, serta Dewan Guru dan Guru dengan tugas tambahan saat mengakses dashboard operasional mereka.
- **Nilai Utama**: Fleksibilitas penuh bagi sekolah untuk mengatur kartu cepat yang relevan untuk setiap penugasan guru tanpa konflik hak akses atau regresi tampilan.

---

### 2. User Experience & Visual Design

- **Alur Modal Pengaturan Kartu Cepat**:
  1. Admin membuka modal **Atur Kartu Cepat** dari tombol di header dashboard atau menu pengaturan.
  2. Memilih peran (Guru, Wali Kelas, WKS Kesiswaan, WKS Kurikulum, dll.).
  3. Mengklik tombol sakelar **Aktif / Off** pada kartu yang diinginkan. Tampilan kartu langsung memperbarui badge visual status (hijau untuk Aktif, abu-abu untuk Nonaktif) dengan transisi mulus.
  4. Menekan tombol **Simpan Pengaturan**: Modal mengeksekusi penyimpanan instan ke `AppData`, menyinkronkan izin menu (`rolePermissions`), dan memicu *hardened server commit* ke `/api/global-state`.
  5. Menampilkan toast notifikasi sukses: *"Pengaturan kartu cepat dashboard berhasil disimpan & langsung aktif!"*.
- **Tampilan Dashboard Guru & Tugas Tambahan**:
  - Guru biasa hanya melihat kartu yang diaktifkan untuk peran `guru`.
  - Guru dengan tugas Wali Kelas di dashboard binaannya melihat kartu yang diaktifkan untuk peran `wali`.
  - Guru dengan tugas Kesiswaan di dashboard kesiswaan melihat kartu yang diaktifkan untuk peran `kesiswaan`.
  - Kartu yang dinonaktifkan tidak akan dipaksa tampil kembali oleh logika otomatis.

---

### 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Explicit Role Injection di Dashboard Tugas Tambahan**
  - *Pendekatan*: Mengubah pemanggilan `RoleQuickActions` di `WaliKelasDashboardView` menjadi `role={currentUser.role === 'piket_kelas' ? 'piket_kelas' : 'wali'}` dan di `KesiswaanDashboardView` menjadi `role="kesiswaan"`.
  - *Alasan*: Akun guru dengan tugas tambahan memiliki peran utama `currentUser.role = 'guru'`. Dengan memberikan parameter peran dashboard secara eksplisit, kartu yang tampil akan konsisten dengan konfigurasi peran yang diatur admin.
- **Keputusan 2: Smart Auto-Inject KBM Tanpa Mengabaikan Sakelar Nonaktif**
  - *Pendekatan*: Pada `RoleQuickActions.tsx`, auto-inject kartu KBM hanya dilakukan jika kartu KBM **sama sekali belum terdaftar** di array kartu peran tersebut. Jika kartu KBM sudah ada tetapi di-set `enabled: false` oleh admin, preferensi admin dihormati dan kartu tetap nonaktif.
  - *Alasan*: Mencegah sistem "memaksa" kartu KBM aktif kembali saat admin sengaja menonaktifkannya.
- **Keputusan 3: Sinkronisasi Izin Menu Otomatis & Timestamped State Merger**
  - *Pendekatan*: Saat kartu diaktifkan, menu tujuan kartu secara otomatis diverifikasi dan diizinkan pada `rolePermissions` peran terkait. Pada merger polling di `App.tsx`, konfigurasi `dashboardQuickActions` dengan timestamp terbaru tidak akan ditimpa oleh respons polling lama.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│             PengaturanKartuCepatModal                  │
│  - Toggle Sakelar Kartu (enabled: true/false)          │
│  - Draft State per Role (draftRolesConfig)             │
│  - Sinkronisasi Efek saat Modal Terbuka                │
└──────────────────────────┬─────────────────────────────┘
                           │ Simpan Pengaturan
                           ▼
┌────────────────────────────────────────────────────────┐
│                   App Data & Storage                   │
│  - Update appData.dashboardQuickActions                │
│  - Sinkronisasi rolePermissions (Auto-grant view)      │
│  - commitAppDataToServer(/api/global-state)            │
│  - localStorage & BroadcastChannel Sync                │
└──────────────────────────┬─────────────────────────────┘
                           │ Render Berdasarkan Role Eksplisit
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌────────────────────────┐  ┌────────────────────────┐
│  WaliKelasDashboard    │  │  KesiswaanDashboard    │
│  <RoleQuickActions     │  │  <RoleQuickActions     │
│    role="wali" />      │  │    role="kesiswaan" /> │
└────────────────────────┘  └────────────────────────┘
             │                           │
             ▼                           ▼
┌────────────────────────────────────────────────────────┐
│                   RoleQuickActions                     │
│  - Evaluasi rawCards.filter((c) => c.enabled)          │
│  - Hormati kartu yang dimatikan (tidak auto-inject)    │
│  - Render kartu aktif sesuai penugasan peran           │
└────────────────────────────────────────────────────────┘
```

#### Komponen dan Berkas yang Diperbarui:
1. `src/components/modals/PengaturanKartuCepatModal.tsx`:
   - Penambahan `useEffect` untuk mereset `draftRolesConfig` dengan aman saat modal dibuka atau `initialRole` berganti.
   - Perbaikan fungsi `handleToggleCardEnabled` dan `handleSaveAll` dengan memanggil `commitAppDataToServer` dan sinkronisasi `rolePermissions`.
2. `src/components/dashboard/RoleQuickActions.tsx`:
   - Koreksi logika memoized `activeCards` agar tidak membangkitkan kartu KBM jika kartu tersebut sengaja dinonaktifkan (`enabled: false`).
3. `src/components/dashboard/WaliKelasDashboardView.tsx`:
   - Mengubah `role={currentUser.role}` menjadi `role={currentUser.role === 'piket_kelas' ? 'piket_kelas' : 'wali'}`.
4. `src/components/dashboard/KesiswaanDashboardView.tsx`:
   - Mengubah `role={currentUser.role}` menjadi `role="kesiswaan"`.
5. `src/App.tsx`:
   - Penguatan merger `dashboardQuickActions` pada `fetchGlobalState` dan event `presensi-data-updated` berbasis timestamp terbaru agar hasil simpan tidak tertimpa polling background.
