// PM2 process config for the API — tuned for a SHARED, memory-constrained box.
//
// Run from services/api:  pm2 start ecosystem.config.cjs
// deploy.sh uses:         pm2 reload ecosystem.config.cjs --update-env
//
// Notes:
//  - exec_mode 'fork' with instances:1 is deliberate. Cluster mode would run
//    multiple copies, and each copy starts its own in-process BullMQ workers ->
//    duplicate job processing AND N x memory. Keep it a single instance.
//  - node_args caps the V8 heap so a leak/spike can't eat the whole box and
//    OOM-kill the OTHER app sharing this instance.
//  - max_memory_restart is a safety net: PM2 restarts the process if it grows
//    past this. Tune both numbers to the headroom you actually have.
//  - The app reads DATABASE_URL/REDIS_*/secrets from services/api/.env via
//    @nestjs/config; PM2 only sets NODE_ENV here.
module.exports = {
  apps: [
    {
      name: 'api',
      script: 'dist/main.js',
      cwd: __dirname, // services/api — so dist/main.js and .env resolve
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '600M',
      node_args: '--max-old-space-size=512',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
