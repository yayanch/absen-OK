import React, { useState, useEffect, useMemo } from 'react';
import { UserCog, UserCheck, Save, Trash2, User, Lock, ShieldCheck, Activity, CheckCircle, XCircle } from 'lucide-react';
import { AppData, AdminAccount, UserSession, WaliKelas } from '../../types';
import { PageHeader } from '../common/UIComponents';
import { compressBase64Image, saveSessionUser } from '../../utils/helpers';
import { runAutomatedGoldenDatasetSuite, GoldenDatasetTestResult } from '../../utils/reportEngine';

interface PengaturanAdminViewProps {
  appData: AppData;
  currentUser: UserSession;
  onUpdateAppData: (updated: AppData) => void;
  onUpdateSession: (session: UserSession) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const PengaturanAdminView: React.FC<PengaturanAdminViewProps> = ({
  appData,
  currentUser,
  onUpdateAppData,
  onUpdateSession,
  onShowToast,
}) => {
  const [testResults, setTestResults] = useState<GoldenDatasetTestResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Helper to accurately match a user in waliKelas by explicit ID, Username, or NIP
  const findMatchingWali = (currentData: any, list: WaliKelas[] = []): { item: WaliKelas; index: number } | null => {
    if (!currentData || !Array.isArray(list) || list.length === 0) return null;
    
    const targetId = currentData.id ? String(currentData.id).trim() : '';
    const targetUsername = currentData.username ? String(currentData.username).toLowerCase().trim() : '';
    const targetNip = currentData.nip ? String(currentData.nip).toLowerCase().trim() : '';

    const index = list.findIndex((w) => {
      if (!w) return false;
      const wId = w.id ? String(w.id).trim() : '';
      const wUsername = w.username ? String(w.username).toLowerCase().trim() : '';
      const wNip = w.nip ? String(w.nip).toLowerCase().trim() : '';

      if (targetId && wId && wId === targetId) return true;
      if (targetUsername && wUsername && wUsername === targetUsername) return true;
      if (targetNip && wNip && wNip === targetNip) return true;
      if (targetUsername && wNip && wNip === targetUsername) return true;
      if (targetNip && wUsername && wUsername === targetNip) return true;

      return false;
    });

    if (index >= 0) {
      return { item: list[index], index };
    }
    return null;
  };

  const getInitialState = () => {
    const currentData = (currentUser?.data || {}) as any;

    if (currentUser.role === 'admin') {
      const a = appData.admin || { username: 'admin', password: 'admin123', nama: 'Administrator Utama', foto: '' };
      return {
        nama: a.nama || currentData.nama || 'Administrator Utama',
        username: a.username || currentData.username || 'admin',
        password: a.password || currentData.password || '',
        foto: a.foto !== undefined ? a.foto : (currentData.foto || ''),
        jabatan: 'Administrator',
      };
    } else if (currentUser.role === 'murid' || currentUser.role === 'siswa') {
      const found = appData.siswa?.find((s) => 
        (currentData.id && s.id === currentData.id) || 
        (currentData.nisn && s.nisn === currentData.nisn) || 
        (currentData.username && s.username === currentData.username)
      );
      const s = found || currentData || {};
      return {
        nama: s.nama || currentData.nama || '',
        username: s.username || s.nisn || currentData.username || currentData.nisn || '',
        password: s.password || s.nisn || currentData.password || currentData.nisn || '',
        foto: s.foto !== undefined ? s.foto : (currentData.foto || ''),
        jabatan: 'Siswa / Murid',
      };
    } else if (currentUser.role === 'kesiswaan') {
      const matched = findMatchingWali(currentData, appData.waliKelas);
      const kesiswaanObj = appData.kesiswaan;
      const u = matched?.item || (currentData.username === 'kesiswaan' ? kesiswaanObj : null) || currentData || {};
      return {
        nama: u.nama || currentData.nama || 'Tim WKS Kesiswaan & BP BK',
        username: u.username || currentData.username || 'kesiswaan',
        password: u.password || currentData.password || '123',
        foto: u.foto !== undefined ? u.foto : (currentData.foto || ''),
        jabatan: u.jabatan || currentData.jabatan || 'WKS Kesiswaan / BP BK',
      };
    } else if (currentUser.role === 'kurikulum') {
      const matched = findMatchingWali(currentData, appData.waliKelas);
      const kurikulumObj = appData.kurikulum;
      const u = matched?.item || (currentData.username === 'kurikulum' ? kurikulumObj : null) || currentData || {};
      return {
        nama: u.nama || currentData.nama || 'Tim Kurikulum & Akademik',
        username: u.username || currentData.username || 'kurikulum',
        password: u.password || currentData.password || '123',
        foto: u.foto !== undefined ? u.foto : (currentData.foto || ''),
        jabatan: u.jabatan || currentData.jabatan || 'WKS Kurikulum',
      };
    } else if (currentUser.role === 'user' || currentUser.role === 'guru') {
      const matched = findMatchingWali(currentData, appData.waliKelas);
      const userBiasaObj = (currentData.username === 'guru' || currentData.username === 'user') ? appData.userBiasa : null;
      const u = matched?.item || currentData || userBiasaObj || {};
      return {
        nama: u.nama || currentData.nama || 'Guru / Staf Pengajar',
        username: u.username || currentData.username || u.nip || 'guru',
        password: u.password || currentData.password || '123',
        foto: u.foto !== undefined ? u.foto : (currentData.foto || ''),
        jabatan: u.jabatan || currentData.jabatan || (u.mataPelajaran ? `Guru ${u.mataPelajaran}` : 'Guru Pengampu'),
      };
    } else {
      // Wali Kelas / Hubin / Peran lainnya
      const matched = findMatchingWali(currentData, appData.waliKelas);
      const u = matched?.item || currentData || {};
      return {
        nama: u.nama || currentData.nama || '',
        username: u.username || currentData.username || u.nip || '',
        password: u.password || currentData.password || '123',
        foto: u.foto !== undefined ? u.foto : (currentData.foto || ''),
        jabatan: u.jabatan || currentData.jabatan || (currentUser.role === 'hubin' ? 'WKS Hubin / Humas' : 'Wali Kelas'),
      };
    }
  };

  const initial = useMemo(() => getInitialState(), [currentUser, appData]);
  const [nama, setNama] = useState(initial.nama);
  const [jabatan, setJabatan] = useState(initial.jabatan);
  const [username, setUsername] = useState(initial.username);
  const [password, setPassword] = useState(initial.password);
  const [fotoBase64, setFotoBase64] = useState(initial.foto);

  // Sync state when currentUser or appData changes
  useEffect(() => {
    const fresh = getInitialState();
    setNama(fresh.nama);
    setJabatan(fresh.jabatan);
    setUsername(fresh.username);
    setPassword(fresh.password);
    setFotoBase64(fresh.foto);
  }, [currentUser?.role, (currentUser?.data as any)?.id, (currentUser?.data as any)?.username, (currentUser?.data as any)?.nip, (currentUser?.data as any)?.nama, (currentUser?.data as any)?.foto]);

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const raw = evt.target?.result as string;
      const compressed = await compressBase64Image(raw, 350, 0.7);
      setFotoBase64(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNama = nama.trim();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanJabatan = jabatan.trim();

    let nextAppData: AppData = { ...appData };
    const currentData = (currentUser.data || {}) as any;

    if (currentUser.role === 'admin') {
      const newAdmin: AdminAccount = {
        nama: cleanNama || 'Administrator Utama',
        username: cleanUsername || 'admin',
        password: cleanPassword,
        foto: fotoBase64,
      };
      nextAppData.admin = newAdmin;
      const newSession: UserSession = { role: 'admin', data: newAdmin };
      onUpdateSession(newSession);
      saveSessionUser(newSession);
    } else if (currentUser.role === 'kesiswaan') {
      const updatedKesiswaan = {
        ...(appData.kesiswaan || { jabatan: 'WKS Kesiswaan / BP BK' }),
        nama: cleanNama || 'Tim WKS Kesiswaan & BP BK',
        username: cleanUsername || 'kesiswaan',
        password: cleanPassword,
        foto: fotoBase64,
        jabatan: cleanJabatan || 'WKS Kesiswaan / BP BK',
      };
      nextAppData.kesiswaan = updatedKesiswaan;

      let updatedWaliList = [...(appData.waliKelas || [])];
      const matched = findMatchingWali(currentData, updatedWaliList);

      if (matched) {
        const updatedWali: WaliKelas = {
          ...matched.item,
          nama: cleanNama || matched.item.nama,
          username: cleanUsername || matched.item.username,
          password: cleanPassword,
          foto: fotoBase64,
          role: matched.item.role || 'kesiswaan',
          jabatan: cleanJabatan || matched.item.jabatan || 'WKS Kesiswaan / BP BK',
        };
        updatedWaliList[matched.index] = updatedWali;
        const newRoles = currentUser.roles || (updatedWali.roles) || [updatedWali.role || 'kesiswaan'];
        const newSession: UserSession = { role: updatedWali.role || 'kesiswaan', roles: newRoles, data: updatedWali };
        onUpdateSession(newSession);
        saveSessionUser(newSession);
      } else {
        const newRoles = currentUser.roles || ((updatedKesiswaan as any).roles) || ['kesiswaan'];
        const newSession: UserSession = { role: 'kesiswaan', roles: newRoles, data: updatedKesiswaan };
        onUpdateSession(newSession);
        saveSessionUser(newSession);
      }
      nextAppData.waliKelas = updatedWaliList;
    } else if (currentUser.role === 'kurikulum') {
      const updatedKurikulum = {
        ...(appData.kurikulum || { jabatan: 'WKS Kurikulum' }),
        nama: cleanNama || 'Tim Kurikulum & Akademik',
        username: cleanUsername || 'kurikulum',
        password: cleanPassword,
        foto: fotoBase64,
        jabatan: cleanJabatan || 'WKS Kurikulum',
      };
      nextAppData.kurikulum = updatedKurikulum;

      let updatedWaliList = [...(appData.waliKelas || [])];
      const matched = findMatchingWali(currentData, updatedWaliList);

      if (matched) {
        const updatedWali: WaliKelas = {
          ...matched.item,
          nama: cleanNama || matched.item.nama,
          username: cleanUsername || matched.item.username,
          password: cleanPassword,
          foto: fotoBase64,
          role: matched.item.role || 'kurikulum',
          jabatan: cleanJabatan || matched.item.jabatan || 'WKS Kurikulum',
        };
        updatedWaliList[matched.index] = updatedWali;
        const newRoles = currentUser.roles || (updatedWali.roles) || [updatedWali.role || 'kurikulum'];
        const newSession: UserSession = { role: updatedWali.role || 'kurikulum', roles: newRoles, data: updatedWali };
        onUpdateSession(newSession);
        saveSessionUser(newSession);
      } else {
        const newRoles = currentUser.roles || ((updatedKurikulum as any).roles) || ['kurikulum'];
        const newSession: UserSession = { role: 'kurikulum', roles: newRoles, data: updatedKurikulum };
        onUpdateSession(newSession);
        saveSessionUser(newSession);
      }
      nextAppData.waliKelas = updatedWaliList;
    } else if (currentUser.role === 'user' || currentUser.role === 'guru') {
      let updatedWaliList = [...(appData.waliKelas || [])];
      const matched = findMatchingWali(currentData, updatedWaliList);

      let updatedGuruData: any;
      if (matched) {
        updatedGuruData = {
          ...matched.item,
          nama: cleanNama || matched.item.nama,
          username: cleanUsername || matched.item.username,
          password: cleanPassword,
          foto: fotoBase64,
          role: matched.item.role || 'guru',
          roles: Array.isArray(matched.item.roles) && matched.item.roles.length > 0 ? matched.item.roles : [matched.item.role || 'guru'],
          jabatan: cleanJabatan || matched.item.jabatan || 'Guru Pengampu',
        };
        updatedWaliList[matched.index] = updatedGuruData;
      } else {
        updatedGuruData = {
          id: currentData.id || 'GUR_' + Date.now(),
          nip: currentData.nip || cleanUsername,
          nama: cleanNama || currentData.nama || 'Guru / Staf Pengajar',
          username: cleanUsername || currentData.username || 'guru',
          password: cleanPassword,
          noHp: currentData.noHp || '',
          role: 'guru',
          roles: currentUser.roles || ['guru'],
          foto: fotoBase64,
          jabatan: cleanJabatan || 'Guru Pengampu',
        };
        updatedWaliList.push(updatedGuruData);
      }

      if (currentData.username === 'guru' || cleanUsername === 'guru') {
        nextAppData.userBiasa = {
          ...(appData.userBiasa || {}),
          nama: cleanNama || 'Guru / Staf Pengajar',
          username: cleanUsername || 'guru',
          password: cleanPassword,
          foto: fotoBase64,
          jabatan: cleanJabatan || 'Guru Pengampu',
        };
      }

      nextAppData.waliKelas = updatedWaliList;
      const newRoles = currentUser.roles || (updatedGuruData.roles) || ['guru'];
      const newSession: UserSession = { role: updatedGuruData.role || 'guru', roles: newRoles, data: updatedGuruData };
      onUpdateSession(newSession);
      saveSessionUser(newSession);
    } else if (currentUser.role === 'murid' || currentUser.role === 'siswa') {
      const updatedSiswa = (appData.siswa || []).map((s) => {
        if ((currentData.id && s.id === currentData.id) || (currentData.nisn && s.nisn === currentData.nisn) || (currentData.username && s.username === currentData.username)) {
          const newS = {
            ...s,
            nama: cleanNama || s.nama,
            username: cleanUsername || s.username || s.nisn,
            password: cleanPassword ? cleanPassword : (s.password || s.nisn || ''),
            foto: fotoBase64,
          };
          const newRoles = currentUser.roles || (s.roles) || ['murid'];
          const newSession: UserSession = { role: 'murid', roles: newRoles, data: newS };
          onUpdateSession(newSession);
          saveSessionUser(newSession);
          return newS;
        }
        return s;
      });
      nextAppData.siswa = updatedSiswa;
    } else {
      // Wali Kelas / Hubin / etc
      let updatedWaliList = [...(appData.waliKelas || [])];
      const matched = findMatchingWali(currentData, updatedWaliList);

      let updatedWali: any;
      if (matched) {
        updatedWali = {
          ...matched.item,
          nama: cleanNama || matched.item.nama,
          username: cleanUsername || matched.item.username,
          password: cleanPassword,
          foto: fotoBase64,
          jabatan: cleanJabatan || matched.item.jabatan,
        };
        updatedWaliList[matched.index] = updatedWali;
      } else {
        updatedWali = {
          id: currentData.id || 'WAL_' + Date.now(),
          nip: currentData.nip || cleanUsername,
          nama: cleanNama,
          username: cleanUsername,
          password: cleanPassword,
          noHp: currentData.noHp || '',
          role: currentUser.role || 'wali',
          roles: currentUser.roles || [currentUser.role || 'wali'],
          foto: fotoBase64,
          jabatan: cleanJabatan,
        };
        updatedWaliList.push(updatedWali);
      }

      nextAppData.waliKelas = updatedWaliList;
      const newRoles = currentUser.roles || (updatedWali.roles) || [updatedWali.role || currentUser.role || 'wali'];
      const newSession: UserSession = { role: updatedWali.role || currentUser.role || 'wali', roles: newRoles, data: updatedWali };
      onUpdateSession(newSession);
      saveSessionUser(newSession);
    }

    onUpdateAppData(nextAppData);
    onShowToast('Pengaturan Akun & Password berhasil diperbarui!', 'success');
  };

  const getRoleLabel = () => {
    switch (currentUser.role) {
      case 'admin':
        return 'Administrator';
      case 'kesiswaan':
        return 'Kesiswaan / BP BK';
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
        return 'Pengguna';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={User}
        title={`Pengaturan Akun Saya (${getRoleLabel()})`}
        description="Kelola nama lengkap, username, password login, dan foto profil akun Anda."
        badge="Profil Pengguna"
      />

      <form onSubmit={handleSubmit} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="text-center shrink-0">
            {fotoBase64 ? (
              <img src={fotoBase64} alt="Foto Profil" className="w-20 h-20 rounded-full object-cover mx-auto border border-slate-200 dark:border-slate-700" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center text-2xl font-bold mx-auto">
                <UserCog className="w-10 h-10" />
              </div>
            )}
          </div>
          <div className="space-y-2 text-center sm:text-left">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">Foto Profil Akun</label>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleFotoUpload}
                className="text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
              />
              {fotoBase64 && (
                <button
                  type="button"
                  onClick={() => setFotoBase64('')}
                  className="px-3 py-2 bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="Hapus Foto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Foto</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400">Format: PNG, JPG, GIF (Maks 1MB)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Nama Lengkap Pengguna</label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Jabatan / Instansi</label>
            <input
              type="text"
              required
              disabled
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              className="w-full py-3 px-4 bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none opacity-75 cursor-not-allowed"
              placeholder="Contoh: Wali Kelas X PPLG 1 / Guru Mapel"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>Jabatan dikunci otomatis sesuai hak akses dan penugasan sistem.</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Username Login</label>
            <input
              type="text"
              required
              disabled={currentUser.role !== 'admin'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-slate-100/80 dark:disabled:bg-slate-800/50"
            />
            {currentUser.role !== 'admin' && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1.5 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Username hanya dapat diubah oleh Administrator Utama.</span>
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Password Baru</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-theme-primary hover:bg-theme-primary-dark text-white font-bold rounded-2xl text-xs shadow-lg shadow-theme-primary/30 transition flex items-center gap-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Simpan Perubahan Akun</span>
          </button>
        </div>
      </form>

      {currentUser.role === 'admin' && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>Sertifikasi Otomatis Metrik Laporan (Golden Dataset A–E)</span>
              </h3>
              <p className="text-xs text-slate-400">Verifikasi kepatuhan matematis rumus statistik & proteksi regresi pelaporan secara real-time.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsRunningTests(true);
                setTimeout(() => {
                  const res = runAutomatedGoldenDatasetSuite();
                  setTestResults(res);
                  setIsRunningTests(false);
                  onShowToast('Sertifikasi otomatis Golden Dataset selesai dijalankan!', 'success');
                }, 600);
              }}
              disabled={isRunningTests}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 disabled:opacity-50 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Activity className={`w-4 h-4 ${isRunningTests ? 'animate-spin' : ''}`} />
              <span>{isRunningTests ? 'Menjalankan...' : 'Jalankan Sertifikasi'}</span>
            </button>
          </div>

          {testResults ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {testResults.map((test, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{test.datasetName}</span>
                      {test.passed ? (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg text-[10px] font-extrabold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>PASS</span>
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 rounded-lg text-[10px] font-extrabold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>FAIL</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="text-slate-400">Siswa</div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">{test.metrics.totalStudents}</div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="text-slate-400">Exp Events</div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">{test.metrics.expectedEvents}</div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="text-slate-400">Rec Events</div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">{test.metrics.recordedEvents}</div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="text-slate-400">Rec Days</div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">{test.metrics.recordedDays}</div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="text-slate-400">Unfilled</div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">{test.metrics.unfilledEvents}</div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="text-slate-400">% Rate</div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">{test.metrics.attendanceRate.toFixed(2)}%</div>
                      </div>
                    </div>

                    {test.errors.length > 0 && (
                      <div className="p-2.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950 rounded-xl space-y-1">
                        <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Detail Kesalahan:</div>
                        {test.errors.map((err, errIdx) => (
                          <div key={errIdx} className="text-[9px] text-rose-500 font-semibold">• {err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center py-6">
              <p className="text-xs text-slate-400 font-medium">Belum ada uji sertifikasi yang dijalankan. Klik tombol "Jalankan Sertifikasi" di atas untuk memulai audit otomatis.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
