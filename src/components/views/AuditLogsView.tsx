import React, { useState } from 'react';
import {
  FileText,
  Search,
  Calendar,
  User,
  Shield,
  Download,
  Trash2,
  Info,
  ArrowUpDown,
  Filter,
  CheckCircle,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppData, AuditLog, UserSession } from '../../types';
import { Pagination } from '../Pagination';
import { PageHeader } from '../common/UIComponents';

interface AuditLogsViewProps {
  appData: AppData;
  currentUser: UserSession;
  onUpdateAppData: (updated: AppData) => void;
  onConfirmModal: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  appData,
  currentUser,
  onUpdateAppData,
  onConfirmModal,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'semua' | string>('semua');
  const [filterModule, setFilterModule] = useState<'semua' | string>('semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortAsc, setSortAsc] = useState(false); // Default newest first

  const logs = appData.auditLogs || [];

  // Group roles for dropdown
  const uniqueRoles = Array.from(new Set(logs.map((log) => log.role))).filter(Boolean);
  // Group categories/roles for modules
  const modules = ['sekolah', 'jurusan', 'kelas', 'siswa', 'user'];

  // Filter & Search
  const filteredLogs = logs
    .filter((log) => {
      const matchSearch =
        log.aksi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.username.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRole = filterRole === 'semua' || log.role.toLowerCase() === filterRole.toLowerCase();
      const matchModule = filterModule === 'semua' || log.role.toLowerCase() === filterModule.toLowerCase();

      return matchSearch && matchRole && matchModule;
    })
    .sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });

  // Pagination
  const totalCount = filteredLogs.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      onShowToast('Tidak ada data log untuk diekspor!', 'warning');
      return;
    }

    const exportData = filteredLogs.map((log, index) => ({
      No: index + 1,
      Waktu: log.timestamp,
      Nama: log.nama,
      Username: log.username,
      Role: log.role.toUpperCase(),
      Aksi: log.aksi,
      Detail: log.detail,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 25 }, // Waktu
      { wch: 20 }, // Nama
      { wch: 15 }, // Username
      { wch: 12 }, // Role
      { wch: 25 }, // Aksi
      { wch: 60 }, // Detail
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Trail Log');
    XLSX.writeFile(wb, `Audit_Trail_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
    onShowToast(`Berhasil mengekspor ${filteredLogs.length} data log ke Excel!`, 'success');
  };

  const handlePrint = () => {
    if (filteredLogs.length === 0) {
      onShowToast('Tidak ada data log untuk dicetak!', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Log Audit Trail - ${appData.sekolah?.nama || 'Aplikasi Presensi'}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; color: #333; font-size: 11px; }
            h1 { text-align: center; margin-bottom: 5px; font-size: 18px; text-transform: uppercase; }
            h2 { text-align: center; margin-top: 0; font-size: 12px; color: #666; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; vertical-align: top; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .badge { font-weight: bold; text-transform: uppercase; padding: 2px 5px; border-radius: 3px; font-size: 9px; border: 1px solid #ccc; }
          </style>
        </head>
        <body>
          <h1>Log Audit Trail (Audit Logs)</h1>
          <h2>Instansi: ${appData.sekolah?.nama || 'SMK/SMA/MA Portal Presensi'}</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 5%">No</th>
                <th style="width: 20%">Waktu & Tanggal</th>
                <th style="width: 15%">Pengguna</th>
                <th style="width: 10%">Modul</th>
                <th style="width: 15%">Aksi</th>
                <th style="width: 35%">Detail Perubahan</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogs
                .map(
                  (log, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${new Date(log.timestamp).toLocaleString('id-ID')}</td>
                  <td><strong>${log.nama}</strong><br><small>${log.username} (${log.role})</small></td>
                  <td><span class="badge">${log.role}</span></td>
                  <td><strong>${log.aksi}</strong></td>
                  <td>${log.detail}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleClearLogs = () => {
    onConfirmModal(
      'Bersihkan Log Aktivitas',
      'Apakah Anda yakin ingin menghapus seluruh riwayat log audit ini? Tindakan ini tidak dapat dibatalkan.',
      'danger',
      () => {
        const nextAppData = { ...appData, auditLogs: [] };
        onUpdateAppData(nextAppData);
        onShowToast('Riwayat log audit berhasil dibersihkan!', 'success');
      }
    );
  };

  const getModuleBadgeColor = (mod: string) => {
    switch (mod.toLowerCase()) {
      case 'sekolah':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50';
      case 'jurusan':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50';
      case 'kelas':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50';
      case 'siswa':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50';
      case 'user':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/50';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={FileText}
        title="Pencatatan Log Aktivitas"
        description="Sistem background audit memantau perubahan data penting secara berkala yang dilakukan oleh pengguna berwenang (Administrator atau Kesiswaan)."
        badge="Audit Trail & Security Logs"
      />

      {/* Info Card */}
      <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-4 flex gap-3 text-amber-800 dark:text-amber-300 text-xs">
        <Info className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1">
          <p className="font-bold">Informasi Sistem Keamanan</p>
          <p className="leading-relaxed text-[11px] opacity-90">
            Audit Trail mencatat nama pelaku, tingkat hak akses, jenis aksi, modul yang dimodifikasi, alamat IP (bila terintegrasi), serta rincian lengkap perubahan nilai sebelum dan sesudah aksi dilakukan. Data tersimpan secara aman dalam cache global dan disinkronkan langsung ke basis data utama.
          </p>
        </div>
      </div>

      {/* Control Panel / Filter */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari log berdasarkan aksi, pelaku, atau detail perubahan..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Combobox Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterModule}
              onChange={(e) => {
                setFilterModule(e.target.value);
                setCurrentPage(1);
              }}
              className="py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="semua">Semua Modul</option>
              {modules.map((mod) => (
                <option key={mod} value={mod}>
                  Modul: {mod.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
              title={sortAsc ? 'Urutkan Terlama Dahulu' : 'Urutkan Terbaru Dahulu'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortAsc ? 'Terlama' : 'Terbaru'}</span>
            </button>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="py-2 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="py-2 px-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak PDF</span>
            </button>
            {currentUser.role === 'admin' && logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="py-2 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Bersihkan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-4 px-5 w-14 text-center">No</th>
                <th className="py-4 px-5 w-48">Waktu & Tanggal</th>
                <th className="py-4 px-5 w-52">Pelaku (Aktor)</th>
                <th className="py-4 px-5 w-36">Modul</th>
                <th className="py-4 px-5 w-48">Aksi</th>
                <th className="py-4 px-5">Detail Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2.5" />
                    Belum ada riwayat log audit yang terekam atau sesuai filter.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log, idx) => {
                  const num = (currentPage - 1) * pageSize + idx + 1;
                  const dateStr = new Date(log.timestamp).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition text-slate-700 dark:text-slate-200"
                    >
                      <td className="py-3.5 px-5 text-center text-[11px] font-bold text-slate-400">
                        {num}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{dateStr}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold shrink-0">
                            {log.nama.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100 leading-tight">
                              {log.nama}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                              @{log.username} • <span className="uppercase">{log.role}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getModuleBadgeColor(log.role)}`}>
                          {log.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-xs">
                        <div className="font-bold text-slate-800 dark:text-slate-200 leading-normal">
                          {log.aksi}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-xs">
                        <div className="max-w-md lg:max-w-xl text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed break-words">
                          {log.detail}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredLogs.length}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
