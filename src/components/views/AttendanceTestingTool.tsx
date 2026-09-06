import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Layers,
  CheckCircle2,
  Play,
  RotateCcw,
  Sliders,
  Filter,
  UserCheck,
} from 'lucide-react';
import { AppData, PresensiStatus, SiswaPresensiItem, PresensiMap } from '../../types';
import { getTodayString } from '../../data/initialData';

interface AttendanceTestingToolProps {
  appData: AppData;
  onUpdateAppData: (data: AppData) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

type PeriodType = 'hari' | 'minggu' | 'bulan' | 'kustom';
type AttendanceDistributionPattern = 'realistis' | 'disiplin' | 'beragam_masalah' | 'semua_hadir';

export const AttendanceTestingTool: React.FC<AttendanceTestingToolProps> = ({
  appData,
  onUpdateAppData,
  onShowToast,
}) => {
  const today = getTodayString(); // 'YYYY-MM-DD'
  
  // Selection States
  const [selectedKelasId, setSelectedKelasId] = useState<string>('all');
  const [periodType, setPeriodType] = useState<PeriodType>('hari');
  
  // Specific period values
  const [dayPreset, setDayPreset] = useState<'today' | '3days' | '7days' | '14days'>('today');
  const [weekPreset, setWeekPreset] = useState<'this_week' | 'last_1week' | 'last_2weeks' | 'last_4weeks'>('this_week');
  const [monthPreset, setMonthPreset] = useState<'this_month' | 'last_1month' | 'last_3months' | 'semester'>('this_month');
  
  // Custom date range
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);
  const [customStartDate, setCustomStartDate] = useState<string>(defaultStartDate);
  const [customEndDate, setCustomEndDate] = useState<string>(today);

  // Configuration options
  const [skipWeekends, setSkipWeekends] = useState<boolean>(true); // Skip Sabtu & Minggu
  const [skipSundayOnly, setSkipSundayOnly] = useState<boolean>(false); // 6 hari sekolah (hanya libur Minggu)
  const [distributionPattern, setDistributionPattern] = useState<AttendanceDistributionPattern>('realistis');
  const [includeProblematicStudents, setIncludeProblematicStudents] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationSummary, setGenerationSummary] = useState<{
    totalRecordsAdded: number;
    totalDays: number;
    classesCount: number;
    studentsCount: number;
    dateRange: string;
  } | null>(null);

  // Calculate targeted dates based on period selection
  const calculatedDates = useMemo(() => {
    const dates: string[] = [];
    const now = new Date(today);

    let startDate = new Date(today);
    let endDate = new Date(today);

    if (periodType === 'hari') {
      if (dayPreset === 'today') {
        startDate = new Date(today);
        endDate = new Date(today);
      } else if (dayPreset === '3days') {
        startDate = new Date(today);
        startDate.setDate(now.getDate() - 2);
      } else if (dayPreset === '7days') {
        startDate = new Date(today);
        startDate.setDate(now.getDate() - 6);
      } else if (dayPreset === '14days') {
        startDate = new Date(today);
        startDate.setDate(now.getDate() - 13);
      }
    } else if (periodType === 'minggu') {
      if (weekPreset === 'this_week') {
        const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon
        const diffToMonday = (dayOfWeek + 6) % 7;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - diffToMonday);
        endDate = new Date(now);
      } else if (weekPreset === 'last_1week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      } else if (weekPreset === 'last_2weeks') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 14);
      } else if (weekPreset === 'last_4weeks') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 28);
      }
    } else if (periodType === 'bulan') {
      if (monthPreset === 'this_month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now);
      } else if (monthPreset === 'last_1month') {
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
      } else if (monthPreset === 'last_3months') {
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
      } else if (monthPreset === 'semester') {
        if (appData.sekolah?.tanggalMulai) {
          startDate = new Date(appData.sekolah.tanggalMulai);
        } else {
          startDate = new Date(now.getFullYear(), 6, 15); // 15 Juli
        }
      }
    } else if (periodType === 'kustom') {
      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
      }
    }

    if (startDate > endDate) {
      return [];
    }

    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay(); // 0: Sun, 6: Sat
      
      let isExcluded = false;
      if (skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        isExcluded = true;
      } else if (skipSundayOnly && dayOfWeek === 0) {
        isExcluded = true;
      }

      if (!isExcluded) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }, [periodType, dayPreset, weekPreset, monthPreset, customStartDate, customEndDate, skipWeekends, skipSundayOnly, today, appData.sekolah?.tanggalMulai]);

  // Target Classes and Students
  const targetClasses = useMemo(() => {
    if (!appData.kelas) return [];
    if (selectedKelasId === 'all') return appData.kelas;
    return appData.kelas.filter((k) => k.id === selectedKelasId);
  }, [appData.kelas, selectedKelasId]);

  const targetStudentsCount = useMemo(() => {
    if (!appData.siswa) return 0;
    if (selectedKelasId === 'all') return appData.siswa.length;
    return appData.siswa.filter((s) => s.kelasId === selectedKelasId).length;
  }, [appData.siswa, selectedKelasId]);

  const estimatedRecordsCount = useMemo(() => {
    return calculatedDates.length * targetStudentsCount;
  }, [calculatedDates.length, targetStudentsCount]);

  // Action: Generate Presensi
  const handleGenerate = () => {
    if (targetClasses.length === 0) {
      onShowToast('Pilih setidaknya 1 kelas yang valid.', 'warning');
      return;
    }
    if (targetStudentsCount === 0) {
      onShowToast('Tidak ada siswa pada kelas yang dipilih.', 'warning');
      return;
    }
    if (calculatedDates.length === 0) {
      onShowToast('Rentang tanggal tidak menghasilkan hari aktif efektif.', 'warning');
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      try {
        const updatedPresensiMap: PresensiMap = { ...(appData.presensi || {}) };

        // Determine special problematic students per class if enabled
        let totalGeneratedRecordsCount = 0;

        calculatedDates.forEach((dateStr) => {
          targetClasses.forEach((kelas) => {
            const classStudents = (appData.siswa || []).filter((s) => s.kelasId === kelas.id);
            if (classStudents.length === 0) return;

            const key = `${dateStr}_${kelas.id}`;
            const studentItems: SiswaPresensiItem[] = [];

            classStudents.forEach((student, idx) => {
              let status: PresensiStatus = 'H';
              let catatan = '';
              let time = '06:45:00';
              let pulangTime = '14:30:00';
              let pulangStatus: 'H' | 'TAP' | '' = 'H';

              // Random jam masuk realistis (06:30 - 06:58)
              const randomMinute = Math.floor(Math.random() * 28) + 30;
              time = `06:${randomMinute.toString().padStart(2, '0')}:00`;

              // Special logic for problematic students to simulate realistic patterns
              if (includeProblematicStudents && classStudents.length >= 4 && idx < 4) {
                const rand = Math.random();
                if (idx === 0) {
                  // Siswa 1: Sering Alpa (40% Alpa, 20% Izin, 40% Hadir)
                  if (rand < 0.40) {
                    status = 'A';
                    catatan = 'Tanpa keterangan';
                    time = '';
                    pulangTime = '';
                    pulangStatus = '';
                  } else if (rand < 0.60) {
                    status = 'I';
                    catatan = 'Keperluan keluarga mendesak';
                    time = '';
                    pulangTime = '';
                    pulangStatus = '';
                  } else {
                    status = 'H';
                  }
                } else if (idx === 1) {
                  // Siswa 2: Sering Sakit (35% Sakit, 10% Izin, 55% Hadir)
                  if (rand < 0.35) {
                    status = 'S';
                    catatan = 'Demam & flu (ada surat dokter)';
                    time = '';
                    pulangTime = '';
                    pulangStatus = '';
                  } else if (rand < 0.45) {
                    status = 'I';
                    catatan = 'Kontrol dokter ke RS';
                    time = '';
                    pulangTime = '';
                    pulangStatus = '';
                  } else {
                    status = 'H';
                  }
                } else if (idx === 2) {
                  // Siswa 3: Sering Izin (35% Izin, 65% Hadir)
                  if (rand < 0.35) {
                    status = 'I';
                    catatan = 'Acara keluarga & urusan pribadi';
                    time = '';
                    pulangTime = '';
                    pulangStatus = '';
                  } else {
                    status = 'H';
                  }
                } else if (idx === 3) {
                  // Siswa 4: Kombinasi Sakit & Alpa & Izin
                  if (rand < 0.20) {
                    status = 'S';
                    catatan = 'Sakit kepala / istirahat';
                    time = '';
                    pulangTime = '';
                    pulangStatus = '';
                  } else if (rand < 0.35) {
                    status = 'I';
                    catatan = 'Izin orang tua';
                    time = '';
                    pulangTime = '';
                    pulangStatus = '';
                  } else if (rand < 0.45) {
                    status = 'A';
                    catatan = 'Bolos / Tanpa keterangan';
                    time = '';
                    pulangTime = '';
                    pulangStatus = '';
                  } else {
                    status = 'H';
                  }
                }
              } else {
                // General Pattern
                const rand = Math.random();
                if (distributionPattern === 'semua_hadir') {
                  status = 'H';
                } else if (distributionPattern === 'disiplin') {
                  // 97% Hadir, 1.5% Sakit, 1% Izin, 0.5% Alpa
                  if (rand < 0.97) status = 'H';
                  else if (rand < 0.985) status = 'S';
                  else if (rand < 0.995) status = 'I';
                  else status = 'A';
                } else if (distributionPattern === 'beragam_masalah') {
                  // 80% Hadir, 8% Sakit, 7% Izin, 5% Alpa
                  if (rand < 0.80) status = 'H';
                  else if (rand < 0.88) status = 'S';
                  else if (rand < 0.95) status = 'I';
                  else status = 'A';
                } else {
                  // Realistis (92% Hadir, 4% Sakit, 3% Izin, 1% Alpa)
                  if (rand < 0.92) status = 'H';
                  else if (rand < 0.96) status = 'S';
                  else if (rand < 0.99) status = 'I';
                  else status = 'A';
                }

                if (status !== 'H') {
                  time = '';
                  pulangTime = '';
                  pulangStatus = '';
                  if (status === 'S') catatan = 'Sakit (keterangan wali murid)';
                  else if (status === 'I') catatan = 'Izin keperluan keluarga';
                  else if (status === 'A') catatan = 'Tanpa keterangan';
                }
              }

              studentItems.push({
                siswaId: student.id,
                status,
                time: time || undefined,
                pulangTime: pulangTime || undefined,
                pulangStatus: pulangStatus || undefined,
                catatan: catatan || undefined,
              });
            });

            updatedPresensiMap[key] = studentItems;
            totalGeneratedRecordsCount += studentItems.length;
          });
        });

        onUpdateAppData({
          ...appData,
          presensi: updatedPresensiMap,
        });

        setGenerationSummary({
          totalRecordsAdded: totalGeneratedRecordsCount,
          totalDays: calculatedDates.length,
          classesCount: targetClasses.length,
          studentsCount: targetStudentsCount,
          dateRange: calculatedDates.length > 0 
            ? `${calculatedDates[0]} s.d. ${calculatedDates[calculatedDates.length - 1]}`
            : '-',
        });

        onShowToast(
          `Sukses meng-generate ${totalGeneratedRecordsCount} data presensi untuk ${calculatedDates.length} hari pada ${targetClasses.length} kelas!`,
          'success'
        );
      } catch (err) {
        console.error('Error generating attendance test data:', err);
        onShowToast('Terjadi kesalahan saat membuat data presensi simulasi.', 'error');
      } finally {
        setIsGenerating(false);
      }
    }, 300);
  };

  return (
    <div id="attendance-testing-tool" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all mt-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Tool Testing Generator Presensi
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                Pilihan Kelas &amp; Kurun Waktu
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Generate data presensi pengujian yang dapat disesuaikan per kelas, kurun hari, minggu, bulan, atau kustom.
            </p>
          </div>
        </div>

        {generationSummary && (
          <button
            type="button"
            onClick={() => setGenerationSummary(null)}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 self-start sm:self-center transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Info
          </button>
        )}
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* Left Column: Scope & Filter Controls */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Pilih Kelas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Pilihan Kelas
            </label>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
            >
              <option value="all">🌐 Semua Kelas ({appData.kelas?.length || 0} Kelas Terdaftar)</option>
              {appData.kelas?.map((k) => (
                <option key={k.id} value={k.id}>
                  Kelas {k.nama} (Jurusan: {k.jurusanId})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Pilihan Kurun Waktu (Tab Selector) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Kurun Waktu Presensi
            </label>
            
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setPeriodType('hari')}
                className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  periodType === 'hari'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Hari
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('minggu')}
                className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  periodType === 'minggu'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Minggu
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('bulan')}
                className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  periodType === 'bulan'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Bulan
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('kustom')}
                className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  periodType === 'kustom'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Kustom
              </button>
            </div>

            {/* Sub-options based on Period Type */}
            <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              {periodType === 'hari' && (
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'today', label: 'Hari Ini Saja' },
                    { id: '3days', label: '3 Hari Terakhir' },
                    { id: '7days', label: '7 Hari Terakhir' },
                    { id: '14days', label: '14 Hari Terakhir' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDayPreset(p.id as any)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                        dayPreset === p.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {periodType === 'minggu' && (
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'this_week', label: 'Minggu Berjalan (Senin s.d. Sekarang)' },
                    { id: 'last_1week', label: '1 Minggu Terakhir (7 Hari)' },
                    { id: 'last_2weeks', label: '2 Minggu Terakhir (14 Hari)' },
                    { id: 'last_4weeks', label: '4 Minggu Terakhir (28 Hari)' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setWeekPreset(p.id as any)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                        weekPreset === p.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {periodType === 'bulan' && (
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'this_month', label: 'Bulan Berjalan' },
                    { id: 'last_1month', label: '1 Bulan Terakhir (30 Hari)' },
                    { id: 'last_3months', label: '3 Bulan Terakhir (90 Hari)' },
                    { id: 'semester', label: 'Periode Semester (Tanggal Mulai Ajaran s.d. Hari Ini)' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setMonthPreset(p.id as any)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                        monthPreset === p.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {periodType === 'kustom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Dari Tanggal Mulai:
                    </span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Sampai Tanggal Selesai:
                    </span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Pola Distribusi Kehadiran */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              Pola Distribusi Kehadiran
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  id: 'realistis',
                  title: 'Realistis Sekolah (~92% Hadir)',
                  desc: 'Hadir dominan, proporsi wajar Sakit, Izin, & Alpa',
                },
                {
                  id: 'disiplin',
                  title: 'Sangat Disiplin (~97% Hadir)',
                  desc: 'Tingkat kehadiran prima dan minim absensi',
                },
                {
                  id: 'beragam_masalah',
                  title: 'Tingkat Absen Tinggi (~80% Hadir)',
                  desc: 'Cocok untuk simulasi rekap ketidakhadiran & grafik',
                },
                {
                  id: 'semua_hadir',
                  title: '100% Hadir Penuh',
                  desc: 'Seluruh siswa berstatus Hadir tanpa absen',
                },
              ].map((pattern) => (
                <div
                  key={pattern.id}
                  onClick={() => setDistributionPattern(pattern.id as any)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    distributionPattern === pattern.id
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600/70 ring-1 ring-indigo-400'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {pattern.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {pattern.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Options, Live Preview & Action */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-5 bg-slate-50/80 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
          
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Opsi Hari &amp; Simulasi
            </h4>

            {/* Checkbox Options */}
            <div className="space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipWeekends}
                  onChange={(e) => {
                    setSkipWeekends(e.target.checked);
                    if (e.target.checked) setSkipSundayOnly(false);
                  }}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Lewati Akhir Pekan (Sabtu &amp; Minggu Libur)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Hanya generate pada hari efektif sekolah (Senin s.d. Jumat).
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipSundayOnly}
                  onChange={(e) => {
                    setSkipSundayOnly(e.target.checked);
                    if (e.target.checked) setSkipWeekends(false);
                  }}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    6 Hari Sekolah (Hanya Minggu Libur)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Senin hingga Sabtu tetap diisi presensi aktif.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeProblematicStudents}
                  onChange={(e) => setIncludeProblematicStudents(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Simulasikan Siswa Sampel Khusus
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Otomatis memasukkan variasi siswa dengan rekor ketidakhadiran tinggi untuk menguji fitur rekap, audit, &amp; home visit.
                  </span>
                </div>
              </label>
            </div>

            {/* Live Calculation Preview Card */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Estimasi Data Dibuat</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-extrabold text-[11px]">
                  ~{estimatedRecordsCount.toLocaleString()} Rekor
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <div className="text-[10px] text-slate-500">Jumlah Hari</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{calculatedDates.length} Hari</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <div className="text-[10px] text-slate-500">Kelas Target</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{targetClasses.length} Kelas</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <div className="text-[10px] text-slate-500">Siswa Target</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{targetStudentsCount} Siswa</div>
                </div>
              </div>

              {calculatedDates.length > 0 && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                  Rentang: <span className="font-semibold text-slate-700 dark:text-slate-300">{calculatedDates[0]}</span> s.d. <span className="font-semibold text-slate-700 dark:text-slate-300">{calculatedDates[calculatedDates.length - 1]}</span>
                </div>
              )}
            </div>
          </div>

          {/* Success Banner if Just Generated */}
          {generationSummary && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Data Presensi Sukses Di-Generate!
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                {generationSummary.totalRecordsAdded.toLocaleString()} status siswa berhasil dibuat ({generationSummary.totalDays} hari, {generationSummary.classesCount} kelas).
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            disabled={isGenerating || estimatedRecordsCount === 0}
            onClick={handleGenerate}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memproses Data Presensi...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Generate Presensi Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTestingTool;
