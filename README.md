<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6adbd9a1-88f2-4811-a60d-428723e7edc4

## Run Locally

**Prerequisites:** Node.js (v20+ LTS recommended)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Jalankan dalam mode development:
   ```bash
   npm run dev
   ```
3. Akses melalui browser di: `http://localhost:3000`

---

## Panduan Instalasi & Deployment di Server VPS

Untuk panduan lengkap deployment aplikasi ini ke server VPS (Ubuntu 22.04 / 24.04 LTS, Debian, PM2, Nginx / Apache, MySQL, dan SSL HTTPS), silakan baca dokumentasi resmi di:

📖 **[PANDUAN_INSTALL_VPS.md](./PANDUAN_INSTALL_VPS.md)**

Ringkasan perintah build & run di VPS:
```bash
# 1. Install dependencies
npm install

# 2. Build aplikasi produksi
npm run build

# 3. Jalankan di background dengan PM2
pm2 start dist/server.cjs --name "presensi-sekolah"
```

