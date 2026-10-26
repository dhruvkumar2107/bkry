import http from 'http';

import app from './app.js';
import { env } from './config/env.js';
import { initSocket } from './lib/socket.js';
import prisma from './lib/prisma.js';

const server = http.createServer(app);
initSocket(server);

server.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`\n  Chotulal Sweets API running on http://localhost:${env.port}`);
  // eslint-disable-next-line no-console
  console.log(`  Environment: ${env.nodeEnv} | Storage: ${env.storageDriver} | OTP dev mode: ${env.otpDevMode}\n`);
});

const shutdown = async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
