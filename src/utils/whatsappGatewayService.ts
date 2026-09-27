import { WhatsAppGatewayConfig, WhatsAppLog, Siswa, SekolahConfig } from '../types';

export const DEFAULT_WA_TEMPLATES = {
  otp: `🏫 *{sekolah}*\n*PORTAL PRESENSI SISWA DIGITAL*\n\nHalo *{nama_siswa}*,\n\nBerikut adalah Kode OTP verifikasi login presensi Anda:\n👉 *{otp_code}*\n\n🔒 _Jangan berikan kode ini kepada siapapun demi keamanan akun dan perangkat Anda._\n_Kode OTP ini berlaku selama 2 menit._`,

  presensiMasuk: `🏫 *NOTIFIKASI KEHADIRAN SISWA*\n*{sekolah}*\n\nKepada Yth. Orang Tua / Wali dari:\n👤 *Nama:* {nama_siswa}\n🆔 *NISN:* {nisn}\n🏫 *Kelas:* {kelas}\n\n✅ *Status:* HADIR (Masuk Sekolah)\n⏰ *Waktu:* {jam} WIB\n📅 *Tanggal:* {tanggal}\n\n_Terima kasih atas kerja samanya dalam mendampingi kedisiplinan belajar ananda._`,

  presensiPulang: `🏫 *NOTIFIKASI KEPULANGAN SISWA*\n*{sekolah}*\n\nKepada Yth. Orang Tua / Wali dari:\n👤 *Nama:* {nama_siswa}\n🏫 *Kelas:* {kelas}\n\n🏠 *Status:* PULANG SEKOLAH\n⏰ *Waktu Pulang:* {jam} WIB\n📅 *Tanggal:* {tanggal}\n\n_Ananda telah menyelesaikan kegiatan belajar di sekolah hari ini._`,

  presensiTerlambat: `⚠️ *NOTIFIKASI KETERLAMBATAN SISWA*\n*{sekolah}*\n\nKepada Yth. Orang Tua / Wali dari:\n👤 *Nama:* {nama_siswa}\n🏫 *Kelas:* {kelas}\n\n⚠️ *Status:* TERLAMBAT / KESIANGAN\n⏰ *Waktu Tiba:* {jam} WIB\n📅 *Tanggal:* {tanggal}\n📌 *Keterangan:* {keterangan}\n\n_Mohon bimbingan dan perhatiannya agar ananda dapat hadir tepat waktu pada hari berikutnya._`,

  ketidakhadiran: `📢 *NOTIFIKASI KETIDAKHADIRAN SISWA*\n*{sekolah}*\n\nKepada Yth. Orang Tua / Wali dari:\n👤 *Nama:* {nama_siswa}\n🏫 *Kelas:* {kelas}\n\n❌ *Status Kehadiran:* {status}\n📅 *Tanggal:* {tanggal}\n📌 *Catatan:* {keterangan}\n\n_Jika ananda sakit atau izin dengan surat/alasan tertentu, silakan konfirmasi ke Wali Kelas._`,

  broadcast: `📢 *PENGUMUMAN RESMI SEKOLAH*\n*{sekolah}*\n\nYth. Bapak/Ibu Orang Tua & Siswa,\n\n{pesan_pengumuman}\n\n📅 *Tanggal:* {tanggal}\n_Manajemen & Tata Usaha {sekolah}_`,
};

export const DEFAULT_GATEWAY_CONFIG: WhatsAppGatewayConfig = {
  enabled: true,
  provider: 'fonnte',
  apiKey: '',
  senderNumber: '',
  domainUrl: '',
  webhookUrl: '',
  sendOtpEnabled: true,
  sendPresensiMasukEnabled: true,
  sendPresensiPulangEnabled: true,
  sendPresensiTerlambatEnabled: true,
  sendKetidakhadiranEnabled: true,
  sendToStudent: true,
  sendToParent: true,
  templateOtp: DEFAULT_WA_TEMPLATES.otp,
  templatePresensiMasuk: DEFAULT_WA_TEMPLATES.presensiMasuk,
  templatePresensiPulang: DEFAULT_WA_TEMPLATES.presensiPulang,
  templatePresensiTerlambat: DEFAULT_WA_TEMPLATES.presensiTerlambat,
  templateKetidakhadiran: DEFAULT_WA_TEMPLATES.ketidakhadiran,
  templateBroadcast: DEFAULT_WA_TEMPLATES.broadcast,
};

/**
 * Format Indonesian Phone Number to standard (628xxxxxxxx)
 */
export const normalizeIndonesianPhone = (rawPhone: string): string => {
  let cleaned = String(rawPhone || '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  } else if (!cleaned.startsWith('62') && cleaned.length >= 8) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
};

/**
 * Mask Phone Number for Privacy (e.g. 0812****7890)
 */
export const maskPhoneNumber = (rawPhone?: string): string => {
  if (!rawPhone) return '-';
  const clean = rawPhone.replace(/[^0-9]/g, '');
  if (clean.length < 7) return clean;
  const start = clean.slice(0, 4);
  const end = clean.slice(-3);
  return `${start}****${end}`;
};

export interface InterpolateVariables {
  sekolah?: string;
  nama_siswa?: string;
  nisn?: string;
  kelas?: string;
  jam?: string;
  tanggal?: string;
  status?: string;
  keterangan?: string;
  otp_code?: string;
  pesan_pengumuman?: string;
  [key: string]: string | undefined;
}

/**
 * Interpolate {variable_name} inside template text
 */
export const interpolateTemplate = (
  template: string,
  variables: InterpolateVariables
): string => {
  let output = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    output = output.replace(placeholder, value || '');
  }
  return output;
};

export interface SendWhatsAppMessageParams {
  phone: string;
  recipientName?: string;
  message: string;
  gatewayConfig?: Partial<WhatsAppGatewayConfig>;
  sekolah?: Partial<SekolahConfig>;
  messageType?: WhatsAppLog['messageType'];
}

export interface SendWhatsAppResult {
  success: boolean;
  message: string;
  directWaUrl: string;
  providerUsed: string;
  log: WhatsAppLog;
}

/**
 * Send WhatsApp Message through configured Gateway API or Direct Link Fallback
 */
export const sendWhatsAppMessage = async (
  params: SendWhatsAppMessageParams
): Promise<SendWhatsAppResult> => {
  const { phone, recipientName = 'Penerima', message, gatewayConfig, messageType = 'broadcast' } = params;
  const normalizedPhone = normalizeIndonesianPhone(phone);
  const directWaUrl = `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodeURIComponent(message)}`;

  const provider = gatewayConfig?.provider || 'fonnte';
  const apiKey = (gatewayConfig?.apiKey || '').trim();
  const isEnabled = gatewayConfig?.enabled !== false;

  let isSuccess = false;
  let responseText = '';
  let providerUsedName = 'Direct Link Simulator';

  // If gateway is enabled and apiKey exists
  if (isEnabled && apiKey) {
    try {
      if (provider === 'fonnte') {
        providerUsedName = 'Fonnte Gateway API';
        const res = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            Authorization: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target: normalizedPhone,
            message: message,
            countryCode: '62',
          }),
        });
        const resJson = await res.json().catch(() => ({}));
        if (res.ok && resJson.status !== false) {
          isSuccess = true;
          responseText = `Terkirim via Fonnte (${resJson.target || normalizedPhone})`;
        } else {
          isSuccess = false;
          responseText = resJson.reason || 'Respon error dari server Fonnte.';
        }
      } else if (provider === 'wablas') {
        providerUsedName = 'Wablas Gateway API';
        const domain = (gatewayConfig?.domainUrl || 'https://solo.wablas.com').replace(/\/+$/, '');
        const res = await fetch(`${domain}/api/send-message`, {
          method: 'POST',
          headers: {
            Authorization: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: normalizedPhone,
            message: message,
          }),
        });
        const resJson = await res.json().catch(() => ({}));
        if (res.ok && resJson.status === true) {
          isSuccess = true;
          responseText = `Terkirim via Wablas ke ${normalizedPhone}`;
        } else {
          isSuccess = false;
          responseText = resJson.message || 'Gagal mengirim via Wablas.';
        }
      } else if (provider === 'starsender') {
        providerUsedName = 'Starsender Gateway API';
        const res = await fetch('https://api.starsender.online/api/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: apiKey,
          },
          body: JSON.stringify({
            messageType: 'text',
            to: normalizedPhone,
            body: message,
          }),
        });
        const resJson = await res.json().catch(() => ({}));
        if (res.ok && resJson.status === true) {
          isSuccess = true;
          responseText = `Terkirim via Starsender ke ${normalizedPhone}`;
        } else {
          isSuccess = false;
          responseText = resJson.message || 'Gagal mengirim via Starsender.';
        }
      } else if (provider === 'custom_webhook' && gatewayConfig?.webhookUrl) {
        providerUsedName = 'Custom Webhook API';
        const res = await fetch(gatewayConfig.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            to: normalizedPhone,
            recipientName,
            messageType,
            message,
            timestamp: new Date().toISOString(),
          }),
        });
        if (res.ok) {
          isSuccess = true;
          responseText = `Webhook sukses (Status ${res.status})`;
        } else {
          isSuccess = false;
          responseText = `Webhook gagal (Status ${res.status})`;
        }
      }
    } catch (err: any) {
      isSuccess = false;
      responseText = `Error koneksi: ${err?.message || 'Gagal menghubungi server WA Gateway'}`;
    }
  } else {
    // If no API key configured, success with Simulator / Direct WhatsApp Link
    isSuccess = true;
    providerUsedName = 'Direct Link & In-App Simulator';
    responseText = 'Pesan disiapkan untuk link WhatsApp';
  }

  const log: WhatsAppLog = {
    id: `WALOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    recipientPhone: normalizedPhone,
    recipientName,
    messageType,
    messageText: message,
    status: isSuccess ? 'success' : 'failed',
    provider: providerUsedName,
    responseMessage: responseText,
  };

  return {
    success: isSuccess,
    message: responseText || 'Pesan berhasil diproses.',
    directWaUrl,
    providerUsed: providerUsedName,
    log,
  };
};

/**
 * Format Current Indonesian Time (e.g. 07:15)
 */
export const getFormattedTimeNow = (): string => {
  const now = new Date();
  return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
};

/**
 * Format Current Indonesian Date (e.g. Jumat, 25 September 2026)
 */
export const getFormattedDateNow = (): string => {
  const now = new Date();
  return now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};
