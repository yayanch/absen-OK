import React, { useState, useRef, useEffect } from 'react';
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
  LayoutGrid,
  ChevronDown,
  Check,
  Shield,
  Layers,
  Sparkles,
  Filter
} from 'lucide-react';
import { AppData, CustomRole, UserRole, UserSession, ViewType, WaliKelas } from '../../types';
import { Pagination } from '../Pagination';
import { PageHeader } from '../common/UIComponents';
import { addAuditLog, cleanMapelName } from '../../utils/helpers';
import { normalizeRoleKey, mapDutyToRole } from '../../utils/rolePermissionEngine';

export interface UserItem {
  id: string;
  nama: string;
  username: string;
  nip: string;
  password: string;
  role: UserRole; // primary role
  roles: UserRole[]; // all assigned roles (multi-role)
  originalType: 'admin' | 'kesiswaan' | 'wali' | 'user';
  noHp?: string;
  foto?: string;
  kelasId?: string;
  kelasNama?: string;
  mataPelajaran?: string;
  hariMengajar?: string[];
  batasiLoginHariMengajar?: boolean;
}

export interface AvailableRoleOption {
  id: string;
  label: string;
  badgeColor: string;
  description: string;
  isSystem?: boolean;
}

export const getRoleBadgeClass = (role?: string, customRoles?: CustomRole[]) => {
  if (!role) return 'bg-slate-100 text-slate-700 border-slate-200';
  const custom = customRoles?.find((r) => r.id === role || r.name === role);
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
    case 'staf_jadwal':
      return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800';
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
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

export const getRoleLabel = (role?: string, customRoles?: CustomRole[]) => {
  if (!role) return '-';
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'kesiswaan':
      return 'WKS Kesiswaan / BP BK';
    case 'kurikulum':
      return 'WKS Kurikulum';
    case 'staf_jadwal':
      return 'Staf Pengelola Jadwal';
    case 'hubin':
      return 'WKS Hubin';
    case 'guru':
    case 'user':
      return 'Guru';
    case 'wali':
      return 'Wali Kelas';
    case 'piket_kesiswaan':
      return 'Piket Kesiswaan';
    case 'piket_guru':
      return 'Piket Guru';
    case 'piket_kelas':
      return 'Piket Kelas';
    case 'murid':
    case 'siswa':
      return 'Murid / Siswa';
    default:
      const custom = customRoles?.find((r) => r.id === role || r.name === role);
      return custom ? custom.label : role;
  }
};

export const getAvailableRoleOptionsList = (appData: AppData): AvailableRoleOption[] => {
  const baseRoles: AvailableRoleOption[] = [
    { id: 'admin', label: 'Administrator', badgeColor: 'blue', description: 'Akses penuh ke seluruh menu & konfigurasi sistem', isSystem: true },
    { id: 'kesiswaan', label: 'WKS Kesiswaan / BP BK', badgeColor: 'purple', description: 'Pengawasan presensi, kedisiplinan, poin pelanggaran & home visit', isSystem: true },
    { id: 'kurikulum', label: 'WKS Kurikulum', badgeColor: 'indigo', description: 'Master mapel, kurikulum pembelajaran & jadwal mengajar guru', isSystem: true },
    { id: 'staf_jadwal', label: 'Staf Pengelola Jadwal', badgeColor: 'cyan', description: 'Pengaturan teknis alokasi jadwal pelajaran dan plotting jam', isSystem: true },
    { id: 'hubin', label: 'WKS Hubin / Humas', badgeColor: 'teal', description: 'Kemitraan industri, data kejuruan & penelusuran lulusan', isSystem: true },
    { id: 'wali', label: 'Wali Kelas', badgeColor: 'emerald', description: 'Pembina kelas binaan, presensi harian & rekapitulasi kelas', isSystem: true },
    { id: 'piket_kesiswaan', label: 'Piket Kesiswaan', badgeColor: 'amber', description: 'Scan QR presensi, pencatatan pelanggaran & edit presensi siswa', isSystem: true },
    { id: 'piket_guru', label: 'Piket Guru', badgeColor: 'orange', description: 'Scan QR presensi, pencatatan pelanggaran & edit presensi siswa', isSystem: true },
    { id: 'piket_kelas', label: 'Piket Kelas', badgeColor: 'teal', description: 'Petugas piket kelas / sekretaris yang bertugas mengisi presensi kelas binaan', isSystem: true },
    { id: 'guru', label: 'Guru / Tenaga Pendidik', badgeColor: 'amber', description: 'Melihat jadwal ajar pribadi, kelas ajar & pencatatan KBM', isSystem: true },
    { id: 'murid', label: 'Siswa / Murid', badgeColor: 'rose', description: 'Portal mandiri siswa, scan kehadiran QR & kartu pelajar digital', isSystem: true },
  ];

  const customRoles: AvailableRoleOption[] = (appData.customRoles || []).map((cr) => ({
    id: cr.id,
    label: cr.label || cr.name,
    badgeColor: cr.color || 'indigo',
    description: cr.description || 'Role kustom pengguna',
    isSystem: false,
  }));

  return [...baseRoles, ...customRoles];
};

/* --- TOP-LEVEL MODAL COMPONENT 1: ROLE FORM MODAL (CREATE CUSTOM ROLE) --- */
interface RoleFormModalContentProps {
  appData: AppData;
  onUpdateAppData: (updated: AppData) => void;
  onCloseModal: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const RoleFormModalContent: React.FC<RoleFormModalContentProps> = ({
  appData,
  onUpdateAppData,
  onCloseModal,
  onShowToast,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('indigo');

  const handleSubmit = (e: React.FormEvent) => {
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
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

/* --- TOP-LEVEL MODAL COMPONENT 2: MANAGE ROLES MODAL --- */
interface ManageRolesModalContentProps {
  appData: AppData;
  allUsers: UserItem[];
  onUpdateAppData: (updated: AppData) => void;
  onCloseModal: () => void;
  onConfirmModal: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ManageRolesModalContent: React.FC<ManageRolesModalContentProps> = ({
  appData,
  allUsers,
  onUpdateAppData,
  onCloseModal,
  onConfirmModal,
  onShowToast,
}) => {
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
        Kelola daftar role / jabatan kustom yang telah dibuat. Menghapus role akan menghapus role tersebut dari daftar role pengguna.
      </p>
      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1">
        {customRoles.map((role) => {
          const count = allUsers.filter((u) => u.roles.includes(role.id) || u.roles.includes(role.name)).length;
          return (
            <div key={role.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{role.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">ID: {role.id} • {count} pengguna memiliki role ini</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onConfirmModal(
                    `Hapus Role "${role.label}"`,
                    `Apakah Anda yakin ingin menghapus role "${role.label}"? Role ini akan dicabut dari ${count} pengguna.`,
                    'danger',
                    () => {
                      const updatedCustomRoles = (appData.customRoles || []).filter((r) => r.id !== role.id);
                      const updatedWaliKelas = appData.waliKelas.map((w) => {
                        const wRoles = Array.isArray(w.roles) && w.roles.length > 0 ? w.roles : [w.role || 'guru'];
                        const filteredRoles = wRoles.filter((r) => r !== role.id && r !== role.name);
                        const nextRoles = filteredRoles.length > 0 ? filteredRoles : ['guru'];
                        return {
                          ...w,
                          roles: nextRoles,
                          role: nextRoles[0] || 'guru',
                        };
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

/* --- TOP-LEVEL MODAL COMPONENT 3: QUICK MULTI-ROLE MODAL --- */
interface QuickRoleModalContentProps {
  user: UserItem;
  appData: AppData;
  onSaveUser: (
    editingUser: UserItem | null,
    nama: string,
    username: string,
    nip: string,
    password: string,
    roles: UserRole[],
    primaryRole: UserRole,
    noHp: string,
    mataPelajaran?: string,
    hariMengajar?: string[],
    batasiLoginHariMengajar?: boolean
  ) => void;
  onCloseModal: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const QuickRoleModalContent: React.FC<QuickRoleModalContentProps> = ({
  user,
  appData,
  onSaveUser,
  onCloseModal,
  onShowToast,
}) => {
  const availableOptions = getAvailableRoleOptionsList(appData);
  const initialRoles = user.roles && user.roles.length > 0 ? [...user.roles] : [user.role || 'guru'];
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(initialRoles);
  const [primaryRole, setPrimaryRole] = useState<UserRole>(user.role || initialRoles[0] || 'guru');

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) => {
      let updated: UserRole[];
      if (prev.includes(roleId)) {
        if (prev.length <= 1) {
          onShowToast('Pengguna harus memiliki minimal 1 role aktif!', 'warning');
          return prev;
        }
        updated = prev.filter((r) => r !== roleId);
        if (primaryRole === roleId) {
          setPrimaryRole(updated[0] || 'guru');
        }
      } else {
        updated = [...prev, roleId];
      }
      return updated;
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoles.length === 0) {
      onShowToast('Pilih minimal 1 role untuk pengguna!', 'error');
      return;
    }

    onSaveUser(
      user,
      user.nama,
      user.username,
      user.nip,
      user.password,
      selectedRoles,
      primaryRole || selectedRoles[0],
      user.noHp || '',
      user.mataPelajaran,
      user.hariMengajar,
      user.batasiLoginHariMengajar
    );
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 text-left max-h-[80vh] overflow-y-auto pr-1">
      <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">{user.nama}</h4>
          <p className="text-[11px] font-mono text-slate-400">@{user.username} • {user.nip}</p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-xl border border-blue-200 dark:border-blue-800">
            <Layers className="w-3.5 h-3.5" />
            <span>{selectedRoles.length} Role Terpilih</span>
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1.5 flex items-center justify-between">
          <span>Pilih Role & Hak Akses (Bisa lebih dari 1)</span>
          <span className="text-[10px] text-slate-400 font-medium">Klik untuk mencentang role</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {availableOptions.map((opt) => {
            const isSelected = selectedRoles.includes(opt.id);
            return (
              <div
                key={opt.id}
                onClick={() => toggleRole(opt.id)}
                className={`p-3 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-2.5 select-none ${
                  isSelected
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRoleBadgeClass(opt.id, appData.customRoles)}`}>
                      {opt.label}
                    </span>
                    {primaryRole === opt.id && (
                      <span className="text-[9px] font-extrabold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                        Utama
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1 line-clamp-2 leading-tight">
                    {opt.description}
                  </p>
                </div>

                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedRoles.length > 1 && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
            Tentukan Role Utama (Default Landing)
          </label>
          <select
            value={primaryRole}
            onChange={(e) => setPrimaryRole(e.target.value as UserRole)}
            className="w-full py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {selectedRoles.map((r) => (
              <option key={r} value={r}>
                {getRoleLabel(r, appData.customRoles)}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">
            Role utama digunakan sebagai tampilan identitas primer dan dashboard default. Pengguna tetap memiliki hak akses dari seluruh role yang dicentang.
          </p>
        </div>
      )}

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCloseModal}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs transition"
        >
          Batal
        </button>
        <button
          type="submit"
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Simpan Perubahan Role ({selectedRoles.length})</span>
        </button>
      </div>
    </form>
  );
};

/* --- TOP-LEVEL MODAL COMPONENT 4: USER FULL FORM MODAL --- */
interface UserFormModalContentProps {
  user?: UserItem;
  appData: AppData;
  onSaveUser: (
    editingUser: UserItem | null,
    nama: string,
    username: string,
    nip: string,
    password: string,
    roles: UserRole[],
    primaryRole: UserRole,
    noHp: string,
    mataPelajaran?: string,
    hariMengajar?: string[],
    batasiLoginHariMengajar?: boolean
  ) => void;
  onCloseModal: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const UserFormModalContent: React.FC<UserFormModalContentProps> = ({
  user,
  appData,
  onSaveUser,
  onCloseModal,
  onShowToast,
}) => {
  const availableOptions = getAvailableRoleOptionsList(appData);
  const initialRoles = user ? (user.roles && user.roles.length > 0 ? user.roles : [user.role || 'wali']) : ['wali'];
  
  const [nama, setNama] = useState(user ? user.nama : '');
  const [username, setUsername] = useState(user ? user.username : '');
  const [nip, setNip] = useState(user ? user.nip : '');
  const [password, setPassword] = useState(user ? user.password : '123');
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(initialRoles);
  const [primaryRole, setPrimaryRole] = useState<UserRole>(user ? user.role || initialRoles[0] : 'wali');
  const [noHp, setNoHp] = useState(user ? user.noHp || '' : '');

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) => {
      let updated: UserRole[];
      if (prev.includes(roleId)) {
        if (prev.length <= 1) {
          onShowToast('Pengguna harus memiliki minimal 1 role aktif!', 'warning');
          return prev;
        }
        updated = prev.filter((r) => r !== roleId);
        if (primaryRole === roleId) {
          setPrimaryRole(updated[0] || 'wali');
        }
      } else {
        updated = [...prev, roleId];
      }
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoles.length === 0) {
      onShowToast('Pilih minimal 1 role untuk user!', 'error');
      return;
    }
    onSaveUser(
      user || null,
      nama.trim(),
      username.trim(),
      nip.trim(),
      password.trim(),
      selectedRoles,
      primaryRole || selectedRoles[0],
      noHp.trim(),
      user?.mataPelajaran || '',
      user?.hariMengajar,
      user?.batasiLoginHariMengajar
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left max-h-[80vh] overflow-y-auto pr-1">
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

      {/* Multi-Role Selector */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Pengaturan Role &amp; Hak Akses Pengguna</span>
          </label>
          <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg">
            {selectedRoles.length} Role Terpilih
          </span>
        </div>

        <p className="text-[11px] text-slate-400 mb-2.5">
          Centang satu atau lebih role yang dimiliki oleh pengguna ini. Pengguna akan mendapatkan akses ke seluruh menu dari role yang dicentang.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {availableOptions.map((opt) => {
            const isSelected = selectedRoles.includes(opt.id);
            return (
              <div
                key={opt.id}
                onClick={() => toggleRole(opt.id)}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-2 select-none ${
                  isSelected
                    ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-400 dark:border-blue-600 shadow-xs'
                    : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRoleBadgeClass(opt.id, appData.customRoles)}`}>
                      {opt.label}
                    </span>
                    {primaryRole === opt.id && (
                      <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded">
                        Utama
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1 line-clamp-1">
                    {opt.description}
                  </p>
                </div>

                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedRoles.length > 1 && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
            Role Utama (Primary Identity)
          </label>
          <select
            value={primaryRole}
            onChange={(e) => setPrimaryRole(e.target.value as UserRole)}
            className="w-full py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {selectedRoles.map((r) => (
              <option key={r} value={r}>
                {getRoleLabel(r, appData.customRoles)}
              </option>
            ))}
          </select>
        </div>
      )}

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
          className="px-5 py-2 bg-theme-primary hover:bg-theme-primary-dark text-white font-bold rounded-xl text-xs shadow-md shadow-theme-primary/30 transition flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Simpan Data User</span>
        </button>
      </div>
    </form>
  );
};

/* --- MAIN VIEW COMPONENT --- */
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
  onNavigateView?: (view: ViewType) => void;
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
  onNavigateView,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleTab, setRoleTab] = useState<'semua' | UserRole>('semua');
  const [sortField, setSortField] = useState<'nama' | 'username' | 'role' | 'kelasNama'>('nama');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'list'));
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Compile full user list from appData with multi-role support
  const buildUserList = (): UserItem[] => {
    const list: UserItem[] = [];

    // 1. Admin
    if (appData.admin) {
      const adminRoles: UserRole[] = Array.isArray(appData.admin.roles) && appData.admin.roles.length > 0
        ? appData.admin.roles
        : ['admin'];
      list.push({
        id: 'USER_ADMIN',
        nama: appData.admin.nama || 'Administrator Utama',
        username: appData.admin.username || 'admin',
        nip: '198001011999011001',
        password: appData.admin.password || '',
        role: adminRoles[0] || 'admin',
        roles: adminRoles,
        originalType: 'admin',
        foto: appData.admin.foto,
      });
    }

    const effectiveWaliKelas = [...(appData.waliKelas || [])];

    // Ensure default Kesiswaan exists if not in waliKelas
    if (!effectiveWaliKelas.some((w) => (w.roles && w.roles.includes('kesiswaan')) || w.role === 'kesiswaan')) {
      const kesiswaanObj = appData.kesiswaan || {
        username: 'kesiswaan',
        password: '',
        nama: 'Tim WKS Kesiswaan & BP BK',
        jabatan: 'WKS Kesiswaan / BP BK',
      };
      const kRoles = Array.isArray(kesiswaanObj.roles) && kesiswaanObj.roles.length > 0 ? kesiswaanObj.roles : ['kesiswaan'];
      effectiveWaliKelas.push({
        id: 'USER_KESISWAAN',
        nip: '198202022005011002',
        nama: kesiswaanObj.nama || 'Tim WKS Kesiswaan & BP BK',
        username: kesiswaanObj.username || 'kesiswaan',
        password: kesiswaanObj.password || '',
        noHp: '',
        role: kRoles[0] || 'kesiswaan',
        roles: kRoles,
        foto: kesiswaanObj.foto,
      });
    }

    // Ensure default Guru / User Biasa exists if not in waliKelas
    if (!effectiveWaliKelas.some((w) => (w.roles && (w.roles.includes('guru') || w.roles.includes('user'))) || w.role === 'user' || w.role === 'guru')) {
      const userBiasaObj = appData.userBiasa || {
        username: 'guru',
        password: '',
        nama: 'Guru / Staf Pengajar',
        jabatan: 'Guru Pengampu',
        mataPelajaran: 'Pendidikan Pancasila',
        hariMengajar: ['Senin', 'Rabu', 'Jumat'],
        batasiLoginHariMengajar: false,
      };
      const gRoles = Array.isArray(userBiasaObj.roles) && userBiasaObj.roles.length > 0 ? userBiasaObj.roles : ['guru'];
      effectiveWaliKelas.push({
        id: 'USER_BIASA',
        nip: '-',
        nama: userBiasaObj.nama || 'Guru / Staf Pengajar',
        username: userBiasaObj.username || 'guru',
        password: userBiasaObj.password || '',
        noHp: '',
        role: gRoles[0] || 'guru',
        roles: gRoles,
        foto: userBiasaObj.foto,
        mataPelajaran: userBiasaObj.mataPelajaran,
        hariMengajar: userBiasaObj.hariMengajar,
        batasiLoginHariMengajar: userBiasaObj.batasiLoginHariMengajar,
      });
    }

    // Staf Jadwal (Non-Guru Pengelola Jadwal)
    if (appData.stafJadwal) {
      const sjRoles = Array.isArray(appData.stafJadwal.roles) && appData.stafJadwal.roles.length > 0
        ? appData.stafJadwal.roles
        : ['staf_jadwal'];
      list.push({
        id: 'USER_STAF_JADWAL',
        nama: appData.stafJadwal.nama || 'Staf Pengelola Jadwal',
        username: appData.stafJadwal.username || 'jadwal',
        nip: appData.stafJadwal.nip || 'STAF-JADWAL-01',
        password: appData.stafJadwal.password || 'jadwal123',
        role: sjRoles[0] || 'staf_jadwal',
        roles: sjRoles,
        originalType: 'user',
        noHp: appData.stafJadwal.noHp,
        foto: appData.stafJadwal.foto,
      });
    }

    effectiveWaliKelas.forEach((w) => {
      const userRoles: UserRole[] = Array.isArray(w.roles) && w.roles.length > 0
        ? w.roles
        : [w.role && ['admin', 'wali', 'kesiswaan', 'user', 'guru', 'kurikulum', 'hubin', 'staf_jadwal', 'murid'].includes(w.role) ? w.role : 'wali'];
      
      const primaryRole: UserRole = userRoles[0] || 'wali';
      const isWaliRole = userRoles.includes('wali');
      const k = isWaliRole ? appData.kelas.find((kl) => kl.waliKelasId === w.id) : undefined;
      
      let effectivePassword = w.password || '';
      if (userRoles.includes('kesiswaan') && appData.kesiswaan?.password) {
        effectivePassword = w.password || appData.kesiswaan.password;
      }
      if ((userRoles.includes('user') || userRoles.includes('guru')) && appData.userBiasa?.password) {
        effectivePassword = w.password || appData.userBiasa.password;
      }

      list.push({
        id: w.id,
        nama: w.nama,
        username: w.username || w.nip,
        nip: w.nip || '-',
        password: effectivePassword,
        role: primaryRole,
        roles: userRoles,
        originalType: userRoles.includes('kesiswaan') ? 'kesiswaan' : (userRoles.includes('user') || userRoles.includes('guru')) ? 'user' : 'wali',
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
      const studentRoles: UserRole[] = Array.isArray(s.roles) && s.roles.length > 0 ? s.roles : ['murid'];
      list.push({
        id: s.id,
        nama: s.nama,
        username: s.username || s.nisn,
        nip: s.nisn,
        password: s.password !== undefined && s.password !== '' ? s.password : (s.nisn || ''),
        role: studentRoles[0] || 'murid',
        roles: studentRoles,
        originalType: 'user',
        noHp: s.noWa,
        foto: s.foto,
        kelasNama: k ? k.nama : undefined,
      });
    });

    // 7. Akun Otomatis Piket Kelas
    (appData.kelas || []).forEach((k) => {
      const clean = String(k.nama || '').toLowerCase().replace(/[\s\-_]+/g, '');
      list.push({
        id: `piket-${k.id}`,
        nama: `Piket Kelas ${k.nama}`,
        username: clean,
        nip: k.nama,
        password: String(k.piketPassword || clean),
        role: 'piket_kelas',
        roles: ['piket_kelas'],
        originalType: 'user',
        noHp: '',
        kelasId: k.id,
        kelasNama: k.nama,
      });
    });

    return list.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
  };

  const allUsers = buildUserList();

  const userHasMatchingRole = (u: UserItem, targetRole: string) => {
    const roles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
    if (targetRole === 'user' || targetRole === 'guru') {
      return roles.some((r) => r === 'user' || r === 'guru');
    }
    if (targetRole === 'murid' || targetRole === 'siswa') {
      return roles.some((r) => r === 'murid' || r === 'siswa');
    }
    return roles.includes(targetRole);
  };

  let filteredUsers = allUsers.filter((u) => {
    if (roleTab !== 'semua') {
      if (!userHasMatchingRole(u, roleTab)) return false;
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
      valA = a.roles.join(', ');
      valB = b.roles.join(', ');
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
                role: 'wali',
                roles: ['wali'],
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

  const handleOpenCreateRoleModal = () => {
    if (readOnly) {
      onShowToast('Akses dibatasi! Hanya Administrator yang dapat membuat role baru.', 'warning');
      return;
    }
    onOpenModal(
      'Buat Role / Jabatan Baru',
      <RoleFormModalContent
        appData={appData}
        onUpdateAppData={onUpdateAppData}
        onCloseModal={onCloseModal}
        onShowToast={onShowToast}
      />
    );
  };

  const handleOpenManageRolesModal = () => {
    if (readOnly) {
      onShowToast('Akses dibatasi! Hanya Administrator yang dapat mengelola role.', 'warning');
      return;
    }
    onOpenModal(
      'Kelola & Hapus Role Kustom',
      <ManageRolesModalContent
        appData={appData}
        allUsers={allUsers}
        onUpdateAppData={onUpdateAppData}
        onCloseModal={onCloseModal}
        onConfirmModal={onConfirmModal}
        onShowToast={onShowToast}
      />
    );
  };

  const handleSaveUser = (
    editingUser: UserItem | null,
    nama: string,
    username: string,
    nip: string,
    password: string,
    roles: UserRole[],
    primaryRole: UserRole,
    noHp: string,
    mataPelajaran?: string,
    hariMengajar?: string[],
    batasiLoginHariMengajar?: boolean
  ) => {
    const finalRoles = roles && roles.length > 0 ? roles : [primaryRole || 'guru'];
    const finalPrimaryRole = primaryRole || finalRoles[0] || 'guru';

    // 1. Admin
    if (finalRoles.includes('admin') || editingUser?.roles.includes('admin') || editingUser?.role === 'admin') {
      let updatedAdmin = {
        ...appData.admin,
        username: username || appData.admin?.username || 'admin',
        password: password || appData.admin?.password || 'admin123',
        nama: nama || appData.admin?.nama || 'Administrator Utama',
        foto: editingUser?.foto || appData.admin?.foto || '',
        roles: finalRoles,
      };
      const nextAppData = addAuditLog(
        { ...appData, admin: updatedAdmin },
        'Ubah data admin',
        `Mengubah data akun Administrator: ${nama} (Roles: ${finalRoles.join(', ')})`
      );
      onUpdateAppData(nextAppData);
      onShowToast(`Data administrator berhasil diperbarui!`, 'success');
      onCloseModal();
      return;
    }

    // 2. Murid / Siswa only
    if (finalRoles.length === 1 && (finalRoles[0] === 'murid' || finalRoles[0] === 'siswa')) {
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
              roles: finalRoles,
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
          roles: finalRoles,
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

    // 2b. Staf Pengelola Jadwal (Non-Guru)
    if (finalRoles.includes('staf_jadwal') && editingUser?.id === 'USER_STAF_JADWAL') {
      const nextStafJadwal = {
        ...(appData.stafJadwal || { jabatan: 'Staf Pengelola Jadwal' }),
        nama,
        username,
        nip: nip && nip !== '-' ? nip : 'STAF-JADWAL-01',
        password: password || 'jadwal123',
        noHp,
        foto: editingUser?.foto || appData.stafJadwal?.foto || '',
        roles: finalRoles,
      };
      const nextAppData = addAuditLog(
        {
          ...appData,
          stafJadwal: nextStafJadwal,
        },
        editingUser ? 'Ubah data staf jadwal' : 'Tambah akun staf jadwal',
        `${editingUser ? 'Mengubah' : 'Menambahkan'} data akun Staf Jadwal: ${nama} (Roles: ${finalRoles.join(', ')})`
      );
      onUpdateAppData(nextAppData);
      onShowToast(`Data akun Staf Pengelola Jadwal "${nama}" berhasil ${editingUser ? 'diperbarui' : 'ditambahkan'}!`, 'success');
      onCloseModal();
      return;
    }

    // 3. Wali / Kesiswaan / Guru / Kurikulum / Hubin / Multi-Role
    let updatedWaliKelas = [...(appData.waliKelas || [])];
    let nextKesiswaan = appData.kesiswaan ? { ...appData.kesiswaan } : undefined;
    let nextUserBiasa = appData.userBiasa ? { ...appData.userBiasa } : undefined;

    if (finalRoles.includes('kesiswaan') || editingUser?.id === 'USER_KESISWAAN') {
      nextKesiswaan = {
        ...(appData.kesiswaan || { jabatan: 'WKS Kesiswaan / BP BK' }),
        nama,
        username,
        password,
        foto: editingUser?.foto || appData.kesiswaan?.foto || '',
        roles: finalRoles,
      };
    }

    if (finalRoles.includes('guru') || finalRoles.includes('user') || editingUser?.id === 'USER_BIASA') {
      nextUserBiasa = {
        ...(appData.userBiasa || { jabatan: 'Guru Pengampu' }),
        nama,
        username,
        password,
        foto: editingUser?.foto || appData.userBiasa?.foto || '',
        mataPelajaran: cleanMapelName(mataPelajaran),
        hariMengajar: hariMengajar || [],
        batasiLoginHariMengajar: !!batasiLoginHariMengajar,
        roles: finalRoles,
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
                role: finalPrimaryRole,
                roles: finalRoles,
                additionalRoles: finalRoles.filter((r) => r !== finalPrimaryRole),
                tugasTambahanList: (w.tugasTambahanList || []).filter((d) => {
                  const r = mapDutyToRole(d, appData.customRoles);
                  return !r || finalRoles.includes(r as any);
                }),
                tugasTambahan: (w.tugasTambahanList || [])
                  .filter((d) => {
                    const r = mapDutyToRole(d, appData.customRoles);
                    return !r || finalRoles.includes(r as any);
                  })
                  .join(', '),
                jabatan: (w.tugasTambahanList || [])
                  .filter((d) => {
                    const r = mapDutyToRole(d, appData.customRoles);
                    return !r || finalRoles.includes(r as any);
                  })
                  .join(', '),
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
          role: finalPrimaryRole,
          roles: finalRoles,
          additionalRoles: finalRoles.filter((r) => r !== finalPrimaryRole),
          foto: editingUser.foto,
          mataPelajaran: cleanMapelName(mataPelajaran),
          hariMengajar,
          batasiLoginHariMengajar,
        });
      }
      onShowToast(`Data user "${nama}" berhasil diperbarui (${finalRoles.length} role)!`, 'success');
    } else {
      updatedWaliKelas.push({
        id: 'WAL_' + Date.now(),
        nip: nip || username,
        nama,
        username,
        password,
        noHp,
        role: finalPrimaryRole,
        roles: finalRoles,
        additionalRoles: finalRoles.filter((r) => r !== finalPrimaryRole),
        mataPelajaran,
        hariMengajar,
        batasiLoginHariMengajar,
      });
      onShowToast(`User baru "${nama}" dengan ${finalRoles.length} role berhasil dibuat!`, 'success');
    }

    let nextKelas = appData.kelas;
    if (editingUser && !finalRoles.includes('wali')) {
      nextKelas = (appData.kelas || []).map((k) =>
        k.waliKelasId === editingUser.id ? { ...k, waliKelasId: '' } : k
      );
    }

    const nextAppData = {
      ...appData,
      waliKelas: updatedWaliKelas,
      kelas: nextKelas,
      ...(nextKesiswaan ? { kesiswaan: nextKesiswaan } : {}),
      ...(nextUserBiasa ? { userBiasa: nextUserBiasa } : {}),
    };

    let finalAppData = nextAppData;
    if (editingUser) {
      finalAppData = addAuditLog(finalAppData, 'Mengubah data user', `Mengubah data user: ${nama} (Roles: ${finalRoles.join(', ')})`);
    } else {
      finalAppData = addAuditLog(finalAppData, 'Membuat user baru', `Membuat user baru: ${nama} (Roles: ${finalRoles.join(', ')})`);
    }

    onUpdateAppData(finalAppData);
    onCloseModal();
  };

  const openQuickRoleModal = (user: UserItem) => {
    if (readOnly) {
      onShowToast('Akses dibatasi! Hanya Administrator yang dapat mengubah role.', 'warning');
      return;
    }
    onOpenModal(
      `Atur Role Pengguna: ${user.nama}`,
      <QuickRoleModalContent
        user={user}
        appData={appData}
        onSaveUser={handleSaveUser}
        onCloseModal={onCloseModal}
        onShowToast={onShowToast}
      />
    );
  };

  const openUserForm = (user?: UserItem) => {
    if (readOnly) {
      onShowToast('Akses dibatasi!', 'warning');
      return;
    }
    onOpenModal(
      user ? 'Edit Identitas & Multi-Role User' : 'Tambah User Pengguna Baru',
      <UserFormModalContent
        user={user}
        appData={appData}
        onSaveUser={handleSaveUser}
        onCloseModal={onCloseModal}
        onShowToast={onShowToast}
      />
    );
  };

  const isAdmin = currentUser?.role === 'admin' || (currentUser?.roles && currentUser.roles.includes('admin'));
  const isKesiswaan = currentUser?.role === 'kesiswaan' || (currentUser?.roles && currentUser.roles.includes('kesiswaan'));
  const isWali = currentUser?.role === 'wali' || (currentUser?.roles && currentUser.roles.includes('wali'));

  const canDeleteUser = (user: UserItem) => {
    if (isAdmin) {
      if (user.roles.includes('admin') && currentUser?.data?.username === user.username) return false;
      return true;
    }
    if (isKesiswaan || isWali) {
      return user.roles.includes('murid') || user.role === 'murid';
    }
    return false;
  };

  const handleDeleteUser = (user: UserItem) => {
    if (!canDeleteUser(user)) {
      onShowToast('Akses dibatasi! Anda tidak memiliki izin untuk menghapus user ini.', 'warning');
      return;
    }

    if (user.roles.includes('admin') && isAdmin && currentUser?.data?.username === user.username) {
      onShowToast('Anda tidak dapat menghapus akun Administrator yang sedang aktif dipakai!', 'error');
      return;
    }

    const isStudent = user.roles.includes('murid') || user.role === 'murid';

    onConfirmModal(
      isStudent ? 'Hapus Siswa / Murid' : 'Hapus User Pengguna',
      `Apakah Anda yakin ingin menghapus ${isStudent ? 'siswa' : 'user'} "${user.nama}" (${user.roles.map((r) => getRoleLabel(r, appData.customRoles)).join(', ')})?`,
      'danger',
      () => {
        if (isStudent && user.roles.length === 1) {
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
            `Menghapus akun pengguna: ${user.nama} (${user.username}, roles: ${user.roles.join(', ')})`
          );
          onUpdateAppData(nextAppData);
          onShowToast(`User "${user.nama}" berhasil dihapus.`, 'info');
        }
      }
    );
  };

  const adminCount = allUsers.filter((u) => userHasMatchingRole(u, 'admin')).length;
  const kesiswaanCount = allUsers.filter((u) => userHasMatchingRole(u, 'kesiswaan')).length;
  const kurikulumCount = allUsers.filter((u) => userHasMatchingRole(u, 'kurikulum')).length;
  const stafJadwalCount = allUsers.filter((u) => userHasMatchingRole(u, 'staf_jadwal')).length;
  const hubinCount = allUsers.filter((u) => userHasMatchingRole(u, 'hubin')).length;
  const piketGuruCount = allUsers.filter((u) => userHasMatchingRole(u, 'piket_guru')).length;
  const piketKesiswaanCount = allUsers.filter((u) => userHasMatchingRole(u, 'piket_kesiswaan')).length;
  const piketKelasCount = allUsers.filter((u) => userHasMatchingRole(u, 'piket_kelas')).length;
  const guruCount = allUsers.filter((u) => userHasMatchingRole(u, 'guru')).length;
  const waliCount = allUsers.filter((u) => userHasMatchingRole(u, 'wali')).length;
  const muridCount = allUsers.filter((u) => userHasMatchingRole(u, 'murid')).length;

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
        description="Kelola data pengguna, multi-role hak akses (Admin, Kesiswaan, Wali Kelas, BP/BK, WKS Kurikulum, WKS Hubin, Staf Jadwal, Guru, Piket), password, dan reset akun."
        badge="Manajemen Pengguna & Multi-Role"
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

            {/* Role Filter Dropdown Model */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <Filter className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                <select
                  value={roleTab}
                  onChange={(e) => {
                    setRoleTab(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8.5 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs appearance-none"
                >
                  <option value="semua">Semua ({allUsers.length})</option>
                  <option value="admin">Admin ({adminCount})</option>
                  <option value="kesiswaan">Kesiswaan ({kesiswaanCount})</option>
                  <option value="kurikulum">Kurikulum ({kurikulumCount})</option>
                  <option value="staf_jadwal">Staf Jadwal ({stafJadwalCount})</option>
                  <option value="hubin">Hubin ({hubinCount})</option>
                  <option value="piket_guru">Piket Guru ({piketGuruCount})</option>
                  <option value="piket_kesiswaan">Piket Kesiswaan ({piketKesiswaanCount})</option>
                  <option value="piket_kelas">Piket Kelas ({piketKelasCount})</option>
                  <option value="guru">Guru ({guruCount})</option>
                  <option value="wali">Wali Kelas ({waliCount})</option>
                  <option value="murid">Siswa / Murid ({muridCount})</option>
                  {(appData.customRoles || []).map((cr) => {
                    const count = allUsers.filter((u) => userHasMatchingRole(u, cr.id) || userHasMatchingRole(u, cr.name)).length;
                    return (
                      <option key={cr.id} value={cr.id}>
                        {cr.label || cr.name} ({count})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 text-slate-400 pointer-events-none" />
              </div>

              {roleTab !== 'semua' && (
                <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                  {filteredUsers.length} pengguna
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher: List & Grid */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
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
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openUserForm()}
                  className="px-3.5 py-2 bg-theme-primary hover:bg-theme-primary-dark text-white font-bold rounded-xl text-xs shadow-md shadow-theme-primary/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah User</span>
                </button>

                {onNavigateView && (
                  <button
                    type="button"
                    onClick={() => onNavigateView('pengaturan_role')}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
                    title="Atur hak akses menu yang dapat dilihat oleh setiap role"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Hak Akses Role</span>
                  </button>
                )}

                {/* Single Consolidated Pengaturan User Button with Dropdown */}
                <div className="relative" ref={settingsMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowSettingsMenu((prev) => !prev)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    title="Pengaturan & Opsi Data User"
                  >
                    <UserCog className="w-4 h-4 text-blue-400" />
                    <span>Pengaturan User</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showSettingsMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showSettingsMenu && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                          Pengaturan & Opsi User
                        </span>
                        <UserCog className="w-3.5 h-3.5 text-blue-500" />
                      </div>

                      {/* Group 1: Role Management */}
                      <div className="py-1">
                        <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Role & Hak Akses
                        </p>
                        {onNavigateView && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowSettingsMenu(false);
                              onNavigateView('pengaturan_role');
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 rounded-xl transition flex items-center gap-2.5 cursor-pointer"
                          >
                            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-bold">Pengaturan Hak Akses Menu</div>
                              <div className="text-[10px] text-slate-400">Atur menu yang dapat diakses per role</div>
                            </div>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setShowSettingsMenu(false);
                            handleOpenCreateRoleModal();
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 rounded-xl transition flex items-center gap-2.5 cursor-pointer"
                        >
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold">Buat Role Baru</div>
                            <div className="text-[10px] text-slate-400">Tambah role / jabatan kustom</div>
                          </div>
                        </button>

                        {appData.customRoles && appData.customRoles.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowSettingsMenu(false);
                              handleOpenManageRolesModal();
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-600 rounded-xl transition flex items-center gap-2.5 cursor-pointer"
                          >
                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-bold">Kelola Role Kustom</div>
                              <div className="text-[10px] text-slate-400">{appData.customRoles.length} role kustom aktif</div>
                            </div>
                          </button>
                        )}
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

                      {/* Group 2: Excel Import & Export */}
                      <div className="py-1">
                        <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Import & Export Excel
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSettingsMenu(false);
                            handleDownloadTemplate();
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 rounded-xl transition flex items-center gap-2.5 cursor-pointer"
                        >
                          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                            <Download className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold">Unduh Template Excel</div>
                            <div className="text-[10px] text-slate-400">Format data 30 Wali Kelas</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowSettingsMenu(false);
                            fileInputRef.current?.click();
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 rounded-xl transition flex items-center gap-2.5 cursor-pointer"
                        >
                          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold">Import File Excel</div>
                            <div className="text-[10px] text-slate-400">Impor massal data Wali Kelas</div>
                          </div>
                        </button>
                      </div>

                      {/* Group 3: Danger Zone */}
                      {(appData.waliKelas.length > 0 || (appData.siswa && appData.siswa.length > 0)) && (
                        <>
                          <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                          <div className="py-1">
                            <p className="px-3 py-1 text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                              Pembersihan Data
                            </p>
                            {appData.waliKelas.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowSettingsMenu(false);
                                  handleHapusSeluruhWali();
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition flex items-center gap-2.5 cursor-pointer"
                              >
                                <div className="p-1.5 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                                  <Trash className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="font-bold">Hapus Seluruh Wali Kelas</div>
                                  <div className="text-[10px] text-rose-400">Kosongkan data akun wali kelas</div>
                                </div>
                              </button>
                            )}

                            {appData.siswa && appData.siswa.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowSettingsMenu(false);
                                  handleHapusSeluruhMurid();
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition flex items-center gap-2.5 cursor-pointer"
                              >
                                <div className="p-1.5 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                                  <Trash className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="font-bold">Hapus Seluruh Murid</div>
                                  <div className="text-[10px] text-rose-400">Kosongkan data akun murid</div>
                                </div>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
                            user.roles.includes('admin') ? 'bg-blue-600' : user.roles.includes('kesiswaan') ? 'bg-purple-600' : user.roles.includes('kurikulum') ? 'bg-indigo-600' : user.roles.includes('hubin') ? 'bg-cyan-600' : user.roles.includes('guru') || user.roles.includes('user') ? 'bg-amber-600' : user.roles.includes('murid') || user.roles.includes('siswa') ? 'bg-teal-600' : 'bg-emerald-600'
                          }`}>
                            {user.nama.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                              #{(currentPage - 1) * pageSize + idx + 1}
                            </span>
                            {user.roles.map((r) => (
                              <span key={r} className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${getRoleBadgeClass(r, appData.customRoles)}`}>
                                {getRoleLabel(r, appData.customRoles)}
                              </span>
                            ))}
                          </div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate mt-1.5" title={user.nama}>
                            {user.nama}
                          </h4>
                          <p className="text-[11px] font-mono text-slate-400 dark:text-slate-400">
                            @{user.username} {user.nip ? `• ${user.nip}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Metadata: Kelas / Mapel */}
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
                    </div>

                    {/* Password and Role Badges */}
                    <div className="space-y-2 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                      <div className="flex justify-between items-center text-slate-500">
                        <span className="text-[10px] text-slate-400 font-medium">Password:</span>
                        <span className="font-mono bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded-lg text-slate-800 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>{user.password}</span>
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Role Aktif ({user.roles.length}):
                          </label>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => openQuickRoleModal(user)}
                              className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>Atur Role</span>
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((r) => (
                            <span
                              key={r}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${getRoleBadgeClass(r, appData.customRoles)}`}
                            >
                              {getRoleLabel(r, appData.customRoles)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {(isAdmin || canDeleteUser(user)) && (
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1.5">
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => openQuickRoleModal(user)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-xl border border-indigo-200/80 dark:border-indigo-800 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                          title="Tambah / Ubah Role"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>+ Role</span>
                        </button>
                      )}
                      
                      <div className="flex items-center gap-1.5">
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
                            title={user.roles.includes('murid') ? 'Hapus Siswa / Murid' : 'Hapus User'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
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
                      <span>ROLE HAK AKSES (MULTI-ROLE)</span>
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
                            user.roles.includes('admin') ? 'bg-blue-600' : user.roles.includes('kesiswaan') ? 'bg-purple-600' : user.roles.includes('kurikulum') ? 'bg-indigo-600' : user.roles.includes('hubin') ? 'bg-cyan-600' : user.roles.includes('guru') || user.roles.includes('user') ? 'bg-amber-600' : user.roles.includes('murid') || user.roles.includes('siswa') ? 'bg-teal-600' : 'bg-emerald-600'
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

                    {/* Multi-Role Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap max-w-sm">
                        {user.roles.map((r) => (
                          <span
                            key={r}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border ${getRoleBadgeClass(r, appData.customRoles)}`}
                          >
                            {getRoleLabel(r, appData.customRoles)}
                          </span>
                        ))}

                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => openQuickRoleModal(user)}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1 cursor-pointer"
                            title="Tambah / Ubah Role Pengguna"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Role</span>
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => openQuickRoleModal(user)}
                            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-xl border border-indigo-200/80 dark:border-indigo-800 transition cursor-pointer"
                            title="Kelola Role Pengguna"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
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
                            title={user.roles.includes('murid') ? 'Hapus Siswa / Murid' : 'Hapus User'}
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
