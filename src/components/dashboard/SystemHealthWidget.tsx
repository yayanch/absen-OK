import React from 'react';
import { Database, RefreshCw, HardDrive, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface SystemHealthWidgetProps {
  onNavigateView?: (view: any) => void;
}

export const SystemHealthWidget: React.FC<SystemHealthWidgetProps> = ({ onNavigateView }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-theme-primary" />
          <span>Status Kesehatan Sistem</span>
        </h3>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Sistem Normal</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Status Sinkronisasi */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Status Sinkronisasi</div>
            <div className="font-extrabold text-xs text-slate-800 dark:text-white mt-0.5">Tersinkronisasi Real-Time</div>
          </div>
        </div>

        {/* Database Status */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Database Storage</div>
            <div className="font-extrabold text-xs text-slate-800 dark:text-white mt-0.5">Local Storage + Offline Ready</div>
          </div>
        </div>

        {/* Status Backup */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Status Backup</div>
            <div className="font-extrabold text-xs text-slate-800 dark:text-white mt-0.5">Otomatis Ter-backup</div>
          </div>
        </div>
      </div>
    </div>
  );
};
