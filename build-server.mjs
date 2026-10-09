import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

async function buildServer() {
  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  console.log('⚡ Mengompilasi backend server.ts...');

  try {
    // 1. Generate dist/server.cjs (CommonJS - rekomendasi PM2 & Node.js)
    await esbuild.build({
      entryPoints: ['server.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: 'dist/server.cjs',
      external: ['fsevents', 'vite'],
      logLevel: 'warning',
    });

    // 2. Juga buat dist/server.js (untuk kompatibilitas bila mencari server.js)
    fs.copyFileSync('dist/server.cjs', 'dist/server.js');

    console.log('✅ Server backend berhasil dibuat di folder dist/:');
    console.log('   - dist/server.cjs (PM2 / Node.js standard)');
    console.log('   - dist/server.js  (File alternatif)');
  } catch (error) {
    console.error('❌ Gagal mengompilasi server:', error);
    process.exit(1);
  }
}

buildServer();
