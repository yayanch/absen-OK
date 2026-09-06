import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  FileCode,
  Printer,
  ChevronDown,
  Eye,
  Loader2,
  Download,
} from 'lucide-react';
import { AttendanceReportViewModel } from '../../utils/reportEngine';
import {
  exportReportToExcel,
  exportReportToCSV,
  exportReportToPDF,
} from '../../utils/exportAdapters';

interface ReportExportButtonProps {
  getReportViewModel: () => AttendanceReportViewModel;
  onOpenPreview?: (report: AttendanceReportViewModel) => void;
  onShowToast?: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  className?: string;
  label?: string;
}

export const ReportExportButton: React.FC<ReportExportButtonProps> = ({
  getReportViewModel,
  onOpenPreview,
  onShowToast,
  className = '',
  label = 'Export Laporan',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingType, setExportingType] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = async (type: 'preview' | 'pdf' | 'excel' | 'csv' | 'print') => {
    try {
      setIsOpen(false);
      setIsExporting(true);
      setExportingType(type);

      // Snapshot canonical scope & report data
      const report = getReportViewModel();

      if (type === 'preview') {
        if (onOpenPreview) {
          onOpenPreview(report);
        }
      } else if (type === 'pdf') {
        await exportReportToPDF(report);
        onShowToast?.('Laporan berhasil diexport ke PDF', 'success');
      } else if (type === 'excel') {
        exportReportToExcel(report);
        onShowToast?.('Laporan berhasil diexport ke Excel (.xlsx)', 'success');
      } else if (type === 'csv') {
        exportReportToCSV(report);
        onShowToast?.('Laporan berhasil diexport ke CSV (.csv)', 'success');
      } else if (type === 'print') {
        if (onOpenPreview) {
          onOpenPreview(report);
          setTimeout(() => window.print(), 300);
        } else {
          window.print();
        }
      }
    } catch (err: any) {
      console.error('Export error:', err);
      onShowToast?.('Export gagal: ' + (err?.message || 'Silakan coba lagi.'), 'error');
    } finally {
      setIsExporting(false);
      setExportingType('');
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => handleAction('preview')}
          disabled={isExporting}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black rounded-l-2xl shadow-lg shadow-emerald-600/20 hover:scale-[1.01] active:scale-95 transition-all text-xs cursor-pointer flex items-center gap-2"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-4 h-4" />
          )}
          <span>{label}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isExporting}
          className="px-2.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white border-l border-emerald-500/40 rounded-r-2xl shadow-lg shadow-emerald-600/20 transition-all text-xs cursor-pointer flex items-center"
          title="Pilih Format Export"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Canonical Export Adapters
            </p>
          </div>

          <button
            onClick={() => handleAction('preview')}
            className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
          >
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>Lihat Preview Laporan</span>
          </button>

          <button
            onClick={() => handleAction('pdf')}
            className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Download PDF (.pdf)</span>
          </button>

          <button
            onClick={() => handleAction('excel')}
            className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Download Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => handleAction('csv')}
            className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
          >
            <FileCode className="w-4 h-4 text-blue-600" />
            <span>Download CSV (.csv)</span>
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <button
            onClick={() => handleAction('print')}
            className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Cetak / Cetak Dokumen</span>
          </button>
        </div>
      )}
    </div>
  );
};
