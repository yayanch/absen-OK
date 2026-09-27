// WhatsApp OTP Dispatch Service
export interface SendOtpParams {
  phone: string;
  siswaNama: string;
  nisn: string;
  otpCode: string;
  sekolahNama?: string;
  gatewayApiKey?: string;
  gatewayProvider?: 'fonnte' | 'wablas' | 'starsender' | 'custom_webhook' | 'direct_link';
  webhookUrl?: string;
}

export interface SendOtpResult {
  success: boolean;
  message: string;
  directWaUrl?: string;
  providerUsed: string;
}

/**
 * Format Indonesian Phone Number to International Standard (628xxx)
 */
export const normalizeIndonesianPhone = (rawPhone: string): string => {
  let cleaned = rawPhone.replace(/[^0-9]/g, '');
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
 * Generate formatted WhatsApp OTP text
 */
export const formatOtpTextMessage = (
  siswaNama: string,
  otpCode: string,
  sekolahNama: string = 'SMK NEGERI 6 GARUT'
): string => {
  return `🏫 *${sekolahNama.toUpperCase()}*\n*PORTAL PRESENSI SISWA DIGITAL*\n\nHalo *${siswaNama}*,\n\nBerikut adalah Kode OTP verifikasi login presensi Anda:\n👉 *${otpCode}*\n\n🔒 _Jangan berikan kode ini kepada siapapun demi keamanan akun dan perangkat Anda._\n_Kode OTP ini berlaku selama 2 menit._`;
};

/**
 * Send OTP via WhatsApp Gateway API or Direct Link Fallback
 */
export const sendWhatsappOtp = async (params: SendOtpParams): Promise<SendOtpResult> => {
  const { phone, siswaNama, otpCode, sekolahNama = 'SMK NEGERI 6 GARUT', gatewayApiKey, gatewayProvider = 'fonnte', webhookUrl } = params;
  const normalizedPhone = normalizeIndonesianPhone(phone);
  const messageText = formatOtpTextMessage(siswaNama, otpCode, sekolahNama);
  const directWaUrl = `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodeURIComponent(messageText)}`;

  // 1. If Fonnte Gateway API Key is provided
  if (gatewayApiKey && gatewayProvider === 'fonnte') {
    try {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: gatewayApiKey.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: normalizedPhone,
          message: messageText,
          countryCode: '62',
        }),
      });

      const resJson = await response.json();
      if (response.ok && resJson.status !== false) {
        return {
          success: true,
          message: `OTP berhasil dikirim via Fonnte Gateway ke ${normalizedPhone}`,
          directWaUrl,
          providerUsed: 'Fonnte Gateway API',
        };
      } else {
        return {
          success: false,
          message: resJson.reason || 'Gagal mengirim melalui Fonnte Gateway.',
          directWaUrl,
          providerUsed: 'Fonnte (Error)',
        };
      }
    } catch (e: any) {
      console.warn('Fonnte API Call Error:', e);
    }
  }

  // 2. If Custom Webhook is provided
  if (webhookUrl && gatewayProvider === 'custom_webhook') {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(gatewayApiKey ? { Authorization: `Bearer ${gatewayApiKey}` } : {}),
        },
        body: JSON.stringify({
          to: normalizedPhone,
          name: siswaNama,
          otp: otpCode,
          message: messageText,
        }),
      });
      if (response.ok) {
        return {
          success: true,
          message: `OTP terkirim via Webhook ke ${normalizedPhone}`,
          directWaUrl,
          providerUsed: 'Custom Webhook API',
        };
      }
    } catch (e) {
      console.warn('Custom Webhook Call Error:', e);
    }
  }

  // 3. Fallback: Direct Link & In-App WhatsApp Notification
  return {
    success: true,
    message: `OTP disiapkan untuk ${normalizedPhone}`,
    directWaUrl,
    providerUsed: 'Direct WhatsApp Link & Simulator',
  };
};
