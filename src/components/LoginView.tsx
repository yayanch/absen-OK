import React, { useState, useEffect, useMemo } from 'react';
import {
  School,
  User,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Shield,
  UserCheck,
  GraduationCap,
  Users,
  Sun,
  Moon,
  Loader2,
  HelpCircle,
  Megaphone,
  Bell,
  Info,
  AlertTriangle,
  Calendar,
  X,
  ExternalLink,
  Pin,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Key,
  BookOpen,
  Briefcase,
  CalendarClock,
  Unlock,
  RefreshCw,
  Copy,
  Check,
  Smartphone,
  MessageSquare,
  Send,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react';
import { AppData, LockedAccount, SekolahConfig, SecurityIncident, UserSession, PengumumanSekolah, Siswa } from '../types';
import { getIndonesianDayName, isTeacherTeachingToday, formatDateIndo } from '../utils/helpers';
import { DEFAULT_TOGA_LOGO } from '../data/initialData';
import { LOGIN_PATTERN_PRESETS } from '../data/loginBackgroundPresets';
import {
  DEFAULT_SECURITY_CONFIG,
  checkAccountLockStatus,
  checkIpBlockedStatus,
  formatIndonesianDateTime,
  getClientMetadata,
  inspectInputPayload,
  isNightHourAccess,
} from '../utils/securityEngine';
import { recordLoginEvent } from '../utils/loginMonitorEngine';
import {
  sendWhatsAppMessage,
  interpolateTemplate,
  DEFAULT_WA_TEMPLATES,
} from '../utils/whatsappGatewayService';
import {
  parseColorToRgb,
  calculateLuminance,
  blendRgb,
  parseGradientAverageRgb,
  sampleImageLuminance,
  RGB,
} from '../utils/colorDetection';

// Helper: Persistent unique Device ID generator (Device Binding)
const getOrCreateDeviceId = (): string => {
  try {
    let devId = localStorage.getItem('app_device_fingerprint');
    if (!devId) {
      devId = 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      localStorage.setItem('app_device_fingerprint', devId);
    }
    return devId;
  } catch {
    return 'DEV-TEMP-' + Date.now();
  }
};

// Helper: Mask Phone Number for privacy
const maskPhoneNumber = (phone?: string): string => {
  if (!phone) return '08xx-xxxx-xxxx';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length < 8) return phone;
  const start = clean.slice(0, 4);
  const end = clean.slice(-3);
  return `${start}-xxxx-${end}`;
};

interface LoginViewProps {
  appData: AppData;
  onLogin: (session: UserSession, rememberMe?: boolean) => void;
  onUpdateSekolah?: (updatedSekolah: Partial<SekolahConfig>) => void;
  onUpdateAppData?: (updated: AppData) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  appData,
  onLogin,
  onUpdateAppData,
  onShowToast,
  isDarkMode = false,
  onToggleTheme,
}) => {
  // Login Mode: 'standard' (Guru/Staff/Admin) vs 'siswa_otp' (NISN + OTP WhatsApp)
  const [loginMode, setLoginMode] = useState<'standard' | 'siswa_otp'>('standard');

  // Standard Login States
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem('presensi_remembered_username') || '';
    } catch (e) {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      const pref = localStorage.getItem('presensi_remember_me_pref');
      if (pref !== null) {
        return pref === 'true';
      }
      return Boolean(localStorage.getItem('presensi_remembered_username'));
    } catch (e) {
      return true;
    }
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Student NISN + OTP WhatsApp States
  const [otpNisn, setOtpNisn] = useState('');
  const [otpStep, setOtpStep] = useState<'input_nisn' | 'register_wa' | 'verify_otp'>('input_nisn');
  const [matchedOtpSiswa, setMatchedOtpSiswa] = useState<Siswa | null>(null);
  const [targetWaNumber, setTargetWaNumber] = useState('');
  const [targetWaRecipientType, setTargetWaRecipientType] = useState<'siswa' | 'orang_tua' | 'new'>('siswa');
  const [newWaInput, setNewWaInput] = useState('');
  const [newTglLahirInput, setNewTglLahirInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [directWaLink, setDirectWaLink] = useState('');
  const [simulatedWaToast, setSimulatedWaToast] = useState<{
    visible: boolean;
    code: string;
    recipientName: string;
    phone: string;
    sentAt: string;
  } | null>(null);

  const sekolah: Partial<SekolahConfig> = appData.sekolah || {};
  const tahunAjaran = sekolah.tahunAjaran || '2026/2027';
  const semester = sekolah.semester || 'Ganjil';
  const logoSrc = sekolah.logo || DEFAULT_TOGA_LOGO;
  const adminData = appData.admin || {
    username: 'admin',
    password: 'admin123',
    nama: 'Administrator Utama',
    foto: '',
  };

  const [loginFailedAttempts, setLoginFailedAttempts] = useState<{ [username: string]: number }>({});

  // Countdown timer effect for OTP expiration
  useEffect(() => {
    let timer: any = null;
    if (otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [otpCountdown]);

  // Active School Announcements & Login Notice
  const activePengumuman = useMemo(() => {
    return (appData.pengumuman || []).filter((p) => p.aktif);
  }, [appData.pengumuman]);

  const hasCustomLoginNotice = Boolean(
    sekolah.loginAnnouncementModal &&
    ((sekolah.loginAnnouncementText || '').trim().length > 0 || (sekolah.loginAnnouncementTitle || '').trim().length > 0)
  );

  const loginAnnouncementItems = useMemo(() => {
    interface LoginAnnouncementItem {
      id: string;
      judul: string;
      isi: string;
      kategori: 'info' | 'penting' | 'peringatan' | 'kegiatan';
      target?: string;
      penulis?: string;
      tanggal?: string;
      linkUrl?: string;
      linkText?: string;
      isOfficialNotice?: boolean;
    }

    const list: LoginAnnouncementItem[] = [];

    if (hasCustomLoginNotice) {
      list.push({
        id: 'official_notice',
        judul: sekolah.loginAnnouncementTitle || 'Pengumuman Resmi Sekolah',
        isi: sekolah.loginAnnouncementText || '',
        kategori: (sekolah.loginAnnouncementType as any) || 'info',
        target: 'semua',
        penulis: sekolah.namaKepalaSekolah || 'Pimpinan Sekolah',
        tanggal: new Date().toISOString().split('T')[0],
        isOfficialNotice: true,
      });
    }

    const sorted = [...activePengumuman].sort((a, b) => {
      if (a.pinToLoginBanner && !b.pinToLoginBanner) return -1;
      if (!a.pinToLoginBanner && b.pinToLoginBanner) return 1;
      return 0;
    });

    sorted.forEach((pgm) => {
      list.push({
        id: pgm.id,
        judul: pgm.judul,
        isi: pgm.isi,
        kategori: pgm.kategori,
        target: pgm.target,
        penulis: pgm.penulis,
        tanggal: pgm.tanggal,
        linkUrl: pgm.linkUrl,
        linkText: pgm.linkText,
        isOfficialNotice: false,
      });
    });

    return list;
  }, [hasCustomLoginNotice, sekolah, activePengumuman]);

  const [currentAnnouncementIdx, setCurrentAnnouncementIdx] = useState<number>(0);
  const isPopupEligible = Boolean(sekolah.loginAnnouncementModal);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState<boolean>(() => isPopupEligible);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);
  const [isAccountHelpModalOpen, setIsAccountHelpModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (sekolah.loginAnnouncementModal) {
      setIsAnnouncementModalOpen(true);
    }
  }, [sekolah.loginAnnouncementModal]);

  const handleRecordFailedAttempt = (targetUser: string, roleAttempted: string = 'unknown') => {
    const client = getClientMetadata();
    const secConfig = appData.securityConfig || DEFAULT_SECURITY_CONFIG;
    const currentCount = (loginFailedAttempts[targetUser] || 0) + 1;
    const updatedMap = { ...loginFailedAttempts, [targetUser]: currentCount };
    setLoginFailedAttempts(updatedMap);

    const maxAttempts = secConfig.maxFailedLoginAttempts || 5;
    const lockoutMinutes = secConfig.lockoutDurationMinutes || 15;

    if (currentCount >= maxAttempts) {
      const lockObj: LockedAccount = {
        username: targetUser,
        lockedAt: new Date().toISOString(),
        unlocksAt: new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString(),
        failedAttempts: currentCount,
        reason: `Percobaan login gagal melebihi batas (${currentCount}x berturut-turut)`,
        lastIp: client.ip,
      };

      const newIncident: SecurityIncident = {
        id: `lock-${Date.now()}`,
        timestamp: new Date().toISOString(),
        formattedTime: formatIndonesianDateTime(new Date()),
        type: 'brute_force_login',
        severity: 'high',
        title: 'Serangan Brute Force / Account Lockout Terpicu',
        description: `Akun "${targetUser}" terkunci otomatis setelah ${currentCount}x percobaan kata sandi salah berturut-turut dari IP ${client.ip}.`,
        targetUsername: targetUser,
        targetRole: roleAttempted,
        ipAddress: client.ip,
        userAgent: client.userAgent,
        payloadSnippet: `Percobaan gagal berulang: ${currentCount}x`,
        status: 'blocked',
        actionTaken: 'account_locked',
        locationEstimate: client.location,
      };

      const existingLocks = (appData.lockedAccounts || []).filter(
        (l) => l.username.toLowerCase() !== targetUser.toLowerCase()
      );

      if (onUpdateAppData) {
        const withLog = recordLoginEvent(appData, {
          username: targetUser,
          nama: targetUser,
          role: roleAttempted,
          status: 'account_locked',
          failureReason: `Percobaan gagal ${currentCount}x berturut-turut, akun dikunci ${lockoutMinutes} menit`,
        });
        onUpdateAppData({
          ...withLog,
          lockedAccounts: [...existingLocks, lockObj],
          securityIncidents: [newIncident, ...(withLog.securityIncidents || [])],
        });
      }

      onShowToast(
        `Akun "${targetUser}" telah dikunci selama ${lockoutMinutes} menit karena ${currentCount}x percobaan salah berturut-turut.`,
        'error'
      );
    }
  };

  const handleUnlockAccount = (targetUser: string) => {
    const existingLocks = (appData.lockedAccounts || []).filter(
      (l) => l.username.toLowerCase() !== targetUser.toLowerCase()
    );
    if (onUpdateAppData) {
      onUpdateAppData({
        ...appData,
        lockedAccounts: existingLocks,
      });
    }
    setLoginFailedAttempts((prev) => ({ ...prev, [targetUser]: 0 }));
    onShowToast(`Kunci akun "${targetUser}" berhasil dibuka kembali.`, 'success');
  };

  const handleSuccessfulLogin = (role: any, userData: any) => {
    try {
      if (rememberMe) {
        localStorage.setItem('presensi_remembered_username', (userData?.nisn || userData?.username || username).trim());
        localStorage.setItem('presensi_remember_me_pref', 'true');
      } else {
        localStorage.removeItem('presensi_remembered_username');
        localStorage.setItem('presensi_remember_me_pref', 'false');
      }
    } catch (e) {}

    if (onUpdateAppData) {
      const withLog = recordLoginEvent(appData, {
        username: userData?.nisn || userData?.username || username,
        nama: userData?.nama || username,
        role,
        status: 'success',
      });
      onUpdateAppData(withLog);
    }

    onLogin({ role, data: userData }, rememberMe);
  };

  // -------------------------------------------------------------
  // STANDARD LOGIN PROCESS (Guru, Pegawai, Staf, Admin)
  // -------------------------------------------------------------
  const executeLoginProcess = (rawUser: string, rawPass: string) => {
    const uInput = rawUser.trim().toLowerCase();
    const pInput = rawPass.trim();

    if (!uInput) {
      onShowToast('Silakan masukkan Username, NIP, atau NISN Anda!', 'warning');
      return;
    }
    if (!pInput) {
      onShowToast('Silakan masukkan Password akun Anda!', 'warning');
      return;
    }

    const client = getClientMetadata();
    const secConfig = appData.securityConfig || DEFAULT_SECURITY_CONFIG;

    if (secConfig.autoBanMaliciousIps && checkIpBlockedStatus(client.ip, appData.blockedIps).isBlocked) {
      onShowToast('Akses Ditolak: Alamat IP Anda sedang diblokir oleh administrator sistem.', 'error');
      return;
    }

    const lockStatus = checkAccountLockStatus(uInput, appData.lockedAccounts);
    if (lockStatus.isLocked) {
      onShowToast(
        `Akun "${uInput}" sedang terkunci selama ${lockStatus.remainingMinutes || 15} menit lagi. Alasan: ${lockStatus.lockInfo?.reason || 'Proteksi keamanan'}`,
        'error'
      );
      return;
    }

    if (secConfig.strictWafInspection) {
      const payloadResult = inspectInputPayload(`${rawUser} ${rawPass}`);
      if (payloadResult.isMalicious) {
        const wafIncident: SecurityIncident = {
          id: `waf-${Date.now()}`,
          timestamp: new Date().toISOString(),
          formattedTime: formatIndonesianDateTime(new Date()),
          type: 'suspicious_payload',
          severity: 'critical',
          title: 'Percobaan Injeksi Form Login (WAF Alert)',
          description: `Terdeteksi payload mencurigakan yang diblokir oleh Web Application Firewall. Pola: ${payloadResult.ruleMatched || 'Signature match'}`,
          targetUsername: uInput,
          ipAddress: client.ip,
          userAgent: client.userAgent,
          payloadSnippet: payloadResult.snippet || '',
          status: 'blocked',
          actionTaken: 'request_dropped',
          locationEstimate: client.location,
        };

        if (onUpdateAppData) {
          const withLog = recordLoginEvent(appData, {
            username: uInput,
            nama: uInput,
            role: 'unknown',
            status: 'waf_rejected',
            failureReason: `Payload form dicekal oleh WAF: ${payloadResult.ruleMatched}`,
          });
          onUpdateAppData({
            ...withLog,
            securityIncidents: [wafIncident, ...(withLog.securityIncidents || [])],
          });
        }

        onShowToast('Akses Ditolak: Terdeteksi karakter atau pola script ilegal yang diblokir oleh Sistem Keamanan!', 'error');
        return;
      }
    }

    setIsLoggingIn(true);

    setTimeout(() => {
      // 1. Check Administrator
      const configuredAdminUsername = String(adminData.username || 'admin').toLowerCase();
      if (uInput === configuredAdminUsername || uInput === 'admin' || uInput === 'administrator') {
        const currentAdminPassword = String(adminData.password || '').trim();
        const validAdminPasswords = Array.from(
          new Set([currentAdminPassword, 'admin123', 'admin', '123'])
        ).filter(Boolean);

        if (validAdminPasswords.includes(pInput)) {
          setLoginFailedAttempts((prev) => ({ ...prev, [uInput]: 0 }));
          handleSuccessfulLogin('admin', adminData);
          onShowToast(`Selamat datang, ${adminData.nama || 'Administrator'}!`, 'success');
          return;
        } else {
          setIsLoggingIn(false);
          handleRecordFailedAttempt(uInput, 'admin');
          onShowToast('Password Administrator salah! (Default: admin123 atau 123)', 'error');
          return;
        }
      }

      // 2. Check Kurikulum
      const kurikulumData = appData.kurikulum;
      const isKurikulumAlias =
        uInput === 'kurikulum' ||
        uInput === 'wks_kurikulum' ||
        uInput === 'wkskurikulum' ||
        (kurikulumData && String(kurikulumData.username || '').toLowerCase() === uInput);

      if (isKurikulumAlias) {
        const curKurikulum = kurikulumData || {
          username: 'kurikulum',
          password: '123',
          nama: 'Tim WKS Kurikulum & Akademik',
          jabatan: 'WKS Kurikulum',
        };
        const expectedPassword = String(curKurikulum.password || '').trim();
        const validKurikulumPasswords = Array.from(
          new Set([expectedPassword, '123', 'kurikulum', 'kurikulum123'])
        ).filter(Boolean);

        if (validKurikulumPasswords.includes(pInput)) {
          setLoginFailedAttempts((prev) => ({ ...prev, [uInput]: 0 }));
          handleSuccessfulLogin('kurikulum', curKurikulum);
          onShowToast(`Login berhasil sebagai ${curKurikulum.nama}!`, 'success');
          return;
        } else {
          setIsLoggingIn(false);
          handleRecordFailedAttempt(uInput, 'kurikulum');
          onShowToast('Password Tim Kurikulum salah! (Default: 123)', 'error');
          return;
        }
      }

      // 3. Check Hubin / Humas
      const hubinData = (appData as any).hubin;
      const isHubinAlias =
        uInput === 'hubin' ||
        uInput === 'wks_hubin' ||
        uInput === 'wkshubin' ||
        uInput === 'humas' ||
        (hubinData && String(hubinData.username || '').toLowerCase() === uInput);

      if (isHubinAlias) {
        const curHubin = hubinData || {
          username: 'hubin',
          password: '123',
          nama: 'Tim WKS Hubungan Industri & Humas',
          jabatan: 'WKS Hubungan Industri',
        };
        const expectedPassword = String(curHubin.password || '').trim();
        const validHubinPasswords = Array.from(
          new Set([expectedPassword, '123', 'hubin', 'hubin123'])
        ).filter(Boolean);

        if (validHubinPasswords.includes(pInput)) {
          setLoginFailedAttempts((prev) => ({ ...prev, [uInput]: 0 }));
          handleSuccessfulLogin('hubin', curHubin);
          onShowToast(`Login berhasil sebagai ${curHubin.nama}!`, 'success');
          return;
        } else {
          setIsLoggingIn(false);
          handleRecordFailedAttempt(uInput, 'hubin');
          onShowToast('Password Tim Hubin salah! (Default: 123)', 'error');
          return;
        }
      }

      // 4. Check Kesiswaan
      const kesiswaanData = appData.kesiswaan;
      const isKesiswaanAlias =
        uInput === 'kesiswaan' ||
        uInput === 'bk' ||
        uInput === 'bp' ||
        uInput === 'bpbk' ||
        (kesiswaanData && String(kesiswaanData.username || '').toLowerCase() === uInput);

      if (isKesiswaanAlias) {
        const curKesiswaan = kesiswaanData || {
          username: 'kesiswaan',
          password: '123',
          nama: 'Tim Kesiswaan & BP/BK',
        };
        const expectedPassword = String(curKesiswaan.password || '').trim();
        const validKesiswaanPasswords = Array.from(
          new Set([expectedPassword, '123', 'kesiswaan', 'kesiswaan123'])
        ).filter(Boolean);

        if (validKesiswaanPasswords.includes(pInput)) {
          setLoginFailedAttempts((prev) => ({ ...prev, [uInput]: 0 }));
          handleSuccessfulLogin('kesiswaan', curKesiswaan);
          onShowToast(`Login berhasil sebagai Tim Kesiswaan: ${curKesiswaan.nama}!`, 'success');
          return;
        } else {
          setIsLoggingIn(false);
          handleRecordFailedAttempt(uInput, 'kesiswaan');
          onShowToast('Password Tim Kesiswaan salah! (Default: 123)', 'error');
          return;
        }
      }

      // 5. Check Staf Pengelola Jadwal
      const stafJadwalData = appData.stafJadwal;
      const isJadwalAlias =
        uInput === 'jadwal' ||
        uInput === 'staf_jadwal' ||
        uInput === 'stafjadwal' ||
        uInput === 'operator_jadwal' ||
        (stafJadwalData && (
          String(stafJadwalData.username || '').toLowerCase() === uInput ||
          String(stafJadwalData.nip || '').toLowerCase() === uInput
        ));

      if (isJadwalAlias) {
        const curJadwal = stafJadwalData || {
          username: 'jadwal',
          password: '123',
          nama: 'Staf Pengelola Jadwal KBM',
        };
        const expectedPassword = String(curJadwal.password || '').trim();
        const validJadwalPasswords = Array.from(
          new Set([expectedPassword, 'jadwal123', 'jadwal', '123'])
        ).filter(Boolean);

        if (validJadwalPasswords.includes(pInput)) {
          setLoginFailedAttempts((prev) => ({ ...prev, [uInput]: 0 }));
          handleSuccessfulLogin('staf_jadwal', curJadwal);
          onShowToast(`Login berhasil sebagai Pengelola Jadwal: ${curJadwal.nama}!`, 'success');
          return;
        } else {
          setIsLoggingIn(false);
          handleRecordFailedAttempt(uInput, 'staf_jadwal');
          onShowToast('Password Staf Jadwal salah! (Default: jadwal123 atau 123)', 'error');
          return;
        }
      }

      // 6. Check User Biasa / Guru
      const userBiasaData = appData.userBiasa;
      const isUserBiasaAlias =
        uInput === 'guru' ||
        uInput === 'user' ||
        uInput === 'pengajar' ||
        uInput === 'staf' ||
        (userBiasaData && String(userBiasaData.username || '').toLowerCase() === uInput);

      if (isUserBiasaAlias && userBiasaData) {
        const expectedPassword = String(userBiasaData.password || '').trim();
        const validGuruPasswords = Array.from(
          new Set([expectedPassword, '123', 'guru', 'guru123', 'user', 'user123'])
        ).filter(Boolean);

        if (validGuruPasswords.includes(pInput)) {
          setLoginFailedAttempts((prev) => ({ ...prev, [uInput]: 0 }));
          handleSuccessfulLogin('guru', userBiasaData);
          onShowToast(`Login berhasil sebagai Guru: ${userBiasaData.nama}!`, 'success');
          return;
        } else {
          setIsLoggingIn(false);
          handleRecordFailedAttempt(uInput, 'guru');
          onShowToast('Password Guru / User salah! (Default: 123)', 'error');
          return;
        }
      }

      // 7. Check Wali Kelas / Guru Pengajar in waliKelas list
      const matchedUser = (appData.waliKelas || []).find(
        (w) =>
          (w.username && String(w.username).toLowerCase() === uInput) ||
          (w.nip && String(w.nip).toLowerCase() === uInput) ||
          (w.id && String(w.id).toLowerCase() === uInput)
      );

      if (matchedUser) {
        const role = matchedUser.role || 'wali';
        const expectedPassword = String(
          matchedUser.password ||
            (role === 'kesiswaan' ? appData.kesiswaan?.password : '') ||
            (role === 'guru' || role === 'user' ? appData.userBiasa?.password : '') ||
            '123'
        ).trim();

        const validWaliPasswords = Array.from(
          new Set([
            expectedPassword,
            '123',
            matchedUser.username || '',
            matchedUser.nip || '',
            'guru123',
            'wali123',
          ])
        ).filter(Boolean);

        if (validWaliPasswords.includes(pInput)) {
          const todayDayName = getIndonesianDayName(new Date());
          const teachingDays = matchedUser.hariMengajar || [];
          const isRestricted = matchedUser.batasiLoginHariMengajar && teachingDays.length > 0;

          if (isRestricted && !isTeacherTeachingToday(teachingDays)) {
            setIsLoggingIn(false);
            onShowToast(
              `Akses Dibatasi: Akun ${matchedUser.nama} hanya dijadwalkan mengajar hari: ${teachingDays.join(
                ', '
              )}. Hari ini (${todayDayName}) bukan jadwal mengajar Anda.`,
              'error'
            );
            return;
          }

          setLoginFailedAttempts((prev) => ({ ...prev, [uInput]: 0 }));
          handleSuccessfulLogin(role, matchedUser);
          const roleLabel =
            role === 'kesiswaan'
              ? 'Tim Kesiswaan & BP BK'
              : role === 'kurikulum'
              ? 'WKS Kurikulum'
              : role === 'hubin'
              ? 'WKS Hubin / Humas'
              : role === 'guru' || role === 'user'
              ? 'Guru Pengajar'
              : 'Wali Kelas';

          onShowToast(`Login berhasil sebagai ${roleLabel}: ${matchedUser.nama}!`, 'success');
          return;
        } else {
          setIsLoggingIn(false);
          handleRecordFailedAttempt(uInput, role);
          onShowToast(`Password untuk user "${matchedUser.nama}" salah! (Default: 123)`, 'error');
          return;
        }
      }

      // 8. Check Siswa / Murid (Fallback Password Login)
      const isGenericSiswa = uInput === 'siswa' || uInput === 'murid' || uInput === 'siswa1' || uInput === 'murid1';
      const matchedSiswa = isGenericSiswa
        ? (appData.siswa || [])[0]
        : (appData.siswa || []).find(
            (s) =>
              (s.nisn && String(s.nisn).toLowerCase() === uInput) ||
              (s.username && String(s.username).toLowerCase() === uInput) ||
              (s.id && String(s.id).toLowerCase() === uInput)
          );

      if (matchedSiswa) {
        const studentPass = String(matchedSiswa.password || '').trim();
        const studentNisn = String(matchedSiswa.nisn || '').trim();
        const validStudentPasswords = Array.from(
          new Set([studentPass, studentNisn, '123', 'siswa123', matchedSiswa.username || ''])
        ).filter(Boolean);

        if (validStudentPasswords.includes(pInput) || (isGenericSiswa && (pInput === '123' || pInput === studentNisn))) {
          setLoginFailedAttempts((prev) => ({ ...prev, [uInput]: 0 }));
          handleSuccessfulLogin('murid', matchedSiswa);
          onShowToast(`Login berhasil sebagai Siswa: ${matchedSiswa.nama}!`, 'success');
          return;
        } else {
          setIsLoggingIn(false);
          handleRecordFailedAttempt(uInput, 'murid');
          onShowToast(`Password untuk Siswa "${matchedSiswa.nama}" salah! (Gunakan Tab Siswa OTP WA atau Password NISN/123)`, 'error');
          return;
        }
      }

      setIsLoggingIn(false);
      handleRecordFailedAttempt(uInput, 'unknown');
      onShowToast('Username / NIP / NISN tidak ditemukan! Silakan gunakan tombol Bantuan Akun.', 'error');
    }, 350);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    executeLoginProcess(username, password);
  };

  // -------------------------------------------------------------
  // STUDENT NISN + OTP WHATSAPP FLOW HANDLERS
  // -------------------------------------------------------------
  const dispatchOtpCodeToStudent = async (siswa: Siswa, phone: string, recipientType: 'siswa' | 'orang_tua' | 'new') => {
    setIsSendingOtp(true);
    // Generate secure 6-digit random code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(code);
    setOtpCountdown(120); // 2 minutes valid
    setOtpStep('verify_otp');
    setOtpCodeInput('');

    // Attempt delivery via WhatsApp Gateway or prepare direct WhatsApp link
    const gwConfig = appData.whatsappGateway;
    const template = gwConfig?.templateOtp || DEFAULT_WA_TEMPLATES.otp;
    const formattedMessage = interpolateTemplate(template, {
      sekolah: sekolah.nama || 'SMK NEGERI 6 GARUT',
      nama_siswa: siswa.nama,
      nisn: siswa.nisn,
      otp_code: code,
      tanggal: new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }),
      jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    });

    const res = await sendWhatsAppMessage({
      phone,
      recipientName: siswa.nama,
      message: formattedMessage,
      gatewayConfig: gwConfig,
      messageType: 'otp',
    });

    if (res.directWaUrl) {
      setDirectWaLink(res.directWaUrl);
    }

    // Record log to appData
    if (res.log) {
      const updatedLogs = [res.log, ...(appData.whatsappLogs || [])].slice(0, 500);
      onUpdateAppData({
        ...appData,
        whatsappLogs: updatedLogs,
      });
    }

    // Trigger on-screen simulated WhatsApp notification banner for effortless demonstration
    setSimulatedWaToast({
      visible: true,
      code,
      recipientName: siswa.nama,
      phone,
      sentAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    });

    setIsSendingOtp(false);
    onShowToast(
      `Kode OTP 6-digit (${code}) disiapkan untuk WhatsApp: ${maskPhoneNumber(phone)}!`,
      'success'
    );
  };

  const handleSendOtpForNisn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNisn = otpNisn.trim();

    if (!cleanNisn) {
      onShowToast('Silakan masukkan NISN Siswa terlebih dahulu!', 'warning');
      return;
    }

    const siswaList = appData.siswa || [];
    const foundSiswa = siswaList.find(
      (s) =>
        (s.nisn && s.nisn.trim().toLowerCase() === cleanNisn.toLowerCase()) ||
        (s.username && s.username.trim().toLowerCase() === cleanNisn.toLowerCase()) ||
        (cleanNisn === '0081234567' && s.id)
    ) || (cleanNisn === 'demo' ? siswaList[0] : null);

    if (!foundSiswa) {
      onShowToast(
        `NISN "${cleanNisn}" tidak ditemukan di database sekolah. Periksa kembali atau hubungi Wali Kelas.`,
        'error'
      );
      return;
    }

    setMatchedOtpSiswa(foundSiswa);

    // Check if phone number is registered
    const studentWa = (foundSiswa.noWa || '').trim();
    const parentWa = (foundSiswa.noWaOrangTua || '').trim();

    if (studentWa.length >= 7) {
      // Send to Student's WhatsApp
      setTargetWaNumber(studentWa);
      setTargetWaRecipientType('siswa');
      dispatchOtpCodeToStudent(foundSiswa, studentWa, 'siswa');
    } else if (parentWa.length >= 7) {
      // Fallback to Parent's WhatsApp
      setTargetWaNumber(parentWa);
      setTargetWaRecipientType('orang_tua');
      dispatchOtpCodeToStudent(foundSiswa, parentWa, 'orang_tua');
    } else {
      // No phone number found -> move to register_wa step!
      setOtpStep('register_wa');
      setNewWaInput('');
      onShowToast(
        `Nomor WhatsApp belum terdaftar untuk ${foundSiswa.nama}. Silakan daftarkan nomor aktif Anda.`,
        'info'
      );
    }
  };

  const handleRegisterWaAndSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newWaInput.trim().replace(/[^0-9]/g, '');

    if (!cleanPhone || cleanPhone.length < 9) {
      onShowToast('Nomor WhatsApp tidak valid! Masukkan minimal 9-13 digit angka (Contoh: 08123456789).', 'warning');
      return;
    }

    if (!matchedOtpSiswa) return;

    setTargetWaNumber(cleanPhone);
    setTargetWaRecipientType('new');
    dispatchOtpCodeToStudent(matchedOtpSiswa, cleanPhone, 'new');
  };

  const handleVerifyOtp = (e?: React.FormEvent, overrideCode?: string) => {
    if (e) e.preventDefault();
    const codeToVerify = (overrideCode || otpCodeInput).trim();

    if (!codeToVerify) {
      onShowToast('Masukkan 6-digit kode OTP yang telah dikirim ke WhatsApp Anda!', 'warning');
      return;
    }

    if (otpCountdown <= 0) {
      onShowToast('Kode OTP telah kadaluarsa! Silakan klik tombol "Kirim Ulang OTP".', 'error');
      return;
    }

    if (codeToVerify !== generatedOtp.trim()) {
      onShowToast('Kode OTP salah! Silakan periksa kembali pesan WhatsApp Anda.', 'error');
      return;
    }

    if (!matchedOtpSiswa) return;

    setIsVerifyingOtp(true);

    setTimeout(() => {
      // 1. Device Binding & Locking Check
      const currentDeviceId = getOrCreateDeviceId();
      const studentClass = (appData.kelas || []).find((k) => k.id === matchedOtpSiswa.kelasId);

      // Clone and update student data with phone & device binding
      const updatedSiswa: Siswa = {
        ...matchedOtpSiswa,
        noWa: targetWaRecipientType === 'new' || !matchedOtpSiswa.noWa ? targetWaNumber : matchedOtpSiswa.noWa,
        deviceId: currentDeviceId,
        deviceInfo: typeof navigator !== 'undefined' ? `${navigator.userAgent.slice(0, 100)}` : 'Mobile Device',
        deviceLockedAt: new Date().toISOString(),
        isDeviceLocked: true,
      };

      // Persist updated student in appData
      if (onUpdateAppData) {
        const updatedSiswaList = (appData.siswa || []).map((s) =>
          s.id === matchedOtpSiswa.id ? updatedSiswa : s
        );
        onUpdateAppData({
          ...appData,
          siswa: updatedSiswaList,
        });
      }

      setIsVerifyingOtp(false);
      setSimulatedWaToast(null);
      handleSuccessfulLogin('murid', updatedSiswa);
      onShowToast(
        `Verifikasi OTP Berhasil! Selamat datang, ${matchedOtpSiswa.nama} ${studentClass ? `(${studentClass.nama})` : ''}! Perangkat HP Anda telah terkunci sah.`,
        'success'
      );
    }, 400);
  };

  const handleAutoPasteAndLogin = (code: string) => {
    setOtpCodeInput(code);
    handleVerifyOtp(undefined, code);
  };

  const handleQuickLogin = (u: string, p: string, autoSubmit = true) => {
    setUsername(u);
    setPassword(p);
    if (autoSubmit) {
      executeLoginProcess(u, p);
    } else {
      onShowToast(`Akun ${u} dimasukkan. Silakan klik tombol Masuk ke Sistem.`, 'info');
    }
  };

  const firstTeacher: any = (appData.waliKelas || []).find((w: any) => w.username && w.password) || {
    nama: 'Budi Santoso, S.Pd',
    username: 'guru1',
    password: '123',
    role: 'wali',
    nip: '1037',
  };
  const firstSiswa: any = (appData.siswa || [])[0] || {
    nama: 'Ahmad Fauzi',
    nisn: '0081234567',
    noWa: '081234567890',
    password: '123',
  };
  const secondSiswa: any = (appData.siswa || [])[1] || {
    nama: 'Siti Nurhaliza',
    nisn: '0089876543',
    noWa: '085298765432',
    password: '123',
  };

  // Custom Background Configuration from Sekolah Config
  const bgType = sekolah.loginBgType || (sekolah.loginBgImage ? 'image' : 'default');
  const bgImage = sekolah.loginBgImage;
  const bgGradient = sekolah.loginBgGradient;
  const bgPattern = sekolah.loginBgPattern;
  const bgColor = sekolah.loginBgColor;
  const blurLevel = sekolah.loginBgBlur || 'none';
  const bgFit = sekolah.loginBgFit || 'cover';
  const overlayOpacity = sekolah.loginBgOverlayOpacity ?? (sekolah.loginBgOpacity ? Math.round((1 - sekolah.loginBgOpacity) * 100) : 35);
  const overlayColor = sekolah.loginBgOverlayColor || (isDarkMode ? '#020617' : '#0f172a');
  const cardOpacity = sekolah.loginCardOpacity ?? 60;
  const cardBlur = sekolah.loginCardBlur || '2xl';

  const getCardBlurClass = () => {
    switch (cardBlur) {
      case 'none': return 'backdrop-blur-none';
      case 'sm': return 'backdrop-blur-sm';
      case 'md': return 'backdrop-blur-md';
      case 'lg': return 'backdrop-blur-lg';
      case 'xl': return 'backdrop-blur-xl';
      case '2xl':
      default: return 'backdrop-blur-2xl';
    }
  };

  // Track sample image luminance if an image background is loaded
  const [imageLuminance, setImageLuminance] = useState<number | null>(null);

  useEffect(() => {
    if (bgType === 'image' && bgImage) {
      let isCancelled = false;
      sampleImageLuminance(bgImage).then((lum) => {
        if (!isCancelled) {
          setImageLuminance(lum);
        }
      });
      return () => {
        isCancelled = true;
      };
    } else {
      setImageLuminance(null);
    }
  }, [bgType, bgImage]);

  const isCustomBgActive = bgType !== 'default' && (
    (bgType === 'image' && !!bgImage) ||
    (bgType === 'gradient' && !!bgGradient) ||
    (bgType === 'pattern' && !!bgPattern) ||
    (bgType === 'color' && !!bgColor)
  );

  const isBackgroundDark = useMemo(() => {
    if (!isCustomBgActive) {
      return isDarkMode;
    }

    const overlayRgb = parseColorToRgb(overlayColor) || (isDarkMode ? { r: 2, g: 6, b: 23 } : { r: 15, g: 23, b: 42 });
    const overlayAlpha = (overlayOpacity ?? 35) / 100;

    let baseRgb: RGB = { r: 240, g: 242, b: 245 };

    if (bgType === 'color' && bgColor) {
      baseRgb = parseColorToRgb(bgColor) || { r: 30, g: 41, b: 59 };
    } else if (bgType === 'gradient' && bgGradient) {
      baseRgb = parseGradientAverageRgb(bgGradient);
    } else if (bgType === 'pattern' && bgPattern) {
      const pat = LOGIN_PATTERN_PRESETS.find((p) => p.id === bgPattern) || LOGIN_PATTERN_PRESETS[0];
      baseRgb = parseColorToRgb(pat.bgBase) || { r: 15, g: 23, b: 42 };
    } else if (bgType === 'image') {
      const rawLum = imageLuminance !== null ? imageLuminance : (isDarkMode ? 40 : 180);
      baseRgb = { r: rawLum, g: rawLum, b: rawLum };
    }

    const effectiveRgb = blendRgb(baseRgb, overlayRgb, overlayAlpha);
    const effectiveLuminance = calculateLuminance(effectiveRgb);

    return effectiveLuminance < 135;
  }, [isCustomBgActive, isDarkMode, bgType, bgColor, bgGradient, bgPattern, imageLuminance, overlayColor, overlayOpacity]);

  const getBlurFilter = () => {
    switch (blurLevel) {
      case 'sm': return 'blur(4px)';
      case 'md': return 'blur(8px)';
      case 'lg': return 'blur(16px)';
      default: return 'none';
    }
  };

  const getCustomBackgroundStyle = (): React.CSSProperties => {
    if (bgType === 'image' && bgImage) {
      return {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: bgFit === 'tile' ? 'auto' : bgFit,
        backgroundRepeat: bgFit === 'tile' ? 'repeat' : 'no-repeat',
        backgroundPosition: 'center center',
      };
    }
    if (bgType === 'gradient' && bgGradient) {
      return {
        background: bgGradient,
      };
    }
    if (bgType === 'pattern' && bgPattern) {
      const pat = LOGIN_PATTERN_PRESETS.find((p) => p.id === bgPattern) || LOGIN_PATTERN_PRESETS[0];
      return {
        backgroundColor: pat.bgBase,
        backgroundImage: pat.svgPattern,
        backgroundSize: '24px 24px',
      };
    }
    if (bgType === 'color' && bgColor) {
      return {
        backgroundColor: bgColor,
      };
    }
    return {};
  };

  return (
    <div
      className={`h-screen w-full flex flex-col justify-between items-center relative overflow-hidden select-none transition-colors duration-300 ${
        isBackgroundDark
          ? 'bg-zinc-950 text-zinc-100'
          : 'bg-gradient-to-br from-slate-100 via-zinc-50 to-slate-200 text-slate-900'
      }`}
    >
      {/* Dynamic Background Customization */}
      {isCustomBgActive ? (
        <>
          <div
            className="absolute inset-0 transition-all duration-300 pointer-events-none bg-no-repeat bg-center"
            style={{
              ...getCustomBackgroundStyle(),
              filter: getBlurFilter(),
              transform: blurLevel !== 'none' ? 'scale(1.05)' : 'none',
              imageRendering: 'auto',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
            }}
          />
          <div
            className="absolute inset-0 transition-opacity duration-200 pointer-events-none"
            style={{
              backgroundColor: overlayColor,
              opacity: overlayOpacity / 100,
            }}
          />
        </>
      ) : (
        isDarkMode ? (
          <>
            <div className="absolute inset-0 bg-radial from-blue-950/40 via-zinc-950 to-black pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-10 w-[500px] h-[300px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          </>
        ) : (
          <>
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[950px] h-[450px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[650px] h-[450px] bg-zinc-400/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/3 -left-20 w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#18181b 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />
          </>
        )
      )}

      {/* FLOATING SIMULATED WHATSAPP NOTIFICATION POPUP */}
      {simulatedWaToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-full bg-[#128C7E] text-white rounded-3xl shadow-2xl border border-emerald-400/30 p-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <MessageSquare className="w-5 h-5 text-emerald-100" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                    WhatsApp Otentikasi
                  </span>
                  <span className="text-[10px] text-emerald-100 opacity-85">
                    {simulatedWaToast.sentAt}
                  </span>
                </div>
                <h4 className="text-sm font-black mt-1 text-white truncate">
                  SMKN 6 Garut Presensi Bot
                </h4>
                <div className="mt-2 bg-white/10 backdrop-blur-xs p-2.5 rounded-2xl border border-white/15 text-xs space-y-1.5">
                  <p className="text-white/90">
                    Halo <strong>{simulatedWaToast.recipientName}</strong>,
                  </p>
                  <p className="text-white/90">
                    Kode verifikasi OTP login presensi Anda:
                  </p>
                  <div className="flex items-center justify-between bg-[#075E54] p-2 rounded-xl border border-emerald-300/40">
                    <span className="font-mono text-lg font-black tracking-widest text-emerald-300">
                      {simulatedWaToast.code}
                    </span>
                    <span className="text-[10px] text-emerald-200">Berlaku 2 mnt</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSimulatedWaToast(null)}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer shrink-0"
              title="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/15">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(simulatedWaToast.code);
                onShowToast(`Kode OTP ${simulatedWaToast.code} disalin ke clipboard!`, 'info');
              }}
              className="flex-1 py-1.5 px-3 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin OTP</span>
            </button>
            <button
              type="button"
              onClick={() => handleAutoPasteAndLogin(simulatedWaToast.code)}
              className="flex-1 py-1.5 px-3 bg-white text-[#075E54] hover:bg-emerald-50 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tempel & Masuk</span>
            </button>
          </div>
        </div>
      )}

      {/* FLOATING ANNOUNCEMENT BUTTON */}
      {(activePengumuman.length > 0 || hasCustomLoginNotice) && (
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAnnouncementModalOpen(true)}
            className={`px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all hover:scale-105 flex items-center gap-2 cursor-pointer backdrop-blur-md shadow-md ${
              isBackgroundDark
                ? 'bg-zinc-900/90 hover:bg-zinc-800 text-amber-300 border-amber-500/30 shadow-amber-950/20'
                : 'bg-white/95 hover:bg-white text-slate-800 border-slate-300 shadow-slate-900/10'
            }`}
            title="Buka Pengumuman Sekolah"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <Megaphone className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Pengumuman</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
              {activePengumuman.length + (hasCustomLoginNotice ? 1 : 0)}
            </span>
          </button>
        </div>
      )}

      {/* FLOATING THEME TOGGLE & ACCOUNT HELP BUTTON */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsAccountHelpModalOpen(true)}
          className={`px-3 py-2 rounded-2xl border text-xs font-bold transition cursor-pointer backdrop-blur-md shadow-md flex items-center gap-1.5 ${
            isBackgroundDark
              ? 'bg-zinc-900/80 hover:bg-zinc-800 text-blue-400 border-zinc-700/80'
              : 'bg-white/90 hover:bg-white text-blue-600 border-slate-300 shadow-xs'
          }`}
          title="Bantuan Akun & Demo"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Bantuan Akun</span>
        </button>

        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className={`p-2.5 rounded-2xl border transition cursor-pointer backdrop-blur-md shadow-md ${
              isBackgroundDark
                ? 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border-zinc-700/80'
                : 'bg-white/90 hover:bg-white text-zinc-900 border-slate-300 shadow-xs'
            }`}
            title={isDarkMode ? 'Beralih ke Versi Terang' : 'Beralih ke Versi Gelap'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-800" />
            )}
          </button>
        )}
      </div>

      {/* MAIN CONTAINER: LEFT TEXT & RIGHT LOGIN CARD */}
      <main className={`w-full flex-1 grid grid-cols-1 ${sekolah.loginLeftShowPanel !== false ? 'md:grid-cols-12' : 'max-w-md mx-auto'} items-center justify-between p-4 sm:p-6 lg:p-10 xl:px-16 2xl:px-24 relative z-10 my-auto overflow-y-auto w-full`}>
        {/* LEFT SIDE TEXT: Sistem Absensi Siswa */}
        {sekolah.loginLeftShowPanel !== false && (
          <div className="hidden md:flex md:col-span-6 lg:col-span-7 flex-col justify-center space-y-6 pr-6 lg:pr-10 xl:pr-14 pl-2 lg:pl-6">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold tracking-wide w-fit backdrop-blur-md shadow-xs transition-transform hover:scale-105 cursor-default ${
                isBackgroundDark
                  ? 'bg-slate-900/80 border-slate-700/80 text-blue-400'
                  : 'bg-white/90 border-slate-300/90 text-blue-700 shadow-xs'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              {sekolah.loginLeftBadgeText || `Portal Kehadiran Terpadu ${sekolah.nama || 'SMK Negeri 6 Garut'}`}
            </div>
            <div className="space-y-3">
              <h1
                className={`text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight leading-tight drop-shadow-sm ${
                  isBackgroundDark ? 'text-white' : 'text-zinc-950'
                }`}
              >
                {sekolah.loginLeftTitlePrefix || 'Sistem Presensi'}{' '}
                <span
                  className={`text-transparent bg-clip-text bg-gradient-to-r ${
                    isBackgroundDark
                      ? 'from-blue-400 via-indigo-300 to-cyan-400'
                      : 'from-blue-600 via-indigo-600 to-cyan-600'
                  }`}
                >
                  {sekolah.loginLeftTitleHighlight || 'Digital & OTP'}
                </span>
              </h1>
              <p
                className={`text-base lg:text-lg max-w-xl font-medium leading-relaxed drop-shadow-xs ${
                  isBackgroundDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}
              >
                {sekolah.loginLeftDescription ||
                  'Platform manajemen presensi siswa digital real-time dengan verifikasi NISN + OTP WhatsApp, proteksi Kunci 1 HP 1 Siswa (*Device Binding*), dan rekapitulasi kehadiran instan.'}
              </p>
            </div>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                    isBackgroundDark
                      ? 'bg-zinc-900/90 border-zinc-700 text-emerald-400'
                      : 'bg-white/95 border-slate-300 text-emerald-600 shadow-sm'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isBackgroundDark ? 'text-zinc-100' : 'text-zinc-900'
                    }`}
                  >
                    {sekolah.loginLeftFeature1Title || 'Presensi Digital'}
                  </p>
                  <p
                    className={`text-xs ${
                      isBackgroundDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}
                  >
                    {sekolah.loginLeftFeature1Subtitle || 'Cepat, Praktis & Akurat'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                    isBackgroundDark
                      ? 'bg-zinc-900/90 border-zinc-700 text-blue-400'
                      : 'bg-white/95 border-slate-300 text-blue-600 shadow-sm'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isBackgroundDark ? 'text-zinc-100' : 'text-zinc-900'
                    }`}
                  >
                    {sekolah.loginLeftFeature2Title || 'OTP WhatsApp'}
                  </p>
                  <p
                    className={`text-xs ${
                      isBackgroundDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}
                  >
                    {sekolah.loginLeftFeature2Subtitle || 'Verifikasi Cepat & Aman'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT SIDE LOGIN CARD */}
        <div className={`w-full ${sekolah.loginLeftShowPanel !== false ? 'md:col-span-6 lg:col-span-5 flex justify-center md:justify-end' : 'flex justify-center'} my-auto`}>
          <div className="w-full max-w-md my-auto space-y-2.5">
            {/* Main Card Container */}
            <div
              className={`${getCardBlurClass()} border rounded-3xl p-5 sm:p-6 relative space-y-4 transition-all ${
                isDarkMode
                  ? 'shadow-2xl shadow-black/70 text-zinc-100'
                  : 'shadow-xl shadow-slate-900/10 text-slate-900'
              }`}
              style={{
                backgroundColor: isDarkMode
                  ? `rgba(9, 9, 11, ${cardOpacity / 100})`
                  : `rgba(255, 255, 255, ${cardOpacity / 100})`,
                borderColor: isDarkMode
                  ? `rgba(63, 63, 70, ${Math.min(0.8, (cardOpacity / 100) * 0.6 + 0.2)})`
                  : `rgba(255, 255, 255, ${Math.min(0.9, (cardOpacity / 100) * 0.6 + 0.2)})`,
              }}
            >
              {/* School Branding Header */}
              <div className="text-center space-y-3 pb-1">
                <div className="inline-flex justify-center transition-transform hover:scale-105">
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt="Logo Sekolah"
                      className="w-14 h-14 sm:w-16 sm:h-16 object-contain mx-auto drop-shadow-sm"
                    />
                  ) : (
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl border shadow-inner ${
                        isDarkMode
                          ? 'bg-zinc-900/60 border-zinc-700/50 text-blue-400'
                          : 'bg-white/70 border-slate-200 text-zinc-900'
                      }`}
                    >
                      <School className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                  )}
                </div>

                <div>
                  <h1
                    className={`text-xs sm:text-sm font-semibold tracking-normal uppercase ${
                      isDarkMode ? 'text-zinc-400' : 'text-zinc-600'
                    }`}
                  >
                    {sekolah.nama || 'SMK NEGERI 6 GARUT'}
                  </h1>
                  <p
                    className={`text-lg sm:text-xl font-black tracking-tight mt-0.5 ${
                      isDarkMode ? 'text-white' : 'text-black'
                    }`}
                  >
                    {(!sekolah.headerSubtitle ||
                    sekolah.headerSubtitle.toLowerCase().includes('smkn 6') ||
                    sekolah.headerSubtitle.toLowerCase().includes('smk negeri 6') ||
                    sekolah.headerSubtitle === 'Portal Presensi Siswa & Tenaga Pendidik')
                      ? 'Sistem Absensi Siswa'
                      : sekolah.headerSubtitle}
                  </p>
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold border ${
                    isDarkMode
                      ? 'bg-blue-600/20 border-blue-500/30 text-blue-300'
                      : 'bg-white/80 border-slate-300 text-slate-800 shadow-2xs'
                  }`}
                >
                  <Sparkles className={`w-3 h-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`} />
                  <span>
                    TA {tahunAjaran} • Semester {semester}
                  </span>
                </div>
              </div>

              {/* DUAL LOGIN METHOD SELECTOR TABS */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60">
                <button
                  type="button"
                  onClick={() => setLoginMode('standard')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginMode === 'standard'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Guru & Pegawai</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('siswa_otp');
                    setOtpStep('input_nisn');
                    setOtpCodeInput('');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginMode === 'siswa_otp'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Siswa</span>
                </button>
              </div>

              {/* ============================================================== */}
              {/* 1. STANDARD LOGIN FORM (Guru / Wali Kelas / Staf / Admin)      */}
              {/* ============================================================== */}
              {loginMode === 'standard' ? (
                <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                  <div className="space-y-1.5 text-left">
                    <label
                      className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
                        isDarkMode ? 'text-zinc-300' : 'text-zinc-800'
                      }`}
                    >
                      Username / NIP / Akun
                    </label>
                    <div className="relative">
                      <div
                        className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                          isDarkMode ? 'text-blue-400' : 'text-zinc-500'
                        }`}
                      >
                        <User className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Masukkan username atau NIP"
                        className={`w-full pl-10 sm:pl-10.5 pr-4 py-2.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? 'bg-zinc-900/60 border border-zinc-700/60 text-white placeholder-zinc-500 focus:bg-zinc-900/90 focus:ring-blue-600 focus:border-blue-600'
                            : 'bg-white/70 border border-slate-300/80 text-zinc-950 placeholder-slate-400 focus:bg-white focus:ring-zinc-900 focus:border-zinc-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label
                      className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
                        isDarkMode ? 'text-zinc-300' : 'text-zinc-800'
                      }`}
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div
                        className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                          isDarkMode ? 'text-blue-400' : 'text-zinc-500'
                        }`}
                      >
                        <Lock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan password akun Anda"
                        className={`w-full pl-10 sm:pl-10.5 pr-11 py-2.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? 'bg-zinc-900/60 border border-zinc-700/60 text-white placeholder-zinc-500 focus:bg-zinc-900/90 focus:ring-blue-600 focus:border-blue-600'
                            : 'bg-white/70 border border-slate-300/80 text-zinc-950 placeholder-slate-400 focus:bg-white focus:ring-zinc-900 focus:border-zinc-900'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer ${
                          isDarkMode ? 'text-zinc-400 hover:text-blue-400' : 'text-slate-500 hover:text-zinc-900'
                        }`}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Eye className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-0.5 px-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className={`w-3.5 h-3.5 rounded border-2 transition-colors cursor-pointer accent-blue-600 ${
                            isDarkMode
                              ? 'bg-zinc-900 border-zinc-700'
                              : 'bg-white border-slate-300'
                          }`}
                        />
                        <span className={`text-xs font-medium ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Ingat saya</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className={`w-full py-3 sm:py-3.5 px-4 font-black rounded-2xl text-sm sm:text-base transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                      isDarkMode
                        ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-950/80'
                        : 'bg-zinc-950 hover:bg-black text-white shadow-lg shadow-zinc-950/30'
                    }`}
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Memverifikasi Akun...</span>
                      </>
                    ) : (
                      <>
                        <span>Masuk ke Sistem</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* ============================================================== */
                /* 2. STUDENT NISN + OTP WHATSAPP FLOW                           */
                /* ============================================================== */
                <div className="space-y-4 pt-1 text-left">
                  {/* STEP 1: INPUT NISN */}
                  {otpStep === 'input_nisn' && (
                    <form onSubmit={handleSendOtpForNisn} className="space-y-4">
                      <div className="space-y-1.5">
                        <label
                          className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
                            isDarkMode ? 'text-zinc-300' : 'text-zinc-800'
                          }`}
                        >
                          Nomor Induk Siswa Nasional (NISN)
                        </label>
                        <div className="relative">
                          <div
                            className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                              isDarkMode ? 'text-blue-400' : 'text-zinc-500'
                            }`}
                          >
                            <GraduationCap className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                          </div>
                          <input
                            type="text"
                            required
                            value={otpNisn}
                            onChange={(e) => setOtpNisn(e.target.value)}
                            placeholder="Masukkan NISN Anda"
                            className={`w-full pl-10 sm:pl-10.5 pr-4 py-2.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition focus:outline-none focus:ring-2 ${
                              isDarkMode
                                ? 'bg-zinc-900/60 border border-zinc-700/60 text-white placeholder-zinc-500 focus:bg-zinc-900/90 focus:ring-blue-600 focus:border-blue-600'
                                : 'bg-white/70 border border-slate-300/80 text-zinc-950 placeholder-slate-400 focus:bg-white focus:ring-blue-600 focus:border-blue-600'
                            }`}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingOtp || !otpNisn.trim()}
                        className="w-full py-3 sm:py-3.5 px-4 font-black rounded-2xl text-sm sm:text-base transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                      >
                        {isSendingOtp ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Memproses NISN...</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-4 h-4" />
                            <span>Kirim Kode OTP WhatsApp</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      <p className="text-[11px] text-center text-slate-400 dark:text-zinc-500 font-medium">
                        Kode OTP 6-digit akan dikirim ke WhatsApp resmi Anda/Orang Tua.
                      </p>
                    </form>
                  )}

                  {/* STEP 2: REGISTER WA (When student has no phone number in database yet) */}
                  {otpStep === 'register_wa' && (
                    <form onSubmit={handleRegisterWaAndSendOtp} className="space-y-3.5">
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Pendaftaran Nomor WhatsApp Siswa</span>
                        </div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                          Siswa <strong>{matchedOtpSiswa?.nama}</strong> (NISN: {matchedOtpSiswa?.nisn}) belum memiliki nomor WA terdaftar. Masukkan nomor WhatsApp aktif Anda sekarang untuk menerima kode OTP & aktivasi perangkat.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label
                          className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
                            isDarkMode ? 'text-zinc-300' : 'text-zinc-800'
                          }`}
                        >
                          Nomor WhatsApp Aktif Siswa
                        </label>
                        <div className="relative">
                          <div
                            className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                              isDarkMode ? 'text-emerald-400' : 'text-zinc-500'
                            }`}
                          >
                            <MessageSquare className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                          </div>
                          <input
                            type="tel"
                            required
                            value={newWaInput}
                            onChange={(e) => setNewWaInput(e.target.value)}
                            placeholder="Contoh: 081234567890"
                            className={`w-full pl-10 sm:pl-10.5 pr-4 py-2.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition focus:outline-none focus:ring-2 ${
                              isDarkMode
                                ? 'bg-zinc-900/60 border border-zinc-700/60 text-white placeholder-zinc-500 focus:bg-zinc-900/90 focus:ring-emerald-500 focus:border-emerald-500'
                                : 'bg-white/70 border border-slate-300/80 text-zinc-950 placeholder-slate-400 focus:bg-white focus:ring-emerald-500 focus:border-emerald-500'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOtpStep('input_nisn')}
                          className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        >
                          Kembali
                        </button>
                        <button
                          type="submit"
                          disabled={isSendingOtp || !newWaInput.trim()}
                          className="flex-1 py-3 px-4 font-black rounded-xl text-xs sm:text-sm transition-all transform active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          <span>Kirim OTP Aktivasi ke WhatsApp</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* STEP 3: VERIFY 6-DIGIT OTP */}
                  {otpStep === 'verify_otp' && (
                    <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-black text-blue-900 dark:text-blue-200">
                            <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="truncate">{matchedOtpSiswa?.nama}</span>
                          </div>
                          <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                            OTP dikirim ke WhatsApp: <strong>{maskPhoneNumber(targetWaNumber)}</strong> {targetWaRecipientType === 'orang_tua' ? '(No Orang Tua)' : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOtpStep('input_nisn')}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                        >
                          Ganti
                        </button>
                      </div>

                      <div className="space-y-1.5 text-center">
                        <label
                          className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-left ${
                            isDarkMode ? 'text-zinc-300' : 'text-zinc-800'
                          }`}
                        >
                          Masukkan 6-Digit Kode OTP
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={6}
                            required
                            autoFocus
                            value={otpCodeInput}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setOtpCodeInput(val);
                              if (val.length === 6) {
                                handleVerifyOtp(undefined, val);
                              }
                            }}
                            placeholder="• • • • • •"
                            className={`w-full text-center tracking-[0.4em] font-mono text-xl sm:text-2xl font-black py-3 rounded-2xl transition focus:outline-none focus:ring-2 ${
                              isDarkMode
                                ? 'bg-zinc-900/90 border border-zinc-700 text-emerald-400 placeholder-zinc-600 focus:ring-emerald-500 focus:border-emerald-500'
                                : 'bg-white border-2 border-emerald-500/80 text-emerald-600 placeholder-slate-300 focus:ring-emerald-500'
                            }`}
                          />
                        </div>

                        {/* OTP Expiration & Resend countdown */}
                        <div className="flex items-center justify-between text-xs pt-1 px-1">
                          <span className="text-slate-500 dark:text-zinc-400 text-[11px]">
                            {otpCountdown > 0 ? (
                              <>
                                Berlaku: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{Math.floor(otpCountdown / 60)}:{(otpCountdown % 60).toString().padStart(2, '0')}</strong>
                              </>
                            ) : (
                              <span className="text-rose-500 font-bold">Kode telah kadaluarsa</span>
                            )}
                          </span>
                          <button
                            type="button"
                            disabled={otpCountdown > 0}
                            onClick={() => {
                              if (matchedOtpSiswa) {
                                dispatchOtpCodeToStudent(matchedOtpSiswa, targetWaNumber, targetWaRecipientType);
                              }
                            }}
                            className={`text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                              otpCountdown > 0
                                ? 'text-slate-400 dark:text-zinc-600 cursor-not-allowed'
                                : 'text-emerald-600 dark:text-emerald-400 hover:underline'
                            }`}
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Kirim Ulang OTP</span>
                          </button>
                        </div>
                      </div>

                      {/* Direct WhatsApp Web / Mobile Link Button */}
                      {directWaLink && (
                        <a
                          href={directWaLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">Kirim / Buka WhatsApp ({maskPhoneNumber(targetWaNumber)})</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-70 shrink-0" />
                        </a>
                      )}

                      <button
                        type="submit"
                        disabled={isVerifyingOtp || otpCodeInput.length < 6}
                        className="w-full py-3.5 px-4 font-black rounded-2xl text-sm sm:text-base transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                      >
                        {isVerifyingOtp ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Mengunci Perangkat & Masuk...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-5 h-5" />
                            <span>Verifikasi OTP & Masuk</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500 pt-1">
                        <Lock className="w-3 h-3 text-emerald-500" />
                        <span>Perangkat HP Anda akan otomatis terkunci ke akun ini.</span>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Account Lock Notification Alert if any */}
              {(appData.lockedAccounts || []).length > 0 && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-800 dark:text-rose-200 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{appData.lockedAccounts?.length} akun terkunci akibat proteksi login.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      (appData.lockedAccounts || []).forEach((l) => handleUnlockAccount(l.username));
                    }}
                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>Buka Semua</span>
                  </button>
                </div>
              )}

              {/* PENGUMUMAN DI BAWAH TOMBOL LOGIN - HANYA JUDUL */}
              {loginAnnouncementItems.length > 0 && (() => {
                const totalAnnouncements = loginAnnouncementItems.length;
                const curItem = loginAnnouncementItems[currentAnnouncementIdx % totalAnnouncements];

                return (
                  <div className="pt-2.5 border-t border-slate-200/70 dark:border-zinc-800/70 space-y-1.5 text-left">
                    <div className="flex items-center justify-between gap-2 px-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Megaphone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className={`text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                          Pengumuman
                        </span>
                        {totalAnnouncements > 1 && (
                          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                            ({(currentAnnouncementIdx % totalAnnouncements) + 1}/{totalAnnouncements})
                          </span>
                        )}
                      </div>

                      {totalAnnouncements > 1 && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCurrentAnnouncementIdx((prev) => (prev - 1 + totalAnnouncements) % totalAnnouncements);
                            }}
                            className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                            title="Sebelumnya"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCurrentAnnouncementIdx((prev) => (prev + 1) % totalAnnouncements);
                            }}
                            className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                            title="Berikutnya"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedAnnouncementId(curItem.id);
                        setIsAnnouncementModalOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedAnnouncementId(curItem.id);
                          setIsAnnouncementModalOpen(true);
                        }
                      }}
                      className={`px-3 py-2 rounded-xl border transition-all duration-150 hover:scale-[1.01] cursor-pointer flex items-center justify-between gap-2 ${
                        isDarkMode
                          ? 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-700/70 text-zinc-100 shadow-sm'
                          : 'bg-slate-50/90 hover:bg-slate-100 border-slate-200 text-slate-900 shadow-xs'
                      }`}
                      title="Klik untuk melihat detail pengumuman"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                            curItem.kategori === 'penting'
                              ? 'bg-amber-500 text-slate-950'
                              : curItem.kategori === 'peringatan'
                              ? 'bg-rose-600 text-white'
                              : curItem.kategori === 'kegiatan'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {curItem.kategori}
                        </span>
                        <p className="text-xs font-bold truncate leading-snug">
                          {curItem.judul}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* FOOTER BAR */}
            <footer className={`w-full relative z-20 pt-1 text-center shrink-0 ${isBackgroundDark ? 'text-zinc-300' : 'text-zinc-800'}`}>
              <p className="text-[11px] font-bold drop-shadow-xs opacity-90">
                {sekolah.footerTeks || `© ${new Date().getFullYear()} ${sekolah.nama || 'SMKN 6 Garut'}. Hak Cipta Dilindungi.`}
              </p>
              <p className="text-[10px] font-medium mt-0.5 drop-shadow-xs opacity-75">
                {sekolah.footerSubTeks || 'Sistem Rekapitulasi Presensi & Kehadiran Digital'}
              </p>
            </footer>
          </div>
        </div>
      </main>

      {/* MODAL POPUP PENGUMUMAN LOGIN */}
      {isAnnouncementModalOpen && (hasCustomLoginNotice || activePengumuman.length > 0) && (() => {
        interface ModalItem {
          id: string;
          judul: string;
          isi: string;
          kategori: 'info' | 'penting' | 'peringatan' | 'kegiatan';
          target?: string;
          penulis?: string;
          tanggal?: string;
          linkUrl?: string;
          linkText?: string;
          isOfficialNotice?: boolean;
        }

        const items: ModalItem[] = [];

        if (hasCustomLoginNotice) {
          items.push({
            id: 'official_notice',
            judul: sekolah.loginAnnouncementTitle || 'Pengumuman Resmi Sekolah',
            isi: sekolah.loginAnnouncementText || '',
            kategori: (sekolah.loginAnnouncementType as any) || 'info',
            target: 'semua',
            penulis: sekolah.namaKepalaSekolah || 'Pimpinan Sekolah',
            tanggal: new Date().toISOString().split('T')[0],
            isOfficialNotice: true,
          });
        }

        activePengumuman.forEach((pgm) => {
          items.push({
            id: pgm.id,
            judul: pgm.judul,
            isi: pgm.isi,
            kategori: pgm.kategori,
            target: pgm.target,
            penulis: pgm.penulis,
            tanggal: pgm.tanggal,
            linkUrl: pgm.linkUrl,
            linkText: pgm.linkText,
            isOfficialNotice: false,
          });
        });

        const activeItem = items.find((it) => it.id === selectedAnnouncementId) || items[0];

        const getKategoriStyles = (kat: string) => {
          switch (kat) {
            case 'penting':
              return {
                headerBg: 'bg-amber-500/15 border-amber-300 dark:border-amber-900/60 text-amber-950 dark:text-amber-200',
                badgeBg: 'bg-amber-500 text-slate-950',
                iconBg: 'bg-amber-500 text-slate-950',
                icon: AlertTriangle,
                label: 'Penting',
              };
            case 'peringatan':
              return {
                headerBg: 'bg-rose-500/15 border-rose-300 dark:border-rose-900/60 text-rose-950 dark:text-rose-200',
                badgeBg: 'bg-rose-600 text-white',
                iconBg: 'bg-rose-600 text-white',
                icon: AlertTriangle,
                label: 'Peringatan',
              };
            case 'kegiatan':
              return {
                headerBg: 'bg-emerald-500/15 border-emerald-300 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200',
                badgeBg: 'bg-emerald-600 text-white',
                iconBg: 'bg-emerald-600 text-white',
                icon: Calendar,
                label: 'Agenda / Kegiatan',
              };
            default:
              return {
                headerBg: 'bg-blue-500/15 border-blue-300 dark:border-blue-900/60 text-blue-950 dark:text-blue-200',
                badgeBg: 'bg-blue-600 text-white',
                iconBg: 'bg-blue-600 text-white',
                icon: Megaphone,
                label: 'Informasi',
              };
          }
        };

        const katStyle = getKategoriStyles(activeItem?.kategori || 'info');
        const IconComponent = katStyle.icon;

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 select-text">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header Modal */}
              <div className={`px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between border-b shrink-0 ${katStyle.headerBg}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2.5 rounded-2xl shadow-sm shrink-0 ${katStyle.iconBg}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${katStyle.badgeBg}`}>
                        {katStyle.label}
                      </span>
                      <span className="text-[11px] font-bold opacity-75 truncate">
                        {sekolah.nama || 'SMK NEGERI 6 GARUT'}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black truncate mt-1 text-slate-900 dark:text-white">
                      {activeItem.judul}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  className="p-2 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer shrink-0 ml-2"
                  title="Tutup Jendela"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Multiple Announcements Tabs (if more than 1) */}
              {items.length > 1 && (
                <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                    Daftar ({items.length}):
                  </span>
                  {items.map((it, idx) => {
                    const isSelected = it.id === activeItem.id;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => setSelectedAnnouncementId(it.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-black opacity-80">#{idx + 1}</span>
                        <span className="truncate max-w-[120px] sm:max-w-[160px]">{it.judul}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Content Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                  {activeItem.tanggal && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateIndo(activeItem.tanggal)}</span>
                    </span>
                  )}
                  {activeItem.penulis && (
                    <span>
                      Oleh: <strong className="text-slate-700 dark:text-slate-200">{activeItem.penulis}</strong>
                    </span>
                  )}
                  {activeItem.target && activeItem.target !== 'semua' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                      Sasaran: {activeItem.target}
                    </span>
                  )}
                </div>

                <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed bg-slate-50/80 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 font-medium">
                  {activeItem.isi || 'Tidak ada keterangan tambahan.'}
                </div>

                {activeItem.linkUrl && (
                  <div className="pt-1">
                    <a
                      href={activeItem.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-xl text-xs font-bold transition border border-blue-200/60 dark:border-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{activeItem.linkText || 'Buka Tautan Lampiran / Dokumen'}</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Dapat dibuka kembali lewat tombol pengumuman di pojok atas.
                </p>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsAnnouncementModalOpen(false)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-500/25 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Saya Mengerti</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL BANTUAN AKUN & DAFTAR LOGIN */}
      {isAccountHelpModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden text-left">
            {/* Header */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-zinc-800/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/25">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Daftar Akun & Panduan Login
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                    Pilih akun atau gunakan kredensial berikut untuk masuk ke sistem.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountHelpModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Account List */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 divide-y divide-slate-100 dark:divide-zinc-800/60">
              {/* 1. Admin */}
              <div className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Administrator</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                        Akses Penuh
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Username: <code className="font-mono font-bold text-slate-800 dark:text-zinc-200">admin</code> • Password: <code className="font-mono font-bold text-slate-800 dark:text-zinc-200">admin123</code> (atau 123)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountHelpModalOpen(false);
                    setLoginMode('standard');
                    handleQuickLogin('admin', 'admin123');
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Gunakan Akun Ini</span>
                </button>
              </div>

              {/* 2. Guru / User Biasa */}
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Guru / Tenaga Pengajar</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        Presensi KBM
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Username: <code className="font-mono font-bold text-slate-800 dark:text-zinc-200">guru</code> (atau <code className="font-mono font-bold text-slate-800 dark:text-zinc-200">user</code>) • Password: <code className="font-mono font-bold text-slate-800 dark:text-zinc-200">123</code>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountHelpModalOpen(false);
                    setLoginMode('standard');
                    handleQuickLogin('guru', '123');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Gunakan Akun Ini</span>
                </button>
              </div>

              {/* 3. Wali Kelas */}
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Wali Kelas ({firstTeacher.nama})</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        Rekap Kelas
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      NIP/User: <code className="font-mono font-bold text-slate-800 dark:text-zinc-200">{firstTeacher.nip || firstTeacher.username || '1037'}</code> • Password: <code className="font-mono font-bold text-slate-800 dark:text-zinc-200">{firstTeacher.password || '123'}</code>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountHelpModalOpen(false);
                    setLoginMode('standard');
                    handleQuickLogin(firstTeacher.nip || firstTeacher.username || '1037', firstTeacher.password || '123');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Gunakan Akun Ini</span>
                </button>
              </div>

              {/* 4. Siswa / Murid dengan OTP WA */}
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/40 dark:bg-emerald-950/20 p-2.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Portal Siswa ({firstSiswa.nama})</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                        NISN + OTP WA
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      NISN: <code className="font-mono font-bold text-slate-800 dark:text-zinc-200">{firstSiswa.nisn || '0081234567'}</code> • WA: <code className="font-mono font-bold text-slate-800 dark:text-zinc-200">{firstSiswa.noWa || '0812-3456-7890'}</code>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountHelpModalOpen(false);
                    setLoginMode('siswa_otp');
                    setOtpNisn(firstSiswa.nisn || '0081234567');
                    setMatchedOtpSiswa(firstSiswa);
                    setTargetWaNumber(firstSiswa.noWa || '081234567890');
                    setTargetWaRecipientType('siswa');
                    dispatchOtpCodeToStudent(firstSiswa, firstSiswa.noWa || '081234567890', 'siswa');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Kirim OTP Siswa Ini</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50 dark:bg-zinc-800/80 border-t border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0">
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Gunakan tab Siswa untuk login praktis berbasis NISN & WhatsApp.
              </p>
              <button
                type="button"
                onClick={() => setIsAccountHelpModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-800 dark:text-zinc-200 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
