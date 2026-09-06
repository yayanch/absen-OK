import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

async function generateDocumentationPDF() {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let currentY = 20;

  function checkPageBreak(neededHeight: number) {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
      // Header on subsequent pages
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.setFont("helvetica", "italic");
      doc.text("Panduan Instalasi Sistem Presensi Siswa V3.0 - VPS & Apache Server", marginLeft, 12);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(marginLeft, 14, pageWidth - marginRight, 14);
    }
  }

  // Cover / Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PANDUAN INSTALASI & DEPLOYMENT SERVER VPS", marginLeft, 18);

  doc.setFontSize(12);
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text("Sistem Informasi Presensi Siswa Terpadu V3.0", marginLeft, 26);

  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.setFont("helvetica", "normal");
  doc.text("Apache2 Reverse Proxy • Node.js v20 • MySQL 8.0 • PM2 • SSL Let's Encrypt", marginLeft, 34);
  doc.text("Tanggal Rilis: Agustus 2026 | Versi Dokumentasi: 3.0.0 (Official)", marginLeft, 40);

  currentY = 55;

  function addHeading1(title: string) {
    checkPageBreak(15);
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(marginLeft, currentY - 4, contentWidth, 8, "F");
    doc.setDrawColor(14, 116, 144); // cyan-700
    doc.setLineWidth(0.8);
    doc.line(marginLeft, currentY - 4, marginLeft, currentY + 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(title, marginLeft + 4, currentY + 1.5);
    currentY += 10;
  }

  function addHeading2(title: string) {
    checkPageBreak(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(title, marginLeft, currentY);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, currentY + 1.5, marginLeft + 70, currentY + 1.5);
    currentY += 7;
  }

  function addParagraph(text: string) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(text, contentWidth);
    checkPageBreak(lines.length * 4.2);
    doc.text(lines, marginLeft, currentY);
    currentY += lines.length * 4.2 + 2;
  }

  function addCodeBlock(code: string) {
    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    const lines = doc.splitTextToSize(code, contentWidth - 8);
    const blockHeight = lines.length * 3.6 + 6;
    checkPageBreak(blockHeight);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginLeft, currentY, contentWidth, blockHeight, 1.5, 1.5, "FD");

    doc.setTextColor(15, 23, 42);
    doc.text(lines, marginLeft + 4, currentY + 4.5);
    currentY += blockHeight + 3;
  }

  function addBullet(boldText: string, normalText: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    checkPageBreak(5);
    doc.text("•  " + boldText + ": ", marginLeft + 2, currentY);
    const prefixWidth = doc.getTextWidth("•  " + boldText + ": ");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const remainLines = doc.splitTextToSize(normalText, contentWidth - prefixWidth - 2);
    doc.text(remainLines[0] || "", marginLeft + 2 + prefixWidth, currentY);
    currentY += 4.5;
    if (remainLines.length > 1) {
      for (let i = 1; i < remainLines.length; i++) {
        checkPageBreak(4.5);
        doc.text(remainLines[i], marginLeft + 6, currentY);
        currentY += 4.5;
      }
    }
  }

  // 1. Spesifikasi
  addHeading1("1. SPESIFIKASI & PRASYARAT SISTEM");
  addParagraph("Sistem Informasi Presensi Siswa V3.0 dirancang dengan arsitektur Full-Stack (React 19 Vite + Node.js Express + MySQL). Untuk performa maksimal di lingkungan produksi sekolah, berikut spesifikasi server yang direkomendasikan:");
  addBullet("OS VPS", "Ubuntu 22.04 LTS / 24.04 LTS (64-bit) atau Debian 11/12");
  addBullet("Processor & RAM", "Minimal 1 vCPU (1.5 GHz) dan 1 GB RAM (Wajib Swap 2GB). Direkomendasikan 2 vCPU, 2 GB RAM.");
  addBullet("Storage", "Minimal 15 GB SSD / NVMe untuk database, log harian, dan berkas foto presensi.");
  addBullet("Web Server & Runtime", "Apache 2.4.41+ (dengan mod_proxy, mod_rewrite, mod_ssl) dan Node.js v20.x LTS.");
  addBullet("Database", "MySQL 8.0+ atau MariaDB 10.5+ dengan charset utf8mb4_unicode_ci.");
  currentY += 3;

  // 2. Langkah Instalasi VPS
  addHeading1("2. INSTALASI DI SERVER VPS (UBUNTU / DEBIAN)");
  
  addHeading2("A. Update Sistem & Konfigurasi Swap Memory 2GB");
  addParagraph("Login ke server VPS via SSH, lalu perbarui paket dan aktifkan swap agar proses build berjalan lancar:");
  addCodeBlock(
`# 1. Update OS
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nano unzip ufw software-properties-common build-essential

# 2. Aktifkan Swap 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab`
  );

  addHeading2("B. Instalasi Node.js v20 LTS & PM2");
  addParagraph("Instal runtime JavaScript Node.js versi 20 LTS beserta Process Manager PM2:");
  addCodeBlock(
`# Instal Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi versi
node -v   # Output: v20.x.x
npm -v

# Instal PM2 Process Manager secara global
sudo npm install -g pm2`
  );

  addHeading2("C. Instalasi & Optimasi Database MySQL 8.0");
  addParagraph("Instal server MySQL dan sesuaikan max_allowed_packet untuk mendukung sinkronisasi foto absensi Base64:");
  addCodeBlock(
`sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# Edit konfigurasi MySQL untuk menambah limit paket:
# Tambahkan 'max_allowed_packet = 64M' di /etc/mysql/mysql.conf.d/mysqld.cnf
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Restart MySQL
sudo systemctl restart mysql`
  );

  addParagraph("Buat database dan pengguna khusus untuk aplikasi:");
  addCodeBlock(
`sudo mysql -u root

-- Eksekusi di konsol MySQL:
CREATE DATABASE db_presensi_v3 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'user_presensi'@'localhost' IDENTIFIED WITH mysql_native_password BY 'PasswordKuatPresensi2026!';
GRANT ALL PRIVILEGES ON db_presensi_v3.* TO 'user_presensi'@'localhost';
FLUSH PRIVILEGES;
EXIT;`
  );

  addHeading2("D. Deployment Kode & Build Project");
  addParagraph("Salin kode aplikasi ke folder web, siapkan berkas .env, dan lakukan kompilasi rilis produksi:");
  addCodeBlock(
`sudo mkdir -p /var/www/presensi-v3
sudo chown -R $USER:$USER /var/www/presensi-v3
cd /var/www/presensi-v3

# Salin source code atau clone dari repository Git
git clone https://github.com/username/sistem-presensi-v3.git .

# Konfigurasi file .env
nano .env`
  );

  addParagraph("Isi berkas .env dengan kredensial berikut:");
  addCodeBlock(
`NODE_ENV=production
PORT=3000

# Konfigurasi Database MySQL Lokal
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=user_presensi
MYSQL_PASSWORD=PasswordKuatPresensi2026!
MYSQL_DATABASE=db_presensi_v3`
  );

  addParagraph("Jalankan instalasi paket dependensi dan build aplikasi:");
  addCodeBlock(
`npm install
npm run build

# Menghasilkan folder dist/ dan bundle backend dist/server.cjs`
  );

  addHeading2("E. Menjalankan Backend dengan PM2");
  addParagraph("Jalankan server aplikasi di latar belakang dan daftarkan ke startup sistem:");
  addCodeBlock(
`pm2 start dist/server.cjs --name "presensi-v3" --time
pm2 startup
pm2 save

# Periksa status layanan
pm2 status`
  );

  // 3. Konfigurasi Apache & VirtualHost
  addHeading1("3. KONFIGURASI APACHE & VIRTUALHOST");
  addParagraph("Instal Apache2, aktifkan modul proxy dan rewrite, kemudian buat berkas VirtualHost:");
  addCodeBlock(
`sudo apt install -y apache2
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite headers ssl deflate
sudo nano /etc/apache2/sites-available/presensi.conf`
  );

  addParagraph("Isi konfigurasi VirtualHost Apache berikut (sesuaikan ServerName):");
  addCodeBlock(
`<VirtualHost *:80>
    ServerName presensi.sekolah.sch.id
    ServerAdmin webmaster@sekolah.sch.id
    DocumentRoot /var/www/presensi-v3/dist

    LimitRequestBody 52428800

    # Reverse Proxy Endpoint API
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass /api http://127.0.0.1:3000/api
    ProxyPassReverse /api http://127.0.0.1:3000/api

    # SPA Routing Fallback
    <Directory /var/www/presensi-v3/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_URI} !^/api
        RewriteRule . /index.html [L]
    </Directory>

    ErrorLog \${APACHE_LOG_DIR}/presensi_error.log
    CustomLog \${APACHE_LOG_DIR}/presensi_access.log combined
</VirtualHost>`
  );

  addParagraph("Aktifkan situs dan muat ulang Apache:");
  addCodeBlock(
`sudo a2ensite presensi.conf
sudo a2dissite 000-default.conf
sudo apache2ctl configtest
sudo systemctl reload apache2`
  );

  addHeading2("Pemasangan SSL Gratis (Certbot HTTPS)");
  addCodeBlock(
`sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d presensi.sekolah.sch.id`
  );

  // 4. File .htaccess
  addHeading1("4. KONFIGURASI LENGKAP FILE .HTACCESS");
  addParagraph("Simpan berkas .htaccess berikut di direktori publik (/var/www/presensi-v3/dist/.htaccess):");
  addCodeBlock(
`# ==========================================================
# SISTEM PRESENSI V3.0 - HTACCESS RULES
# ==========================================================
Options -Indexes +FollowSymLinks
AddDefaultCharset UTF-8

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # HTTPS Redirect
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

    # Jangan alihkan rute API
    RewriteCond %{REQUEST_URI} ^/api [NC]
    RewriteRule ^ - [L]

    # SPA Fallback
    RewriteRule ^index\\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

# Blokir Berkas Sensitif
<FilesMatch "^(\\..*|package.*\\.json|tsconfig\\.json|server\\.ts|.*\\.env)$">
    Require all denied
</FilesMatch>

# Kompresi GZIP
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>`
  );

  // 5. Izin Direktori
  addHeading1("5. STANDAR IZIN DIREKTORI & KEAMANAN FILE (PERMISSIONS)");
  addParagraph("Pastikan izin kepemilikan dan hak akses berkas diatur sesuai standar keamanan Linux:");
  addCodeBlock(
`# 1. Atur kepemilikan ke user dan group web server
sudo chown -R $USER:www-data /var/www/presensi-v3

# 2. Hak akses folder 755 dan file 644
sudo find /var/www/presensi-v3 -type d -exec chmod 755 {} \\;
sudo find /var/www/presensi-v3 -type f -exec chmod 644 {} \\;

# 3. Kunci file konfigurasi .env (Hanya owner yang bisa baca/tulis)
chmod 600 /var/www/presensi-v3/.env

# 4. Berikan hak tulis pada folder dist
chmod -R 775 /var/www/presensi-v3/dist`
  );

  // 6. Skema Database
  addHeading1("6. STRUKTUR SKEMA TABEL DATABASE MYSQL V3.0");
  addParagraph("Server secara otomatis melakukan migrasi skema tabel saat dijalankan. Anda juga dapat memverifikasi tabel-tabel utama berikut:");
  addBullet("app_settings", "Menyimpan konfigurasi umum, parameter radius GPS, dan snapshot state global.");
  addBullet("admin", "Akun Super Administrator (id, username, password, nama, foto).");
  addBullet("wali_kelas", "Daftar Wali Kelas, Guru Pengampu, Tim Kesiswaan, dan BP/BK.");
  addBullet("kelas", "Master Kelas, jurusan, koordinat latitude, longitude, dan radius presensi.");
  addBullet("siswa", "Master Siswa lengkap (NISN, biodata, username, password login mandiri, foto profil, orang tua).");
  addBullet("presensi", "Data kehadiran harian (jam masuk, jam pulang, foto webcam, koordinat GPS, status verifikasi).");
  addBullet("pelanggaran", "Catatan pelanggaran tata tertib, akumulasi poin, foto barang bukti, tindak lanjut, & pelapor.");
  addBullet("home_visit", "Laporan kunjungan rumah (Home Visit) oleh Wali Kelas/BP-BK beserta hasil, tindak lanjut, & foto bukti.");
  addBullet("violation_templates", "Daftar master template jenis-jenis pelanggaran dan bobot poin sanksi.");
  addBullet("user", "Tabel agregasi multi-role untuk sinkronisasi kredensial dan hak akses login.");
  addBullet("activity_logs", "Rekam jejak audit aktivitas pengguna dan waktu aksi.");

  // 7. Troubleshooting
  addHeading1("7. PANDUAN TROUBLESHOOTING UMUM");
  addBullet("Error 404 saat Refresh", "Pastikan modul rewrite aktif ('sudo a2enmod rewrite') dan opsi 'AllowOverride All' aktif.");
  addBullet("Error 502 Bad Gateway", "Aplikasi Node.js mati. Cek status dan log PM2 ('pm2 status', 'pm2 logs presensi-v3').");
  addBullet("Packet Too Large", "Tingkatkan 'max_allowed_packet = 64M' di /etc/mysql/mysql.conf.d/mysqld.cnf.");
  addBullet("Backup Otomatis", "Pasang Cron Job harian: 'mysqldump -u user_presensi -p db_presensi_v3 | gzip > /var/backups/presensi.sql.gz'.");

  // Page Numbers Footer
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Dokumen Panduan Instalasi Sistem Presensi Siswa V3.0 — Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const outputPath = path.join(publicDir, "Panduan_Instalasi_Presensi_Siswa_V3_Apache_VPS.pdf");
  const pdfBytes = doc.output("arraybuffer");
  fs.writeFileSync(outputPath, Buffer.from(pdfBytes));

  console.log("PDF generated successfully at:", outputPath);
}

generateDocumentationPDF().catch((err) => {
  console.error("Failed to generate PDF:", err);
  process.exit(1);
});
