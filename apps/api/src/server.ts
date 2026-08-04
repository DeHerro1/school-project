import { createServer } from "node:http";
import { createApp } from "./app";
import { initSocket } from "./lib/socket";
import { startPromotionScheduler } from "./services/promotions";
import { env } from "./lib/env";

const app = createApp();
const httpServer = createServer(app);
initSocket(httpServer);
startPromotionScheduler();

httpServer.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  console.log(`  REST:   http://localhost:${env.port}/api`);
  console.log(`  Files:  http://localhost:${env.port}/files`);
  console.log(`  Socket: ws://localhost:${env.port}`);
});
