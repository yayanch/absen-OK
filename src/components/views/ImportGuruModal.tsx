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
  UserCheck,
  User,
  MapPin,
  Calendar,
  Mail,
  Hash,
  ShieldAlert
} from 'lucide-react';
import { AppData, WaliKelas } from '../../types';
import { AGAMA_OPTIONS, getAgamaLabel, formatTanggalIndonesia } from './MasterGuruView';
import { cleanMapelName } from '../../utils/helpers';

interface ImportGuruModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  onImportSuccess: (importedCount: number, updatedCount: number, newWaliList: WaliKelas[]) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export interface ParsedGuruRow {
  index: number;
  nip: string;
  nama: string;
  nuptk: string;
  nik: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string;
  tanggalLahir: string;
  agamaId: string;
  alamat: string;
  rt: string;
  rw: string;
  desaKelurahan: string;
  kecamatan: string;
  kota: string;
  kodeWilayah: string;
  kodePos: string;
  noHp: string;
  email: string;
  username: string;
  password: string;
  mataPelajaran?: string;
  jabatan?: string;
  isExistingNip: boolean;
  isExistingNuptk: boolean;
  isExistingNama: boolean;
  existingGuru?: WaliKelas;
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];
}

export const ImportGuruModal: React.FC<ImportGuruModalProps> = ({
  isOpen,
  onClose,
  appData,
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
  const [parsedRows, setParsedRows] = useState<ParsedGuruRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'warning' | 'error'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal is closed
  const handleClose = () => {
    setFile(null);
    setFileName('');
    setFileSize('');
    setSheetNames([]);
    setSelectedSheet('');
    setWorkbook(null);
    setParsedRows([]);
    setIsProcessing(false);
    setShowGuide(false);
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  // Key normalizer helper
  const normalizeKey = (key: string): string => {
    return key
      .toLowerCase()
      .replace(/[\s\-_/.]+/g, '')
      .trim();
  };

  // Convert raw value to string
  const cleanStr = (val: any): string => {
    if (val === undefined || val === null) return '';
    return String(val).trim();
  };

  // Parse Excel date or string date
  const parseExcelDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'number') {
      // Excel serial date format
      const dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().slice(0, 10);
      }
    }
    const str = String(val).trim();
    // Check YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }
    // Check DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    }
    return str;
  };

  // Parse Agama
  const parseAgamaId = (val: any): string => {
    if (!val) return '1';
    const s = String(val).toLowerCase().trim();
    if (s === '1' || s.includes('islam') || s.includes('muslim')) return '1';
    if (s === '2' || s.includes('kristen') || s.includes('protestan')) return '2';
    if (s === '3' || s.includes('katolik')) return '3';
    if (s === '4' || s.includes('hindu')) return '4';
    if (s === '5' || s.includes('buddha') || s.includes('budha')) return '5';
    if (s === '6' || s.includes('khonghucu') || s.includes('konghucu')) return '6';
    if (s === '7' || s.includes('lain')) return '7';
    return '1';
  };

  // Parse Sheet Data
  const processSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    setIsProcessing(true);
    try {
      const ws = wb.Sheets[sheetName];
      if (!ws) {
        setParsedRows([]);
        setIsProcessing(false);
        return;
      }

      // Convert sheet to 2D array of rows
      const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
      if (!rawRows || rawRows.length === 0) {
        onShowToast('Lembar kerja (Sheet) ini kosong.', 'warning');
        setParsedRows([]);
        setIsProcessing(false);
        return;
      }

      // Scan for the real header row (rows 0 to 10)
      let headerRowIndex = 0;
      let maxScore = -1;

      for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
        const rowCells = rawRows[r];
        if (!Array.isArray(rowCells) || rowCells.length === 0) continue;

        let score = 0;
        rowCells.forEach((cellVal) => {
          const norm = normalizeKey(String(cellVal));
          if (
            norm.includes('nama') ||
            norm.includes('guru') ||
            norm.includes('nip') ||
            norm.includes('nuptk') ||
            norm.includes('nik') ||
            norm.includes('jeniskelamin') ||
            norm.includes('jk') ||
            norm.includes('gender') ||
            norm.includes('tempat') ||
            norm.includes('alamat') ||
            norm.includes('nohp') ||
            norm.includes('email')
          ) {
            score++;
          }
        });

        if (score > maxScore && score >= 2) {
          maxScore = score;
          headerRowIndex = r;
        }
      }

      // Extract headers from detected row
      const rawHeaders = rawRows[headerRowIndex] || [];
      const headerMap: { [key: string]: number } = {};

      rawHeaders.forEach((h: any, colIdx: number) => {
        const norm = normalizeKey(String(h));
        if (norm) {
          headerMap[norm] = colIdx;
        }
      });

      // Helper to retrieve cell value by potential aliases
      const getVal = (row: any[], aliases: string[]): string => {
        for (const a of aliases) {
          const normAlias = normalizeKey(a);
          // 1. Direct match
          if (headerMap[normAlias] !== undefined) {
            return cleanStr(row[headerMap[normAlias]]);
          }
          // 2. Partial key match
          const foundKey = Object.keys(headerMap).find(
            (k) => k === normAlias || k.includes(normAlias) || normAlias.includes(k)
          );
          if (foundKey !== undefined) {
            return cleanStr(row[headerMap[foundKey]]);
          }
        }
        return '';
      };

      // Existing guru maps for conflict detection
      const existingNipMap = new Map<string, WaliKelas>();
      const existingNuptkMap = new Map<string, WaliKelas>();
      const existingNamaMap = new Map<string, WaliKelas>();

      (appData.waliKelas || []).forEach((g) => {
        if (g.nip && g.nip.trim() && g.nip !== '-') {
          existingNipMap.set(g.nip.trim().toLowerCase(), g);
        }
        if (g.nuptk && g.nuptk.trim() && g.nuptk !== '-') {
          existingNuptkMap.set(g.nuptk.trim().toLowerCase(), g);
        }
        if (g.nama && g.nama.trim()) {
          existingNamaMap.set(g.nama.trim().toLowerCase(), g);
        }
      });

      const parsed: ParsedGuruRow[] = [];
      const dataRows = rawRows.slice(headerRowIndex + 1);

      dataRows.forEach((row, rIdx) => {
        if (!Array.isArray(row) || row.every((c) => cleanStr(c) === '')) {
          return; // Skip empty row
        }

        const rawNama = getVal(row, ['nama_lengkap', 'nama_guru', 'namaguru', 'nama', 'guru', 'name']);
        if (!rawNama || rawNama.toLowerCase().includes('contoh') && rawNama.length < 15) {
          // If it's pure header repetition or clearly empty
          if (!rawNama) return;
        }

        const rawNip = getVal(row, ['nip', 'no_nip', 'nomorindukpegawai']);
        const rawNuptk = getVal(row, ['nuptk', 'no_nuptk']);
        const rawNik = getVal(row, ['nik', 'nik_ktp', 'no_ktp', 'ktp']);
        
        let rawJk = getVal(row, ['jenis_kelamin', 'jeniskelamin', 'jk', 'gender', 'sex', 'l/p', 'lp']).toUpperCase();
        if (rawJk.startsWith('L') || rawJk === 'PRIA' || rawJk === 'LAKI-LAKI') rawJk = 'L';
        else if (rawJk.startsWith('P') || rawJk === 'WANITA' || rawJk === 'PEREMPUAN') rawJk = 'P';
        else rawJk = 'L';

        const rawTempatLahir = getVal(row, ['tempat_lahir', 'tempatlahir', 'tempat', 'kota_lahir']);
        
        // Tanggal Lahir
        let rawTglLahir = '';
        const tglColIdx = Object.keys(headerMap).find((k) => k.includes('lahir') && k.includes('tgl') || k.includes('tanggal'));
        if (tglColIdx !== undefined) {
          rawTglLahir = parseExcelDate(row[headerMap[tglColIdx]]);
        } else {
          rawTglLahir = parseExcelDate(getVal(row, ['tanggal_lahir', 'tanggallahir', 'tgl_lahir', 'tgl', 'tanggal', 'lahir']));
        }

        const rawAgama = parseAgamaId(getVal(row, ['agama_id', 'agamaid', 'agama', 'religion']));
        const rawAlamat = getVal(row, ['alamat', 'alamat_lengkap', 'alamatlengkap', 'domisili', 'jalan']);
        const rawRt = getVal(row, ['rt', 'no_rt']);
        const rawRw = getVal(row, ['rw', 'no_rw']);
        const rawDesa = getVal(row, ['desa_kelurahan', 'desakelurahan', 'desa', 'kelurahan']);
        const rawKecamatan = getVal(row, ['kecamatan', 'distrik']);
        const rawKota = getVal(row, ['kota', 'kabupaten', 'kota_kabupaten', 'kotakabupaten', 'city']);
        const rawKodeWilayah = getVal(row, ['kode_wilayah', 'kodewilayah']);
        const rawKodePos = getVal(row, ['kode_pos', 'kodepos', 'pos', 'zip']);
        const rawNoHp = getVal(row, ['no_hp', 'nohp', 'hp', 'telepon', 'telp', 'no_wa', 'whatsapp', 'phone']);
        const rawEmail = getVal(row, ['email', 'surel', 'mail']);
        const rawMapel = getVal(row, ['mata_pelajaran', 'matapelajaran', 'mapel', 'subject']);
        const rawJabatan = getVal(row, ['jabatan', 'tugas_tambahan', 'tugastambahan']);

        const cleanNama = rawNama.trim();
        const cleanNip = rawNip.replace(/[^0-9]/g, '').trim();
        const cleanNuptk = rawNuptk.replace(/[^0-9]/g, '').trim();

        const defaultUsername = (
          getVal(row, ['username', 'user']) ||
          cleanNip ||
          cleanNuptk ||
          `guru_${cleanNama.toLowerCase().replace(/[^a-z0-9]/g, '')}`
        ).toLowerCase();

        const defaultPassword = getVal(row, ['password', 'pass', 'katasandi']) || '123';

        // Check Existing Records
        const existingByNip = cleanNip ? existingNipMap.get(cleanNip.toLowerCase()) : undefined;
        const existingByNuptk = cleanNuptk ? existingNuptkMap.get(cleanNuptk.toLowerCase()) : undefined;
        const existingByNama = existingNamaMap.get(cleanNama.toLowerCase());
        const existingGuru = existingByNip || existingByNuptk || existingByNama;

        const validationErrors: string[] = [];
        const validationWarnings: string[] = [];

        if (!cleanNama) {
          validationErrors.push('Nama Guru kosong');
        }

        if (existingByNip) {
          validationWarnings.push(`NIP ${cleanNip} sudah ada (${existingByNip.nama})`);
        }
        if (existingByNuptk) {
          validationWarnings.push(`NUPTK ${cleanNuptk} sudah ada (${existingByNuptk.nama})`);
        }
        if (!existingByNip && !existingByNuptk && existingByNama) {
          validationWarnings.push(`Nama "${cleanNama}" sudah terdaftar sebelumnya`);
        }

        parsed.push({
          index: rIdx + 1,
          nip: cleanNip || rawNip,
          nama: cleanNama,
          nuptk: cleanNuptk || rawNuptk,
          nik: rawNik,
          jenisKelamin: rawJk as 'L' | 'P',
          tempatLahir: rawTempatLahir,
          tanggalLahir: rawTglLahir,
          agamaId: rawAgama,
          alamat: rawAlamat,
          rt: rawRt,
          rw: rawRw,
          desaKelurahan: rawDesa,
          kecamatan: rawKecamatan,
          kota: rawKota,
          kodeWilayah: rawKodeWilayah,
          kodePos: rawKodePos,
          noHp: rawNoHp,
          email: rawEmail,
          username: defaultUsername,
          password: defaultPassword,
          mataPelajaran: cleanMapelName(rawMapel),
          jabatan: rawJabatan,
          isExistingNip: Boolean(existingByNip),
          isExistingNuptk: Boolean(existingByNuptk),
          isExistingNama: Boolean(existingByNama),
          existingGuru,
          isValid: validationErrors.length === 0,
          validationErrors,
          validationWarnings,
        });
      });

      setParsedRows(parsed);
      setCurrentPage(1);

      if (parsed.length === 0) {
        onShowToast('Tidak ditemukan baris data guru yang valid pada file ini.', 'warning');
      } else {
        onShowToast(`Berhasil membaca ${parsed.length} baris data guru dari Excel!`, 'success');
      }
    } catch (err: any) {
      console.error('Error parsing excel guru:', err);
      onShowToast(`Gagal memproses file Excel: ${err.message || 'Format tidak dikenali'}`, 'error');
      setParsedRows([]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file selection
  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setFileSize((selectedFile.size / 1024).toFixed(1) + ' KB');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary', cellDates: true });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        const firstSheet = wb.SheetNames[0] || '';
        setSelectedSheet(firstSheet);
        processSheetData(wb, firstSheet);
      } catch (err: any) {
        console.error('Error reading workbook:', err);
        onShowToast('Format file rusak atau tidak didukung oleh pembaca Excel.', 'error');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
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

  const handleSheetChange = (newSheet: string) => {
    setSelectedSheet(newSheet);
    if (workbook) {
      processSheetData(workbook, newSheet);
    }
  };

  // Download Templates
  const handleDownloadTemplate = (isDemo = false) => {
    let templateRows: any[] = [];

    if (!isDemo) {
      // 1 single guide row clearly labeled, so it is never confused with real data
      templateRows = [
        {
          nip: '198501012010011001',
          nama: 'Ahmad Fauzi',
          nuptk: '1234567890123456',
          nik: '3201234567890001',
          jenis_kelamin: 'L',
          tempat_lahir: 'Bandung',
          tanggal_lahir: '1985-01-01',
          agama_id: '1',
          alamat: 'Jl. Merdeka No. 45',
          rt: '03',
          rw: '05',
          desa_kelurahan: 'Cibaduyut',
          kecamatan: 'Bojongloa Kidul',
          kota: 'Kota Bandung',
          kode_wilayah: '32.73.05',
          kode_pos: '40235',
          no_hp: '081234567890',
          email: 'ahmad.fauzi@sekolah.sch.id',
          mata_pelajaran: 'Matematika Wajib',
          jabatan: 'Guru Pengampu / Wali Kelas',
        },
      ];
    } else {
      // Demo dataset
      templateRows = [
        {
          nip: '198501012010011001',
          nama: 'Ahmad Fauzi',
          nuptk: '1234567890123456',
          nik: '3201234567890001',
          jenis_kelamin: 'L',
          tempat_lahir: 'Bandung',
          tanggal_lahir: '1985-01-01',
          agama_id: '1',
          alamat: 'Jl. Merdeka No. 45',
          rt: '03',
          rw: '05',
          desa_kelurahan: 'Cibaduyut',
          kecamatan: 'Bojongloa Kidul',
          kota: 'Kota Bandung',
          kode_wilayah: '32.73.05',
          kode_pos: '40235',
          no_hp: '081234567890',
          email: 'ahmad.fauzi@sekolah.sch.id',
          mata_pelajaran: 'Matematika Wajib',
          jabatan: 'Wali Kelas X RPL 1',
        },
        {
          nip: '199002022015022002',
          nama: 'Siti Nurhaliza',
          nuptk: '9876543210987654',
          nik: '3201234567890002',
          jenis_kelamin: 'P',
          tempat_lahir: 'Jakarta',
          tanggal_lahir: '1990-02-02',
          agama_id: '1',
          alamat: 'Jl. Melati No. 12',
          rt: '01',
          rw: '02',
          desa_kelurahan: 'Sukasari',
          kecamatan: 'Sukasari',
          kota: 'Kota Bandung',
          kode_wilayah: '32.73.08',
          kode_pos: '40152',
          no_hp: '085712345678',
          email: 'siti.nurhaliza@sekolah.sch.id',
          mata_pelajaran: 'Bahasa Indonesia',
          jabatan: 'Wali Kelas XI TKJ 1',
        },
        {
          nip: '198203032008011003',
          nama: 'Budi Santoso',
          nuptk: '5566778899001122',
          nik: '3201234567890003',
          jenis_kelamin: 'L',
          tempat_lahir: 'Surabaya',
          tanggal_lahir: '1982-03-03',
          agama_id: '1',
          alamat: 'Jl. Pemuda No. 8',
          rt: '04',
          rw: '01',
          desa_kelurahan: 'Dago',
          kecamatan: 'Coblong',
          kota: 'Kota Bandung',
          kode_wilayah: '32.73.02',
          kode_pos: '40135',
          no_hp: '081398765432',
          email: 'budi.santoso@sekolah.sch.id',
          mata_pelajaran: 'Pemrograman Web',
          jabatan: 'Ketua Program Keahlian RPL',
        },
        {
          nip: '199205152019032004',
          nama: 'Dewi Lestari',
          nuptk: '3344556677889900',
          nik: '3201234567890004',
          jenis_kelamin: 'P',
          tempat_lahir: 'Garut',
          tanggal_lahir: '1992-05-15',
          agama_id: '1',
          alamat: 'Jl. Cimanuk No. 22',
          rt: '02',
          rw: '04',
          desa_kelurahan: 'Paminggir',
          kecamatan: 'Garut Kota',
          kota: 'Kabupaten Garut',
          kode_wilayah: '32.05.01',
          kode_pos: '44118',
          no_hp: '087812345678',
          email: 'dewi.lestari@sekolah.sch.id',
          mata_pelajaran: 'Basis Data',
          jabatan: 'Guru Produktif RPL',
        },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(templateRows);
    ws['!cols'] = [
      { wch: 22 }, // nip
      { wch: 26 }, // nama
      { wch: 20 }, // nuptk
      { wch: 20 }, // nik
      { wch: 14 }, // jenis_kelamin
      { wch: 18 }, // tempat_lahir
      { wch: 15 }, // tanggal_lahir
      { wch: 10 }, // agama_id
      { wch: 30 }, // alamat
      { wch: 8 },  // rt
      { wch: 8 },  // rw
      { wch: 20 }, // desa_kelurahan
      { wch: 20 }, // kecamatan
      { wch: 15 }, // kode_wilayah
      { wch: 12 }, // kode_pos
      { wch: 16 }, // no_hp
      { wch: 28 }, // email
      { wch: 24 }, // mata_pelajaran
      { wch: 26 }, // jabatan
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isDemo ? 'Demo Guru' : 'Template Guru');
    const fileName = isDemo ? 'Template_Demo_Guru_Lengkap.xlsx' : 'Template_Import_Guru_Siap_Diisi.xlsx';
    XLSX.writeFile(wb, fileName);
    onShowToast(`Template Excel Guru ${isDemo ? 'Demo' : 'Siap Diisi'} berhasil diunduh!`, 'success');
  };

  const handleDownloadCsvTemplate = () => {
    const headers = [
      'nip',
      'nama',
      'nuptk',
      'nik',
      'jenis_kelamin',
      'tempat_lahir',
      'tanggal_lahir',
      'agama_id',
      'alamat',
      'rt',
      'rw',
      'desa_kelurahan',
      'kecamatan',
      'kota',
      'kode_wilayah',
      'kode_pos',
      'no_hp',
      'email',
    ];

    const rows = [
      headers.join(','),
      `"198501012010011001","Ahmad Fauzi","1234567890123456","3201234567890001","L","Bandung","1985-01-01","1","Jl. Merdeka No. 45","03","05","Cibaduyut","Bojongloa Kidul","Kota Bandung","32.73.05","40235","081234567890","ahmad.fauzi@sekolah.sch.id"`,
    ];

    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Template_Import_Guru_Siap_Diisi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('Template CSV Guru Siap Diisi berhasil diunduh!', 'success');
  };

  // Filtered rows for preview
  const filteredRows = useMemo(() => {
    return parsedRows.filter((r) => {
      // Status Filter
      if (statusFilter === 'valid' && !r.isValid) return false;
      if (statusFilter === 'warning' && r.validationWarnings.length === 0) return false;
      if (statusFilter === 'error' && r.isValid) return false;

      // Search Term
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        r.nama.toLowerCase().includes(q) ||
        r.nip.toLowerCase().includes(q) ||
        r.nuptk.toLowerCase().includes(q) ||
        r.nik.toLowerCase().includes(q) ||
        r.tempatLahir.toLowerCase().includes(q) ||
        r.alamat.toLowerCase().includes(q) ||
        r.noHp.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    });
  }, [parsedRows, statusFilter, searchTerm]);

  // Statistics
  const totalRead = parsedRows.length;
  const totalValid = parsedRows.filter((r) => r.isValid).length;
  const totalWarnings = parsedRows.filter((r) => r.validationWarnings.length > 0).length;
  const totalErrors = parsedRows.filter((r) => !r.isValid).length;
  const totalMale = parsedRows.filter((r) => r.jenisKelamin === 'L').length;
  const totalFemale = parsedRows.filter((r) => r.jenisKelamin === 'P').length;

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Final Import Action
  const handleExecuteImport = () => {
    if (parsedRows.length === 0) {
      onShowToast('Tidak ada data guru yang terbaca untuk diimpor.', 'warning');
      return;
    }

    let addedCount = 0;
    let updatedCount = 0;

    let currentWaliList: WaliKelas[] = [];
    const guruByNipMap = new Map<string, number>();
    const guruByNuptkMap = new Map<string, number>();
    const guruByNamaMap = new Map<string, number>();

    if (duplicateMode === 'replace') {
      // 100% Replace mode: discard old demo/sample data
      currentWaliList = [];
    } else {
      currentWaliList = [...appData.waliKelas];
      currentWaliList.forEach((g, idx) => {
        if (g.nip && g.nip !== '-' && g.nip.trim() !== '') {
          guruByNipMap.set(g.nip.trim().toLowerCase(), idx);
        }
        if (g.nuptk && g.nuptk !== '-' && g.nuptk.trim() !== '') {
          guruByNuptkMap.set(g.nuptk.trim().toLowerCase(), idx);
        }
        if (g.nama && g.nama.trim() !== '') {
          guruByNamaMap.set(g.nama.trim().toLowerCase(), idx);
        }
      });
    }

    parsedRows.forEach((row, idx) => {
      if (!row.isValid) return;

      const nipKey = row.nip && row.nip !== '-' ? row.nip.trim().toLowerCase() : '';
      const nuptkKey = row.nuptk && row.nuptk !== '-' ? row.nuptk.trim().toLowerCase() : '';
      const namaKey = row.nama.trim().toLowerCase();

      let existingIdx: number | undefined = undefined;
      if (duplicateMode !== 'replace') {
        if (nipKey && guruByNipMap.has(nipKey)) {
          existingIdx = guruByNipMap.get(nipKey);
        } else if (nuptkKey && guruByNuptkMap.has(nuptkKey)) {
          existingIdx = guruByNuptkMap.get(nuptkKey);
        } else if (guruByNamaMap.has(namaKey)) {
          existingIdx = guruByNamaMap.get(namaKey);
        }
      }

      if (existingIdx !== undefined && duplicateMode === 'upsert') {
        // Update existing record
        const old = currentWaliList[existingIdx];
        currentWaliList[existingIdx] = {
          ...old,
          nip: row.nip || old.nip || '',
          nama: row.nama,
          nuptk: row.nuptk || old.nuptk || '',
          nik: row.nik || old.nik || '',
          jenisKelamin: row.jenisKelamin,
          tempatLahir: row.tempatLahir || old.tempatLahir || '',
          tanggalLahir: row.tanggalLahir || old.tanggalLahir || '',
          agamaId: row.agamaId || old.agamaId || '1',
          alamat: row.alamat || old.alamat || '',
          rt: row.rt || old.rt || '',
          rw: row.rw || old.rw || '',
          desaKelurahan: row.desaKelurahan || old.desaKelurahan || '',
          kecamatan: row.kecamatan || old.kecamatan || '',
          kota: row.kota || old.kota || '',
          kodeWilayah: row.kodeWilayah || old.kodeWilayah || '',
          kodePos: row.kodePos || old.kodePos || '',
          noHp: row.noHp || old.noHp || '',
          email: row.email || old.email || '',
          mataPelajaran: row.mataPelajaran || old.mataPelajaran || '',
          jabatan: row.jabatan || old.jabatan || '',
        };
        updatedCount++;
      } else if (existingIdx !== undefined && duplicateMode === 'skip') {
        // Skip duplicate
        return;
      } else {
        // Add new teacher
        const newGid = `GURU_IMP_${Date.now()}_${idx}`;
        const newTeacher: WaliKelas = {
          id: newGid,
          nip: row.nip,
          nama: row.nama,
          nuptk: row.nuptk,
          nik: row.nik,
          jenisKelamin: row.jenisKelamin,
          tempatLahir: row.tempatLahir,
          tanggalLahir: row.tanggalLahir,
          agamaId: row.agamaId || '1',
          alamat: row.alamat,
          rt: row.rt,
          rw: row.rw,
          desaKelurahan: row.desaKelurahan,
          kecamatan: row.kecamatan,
          kota: row.kota,
          kodeWilayah: row.kodeWilayah,
          kodePos: row.kodePos,
          noHp: row.noHp,
          email: row.email,
          username: row.username,
          password: row.password || '123',
          role: 'guru',
          foto: '',
          tugasTambahan: row.jabatan || '',
          jabatan: row.jabatan || '',
          mataPelajaran: row.mataPelajaran || '',
          hariMengajar: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
          batasiLoginHariMengajar: false,
        };

        currentWaliList.push(newTeacher);
        if (nipKey) guruByNipMap.set(nipKey, currentWaliList.length - 1);
        if (nuptkKey) guruByNuptkMap.set(nuptkKey, currentWaliList.length - 1);
        guruByNamaMap.set(namaKey, currentWaliList.length - 1);
        addedCount++;
      }
    });

    onImportSuccess(addedCount, updatedCount, currentWaliList);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Import Biodata Guru via Excel / CSV
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  Resmi 18 Kolom
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Unggah file Excel berisi NIP, NUPTK, NIK, Tempat/Tgl Lahir, Alamat, Kontak, dan Email Guru.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Top Info & Template Actions */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Format Template Sesuai Dapodik & Format Sekolah</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Unduh template siap diisi (hanya 1 baris contoh bersih) atau template demo contoh untuk mempermudah pengisian.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => handleDownloadTemplate(false)}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Unduh Template Excel Kosong Siap Diisi (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Template Siap Diisi (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate(true)}
                className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Unduh Template dengan Contoh Data Demo Lengkap (.xlsx)"
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
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-750 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Petunjuk Penulisan Kolom"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Guide Expandable Panel */}
          {showGuide && (
            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800/60 text-xs space-y-3 animate-in fade-in duration-150">
              <h4 className="font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Petunjuk Kolom Excel Master Guru:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-[11px]">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="font-bold text-blue-600 dark:text-blue-400">nama / NAMA</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Wajib diisi. Nama lengkap guru.</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="font-bold text-blue-600 dark:text-blue-400">nip / NUPTK / NIK</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Nomor identitas unik. Otomatis dijadikan username login default.</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="font-bold text-blue-600 dark:text-blue-400">jenis_kelamin (L/P)</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Isi dengan <code>L</code> (Laki-laki) atau <code>P</code> (Perempuan).</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="font-bold text-blue-600 dark:text-blue-400">tanggal_lahir</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Format tanggal <code>YYYY-MM-DD</code> atau <code>DD-MM-YYYY</code>.</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="font-bold text-blue-600 dark:text-blue-400">agama_id</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Kode ID: 1-Islam, 2-Kristen, 3-Katolik, 4-Hindu, 5-Buddha, 6-Khonghucu.</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="font-bold text-blue-600 dark:text-blue-400">mata_pelajaran / jabatan</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Mata pelajaran yang diampu dan tugas/jabatan guru.</p>
                </div>
              </div>
            </div>
          )}

          {/* Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10 scale-[0.99]'
                : file
                ? 'border-blue-300 dark:border-blue-800/80 bg-blue-50/40 dark:bg-blue-950/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileChange(f);
              }}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Upload className="w-8 h-8" />
            </div>

            {file ? (
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                  <span>{fileName}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 rounded-full">
                    {fileSize}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Klik atau seret file lain untuk mengganti file Excel guru ini
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Pilih atau Tarik File Excel (.xlsx / .xls / .csv) ke sini
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mendukung file ekspor Dapodik, Microsoft Excel, dan CSV UTF-8
                </p>
              </div>
            )}
          </div>

          {/* Processing / Preview Section */}
          {isProcessing ? (
            <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Sedang menganalisis struktur baris & kolom Excel Guru...
              </p>
            </div>
          ) : parsedRows.length > 0 ? (
            <div className="space-y-4">
              {/* Sheet Selector & Stats */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-100 dark:bg-slate-800/70 rounded-2xl">
                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-300">Pilih Sheet:</span>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {sheetNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-3 py-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 shadow-xs">
                    Total: <strong className="text-blue-600">{totalRead}</strong> Guru
                  </span>
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 font-bold text-emerald-700 dark:text-emerald-300">
                    Siap Impor: <strong>{totalValid}</strong>
                  </span>
                  {totalWarnings > 0 && (
                    <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800 font-bold text-amber-700 dark:text-amber-300">
                      Duplikat/Update: <strong>{totalWarnings}</strong>
                    </span>
                  )}
                  <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    L: {totalMale} | P: {totalFemale}
                  </span>
                </div>
              </div>

              {/* Import Options Settings Bar */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-500" />
                    <span>Mode Impor & Penanganan Data:</span>
                  </label>
                  <select
                    value={duplicateMode}
                    onChange={(e) => setDuplicateMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="upsert">Perbarui Data Jika NIP/NUPTK/Nama Sudah Ada (Update & Tambah Baru)</option>
                    <option value="replace">⚠️ Ganti / Timpa Seluruh Data Guru (Hapus Guru Lama/Demo & Isi dari Excel Ini Saja)</option>
                    <option value="skip">Abaikan / Lewati Jika NIP/NUPTK Sudah Terdaftar (Hanya Tambah Baru)</option>
                    <option value="add_all">Tambahkan Semua Sebagai Guru Baru (Abaikan Duplikasi)</option>
                  </select>
                </div>

                {duplicateMode === 'replace' && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Mode Ganti Total: Seluruh biodata guru lama (termasuk guru dummy demo) akan digantikan secara penuh dengan <strong>{totalValid} guru</strong> dari file Excel ini.
                    </span>
                  </div>
                )}
              </div>

              {/* Table Toolbar Search & Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cari guru yang telah dibaca: Nama, NIP, NUPTK, Tempat Lahir, Kontak..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">Semua Status ({parsedRows.length})</option>
                    <option value="valid">Siap Diimpor ({totalValid})</option>
                    <option value="warning">Terdeteksi Duplikat ({totalWarnings})</option>
                    <option value="error">Ada Kendala ({totalErrors})</option>
                  </select>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">No</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">NIP / NUPTK</th>
                        <th className="py-2.5 px-3">Nama Lengkap</th>
                        <th className="py-2.5 px-3 text-center">JK</th>
                        <th className="py-2.5 px-3">Tempat, Tgl Lahir</th>
                        <th className="py-2.5 px-3">Agama</th>
                        <th className="py-2.5 px-3">No. HP / WA</th>
                        <th className="py-2.5 px-3">Alamat / Wilayah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {paginatedRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            Tidak ada data guru yang cocok dengan filter pencarian.
                          </td>
                        </tr>
                      ) : (
                        paginatedRows.map((row) => (
                          <tr
                            key={row.index}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                          >
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {row.index}
                            </td>

                            <td className="py-2.5 px-3">
                              {row.validationWarnings.length > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>{row.isExistingNip ? 'NIP Sudah Ada' : row.isExistingNuptk ? 'NUPTK Sudah Ada' : 'Nama Terdaftar'}</span>
                                </span>
                              ) : row.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <Check className="w-3 h-3" />
                                  <span>Siap</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Error</span>
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                              <div>{row.nip || '-'}</div>
                              {row.nuptk && (
                                <div className="text-[10px] text-slate-400">NUPTK: {row.nuptk}</div>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {row.nama}
                              </div>
                              {row.mataPelajaran && (
                                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                                  {row.mataPelajaran}
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.jenisKelamin === 'L'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                                }`}
                              >
                                {row.jenisKelamin}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {row.tempatLahir || row.tanggalLahir
                                ? `${row.tempatLahir || '-'}${row.tanggalLahir ? `, ${formatTanggalIndonesia(row.tanggalLahir)}` : ''}`
                                : '-'}
                            </td>

                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {getAgamaLabel(row.agamaId)}
                            </td>

                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                              {row.noHp || '-'}
                            </td>

                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-[180px] truncate" title={`${row.alamat} ${row.desaKelurahan} ${row.kecamatan} ${row.kota}`}>
                              {[row.alamat, row.desaKelurahan, row.kecamatan, row.kota].filter(Boolean).join(', ') || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> ({filteredRows.length} data)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40"
                      >
                        Sebelumnya
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={parsedRows.length === 0 || totalValid === 0}
            className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white shadow-lg shadow-blue-500/20 disabled:shadow-none transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {duplicateMode === 'replace'
                ? `Ganti & Impor ${totalValid} Guru Sekarang`
                : `Impor ${totalValid} Data Guru Sekarang`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
