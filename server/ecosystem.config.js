module.exports = {
  apps: [
    {
      name: 'codebase-detective-api',
      script: 'server.js',
      cwd: '/home/prahlad/codebase-detective/server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4005,
      },
    },
  ],
};