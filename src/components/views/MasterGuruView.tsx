import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  UserCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  FileSpreadsheet,
  Download,
  ArrowUpDown,
  Phone,
  CheckCircle2,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  Info,
  Mail,
  MapPin,
  Calendar,
  Building2,
  Hash,
  User,
  FileText,
  Filter,
  Check,
  LayoutGrid,
  List,
  Camera,
  Upload,
  X
} from 'lucide-react';
import { AppData, WaliKelas, UserSession } from '../../types';
import { Pagination } from '../Pagination';
import { PageHeader } from '../common/UIComponents';
import { addAuditLog, compressBase64Image } from '../../utils/helpers';
import { ImportGuruModal } from './ImportGuruModal';

const NAMA_BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const formatTanggalIndonesia = (dateStr?: string): string => {
  if (!dateStr || !dateStr.trim()) return '';
  const trimmed = dateStr.trim();
  
  // Format YYYY-MM-DD
  const matchIso = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (matchIso) {
    const year = matchIso[1];
    const month = parseInt(matchIso[2], 10) - 1;
    const day = parseInt(matchIso[3], 10);
    if (month >= 0 && month < 12) {
      return `${day} ${NAMA_BULAN_INDONESIA[month]} ${year}`;
    }
  }

  // Format DD-MM-YYYY
  const matchDmy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (matchDmy) {
    const day = parseInt(matchDmy[1], 10);
    const month = parseInt(matchDmy[2], 10) - 1;
    const year = matchDmy[3];
    if (month >= 0 && month < 12) {
      return `${day} ${NAMA_BULAN_INDONESIA[month]} ${year}`;
    }
  }

  // Fallback: Date object
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();
    return `${day} ${NAMA_BULAN_INDONESIA[month]} ${year}`;
  }

  return trimmed;
};

export const formatTTL = (tempatLahir?: string, tanggalLahir?: string): string => {
  const tempat = tempatLahir ? tempatLahir.trim() : '';
  const tglIndo = formatTanggalIndonesia(tanggalLahir);

  if (tempat && tglIndo) {
    return `${tempat}, ${tglIndo}`;
  }
  return tempat || tglIndo || '-';
};

interface MasterGuruViewProps {
  appData: AppData;
  currentUser: UserSession;
  readOnly?: boolean;
  onUpdateAppData: (updated: AppData) => void;
  onOpenModal: (title: string, content: React.ReactNode) => void;
  onCloseModal: () => void;
  onConfirmModal: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AGAMA_OPTIONS = [
  { id: '1', label: '1 - Islam' },
  { id: '2', label: '2 - Kristen' },
  { id: '3', label: '3 - Katolik' },
  { id: '4', label: '4 - Hindu' },
  { id: '5', label: '5 - Buddha' },
  { id: '6', label: '6 - Khonghucu' },
  { id: '7', label: '7 - Lainnya' },
];

export const getAgamaLabel = (id?: string) => {
  if (!id) return '-';
  const match = AGAMA_OPTIONS.find((a) => a.id === String(id).trim());
  if (match) return match.label.replace(/^\d+\s*-\s*/, '');
  return id;
};

interface GuruFormModalContentProps {
  guruToEdit?: WaliKelas;
  appData: AppData;
  onUpdateAppData: (appData: AppData) => void;
  onCloseModal: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const GuruFormModalContent: React.FC<GuruFormModalContentProps> = ({
  guruToEdit,
  appData,
  onUpdateAppData,
  onCloseModal,
  onShowToast,
}) => {
  const [nip, setNip] = useState(guruToEdit?.nip || '');
  const [nama, setNama] = useState(guruToEdit?.nama || '');
  const [nuptk, setNuptk] = useState(guruToEdit?.nuptk || '');
  const [jenisKelamin, setJenisKelamin] = useState(guruToEdit?.jenisKelamin || 'L');
  const [tempatLahir, setTempatLahir] = useState(guruToEdit?.tempatLahir || '');
  const [tanggalLahir, setTanggalLahir] = useState(guruToEdit?.tanggalLahir || '');
  const [nik, setNik] = useState(guruToEdit?.nik || '');
  const [agamaId, setAgamaId] = useState(guruToEdit?.agamaId || '1');
  const [alamat, setAlamat] = useState(guruToEdit?.alamat || '');
  const [rt, setRt] = useState(guruToEdit?.rt || '');
  const [rw, setRw] = useState(guruToEdit?.rw || '');
  const [desaKelurahan, setDesaKelurahan] = useState(guruToEdit?.desaKelurahan || '');
  const [kecamatan, setKecamatan] = useState(guruToEdit?.kecamatan || '');
  const [kota, setKota] = useState(guruToEdit?.kota || '');
  const [kodeWilayah, setKodeWilayah] = useState(guruToEdit?.kodeWilayah || '');
  const [kodePos, setKodePos] = useState(guruToEdit?.kodePos || '');
  const [noHp, setNoHp] = useState(guruToEdit?.noHp || '');
  const [email, setEmail] = useState(guruToEdit?.email || '');

  const [foto, setFoto] = useState(guruToEdit?.foto || '');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // System login fields
  const [username, setUsername] = useState(
    guruToEdit?.username || (nip ? nip : `guru_${Math.floor(1000 + Math.random() * 9000)}`)
  );
  const [password, setPassword] = useState(guruToEdit?.password || '123');
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState('');

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressBase64Image(file, 400, 0.85);
        setFoto(compressed);
      } catch (err) {
        console.error('Error compressing teacher photo:', err);
        onShowToast('Gagal memproses foto guru. Silakan coba file gambar lain.', 'error');
      }
    }
  };

  const handleGeneratePass = () => {
    const rand = Math.floor(100000 + Math.random() * 900000).toString();
    setPassword(rand);
    setShowPass(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');

    if (!nama.trim()) {
      setErr('Nama Guru wajib diisi.');
      return;
    }

    const cleanUsername = (username.trim() || nip.trim() || `guru_${String(nama).toLowerCase().replace(/[^a-z0-9]/g, '')}`).toLowerCase();

    // Check username duplication
    const isDup = appData.waliKelas.some(
      (w) => w.username.toLowerCase() === cleanUsername && w.id !== guruToEdit?.id
    );
    if (isDup) {
      setErr(`Username "${cleanUsername}" sudah digunakan oleh guru lain.`);
      return;
    }

    const guruId = guruToEdit ? guruToEdit.id : `GURU_${Date.now()}`;

    const newGuruObj: WaliKelas = {
      id: guruId,
      nip: nip.trim(),
      nama: nama.trim(),
      nuptk: nuptk.trim(),
      jenisKelamin: jenisKelamin.trim().toUpperCase(),
      tempatLahir: tempatLahir.trim(),
      tanggalLahir: tanggalLahir.trim(),
      nik: nik.trim(),
      agamaId: agamaId.trim(),
      alamat: alamat.trim(),
      rt: rt.trim(),
      rw: rw.trim(),
      desaKelurahan: desaKelurahan.trim(),
      kecamatan: kecamatan.trim(),
      kota: kota.trim(),
      kodeWilayah: kodeWilayah.trim(),
      kodePos: kodePos.trim(),
      noHp: noHp.trim(),
      email: email.trim(),
      username: cleanUsername,
      password: password.trim() || '123',
      role: guruToEdit?.role || 'guru',
      foto: foto.trim(),
      tugasTambahan: guruToEdit?.tugasTambahan || '',
      jabatan: guruToEdit?.jabatan || '',
      mataPelajaran: guruToEdit?.mataPelajaran || '',
      hariMengajar: guruToEdit?.hariMengajar || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
      batasiLoginHariMengajar: Boolean(guruToEdit?.batasiLoginHariMengajar),
    };

    let updatedWali: WaliKelas[];
    if (guruToEdit) {
      updatedWali = appData.waliKelas.map((w) => (w.id === guruToEdit.id ? newGuruObj : w));
    } else {
      updatedWali = [newGuruObj, ...appData.waliKelas];
    }

    const updatedAppData = addAuditLog(
      { ...appData, waliKelas: updatedWali },
      guruToEdit ? 'Edit Biodata Guru' : 'Tambah Biodata Guru Baru',
      `${guruToEdit ? 'Mengubah' : 'Menambah'} biodata guru ${nama.trim()}`
    );
    onUpdateAppData(updatedAppData);

    onCloseModal();
    onShowToast(
      guruToEdit
        ? `Biodata guru ${nama.trim()} berhasil diperbarui!`
        : `Biodata guru baru ${nama.trim()} berhasil ditambahkan!`,
      'success'
    );
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 text-slate-800 dark:text-slate-100 max-h-[80vh] overflow-y-auto pr-1">
      {err && (
        <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* Foto Guru Section */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
        <h4 className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5" />
          <span>Foto Profil Guru</span>
        </h4>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group shrink-0">
            {foto ? (
              <img
                src={foto}
                alt="Preview Foto Guru"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-700 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600">
                <User className="w-8 h-8 opacity-60" />
                <span className="text-[9px] font-semibold mt-1">Tanpa Foto</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2 w-full text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <input
                type="file"
                ref={photoInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Foto Guru</span>
              </button>

              {foto && (
                <button
                  type="button"
                  onClick={() => setFoto('')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hapus Foto</span>
                </button>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Atau masukkan URL / Link Gambar Foto Guru
              </label>
              <input
                type="text"
                value={foto}
                onChange={(e) => setFoto(e.target.value)}
                placeholder="https://... / data:image/..."
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Identitas Pokok */}
      <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <h4 className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          <span>1. Identitas Pokok Guru</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              NIP
            </label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="misal: 198501012010011001"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama lengkap beserta gelar..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              NUPTK
            </label>
            <input
              type="text"
              value={nuptk}
              onChange={(e) => setNuptk(e.target.value)}
              placeholder="16 Digit NUPTK"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Jenis Kelamin
            </label>
            <select
              value={jenisKelamin}
              onChange={(e) => setJenisKelamin(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-semibold"
            >
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tempat Lahir
            </label>
            <input
              type="text"
              value={tempatLahir}
              onChange={(e) => setTempatLahir(e.target.value)}
              placeholder="misal: Kota Bandung"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tanggal Lahir
            </label>
            <input
              type="date"
              value={tanggalLahir}
              onChange={(e) => setTanggalLahir(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              NIK (No. KTP)
            </label>
            <input
              type="text"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              placeholder="16 Digit NIK"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Agama
            </label>
            <select
              value={agamaId}
              onChange={(e) => setAgamaId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-semibold"
            >
              {AGAMA_OPTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Alamat & Kontak */}
      <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <h4 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          <span>2. Tempat Tinggal & Kontak Guru</span>
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Alamat Jalan / Kampung
            </label>
            <input
              type="text"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="misal: Jl. Merdeka No. 45"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                RT
              </label>
              <input
                type="text"
                value={rt}
                onChange={(e) => setRt(e.target.value)}
                placeholder="001"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                RW
              </label>
              <input
                type="text"
                value={rw}
                onChange={(e) => setRw(e.target.value)}
                placeholder="005"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Desa / Kelurahan
              </label>
              <input
                type="text"
                value={desaKelurahan}
                onChange={(e) => setDesaKelurahan(e.target.value)}
                placeholder="Kelurahan..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kecamatan
              </label>
              <input
                type="text"
                value={kecamatan}
                onChange={(e) => setKecamatan(e.target.value)}
                placeholder="Kecamatan..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kota / Kabupaten
              </label>
              <input
                type="text"
                value={kota}
                onChange={(e) => setKota(e.target.value)}
                placeholder="misal: Kota Bandung"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kode Wilayah
              </label>
              <input
                type="text"
                value={kodeWilayah}
                onChange={(e) => setKodeWilayah(e.target.value)}
                placeholder="32.73.05"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kode Pos
              </label>
              <input
                type="text"
                value={kodePos}
                onChange={(e) => setKodePos(e.target.value)}
                placeholder="40235"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                No. HP / WhatsApp
              </label>
              <input
                type="text"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="081234567890"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Guru
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guru@sekolah.sch.id"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Akun Login Sistem */}
      <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <h4 className="text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5" />
          <span>3. Akun Login Sistem Guru</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Username <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username login..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Password</span>
              <button
                type="button"
                onClick={handleGeneratePass}
                className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold underline cursor-pointer"
              >
                Acak Password
              </button>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password login"
                className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCloseModal}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{guruToEdit ? 'Simpan Perubahan' : 'Tambah Guru'}</span>
        </button>
      </div>
    </form>
  );
};

export const MasterGuruView: React.FC<MasterGuruViewProps> = ({
  appData,
  currentUser,
  readOnly = false,
  onUpdateAppData,
  onOpenModal,
  onCloseModal,
  onConfirmModal,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [jkFilter, setJkFilter] = useState<'semua' | 'L' | 'P'>('semua');
  const [agamaFilter, setAgamaFilter] = useState<string>('semua');
  const [sortField, setSortField] = useState<'nama' | 'nip' | 'nuptk' | 'nik' | 'tempatLahir' | 'desaKelurahan' | 'kecamatan' | 'kota'>('nama');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'list'));
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // List of all teachers (biodata)
  const guruList: WaliKelas[] = appData.waliKelas || [];

  // Filter list
  let filteredGuru = guruList.filter((g) => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch =
      !q ||
      (g.nama && g.nama.toLowerCase().includes(q)) ||
      (g.nip && g.nip.toLowerCase().includes(q)) ||
      (g.nuptk && g.nuptk.toLowerCase().includes(q)) ||
      (g.nik && g.nik.toLowerCase().includes(q)) ||
      (g.tempatLahir && g.tempatLahir.toLowerCase().includes(q)) ||
      (g.alamat && g.alamat.toLowerCase().includes(q)) ||
      (g.desaKelurahan && g.desaKelurahan.toLowerCase().includes(q)) ||
      (g.kecamatan && g.kecamatan.toLowerCase().includes(q)) ||
      (g.kota && g.kota.toLowerCase().includes(q)) ||
      (g.email && g.email.toLowerCase().includes(q)) ||
      (g.noHp && g.noHp.toLowerCase().includes(q));

    const gJk = (g.jenisKelamin || '').toUpperCase();
    const matchJk = jkFilter === 'semua' || gJk === jkFilter || (jkFilter === 'L' && (gJk.startsWith('L') || gJk === 'PRIA')) || (jkFilter === 'P' && (gJk.startsWith('P') || gJk === 'WANITA'));

    const matchAgama = agamaFilter === 'semua' || String(g.agamaId || '').trim() === agamaFilter || getAgamaLabel(g.agamaId).toLowerCase() === agamaFilter.toLowerCase();

    return matchSearch && matchJk && matchAgama;
  });

  // Sort list
  filteredGuru = [...filteredGuru].sort((a, b) => {
    let valA: string = '';
    let valB: string = '';

    if (sortField === 'nama') {
      valA = a.nama || '';
      valB = b.nama || '';
    } else if (sortField === 'nip') {
      valA = a.nip || '';
      valB = b.nip || '';
    } else if (sortField === 'nuptk') {
      valA = a.nuptk || '';
      valB = b.nuptk || '';
    } else if (sortField === 'nik') {
      valA = a.nik || '';
      valB = b.nik || '';
    } else if (sortField === 'tempatLahir') {
      valA = a.tempatLahir || '';
      valB = b.tempatLahir || '';
    } else if (sortField === 'desaKelurahan') {
      valA = a.desaKelurahan || '';
      valB = b.desaKelurahan || '';
    } else if (sortField === 'kecamatan') {
      valA = a.kecamatan || '';
      valB = b.kecamatan || '';
    } else if (sortField === 'kota') {
      valA = a.kota || '';
      valB = b.kota || '';
    }

    const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: 'nama' | 'nip' | 'nuptk' | 'nik' | 'tempatLahir' | 'desaKelurahan' | 'kecamatan' | 'kota') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Pagination calculation
  const validPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
  const validCurrentPage = Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1;
  const totalPages = Math.ceil(filteredGuru.length / validPageSize) || 1;
  const startIdx = (validCurrentPage - 1) * validPageSize;
  const pagedGuru = filteredGuru.slice(startIdx, startIdx + validPageSize);

  // Statistics
  const totalGuru = guruList.length;
  const totalLaki = guruList.filter((g) => {
    const jk = (g.jenisKelamin || '').toUpperCase();
    return jk === 'L' || jk.startsWith('L') || jk === 'PRIA';
  }).length;
  const totalPerempuan = guruList.filter((g) => {
    const jk = (g.jenisKelamin || '').toUpperCase();
    return jk === 'P' || jk.startsWith('P') || jk === 'WANITA';
  }).length;
  const totalNuptk = guruList.filter((g) => g.nuptk && g.nuptk.trim() !== '' && g.nuptk !== '-').length;

  // View Teacher Detail Modal
  const handleViewDetailGuru = (guru: WaliKelas) => {
    onOpenModal(
      `Biodata Guru: ${guru.nama}`,
      <div className="space-y-4 text-slate-800 dark:text-slate-100">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-850 border border-blue-100 dark:border-slate-700">
            {guru.foto ? (
              <img
                src={guru.foto}
                alt={guru.nama}
                className="w-14 h-14 rounded-2xl object-cover shadow-md shrink-0 border-2 border-white dark:border-slate-700"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
                {guru.nama ? guru.nama.charAt(0).toUpperCase() : 'G'}
              </div>
            )}
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{guru.nama}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-mono">
                  NIP: {guru.nip || '-'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 font-mono">
                  NUPTK: {guru.nuptk || '-'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                  {guru.jenisKelamin === 'L' || guru.jenisKelamin?.toUpperCase().startsWith('L') ? 'Laki-laki (L)' : guru.jenisKelamin === 'P' || guru.jenisKelamin?.toUpperCase().startsWith('P') ? 'Perempuan (P)' : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Box 1: Identitas Pribadi */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <User className="w-3.5 h-3.5" />
                <span>Identitas Pribadi</span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">NIK</span>
                  <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{guru.nik || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Agama</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{getAgamaLabel(guru.agamaId)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Tempat Lahir</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{guru.tempatLahir || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Tanggal Lahir</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatTanggalIndonesia(guru.tanggalLahir) || guru.tanggalLahir || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Box 2: Kontak & Komunikasi */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Phone className="w-3.5 h-3.5" />
                <span>Kontak & Akun</span>
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">Nomor HP / WhatsApp</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    {guru.noHp || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Email</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{guru.email || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Username Login</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">@{guru.username}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Box 3: Domisili / Alamat Lengkap */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <MapPin className="w-3.5 h-3.5" />
              <span>Alamat & Wilayah Tempat Tinggal</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-2 sm:col-span-4">
                <span className="text-[10px] text-slate-400 block">Alamat Lengkap</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{guru.alamat || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">RT / RW</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {guru.rt ? `RT ${guru.rt}` : '-'} / {guru.rw ? `RW ${guru.rw}` : '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Desa / Kelurahan</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{guru.desaKelurahan || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Kecamatan</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{guru.kecamatan || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Kota / Kabupaten</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{guru.kota || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Kode Pos / Wilayah</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {guru.kodePos || '-'} {guru.kodeWilayah ? `(${guru.kodeWilayah})` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onCloseModal}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
    );
  };

  // Reset Password Handler
  const handleResetPassword = (guru: WaliKelas) => {
    if (readOnly) return;
    onConfirmModal(
      'Reset Password Guru',
      `Apakah Anda yakin ingin mereset password untuk guru "${guru.nama}" menjadi default: 123 ?`,
      'warning',
      () => {
        const updatedWali = appData.waliKelas.map((w) =>
          w.id === guru.id ? { ...w, password: '123' } : w
        );
        const updatedAppData = addAuditLog(
          { ...appData, waliKelas: updatedWali },
          'Reset Password Guru',
          `Reset password guru ${guru.nama} (${guru.username}) ke default 123`
        );
        onUpdateAppData(updatedAppData);
        onShowToast(`Password untuk ${guru.nama} berhasil direset ke "123"!`, 'success');
      }
    );
  };

  // Delete Handler
  const handleDeleteGuru = (guru: WaliKelas) => {
    if (readOnly) return;

    onConfirmModal(
      'Hapus Data Guru',
      `Apakah Anda yakin ingin menghapus data biodata guru "${guru.nama}" (${guru.nip || guru.nuptk || guru.username})? Tindakan ini tidak dapat dibatalkan.`,
      'danger',
      () => {
        const updatedWali = appData.waliKelas.filter((w) => w.id !== guru.id);
        const updatedKelas = appData.kelas.map((k) =>
          k.waliKelasId === guru.id ? { ...k, waliKelasId: '' } : k
        );

        const updatedAppData = addAuditLog(
          { ...appData, waliKelas: updatedWali, kelas: updatedKelas },
          'Hapus Data Guru',
          `Menghapus guru ${guru.nama} (${guru.username})`
        );
        onUpdateAppData(updatedAppData);
        onShowToast(`Data guru ${guru.nama} berhasil dihapus.`, 'success');
      }
    );
  };

  // Delete All Guru Handler
  const handleDeleteAllGuru = () => {
    if (readOnly || (appData.waliKelas || []).length === 0) return;

    onConfirmModal(
      'Hapus SEMUA Data Guru',
      `PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA biodata guru (${appData.waliKelas.length} data guru)? Tindakan ini akan mengosongkan seluruh data biodata guru.`,
      'danger',
      () => {
        const updatedKelas = (appData.kelas || []).map((k) => ({
          ...k,
          waliKelasId: '',
        }));

        const updatedAppData = addAuditLog(
          { ...appData, waliKelas: [], kelas: updatedKelas },
          'Hapus Semua Data Guru',
          `Menghapus seluruh biodata guru (${appData.waliKelas.length} guru).`
        );
        onUpdateAppData(updatedAppData);
        onShowToast('Semua data guru berhasil dihapus.', 'success');
      }
    );
  };

  // Open Form Modal (Add / Edit) - Strictly Biodata
  const handleOpenGuruModal = (guruToEdit?: WaliKelas) => {
    if (readOnly) return;

    onOpenModal(
      guruToEdit ? `Edit Biodata Guru: ${guruToEdit.nama}` : 'Tambah Biodata Guru Baru',
      <GuruFormModalContent
        guruToEdit={guruToEdit}
        appData={appData}
        onUpdateAppData={onUpdateAppData}
        onCloseModal={onCloseModal}
        onShowToast={onShowToast}
      />
    );
  };

  // Handle successful import from ImportGuruModal
  const handleImportSuccess = (importedCount: number, updatedCount: number, newWaliList: WaliKelas[]) => {
    const updatedAppData = addAuditLog(
      { ...appData, waliKelas: newWaliList },
      'Import Biodata Guru',
      `Import Excel biodata guru selesai: ${importedCount} guru baru ditambahkan, ${updatedCount} diperbarui. Total guru: ${newWaliList.length}.`
    );
    onUpdateAppData(updatedAppData);
    onShowToast(
      `Import Selesai! ${importedCount} data guru baru ditambahkan, ${updatedCount} diperbarui. Total guru sekarang: ${newWaliList.length}.`,
      'success'
    );
  };

  // Download Clean 18-Column Excel Template (Only 1 clear sample guide row)
  const handleDownloadTemplate = (isDemo = false) => {
    let templateRows: any[] = [];

    if (!isDemo) {
      // 1 single guide row clearly labeled so it won't be confused with real teacher data
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
      ];
    }

    const ws = XLSX.utils.json_to_sheet(templateRows);
    ws['!cols'] = [
      { wch: 22 }, // nip
      { wch: 25 }, // nama
      { wch: 20 }, // nuptk
      { wch: 20 }, // nik
      { wch: 15 }, // jenis_kelamin
      { wch: 18 }, // tempat_lahir
      { wch: 15 }, // tanggal_lahir
      { wch: 10 }, // agama_id
      { wch: 30 }, // alamat
      { wch: 8 },  // rt
      { wch: 8 },  // rw
      { wch: 20 }, // desa_kelurahan
      { wch: 20 }, // kecamatan
      { wch: 20 }, // kota
      { wch: 15 }, // kode_wilayah
      { wch: 12 }, // kode_pos
      { wch: 16 }, // no_hp
      { wch: 28 }, // email
      { wch: 22 }, // mata_pelajaran
      { wch: 24 }, // jabatan
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isDemo ? 'Demo Guru' : 'Template Guru');
    XLSX.writeFile(wb, isDemo ? 'Template_Demo_Guru_Lengkap.xlsx' : 'Template_Import_Guru_Siap_Diisi.xlsx');
    onShowToast(`Template Excel Guru ${isDemo ? 'Demo' : 'Siap Diisi'} berhasil diunduh!`, 'info');
  };

  // Export Data Guru in Exact Columns
  const handleExportExcel = () => {
    const dataToExport = filteredGuru.map((g) => ({
      nip: g.nip || '',
      nama: g.nama || '',
      nuptk: g.nuptk || '',
      nik: g.nik || '',
      jenis_kelamin: g.jenisKelamin || '',
      tempat_lahir: g.tempatLahir || '',
      tanggal_lahir: g.tanggalLahir || '',
      agama_id: g.agamaId || '',
      alamat: g.alamat || '',
      rt: g.rt || '',
      rw: g.rw || '',
      desa_kelurahan: g.desaKelurahan || '',
      kecamatan: g.kecamatan || '',
      kota: g.kota || '',
      kode_wilayah: g.kodeWilayah || '',
      kode_pos: g.kodePos || '',
      no_hp: g.noHp || '',
      email: g.email || '',
      mata_pelajaran: g.mataPelajaran || '',
      jabatan: g.jabatan || g.tugasTambahan || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [
      { wch: 22 }, // nip
      { wch: 25 }, // nama
      { wch: 20 }, // nuptk
      { wch: 20 }, // nik
      { wch: 15 }, // jenis_kelamin
      { wch: 18 }, // tempat_lahir
      { wch: 15 }, // tanggal_lahir
      { wch: 10 }, // agama_id
      { wch: 30 }, // alamat
      { wch: 8 },  // rt
      { wch: 8 },  // rw
      { wch: 20 }, // desa_kelurahan
      { wch: 20 }, // kecamatan
      { wch: 20 }, // kota
      { wch: 15 }, // kode_wilayah
      { wch: 12 }, // kode_pos
      { wch: 16 }, // no_hp
      { wch: 28 }, // email
      { wch: 22 }, // mata_pelajaran
      { wch: 24 }, // jabatan
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Master Guru');
    XLSX.writeFile(wb, `Master_Data_Guru_Biodata_${new Date().toISOString().slice(0, 10)}.xlsx`);
    onShowToast('Master Biodata Guru berhasil diexport ke Excel!', 'success');
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Master Data Biodata Guru"
        description="Pusat data biodata lengkap seluruh tenaga pendidik (guru) sesuai format data resmi sekolah: NIP, NUPTK, NIK, Tempat/Tgl Lahir, Alamat, Wilayah, Kontak, dan Email."
        icon={Users}
        actions={
          !readOnly ? (
            <button
              type="button"
              onClick={() => handleOpenGuruModal()}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Guru Baru</span>
            </button>
          ) : undefined
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{totalGuru}</div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Tenaga Pendidik</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{totalLaki}</div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Laki-laki (L)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{totalPerempuan}</div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Perempuan (P)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{totalNuptk}</div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tercatat NUPTK</div>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari NAMA, NIP, NUPTK, NIK, TEMPAT LAHIR, ALAMAT, KECAMATAN, NO HP..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: List & Grid */}
            <div className="flex items-center bg-slate-150 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Tampilan Tabel / List"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Tampilan Kartu / Grid"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>

            {/* JK Filter */}
            <select
              value={jkFilter}
              onChange={(e) => {
                setJkFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
            >
              <option value="semua">Semua Gender (L/P)</option>
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>

            {/* Agama Filter */}
            <select
              value={agamaFilter}
              onChange={(e) => {
                setAgamaFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
            >
              <option value="semua">Semua Agama</option>
              {AGAMA_OPTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>

            {/* Excel Actions */}
            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Buka Wizard Import Excel Guru (Validasi, Mapping, dan Preview Lengkap)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Import Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadTemplate(false)}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Unduh Format Template Excel Biodata Guru (Siap Diisi)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Template</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Export Data Biodata Guru ke Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {!readOnly && (appData.waliKelas || []).length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllGuru}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Hapus Seluruh Data Biodata Guru"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hapus Semua</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area: List View or Grid View */}
      {viewMode === 'grid' ? (
        <div className="space-y-4">
          {pagedGuru.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-12 text-center text-slate-400">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Users className="w-8 h-8 opacity-40" />
                <p className="font-bold">Tidak ada data guru ditemukan.</p>
                <p className="text-[11px] text-slate-500">
                  Coba sesuaikan kata kunci pencarian.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {pagedGuru.map((guru, index) => {
                const globalIdx = startIdx + index + 1;
                const fullNama = guru.nama;
                const ttl = formatTTL(guru.tempatLahir, guru.tanggalLahir);

                return (
                  <div
                    key={guru.id}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700/60 transition duration-150 flex flex-col justify-between p-4"
                  >
                    <div>
                      {/* Card Header: Avatar, Nama, No */}
                      <div className="flex items-start justify-between gap-2.5 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {guru.foto ? (
                            <img
                              src={guru.foto}
                              alt={guru.nama}
                              className="w-10 h-10 rounded-2xl object-cover shrink-0 shadow-xs border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-sm shrink-0 shadow-xs">
                              {guru.nama ? guru.nama.charAt(0).toUpperCase() : 'G'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate" title={fullNama}>
                              {fullNama}
                            </h4>
                            <span className="text-[11px] text-slate-400 font-mono block truncate">
                              @{guru.username}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                          #{globalIdx}
                        </span>
                      </div>

                      {/* Card Body: NIP & TTL */}
                      <div className="space-y-2 py-2.5 border-t border-b border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-400">NIP</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {guru.nip || <span className="text-slate-400 font-normal font-sans">-</span>}
                          </span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-semibold text-slate-400">TTL</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
                            {ttl}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Action Buttons */}
                    <div className="flex items-center justify-end gap-1.5 pt-3 mt-1">
                      <button
                        type="button"
                        onClick={() => handleViewDetailGuru(guru)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1 cursor-pointer"
                        title="Lihat Detail Lengkap Biodata Guru"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>

                      {!readOnly && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleResetPassword(guru)}
                            className="p-1.5 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                            title="Reset Password ke default 123"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenGuruModal(guru)}
                            className="p-1.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                            title="Edit Biodata Guru"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteGuru(guru)}
                            className="p-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                            title="Hapus Biodata Guru"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination for Grid View */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-4">
            <Pagination
              currentPage={validCurrentPage}
              totalPages={totalPages}
              pageSize={validPageSize}
              totalItems={filteredGuru.length}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      ) : (
        /* Table Data Guru Biodata (List View) */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition w-48"
                    onClick={() => handleSort('nip')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>NIP</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
                    onClick={() => handleSort('nama')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nama</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
                    onClick={() => handleSort('tempatLahir')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>TTL (Tempat, Tanggal Lahir)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-200">
                {pagedGuru.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="w-8 h-8 opacity-40" />
                        <p className="font-bold">Tidak ada data guru ditemukan.</p>
                        <p className="text-[11px] text-slate-500">
                          Coba sesuaikan kata kunci pencarian.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedGuru.map((guru, index) => {
                    const globalIdx = startIdx + index + 1;
                    const fullNama = guru.nama;
                    const ttl = formatTTL(guru.tempatLahir, guru.tanggalLahir);

                    return (
                      <tr
                        key={guru.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition duration-150"
                      >
                        <td className="py-3 px-3 text-center font-bold text-slate-400">
                          {globalIdx}
                        </td>

                        {/* NIP */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {guru.nip || <span className="text-slate-400 font-normal font-sans">-</span>}
                        </td>

                        {/* Nama */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {guru.foto ? (
                              <img
                                src={guru.foto}
                                alt={guru.nama}
                                className="w-8 h-8 rounded-full object-cover shrink-0 shadow-xs border border-slate-200 dark:border-slate-700"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                                {guru.nama ? guru.nama.charAt(0).toUpperCase() : 'G'}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {fullNama}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                @{guru.username}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* TTL */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {ttl}
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleViewDetailGuru(guru)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Lihat Detail Lengkap Biodata Guru"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            {!readOnly && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleResetPassword(guru)}
                                  className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                                  title="Reset Password ke default 123"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenGuruModal(guru)}
                                  className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                                  title="Edit Biodata Guru"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteGuru(guru)}
                                  className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                  title="Hapus Biodata Guru"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Pagination
              currentPage={validCurrentPage}
              totalPages={totalPages}
              pageSize={validPageSize}
              totalItems={filteredGuru.length}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal Wizard Import Guru */}
      <ImportGuruModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        appData={appData}
        onImportSuccess={handleImportSuccess}
        onShowToast={onShowToast}
      />
    </div>
  );
};
