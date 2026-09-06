import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  User,
  Bot,
  Image as ImageIcon,
  Trash2,
  Phone,
  ShieldCheck,
  Check,
  CheckCheck,
  Sparkles,
  HelpCircle,
  Filter,
  RefreshCw,
  X,
  UserCheck,
  Power,
  PowerOff,
  Lock,
  ListChecks,
  CheckSquare,
  Square
} from 'lucide-react';
import { AppData, SekolahConfig, UserSession, ChatMessage, UserRole, Siswa } from '../../types';
import { compressBase64Image } from '../../utils/helpers';
import { PageHeader } from '../common/UIComponents';

interface LiveChatViewProps {
  appData: AppData;
  currentUser: UserSession;
  onUpdateAppData: (updater: (prev: AppData) => AppData) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onConfirmModal: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
}

export const LiveChatView: React.FC<LiveChatViewProps> = ({
  appData,
  currentUser,
  onUpdateAppData,
  onShowToast,
  onConfirmModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThreadUser, setSelectedThreadUser] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('semua');
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Options Modal State (Hapus untuk Semua Orang vs Hapus untuk Saya)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    mode: 'single' | 'selected' | 'history';
    targetId?: string;
    targetIds?: string[];
    canDeleteForEveryone: boolean;
    isWithinTimeLimit?: boolean;
    previewText?: string;
  }>({
    isOpen: false,
    mode: 'single',
    canDeleteForEveryone: false,
    isWithinTimeLimit: true,
  });

  const isAdmin = currentUser.role === 'admin';
  const isWali = currentUser.role === 'wali' || (currentUser.data as any)?.nip;
  const isGuru = currentUser.role === 'guru' || currentUser.role === 'user' || Boolean((currentUser.data as any)?.mataPelajaran);
  const isSiswa = currentUser.role === 'siswa' || (currentUser.data as any)?.nisn || currentUser.role === 'murid';

  const rawUsername = (currentUser.data as any)?.username || (currentUser.data as any)?.nip || (currentUser.data as any)?.id || (currentUser.data as any)?.nisn || currentUser.role || 'user';
  const currentUsername = String(rawUsername).toLowerCase();
  const currentNama = currentUser.data?.nama || 'Pengguna';

  const myIdVariants = useMemo(() => {
    const list: string[] = [currentUsername];
    if (isAdmin) {
      list.push('admin');
      list.push('administrator');
    }
    const data = currentUser.data as any;
    if (data) {
      if (data.nip) list.push(String(data.nip).toLowerCase());
      if (data.nisn) list.push(String(data.nisn).toLowerCase());
      if (data.id) list.push(String(data.id).toLowerCase());
      if (data.username) list.push(String(data.username).toLowerCase());
    }
    if (currentUser.role) list.push(String(currentUser.role).toLowerCase());
    return Array.from(new Set(list.filter(Boolean)));
  }, [currentUsername, currentUser, isAdmin]);

  const allMessages = useMemo(() => {
    return (appData.chatMessages || []).filter((m) => {
      if (m.id === 'CHAT_1' || m.text?.toLowerCase().includes('selamat datang di layanan live chat')) {
        return false;
      }
      // Hide message if deleted for this user ("Hapus untuk Saya")
      if (m.deletedFor && Array.isArray(m.deletedFor)) {
        const isDeletedForThisUser = m.deletedFor.some((u) => myIdVariants.includes(String(u).toLowerCase()));
        if (isDeletedForThisUser) return false;
      }
      return true;
    });
  }, [appData.chatMessages, myIdVariants]);

  // Real-time Chat Sync Poller (Every 2 seconds while LiveChatView is active)
  useEffect(() => {
    let isMounted = true;
    const syncChat = async () => {
      try {
        const res = await fetch('/api/chat/messages');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.chatMessages) && isMounted) {
          const currentMsgsStr = JSON.stringify(appData.chatMessages || []);
          const serverMsgsStr = JSON.stringify(data.chatMessages);
          if (currentMsgsStr !== serverMsgsStr) {
            onUpdateAppData((prev) => ({
              ...prev,
              chatMessages: data.chatMessages,
            }));
          }
        }
      } catch (e) {
        // silent
      }
    };

    const interval = setInterval(syncChat, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [appData.chatMessages, onUpdateAppData]);

  const isMessageMe = (msg: ChatMessage) => {
    const sender = String(msg.senderUsername || '').trim().toLowerCase();
    if (!sender) return false;
    if (myIdVariants.includes(sender)) return true;
    if (isAdmin && (msg.senderRole === 'admin' || sender === 'admin' || sender === 'administrator')) return true;
    if (msg.senderNama && currentNama && msg.senderNama.trim().toLowerCase() === currentNama.trim().toLowerCase()) return true;
    return false;
  };

  const isMessageRecipientMe = (msg: ChatMessage) => {
    const recipient = String(msg.recipientUsername || '').trim().toLowerCase();
    if (!recipient) return false;
    if (myIdVariants.includes(recipient)) return true;
    if (isAdmin && (recipient === 'admin' || recipient === 'administrator')) return true;
    if (recipient === 'all') return true;
    return false;
  };

  const isLiveChatEnabled = appData.enableLiveChat ?? appData.sekolah?.enableLiveChat ?? true;

  const handleToggleLiveChatStatus = () => {
    const nextStatus = !isLiveChatEnabled;
    onUpdateAppData((prev) => ({
      ...prev,
      enableLiveChat: nextStatus,
      sekolah: {
        ...(prev.sekolah || {}),
        enableLiveChat: nextStatus,
      } as SekolahConfig,
    }));
    onShowToast(
      nextStatus
        ? 'Fasilitas Live Chat berhasil DIAKTIFKAN!'
        : 'Fasilitas Live Chat berhasil DINONAKTIFKAN!',
      nextStatus ? 'success' : 'warning'
    );
  };

  // Build list of chat threads for Admin and Wali Kelas
  const threads = useMemo(() => {
    const threadMap: Record<string, {
      username: string;
      nama: string;
      role: UserRole;
      lastTime: string;
      unread: number;
      lastText: string;
      lastIsMe?: boolean;
      lastIsRead?: boolean;
      lastStatus?: 'pending' | 'sent' | 'read';
      foto?: string;
      noHp?: string;
    }> = {};

    if (isAdmin) {
      // 0. Add Broadcast option
      threadMap['all'] = {
        username: 'all',
        nama: 'Broadcast (Semua Pengguna)',
        role: 'user',
        lastTime: '',
        unread: 0,
        lastText: 'Pengumuman / Pesan Umum',
      };

      // 1. Populate registered users
      if (Array.isArray(appData.waliKelas)) {
        appData.waliKelas.forEach((w) => {
          const uKey = String(w.username || w.nip || w.id).toLowerCase();
          if (uKey && uKey !== 'admin') {
            threadMap[uKey] = {
              username: String(w.username || w.nip || w.id),
              nama: w.nama,
              role: 'wali',
              lastTime: '',
              unread: 0,
              lastText: 'Belum ada percakapan',
              foto: w.foto,
              noHp: w.noHp,
            };
          }
        });
      }

      if (appData.kesiswaan && appData.kesiswaan.username) {
        const kKey = String(appData.kesiswaan.username).toLowerCase();
        if (kKey && kKey !== 'admin') {
          threadMap[kKey] = {
            username: String(appData.kesiswaan.username),
            nama: appData.kesiswaan.nama || 'Kesiswaan',
            role: 'kesiswaan',
            lastTime: '',
            unread: 0,
            lastText: 'Belum ada percakapan',
            foto: appData.kesiswaan.foto,
            noHp: (appData.kesiswaan as any).noHp || '',
          };
        }
      }

      if (appData.kurikulum && appData.kurikulum.username) {
        const kurKey = String(appData.kurikulum.username).toLowerCase();
        if (kurKey && kurKey !== 'admin') {
          threadMap[kurKey] = {
            username: String(appData.kurikulum.username),
            nama: appData.kurikulum.nama || 'Kurikulum & Akademik',
            role: 'kurikulum',
            lastTime: '',
            unread: 0,
            lastText: 'Belum ada percakapan',
            foto: appData.kurikulum.foto,
            noHp: (appData.kurikulum as any).noHp || '',
          };
        }
      }

      if (appData.userBiasa && appData.userBiasa.username) {
        const uKey = String(appData.userBiasa.username).toLowerCase();
        if (uKey && uKey !== 'admin') {
          threadMap[uKey] = {
            username: String(appData.userBiasa.username),
            nama: appData.userBiasa.nama || 'User Biasa',
            role: 'user',
            lastTime: '',
            unread: 0,
            lastText: 'Belum ada percakapan',
            foto: appData.userBiasa.foto,
          };
        }
      }

      if (Array.isArray(appData.siswa)) {
        appData.siswa.forEach((s) => {
          const sKey = String(s.nisn || s.id).toLowerCase();
          if (sKey) {
            threadMap[sKey] = {
              username: String(s.nisn || s.id),
              nama: s.nama,
              role: 'siswa',
              lastTime: '',
              unread: 0,
              lastText: 'Belum ada percakapan',
              foto: s.foto,
            };
          }
        });
      }
    } else if (isWali) {
      // 1. Add Admin Utama
      threadMap['admin'] = {
        username: 'admin',
        nama: appData.admin?.nama ? `${appData.admin.nama} (Helpdesk)` : 'Administrator Utama (Helpdesk)',
        role: 'admin',
        lastTime: '',
        unread: 0,
        lastText: 'Pusat Bantuan & Koordinasi',
        foto: appData.admin?.foto,
      };

      // 2. Add Kurikulum (Tim Kurikulum & Akademik)
      const kurikulumUser = appData.kurikulum?.username || 'kurikulum';
      const kurKey = String(kurikulumUser).toLowerCase();
      threadMap[kurKey] = {
        username: kurikulumUser,
        nama: appData.kurikulum?.nama ? `${appData.kurikulum.nama} (Kurikulum)` : 'Tim Kurikulum & Akademik',
        role: 'kurikulum',
        lastTime: '',
        unread: 0,
        lastText: 'Koordinasi Kurikulum, Jadwal & KBM',
        foto: appData.kurikulum?.foto,
        noHp: (appData.kurikulum as any)?.noHp || '',
      };

      // 3. Add Kesiswaan (BP/BK)
      const kesiswaanUser = appData.kesiswaan?.username || 'kesiswaan';
      const kKey = String(kesiswaanUser).toLowerCase();
      threadMap[kKey] = {
        username: kesiswaanUser,
        nama: appData.kesiswaan?.nama ? `${appData.kesiswaan.nama} (BP/BK)` : 'Tim Kesiswaan (BP/BK)',
        role: 'kesiswaan',
        lastTime: '',
        unread: 0,
        lastText: 'Koordinasi Kesiswaan & BP/BK',
        foto: appData.kesiswaan?.foto,
        noHp: (appData.kesiswaan as any)?.noHp || '',
      };

      // 4. Add Siswa Binaannya (Hanya siswa pada kelas yang diampu oleh Wali Kelas)
      const waliObj = appData.waliKelas.find(w => 
        String(w.username).toLowerCase() === currentUsername || 
        String(w.nip).toLowerCase() === currentUsername ||
        w.id === (currentUser.data as any)?.id
      );
      const assignedKelasIds = (appData.kelas || [])
        .filter(k => waliObj && k.waliKelasId === waliObj.id)
        .map(k => k.id);
      
      const siswaBinaan = (appData.siswa || []).filter(s => assignedKelasIds.includes(s.kelasId));
      siswaBinaan.forEach((s) => {
        const sKey = String(s.nisn || s.id).toLowerCase();
        if (sKey) {
          const kelasObj = appData.kelas.find(k => k.id === s.kelasId);
          threadMap[sKey] = {
            username: String(s.nisn || s.id),
            nama: `${s.nama} (${kelasObj?.nama || 'Kelas'})`,
            role: 'siswa',
            lastTime: '',
            unread: 0,
            lastText: 'Mulai chat dengan siswa binaan',
            foto: s.foto,
            noHp: s.noWa,
          };
        }
      });
    } else if (isGuru) {
      // 1. Add Admin Utama
      threadMap['admin'] = {
        username: 'admin',
        nama: appData.admin?.nama ? `${appData.admin.nama} (Helpdesk)` : 'Administrator Utama (Helpdesk)',
        role: 'admin',
        lastTime: '',
        unread: 0,
        lastText: 'Pusat Bantuan & Helpdesk',
        foto: appData.admin?.foto,
      };

      // 2. Add Kurikulum (Tim Kurikulum & Akademik)
      const kurikulumUser = appData.kurikulum?.username || 'kurikulum';
      const kurKey = String(kurikulumUser).toLowerCase();
      threadMap[kurKey] = {
        username: kurikulumUser,
        nama: appData.kurikulum?.nama ? `${appData.kurikulum.nama} (Kurikulum)` : 'Tim Kurikulum & Akademik',
        role: 'kurikulum',
        lastTime: '',
        unread: 0,
        lastText: 'Koordinasi Kurikulum, Jadwal & KBM',
        foto: appData.kurikulum?.foto,
        noHp: (appData.kurikulum as any)?.noHp || '',
      };

      // 3. Add Kesiswaan (BP/BK)
      const kesiswaanUser = appData.kesiswaan?.username || 'kesiswaan';
      const kKey = String(kesiswaanUser).toLowerCase();
      threadMap[kKey] = {
        username: kesiswaanUser,
        nama: appData.kesiswaan?.nama ? `${appData.kesiswaan.nama} (BP/BK)` : 'Tim Kesiswaan (BP/BK)',
        role: 'kesiswaan',
        lastTime: '',
        unread: 0,
        lastText: 'Koordinasi Kesiswaan & BP/BK',
        foto: appData.kesiswaan?.foto,
        noHp: (appData.kesiswaan as any)?.noHp || '',
      };
    } else if (isSiswa) {
      // 1. Add Admin Utama
      threadMap['admin'] = {
        username: 'admin',
        nama: 'Administrator Utama (Helpdesk)',
        role: 'admin',
        lastTime: '',
        unread: 0,
        lastText: 'Pusat Bantuan',
      };

      // 2. Add Wali Kelas Binaannya
      const siswaObj = appData.siswa.find(s => s.id === (currentUser.data as any)?.id || s.nisn === (currentUser.data as any)?.nisn) || (currentUser.data as Siswa);
      const myKelas = siswaObj ? appData.kelas.find(k => k.id === siswaObj.kelasId) : null;
      const myWali = myKelas ? appData.waliKelas.find(w => w.id === myKelas.waliKelasId) : null;

      if (myWali) {
        const wKey = String(myWali.username || myWali.nip || myWali.id).toLowerCase();
        threadMap[wKey] = {
          username: String(myWali.username || myWali.nip || myWali.id),
          nama: `${myWali.nama} (Wali Kelas)`,
          role: 'wali',
          lastTime: '',
          unread: 0,
          lastText: 'Chat dengan Wali Kelas',
          foto: myWali.foto,
          noHp: myWali.noHp,
        };
      }
    } else {
      threadMap['admin'] = {
        username: 'admin',
        nama: 'Administrator Utama',
        role: 'admin',
        lastTime: '',
        unread: 0,
        lastText: 'Pusat Bantuan',
      };
    }

    // Process chat messages
    allMessages.forEach((m) => {
      const isSenderMe = isMessageMe(m);
      const isRecipientMe = isMessageRecipientMe(m);
      const otherUserRaw = isSenderMe ? m.recipientUsername : m.senderUsername;
      if (!otherUserRaw || String(otherUserRaw).toLowerCase() === 'all') return;

      const otherUserKey = String(otherUserRaw).toLowerCase();
      if (myIdVariants.includes(otherUserKey)) return;

      // If user is Wali Kelas or Guru, strictly only allow permitted contacts in threadMap
      if ((isWali || isGuru) && !threadMap[otherUserKey]) {
        return;
      }

      // If user is Siswa, strictly only allow Admin and Wali Kelas
      if (isSiswa && !threadMap[otherUserKey]) {
        return;
      }

      if (!threadMap[otherUserKey]) {
        let userNama = m.senderNama || otherUserRaw;
        let userRole: UserRole = m.senderRole;
        let userFoto = m.senderFoto;

        const wali = appData.waliKelas.find(w => String(w.username).toLowerCase() === otherUserKey || String(w.nip).toLowerCase() === otherUserKey);
        const siswa = appData.siswa.find(s => String(s.nisn).toLowerCase() === otherUserKey || String(s.id).toLowerCase() === otherUserKey);
        if (wali) {
          userNama = wali.nama;
          userRole = 'wali';
          userFoto = wali.foto;
        } else if (siswa) {
          userNama = siswa.nama;
          userRole = 'siswa';
          userFoto = siswa.foto;
        }

        threadMap[otherUserKey] = {
          username: String(otherUserRaw),
          nama: userNama,
          role: userRole,
          lastTime: m.timestamp,
          unread: (!m.isRead && !isSenderMe && isRecipientMe) ? 1 : 0,
          lastText: m.text,
          lastIsMe: isSenderMe,
          lastIsRead: m.isRead,
          lastStatus: m.status,
          foto: userFoto,
        };
      } else {
        if (m.timestamp) {
          threadMap[otherUserKey].lastTime = m.timestamp;
          threadMap[otherUserKey].lastText = m.text;
          threadMap[otherUserKey].lastIsMe = isSenderMe;
          threadMap[otherUserKey].lastIsRead = m.isRead;
          threadMap[otherUserKey].lastStatus = m.status;
        }
        if (!m.isRead && !isSenderMe && isRecipientMe) {
          threadMap[otherUserKey].unread += 1;
        }
      }
    });

    return Object.values(threadMap).sort((a, b) => {
      if (a.username === 'admin') return -1;
      if (b.username === 'admin') return 1;
      if (a.username === 'all') return -2;
      if (a.unread !== b.unread) return b.unread - a.unread;
      if (a.lastTime && b.lastTime) return b.lastTime.localeCompare(a.lastTime);
      if (a.lastTime) return -1;
      if (b.lastTime) return 1;
      return a.nama.localeCompare(b.nama);
    });
  }, [allMessages, appData, isAdmin, isWali, isGuru, isSiswa, currentUsername, currentUser, myIdVariants]);

  // Filtered threads based on search and role
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      const matchSearch = t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole =
        filterRole === 'semua' ||
        t.role === filterRole ||
        (filterRole === 'admin' && (t.role === 'admin' || t.username === 'admin')) ||
        (filterRole === 'kurikulum' && (t.role === 'kurikulum' || t.username === 'kurikulum')) ||
        (filterRole === 'kesiswaan' && (t.role === 'kesiswaan' || t.username === 'kesiswaan')) ||
        (filterRole === 'siswa' && t.role === 'siswa') ||
        (filterRole === 'wali' && t.role === 'wali') ||
        (filterRole === 'user' && t.role === 'user');
      return matchSearch && matchRole;
    });
  }, [threads, searchQuery, filterRole]);

  // Set default selected thread
  useEffect(() => {
    if (threads.length > 0 && !selectedThreadUser) {
      setSelectedThreadUser(threads[0].username);
    }
  }, [threads, selectedThreadUser]);

  // Get active messages for thread
  const activeMessages = useMemo(() => {
    if (!selectedThreadUser) return [];
    const targetUser = String(selectedThreadUser).toLowerCase();

    if (targetUser === 'all') {
      return allMessages.filter((m) => String(m.recipientUsername).toLowerCase() === 'all');
    }

    return allMessages.filter((m) => {
      const sender = String(m.senderUsername || '').toLowerCase();
      const recipient = String(m.recipientUsername || '').toLowerCase();
      const isSenderMe = isMessageMe(m);
      const isRecipientMe = isMessageRecipientMe(m);

      if ((isSenderMe && recipient === targetUser) || 
          (sender === targetUser && isRecipientMe)) {
        return true;
      }
      if (isAdmin && (sender === targetUser && (recipient === 'admin' || isRecipientMe))) {
        return true;
      }
      if (recipient === 'all') return true;

      return false;
    });
  }, [allMessages, selectedThreadUser, isAdmin, myIdVariants]);

  // Selected thread user object
  const activeUserObj = useMemo(() => {
    if (!selectedThreadUser) return null;
    const key = String(selectedThreadUser).toLowerCase();
    return threads.find((t) => String(t.username).toLowerCase() === key) || null;
  }, [threads, selectedThreadUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Mark received unread messages as read when viewing the conversation
    const unreadToMark = allMessages.filter((m) => {
      if (m.isRead) return false;
      if (isMessageMe(m)) return false;

      // In admin view with a specific user selected
      if (isAdmin) {
        if (!selectedThreadUser) return false;
        if (selectedThreadUser === 'all') return true;
        const target = String(selectedThreadUser).toLowerCase();
        return String(m.senderUsername).toLowerCase() === target || isMessageRecipientMe(m);
      }

      // Non-admin viewing their conversation
      return isMessageRecipientMe(m);
    });

    if (unreadToMark.length > 0) {
      const idsToMark = new Set(unreadToMark.map((m) => m.id));
      onUpdateAppData((prev) => ({
        ...prev,
        chatMessages: (prev.chatMessages || []).map((m) => {
          if (idsToMark.has(m.id)) {
            return { ...m, isRead: true, status: 'read' };
          }
          return m;
        }),
      }));

      // Sync read status to backend
      fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadUser: selectedThreadUser,
          currentUsername,
          myIdVariants,
        }),
      }).catch(() => {});
    }
  }, [activeMessages.length, isAdmin, selectedThreadUser, allMessages, isMessageMe, isMessageRecipientMe, onUpdateAppData, currentUsername, myIdVariants]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        onShowToast('Ukuran gambar maksimal 5MB!', 'warning');
        return;
      }
      try {
        const compressed = await compressBase64Image(file, 800, 0.7);
        setSelectedImage(compressed);
      } catch (err) {
        onShowToast('Gagal memproses gambar.', 'error');
      }
    }
  };

  const handleSendMessage = (customText?: string) => {
    if (!isLiveChatEnabled && !isAdmin) {
      onShowToast('Fasilitas Live Chat sedang dinonaktifkan oleh Administrator.', 'warning');
      return;
    }
    const textToSend = (customText || inputText).trim();
    if (!textToSend && !selectedImage) return;

    const now = new Date();
    const formattedTime = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' ' +
                          now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const recipientUser = selectedThreadUser || (isAdmin ? 'all' : 'admin');
    const isSelfChat = recipientUser === currentUsername;

    const newMsg: ChatMessage = {
      id: 'CHAT_' + Date.now(),
      senderRole: currentUser.role,
      senderUsername: String(rawUsername),
      senderNama: currentNama,
      senderFoto: currentUser.data.foto || undefined,
      recipientUsername: recipientUser,
      text: textToSend,
      image: selectedImage || undefined,
      timestamp: formattedTime,
      isRead: isSelfChat,
      status: isSelfChat ? 'read' : 'pending', // Dimulai dengan Ceklis 1 (pending/proses kirim)
    };

    // Optimistic local update
    onUpdateAppData((prev) => ({
      ...prev,
      chatMessages: [...(prev.chatMessages || []), newMsg],
    }));

    // Post atomically to backend
    fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: newMsg }),
    }).catch(() => {});

    setInputText('');
    setSelectedImage(null);

    // Transisi cepat dari Pending (Ceklis 1) ke Terkirim (Ceklis 2 Abu-abu) setelah terkirim ke server
    if (!isSelfChat) {
      setTimeout(() => {
        onUpdateAppData((prev) => ({
          ...prev,
          chatMessages: (prev.chatMessages || []).map((m) => {
            if (m.id === newMsg.id && (!m.status || m.status === 'pending') && !m.isRead) {
              return { ...m, status: 'sent' };
            }
            return m;
          }),
        }));
      }, 500);
    }
  };

  // Helper to check if message was sent within the last 2 minutes (120,000 ms)
  const isMessageWithinTimeLimit = (msg: ChatMessage) => {
    const idNum = parseInt(msg.id.replace('CHAT_', ''), 10);
    if (isNaN(idNum)) return false;
    return (Date.now() - idNum) <= 120000; // 2 minutes (120 seconds)
  };

  // Open WhatsApp-Style Delete Dialog for Single Message
  const handleDeleteSingleMessage = (msgId: string) => {
    const target = (appData.chatMessages || []).find((m) => m.id === msgId);
    if (!target) return;
    const canDeleteForEveryone = isMessageMe(target) || isAdmin;
    const isWithinTime = isMessageWithinTimeLimit(target);

    setDeleteModal({
      isOpen: true,
      mode: 'single',
      targetId: msgId,
      canDeleteForEveryone,
      isWithinTimeLimit: isWithinTime,
      previewText: target.text ? (target.text.length > 50 ? target.text.substring(0, 50) + '...' : target.text) : 'Pesan Gambar',
    });
  };

  // Open WhatsApp-Style Delete Dialog for Selected Messages
  const handleDeleteSelectedMessages = () => {
    if (selectedMsgIds.length === 0) {
      onShowToast('Pilih setidaknya satu pesan untuk dihapus.', 'warning');
      return;
    }
    const selectedMsgs = selectedMsgIds.map((id) => (appData.chatMessages || []).find((x) => x.id === id)).filter(Boolean) as ChatMessage[];
    const hasMyMessages = selectedMsgs.some((m) => isMessageMe(m) || isAdmin);
    
    // Valid for everyone delete only if ALL selected messages are within the 2-minute limit
    const allWithinTime = selectedMsgs.every((m) => isMessageWithinTimeLimit(m));

    setDeleteModal({
      isOpen: true,
      mode: 'selected',
      targetIds: selectedMsgIds,
      canDeleteForEveryone: hasMyMessages || isAdmin,
      isWithinTimeLimit: allWithinTime,
      previewText: `${selectedMsgIds.length} pesan terpilih`,
    });
  };

  // Open WhatsApp-Style Delete Dialog for Entire Chat Thread
  const handleClearChatHistory = () => {
    setDeleteModal({
      isOpen: true,
      mode: 'history',
      canDeleteForEveryone: isAdmin,
      isWithinTimeLimit: true, // No time limit for thread history clearing
      previewText: 'Seluruh riwayat percakapan thread ini',
    });
  };

  // Execute Deletion ("for_everyone" or "for_me")
  const executeDeleteAction = async (deleteType: 'for_everyone' | 'for_me') => {
    const { mode, targetId, targetIds, isWithinTimeLimit } = deleteModal;
    setDeleteModal((prev) => ({ ...prev, isOpen: false }));

    if (deleteType === 'for_everyone' && mode !== 'history' && !isWithinTimeLimit) {
      onShowToast('Hapus untuk semua orang gagal: Batas waktu 2 menit telah habis.', 'error');
      return;
    }

    if (mode === 'single' && targetId) {
      // 1. Local Optimistic Update
      onUpdateAppData((prev) => ({
        ...prev,
        chatMessages: deleteType === 'for_everyone'
          ? (prev.chatMessages || []).filter((m) => m.id !== targetId)
          : (prev.chatMessages || []).map((m) => {
              if (m.id === targetId) {
                const existing = Array.isArray(m.deletedFor) ? m.deletedFor : [];
                return { ...m, deletedFor: Array.from(new Set([...existing, ...myIdVariants])) };
              }
              return m;
            }),
      }));
      setSelectedMsgIds((prev) => prev.filter((id) => id !== targetId));

      // 2. Server Atomic Sync
      try {
        await fetch('/api/chat/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: targetId,
            deleteType,
            username: currentUsername,
            myIdVariants,
          }),
        });
      } catch (err) {}

      onShowToast(
        deleteType === 'for_everyone'
          ? 'Pesan berhasil ditarik & dihapus untuk semua orang.'
          : 'Pesan berhasil dihapus untuk Anda saja (penerima tetap melihat).',
        'success'
      );
    } else if (mode === 'selected' && targetIds && targetIds.length > 0) {
      const idSet = new Set(targetIds);

      // 1. Local Optimistic Update
      onUpdateAppData((prev) => ({
        ...prev,
        chatMessages: deleteType === 'for_everyone'
          ? (prev.chatMessages || []).filter((m) => !idSet.has(m.id))
          : (prev.chatMessages || []).map((m) => {
              if (idSet.has(m.id)) {
                const existing = Array.isArray(m.deletedFor) ? m.deletedFor : [];
                return { ...m, deletedFor: Array.from(new Set([...existing, ...myIdVariants])) };
              }
              return m;
            }),
      }));
      setSelectedMsgIds([]);
      setIsSelectMode(false);

      // 2. Server Atomic Sync
      try {
        await fetch('/api/chat/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageIds: targetIds,
            deleteType,
            username: currentUsername,
            myIdVariants,
          }),
        });
      } catch (err) {}

      onShowToast(
        deleteType === 'for_everyone'
          ? `${targetIds.length} pesan terpilih berhasil ditarik untuk semua orang.`
          : `${targetIds.length} pesan terpilih dihapus dari tampilan Anda saja.`,
        'success'
      );
    } else if (mode === 'history') {
      const isThreadMatch = (m: ChatMessage) => {
        const s = String(m.senderUsername || '').toLowerCase();
        const r = String(m.recipientUsername || '').toLowerCase();
        const target = String(selectedThreadUser || '').toLowerCase();
        if (isAdmin && target) {
          return (s === target && (r === 'admin' || r === 'administrator')) ||
                 ((s === 'admin' || s === 'administrator') && r === target);
        } else {
          return myIdVariants.includes(s) || myIdVariants.includes(r);
        }
      };

      onUpdateAppData((prev) => ({
        ...prev,
        chatMessages: deleteType === 'for_everyone'
          ? (prev.chatMessages || []).filter((m) => !isThreadMatch(m))
          : (prev.chatMessages || []).map((m) => {
              if (isThreadMatch(m)) {
                const existing = Array.isArray(m.deletedFor) ? m.deletedFor : [];
                return { ...m, deletedFor: Array.from(new Set([...existing, ...myIdVariants])) };
              }
              return m;
            }),
      }));

      try {
        await fetch('/api/chat/clear-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedThreadUser,
            currentUsername,
            deleteType,
            isAdmin,
            myIdVariants,
          }),
        });
      } catch (err) {}

      onShowToast(
        deleteType === 'for_everyone'
          ? 'Riwayat obrolan berhasil dihapus untuk semua orang.'
          : 'Riwayat obrolan berhasil dibersihkan untuk Anda saja.',
        'success'
      );
    }
  };

  const handleToggleSelectMsg = (msgId: string) => {
    setSelectedMsgIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  };

  const handleSelectAllMsgs = () => {
    const allIds = activeMessages.map((m) => m.id);
    if (selectedMsgIds.length === allIds.length) {
      setSelectedMsgIds([]);
    } else {
      setSelectedMsgIds(allIds);
    }
  };

  const handleCancelSelectMode = () => {
    setIsSelectMode(false);
    setSelectedMsgIds([]);
  };

  const adminQuickReplies = [
    'Siap, pesan Anda telah kami catat dan ditindaklanjuti!',
    'Silakan lakukan refresh/muat ulang halaman pada browser Anda.',
    'Mohon sertakan bukti tangkapan layar (screenshot) kendala tersebut.',
    'Akun/Password Anda telah kami reset. Silakan coba login kembali.',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheck}
        title="Pusat Layanan Live Chat Admin"
        description="Fasilitas komunikasi langsung antara Wali Kelas, Tim Kesiswaan, Guru, dan Administrator Utama untuk koordinasi presensi, resetting akun, dan bantuan teknis."
        badge="Live Support & Help Desk"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* STATUS BADGE */}
            <div className="px-4 py-3 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl flex items-center gap-3">
              <div className="relative">
                <div className={`w-3 h-3 rounded-full ${isLiveChatEnabled ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                <div className={`w-3 h-3 rounded-full absolute inset-0 ${isLiveChatEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Status Layanan</div>
                <div className={`text-[11px] font-semibold ${isLiveChatEnabled ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {isLiveChatEnabled ? 'Online & Aktif' : 'Nonaktif (Dimatikan)'}
                </div>
              </div>
            </div>

            {/* SLIDER SWITCH FOR ADMIN */}
            {isAdmin && (
              <div className="flex items-center gap-3 bg-slate-900/90 border border-blue-400/30 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md">
                <div className="text-left">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
                    Sakelar Fitur
                  </div>
                  <div className="text-xs font-black flex items-center gap-1.5">
                    <Power className={`w-3.5 h-3.5 ${isLiveChatEnabled ? 'text-emerald-400' : 'text-rose-400'}`} />
                    <span className={isLiveChatEnabled ? 'text-emerald-300' : 'text-rose-300'}>
                      {isLiveChatEnabled ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </div>
                </div>

                {/* INTERACTIVE SLIDER BUTTON */}
                <button
                  type="button"
                  onClick={handleToggleLiveChatStatus}
                  className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
                    isLiveChatEnabled
                      ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40'
                      : 'bg-rose-600 shadow-lg shadow-rose-600/40'
                  }`}
                  title={`Klik slider untuk ${isLiveChatEnabled ? 'MEMATIKAN' : 'MENGAKTIFKAN'} fasilitas Live Chat`}
                >
                  <span className="sr-only">Sakelar On Off Live Chat</span>
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out flex items-center justify-center font-black text-[10px] ${
                      isLiveChatEnabled ? 'translate-x-8 text-emerald-600' : 'translate-x-0 text-rose-600'
                    }`}
                  >
                    {isLiveChatEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            )}
          </div>
        }
      />

      {/* ALERT BANNER IF DISABLED */}
      {!isLiveChatEnabled && (
        <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm ${
          isAdmin
            ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30 text-amber-900 dark:text-amber-200'
            : 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/30 text-rose-900 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
              isAdmin ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
            }`}>
              <PowerOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">
                Fasilitas Live Chat Sedang DINONAKTIFKAN
              </h3>
              <p className="text-xs opacity-90 leading-relaxed">
                {isAdmin
                  ? 'Administrator telah mematikan fasilitas ini. Pengguna lain (Wali Kelas / Guru / Kesiswaan) tidak dapat mengirim pesan saat ini.'
                  : 'Layanan live chat komunikasi saat ini sedang dimatikan sementara oleh Administrator Utama. Anda hanya dapat melihat riwayat pesan sebelumnya.'}
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={handleToggleLiveChatStatus}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition shrink-0 cursor-pointer flex items-center gap-2"
            >
              <Power className="w-4 h-4" />
              <span>Aktifkan Sekarang</span>
            </button>
          )}
        </div>
      )}

      {/* MAIN CHAT CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[650px]">
        {/* LEFT SIDEBAR: THREAD LIST */}
        {(isAdmin || isWali || isGuru || isSiswa) && (
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col overflow-hidden">
            {/* THREAD SEARCH & FILTER */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari percakapan..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* ROLE FILTER TABS */}
              {isAdmin && (
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                  {['semua', 'wali', 'siswa', 'kurikulum', 'kesiswaan', 'user'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFilterRole(r)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold capitalize transition cursor-pointer shrink-0 ${
                        filterRole === r
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {r === 'semua' ? 'Semua' : r === 'wali' ? 'Wali' : r === 'siswa' ? 'Siswa' : r === 'kurikulum' ? 'Kurikulum' : r === 'kesiswaan' ? 'Kesiswaan' : 'User'}
                    </button>
                  ))}
                </div>
              )}

              {isWali && (
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                  {[
                    { id: 'semua', label: 'Semua' },
                    { id: 'siswa', label: 'Siswa Binaan' },
                    { id: 'admin', label: 'Admin' },
                    { id: 'kurikulum', label: 'Kurikulum' },
                    { id: 'kesiswaan', label: 'Kesiswaan (BP/BK)' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setFilterRole(r.id)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer shrink-0 ${
                        filterRole === r.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}

              {(isGuru && !isWali) && (
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                  {[
                    { id: 'semua', label: 'Semua' },
                    { id: 'admin', label: 'Admin' },
                    { id: 'kurikulum', label: 'Kurikulum' },
                    { id: 'kesiswaan', label: 'Kesiswaan (BP/BK)' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setFilterRole(r.id)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer shrink-0 ${
                        filterRole === r.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* THREAD LIST */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredThreads.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Tidak ada percakapan ditemukan.
                </div>
              ) : (
                filteredThreads.map((t) => {
                  const isSelected = selectedThreadUser === t.username;

                  return (
                    <button
                      key={t.username}
                      type="button"
                      onClick={() => setSelectedThreadUser(t.username)}
                      className={`w-full p-4 flex items-center justify-between gap-3 text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-slate-800/80 border-l-4 border-blue-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          {t.foto ? (
                            <img src={t.foto} alt={t.nama} className="w-10 h-10 rounded-2xl object-cover border border-slate-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm">
                              {t.nama.charAt(0)}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{t.nama}</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase border ${
                              t.role === 'wali' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              t.role === 'siswa' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              t.role === 'kurikulum' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                              t.role === 'kesiswaan' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                              'bg-indigo-50 text-indigo-600 border-indigo-200'
                            }`}>
                              {t.role === 'wali' ? 'Wali' : t.role === 'siswa' ? 'Siswa' : t.role === 'kurikulum' ? 'Kurikulum' : t.role === 'kesiswaan' ? 'BP/BK' : 'Admin'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                            {t.lastIsMe && (
                              <span
                                className="shrink-0 inline-flex items-center"
                                title={
                                  t.lastIsRead || t.lastStatus === 'read'
                                    ? 'Dibaca (Ceklis 2 Hijau)'
                                    : t.lastStatus === 'pending'
                                    ? 'Tidak Terkirim / Pending (Ceklis 1)'
                                    : 'Terkirim (Ceklis 2)'
                                }
                              >
                                {t.lastIsRead || t.lastStatus === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                                ) : t.lastStatus === 'pending' ? (
                                  <Check className="w-3.5 h-3.5 text-slate-400" />
                                ) : (
                                  <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </span>
                            )}
                            <span className="truncate">{t.lastText || 'Belum ada pesan'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400">{t.lastTime.split(' ')[1] || t.lastTime}</span>
                        {t.unread > 0 && (
                          <span className="w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                            {t.unread}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* RIGHT CHAT CONVERSATION PANEL */}
        <div className={`${(isAdmin || isWali || isGuru || isSiswa) ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col overflow-hidden`}>
          {/* ACTIVE THREAD HEADER */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            {isSelectMode ? (
              <div className="w-full flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <ListChecks className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Mode Pilih Pesan
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedMsgIds.length}</span> dari {activeMessages.length} pesan dipilih
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllMsgs}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition cursor-pointer"
                  >
                    {selectedMsgIds.length === activeMessages.length && activeMessages.length > 0 ? 'Batal Semua' : 'Pilih Semua'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteSelectedMessages}
                    disabled={selectedMsgIds.length === 0}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedMsgIds.length > 0
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus ({selectedMsgIds.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelSelectMode}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                    title="Batalkan Mode Pilih"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold overflow-hidden shrink-0 shadow-xs">
                    {activeUserObj?.foto ? (
                      <img src={activeUserObj.foto} alt={activeUserObj.nama} className="w-full h-full object-cover" />
                    ) : (
                      activeUserObj ? activeUserObj.nama.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                      <span>{activeUserObj ? activeUserObj.nama : 'Pilih Percakapan'}</span>
                      {activeUserObj?.role && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border uppercase ${
                          activeUserObj.role === 'wali' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                          activeUserObj.role === 'siswa' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                          activeUserObj.role === 'kurikulum' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                          activeUserObj.role === 'kesiswaan' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                          'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                        }`}>
                          {activeUserObj.role === 'wali' ? 'Wali Kelas' : activeUserObj.role === 'siswa' ? 'Siswa' : activeUserObj.role === 'kurikulum' ? 'Kurikulum' : activeUserObj.role === 'kesiswaan' ? 'BP/BK' : activeUserObj.username === 'all' ? 'Umum' : 'Admin'}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20">
                        Online
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {activeUserObj ? (
                        activeUserObj.username === 'admin'
                          ? 'Akses Respon Cepat Helpdesk Sekolah'
                          : activeUserObj.role === 'kurikulum'
                          ? 'Koordinasi Kurikulum, Jadwal & KBM'
                          : activeUserObj.role === 'kesiswaan'
                          ? 'Koordinasi Kesiswaan & BP/BK'
                          : `Kontak: ${activeUserObj.username} • ${activeUserObj.role === 'siswa' ? 'Siswa' : activeUserObj.role === 'wali' ? 'Wali Kelas' : 'Pengguna'}`
                      ) : (
                        'Pilih salah satu percakapan di sebelah kiri'
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  {/* WhatsApp Tick Status Legend Indicator */}
                  <div className="hidden xl:flex items-center gap-2.5 text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 select-none shadow-xs">
                    <span className="flex items-center gap-1 font-medium" title="Pesan baru diproses / belum sampai"><Check className="w-3 h-3 text-slate-400" /> Ceklis 1: Pending</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="flex items-center gap-1 font-medium" title="Pesan terkirim ke penerima"><CheckCheck className="w-3.5 h-3.5 text-slate-400" /> Ceklis 2: Terkirim</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400" title="Pesan telah dibaca penerima"><CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> Ceklis 2 Hijau: Dibaca</span>
                  </div>

                  {activeMessages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsSelectMode(true)}
                      title="Pilih Beberapa Pesan"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer shadow-xs"
                    >
                      <ListChecks className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="hidden sm:inline">Pilih Pesan</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleClearChatHistory}
                    title="Hapus Semua Riwayat Chat Ini"
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* CHAT FEED */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-900/40">
            {activeMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                <div className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-1">Belum Ada Riwayat Percakapan</div>
                <p className="text-xs max-w-sm">
                  Kirimkan pesan pertama Anda di bawah ini untuk memulai obrolan dengan {isAdmin ? 'pengguna' : 'Admin'}.
                </p>
              </div>
            ) : (
              activeMessages.map((msg) => {
                const isMe = isMessageMe(msg);
                const isBotMsg = msg.isBot;
                const isSelected = selectedMsgIds.includes(msg.id);

                return (
                  <div
                    key={msg.id}
                    onClick={() => {
                      if (isSelectMode) handleToggleSelectMsg(msg.id);
                    }}
                    className={`group flex items-start gap-2.5 transition-all ${
                      isMe ? 'flex-row-reverse' : 'flex-row'
                    } ${isSelectMode ? 'cursor-pointer hover:opacity-90' : ''}`}
                  >
                    {/* Multi-Select Checkbox */}
                    {isSelectMode && (
                      <div className="pt-2 shrink-0">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <CheckSquare className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800" />
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                      {!isMe && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1 font-medium mb-1">
                          <span>{msg.senderNama}</span>
                        </div>
                      )}

                      <div className="relative group/msg flex items-center gap-1.5">
                        {/* Hover Quick Delete Button (Single Message) */}
                        {!isSelectMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSingleMessage(msg.id);
                            }}
                            title="Hapus pesan ini"
                            className={`opacity-0 group-hover/msg:opacity-100 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-all cursor-pointer shrink-0 ${
                              isMe ? 'order-first' : 'order-last'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div
                          className={`px-4 py-2.5 rounded-2xl shadow-xs text-xs sm:text-sm leading-relaxed break-words transition-all ${
                            isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : ''
                          } ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-xs'
                              : isBotMsg
                              ? 'bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-purple-100 border border-purple-700/50 rounded-bl-xs shadow-md'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-xs'
                          }`}
                        >
                          <div>{msg.text}</div>

                          {msg.image && (
                            <div className="mt-2.5 rounded-xl overflow-hidden border border-white/20 shadow-sm">
                              <img src={msg.image} alt="Lampiran" className="max-h-60 w-full object-cover" />
                            </div>
                          )}

                          {/* WhatsApp-Style Message Status Ticks & Timestamp */}
                          <div className={`flex items-center justify-end gap-1.5 mt-1 text-[11px] select-none font-medium ${
                            isMe ? 'text-blue-100/90' : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            <span>{msg.timestamp.split(' ').slice(1).join(' ') || msg.timestamp}</span>
                            {isMe && (
                              <span
                                className="inline-flex items-center ml-0.5"
                                title={
                                  msg.isRead || msg.status === 'read'
                                    ? 'Pesan telah dibaca penerima (Ceklis 2 Hijau)'
                                    : msg.status === 'pending'
                                    ? 'Pesan dalam antrean / pending (Ceklis 1)'
                                    : 'Pesan terkirim (Ceklis 2)'
                                }
                              >
                                {msg.isRead || msg.status === 'read' ? (
                                  <span className="inline-flex items-center gap-0.5 bg-emerald-950/40 px-1 py-0.5 rounded text-[#4ade80] font-bold shadow-xs">
                                    <CheckCheck className="w-4 h-4 text-[#4ade80] stroke-[2.8] drop-shadow-[0_0_3px_rgba(74,222,128,0.8)]" />
                                  </span>
                                ) : msg.status === 'pending' ? (
                                  <Check className="w-3.5 h-3.5 text-blue-200/70 stroke-[2]" />
                                ) : (
                                  <CheckCheck className="w-3.5 h-3.5 text-blue-200/70 stroke-[2]" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ADMIN QUICK REPLIES BAR */}
          {isAdmin && (
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 shrink-0 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">Template Balasan:</span>
              {adminQuickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(reply)}
                  className="px-3 py-1 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap transition cursor-pointer shrink-0"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* IMAGE PREVIEW */}
          {selectedImage && (
            <div className="px-4 py-2 bg-slate-200 dark:bg-slate-800 flex items-center justify-between border-t border-slate-300 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <img src={selectedImage} alt="Preview" className="w-10 h-10 object-cover rounded-lg" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Gambar berhasil dilampirkan</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="p-1 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full cursor-pointer text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* FOOTER FORM INPUT */}
          {!isLiveChatEnabled && !isAdmin ? (
            <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-center flex items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Pengiriman pesan sedang dinonaktifkan oleh Administrator.</span>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0"
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Lampirkan Foto / Screenshot"
                className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-2xl transition cursor-pointer shrink-0"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={activeUserObj ? `Tulis pesan untuk ${activeUserObj.nama}...` : 'Tuliskan pesan...'}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                type="submit"
                disabled={!inputText.trim() && !selectedImage}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-2 shrink-0 text-xs sm:text-sm"
              >
                <span>Kirim</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* WHATSAPP-STYLE DELETE OPTIONS MODAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                    {deleteModal.mode === 'history'
                      ? 'Bersihkan Riwayat Obrolan?'
                      : deleteModal.mode === 'selected'
                      ? 'Hapus Pesan Terpilih?'
                      : 'Hapus Pesan?'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {deleteModal.previewText ? `"${deleteModal.previewText}"` : 'Pilih opsi penghapusan pesan:'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {/* Option 1: Delete For Everyone (if sender or admin) */}
              {deleteModal.canDeleteForEveryone && (
                deleteModal.isWithinTimeLimit ? (
                  <button
                    type="button"
                    onClick={() => executeDeleteAction('for_everyone')}
                    className="w-full text-left p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        <span>Hapus untuk Semua Orang</span>
                      </div>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-rose-200/80 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                        Tarik Pesan
                      </span>
                    </div>
                    <p className="text-xs text-rose-600/80 dark:text-rose-300/80 mt-1 leading-relaxed">
                      Pesan akan ditarik dan dihapus permanen dari ruang obrolan Anda dan penerima.
                    </p>
                  </button>
                ) : (
                  <div className="w-full text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 opacity-70">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-slate-400 dark:text-slate-500 flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-slate-400" />
                        <span>Hapus untuk Semua Orang</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        Kedaluwarsa
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed italic">
                      Fitur "Hapus untuk semua orang" hanya berlaku selama 2 menit sejak pesan dikirim.
                    </p>
                  </div>
                )
              )}

              {/* Option 2: Delete For Me (Only on sender side, receiver keeps seeing it) */}
              <button
                type="button"
                onClick={() => executeDeleteAction('for_me')}
                className="w-full text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Hapus untuk Saya</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Sembunyikan
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Pesan hanya akan dihapus dari riwayat obrolan Anda. Penerima tetap dapat melihat pesan ini.
                </p>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
