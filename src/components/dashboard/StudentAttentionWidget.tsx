import React from 'react';
import { ShieldAlert, ChevronRight, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { ViewType } from '../../types';

interface StudentAttentionItem {
  siswa: any;
  kelas?: any;
  sakit: number;
  izin: number;
  alfa: number;
  totalTidakHadir: number;
  statusRisk: 'Normal' | 'Perlu Perhatian' | 'Prioritas';
  detailRecords?: any[];
}

interface StudentAttentionWidgetProps {
  students: StudentAttentionItem[];
  title?: string;
  subtitle?: string;
  maxItems?: number;
  onOpenDetail?: (item: any) => void;
  onNavigateView?: (view: ViewType) => void;
}

export const StudentAttentionWidget: React.FC<StudentAttentionWidgetProps> = ({
  students,
  title = 'Siswa Perlu Perhatian',
  subtitle = 'Daftar siswa berdasarkan indikator ketidakhadiran & kedisiplinan',
  maxItems = 5,
  onOpenDetail,
  onNavigateView,
}) => {
  const displayStudents = students.slice(0, maxItems);

  const getStatusBadge = (statusRisk: 'Normal' | 'Perlu Perhatian' | 'Prioritas') => {
    if (statusRisk === 'Prioritas') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span>✕ Prioritas Kritis</span>
        </span>
      );
    }
    if (statusRisk === 'Perlu Perhatian') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>⚠ Perlu Perhatian</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>✓ Normal</span>
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        {onNavigateView && (
          <button
            onClick={() => onNavigateView('rekap_ketidakhadiran_tertinggi')}
            className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {displayStudents.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Belum ada siswa yang membutuhkan perhatian khusus.
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Tingkat kehadiran siswa terjaga dengan baik.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayStudents.map((item, idx) => (
            <div
              key={item.siswa.id || idx}
              onClick={() => onOpenDetail && onOpenDetail(item)}
              className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition active:scale-[0.99]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                    {item.siswa.nama}
                  </span>
                  {getStatusBadge(item.statusRisk)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Kelas: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.kelas?.nama || '-'}</span> • NISN: {item.siswa.nisn || '-'}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <div className="flex items-center gap-2 text-xs font-black">
                  {item.alfa > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      A: {item.alfa}d
                    </span>
                  )}
                  {item.sakit > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      S: {item.sakit}d
                    </span>
                  )}
                  {item.izin > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      I: {item.izin}d
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
