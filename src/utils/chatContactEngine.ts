import {
  AppData,
  ChatMessage,
  ChatContactSettings,
  ChatTargetPermission,
  RoleChatContactRule,
  Siswa,
  UserRole,
  UserSession,
  WaliKelas,
} from '../types';
import { normalizeRoleKey } from './rolePermissionEngine';

export interface ChatTargetInfo {
  id: ChatTargetPermission;
  label: string;
  shortDesc: string;
  group: 'admin' | 'staff' | 'guru' | 'siswa' | 'system';
  badgeColor: string;
}

export const CHAT_TARGET_DEFINITIONS: ChatTargetInfo[] = [
  {
    id: 'admin',
    label: 'Admin Utama (Helpdesk)',
    shortDesc: 'Akses kontak pesan ke Administrator Utama / Helpdesk Sekolah',
    group: 'admin',
    badgeColor: 'blue',
  },
  {
    id: 'kurikulum',
    label: 'Tim Kurikulum & Akademik',
    shortDesc: 'Akses koordinasi kurikulum, jadwal pembelajaran & KBM',
    group: 'staff',
    badgeColor: 'amber',
  },
  {
    id: 'kesiswaan',
    label: 'Tim Kesiswaan (BP/BK)',
    shortDesc: 'Akses koordinasi kesiswaan, bimbingan konseling & kedisiplinan',
    group: 'staff',
    badgeColor: 'rose',
  },
  {
    id: 'staf_jadwal',
    label: 'Staf Pengelola Jadwal KBM',
    shortDesc: 'Akses koordinasi alokasi ruang kelas dan jadwal jam pelajaran',
    group: 'staff',
    badgeColor: 'cyan',
  },
  {
    id: 'wali_all',
    label: 'Semua Wali Kelas',
    shortDesc: 'Akses kontak ke seluruh Wali Kelas yang terdaftar di sekolah',
    group: 'guru',
    badgeColor: 'indigo',
  },
  {
    id: 'wali_binaan',
    label: 'Wali Kelas Binaan Terkait',
    shortDesc: 'Khusus siswa / piket: hanya dapat menghubungi wali kelas dari kelasnya sendiri',
    group: 'guru',
    badgeColor: 'indigo',
  },
  {
    id: 'guru_all',
    label: 'Semua Guru & Tenaga Pendidik',
    shortDesc: 'Akses kontak ke seluruh Guru Mata Pelajaran / Pendidik',
    group: 'guru',
    badgeColor: 'emerald',
  },
  {
    id: 'piket',
    label: 'Petugas Piket Harian',
    shortDesc: 'Akses kontak ke Petugas Piket (Piket Guru, Piket Kesiswaan, Piket Kelas)',
    group: 'staff',
    badgeColor: 'purple',
  },
  {
    id: 'siswa_binaan',
    label: 'Siswa Binaan (Kelas Sendiri)',
    shortDesc: 'Hanya dapat menghubungi siswa yang berada di kelas binaan wali kelas tersebut',
    group: 'siswa',
    badgeColor: 'teal',
  },
  {
    id: 'siswa_all',
    label: 'Semua Siswa Sekolah',
    shortDesc: 'Akses direktori kontak ke seluruh siswa terdaftar di sekolah',
    group: 'siswa',
    badgeColor: 'teal',
  },
  {
    id: 'broadcast',
    label: 'Siaran Broadcast (Semua)',
    shortDesc: 'Izin mengirimkan pesan siaran massal ke seluruh pengguna aplikasi',
    group: 'system',
    badgeColor: 'blue',
  },
];

export const DEFAULT_CHAT_CONTACT_RULES: Record<string, RoleChatContactRule> = {
  admin: {
    roleKey: 'admin',
    roleLabel: 'Administrator Utama',
    allowedTargets: [
      'admin',
      'kurikulum',
      'kesiswaan',
      'staf_jadwal',
      'wali_all',
      'guru_all',
      'piket',
      'siswa_all',
      'broadcast',
    ],
    allowBroadcast: true,
    customDescription: 'Akses penuh tanpa batas ke seluruh kontak pengguna dan broadcast',
  },
  kurikulum: {
    roleKey: 'kurikulum',
    roleLabel: 'Tim WKS Kurikulum',
    allowedTargets: [
      'admin',
      'kurikulum',
      'kesiswaan',
      'staf_jadwal',
      'wali_all',
      'guru_all',
      'piket',
      'broadcast',
    ],
    allowBroadcast: true,
    customDescription: 'Dapat menghubungi manajemen, guru, wali kelas, dan staf jadwal',
  },
  kesiswaan: {
    roleKey: 'kesiswaan',
    roleLabel: 'Tim Kesiswaan / BP-BK',
    allowedTargets: [
      'admin',
      'kurikulum',
      'kesiswaan',
      'wali_all',
      'guru_all',
      'piket',
      'siswa_all',
      'broadcast',
    ],
    allowBroadcast: true,
    customDescription: 'Dapat menghubungi seluruh siswa, wali kelas, guru, dan admin',
  },
  wali: {
    roleKey: 'wali',
    roleLabel: 'Wali Kelas',
    allowedTargets: [
      'admin',
      'kurikulum',
      'kesiswaan',
      'wali_all',
      'guru_all',
      'siswa_binaan',
    ],
    allowBroadcast: false,
    customDescription: 'Dapat menghubungi manajemen, rekan guru, dan siswa kelas binaannya',
  },
  guru: {
    roleKey: 'guru',
    roleLabel: 'Guru Mata Pelajaran',
    allowedTargets: [
      'admin',
      'kurikulum',
      'kesiswaan',
      'staf_jadwal',
      'wali_all',
      'guru_all',
    ],
    allowBroadcast: false,
    customDescription: 'Dapat berkonsultasi dengan admin, kurikulum, kesiswaan, dan rekan guru',
  },
  staf_jadwal: {
    roleKey: 'staf_jadwal',
    roleLabel: 'Staf Pengelola Jadwal',
    allowedTargets: [
      'admin',
      'kurikulum',
      'guru_all',
      'wali_all',
    ],
    allowBroadcast: false,
    customDescription: 'Koordinasi jadwal KBM dengan tim kurikulum, guru, dan wali kelas',
  },
  piket: {
    roleKey: 'piket',
    roleLabel: 'Petugas Piket Harian',
    allowedTargets: [
      'admin',
      'wali_all',
      'kesiswaan',
    ],
    allowBroadcast: false,
    customDescription: 'Koordinasi terbatas dengan Helpdesk, Kesiswaan, dan Wali Kelas',
  },
  piket_guru: {
    roleKey: 'piket_guru',
    roleLabel: 'Piket Guru',
    allowedTargets: [
      'admin',
      'wali_all',
      'kesiswaan',
      'guru_all',
    ],
    allowBroadcast: false,
    customDescription: 'Petugas piket guru harian',
  },
  piket_kesiswaan: {
    roleKey: 'piket_kesiswaan',
    roleLabel: 'Piket Kesiswaan',
    allowedTargets: [
      'admin',
      'wali_all',
      'kesiswaan',
      'piket',
    ],
    allowBroadcast: false,
    customDescription: 'Petugas piket penegakan kedisiplinan kesiswaan',
  },
  piket_kelas: {
    roleKey: 'piket_kelas',
    roleLabel: 'Piket Kelas',
    allowedTargets: [
      'admin',
      'wali_binaan',
      'wali_all',
    ],
    allowBroadcast: false,
    customDescription: 'Petugas piket pengisian presensi kelas',
  },
  murid: {
    roleKey: 'murid',
    roleLabel: 'Siswa / Murid',
    allowedTargets: [
      'admin',
      'wali_binaan',
    ],
    allowBroadcast: false,
    customDescription: 'Hanya dapat menghubungi Helpdesk dan Wali Kelas binaannya',
  },
  siswa: {
    roleKey: 'siswa',
    roleLabel: 'Siswa / Murid',
    allowedTargets: [
      'admin',
      'wali_binaan',
    ],
    allowBroadcast: false,
    customDescription: 'Hanya dapat menghubungi Helpdesk dan Wali Kelas binaannya',
  },
  user: {
    roleKey: 'user',
    roleLabel: 'User Biasa',
    allowedTargets: [
      'admin',
    ],
    allowBroadcast: false,
    customDescription: 'Akses Helpdesk Administrator',
  },
};

/**
 * Mendapatkan rule kontak chat untuk role tertentu dengan fallback ke default
 */
export function getRoleChatRule(appData: AppData, rawRoleKey: string): RoleChatContactRule {
  const normKey = normalizeRoleKey(rawRoleKey);
  const customConfig = appData.chatContactSettings?.rules;

  if (customConfig && customConfig[normKey]) {
    return customConfig[normKey];
  }

  if (DEFAULT_CHAT_CONTACT_RULES[normKey]) {
    return DEFAULT_CHAT_CONTACT_RULES[normKey];
  }

  // Fallback default
  return {
    roleKey: normKey,
    roleLabel: rawRoleKey.toUpperCase(),
    allowedTargets: ['admin'],
    allowBroadcast: false,
    customDescription: `Pengaturan kontak untuk role ${rawRoleKey}`,
  };
}

/**
 * Mendapatkan seluruh rules kontak chat dari appData
 */
export function getAllRoleChatRules(appData: AppData): RoleChatContactRule[] {
  const customRules = appData.chatContactSettings?.rules || {};
  const baseKeys = Object.keys(DEFAULT_CHAT_CONTACT_RULES);
  
  // Custom roles registered in appData
  const registeredCustomRoles = (appData.customRoles || []).map(r => normalizeRoleKey(r.name));
  const allKeys = Array.from(new Set([...baseKeys, ...registeredCustomRoles, ...Object.keys(customRules)]));

  return allKeys.map(key => {
    if (customRules[key]) return customRules[key];
    if (DEFAULT_CHAT_CONTACT_RULES[key]) return DEFAULT_CHAT_CONTACT_RULES[key];
    return {
      roleKey: key,
      roleLabel: key.toUpperCase(),
      allowedTargets: ['admin'],
      allowBroadcast: false,
    };
  });
}

/**
 * Memperbarui rule kontak chat untuk role tertentu di appData
 */
export function updateRoleChatRuleInAppData(
  appData: AppData,
  roleKey: string,
  allowedTargets: ChatTargetPermission[],
  allowBroadcast?: boolean,
  customDescription?: string
): AppData {
  const normKey = normalizeRoleKey(roleKey);
  const existingRules = appData.chatContactSettings?.rules || { ...DEFAULT_CHAT_CONTACT_RULES };

  const currentRule = existingRules[normKey] || DEFAULT_CHAT_CONTACT_RULES[normKey] || {
    roleKey: normKey,
    roleLabel: roleKey.toUpperCase(),
    allowedTargets: ['admin'],
  };

  const updatedRule: RoleChatContactRule = {
    ...currentRule,
    roleKey: normKey,
    allowedTargets,
    allowBroadcast: allowBroadcast ?? allowedTargets.includes('broadcast'),
    customDescription: customDescription ?? currentRule.customDescription,
    updatedAt: new Date().toISOString(),
  };

  const updatedSettings: ChatContactSettings = {
    enabled: appData.chatContactSettings?.enabled ?? true,
    rules: {
      ...existingRules,
      [normKey]: updatedRule,
    },
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin',
  };

  return {
    ...appData,
    chatContactSettings: updatedSettings,
  };
}

/**
 * Mengembalikan konfigurasi kontak chat ke preset default sistem
 */
export function resetChatContactRulesToDefault(appData: AppData): AppData {
  const resetSettings: ChatContactSettings = {
    enabled: true,
    rules: { ...DEFAULT_CHAT_CONTACT_RULES },
    updatedAt: new Date().toISOString(),
    updatedBy: 'Sistem (Reset)',
  };

  return {
    ...appData,
    chatContactSettings: resetSettings,
  };
}

export interface ChatContactThreadItem {
  username: string;
  nama: string;
  role: UserRole;
  lastTime: string;
  unread: number;
  lastText: string;
  foto?: string;
  noHp?: string;
  badge?: string;
  status?: 'pending' | 'sent' | 'read';
  lastIsMe?: boolean;
  lastIsRead?: boolean;
  lastStatus?: 'pending' | 'sent' | 'read';
}

/**
 * Menghitung daftar kontak yang diizinkan untuk dihubungi oleh user saat ini
 * berdasarkan Role Contact Matrix yang terkonfigurasi.
 */
export function getPermittedChatContacts(
  appData: AppData,
  currentUser: UserSession
): Record<string, ChatContactThreadItem> {
  const threadMap: Record<string, ChatContactThreadItem> = {};
  if (!currentUser || !currentUser.role) return threadMap;

  const currentRoleKey = normalizeRoleKey(currentUser.role);
  const currentUsername = String(
    (currentUser.data as any)?.username ||
    (currentUser.data as any)?.nip ||
    (currentUser.data as any)?.nisn ||
    (currentUser.data as any)?.id ||
    ''
  ).trim().toLowerCase();

  const rule = getRoleChatRule(appData, currentRoleKey);
  const allowed = rule.allowedTargets || ['admin'];

  const isCurrentAdmin = currentRoleKey === 'admin';

  // 1. Target: 'broadcast' (Broadcast Massal)
  if (allowed.includes('broadcast') || rule.allowBroadcast) {
    threadMap['all'] = {
      username: 'all',
      nama: 'Broadcast (Semua Pengguna)',
      role: 'admin',
      lastTime: '',
      unread: 0,
      lastText: 'Pengumuman / Pesan Siaran Massal',
      badge: 'Broadcast',
    };
  }

  // 2. Target: 'admin' (Administrator Utama / Helpdesk)
  if (allowed.includes('admin') && !isCurrentAdmin) {
    threadMap['admin'] = {
      username: 'admin',
      nama: appData.admin?.nama ? `${appData.admin.nama} (Helpdesk)` : 'Administrator Utama (Helpdesk)',
      role: 'admin',
      lastTime: '',
      unread: 0,
      lastText: 'Pusat Bantuan & Helpdesk Sistem',
      foto: appData.admin?.foto,
      noHp: (appData.admin as any)?.noHp || '',
      badge: 'Helpdesk',
    };
  }

  // 3. Target: 'kurikulum'
  if (allowed.includes('kurikulum')) {
    const kurikulumUser = appData.kurikulum?.username || 'kurikulum';
    const kurKey = String(kurikulumUser).toLowerCase();
    if (kurKey !== currentUsername) {
      threadMap[kurKey] = {
        username: kurikulumUser,
        nama: appData.kurikulum?.nama ? `${appData.kurikulum.nama} (Kurikulum)` : 'Tim Kurikulum & Akademik',
        role: 'kurikulum',
        lastTime: '',
        unread: 0,
        lastText: 'Koordinasi Kurikulum, Jadwal & KBM',
        foto: appData.kurikulum?.foto,
        noHp: (appData.kurikulum as any)?.noHp || '',
        badge: 'Kurikulum',
      };
    }
  }

  // 4. Target: 'kesiswaan'
  if (allowed.includes('kesiswaan')) {
    const kesiswaanUser = appData.kesiswaan?.username || 'kesiswaan';
    const kKey = String(kesiswaanUser).toLowerCase();
    if (kKey !== currentUsername) {
      threadMap[kKey] = {
        username: kesiswaanUser,
        nama: appData.kesiswaan?.nama ? `${appData.kesiswaan.nama} (Kesiswaan & BP/BK)` : 'Tim Kesiswaan (BP/BK)',
        role: 'kesiswaan',
        lastTime: '',
        unread: 0,
        lastText: 'Koordinasi Kesiswaan, Konseling & Kedisiplinan',
        foto: appData.kesiswaan?.foto,
        noHp: (appData.kesiswaan as any)?.noHp || '',
        badge: 'Kesiswaan',
      };
    }
  }

  // 5. Target: 'staf_jadwal'
  if (allowed.includes('staf_jadwal')) {
    const jadwalUser = appData.stafJadwal?.username || 'jadwal';
    const jKey = String(jadwalUser).toLowerCase();
    if (jKey !== currentUsername) {
      threadMap[jKey] = {
        username: jadwalUser,
        nama: appData.stafJadwal?.nama ? `${appData.stafJadwal.nama} (Staf Jadwal)` : 'Staf Pengelola Jadwal',
        role: 'staf_jadwal',
        lastTime: '',
        unread: 0,
        lastText: 'Pengelolaan Jadwal KBM & Ruangan',
        foto: (appData.stafJadwal as any)?.foto,
        noHp: (appData.stafJadwal as any)?.noHp || '',
        badge: 'Jadwal',
      };
    }
  }

  // 6. Target: 'wali_all' (Semua Wali Kelas)
  if (allowed.includes('wali_all')) {
    if (Array.isArray(appData.waliKelas)) {
      appData.waliKelas.forEach((w) => {
        const uKey = String(w.username || w.nip || w.id).toLowerCase();
        if (uKey && uKey !== currentUsername && uKey !== 'admin') {
          const assignedKelas = appData.kelas?.find((k) => k.waliKelasId === w.id);
          const suffix = assignedKelas ? ` (Wali ${assignedKelas.nama})` : ' (Wali Kelas)';
          threadMap[uKey] = {
            username: String(w.username || w.nip || w.id),
            nama: `${w.nama}${suffix}`,
            role: 'wali',
            lastTime: '',
            unread: 0,
            lastText: assignedKelas ? `Wali Kelas ${assignedKelas.nama}` : 'Wali Kelas',
            foto: w.foto,
            noHp: w.noHp,
            badge: assignedKelas?.nama || 'Wali',
          };
        }
      });
    }
  }

  // 7. Target: 'wali_binaan' (Hanya Wali Kelas dari Siswa / Piket Terkait)
  if (allowed.includes('wali_binaan') && !allowed.includes('wali_all')) {
    let targetWaliId: string | undefined;

    // A. Check if user is siswa
    if (currentRoleKey === 'siswa' || currentRoleKey === 'murid') {
      const siswaObj = (appData.siswa || []).find(
        (s) =>
          s.id === (currentUser.data as any)?.id ||
          s.nisn === (currentUser.data as any)?.nisn ||
          String(s.username || '').toLowerCase() === currentUsername
      ) || (currentUser.data as Siswa);

      if (siswaObj?.kelasId) {
        const myKelas = (appData.kelas || []).find((k) => k.id === siswaObj.kelasId);
        targetWaliId = myKelas?.waliKelasId;
      }
    }

    // B. Check if user is piket kelas
    if (currentRoleKey === 'piket_kelas' || currentRoleKey === 'piket') {
      const piketKelasId = (currentUser.data as any)?.kelasId;
      if (piketKelasId) {
        const myKelas = (appData.kelas || []).find((k) => k.id === piketKelasId);
        targetWaliId = myKelas?.waliKelasId;
      }
    }

    if (targetWaliId) {
      const myWali = (appData.waliKelas || []).find((w) => w.id === targetWaliId);
      if (myWali) {
        const wKey = String(myWali.username || myWali.nip || myWali.id).toLowerCase();
        const assignedKelas = appData.kelas?.find((k) => k.waliKelasId === myWali.id);
        threadMap[wKey] = {
          username: String(myWali.username || myWali.nip || myWali.id),
          nama: `${myWali.nama} (Wali Kelas Binaan)`,
          role: 'wali',
          lastTime: '',
          unread: 0,
          lastText: assignedKelas ? `Wali Kelas ${assignedKelas.nama}` : 'Wali Kelas Anda',
          foto: myWali.foto,
          noHp: myWali.noHp,
          badge: assignedKelas?.nama ? `Wali ${assignedKelas.nama}` : 'Wali Anda',
        };
      }
    }
  }

  // 8. Target: 'guru_all' (Semua Guru)
  if (allowed.includes('guru_all')) {
    if (Array.isArray(appData.waliKelas)) {
      appData.waliKelas.forEach((g) => {
        const uKey = String(g.username || g.nip || g.id).toLowerCase();
        if (uKey && uKey !== currentUsername && uKey !== 'admin' && !threadMap[uKey]) {
          threadMap[uKey] = {
            username: String(g.username || g.nip || g.id),
            nama: `${g.nama} (Guru)`,
            role: 'guru',
            lastTime: '',
            unread: 0,
            lastText: 'Guru & Tenaga Pendidik',
            foto: g.foto,
            noHp: g.noHp,
            badge: 'Guru',
          };
        }
      });
    }
    if (appData.userBiasa && appData.userBiasa.username) {
      const uKey = String(appData.userBiasa.username).toLowerCase();
      if (uKey !== currentUsername && !threadMap[uKey]) {
        threadMap[uKey] = {
          username: String(appData.userBiasa.username),
          nama: appData.userBiasa.nama || 'Guru Pengampu',
          role: 'user',
          lastTime: '',
          unread: 0,
          lastText: 'Guru & Tenaga Kependidikan',
          foto: appData.userBiasa.foto,
          badge: 'Guru',
        };
      }
    }
  }

  // 9. Target: 'piket' (Petugas Piket)
  if (allowed.includes('piket')) {
    if (Array.isArray(appData.petugasPiket)) {
      appData.petugasPiket.forEach((p) => {
        const pKey = String(p.username || p.id).toLowerCase();
        if (pKey && pKey !== currentUsername && !threadMap[pKey]) {
          const tipeLabel = p.tipe === 'piket_kesiswaan' ? 'Piket Kesiswaan' : 'Piket Guru';
          threadMap[pKey] = {
            username: String(p.username || p.id),
            nama: `${p.nama} (${tipeLabel})`,
            role: 'piket',
            lastTime: '',
            unread: 0,
            lastText: `Petugas Piket (${p.hariPiket?.join(', ') || 'Harian'})`,
            foto: p.foto,
            noHp: p.noHp,
            badge: 'Piket',
          };
        }
      });
    }
  }

  // 10. Target: 'siswa_binaan' (Hanya siswa dalam kelas yang diampu oleh Wali Kelas)
  if (allowed.includes('siswa_binaan') && !allowed.includes('siswa_all')) {
    const currentWaliObj = (appData.waliKelas || []).find(
      (w) =>
        String(w.username || '').toLowerCase() === currentUsername ||
        String(w.nip || '').toLowerCase() === currentUsername ||
        w.id === (currentUser.data as any)?.id
    );

    if (currentWaliObj) {
      const assignedKelasIds = (appData.kelas || [])
        .filter((k) => k.waliKelasId === currentWaliObj.id)
        .map((k) => k.id);

      const siswaBinaan = (appData.siswa || []).filter((s) => assignedKelasIds.includes(s.kelasId));
      siswaBinaan.forEach((s) => {
        const sKey = String(s.nisn || s.id).toLowerCase();
        if (sKey && sKey !== currentUsername) {
          const kelasObj = (appData.kelas || []).find((k) => k.id === s.kelasId);
          threadMap[sKey] = {
            username: String(s.nisn || s.id),
            nama: `${s.nama} (${kelasObj?.nama || 'Kelas'})`,
            role: 'siswa',
            lastTime: '',
            unread: 0,
            lastText: `Siswa Kelas ${kelasObj?.nama || 'Binaan'}`,
            foto: s.foto,
            noHp: s.noWa || s.noWaOrangTua || (s as any).noHp || (s as any).noHpOrtu,
            badge: kelasObj?.nama || 'Siswa',
          };
        }
      });
    }
  }

  // 11. Target: 'siswa_all' (Seluruh Siswa)
  if (allowed.includes('siswa_all')) {
    if (Array.isArray(appData.siswa)) {
      appData.siswa.forEach((s) => {
        const sKey = String(s.nisn || s.id).toLowerCase();
        if (sKey && sKey !== currentUsername) {
          const kelasObj = (appData.kelas || []).find((k) => k.id === s.kelasId);
          threadMap[sKey] = {
            username: String(s.nisn || s.id),
            nama: `${s.nama} (${kelasObj?.nama || 'Kelas'})`,
            role: 'siswa',
            lastTime: '',
            unread: 0,
            lastText: `Siswa Kelas ${kelasObj?.nama || '-'}`,
            foto: s.foto,
            noHp: s.noWa || s.noWaOrangTua || (s as any).noHp || (s as any).noHpOrtu,
            badge: kelasObj?.nama || 'Siswa',
          };
        }
      });
    }
  }

  return threadMap;
}

/**
 * Cek apakah currentUser memiliki izin mengirimkan pesan ke penerima tertentu
 */
export function canUserChatWithRecipient(
  appData: AppData,
  currentUser: UserSession,
  recipientUsername: string
): boolean {
  if (!currentUser || !recipientUsername) return false;
  if (recipientUsername.toLowerCase() === 'all') {
    const roleRule = getRoleChatRule(appData, currentUser.role);
    return roleRule.allowBroadcast || roleRule.allowedTargets.includes('broadcast');
  }

  const permitted = getPermittedChatContacts(appData, currentUser);
  const targetKey = recipientUsername.trim().toLowerCase();
  return Boolean(permitted[targetKey]);
}
