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
    // 1. Generate dist/server.js (ES Module format for package.json "type": "module")
    await esbuild.build({
      entryPoints: ['server.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: 'dist/server.js',
      external: ['fsevents', 'vite'],
      logLevel: 'warning',
      banner: {
        js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
      },
    });

    // 2. Generate dist/server.cjs (CommonJS fallback)
    await esbuild.build({
      entryPoints: ['server.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: 'dist/server.cjs',
      external: ['fsevents', 'vite'],
      logLevel: 'warning',
    });

    // 3. Copy dist/server.js to root server.js for fallback compatibility
    fs.copyFileSync('dist/server.js', 'server.js');

    // 4. Re-sync dist to build directory to ensure deployment systems checking either path get full artifacts
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
