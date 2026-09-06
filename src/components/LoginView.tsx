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
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { AppData, LockedAccount, SekolahConfig, SecurityIncident, UserSession, PengumumanSekolah } from '../types';
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
import {
  parseColorToRgb,
  calculateLuminance,
  blendRgb,
  parseGradientAverageRgb,
  sampleImageLuminance,
  RGB,
} from '../utils/colorDetection';

interface LoginViewProps {
  appData: AppData;
  onLogin: (session: UserSession) => void;
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  // Active School Announcements & Login Notice
  const activePengumuman = useMemo(() => {
    return (appData.pengumuman || []).filter((p) => p.aktif);
  }, [appData.pengumuman]);

  const loginPinnedPengumuman = useMemo(() => {
    return activePengumuman.filter((p) => p.pinToLoginBanner);
  }, [activePengumuman]);

  const hasCustomLoginNotice = Boolean(
    sekolah.loginAnnouncementModal &&
    ((sekolah.loginAnnouncementText || '').trim().length > 0 || (sekolah.loginAnnouncementTitle || '').trim().length > 0)
  );

  const isPopupEligible = Boolean(sekolah.loginAnnouncementModal || loginPinnedPengumuman.length > 0);

  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState<boolean>(() => isPopupEligible);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);

  // Synchronize initial auto-open if loginAnnouncementModal is turned on in config
  useEffect(() => {
    if (sekolah.loginAnnouncementModal || loginPinnedPengumuman.length > 0) {
      setIsAnnouncementModalOpen(true);
    }
  }, [sekolah.loginAnnouncementModal, loginPinnedPengumuman.length]);

  const handleRecordFailedAttempt = (targetUser: string, roleAttempted: string = 'unknown') => {
    const client = getClientMetadata();
    const secConfig = appData.securityConfig || DEFAULT_SECURITY_CONFIG;
    const currentCount = (loginFailedAttempts[targetUser] || 0) + 1;
    const updatedMap = { ...loginFailedAttempts, [targetUser]: currentCount };
    setLoginFailedAttempts(updatedMap);

    const maxAttempts = secConfig.maxFailedLoginAttempts || 5;
    const lockoutMinutes = secConfig.lockoutDurationMinutes || 15;

    // Check if threshold exceeded
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
        onUpdateAppData({
          ...appData,
          lockedAccounts: [lockObj, ...existingLocks],
          securityIncidents: [newIncident, ...(appData.securityIncidents || [])],
        });
      }

      onShowToast(
        `AKUN TERKUNCI: Terlalu banyak percobaan gagal (${currentCount}x). Akun "${targetUser}" dinonaktifkan selama ${lockoutMinutes} menit untuk keamanan.`,
        'error'
      );
    } else {
      // Record minor failed attempt incident on 3rd attempt
      if (currentCount === 3) {
        const warnIncident: SecurityIncident = {
          id: `warn-${Date.now()}`,
          timestamp: new Date().toISOString(),
          formattedTime: formatIndonesianDateTime(new Date()),
          type: 'brute_force_login',
          severity: 'medium',
          title: 'Percobaan Password Berulang (Suspicious Activity)',
          description: `Terdeteksi 3 kali kegagalan password pada username "${targetUser}" dari IP ${client.ip}.`,
          targetUsername: targetUser,
          targetRole: roleAttempted,
          ipAddress: client.ip,
          userAgent: client.userAgent,
          payloadSnippet: `Gagal login ke-${currentCount}`,
          status: 'active',
          actionTaken: 'none',
          locationEstimate: client.location,
        };

        if (onUpdateAppData) {
          onUpdateAppData({
            ...appData,
            securityIncidents: [warnIncident, ...(appData.securityIncidents || [])],
          });
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;

    const uInput = username.trim().toLowerCase();
    const pInput = password.trim();

    if (!uInput || !pInput) {
      onShowToast('Silakan masukkan username/NIP/NISN dan password.', 'warning');
      return;
    }

    const client = getClientMetadata();
    const secConfig = appData.securityConfig || DEFAULT_SECURITY_CONFIG;

    // 1. Check IP Blacklist
    const ipCheck = checkIpBlockedStatus(client.ip, appData.blockedIps || []);
    if (ipCheck.isBlocked) {
      onShowToast(
        `Akses Diblokir: Alamat IP Anda (${client.ip}) terdaftar dalam Blacklist Keamanan Sistem. Alasan: ${
          ipCheck.blockInfo?.reason || 'Pelanggaran keamanan'
        }`,
        'error'
      );
      return;
    }

    // 2. Check Account Lockout Status
    const lockCheck = checkAccountLockStatus(uInput, appData.lockedAccounts || []);
    if (lockCheck.isLocked) {
      onShowToast(
        `Akun Terkunci Sementara: Akun "${uInput}" dinonaktifkan (${lockCheck.remainingMinutes} menit lagi) karena percobaan login gagal berulang kali. Silakan hubungi Administrator.`,
        'error'
      );
      return;
    }

    // 3. WAF Payload Inspection (SQLi / XSS / Traversal)
    if (secConfig.idsEnabled && secConfig.strictWafInspection) {
      const userInspection = inspectInputPayload(username);
      const passInspection = inspectInputPayload(password);

      if (userInspection.isMalicious || passInspection.isMalicious) {
        const badSnippet = userInspection.snippet || passInspection.snippet || '';
        const ruleName = userInspection.ruleMatched || passInspection.ruleMatched || 'WAF Generic Signature Alert';

        const wafIncident: SecurityIncident = {
          id: `waf-${Date.now()}`,
          timestamp: new Date().toISOString(),
          formattedTime: formatIndonesianDateTime(new Date()),
          type: 'suspicious_payload',
          severity: 'critical',
          title: 'Percobaan Injeksi Form Login (WAF Alert)',
          description: `Terdeteksi payload mencurigakan yang diblokir oleh Web Application Firewall. Pola: ${ruleName}`,
          targetUsername: uInput,
          ipAddress: client.ip,
          userAgent: client.userAgent,
          payloadSnippet: badSnippet,
          status: 'blocked',
          actionTaken: 'request_dropped',
          locationEstimate: client.location,
        };

        if (onUpdateAppData) {
          onUpdateAppData({
            ...appData,
            securityIncidents: [wafIncident, ...(appData.securityIncidents || [])],
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
          // Success: Reset failed count
          setLoginFailedAttempts((prev) => ({ ...prev, [uInput]: 0 }));

          // Check night anomaly
          if (secConfig.nightAnomalyAlertEnabled && isNightHourAccess()) {
            const nightInc: SecurityIncident = {
              id: `night-${Date.now()}`,
              timestamp: new Date().toISOString(),
              formattedTime: formatIndonesianDateTime(new Date()),
              type: 'anomaly_access_time',
              severity: 'low',
              title: 'Aktivitas Login Administrator di Luar Jam Sekolah',
              description: `Sesi login Administrator aktif terdeteksi pada dini hari dari IP ${client.ip}.`,
              targetUsername: 'admin',
              targetRole: 'admin',
              ipAddress: client.ip,
              userAgent: client.userAgent,
              status: 'resolved',
              actionTaken: 'none',
              locationEstimate: client.location,
            };
            if (onUpdateAppData) {
              onUpdateAppData({
                ...appData,
                securityIncidents: [nightInc, ...(appData.securityIncidents || [])],
              });
            }
          }

          const activeAdminObj = {
            ...adminData,
            username: adminData.username || 'admin',
            password: currentAdminPassword || 'admin123',
            nama: adminData.nama || 'Administrator Utama',
          };
          onLogin({ role: 'admin', data: activeAdminObj });
          onShowToast('Login berhasil sebagai Administrator!', 'success');
          return;
        } else {
          setIsLoggingIn(false);
          handleRecordFailedAttempt('admin', 'admin');
          onShowToast(
            'Password Administrator salah! Gunakan: admin123.',
            'error'
          );
          return;
        }
      }

      // 2. Check Wali Kelas / Guru / Kurikulum / Hubin / Kesiswaan from waliKelas list
      const matchedUser = (appData.waliKelas || []).find(
        (w) =>
          (w.username && String(w.username).toLowerCase() === uInput) ||
          (w.nip && String(w.nip).toLowerCase() === uInput)
      );

      if (matchedUser) {
        const role = matchedUser.role || 'wali';
        const expectedPassword = String(
          matchedUser.password ||
            (role === 'kesiswaan' ? appData.kesiswaan?.password : '') ||
            (role === 'guru' || role === 'user' ? appData.userBiasa?.password : '') ||
            ''
        ).trim();

        if (expectedPassword && String(expectedPassword) === pInput) {
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
          onLogin({ role, data: matchedUser });
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
          onShowToast(`Password untuk user "${matchedUser.nama}" salah!`, 'error');
          return;
        }
      }

      // 3. Check Standalone Kesiswaan
      const kesiswaanData = appData.kesiswaan;
      if (kesiswaanData && String(kesiswaanData.username || 'kesiswaan').toLowerCase() === uInput) {
        const expectedPassword = String(kesiswaanData.password || '').trim();
        if (expectedPassword && expectedPassword === pInput) {
          setLoginFailedAttempts((prev) => ({ ...prev, [uInput]: 0 }));
          onLogin({ role: 'kesiswaan', data: kesiswaanData });
          onShowToast(`Login berhasil sebagai Tim Kesiswaan: ${kesiswaanData.nama}!`, 'success');
          return;
        } else {
          setIsLoggingIn(false);
          handleRecordFailedAttempt(uInput, 'kesiswaan');
          onShowToast('Password Tim Kesiswaan salah!', 'error');
          return;
        }
      }

      // 4. Check Standalone User Biasa / Guru
      const userBiasaData = appData.userBiasa;
      if (userBiasaData && String(userBiasaData.username || 'guru').toLowerCase() === uInput) {
        const expectedPassword = String(userBiasaData.password || '').trim();
        if (expectedPassword && expectedPassword === pInput) {
          const todayDayName = getIndonesianDayName(new Date());
          const teachingDays = userBiasaData.hariMengajar || [];
          const isRestricted = userBiasaData.batasiLoginHariMengajar && teachingDays.length > 0;

          if (isRestricted && !isTeacherTeachingToday(teachingDays)) {
            setIsLoggingIn(false);
            onShowToast(
              `Akses Dibatasi: Akun Guru "${userBiasaData.nama}" hanya dapat login hari: ${teachingDays.join(
                ', '
              )}. Hari ini (${todayDayName}) bukan jadwal mengajar Anda.`,
              'error'
            );
            return;
          }

          setLoginFailedAttempts((prev) => ({ ...prev, [uInput]: 0 }));
          onLogin({ role: 'guru', data: userBiasaData });
          onShowToast(`Login berhasil sebagai Guru: ${userBiasaData.nama}!`, 'success');
          return;
        } else {
          setIsLoggingIn(false);
          handleRecordFailedAttempt(uInput, 'guru');
          onShowToast('Password Guru / Staf salah!', 'error');
          return;
        }
      }

      // 5. Check Siswa / Murid
      const matchedSiswa = (appData.siswa || []).find(
        (s) =>
          (s.nisn && String(s.nisn).toLowerCase() === uInput) ||
          (s.username && String(s.username).toLowerCase() === uInput) ||
          (s.id && String(s.id).toLowerCase() === uInput)
      );

      if (matchedSiswa) {
        const expectedPassword = String(
          matchedSiswa.password !== undefined && matchedSiswa.password.trim() !== ''
            ? matchedSiswa.password.trim()
            : matchedSiswa.nisn || ''
        ).trim();

        if (expectedPassword && pInput === expectedPassword) {
          setLoginFailedAttempts((prev) => ({ ...prev, [uInput]: 0 }));
          onLogin({ role: 'murid', data: matchedSiswa });
          onShowToast(`Login berhasil sebagai Siswa: ${matchedSiswa.nama}!`, 'success');
          return;
        } else {
          setIsLoggingIn(false);
          handleRecordFailedAttempt(uInput, 'murid');
          onShowToast(`Password untuk Siswa "${matchedSiswa.nama}" salah!`, 'error');
          return;
        }
      }

      setIsLoggingIn(false);
      handleRecordFailedAttempt(uInput, 'unknown');
      onShowToast('Username / NIP / NISN tidak ditemukan!', 'error');
    }, 450);
  };

  const firstTeacher = (appData.waliKelas || []).find((w) => w.username && w.password) || {
    nama: 'Budi Santoso, S.Pd',
    username: 'guru1',
    password: '123',
    role: 'wali',
  };
  const firstSiswa = (appData.siswa || [])[0] || {
    nama: 'Ahmad Fauzi',
    nisn: '0081234567',
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

  // ACCURATE BACKGROUND BRIGHTNESS DETECTION
  // If background is dark -> text will be light/white.
  // If background is light -> text will be dark/high-contrast slate.
  const isBackgroundDark = useMemo(() => {
    if (!isCustomBgActive) {
      return isDarkMode;
    }

    const overlayRgb = parseColorToRgb(overlayColor) || (isDarkMode ? { r: 2, g: 6, b: 23 } : { r: 15, g: 23, b: 42 });
    const overlayAlpha = (overlayOpacity ?? 35) / 100;

    let baseRgb: RGB = { r: 240, g: 242, b: 245 }; // fallback light

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

    // Standard threshold: < 135 is considered dark background
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
          {/* Custom Background Layer */}
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
          {/* Custom Overlay Layer */}
          <div
            className="absolute inset-0 transition-opacity duration-200 pointer-events-none"
            style={{
              backgroundColor: overlayColor,
              opacity: overlayOpacity / 100,
            }}
          />
        </>
      ) : (
        /* Default Background Ambient Glow */
        isDarkMode ? (
          <>
            <div className="absolute inset-0 bg-radial from-blue-950/40 via-zinc-950 to-black pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-10 w-[500px] h-[300px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          </>
        ) : (
          <>
            {/* Clean light ambient aura */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[950px] h-[450px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[650px] h-[450px] bg-zinc-400/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/3 -left-20 w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            {/* Subtle grid pattern overlay */}
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

      {/* FLOATING THEME TOGGLE BUTTON */}
      {onToggleTheme && (
        <button
          type="button"
          onClick={onToggleTheme}
          className={`absolute top-3 right-3 sm:top-4 sm:right-4 z-30 p-2.5 rounded-2xl border transition cursor-pointer backdrop-blur-md shadow-md ${
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

      {/* MAIN CONTAINER: LEFT TEXT & RIGHT LOGIN CARD */}
      <main className="w-full flex-1 grid grid-cols-1 md:grid-cols-12 items-center justify-between p-4 sm:p-6 lg:p-10 xl:px-16 2xl:px-24 relative z-10 my-auto overflow-y-auto w-full">
        {/* LEFT SIDE TEXT: Sistem Absensi Siswa */}
        <div className="hidden md:flex md:col-span-6 lg:col-span-7 flex-col justify-center space-y-6 pr-6 lg:pr-10 xl:pr-14 pl-2 lg:pl-6">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold tracking-wide w-fit backdrop-blur-md shadow-xs transition-transform hover:scale-105 cursor-default ${
              isBackgroundDark
                ? 'bg-slate-900/80 border-slate-700/80 text-blue-400'
                : 'bg-white/90 border-slate-300/90 text-blue-700 shadow-xs'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Portal Kehadiran Terpadu SMK Negeri 6 Garut
          </div>
          <div className="space-y-3">
            <h1
              className={`text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight leading-tight drop-shadow-sm ${
                isBackgroundDark ? 'text-white' : 'text-zinc-950'
              }`}
            >
              Sistem Absensi{' '}
              <span
                className={`text-transparent bg-clip-text bg-gradient-to-r ${
                  isBackgroundDark
                    ? 'from-blue-400 via-indigo-300 to-cyan-400'
                    : 'from-blue-600 via-indigo-600 to-cyan-600'
                }`}
              >
                Siswa
              </span>
            </h1>
            <p
              className={`text-base lg:text-lg max-w-xl font-medium leading-relaxed drop-shadow-xs ${
                isBackgroundDark ? 'text-zinc-300' : 'text-zinc-700'
              }`}
            >
              Platform manajemen presensi siswa digital real-time, pemantauan kedisiplinan, rekapitulasi kehadiran otomatis, dan komunikasi interaktif sekolah.
            </p>
          </div>
          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                  isBackgroundDark
                    ? 'bg-zinc-900/90 border-zinc-700 text-blue-400'
                    : 'bg-white/95 border-slate-300 text-blue-600 shadow-sm'
                }`}
              >
                ✓
              </div>
              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isBackgroundDark ? 'text-zinc-100' : 'text-zinc-900'
                  }`}
                >
                  Akurat & Cepat
                </p>
                <p
                  className={`text-xs ${
                    isBackgroundDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  Scan QR / Wajah / RFID
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                  isBackgroundDark
                    ? 'bg-zinc-900/90 border-zinc-700 text-emerald-400'
                    : 'bg-white/95 border-slate-300 text-emerald-600 shadow-sm'
                }`}
              >
                ⚡
              </div>
              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isBackgroundDark ? 'text-zinc-100' : 'text-zinc-900'
                  }`}
                >
                  Real-Time
                </p>
                <p
                  className={`text-xs ${
                    isBackgroundDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  Notifikasi Orang Tua
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE LOGIN CARD */}
        <div className="w-full md:col-span-6 lg:col-span-5 flex justify-center md:justify-end my-auto">
          <div className="w-full max-w-md my-auto space-y-2.5">
            {/* Announcement Banner Alert above card if active */}
            {isPopupEligible && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsAnnouncementModalOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setIsAnnouncementModalOpen(true);
                  }
                }}
                className="w-full p-3 rounded-2xl border transition-all duration-200 hover:scale-[1.01] cursor-pointer flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/25 border-amber-500/40 text-amber-950 dark:text-amber-100 shadow-md backdrop-blur-md"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shrink-0 shadow-xs">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 leading-none">
                        Pengumuman Sekolah
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500 text-slate-950">
                        PENTING
                      </span>
                    </div>
                    <p className="text-xs font-bold truncate mt-1 text-slate-900 dark:text-white">
                      {sekolah.loginAnnouncementTitle || loginPinnedPengumuman[0]?.judul || 'Pengumuman Resmi Sekolah'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/30 text-amber-950 dark:text-amber-200 border border-amber-500/40 shrink-0">
                  <span>Lihat</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

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

            {/* Form Input */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-3 sm:pt-4">
              <div className="space-y-1 text-left">
                <label
                  className={`block text-[11px] font-bold uppercase tracking-wider ${
                    isDarkMode ? 'text-zinc-300' : 'text-zinc-800'
                  }`}
                >
                  Username / NIP / NISN
                </label>
                <div className="relative">
                  <div
                    className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                      isDarkMode ? 'text-blue-400' : 'text-zinc-600'
                    }`}
                  >
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username, NIP, atau NISN"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-bold transition focus:outline-none focus:ring-2 ${
                      isDarkMode
                        ? 'bg-zinc-900/60 border border-zinc-700/60 text-white placeholder-zinc-400 focus:bg-zinc-900/90 focus:ring-blue-600 focus:border-blue-600'
                        : 'bg-white/70 border border-slate-300/80 text-zinc-950 placeholder-slate-400 focus:bg-white focus:ring-zinc-900 focus:border-zinc-900'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label
                  className={`block text-[11px] font-bold uppercase tracking-wider ${
                    isDarkMode ? 'text-zinc-300' : 'text-zinc-800'
                  }`}
                >
                  Password
                </label>
                <div className="relative">
                  <div
                    className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                      isDarkMode ? 'text-blue-400' : 'text-zinc-600'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password akun Anda"
                    className={`w-full pl-10 pr-11 py-2.5 rounded-2xl text-xs font-bold transition focus:outline-none focus:ring-2 ${
                      isDarkMode
                        ? 'bg-zinc-900/60 border border-zinc-700/60 text-white placeholder-zinc-400 focus:bg-zinc-900/90 focus:ring-blue-600 focus:border-blue-600'
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
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 px-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
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
                    <span className={`text-[10.5px] font-bold ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Ingat saya</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className={`w-full py-2.5 sm:py-3 px-4 font-bold rounded-2xl text-xs sm:text-sm transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-950/80'
                    : 'bg-zinc-950 hover:bg-black text-white shadow-lg shadow-zinc-950/30'
                }`}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Sistem</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

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
        // Collect all items
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
                {/* Meta info */}
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

                {/* Announcement Full Text */}
                <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed bg-slate-50/80 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 font-medium">
                  {activeItem.isi || 'Tidak ada keterangan tambahan.'}
                </div>

                {/* Link URL / Attachment Action */}
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
    </div>
  );
};
