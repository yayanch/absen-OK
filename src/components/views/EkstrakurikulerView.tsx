import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  Calendar,
  ClipboardCheck,
  Check,
  X,
  AlertCircle,
  TrendingUp,
  Award,
  FileSpreadsheet,
  ArrowUpDown,
  BookOpen,
  DoorOpen,
  MapPin,
  Clock,
  UserCheck,
  CalendarDays,
  UserPlus,
  UserMinus,
  CheckCircle2,
} from 'lucide-react';
import { AppData, Ekstrakurikuler, AnggotaEkskul, PresensiEkskulItem } from '../../types';
import { PageHeader } from '../common/UIComponents';
import { Pagination } from '../Pagination';
import { addAuditLog } from '../../utils/helpers';

interface EkstrakurikulerViewProps {
  appData: AppData;
  currentUser: any;
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

export const EkstrakurikulerView: React.FC<EkstrakurikulerViewProps> = ({
  appData,
  currentUser,
  readOnly = false,
  onUpdateAppData,
  onOpenModal,
  onCloseModal,
  onConfirmModal,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'klub' | 'anggota' | 'presensi' | 'rekap'>('klub');

  // Extracts lists from appData
  const rawClubs = appData.ekstrakurikuler || [];
  const rawMembers = appData.anggotaEkskul || [];
  const rawPresensi = appData.presensiEkskul || {};
  const teachers = appData.waliKelas || [];
  const students = appData.siswa || [];
  const classes = appData.kelas || [];

  const isAdmin = currentUser.role === 'admin';
  const isKesiswaan = currentUser.role === 'kesiswaan';
  const isPiket = currentUser.role === 'piket_kesiswaan' || currentUser.role === 'piket_guru' || currentUser.role === 'piket';
  const canManage = (isAdmin || isKesiswaan || isPiket) && !readOnly;

  // Helper maps for names
  const teacherMap = useMemo(() => {
    const map = new Map<string, string>();
    teachers.forEach((t) => map.set(t.id, t.nama));
    return map;
  }, [teachers]);

  const studentMap = useMemo(() => {
    const map = new Map<string, { nama: string; kelas: string; nisn: string }>();
    students.forEach((s) => {
      const clsName = classes.find((c) => c.id === s.kelasId)?.nama || '';
      map.set(s.id, { nama: s.nama, kelas: clsName, nisn: s.nisn });
    });
    return map;
  }, [students, classes]);

  const clubMap = useMemo(() => {
    const map = new Map<string, Ekstrakurikuler>();
    rawClubs.forEach((c) => map.set(c.id, c));
    return map;
  }, [rawClubs]);

  // ==========================================
  // TAB 1: KLUB EKSTRAKURIKULER (CRUD)
  // ==========================================
  const [clubSearch, setClubSearch] = useState('');
  const [clubSort, setClubSort] = useState<'nama' | 'jadwal'>('nama');
  const [clubPage, setClubPage] = useState(1);

  const filteredClubs = useMemo(() => {
    let result = rawClubs.map((club) => ({
      ...club,
      pembinaNama: teacherMap.get(club.pembinaId) || club.pembinaNama || 'Tanpa Pembina',
    }));

    if (clubSearch) {
      const query = clubSearch.toLowerCase();
      result = result.filter(
        (c) =>
          c.nama.toLowerCase().includes(query) ||
          c.pembinaNama.toLowerCase().includes(query) ||
          (c.tempat || '').toLowerCase().includes(query)
      );
    }

    if (clubSort === 'nama') {
      result.sort((a, b) => a.nama.localeCompare(b.nama));
    } else {
      const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      result.sort((a, b) => {
        const dayA = days.indexOf(a.jadwalHari || '');
        const dayB = days.indexOf(b.jadwalHari || '');
        return dayA - dayB;
      });
    }

    return result;
  }, [rawClubs, clubSearch, clubSort, teacherMap]);

  // Form for Add / Edit Club
  const handleOpenClubModal = (clubToEdit?: Ekstrakurikuler) => {
    const isEditing = !!clubToEdit;
    let selectedPembinaId = clubToEdit ? clubToEdit.pembinaId : (teachers[0]?.id || '');
    let clubName = clubToEdit ? clubToEdit.nama : '';
    let jadwalHari = clubToEdit ? clubToEdit.jadwalHari || 'Sabtu' : 'Sabtu';
    let jamMulai = clubToEdit ? clubToEdit.jamMulai || '14:00' : '14:00';
    let jamSelesai = clubToEdit ? clubToEdit.jamSelesai || '16:00' : '16:00';
    let tempat = clubToEdit ? clubToEdit.tempat || '' : '';
    let deskripsi = clubToEdit ? clubToEdit.deskripsi || '' : '';

    onOpenModal(
      isEditing ? 'Edit Klub Ekstrakurikuler' : 'Tambah Klub Ekstrakurikuler',
      <div className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Nama Ekstrakurikuler</label>
          <input
            id="club-name-input"
            type="text"
            defaultValue={clubName}
            className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="misal: Pramuka, PMR, Futsal, Coding Club"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Guru Pembina</label>
            <select
              id="club-pembina-input"
              defaultValue={selectedPembinaId}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Hari Pelaksanaan</label>
            <select
              id="club-hari-input"
              defaultValue={jadwalHari}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Jam Mulai</label>
            <input
              id="club-mulai-input"
              type="time"
              defaultValue={jamMulai}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Jam Selesai</label>
            <input
              id="club-selesai-input"
              type="time"
              defaultValue={jamSelesai}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Tempat Latihan / Ruang</label>
          <input
            id="club-tempat-input"
            type="text"
            defaultValue={tempat}
            className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="misal: Lapangan Utama, Aula Lantai 2, Laboratorium Komputer 3"
          />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Deskripsi / Catatan Tambahan</label>
          <textarea
            id="club-desc-input"
            rows={2}
            defaultValue={deskripsi}
            className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Deskripsi singkat kegiatan ekstrakurikuler..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCloseModal}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              const nameEl = document.getElementById('club-name-input') as HTMLInputElement;
              const pembinaEl = document.getElementById('club-pembina-input') as HTMLSelectElement;
              const hariEl = document.getElementById('club-hari-input') as HTMLSelectElement;
              const mulaiEl = document.getElementById('club-mulai-input') as HTMLInputElement;
              const selesaiEl = document.getElementById('club-selesai-input') as HTMLInputElement;
              const tempatEl = document.getElementById('club-tempat-input') as HTMLInputElement;
              const descEl = document.getElementById('club-desc-input') as HTMLTextAreaElement;

              const valName = nameEl?.value?.trim();
              if (!valName) {
                onShowToast('Nama ekstrakurikuler wajib diisi!', 'error');
                return;
              }

              const updatedClubs = [...rawClubs];
              if (isEditing && clubToEdit) {
                const idx = updatedClubs.findIndex((c) => c.id === clubToEdit.id);
                if (idx !== -1) {
                  updatedClubs[idx] = {
                    ...clubToEdit,
                    nama: valName,
                    pembinaId: pembinaEl?.value,
                    pembinaNama: teacherMap.get(pembinaEl?.value) || '',
                    jadwalHari: hariEl?.value,
                    jamMulai: mulaiEl?.value,
                    jamSelesai: selesaiEl?.value,
                    tempat: tempatEl?.value || '',
                    deskripsi: descEl?.value || '',
                  };
                }
              } else {
                updatedClubs.push({
                  id: `EKS_${Date.now()}`,
                  nama: valName,
                  pembinaId: pembinaEl?.value,
                  pembinaNama: teacherMap.get(pembinaEl?.value) || '',
                  jadwalHari: hariEl?.value,
                  jamMulai: mulaiEl?.value,
                  jamSelesai: selesaiEl?.value,
                  tempat: tempatEl?.value || '',
                  deskripsi: descEl?.value || '',
                });
              }

              const nextData = {
                ...appData,
                ekstrakurikuler: updatedClubs,
              };

              onUpdateAppData(addAuditLog(
                nextData,
                isEditing ? 'Ubah Ekstrakurikuler' : 'Tambah Ekstrakurikuler',
                `${isEditing ? 'Mengubah' : 'Menambahkan'} klub ekstrakurikuler "${valName}"`
              ));

              onCloseModal();
              onShowToast(
                `Berhasil ${isEditing ? 'mengubah' : 'menambahkan'} klub "${valName}"!`,
                'success'
              );
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Simpan
          </button>
        </div>
      </div>
    );
  };

  const handleDeleteClub = (club: Ekstrakurikuler) => {
    onConfirmModal(
      'Hapus Ekstrakurikuler',
      `Apakah Anda yakin ingin menghapus klub "${club.nama}"? Seluruh data keanggotaan dan riwayat kehadiran untuk klub ini akan ikut dihapus.`,
      'danger',
      () => {
        const nextClubs = rawClubs.filter((c) => c.id !== club.id);
        const nextMembers = rawMembers.filter((m) => m.ekskulId !== club.id);

        // Remove key with this ekskulId
        const nextPresensi = { ...rawPresensi };
        Object.keys(nextPresensi).forEach((k) => {
          if (k.endsWith(`_${club.id}`)) {
            delete nextPresensi[k];
          }
        });

        const nextData = {
          ...appData,
          ekstrakurikuler: nextClubs,
          anggotaEkskul: nextMembers,
          presensiEkskul: nextPresensi,
        };

        onUpdateAppData(addAuditLog(
          nextData,
          'Hapus Ekstrakurikuler',
          `Menghapus klub ekstrakurikuler "${club.nama}" beserta data anggota & presensi`
        ));

        onShowToast(`Klub "${club.nama}" berhasil dihapus!`, 'success');
      }
    );
  };

  // ==========================================
  // TAB 2: ANGGOTA KLUB (MEMBERSHIP)
  // ==========================================
  const [selectedEkskulId, setSelectedEkskulId] = useState(rawClubs[0]?.id || '');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(1);

  const activeClub = useMemo(() => {
    return rawClubs.find((c) => c.id === selectedEkskulId) || rawClubs[0];
  }, [rawClubs, selectedEkskulId]);

  const activeClubMembers = useMemo(() => {
    if (!activeClub) return [];
    return rawMembers
      .filter((m) => m.ekskulId === activeClub.id)
      .map((m) => {
        const sInfo = studentMap.get(m.siswaId);
        return {
          id: m.id,
          siswaId: m.siswaId,
          tanggalBergabung: m.tanggalBergabung,
          nama: sInfo?.nama || 'Siswa Terhapus',
          kelas: sInfo?.kelas || 'N/A',
          nisn: sInfo?.nisn || 'N/A',
        };
      });
  }, [activeClub, rawMembers, studentMap]);

  const filteredClubMembers = useMemo(() => {
    let result = [...activeClubMembers];
    if (memberSearch) {
      const q = memberSearch.toLowerCase();
      result = result.filter(
        (m) =>
          m.nama.toLowerCase().includes(q) ||
          m.kelas.toLowerCase().includes(q) ||
          m.nisn.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => a.nama.localeCompare(b.nama));
    return result;
  }, [activeClubMembers, memberSearch]);

  const handleOpenAddMemberModal = () => {
    if (!activeClub) {
      onShowToast('Silakan pilih ekstrakurikuler terlebih dahulu!', 'warning');
      return;
    }

    // Get list of students NOT already registered to this club
    const existingSiswaIds = new Set(activeClubMembers.map((m) => m.siswaId));
    const unregisteredStudents = students
      .filter((s) => !existingSiswaIds.has(s.id))
      .map((s) => {
        const clsName = classes.find((c) => c.id === s.kelasId)?.nama || '';
        return { ...s, kelasNama: clsName };
      });

    unregisteredStudents.sort((a, b) => a.nama.localeCompare(b.nama));

    let selectedSiswaIds: string[] = [];

    onOpenModal(
      `Daftarkan Anggota Baru: ${activeClub.nama}`,
      <div className="space-y-4 text-left max-h-[80vh] overflow-y-auto pr-1">
        <p className="text-xs text-slate-500 font-bold">
          Pilih siswa dari daftar berikut untuk bergabung dengan ekstrakurikuler{' '}
          <strong className="text-slate-800 dark:text-slate-200">{activeClub.nama}</strong>.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            id="member-reg-search"
            type="text"
            placeholder="Cari nama siswa, NISN, atau kelas..."
            onChange={(e) => {
              const query = e.target.value.toLowerCase();
              const items = document.querySelectorAll('.reg-student-item');
              items.forEach((item) => {
                const text = item.getAttribute('data-text')?.toLowerCase() || '';
                if (text.includes(query)) {
                  (item as HTMLElement).style.display = 'flex';
                } else {
                  (item as HTMLElement).style.display = 'none';
                }
              });
            }}
            className="w-full py-2 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
          {unregisteredStudents.length === 0 ? (
            <div className="p-6 text-center text-slate-400 font-bold text-xs">
              Semua siswa sudah terdaftar di klub ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {unregisteredStudents.map((s) => {
                const itemText = `${s.nama} ${s.nisn} ${s.kelasNama}`;
                return (
                  <div
                    key={s.id}
                    data-text={itemText}
                    className="reg-student-item p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between gap-3 transition"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                        {s.nama}
                      </div>
                      <div className="text-[10px] text-slate-400 font-extrabold">
                        NISN: {s.nisn || '-'} • Kelas {s.kelasNama}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer p-1 shrink-0">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectedSiswaIds.push(s.id);
                          } else {
                            selectedSiswaIds = selectedSiswaIds.filter((id) => id !== s.id);
                          }
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={onCloseModal}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedSiswaIds.length === 0) {
                onShowToast('Pilih minimal satu siswa untuk didaftarkan!', 'warning');
                return;
              }

              const nextMembers = [...rawMembers];
              const todayStr = new Date().toISOString().split('T')[0];

              selectedSiswaIds.forEach((sid) => {
                nextMembers.push({
                  id: `AE_${sid}_${activeClub.id}`,
                  ekskulId: activeClub.id,
                  siswaId: sid,
                  tanggalBergabung: todayStr,
                });
              });

              const nextData = {
                ...appData,
                anggotaEkskul: nextMembers,
              };

              onUpdateAppData(addAuditLog(
                nextData,
                'Daftarkan Anggota Ekskul',
                `Mendaftarkan ${selectedSiswaIds.length} siswa baru ke klub "${activeClub.nama}"`
              ));

              onCloseModal();
              onShowToast(
                `Berhasil mendaftarkan ${selectedSiswaIds.length} siswa ke klub "${activeClub.nama}"!`,
                'success'
              );
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Tambahkan Terpilih
          </button>
        </div>
      </div>
    );
  };

  const handleRemoveMember = (mId: string, sNama: string) => {
    onConfirmModal(
      'Keluarkan Anggota',
      `Keluarkan siswa "${sNama}" dari keanggotaan klub "${activeClub?.nama || ''}"?`,
      'warning',
      () => {
        const nextMembers = rawMembers.filter((m) => m.id !== mId);
        const nextData = {
          ...appData,
          anggotaEkskul: nextMembers,
        };

        onUpdateAppData(addAuditLog(
          nextData,
          'Keluarkan Anggota Ekskul',
          `Mengeluarkan siswa "${sNama}" dari klub "${activeClub?.nama || ''}"`
        ));
        onShowToast(`Siswa "${sNama}" telah dikeluarkan dari klub!`, 'success');
      }
    );
  };

  // ==========================================
  // TAB 3: PRESENSI KEGIATAN (LOGGING)
  // ==========================================
  const [presensiDate, setPresensiDate] = useState(new Date().toISOString().split('T')[0]);
  const [presensiEkskulId, setPresensiEkskulId] = useState(rawClubs[0]?.id || '');
  const [editedPresensi, setEditedPresensi] = useState<Record<string, 'H' | 'S' | 'I' | 'A' | ''>>({});
  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({});

  const activePresensiClub = useMemo(() => {
    return rawClubs.find((c) => c.id === presensiEkskulId) || rawClubs[0];
  }, [rawClubs, presensiEkskulId]);

  const activePresensiKey = `${presensiDate}_${presensiEkskulId}`;

  const currentClubMembers = useMemo(() => {
    if (!activePresensiClub) return [];
    return rawMembers
      .filter((m) => m.ekskulId === activePresensiClub.id)
      .map((m) => {
        const sInfo = studentMap.get(m.siswaId);
        return {
          siswaId: m.siswaId,
          nama: sInfo?.nama || 'Siswa Terhapus',
          kelas: sInfo?.kelas || 'N/A',
          nisn: sInfo?.nisn || 'N/A',
        };
      })
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [activePresensiClub, rawMembers, studentMap]);

  const savedPresensiItems = useMemo(() => {
    return rawPresensi[activePresensiKey] || [];
  }, [rawPresensi, activePresensiKey]);

  // Initializing state when date or club changes
  React.useEffect(() => {
    const states: Record<string, 'H' | 'S' | 'I' | 'A' | ''> = {};
    const notes: Record<string, string> = {};

    currentClubMembers.forEach((m) => {
      const saved = savedPresensiItems.find((s) => s.siswaId === m.siswaId);
      states[m.siswaId] = saved ? saved.status : '';
      notes[m.siswaId] = saved ? saved.catatan || '' : '';
    });

    setEditedPresensi(states);
    setEditedNotes(notes);
  }, [currentClubMembers, savedPresensiItems]);

  const handleSaveAttendance = () => {
    if (!activePresensiClub) {
      onShowToast('Silakan pilih klub terlebih dahulu!', 'warning');
      return;
    }

    const nextPresensiList: PresensiEkskulItem[] = currentClubMembers.map((m) => ({
      siswaId: m.siswaId,
      status: editedPresensi[m.siswaId] || '',
      catatan: (editedNotes[m.siswaId] || '').trim(),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    }));

    const nextPresensiMap = {
      ...rawPresensi,
      [activePresensiKey]: nextPresensiList,
    };

    const nextData = {
      ...appData,
      presensiEkskul: nextPresensiMap,
    };

    onUpdateAppData(addAuditLog(
      nextData,
      'Simpan Presensi Ekskul',
      `Menyimpan absensi kegiatan klub "${activePresensiClub.nama}" tanggal ${presensiDate}`
    ));

    onShowToast(`Presensi kegiatan "${activePresensiClub.nama}" berhasil disimpan!`, 'success');
  };

  const fillAllAttendance = (status: 'H' | 'S' | 'I' | 'A' | '') => {
    const nextStates = { ...editedPresensi };
    currentClubMembers.forEach((m) => {
      nextStates[m.siswaId] = status;
    });
    setEditedPresensi(nextStates);
  };

  // ==========================================
  // TAB 4: REKAP & STATISTIK (REPORTS)
  // ==========================================
  const activeClubStats = useMemo(() => {
    return rawClubs.map((club) => {
      const clubMembs = rawMembers.filter((m) => m.ekskulId === club.id);
      const totalMembers = clubMembs.length;

      // Find all keys starting with any date, ending with `_${club.id}`
      let sessionsCount = 0;
      let totalHadir = 0;
      let totalSakit = 0;
      let totalIzin = 0;
      let totalAlfa = 0;

      Object.keys(rawPresensi).forEach((key) => {
        if (key.endsWith(`_${club.id}`)) {
          const list = rawPresensi[key] || [];
          sessionsCount++;
          list.forEach((item) => {
            if (item.status === 'H') totalHadir++;
            else if (item.status === 'S') totalSakit++;
            else if (item.status === 'I') totalIzin++;
            else if (item.status === 'A') totalAlfa++;
          });
        }
      });

      const totalResponses = totalHadir + totalSakit + totalIzin + totalAlfa;
      const rateHadir = totalResponses > 0 ? Math.round((totalHadir / totalResponses) * 100) : 0;
      const rateSakit = totalResponses > 0 ? Math.round((totalSakit / totalResponses) * 100) : 0;
      const rateIzin = totalResponses > 0 ? Math.round((totalIzin / totalResponses) * 100) : 0;
      const rateAlfa = totalResponses > 0 ? Math.round((totalAlfa / totalResponses) * 100) : 0;

      return {
        ...club,
        pembinaNama: teacherMap.get(club.pembinaId) || club.pembinaNama || 'N/A',
        totalMembers,
        sessionsCount,
        rateHadir,
        rateSakit,
        rateIzin,
        rateAlfa,
      };
    });
  }, [rawClubs, rawMembers, rawPresensi, teacherMap]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sparkles}
        title="Kegiatan Ekstrakurikuler"
        description="Pusat pembinaan, manajemen keanggotaan klub, dan monitoring partisipasi presensi ekstrakurikuler."
        badge="Kegiatan Non-Akademik Terpadu"
      />

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto select-none no-scrollbar">
        <button
          onClick={() => setActiveTab('klub')}
          className={`px-4 pb-3 text-xs font-black transition border-b-2 shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'klub'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          Klub Ekstrakurikuler
        </button>
        <button
          onClick={() => setActiveTab('anggota')}
          className={`px-4 pb-3 text-xs font-black transition border-b-2 shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'anggota'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Manajemen Anggota ({rawMembers.length})
        </button>
        <button
          onClick={() => setActiveTab('presensi')}
          className={`px-4 pb-3 text-xs font-black transition border-b-2 shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'presensi'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          Pencatatan Presensi
        </button>
        <button
          onClick={() => setActiveTab('rekap')}
          className={`px-4 pb-3 text-xs font-black transition border-b-2 shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'rekap'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Rekap &amp; Partisipasi
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. TAB: KLUB EKSTRAKURIKULER                              */}
      {/* ========================================================= */}
      {activeTab === 'klub' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={clubSearch}
                onChange={(e) => {
                  setClubSearch(e.target.value);
                  setClubPage(1);
                }}
                placeholder="Cari nama ekskul, pembina, atau tempat..."
                className="w-full py-2 pl-9 pr-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={clubSort}
                onChange={(e) => setClubSort(e.target.value as any)}
                className="py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="nama">Urut: Nama Ekskul</option>
                <option value="jadwal">Urut: Hari Pelaksanaan</option>
              </select>
              {canManage && (
                <button
                  onClick={() => handleOpenClubModal()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  Tambah Klub
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClubs.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <Award className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <div className="text-slate-500 dark:text-slate-400 font-extrabold text-xs">Belum ada klub ekstrakurikuler yang sesuai kriteria pencarian.</div>
              </div>
            ) : (
              filteredClubs.map((club) => (
                <div
                  key={club.id}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="absolute right-3 top-3 opacity-10 group-hover:opacity-15 transition">
                    <Award className="w-14 h-14" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          {club.nama}
                        </h3>
                        <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                          <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                          Pembina: {club.pembinaNama}
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenClubModal(club)}
                            className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-500 rounded-lg transition cursor-pointer"
                            title="Edit Klub"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClub(club)}
                            className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                            title="Hapus Klub"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold line-clamp-2">
                      {club.deskripsi || 'Tidak ada deskripsi tambahan.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <div>
                          <div>{club.jadwalHari}</div>
                          <div className="text-[9px] text-slate-400 font-extrabold uppercase">
                            {club.jamMulai} - {club.jamSelesai} WIB
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <div>
                          <div className="truncate max-w-[120px]">{club.tempat || 'Lapangan'}</div>
                          <div className="text-[9px] text-slate-400 font-extrabold uppercase">
                            Tempat Pelaksanaan
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. TAB: MANAJEMEN ANGGOTA KLUB                            */}
      {/* ========================================================= */}
      {activeTab === 'anggota' && (
        <div className="space-y-4">
          <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Pilih Klub Ekstrakurikuler</label>
            <div className="flex flex-wrap gap-2">
              {rawClubs.map((club) => (
                <button
                  key={club.id}
                  onClick={() => {
                    setSelectedEkskulId(club.id);
                    setMemberPage(1);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition duration-150 cursor-pointer ${
                    selectedEkskulId === club.id
                      ? 'bg-blue-600 border-blue-600 text-white font-black'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {club.nama}
                </button>
              ))}
            </div>
          </div>

          {activeClub ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setMemberPage(1);
                    }}
                    placeholder={`Cari anggota di ${activeClub.nama}...`}
                    className="w-full py-2 pl-9 pr-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {canManage && (
                  <button
                    onClick={handleOpenAddMemberModal}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    Daftarkan Siswa
                  </button>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                      <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-wider">No</th>
                      <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-wider">Nama Lengkap</th>
                      <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-wider">NISN</th>
                      <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-wider">Kelas</th>
                      <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-wider">Tanggal Bergabung</th>
                      {canManage && (
                        <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Aksi</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredClubMembers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-bold text-xs">
                          Belum ada anggota yang terdaftar di klub ini.
                        </td>
                      </tr>
                    ) : (
                      filteredClubMembers.map((m, index) => (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">{index + 1}</td>
                          <td className="py-3 px-4 text-xs font-black text-slate-800 dark:text-slate-100">{m.nama}</td>
                          <td className="py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">{m.nisn}</td>
                          <td className="py-3 px-4 text-xs font-extrabold text-blue-600 dark:text-blue-400">{m.kelas}</td>
                          <td className="py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">{m.tanggalBergabung}</td>
                          {canManage && (
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleRemoveMember(m.id, m.nama)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500 rounded-lg transition cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold"
                                title="Keluarkan Anggota"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">Keluarkan</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <div className="text-slate-500 dark:text-slate-400 font-extrabold text-xs">
                Tambahkan klub ekstrakurikuler terlebih dahulu di tab pertama.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. TAB: PENCATATAN PRESENSI                               */}
      {/* ========================================================= */}
      {activeTab === 'presensi' && (
        <div className="space-y-4">
          <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Pilih Klub Ekstrakurikuler</label>
              <select
                value={presensiEkskulId}
                onChange={(e) => setPresensiEkskulId(e.target.value)}
                className="w-full py-2.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {rawClubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Tanggal Kegiatan</label>
              <input
                type="date"
                value={presensiDate}
                onChange={(e) => setPresensiDate(e.target.value)}
                className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {activePresensiClub ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                    Presensi Anggota: {activePresensiClub.nama}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">
                    Tanggal Kegiatan: {presensiDate} • Total Anggota: {currentClubMembers.length}
                  </p>
                </div>

                {canManage && currentClubMembers.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fillAllAttendance('H')}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black transition cursor-pointer"
                    >
                      Set Semua Hadir (H)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillAllAttendance('')}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black transition cursor-pointer"
                    >
                      Reset Semua
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                      <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-wider w-12">No</th>
                      <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-wider">Nama Anggota</th>
                      <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-wider w-36 text-center">Status Kehadiran</th>
                      <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-wider">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {currentClubMembers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 font-bold text-xs">
                          Belum ada siswa yang didaftarkan ke klub ini. Silakan tambahkan anggota di tab "Manajemen Anggota".
                        </td>
                      </tr>
                    ) : (
                      currentClubMembers.map((m, index) => (
                        <tr key={m.siswaId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">{index + 1}</td>
                          <td className="py-3.5 px-4 text-xs font-black text-slate-800 dark:text-slate-100">
                            <div>{m.nama}</div>
                            <div className="text-[9px] text-slate-400 font-extrabold uppercase">
                              {m.kelas} • NISN: {m.nisn}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              {(['H', 'S', 'I', 'A'] as const).map((status) => {
                                const isSelected = editedPresensi[m.siswaId] === status;
                                let colorClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';

                                if (isSelected) {
                                  if (status === 'H') colorClass = 'bg-emerald-500 text-white font-black';
                                  else if (status === 'S') colorClass = 'bg-blue-500 text-white font-black';
                                  else if (status === 'I') colorClass = 'bg-amber-500 text-white font-black';
                                  else if (status === 'A') colorClass = 'bg-rose-500 text-white font-black';
                                }

                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    disabled={!canManage}
                                    onClick={() => {
                                      setEditedPresensi((prev) => ({
                                        ...prev,
                                        [m.siswaId]: prev[m.siswaId] === status ? '' : status,
                                      }));
                                    }}
                                    style={{
                                      backgroundColor: isSelected ? undefined : '',
                                    }}
                                    className={`${colorClass} w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center transition cursor-pointer select-none`}
                                  >
                                    {status}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              disabled={!canManage}
                              value={editedNotes[m.siswaId] || ''}
                              onChange={(e) => {
                                const text = e.target.value;
                                setEditedNotes((prev) => ({
                                  ...prev,
                                  [m.siswaId]: text,
                                }));
                              }}
                              placeholder="Keterangan..."
                              className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {canManage && currentClubMembers.length > 0 && (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleSaveAttendance}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-2 transition shadow-sm cursor-pointer hover:shadow-emerald-200 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Simpan Presensi Kegiatan
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <ClipboardCheck className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <div className="text-slate-500 dark:text-slate-400 font-extrabold text-xs">
                Tambahkan klub ekstrakurikuler terlebih dahulu di tab pertama.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. TAB: REKAPITULASI & STATISTIK                          */}
      {/* ========================================================= */}
      {activeTab === 'rekap' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Klub Ekskul</div>
              <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{rawClubs.length}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">Klub aktif terdaftar</div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Keanggotaan</div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{rawMembers.length}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">Registrasi partisipan aktif</div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kehadiran Rata-Rata</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {activeClubStats.length > 0
                  ? Math.round(
                      activeClubStats.reduce((acc, c) => acc + c.rateHadir, 0) / activeClubStats.length
                    )
                  : 0}
                %
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">Persentase tingkat kehadiran</div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Sesi Kegiatan</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {Object.keys(rawPresensi).length}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">Absensi sesi terlaksana</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Statistik Kehadiran per Ekstrakurikuler
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {activeClubStats.length === 0 ? (
                <div className="p-6 text-center text-slate-400 font-bold text-xs">
                  Belum ada data rekap kegiatan ekstrakurikuler.
                </div>
              ) : (
                activeClubStats.map((stat) => (
                  <div key={stat.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-xs text-slate-800 dark:text-slate-100">
                        {stat.nama}
                      </div>
                      <div className="text-[10px] text-slate-400 font-extrabold mt-0.5">
                        Pembina: {stat.pembinaNama} • {stat.totalMembers} Anggota Terdaftar
                      </div>
                    </div>

                    <div className="flex-1 max-w-xs">
                      <div className="flex justify-between text-[10px] font-black text-slate-500 mb-1">
                        <span>Hadir: {stat.rateHadir}%</span>
                        <span>Sakit/Izin: {stat.rateSakit + stat.rateIzin}%</span>
                        <span>Alfa: {stat.rateAlfa}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                        <div className="h-full bg-emerald-500" style={{ width: `${stat.rateHadir}%` }} />
                        <div className="h-full bg-blue-400" style={{ width: `${stat.rateSakit}%` }} />
                        <div className="h-full bg-amber-400" style={{ width: `${stat.rateIzin}%` }} />
                        <div className="h-full bg-rose-500" style={{ width: `${stat.rateAlfa}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-right md:w-32 justify-end">
                      <div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-100">
                          {stat.sessionsCount} Sesi
                        </div>
                        <div className="text-[9px] text-slate-400 font-extrabold uppercase">
                          Kegiatan
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
