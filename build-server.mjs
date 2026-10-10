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

    // 3. Re-sync dist to build directory to ensure deployment systems checking either path get full artifacts
    const buildDir = path.resolve(process.cwd(), 'build');
    if (fs.existsSync(distDir)) {
      if (fs.existsSync(buildDir)) {
        fs.rmSync(buildDir, { recursive: true, force: true });
      }
      fs.cpSync(distDir, buildDir, { recursive: true });
    }

    console.log('✅ Server backend berhasil dibuat di folder dist/ dan build/:');
    console.log('   - dist/server.cjs & build/server.cjs');
    console.log('   - dist/server.js & build/server.js');
  } catch (error) {
    console.error('❌ Gagal mengompilasi server:', error);
    process.exit(1);
  }
}

buildServer();
