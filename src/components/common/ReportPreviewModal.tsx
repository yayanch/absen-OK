import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Printer,
  FileCode,
  Download,
  CheckCircle2,
  Calendar,
  Building,
  Users,
  Eye,
  Loader2,
  Percent,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { AttendanceReportViewModel } from '../../utils/reportEngine';
import {
  exportReportToExcel,
  exportReportToCSV,
  exportReportToPDF,
} from '../../utils/exportAdapters';

interface ReportPreviewModalProps {
  report: AttendanceReportViewModel | null;
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  report,
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportingType, setExportingType] = useState<string>('');

  if (!isOpen || !report) return null;

  const handleExportExcel = () => {
    try {
      setIsExporting(true);
      setExportingType('excel');
      exportReportToExcel(report);
      onShowToast?.('Laporan berhasil diexport ke format Excel (.xlsx)', 'success');
    } catch (e: any) {
      onShowToast?.('Export Excel gagal: ' + (e?.message || 'Silakan coba lagi.'), 'error');
    } finally {
      setIsExporting(false);
      setExportingType('');
    }
  };

  const handleExportCSV = () => {
    try {
      setIsExporting(true);
      setExportingType('csv');
      exportReportToCSV(report);
      onShowToast?.('Laporan berhasil diexport ke format CSV (.csv)', 'success');
    } catch (e: any) {
      onShowToast?.('Export CSV gagal: ' + (e?.message || 'Silakan coba lagi.'), 'error');
    } finally {
      setIsExporting(false);
      setExportingType('');
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      setExportingType('pdf');
      await exportReportToPDF(report);
      onShowToast?.('Laporan berhasil diexport ke format PDF (.pdf)', 'success');
    } catch (e: any) {
      onShowToast?.('Export PDF gagal: ' + (e?.message || 'Silakan coba lagi.'), 'error');
    } finally {
      setIsExporting(false);
      setExportingType('');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                Preview Laporan Canonical
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {report.metadata.reportTitle} &bull; {report.metadata.kelasLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                {isExporting && exportingType === 'pdf' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                <span>PDF</span>
              </button>

              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                {isExporting && exportingType === 'excel' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                )}
                <span>Excel</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                {isExporting && exportingType === 'csv' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileCode className="w-3.5 h-3.5" />
                )}
                <span>CSV</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md shadow-slate-800/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
          {/* Printable Report Canvas Area */}
          <div id="canonical-report-preview-canvas" className="bg-white dark:bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            {/* School Header */}
            <div className="border-b-2 border-slate-800 dark:border-slate-600 pb-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {report.metadata.schoolName}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {report.metadata.alamat}
                </p>
              </div>
              <div className="text-center sm:text-right">
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-black uppercase">
                  {report.metadata.reportType}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">
                  NPSN: {report.metadata.npsn || '2026-SMK'}
                </p>
              </div>
            </div>

            {/* Title & Metadata Card */}
            <div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-white">
                {report.metadata.reportTitle}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                {report.metadata.subtitle}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Kelas: </span>
                  {report.metadata.kelasLabel}
                </div>
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Wali Kelas: </span>
                  {report.metadata.waliKelasLabel || '-'}
                </div>
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Tanggal Cetak: </span>
                  {report.metadata.generatedAt.split(',')[0]}
                </div>
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Operator: </span>
                  {report.metadata.generatedBy}
                </div>
              </div>
            </div>

            {/* Canonical KPIs Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Siswa</p>
                <p className="text-base font-black text-slate-800 dark:text-white mt-0.5">
                  {report.summary.totalStudents}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Hari Efektif</p>
                <p className="text-base font-black text-slate-800 dark:text-white mt-0.5">
                  {report.summary.expectedDays}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-center">
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Hadir (H)</p>
                <p className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {report.summary.totalHadir}
                </p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-xl text-center">
                <p className="text-[10px] font-bold text-amber-600 uppercase">Izin (I)</p>
                <p className="text-base font-black text-amber-700 dark:text-amber-300 mt-0.5">
                  {report.summary.totalIzin}
                </p>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-center">
                <p className="text-[10px] font-bold text-indigo-600 uppercase">Sakit (S)</p>
                <p className="text-base font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
                  {report.summary.totalSakit}
                </p>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-xl text-center">
                <p className="text-[10px] font-bold text-rose-600 uppercase">Alpa (A)</p>
                <p className="text-base font-black text-rose-700 dark:text-rose-300 mt-0.5">
                  {report.summary.totalAlpa}
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl text-center col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold text-blue-600 uppercase">% Kehadiran</p>
                <p className="text-base font-black text-blue-700 dark:text-blue-300 mt-0.5">
                  {report.summary.attendanceRateFormatted}
                </p>
              </div>
            </div>

            {/* Table Area */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold uppercase text-[10px] tracking-wider">
                    {report.columns.map((col) => (
                      <th
                        key={col.id}
                        className={`p-3 ${
                          col.align === 'center'
                            ? 'text-center'
                            : col.align === 'right'
                            ? 'text-right'
                            : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={report.columns.length}
                        className="p-8 text-center text-slate-400"
                      >
                        Tidak ada baris data yang tersedia dalam scope laporan ini.
                      </td>
                    </tr>
                  ) : (
                    report.rows.map((row, idx) => (
                      <tr
                        key={row.id || idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition even:bg-slate-50/30 dark:even:bg-slate-900/20"
                      >
                        {report.columns.map((col) => {
                          const val = row[col.id];
                          const displayVal = val !== undefined && val !== null ? val : '-';

                          let colorClass = 'text-slate-800 dark:text-slate-200';
                          if (col.id === 'status' || col.id.startsWith('day_')) {
                            if (displayVal === 'H' || displayVal === 'Hadir') colorClass = 'text-emerald-600 font-bold';
                            else if (displayVal === 'S' || displayVal === 'Sakit') colorClass = 'text-indigo-600 font-bold';
                            else if (displayVal === 'I' || displayVal === 'Izin') colorClass = 'text-amber-600 font-bold';
                            else if (displayVal === 'A' || displayVal === 'Alpa') colorClass = 'text-rose-600 font-black';
                            else if (displayVal === 'K' || displayVal === 'Kesiangan') colorClass = 'text-orange-600 font-bold';
                            else if (displayVal === 'D' || displayVal === 'Dispensasi') colorClass = 'text-purple-600 font-bold';
                            else if (displayVal === 'LIBUR') colorClass = 'text-slate-400 italic';
                          }

                          return (
                            <td
                              key={col.id}
                              className={`p-3 ${colorClass} ${
                                col.align === 'center'
                                  ? 'text-center'
                                  : col.align === 'right'
                                  ? 'text-right'
                                  : 'text-left'
                              }`}
                            >
                              {displayVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Verification Footer Block */}
            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
              <div>
                <p className="font-mono text-[10px]">
                  ID Laporan: CANONICAL-{report.type}-{Date.now().toString(36).toUpperCase()}
                </p>
                <p className="text-[10px] mt-0.5">
                  Laporan diverifikasi otomatis oleh Sistem Presensi Siswa SMKN 6 Garut
                </p>
              </div>
              <div className="text-center sm:text-right space-y-1">
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Mengetahui,
                </p>
                <p className="text-[10px] text-slate-500">
                  {report.metadata.waliKelasLabel ? `Wali Kelas ${report.metadata.kelasLabel}` : 'Kepala Sekolah / Kesiswaan'}
                </p>
                <div className="h-12"></div>
                <p className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 border-t border-slate-300 dark:border-slate-700 pt-1">
                  ( {report.metadata.waliKelasLabel || '...........................................'} )
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Action Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex sm:hidden items-center justify-between gap-2 overflow-x-auto">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex-1 px-3 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex-1 px-3 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex-1 px-3 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 px-3 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
