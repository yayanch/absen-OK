import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  FileText,
  Copy,
  Check,
  Building,
  User,
  Calendar,
  School,
  Sparkles,
  CheckCircle2,
  X,
  HelpCircle,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ChevronDown,
  Upload
} from 'lucide-react';
import { AppData, Siswa, SekolahConfig } from '../../types';
import { formatDateIndo, compressBase64Image } from '../../utils/helpers';

interface SuratKeteranganNonAktifModalProps {
  appData: AppData;
  initialSiswa?: Siswa | null;
  onUpdateAppData?: (updated: AppData) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onClose: () => void;
}

export type JenisSuratNonAktif = 'non_aktif' | 'pindah_sekolah' | 'mengundurkan_diri' | 'lulus_alumni';

export const SuratKeteranganNonAktifModal: React.FC<SuratKeteranganNonAktifModalProps> = ({
  appData,
  initialSiswa,
  onUpdateAppData,
  onShowToast,
  onClose,
}) => {
  const sekolah: Partial<SekolahConfig> = appData.sekolah || {};
  const allSiswa = appData.siswa || [];

  // Filter non-active students first, fallback to all students if needed
  const nonAktifSiswaList = allSiswa.filter(
    (s) => s.status === 'tidak_aktif' || (s as any).status === 'nonaktif'
  );
  const selectableSiswa = nonAktifSiswaList.length > 0 ? nonAktifSiswaList : allSiswa;

  // Currently selected student
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(() => {
    if (initialSiswa?.id) return initialSiswa.id;
    if (selectableSiswa.length > 0) return selectableSiswa[0].id;
    return '';
  });

  const selectedSiswa = allSiswa.find((s) => s.id === selectedSiswaId) || initialSiswa || allSiswa[0];
  const selectedKelas = appData.kelas.find((k) => k.id === selectedSiswa?.kelasId);

  // Document Configurations State
  const yearNow = new Date().getFullYear();
  const defaultNomorSurat = `421.5/108-${sekolah.nama ? sekolah.nama.replace(/[^A-Za-z0-9]/g, '').substring(0, 8).toUpperCase() : 'SMK'}/CADISDIK.WIL.XI/${yearNow}`;

  const [nomorSurat, setNomorSurat] = useState<string>(defaultNomorSurat);
  const [jenisSurat, setJenisSurat] = useState<JenisSuratNonAktif>('non_aktif');
  const [tanggalSurat, setTanggalSurat] = useState<string>(() => new Date().toISOString().split('T')[0]);
  
  // Dynamic reason & destination options
  const [alasanKeterangan, setAlasanKeterangan] = useState<string>(
    'Siswa yang bersangkutan sudah tidak aktif mengikuti kegiatan Kegiatan Belajar Mengajar (KBM) di sekolah dan telah mengajukan permohonan non-aktif/pengunduran diri.'
  );
  const [sekolahTujuan, setSekolahTujuan] = useState<string>('');
  
  // Signatory State
  const [namaKepalaSekolah, setNamaKepalaSekolah] = useState<string>(
    sekolah.namaKepalaSekolah || 'H. Ahmad Supriadi, S.Pd., M.M.'
  );
  const [nipKepalaSekolah, setNipKepalaSekolah] = useState<string>(
    sekolah.nipKepalaSekolah || '19750812 199903 1 004'
  );
  const [jabatanPenandatangan, setJabatanPenandatangan] = useState<string>(
    `Kepala ${sekolah.nama || 'SMK Negeri 6 Garut'}`
  );

  // Document View Toggles
  const [showKop, setShowKop] = useState<boolean>(true);
  const [showStempel, setShowStempel] = useState<boolean>(true);
  const [showQrVerification, setShowQrVerification] = useState<boolean>(true);
  const [showTembusan, setShowTembusan] = useState<boolean>(true);
  const [buktiSuratFile, setBuktiSuratFile] = useState<string>(selectedSiswa?.suratNonAktifBukti || '');

  useEffect(() => {
    if (selectedSiswa) {
      setBuktiSuratFile(selectedSiswa.suratNonAktifBukti || '');
    }
  }, [selectedSiswaId]);

  // QR Verification Data URL
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copiedText, setCopiedText] = useState<boolean>(false);

  const handleSaveBuktiToAppData = (fileRes: string) => {
    setBuktiSuratFile(fileRes);
    if (selectedSiswa && onUpdateAppData) {
      const updatedSiswa = appData.siswa.map((s) =>
        s.id === selectedSiswa.id ? { ...s, suratNonAktifBukti: fileRes } : s
      );
      onUpdateAppData({
        ...appData,
        siswa: updatedSiswa,
      });
    }
  };

  // Update presets based on type change
  const handleJenisSuratChange = (type: JenisSuratNonAktif) => {
    setJenisSurat(type);
    if (type === 'non_aktif') {
      setAlasanKeterangan('Siswa yang bersangkutan terhitung sejak tanggal penetapan telah berstatus NON-AKTIF dari seluruh kegiatan akademik dan kesiswaan di sekolah.');
      setSekolahTujuan('');
    } else if (type === 'pindah_sekolah') {
      setAlasanKeterangan('Siswa yang bersangkutan pindah/mutasi sekolah atas permohonan tertulis dari Orang Tua/Wali Murid karena mengikuti perpindahan domisili orang tua.');
      setSekolahTujuan('SMA / SMK Negeri / Swasta Tujuan');
    } else if (type === 'mengundurkan_diri') {
      setAlasanKeterangan('Siswa yang bersangkutan mengundurkan diri sebagai siswa sekolah atas permintaan tertulis Orang Tua / Wali Murid.');
      setSekolahTujuan('');
    } else if (type === 'lulus_alumni') {
      setAlasanKeterangan('Siswa yang bersangkutan telah menyelesaikan seluruh hak dan kewajiban akademis serta dinyatakan LULUS dari jenjang pendidikan sekolah.');
      setSekolahTujuan('');
    }
  };

  // Generate Keabsahan QR Code
  useEffect(() => {
    if (!selectedSiswa) return;
    const verifyPayload = JSON.stringify({
      docType: 'Surat Keterangan Non-Aktif',
      noSurat: nomorSurat,
      nisn: selectedSiswa.nisn,
      nama: selectedSiswa.nama,
      sekolah: sekolah.nama || 'SMK',
      tanggal: tanggalSurat,
      verifiedBy: namaKepalaSekolah,
    });

    QRCode.toDataURL(verifyPayload, { width: 150, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
      .then((url) => setQrUrl(url))
      .catch((err) => console.error('QR Gen Error:', err));
  }, [selectedSiswa, nomorSurat, tanggalSurat, sekolah.nama, namaKepalaSekolah]);

  if (!selectedSiswa) {
    return (
      <div className="p-6 text-center text-slate-500">
        <p>Tidak ada data siswa yang dipilih.</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-slate-200 rounded-xl text-xs font-bold"
        >
          Tutup
        </button>
      </div>
    );
  }

  const judulSuratText = {
    non_aktif: 'SURAT KETERANGAN SISWA NON-AKTIF',
    pindah_sekolah: 'SURAT KETERANGAN PINDAH / MUTASI SEKOLAH',
    mengundurkan_diri: 'SURAT KETERANGAN MENGUNDURKAN DIRI',
    lulus_alumni: 'SURAT KETERANGAN KELULUSAN / ALUMNI',
  }[jenisSurat];

  const handleCopyText = () => {
    const textContent = `
${sekolah.namaDinas || 'PEMERINTAH PROVINSI JAWA BARAT'}
${sekolah.namaDinasDetail || 'DINAS PENDIDIKAN'}
${sekolah.nama || 'SMK NEGERI 6 GARUT'}
NPSN: ${sekolah.npsn || '20227483'} | Alamat: ${sekolah.alamat || 'Jl. Cimanuk Garut'}

${judulSuratText}
Nomor: ${nomorSurat}

Yang bertanda tangan di bawah ini:
Nama        : ${namaKepalaSekolah}
NIP         : ${nipKepalaSekolah}
Jabatan     : ${jabatanPenandatangan}
Unit Kerja  : ${sekolah.nama || 'SMK Negeri 6 Garut'}

Dengan ini menerangkan bahwa:
Nama Siswa         : ${selectedSiswa.nama}
NISN               : ${selectedSiswa.nisn || '-'}
Tempat, Tgl Lahir  : ${selectedSiswa.tempatLahir || '-'}, ${selectedSiswa.tanggalLahir ? formatDateIndo(selectedSiswa.tanggalLahir) : '-'}
Jenis Kelamin      : ${selectedSiswa.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
Kelas Terakhir     : ${selectedKelas?.nama || '-'}
Nama Orang Tua/Wali: ${selectedSiswa.namaOrangTua || '-'}
Alamat             : ${selectedSiswa.alamat || '-'}

Keterangan:
${alasanKeterangan}
${sekolahTujuan ? `Sekolah Tujuan: ${sekolahTujuan}` : ''}

Demikian Surat Keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.

Ditetapkan di: Garut
Tanggal: ${formatDateIndo(tanggalSurat)}

${jabatanPenandatangan},

${namaKepalaSekolah}
NIP. ${nipKepalaSekolah}
    `.trim();

    navigator.clipboard.writeText(textContent);
    setCopiedText(true);
    onShowToast('Teks Surat Keterangan berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handlePrintDocument = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      onShowToast('Gagal membuka jendela cetak. Mohon izinkan pop-up di browser.', 'warning');
      return;
    }

    const kopLogoSrc = sekolah.logo || '';
    const formattedTanggal = formatDateIndo(tanggalSurat);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${judulSuratText} - ${selectedSiswa.nama}</title>
          <style>
            @page { size: A4; margin: 15mm 20mm; }
            body { font-family: "Times New Roman", Times, serif; color: #000; background: #fff; margin: 0; padding: 0; font-size: 12pt; line-height: 1.5; }
            .kop-header { display: flex; items-center; justify-content: space-between; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 20px; }
            .kop-logo { width: 75px; height: 75px; object-fit: contain; }
            .kop-text { flex: 1; text-align: center; padding: 0 10px; }
            .kop-dinas { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0; }
            .kop-dinas-detail { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 0; }
            .kop-sekolah { font-size: 15pt; font-weight: 900; text-transform: uppercase; margin: 2px 0; }
            .kop-alamat { font-size: 9pt; font-style: italic; margin: 0; line-height: 1.3; }
            .doc-title-box { text-align: center; margin-bottom: 24px; }
            .doc-title { font-size: 13pt; font-weight: bold; text-decoration: underline; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
            .doc-number { font-size: 10pt; font-weight: bold; margin-top: 4px; }
            .content-section { text-align: justify; margin-bottom: 16px; }
            .table-data { width: 100%; border-collapse: collapse; margin: 12px 0 16px 20px; }
            .table-data td { padding: 4px 6px; vertical-align: top; font-size: 11.5pt; }
            .table-data td.label { width: 180px; font-weight: normal; }
            .table-data td.colon { width: 15px; }
            .notes-box { border: 1px solid #000; padding: 10px 14px; margin: 16px 0; font-size: 11pt; background: #fdfdfd; border-radius: 4px; }
            .ttd-container { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; page-break-inside: avoid; }
            .ttd-left { width: 45%; text-align: center; }
            .ttd-right { width: 50%; text-align: center; }
            .ttd-space { height: 70px; position: relative; display: flex; align-items: center; justify-content: center; }
            .stempel-img { position: absolute; width: 110px; opacity: 0.85; left: 10px; top: -10px; }
            .qr-verify { width: 65px; height: 65px; border: 1px solid #ccc; padding: 2px; }
            .ttd-nama { font-weight: bold; text-decoration: underline; font-size: 12pt; margin: 0; }
            .ttd-nip { font-size: 10.5pt; margin-top: 2px; }
            .tembusan { margin-top: 30px; font-size: 9.5pt; border-top: 1px solid #ccc; padding-top: 8px; }
            @media print {
              body { background: none; margin: 0; }
            }
          </style>
        </head>
        <body>
          ${
            showKop
              ? `
            <div class="kop-header">
              ${kopLogoSrc ? `<img src="${kopLogoSrc}" class="kop-logo" />` : '<div style="width:75px;"></div>'}
              <div class="kop-text">
                <p class="kop-dinas">${sekolah.namaDinas || 'PEMERINTAH PROVINSI JAWA BARAT'}</p>
                <p class="kop-dinas-detail">${sekolah.namaDinasDetail || 'DINAS PENDIDIKAN'}</p>
                <h1 class="kop-sekolah">${sekolah.nama || 'SMK NEGERI 6 GARUT'}</h1>
                <p class="kop-alamat">
                  ${sekolah.alamat || 'Jl. Cimanuk No. 309, Garut'} | Telp: ${sekolah.telepon || '(0262) 231451'} | NPSN: ${sekolah.npsn || '20227483'}<br/>
                  Website: ${sekolah.website || 'https://smkn6garut.sch.id'} | Email: ${sekolah.email || 'info@smkn6garut.sch.id'}
                </p>
              </div>
              ${kopLogoSrc ? `<img src="${kopLogoSrc}" class="kop-logo" style="visibility:hidden;" />` : '<div style="width:75px;"></div>'}
            </div>
          `
              : ''
          }

          <div class="doc-title-box">
            <h2 class="doc-title">${judulSuratText}</h2>
            <p class="doc-number">Nomor: ${nomorSurat}</p>
          </div>

          <div class="content-section">
            <p style="margin:0 0 10px 0;">Yang bertanda tangan di bawah ini Kepala <strong>${sekolah.nama || 'SMK Negeri 6 Garut'}</strong>, Kabupaten Garut, Provinsi Jawa Barat, dengan ini menerangkan bahwa:</p>
            
            <table class="table-data">
              <tr>
                <td class="label">Nama Lengkap Siswa</td>
                <td class="colon">:</td>
                <td><strong>${selectedSiswa.nama}</strong></td>
              </tr>
              <tr>
                <td class="label">NISN / NIS</td>
                <td class="colon">:</td>
                <td>${selectedSiswa.nisn || '-'}</td>
              </tr>
              <tr>
                <td class="label">Tempat, Tanggal Lahir</td>
                <td class="colon">:</td>
                <td>${selectedSiswa.tempatLahir || '-'}, ${selectedSiswa.tanggalLahir ? formatDateIndo(selectedSiswa.tanggalLahir) : '-'}</td>
              </tr>
              <tr>
                <td class="label">Jenis Kelamin</td>
                <td class="colon">:</td>
                <td>${selectedSiswa.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}</td>
              </tr>
              <tr>
                <td class="label">Kelas Terakhir</td>
                <td class="colon">:</td>
                <td>${selectedKelas?.nama || '-'}</td>
              </tr>
              <tr>
                <td class="label">Nama Orang Tua / Wali</td>
                <td class="colon">:</td>
                <td>${selectedSiswa.namaOrangTua || '-'}</td>
              </tr>
              <tr>
                <td class="label">Alamat Tempat Tinggal</td>
                <td class="colon">:</td>
                <td>${selectedSiswa.alamat || '-'}</td>
              </tr>
            </table>

            <p style="margin:12px 0 6px 0;">Menyatakan dengan sesungguhnya bahwa nama siswa tersebut di atas:</p>
            
            <div class="notes-box">
              <strong>Mulai Tanggal:</strong> ${formattedTanggal}<br/>
              <strong>Keterangan Status:</strong> ${alasanKeterangan}
              ${sekolahTujuan ? `<br/><strong>Sekolah Tujuan Mutasi:</strong> ${sekolahTujuan}` : ''}
            </div>

            <p style="margin-top:12px;">Demikian Surat Keterangan ini diberikan kepada yang bersangkutan untuk dipergunakan sebagaimana mestinya dan untuk diketahui oleh pihak yang berkepentingan.</p>
          </div>

          <div class="ttd-container">
            <div class="ttd-left">
              ${
                showQrVerification && qrUrl
                  ? `
                <div style="text-align:center;">
                  <img src="${qrUrl}" class="qr-verify" /><br/>
                  <span style="font-size:7pt; color:#555; font-family:sans-serif;">Verifikasi Keabsahan Dokumen Digital</span>
                </div>
              `
                  : ''
              }
            </div>

            <div class="ttd-right">
              <p style="margin:0;">Dikeluarkan di : Garut</p>
              <p style="margin:0 0 12px 0;">Pada tanggal : ${formattedTanggal}</p>
              <p style="margin:0; font-weight:bold;">${jabatanPenandatangan}</p>

              <div class="ttd-space">
                ${
                  showStempel
                    ? `
                  <div style="border: 2px dashed #1e3a8a; color:#1e3a8a; border-radius:50%; width:80px; height:80px; display:flex; align-items:center; justify-content:center; font-size:7pt; font-weight:bold; font-family:sans-serif; text-align:center; transform:rotate(-12deg); opacity:0.8;">
                    STEMPEL<br/>RESMI<br/>SEKOLAH
                  </div>
                `
                    : ''
                }
              </div>

              <p class="ttd-nama">${namaKepalaSekolah}</p>
              <p class="ttd-nip">NIP. ${nipKepalaSekolah}</p>
            </div>
          </div>

          ${
            showTembusan
              ? `
            <div class="tembusan">
              <strong>Tembusan Yth:</strong><br/>
              1. Kepala Dinas Pendidikan Provinsi Jawa Barat / Wilayah XI<br/>
              2. Pengawas Pembina Sekolah<br/>
              3. Orang Tua / Wali Murid Siswa Yang Bersangkutan<br/>
              4. Arsip Bagian Kesiswaan Sekolah
            </div>
          `
              : ''
          }

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="space-y-6 text-left max-h-[80vh] overflow-y-auto pr-1">
      {/* HEADER BAR & STUDENT SELECTION */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Penerbitan Surat Keterangan Siswa Non-Aktif
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generator berkas dokumen resmi kelulusan, mutasi, pengunduran diri, & siswa non-aktif.
            </p>
          </div>
        </div>

        {/* Search / Select Student */}
        <div className="w-full sm:w-auto min-w-[240px]">
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
            Pilih Siswa Target ({selectableSiswa.length} Siswa)
          </label>
          <div className="relative">
            <select
              value={selectedSiswaId}
              onChange={(e) => setSelectedSiswaId(e.target.value)}
              className="w-full py-2 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 pr-8"
            >
              {allSiswa.map((s) => {
                const k = appData.kelas.find((item) => item.id === s.kelasId);
                const statusTag = s.status === 'tidak_aktif' || (s as any).status === 'nonaktif' ? '[Non-Aktif]' : '[Aktif]';
                return (
                  <option key={s.id} value={s.id}>
                    {statusTag} {s.nama} - NISN: {s.nisn || '-'} ({k?.nama || 'Tanpa Kelas'})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* TWO COLUMNS CONFIG & LIVE PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: FORM CONFIGURATIONS (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Pengaturan Dokumen Surat</span>
            </h4>

            {/* Jenis Surat Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Jenis / Perihal Surat
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'non_aktif', label: 'Surat Non-Aktif' },
                  { id: 'pindah_sekolah', label: 'Pindah / Mutasi' },
                  { id: 'mengundurkan_diri', label: 'Mengundurkan Diri' },
                  { id: 'lulus_alumni', label: 'Lulus / Alumni' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleJenisSuratChange(type.id as JenisSuratNonAktif)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition border cursor-pointer text-center ${
                      jenisSurat === type.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nomor Surat */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Nomor Surat Keterangan
              </label>
              <input
                type="text"
                value={nomorSurat}
                onChange={(e) => setNomorSurat(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Tanggal Surat */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Tanggal Ditetapkan Surat
              </label>
              <input
                type="date"
                value={tanggalSurat}
                onChange={(e) => setTanggalSurat(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Alasan / Keterangan Status */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Isi Keterangan / Alasan
                </label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline" onClick={() => handleJenisSuratChange(jenisSurat)}>
                  Reset Preset
                </span>
              </div>
              <textarea
                rows={3}
                value={alasanKeterangan}
                onChange={(e) => setAlasanKeterangan(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            {/* Sekolah Tujuan Mutasi (if Pindah) */}
            {jenisSurat === 'pindah_sekolah' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Sekolah Tujuan Mutasi
                </label>
                <input
                  type="text"
                  value={sekolahTujuan}
                  onChange={(e) => setSekolahTujuan(e.target.value)}
                  placeholder="Contoh: SMKN 1 Bandung"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Upload Bukti Surat Fisik / Permohonan Ortu */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-amber-500" />
                <span>Bukti Upload Surat (Foto / Scan / PDF)</span>
              </label>
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{buktiSuratFile ? 'Ganti Bukti Surat' : 'Upload Bukti Surat'}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const res = evt.target?.result as string;
                          if (file.type.startsWith('image/')) {
                            compressBase64Image(res, 900, 0.8, true)
                              .then((comp) => handleSaveBuktiToAppData(comp))
                              .catch(() => handleSaveBuktiToAppData(res));
                          } else {
                            handleSaveBuktiToAppData(res);
                          }
                          onShowToast('File bukti surat berhasil diunggah & disimpan!', 'success');
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                  </label>

                  {buktiSuratFile && (
                    <button
                      type="button"
                      onClick={() => handleSaveBuktiToAppData('')}
                      className="px-2.5 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Hapus Bukti
                    </button>
                  )}
                </div>

                {buktiSuratFile ? (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Bukti Ter-upload ({buktiSuratFile.startsWith('data:image') ? 'Gambar' : 'Dokumen PDF'})
                    </span>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Upload foto/scan surat permohonan dari orang tua, rekomendasi dinas, atau berkas keputusan.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SIGNATORY & TOGGLES BOX */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-500" />
              <span>Pejabat Penandatangan</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Nama Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={namaKepalaSekolah}
                  onChange={(e) => setNamaKepalaSekolah(e.target.value)}
                  className="w-full py-2 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={nipKepalaSekolah}
                  onChange={(e) => setNipKepalaSekolah(e.target.value)}
                  className="w-full py-2 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Checkbox Toggles */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs font-bold">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showKop}
                  onChange={(e) => setShowKop(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-indigo-600"
                />
                <span>Kop Surat Resmi</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStempel}
                  onChange={(e) => setShowStempel(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-indigo-600"
                />
                <span>Stempel Digital</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showQrVerification}
                  onChange={(e) => setShowQrVerification(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-indigo-600"
                />
                <span>QR Keabsahan</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTembusan}
                  onChange={(e) => setShowTembusan(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-indigo-600"
                />
                <span>Tembusan Surat</span>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DOCUMENT PRINT PREVIEW (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-indigo-500" />
              Pratinjau Dokumen Cetak A4 / F4
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? 'Tersalin' : 'Salin Teks'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintDocument}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Surat (PDF)</span>
              </button>
            </div>
          </div>

          {/* MOCK A4 LETTER PREVIEW CARD */}
          <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-xl space-y-4 font-serif text-xs leading-relaxed max-h-[500px] overflow-y-auto select-text">
            {/* KOP SURAT */}
            {showKop && (
              <div className="border-b-4 border-double border-slate-900 pb-3 text-center space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  {sekolah.namaDinas || 'PEMERINTAH PROVINSI JAWA BARAT'}
                </p>
                <p className="text-[11px] font-black uppercase text-slate-800">
                  {sekolah.namaDinasDetail || 'DINAS PENDIDIKAN'}
                </p>
                <h2 className="text-base font-black uppercase tracking-tight text-slate-950">
                  {sekolah.nama || 'SMK NEGERI 6 GARUT'}
                </h2>
                <p className="text-[9px] italic text-slate-600">
                  {sekolah.alamat || 'Jl. Cimanuk No. 309, Garut'} | Telp: {sekolah.telepon || '(0262) 231451'} | NPSN: {sekolah.npsn || '20227483'}
                </p>
              </div>
            )}

            {/* JUDUL SURAT */}
            <div className="text-center space-y-0.5 pt-1">
              <h3 className="text-xs font-black uppercase tracking-wider underline text-slate-900">
                {judulSuratText}
              </h3>
              <p className="text-[10px] font-mono font-bold text-slate-700">
                Nomor: {nomorSurat}
              </p>
            </div>

            {/* ISI SURAT */}
            <div className="space-y-3 text-[11px]">
              <p>
                Yang bertanda tangan di bawah ini Kepala <strong>{sekolah.nama || 'SMK Negeri 6 Garut'}</strong>, Kabupaten Garut, Provinsi Jawa Barat, menerangkan dengan sebenarnya bahwa:
              </p>

              <table className="w-full ml-2 my-2 space-y-1">
                <tbody>
                  <tr>
                    <td className="w-36 font-semibold">Nama Lengkap</td>
                    <td className="w-4">:</td>
                    <td className="font-bold">{selectedSiswa.nama}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">NISN / NIS</td>
                    <td>:</td>
                    <td>{selectedSiswa.nisn || '-'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Tempat, Tgl Lahir</td>
                    <td>:</td>
                    <td>{selectedSiswa.tempatLahir || '-'}, {selectedSiswa.tanggalLahir ? formatDateIndo(selectedSiswa.tanggalLahir) : '-'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Jenis Kelamin</td>
                    <td>:</td>
                    <td>{selectedSiswa.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Kelas Terakhir</td>
                    <td>:</td>
                    <td>{selectedKelas?.nama || '-'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Nama Orang Tua / Wali</td>
                    <td>:</td>
                    <td>{selectedSiswa.namaOrangTua || '-'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Alamat Tempat Tinggal</td>
                    <td>:</td>
                    <td>{selectedSiswa.alamat || '-'}</td>
                  </tr>
                </tbody>
              </table>

              <p>
                Siswa yang bersangkutan terhitung mulai tanggal <strong>{formatDateIndo(tanggalSurat)}</strong> dinyatakan:
              </p>

              <div className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-[10.5px] space-y-1 font-sans">
                <p><strong>Keterangan Status:</strong> {alasanKeterangan}</p>
                {sekolahTujuan && <p><strong>Sekolah Tujuan Mutasi:</strong> {sekolahTujuan}</p>}
              </div>

              <p>
                Demikian Surat Keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
              </p>
            </div>

            {/* TANDA TANGAN */}
            <div className="pt-4 flex items-end justify-between text-[10px]">
              <div className="text-center">
                {showQrVerification && qrUrl && (
                  <div className="inline-block p-1 bg-white border border-slate-300 rounded-lg">
                    <img src={qrUrl} className="w-12 h-12" alt="QR Verify" />
                    <span className="block text-[7px] text-slate-500 font-sans mt-0.5">Keabsahan Digital</span>
                  </div>
                )}
              </div>

              <div className="text-center space-y-0.5">
                <p>Garut, {formatDateIndo(tanggalSurat)}</p>
                <p className="font-bold">{jabatanPenandatangan}</p>
                <div className="h-12 relative flex items-center justify-center">
                  {showStempel && (
                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-indigo-800 text-indigo-800 text-[8px] font-bold font-sans flex items-center justify-center text-center -rotate-12 opacity-80">
                      STEMPEL<br/>SEKOLAH
                    </div>
                  )}
                </div>
                <p className="font-bold text-xs underline">{namaKepalaSekolah}</p>
                <p className="font-mono text-[9px]">NIP. {nipKepalaSekolah}</p>
              </div>
            </div>

            {/* TEMBUSAN */}
            {showTembusan && (
              <div className="pt-2 border-t border-slate-300 text-[9px] text-slate-600 font-sans">
                <p className="font-bold">Tembusan Yth:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Kepala Dinas Pendidikan Provinsi Jawa Barat</li>
                  <li>Orang Tua / Wali Murid Siswa</li>
                  <li>Arsip Bagian Kesiswaan Sekolah</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          * Surat Keterangan resmi tercetak langsung sesuai format standar Kesiswaan Dinas Pendidikan.
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrintDocument}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Surat Keterangan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
