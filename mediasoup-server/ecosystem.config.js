module.exports = {
  apps: [
    {
      name: 'mediasoup-server',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '2G',
      env_file: '.env',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/home/media/logs/mediasoup-error.log',
      out_file: '/home/media/logs/mediasoup-out.log',
      merge_logs: true,
      restart_delay: 3000,
      autorestart: true,
    },
  ],
};
