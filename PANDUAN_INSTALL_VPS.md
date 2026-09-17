# Panduan Lengkap Instalasi & Deployment di Server VPS
**Sistem Presensi & Manajemen Sekolah Modern**  
*(React 19, TypeScript, Tailwind CSS, Express, Node.js v20/v22 LTS, PM2, Nginx / Apache, MySQL)*

---

## Daftar Isi
1. [Kebutuhan Minimal Server VPS](#1-kebutuhan-minimal-server-vps)
2. [Langkah 1: Persiapan Server & Update Sistem](#2-langkah-1-persiapan-server--update-sistem)
3. [Langkah 2: Instalasi Node.js (v20 LTS) & PM2](#3-langkah-2-instalasi-nodejs-v20-lts--pm2)
4. [Langkah 3: Instalasi & Konfigurasi MySQL Database](#4-langkah-3-instalasi--konfigurasi-mysql-database)
5. [Langkah 4: Upload & Build Aplikasi](#5-langkah-4-upload--build-aplikasi)
6. [Langkah 5: Menjalankan Aplikasi dengan PM2](#6-langkah-5-menjalankan-aplikasi-dengan-pm2)
7. [Langkah 6: Konfigurasi Web Server (Nginx Reverse Proxy)](#7-langkah-6-konfigurasi-web-server-nginx-reverse-proxy)
8. [Langkah 7: Pemasangan SSL Gratis (HTTPS) dengan Certbot](#8-langkah-7-pemasangan-ssl-gratis-https-dengan-certbot)
9. [Langkah 8: Pengaturan Firewall (UFW)](#9-langkah-8-pengaturan-firewall-ufw)
10. [Alternatif: Konfigurasi Apache2 Reverse Proxy](#10-alternatif-konfigurasi-apache2-reverse-proxy)
11. [Perintah Pemeliharaan Rutin & Update](#11-perintah-pemeliharaan-rutin--update)

---

## 1. Kebutuhan Minimal Server VPS

* **Sistem Operasi**: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS atau Debian 12 (Direkomendasikan).
* **CPU**: Minimal 1 vCPU (Rekomendasi 2 vCPU untuk sekolah > 500 siswa).
* **RAM**: Minimal 1 GB (Rekomendasi 2 GB - 4 GB jika MySQL berjalan di VPS yang sama).
* **Storage**: Minimal 20 GB SSD.
* **Domain / Subdomain**: Misalnya `presensi.sekolah.sch.id` (A record diarahkan ke IP publik VPS).

> **PENTING TENTANG KAMERA & QR SCANNER:**
> Browser modern (Google Chrome, Edge, Safari) membatasi akses kamera perangkat hanya pada protokol **HTTPS** (atau `localhost`). Pastikan Anda menyelesaikan **Langkah 7 (SSL)** agar fitur scan QR kamera ponsel dan laptop dapat berfungsi.

---

## 2. Langkah 1: Persiapan Server & Update Sistem

Hubungkan ke server VPS Anda melalui terminal / SSH:
```bash
ssh root@IP_VPS_ANDA
```

Perbarui paket sistem ke versi terbaru:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip ufw nginx
```

---

## 3. Langkah 2: Instalasi Node.js (v20 LTS) & PM2

Instal Node.js v20 LTS dari repositori resmi NodeSource:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verifikasi versi:
```bash
node -v   # Output minimal v20.x.x
npm -v
```

Instal **PM2** secara global (Process Manager untuk menjaga aplikasi tetap aktif di background dan otomatis jalan saat server reboot):
```bash
sudo npm install -g pm2
```

---

## 4. Langkah 3: Instalasi & Konfigurasi MySQL Database

Jika Anda ingin menyimpan data ke database MySQL di VPS yang sama:

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

Masuk ke konsol MySQL:
```bash
sudo mysql
```

Jalankan perintah SQL berikut untuk membuat database dan user:
```sql
CREATE DATABASE sistem_presensi_sekolah CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'adminpresensi'@'localhost' IDENTIFIED BY 'PasswordKuatSekolah2026!';
GRANT ALL PRIVILEGES ON sistem_presensi_sekolah.* TO 'adminpresensi'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 5. Langkah 4: Upload & Build Aplikasi

Buat direktori kerja aplikasi di `/var/www/presensi`:
```bash
sudo mkdir -p /var/www/presensi
sudo chown -R $USER:$USER /var/www/presensi
cd /var/www/presensi
```

Salin atau clone source code aplikasi ke folder ini:
* **Opsi A: Menggunakan Git**
  ```bash
  git clone URL_REPOSITORY_ANDA .
  ```
* **Opsi B: Upload file ZIP dari AI Studio (Settings > Export to ZIP)**
  Upload file ZIP dari komputer lokal menggunakan SCP/SFTP:
  ```bash
  # Dijalankan di komputer lokal:
  scp presensi.zip root@IP_VPS_ANDA:/var/www/presensi/
  ```
  Kemudian ekstrak di server:
  ```bash
  cd /var/www/presensi
  unzip presensi.zip
  ```

Instal dependensi dan lakukan build produksi:
```bash
# 1. Instal semua paket
npm install

# 2. Kompilasi frontend dan server backend
npm run build
```
Hasil build akan berada di folder `dist/` (`dist/index.html` dan `dist/server.cjs`).

---

## 6. Langkah 5: Menjalankan Aplikasi dengan PM2

Jalankan server aplikasi di background menggunakan PM2:
```bash
# Menjalankan server pada port 3000
NODE_ENV=production PORT=3000 pm2 start dist/server.cjs --name "presensi-sekolah"

# Simpan daftar proses PM2
pm2 save

# Aktifkan startup script agar otomatis jalan setelah server reboot
pm2 startup
```
*(Jalankan baris perintah `sudo env PATH=...` yang ditampilkan di layar oleh perintah `pm2 startup` jika diminta).*

Cek status aplikasi:
```bash
pm2 status
pm2 logs presensi-sekolah --lines 20
```

---

## 7. Langkah 6: Konfigurasi Web Server (Nginx Reverse Proxy)

Buat file konfigurasi Nginx baru untuk domain sekolah:
```bash
sudo nano /etc/nginx/sites-available/presensi
```

Tempel konfigurasi berikut (ganti `presensi.sekolah.sch.id` dengan domain/subdomain Anda, atau gunakan `_` jika langsung IP):

```nginx
server {
    listen 80;
    server_name presensi.sekolah.sch.id;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }
}
```

Aktifkan konfigurasi Nginx dan uji sintaks:
```bash
sudo ln -s /etc/nginx/sites-available/presensi /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 8. Langkah 7: Pemasangan SSL Gratis (HTTPS) dengan Certbot

Pasang sertifikat SSL Let's Encrypt resmi secara otomatis:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d presensi.sekolah.sch.id
```
Ikuti petunjuk di layar (masukkan email dan pilih opsi redirect HTTP ke HTTPS). Sertifikat ini otomatis diperpanjang secara berkala.

---

## 9. Langkah 8: Pengaturan Firewall (UFW)

Amankan server VPS Anda dengan mengizinkan port penting:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Sekarang Anda dapat membuka browser dan mengakses:
`https://presensi.sekolah.sch.id`

---

## 10. Alternatif: Konfigurasi Apache2 Reverse Proxy

Jika VPS Anda menggunakan Apache2 bukan Nginx:

1. Aktifkan modul proxy:
   ```bash
   sudo apt install -y apache2
   sudo a2enmod proxy proxy_http proxy_wstunnel rewrite headers ssl
   ```
2. Buat file virtual host:
   ```bash
   sudo nano /etc/apache2/sites-available/presensi.conf
   ```
3. Isi konfigurasi:
   ```apache
   <VirtualHost *:80>
       ServerName presensi.sekolah.sch.id
       
       ProxyPreserveHost On
       ProxyPass / http://127.0.0.1:3000/
       ProxyPassReverse / http://127.0.0.1:3000/
       
       ErrorLog ${APACHE_LOG_DIR}/presensi_error.log
       CustomLog ${APACHE_LOG_DIR}/presensi_access.log combined
   </VirtualHost>
   ```
4. Aktifkan dan reload Apache:
   ```bash
   sudo a2ensite presensi.conf
   sudo apache2ctl configtest
   sudo systemctl restart apache2
   ```
5. Pasang SSL dengan Certbot Apache:
   ```bash
   sudo apt install -y python3-certbot-apache
   sudo certbot --apache -d presensi.sekolah.sch.id
   ```

---

## 11. Perintah Pemeliharaan Rutin & Update

### Melihat Log Aplikasi Realtime
```bash
pm2 logs presensi-sekolah
```

### Me-restart Aplikasi
```bash
pm2 restart presensi-sekolah
```

### Mengupdate Aplikasi ke Versi Baru
```bash
cd /var/www/presensi
git pull                # Atau upload file kode baru
npm install
npm run build
pm2 restart presensi-sekolah
```

### Backup Data MySQL Otomatis
```bash
mysqldump -u adminpresensi -p'PasswordKuatSekolah2026!' sistem_presensi_sekolah > /var/backups/presensi_$(date +\%Y\%m\%d).sql
```
