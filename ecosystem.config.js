module.exports = {
  apps: [
    {
      name: 'precificador-saas',
      script: 'server/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      }
    }
  ]
}
