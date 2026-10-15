import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Tv,
  Monitor,
  Clock,
  Calendar,
  Sun,
  Sunset,
  Users,
  BookOpen,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  LayoutGrid,
  List,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Radio,
  ArrowRight,
  GraduationCap,
  Printer,
  RefreshCw,
  Sliders,
  DoorOpen,
  X,
  UserCheck,
  Zap,
  ChevronDown
} from 'lucide-react';
import { AppData, JadwalMengajarGuru, UserSession, ViewType, Kelas } from '../../types';
import {
  HARI_SENIN_JUMAT,
  LIST_JAM_ANGKA,
  JAM_PELAJARAN_TIMES,
  getJamPelajaranTime,
  parseJamKeList,
  determineKelasKelompok,
  MATRIX_SHIFT_OPTIONS,
  MatrixShiftOptionId
} from './JadwalMengajarView';
import { cleanMapelName } from '../../utils/helpers';

interface ProyeksiJadwalGuruViewProps {
  appData: AppData;
  currentUser?: UserSession;
  onNavigateView?: (view: ViewType) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const ProyeksiJadwalGuruView: React.FC<ProyeksiJadwalGuruViewProps> = ({
  appData,
  currentUser,
  onNavigateView,
  onShowToast,
}) => {
  // 1. REAL-TIME CLOCK & CURRENT TIME STATES
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Date and Time strings
  const formattedTimeString = useMemo(() => {
    return currentTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/\./g, ':');
  }, [currentTime]);

  const formattedDateString = useMemo(() => {
    return currentTime.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [currentTime]);

  // Current day string ('Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu')
  const todayDayName = useMemo(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[currentTime.getDay()];
  }, [currentTime]);

  // Active selected day filter (defaults to today if weekday, else 'Senin')
  const [selectedHari, setSelectedHari] = useState<string>(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentName = days[new Date().getDay()];
    return (HARI_SENIN_JUMAT as readonly string[]).includes(currentName) ? currentName : 'Senin';
  });

  // 2. DISPLAY & PROJECTION CONFIGURATION STATES
  // Theme Mode: 'oled' (Ultra Dark TV) | 'light' (Daylight Projector) | 'cyber' (Neon Tech Blue)
  const [projectionTheme, setProjectionTheme] = useState<'oled' | 'light' | 'cyber'>('oled');
  
  // Font Size: 'standard' | 'large' (TV Screen) | 'xlarge' (Wall Projector)
  const [fontSizeMode, setFontSizeMode] = useState<'standard' | 'large' | 'xlarge'>('large');
  
  // Display View Mode:
  // 'matrix_jam' = Grid Jam (Baris: Guru/Kelas)
  // 'live_now' = Scoreboard Jam Saat Ini (Who is teaching right now!)
  // 'shift_cards' = Kartu Per Shift (Grouped Pagi & Siang)
  const [displayMode, setDisplayMode] = useState<'matrix_jam' | 'live_now' | 'shift_cards'>('matrix_jam');
  
  // Matrix Row Subject: 'guru' (Group by Teacher) vs 'kelas' (Group by Class)
  const [matrixRowMode, setMatrixRowMode] = useState<'guru' | 'kelas'>('kelas');

  // Filter Jam Mode: 'active_only' | 'all' | 1..10
  // Defaults to 'active_only' as explicitly requested by user ("hanya tampilkan jam yang aktif")
  const [jamFilterMode, setJamFilterMode] = useState<'active_only' | 'all' | number>('active_only');

  // Filter Shift: 'active_only' | 'semua' | 'Pagi' | 'Siang'
  // Defaults to 'active_only' as explicitly requested by user ("hanya menampilkan shift yang aktif")
  const [selectedShift, setSelectedShift] = useState<'active_only' | 'semua' | 'Pagi' | 'Siang'>('active_only');
  
  // Filter Kelompok Tingkat: 'semua' | 1 | 2 (1 = X & XI, 2 = XII)
  const [selectedKelompok, setSelectedKelompok] = useState<'semua' | 1 | 2>('semua');

  // Search keyword
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Auto Rotation / Kios Mode State
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(false);
  const [autoRotateIntervalSeconds, setAutoRotateIntervalSeconds] = useState<number>(15);
  const [rotationProgress, setRotationProgress] = useState<number>(0);

  // Auto Scroll Mode State for TV
  const [isAutoScroll, setIsAutoScroll] = useState<boolean>(false);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Clean Screen Mode (Hide Toolbar for pure display)
  const [isCleanMode, setIsCleanMode] = useState<boolean>(false);

  // Selected schedule item detail popup
  const [detailItem, setDetailItem] = useState<JadwalMengajarGuru | null>(null);

  // Container ref for Fullscreen
  const viewContainerRef = useRef<HTMLDivElement>(null);

  // Table Ref for Auto Scroll
  const scrollableTableRef = useRef<HTMLDivElement>(null);

  // 3. FULLSCREEN TOGGLE HANDLER
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (viewContainerRef.current?.requestFullscreen) {
        viewContainerRef.current.requestFullscreen().catch((err) => {
          if (onShowToast) onShowToast(`Gagal layar penuh: ${err.message}`, 'error');
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 4. AUTO ROTATION LOGIC (FLIP SHIFT / DAY EVERY N SECONDS)
  useEffect(() => {
    if (!isAutoRotate) {
      setRotationProgress(0);
      return;
    }

    const stepMs = 200; // Update progress bar every 200ms
    const totalSteps = (autoRotateIntervalSeconds * 1000) / stepMs;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep += 1;
      setRotationProgress(Math.min(100, (currentStep / totalSteps) * 100));

      if (currentStep >= totalSteps) {
        currentStep = 0;
        setRotationProgress(0);

        // Rotate through Days: Senin -> Selasa -> Rabu -> Kamis -> Jumat
        setSelectedHari((prev) => {
          const idx = HARI_SENIN_JUMAT.indexOf(prev as any);
          if (idx === -1 || idx === HARI_SENIN_JUMAT.length - 1) {
            return HARI_SENIN_JUMAT[0];
          }
          return HARI_SENIN_JUMAT[idx + 1];
        });
      }
    }, stepMs);

    return () => clearInterval(interval);
  }, [isAutoRotate, autoRotateIntervalSeconds]);

  // 5. AUTO SCROLL LOGIC FOR LONG TABLES
  useEffect(() => {
    if (!isAutoScroll || !scrollableTableRef.current) return;

    let direction = 1;
    const scrollContainer = scrollableTableRef.current;

    const interval = setInterval(() => {
      if (!scrollContainer) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;

      if (scrollTop + clientHeight >= scrollHeight - 5) {
        direction = -1; // scroll back up
      } else if (scrollTop <= 5) {
        direction = 1; // scroll down
      }

      scrollContainer.scrollBy({
        top: direction * 2,
        behavior: 'smooth',
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isAutoScroll]);

  // 6. DETERMINE CURRENT ACTIVE JAM KE- BASED ON LOCAL TIME
  const currentActiveJamPelajaran = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const timeNum = hours * 60 + minutes; // minutes since midnight

    // Default shift based on time of day: Shift Pagi (< 12:30 PM) vs Shift Siang (>= 12:30 PM)
    let shift: 'Pagi' | 'Siang' = hours < 12 || (hours === 12 && minutes < 30) ? 'Pagi' : 'Siang';
    let jamNum: number | null = null;
    let isBreak = false;

    if (timeNum >= 390 && timeNum < 720) {
      shift = 'Pagi';
      if (timeNum >= 390 && timeNum < 420) jamNum = 1;
      else if (timeNum >= 420 && timeNum < 450) jamNum = 2;
      else if (timeNum >= 450 && timeNum < 480) jamNum = 3;
      else if (timeNum >= 480 && timeNum < 510) jamNum = 4;
      else if (timeNum >= 510 && timeNum < 540) isBreak = true;
      else if (timeNum >= 540 && timeNum < 570) jamNum = 5;
      else if (timeNum >= 570 && timeNum < 600) jamNum = 6;
      else if (timeNum >= 600 && timeNum < 630) jamNum = 7;
      else if (timeNum >= 630 && timeNum < 660) jamNum = 8;
      else if (timeNum >= 660 && timeNum < 690) jamNum = 9;
      else if (timeNum >= 690 && timeNum < 720) jamNum = 10;
    } else if (timeNum >= 780 && timeNum < 1010) {
      shift = 'Siang';
      if (timeNum >= 780 && timeNum < 800) jamNum = 1;
      else if (timeNum >= 800 && timeNum < 820) jamNum = 2;
      else if (timeNum >= 820 && timeNum < 840) jamNum = 3;
      else if (timeNum >= 840 && timeNum < 860) jamNum = 4;
      else if (timeNum >= 860 && timeNum < 880) jamNum = 5;
      else if (timeNum >= 880 && timeNum < 900) jamNum = 6;
      else if (timeNum >= 900 && timeNum < 930) isBreak = true;
      else if (timeNum >= 930 && timeNum < 950) jamNum = 7;
      else if (timeNum >= 950 && timeNum < 970) jamNum = 8;
      else if (timeNum >= 970 && timeNum < 990) jamNum = 9;
      else if (timeNum >= 990 && timeNum < 1010) jamNum = 10;
    }

    return { shift, jamNum, isBreak };
  }, [currentTime]);

  // Determine Effective Active Shift ('Pagi' | 'Siang' | null for 'semua')
  const effectiveShift = useMemo(() => {
    if (selectedShift === 'active_only') {
      return currentActiveJamPelajaran.shift;
    }
    if (selectedShift === 'semua') {
      return null;
    }
    return selectedShift;
  }, [selectedShift, currentActiveJamPelajaran.shift]);

  // Determine Effective Active Jam Number
  const effectiveActiveJamNum = useMemo(() => {
    if (typeof jamFilterMode === 'number') return jamFilterMode;
    if (jamFilterMode === 'active_only') {
      return currentActiveJamPelajaran.jamNum || 1;
    }
    return null; // 'all'
  }, [jamFilterMode, currentActiveJamPelajaran.jamNum]);

  // Columns / Jam Ke list to display
  const displayedJamList = useMemo(() => {
    if (effectiveActiveJamNum !== null) {
      return [effectiveActiveJamNum];
    }
    return LIST_JAM_ANGKA; // [1..10]
  }, [effectiveActiveJamNum]);

  // 7. PREPARE RAW SCHEDULE DATA
  const allSchedules = useMemo(() => {
    return appData.jadwalMengajar || [];
  }, [appData.jadwalMengajar]);

  const allKelasList = useMemo(() => {
    return appData.kelas || [];
  }, [appData.kelas]);

  // Filter schedules by Hari, Shift, Kelompok, Search Term, and Active Jam
  const filteredSchedules = useMemo(() => {
    return allSchedules.filter((j) => {
      // Filter Hari
      if (selectedHari !== 'semua' && j.hari !== selectedHari) return false;

      // Filter Shift
      if (effectiveShift !== null) {
        const itemShift = j.shift || 'Pagi';
        if (itemShift !== effectiveShift) return false;
      }

      // Filter Kelompok
      if (selectedKelompok !== 'semua') {
        const kel = determineKelasKelompok(j.kelasNama);
        if (kel !== selectedKelompok) return false;
      }

      // Filter Active Jam if specific jam selected or active_only
      if (effectiveActiveJamNum !== null) {
        const jamList = parseJamKeList(j.jamKe, j.jamKeList);
        if (!jamList.includes(effectiveActiveJamNum)) return false;
      }

      // Filter Search Term
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchGuru = (j.guruNama || '').toLowerCase().includes(query);
        const matchKelas = (j.kelasNama || '').toLowerCase().includes(query);
        const matchMapel = (j.mataPelajaran || '').toLowerCase().includes(query);
        const matchCatatan = (j.catatan || '').toLowerCase().includes(query);
        if (!matchGuru && !matchKelas && !matchMapel && !matchCatatan) return false;
      }

      return true;
    });
  }, [allSchedules, selectedHari, effectiveShift, selectedKelompok, effectiveActiveJamNum, searchTerm]);

  // 8. DATA FOR CURRENT ACTIVE HOUR (LIVE NOW SCOREBOARD)
  const liveActiveSchedules = useMemo(() => {
    const targetJam = effectiveActiveJamNum || currentActiveJamPelajaran.jamNum || 1;

    return allSchedules.filter((j) => {
      if (j.hari !== selectedHari) return false;
      if (effectiveShift !== null && (j.shift || 'Pagi') !== effectiveShift) return false;

      const jamList = parseJamKeList(j.jamKe, j.jamKeList);
      return jamList.includes(targetJam);
    });
  }, [allSchedules, selectedHari, effectiveShift, effectiveActiveJamNum, currentActiveJamPelajaran]);

  // Next hour preview list
  const nextHourSchedules = useMemo(() => {
    const targetJam = (effectiveActiveJamNum || currentActiveJamPelajaran.jamNum || 1) + 1;
    if (targetJam > 10) return [];

    return allSchedules.filter((j) => {
      if (j.hari !== selectedHari) return false;
      if (effectiveShift !== null && (j.shift || 'Pagi') !== effectiveShift) return false;

      const jamList = parseJamKeList(j.jamKe, j.jamKeList);
      return jamList.includes(targetJam);
    });
  }, [allSchedules, selectedHari, effectiveShift, effectiveActiveJamNum, currentActiveJamPelajaran]);

  // 9. GROUP DATA FOR MATRIX VIEW (BARIS: KELAS atau GURU x KOLOM: JAM DISPLAYED)
  const matrixGroupedData = useMemo(() => {
    if (matrixRowMode === 'kelas') {
      // Group by Class
      const classesToDisplay = allKelasList.filter((k) => {
        if (selectedKelompok !== 'semua') {
          return determineKelasKelompok(k.nama) === selectedKelompok;
        }
        return true;
      });

      // Sort classes naturally
      classesToDisplay.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { numeric: true }));

      return classesToDisplay.map((k) => {
        const classSchedules = filteredSchedules.filter(
          (j) => j.kelasId === k.id || j.kelasNama.toLowerCase() === k.nama.toLowerCase()
        );

        // Schedule per displayed Jam
        const jamMap: Record<number, JadwalMengajarGuru[]> = {};
        displayedJamList.forEach((jam) => {
          jamMap[jam] = classSchedules.filter((j) => {
            const jamList = parseJamKeList(j.jamKe, j.jamKeList);
            return jamList.includes(jam);
          });
        });

        return {
          id: k.id,
          title: k.nama,
          subtitle: `Kelompok ${determineKelasKelompok(k.nama)}`,
          schedulesPerJam: jamMap,
          totalSchedules: classSchedules.length,
        };
      }).filter((item) => {
        if (searchTerm.trim() !== '') {
          return item.totalSchedules > 0 || item.title.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
      });
    } else {
      // Group by Teacher
      const teacherMap = new Map<string, { username: string; nama: string; nip?: string }>();

      filteredSchedules.forEach((j) => {
        const key = j.guruUsername || j.guruNama;
        if (!teacherMap.has(key)) {
          teacherMap.set(key, {
            username: j.guruUsername,
            nama: j.guruNama,
            nip: j.guruNip,
          });
        }
      });

      const teachersList = Array.from(teacherMap.values()).sort((a, b) =>
        a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' })
      );

      return teachersList.map((t) => {
        const teacherSchedules = filteredSchedules.filter(
          (j) => (j.guruUsername && j.guruUsername === t.username) || j.guruNama === t.nama
        );

        const jamMap: Record<number, JadwalMengajarGuru[]> = {};
        displayedJamList.forEach((jam) => {
          jamMap[jam] = teacherSchedules.filter((j) => {
            const jamList = parseJamKeList(j.jamKe, j.jamKeList);
            return jamList.includes(jam);
          });
        });

        return {
          id: t.username || t.nama,
          title: t.nama,
          subtitle: t.nip ? `NIP: ${t.nip}` : 'Guru Pengampu',
          schedulesPerJam: jamMap,
          totalSchedules: teacherSchedules.length,
        };
      });
    }
  }, [matrixRowMode, allKelasList, selectedKelompok, filteredSchedules, displayedJamList, searchTerm]);

  // 10. STYLING THEMES MAP FOR MONITOR PROJECTION
  const themeStyles = useMemo(() => {
    if (projectionTheme === 'oled') {
      return {
        bg: 'bg-slate-950 text-slate-100',
        cardBg: 'bg-slate-900/90 border-slate-800/80 shadow-2xl backdrop-blur-md',
        headerBg: 'bg-slate-900/95 border-b border-slate-800/90',
        activeJamHeaderBg: 'bg-gradient-to-b from-blue-600 to-indigo-700 text-white shadow-lg ring-2 ring-blue-400',
        activeJamCellBg: 'bg-blue-950/40 border-2 border-blue-500/70 shadow-inner',
        tableHeaderBg: 'bg-slate-900 text-slate-300 border-b border-slate-800',
        badgePagi: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        badgeSiang: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        primaryText: 'text-white',
        secondaryText: 'text-slate-400',
        accentGlow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
        cardItemBg: 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-white',
        controlBg: 'bg-slate-900 border-slate-800 text-slate-200',
      };
    } else if (projectionTheme === 'cyber') {
      return {
        bg: 'bg-slate-900 text-cyan-50',
        cardBg: 'bg-slate-800/95 border-cyan-500/30 shadow-xl backdrop-blur-md',
        headerBg: 'bg-slate-900/95 border-b border-cyan-500/30',
        activeJamHeaderBg: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg ring-2 ring-cyan-300',
        activeJamCellBg: 'bg-cyan-950/50 border-2 border-cyan-400 shadow-inner',
        tableHeaderBg: 'bg-slate-800 text-cyan-200 border-b border-cyan-900/50',
        badgePagi: 'bg-amber-400/20 text-amber-200 border-amber-400/40',
        badgeSiang: 'bg-cyan-400/20 text-cyan-200 border-cyan-400/40',
        primaryText: 'text-cyan-100',
        secondaryText: 'text-slate-400',
        accentGlow: 'shadow-[0_0_25px_rgba(6,182,212,0.35)]',
        cardItemBg: 'bg-slate-800/90 hover:bg-slate-750 border-cyan-500/20 text-cyan-50',
        controlBg: 'bg-slate-800 border-cyan-500/30 text-cyan-100',
      };
    } else {
      // Light Mode (High Contrast for Sunlight Projector)
      return {
        bg: 'bg-slate-50 text-slate-900',
        cardBg: 'bg-white border-slate-200 shadow-lg',
        headerBg: 'bg-white border-b border-slate-200 shadow-xs',
        activeJamHeaderBg: 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300',
        activeJamCellBg: 'bg-blue-50/90 border-2 border-blue-600 shadow-xs',
        tableHeaderBg: 'bg-slate-100 text-slate-800 border-b border-slate-200',
        badgePagi: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
        badgeSiang: 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold',
        primaryText: 'text-slate-900',
        secondaryText: 'text-slate-600',
        accentGlow: 'shadow-md',
        cardItemBg: 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-900',
        controlBg: 'bg-white border-slate-300 text-slate-800',
      };
    }
  }, [projectionTheme]);

  // Font scale class
  const fontScaleClass = useMemo(() => {
    if (fontSizeMode === 'xlarge') return 'text-base sm:text-lg';
    if (fontSizeMode === 'large') return 'text-sm sm:text-base';
    return 'text-xs sm:text-sm';
  }, [fontSizeMode]);

  return (
    <div
      ref={viewContainerRef}
      className={`min-h-screen w-full transition-colors duration-300 ${themeStyles.bg} flex flex-col font-sans select-none overflow-x-hidden`}
    >
      {/* =========================================================================
          TOP HEADER DISPLAY: PROJECTION BANNER & REALTIME DIGITAL CLOCK
          ========================================================================= */}
      {!isCleanMode && (
        <header className={`px-4 sm:px-6 py-3.5 ${themeStyles.headerBg} sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4`}>
          {/* Brand / School Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg font-black shrink-0">
              {appData.sekolah?.logo ? (
                <img
                  src={appData.sekolah.logo}
                  alt="Logo"
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Tv className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                  MONITOR PROYEKSI JADWAL
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              </div>
              <h1 className="text-base sm:text-xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
                {appData.sekolah?.nama || 'PROYEKSI JADWAL MENGAJAR GURU'}
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tahun Ajaran {appData.sekolah?.tahunAjaran || '2026/2027'} • Shift Pagi &amp; Siang
              </p>
            </div>
          </div>

          {/* Realtime Clock & Active Status Box */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            {/* Live Status Badge */}
            <div className={`hidden md:flex flex-col items-end px-3 py-1.5 rounded-xl border ${
              currentActiveJamPelajaran.jamNum
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : currentActiveJamPelajaran.isBreak
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
            }`}>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>
                  {currentActiveJamPelajaran.jamNum
                    ? `LIVE: JAM KE-${currentActiveJamPelajaran.jamNum} (${currentActiveJamPelajaran.shift})`
                    : currentActiveJamPelajaran.isBreak
                    ? 'WAKTU ISTIRAHAT'
                    : 'DILUAR JAM PELAJARAN'}
                </span>
              </div>
              <span className="text-[11px] font-medium opacity-90">
                {currentActiveJamPelajaran.jamNum
                  ? getJamPelajaranTime(currentActiveJamPelajaran.jamNum, currentActiveJamPelajaran.shift)
                  : 'Sistem Terhubung'}
              </span>
            </div>

            {/* Digital Clock Box */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/90 dark:bg-slate-900 border border-slate-700/80 text-white shadow-xl">
              <Clock className="w-5 h-5 text-cyan-400 animate-pulse shrink-0" />
              <div className="text-right">
                <div className="font-mono text-lg sm:text-2xl font-black tracking-wider leading-none text-cyan-300">
                  {formattedTimeString}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-300 font-medium">
                  {formattedDateString}
                </div>
              </div>
            </div>

            {/* Clean Screen Toggle */}
            <button
              type="button"
              onClick={() => setIsCleanMode(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              title="Sembunyikan Menu (Mode Bersih TV)"
            >
              <EyeOff className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Clean Mode</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title="Layar Penuh Proyektor"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Keluar' : 'Layar Penuh'}</span>
            </button>
          </div>
        </header>
      )}

      {/* Floating Restore Controls Button in Clean Mode */}
      {isCleanMode && (
        <button
          type="button"
          onClick={() => setIsCleanMode(false)}
          className="fixed top-4 right-4 z-50 px-3.5 py-2 rounded-2xl bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-bold shadow-2xl backdrop-blur-md border border-white/20 transition flex items-center gap-2 cursor-pointer animate-in fade-in duration-200"
        >
          <Eye className="w-4 h-4" />
          <span>Tampilkan Kontrol</span>
        </button>
      )}

      {/* =========================================================================
          CONTROL BAR: HARI, SHIFT, VIEW MODE, FONT SIZE, THEME, AUTO-ROTATE
          ========================================================================= */}
      {!isCleanMode && (
        <div className={`px-4 sm:px-6 py-3 border-b ${themeStyles.cardBg} flex flex-wrap items-center justify-between gap-3 text-xs`}>
          {/* Left Controls: Display Mode Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900/40 border border-slate-800">
            <button
              type="button"
              onClick={() => setDisplayMode('matrix_jam')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                displayMode === 'matrix_jam'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Matriks Jam Pelajaran</span>
            </button>

            <button
              type="button"
              onClick={() => setDisplayMode('live_now')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                displayMode === 'live_now'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Jam Saat Ini ({liveActiveSchedules.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setDisplayMode('shift_cards')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                displayMode === 'shift_cards'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Kartu Per Shift</span>
            </button>
          </div>

          {/* Day Selector (Senin - Jumat) */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">Hari:</span>
            {HARI_SENIN_JUMAT.map((h) => {
              const isToday = h === todayDayName;
              const isSelected = h === selectedHari;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setSelectedHari(h)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer relative shrink-0 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  {h}
                  {isToday && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Matrix Row Group Selector (If Matrix Mode) */}
          {displayMode === 'matrix_jam' && (
            <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setMatrixRowMode('kelas')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  matrixRowMode === 'kelas' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                Baris: Kelas
              </button>
              <button
                type="button"
                onClick={() => setMatrixRowMode('guru')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  matrixRowMode === 'guru' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                Baris: Guru
              </button>
            </div>
          )}

          {/* Filters & Options: Shift, Kelompok, Search */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Shift Filter */}
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value as any)}
              className={`px-2.5 py-1.5 rounded-xl ${themeStyles.controlBg} font-bold text-xs cursor-pointer focus:outline-none border border-slate-700/60`}
            >
              <option value="active_only">⚡ Hanya Shift Aktif ({currentActiveJamPelajaran.shift})</option>
              <option value="semua">Semua Shift</option>
              <option value="Pagi">Shift Pagi</option>
              <option value="Siang">Shift Siang</option>
            </select>

            {/* Kelompok Filter */}
            <select
              value={selectedKelompok}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedKelompok(val === 'semua' ? 'semua' : Number(val) as any);
              }}
              className={`px-2.5 py-1.5 rounded-xl ${themeStyles.controlBg} font-medium text-xs cursor-pointer focus:outline-none`}
            >
              <option value="semua">Semua Kelompok</option>
              <option value="1">Kelompok 1 (Kelas X &amp; XI)</option>
              <option value="2">Kelompok 2 (Kelas XII)</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari guru / kelas / mapel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-8 pr-3 py-1.5 rounded-xl ${themeStyles.controlBg} text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-48`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Auto-Rotation Toggle */}
            <button
              type="button"
              onClick={() => setIsAutoRotate(!isAutoRotate)}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer relative ${
                isAutoRotate
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
              title="Putar hari otomatis secara berkala untuk layar TV"
            >
              {isAutoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>Auto-Putar</span>
              {isAutoRotate && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-amber-300 rounded-b-xl transition-all duration-200"
                  style={{ width: `${rotationProgress}%` }}
                ></div>
              )}
            </button>

            {/* Auto-Scroll Toggle */}
            <button
              type="button"
              onClick={() => setIsAutoScroll(!isAutoScroll)}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                isAutoScroll
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
              title="Gulir tabel otomatis untuk layar monitor besar"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isAutoScroll ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Auto-Scroll</span>
            </button>

            {/* Font Size & Theme Controls */}
            <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setProjectionTheme(projectionTheme === 'oled' ? 'cyber' : projectionTheme === 'cyber' ? 'light' : 'oled')}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-cyan-400 hover:bg-slate-800 transition cursor-pointer"
                title="Ganti Tema Warna Layar"
              >
                {projectionTheme === 'oled' ? '🌙 OLED' : projectionTheme === 'cyber' ? '⚡ Cyber' : '☀️ Terang'}
              </button>
              <button
                type="button"
                onClick={() => setFontSizeMode(fontSizeMode === 'standard' ? 'large' : fontSizeMode === 'large' ? 'xlarge' : 'standard')}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-amber-300 hover:bg-slate-800 transition cursor-pointer"
                title="Ubah Ukuran Teks TV"
              >
                {fontSizeMode === 'standard' ? 'Teks: Normal' : fontSizeMode === 'large' ? 'Teks: TV Besar' : 'Teks: Proyektor XL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          JAM & SHIFT SELECTION FILTER BAR
          ========================================================================= */}
      {!isCleanMode && (
        <div className={`px-4 sm:px-6 py-2 border-b ${themeStyles.cardBg} flex flex-wrap items-center justify-between gap-3 text-xs overflow-x-auto`}>
          {/* Jam Selection */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-extrabold text-blue-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Jam:</span>
            </span>

            {/* Button: Hanya Jam Aktif */}
            <button
              type="button"
              onClick={() => setJamFilterMode('active_only')}
              className={`px-2.5 py-1.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                jamFilterMode === 'active_only'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md ring-2 ring-emerald-300 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>⚡ Hanya Jam Aktif (J-{currentActiveJamPelajaran.jamNum || 1})</span>
            </button>

            {/* Button: Semua Jam 1-10 */}
            <button
              type="button"
              onClick={() => setJamFilterMode('all')}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
                jamFilterMode === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <span>Semua Jam</span>
            </button>
          </div>

          {/* Shift Selection */}
          <div className="flex items-center gap-2 shrink-0 pl-3 border-l border-slate-700/60">
            <span className="font-extrabold text-indigo-400 flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              <span>Shift:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedShift('active_only')}
              className={`px-2.5 py-1.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedShift === 'active_only'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md ring-2 ring-amber-300 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-slate-950 fill-current animate-pulse" />
              <span>⚡ Hanya Shift Aktif ({currentActiveJamPelajaran.shift})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedShift('Pagi')}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
                selectedShift === 'Pagi'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              Pagi
            </button>

            <button
              type="button"
              onClick={() => setSelectedShift('Siang')}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
                selectedShift === 'Siang'
                  ? 'bg-indigo-600 text-white font-black shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              Siang
            </button>

            <button
              type="button"
              onClick={() => setSelectedShift('semua')}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
                selectedShift === 'semua'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              Semua
            </button>
          </div>

          {/* Quick Jam 1..10 Pills */}
          <div className="flex items-center gap-1 overflow-x-auto shrink-0 py-0.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1 hidden xl:inline">J-Ke:</span>
            {LIST_JAM_ANGKA.map((jamNum) => {
              const isSelected = jamFilterMode === jamNum;
              const isCurrentActive = currentActiveJamPelajaran.jamNum === jamNum;

              return (
                <button
                  key={jamNum}
                  type="button"
                  onClick={() => setJamFilterMode(jamNum)}
                  className={`px-2 py-1 rounded-lg font-mono font-extrabold text-[11px] transition cursor-pointer relative shrink-0 ${
                    isSelected
                      ? 'bg-cyan-400 text-slate-950 font-black shadow-md'
                      : isCurrentActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  }`}
                  title={`Tampilkan Hanya Jam Ke-${jamNum}`}
                >
                  J-{jamNum}
                  {isCurrentActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900 animate-ping"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN CONTENT AREA BASED ON DISPLAY MODE
          ========================================================================= */}
      <main className="flex-1 p-3 sm:p-5 flex flex-col gap-4 overflow-y-auto">
        {/* SUMMARY TICKER BANNER AT TOP */}
        <div className={`p-3 sm:p-4 rounded-2xl ${themeStyles.cardBg} border flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm sm:text-base text-slate-100">
                  Jadwal Mengajar Hari {selectedHari}
                </span>

                {/* Shift Badge */}
                {selectedShift === 'active_only' ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>HANYA SHIFT AKTIF ({effectiveShift?.toUpperCase()})</span>
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    Shift {selectedShift === 'semua' ? 'Semua' : selectedShift}
                  </span>
                )}

                {/* Jam Badge */}
                {effectiveActiveJamNum !== null ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>HANYA JAM KE-{effectiveActiveJamNum} ({getJamPelajaranTime(effectiveActiveJamNum, currentActiveJamPelajaran.shift)} WIB)</span>
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Semua Jam 1-10 ({filteredSchedules.length} Sesi Total)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Shift Pagi: 06.30 - 12.00 WIB (30 mnt/JP) • Shift Siang: 13.00 - 16.50 WIB (20 mnt/JP)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold">
              <Sun className="w-3.5 h-3.5" />
              <span>Shift Pagi: {filteredSchedules.filter((j) => (j.shift || 'Pagi') === 'Pagi').length} Sesi</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold">
              <Sunset className="w-3.5 h-3.5" />
              <span>Shift Siang: {filteredSchedules.filter((j) => j.shift === 'Siang').length} Sesi</span>
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            MODE 1: MATRIX GRID PER JAM (HANYA JAM AKTIF / SEMUA JAM)
            ----------------------------------------------------------------------- */}
        {displayMode === 'matrix_jam' && (
          <div
            ref={scrollableTableRef}
            className={`rounded-2xl ${themeStyles.cardBg} border overflow-hidden shadow-2xl flex-1 flex flex-col min-h-[500px]`}
          >
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className={themeStyles.tableHeaderBg}>
                    <th className="py-3.5 px-5 font-bold text-xs border-r border-slate-800 w-56 sticky left-0 z-20 bg-slate-900">
                      {matrixRowMode === 'kelas' ? 'KELAS / KELOMPOK' : 'NAMA GURU / MAPEL'}
                    </th>

                    {/* Render Columns for displayedJamList */}
                    {displayedJamList.map((jamNum) => {
                      const isActiveJamPagi =
                        currentActiveJamPelajaran.shift === 'Pagi' && currentActiveJamPelajaran.jamNum === jamNum;
                      const isActiveJamSiang =
                        currentActiveJamPelajaran.shift === 'Siang' && currentActiveJamPelajaran.jamNum === jamNum;
                      const isActiveJam = isActiveJamPagi || isActiveJamSiang || jamFilterMode === 'active_only';

                      return (
                        <th
                          key={jamNum}
                          className={`py-3.5 px-4 text-center border-r border-slate-800 font-extrabold text-xs transition ${
                            isActiveJam ? themeStyles.activeJamHeaderBg : ''
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-base sm:text-lg font-black tracking-wide">
                              JAM KE-{jamNum} {jamFilterMode === 'active_only' ? '(AKTIF SAAT INI)' : ''}
                            </span>
                            <span className="text-xs opacity-90 font-mono mt-0.5">
                              {getJamPelajaranTime(jamNum, 'Pagi')} WIB
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/80">
                  {matrixGroupedData.length === 0 ? (
                    <tr>
                      <td colSpan={displayedJamList.length + 1} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Search className="w-8 h-8 text-slate-600 animate-bounce" />
                          <p className="font-bold text-slate-300">Tidak ada jadwal mengajar pada jam ini.</p>
                          <p className="text-xs text-slate-400">Pilih jam pelajaran lain atau klik "Semua Jam (1-10)".</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    matrixGroupedData.map((rowItem) => (
                      <tr key={rowItem.id} className="hover:bg-blue-900/10 transition">
                        {/* Sticky Row Title Column */}
                        <td className="py-3.5 px-5 font-bold border-r border-slate-800 sticky left-0 z-10 bg-slate-900/95 backdrop-blur-xs">
                          <div className="font-black text-slate-100 text-sm sm:text-base leading-tight">
                            {rowItem.title}
                          </div>
                          <div className="text-xs text-slate-400 font-normal mt-0.5 flex items-center gap-1.5">
                            <span>{rowItem.subtitle}</span>
                            <span>•</span>
                            <span className="text-cyan-400 font-semibold">{rowItem.totalSchedules} Sesi</span>
                          </div>
                        </td>

                        {/* Schedule Cells for displayedJamList */}
                        {displayedJamList.map((jamNum) => {
                          const schedulesInJam = rowItem.schedulesPerJam[jamNum] || [];
                          const isActiveJamPagi =
                            currentActiveJamPelajaran.shift === 'Pagi' && currentActiveJamPelajaran.jamNum === jamNum;
                          const isActiveJamSiang =
                            currentActiveJamPelajaran.shift === 'Siang' && currentActiveJamPelajaran.jamNum === jamNum;
                          const isActiveJam = isActiveJamPagi || isActiveJamSiang || jamFilterMode === 'active_only';

                          return (
                            <td
                              key={jamNum}
                              className={`p-2.5 border-r border-slate-800/80 align-top transition ${
                                isActiveJam ? themeStyles.activeJamCellBg : ''
                              }`}
                            >
                              {schedulesInJam.length === 0 ? (
                                <div className="h-full min-h-[50px] flex items-center justify-center text-xs text-slate-600 font-mono italic">
                                  - Kosong -
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  {schedulesInJam.map((item) => {
                                    const isSiang = item.shift === 'Siang';

                                    return (
                                      <div
                                        key={item.id}
                                        onClick={() => setDetailItem(item)}
                                        className={`p-3 rounded-2xl border ${themeStyles.cardItemBg} transition shadow-md cursor-pointer hover:scale-[1.02] flex flex-col justify-between gap-2`}
                                      >
                                        <div>
                                          {/* Subject Name */}
                                          <div className={`font-black ${fontScaleClass} leading-snug text-cyan-300`}>
                                            {cleanMapelName(item.mataPelajaran)}
                                          </div>

                                          {/* Teacher Name or Class Name depending on row mode */}
                                          <div className="text-xs sm:text-sm font-bold text-slate-100 mt-1 flex items-center gap-1.5">
                                            {matrixRowMode === 'kelas' ? (
                                              <>
                                                <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                                                <span>{item.guruNama}</span>
                                              </>
                                            ) : (
                                              <>
                                                <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
                                                <span>{item.kelasNama}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>

                                        {/* Shift Badge & Room Info */}
                                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                                          <span className={`px-2 py-0.5 rounded-lg font-bold border text-[11px] ${isSiang ? themeStyles.badgeSiang : themeStyles.badgePagi}`}>
                                            Shift {isSiang ? 'Siang' : 'Pagi'}
                                          </span>

                                          {item.catatan && (
                                            <span className="text-slate-400 text-xs truncate max-w-[120px]" title={item.catatan}>
                                              {item.catatan}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -----------------------------------------------------------------------
            MODE 2: LIVE SCOREBOARD JAM SAAT INI (WHO IS TEACHING RIGHT NOW)
            ----------------------------------------------------------------------- */}
        {displayMode === 'live_now' && (
          <div className="flex flex-col gap-6">
            {/* Active Hour Header Banner */}
            <div className={`p-5 rounded-3xl ${themeStyles.cardBg} border flex flex-wrap items-center justify-between gap-4 shadow-2xl`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xl font-black">
                  <Zap className="w-8 h-8 animate-bounce text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                      🔴 JAM PELAJARAN DITAMPILKAN
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Hari {selectedHari}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    Jam Ke-{effectiveActiveJamNum || currentActiveJamPelajaran.jamNum || 1} • Shift {currentActiveJamPelajaran.shift}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                    Waktu Pelajaran: {getJamPelajaranTime(effectiveActiveJamNum || currentActiveJamPelajaran.jamNum || 1, currentActiveJamPelajaran.shift)} WIB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-3xl sm:text-4xl font-black text-cyan-300 font-mono">
                    {liveActiveSchedules.length}
                  </div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Guru Mengajar Aktif
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Cards of Live Active Teachers */}
            {liveActiveSchedules.length === 0 ? (
              <div className={`p-12 text-center rounded-3xl ${themeStyles.cardBg} border text-slate-400`}>
                <Clock className="w-12 h-12 text-slate-600 mx-auto animate-pulse mb-3" />
                <h3 className="text-lg font-bold text-slate-200">Tidak ada jadwal mengajar di jam ini.</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Siswa/guru mungkin sedang dalam waktu istirahat atau diluar jam operasional shift.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {liveActiveSchedules.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setDetailItem(item)}
                    className={`p-5 rounded-2xl ${themeStyles.cardBg} border hover:border-blue-500/80 transition-all shadow-xl cursor-pointer flex flex-col justify-between group hover:scale-[1.02]`}
                  >
                    <div>
                      {/* Teacher Header */}
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                          {item.guruNama.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-extrabold text-white text-base truncate group-hover:text-cyan-300 transition">
                            {item.guruNama}
                          </h4>
                          <p className="text-xs text-slate-400 truncate">
                            {item.guruNip ? `NIP: ${item.guruNip}` : 'Guru Pengampu'}
                          </p>
                        </div>
                      </div>

                      {/* Subject & Class Box */}
                      <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="text-xs text-slate-400 font-bold uppercase">Mata Pelajaran:</div>
                        <div className="text-base font-black text-cyan-300 leading-snug mt-0.5">
                          {cleanMapelName(item.mataPelajaran)}
                        </div>

                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-bold flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                            <span>{item.kelasNama}</span>
                          </span>
                          <span className="text-emerald-400 font-mono font-bold">
                            Jam Ke {parseJamKeList(item.jamKe, item.jamKeList).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Shift & Note */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                        item.shift === 'Siang' ? themeStyles.badgeSiang : themeStyles.badgePagi
                      }`}>
                        Shift {item.shift || 'Pagi'}
                      </span>

                      {item.catatan && (
                        <span className="text-slate-400 text-[11px] truncate max-w-[120px]">
                          {item.catatan}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Next Hour Preview Box */}
            {nextHourSchedules.length > 0 && (
              <div className={`p-5 rounded-3xl ${themeStyles.cardBg} border opacity-90`}>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  <ArrowRight className="w-4 h-4 text-blue-400" />
                  <span>Persiapan Jam Ke berikutnya (Jam {(effectiveActiveJamNum || 1) + 1}) • {nextHourSchedules.length} Guru</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {nextHourSchedules.map((item) => (
                    <div key={item.id} className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center gap-2">
                      <span className="font-bold text-slate-200">{item.guruNama}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-cyan-400">{item.kelasNama}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-amber-300 font-medium">{cleanMapelName(item.mataPelajaran)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* -----------------------------------------------------------------------
            MODE 3: KARTU PER SHIFT (PAGI & SIANG DETAILED GROUPED VIEW)
            ----------------------------------------------------------------------- */}
        {displayMode === 'shift_cards' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shift Pagi Group Box */}
            <div className={`p-5 rounded-3xl ${themeStyles.cardBg} border flex flex-col gap-4`}>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-black">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white">JADWAL SHIFT PAGI</h3>
                    <p className="text-xs text-slate-400">06.30 - 12.00 WIB • Jam 1 s.d 10 (30 menit/JP)</p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30">
                  {filteredSchedules.filter((j) => (j.shift || 'Pagi') === 'Pagi').length} Sesi
                </span>
              </div>

              {/* Schedule list for Shift Pagi */}
              <div className="flex flex-col gap-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredSchedules
                  .filter((j) => (j.shift || 'Pagi') === 'Pagi')
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setDetailItem(item)}
                      className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 transition cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-extrabold text-white text-sm">
                          {item.guruNama}
                        </div>
                        <div className="text-xs text-cyan-300 font-bold mt-0.5">
                          {cleanMapelName(item.mataPelajaran)}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          {item.kelasNama}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-mono">
                          Jam Ke {parseJamKeList(item.jamKe, item.jamKeList).join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Shift Siang Group Box */}
            <div className={`p-5 rounded-3xl ${themeStyles.cardBg} border flex flex-col gap-4`}>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-black">
                    <Sunset className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white">JADWAL SHIFT SIANG</h3>
                    <p className="text-xs text-slate-400">13.00 - 16.50 WIB • Jam 1 s.d 10 (20 menit/JP)</p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 text-xs font-black border border-indigo-500/30">
                  {filteredSchedules.filter((j) => j.shift === 'Siang').length} Sesi
                </span>
              </div>

              {/* Schedule list for Shift Siang */}
              <div className="flex flex-col gap-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredSchedules
                  .filter((j) => j.shift === 'Siang')
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setDetailItem(item)}
                      className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 transition cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-extrabold text-white text-sm">
                          {item.guruNama}
                        </div>
                        <div className="text-xs text-cyan-300 font-bold mt-0.5">
                          {cleanMapelName(item.mataPelajaran)}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                          {item.kelasNama}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-mono">
                          Jam Ke {parseJamKeList(item.jamKe, item.jamKeList).join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          POPUP MODAL: SCHEDULE ITEM DETAIL CARD
          ========================================================================= */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 flex flex-col gap-4 relative">
            <button
              type="button"
              onClick={() => setDetailItem(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-lg">
                {detailItem.guruNama.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{detailItem.guruNama}</h3>
                <p className="text-xs text-slate-400">{detailItem.guruNip ? `NIP: ${detailItem.guruNip}` : 'Guru Pengampu'}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Mata Pelajaran:</span>
                <span className="font-extrabold text-cyan-300 text-sm">{cleanMapelName(detailItem.mataPelajaran)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Kelas Mengajar:</span>
                <span className="font-bold text-amber-300">{detailItem.kelasNama}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Hari &amp; Shift:</span>
                <span className="font-bold text-white">{detailItem.hari} • Shift {detailItem.shift || 'Pagi'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Jam Pelajaran:</span>
                <span className="font-bold font-mono text-emerald-400">
                  Jam Ke {parseJamKeList(detailItem.jamKe, detailItem.jamKeList).join(', ')} ({parseJamKeList(detailItem.jamKe, detailItem.jamKeList).length} JP)
                </span>
              </div>
              {detailItem.catatan && (
                <div className="mt-1 pt-2 border-t border-slate-700 text-slate-300 italic">
                  Catatan: {detailItem.catatan}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setDetailItem(null)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
            >
              Tutup Informasi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
