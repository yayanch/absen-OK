import React from 'react';
import { Globe, Mail, Phone } from 'lucide-react';
import { SekolahConfig } from '../types';

interface FooterProps {
  sekolah?: SekolahConfig;
}

export const Footer: React.FC<FooterProps> = ({ sekolah }) => {
  if (sekolah?.showFooter === false) {
    return null;
  }

  const defaultYear = new Date().getFullYear();
  const defaultTeks = `© ${defaultYear} ${sekolah?.nama || 'Absensi Siswa'}. Hak Cipta Dilindungi.`;
  const defaultSub = 'Absensi Siswa & Rekap Kehadiran';

  const footerTeks = sekolah?.footerTeks !== undefined ? sekolah.footerTeks : defaultTeks;
  const footerSubTeks = sekolah?.footerSubTeks !== undefined ? sekolah.footerSubTeks : defaultSub;
  const website = sekolah?.website;
  const email = sekolah?.email;
  const telepon = sekolah?.telepon;

  return (
    <footer className="mt-auto py-4 px-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xs text-center text-xs text-slate-500 dark:text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
          <p className="font-medium text-slate-600 dark:text-slate-300">{footerTeks}</p>
          {website && (
            <a
              href={website.startsWith('http') ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-semibold"
            >
              <Globe className="w-3 h-3" />
              <span>{website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline text-[11px] font-semibold"
            >
              <Mail className="w-3 h-3" />
              <span>{email}</span>
            </a>
          )}
          {telepon && (
            <a
              href={`tel:${telepon.replace(/[^0-9+]/g, '')}`}
              className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline text-[11px] font-semibold"
            >
              <Phone className="w-3 h-3" />
              <span>{telepon}</span>
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          {footerSubTeks && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{footerSubTeks}</p>
          )}
          {sekolah?.showAppVersion !== false && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80">
              {sekolah?.appVersion || 'v2.5.0'}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
};
