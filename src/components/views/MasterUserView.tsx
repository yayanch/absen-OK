import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  UserCheck,
  UserCog,
  ShieldCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  Lock,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Trash,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  BookOpen,
  Clock,
  List,
  LayoutGrid
} from 'lucide-react';
import { AppData, UserRole, UserSession } from '../../types';
import { Pagination } from '../Pagination';
import { PageHeader } from '../common/UIComponents';
import { addAuditLog, cleanMapelName } from '../../utils/helpers';

interface MasterUserViewProps {
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

export interface UserItem {
  id: string;
  nama: string;
  username: string;
  nip: string;
  password: string;
  role: UserRole;
  originalType: 'admin' | 'kesiswaan' | 'wali' | 'user';
  noHp?: string;
  foto?: string;
  kelasNama?: string;
  mataPelajaran?: string;
  hariMengajar?: string[];
  batasiLoginHariMengajar?: boolean;
}

export const MasterUserView: React.FC<MasterUserViewProps> = ({
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
  const [roleTab, setRoleTab] = useState<'semua' | UserRole>('semua');
  const [sortField, setSortField] = useState<'nama' | 'username' | 'role' | 'kelasNama'>('nama');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compile full user list from appData
  const buildUserList = (): UserItem[] => {
    const list: UserItem[] = [];

    // 1. Admin
    if (appData.admin) {
      list.push({
        id: 'USER_ADMIN',
        nama: appData.admin.nama || 'Administrator Utama',
        username: appData.admin.username || 'admin',
        nip: '198001011999011001',
        password: appData.admin.password || '',
        role: 'admin',
        originalType: 'admin',
        foto: appData.admin.foto,
      });
    }

    const effectiveWaliKelas = [...(appData.waliKelas || [])];

    // Ensure default Kesiswaan exists if not in waliKelas
    if (!effectiveWaliKelas.some((w) => w.role === 'kesiswaan')) {
      const kesiswaanObj = appData.kesiswaan || {
        username: 'kesiswaan',
        password: '',
        nama: 'Tim WKS Kesiswaan & BP BK',
        jabatan: 'WKS Kesiswaan / BP BK',
      };
      effectiveWaliKelas.push({
        id: 'USER_KESISWAAN',
        nip: '198202022005011002',
        nama: kesiswaanObj.nama || 'Tim WKS Kesiswaan & BP BK',
        username: kesiswaanObj.username || 'kesiswaan',
        password: kesiswaanObj.password || '',
        noHp: '',
        role: 'kesiswaan',
        foto: kesiswaanObj.foto,
      });
    }

    // Ensure default Guru / User Biasa exists if not in waliKelas
    if (!effectiveWaliKelas.some((w) => w.role === 'user' || w.role === 'guru')) {
      const userBiasaObj = appData.userBiasa || {
        username: 'guru',
        password: '',
        nama: 'Guru / Staf Pengajar',
        jabatan: 'Guru Pengampu',
        mataPelajaran: 'Pendidikan Pancasila',
        hariMengajar: ['Senin', 'Rabu', 'Jumat'],
        batasiLoginHariMengajar: false,
      };
      effectiveWaliKelas.push({
        id: 'USER_BIASA',
        nip: '-',
        nama: userBiasaObj.nama || 'Guru / Staf Pengajar',
        username: userBiasaObj.username || 'guru',
        password: userBiasaObj.password || '',
        noHp: '',
        role: 'guru',
        foto: userBiasaObj.foto,
        mataPelajaran: userBiasaObj.mataPelajaran,
        hariMengajar: userBiasaObj.hariMengajar,
        batasiLoginHariMengajar: userBiasaObj.batasiLoginHariMengajar,
      });
    }

    effectiveWaliKelas.forEach((w) => {
      const userRole: UserRole = w.role && ['admin', 'wali', 'kesiswaan', 'user', 'guru', 'kurikulum', 'hubin'].includes(w.role) ? w.role : 'wali';
      const k = userRole === 'wali' ? appData.kelas.find((kl) => kl.waliKelasId === w.id) : undefined;
      let effectivePassword = w.password || '';
      if (userRole === 'kesiswaan' && appData.kesiswaan?.password) {
        effectivePassword = w.password || appData.kesiswaan.password;
      }
      if ((userRole === 'user' || userRole === 'guru') && appData.userBiasa?.password) {
        effectivePassword = w.password || appData.userBiasa.password;
      }
      list.push({
        id: w.id,
        nama: w.nama,
        username: w.username || w.nip,
        nip: w.nip || '-',
        password: effectivePassword,
        role: userRole,
        originalType: userRole === 'kesiswaan' ? 'kesiswaan' : (userRole === 'user' || userRole === 'guru') ? 'user' : 'wali',
        noHp: w.noHp,
        foto: w.foto,
        kelasNama: k ? k.nama : undefined,
        mataPelajaran: w.mataPelajaran,
        hariMengajar: w.hariMengajar,
        batasiLoginHariMengajar: w.batasiLoginHariMengajar,
      });
    });

    // Add Siswa / Murid
    (appData.siswa || []).forEach((s) => {
      const k = appData.kelas.find((kl) => kl.id === s.kelasId);
      list.push({
        id: s.id,
        nama: s.nama,
        username: s.username || s.nisn,
        nip: s.nisn,
        password: s.password !== undefined && s.password !== '' ? s.password : (s.nisn || ''),
        role: 'murid',
        originalType: 'user',
        noHp: s.noWa,
        foto: s.foto,
        kelasNama: k ? k.nama : undefined,
      });
    });

    return list.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
  };

  const allUsers = buildUserList();

  let filteredUsers = allUsers.filter((u) => {
    if (roleTab !== 'semua') {
      if ((roleTab === 'user' || roleTab === 'guru') && !(u.role === 'user' || u.role === 'guru')) return false;
      if ((roleTab === 'murid' || roleTab === 'siswa') && !(u.role === 'murid' || u.role === 'siswa')) return false;
      if (roleTab !== 'user' && roleTab !== 'guru' && roleTab !== 'murid' && roleTab !== 'siswa' && u.role !== roleTab) return false;
    }
    const q = searchTerm.toLowerCase();
    return (
      u.nama.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.nip.toLowerCase().includes(q) ||
      (u.noHp && u.noHp.toLowerCase().includes(q))
    );
  });

  filteredUsers = [...filteredUsers].sort((a, b) => {
    let valA = '';
    let valB = '';

    if (sortField === 'nama') {
      valA = a.nama || '';
      valB = b.nama || '';
    } else if (sortField === 'username') {
      valA = a.username || '';
      valB = b.username || '';
    } else if (sortField === 'role') {
      valA = a.role || '';
      valB = b.role || '';
    } else if (sortField === 'kelasNama') {
      valA = a.kelasNama || '';
      valB = b.kelasNama || '';
    }

    const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: 'nama' | 'username' | 'role' | 'kelasNama') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [];
    const names = [
      { nama: 'Drs. Ahmad Fauzi, M.Pd', role: 'wali' },
      { nama: 'Siti Aminah, S.Pd', role: 'wali' },
      { nama: 'Bambang Suryadi, S.T.', role: 'wali' },
    ];

    for (let i = 1; i <= 30; i++) {
      const idx = (i - 1) % names.length;
      const nip = `198${(i % 10)}010120050110${String(100 + i).slice(1)}`;
      templateData.push({
        NIP: nip,
        NAMA: `${names[idx].nama} ${i}`,
        USERNAME: `wali_kelas_${i}`,
        PASSWORD: '123',
        NOHP: `0812345${String(10000 + i)}`,
      });
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 22 },
      { wch: 34 },
      { wch: 22 },
      { wch: 15 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Wali Kelas');
    XLSX.writeFile(wb, 'Template_Import_Wali_Kelas_User.xlsx');
    onShowToast('Template Excel Wali Kelas & User berhasil diunduh!', 'success');
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!rows || rows.length === 0) {
          onShowToast('File Excel kosong atau format tidak sesuai!', 'error');
          return;
        }

        let addedCount = 0;
        const newWaliList = [...appData.waliKelas];

        rows.forEach((r) => {
          const nip = String(r.NIP || r.nip || r.Nip || r['No Induk'] || '').trim();
          const nama = String(r.NAMA || r.nama || r.Nama || r['Nama Lengkap'] || r['NAMA LENGKAP'] || '').trim();
          const username = String(r.USERNAME || r.username || r.Username || r.User || nip).trim();
          const password = String(r.PASSWORD || r.password || r.Password || '123').trim();
          const noHp = String(
            r.NOHP || r.nohp || r.no_hp || r.HP || r.Hp || r['No HP'] || r['No. HP'] || r['NO HP'] || ''
          ).trim();

          if (nama) {
            const exists = newWaliList.find(
              (w) =>
                (nip && w.nip === nip) ||
                (username && w.username === username) ||
                w.nama.toLowerCase() === nama.toLowerCase()
            );

            if (!exists) {
              newWaliList.push({
                id: 'WAL_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                nip: nip || username,
                nama,
                username: username || nip,
                password: password || '123',
                noHp,
              });
              addedCount++;
            }
          }
        });

        if (addedCount > 0) {
          onUpdateAppData({ ...appData, waliKelas: newWaliList });
          onShowToast(`Berhasil mengimpor ${addedCount} data Wali Kelas / User dari Excel!`, 'success');
        } else {
          onShowToast('Tidak ada data baru yang ditambahkan (semua data sudah ada dalam sistem).', 'info');
        }
      } catch (err) {
        onShowToast('Gagal membaca file Excel. Pastikan format file valid!', 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleHapusSeluruhWali = () => {
    if (appData.waliKelas.length === 0) {
      onShowToast('Data Wali Kelas sudah kosong!', 'warning');
      return;
    }
    onConfirmModal(
      'Hapus Seluruh Wali Kelas',
      'Apakah Anda yakin ingin menghapus SELURUH data Wali Kelas dari sistem?',
      'danger',
      () => {
        onUpdateAppData({ ...appData, waliKelas: [] });
        onShowToast('Seluruh data Wali Kelas berhasil dibersihkan!', 'success');
      }
    );
  };

  const handleHapusSeluruhMurid = () => {
    if (!appData.siswa || appData.siswa.length === 0) {
      onShowToast('Data Siswa / Murid sudah kosong!', 'warning');
      return;
    }
    onConfirmModal(
      'Hapus Seluruh Siswa / Murid',
      `Apakah Anda yakin ingin menghapus SELURUH ${appData.siswa.length} data Siswa / Murid dari sistem?`,
      'danger',
      () => {
        onUpdateAppData({ ...appData, siswa: [] });
        onShowToast('Seluruh data Siswa / Murid berhasil dihapus!', 'success');
      }
    );
  };

  const validPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
  const validCurrentPage = Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1;
  const totalPages = Math.ceil(filteredUsers.length / validPageSize) || 1;
  const startIdx = (validCurrentPage - 1) * validPageSize;
  const pagedUsers = filteredUsers.slice(startIdx, startIdx + validPageSize);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'kesiswaan':
        return 'WKS Kesiswaan / BP BK';
      case 'kurikulum':
        return 'WKS Kurikulum';
      case 'hubin':
        return 'WKS Hubin';
      case 'guru':
      case 'user':
        return 'Guru';
      case 'wali':
        return 'Wali Kelas';
      case 'murid':
      case 'siswa':
        return 'Murid / Siswa';
      default:
        const custom = appData.customRoles?.find((r) => r.id === role || r.name === role);
        return custom ? custom.label : role;
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    const custom = appData.customRoles?.find((r) => r.id === role || r.name === role);
    if (custom) {
      switch (custom.color) {
        case 'blue':
          return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800';
        case 'purple':
          return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800';
        case 'cyan':
          return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-800';
        case 'amber':
          return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
        case 'emerald':
          return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
        case 'rose':
          return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800';
        case 'teal':
          return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800';
        default:
          return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800';
      }
    }
    switch (role) {
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800';
      case 'kesiswaan':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800';
      case 'kurikulum':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800';
      case 'hubin':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-800';
      case 'guru':
      case 'user':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
      case 'wali':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
      case 'murid':
      case 'siswa':
        return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleOpenCreateRoleModal = () => {
    if (readOnly) {
      onShowToast('Akses dibatasi! Hanya Administrator yang dapat membuat role baru.', 'warning');
      return;
    }

    const RoleFormContent = () => {
      const [name, setName] = useState('');
      const [color, setColor] = useState('indigo');

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              onShowToast('Nama role tidak boleh kosong!', 'error');
              return;
            }
            const roleId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const currentCustomRoles = appData.customRoles || [];
            if (currentCustomRoles.some((r) => r.id === roleId || r.name.toLowerCase() === name.toLowerCase())) {
              onShowToast('Role dengan nama tersebut sudah ada!', 'warning');
              return;
            }

            const newRoleObj = {
              id: roleId,
              name: roleId,
              label: name.trim(),
              color: color,
            };

            onUpdateAppData({
              ...appData,
              customRoles: [...currentCustomRoles, newRoleObj],
            });

            onShowToast(`Role baru "${name}" berhasil dibuat!`, 'success');
            onCloseModal();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
              Nama Role / Jabatan Baru
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Pembina Pramuka, Staf TU, dll"
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
              Warna Badge / Tema
            </label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="indigo">Indigo / Ungu Biru</option>
              <option value="blue">Biru Utama</option>
              <option value="purple">Ungu Kesiswaan</option>
              <option value="cyan">Cyan / Toska</option>
              <option value="amber">Amber / Kuning</option>
              <option value="emerald">Emerald / Hijau</option>
              <option value="rose">Rose / Merah Muda</option>
              <option value="teal">Teal</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCloseModal}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-theme-primary hover:bg-theme-primary-dark text-white font-bold rounded-xl text-xs shadow-md shadow-theme-primary/30 transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Role Baru</span>
            </button>
          </div>
        </form>
      );
    };

    onOpenModal('Buat Role / Jabatan Baru', <RoleFormContent />);
  };

  const handleOpenManageRolesModal = () => {
    if (readOnly) {
      onShowToast('Akses dibatasi! Hanya Administrator yang dapat mengelola role.', 'warning');
      return;
    }

    const ManageRolesContent = () => {
      const customRoles = appData.customRoles || [];

      if (customRoles.length === 0) {
        return (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs font-medium">
            Belum ada role kustom yang dibuat.
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola daftar role / jabatan kustom yang telah dibuat. Menghapus role akan mengembalikan pengguna dengan role tersebut menjadi Guru.
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1">
            {customRoles.map((role) => {
              const count = allUsers.filter((u) => u.role === role.id || u.role === role.name).length;
              return (
                <div key={role.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{role.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">ID: {role.id} • {count} pengguna aktif</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onConfirmModal(
                        `Hapus Role "${role.label}"`,
                        `Apakah Anda yakin ingin menghapus role "${role.label}"? ${count} pengguna akan dikembalikan rolenya menjadi Guru.`,
                        'danger',
                        () => {
                          const updatedCustomRoles = (appData.customRoles || []).filter((r) => r.id !== role.id);
                          const updatedWaliKelas = appData.waliKelas.map((w) => {
                            if (w.role === role.id || w.role === role.name) {
                              return { ...w, role: 'guru' };
                            }
                            return w;
                          });
                          onUpdateAppData({
                            ...appData,
                            customRoles: updatedCustomRoles,
                            waliKelas: updatedWaliKelas,
                          });
                          onShowToast(`Role "${role.label}" berhasil dihapus!`, 'success');
                          onCloseModal();
                        }
                      );
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    onOpenModal('Kelola & Hapus Role Kustom', <ManageRolesContent />);
  };

  // Change Role Handler via dropdown
  const handleRoleChange = (user: UserItem, newRole: UserRole) => {
    if (user.role === newRole) return;

    if (readOnly) {
      onShowToast('Akses dibatasi! Hanya Administrator yang dapat mengubah role.', 'warning');
      return;
    }

    if (newRole === 'admin') {
      onShowToast('Role Administrator utama tidak dapat dipindah melalui tabel.', 'warning');
      return;
    }

    let updatedWaliKelas = [...appData.waliKelas];
    let updatedSiswa = [...(appData.siswa || [])];

    if (user.role === 'murid' && newRole !== 'murid') {
      // Adding to staff/waliKelas
      updatedWaliKelas.push({
        id: user.id.startsWith('SISWA_') ? 'WAL_' + Date.now() : user.id,
        nip: user.nip && user.nip !== '-' ? user.nip : user.username,
        nama: user.nama,
        username: user.username,
        password: user.password,
        noHp: user.noHp || '',
        role: newRole,
        foto: user.foto,
      });
    } else if (newRole === 'murid') {
      // Moving to murid
      updatedWaliKelas = updatedWaliKelas.filter((w) => w.id !== user.id && w.username !== user.username);
      const studentExists = updatedSiswa.find((s) => s.id === user.id || s.username === user.username);
      if (!studentExists) {
        updatedSiswa.push({
          id: user.id.startsWith('WAL_') || user.id.startsWith('USER_') ? 'SISWA_' + Date.now() : user.id,
          nama: user.nama,
          nisn: user.nip && user.nip !== '-' ? user.nip : user.username,
          username: user.username,
          password: user.password || '123',
          kelasId: appData.kelas[0]?.id || '',
          noWa: user.noHp || '',
          gender: 'L',
          foto: user.foto,
        });
      }
    } else {
      const exists = updatedWaliKelas.find((w) => w.id === user.id || w.username === user.username);
      if (exists) {
        updatedWaliKelas = updatedWaliKelas.map((w) =>
          w.id === exists.id || w.username === user.username
            ? { ...w, role: newRole, nama: user.nama, username: user.username, password: user.password, nip: user.nip && user.nip !== '-' ? user.nip : w.nip, noHp: user.noHp || w.noHp, foto: user.foto || w.foto }
            : w
        );
      } else {
        updatedWaliKelas.push({
          id: user.id.startsWith('USER_') ? 'WAL_' + Date.now() : user.id,
          nip: user.nip && user.nip !== '-' ? user.nip : user.username,
          nama: user.nama,
          username: user.username,
          password: user.password,
          noHp: user.noHp || '',
          role: newRole,
          foto: user.foto,
        });
      }
    }

    const baseAppData: AppData = {
      ...appData,
      waliKelas: updatedWaliKelas,
      siswa: updatedSiswa,
    };

    const nextAppData = addAuditLog(baseAppData, 'Mengubah role user', `Mengubah role user: ${user.nama} dari ${getRoleLabel(user.role)} menjadi ${getRoleLabel(newRole)}`);
    onUpdateAppData(nextAppData);
    onShowToast(`Role "${user.nama}" berhasil diubah menjadi ${getRoleLabel(newRole)}!`, 'success');
  };

  const handleSaveUser = (
    editingUser: UserItem | null,
    nama: string,
    username: string,
    nip: string,
    password: string,
    role: UserRole,
    noHp: string,
    mataPelajaran?: string,
    hariMengajar?: string[],
    batasiLoginHariMengajar?: boolean
  ) => {
    // 1. Admin
    if (role === 'admin' || editingUser?.role === 'admin') {
      let updatedAdmin = {
        ...appData.admin,
        username: username || appData.admin?.username || 'admin',
        password: password || appData.admin?.password || 'admin123',
        nama: nama || appData.admin?.nama || 'Administrator Utama',
        foto: editingUser?.foto || appData.admin?.foto || '',
      };
      const nextAppData = addAuditLog(
        { ...appData, admin: updatedAdmin },
        'Ubah data admin',
        `Mengubah data akun Administrator: ${nama}`
      );
      onUpdateAppData(nextAppData);
      onShowToast(`Data administrator berhasil diperbarui!`, 'success');
      onCloseModal();
      return;
    }

    // 2. Murid / Siswa
    if (role === 'murid' || editingUser?.role === 'murid') {
      let updatedSiswa = [...(appData.siswa || [])];
      if (editingUser) {
        updatedSiswa = updatedSiswa.map((s) => {
          if (s.id === editingUser.id || s.nisn === editingUser.username || s.nisn === username || s.username === editingUser.username) {
            return {
              ...s,
              nama: nama || s.nama,
              username: username || s.username || s.nisn,
              nisn: nip && nip !== '-' ? nip : s.nisn,
              password: password ? password : (s.password || s.nisn || ''),
              noWa: noHp || s.noWa,
              foto: editingUser?.foto || s.foto,
            };
          }
          return s;
        });
      } else {
        updatedSiswa.push({
          id: 'SISWA_' + Date.now(),
          nama: nama,
          nisn: nip && nip !== '-' ? nip : username,
          username: username || nip,
          password: password || '123',
          kelasId: appData.kelas[0]?.id || '',
          noWa: noHp || '',
          gender: 'L',
          foto: '',
        });
      }
      const nextAppData = addAuditLog(
        {
          ...appData,
          siswa: updatedSiswa,
        },
        editingUser ? 'Ubah data murid' : 'Tambah akun murid',
        `${editingUser ? 'Mengubah' : 'Menambahkan'} data akun murid/siswa: ${nama}`
      );
      onUpdateAppData(nextAppData);
      onShowToast(`Data akun murid "${nama}" berhasil ${editingUser ? 'diperbarui' : 'ditambahkan'}!`, 'success');
      onCloseModal();
      return;
    }

    // 3. Wali / Kesiswaan / Guru / Kurikulum / Hubin
    let updatedWaliKelas = [...(appData.waliKelas || [])];
    let nextKesiswaan = appData.kesiswaan ? { ...appData.kesiswaan } : undefined;
    let nextUserBiasa = appData.userBiasa ? { ...appData.userBiasa } : undefined;

    if (role === 'kesiswaan' || editingUser?.id === 'USER_KESISWAAN') {
      nextKesiswaan = {
        ...(appData.kesiswaan || { jabatan: 'WKS Kesiswaan / BP BK' }),
        nama,
        username,
        password,
        foto: editingUser?.foto || appData.kesiswaan?.foto || '',
      };
    }

    if (role === 'guru' || role === 'user' || editingUser?.id === 'USER_BIASA') {
      nextUserBiasa = {
        ...(appData.userBiasa || { jabatan: 'Guru Pengampu' }),
        nama,
        username,
        password,
        foto: editingUser?.foto || appData.userBiasa?.foto || '',
        mataPelajaran: cleanMapelName(mataPelajaran),
        hariMengajar: hariMengajar || [],
        batasiLoginHariMengajar: !!batasiLoginHariMengajar,
      };
    }

    if (editingUser) {
      const exists = updatedWaliKelas.find((w) => w.id === editingUser.id || w.username === editingUser.username);
      if (exists) {
        updatedWaliKelas = updatedWaliKelas.map((w) =>
          w.id === exists.id || w.username === editingUser.username
            ? {
                ...w,
                nama,
                username,
                nip: nip || w.nip,
                password,
                role,
                noHp,
                foto: editingUser.foto || w.foto,
                mataPelajaran: cleanMapelName(mataPelajaran || w.mataPelajaran),
                hariMengajar: hariMengajar || w.hariMengajar || [],
                batasiLoginHariMengajar: batasiLoginHariMengajar !== undefined ? batasiLoginHariMengajar : w.batasiLoginHariMengajar,
              }
            : w
        );
      } else {
        updatedWaliKelas.push({
          id: editingUser.id.startsWith('USER_') ? 'WAL_' + Date.now() : editingUser.id,
          nip: nip || username,
          nama,
          username,
          password,
          noHp,
          role,
          foto: editingUser.foto,
          mataPelajaran: cleanMapelName(mataPelajaran),
          hariMengajar,
          batasiLoginHariMengajar,
        });
      }
      onShowToast(`Data user "${nama}" berhasil diperbarui!`, 'success');
    } else {
      updatedWaliKelas.push({
        id: 'WAL_' + Date.now(),
        nip: nip || username,
        nama,
        username,
        password,
        noHp,
        role,
        mataPelajaran,
        hariMengajar,
        batasiLoginHariMengajar,
      });
      onShowToast(`User baru "${nama}" dengan role ${getRoleLabel(role)} berhasil dibuat!`, 'success');
    }

    const nextAppData = {
      ...appData,
      waliKelas: updatedWaliKelas,
      ...(nextKesiswaan ? { kesiswaan: nextKesiswaan } : {}),
      ...(nextUserBiasa ? { userBiasa: nextUserBiasa } : {}),
    };

    let finalAppData = nextAppData;
    if (editingUser) {
      finalAppData = addAuditLog(finalAppData, 'Mengubah data user', `Mengubah data user pengguna: ${nama} (${role})`);
    } else {
      finalAppData = addAuditLog(finalAppData, 'Membuat user baru', `Membuat user pengguna baru: ${nama} (${role})`);
    }

    onUpdateAppData(finalAppData);

    onCloseModal();
  };

  const isAdmin = currentUser?.role === 'admin';
  const isKesiswaan = currentUser?.role === 'kesiswaan';
  const isWali = currentUser?.role === 'wali';

  const canDeleteUser = (user: UserItem) => {
    if (isAdmin) {
      if (user.role === 'admin' && currentUser?.data?.username === user.username) return false;
      return true;
    }
    if (isKesiswaan || isWali) {
      return user.role === 'murid';
    }
    return false;
  };

  const handleDeleteUser = (user: UserItem) => {
    if (!canDeleteUser(user)) {
      onShowToast('Akses dibatasi! Anda tidak memiliki izin untuk menghapus user ini.', 'warning');
      return;
    }

    if (user.role === 'admin' && isAdmin && currentUser?.data?.username === user.username) {
      onShowToast('Anda tidak dapat menghapus akun Administrator yang sedang aktif dipakai!', 'error');
      return;
    }

    onConfirmModal(
      user.role === 'murid' ? 'Hapus Siswa / Murid' : 'Hapus User Pengguna',
      `Apakah Anda yakin ingin menghapus ${user.role === 'murid' ? 'siswa' : 'user'} "${user.nama}" (${getRoleLabel(user.role)})?`,
      'danger',
      () => {
        if (user.role === 'murid') {
          const updatedSiswa = (appData.siswa || []).filter((s) => s.id !== user.id && s.nisn !== user.username);
          const nextAppData = addAuditLog(
            { ...appData, siswa: updatedSiswa },
            'Hapus akun murid',
            `Menghapus akun murid: ${user.nama} (${user.username})`
          );
          onUpdateAppData(nextAppData);
          onShowToast(`Siswa / Murid "${user.nama}" berhasil dihapus.`, 'info');
        } else {
          const updatedWaliKelas = (appData.waliKelas || []).filter((w) => w.id !== user.id && w.username !== user.username);
          const nextAppData = addAuditLog(
            { ...appData, waliKelas: updatedWaliKelas },
            'Hapus akun pengguna',
            `Menghapus akun pengguna: ${user.nama} (${user.username}, role: ${user.role})`
          );
          onUpdateAppData(nextAppData);
          onShowToast(`User "${user.nama}" berhasil dihapus.`, 'info');
        }
      }
    );
  };

  const openUserForm = (user?: UserItem) => {
    if (readOnly) {
      onShowToast('Akses dibatasi!', 'warning');
      return;
    }

    const FormContent = () => {
      const [nama, setNama] = useState(user ? user.nama : '');
      const [username, setUsername] = useState(user ? user.username : '');
      const [nip, setNip] = useState(user ? user.nip : '');
      const [password, setPassword] = useState(user ? user.password : '123');
      const [role, setRole] = useState<UserRole>(user ? user.role : 'wali');
      const [noHp, setNoHp] = useState(user ? user.noHp || '' : '');

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveUser(
              user || null,
              nama.trim(),
              username.trim(),
              nip.trim(),
              password.trim(),
              role,
              noHp.trim(),
              user?.mataPelajaran || '',
              user?.hariMengajar,
              user?.batasiLoginHariMengajar
            );
          }}
          className="space-y-4 text-left max-h-[80vh] overflow-y-auto pr-1"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
              Nama Lengkap User
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: Drs. Ahmad Fauzi, M.Pd"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                Username Login
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contoh: ahmad"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                NIP / Identitas
              </label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="NIP / No Identitas"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                Password
              </label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Password Login"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                Nomor WhatsApp / HP
              </label>
              <input
                type="text"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="081234567890"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
              Pengaturan Role Hak Akses
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="admin">Administrator</option>
              <option value="kesiswaan">WKS Kesiswaan / BP BK</option>
              <option value="kurikulum">WKS Kurikulum</option>
              <option value="hubin">WKS Hubin</option>
              <option value="guru">Guru / Staf Pengajar</option>
              <option value="wali">Wali Kelas</option>
              <option value="murid">Siswa / Murid</option>
              {appData.customRoles?.map((cr) => (
                <option key={cr.id} value={cr.id}>{cr.label}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCloseModal}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-theme-primary hover:bg-theme-primary-dark text-white font-bold rounded-xl text-xs shadow-md shadow-theme-primary/30 transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Data User</span>
            </button>
          </div>
        </form>
      );
    };

    onOpenModal(user ? 'Edit Identitas & Role User' : 'Tambah User Pengguna Baru', <FormContent />);
  };

  const adminCount = allUsers.filter((u) => u.role === 'admin').length;
  const kesiswaanCount = allUsers.filter((u) => u.role === 'kesiswaan').length;
  const kurikulumCount = allUsers.filter((u) => u.role === 'kurikulum').length;
  const hubinCount = allUsers.filter((u) => u.role === 'hubin').length;
  const guruCount = allUsers.filter((u) => u.role === 'guru' || u.role === 'user').length;
  const waliCount = allUsers.filter((u) => u.role === 'wali').length;
  const muridCount = allUsers.filter((u) => u.role === 'murid' || u.role === 'siswa').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleExcelImport}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      <PageHeader
        icon={UserCheck}
        title="Master Data User & Akun Login"
        description="Kelola data pengguna, hak akses role (Admin, Kesiswaan, Wali Kelas, BP/BK, WKS Kurikulum, WKS Hubin), password, dan reset akun."
        badge="Manajemen Pengguna"
      />

      {/* Search Bar & Action Toolbar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama, username, NIP..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5">
              <select
                value={sortField}
                onChange={(e) => handleSort(e.target.value as any)}
                className="py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="nama">Urut: Nama Pengguna</option>
                <option value="username">Urut: Username / NIP</option>
                <option value="role">Urut: Role</option>
                <option value="kelasNama">Urut: Kelas Wali</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition"
                title={`Urutan: ${sortDirection === 'asc' ? 'A-Z / Naik' : 'Z-A / Turun'}`}
              >
                {sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setRoleTab('semua');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  roleTab === 'semua'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Semua ({allUsers.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleTab('admin');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  roleTab === 'admin'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Admin ({adminCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleTab('kesiswaan');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  roleTab === 'kesiswaan'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Kesiswaan ({kesiswaanCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleTab('kurikulum');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  roleTab === 'kurikulum'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Kurikulum ({kurikulumCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleTab('hubin');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  roleTab === 'hubin'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Hubin ({hubinCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleTab('guru');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  roleTab === 'guru' || roleTab === 'user'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Guru ({guruCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleTab('wali');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  roleTab === 'wali'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Wali Kelas ({waliCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleTab('murid');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  roleTab === 'murid'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Siswa / Murid ({muridCount})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher: List & Grid */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
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

            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Unduh Template Excel 30 Wali Kelas"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Template Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
                  title="Impor Data Wali Kelas dari File Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Import Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => openUserForm()}
                  className="px-3.5 py-2 bg-theme-primary hover:bg-theme-primary-dark text-white font-bold rounded-xl text-xs shadow-md shadow-theme-primary/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah User</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreateRoleModal}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
                  title="Buat Role / Jabatan Baru"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat Role Baru</span>
                </button>

                {appData.customRoles && appData.customRoles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenManageRolesModal}
                    className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                    title="Kelola / Hapus Role Kustom"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>Hapus Role ({appData.customRoles.length})</span>
                  </button>
                )}

                {appData.waliKelas.length > 0 && (
                  <button
                    type="button"
                    onClick={handleHapusSeluruhWali}
                    className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                    title="Hapus Seluruh Data Wali Kelas"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>Hapus Wali</span>
                  </button>
                )}

                {appData.siswa && appData.siswa.length > 0 && (
                  <button
                    type="button"
                    onClick={handleHapusSeluruhMurid}
                    className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                    title="Hapus Seluruh Data Siswa / Murid"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>Hapus Semua Murid</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            Tidak ada user pengguna yang cocok dengan pencarian.
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View: Responsive Profile Cards */
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pagedUsers.map((user, idx) => (
                <div
                  key={user.id}
                  className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700/60 transition duration-150 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Foto/Avatar, Nama, No, Username */}
                    <div className="flex items-start justify-between gap-2.5 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {user.foto ? (
                          <img
                            src={user.foto}
                            alt={user.nama}
                            className="w-11 h-11 rounded-2xl object-cover shrink-0 border border-slate-200 shadow-xs"
                          />
                        ) : (
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-xs shrink-0 shadow-xs ${
                            user.role === 'admin' ? 'bg-blue-600' : user.role === 'kesiswaan' ? 'bg-purple-600' : user.role === 'kurikulum' ? 'bg-indigo-600' : user.role === 'hubin' ? 'bg-cyan-600' : user.role === 'guru' || user.role === 'user' ? 'bg-amber-600' : user.role === 'murid' || user.role === 'siswa' ? 'bg-teal-600' : 'bg-emerald-600'
                          }`}>
                            {user.nama.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                              #{(currentPage - 1) * pageSize + idx + 1}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${getRoleBadgeClass(user.role)}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate mt-1" title={user.nama}>
                            {user.nama}
                          </h4>
                          <p className="text-[11px] font-mono text-slate-400 dark:text-slate-400">
                            @{user.username} {user.nip ? `• ${user.nip}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Metadata: Kelas / Mapel / Hari Mengajar */}
                    <div className="space-y-1.5 mb-3 text-xs">
                      {user.kelasNama && (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-100 dark:border-emerald-800">
                          Wali Kelas: {user.kelasNama}
                        </div>
                      )}
                      {user.mataPelajaran && (
                        <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl border border-indigo-100 dark:border-indigo-800">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">{cleanMapelName(user.mataPelajaran)}</span>
                        </div>
                      )}
                      {user.hariMengajar && user.hariMengajar.length > 0 && (
                        <div className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-xl border border-amber-100 dark:border-amber-800">
                          <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{user.hariMengajar.join(', ')}</span>
                          {user.batasiLoginHariMengajar && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded shrink-0">
                              🔒 Restrict
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Password and Role Selector */}
                    <div className="space-y-2 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                      <div className="flex justify-between items-center text-slate-500">
                        <span className="text-[10px] text-slate-400 font-medium">Password:</span>
                        <span className="font-mono bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded-lg text-slate-800 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>{user.password}</span>
                        </span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Ubah Hak Akses:
                        </label>
                        <select
                          disabled={readOnly}
                          value={user.role}
                          onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                          className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold border transition focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${getRoleBadgeClass(user.role)}`}
                        >
                          <option value="admin">Administrator</option>
                          <option value="kesiswaan">WKS Kesiswaan / BP BK</option>
                          <option value="kurikulum">WKS Kurikulum</option>
                          <option value="hubin">WKS Hubin</option>
                          <option value="guru">Guru</option>
                          <option value="wali">Wali Kelas</option>
                          <option value="murid">Murid / Siswa</option>
                          {appData.customRoles?.map((cr) => (
                            <option key={cr.id} value={cr.id}>{cr.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {(isAdmin || canDeleteUser(user)) && (
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-1.5">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => openUserForm(user)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 rounded-xl border border-blue-200/80 dark:border-blue-800 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                          title="Edit User"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                      {canDeleteUser(user) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl border border-rose-200/80 dark:border-rose-800 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                          title={user.role === 'murid' ? 'Hapus Siswa / Murid' : 'Hapus User'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* List View: Full Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">NO</th>
                  <th className="py-3 px-4 cursor-pointer hover:text-blue-600 transition select-none" onClick={() => handleSort('nama')}>
                    <div className="flex items-center gap-1.5">
                      <span>IDENTITAS PENGGUNA</span>
                      {sortField === 'nama' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:text-blue-600 transition select-none" onClick={() => handleSort('username')}>
                    <div className="flex items-center gap-1.5">
                      <span>USERNAME / NIP</span>
                      {sortField === 'username' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4">PASSWORD</th>
                  <th className="py-3 px-4 cursor-pointer hover:text-blue-600 transition select-none" onClick={() => handleSort('role')}>
                    <div className="flex items-center gap-1.5">
                      <span>PENGATURAN ROLE (HAK AKSES)</span>
                      {sortField === 'role' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedUsers.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {user.foto ? (
                          <img src={user.foto} alt={user.nama} className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200" />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 ${
                            user.role === 'admin' ? 'bg-blue-600' : user.role === 'kesiswaan' ? 'bg-purple-600' : user.role === 'kurikulum' ? 'bg-indigo-600' : user.role === 'hubin' ? 'bg-cyan-600' : user.role === 'guru' || user.role === 'user' ? 'bg-amber-600' : user.role === 'murid' || user.role === 'siswa' ? 'bg-teal-600' : 'bg-emerald-600'
                          }`}>
                            {user.nama.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                            {user.nama}
                          </p>
                          {user.kelasNama && (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                              Wali Kelas: {user.kelasNama}
                            </p>
                          )}
                          {user.mataPelajaran && (
                            <p className="text-[10px] text-indigo-600 dark:text-indigo-300 font-semibold flex items-center gap-1 mt-0.5">
                              <BookOpen className="w-3 h-3 text-indigo-500" />
                              <span>{cleanMapelName(user.mataPelajaran)}</span>
                            </p>
                          )}
                          {user.hariMengajar && user.hariMengajar.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-0.5">
                              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-amber-500" />
                                <span>{user.hariMengajar.join(', ')}</span>
                              </span>
                              {user.batasiLoginHariMengajar && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded border border-rose-200">
                                  🔒 Restricted
                                </span>
                              )}
                            </div>
                          )}
                          {user.noHp && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              WA: {user.noHp}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                      <p className="font-bold text-slate-800 dark:text-slate-100">{user.username}</p>
                      {user.nip && <p className="text-[10px] text-slate-400">NIP: {user.nip}</p>}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>{user.password}</span>
                      </span>
                    </td>

                    {/* Role Dropdown */}
                    <td className="py-3.5 px-4">
                      {readOnly ? (
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border ${getRoleBadgeClass(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      ) : (
                        <div className="relative inline-block w-48">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                            className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold border transition focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${getRoleBadgeClass(user.role)}`}
                          >
                            <option value="admin">Administrator</option>
                            <option value="kesiswaan">WKS Kesiswaan / BP BK</option>
                            <option value="kurikulum">WKS Kurikulum</option>
                            <option value="hubin">WKS Hubin</option>
                            <option value="guru">Guru</option>
                            <option value="wali">Wali Kelas</option>
                            <option value="murid">Murid / Siswa</option>
                            {appData.customRoles?.map((cr) => (
                              <option key={cr.id} value={cr.id}>{cr.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => openUserForm(user)}
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 rounded-xl border border-blue-200/80 dark:border-blue-800 transition cursor-pointer"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDeleteUser(user) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl border border-rose-200/80 dark:border-rose-800 transition cursor-pointer"
                            title={user.role === 'murid' ? 'Hapus Siswa / Murid' : 'Hapus User'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredUsers.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};
