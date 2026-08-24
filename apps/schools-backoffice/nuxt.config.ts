import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load the monorepo root .env — server/api/platform-admins/** (below) reads
// the same FIREBASE_PROJECT_ID / GOOGLE_APPLICATION_CREDENTIALS as apps/school
// so both apps can share one Firestore project.
loadEnv({ path: resolve(__dirname, "../../.env") });
loadEnv({ path: resolve(__dirname, ".env"), override: true });

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  ssr: false,
  devtools: { enabled: false },
  // Pin the dev port so the portal never drifts onto the API's port (3001) or
  // the school (3000) / parent (3002) portals' ports.
  devServer: { port: 3003 },
  modules: ["@pinia/nuxt", "@vueuse/nuxt", "@nuxtjs/color-mode"],
  css: ["~/assets/css/main.css"],
  // Transpile the shared workspace packages (they ship raw TS / .vue source)
  build: {
    transpile: ["@repo/ui", "@repo/shared"],
  },
  // Light/dark/system — see apps/school/nuxt.config.ts for the full rationale.
  colorMode: {
    classSuffix: "",
    preference: "system",
    fallback: "light",
  },
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    // Server-only — read by server/utils/firebase.ts. Same Firebase project
    // as apps/school: reviewing signup requests submitted on its public
    // landing page, and now also platform-admin sign-in/management.
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "school-project-dev",
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? "http://localhost:3001",
      // Safe to expose client-side — see apps/school/nuxt.config.ts's same
      // key for why. Reuses that app's NUXT_PUBLIC_FIREBASE_* env vars —
      // one Firebase project, shared across both apps.
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY ?? "demo-key",
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID ?? "school-project-dev",
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID ?? "demo-app-id",
      firebaseAuthEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "",
    },
  },
  app: {
    head: {
      title: "Schools Backoffice",
      meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
    },
  },
});
