import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Maximize2,
  Bot,
  User,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Minimize2,
  PhoneCall,
  UserCheck,
  Power,
  Lock,
  Trash2,
  ListChecks,
  CheckSquare,
  Square,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Filter,
  MessageCircle
} from 'lucide-react';
import { AppData, SekolahConfig, UserSession, ChatMessage, UserRole, Siswa } from '../../types';
import { compressBase64Image } from '../../utils/helpers';

interface LiveChatWidgetProps {
  appData: AppData;
  currentUser: UserSession;
  onUpdateAppData: (updater: (prev: AppData) => AppData) => void;
  onNavigate: (view: any) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
}

export const LiveChatWidget: React.FC<LiveChatWidgetProps> = ({
  appData,
  currentUser,
  onUpdateAppData,
  onNavigate,
  onShowToast,
  isOpen: controlledIsOpen,
  onToggleOpen,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === 'function' ? val(isOpen) : val;
    if (onToggleOpen) {
      onToggleOpen(nextVal);
    } else {
      setInternalIsOpen(nextVal);
    }
  };
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeThreadUser, setActiveThreadUser] = useState<string>(''); // For admin to select user
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);
  const [isContactListOpen, setIsContactListOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('semua');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Options Modal State (Hapus untuk Semua Orang vs Hapus untuk Saya)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    mode: 'single' | 'selected';
    targetId?: string;
    targetIds?: string[];
    canDeleteForEveryone: boolean;
    previewText?: string;
  }>({
    isOpen: false,
    mode: 'single',
    canDeleteForEveryone: false,
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

  // Sync chat when widget is open
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, appData.chatMessages, onUpdateAppData]);

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

  // Group messages into user threads for Admin, Wali Kelas, and Siswa
  const threads = useMemo(() => {
    const threadMap: Record<string, { username: string; nama: string; role: UserRole; lastTime: string; unread: number; lastText: string; foto?: string }> = {};

    if (isAdmin) {
      // 0. Add Broadcast option
      threadMap['all'] = {
        username: 'all',
        nama: 'Broadcast (Semua)',
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
      // 1. Admin
      threadMap['admin'] = {
        username: 'admin',
        nama: appData.admin?.nama ? `${appData.admin.nama} (Helpdesk)` : 'Administrator Utama',
        role: 'admin',
        lastTime: '',
        unread: 0,
        lastText: 'Pusat Bantuan & Helpdesk',
        foto: appData.admin?.foto,
      };

      // 2. Kurikulum
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
      };

      // 3. Kesiswaan (BP/BK)
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
      };

      // 4. Siswa Binaannya (Hanya siswa pada kelas yang diampu oleh Wali Kelas)
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
            lastText: 'Chat dengan siswa binaan',
            foto: s.foto,
          };
        }
      });
    } else if (isGuru) {
      // 1. Admin
      threadMap['admin'] = {
        username: 'admin',
        nama: appData.admin?.nama ? `${appData.admin.nama} (Helpdesk)` : 'Administrator Utama',
        role: 'admin',
        lastTime: '',
        unread: 0,
        lastText: 'Pusat Bantuan & Helpdesk',
        foto: appData.admin?.foto,
      };

      // 2. Kurikulum
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
      };

      // 3. Kesiswaan (BP/BK)
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
      };
    } else if (isSiswa) {
      // 1. Admin
      threadMap['admin'] = {
        username: 'admin',
        nama: 'Administrator Utama',
        role: 'admin',
        lastTime: '',
        unread: 0,
        lastText: 'Pusat Bantuan',
      };

      // 2. Wali Kelas
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

    // 2. Process chat messages
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
          foto: userFoto,
        };
      } else {
        if (m.timestamp) {
          threadMap[otherUserKey].lastTime = m.timestamp;
          threadMap[otherUserKey].lastText = m.text;
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
  }, [allMessages, isAdmin, isWali, isGuru, isSiswa, appData, currentUsername, currentUser, myIdVariants]);

  // Set default active thread
  useEffect(() => {
    if (threads.length > 0 && !activeThreadUser) {
      setActiveThreadUser(threads[0].username);
    }
  }, [threads, activeThreadUser]);

  // Selected thread user object
  const activeUserObj = useMemo(() => {
    if (!activeThreadUser) return null;
    const key = String(activeThreadUser).toLowerCase();
    return threads.find((t) => String(t.username).toLowerCase() === key) || null;
  }, [threads, activeThreadUser]);

  // Filtered threads for contact drawer search & role filter
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      const matchSearch = t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole =
        roleFilter === 'semua' ||
        t.role === roleFilter ||
        (roleFilter === 'admin' && (t.role === 'admin' || t.username === 'admin')) ||
        (roleFilter === 'kurikulum' && (t.role === 'kurikulum' || t.username === 'kurikulum')) ||
        (roleFilter === 'kesiswaan' && (t.role === 'kesiswaan' || t.username === 'kesiswaan')) ||
        (roleFilter === 'siswa' && t.role === 'siswa') ||
        (roleFilter === 'wali' && t.role === 'wali') ||
        (roleFilter === 'user' && t.role === 'user');
      return matchSearch && matchRole;
    });
  }, [threads, searchQuery, roleFilter]);

  // Total unread in other conversations
  const otherUnreadCount = useMemo(() => {
    return threads.reduce((acc, t) => {
      if (t.username !== activeThreadUser) {
        return acc + (t.unread || 0);
      }
      return acc;
    }, 0);
  }, [threads, activeThreadUser]);

  // Filter messages for current view context
  const activeMessages = useMemo(() => {
    if (!activeThreadUser) return [];
    const targetUser = String(activeThreadUser).toLowerCase();

    if (targetUser === 'all') {
      return allMessages.filter(m => String(m.recipientUsername).toLowerCase() === 'all');
    }

    return allMessages.filter(m => {
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
  }, [allMessages, activeThreadUser, isAdmin, myIdVariants]);

  // Calculate unread badge count
  const unreadCount = useMemo(() => {
    return allMessages.filter(m => !m.isRead && isMessageRecipientMe(m)).length;
  }, [allMessages, myIdVariants]);

  // Scroll to bottom and mark messages as read on open
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      
      const unreadToMark = allMessages.filter((m) => {
        if (m.isRead) return false;
        if (isMessageMe(m)) return false;

        if (isAdmin) {
          if (!activeThreadUser) return false;
          if (activeThreadUser === 'all') return true;
          const target = String(activeThreadUser).toLowerCase();
          return String(m.senderUsername).toLowerCase() === target || isMessageRecipientMe(m);
        }

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

        fetch('/api/chat/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            threadUser: activeThreadUser,
            currentUsername,
            myIdVariants,
          }),
        }).catch(() => {});
      }
    }
  }, [isOpen, activeMessages.length, activeThreadUser, isAdmin, allMessages, isMessageMe, isMessageRecipientMe, onUpdateAppData, currentUsername, myIdVariants]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        onShowToast('Ukuran gambar maksimal 5MB!', 'warning');
        return;
      }
      try {
        const compressed = await compressBase64Image(file, 600, 0.7);
        setSelectedImage(compressed);
      } catch (err) {
        onShowToast('Gagal memproses gambar.', 'error');
      }
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    if (!isLiveChatEnabled && !isAdmin) {
      onShowToast('Fasilitas Live Chat sedang dinonaktifkan oleh Admin.', 'warning');
      return;
    }
    const msgText = (textToSend || inputText).trim();
    if (!msgText && !selectedImage) return;

    const now = new Date();
    const formattedTime = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' ' +
                          now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const recipientUser = activeThreadUser || (isAdmin ? 'all' : 'admin');
    const isSelfChat = recipientUser === currentUsername;

    const newMsg: ChatMessage = {
      id: 'CHAT_' + Date.now(),
      senderRole: currentUser.role,
      senderUsername: String(rawUsername),
      senderNama: currentNama,
      senderFoto: currentUser.data.foto || undefined,
      recipientUsername: recipientUser,
      text: msgText,
      image: selectedImage || undefined,
      timestamp: formattedTime,
      isRead: isSelfChat,
      status: isSelfChat ? 'read' : 'pending', // Ceklis 1 saat proses kirim / baru dikirim
    };

    // Optimistic update
    onUpdateAppData((prev) => ({
      ...prev,
      chatMessages: [...(prev.chatMessages || []), newMsg],
    }));

    // Post to server
    fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: newMsg }),
    }).catch(() => {});

    setInputText('');
    setSelectedImage(null);

    // Transisi cepat dari Pending (Ceklis 1) ke Terkirim (Ceklis 2 Abu-abu) setelah terkirim
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

  const handleDeleteSingleMessage = (msgId: string) => {
    const target = (appData.chatMessages || []).find((m) => m.id === msgId);
    if (!target) return;
    const canDeleteForEveryone = isMessageMe(target) || isAdmin;

    setDeleteModal({
      isOpen: true,
      mode: 'single',
      targetId: msgId,
      canDeleteForEveryone,
      previewText: target.text ? (target.text.length > 40 ? target.text.substring(0, 40) + '...' : target.text) : 'Pesan Gambar',
    });
  };

  const handleDeleteSelectedMessages = () => {
    if (selectedMsgIds.length === 0) {
      onShowToast('Pilih setidaknya satu pesan untuk dihapus.', 'warning');
      return;
    }
    const hasMyMessages = selectedMsgIds.some((id) => {
      const m = (appData.chatMessages || []).find((x) => x.id === id);
      return m && (isMessageMe(m) || isAdmin);
    });

    setDeleteModal({
      isOpen: true,
      mode: 'selected',
      targetIds: selectedMsgIds,
      canDeleteForEveryone: hasMyMessages || isAdmin,
      previewText: `${selectedMsgIds.length} pesan terpilih`,
    });
  };

  const executeDeleteAction = async (deleteType: 'for_everyone' | 'for_me') => {
    const { mode, targetId, targetIds } = deleteModal;
    setDeleteModal((prev) => ({ ...prev, isOpen: false }));

    if (mode === 'single' && targetId) {
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

  const quickTemplates = [
    { label: '🔑 Reset Password', text: 'Halo Admin, mohon bantuan untuk reset password akun saya.' },
    { label: '📊 Kendala Presensi', text: 'Halo Admin, saya mengalami kendala pada saat input presensi siswa.' },
    { label: '🏠 Kordinasi Home Visit', text: 'Halo Admin, mohon konfirmasi laporan Home Visit siswa kelas saya.' },
    { label: '📁 Tambah Siswa Baru', text: 'Halo Admin, ada siswa baru yang perlu ditambahkan ke sistem.' },
  ];

  if (!isAdmin && !isLiveChatEnabled) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* FLOATING CHAT WINDOW OVERLAY */}
      <div className="fixed bottom-4 right-3 sm:right-6 z-50 w-[92vw] sm:w-[400px] h-[550px] max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200">
        {/* CHAT HEADER */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            {isSelectMode ? (
              <div className="w-full flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold shrink-0">
                    <ListChecks className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-[11px] font-bold truncate">
                    <span className="text-blue-400">{selectedMsgIds.length}</span> dipilih
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAllMsgs}
                    className="px-2 py-1 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-[10px] font-medium text-white transition cursor-pointer"
                  >
                    {selectedMsgIds.length === activeMessages.length && activeMessages.length > 0 ? 'Batal' : 'Semua'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteSelectedMessages}
                    disabled={selectedMsgIds.length === 0}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      selectedMsgIds.length > 0
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelSelectMode}
                    className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                    title="Batal"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/40 border border-blue-400/30 flex items-center justify-center font-bold text-xs overflow-hidden">
                      {activeUserObj?.foto ? (
                        <img src={activeUserObj.foto} alt={activeUserObj.nama} className="w-full h-full object-cover" />
                      ) : activeUserObj ? (
                        activeUserObj.nama.charAt(0).toUpperCase()
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-slate-900 rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black tracking-tight truncate flex items-center gap-1.5">
                      <span>{activeUserObj ? activeUserObj.nama : (isAdmin ? 'Chat Center Admin' : 'Live Chat')}</span>
                      {activeUserObj?.role && (
                        <span className={`px-1.5 py-0.2 text-[8.5px] font-bold rounded-md border uppercase ${
                          activeUserObj.role === 'wali' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                          activeUserObj.role === 'siswa' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                          activeUserObj.role === 'kurikulum' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                          activeUserObj.role === 'kesiswaan' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                          'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                        }`}>
                          {activeUserObj.role === 'wali' ? 'Wali' : activeUserObj.role === 'siswa' ? 'Siswa' : activeUserObj.role === 'kurikulum' ? 'Kurikulum' : activeUserObj.role === 'kesiswaan' ? 'BP/BK' : activeUserObj.username === 'all' ? 'Umum' : 'Admin'}
                        </span>
                      )}
                      <span className={`px-1.5 py-0.2 text-[8.5px] font-bold rounded-md border ${
                        isLiveChatEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {isLiveChatEnabled ? 'Online' : 'Off'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 truncate">
                      {activeUserObj ? (
                        activeUserObj.username === 'admin'
                          ? 'Akses Respon Cepat Helpdesk'
                          : activeUserObj.role === 'kurikulum'
                          ? 'Kurikulum, Jadwal & KBM'
                          : activeUserObj.role === 'kesiswaan'
                          ? 'Kesiswaan & BP/BK'
                          : `Kontak: ${activeUserObj.username}`
                      ) : (
                        isAdmin ? `Melayani: ${threads.length} Pengguna` : 'Layanan Bantuan'
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* CONTACT LIST DRAWER TOGGLE BUTTON (For switching threads easily) */}
                  {threads.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setIsContactListOpen((prev) => !prev)}
                      title="Daftar Kontak Percakapan"
                      className="relative p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      {otherUnreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 border border-slate-900 rounded-full animate-pulse" />
                      )}
                    </button>
                  )}

                  {/* SLIDER ON/OFF FOR ADMIN IN WIDGET HEADER */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleToggleLiveChatStatus}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-white/20 transition-colors duration-300 ease-in-out ${
                        isLiveChatEnabled ? 'bg-emerald-500' : 'bg-rose-600'
                      }`}
                      title={`Live Chat ${isLiveChatEnabled ? 'AKTIF (Klik untuk matikan)' : 'NONAKTIF (Klik untuk aktifkan)'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-300 ease-in-out flex items-center justify-center font-black text-[8px] ${
                          isLiveChatEnabled ? 'translate-x-5 text-emerald-600' : 'translate-x-0.5 text-rose-600'
                        }`}
                      >
                        {isLiveChatEnabled ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  )}

                  {activeMessages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsSelectMode(true)}
                      title="Pilih Pesan untuk Dihapus"
                      className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                    >
                      <ListChecks className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('live_chat');
                    }}
                    title="Buka Tampilan Penuh"
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Tutup Chat"
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* CONVERSATION DIRECTORY VIEW OR CHAT CONVERSATION VIEW */}
          {isContactListOpen ? (
            /* DIRECTORY / SEARCH CONVERSATION LIST VIEW */
            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
              {/* TOP SEARCH & CONTROLS */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsContactListOpen(false)}
                      className="p-1.5 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                      title="Kembali ke Ruang Obrolan"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Daftar Percakapan ({threads.length})</span>
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsContactListOpen(false)}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>

                {/* SEARCH INPUT */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, NISN, NIP, atau kelas..."
                    className="w-full pl-8.5 pr-8 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* ROLE FILTER TABS */}
                {isAdmin && (
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-0.5">
                    {[
                      { id: 'semua', label: 'Semua' },
                      { id: 'wali', label: 'Wali Kelas' },
                      { id: 'siswa', label: 'Siswa' },
                      { id: 'kurikulum', label: 'Kurikulum' },
                      { id: 'kesiswaan', label: 'BP/BK' },
                      { id: 'user', label: 'User' },
                    ].map((rf) => (
                      <button
                        key={rf.id}
                        type="button"
                        onClick={() => setRoleFilter(rf.id)}
                        className={`px-2.5 py-0.8 rounded-lg text-[10.5px] font-bold transition whitespace-nowrap cursor-pointer ${
                          roleFilter === rf.id
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {rf.label}
                      </button>
                    ))}
                  </div>
                )}

                {isWali && (
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-0.5">
                    {[
                      { id: 'semua', label: 'Semua' },
                      { id: 'siswa', label: 'Siswa Binaan' },
                      { id: 'admin', label: 'Admin' },
                      { id: 'kurikulum', label: 'Kurikulum' },
                      { id: 'kesiswaan', label: 'Kesiswaan (BP/BK)' },
                    ].map((rf) => (
                      <button
                        key={rf.id}
                        type="button"
                        onClick={() => setRoleFilter(rf.id)}
                        className={`px-2.5 py-0.8 rounded-lg text-[10.5px] font-bold transition whitespace-nowrap cursor-pointer ${
                          roleFilter === rf.id
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {rf.label}
                      </button>
                    ))}
                  </div>
                )}

                {isGuru && !isWali && (
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-0.5">
                    {[
                      { id: 'semua', label: 'Semua' },
                      { id: 'admin', label: 'Admin' },
                      { id: 'kurikulum', label: 'Kurikulum' },
                      { id: 'kesiswaan', label: 'Kesiswaan (BP/BK)' },
                    ].map((rf) => (
                      <button
                        key={rf.id}
                        type="button"
                        onClick={() => setRoleFilter(rf.id)}
                        className={`px-2.5 py-0.8 rounded-lg text-[10.5px] font-bold transition whitespace-nowrap cursor-pointer ${
                          roleFilter === rf.id
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {rf.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* CONTACT / THREAD LIST */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
                {filteredThreads.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-1">
                    <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Tidak ada kontak ditemukan</div>
                    <p className="text-[11px] text-slate-400">Coba kata kunci pencarian lain</p>
                  </div>
                ) : (
                  filteredThreads.map((t) => {
                    const isSelected = activeThreadUser === t.username;

                    return (
                      <button
                        key={t.username}
                        type="button"
                        onClick={() => {
                          setActiveThreadUser(t.username);
                          setIsContactListOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-2xl flex items-center justify-between gap-2.5 text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            {t.foto ? (
                              <img src={t.foto} alt={t.nama} className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                                {t.nama.charAt(0)}
                              </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {t.nama}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase border ${
                                t.role === 'wali' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                                t.role === 'siswa' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
                                t.role === 'kurikulum' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
                                t.role === 'kesiswaan' ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800' :
                                'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                              }`}>
                                {t.role === 'wali' ? 'Wali' : t.role === 'siswa' ? 'Siswa' : t.role === 'kurikulum' ? 'Kurikulum' : t.role === 'kesiswaan' ? 'BP/BK' : t.username === 'all' ? 'Umum' : 'Admin'}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {t.lastText || 'Belum ada pesan'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {t.lastTime && (
                            <span className="text-[9.5px] text-slate-400">{t.lastTime.split(' ')[1] || t.lastTime}</span>
                          )}
                          {t.unread > 0 ? (
                            <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-xs animate-pulse">
                              {t.unread}
                            </span>
                          ) : isSelected ? (
                            <Check className="w-3.5 h-3.5 text-blue-600" />
                          ) : null}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <>
              {/* SUBHEADER: ACTIVE CONTACT BANNER + SEARCH/SWITCH BUTTON */}
              {(isAdmin || isWali || isSiswa) && (
                <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                        {activeUserObj ? (
                          activeUserObj.foto ? (
                            <img src={activeUserObj.foto} alt={activeUserObj.nama} className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            activeUserObj.nama.charAt(0)
                          )
                        ) : (
                          '?'
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {activeUserObj?.nama || 'Pusat Bantuan Admin'}
                          </span>
                          {activeUserObj?.role && (
                            <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-extrabold uppercase border ${
                              activeUserObj.role === 'wali' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                              activeUserObj.role === 'siswa' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
                              'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            }`}>
                              {activeUserObj.role === 'wali' ? 'Wali' : activeUserObj.role === 'siswa' ? 'Siswa' : 'Admin'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* BUTTON TO OPEN SEARCHABLE CONVERSATION LIST */}
                    {threads.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsContactListOpen(true)}
                        className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer shadow-2xs shrink-0"
                        title="Buka daftar percakapan & cari kontak"
                      >
                        <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Ganti Kontak</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                        {otherUnreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-xs">
                            {otherUnreadCount}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

          {/* CHAT MESSAGES BODY */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
            {activeMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <Bot className="w-6 h-6 text-blue-500" />
                </div>
                <div className="font-bold text-slate-700 dark:text-slate-300 text-xs mb-1">Belum Ada Pesan</div>
                <div className="text-[11px] max-w-xs">Kirimkan pertanyaan atau laporan Anda kepada Administrator untuk mendapatkan bantuan.</div>
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
                    className={`group flex items-start gap-2 transition-all ${
                      isMe ? 'flex-row-reverse' : 'flex-row'
                    } ${isSelectMode ? 'cursor-pointer hover:opacity-90' : ''}`}
                  >
                    {/* Multi-Select Checkbox */}
                    {isSelectMode && (
                      <div className="pt-1.5 shrink-0">
                        {isSelected ? (
                          <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <CheckSquare className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800" />
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[84%]`}>
                      {!isMe && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium px-1 mb-0.5">
                          <span>{msg.senderNama}</span>
                        </div>
                      )}

                      <div className="relative group/msg flex items-center gap-1">
                        {/* Hover Quick Delete Button (Single Message) */}
                        {!isSelectMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSingleMessage(msg.id);
                            }}
                            title="Hapus pesan ini"
                            className={`opacity-0 group-hover/msg:opacity-100 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-md transition-all cursor-pointer shrink-0 ${
                              isMe ? 'order-first' : 'order-last'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}

                        <div
                          className={`px-3.5 py-2.5 rounded-2xl shadow-xs text-xs leading-relaxed break-words transition-all ${
                            isSelected ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900' : ''
                          } ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-xs'
                              : isBotMsg
                              ? 'bg-gradient-to-r from-purple-900/90 to-indigo-900/90 text-purple-100 border border-purple-700/50 rounded-bl-xs shadow-md'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-xs'
                          }`}
                        >
                          <div>{msg.text}</div>

                          {msg.image && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-white/20">
                              <img src={msg.image} alt="Lampiran" className="max-h-48 w-full object-cover" />
                            </div>
                          )}

                          {/* WhatsApp-Style Message Status Ticks & Timestamp */}
                          <div className={`flex items-center justify-end gap-1.5 mt-1 text-[10.5px] select-none font-medium ${
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
                                    <CheckCheck className="w-3.5 h-3.5 text-[#4ade80] stroke-[2.8] drop-shadow-[0_0_3px_rgba(74,222,128,0.8)]" />
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

          {/* QUICK TEMPLATES (FOR NON-ADMIN) */}
          {!isAdmin && (
            <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 shrink-0 flex gap-1.5 overflow-x-auto scrollbar-none">
              {quickTemplates.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(tpl.text)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-[10px] font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap transition cursor-pointer shrink-0"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          )}

          {/* IMAGE PREVIEW */}
          {selectedImage && (
            <div className="px-3 py-2 bg-slate-200 dark:bg-slate-800 flex items-center justify-between border-t border-slate-300 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <img src={selectedImage} alt="Preview" className="w-8 h-8 object-cover rounded-lg" />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Gambar siap dikirim</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="p-1 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full cursor-pointer text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* INPUT FORM FOOTER */}
          {!isLiveChatEnabled && !isAdmin ? (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 text-center flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Live Chat dinonaktifkan oleh Admin.</span>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
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
                title="Lampirkan Gambar"
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isAdmin ? 'Balas sebagai Admin...' : 'Tulis pesan untuk Admin...'}
                className="flex-1 py-2 px-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                type="submit"
                disabled={!inputText.trim() && !selectedImage}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
          </>
          )}

          {/* WHATSAPP-STYLE DELETE MODAL INSIDE WIDGET */}
          {deleteModal.isOpen && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs rounded-2xl animate-in fade-in duration-150">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 max-w-xs w-full shadow-2xl space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                        {deleteModal.mode === 'selected' ? 'Hapus Pesan Terpilih?' : 'Hapus Pesan?'}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
                        {deleteModal.previewText || 'Pilih opsi:'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 pt-1">
                  {deleteModal.canDeleteForEveryone && (
                    <button
                      type="button"
                      onClick={() => executeDeleteAction('for_everyone')}
                      className="w-full text-left p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 transition cursor-pointer"
                    >
                      <div className="font-bold text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus untuk Semua Orang</span>
                      </div>
                      <p className="text-[10px] text-rose-600/80 dark:text-rose-300/80 mt-0.5">
                        Tarik & hapus permanen untuk pengirim & penerima.
                      </p>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => executeDeleteAction('for_me')}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>Hapus untuk Saya</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Hapus di tampilan ini saja, penerima tetap melihat.
                    </p>
                  </button>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
    </>
  );
};
