import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  HardDrive,
  ShieldCheck,
  Server,
  RefreshCw,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Clock,
  Database,
  Users,
  Building,
  GraduationCap,
  Sparkles,
  Layers,
  ArrowRight,
  FileCode,
  RotateCcw,
  Cloud,
  CloudUpload,
  CloudDownload,
  ExternalLink,
  LogOut,
  Check
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppData, Siswa, Kelas, Jurusan, WaliKelas, BackupScheduleConfig } from '../../types';
import { getTodayString, getIndonesianTimeString, formatDateIndo } from '../../utils/helpers';
import {
  initGoogleAuth,
  signInWithGoogle,
  signOutGoogle,
  getCurrentGoogleUser,
  uploadBackupToGoogleDrive,
  listDriveBackups,
  downloadDriveBackupContent,
  deleteDriveBackupFile,
  DriveBackupItem,
} from '../../services/googleDriveService';

interface BackupRestoreModalContentProps {
  appData: AppData;
  onUpdateAppData: (updated: AppData) => void;
  onCloseModal: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onConfirmModal?: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
  onRestoreDemoData?: () => void;
  onResetPresensiData?: () => void;
  onResetAllData?: () => void;
}

interface FileInspectionResult {
  fileName: string;
  fileSize: string;
  isValid: boolean;
  schoolName?: string;
  exportedAt?: string;
  stats: {
    siswaCount: number;
    kelasCount: number;
    jurusanCount: number;
    waliCount: number;
    presensiDaysCount: number;
    presensiEntriesCount: number;
  };
  parsedData: any;
  errorMsg?: string;
}

interface ServerSnapshot {
  id: string;
  createdAt: string;
  timestamp?: number;
  category?: string;
  note: string;
  schoolName?: string;
  fileSize?: string;
  stats?: {
    totalSiswa?: number;
    totalKelas?: number;
    totalWaliKelas?: number;
    datesCount?: number;
    recordsCount?: number;
  };
}

export const BackupRestoreModalContent: React.FC<BackupRestoreModalContentProps> = ({
  appData,
  onUpdateAppData,
  onCloseModal,
  onShowToast,
  onConfirmModal,
  onRestoreDemoData,
  onResetPresensiData,
  onResetAllData,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'googledrive' | 'restore' | 'maintenance'>('backup');
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');

  // File Upload / Inspection
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<FileInspectionResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Snapshots on Local Server
  const [snapshots, setSnapshots] = useState<ServerSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [snapshotNote, setSnapshotNote] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [isCleaningCache, setIsCleaningCache] = useState(false);

  const handleCleanServerCache = async () => {
    setIsCleaningCache(true);
    try {
      const res = await fetch('/api/server/cache-clean', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        onShowToast(json.message || 'Cache sistem dan memori server berhasil dibersihkan!', 'success');
        try {
          const syncRes = await fetch('/api/global-state?force=true');
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.appData) {
              onUpdateAppData(syncData.appData);
            }
          }
        } catch (e) {}
      } else {
        onShowToast('Gagal membersihkan cache server: ' + (json.message || ''), 'error');
      }
    } catch (err: any) {
      onShowToast('Gagal menghubungi server untuk membersihkan cache', 'error');
    } finally {
      setIsCleaningCache(false);
    }
  };

  // Google Drive Integration State
  const [googleUser, setGoogleUser] = useState<User | null>(getCurrentGoogleUser());
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveBackups, setDriveBackups] = useState<DriveBackupItem[]>([]);
  const [isLoadingDriveBackups, setIsLoadingDriveBackups] = useState(false);
  const [driveNote, setDriveNote] = useState('');
  
  // Google Drive Auto-Backup Config
  const [autoDriveEnabled, setAutoDriveEnabled] = useState<boolean>(
    appData.backupConfig?.googleDriveAutoBackup ?? true
  );
  const [autoDriveFreq, setAutoDriveFreq] = useState<'daily' | 'on_save' | 'weekly'>(
    appData.backupConfig?.googleDriveAutoFrequency ?? 'daily'
  );
  const [autoDriveTime, setAutoDriveTime] = useState<string>(
    appData.backupConfig?.googleDriveDailyTime ?? '23:00'
  );
  const [isSavingDriveConfig, setIsSavingDriveConfig] = useState(false);

  // Live Database Statistics
  const currentStats = React.useMemo(() => {
    const siswaCount = Array.isArray(appData?.siswa) ? appData.siswa.length : 0;
    const kelasCount = Array.isArray(appData?.kelas) ? appData.kelas.length : 0;
    const jurusanCount = Array.isArray(appData?.jurusan) ? appData.jurusan.length : 0;
    const guruCount = Array.isArray(appData?.waliKelas) ? appData.waliKelas.length : 0;
    const presensiKeys = appData?.presensi ? Object.keys(appData.presensi) : [];
    let presensiEntries = 0;
    if (appData?.presensi) {
      for (const k of presensiKeys) {
        if (Array.isArray(appData.presensi[k])) {
          presensiEntries += appData.presensi[k].length;
        }
      }
    }

    return {
      siswaCount,
      kelasCount,
      jurusanCount,
      guruCount,
      presensiDays: presensiKeys.length,
      presensiEntries,
    };
  }, [appData]);

  // Initialize Google Auth Listener
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user) => {
        setGoogleUser(user);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch data when switching tabs
  useEffect(() => {
    if (activeTab === 'backup') {
      fetchServerSnapshots();
    } else if (activeTab === 'googledrive' && googleUser) {
      fetchDriveBackups();
    }
  }, [activeTab, googleUser]);

  const fetchServerSnapshots = async () => {
    setIsLoadingSnapshots(true);
    try {
      const res = await fetch('/api/backup/snapshots');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.snapshots)) {
          setSnapshots(json.snapshots);
        }
      }
    } catch (e) {
      console.warn('Gagal memuat daftar snapshot server:', e);
    } finally {
      setIsLoadingSnapshots(false);
    }
  };

  const fetchDriveBackups = async () => {
    setIsLoadingDriveBackups(true);
    try {
      const items = await listDriveBackups();
      setDriveBackups(items);
    } catch (err) {
      console.warn('Gagal memuat cadangan Google Drive:', err);
    } finally {
      setIsLoadingDriveBackups(false);
    }
  };

  // Google Login Handler
  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    try {
      const result = await signInWithGoogle();
      setGoogleUser(result.user);
      onShowToast(`Berhasil terhubung ke Google Drive (${result.user.email})!`, 'success');
      fetchDriveBackups();
    } catch (err: any) {
      onShowToast(`Gagal menghubungkan Google Drive: ${err?.message || 'Izin dibatalkan'}`, 'error');
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  // Google Sign Out Handler
  const handleGoogleSignOut = async () => {
    try {
      await signOutGoogle();
      setGoogleUser(null);
      setDriveBackups([]);
      onShowToast('Tautan akun Google Drive telah dilepas.', 'info');
    } catch (err: any) {
      onShowToast(`Gagal keluar: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Upload Manual Backup to Google Drive
  const handleUploadToDrive = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!googleUser) {
      onShowToast('Silakan Masuk dengan Google terlebih dahulu.', 'warning');
      return;
    }

    setIsUploadingToDrive(true);
    try {
      const note = driveNote.trim() || `Cadangan Manual (${getTodayString()})`;
      const res = await uploadBackupToGoogleDrive(appData, {
        note,
        isAuto: false,
      });

      // Update backup metadata in appData
      const updatedConfig: BackupScheduleConfig = {
        ...(appData.backupConfig || {
          autoBackupEnabled: true,
          frequency: 'daily',
          dailyTime: '23:00',
          weeklyDay: 6,
          weeklyTime: '22:00',
          monthlyDay: 1,
          monthlyTime: '23:00',
          retentionDaily: 7,
          retentionWeekly: 4,
          retentionMonthly: 12,
        }),
        googleDriveAutoBackup: autoDriveEnabled,
        googleDriveAutoFrequency: autoDriveFreq,
        googleDriveDailyTime: autoDriveTime,
        lastGoogleDriveBackup: `${getTodayString()} ${getIndonesianTimeString(new Date(), false)} WIB`,
        lastGoogleDriveFileId: res.fileId,
      };

      onUpdateAppData({
        ...appData,
        backupConfig: updatedConfig,
      });

      setDriveNote('');
      onShowToast(`Cadangan "${res.fileName}" berhasil disimpan di Google Drive!`, 'success');
      fetchDriveBackups();
    } catch (err: any) {
      onShowToast(`Gagal mencadangkan ke Google Drive: ${err?.message || 'Error koneksi'}`, 'error');
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  // Save Auto-Backup to Drive Config
  const handleSaveAutoDriveConfig = async () => {
    setIsSavingDriveConfig(true);
    try {
      const updatedConfig: BackupScheduleConfig = {
        ...(appData.backupConfig || {
          autoBackupEnabled: true,
          frequency: 'daily',
          dailyTime: '23:00',
          weeklyDay: 6,
          weeklyTime: '22:00',
          monthlyDay: 1,
          monthlyTime: '23:00',
          retentionDaily: 7,
          retentionWeekly: 4,
          retentionMonthly: 12,
        }),
        googleDriveAutoBackup: autoDriveEnabled,
        googleDriveAutoFrequency: autoDriveFreq,
        googleDriveDailyTime: autoDriveTime,
      };

      onUpdateAppData({
        ...appData,
        backupConfig: updatedConfig,
      });

      onShowToast('Pengaturan pencadangan otomatis Google Drive berhasil disimpan!', 'success');
    } catch (err: any) {
      onShowToast(`Gagal menyimpan: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsSavingDriveConfig(false);
    }
  };

  // Restore Directly from Google Drive Backup File
  const handleRestoreFromDrive = (item: DriveBackupItem) => {
    const doRestore = async () => {
      setIsProcessing(true);
      try {
        const rawJson = await downloadDriveBackupContent(item.id);
        const incoming = rawJson.data || rawJson.appData || rawJson;

        const mergedAppData: AppData = {
          ...appData,
          ...incoming,
          sekolah: incoming.sekolah || appData.sekolah,
          siswa: Array.isArray(incoming.siswa) ? incoming.siswa : appData.siswa,
          kelas: Array.isArray(incoming.kelas) ? incoming.kelas : appData.kelas,
          jurusan: Array.isArray(incoming.jurusan) ? incoming.jurusan : appData.jurusan,
          waliKelas: Array.isArray(incoming.waliKelas) ? incoming.waliKelas : appData.waliKelas,
          presensi: incoming.presensi || {},
        };

        onUpdateAppData(mergedAppData);
        onShowToast(`Database berhasil dipulihkan dari Google Drive ("${item.name}")!`, 'success');
        onCloseModal();
      } catch (err: any) {
        onShowToast(`Gagal memulihkan dari Google Drive: ${err?.message || 'Error'}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Pulihkan Data dari Google Drive?',
        `Apakah Anda yakin ingin memulihkan seluruh database dari berkas Google Drive "${item.name}"? Data yang belum dicadangkan akan diperbarui.`,
        'warning',
        doRestore
      );
    } else {
      doRestore();
    }
  };

  // Delete Backup File from Google Drive
  const handleDeleteFromDrive = (item: DriveBackupItem) => {
    const doDelete = async () => {
      try {
        await deleteDriveBackupFile(item.id);
        onShowToast(`Berkas "${item.name}" berhasil dihapus dari Google Drive.`, 'info');
        fetchDriveBackups();
      } catch (err: any) {
        onShowToast(`Gagal menghapus berkas: ${err?.message || 'Error'}`, 'error');
      }
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Hapus Cadangan di Google Drive?',
        `Apakah Anda yakin ingin menghapus berkas "${item.name}" dari Google Drive Anda? Tindakan ini tidak dapat dibatalkan.`,
        'danger',
        doDelete
      );
    } else {
      doDelete();
    }
  };

  // Safe file downloader for Local PC
  const triggerSafeDownload = (dataToExport: any, filename: string) => {
    try {
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = filename;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      setTimeout(() => {
        document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(url);
      }, 100);
      onShowToast(`Berkas cadangan "${filename}" berhasil diunduh!`, 'success');
    } catch (err: any) {
      onShowToast(`Gagal mengunduh cadangan: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Download Backup to local PC
  const handleDownloadBackup = (type: 'full' | 'presensi_only' = 'full', format: 'json' | 'bak' = 'json') => {
    const today = getTodayString();
    const timeNow = getIndonesianTimeString(new Date(), false).replace(/:/g, '');
    const schoolName = (appData.sekolah?.nama || 'Presensi').replace(/[^a-zA-Z0-9_-]/g, '_');

    let payload: any = {
      _backupMetadata: {
        system: 'Sistem Presensi Siswa',
        version: '3.5',
        type,
        exportedAt: `${today} ${getIndonesianTimeString(new Date(), true)} WIB`,
        timestamp: Date.now(),
        schoolName: appData.sekolah?.nama || '',
        stats: currentStats,
      },
    };

    if (type === 'presensi_only') {
      payload = {
        ...payload,
        presensi: appData.presensi || {},
        siswa: (appData.siswa || []).map((s) => ({ id: s.id, nisn: s.nisn, nama: s.nama, kelasId: s.kelasId })),
        kelas: appData.kelas || [],
      };
    } else {
      payload = {
        ...payload,
        ...appData,
      };
    }

    const typeLabel = type === 'presensi_only' ? 'Presensi' : 'Full';
    const fileName = `Backup_${typeLabel}_${schoolName}_${today.replace(/-/g, '')}_${timeNow}.${format}`;
    triggerSafeDownload(payload, fileName);
  };

  // Create Snapshot on Server
  const handleCreateSnapshot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsCreatingSnapshot(true);
    try {
      const note = snapshotNote.trim() || `Titik Pemulihan Manual (${getTodayString()})`;
      const res = await fetch('/api/backup/create-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note,
          category: 'manual',
          appData,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onShowToast('Titik pemulihan berhasil disimpan ke server!', 'success');
        setSnapshotNote('');
        fetchServerSnapshots();
      } else {
        onShowToast(json.message || 'Gagal membuat titik pemulihan.', 'error');
      }
    } catch (err: any) {
      onShowToast(`Gagal: ${err?.message || 'Koneksi bermasalah'}`, 'error');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Restore Snapshot from Server
  const handleRestoreSnapshot = (snapshot: ServerSnapshot) => {
    const doRestore = async () => {
      setIsProcessing(true);
      try {
        const res = await fetch(`/api/backup/restore-snapshot/${snapshot.id}`, { method: 'POST' });
        const json = await res.json();
        if (json.success && json.restoredData) {
          onUpdateAppData(json.restoredData);
          onShowToast(`Database berhasil dipulihkan dari snapshot "${snapshot.note}"!`, 'success');
          onCloseModal();
        } else {
          onShowToast(json.message || 'Gagal memulihkan snapshot.', 'error');
        }
      } catch (err: any) {
        onShowToast(`Gagal memulihkan: ${err?.message || 'Error'}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Pulihkan dari Titik Pemulihan?',
        `Apakah Anda yakin ingin memulihkan database ke kondisi snapshot "${snapshot.note}" (${snapshot.createdAt})? Data yang belum dicadangkan akan tertimpa.`,
        'warning',
        doRestore
      );
    } else {
      doRestore();
    }
  };

  // Delete Snapshot
  const handleDeleteSnapshot = async (id: string, note: string) => {
    const doDelete = async () => {
      try {
        const res = await fetch(`/api/backup/delete-snapshot/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          onShowToast('Titik pemulihan berhasil dihapus.', 'info');
          fetchServerSnapshots();
        } else {
          onShowToast(json.message || 'Gagal menghapus snapshot.', 'error');
        }
      } catch (err: any) {
        onShowToast(`Gagal: ${err?.message || 'Error'}`, 'error');
      }
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Hapus Titik Pemulihan?',
        `Hapus snapshot "${note}" dari server secara permanen?`,
        'danger',
        doDelete
      );
    } else {
      doDelete();
    }
  };

  // File Inspection for Local Restore
  const inspectBackupFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object') {
          setInspection({
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(1)} KB`,
            isValid: false,
            stats: { siswaCount: 0, kelasCount: 0, jurusanCount: 0, waliCount: 0, presensiDaysCount: 0, presensiEntriesCount: 0 },
            parsedData: null,
            errorMsg: 'Format berkas tidak valid atau rusak.',
          });
          return;
        }

        const rawData = parsed.data || parsed.appData || parsed;
        const meta = parsed._backupMetadata || rawData._backupMetadata;

        const siswaCount = Array.isArray(rawData.siswa) ? rawData.siswa.length : 0;
        const kelasCount = Array.isArray(rawData.kelas) ? rawData.kelas.length : 0;
        const jurusanCount = Array.isArray(rawData.jurusan) ? rawData.jurusan.length : 0;
        const waliCount = Array.isArray(rawData.waliKelas) ? rawData.waliKelas.length : 0;

        const presensiMap = rawData.presensi || {};
        const presensiDaysCount = Object.keys(presensiMap).length;
        let presensiEntriesCount = 0;
        for (const k of Object.keys(presensiMap)) {
          if (Array.isArray(presensiMap[k])) {
            presensiEntriesCount += presensiMap[k].length;
          }
        }

        const hasAnyContent = siswaCount > 0 || kelasCount > 0 || presensiDaysCount > 0;

        if (!hasAnyContent) {
          setInspection({
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(1)} KB`,
            isValid: false,
            stats: { siswaCount, kelasCount, jurusanCount, waliCount, presensiDaysCount, presensiEntriesCount },
            parsedData: null,
            errorMsg: 'Berkas tidak memuat data siswa, kelas, atau presensi yang valid.',
          });
          return;
        }

        setInspection({
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          isValid: true,
          schoolName: meta?.schoolName || rawData.sekolah?.nama || 'Sekolah Terdaftar',
          exportedAt: meta?.exportedAt || 'Waktu tidak tertera',
          stats: { siswaCount, kelasCount, jurusanCount, waliCount, presensiDaysCount, presensiEntriesCount },
          parsedData: rawData,
        });
      } catch (err: any) {
        setInspection({
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          isValid: false,
          stats: { siswaCount: 0, kelasCount: 0, jurusanCount: 0, waliCount: 0, presensiDaysCount: 0, presensiEntriesCount: 0 },
          parsedData: null,
          errorMsg: `Gagal membaca berkas: ${err?.message || 'Bukan format JSON yang valid'}`,
        });
      }
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      inspectBackupFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      inspectBackupFile(e.target.files[0]);
    }
  };

  // Execute Restore from Local File
  const handleExecuteRestore = () => {
    if (!inspection || !inspection.isValid || !inspection.parsedData) {
      onShowToast('Silakan pilih berkas cadangan yang valid terlebih dahulu.', 'warning');
      return;
    }

    const doRestore = async () => {
      setIsProcessing(true);
      try {
        const incoming = inspection.parsedData;
        let mergedAppData: AppData;

        if (restoreMode === 'replace') {
          mergedAppData = {
            ...appData,
            ...incoming,
            sekolah: incoming.sekolah || appData.sekolah,
            siswa: Array.isArray(incoming.siswa) ? incoming.siswa : appData.siswa,
            kelas: Array.isArray(incoming.kelas) ? incoming.kelas : appData.kelas,
            jurusan: Array.isArray(incoming.jurusan) ? incoming.jurusan : appData.jurusan,
            waliKelas: Array.isArray(incoming.waliKelas) ? incoming.waliKelas : appData.waliKelas,
            presensi: incoming.presensi || {},
          };
        } else {
          // Merge mode
          const mergedPresensi = { ...(appData.presensi || {}), ...(incoming.presensi || {}) };
          mergedAppData = {
            ...appData,
            sekolah: { ...(appData.sekolah || {}), ...(incoming.sekolah || {}) },
            presensi: mergedPresensi,
          };
        }

        onUpdateAppData(mergedAppData);
        onShowToast('Database aplikasi berhasil dipulihkan!', 'success');
        onCloseModal();
      } catch (err: any) {
        onShowToast(`Gagal memulihkan data: ${err?.message || 'Error'}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Konfirmasi Pemulihan Database',
        `Pulihkan data dari berkas "${inspection.fileName}"? (${inspection.stats.siswaCount} Siswa, ${inspection.stats.presensiEntriesCount} Presensi). Tindakan ini akan memperbarui data sistem.`,
        'warning',
        doRestore
      );
    } else {
      doRestore();
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex bg-slate-100 dark:bg-slate-800/70 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Cadangkan (Backup)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('googledrive')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'googledrive'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Cloud className="w-4 h-4 text-indigo-500" />
          <span>Google Drive Cloud</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('restore')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'restore'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Pulihkan (Restore)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('maintenance')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'maintenance'
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset &amp; Demo</span>
        </button>
      </div>

      {/* TAB 1: BACKUP (LOCAL & SERVER SNAPSHOTS) */}
      {activeTab === 'backup' && (
        <div className="space-y-5">
          {/* Status Database Ringkas */}
          <div className="bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-cyan-500/5 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                <span>Status Data Terkini: <strong className="text-slate-900 dark:text-white">{appData.sekolah?.nama || 'Sekolah'}</strong></span>
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Database Siap
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-base font-black text-slate-900 dark:text-white">{currentStats.siswaCount}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Siswa</div>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-base font-black text-slate-900 dark:text-white">{currentStats.kelasCount}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Kelas</div>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-base font-black text-slate-900 dark:text-white">{currentStats.guruCount}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Guru &amp; Wali</div>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-base font-black text-blue-600 dark:text-blue-400">{currentStats.presensiEntries}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Catatan Presensi</div>
              </div>
            </div>
          </div>

          {/* Opsi Unduh 1-Klik */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-blue-500" />
                <span>Unduh File Cadangan ke Komputer / HP</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Simpan cadangan lengkap ke format JSON atau BAK untuk disimpan di flashdisk atau arsip lokal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDownloadBackup('full', 'json')}
                className="flex items-center justify-between p-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-[13px]">Unduh Full Backup (.json)</div>
                    <div className="text-[10px] text-blue-100">Semua Siswa, Guru, Kelas &amp; Presensi</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => handleDownloadBackup('presensi_only', 'json')}
                className="flex items-center justify-between p-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-[13px]">Unduh Presensi Saja</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Hanya rekam kehadiran &amp; jurnal</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-slate-400" />
              </button>
            </div>
          </div>

          {/* Titik Pemulihan Server (Snapshot) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                <Server className="w-4 h-4 text-emerald-500" />
                <span>Titik Pemulihan Server Lokal (Snapshot)</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Simpan status database saat ini ke server agar dapat dipulihkan sewaktu-waktu dengan 1-klik.
              </p>
            </div>

            <form onSubmit={handleCreateSnapshot} className="flex gap-2">
              <input
                type="text"
                value={snapshotNote}
                onChange={(e) => setSnapshotNote(e.target.value)}
                placeholder="Catatan snapshot (contoh: Sebelum Ujian Semester)..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isCreatingSnapshot}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              >
                {isCreatingSnapshot ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Simpan Titik Pemulihan</span>
              </button>
            </form>

            {/* List Snapshots */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Daftar Snapshot Server ({snapshots.length})
              </div>

              {isLoadingSnapshots ? (
                <div className="p-4 text-center text-xs text-slate-400">Memuat snapshot server...</div>
              ) : snapshots.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  Belum ada snapshot tersimpan. Klik "Simpan Titik Pemulihan" di atas untuk membuat cadangan pertama.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {snapshots.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <span>{s.note}</span>
                          <span className="text-[10px] font-mono text-slate-400">{s.fileSize || ''}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>{s.createdAt}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRestoreSnapshot(s)}
                          disabled={isProcessing}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold transition cursor-pointer"
                          title="Pulihkan data dari snapshot ini"
                        >
                          Pulihkan
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSnapshot(s.id, s.note)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                          title="Hapus snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE DRIVE CLOUD (MANUAL & OTOMATIS) */}
      {activeTab === 'googledrive' && (
        <div className="space-y-5">
          {/* Header Card: Google Auth Connection */}
          <div className="bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-sky-500/10 dark:from-indigo-950/40 dark:to-blue-950/30 p-5 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center shadow-xs shrink-0">
                  <svg className="w-7 h-7" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Google Drive Cloud Backup</span>
                    {googleUser && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        Terhubung
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {googleUser
                      ? `Akun aktif: ${googleUser.email || googleUser.displayName || 'Google User'}`
                      : 'Hubungkan akun Google Drive Anda untuk pencadangan cloud yang aman & dapat diakses kapan saja.'}
                  </p>
                </div>
              </div>

              <div>
                {googleUser ? (
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Putuskan Akun</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSigningInGoogle}
                    onClick={handleGoogleSignIn}
                    className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    {isSigningInGoogle ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                    )}
                    <span>Sign in with Google</span>
                  </button>
                )}
              </div>
            </div>

            {/* Status Folder Khusus */}
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              <Cloud className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                Berkas disimpan rapi di Google Drive pada folder: <strong className="font-mono text-indigo-600 dark:text-indigo-400">Presensi_Siswa_Backup</strong>
              </span>
            </div>
          </div>

          {/* Section 1: Cadangkan Manual Sekarang */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                  <CloudUpload className="w-4 h-4 text-indigo-500" />
                  <span>1. Cadangkan ke Google Drive Secara Manual</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Unggah snapshot data saat ini langsung ke Google Drive hanya dengan satu klik.
                </p>
              </div>
            </div>

            <form onSubmit={handleUploadToDrive} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                disabled={!googleUser || isUploadingToDrive}
                value={driveNote}
                onChange={(e) => setDriveNote(e.target.value)}
                placeholder={googleUser ? 'Catatan cadangan (opsional, contoh: Rekap Akhir Bulan)...' : 'Masuk dengan Google terlebih dahulu untuk mencadangkan...'}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!googleUser || isUploadingToDrive}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap"
              >
                {isUploadingToDrive ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4" />
                )}
                <span>Cadangkan ke Google Drive Sekarang</span>
              </button>
            </form>
          </div>

          {/* Section 2: Cadangkan Otomatis ke Google Drive */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>2. Cadangkan ke Google Drive Secara Otomatis</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Sistem akan secara otomatis menyinkronkan cadangan terbaru ke Google Drive sesuai jadwal pilihan Anda.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-white">
                    Aktifkan Pencadangan Otomatis Google Drive
                  </label>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Otomatis membuat dan mengunggah backup ke folder Google Drive saat akun terhubung.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDriveEnabled}
                    onChange={(e) => setAutoDriveEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {autoDriveEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Frekuensi Otomatis:
                    </label>
                    <select
                      value={autoDriveFreq}
                      onChange={(e) => setAutoDriveFreq(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="daily">Harian (Setiap Hari pada jam pilihan)</option>
                      <option value="on_save">Setiap Kali Data Presensi Disimpan</option>
                      <option value="weekly">Mingguan (Setiap Akhir Pekan)</option>
                    </select>
                  </div>

                  {autoDriveFreq === 'daily' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Jam Eksekusi Harian (WIB):
                      </label>
                      <input
                        type="time"
                        value={autoDriveTime}
                        onChange={(e) => setAutoDriveTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="text-[10px] text-slate-400">
                  Cadangan Cloud Terakhir: <strong className="text-slate-600 dark:text-slate-300">{appData.backupConfig?.lastGoogleDriveBackup || 'Belum ada'}</strong>
                </div>
                <button
                  type="button"
                  disabled={isSavingDriveConfig}
                  onClick={handleSaveAutoDriveConfig}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Simpan Jadwal Otomatis
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Daftar Berkas Cadangan di Google Drive */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                  <CloudDownload className="w-4 h-4 text-emerald-500" />
                  <span>3. Daftar Berkas Cadangan di Google Drive ({driveBackups.length})</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Pilih salah satu cadangan di Google Drive untuk dipulihkan ke aplikasi kapan saja.
                </p>
              </div>

              {googleUser && (
                <button
                  type="button"
                  onClick={fetchDriveBackups}
                  disabled={isLoadingDriveBackups}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Segarkan daftar Google Drive"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingDriveBackups ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {!googleUser ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <div>Hubungkan Google Drive untuk melihat daftar berkas cadangan cloud Anda.</div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Sign in with Google
                </button>
              </div>
            ) : isLoadingDriveBackups ? (
              <div className="p-6 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                <span>Memuat berkas dari Google Drive...</span>
              </div>
            ) : driveBackups.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                Belum ada berkas cadangan di Google Drive. Klik tombol "Cadangkan ke Google Drive Sekarang" di atas untuk membuat cadangan cloud pertama.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                {driveBackups.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="truncate max-w-[280px] sm:max-w-md">{item.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">{item.size}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 pl-6">
                        <Clock className="w-3 h-3" />
                        <span>Dibuat: {item.createdTime ? new Date(item.createdTime).toLocaleString('id-ID') : '-'}</span>
                        {item.description && (
                          <span className="italic text-slate-500">• {item.description}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pl-6 sm:pl-0">
                      <button
                        type="button"
                        onClick={() => handleRestoreFromDrive(item)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1"
                        title="Pulihkan database dari berkas Google Drive ini"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Pulihkan</span>
                      </button>

                      {item.webViewLink && (
                        <a
                          href={item.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                          title="Buka di Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteFromDrive(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Hapus cadangan dari Google Drive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RESTORE (LOCAL FILE) */}
      {activeTab === 'restore' && (
        <div className="space-y-5">
          {/* Dropzone Area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.bak"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">
              Pilih atau Seret Berkas Cadangan (.json / .bak)
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Klik untuk memilih berkas dari perangkat komputer atau HP Anda
            </p>
          </div>

          {/* Pratinjau Berkas */}
          {inspection && (
            <div className={`p-4 rounded-2xl border ${
              inspection.isValid
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {inspection.isValid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {inspection.fileName} ({inspection.fileSize})
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {inspection.schoolName} • Dibuat: {inspection.exportedAt}
                    </div>
                  </div>
                </div>
              </div>

              {inspection.isValid ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                      <div className="font-extrabold text-slate-800 dark:text-slate-100">{inspection.stats.siswaCount}</div>
                      <div className="text-[10px] text-slate-400">Siswa</div>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                      <div className="font-extrabold text-slate-800 dark:text-slate-100">{inspection.stats.kelasCount}</div>
                      <div className="text-[10px] text-slate-400">Kelas</div>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                      <div className="font-extrabold text-emerald-600 dark:text-emerald-400">{inspection.stats.presensiEntriesCount}</div>
                      <div className="text-[10px] text-slate-400">Presensi</div>
                    </div>
                  </div>

                  {/* Mode Pilihan */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      Metode Pemulihan:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRestoreMode('replace')}
                        className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                          restoreMode === 'replace'
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="font-bold">Timpa Semua (Rekomendasi)</div>
                        <div className="text-[10px] opacity-80 mt-0.5">Ganti seluruh database dengan isi backup</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRestoreMode('merge')}
                        className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                          restoreMode === 'merge'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="font-bold">Gabungkan (Merge)</div>
                        <div className="text-[10px] opacity-80 mt-0.5">Satukan catatan presensi yang belum ada</div>
                      </button>
                    </div>
                  </div>

                  {/* Tombol Eksekusi */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleExecuteRestore}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Pulihkan Database Sekarang</span>
                  </button>
                </div>
              ) : (
                <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {inspection.errorMsg}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RESET & MAINTENANCE */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="p-4 bg-rose-500/5 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Area Tindakan Sensitif</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Gunakan opsi pemeliharaan di bawah ini untuk membersihkan data atau mengatur ulang aplikasi ke kondisi awal jika diperlukan.
            </p>
          </div>

          <div className="space-y-3">
            {/* Bersihkan Cache & Sinkronkan Server */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${isCleaningCache ? 'animate-spin' : ''}`} />
                  <span>Bersihkan Cache Memori & Sinkronkan Server</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Mengosongkan cache memori sementara, telemetri, dan memuat ulang data terbaru langsung dari database MySQL.
                </div>
              </div>
              <button
                type="button"
                disabled={isCleaningCache}
                onClick={handleCleanServerCache}
                className="px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isCleaningCache ? 'animate-spin' : ''}`} />
                <span>{isCleaningCache ? 'Membersihkan...' : 'Bersihkan Cache'}</span>
              </button>
            </div>

            {/* Muat Ulang Demo */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold text-slate-800 dark:text-white">
                  Muat Ulang Data Demo Sekolah
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Mengembalikan dataset sekolah contoh (jurusan, kelas, siswa, guru, jadwal &amp; presensi demo).
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onRestoreDemoData) onRestoreDemoData();
                  else onShowToast('Fungsi muat demo siap dijalankan.', 'info');
                }}
                className="px-3.5 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
              >
                Muat Demo
              </button>
            </div>

            {/* Kosongkan Presensi */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold text-slate-800 dark:text-white">
                  Kosongkan Riwayat Presensi
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Menghapus semua catatan absensi harian tanpa menghapus data master siswa, kelas, dan guru.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onResetPresensiData) onResetPresensiData();
                  else onShowToast('Fungsi reset presensi siap dijalankan.', 'info');
                }}
                className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
              >
                Kosongkan Presensi
              </button>
            </div>

            {/* Reset Total */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                  Reset Database Pabrik (Factory Reset)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Membersihkan seluruh database lokal dan mengembalikan pengaturan sistem ke awal.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onResetAllData) onResetAllData();
                  else onShowToast('Fungsi reset total siap dijalankan.', 'info');
                }}
                className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shadow-xs"
              >
                Reset Total
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
