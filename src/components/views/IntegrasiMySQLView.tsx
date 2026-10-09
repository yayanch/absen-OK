import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, Terminal, Copy, Check, Server, RefreshCw, ShieldCheck, Cpu, FileText, Download, X, ExternalLink, Globe, Lock, BookOpen } from 'lucide-react';
import { AppData, UserSession } from '../../types';
import { PageHeader } from '../common/UIComponents';

interface IntegrasiMySQLViewProps {
  appData: AppData;
  currentUser: UserSession;
  onUpdateAppData: (updated: AppData) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const IntegrasiMySQLView: React.FC<IntegrasiMySQLViewProps> = ({
  appData,
  currentUser,
  onUpdateAppData,
  onShowToast,
}) => {
  const [host, setHost] = useState<string>(localStorage.getItem('mysql_host') || 'localhost');
  const [port, setPort] = useState<string>(localStorage.getItem('mysql_port') || '3306');
  const [database, setDatabase] = useState<string>(localStorage.getItem('mysql_database') || 'sistem_presensi_sekolah');
  const [user, setUser] = useState<string>(localStorage.getItem('mysql_user') || 'root');
  const [password, setPassword] = useState<string>(localStorage.getItem('mysql_password') || '');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [showVpsModal, setShowVpsModal] = useState<boolean>(false);
  const [vpsWebServer, setVpsWebServer] = useState<'nginx' | 'apache'>('nginx');
  const [copiedCmd, setCopiedCmd] = useState<string>('');
  const [isEnvMode, setIsEnvMode] = useState<boolean>(false);
  const [envDetails, setEnvDetails] = useState<{ host: string; port: string; user: string; database: string; hasPassword: boolean } | null>(null);
  const [isLoadingEnv, setIsLoadingEnv] = useState<boolean>(false);

  const fetchServerConfig = async (silent = false) => {
    try {
      const res = await fetch('/api/mysql/config');
      const data = await res.json();
      if (data.isEnv) {
        setIsEnvMode(true);
        if (data.envKeys) setEnvDetails(data.envKeys);
      } else {
        setIsEnvMode(false);
      }
      if (data.success && data.config) {
        if (data.config.host) {
          setHost(data.config.host);
          localStorage.setItem('mysql_host', data.config.host);
        }
        if (data.config.port) {
          setPort(data.config.port);
          localStorage.setItem('mysql_port', data.config.port);
        }
        if (data.config.database) {
          setDatabase(data.config.database);
          localStorage.setItem('mysql_database', data.config.database);
        }
        if (data.config.user) {
          setUser(data.config.user);
          localStorage.setItem('mysql_user', data.config.user);
        }
        if (data.config.password !== undefined) {
          setPassword(data.config.password);
          localStorage.setItem('mysql_password', data.config.password);
        }
      }
      if (!silent && data.isEnv) {
        onShowToast(`Konfigurasi database aktif dari file .env (${data.config?.host})`, 'info');
      }
    } catch (e) {}
  };

  // Auto-fetch server MySQL config on mount so new devices get settings immediately
  useEffect(() => {
    fetchServerConfig(true);
  }, []);

  const handleReloadEnv = async () => {
    setIsLoadingEnv(true);
    try {
      const res = await fetch('/api/mysql/reload-env', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsEnvMode(true);
        if (data.config) {
          setHost(data.config.host);
          setPort(data.config.port);
          setDatabase(data.config.database);
          setUser(data.config.user);
          if (data.config.password) setPassword(data.config.password);
        }
        onShowToast(data.message, data.connectionOk ? 'success' : 'warning');
      } else {
        onShowToast(data.message || 'Gagal memuat konfigurasi dari .env', 'error');
      }
    } catch (err: any) {
      onShowToast('Gagal menghubungi server untuk memuat .env', 'error');
    } finally {
      setIsLoadingEnv(false);
    }
  };

  const handlePreviewDatabase = async () => {
    setIsPreviewing(true);
    setPreviewData(null);
    try {
      const response = await fetch('/api/mysql/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, user, password, database }),
      });
      const data = await response.json();
      if (data.success) {
        setPreviewData(data);
        onShowToast('Berhasil memuat preview data dari database MySQL!', 'success');
      } else {
        onShowToast(data.message || 'Gagal memuat preview database', 'error');
      }
    } catch (err: any) {
      onShowToast('Gagal terhubung ke server backend untuk preview.', 'error');
    } finally {
      setIsPreviewing(false);
    }
  };

  const sqlSchemaCode = `-- ========================================================
-- SKRIP SQL DATABASE MYSQL - SISTEM PRESENSI & MANAJEMEN SEKOLAH
-- ========================================================

CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`${database}\`;

-- 1. Tabel Pengaturan Sekolah
CREATE TABLE IF NOT EXISTS sekolah_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  alamat TEXT,
  tahun_ajaran VARCHAR(50),
  tanggal_mulai VARCHAR(50),
  logo LONGTEXT,
  favicon LONGTEXT,
  nama_kepala_sekolah VARCHAR(255),
  nip_kepala_sekolah VARCHAR(100),
  theme VARCHAR(50) DEFAULT 'ocean',
  font_theme VARCHAR(50) DEFAULT 'modern',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Tabel Akun Administrator
CREATE TABLE IF NOT EXISTS admin_account (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nama VARCHAR(255) NOT NULL,
  foto LONGTEXT
);

-- 3. Tabel Jurusan / Program Keahlian
CREATE TABLE IF NOT EXISTS jurusan (
  id VARCHAR(50) PRIMARY KEY,
  kode VARCHAR(50) NOT NULL,
  nama VARCHAR(255) NOT NULL
);

-- 4. Tabel Wali Kelas / Guru
CREATE TABLE IF NOT EXISTS wali_kelas (
  id VARCHAR(50) PRIMARY KEY,
  nip VARCHAR(100),
  nama VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  no_hp VARCHAR(50),
  role VARCHAR(50) DEFAULT 'wali',
  foto LONGTEXT
);

-- 5. Tabel Kelas
CREATE TABLE IF NOT EXISTS kelas (
  id VARCHAR(50) PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  jurusan_id VARCHAR(50),
  wali_kelas_id VARCHAR(50),
  FOREIGN KEY (jurusan_id) REFERENCES jurusan(id) ON DELETE SET NULL,
  FOREIGN KEY (wali_kelas_id) REFERENCES wali_kelas(id) ON DELETE SET NULL
);

-- 6. Tabel Siswa
CREATE TABLE IF NOT EXISTS siswa (
  id VARCHAR(50) PRIMARY KEY,
  nisn VARCHAR(50),
  nama VARCHAR(255) NOT NULL,
  gender ENUM('L', 'P') NOT NULL,
  kelas_id VARCHAR(50),
  status VARCHAR(50) DEFAULT 'aktif',
  no_wa VARCHAR(50),
  nama_orang_tua VARCHAR(255),
  no_wa_orang_tua VARCHAR(50),
  username VARCHAR(100),
  password VARCHAR(255),
  foto LONGTEXT,
  tempat_lahir VARCHAR(100),
  tanggal_lahir VARCHAR(50),
  alamat TEXT,
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE
);

-- 7. Tabel User (Menampung identitas dan kredensial seluruh pengguna sistem: Admin, Kesiswaan, Kurikulum, Hubin, Guru, Wali Kelas, Murid)
CREATE TABLE IF NOT EXISTS user (
  id VARCHAR(100) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nama VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  nip VARCHAR(100),
  no_hp VARCHAR(50),
  foto LONGTEXT,
  kelas_nama VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 8. Tabel Presensi Harian Siswa
CREATE TABLE IF NOT EXISTS presensi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal_kelas VARCHAR(100) UNIQUE NOT NULL, -- Format: YYYY-MM-DD_kelasId
  tanggal DATE NOT NULL,
  kelas_id VARCHAR(50) NOT NULL,
  data_presensi JSON NOT NULL, -- Menyimpan array status presensi [{siswaId, status}]
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE
);

-- 9. Tabel Catatan Pelanggaran Siswa & Poin Tata Tertib
CREATE TABLE IF NOT EXISTS pelanggaran (
  id VARCHAR(50) PRIMARY KEY,
  tanggal VARCHAR(50) NOT NULL, -- Format: YYYY-MM-DD
  siswa_id VARCHAR(50) NOT NULL,
  kelas_id VARCHAR(50),
  kategori VARCHAR(50) NOT NULL, -- ringan, sedang, berat, kriminal
  nama_pelanggaran VARCHAR(255) NOT NULL,
  poin INT DEFAULT 0,
  keterangan TEXT,
  pelapor VARCHAR(255),
  tindakan TEXT,
  status VARCHAR(50) DEFAULT 'proses', -- proses, selesai, perlu_tindak_lanjut
  foto LONGTEXT,
  created_at VARCHAR(50),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pelanggaran_siswa (siswa_id),
  INDEX idx_pelanggaran_tanggal (tanggal),
  INDEX idx_pelanggaran_kelas (kelas_id),
  FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE
);

-- 10. Tabel Laporan Kunjungan Rumah (Home Visit)
CREATE TABLE IF NOT EXISTS home_visit (
  id VARCHAR(50) PRIMARY KEY,
  tanggal VARCHAR(50) NOT NULL, -- Format: YYYY-MM-DD
  siswa_id VARCHAR(50) NOT NULL,
  kelas_id VARCHAR(50),
  petugas VARCHAR(255) NOT NULL,
  alasan TEXT,
  catatan TEXT,
  hasil TEXT,
  tindak_lanjut TEXT,
  foto LONGTEXT,
  status VARCHAR(50) DEFAULT 'proses', -- selesai, proses, perlu_followup
  created_at VARCHAR(50),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_home_visit_siswa (siswa_id),
  INDEX idx_home_visit_tanggal (tanggal),
  INDEX idx_home_visit_kelas (kelas_id),
  FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE
);

-- 11. Tabel Master Template Pelanggaran
CREATE TABLE IF NOT EXISTS violation_templates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  kategori VARCHAR(50) NOT NULL,
  poin INT DEFAULT 0,
  tindakan TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 12. Tabel Log Sesi & Riwayat Login Pengguna
CREATE TABLE IF NOT EXISTS user_login_logs (
  id VARCHAR(100) PRIMARY KEY,
  timestamp VARCHAR(50) NOT NULL,
  formatted_time VARCHAR(100),
  username VARCHAR(100) NOT NULL,
  nama VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  status_label VARCHAR(100),
  ip_address VARCHAR(50),
  location VARCHAR(100),
  device VARCHAR(100),
  browser VARCHAR(100),
  user_agent TEXT,
  failure_reason TEXT,
  session_id VARCHAR(100),
  session_duration_seconds INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_timestamp (timestamp),
  INDEX idx_status (status)
);

-- 13. Tabel Presensi Harian Guru Berdasarkan Shift & Hari Mengajar
CREATE TABLE IF NOT EXISTS presensi_guru (
  id VARCHAR(100) PRIMARY KEY,
  tanggal DATE NOT NULL,
  guru_id VARCHAR(100) NOT NULL,
  guru_username VARCHAR(100),
  guru_nama VARCHAR(255) NOT NULL,
  guru_nip VARCHAR(100),
  hari VARCHAR(50) NOT NULL,
  shift VARCHAR(50),             -- 'Pagi', 'Siang', 'Kombinasi', 'Non-KBM'
  status VARCHAR(20) NOT NULL,    -- 'H', 'T', 'I', 'S', 'D', 'A', ''
  jam_masuk VARCHAR(20),
  jam_pulang VARCHAR(20),
  catatan TEXT,
  jadwal_hari_ini TEXT,
  sumber_presensi VARCHAR(50) DEFAULT 'Manual',
  is_overridden BOOLEAN DEFAULT FALSE,
  overridden_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tanggal_guru (tanggal, guru_id),
  INDEX idx_tanggal (tanggal),
  INDEX idx_guru_id (guru_id),
  INDEX idx_status (status),
  INDEX idx_shift (shift)
);
`;

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/mysql/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, user, password, database }),
      });
      const data = await response.json();
      setTestResult(data);
      if (data.success) {
        localStorage.setItem('mysql_host', host);
        localStorage.setItem('mysql_port', port);
        localStorage.setItem('mysql_database', database);
        localStorage.setItem('mysql_user', user);
        localStorage.setItem('mysql_password', password);
        fetch('/api/global-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mysqlConfig: { host, port, user, password, database }, appData }),
        }).catch(() => {});
        onShowToast('Koneksi database MySQL berhasil dan tabel siap!', 'success');
      } else {
        onShowToast(data.message || 'Gagal terhubung ke MySQL', 'error');
      }
    } catch (err: any) {
      console.error(err);
      setTestResult({ success: false, message: err.message || 'Terjadi kesalahan koneksi server backend.' });
      onShowToast('Terjadi kesalahan koneksi ke server backend.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveToMySQL = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/mysql/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, user, password, database, appData }),
      });
      const data = await response.json();
      if (data.success) {
        onShowToast('Semua data aplikasi berhasil dikirim dan disimpan ke MySQL!', 'success');
      } else {
        onShowToast(data.message || 'Gagal menyimpan ke MySQL', 'error');
      }
    } catch (err: any) {
      onShowToast('Gagal terhubung ke server backend.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleLoadFromMySQL = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/mysql/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, user, password, database }),
      });
      const data = await response.json();
      if (data.success && data.appData) {
        onUpdateAppData(data.appData);
        onShowToast('Data berhasil dimuat dari MySQL ke aplikasi!', 'success');
      } else {
        onShowToast(data.message || 'Data tidak ditemukan di MySQL', 'warning');
      }
    } catch (err: any) {
      onShowToast('Gagal terhubung ke server backend.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlSchemaCode);
    setCopiedSql(true);
    onShowToast('Skrip SQL berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader
        icon={Database}
        title="Panduan & Konfigurasi MySQL Database"
        description="Hubungkan Aplikasi Sistem Presensi & Manajemen Sekolah ini ke database MySQL eksternal (Localhost XAMPP, Hosting cPanel, Cloud Server, RDS) dengan aman."
        badge="Integrasi Database Relasional & Server VPS"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowVpsModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold rounded-2xl text-xs md:text-sm transition-all shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95"
            >
              <Terminal className="w-4 h-4" />
              <span>Panduan Instalasi VPS (Terminal)</span>
            </button>
            <a
              href="/Panduan_Instalasi_Presensi_Siswa_V3_Apache_VPS.pdf"
              download="Panduan_Instalasi_Presensi_Siswa_V3_Apache_VPS.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-extrabold rounded-2xl text-xs md:text-sm transition-all shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95"
            >
              <FileText className="w-4 h-4 text-slate-950" />
              <span>Unduh PDF (VPS & Apache)</span>
              <Download className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        }
      />

      {/* Grid: Config Form & Architecture Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Konfigurasi & Test Koneksi */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-bold">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                  Konfigurasi Koneksi MySQL
                </h2>
                <p className="text-xs text-slate-400">Masukkan detail server MySQL Anda di bawah ini atau gunakan file .env</p>
              </div>
            </div>

            {/* .env Environment Status Banner */}
            {isEnvMode ? (
              <div className="mb-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                        Koneksi Otomatis via File .env Aktif
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white tracking-wide">
                        PRIORITAS UTAMA
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                      Server secara otomatis membaca variabel lingkungan dari file <code className="font-mono bg-emerald-200/50 dark:bg-emerald-950 px-1 py-0.5 rounded text-[10px]">.env</code> (DB_HOST, DB_USER, DB_NAME).
                    </p>
                    {envDetails && (
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-mono text-emerald-800 dark:text-emerald-300">
                        <span className="bg-emerald-500/15 px-2 py-0.5 rounded-md">HOST: {envDetails.host}</span>
                        <span className="bg-emerald-500/15 px-2 py-0.5 rounded-md">PORT: {envDetails.port}</span>
                        <span className="bg-emerald-500/15 px-2 py-0.5 rounded-md">DB: {envDetails.database}</span>
                        <span className="bg-emerald-500/15 px-2 py-0.5 rounded-md">USER: {envDetails.user}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReloadEnv}
                  disabled={isLoadingEnv}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-[11px] font-bold shrink-0 transition flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95"
                  title="Muat ulang konfigurasi dari .env tanpa restart server"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingEnv ? 'animate-spin' : ''}`} />
                  <span>{isLoadingEnv ? 'Memuat...' : 'Muat .env'}</span>
                </button>
              </div>
            ) : (
              <div className="mb-5 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                  <Terminal className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Koneksi dapat diatur permanen di file <strong className="font-mono text-slate-800 dark:text-slate-100">.env</strong> (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).</span>
                </div>
                <button
                  type="button"
                  onClick={handleReloadEnv}
                  disabled={isLoadingEnv}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shrink-0 transition flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95"
                  title="Periksa apakah file .env telah diisi di server"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingEnv ? 'animate-spin' : ''}`} />
                  <span>{isLoadingEnv ? 'Memeriksa...' : 'Cek .env'}</span>
                </button>
              </div>
            )}

            <form onSubmit={handleTestConnection} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    MySQL Host
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="localhost atau IP server"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Port
                  </label>
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="3306"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Database
                </label>
                <input
                  type="text"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  placeholder="sistem_presensi_sekolah"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Username MySQL
                </label>
                <input
                  type="text"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="root"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password MySQL
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak ada password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={isTesting}
                className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/25 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Menguji Koneksi...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" /> Uji Koneksi & Inisialisasi Database
                  </>
                )}
              </button>
            </form>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <button
                type="button"
                onClick={handleSaveToMySQL}
                disabled={isTesting}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50 text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Simpan
              </button>
              <button
                type="button"
                onClick={handleLoadFromMySQL}
                disabled={isTesting}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Muat
              </button>
              <button
                type="button"
                onClick={handlePreviewDatabase}
                disabled={isPreviewing}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50 text-xs"
              >
                {isPreviewing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />} Preview DB
              </button>
            </div>

            {previewData && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-3">
                <div className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                  <span>Preview Data Live dari Database MySQL:</span>
                  <button onClick={() => setPreviewData(null)} className="text-slate-400 hover:text-slate-600 font-bold">Tutup</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">Jurusan</div>
                    <div className="font-bold text-slate-800 dark:text-white">{previewData.counts?.jurusan || 0}</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">Wali Kelas</div>
                    <div className="font-bold text-slate-800 dark:text-white">{previewData.counts?.waliKelas || 0}</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">Kelas</div>
                    <div className="font-bold text-slate-800 dark:text-white">{previewData.counts?.kelas || 0}</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">Siswa</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">{previewData.counts?.siswa || 0}</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">Pelanggaran</div>
                    <div className="font-bold text-rose-600 dark:text-rose-400">{previewData.counts?.pelanggaran || 0}</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">Home Visit</div>
                    <div className="font-bold text-amber-600 dark:text-amber-400">{previewData.counts?.homeVisit || 0}</div>
                  </div>
                </div>
                {previewData.samples?.siswa?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 mb-1">Sampel Data Siswa di DB:</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {previewData.samples.siswa.slice(0, 5).map((s: any, idx: number) => (
                        <div key={idx} className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 flex justify-between text-[11px]">
                          <span className="font-bold text-slate-700 dark:text-slate-200">{s.nama}</span>
                          <span className="font-mono text-slate-400">{s.nisn || '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {testResult && (
              <div
                className={`mt-4 p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{testResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}</p>
                  <p className="mt-0.5">{testResult.message}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 dark:text-blue-200">
              <span className="font-bold">Auto-Sync Latar Belakang Aktif:</span> Setelah uji koneksi berhasil, setiap kali Anda menambah atau mengubah data di aplikasi (seperti menambah wali kelas, siswa, atau mencatat presensi), data akan <span className="underline font-bold">otomatis tersinkronisasi ke MySQL</span> di latar belakang.
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
            * Pastikan server MySQL Anda mengizinkan koneksi dari aplikasi backend Express (Port 3306 terbuka).
          </div>
        </div>

        {/* Informasi Arsitektur & Lingkungan */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                  Arsitektur & Keamanan MySQL
                </h2>
                <p className="text-xs text-slate-400">Bagaimana aplikasi berkomunikasi dengan database</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-500" /> 1. Server Backend Terpusat (`server.ts`)
                </div>
                <p>
                  Kredensial database MySQL (seperti password dan username root) disimpan dengan aman di server backend menggunakan file <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-800 dark:text-slate-200">.env</code>. Kredensial tidak pernah diekspos ke browser pengguna.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" /> 2. Driver `mysql2` & Kinerja Tinggi
                </div>
                <p>
                  Aplikasi menggunakan pustaka <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-800 dark:text-slate-200">mysql2/promise</code> yang mendukung koneksi asinkron (Promise/Async-Await) berkecepatan tinggi serta mendukung prepared statements untuk keamanan dari SQL Injection.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-500" /> 3. Variabel Environment (.env)
                </div>
                <p>
                  Konfigurasikan variabel berikut pada server produksi Anda:
                </p>
                <pre className="p-2 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto">
{`DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=secret
DB_NAME=${database}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skrip SQL Schema Generator */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-600" /> Skrip SQL Pembuatan Tabel (MySQL Schema)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Salin skrip SQL di bawah ini dan jalankan di phpMyAdmin, MySQL Workbench, atau terminal MySQL Anda untuk membuat seluruh tabel yang dibutuhkan.
            </p>
          </div>
          <button
            type="button"
            onClick={copyToClipboard}
            className="py-2.5 px-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shrink-0 shadow-sm"
          >
            {copiedSql ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" /> Berhasil Disalin!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Salin Skrip SQL
              </>
            )}
          </button>
        </div>

        <div className="relative">
          <pre className="p-5 bg-slate-950 text-emerald-300 rounded-2xl font-mono text-xs overflow-x-auto max-h-96 leading-relaxed border border-slate-800">
            {sqlSchemaCode}
          </pre>
        </div>
      </div>

      {/* Modal Panduan Instalasi VPS */}
      {showVpsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">
                    Panduan Lengkap Instalasi & Deployment di VPS
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ubuntu 22.04 / 24.04 LTS • Node.js v20 • PM2 • Reverse Proxy • SSL HTTPS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVpsModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Alert Camera & SSL */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                  <strong>Penting untuk Fitur Kamera & Scan QR:</strong> Browser ponsel dan desktop hanya mengizinkan akses kamera jika aplikasi diakses melalui protokol <strong>HTTPS (SSL)</strong>. Pastikan Anda menyelesaikan langkah SSL (Certbot) di bawah ini.
                </div>
              </div>

              {/* Web Server Switcher */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pilih Reverse Proxy Server:
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setVpsWebServer('nginx')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      vpsWebServer === 'nginx'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    Nginx (Rekomendasi)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVpsWebServer('apache')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      vpsWebServer === 'apache'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    Apache2
                  </button>
                </div>
              </div>

              {/* Step 1 */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                  Update Sistem & Instal Node.js v20 LTS + PM2
                </h4>
                <div className="relative">
                  <pre className="p-4 bg-slate-950 text-slate-100 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
{`# 1. Update paket Ubuntu/Debian
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip ufw ${vpsWebServer === 'nginx' ? 'nginx' : 'apache2'}

# 2. Instal Node.js v20 LTS resmi
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Instal PM2 global
sudo npm install -g pm2`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      const cmd = `sudo apt update && sudo apt upgrade -y\nsudo apt install -y curl git unzip ufw ${vpsWebServer === 'nginx' ? 'nginx' : 'apache2'}\ncurl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\nsudo apt install -y nodejs\nsudo npm install -g pm2`;
                      navigator.clipboard.writeText(cmd);
                      setCopiedCmd('step1');
                      onShowToast('Perintah Langkah 1 disalin ke clipboard!', 'success');
                      setTimeout(() => setCopiedCmd(''), 2500);
                    }}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                  >
                    {copiedCmd === 'step1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCmd === 'step1' ? 'Disalin' : 'Salin'}
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  Upload & Kompilasi (Build) Aplikasi di VPS
                </h4>
                <div className="relative">
                  <pre className="p-4 bg-slate-950 text-slate-100 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
{`# 1. Buat folder aplikasi
sudo mkdir -p /var/www/presensi
sudo chown -R $USER:$USER /var/www/presensi
cd /var/www/presensi

# 2. Salin kode (via Git atau upload file ZIP dari menu Settings > Export to ZIP)
# Jika upload ZIP: unzip presensi.zip

# 3. Instal dependensi dan build
npm install
npm run build`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      const cmd = `sudo mkdir -p /var/www/presensi\nsudo chown -R $USER:$USER /var/www/presensi\ncd /var/www/presensi\nnpm install\nnpm run build`;
                      navigator.clipboard.writeText(cmd);
                      setCopiedCmd('step2');
                      onShowToast('Perintah Langkah 2 disalin ke clipboard!', 'success');
                      setTimeout(() => setCopiedCmd(''), 2500);
                    }}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                  >
                    {copiedCmd === 'step2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCmd === 'step2' ? 'Disalin' : 'Salin'}
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                  Jalankan Server dengan PM2 (Background Daemon)
                </h4>
                <div className="relative">
                  <pre className="p-4 bg-slate-950 text-slate-100 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
{`# Jalankan server aplikasi di port 3000 (Pilih salah satu):
NODE_ENV=production PORT=3000 pm2 start dist/server.cjs --name "presensi-sekolah"
# Atau: NODE_ENV=production PORT=3000 pm2 start "npx tsx server.ts" --name "presensi-sekolah"

# Simpan dan aktifkan auto-start saat VPS reboot
pm2 save
pm2 startup`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      const cmd = `NODE_ENV=production PORT=3000 pm2 start dist/server.cjs --name "presensi-sekolah"\npm2 save\npm2 startup`;
                      navigator.clipboard.writeText(cmd);
                      setCopiedCmd('step3');
                      onShowToast('Perintah Langkah 3 disalin ke clipboard!', 'success');
                      setTimeout(() => setCopiedCmd(''), 2500);
                    }}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                  >
                    {copiedCmd === 'step3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCmd === 'step3' ? 'Disalin' : 'Salin'}
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">4</span>
                  Konfigurasi Web Server ({vpsWebServer === 'nginx' ? 'Nginx Reverse Proxy' : 'Apache2 Reverse Proxy'})
                </h4>
                {vpsWebServer === 'nginx' ? (
                  <div className="relative">
                    <pre className="p-4 bg-slate-950 text-slate-100 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
{`# 1. Buat file virtual host Nginx
sudo nano /etc/nginx/sites-available/presensi

# 2. Masukkan konfigurasi ini (ganti domain dengan milik Anda):
server {
    listen 80;
    server_name presensi.sekolah.sch.id; # atau IP VPS Anda

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 3. Aktifkan dan reload Nginx
sudo ln -s /etc/nginx/sites-available/presensi /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx`}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        const cmd = `sudo ln -s /etc/nginx/sites-available/presensi /etc/nginx/sites-enabled/\nsudo rm -f /etc/nginx/sites-enabled/default\nsudo nginx -t\nsudo systemctl restart nginx`;
                        navigator.clipboard.writeText(cmd);
                        setCopiedCmd('step4');
                        onShowToast('Perintah Nginx disalin ke clipboard!', 'success');
                        setTimeout(() => setCopiedCmd(''), 2500);
                      }}
                      className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                    >
                      {copiedCmd === 'step4' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCmd === 'step4' ? 'Disalin' : 'Salin'}
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <pre className="p-4 bg-slate-950 text-slate-100 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
{`# 1. Aktifkan modul proxy Apache
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite headers ssl

# 2. Buat konfigurasi vhost
sudo nano /etc/apache2/sites-available/presensi.conf

# 3. Isi konfigurasi vhost:
<VirtualHost *:80>
    ServerName presensi.sekolah.sch.id
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
</VirtualHost>

# 4. Aktifkan site dan reload Apache
sudo a2ensite presensi.conf
sudo apache2ctl configtest
sudo systemctl restart apache2`}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        const cmd = `sudo a2enmod proxy proxy_http proxy_wstunnel rewrite headers ssl\nsudo a2ensite presensi.conf\nsudo apache2ctl configtest\nsudo systemctl restart apache2`;
                        navigator.clipboard.writeText(cmd);
                        setCopiedCmd('step4');
                        onShowToast('Perintah Apache disalin ke clipboard!', 'success');
                        setTimeout(() => setCopiedCmd(''), 2500);
                      }}
                      className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                    >
                      {copiedCmd === 'step4' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCmd === 'step4' ? 'Disalin' : 'Salin'}
                    </button>
                  </div>
                )}
              </div>

              {/* Step 5 */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">5</span>
                  Pasang SSL Gratis (HTTPS) dengan Certbot
                </h4>
                <div className="relative">
                  <pre className="p-4 bg-slate-950 text-slate-100 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
{vpsWebServer === 'nginx'
  ? `sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d presensi.sekolah.sch.id`
  : `sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d presensi.sekolah.sch.id`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      const cmd = vpsWebServer === 'nginx'
                        ? `sudo apt install -y certbot python3-certbot-nginx\nsudo certbot --nginx -d presensi.sekolah.sch.id`
                        : `sudo apt install -y certbot python3-certbot-apache\nsudo certbot --apache -d presensi.sekolah.sch.id`;
                      navigator.clipboard.writeText(cmd);
                      setCopiedCmd('step5');
                      onShowToast('Perintah Certbot SSL disalin ke clipboard!', 'success');
                      setTimeout(() => setCopiedCmd(''), 2500);
                    }}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                  >
                    {copiedCmd === 'step5' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCmd === 'step5' ? 'Disalin' : 'Salin'}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Dokumentasi lengkap juga tersedia di <strong>PANDUAN_INSTALL_VPS.md</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setShowVpsModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
