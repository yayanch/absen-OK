import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Lock, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AppData,
  UserSession,
  ViewType,
  WaliKelas,
  ThemeOption,
  PageHeaderBackgroundOption,
  SekolahConfig,
  SyncResult
} from './types';
import {
  loadAppData,
  saveAppData,
  commitAppDataToServer,
  loadSessionUser,
  saveSessionUser,
  mergeChatMessages,
  mergePelanggaran,
  mergeHomeVisits,
  mergeSiswa,
  mergePresensi,
  getTodayString
} from './utils/helpers';
import { DEMO_DATASET } from './data/initialData';

import { LoginView } from './components/LoginView';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ToastContainer, ToastMessage } from './components/ToastContainer';
import { ConfirmModal, ConfirmState } from './components/ConfirmModal';
import { GeneralModal } from './components/GeneralModal';
import { Footer } from './components/Footer';
import { BackToTop } from './components/BackToTop';

const DashboardView = React.lazy(() => import('./components/views/DashboardView').then(m => ({ default: m.DashboardView })));
const InputPresensiView = React.lazy(() => import('./components/views/InputPresensiView').then(m => ({ default: m.InputPresensiView })));
const HomeVisitView = React.lazy(() => import('./components/views/HomeVisitView').then(m => ({ default: m.HomeVisitView })));
const PelanggaranView = React.lazy(() => import('./components/views/PelanggaranView').then(m => ({ default: m.PelanggaranView })));
const EkstrakurikulerView = React.lazy(() => import('./components/views/EkstrakurikulerView').then(m => ({ default: m.EkstrakurikulerView })));
const RekapHarianView = React.lazy(() => import('./components/views/RekapHarianView').then(m => ({ default: m.RekapHarianView })));
const RekapPengisianKelasView = React.lazy(() => import('./components/views/RekapPengisianKelasView').then(m => ({ default: m.RekapPengisianKelasView })));
const RekapMingguanView = React.lazy(() => import('./components/views/RekapMingguanView').then(m => ({ default: m.RekapMingguanView })));
const RekapBulananView = React.lazy(() => import('./components/views/RekapBulananView').then(m => ({ default: m.RekapBulananView })));
const RekapKetidakhadiranTertinggiView = React.lazy(() => import('./components/views/RekapKetidakhadiranTertinggiView').then(m => ({ default: m.RekapKetidakhadiranTertinggiView })));
const MasterJurusanView = React.lazy(() => import('./components/views/MasterJurusanView').then(m => ({ default: m.MasterJurusanView })));
const MasterGuruView = React.lazy(() => import('./components/views/MasterGuruView').then(m => ({ default: m.MasterGuruView })));
const MasterMataPelajaranView = React.lazy(() => import('./components/views/MasterMataPelajaranView').then(m => ({ default: m.MasterMataPelajaranView })));
const MasterKelasView = React.lazy(() => import('./components/views/MasterKelasView').then(m => ({ default: m.MasterKelasView })));
const MasterSiswaView = React.lazy(() => import('./components/views/MasterSiswaView').then(m => ({ default: m.MasterSiswaView })));
const HariLiburView = React.lazy(() => import('./components/views/HariLiburView').then(m => ({ default: m.HariLiburView })));
const PengaturanSekolahView = React.lazy(() => import('./components/views/PengaturanSekolahView').then(m => ({ default: m.PengaturanSekolahView })));
const PengaturanTemaView = React.lazy(() => import('./components/views/PengaturanTemaView').then(m => ({ default: m.PengaturanTemaView })));
const PengaturanAdminView = React.lazy(() => import('./components/views/PengaturanAdminView').then(m => ({ default: m.PengaturanAdminView })));
const MasterUserView = React.lazy(() => import('./components/views/MasterUserView').then(m => ({ default: m.MasterUserView })));
const PengaturanRoleView = React.lazy(() => import('./components/views/PengaturanRoleView').then(m => ({ default: m.PengaturanRoleView })));
const PengaturanMenuView = React.lazy(() => import('./components/views/PengaturanMenuView').then(m => ({ default: m.PengaturanMenuView })));
const DataDemoView = React.lazy(() => import('./components/views/DataDemoView').then(m => ({ default: m.DataDemoView })));
const IntegrasiMySQLView = React.lazy(() => import('./components/views/IntegrasiMySQLView').then(m => ({ default: m.IntegrasiMySQLView })));
const DatabaseTrafficView = React.lazy(() => import('./components/views/DatabaseTrafficView').then(m => ({ default: m.DatabaseTrafficView })));
const CetakKartuQrView = React.lazy(() => import('./components/views/CetakKartuQrView').then(m => ({ default: m.CetakKartuQrView })));
const PetugasPiketView = React.lazy(() => import('./components/views/PetugasPiketView').then(m => ({ default: m.PetugasPiketView })));
const LiveChatView = React.lazy(() => import('./components/views/LiveChatView').then(m => ({ default: m.LiveChatView })));
import { LiveChatWidget } from './components/chat/LiveChatWidget';
import { OfflineView } from './components/views/OfflineView';
const PortalMuridView = React.lazy(() => import('./components/views/PortalMuridView').then(m => ({ default: m.PortalMuridView })));
const JadwalShiftView = React.lazy(() => import('./components/views/JadwalShiftView').then(m => ({ default: m.JadwalShiftView })));
const JadwalMengajarView = React.lazy(() => import('./components/views/JadwalMengajarView').then(m => ({ default: m.JadwalMengajarView })));
const JadwalMengajarMingguIniView = React.lazy(() => import('./components/views/JadwalMengajarMingguIniView').then(m => ({ default: m.JadwalMengajarMingguIniView })));
const GuruMapelKelasView = React.lazy(() => import('./components/views/GuruMapelKelasView').then(m => ({ default: m.GuruMapelKelasView })));
const AuditLogsView = React.lazy(() => import('./components/views/AuditLogsView').then(m => ({ default: m.AuditLogsView })));
const IntrusionDetectionView = React.lazy(() => import('./components/views/IntrusionDetectionView').then(m => ({ default: m.IntrusionDetectionView })));
const ServerMonitoringView = React.lazy(() => import('./components/views/ServerMonitoringView').then(m => ({ default: m.ServerMonitoringView })));
const UserLoginMonitoringView = React.lazy(() => import('./components/views/UserLoginMonitoringView').then(m => ({ default: m.UserLoginMonitoringView })));
const WhatsAppGatewayView = React.lazy(() => import('./components/views/WhatsAppGatewayView').then(m => ({ default: m.WhatsAppGatewayView })));

import { BackupRestoreModalContent } from './components/modals/BackupRestoreModalContent';
import { ServerQrDisplayModal } from './components/modals/ServerQrDisplayModal';
import { hasMenuAccess } from './utils/rolePermissionEngine';
import { getAccessToken, uploadBackupToGoogleDrive } from './services/googleDriveService';

export default function App() {
  const getInitialView = (): ViewType => {
    if (typeof window !== 'undefined') {
      if (window.history.state && window.history.state.view) {
        return window.history.state.view as ViewType;
      }
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        return hash as ViewType;
      }
    }
    const savedUser = loadSessionUser();
    return 'dashboard';
  };

  const [appData, setAppData] = useState<AppData>(loadAppData);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(loadSessionUser);
  const [currentView, setCurrentView] = useState<ViewType>(getInitialView);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  const handleNavigate = (view: ViewType, replace = false) => {
    if (view === currentView) return;
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
      if (replace) {
        window.history.replaceState({ view }, '', `#${view}`);
      } else if (window.history.state?.view !== view) {
        window.history.pushState({ view }, '', `#${view}`);
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentHash = window.location.hash.replace('#', '');
    const initialView = (window.history.state?.view || currentHash || currentView) as ViewType;
    if (!window.history.state || window.history.state.view !== initialView) {
      window.history.replaceState({ view: initialView }, '', `#${initialView}`);
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setCurrentView(event.state.view as ViewType);
      } else {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
          setCurrentView(hash as ViewType);
        } else {
          setCurrentView('dashboard');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Keep currentUser in sync with the latest AppData (e.g. photo deletion/update, profile change)
  useEffect(() => {
    if (!currentUser || !currentUser.data) return;
    const currentData = currentUser.data as any;

    let updatedData: any = null;
    if (currentUser.role === 'admin') {
      if (appData.admin && (appData.admin.foto !== currentData.foto || appData.admin.nama !== currentData.nama)) {
        updatedData = { ...currentData, ...appData.admin };
      }
    } else if (currentUser.role === 'murid' || currentUser.role === 'siswa') {
      const match = (appData.siswa || []).find((s) => 
        (currentData.id && s.id === currentData.id) ||
        (currentData.nisn && s.nisn === currentData.nisn) ||
        (currentData.username && s.username === currentData.username)
      );
      if (match && (match.foto !== currentData.foto || match.nama !== currentData.nama)) {
        updatedData = { ...currentData, ...match };
      }
    } else {
      const match = (appData.waliKelas || []).find((w) => 
        (currentData.id && w.id === currentData.id) ||
        (currentData.username && String(w.username).toLowerCase() === String(currentData.username).toLowerCase()) ||
        (currentData.nip && String(w.nip).toLowerCase() === String(currentData.nip).toLowerCase())
      );
      if (match && (match.foto !== currentData.foto || match.nama !== currentData.nama)) {
        updatedData = { ...currentData, ...match };
      }
    }

    if (updatedData) {
      const nextSession: UserSession = { ...currentUser, data: updatedData };
      setCurrentUser(nextSession);
      saveSessionUser(nextSession);
    }
  }, [appData.admin, appData.siswa, appData.waliKelas]);

  const [isServerQrModalOpen, setIsServerQrModalOpen] = useState<boolean>(false);
  const [isLiveChatOpen, setIsLiveChatOpen] = useState<boolean>(false);

  // Compute unread chat count for current user at top level (Rules of Hooks)
  const unreadChatCount = React.useMemo(() => {
    if (!currentUser || !Array.isArray(appData.chatMessages)) return 0;
    const currentUsername = String((currentUser.data as any)?.username || (currentUser.data as any)?.nisn || (currentUser.data as any)?.nip || '').toLowerCase();
    const myIdVariants = [
      currentUsername,
      String((currentUser.data as any)?.nisn || '').toLowerCase(),
      String((currentUser.data as any)?.nip || '').toLowerCase(),
      String((currentUser.data as any)?.id || '').toLowerCase(),
    ].filter(Boolean);

    return appData.chatMessages.filter((m) => {
      if (m.isRead) return false;
      const recipient = String(m.recipientUsername || '').toLowerCase();
      const sender = String(m.senderUsername || '').toLowerCase();
      if (myIdVariants.includes(sender)) return false;
      if (currentUser.role === 'admin') {
        return recipient === 'admin' || recipient === 'all' || myIdVariants.includes(recipient);
      }
      return myIdVariants.includes(recipient) || recipient === 'all';
    }).length;
  }, [appData.chatMessages, currentUser]);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    // Mode mobile (layar < 768px): default SELALU collapse / tertutup
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return false;
    }
    try {
      const savedData = localStorage.getItem('presensi_app_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed?.sekolah?.sidebarBehavior === 'expanded') {
          return true;
        }
        if (parsed?.sekolah?.sidebarBehavior === 'collapsed') {
          return false;
        }
      }
    } catch (e) {}
    return false;
  });

  // Listener resize untuk memastikan mode mobile otomatis collapse jika mengecil
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [selectedInputKelasId, setSelectedInputKelasId] = useState<string | undefined>(undefined);
  const [selectedMasterSiswaQuery, setSelectedMasterSiswaQuery] = useState<string | undefined>(undefined);
  const [selectedMasterGuruQuery, setSelectedMasterGuruQuery] = useState<string | undefined>(undefined);
  const [selectedMasterKelasQuery, setSelectedMasterKelasQuery] = useState<string | undefined>(undefined);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const saveTimeoutRef = useRef<any>(null);
  const lastLocalChangeRef = useRef<number>(0);

  const triggerSaveStatus = () => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saved');
    }, 900);
  };

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [ignoreOffline, setIgnoreOffline] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIgnoreOffline(false);
      if (appData.sekolah?.showOfflineToastWarning !== false) {
        showToast('Koneksi internet kembali pulih. Sistem tersambung ke server.', 'info');
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (appData.sekolah?.showOfflineToastWarning !== false) {
        showToast('Koneksi internet terputus. Sistem beralih ke mode offline lokal.', 'warning');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [appData.sekolah?.showOfflineToastWarning]);

  // Global Realtime Sync with Server & MySQL for Dev and Preview links (with conditional 304 caching)
  const lastEtagRef = useRef<string>('');

  useEffect(() => {
    let isMounted = true;

    const fetchGlobalState = async () => {
      try {
        const host = localStorage.getItem('mysql_host') || '';
        const database = localStorage.getItem('mysql_database') || '';
        const user = localStorage.getItem('mysql_user') || '';
        const password = localStorage.getItem('mysql_password') || '';
        const port = localStorage.getItem('mysql_port') || '3306';

        const headers: Record<string, string> = {};
        if (lastEtagRef.current) {
          headers['If-None-Match'] = lastEtagRef.current;
        }
        if (host && database && user) {
          headers['x-mysql-host'] = host;
          headers['x-mysql-database'] = database;
          headers['x-mysql-user'] = user;
          headers['x-mysql-password'] = password;
          headers['x-mysql-port'] = port;
        }

        const res = await fetch('/api/global-state', { headers });
        if (res.status === 304) {
          // Data is completely unchanged, zero bytes transferred
          return;
        }
        if (!res.ok) return;

        const etag = res.headers.get('ETag');
        if (etag) {
          lastEtagRef.current = etag;
        }

        const data = await res.json();
        if (data.success && isMounted) {
          if (Date.now() - lastLocalChangeRef.current < 4000) {
            return;
          }
          if (data.appData) {
            setAppData((prev) => {
              // Merge local optimistic items to prevent data from disappearing during sync
              const mergedMessages = mergeChatMessages(prev.chatMessages, data.appData.chatMessages);
              const allDeletedPelanggaran = Array.from(new Set([...(prev.deletedPelanggaranIds || []), ...(data.appData.deletedPelanggaranIds || [])]));
              const allDeletedHomeVisits = Array.from(new Set([...(prev.deletedHomeVisitIds || []), ...(data.appData.deletedHomeVisitIds || [])]));
              const allDeletedSiswa = Array.from(new Set([...(prev.deletedSiswaIds || []), ...(data.appData.deletedSiswaIds || [])]));
              const mergedPelanggaran = mergePelanggaran(prev.pelanggaran, data.appData.pelanggaran, allDeletedPelanggaran);
              const mergedHomeVisits = mergeHomeVisits(prev.homeVisits, data.appData.homeVisits, allDeletedHomeVisits);
              const mergedSiswa = mergeSiswa(prev.siswa, data.appData.siswa, allDeletedSiswa);
              const incomingPresensi = data.appData.presensi || {};
              const isServerPresensiReset = Object.keys(incomingPresensi).length === 0 && Object.keys(prev.presensi || {}).length > 0;
              const mergedPresensi = isServerPresensiReset ? {} : mergePresensi(prev.presensi, incomingPresensi);

              // Preserve master data if server response is incomplete
              const mergedKelas = (Array.isArray(data.appData.kelas) && data.appData.kelas.length > 0) ? data.appData.kelas : prev.kelas;
              const mergedWaliKelas = (Array.isArray(data.appData.waliKelas) && data.appData.waliKelas.length > 0) ? data.appData.waliKelas : prev.waliKelas;
              const mergedJurusan = (Array.isArray(data.appData.jurusan) && data.appData.jurusan.length > 0) ? data.appData.jurusan : prev.jurusan;
              const mergedJadwal = (Array.isArray(data.appData.jadwalMengajar) && data.appData.jadwalMengajar.length > 0)
                ? data.appData.jadwalMengajar
                : (prev.jadwalMengajar || []);
              const mergedMapel = (Array.isArray(data.appData.mataPelajaran) && data.appData.mataPelajaran.length > 0)
                ? data.appData.mataPelajaran
                : (prev.mataPelajaran || []);
              const mergedGmk = (Array.isArray(data.appData.guruMapelKelas) && data.appData.guruMapelKelas.length > 0)
                ? data.appData.guruMapelKelas
                : (prev.guruMapelKelas || []);
              const mergedPmg = (Array.isArray(data.appData.presensiMengajarGuru) && data.appData.presensiMengajarGuru.length > 0)
                ? data.appData.presensiMengajarGuru
                : (prev.presensiMengajarGuru || []);
              const mergedShiftConfig = (data.appData.shiftConfig && Array.isArray(data.appData.shiftConfig.periods) && data.appData.shiftConfig.periods.length > 0)
                ? data.appData.shiftConfig
                : (prev.shiftConfig || data.appData.shiftConfig);
              const mergedHariLibur = (Array.isArray(data.appData.hariLibur) && data.appData.hariLibur.length > 0)
                ? data.appData.hariLibur
                : (prev.hariLibur || []);
              const mergedPengumuman = (Array.isArray(data.appData.pengumuman) && data.appData.pengumuman.length > 0)
                ? data.appData.pengumuman
                : (prev.pengumuman || []);
              const mergedEkskul = (Array.isArray(data.appData.ekstrakurikuler) && data.appData.ekstrakurikuler.length > 0)
                ? data.appData.ekstrakurikuler
                : (prev.ekstrakurikuler || []);
              const mergedPetugasPiket = (Array.isArray(data.appData.petugasPiket) && data.appData.petugasPiket.length > 0)
                ? data.appData.petugasPiket
                : (prev.petugasPiket || []);
              const mergedCatatanPiket = Array.isArray(data.appData.catatanPiketHarian)
                ? data.appData.catatanPiketHarian
                : (prev.catatanPiketHarian || []);
              const mergedAnggotaEkskul = (Array.isArray(data.appData.anggotaEkskul) && data.appData.anggotaEkskul.length > 0)
                ? data.appData.anggotaEkskul
                : (prev.anggotaEkskul || []);
              const mergedPresensiEkskul = (data.appData.presensiEkskul && Object.keys(data.appData.presensiEkskul).length > 0)
                ? data.appData.presensiEkskul
                : (prev.presensiEkskul || {});
              const mergedAuditLogs = (Array.isArray(data.appData.auditLogs) && data.appData.auditLogs.length > 0)
                ? data.appData.auditLogs
                : (prev.auditLogs || []);
              const mergedWhatsappLogs = (Array.isArray(data.appData.whatsappLogs) && data.appData.whatsappLogs.length > 0)
                ? data.appData.whatsappLogs
                : (prev.whatsappLogs || []);
              const mergedRolePermissions = (Array.isArray(data.appData.rolePermissions) && data.appData.rolePermissions.length > 0)
                ? data.appData.rolePermissions
                : (prev.rolePermissions || []);
              const mergedWhatsappGateway = (data.appData.whatsappGateway && Object.keys(data.appData.whatsappGateway).length > 0)
                ? data.appData.whatsappGateway
                : (prev.whatsappGateway || data.appData.whatsappGateway);
              const mergedSecurityIncidents = (Array.isArray(data.appData.securityIncidents) && data.appData.securityIncidents.length > 0)
                ? data.appData.securityIncidents
                : (prev.securityIncidents || []);
              const mergedBlockedIps = (Array.isArray(data.appData.blockedIps) && data.appData.blockedIps.length > 0)
                ? data.appData.blockedIps
                : (prev.blockedIps || []);

              const targetAppData = {
                ...data.appData,
                siswa: mergedSiswa,
                presensi: mergedPresensi,
                kelas: mergedKelas,
                waliKelas: mergedWaliKelas,
                jurusan: mergedJurusan,
                jadwalMengajar: mergedJadwal,
                mataPelajaran: mergedMapel,
                guruMapelKelas: mergedGmk,
                presensiMengajarGuru: mergedPmg,
                shiftConfig: mergedShiftConfig,
                hariLibur: mergedHariLibur,
                pengumuman: mergedPengumuman,
                ekstrakurikuler: mergedEkskul,
                petugasPiket: mergedPetugasPiket,
                catatanPiketHarian: mergedCatatanPiket,
                anggotaEkskul: mergedAnggotaEkskul,
                presensiEkskul: mergedPresensiEkskul,
                auditLogs: mergedAuditLogs,
                whatsappLogs: mergedWhatsappLogs,
                rolePermissions: mergedRolePermissions,
                whatsappGateway: mergedWhatsappGateway,
                securityIncidents: mergedSecurityIncidents,
                blockedIps: mergedBlockedIps,
                chatMessages: mergedMessages,
                pelanggaran: mergedPelanggaran,
                homeVisits: mergedHomeVisits,
                deletedPelanggaranIds: allDeletedPelanggaran,
                deletedHomeVisitIds: allDeletedHomeVisits,
                deletedSiswaIds: allDeletedSiswa,
              };
              const newStr = JSON.stringify(targetAppData);
              if (!prev || newStr.length !== JSON.stringify(prev).length || newStr !== JSON.stringify(prev)) {
                try {
                  localStorage.setItem('presensi_app_data', newStr);
                } catch (e) {}
                return targetAppData;
              }
              return prev;
            });
          }
          if (data.mysqlConfig) {
            if (data.mysqlConfig.host) localStorage.setItem('mysql_host', data.mysqlConfig.host);
            if (data.mysqlConfig.port) localStorage.setItem('mysql_port', data.mysqlConfig.port);
            if (data.mysqlConfig.user) localStorage.setItem('mysql_user', data.mysqlConfig.user);
            if (data.mysqlConfig.password !== undefined) localStorage.setItem('mysql_password', data.mysqlConfig.password);
            if (data.mysqlConfig.database) localStorage.setItem('mysql_database', data.mysqlConfig.database);
          }
        }
      } catch (e) {
        // silent
      }
    };

    fetchGlobalState();

    // Poll every 3 seconds for lightning-fast real-time synchronization across devices and views
    const interval = setInterval(fetchGlobalState, 3000);

    const handleFocus = () => fetchGlobalState();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchGlobalState();
      }
    };
    const handleCustomDataUpdate = (e: Event) => {
      // If event has detail (local data update), apply immediately without waiting for network response
      const customEvent = e as CustomEvent;
      if (customEvent.detail && isMounted) {
        setAppData((prev) => {
          const mergedMessages = mergeChatMessages(prev.chatMessages, customEvent.detail.chatMessages);
          const allDeletedSiswa = Array.from(new Set([...(prev.deletedSiswaIds || []), ...(customEvent.detail.deletedSiswaIds || [])]));
          const mergedSiswa = mergeSiswa(prev.siswa, customEvent.detail.siswa, allDeletedSiswa);
          const customPresensi = customEvent.detail.presensi || {};
          const isCustomPresensiReset = Object.keys(customPresensi).length === 0;
          const mergedPresensi = isCustomPresensiReset ? {} : mergePresensi(prev.presensi, customPresensi);
          const customJadwal = (Array.isArray(customEvent.detail.jadwalMengajar) && customEvent.detail.jadwalMengajar.length > 0)
            ? customEvent.detail.jadwalMengajar
            : prev.jadwalMengajar;
          const customMapel = (Array.isArray(customEvent.detail.mataPelajaran) && customEvent.detail.mataPelajaran.length > 0)
            ? customEvent.detail.mataPelajaran
            : prev.mataPelajaran;
          const customGmk = (Array.isArray(customEvent.detail.guruMapelKelas) && customEvent.detail.guruMapelKelas.length > 0)
            ? customEvent.detail.guruMapelKelas
            : prev.guruMapelKelas;
          const customPmg = (Array.isArray(customEvent.detail.presensiMengajarGuru) && customEvent.detail.presensiMengajarGuru.length > 0)
            ? customEvent.detail.presensiMengajarGuru
            : prev.presensiMengajarGuru;
          const customShiftConfig = customEvent.detail.shiftConfig || prev.shiftConfig;
          const customHariLibur = customEvent.detail.hariLibur || prev.hariLibur;
          const customPengumuman = customEvent.detail.pengumuman || prev.pengumuman;
          const customEkskul = customEvent.detail.ekstrakurikuler || prev.ekstrakurikuler;
          const customPetugasPiket = customEvent.detail.petugasPiket || prev.petugasPiket;
          const customCatatanPiket = customEvent.detail.catatanPiketHarian || prev.catatanPiketHarian;
          const customAnggotaEkskul = customEvent.detail.anggotaEkskul || prev.anggotaEkskul;
          const customPresensiEkskul = customEvent.detail.presensiEkskul || prev.presensiEkskul;
          const customAuditLogs = customEvent.detail.auditLogs || prev.auditLogs;
          const customWhatsappLogs = customEvent.detail.whatsappLogs || prev.whatsappLogs;
          const customRolePermissions = customEvent.detail.rolePermissions || prev.rolePermissions;
          const customWhatsappGateway = customEvent.detail.whatsappGateway || prev.whatsappGateway;
          const customSecurityIncidents = customEvent.detail.securityIncidents || prev.securityIncidents;
          const customBlockedIps = customEvent.detail.blockedIps || prev.blockedIps;
          return {
            ...customEvent.detail,
            siswa: mergedSiswa,
            presensi: mergedPresensi,
            jadwalMengajar: customJadwal,
            mataPelajaran: customMapel,
            guruMapelKelas: customGmk,
            presensiMengajarGuru: customPmg,
            shiftConfig: customShiftConfig,
            hariLibur: customHariLibur,
            pengumuman: customPengumuman,
            ekstrakurikuler: customEkskul,
            petugasPiket: customPetugasPiket,
            catatanPiketHarian: customCatatanPiket,
            anggotaEkskul: customAnggotaEkskul,
            presensiEkskul: customPresensiEkskul,
            auditLogs: customAuditLogs,
            whatsappLogs: customWhatsappLogs,
            rolePermissions: customRolePermissions,
            whatsappGateway: customWhatsappGateway,
            securityIncidents: customSecurityIncidents,
            blockedIps: customBlockedIps,
            chatMessages: mergedMessages,
            deletedSiswaIds: allDeletedSiswa,
          };
        });
      }
      fetchGlobalState();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('presensi-data-updated', handleCustomDataUpdate as EventListener);

    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('presensi_app_sync') : null;
    if (channel) {
      channel.onmessage = () => {
        fetchGlobalState();
      };
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('presensi-data-updated', handleCustomDataUpdate as EventListener);
      if (channel) {
        channel.close();
      }
    };
  }, []);

  // Real-time Chat Sync poller (every 1.5 seconds) to ensure deletions & new messages instantly reflect across all devices/recipients
  useEffect(() => {
    let isMounted = true;
    const syncChatMessages = async () => {
      try {
        const res = await fetch('/api/chat/messages');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.chatMessages) && isMounted) {
          setAppData((prev) => {
            const currentMsgs = prev.chatMessages || [];
            const merged = mergeChatMessages(currentMsgs, data.chatMessages);
            const isDifferent =
              currentMsgs.length !== merged.length ||
              (merged.length > 0 && (
                currentMsgs[currentMsgs.length - 1]?.id !== merged[merged.length - 1]?.id ||
                currentMsgs[currentMsgs.length - 1]?.status !== merged[merged.length - 1]?.status
              ));
            if (isDifferent) {
              return {
                ...prev,
                chatMessages: merged,
              };
            }
            return prev;
          });
        }
      } catch (e) {}
    };

    const chatInterval = setInterval(syncChatMessages, 1500);
    return () => {
      isMounted = false;
      clearInterval(chatInterval);
    };
  }, []);

  // Google Drive Background Auto-Backup Handler
  useEffect(() => {
    let isExecuting = false;
    const checkGoogleDriveAutoBackup = async () => {
      if (isExecuting) return;
      const config = appData.backupConfig;
      if (!config || !config.googleDriveAutoBackup) return;

      const token = await getAccessToken();
      if (!token) return; // Google account not authenticated in memory

      const today = getTodayString();
      const lastBackup = config.lastGoogleDriveBackup || '';
      const alreadyBackedUpToday = lastBackup.startsWith(today);

      if (config.googleDriveAutoFrequency === 'daily') {
        const targetTime = config.googleDriveDailyTime || '23:00';
        const currentTime = new Date().toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        });

        if (!alreadyBackedUpToday && currentTime >= targetTime) {
          isExecuting = true;
          try {
            const res = await uploadBackupToGoogleDrive(appData, {
              isAuto: true,
              note: `Cadangan Otomatis Harian (${today})`,
              token,
            });
            handleUpdateAppData({
              ...appData,
              backupConfig: {
                ...config,
                lastGoogleDriveBackup: `${today} ${currentTime} WIB`,
                lastGoogleDriveFileId: res.fileId,
              },
            });
            console.log('Google Drive auto-backup completed successfully:', res.fileName);
          } catch (e) {
            console.warn('Google Drive auto-backup failed:', e);
          } finally {
            isExecuting = false;
          }
        }
      }
    };

    const driveInterval = setInterval(checkGoogleDriveAutoBackup, 60000);
    checkGoogleDriveAutoBackup();
    return () => clearInterval(driveInterval);
  }, [appData.backupConfig, appData]);

  // System Theme / Dark Mode Sync Effect
  useEffect(() => {
    const mode = appData.sekolah?.themeMode || (isDarkMode ? 'dark' : 'light');
    
    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystemTheme = (e: MediaQueryListEvent | MediaQueryList) => {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      applySystemTheme(mediaQuery);
      const listener = (e: MediaQueryListEvent) => applySystemTheme(e);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [appData.sekolah?.themeMode, isDarkMode]);

  // Design Tokens & Attributes Sync Effect
  useEffect(() => {
    const currentTheme = appData.sekolah?.themePreset || appData.sekolah?.theme || 'school_blue';
    const currentSidebar = appData.sekolah?.sidebarTheme || 'royal';
    const currentFont = appData.sekolah?.fontTheme || 'inter';
    const currentDensity = appData.sekolah?.density || 'comfortable';
    const currentRadius = appData.sekolah?.componentRadius || 'standard';
    const currentShadow = appData.sekolah?.shadowStyle || 'minimal';
    const currentPageHeaderBg = appData.sekolah?.pageHeaderBackground || 'gradient_royal';

    document.documentElement.setAttribute('data-theme', currentTheme);
    document.documentElement.setAttribute('data-sidebar-theme', currentSidebar);
    document.documentElement.setAttribute('data-font', currentFont);
    document.documentElement.setAttribute('data-density', currentDensity);
    document.documentElement.setAttribute('data-radius', currentRadius);
    document.documentElement.setAttribute('data-shadow', currentShadow);
    document.documentElement.setAttribute('data-page-header-bg', currentPageHeaderBg);

    if (appData.sekolah?.primaryColor) {
      document.documentElement.style.setProperty('--theme-primary', appData.sekolah.primaryColor);
    } else {
      document.documentElement.style.removeProperty('--theme-primary');
    }

    // Page Header Background & Automatic Contrast Token Mapping
    const pageHeaderBgMap: Record<PageHeaderBackgroundOption, {
      bg: string;
      title: string;
      subtitle: string;
      badgeBg: string;
      badgeBorder: string;
      badgeText: string;
    }> = {
      white: {
        bg: '#FFFFFF',
        title: '#0F172A',
        subtitle: '#64748B',
        badgeBg: '#FFFFFF',
        badgeBorder: '#E2E8F0',
        badgeText: '#334155',
      },
      royal: {
        bg: '#1646E3',
        title: '#FFFFFF',
        subtitle: 'rgba(255, 255, 255, 0.80)',
        badgeBg: 'rgba(255, 255, 255, 0.12)',
        badgeBorder: 'rgba(255, 255, 255, 0.18)',
        badgeText: '#FFFFFF',
      },
      deep_blue: {
        bg: '#1E3A8A',
        title: '#FFFFFF',
        subtitle: 'rgba(255, 255, 255, 0.80)',
        badgeBg: 'rgba(255, 255, 255, 0.12)',
        badgeBorder: 'rgba(255, 255, 255, 0.18)',
        badgeText: '#FFFFFF',
      },
      indigo: {
        bg: '#4338CA',
        title: '#FFFFFF',
        subtitle: 'rgba(255, 255, 255, 0.80)',
        badgeBg: 'rgba(255, 255, 255, 0.12)',
        badgeBorder: 'rgba(255, 255, 255, 0.18)',
        badgeText: '#FFFFFF',
      },
      slate: {
        bg: '#334155',
        title: '#FFFFFF',
        subtitle: 'rgba(255, 255, 255, 0.80)',
        badgeBg: 'rgba(255, 255, 255, 0.12)',
        badgeBorder: 'rgba(255, 255, 255, 0.18)',
        badgeText: '#FFFFFF',
      },
      soft_blue: {
        bg: '#EFF6FF',
        title: '#0F172A',
        subtitle: '#64748B',
        badgeBg: '#FFFFFF',
        badgeBorder: '#E2E8F0',
        badgeText: '#334155',
      },
      gradient_royal: {
        bg: 'linear-gradient(135deg, #1646E3 0%, #4338CA 100%)',
        title: '#FFFFFF',
        subtitle: 'rgba(255, 255, 255, 0.80)',
        badgeBg: 'rgba(255, 255, 255, 0.12)',
        badgeBorder: 'rgba(255, 255, 255, 0.18)',
        badgeText: '#FFFFFF',
      },
    };

    const headerConfig = pageHeaderBgMap[currentPageHeaderBg] || pageHeaderBgMap.gradient_royal;
    document.documentElement.style.setProperty('--page-header-bg', headerConfig.bg);
    document.documentElement.style.setProperty('--page-header-title', headerConfig.title);
    document.documentElement.style.setProperty('--page-header-subtitle', headerConfig.subtitle);
    document.documentElement.style.setProperty('--page-header-badge-bg', headerConfig.badgeBg);
    document.documentElement.style.setProperty('--page-header-badge-border', headerConfig.badgeBorder);
    document.documentElement.style.setProperty('--page-header-badge-text', headerConfig.badgeText);

    // Backward compatibility tokens
    document.documentElement.style.setProperty('--page-title-color', headerConfig.title);
    document.documentElement.style.setProperty('--page-subtitle-color', headerConfig.subtitle);
  }, [
    appData.sekolah?.themePreset,
    appData.sekolah?.theme,
    appData.sekolah?.sidebarTheme,
    appData.sekolah?.fontTheme,
    appData.sekolah?.density,
    appData.sekolah?.componentRadius,
    appData.sekolah?.shadowStyle,
    appData.sekolah?.primaryColor,
    appData.sekolah?.pageHeaderBackground,
  ]);

  useEffect(() => {
    const faviconUrl = appData.sekolah?.favicon !== undefined && appData.sekolah?.favicon !== '' 
      ? appData.sekolah.favicon 
      : (appData.sekolah?.logo || '');
    
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.head.appendChild(link);
    }
    if (faviconUrl) {
      link.href = faviconUrl;
    } else {
      link.removeAttribute('href');
    }

    if (appData.sekolah?.browserTitle) {
      document.title = appData.sekolah.browserTitle;
    } else if (appData.sekolah?.nama) {
      document.title = `${appData.sekolah.nama} - Absensi Siswa`;
    }
  }, [appData.sekolah?.favicon, appData.sekolah?.logo, appData.sekolah?.nama, appData.sekolah?.browserTitle]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleSelectColorTheme = (themeId: ThemeOption) => {
    triggerSaveStatus();
    const updatedSekolah = {
      ...appData.sekolah,
      theme: themeId,
      themePreset: themeId,
      primaryColor: themeId === 'school_blue' ? '#2563EB' : appData.sekolah.primaryColor,
    };
    const updatedAppData = { ...appData, sekolah: updatedSekolah };
    setAppData(updatedAppData);
    document.documentElement.setAttribute('data-theme', themeId);
    try {
      localStorage.setItem('presensi_app_data', JSON.stringify(updatedAppData));
    } catch (e) {
      console.error(e);
    }
    saveAppData(updatedAppData);
    const themeNames: Record<string, string> = {
      school_blue: 'SMKN 6 Garut (School Blue)',
      professional: 'Professional Enterprise',
      ocean: 'Biru Ocean',
      emerald: 'Hijau Zamrud',
      indigo: 'Nila Indigo',
      violet: 'Ungu Violet',
      slate: 'Abu Slate',
    };
    showToast(`Tema warna berhasil diubah ke ${themeNames[themeId] || themeId}!`, 'success');
  };

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 4);
    const newToast: ToastMessage = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Confirmation Modal System
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {},
  });

  const openConfirmModal = (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
    });
  };

  const closeConfirmModal = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  // General Modal System
  const [generalModal, setGeneralModal] = useState<{
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
    maxWidth?: string;
  }>({
    isOpen: false,
    title: '',
    content: null,
    maxWidth: 'max-w-xl',
  });

  const openGeneralModal = (title: string, content: React.ReactNode, maxWidth: string = 'max-w-xl') => {
    setGeneralModal({
      isOpen: true,
      title,
      content,
      maxWidth,
    });
  };

  const closeGeneralModal = () => {
    setGeneralModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Save State
  const handleUpdateAppData = (updated: AppData | ((prev: AppData) => AppData)) => {
    triggerSaveStatus();
    lastLocalChangeRef.current = Date.now();
    setAppData((prev) => {
      const nextData = typeof updated === 'function' ? updated(prev) : updated;
      saveAppData(nextData);
      return nextData;
    });
  };

  // Dedicated Hardened Server Commit for Attendance View (Prompt 6A.6.1)
  const handleSavePresensiFromView = async (nextAppData: AppData): Promise<SyncResult> => {
    triggerSaveStatus();
    setAppData(nextAppData);
    try {
      localStorage.setItem('presensi_app_data', JSON.stringify(nextAppData));
    } catch (e) {}

    const result = await commitAppDataToServer(nextAppData);
    if (result.success) {
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const ch = new BroadcastChannel('presensi_app_sync');
          ch.postMessage({ type: 'UPDATE', timestamp: Date.now() });
          ch.close();
        } catch (e) {}
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('presensi-data-updated', { detail: nextAppData }));
      }
    }
    return result;
  };

  const handleUpdateSekolah = (updatedSekolah: Partial<SekolahConfig>) => {
    triggerSaveStatus();
    const updated = {
      ...appData,
      sekolah: {
        ...appData.sekolah,
        ...updatedSekolah,
      },
    };
    setAppData(updated);
    saveAppData(updated);
  };

  // Login & Logout
  const handleLogin = (session: UserSession, rememberMe: boolean = true) => {
    setCurrentUser(session);
    saveSessionUser(session, rememberMe);
    handleNavigate('dashboard', true);
  };

  const handleLogout = () => {
    if (currentUser?.data?.username) {
      const uName = currentUser.data.username;
      const updatedSessions = (appData.activeUserSessions || []).filter(
        (s) => s.username.toLowerCase() !== uName.toLowerCase()
      );
      handleUpdateAppData({
        ...appData,
        activeUserSessions: updatedSessions,
      });
      try {
        fetch('/api/user-sessions/terminate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: `sess-${uName}`, terminatedBy: 'Logout Pengguna' }),
        }).catch(() => {});
      } catch {}
    }
    setCurrentUser(null);
    saveSessionUser(null);
    handleNavigate('dashboard', true);
    showToast('Anda telah keluar dari sistem.', 'info');
  };

  // Reset & Restore Demo
  const handleRestoreDemoData = () => {
    openConfirmModal(
      'Isi / Restore Data Demo',
      'Apakah Anda yakin ingin mengisi data sampel demo? Data jurusan, kelas, wali kelas, siswa, dan sampel presensi bawaan akan dimuat ulang ke sistem.',
      'emerald',
      () => {
        const resetData = JSON.parse(JSON.stringify(DEMO_DATASET));
        handleUpdateAppData(resetData);

        showToast('Data demo berhasil dimuat ulang ke dalam sistem!', 'success');
      }
    );
  };

  const handleResetPresensiData = () => {
    openConfirmModal(
      'Reset Data Presensi',
      'PERINGATAN: Tindakan ini hanya akan MENGHAPUS SELURUH RIWAYAT PRESENSI SISWA DAN GURU. Data Master (Siswa, Kelas, Wali Kelas, Jurusan) tetap tersimpan aman. Lanjutkan?',
      'danger',
      () => {
        const resetPresensiData: AppData = {
          ...appData,
          presensi: {},
          presensiGuru: {},
        };

        if (typeof localStorage !== 'undefined') {
          try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && (k.startsWith('attendance-draft:') || k.startsWith('presensi_draft'))) {
                keysToRemove.push(k);
              }
            }
            keysToRemove.forEach((k) => localStorage.removeItem(k));
          } catch (e) {}
        }

        handleUpdateAppData(resetPresensiData);
        showToast('Seluruh riwayat data presensi berhasil direset!', 'success');
      }
    );
  };

  const handleResetAllData = () => {
    openConfirmModal(
      'Reset Seluruh Data',
      'PERINGATAN: Tindakan ini akan MENGHAPUS SELURUH DATA yang tersimpan di aplikasi (Jurusan, Kelas, Wali Kelas, Siswa, dan Presensi). Lanjutkan?',
      'danger',
      () => {
        const emptyData: AppData = {
          sekolah: { ...appData.sekolah },
          admin: { ...appData.admin },
          jurusan: [],
          waliKelas: [],
          kelas: [],
          siswa: [],
          presensi: {},
        };
        handleUpdateAppData(emptyData);

        showToast('Seluruh data sistem telah dibersihkan!', 'info');
      }
    );
  };

  const handleOpenBackupModal = () => {
    openGeneralModal(
      'Pusat Backup & Restore Data Sistem',
      <BackupRestoreModalContent
        appData={appData}
        onUpdateAppData={handleUpdateAppData}
        onCloseModal={closeGeneralModal}
        onShowToast={showToast}
        onConfirmModal={openConfirmModal}
        onRestoreDemoData={handleRestoreDemoData}
        onResetPresensiData={handleResetPresensiData}
        onResetAllData={handleResetAllData}
      />,
      'max-w-3xl'
    );
  };

  // If initializing, show clean branded loading splash
  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-white z-50 selection:bg-indigo-500">
        <div className="relative flex items-center justify-center mb-5">
          <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          {appData.sekolah?.logo ? (
            <img
              src={appData.sekolah.logo}
              alt="Logo"
              className="w-10 h-10 object-contain absolute"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          ) : (
            <img
              src="/app-icon.svg"
              alt="Logo"
              className="w-10 h-10 object-contain absolute"
            />
          )}
        </div>
        <h1 className="text-sm font-extrabold tracking-wider text-slate-100 uppercase mb-1">
          {appData.sekolah?.nama || 'Absensi Siswa'}
        </h1>
        <p className="text-xs font-medium text-slate-400 animate-pulse">
          Memuat Sistem Presensi & Kesiswaan...
        </p>
        <div className="w-44 h-1 bg-slate-800 rounded-full overflow-hidden mt-6">
          <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 animate-pulse w-full rounded-full" />
        </div>
      </div>
    );
  }

  // Offline mode evaluation
  const offlineModeEnabled = appData.sekolah?.enableOfflineMode !== false;
  const allowOfflineBypass = appData.sekolah?.allowOfflineBypass !== false;

  // If offline and not ignored (or if offline mode is disabled entirely, block strictly)
  if (!isOnline && (!offlineModeEnabled || !ignoreOffline)) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center">
        <OfflineView
          isStrictBlocked={!offlineModeEnabled}
          customMessage={appData.sekolah?.offlineNoticeMessage}
          onRetry={() => {
            if (navigator.onLine) {
              setIsOnline(true);
              setIgnoreOffline(false);
            }
          }}
          onContinueOffline={
            offlineModeEnabled && allowOfflineBypass
              ? () => setIgnoreOffline(true)
              : undefined
          }
        />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  // If not logged in, show Login view
  if (!currentUser) {
    return (
      <>
        <LoginView
          appData={appData}
          onLogin={handleLogin}
          onUpdateSekolah={handleUpdateSekolah}
          onUpdateAppData={handleUpdateAppData}
          onShowToast={showToast}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  const isStudentRole = currentUser.role === 'murid' || currentUser.role === 'siswa';
  const isStudentPortal = isStudentRole || currentView === 'portal_murid' || currentView === 'absen_qr' || currentView === 'kartu_pelajar' || currentView === 'rekap_siswa';

  const userEffectiveRoles = [
    currentUser.role,
    ...((currentUser.data as any)?.additionalRoles || [])
  ].filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased transition-colors relative">
      {/* Sidebar Container - Hidden on mobile and for student accounts */}
      <div className={isStudentPortal ? 'hidden' : ''}>
        <Sidebar
          currentView={currentView}
          currentUser={currentUser}
          sekolah={appData.sekolah}
          appData={appData}
          isOpen={sidebarOpen}
          enableLiveChat={appData.enableLiveChat ?? appData.sekolah?.enableLiveChat ?? true}
          adminPassword={appData.admin?.password || 'admin123'}
          onSwitchView={(v) => handleNavigate(v)}
          onCloseMobile={() => setSidebarOpen(false)}
          onRestoreDemo={handleRestoreDemoData}
          onResetPresensi={handleResetPresensiData}
          onResetAll={handleResetAllData}
          onOpenBackupModal={handleOpenBackupModal}
          onOpenServerQrModal={() => setIsServerQrModalOpen(true)}
        />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Header - Hidden for student accounts, Sticky on all other accounts */}
        <div className={isStudentPortal ? 'hidden' : 'sticky top-0 z-30 w-full'}>
          <Header
            currentUser={currentUser}
            sekolah={appData.sekolah}
            appData={appData}
            isDarkMode={isDarkMode}
            isOnline={isOnline}
            isSidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            onLogout={handleLogout}
            onToggleTheme={toggleTheme}
            onSelectColorTheme={handleSelectColorTheme}
            onNavigate={(v) => handleNavigate(v)}
            onNavigateToInput={(kelasId) => {
              setSelectedInputKelasId(kelasId);
              handleNavigate('presensi_input');
            }}
            onNavigateToMasterSiswa={(query, kelasId) => {
              if (kelasId) setSelectedInputKelasId(kelasId);
              setSelectedMasterSiswaQuery(query);
              handleNavigate('master_siswa');
            }}
            onNavigateToMasterGuru={(query) => {
              setSelectedMasterGuruQuery(query);
              handleNavigate('master_guru');
            }}
            onNavigateToMasterKelas={(query) => {
              setSelectedMasterKelasQuery(query);
              handleNavigate('master_kelas');
            }}
            onOpenModal={openGeneralModal}
            onCloseModal={closeGeneralModal}
            onOpenServerQrModal={() => setIsServerQrModalOpen(true)}
            saveStatus={saveStatus}
            onOpenChat={() => setIsLiveChatOpen((prev) => !prev)}
            unreadChatCount={unreadChatCount}
          />
        </div>

        <main
          className={`flex-1 overflow-x-clip min-w-0 ${isStudentPortal ? 'student-portal-main !p-0 !pt-0 !px-0 !m-0 !mx-0 pb-16 sm:pb-12 w-full' : 'p-3 sm:p-5 md:p-6 pb-3 md:pb-6'}`}
          style={isStudentPortal ? { paddingLeft: 0, paddingRight: 0, paddingTop: 0, marginLeft: 0, marginRight: 0, width: '100%' } : undefined}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full min-w-full"
              style={isStudentPortal ? { paddingLeft: 0, paddingRight: 0, paddingTop: 0, marginLeft: 0, marginRight: 0, width: '100%' } : undefined}
            >
              <React.Suspense fallback={
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                  <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Memuat Halaman...</p>
                </div>
              }>
              {((currentUser.role === 'murid' &&
              currentView !== 'catatan_pelanggaran' &&
              currentView !== 'live_chat') ||
              currentView === 'portal_murid' ||
              currentView === 'absen_qr' ||
              currentView === 'kartu_pelajar' ||
              currentView === 'rekap_siswa' ||
              (currentUser.role === 'murid' && currentView === 'jadwal_mengajar')) ? (
              <PortalMuridView
                appData={appData}
                currentUser={currentUser}
                activeTab={
                  currentView === 'absen_qr'
                    ? 'absen_qr'
                    : currentView === 'kartu_pelajar'
                    ? 'kartu_pelajar'
                    : currentView === 'rekap_siswa'
                    ? 'rekap_siswa'
                    : currentView === 'jadwal_mengajar'
                    ? 'jadwal_pelajaran'
                    : 'overview'
                }
                onUpdateAppData={handleUpdateAppData}
                onUpdateCurrentUser={(session) => {
                  setCurrentUser(session);
                  saveSessionUser(session);
                }}
                onShowToast={showToast}
                onNavigate={(v) => handleNavigate(v)}
                onLogout={handleLogout}
              />
            ) : !hasMenuAccess(userEffectiveRoles, currentView, appData) && currentUser.role !== 'admin' ? (
              <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-2xl flex items-center justify-center mx-auto font-black">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Akses Dibatasi</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Role Anda saat ini tidak memiliki izin untuk mengakses menu ini. Silakan hubungi Administrator untuk memperbarui hak akses role Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavigate(currentUser.role === 'murid' ? 'portal_murid' : 'dashboard')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Kembali ke Halaman Utama
                </button>
              </div>
            ) : (
              <>
                {currentView === 'jadwal_shift' && (
              <JadwalShiftView
                appData={appData}
                currentUser={currentUser}
                onUpdateAppData={handleUpdateAppData}
                onShowToast={showToast}
              />
            )}

            {currentView === 'dashboard' && (
                  <DashboardView
                    appData={appData}
                    currentUser={currentUser}
                    onNavigateToInput={(kelasId) => {
                      setSelectedInputKelasId(kelasId);
                      handleNavigate('presensi_input');
                    }}
                    onNavigateView={(v) => handleNavigate(v)}
                    onOpenBackupModal={handleOpenBackupModal}
                    onUpdateAppData={handleUpdateAppData}
                    onShowToast={showToast}
                  />
                )}

            {currentView === 'presensi_input' && currentUser.role !== 'murid' && (
              <InputPresensiView
                appData={appData}
                currentUser={currentUser}
                initialKelasId={selectedInputKelasId}
                readOnly={false}
                onSavePresensi={handleSavePresensiFromView}
                onShowToast={showToast}
                onConfirmModal={openConfirmModal}
                onOpenServerQrModal={() => setIsServerQrModalOpen(true)}
              />
            )}

            {currentView === 'home_visit' && currentUser.role !== 'kurikulum' && (
              <HomeVisitView
                appData={appData}
                currentUser={currentUser}
                onUpdateAppData={handleUpdateAppData}
                onShowToast={showToast}
                onConfirmModal={openConfirmModal}
              />
            )}

            {currentView === 'catatan_pelanggaran' && currentUser.role !== 'kurikulum' && (
              <PelanggaranView
                appData={appData}
                currentUser={currentUser}
                onUpdateAppData={handleUpdateAppData}
                onShowToast={showToast}
                onConfirmModal={openConfirmModal}
              />
            )}

            {currentView === 'ekstrakurikuler' && (currentUser.role === 'admin' || currentUser.role === 'kesiswaan' || currentUser.role === 'piket_kesiswaan' || currentUser.role === 'piket_guru' || currentUser.role === 'piket') && (
              <EkstrakurikulerView
                appData={appData}
                currentUser={currentUser}
                onUpdateAppData={handleUpdateAppData}
                onShowToast={showToast}
                onConfirmModal={openConfirmModal}
                onOpenModal={openGeneralModal}
                onCloseModal={closeGeneralModal}
              />
            )}

            {currentView === 'petugas_piket' && (
              <PetugasPiketView
                appData={appData}
                currentUser={currentUser}
                onUpdateAppData={handleUpdateAppData}
                onShowToast={showToast}
                onNavigateView={handleNavigate}
                onOpenServerQrModal={() => setIsServerQrModalOpen(true)}
                readOnly={currentUser.role !== 'admin' && currentUser.role !== 'kesiswaan'}
              />
            )}

            {currentView === 'rekap_pengisian_kelas' && (
              <RekapPengisianKelasView
                appData={appData}
                currentUser={currentUser}
                onNavigateToInput={(kelasId) => {
                  setSelectedInputKelasId(kelasId);
                  handleNavigate('presensi_input');
                }}
                onNavigateView={handleNavigate}
                onShowToast={showToast}
              />
            )}

            {currentView === 'broadcast_wa' && (
              <WhatsAppGatewayView
                appData={appData}
                currentUser={currentUser}
                onUpdateAppData={handleUpdateAppData}
                onShowToast={showToast}
                onConfirmModal={openConfirmModal}
              />
            )}

            {currentView === 'rekap_harian' && currentUser.role !== 'kurikulum' && (
              <RekapHarianView appData={appData} currentUser={currentUser} />
            )}

            {currentView === 'rekap_mingguan' && currentUser.role !== 'kurikulum' && (
              <RekapMingguanView appData={appData} currentUser={currentUser} />
            )}

            {currentView === 'rekap_bulanan' && currentUser.role !== 'kurikulum' && (
              <RekapBulananView appData={appData} currentUser={currentUser} />
            )}

            {currentView === 'rekap_ketidakhadiran_tertinggi' && currentUser.role !== 'kurikulum' && (
              <RekapKetidakhadiranTertinggiView
                appData={appData}
                currentUser={currentUser}
                onShowToast={showToast}
                onBack={() => handleNavigate('dashboard')}
              />
            )}

            {currentView === 'master_jurusan' && (currentUser.role === 'admin' || currentUser.role === 'kesiswaan' || currentUser.role === 'user' || currentUser.role === 'guru' || currentUser.role === 'kurikulum' || currentUser.role === 'hubin' || currentUser.role === 'staf_jadwal') && (
              <MasterJurusanView
                appData={appData}
                readOnly={currentUser.role !== 'admin'}
                onUpdateAppData={handleUpdateAppData}
                onOpenModal={openGeneralModal}
                onCloseModal={closeGeneralModal}
                onConfirmModal={openConfirmModal}
                onShowToast={showToast}
              />
            )}

            {currentView === 'master_guru' && (currentUser.role === 'admin' || currentUser.role === 'kesiswaan' || currentUser.role === 'user' || currentUser.role === 'guru' || currentUser.role === 'kurikulum' || currentUser.role === 'hubin' || currentUser.role === 'staf_jadwal') && (
              <MasterGuruView
                appData={appData}
                currentUser={currentUser}
                readOnly={currentUser.role !== 'admin'}
                initialSearchQuery={selectedMasterGuruQuery}
                onUpdateAppData={handleUpdateAppData}
                onOpenModal={openGeneralModal}
                onCloseModal={closeGeneralModal}
                onConfirmModal={openConfirmModal}
                onShowToast={showToast}
              />
            )}

            {currentView === 'master_mapel' && (currentUser.role === 'admin' || currentUser.role === 'kesiswaan' || currentUser.role === 'user' || currentUser.role === 'guru' || currentUser.role === 'kurikulum' || currentUser.role === 'hubin' || currentUser.role === 'staf_jadwal') && (
              <MasterMataPelajaranView
                appData={appData}
                currentUser={currentUser}
                readOnly={currentUser.role !== 'admin' && currentUser.role !== 'kurikulum'}
                onUpdateAppData={handleUpdateAppData}
                onOpenModal={openGeneralModal}
                onCloseModal={closeGeneralModal}
                onConfirmModal={openConfirmModal}
                onShowToast={showToast}
              />
            )}

            {currentView === 'mapel_kelas_guru' && (currentUser.role === 'admin' || currentUser.role === 'kesiswaan' || currentUser.role === 'user' || currentUser.role === 'guru' || currentUser.role === 'kurikulum' || currentUser.role === 'hubin' || currentUser.role === 'wali' || currentUser.role === 'staf_jadwal') && (
              <GuruMapelKelasView
                appData={appData}
                currentUser={currentUser}
                readOnly={false}
                onUpdateAppData={handleUpdateAppData}
                onOpenModal={openGeneralModal}
                onCloseModal={closeGeneralModal}
                onConfirmModal={openConfirmModal}
                onShowToast={showToast}
                onNavigateToInput={(kelasId) => {
                  setSelectedInputKelasId(kelasId);
                  handleNavigate('presensi_input');
                }}
                onNavigateView={handleNavigate}
              />
            )}

            {currentView === 'jadwal_mengajar' && (currentUser.role === 'admin' || currentUser.role === 'kesiswaan' || currentUser.role === 'user' || currentUser.role === 'guru' || currentUser.role === 'kurikulum' || currentUser.role === 'hubin' || currentUser.role === 'wali' || currentUser.role === 'staf_jadwal') && (
              <JadwalMengajarView
                appData={appData}
                currentUser={currentUser}
                readOnly={false}
                onUpdateAppData={handleUpdateAppData}
                onOpenModal={openGeneralModal}
                onCloseModal={closeGeneralModal}
                onConfirmModal={openConfirmModal}
                onShowToast={showToast}
                onNavigateView={handleNavigate}
              />
            )}

            {currentView === 'jadwal_minggu_ini' && (currentUser.role === 'admin' || currentUser.role === 'kesiswaan' || currentUser.role === 'user' || currentUser.role === 'guru' || currentUser.role === 'kurikulum' || currentUser.role === 'hubin' || currentUser.role === 'wali' || currentUser.role === 'staf_jadwal') && (
              <JadwalMengajarMingguIniView
                appData={appData}
                currentUser={currentUser}
                onNavigateToInput={(kelasId) => {
                  setSelectedInputKelasId(kelasId);
                  handleNavigate('presensi_input');
                }}
                onNavigateView={handleNavigate}
                onShowToast={showToast}
              />
            )}

            {currentView === 'master_user' && (currentUser.role === 'admin') && (
              <MasterUserView
                appData={appData}
                currentUser={currentUser}
                readOnly={currentUser.role !== 'admin'}
                onUpdateAppData={handleUpdateAppData}
                onOpenModal={openGeneralModal}
                onCloseModal={closeGeneralModal}
                onConfirmModal={openConfirmModal}
                onShowToast={showToast}
                onNavigateView={handleNavigate}
              />
            )}

            {currentView === 'pengaturan_role' && (currentUser.role === 'admin' || hasMenuAccess(currentUser.role, 'pengaturan_role', appData)) && (
              <PengaturanRoleView
                appData={appData}
                currentUser={currentUser}
                readOnly={currentUser.role !== 'admin'}
                onUpdateAppData={handleUpdateAppData}
                onConfirmModal={openConfirmModal}
                onShowToast={showToast}
                onNavigateView={handleNavigate}
              />
            )}

            {currentView === 'pengaturan_menu' && (currentUser.role === 'admin' || hasMenuAccess(currentUser.role, 'pengaturan_menu', appData)) && (
              <PengaturanMenuView
                appData={appData}
                currentUser={currentUser}
                readOnly={currentUser.role !== 'admin'}
                onUpdateAppData={handleUpdateAppData}
                onConfirmModal={openConfirmModal}
                onShowToast={showToast}
                onNavigateView={handleNavigate}
              />
            )}

            {currentView === 'master_kelas' && (currentUser.role === 'admin' || currentUser.role === 'kesiswaan' || currentUser.role === 'user' || currentUser.role === 'guru' || currentUser.role === 'kurikulum' || currentUser.role === 'hubin' || currentUser.role === 'staf_jadwal') && (
              <MasterKelasView
                appData={appData}
                currentUser={currentUser}
                readOnly={currentUser.role !== 'admin'}
                initialSearchQuery={selectedMasterKelasQuery}
                onUpdateAppData={handleUpdateAppData}
                onOpenModal={openGeneralModal}
                onCloseModal={closeGeneralModal}
                onConfirmModal={openConfirmModal}
                onShowToast={showToast}
              />
            )}

            {currentView === 'master_siswa' && (currentUser.role === 'admin' || currentUser.role === 'kesiswaan' || currentUser.role === 'user' || currentUser.role === 'guru' || currentUser.role === 'kurikulum' || currentUser.role === 'hubin' || currentUser.role === 'wali' || currentUser.role === 'staf_jadwal') && (
              <MasterSiswaView
                appData={appData}
                currentUser={currentUser}
                readOnly={currentUser.role !== 'admin' && currentUser.role !== 'wali'}
                initialSearchQuery={selectedMasterSiswaQuery}
                initialKelasId={selectedInputKelasId}
                onUpdateAppData={handleUpdateAppData}
                onOpenModal={openGeneralModal}
                onCloseModal={closeGeneralModal}
                onConfirmModal={openConfirmModal}
                onShowToast={showToast}
              />
            )}

            {currentView === 'hari_libur' && (
              <HariLiburView
                appData={appData}
                readOnly={currentUser.role !== 'admin'}
                onUpdateAppData={handleUpdateAppData}
                onShowToast={showToast}
                onConfirmModal={openConfirmModal}
              />
            )}

            {currentView === 'audit_logs' && (
              <AuditLogsView
                appData={appData}
                currentUser={currentUser}
                onUpdateAppData={handleUpdateAppData}
                onConfirmModal={openConfirmModal}
                onShowToast={showToast}
              />
            )}

            {currentView === 'pengaturan_sekolah' && (
              <PengaturanSekolahView
                appData={appData}
                readOnly={currentUser.role !== 'admin'}
                onUpdateAppData={handleUpdateAppData}
                onConfirmModal={openConfirmModal}
                onShowToast={showToast}
              />
            )}

            {currentView === 'pengaturan_tema' && (
              currentUser.role === 'admin' ? (
                <PengaturanTemaView
                  appData={appData}
                  readOnly={false}
                  onUpdateAppData={handleUpdateAppData}
                  onShowToast={showToast}
                />
              ) : (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md mx-auto my-12 shadow-xl">
                  <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 font-black">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Akses Terbatas</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Menu Tema &amp; Tampilan hanya dapat diakses dan diatur oleh Administrator Utama.
                  </p>
                </div>
              )
            )}

            {currentView === 'data_demo' && (
              <DataDemoView
                appData={appData}
                readOnly={currentUser.role !== 'admin'}
                onUpdateAppData={handleUpdateAppData}
                onConfirmModal={openConfirmModal}
                onShowToast={showToast}
              />
            )}

            {currentView === 'pengaturan_admin' && (
              <PengaturanAdminView
                appData={appData}
                currentUser={currentUser}
                onUpdateAppData={handleUpdateAppData}
                onUpdateSession={(session) => {
                  setCurrentUser(session);
                  saveSessionUser(session);
                }}
                onShowToast={showToast}
              />
            )}

            {currentView === 'integrasi_mysql' && (
              <IntegrasiMySQLView
                appData={appData}
                currentUser={currentUser}
                onUpdateAppData={handleUpdateAppData}
                onShowToast={showToast}
              />
            )}

            {currentView === 'database_traffic' && (
              <DatabaseTrafficView
                appData={appData}
                currentUser={currentUser}
                onShowToast={showToast}
              />
            )}

            {currentView === 'monitoring_server' && (
              <ServerMonitoringView
                appData={appData}
                currentUser={currentUser}
                onShowToast={showToast}
                onNavigateView={handleNavigate}
              />
            )}

            {currentView === 'monitoring_login' && (
              <UserLoginMonitoringView
                appData={appData}
                currentUser={currentUser}
                onUpdateAppData={handleUpdateAppData}
                onShowToast={showToast}
                onConfirmModal={openConfirmModal}
                onNavigateToView={handleNavigate}
              />
            )}

            {currentView === 'intrusion_detection' && (
              <IntrusionDetectionView
                appData={appData}
                currentUser={currentUser}
                onUpdateAppData={handleUpdateAppData}
                onShowToast={showToast}
                onConfirmModal={openConfirmModal}
              />
            )}

            {currentView === 'cetak_kartu_qr' && (
              <CetakKartuQrView
                appData={appData}
                currentUser={currentUser}
                onShowToast={showToast}
              />
            )}

            {currentView === 'live_chat' && (
              (!(appData.enableLiveChat ?? appData.sekolah?.enableLiveChat ?? true) && currentUser.role !== 'admin') ? (
                <div className="max-w-3xl mx-auto my-8 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Fasilitas Live Chat Nonaktif</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Layanan Live Chat saat ini sedang dimatikan oleh Administrator Utama. Silakan hubungi admin secara langsung atau coba lagi nanti.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleNavigate('dashboard')}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                  >
                    Kembali ke Dashboard
                  </button>
                </div>
              ) : (
                <LiveChatView
                  appData={appData}
                  currentUser={currentUser}
                  onUpdateAppData={handleUpdateAppData}
                  onShowToast={showToast}
                  onConfirmModal={openConfirmModal}
                  onNavigateView={setCurrentView}
                />
              )
            )}

            {currentView === 'whatsapp_gateway' && (
              <WhatsAppGatewayView
                appData={appData}
                currentUser={currentUser}
                onUpdateAppData={handleUpdateAppData}
                onShowToast={showToast}
                onConfirmModal={openConfirmModal}
              />
            )}

              </>
            )}
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
        </main>

        <Footer sekolah={appData.sekolah} />
      </div>

      {/* Live Chat Floating Widget */}
      {(currentUser.role === 'admin' || (appData.enableLiveChat ?? appData.sekolah?.enableLiveChat ?? true)) && (
        <LiveChatWidget
          appData={appData}
          currentUser={currentUser}
          isOpen={isLiveChatOpen}
          onToggleOpen={setIsLiveChatOpen}
          onUpdateAppData={handleUpdateAppData}
          onNavigate={(v) => handleNavigate(v)}
          onShowToast={showToast}
        />
      )}

      {/* Global Toast & Modals */}
      <BackToTop />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ConfirmModal state={confirmState} onClose={closeConfirmModal} />
      <GeneralModal
        isOpen={generalModal.isOpen}
        title={generalModal.title}
        maxWidth={generalModal.maxWidth}
        onClose={closeGeneralModal}
      >
        {generalModal.content}
      </GeneralModal>

      <ServerQrDisplayModal
        isOpen={isServerQrModalOpen}
        onClose={() => setIsServerQrModalOpen(false)}
        appData={appData}
        onUpdateAppData={handleUpdateAppData}
        onShowToast={showToast}
      />
    </div>
  );
}
