module.exports = {
  apps: [
    {
      name: 'codebase-detective-api',
      script: 'server.js',
      cwd: '/home/prahlad/codebase-detective/server',
      instances: 1,
      autorestart: true,
      watch: false,
      // Uploads are buffered in memory (multer memoryStorage) up to UPLOAD.MAX_ZIP_BYTES
      // (2 GB), so this must sit comfortably above that or PM2 kills/restarts the
      // process mid-upload/analysis on any large file.
      max_memory_restart: '3G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4005,
      },
    },
  ],
};
