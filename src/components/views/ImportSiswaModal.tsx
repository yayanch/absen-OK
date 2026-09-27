import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Search,
  Users,
  Check,
  HelpCircle,
  RefreshCw,
  Sliders,
  ChevronRight,
  Info,
  Building,
  Phone,
  UserCheck
} from 'lucide-react';
import { AppData, Siswa, Kelas } from '../../types';
import { sortKelasList } from '../../data/initialData';

interface ImportSiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  defaultKelasId?: string;
  onImportSuccess: (importedCount: number, updatedCount: number, newSiswaList: Siswa[], newKelasList?: Kelas[]) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export interface ParsedSiswaRow {
  index: number;
  nisn: string;
  nama: string;
  gender: 'L' | 'P';
  rawKelas: string;
  matchedKelas: Kelas | null;
  targetKelasId: string;
  targetKelasNama: string;
  namaOrangTua: string;
  noWaOrangTua: string;
  noWa: string;
  alamat: string;
  tempatLahir: string;
  tanggalLahir: string;
  username?: string;
  password?: string;
  isExistingNisn: boolean;
  existingSiswa?: Siswa;
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];
}

export const ImportSiswaModal: React.FC<ImportSiswaModalProps> = ({
  isOpen,
  onClose,
  appData,
  defaultKelasId,
  onImportSuccess,
  onShowToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  
  const [duplicateMode, setDuplicateMode] = useState<'replace' | 'upsert' | 'skip' | 'add_all'>('upsert');
  const [autoCreateMissingKelas, setAutoCreateMissingKelas] = useState<boolean>(true);
  const [fallbackKelasId, setFallbackKelasId] = useState<string>(
    defaultKelasId || (appData.kelas.length > 0 ? appData.kelas[0].id : '')
  );
  
  const [parsedRows, setParsedRows] = useState<ParsedSiswaRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'warning' | 'error'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to normalize class names for flexible matching
  const cleanClassName = (s: string): string => {
    return s
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .replace(/^10/, 'X')
      .replace(/^11/, 'XI')
      .replace(/^12/, 'XII');
  };

  // Helper to clean key names from headers
  const normalizeKey = (key: string): string => {
    return key
      .toLowerCase()
      .replace(/[\s_\-\.\/\(\)]/g, '');
  };

  const processWorkbookSheet = (wb: XLSX.WorkBook, sheetName: string, selectedFallbackKelasId: string) => {
    try {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) return;

      // 1. Read sheet into raw 2D array of rows to reliably detect header row
      const raw2D: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!raw2D || raw2D.length === 0) {
        setParsedRows([]);
        onShowToast('Lembar kerja (Sheet) ini kosong atau tidak memiliki data!', 'warning');
        return;
      }

      // Find the header row (looking in top 10 rows for keywords)
      let headerRowIndex = 0;
      let foundHeader = false;

      for (let r = 0; r < Math.min(raw2D.length, 10); r++) {
        const rowCells = (raw2D[r] || []).map((c) => String(c || '').trim().toLowerCase());
        const hasNama = rowCells.some((c) => c.includes('nama') || c.includes('name') || c.includes('siswa') || c.includes('peserta didik'));
        const hasNisn = rowCells.some((c) => c.includes('nisn') || c.includes('nis') || c.includes('induk'));
        const hasKelas = rowCells.some((c) => c.includes('kelas') || c.includes('rombel') || c.includes('tingkat'));
        const hasJk = rowCells.some((c) => c === 'jk' || c.includes('kelamin') || c.includes('gender') || c === 'l/p');

        if ((hasNama && (hasNisn || hasKelas || hasJk)) || (hasNisn && hasKelas)) {
          headerRowIndex = r;
          foundHeader = true;
          break;
        }
      }

      // Read JSON with range starting from headerRowIndex
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, {
        range: headerRowIndex,
        defval: '',
        raw: false,
      });

      if (!rawRows || rawRows.length === 0) {
        setParsedRows([]);
        onShowToast('Tidak ada baris data yang ditemukan di bawah header sheet!', 'warning');
        return;
      }

      const existingNisnMap = new Map<string, Siswa>();
      appData.siswa.forEach((s) => {
        if (s.nisn && s.nisn !== '-' && s.nisn !== '') {
          existingNisnMap.set(s.nisn.trim().toLowerCase(), s);
        }
      });

      const fallbackKelasObj = appData.kelas.find((k) => k.id === selectedFallbackKelasId);

      const parsed: ParsedSiswaRow[] = [];

      rawRows.forEach((r, idx) => {
        // Build normalized lookup map for row keys
        const rowMap: Record<string, string> = {};
        Object.keys(r).forEach((k) => {
          rowMap[normalizeKey(k)] = String(r[k] !== undefined && r[k] !== null ? r[k] : '').trim();
        });

        // Helper to find value from possible key aliases
        const findVal = (...aliases: string[]): string => {
          for (const a of aliases) {
            const norm = normalizeKey(a);
            if (rowMap[norm] !== undefined && rowMap[norm] !== '') {
              return rowMap[norm];
            }
          }
          // Substring lookup
          for (const a of aliases) {
            const norm = normalizeKey(a);
            const foundKey = Object.keys(rowMap).find((k) => k.includes(norm) || norm.includes(k));
            if (foundKey && rowMap[foundKey]) {
              return rowMap[foundKey];
            }
          }
          return '';
        };

        const nama = findVal('nama lengkap', 'namasiswa', 'namapesertadidik', 'namalengkap', 'nama', 'name', 'studentname');
        
        // Skip empty row or row containing sample marker
        if (!nama) return;
        const lowerNama = nama.toLowerCase();
        if (lowerNama.includes('[contoh') || lowerNama.includes('(contoh') || lowerNama === 'nama' || lowerNama === 'nama siswa') {
          return; // Ignore sample / repeated header row
        }

        const nisn = findVal('nisn', 'nomorinduksiswanasional', 'noinduk', 'nomorinduk', 'nis', 'no.induk', 'id', 'nik');
        
        const rawGender = findVal('jeniskelamin', 'gender', 'jk', 'lp', 'sex', 'l/p').toUpperCase();
        const gender: 'L' | 'P' = rawGender.startsWith('P') || rawGender === 'PEREMPUAN' || rawGender === 'FEMALE' || rawGender === 'WANITA' ? 'P' : 'L';

        const rawKelas = findVal('kelas', 'rombel', 'rombonganbelajar', 'namakelas', 'tingkat', 'jurusan');
        const namaOrangTua = findVal('namaorangtua', 'namaortu', 'namawali', 'orangtua', 'wali', 'ayah', 'ibu', 'namaayah', 'namaibu');
        const noWaOrangTua = findVal('nowaorangtua', 'nowaortu', 'waortu', 'hportu', 'nohporangtua', 'nohportu', 'telportu', 'notelportu');
        const noWa = findVal('nowasiswa', 'nowa', 'whatsapp', 'nohp', 'telepon', 'notelp', 'handphone', 'hp', 'telp', 'wa');
        const alamat = findVal('alamat', 'domisili', 'alamatdomisili', 'alamatrumah', 'tempattinggal', 'alamatlengkap');
        const tempatLahir = findVal('tempatlahir', 'kotalahir', 'tempat');
        const tanggalLahir = findVal('tanggallahir', 'tgllahir', 'tgl', 'tanggallahirsiswa', 'ttl');
        const username = findVal('username', 'user', 'nisn', 'akun');
        const password = findVal('password', 'pass', 'katasandi');

        const validationErrors: string[] = [];
        const validationWarnings: string[] = [];

        // Match class
        let matchedKelas: Kelas | null = null;
        if (rawKelas) {
          // 1. Exact case-insensitive match
          matchedKelas = appData.kelas.find((k) => k.nama.toLowerCase() === rawKelas.toLowerCase()) || null;
          
          // 2. Normalized match
          if (!matchedKelas) {
            const rawNorm = cleanClassName(rawKelas);
            matchedKelas = appData.kelas.find((k) => cleanClassName(k.nama) === rawNorm) || null;
          }
        }

        let targetKelasId = '';
        let targetKelasNama = '';

        if (matchedKelas) {
          targetKelasId = matchedKelas.id;
          targetKelasNama = matchedKelas.nama;
        } else if (rawKelas && autoCreateMissingKelas) {
          // Auto-create prospective class name
          targetKelasId = `NEW_KEL_${cleanClassName(rawKelas)}`;
          targetKelasNama = rawKelas.toUpperCase();
          validationWarnings.push(`Kelas "${rawKelas}" akan otomatis didaftarkan ke Master Kelas`);
        } else if (fallbackKelasObj) {
          targetKelasId = fallbackKelasObj.id;
          targetKelasNama = fallbackKelasObj.nama;
          if (rawKelas) {
            validationWarnings.push(`Kelas "${rawKelas}" dialihkan ke "${fallbackKelasObj.nama}"`);
          } else {
            validationWarnings.push(`Kelas dialihkan ke default: "${fallbackKelasObj.nama}"`);
          }
        } else if (appData.kelas.length > 0) {
          targetKelasId = appData.kelas[0].id;
          targetKelasNama = appData.kelas[0].nama;
          validationWarnings.push(`Dialihkan ke kelas: "${appData.kelas[0].nama}"`);
        } else {
          targetKelasId = 'AUTO_KEL_1';
          targetKelasNama = rawKelas || 'X RPL 1';
          validationWarnings.push(`Kelas "${targetKelasNama}" akan otomatis dibuat di sistem`);
        }

        const existingSiswa = nisn && nisn !== '-' ? existingNisnMap.get(nisn.toLowerCase()) : undefined;
        const isExistingNisn = !!existingSiswa;

        if (isExistingNisn && duplicateMode !== 'replace') {
          validationWarnings.push(`NISN ${nisn} sudah terdaftar atas nama "${existingSiswa?.nama}"`);
        }

        const isValid = validationErrors.length === 0;

        parsed.push({
          index: parsed.length + 1,
          nisn: nisn || '-',
          nama,
          gender,
          rawKelas: rawKelas || targetKelasNama,
          matchedKelas,
          targetKelasId,
          targetKelasNama,
          namaOrangTua: namaOrangTua || (nama ? `Bpk. ${nama.split(' ')[1] || nama.split(' ')[0]} / Ibu` : 'Bapak / Ibu'),
          noWaOrangTua: noWaOrangTua || '',
          noWa: noWa || '',
          alamat,
          tempatLahir,
          tanggalLahir,
          username: username || nisn || '',
          password: password || nisn || '123456',
          isExistingNisn,
          existingSiswa,
          isValid,
          validationErrors,
          validationWarnings,
        });
      });

      setParsedRows(parsed);
      setCurrentPage(1);
    } catch (err) {
      console.error('Sheet parse error:', err);
      onShowToast('Gagal membaca data dari lembar kerja!', 'error');
    }
  };

  const handleFileChange = (selectedFile: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));
    
    if (!hasValidExt) {
      onShowToast('Format file tidak didukung! Harap unggah file .xlsx, .xls, atau .csv', 'error');
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setFileSize((selectedFile.size / 1024).toFixed(1) + ' KB');
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        const firstSheet = wb.SheetNames[0] || '';
        setSelectedSheet(firstSheet);

        processWorkbookSheet(wb, firstSheet, fallbackKelasId);
        onShowToast(`File "${selectedFile.name}" berhasil dibaca!`, 'success');
      } catch (err) {
        console.error('File load error:', err);
        onShowToast('Terjadi kesalahan saat memproses file Excel/CSV!', 'error');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleSheetChange = (newSheet: string) => {
    setSelectedSheet(newSheet);
    if (workbook) {
      processWorkbookSheet(workbook, newSheet, fallbackKelasId);
    }
  };

  const handleFallbackKelasChange = (newKelasId: string) => {
    setFallbackKelasId(newKelasId);
    if (workbook && selectedSheet) {
      processWorkbookSheet(workbook, selectedSheet, newKelasId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleResetFile = () => {
    setFile(null);
    setFileName('');
    setFileSize('');
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setParsedRows([]);
    setCurrentPage(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Template Download Handlers (Clean ready-to-fill vs Demo)
  const handleDownloadExcelTemplate = (isDemo = false) => {
    let templateData: any[] = [];
    const sampleClass = appData.kelas.length > 0 ? appData.kelas[0].nama : 'X RPL 1';

    if (!isDemo) {
      // 1 single guide row clearly labeled, so it is never confused with real data
      templateData = [
        {
          NISN: '0061234567',
          NAMA: 'Ahmad Rizky Pratama',
          JK: 'L',
          KELAS: sampleClass,
          'NAMA ORANG TUA': 'Bpk. Pratama / Ibu',
          'NO WA ORANG TUA': '081234567890',
          'NO WA SISWA': '081234567891',
          ALAMAT: 'Jl. Merdeka No. 10',
          'TEMPAT LAHIR': 'Bandung',
          'TANGGAL LAHIR': '2008-05-15',
        },
      ];
    } else {
      // Demo dataset
      const maleNames = ['Ahmad Rizky Pratama', 'Bagus Setiawan', 'Candra Wijaya', 'Dian Naufal', 'Eka Nugraha', 'Fadhil Rahman'];
      const femaleNames = ['Anisa Putri Rahayu', 'Bunga Lestari', 'Citra Kirana', 'Dewi Sartika', 'Erlina Aprilia', 'Fitriani Nur'];
      const sampleClasses = appData.kelas.length > 0 ? appData.kelas.slice(0, 3) : [{ id: 'k1', nama: 'X RPL 1' }, { id: 'k2', nama: 'X TKJ 1' }];

      sampleClasses.forEach((k, kIdx) => {
        for (let i = 1; i <= 4; i++) {
          const isMale = i % 2 !== 0;
          const nameList = isMale ? maleNames : femaleNames;
          const studentName = nameList[(kIdx * 2 + i) % nameList.length];
          const nisn = `006${String(kIdx + 1).padStart(2, '0')}00${String(i).padStart(2, '0')}`;

          templateData.push({
            NISN: nisn,
            NAMA: studentName,
            JK: isMale ? 'L' : 'P',
            KELAS: k.nama,
            'NAMA ORANG TUA': `Bpk. ${studentName.split(' ')[1] || 'Santoso'} / Ibu`,
            'NO WA ORANG TUA': '0812' + Math.floor(10000000 + Math.random() * 90000000),
            'NO WA SISWA': '0813' + Math.floor(10000000 + Math.random() * 90000000),
            ALAMAT: 'Jl. Pendidikan No. ' + (i * 10),
            'TEMPAT LAHIR': 'Bandung',
            'TANGGAL LAHIR': '2008-05-' + String(10 + i).padStart(2, '0'),
          });
        }
      });
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 18 }, // NISN
      { wch: 28 }, // NAMA
      { wch: 8 },  // JK
      { wch: 20 }, // KELAS
      { wch: 26 }, // NAMA ORANG TUA
      { wch: 18 }, // NO WA ORANG TUA
      { wch: 18 }, // NO WA SISWA
      { wch: 25 }, // ALAMAT
      { wch: 18 }, // TEMPAT LAHIR
      { wch: 16 }, // TANGGAL LAHIR
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isDemo ? 'Demo Siswa' : 'Template Siswa');
    const fileName = isDemo ? 'Template_Demo_Siswa_Lengkap.xlsx' : 'Template_Import_Siswa_Siap_Diisi.xlsx';
    XLSX.writeFile(wb, fileName);
    onShowToast(`Template Excel ${isDemo ? 'Demo' : 'Siap Diisi'} berhasil diunduh!`, 'success');
  };

  const handleDownloadCsvTemplate = () => {
    const headers = ['NISN', 'NAMA', 'JK', 'KELAS', 'NAMA ORANG TUA', 'NO WA ORANG TUA', 'NO WA SISWA', 'ALAMAT', 'TEMPAT LAHIR', 'TANGGAL LAHIR'];
    const sampleClass = appData.kelas.length > 0 ? appData.kelas[0].nama : 'X RPL 1';
    
    const rows = [
      headers.join(','),
      `"0061234567","Ahmad Rizky Pratama","L","${sampleClass}","Bpk. Pratama / Ibu","081234567890","081234567891","Jl. Merdeka No. 10","Bandung","2008-05-15"`,
    ];

    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Template_Import_Siswa_Siap_Diisi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('Template CSV Siswa Siap Diisi berhasil diunduh!', 'success');
  };

  // Filtered rows for preview
  const filteredRows = useMemo(() => {
    return parsedRows.filter((r) => {
      if (statusFilter === 'valid' && !r.isValid) return false;
      if (statusFilter === 'warning' && (r.validationWarnings.length === 0 || !r.isValid)) return false;
      if (statusFilter === 'error' && r.isValid) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          r.nama.toLowerCase().includes(q) ||
          r.nisn.toLowerCase().includes(q) ||
          r.targetKelasNama.toLowerCase().includes(q) ||
          r.rawKelas.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [parsedRows, statusFilter, searchTerm]);

  const totalValid = parsedRows.filter((r) => r.isValid).length;
  const totalWarning = parsedRows.filter((r) => r.isValid && r.validationWarnings.length > 0).length;
  const totalError = parsedRows.filter((r) => !r.isValid).length;
  const totalExisting = parsedRows.filter((r) => r.isExistingNisn).length;

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Execute Import
  const handleExecuteImport = () => {
    if (totalValid === 0) {
      onShowToast('Tidak ada baris data valid yang siap diimpor!', 'error');
      return;
    }

    let addedCount = 0;
    let updatedCount = 0;
    
    // Manage class auto-creation
    const newKelasList: Kelas[] = [...appData.kelas];
    const kelasNameToIdMap = new Map<string, string>();
    newKelasList.forEach((k) => {
      kelasNameToIdMap.set(k.nama.trim().toLowerCase(), k.id);
      kelasNameToIdMap.set(cleanClassName(k.nama), k.id);
    });

    const resolveKelasId = (targetName: string, rawFallbackId: string): string => {
      if (!targetName) return rawFallbackId || (newKelasList[0]?.id || '');
      const trimmed = targetName.trim();
      const norm = cleanClassName(trimmed);

      if (kelasNameToIdMap.has(trimmed.toLowerCase())) {
        return kelasNameToIdMap.get(trimmed.toLowerCase())!;
      }
      if (kelasNameToIdMap.has(norm)) {
        return kelasNameToIdMap.get(norm)!;
      }

      if (autoCreateMissingKelas) {
        const newKid = `KEL_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const defaultJurusanId = appData.jurusan[0]?.id || '';
        const defaultWaliId = appData.waliKelas[0]?.id || '';
        const createdKelas: Kelas = {
          id: newKid,
          nama: trimmed.toUpperCase(),
          jurusanId: defaultJurusanId,
          waliKelasId: defaultWaliId,
        };
        newKelasList.push(createdKelas);
        kelasNameToIdMap.set(trimmed.toLowerCase(), newKid);
        kelasNameToIdMap.set(norm, newKid);
        return newKid;
      }

      return rawFallbackId || (newKelasList[0]?.id || '');
    };

    let currentSiswaList: Siswa[] = [];
    const siswaByNisnMap = new Map<string, number>();

    if (duplicateMode === 'replace') {
      // 100% replace mode: discard old demo/sample data
      currentSiswaList = [];
    } else {
      currentSiswaList = [...appData.siswa];
      currentSiswaList.forEach((s, idx) => {
        if (s.nisn && s.nisn !== '-' && s.nisn !== '') {
          siswaByNisnMap.set(s.nisn.trim().toLowerCase(), idx);
        }
      });
    }

    parsedRows.forEach((row) => {
      if (!row.isValid) return;

      const finalKelasId = resolveKelasId(row.targetKelasNama || row.rawKelas, row.targetKelasId);
      const nisnKey = row.nisn && row.nisn !== '-' ? row.nisn.trim().toLowerCase() : '';
      const existingIdx = nisnKey && duplicateMode !== 'replace' ? siswaByNisnMap.get(nisnKey) : undefined;

      if (existingIdx !== undefined && duplicateMode === 'upsert') {
        // Update existing record
        const old = currentSiswaList[existingIdx];
        currentSiswaList[existingIdx] = {
          ...old,
          nama: row.nama,
          gender: row.gender,
          kelasId: finalKelasId,
          namaOrangTua: row.namaOrangTua || old.namaOrangTua,
          noWaOrangTua: row.noWaOrangTua || old.noWaOrangTua,
          noWa: row.noWa || old.noWa,
          alamat: row.alamat || old.alamat,
          tempatLahir: row.tempatLahir || old.tempatLahir,
          tanggalLahir: row.tanggalLahir || old.tanggalLahir,
          username: row.username || old.username,
          password: row.password || old.password,
        };
        updatedCount++;
      } else if (existingIdx !== undefined && duplicateMode === 'skip') {
        // Skip duplicate
        return;
      } else {
        // Add new student
        const newStudent: Siswa = {
          id: 'SIS_' + Date.now() + Math.random().toString(36).substr(2, 5),
          nisn: row.nisn !== '-' ? row.nisn : '',
          nama: row.nama,
          gender: row.gender,
          kelasId: finalKelasId,
          status: 'aktif',
          noWa: row.noWa,
          namaOrangTua: row.namaOrangTua,
          noWaOrangTua: row.noWaOrangTua,
          alamat: row.alamat || undefined,
          tempatLahir: row.tempatLahir || undefined,
          tanggalLahir: row.tanggalLahir || undefined,
          username: row.username || undefined,
          password: row.password || undefined,
        };
        currentSiswaList.push(newStudent);
        if (nisnKey) {
          siswaByNisnMap.set(nisnKey, currentSiswaList.length - 1);
        }
        addedCount++;
      }
    });

    onImportSuccess(addedCount, updatedCount, currentSiswaList, newKelasList);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/20 shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Import Data Siswa Massal</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Excel & CSV
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unggah file spreadsheet untuk memasukkan atau memperbarui data siswa secara serentak.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Top Info & Template Download Banner */}
          <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 dark:from-slate-800/60 dark:via-indigo-950/30 dark:to-slate-850 p-4.5 rounded-2xl border border-blue-100 dark:border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Format & Template Standar</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Gunakan template resmi untuk memastikan struktur kolom cocok otomatis (NISN, Nama, JK, Kelas, Kontak Ortu).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => handleDownloadExcelTemplate(false)}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Unduh Template Excel Kosong Siap Diisi (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Template Siap Diisi (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadExcelTemplate(true)}
                className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Unduh Template dengan Contoh Data Demo (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Template Demo (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Unduh Template CSV .csv"
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>CSV (.csv)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                <span>{showGuide ? 'Tutup Panduan' : 'Panduan Kolom'}</span>
              </button>
            </div>
          </div>

          {/* Guide Collapse */}
          {showGuide && (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-xs space-y-3 animate-fadeIn">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                <span>Spesifikasi Kolom Header yang Didukung:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-[11px]">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">NISN / No Induk</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Nomor Induk Siswa Nasional (unik per siswa).</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">NAMA / Nama Lengkap *</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Wajib diisi. Nama lengkap siswa.</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">JK / Gender / L/P</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Isi dengan <code>L</code> (Laki-laki) atau <code>P</code> (Perempuan).</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">KELAS / Rombel</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Nama kelas (misal: <i>X RPL 1</i> atau <i>XI TKJ 2</i>).</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">NAMA ORANG TUA / Wali</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Nama orang tua / wali siswa.</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">NO WA ORANG TUA & SISWA</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Nomor WhatsApp untuk notifikasi presensi otomatis.</p>
                </div>
              </div>
            </div>
          )}

          {/* Upload Dropzone */}
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <Upload className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Tarik & Lepaskan File Excel/CSV di Sini
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  atau klik untuk memilih file dari komputer Anda (Format didukung: <b>.xlsx, .xls, .csv</b>)
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                  Excel (.xlsx / .xls)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                  Comma-Separated (.csv)
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info Card & Controls */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">{fileName}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono">
                        {fileSize}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{parsedRows.length} baris data berhasil dibaca dari file</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  {sheetNames.length > 1 && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Sheet:</span>
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                      >
                        {sheetNames.map((s) => (
                          <option key={s} value={s} className="dark:bg-slate-900">
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleResetFile}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-400 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ganti File</span>
                  </button>
                </div>
              </div>

              {/* Import Options Settings Bar */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Duplicate Mode */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-500" />
                      <span>Mode Impor & Penanganan Data:</span>
                    </label>
                    <select
                      value={duplicateMode}
                      onChange={(e) => setDuplicateMode(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="upsert">Perbarui Data Jika NISN Sudah Ada (Update & Tambah Baru)</option>
                      <option value="replace">⚠️ Ganti / Timpa Seluruh Data Siswa (Hapus Data Lama & Isi dari Excel Ini Saja)</option>
                      <option value="skip">Abaikan / Lewati Jika NISN Sudah Terdaftar (Hanya Tambah Baru)</option>
                      <option value="add_all">Tambahkan Semua Sebagai Siswa Baru (Abaikan Duplikasi)</option>
                    </select>
                  </div>

                  {/* Default Fallback Kelas */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Kelas Cadangan (Jika Kolom Kelas Kosong/Tidak Cocok):</span>
                    </label>
                    <select
                      value={fallbackKelasId}
                      onChange={(e) => handleFallbackKelasChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {sortKelasList(appData.kelas).map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={autoCreateMissingKelas}
                      onChange={(e) => setAutoCreateMissingKelas(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>Otomatis daftarkan kelas baru ke Master Kelas jika nama kelas di Excel belum ada di sistem</span>
                  </label>
                  {duplicateMode === 'replace' && (
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                      ⚠️ Data siswa demo/lama akan diganti total dengan {totalValid} siswa dari file ini
                    </span>
                  )}
                </div>
              </div>

              {/* Data Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    statusFilter === 'all'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Baris</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{parsedRows.length}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('valid')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    statusFilter === 'valid'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Siap Diimpor</span>
                  </div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{totalValid}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('warning')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    statusFilter === 'warning'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Peringatan / Update</span>
                  </div>
                  <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{totalWarning}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('error')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    statusFilter === 'error'
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Tidak Valid (Error)</span>
                  </div>
                  <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{totalError}</div>
                </button>
              </div>

              {/* Preview Table Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                {/* Table Header Filter & Search */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari di tabel preview..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 self-end sm:self-auto">
                    <span>Menampilkan {filteredRows.length} data</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                    >
                      <option value={5}>5 / hal</option>
                      <option value={10}>10 / hal</option>
                      <option value={25}>25 / hal</option>
                      <option value={50}>50 / hal</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">No</th>
                        <th className="py-2.5 px-3">NISN</th>
                        <th className="py-2.5 px-3">Nama Siswa</th>
                        <th className="py-2.5 px-3 text-center">L/P</th>
                        <th className="py-2.5 px-3">Kelas Tujuan</th>
                        <th className="py-2.5 px-3">Nama Orang Tua</th>
                        <th className="py-2.5 px-3">No. WA (Siswa / Ortu)</th>
                        <th className="py-2.5 px-3 text-center">Status Validasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {paginatedRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            Tidak ada data siswa yang cocok dengan filter.
                          </td>
                        </tr>
                      ) : (
                        paginatedRows.map((row) => (
                          <tr
                            key={row.index}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                              !row.isValid ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{row.index}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {row.nisn}
                              {row.isExistingNisn && (
                                <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 font-sans font-bold">
                                  Ada di sistem
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                              {row.nama || <span className="text-rose-500 font-normal italic">(Kosong)</span>}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                  row.gender === 'L'
                                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                    : 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300'
                                }`}
                              >
                                {row.gender}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {row.targetKelasNama}
                                </span>
                                {row.matchedKelas ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Cocok dengan master kelas" />
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-medium">
                                    Fallback
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                              {row.namaOrangTua}
                            </td>
                            <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                              {row.noWa} / {row.noWaOrangTua}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {!row.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>{row.validationErrors[0]}</span>
                                </span>
                              ) : row.isExistingNisn ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                                  <RefreshCw className="w-3 h-3" />
                                  <span>{duplicateMode === 'upsert' ? 'Akan Diperbarui' : duplicateMode === 'skip' ? 'Akan Dilewati' : 'Tambah Baru'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                                  <Check className="w-3 h-3" />
                                  <span>Siap Ditambah</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination Footer */}
                {totalPages > 1 && (
                  <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-800/40">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Halaman {currentPage} dari {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-900 transition"
                      >
                        Sebelumnya
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-900 transition"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            {file && totalValid > 0 ? (
              <span>
                Total <b>{totalValid}</b> siswa valid akan diproses ({duplicateMode === 'upsert' ? `${totalExisting} update / ${totalValid - totalExisting} baru` : duplicateMode === 'skip' ? `${totalValid - totalExisting} baru (${totalExisting} dilewati)` : `${totalValid} baru`}).
              </span>
            ) : (
              <span>Pilih atau seret file spreadsheet (.xlsx / .csv) untuk memulai verifikasi.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={!file || totalValid === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Proses Impor ({totalValid} Siswa)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
