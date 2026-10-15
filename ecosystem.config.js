module.exports = {
  apps: [
    {
      name: 'presensi-sekolah',
      script: './dist/server.cjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
