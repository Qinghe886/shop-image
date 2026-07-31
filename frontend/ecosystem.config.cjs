module.exports = {
  apps: [
    {
      name: 'shop-image',
      cwd: __dirname,
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
  ],
};
