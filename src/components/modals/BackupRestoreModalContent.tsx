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
  Calendar,
  Users,
  Building,
  GraduationCap,
  X,
  FileCode,
  ShieldAlert,
  ArrowRight,
  Settings,
  Play,
  Check,
  Filter,
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { AppData, Siswa, Kelas, Jurusan, WaliKelas, BackupScheduleConfig, BackupFrequency } from '../../types';
import { getTodayString, saveAppData, commitAppDataToServer, getIndonesianTimeString, formatDateIndo } from '../../utils/helpers';

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
  isPartial: boolean;
  schoolName?: string;
  exportedAt?: string;
  stats: {
    siswaCount: number;
    kelasCount: number;
    jurusanCount: number;
    waliCount: number;
    presensiDaysCount: number;
    presensiEntriesCount: number;
    pelanggaranCount: number;
    homeVisitCount: number;
  };
  parsedData: any;
  errorMsg?: string;
}

interface ServerSnapshot {
  id: string;
  createdAt: string;
  timestamp?: number;
  category?: 'daily' | 'weekly' | 'monthly' | 'manual';
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
  const [activeTab, setActiveTab] = useState<'download' | 'schedule' | 'snapshots' | 'restore' | 'maintenance'>('download');
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge' | 'presensi_only'>('replace');

  // File Inspector State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<FileInspectionResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Server Snapshots State
  const [snapshots, setSnapshots] = useState<ServerSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [snapshotCategoryFilter, setSnapshotCategoryFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'manual'>('all');
  const [snapshotNote, setSnapshotNote] = useState('');
  const [snapshotCategoryInput, setSnapshotCategoryInput] = useState<'manual' | 'daily' | 'weekly' | 'monthly'>('manual');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Schedule Config State
  const [scheduleConfig, setScheduleConfig] = useState<BackupScheduleConfig>({
    autoBackupEnabled: true,
    frequency: 'all',
    dailyTime: '23:00',
    weeklyDay: 6, // Sabtu
    weeklyTime: '22:00',
    monthlyDay: 1, // Tanggal 1
    monthlyTime: '23:00',
    retentionDaily: 7,
    retentionWeekly: 4,
    retentionMonthly: 12,
    ...(appData.backupConfig || {}),
  });
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isTriggeringCycle, setIsTriggeringCycle] = useState<string | null>(null);

  // Calculate live database stats for Backup Card
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
    const pelanggaranCount = Array.isArray(appData?.pelanggaran) ? appData.pelanggaran.length : 0;
    const homeVisitCount = Array.isArray(appData?.homeVisits) ? appData.homeVisits.length : 0;

    return {
      siswaCount,
      kelasCount,
      jurusanCount,
      guruCount,
      presensiDays: presensiKeys.length,
      presensiEntries,
      pelanggaranCount,
      homeVisitCount,
    };
  }, [appData]);

  // Load snapshots & config
  useEffect(() => {
    if (activeTab === 'snapshots' || activeTab === 'schedule') {
      fetchServerSnapshots();
    }
    if (activeTab === 'schedule') {
      fetchScheduleConfig();
    }
  }, [activeTab]);

  const fetchScheduleConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await fetch('/api/backup/schedule-config');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.config) {
          setScheduleConfig(json.config);
        }
      }
    } catch (e) {
      console.warn('Gagal memuat konfigurasi jadwal backup:', e);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleSaveScheduleConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/backup/schedule-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleConfig),
      });
      const json = await res.json();
      if (json.success) {
        onShowToast('Pengaturan jadwal pencadangan otomatis berhasil disimpan!', 'success');
        // Update parent appData
        onUpdateAppData({
          ...appData,
          backupConfig: json.config || scheduleConfig,
        });
      } else {
        onShowToast(json.message || 'Gagal menyimpan pengaturan jadwal.', 'error');
      }
    } catch (err: any) {
      onShowToast(`Gagal menyimpan: ${err?.message || 'Error koneksi'}`, 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTriggerCycle = async (category: 'daily' | 'weekly' | 'monthly') => {
    setIsTriggeringCycle(category);
    try {
      const labels: Record<string, string> = {
        daily: 'Cadangan Harian',
        weekly: 'Cadangan Mingguan',
        monthly: 'Cadangan Bulanan',
      };
      const res = await fetch('/api/backup/trigger-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          note: `Cadangan Manual Siklus [${labels[category]}] (${getTodayString()})`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onShowToast(`Pencadangan siklus ${labels[category]} berhasil dibuat!`, 'success');
        if (json.config) setScheduleConfig(json.config);
        fetchServerSnapshots();
      } else {
        onShowToast(json.message || 'Gagal memicu siklus pencadangan.', 'error');
      }
    } catch (err: any) {
      onShowToast(`Gagal eksekusi cadangan: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsTriggeringCycle(null);
    }
  };

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

  // Safe file downloader using Blob and URL.createObjectURL
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

  // Download Backup by Type
  const handleDownloadBackup = (type: 'full' | 'daily' | 'weekly' | 'monthly' | 'master_only' | 'presensi_only', format: 'bak' | 'json' = 'bak') => {
    const today = getTodayString();
    const timeNow = getIndonesianTimeString(new Date(), false).replace(/:/g, '');
    const schoolName = (appData.sekolah?.nama || 'Presensi').replace(/[^a-zA-Z0-9_-]/g, '_');

    let presensiFiltered: any = {};
    const allPresensi = appData.presensi || {};

    if (type === 'daily') {
      if (allPresensi[today]) presensiFiltered[today] = allPresensi[today];
    } else if (type === 'weekly') {
      const dates = Object.keys(allPresensi).sort().slice(-7);
      for (const d of dates) presensiFiltered[d] = allPresensi[d];
    } else if (type === 'monthly') {
      const dates = Object.keys(allPresensi).sort().slice(-31);
      for (const d of dates) presensiFiltered[d] = allPresensi[d];
    } else if (type === 'presensi_only') {
      presensiFiltered = allPresensi;
    }

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

    if (type === 'master_only') {
      payload = {
        ...payload,
        sekolah: appData.sekolah,
        admin: appData.admin,
        jurusan: appData.jurusan,
        waliKelas: appData.waliKelas,
        kelas: appData.kelas,
        siswa: appData.siswa,
        shiftConfig: appData.shiftConfig,
        jadwalMengajar: appData.jadwalMengajar,
        violationTemplates: appData.violationTemplates,
      };
    } else if (type === 'presensi_only') {
      payload = {
        ...payload,
        presensi: allPresensi,
        siswa: (appData.siswa || []).map((s) => ({ id: s.id, nisn: s.nisn, nama: s.nama, kelasId: s.kelasId })),
        kelas: appData.kelas || [],
      };
    } else if (type === 'daily' || type === 'weekly' || type === 'monthly') {
      payload = {
        ...payload,
        ...appData,
        presensi: presensiFiltered,
      };
    } else {
      // Full database
      payload = {
        ...payload,
        ...appData,
      };
    }

    const typePrefix =
      type === 'daily'
        ? 'Harian'
        : type === 'weekly'
        ? 'Mingguan'
        : type === 'monthly'
        ? 'Bulanan'
        : type === 'master_only'
        ? 'Master'
        : type === 'presensi_only'
        ? 'Presensi'
        : 'Full';

    const fileName = `Backup_${typePrefix}_${schoolName}_${today.replace(/-/g, '')}_${timeNow}.${format}`;
    triggerSafeDownload(payload, fileName);
  };

  // Inspect uploaded file before restoring
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
            isPartial: false,
            stats: { siswaCount: 0, kelasCount: 0, jurusanCount: 0, waliCount: 0, presensiDaysCount: 0, presensiEntriesCount: 0, pelanggaranCount: 0, homeVisitCount: 0 },
            parsedData: null,
            errorMsg: 'Format berkas tidak valid atau bukan berkas JSON/BAK yang benar.',
          });
          return;
        }

        // Handle wrapped data (e.g. { data: ... } or { appData: ... } or raw AppData)
        const rawData = parsed.data || parsed.appData || parsed;
        const meta = parsed._backupMetadata || rawData._backupMetadata;

        const siswaCount = Array.isArray(rawData.siswa) ? rawData.siswa.length : 0;
        const kelasCount = Array.isArray(rawData.kelas) ? rawData.kelas.length : 0;
        const jurusanCount = Array.isArray(rawData.jurusan) ? rawData.jurusan.length : 0;
        const waliCount = Array.isArray(rawData.waliKelas) ? rawData.waliKelas.length : 0;
        const presensiMap = rawData.presensi || {};
        const presensiKeys = typeof presensiMap === 'object' ? Object.keys(presensiMap) : [];
        let presensiEntries = 0;
        for (const k of presensiKeys) {
          if (Array.isArray(presensiMap[k])) presensiEntries += presensiMap[k].length;
        }
        const pelanggaranCount = Array.isArray(rawData.pelanggaran) ? rawData.pelanggaran.length : 0;
        const homeVisitCount = Array.isArray(rawData.homeVisits) ? rawData.homeVisits.length : 0;

        const hasAnyValidData = rawData.sekolah || siswaCount > 0 || kelasCount > 0 || presensiKeys.length > 0;
        const isPartial = meta?.type === 'presensi_only' || meta?.type === 'master_only' || (!rawData.sekolah && presensiKeys.length > 0);

        if (!hasAnyValidData) {
          setInspection({
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(1)} KB`,
            isValid: false,
            isPartial: false,
            stats: { siswaCount: 0, kelasCount: 0, jurusanCount: 0, waliCount: 0, presensiDaysCount: 0, presensiEntriesCount: 0, pelanggaranCount: 0, homeVisitCount: 0 },
            parsedData: null,
            errorMsg: 'Berkas tidak memuat tabel data sekolah, siswa, kelas, maupun presensi.',
          });
          return;
        }

        setInspection({
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          isValid: true,
          isPartial,
          schoolName: meta?.schoolName || rawData.sekolah?.nama || 'Presensi Sekolah',
          exportedAt: meta?.exportedAt || 'Tidak tercatat',
          stats: {
            siswaCount,
            kelasCount,
            jurusanCount,
            waliCount,
            presensiDaysCount: presensiKeys.length,
            presensiEntriesCount: presensiEntries,
            pelanggaranCount,
            homeVisitCount,
          },
          parsedData: rawData,
        });

        // If backup was presensi only, default restoreMode to presensi_only
        if (meta?.type === 'presensi_only') {
          setRestoreMode('presensi_only');
        }
      } catch (err: any) {
        setInspection({
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          isValid: false,
          isPartial: false,
          stats: { siswaCount: 0, kelasCount: 0, jurusanCount: 0, waliCount: 0, presensiDaysCount: 0, presensiEntriesCount: 0, pelanggaranCount: 0, homeVisitCount: 0 },
          parsedData: null,
          errorMsg: `Gagal membaca berkas: ${err?.message || 'Format JSON rusak'}`,
        });
      }
    };

    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      inspectBackupFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      inspectBackupFile(file);
    }
  };

  // Perform Execute Restore
  const handleExecuteRestore = () => {
    if (!inspection || !inspection.isValid || !inspection.parsedData) {
      onShowToast('Pilih berkas cadangan yang valid terlebih dahulu.', 'warning');
      return;
    }

    const modeLabels: Record<string, string> = {
      replace: 'Ganti / Timpa Seluruh Data (Full Replace)',
      merge: 'Gabungkan Data (Smart Merge)',
      presensi_only: 'Hanya Pulihkan Riwayat Presensi',
    };

    const runRestore = async () => {
      setIsProcessing(true);
      try {
        const incoming = inspection.parsedData;
        let finalData: AppData;

        if (restoreMode === 'presensi_only') {
          finalData = {
            ...appData,
            presensi: { ...(incoming.presensi || {}) },
          };
        } else if (restoreMode === 'merge') {
          const mergeArray = (base: any[] = [], inc: any[] = [], key = 'id') => {
            const map = new Map<string, any>();
            for (const item of base) {
              if (item && item[key]) map.set(String(item[key]), item);
            }
            for (const item of inc) {
              if (item && item[key]) map.set(String(item[key]), { ...(map.get(String(item[key])) || {}), ...item });
            }
            return Array.from(map.values());
          };

          finalData = {
            ...appData,
            sekolah: { ...(appData.sekolah || {}), ...(incoming.sekolah || {}) },
            admin: incoming.admin || appData.admin,
            jurusan: mergeArray(appData.jurusan, incoming.jurusan, 'id'),
            waliKelas: mergeArray(appData.waliKelas, incoming.waliKelas, 'id'),
            kelas: mergeArray(appData.kelas, incoming.kelas, 'id'),
            siswa: mergeArray(appData.siswa, incoming.siswa, 'id'),
            pelanggaran: mergeArray(appData.pelanggaran, incoming.pelanggaran, 'id'),
            homeVisits: mergeArray(appData.homeVisits, incoming.homeVisits, 'id'),
            presensi: {
              ...(appData.presensi || {}),
              ...(incoming.presensi || {}),
            },
            shiftConfig: incoming.shiftConfig || appData.shiftConfig,
            jadwalMengajar: incoming.jadwalMengajar || appData.jadwalMengajar,
          };
        } else {
          // Full replace
          finalData = {
            ...appData,
            ...incoming,
            sekolah: incoming.sekolah || appData.sekolah,
            admin: incoming.admin || appData.admin,
            jurusan: Array.isArray(incoming.jurusan) ? incoming.jurusan : appData.jurusan,
            waliKelas: Array.isArray(incoming.waliKelas) ? incoming.waliKelas : appData.waliKelas,
            kelas: Array.isArray(incoming.kelas) ? incoming.kelas : appData.kelas,
            siswa: Array.isArray(incoming.siswa) ? incoming.siswa : appData.siswa,
            presensi: incoming.presensi || {},
            pelanggaran: Array.isArray(incoming.pelanggaran) ? incoming.pelanggaran : [],
            homeVisits: Array.isArray(incoming.homeVisits) ? incoming.homeVisits : [],
          };
        }

        // 1. Commit to React state & LocalStorage
        onUpdateAppData(finalData);
        saveAppData(finalData);

        // 2. Call server restore API to immediately sync disk cache and MySQL
        try {
          await fetch('/api/backup/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ backupData: finalData, mode: restoreMode }),
          });
        } catch (e) {
          await commitAppDataToServer(finalData);
        }

        onCloseModal();
        onShowToast(
          `Data berhasil dipulihkan dari "${inspection.fileName}" dengan mode ${modeLabels[restoreMode]}!`,
          'success'
        );
      } catch (err: any) {
        onShowToast(`Gagal memulihkan database: ${err?.message || 'Error'}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Konfirmasi Pemulihan Data',
        `Apakah Anda yakin ingin memulihkan database dari berkas "${inspection.fileName}" menggunakan mode [${modeLabels[restoreMode]}]? Data sistem saat ini akan diperbarui.`,
        'warning',
        runRestore
      );
    } else {
      runRestore();
    }
  };

  // Create Server Snapshot
  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingSnapshot(true);
    try {
      const res = await fetch('/api/backup/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: snapshotCategoryInput,
          note: snapshotNote.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onShowToast(json.message || 'Snapshot server berhasil dibuat!', 'success');
        setSnapshotNote('');
        fetchServerSnapshots();
      } else {
        onShowToast(json.message || 'Gagal membuat snapshot server.', 'error');
      }
    } catch (err: any) {
      onShowToast(`Gagal membuat snapshot: ${err?.message || 'Error koneksi'}`, 'error');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Restore from Server Snapshot
  const handleRestoreSnapshot = (snap: ServerSnapshot) => {
    const doRestore = async () => {
      setIsProcessing(true);
      try {
        const res = await fetch('/api/backup/snapshot/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshotId: snap.id }),
        });
        const json = await res.json();
        if (json.success && json.appData) {
          onUpdateAppData(json.appData);
          saveAppData(json.appData);
          onCloseModal();
          onShowToast(json.message || 'Snapshot berhasil dipulihkan!', 'success');
        } else {
          onShowToast(json.message || 'Gagal memulihkan snapshot.', 'error');
        }
      } catch (err: any) {
        onShowToast(`Gagal memulihkan snapshot: ${err?.message || 'Error'}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Pulihkan Titik Cadangan Server',
        `Apakah Anda yakin ingin mengembalikan seluruh database ke kondisi snapshot "${snap.note || snap.id}" (${snap.createdAt})?`,
        'warning',
        doRestore
      );
    } else {
      doRestore();
    }
  };

  // Delete Server Snapshot
  const handleDeleteSnapshot = (snapId: string) => {
    const doDelete = async () => {
      try {
        const res = await fetch(`/api/backup/snapshot/${snapId}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          onShowToast('Snapshot server berhasil dihapus.', 'info');
          setSnapshots((prev) => prev.filter((s) => s.id !== snapId));
        } else {
          onShowToast(json.message || 'Gagal menghapus snapshot.', 'error');
        }
      } catch (err: any) {
        onShowToast(`Gagal menghapus snapshot: ${err?.message || 'Error'}`, 'error');
      }
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Hapus Snapshot Server',
        'Apakah Anda yakin ingin menghapus berkas snapshot ini dari server?',
        'danger',
        doDelete
      );
    } else {
      doDelete();
    }
  };

  // Filtered Snapshots
  const filteredSnapshots = snapshots.filter((s) => {
    if (snapshotCategoryFilter === 'all') return true;
    return s.category === snapshotCategoryFilter;
  });

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'daily':
        return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold">Harian (Daily)</span>;
      case 'weekly':
        return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-bold">Mingguan (Weekly)</span>;
      case 'monthly':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">Bulanan (Monthly)</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-bold">Manual</span>;
    }
  };

  const daysName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  return (
    <div className="space-y-4 text-xs">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab('download')}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'download'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Unduh Berkas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Jadwal Otomatis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('snapshots')}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'snapshots'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Snapshot Server</span>
          {snapshots.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
              {snapshots.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('restore')}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'restore'
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Pulihkan (Restore)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('maintenance')}
          className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'maintenance'
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset &amp; Demo</span>
        </button>
      </div>

      {/* TAB 1: UNDUH CADANGAN MANUAL (DOWNLOAD BACKUP BY PERIOD) */}
      {activeTab === 'download' && (
        <div className="space-y-4">
          {/* Header Summary */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl dark:bg-slate-800/80 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold shrink-0">
                  <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {appData.sekolah?.nama || 'Sistem Presensi Siswa'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Unduh file arsip cadangan database sesuai periode waktu yang Anda butuhkan (Harian, Mingguan, Bulanan, atau Penuh).
                  </p>
                </div>
              </div>

              {/* Badges count */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  👥 {currentStats.siswaCount} Siswa
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  🏢 {currentStats.kelasCount} Kelas
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  📅 {currentStats.presensiDays} Hari Presensi
                </span>
              </div>
            </div>
          </div>

          {/* Backup Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Daily Backup */}
            <div className="p-3.5 bg-white dark:bg-slate-900/80 rounded-2xl border border-blue-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-blue-300 dark:hover:border-slate-700 transition">
              <div>
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold mb-2">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <h5 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs mb-1">
                  Cadangan Harian (Daily)
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                  Menyimpan seluruh master data ditambah riwayat presensi hari ini ({getTodayString()}).
                </p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDownloadBackup('daily', 'bak')}
                  className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-[11px] cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Unduh Harian (.BAK)</span>
                </button>
              </div>
            </div>

            {/* 2. Weekly Backup */}
            <div className="p-3.5 bg-white dark:bg-slate-900/80 rounded-2xl border border-purple-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-purple-300 dark:hover:border-slate-700 transition">
              <div>
                <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold mb-2">
                  <CalendarDays className="w-3.5 h-3.5" />
                </div>
                <h5 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs mb-1">
                  Cadangan Mingguan (Weekly)
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                  Menyimpan master data lengkap beserta catatan presensi 7 hari terakhir.
                </p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDownloadBackup('weekly', 'bak')}
                  className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-[11px] cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Unduh Mingguan (.BAK)</span>
                </button>
              </div>
            </div>

            {/* 3. Monthly Backup */}
            <div className="p-3.5 bg-white dark:bg-slate-900/80 rounded-2xl border border-emerald-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-emerald-300 dark:hover:border-slate-700 transition">
              <div>
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <h5 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs mb-1">
                  Cadangan Bulanan (Monthly)
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                  Menyimpan master data lengkap beserta catatan presensi 1 bulan (30 hari) terakhir.
                </p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDownloadBackup('monthly', 'bak')}
                  className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-[11px] cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Unduh Bulanan (.BAK)</span>
                </button>
              </div>
            </div>

            {/* 4. Full System Backup */}
            <div className="p-3.5 bg-white dark:bg-slate-900/80 rounded-2xl border border-indigo-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-slate-700 transition">
              <div>
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold mb-2">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <h5 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs mb-1">
                  Cadangan Lengkap (Full)
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                  Seluruh tabel database tanpa terkecuali (Akun, Siswa, Guru, Semua Presensi, Pelanggaran, dll).
                </p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDownloadBackup('full', 'bak')}
                  className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-[11px] cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Unduh Penuh (.BAK)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadBackup('full', 'json')}
                  className="w-full py-1 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition flex items-center justify-center gap-1.5 text-[10px] cursor-pointer"
                >
                  <FileCode className="w-3 h-3" />
                  <span>Format .JSON</span>
                </button>
              </div>
            </div>

            {/* 5. Master Data Saja */}
            <div className="p-3.5 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold mb-2">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <h5 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs mb-1">
                  Master Data Saja
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                  Struktur sekolah, kelas, siswa, guru, shift, tanpa riwayat presensi harian.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDownloadBackup('master_only', 'bak')}
                  className="w-full py-1.5 px-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-[11px] cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Unduh Master (.BAK)</span>
                </button>
              </div>
            </div>

            {/* 6. Presensi Saja */}
            <div className="p-3.5 bg-white dark:bg-slate-900/80 rounded-2xl border border-amber-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <h5 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs mb-1">
                  Riwayat Presensi Saja
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                  Menyimpan seluruh catatan kehadiran siswa ({currentStats.presensiDays} hari, {currentStats.presensiEntries} entri).
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDownloadBackup('presensi_only', 'bak')}
                  className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-[11px] cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Unduh Presensi (.BAK)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JADWAL PENCADANGAN OTOMATIS (AUTO-BACKUP SCHEDULER) */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Main Scheduler Form */}
          <form onSubmit={handleSaveScheduleConfig} className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center font-bold shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                    Pengaturan Mesin Backup Otomatis
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sistem server akan otomatis mencadangkan data secara berkala sesuai jam dan hari yang Anda tentukan.
                  </p>
                </div>
              </div>

              {/* Status Switch Toggle */}
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-300">
                <span>Status Otomatis:</span>
                <input
                  type="checkbox"
                  checked={scheduleConfig.autoBackupEnabled}
                  onChange={(e) => setScheduleConfig((prev) => ({ ...prev, autoBackupEnabled: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
                <span className={scheduleConfig.autoBackupEnabled ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}>
                  {scheduleConfig.autoBackupEnabled ? 'AKTIF' : 'NONAKTIF'}
                </span>
              </label>
            </div>

            {/* Frequency Configuration Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* 1. Daily Setting */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Siklus Harian (Daily)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Tiap Hari</span>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Jam Eksekusi (WIB):
                  </label>
                  <input
                    type="time"
                    value={scheduleConfig.dailyTime}
                    onChange={(e) => setScheduleConfig((prev) => ({ ...prev, dailyTime: e.target.value }))}
                    className="w-full py-1.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Retensi Penyimpanan:
                  </label>
                  <select
                    value={scheduleConfig.retentionDaily}
                    onChange={(e) => setScheduleConfig((prev) => ({ ...prev, retentionDaily: Number(e.target.value) }))}
                    className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-800 dark:text-slate-100"
                  >
                    <option value={3}>Simpan 3 hari terakhir</option>
                    <option value={7}>Simpan 7 hari terakhir (Standar)</option>
                    <option value={14}>Simpan 14 hari terakhir</option>
                    <option value={30}>Simpan 30 hari terakhir</option>
                  </select>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isTriggeringCycle === 'daily'}
                    onClick={() => handleTriggerCycle('daily')}
                    className="w-full py-1 px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-bold rounded-lg text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5" />
                    <span>{isTriggeringCycle === 'daily' ? 'Memproses...' : 'Cadangkan Harian Sekarang'}</span>
                  </button>
                </div>
              </div>

              {/* 2. Weekly Setting */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Siklus Mingguan (Weekly)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Tiap Minggu</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Hari:
                    </label>
                    <select
                      value={scheduleConfig.weeklyDay}
                      onChange={(e) => setScheduleConfig((prev) => ({ ...prev, weeklyDay: Number(e.target.value) }))}
                      className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-800 dark:text-slate-100"
                    >
                      {daysName.map((d, idx) => (
                        <option key={idx} value={idx}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Jam:
                    </label>
                    <input
                      type="time"
                      value={scheduleConfig.weeklyTime}
                      onChange={(e) => setScheduleConfig((prev) => ({ ...prev, weeklyTime: e.target.value }))}
                      className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Retensi Penyimpanan:
                  </label>
                  <select
                    value={scheduleConfig.retentionWeekly}
                    onChange={(e) => setScheduleConfig((prev) => ({ ...prev, retentionWeekly: Number(e.target.value) }))}
                    className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-800 dark:text-slate-100"
                  >
                    <option value={4}>Simpan 4 minggu terakhir (1 Bulan)</option>
                    <option value={8}>Simpan 8 minggu terakhir (2 Bulan)</option>
                    <option value={12}>Simpan 12 minggu terakhir (3 Bulan)</option>
                  </select>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isTriggeringCycle === 'weekly'}
                    onClick={() => handleTriggerCycle('weekly')}
                    className="w-full py-1 px-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-bold rounded-lg text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5" />
                    <span>{isTriggeringCycle === 'weekly' ? 'Memproses...' : 'Cadangkan Mingguan Sekarang'}</span>
                  </button>
                </div>
              </div>

              {/* 3. Monthly Setting */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Siklus Bulanan (Monthly)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Tiap Bulan</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Tanggal:
                    </label>
                    <select
                      value={scheduleConfig.monthlyDay}
                      onChange={(e) => setScheduleConfig((prev) => ({ ...prev, monthlyDay: Number(e.target.value) }))}
                      className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-800 dark:text-slate-100"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((tgl) => (
                        <option key={tgl} value={tgl}>Tgl {tgl}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Jam:
                    </label>
                    <input
                      type="time"
                      value={scheduleConfig.monthlyTime}
                      onChange={(e) => setScheduleConfig((prev) => ({ ...prev, monthlyTime: e.target.value }))}
                      className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Retensi Penyimpanan:
                  </label>
                  <select
                    value={scheduleConfig.retentionMonthly}
                    onChange={(e) => setScheduleConfig((prev) => ({ ...prev, retentionMonthly: Number(e.target.value) }))}
                    className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-800 dark:text-slate-100"
                  >
                    <option value={6}>Simpan 6 bulan terakhir</option>
                    <option value={12}>Simpan 12 bulan terakhir (1 Tahun)</option>
                    <option value={24}>Simpan 24 bulan terakhir (2 Tahun)</option>
                  </select>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isTriggeringCycle === 'monthly'}
                    onClick={() => handleTriggerCycle('monthly')}
                    className="w-full py-1 px-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold rounded-lg text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5" />
                    <span>{isTriggeringCycle === 'monthly' ? 'Memproses...' : 'Cadangkan Bulanan Sekarang'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Execution History Cards */}
            <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[11px] space-y-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300 block text-[10px]">
                Riwayat Pencadangan Terakhir yang Berhasil:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Siklus Harian</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{scheduleConfig.lastDailyBackup || 'Belum berjalan'}</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Siklus Mingguan</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{scheduleConfig.lastWeeklyBackup || 'Belum berjalan'}</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Siklus Bulanan</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{scheduleConfig.lastMonthlyBackup || 'Belum berjalan'}</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Manual Terakhir</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{scheduleConfig.lastManualBackup || 'Belum berjalan'}</span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSavingConfig}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 text-xs cursor-pointer"
              >
                {isSavingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Simpan Konfigurasi Jadwal</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: TITIK PEMULIHAN SERVER (SERVER SNAPSHOTS) */}
      {activeTab === 'snapshots' && (
        <div className="space-y-4">
          {/* Create Snapshot Form */}
          <form
            onSubmit={handleCreateSnapshot}
            className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl dark:bg-slate-800/80 dark:border-slate-700 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold shrink-0">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                  Buat Titik Pemulihan (Snapshot Server) Instan
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Simpan cadangan langsung ke drive penyimpanan server untuk pemulihan cepat sewaktu-waktu.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
              <div className="sm:col-span-3">
                <select
                  value={snapshotCategoryInput}
                  onChange={(e: any) => setSnapshotCategoryInput(e.target.value)}
                  className="w-full py-2 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100"
                >
                  <option value="manual">Kategori: Manual</option>
                  <option value="daily">Kategori: Harian (Daily)</option>
                  <option value="weekly">Kategori: Mingguan (Weekly)</option>
                  <option value="monthly">Kategori: Bulanan (Monthly)</option>
                </select>
              </div>
              <div className="sm:col-span-6">
                <input
                  type="text"
                  value={snapshotNote}
                  onChange={(e) => setSnapshotNote(e.target.value)}
                  placeholder="Catatan / Label (Contoh: Sebelum Perubahan Data Siswa)"
                  className="w-full py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={isCreatingSnapshot}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                >
                  {isCreatingSnapshot ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Server className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan Snapshot</span>
                </button>
              </div>
            </div>
          </form>

          {/* Snapshots List with Filter */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                  Daftar Snapshot Server Tersedia ({filteredSnapshots.length})
                </span>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
                <button
                  type="button"
                  onClick={() => setSnapshotCategoryFilter('all')}
                  className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    snapshotCategoryFilter === 'all'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setSnapshotCategoryFilter('daily')}
                  className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    snapshotCategoryFilter === 'daily'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Harian
                </button>
                <button
                  type="button"
                  onClick={() => setSnapshotCategoryFilter('weekly')}
                  className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    snapshotCategoryFilter === 'weekly'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Mingguan
                </button>
                <button
                  type="button"
                  onClick={() => setSnapshotCategoryFilter('monthly')}
                  className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    snapshotCategoryFilter === 'monthly'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => setSnapshotCategoryFilter('manual')}
                  className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    snapshotCategoryFilter === 'manual'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={fetchServerSnapshots}
                  className="ml-2 text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingSnapshots ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {isLoadingSnapshots ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                <span className="text-[11px]">Memuat daftar snapshot...</span>
              </div>
            ) : filteredSnapshots.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <Server className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">Belum Ada Snapshot Server dalam Kategori Ini</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-0.5">
                  Buat snapshot menggunakan form di atas atau aktifkan jadwal backup otomatis.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredSnapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-emerald-300 dark:hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getCategoryBadge(snap.category)}
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                          {snap.note || snap.id}
                        </span>
                        {snap.fileSize && (
                          <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-medium">
                            {snap.fileSize}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {snap.createdAt} {snap.stats?.totalSiswa ? `• ${snap.stats.totalSiswa} Siswa` : ''} {snap.stats?.datesCount ? `• ${snap.stats.datesCount} Hari Presensi` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      <a
                        href={`/api/backup/snapshot/${snap.id}/download`}
                        download={`${snap.id}.bak`}
                        className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Unduh file .bak ke komputer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Unduh</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRestoreSnapshot(snap)}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Pulihkan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(snap.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                        title="Hapus Snapshot"
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

      {/* TAB 4: PULIHKAN DATA DARI BERKAS (RESTORE FILE) */}
      {activeTab === 'restore' && (
        <div className="space-y-4">
          {/* Dropzone Area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-6 rounded-2xl border-2 border-dashed text-center transition cursor-pointer flex flex-col items-center justify-center ${
              isDragging
                ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 hover:border-amber-400 hover:bg-amber-50/30'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".bak,.json,.dat,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mb-1">
              Pilih atau Seret (Drag &amp; Drop) Berkas Cadangan ke Sini
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mb-2">
              Mendukung berkas <strong>.bak</strong>, <strong>.json</strong>, atau <strong>.dat</strong> hasil ekspor sistem presensi.
            </p>
            <span className="px-3 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              Jelajahi Berkas di Komputer
            </span>
          </div>

          {/* File Inspector & Validation Summary */}
          {inspection && (
            <div className={`p-4 rounded-2xl border transition ${
              inspection.isValid
                ? 'bg-emerald-50/60 dark:bg-slate-800/80 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50/60 dark:bg-slate-800/80 border-rose-200 dark:border-rose-800'
            }`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  {inspection.isValid ? (
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    </div>
                  )}
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                      <span>{inspection.fileName}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                        ({inspection.fileSize})
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {inspection.schoolName ? `Asal: ${inspection.schoolName}` : ''} {inspection.exportedAt ? `• Waktu Backup: ${inspection.exportedAt}` : ''}
                    </p>
                  </div>
                </div>

                {/* Validation Badge */}
                <div>
                  {inspection.isValid ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Valid &amp; Siap Dipulihkan</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Format Tidak Valid</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Data Items Found Preview */}
              {inspection.isValid && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 dark:border-slate-700 text-[11px]">
                  <div className="p-2 bg-white/80 dark:bg-slate-900/60 rounded-xl">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Data Siswa</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{inspection.stats.siswaCount} Siswa</span>
                  </div>
                  <div className="p-2 bg-white/80 dark:bg-slate-900/60 rounded-xl">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Data Kelas &amp; Jurusan</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{inspection.stats.kelasCount} Kelas / {inspection.stats.jurusanCount} Jurusan</span>
                  </div>
                  <div className="p-2 bg-white/80 dark:bg-slate-900/60 rounded-xl">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Wali Kelas / Guru</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{inspection.stats.waliCount} Guru</span>
                  </div>
                  <div className="p-2 bg-white/80 dark:bg-slate-900/60 rounded-xl">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Riwayat Presensi</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{inspection.stats.presensiDaysCount} Hari ({inspection.stats.presensiEntriesCount} Entri)</span>
                  </div>
                </div>
              )}

              {inspection.errorMsg && (
                <p className="text-rose-600 dark:text-rose-400 text-[11px] font-semibold mt-1">
                  {inspection.errorMsg}
                </p>
              )}
            </div>
          )}

          {/* Restore Mode Selector */}
          {inspection && inspection.isValid && (
            <div className="p-4 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Pilih Mode Pemulihan Data:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Option 1: Replace */}
                <label
                  onClick={() => setRestoreMode('replace')}
                  className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    restoreMode === 'replace'
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs">Ganti Seluruh Data</span>
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'replace'}
                      onChange={() => setRestoreMode('replace')}
                      className="text-blue-600"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Menimpa seluruh database dengan data dari berkas cadangan (Direkomendasikan).
                  </p>
                </label>

                {/* Option 2: Smart Merge */}
                <label
                  onClick={() => setRestoreMode('merge')}
                  className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    restoreMode === 'merge'
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs">Gabung Data (Merge)</span>
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'merge'}
                      onChange={() => setRestoreMode('merge')}
                      className="text-blue-600"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Menggabungkan data baru tanpa menghapus data master yang telah ada.
                  </p>
                </label>

                {/* Option 3: Presensi Only */}
                <label
                  onClick={() => setRestoreMode('presensi_only')}
                  className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    restoreMode === 'presensi_only'
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs">Hanya Riwayat Presensi</span>
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'presensi_only'}
                      onChange={() => setRestoreMode('presensi_only')}
                      className="text-blue-600"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Hanya mengisi riwayat absensi tanpa mengubah data akun &amp; master.
                  </p>
                </label>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleExecuteRestore}
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sedang Memulihkan Database...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Mulai Proses Pemulihan Data</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: RESET & PERAWATAN SISTEM (MAINTENANCE) */}
      {activeTab === 'maintenance' && (
        <div className="space-y-3.5">
          <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl dark:bg-slate-800/80 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center font-bold shrink-0">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                  Area Perawatan &amp; Reset Data
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gunakan fasilitas ini jika Anda ingin mengosongkan data riwayat, memuat data sampel demo, atau membersihkan sistem.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Muat Ulang Demo */}
            <div className="p-3.5 bg-white dark:bg-slate-900/80 rounded-2xl border border-emerald-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Data Sampel Demo</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Isi ulang sistem dengan data bawaan sekolah, kelas, siswa, dan sampel riwayat presensi default.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onCloseModal();
                  if (onRestoreDemoData) onRestoreDemoData();
                }}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Muat Data Demo</span>
              </button>
            </div>

            {/* 2. Reset Riwayat Presensi */}
            <div className="p-3.5 bg-white dark:bg-slate-900/80 rounded-2xl border border-amber-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Reset Presensi Saja</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Hapus seluruh catatan kehadiran siswa. Data Master (Siswa, Kelas, Jurusan, Guru) tetap tersimpan aman.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onCloseModal();
                  if (onResetPresensiData) onResetPresensiData();
                }}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Reset Presensi</span>
              </button>
            </div>

            {/* 3. Reset Seluruh Data */}
            <div className="p-3.5 bg-white dark:bg-slate-900/80 rounded-2xl border border-rose-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold text-xs mb-1">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Seluruh Data</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  PERINGATAN: Membersihkan seluruh siswa, kelas, guru, dan presensi (Sistem kembali kosong total).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onCloseModal();
                  if (onResetAllData) onResetAllData();
                }}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Sistem</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Sistem Cadangan &amp; Pemulihan Terintegrasi (Otomatis &amp; Manual)</span>
        </div>
        <button
          type="button"
          onClick={onCloseModal}
          className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
