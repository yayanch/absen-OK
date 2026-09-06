import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import {
  Printer,
  QrCode,
  CheckSquare,
  Square,
  Search,
  Filter,
  Layers,
  Settings,
  Download,
  Eye,
  FileSpreadsheet,
  Users,
  Grid,
  CheckCircle2,
  Sliders,
  Copy,
  Check,
  Building,
  School,
  FileText,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { AppData, Siswa, UserSession } from '../../types';
import { sortKelasList } from '../../data/initialData';

interface CetakKartuQrViewProps {
  appData: AppData;
  currentUser: UserSession;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

type GridOption = '2x4' | '3x3' | '2x2' | '3x4' | '1x1';
type ThemeOption = 'dark' | 'light_blue' | 'emerald_official' | 'royal_purple' | 'sunset_crimson' | 'midnight_gold' | 'modern_indigo' | 'minimalist';
type CardOrientation = 'landscape' | 'portrait';
type SortOption = 'nama_asc' | 'nisn_asc' | 'kelas_asc';

export const CetakKartuQrView: React.FC<CetakKartuQrViewProps> = ({
  appData,
  currentUser,
  onShowToast,
}) => {
  const sortedKelas = useMemo(() => sortKelasList(appData.kelas), [appData.kelas]);
  const sekolahNama = appData.sekolah?.nama || 'SMK Negeri';
  const sekolahAlamat = appData.sekolah?.alamat || '';
  const sekolahWebsite = appData.sekolah?.website || '';
  const sekolahLogo = appData.sekolah?.logo || '';

  // Filters
  const [selectedKelasId, setSelectedKelasId] = useState<string>('all');
  const [selectedJurusanId, setSelectedJurusanId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Student selection
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<Set<string>>(new Set());

  // Settings
  const [gridOption, setGridOption] = useState<GridOption>('2x4');
  const [themeOption, setThemeOption] = useState<ThemeOption>('dark');
  const [cardOrientation, setCardOrientation] = useState<CardOrientation>('landscape');
  const [pageBreakByClass, setPageBreakByClass] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<SortOption>('kelas_asc');

  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [showSekolah, setShowSekolah] = useState<boolean>(true);
  const [showParent, setShowParent] = useState<boolean>(true);
  const [showInstruction, setShowInstruction] = useState<boolean>(true);
  const [customInstruction, setCustomInstruction] = useState<string>(
    'Gunakan Kartu & QR Code ini untuk scan presensi harian di sekolah.'
  );

  // Live preview QR
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');

  // Filtered siswa list
  const filteredSiswa = useMemo(() => {
    let result = appData.siswa.filter((s) => {
      // Filter status
      const isInactive = s.status === 'tidak_aktif';
      if (selectedStatus === 'active' && isInactive) return false;
      if (selectedStatus === 'inactive' && !isInactive) return false;

      // Filter kelas
      if (selectedKelasId !== 'all' && s.kelasId !== selectedKelasId) return false;

      // Filter jurusan
      if (selectedJurusanId !== 'all') {
        const k = appData.kelas.find((item) => item.id === s.kelasId);
        if (!k || k.jurusanId !== selectedJurusanId) return false;
      }

      // Filter query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchNama = s.nama.toLowerCase().includes(q);
        const matchNisn = (s.nisn || '').toLowerCase().includes(q);
        if (!matchNama && !matchNisn) return false;
      }

      return true;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === 'nama_asc') {
        return a.nama.localeCompare(b.nama);
      }
      if (sortBy === 'nisn_asc') {
        return (a.nisn || '').localeCompare(b.nisn || '');
      }
      // kelas_asc
      const kA = appData.kelas.find((x) => x.id === a.kelasId)?.nama || '';
      const kB = appData.kelas.find((x) => x.id === b.kelasId)?.nama || '';
      if (kA !== kB) return kA.localeCompare(kB);
      return a.nama.localeCompare(b.nama);
    });

    return result;
  }, [appData.siswa, appData.kelas, selectedKelasId, selectedJurusanId, selectedStatus, searchQuery, sortBy]);

  // Sync selectedSiswaIds on filter change by default select all filtered
  useEffect(() => {
    setSelectedSiswaIds(new Set(filteredSiswa.map((s) => s.id)));
  }, [filteredSiswa]);

  // Selected siswa list
  const selectedSiswaList = useMemo(() => {
    return filteredSiswa.filter((s) => selectedSiswaIds.has(s.id));
  }, [filteredSiswa, selectedSiswaIds]);

  // Generate preview QR code for first selected student
  useEffect(() => {
    if (selectedSiswaList.length > 0) {
      const first = selectedSiswaList[0];
      const k = appData.kelas.find((item) => item.id === first.kelasId);
      const payload = JSON.stringify({
        nisn: first.nisn,
        nama: first.nama,
        id: first.id,
        siswaId: first.id,
        kelas: k?.nama || '',
        sekolah: sekolahNama,
      });
      QRCode.toDataURL(payload, { width: 200, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
        .then((url) => setPreviewQrUrl(url))
        .catch((err) => console.error(err));
    } else {
      setPreviewQrUrl('');
    }
  }, [selectedSiswaList, appData.kelas, sekolahNama]);

  // Selection toggles
  const handleToggleSelectAll = () => {
    if (selectedSiswaIds.size === filteredSiswa.length) {
      setSelectedSiswaIds(new Set());
    } else {
      setSelectedSiswaIds(new Set(filteredSiswa.map((s) => s.id)));
    }
  };

  const handleToggleSiswa = (id: string) => {
    const next = new Set(selectedSiswaIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedSiswaIds(next);
  };

  // Estimate A4 pages
  const cardsPerPageMap: Record<GridOption, number> = {
    '2x4': 8,
    '3x3': 9,
    '2x2': 4,
    '3x4': 12,
    '1x1': 1,
  };
  const cardsPerPage = cardsPerPageMap[gridOption];
  const estimatedPages = Math.ceil(selectedSiswaList.length / cardsPerPage);

  // Export Excel
  const handleExportExcel = () => {
    if (selectedSiswaList.length === 0) {
      onShowToast('Tidak ada siswa terpilih untuk diexport!', 'warning');
      return;
    }

    const dataExcel = selectedSiswaList.map((s, idx) => {
      const k = appData.kelas.find((item) => item.id === s.kelasId);
      const payload = JSON.stringify({
        nisn: s.nisn,
        nama: s.nama,
        id: s.id,
        siswaId: s.id,
        kelas: k?.nama || '',
        sekolah: sekolahNama,
      });

      return {
        No: idx + 1,
        'NISN / No. Induk': s.nisn || '-',
        'Nama Lengkap': s.nama,
        Kelas: k?.nama || '-',
        Gender: s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
        'Nama Orang Tua': s.namaOrangTua || '-',
        'No. WA Ortual': s.noWaOrangTua || '-',
        'QR Code Payload': payload,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data QR Siswa');

    XLSX.writeFile(
      workbook,
      `Data_QR_Presensi_${selectedKelasId !== 'all' ? 'Kelas' : 'Semua'}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    onShowToast(`Berhasil mengeksport ${selectedSiswaList.length} data siswa ke Excel!`, 'success');
  };

  // PRINT ACTION
  const handlePrint = async () => {
    if (selectedSiswaList.length === 0) {
      onShowToast('Pilih setidaknya 1 siswa untuk dicetak!', 'warning');
      return;
    }

    onShowToast(`Menyiapkan ${selectedSiswaList.length} kartu QR untuk dicetak...`, 'info');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      onShowToast('Gagal membuka jendela cetak. Mohon izinkan pop-up di browser.', 'warning');
      return;
    }

    // Generate QR Data URLs for all selected students
    const items = await Promise.all(
      selectedSiswaList.map(async (s) => {
        const k = appData.kelas.find((item) => item.id === s.kelasId);
        const kelasNama = k ? k.nama : '-';
        const payload = JSON.stringify({
          nisn: s.nisn,
          nama: s.nama,
          id: s.id,
          siswaId: s.id,
          kelas: kelasNama,
          sekolah: sekolahNama,
        });

        const darkColor = themeOption === 'dark' ? '#0f172a' : '#1e293b';
        const qrUrl = await QRCode.toDataURL(payload, {
          width: 240,
          margin: 1,
          color: { dark: darkColor, light: '#ffffff' },
        });

        return { siswa: s, kelasNama, qrUrl };
      })
    );

    // Grouping by class if pageBreakByClass is true
    let contentHtml = '';

    const gridCssMap: Record<GridOption, string> = {
      '2x4': 'grid-template-columns: repeat(2, 1fr); gap: 12px;',
      '3x3': 'grid-template-columns: repeat(3, 1fr); gap: 10px;',
      '2x2': 'grid-template-columns: repeat(2, 1fr); gap: 16px;',
      '3x4': 'grid-template-columns: repeat(3, 1fr); gap: 8px;',
      '1x1': 'grid-template-columns: 1fr; gap: 20px; max-width: 380px; margin: 0 auto;',
    };

    if (pageBreakByClass) {
      // Group items by class
      const groupedByClass: Record<string, typeof items> = {};
      items.forEach((item) => {
        const kName = item.kelasNama || 'Tanpa Kelas';
        if (!groupedByClass[kName]) groupedByClass[kName] = [];
        groupedByClass[kName].push(item);
      });

      const classEntries = Object.entries(groupedByClass);
      contentHtml = classEntries
        .map(([kelasName, classItems], idx) => {
          const cards = classItems.map((item) => renderCardHtml(item)).join('');
          return `
            <div class="class-group ${idx > 0 ? 'page-break-before' : ''}">
              <div class="class-header">
                <div>
                  <h3 class="class-title">PEMBAGIAN KARTU PRESENSI QR - KELAS ${kelasName}</h3>
                  <div class="class-sub">Jumlah Siswa: ${classItems.length} Siswa | ${sekolahNama}</div>
                </div>
                <div class="class-badge">Halaman Distribusi</div>
              </div>
              <div class="grid-container" style="${gridCssMap[gridOption]}">
                ${cards}
              </div>
            </div>
          `;
        })
        .join('');
    } else {
      const cards = items.map((item) => renderCardHtml(item)).join('');
      contentHtml = `
        <div class="grid-container" style="${gridCssMap[gridOption]}">
          ${cards}
        </div>
      `;
    }

    // Theme CSS
    let cardThemeCss = '';
    if (themeOption === 'dark') {
      cardThemeCss = `
        .card { background: #0f172a; color: #ffffff; border: 1.5px solid #334155; }
        .card-header { border-bottom: 1px solid #1e293b; color: #94a3b8; }
        .card-sekolah-nama { color: #f8fafc; }
        .card-sekolah-alamat { color: #94a3b8; }
        .card-sekolah-website { color: #38bdf8; }
        .card-type-title { color: #38bdf8; }
        .card-name { color: #f8fafc; }
        .card-nisn { color: #38bdf8; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2); }
        .card-kelas { color: #a7f3d0; background: rgba(16, 185, 129, 0.15); }
        .card-details { color: #cbd5e1; background: #1e293b; border: 1px solid #334155; }
        .card-instruction { color: #94a3b8; border-top: 1px solid #1e293b; }
      `;
    } else if (themeOption === 'light_blue') {
      cardThemeCss = `
        .card { background: #ffffff; color: #0f172a; border: 1.5px solid #cbd5e1; }
        .card-header { background: #2563eb; color: #ffffff; margin: -12px -12px 10px -12px; padding: 8px 12px; border-top-left-radius: 10px; border-top-right-radius: 10px; }
        .card-sekolah-nama { color: #ffffff; }
        .card-sekolah-alamat { color: rgba(255, 255, 255, 0.85); }
        .card-sekolah-website { color: rgba(255, 255, 255, 0.95); font-weight: 600; }
        .card-type-title { color: #2563eb; }
        .card-name { color: #0f172a; }
        .card-nisn { color: #2563eb; background: #eff6ff; border: 1px solid #bfdbfe; }
        .card-kelas { color: #047857; background: #ecfdf5; }
        .card-details { color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; }
        .card-instruction { color: #64748b; border-top: 1px solid #e2e8f0; }
      `;
    } else if (themeOption === 'emerald_official') {
      cardThemeCss = `
        .card { background: #ffffff; color: #0f172a; border: 2px solid #10b981; }
        .card-header { background: #065f46; color: #ffffff; margin: -12px -12px 10px -12px; padding: 8px 12px; border-top-left-radius: 10px; border-top-right-radius: 10px; }
        .card-sekolah-nama { color: #ffffff; }
        .card-sekolah-alamat { color: rgba(255, 255, 255, 0.85); }
        .card-sekolah-website { color: rgba(255, 255, 255, 0.95); font-weight: 600; }
        .card-type-title { color: #059669; }
        .card-name { color: #065f46; }
        .card-nisn { color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; }
        .card-kelas { color: #065f46; background: #d1fae5; }
        .card-details { color: #334155; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .card-instruction { color: #64748b; border-top: 1px solid #e2e8f0; }
      `;
    } else if (themeOption === 'royal_purple') {
      cardThemeCss = `
        .card { background: #ffffff; color: #0f172a; border: 2px solid #7e22ce; }
        .card-header { background: linear-gradient(135deg, #581c87, #7e22ce); color: #ffffff; margin: -12px -12px 10px -12px; padding: 8px 12px; border-top-left-radius: 10px; border-top-right-radius: 10px; }
        .card-sekolah-nama { color: #ffffff; }
        .card-sekolah-alamat { color: rgba(255, 255, 255, 0.88); }
        .card-sekolah-website { color: #fef08a; font-weight: 600; }
        .card-type-title { color: #7e22ce; }
        .card-name { color: #3b0764; }
        .card-nisn { color: #6b21a8; background: #faf5ff; border: 1px solid #e9d5ff; }
        .card-kelas { color: #854d0e; background: #fefce8; border: 1px solid #fef08a; }
        .card-details { color: #4c1d95; background: #faf5ff; border: 1px solid #f3e8ff; }
        .card-instruction { color: #6b21a8; border-top: 1px solid #f3e8ff; }
      `;
    } else if (themeOption === 'sunset_crimson') {
      cardThemeCss = `
        .card { background: #ffffff; color: #0f172a; border: 2px solid #be123c; }
        .card-header { background: linear-gradient(135deg, #881337, #be123c); color: #ffffff; margin: -12px -12px 10px -12px; padding: 8px 12px; border-top-left-radius: 10px; border-top-right-radius: 10px; }
        .card-sekolah-nama { color: #ffffff; }
        .card-sekolah-alamat { color: rgba(255, 255, 255, 0.88); }
        .card-sekolah-website { color: #fef08a; font-weight: 600; }
        .card-type-title { color: #be123c; }
        .card-name { color: #881337; }
        .card-nisn { color: #be123c; background: #fff1f2; border: 1px solid #fecdd3; }
        .card-kelas { color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; }
        .card-details { color: #881337; background: #fff1f2; border: 1px solid #ffe4e6; }
        .card-instruction { color: #9f1239; border-top: 1px solid #ffe4e6; }
      `;
    } else if (themeOption === 'midnight_gold') {
      cardThemeCss = `
        .card { background: #18181b; color: #ffffff; border: 2px solid #d97706; }
        .card-header { background: #09090b; border-bottom: 2px solid #d97706; color: #fbbf24; margin: -12px -12px 10px -12px; padding: 8px 12px; border-top-left-radius: 10px; border-top-right-radius: 10px; }
        .card-sekolah-nama { color: #fbbf24; }
        .card-sekolah-alamat { color: #d4d4d8; }
        .card-sekolah-website { color: #fef08a; }
        .card-type-title { color: #fbbf24; }
        .card-name { color: #ffffff; }
        .card-nisn { color: #fbbf24; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); }
        .card-kelas { color: #6ee7b7; background: rgba(16, 185, 129, 0.15); }
        .card-details { color: #e4e4e7; background: #27272a; border: 1px solid #3f3f46; }
        .card-instruction { color: #a1a1aa; border-top: 1px solid #27272a; }
      `;
    } else if (themeOption === 'modern_indigo') {
      cardThemeCss = `
        .card { background: #ffffff; color: #0f172a; border: 2px solid #4338ca; }
        .card-header { background: linear-gradient(135deg, #1e1b4b, #3730a3); color: #ffffff; margin: -12px -12px 10px -12px; padding: 8px 12px; border-top-left-radius: 10px; border-top-right-radius: 10px; }
        .card-sekolah-nama { color: #ffffff; }
        .card-sekolah-alamat { color: rgba(255, 255, 255, 0.88); }
        .card-sekolah-website { color: #a5f3fc; font-weight: 600; }
        .card-type-title { color: #4338ca; }
        .card-name { color: #1e1b4b; }
        .card-nisn { color: #4338ca; background: #e0e7ff; border: 1px solid #c7d2fe; }
        .card-kelas { color: #0284c7; background: #f0f9ff; border: 1px solid #bae6fd; }
        .card-details { color: #3730a3; background: #eef2ff; border: 1px solid #e0e7ff; }
        .card-instruction { color: #4338ca; border-top: 1px solid #e0e7ff; }
      `;
    } else {
      // Minimalist
      cardThemeCss = `
        .card { background: #ffffff; color: #0f172a; border: 1.5px solid #0f172a; }
        .card-header { border-bottom: 1px solid #0f172a; color: #0f172a; font-weight: 800; }
        .card-sekolah-nama { color: #0f172a; }
        .card-sekolah-alamat { color: #475569; }
        .card-sekolah-website { color: #2563eb; font-weight: 600; }
        .card-type-title { color: #475569; }
        .card-name { color: #0f172a; }
        .card-nisn { color: #0f172a; background: #f1f5f9; border: 1px solid #cbd5e1; }
        .card-kelas { color: #0f172a; background: #f8fafc; border: 1px solid #e2e8f0; }
        .card-details { color: #334155; background: #f8fafc; border: 1px solid #cbd5e1; }
        .card-instruction { color: #475569; border-top: 1px dashed #cbd5e1; }
      `;
    }

    function renderCardHtml(item: { siswa: Siswa; kelasNama: string; qrUrl: string }) {
      const { siswa: s, kelasNama, qrUrl } = item;

      const logoHtml = showLogo
        ? sekolahLogo
          ? `<img src="${sekolahLogo}" class="card-logo-img" alt="Logo" />`
          : `<span class="card-logo">🎓</span>`
        : '';

      const sekolahInfoHtml = showSekolah
        ? `<div class="card-sekolah-info">
             <div class="card-sekolah-nama">${sekolahNama}</div>
             ${sekolahAlamat ? `<div class="card-sekolah-alamat">${sekolahAlamat}</div>` : ''}
             ${sekolahWebsite ? `<div class="card-sekolah-website">${sekolahWebsite.replace(/^https?:\/\//, '')}</div>` : ''}
           </div>`
        : '';

      if (cardOrientation === 'portrait') {
        return `
          <div class="card card-portrait">
            <div class="card-header card-header-portrait">
              <div class="card-header-left">
                ${logoHtml}
                ${sekolahInfoHtml}
              </div>
            </div>
            <div class="card-body card-body-portrait">
              <div class="card-qr-box card-qr-box-portrait">
                <img src="${qrUrl}" class="card-qr-img card-qr-img-portrait" />
              </div>
              <div class="card-info card-info-portrait">
                <div class="card-type-title">KARTU PRESENSI</div>
                <div class="card-name">${s.nama}</div>
                <div class="card-meta card-meta-portrait">
                  <span class="card-nisn">NISN: ${s.nisn || '-'}</span>
                  <span class="card-kelas">${kelasNama}</span>
                </div>
                ${
                  showParent && s.namaOrangTua
                    ? `<div class="card-details card-details-portrait">
                        <div><strong>Ortu:</strong> ${s.namaOrangTua}</div>
                      </div>`
                    : ''
                }
              </div>
            </div>
            ${
              showInstruction && customInstruction
                ? `<div class="card-instruction">${customInstruction}</div>`
                : ''
            }
          </div>
        `;
      }

      return `
        <div class="card">
          <div class="card-header">
            <div class="card-header-left">
              ${logoHtml}
              ${sekolahInfoHtml}
            </div>
          </div>
          <div class="card-body">
            <div class="card-info">
              <div class="card-type-title">KARTU PRESENSI</div>
              <div class="card-name">${s.nama}</div>
              <div class="card-meta">
                <span class="card-nisn">NISN: ${s.nisn || '-'}</span>
                <span class="card-kelas">${kelasNama}</span>
              </div>
              ${
                showParent && s.namaOrangTua
                  ? `<div class="card-details">
                      <div><strong>Ortu:</strong> ${s.namaOrangTua}</div>
                    </div>`
                  : ''
              }
            </div>
            <div class="card-qr-box">
              <img src="${qrUrl}" class="card-qr-img" />
            </div>
          </div>
          ${
            showInstruction && customInstruction
              ? `<div class="card-instruction">${customInstruction}</div>`
              : ''
          }
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Kartu QR Presensi - ${sekolahNama}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 10mm;
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              background: #f8fafc;
              margin: 0;
              padding: 15px;
              color: #0f172a;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .grid-container {
              display: grid;
              align-items: start;
            }
            .class-group {
              margin-bottom: 24px;
            }
            .page-break-before {
              page-break-before: always;
              break-before: page;
            }
            .class-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              background: #0f172a;
              color: white;
              padding: 10px 16px;
              border-radius: 10px;
              margin-bottom: 14px;
            }
            .class-title {
              margin: 0;
              font-size: 14px;
              font-weight: 800;
              letter-spacing: 0.5px;
            }
            .class-sub {
              font-size: 11px;
              color: #94a3b8;
              margin-top: 2px;
            }
            .class-badge {
              background: #2563eb;
              color: white;
              font-size: 10px;
              font-weight: 700;
              padding: 3px 10px;
              border-radius: 20px;
              text-transform: uppercase;
            }
            .card {
              border-radius: 12px;
              padding: 12px;
              box-sizing: border-box;
              page-break-inside: avoid;
              break-inside: avoid;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
              overflow: hidden;
            }
            .card-header {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              margin-bottom: 8px;
            }
            .card-header-left {
              display: flex;
              align-items: center;
              gap: 8px;
              min-width: 0;
              text-align: left;
            }
            .card-logo-img {
              width: 26px;
              height: 26px;
              object-fit: contain;
              border-radius: 4px;
              flex-shrink: 0;
            }
            .card-logo {
              font-size: 18px;
              flex-shrink: 0;
              line-height: 1;
            }
            .card-sekolah-info {
              display: flex;
              flex-direction: column;
              min-width: 0;
              text-align: left;
            }
            .card-sekolah-nama {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              line-height: 1.2;
            }
            .card-sekolah-alamat {
              font-size: 7.5px;
              font-weight: 500;
              opacity: 0.85;
              text-transform: none;
              letter-spacing: 0;
              line-height: 1.15;
              margin-top: 1px;
            }
            .card-sekolah-website {
              font-size: 7px;
              font-weight: 600;
              opacity: 0.9;
              text-transform: lowercase;
              letter-spacing: 0;
              line-height: 1.15;
              margin-top: 0.5px;
            }
            .card-header-badge {
              font-family: monospace;
              font-size: 8px;
              font-weight: 800;
              opacity: 0.85;
              letter-spacing: 0.5px;
              white-space: nowrap;
              flex-shrink: 0;
            }
            .card-body {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              margin-bottom: 6px;
            }
            .card-info {
              flex: 1;
              min-width: 0;
            }
            .card-type-title {
              font-family: monospace;
              font-size: 8px;
              font-weight: 800;
              letter-spacing: 0.8px;
              text-transform: uppercase;
              margin-bottom: 3px;
              line-height: 1.1;
            }
            .card-name {
              font-size: 13px;
              font-weight: 800;
              line-height: 1.25;
              margin-bottom: 6px;
              word-break: break-word;
            }
            .card-meta {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              gap: 4px;
              margin-bottom: 6px;
            }
            .card-nisn, .card-kelas {
              font-size: 9px;
              font-weight: 800;
              font-family: monospace;
              padding: 2px 6px;
              border-radius: 6px;
            }
            .card-details {
              font-size: 9px;
              padding: 4px 6px;
              border-radius: 6px;
              margin-top: 4px;
            }
            .card-qr-box {
              background: #ffffff;
              padding: 4px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              shrink: 0;
            }
            .card-qr-img {
              width: 100px;
              height: 100px;
              display: block;
            }
            .card-instruction {
              font-size: 8px;
              padding-top: 6px;
              margin-top: 4px;
              line-height: 1.2;
              text-align: center;
              font-weight: 600;
            }
            /* Portrait Mode Specific Overrides */
            .card-portrait {
              text-align: center;
              align-items: center;
            }
            .card-header-portrait {
              justify-content: center;
              text-align: center;
              width: 100%;
            }
            .card-body-portrait {
              flex-direction: column;
              align-items: center;
              text-align: center;
              justify-content: center;
              gap: 8px;
              width: 100%;
            }
            .card-info-portrait {
              text-align: center;
              width: 100%;
            }
            .card-meta-portrait {
              justify-content: center;
            }
            .card-qr-box-portrait {
              margin: 4px auto;
            }
            .card-qr-img-portrait {
              width: 110px;
              height: 110px;
            }
            ${cardThemeCss}

            @media print {
              body {
                background: none;
                padding: 0;
              }
              .class-header {
                border: 1px solid #000;
              }
            }
          </style>
        </head>
        <body>
          ${contentHtml}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider border border-purple-500/30">
              <QrCode className="w-3.5 h-3.5" />
              <span>Pusat Distribusi Kartu QR Presensi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Cetak Kartu QR Siswa
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Pilih kelas, atur tata letak kertas A4, pilih tema kartu, dan cetak kartu QR presensi secara otomatis dipisah per kelas untuk mempermudah distribusi ke Wali Kelas.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Excel Payload</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={selectedSiswaList.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold transition shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4.5 h-4.5" />
              <span>Cetak Kartu ({selectedSiswaList.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Siswa Terpilih</div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {selectedSiswaList.length} <span className="text-xs text-slate-400 font-normal">/ {filteredSiswa.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Kelas</div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {
                new Set(selectedSiswaList.map((s) => s.kelasId)).size
              } <span className="text-xs text-slate-400 font-normal">Kelas</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Estimasi Kertas A4</div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              ~{estimatedPages} <span className="text-xs text-slate-400 font-normal">Lembar</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Layout Kartu</div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">
              {gridOption} <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">({cardsPerPage}/A4)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Filters & Print Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Filter & Selection */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
                <Filter className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>1. Filter & Filter Siswa</span>
              </div>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1 cursor-pointer"
              >
                {selectedSiswaIds.size === filteredSiswa.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Batalkan Semua</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Pilih Semua ({filteredSiswa.length})</span>
                  </>
                )}
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Filter Kelas
                </label>
                <select
                  value={selectedKelasId}
                  onChange={(e) => setSelectedKelasId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Semua Kelas ({appData.siswa.length} Siswa)</option>
                  {sortedKelas.map((k) => {
                    const count = appData.siswa.filter((s) => s.kelasId === k.id).length;
                    return (
                      <option key={k.id} value={k.id}>
                        {k.nama} ({count} siswa)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Filter Jurusan
                </label>
                <select
                  value={selectedJurusanId}
                  onChange={(e) => setSelectedJurusanId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Semua Jurusan</option>
                  {appData.jurusan.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nama} ({j.kode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Status Siswa
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'active' | 'inactive')}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="active">Siswa Aktif</option>
                  <option value="all">Semua Status (Aktif & Nonaktif)</option>
                  <option value="inactive">Siswa Nonaktif</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Urutan Cetak
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="kelas_asc">Diurutkan Per Kelas & Nama</option>
                  <option value="nama_asc">Abjad Nama Siswa (A-Z)</option>
                  <option value="nisn_asc">Urut Nomor NISN</option>
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa atau NISN..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Student Checkbox List Box */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/50 max-h-56 overflow-y-auto space-y-1">
              {filteredSiswa.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-medium">
                  Tidak ada siswa ditemukan dengan filter ini.
                </div>
              ) : (
                filteredSiswa.map((s) => {
                  const isChecked = selectedSiswaIds.has(s.id);
                  const k = appData.kelas.find((item) => item.id === s.kelasId);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs transition cursor-pointer ${
                        isChecked
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-semibold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSiswa(s.id)}
                          className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                        />
                        <span className="truncate">{s.nama}</span>
                        <span className="text-[10px] font-mono text-slate-400">({s.nisn || 'No NISN'})</span>
                      </div>

                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md shrink-0">
                        {k?.nama || '-'}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 2: Layout & Distribution Settings */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>2. Pengaturan Kertas & Distribusi</span>
            </div>

            {/* Grid options */}
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold uppercase text-slate-500">
                Format Cetak pada Kertas A4
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: '2x4', label: '2x4 (8 Kartu)', desc: 'Ukuran ID Card Standar' },
                  { id: '3x3', label: '3x3 (9 Kartu)', desc: 'Ukuran Sedang Hemat' },
                  { id: '2x2', label: '2x2 (4 Kartu)', desc: 'Ukuran Besar / Display' },
                  { id: '3x4', label: '3x4 (12 Kartu)', desc: 'Ukuran Pocket Kompak' },
                  { id: '1x1', label: '1 per Halaman', desc: 'Satu Kartu Jumbo' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGridOption(item.id as GridOption)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      gridOption === item.id
                        ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation options */}
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold uppercase text-slate-500">
                Model Orientasi Kartu
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCardOrientation('landscape')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                    cardOrientation === 'landscape'
                      ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="w-6 h-4 border-2 border-current rounded-xs flex items-center justify-end p-0.5 shrink-0">
                    <div className="w-1.5 h-1.5 bg-current rounded-xs" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Landscape</div>
                    <div className="text-[10px] text-slate-400">Mendatar</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCardOrientation('portrait')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                    cardOrientation === 'portrait'
                      ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="w-4 h-6 border-2 border-current rounded-xs flex flex-col items-center justify-center p-0.5 shrink-0">
                    <div className="w-1.5 h-1.5 bg-current rounded-xs" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Portrait</div>
                    <div className="text-[10px] text-slate-400">Berdiri / Tegak</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Theme options */}
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold uppercase text-slate-500">
                Tema & Gaya Tampilan Kartu
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'dark', label: 'Modern Dark Slate', color: 'bg-slate-900 text-white' },
                  { id: 'light_blue', label: 'Clean Light Blue', color: 'bg-blue-600 text-white' },
                  { id: 'emerald_official', label: 'Official Emerald', color: 'bg-emerald-700 text-white' },
                  { id: 'royal_purple', label: 'Royal Amethyst', color: 'bg-purple-700 text-white' },
                  { id: 'sunset_crimson', label: 'Sunset Crimson', color: 'bg-rose-700 text-white' },
                  { id: 'midnight_gold', label: 'Midnight Luxe Gold', color: 'bg-amber-500 text-slate-950 font-bold' },
                  { id: 'modern_indigo', label: 'Modern Indigo Navy', color: 'bg-indigo-800 text-white' },
                  { id: 'minimalist', label: 'Minimalist Line Art', color: 'bg-white text-slate-900 border border-slate-300' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setThemeOption(item.id as ThemeOption)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      themeOption === item.id
                        ? 'border-purple-600 ring-2 ring-purple-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                    <span className={`w-4 h-4 rounded-full ${item.color} shrink-0`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Distribution Helper Toggle */}
            <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200/60 dark:border-purple-800/50 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pageBreakByClass}
                  onChange={(e) => setPageBreakByClass(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-500 mt-0.5"
                />
                <div>
                  <span className="text-xs font-extrabold text-purple-900 dark:text-purple-200">
                    Pisahkan per Kelas (Page Break Per Kelas)
                  </span>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300 leading-snug">
                    Sangat direkomendasikan! Hasil cetak akan dikelompokkan dengan Header Kelas terpisah, memudahkan petugas / staf membagi lembaran kartu ke masing-masing Wali Kelas.
                  </p>
                </div>
              </label>
            </div>

            {/* Toggles for Card Elements */}
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold uppercase text-slate-500">
                Elemen pada Kartu
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Logo Sekolah</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showSekolah}
                    onChange={(e) => setShowSekolah(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Nama & Alamat Sekolah</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showParent}
                    onChange={(e) => setShowParent(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Nama Orang Tua</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showInstruction}
                    onChange={(e) => setShowInstruction(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Petunjuk Kartu</span>
                </label>
              </div>
            </div>

            {/* Custom Instruction Input */}
            {showInstruction && (
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Teks Petunjuk / Pesan Bawah Kartu
                </label>
                <input
                  type="text"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Interactive Card Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
                <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Pratinjau Kartu Siswa</span>
              </div>
              <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-full">
                Live Sample
              </span>
            </div>

            {selectedSiswaList.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-8 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 dark:border-slate-700">
                <QrCode className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">Pilih minimal 1 siswa di sebelah kiri untuk melihat pratinjau kartu.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visual Card Component */}
                <div
                  className={`rounded-2xl p-4 shadow-xl border transition-all ${
                    cardOrientation === 'portrait' ? 'max-w-xs mx-auto text-center' : ''
                  } ${
                    themeOption === 'dark'
                      ? 'bg-slate-900 text-white border-slate-700'
                      : themeOption === 'light_blue'
                      ? 'bg-white text-slate-900 border-blue-200'
                      : themeOption === 'emerald_official'
                      ? 'bg-white text-slate-900 border-emerald-300'
                      : themeOption === 'royal_purple'
                      ? 'bg-white text-slate-900 border-purple-300'
                      : themeOption === 'sunset_crimson'
                      ? 'bg-white text-slate-900 border-rose-300'
                      : themeOption === 'midnight_gold'
                      ? 'bg-zinc-900 text-white border-amber-600'
                      : themeOption === 'modern_indigo'
                      ? 'bg-white text-slate-900 border-indigo-300'
                      : 'bg-white text-slate-900 border-slate-900'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className={`text-[10px] font-black uppercase tracking-wider mb-3 pb-2 border-b flex items-center justify-between gap-2 ${
                      themeOption === 'light_blue'
                        ? 'bg-blue-600 text-white -mx-4 -mt-4 p-3 rounded-t-2xl border-none'
                        : themeOption === 'emerald_official'
                        ? 'bg-emerald-700 text-white -mx-4 -mt-4 p-3 rounded-t-2xl border-none'
                        : themeOption === 'royal_purple'
                        ? 'bg-gradient-to-r from-purple-900 to-purple-600 text-white -mx-4 -mt-4 p-3 rounded-t-2xl border-none'
                        : themeOption === 'sunset_crimson'
                        ? 'bg-gradient-to-r from-rose-950 to-rose-700 text-white -mx-4 -mt-4 p-3 rounded-t-2xl border-none'
                        : themeOption === 'midnight_gold'
                        ? 'bg-zinc-950 text-amber-400 border-b-2 border-amber-500 -mx-4 -mt-4 p-3 rounded-t-2xl'
                        : themeOption === 'modern_indigo'
                        ? 'bg-gradient-to-r from-indigo-950 to-indigo-700 text-white -mx-4 -mt-4 p-3 rounded-t-2xl border-none'
                        : 'border-white/10 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 text-left">
                      {showLogo && (
                        sekolahLogo ? (
                          <img
                            src={sekolahLogo}
                            alt="Logo Sekolah"
                            className="w-6 h-6 object-contain rounded-full bg-white/20 p-0.5 shrink-0"
                          />
                        ) : (
                          <span className="text-base shrink-0 leading-none">🎓</span>
                        )
                      )}
                      {showSekolah && (
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-wider leading-tight truncate">
                            {sekolahNama}
                          </div>
                          {sekolahAlamat && (
                            <div className="text-[8px] font-normal opacity-85 leading-tight truncate normal-case tracking-normal">
                              {sekolahAlamat}
                            </div>
                          )}
                          {sekolahWebsite && (
                            <div className="text-[7.5px] font-semibold opacity-90 leading-tight truncate lowercase tracking-normal text-blue-200">
                              {sekolahWebsite.replace(/^https?:\/\//, '')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  {cardOrientation === 'portrait' ? (
                    <div className="flex flex-col items-center justify-center gap-3 my-2 text-center">
                      {/* QR Code */}
                      <div className="bg-white p-2 rounded-xl border border-slate-200 shrink-0 shadow-sm">
                        {previewQrUrl ? (
                          <img src={previewQrUrl} alt="QR Sample" className="w-28 h-28 object-contain" />
                        ) : (
                          <div className="w-28 h-28 bg-slate-100 rounded-lg animate-pulse" />
                        )}
                      </div>

                      <div className="space-y-1.5 w-full">
                        <div className={`font-mono text-[9px] font-extrabold uppercase tracking-widest ${
                          themeOption === 'royal_purple'
                            ? 'text-purple-700 dark:text-purple-300'
                            : themeOption === 'sunset_crimson'
                            ? 'text-rose-700 dark:text-rose-300'
                            : themeOption === 'midnight_gold'
                            ? 'text-amber-400'
                            : themeOption === 'modern_indigo'
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : themeOption === 'emerald_official'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-sky-600 dark:text-sky-400'
                        }`}>
                          KARTU PRESENSI
                        </div>
                        <div className="text-base font-black leading-tight">
                          {selectedSiswaList[0].nama}
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono">
                          <span className="bg-sky-500/20 text-sky-600 dark:text-sky-300 px-2 py-0.5 rounded font-bold">
                            NISN: {selectedSiswaList[0].nisn || '-'}
                          </span>
                          <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                            {appData.kelas.find((k) => k.id === selectedSiswaList[0].kelasId)?.nama || '-'}
                          </span>
                        </div>

                        {showParent && selectedSiswaList[0].namaOrangTua && (
                          <div className="text-[10px] text-slate-400 pt-1">
                            Ortu: <span className="font-semibold">{selectedSiswaList[0].namaOrangTua}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 my-2">
                      <div className="space-y-1.5 flex-1 min-w-0 text-left">
                        <div className={`font-mono text-[9px] font-extrabold uppercase tracking-widest ${
                          themeOption === 'royal_purple'
                            ? 'text-purple-700 dark:text-purple-300'
                            : themeOption === 'sunset_crimson'
                            ? 'text-rose-700 dark:text-rose-300'
                            : themeOption === 'midnight_gold'
                            ? 'text-amber-400'
                            : themeOption === 'modern_indigo'
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : themeOption === 'emerald_official'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-sky-600 dark:text-sky-400'
                        }`}>
                          KARTU PRESENSI
                        </div>
                        <div className="text-sm font-black truncate leading-tight">
                          {selectedSiswaList[0].nama}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                          <span className="bg-sky-500/20 text-sky-600 dark:text-sky-300 px-2 py-0.5 rounded font-bold">
                            NISN: {selectedSiswaList[0].nisn || '-'}
                          </span>
                          <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                            {appData.kelas.find((k) => k.id === selectedSiswaList[0].kelasId)?.nama || '-'}
                          </span>
                        </div>

                        {showParent && selectedSiswaList[0].namaOrangTua && (
                          <div className="text-[10px] text-slate-400 pt-1">
                            Ortu: <span className="font-semibold">{selectedSiswaList[0].namaOrangTua}</span>
                          </div>
                        )}
                      </div>

                      {/* QR Code */}
                      <div className="bg-white p-2 rounded-xl border border-slate-200 shrink-0">
                        {previewQrUrl ? (
                          <img src={previewQrUrl} alt="QR Sample" className="w-24 h-24 object-contain" />
                        ) : (
                          <div className="w-24 h-24 bg-slate-100 rounded-lg animate-pulse" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Card Instruction */}
                  {showInstruction && customInstruction && (
                    <div className="text-[9px] text-center pt-2 mt-2 border-t border-slate-200/20 text-slate-400 italic">
                      {customInstruction}
                    </div>
                  )}
                </div>

                {/* Print Info Note */}
                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/60 dark:border-indigo-800/50 text-xs space-y-1 text-indigo-900 dark:text-indigo-200">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Petunjuk Pencetakan:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 text-indigo-800 dark:text-indigo-300 pl-1">
                    <li>Gunakan Kertas HVS/Carton 160-230 gsm agar kartu tebal.</li>
                    <li>Pilih opsi "Background Graphics" di dialog print browser.</li>
                    <li>
                      Gunakan penggaris / pemotong pemotong kertas ID Card untuk memotong dengan rapi.
                    </li>
                  </ul>
                </div>

                {/* Big Print Button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-extrabold text-xs transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Sekarang ({selectedSiswaList.length} Siswa)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
