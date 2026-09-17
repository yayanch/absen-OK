import React, { useState } from 'react';
import {
  Check,
  AlertCircle,
  Info,
  X,
  Clock,
  Award,
  MessageCircle,
  Paperclip,
  Upload,
  Eye,
  Trash2,
  Edit3,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Siswa, PresensiStatus } from '../../types';

export interface StudentAttendanceRowProps {
  index: number;
  siswa: Siswa;
  currentStatus: PresensiStatus;
  time?: string;
  pulangStatus?: 'H' | 'TAP' | '';
  pulangTime?: string;
  suratBukti?: string;
  catatan?: string;
  isDisabled: boolean;
  density?: 'compact' | 'comfortable' | 'spacious';
  conflictInfo?: { serverStatus: PresensiStatus; serverPulangStatus: string };
  onStatusChange: (siswaId: string, status: PresensiStatus) => void;
  onPulangStatusChange: (siswaId: string, status: 'H' | 'TAP') => void;
  onUploadSurat: (siswaId: string, file: File) => void;
  onRemoveSurat: (siswaId: string) => void;
  onCatatanChange: (siswaId: string, text: string) => void;
  onPreviewSurat: (imageUrl: string, studentName: string, status: string) => void;
}

const STATUS_CONFIG: Array<{
  code: PresensiStatus;
  label: string;
  fullLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClasses: string;
  inactiveClasses: string;
  ariaLabel: string;
}> = [
  {
    code: 'H',
    label: 'H',
    fullLabel: 'Hadir',
    icon: Check,
    activeClasses: 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/40 border-emerald-600',
    inactiveClasses:
      'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
    ariaLabel: 'Hadir',
  },
  {
    code: 'S',
    label: 'S',
    fullLabel: 'Sakit',
    icon: AlertCircle,
    activeClasses: 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/40 border-amber-600',
    inactiveClasses:
      'bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/50',
    ariaLabel: 'Sakit',
  },
  {
    code: 'I',
    label: 'I',
    fullLabel: 'Izin',
    icon: Info,
    activeClasses: 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/40 border-blue-600',
    inactiveClasses:
      'bg-blue-50/80 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/40 hover:bg-blue-100 dark:hover:bg-blue-900/50',
    ariaLabel: 'Izin',
  },
  {
    code: 'A',
    label: 'A',
    fullLabel: 'Alpa',
    icon: X,
    activeClasses: 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500/40 border-rose-600',
    inactiveClasses:
      'bg-rose-50/80 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40 hover:bg-rose-100 dark:hover:bg-rose-900/50',
    ariaLabel: 'Alpa',
  },
  {
    code: 'K',
    label: 'K',
    fullLabel: 'Kesiangan',
    icon: Clock,
    activeClasses: 'bg-orange-600 text-white shadow-xs ring-2 ring-orange-500/40 border-orange-600',
    inactiveClasses:
      'bg-orange-50/80 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800/40 hover:bg-orange-100 dark:hover:bg-orange-900/50',
    ariaLabel: 'Kesiangan',
  },
  {
    code: 'D',
    label: 'D',
    fullLabel: 'Dispensasi',
    icon: Award,
    activeClasses: 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-500/40 border-purple-600',
    inactiveClasses:
      'bg-purple-50/80 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/40 hover:bg-purple-100 dark:hover:bg-purple-900/50',
    ariaLabel: 'Dispensasi',
  },
];

export const StudentAttendanceRow: React.FC<StudentAttendanceRowProps> = React.memo(({
  index,
  siswa,
  currentStatus,
  time,
  pulangStatus,
  pulangTime,
  suratBukti,
  catatan = '',
  isDisabled,
  density = 'comfortable',
  conflictInfo,
  onStatusChange,
  onPulangStatusChange,
  onUploadSurat,
  onRemoveSurat,
  onCatatanChange,
  onPreviewSurat,
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const formattedNumber = String(index + 1).padStart(2, '0');

  const paddingClass =
    density === 'compact'
      ? 'p-2.5 sm:p-3'
      : density === 'spacious'
      ? 'p-4 sm:p-5'
      : 'p-3.5 sm:p-4';

  const showPulangControl = ['H', 'K'].includes(currentStatus);
  const showEvidenceAndNotes = ['S', 'I', 'A', 'D'].includes(currentStatus);

  const cleanWaNumber = siswa.noWa
    ? siswa.noWa.replace(/^0/, '62').replace(/[^0-9]/g, '')
    : '';

  const isConflicted = !!conflictInfo;

  return (
    <div
      id={`student-row-${siswa.id}`}
      className={`${paddingClass} transition-colors duration-150 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-slate-50/90 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 last:border-b-0 ${
        isConflicted
          ? 'border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/20'
          : ''
      }`}
    >
      {/* 1. STUDENT IDENTITY (NUMBER + NAME + NISN + GENDER + WA) */}
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        {/* Number Badge */}
        <span
          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-slate-200/70 dark:border-slate-700/60 select-none"
          title={`Siswa nomor urut ${index + 1}`}
        >
          {formattedNumber}
        </span>

        {/* Info Column */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm tracking-tight truncate max-w-[280px] sm:max-w-md">
              {siswa.nama}
            </span>

            {/* Gender Badge */}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                siswa.gender === 'P'
                  ? 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200/60 dark:border-pink-800/40'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40'
              }`}
              title={siswa.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
            >
              {siswa.gender || 'L'}
            </span>

            {/* WhatsApp Link */}
            {cleanWaNumber && (
              <a
                href={`https://wa.me/${cleanWaNumber}?text=Halo%20${encodeURIComponent(
                  siswa.nama
                )},%20informasi%20presensi%20SMKN%206%20Garut`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Hubungi WhatsApp ${siswa.nama}`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-[10px] font-bold transition border border-emerald-200/60 dark:border-emerald-800/40"
                title="Kirim pesan WhatsApp"
              >
                <MessageCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline font-mono">{siswa.noWa}</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            <span>
              NISN: <span className="font-mono text-slate-600 dark:text-slate-300">{siswa.nisn || '-'}</span>
            </span>
            {time && currentStatus && (
              <>
                <span>•</span>
                <span className="text-slate-500 dark:text-slate-400">Masuk: {time}</span>
              </>
            )}
            {!currentStatus && (
              <>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold text-[10px] uppercase tracking-wider">
                  Belum Diisi
                </span>
              </>
            )}
            {isConflicted && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-bold border border-amber-300 dark:border-amber-700">
                  <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  Konflik Server: {conflictInfo.serverStatus || 'Belum Diabsen'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. RIGHT SIDE / CONTROLS (ATTENDANCE + PULANG + EVIDENCE/NOTES) */}
      <div className="flex flex-col items-start lg:items-end gap-2 shrink-0 w-full lg:w-auto">
        {/* Attendance Status Buttons Group */}
        <div
          role="group"
          aria-label={`Status kehadiran untuk ${siswa.nama}`}
          className="flex flex-wrap items-center gap-1 sm:gap-1.5 w-full sm:w-auto"
        >
          {STATUS_CONFIG.map((cfg) => {
            const isSelected = currentStatus === cfg.code;
            const IconComp = cfg.icon;

            return (
              <button
                key={cfg.code}
                type="button"
                role="button"
                aria-pressed={isSelected}
                aria-label={`Tandai ${siswa.nama} ${cfg.ariaLabel}`}
                disabled={isDisabled}
                onClick={() => onStatusChange(siswa.id, cfg.code)}
                className={`min-h-[40px] sm:min-h-[36px] min-w-[40px] sm:min-w-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSelected ? cfg.activeClasses : cfg.inactiveClasses
                } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}`}
                title={`Pilih ${cfg.fullLabel} (${cfg.code})`}
              >
                <IconComp className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="font-extrabold">{cfg.label}</span>
                <span className="hidden xl:inline text-[10px] font-medium opacity-90">
                  {cfg.fullLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-row: Status Pulang (for H / K) */}
        {showPulangControl && (
          <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/90 px-3 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs animate-in fade-in duration-150 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pulang:
            </span>
            <button
              type="button"
              role="button"
              aria-pressed={pulangStatus === 'H'}
              aria-label={`Status pulang ${siswa.nama}: ${pulangStatus === 'H' ? 'Hadir Pulang' : 'TAP'}`}
              disabled={isDisabled}
              onClick={() => onPulangStatusChange(siswa.id, pulangStatus === 'H' ? 'TAP' : 'H')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                pulangStatus === 'H'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
              title="Klik untuk mengubah status kepulangan siswa"
            >
              {pulangStatus === 'H' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Hadir Pulang ({pulangTime || 'Manual'})</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>TAP (Tidak Absen Pulang)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Sub-row: Evidence & Notes (for S, I, A, D) */}
        {showEvidenceAndNotes && (
          <div className="mt-1 p-2.5 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2 w-full lg:max-w-md animate-in fade-in duration-150">
            {/* Header / Type Indicator */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3 h-3 text-indigo-500" />
                Surat & Catatan {currentStatus === 'S' ? 'Sakit' : currentStatus === 'I' ? 'Izin' : currentStatus === 'D' ? 'Dispensasi' : 'Alpa'}
              </span>
              {suratBukti && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold rounded-md flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" /> Ada Lampiran
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Evidence File / Upload Control */}
              {suratBukti ? (
                <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <img
                    src={suratBukti}
                    alt={`Lampiran surat ${siswa.nama}`}
                    className="w-8 h-8 object-cover rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition shrink-0"
                    onClick={() =>
                      onPreviewSurat(
                        suratBukti,
                        siswa.nama,
                        currentStatus === 'S'
                          ? 'Sakit'
                          : currentStatus === 'I'
                          ? 'Izin'
                          : currentStatus === 'D'
                          ? 'Dispensasi'
                          : 'Alpa'
                      )
                    }
                    title="Klik untuk memperbesar gambar surat"
                  />
                  <div className="flex-1 min-w-0 text-[11px]">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">Dokumen Surat</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onPreviewSurat(
                        suratBukti,
                        siswa.nama,
                        currentStatus === 'S'
                          ? 'Sakit'
                          : currentStatus === 'I'
                          ? 'Izin'
                          : currentStatus === 'D'
                          ? 'Dispensasi'
                          : 'Alpa'
                      )
                    }
                    aria-label={`Lihat surat ${siswa.nama}`}
                    className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Lihat</span>
                  </button>
                  {!isDisabled && (
                    <button
                      type="button"
                      onClick={() => onRemoveSurat(siswa.id)}
                      aria-label={`Hapus lampiran surat ${siswa.nama}`}
                      className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300 rounded text-[10px] font-bold transition cursor-pointer"
                      title="Hapus Surat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <label
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg hover:border-slate-400 text-[11px] text-slate-600 dark:text-slate-300 font-semibold transition ${
                    isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  title="Unggah foto/scan surat keterangan"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Upload Surat</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isDisabled}
                    aria-label={`Upload surat untuk ${siswa.nama}`}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadSurat(siswa.id, file);
                    }}
                    className="hidden"
                  />
                </label>
              )}

              {/* Note input field */}
              <input
                type="text"
                disabled={isDisabled}
                value={catatan}
                onChange={(e) => onCatatanChange(siswa.id, e.target.value)}
                placeholder="Catatan alasan..."
                aria-label={`Catatan alasan untuk ${siswa.nama}`}
                className="w-full sm:w-44 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-theme-primary transition"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
