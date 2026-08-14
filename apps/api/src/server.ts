import { createApp } from "./app";
import { ensureStorageBucket } from "./lib/upload";
import { startPromotionScheduler } from "./services/promotions";
import { env } from "./lib/env";

const app = createApp();

try {
  await ensureStorageBucket();
} catch (err) {
  console.error("Failed to ensure Supabase Storage bucket exists:", err);
}

startPromotionScheduler();
app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  console.log(`  REST: http://localhost:${env.port}/api`);
});
