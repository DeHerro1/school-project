import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load the monorepo root .env first, then an app-local .env if present
// (local wins) — mirrors apps/api/src/lib/env.ts so one .env at the repo
// root is enough for local dev.
loadEnv({ path: resolve(__dirname, "../../.env") });
loadEnv({ path: resolve(__dirname, ".env"), override: true });

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  ssr: false,
  devtools: { enabled: false },
  // Pin the dev port so the portal never drifts onto another app's port.
  devServer: { port: 3000 },
  modules: ["@pinia/nuxt", "@vueuse/nuxt", "@nuxtjs/color-mode"],
  css: ["~/assets/css/main.css"],
  // Transpile the shared workspace packages (they ship raw TS / .vue source)
  build: {
    transpile: ["@repo/ui", "@repo/shared"],
  },
  // Light/dark/system — classSuffix "" writes a plain `dark`/`light` class on
  // <html>, matching @repo/ui's `@custom-variant dark (&:is(.dark *))` (see
  // packages/ui/src/styles/theme.css). @nuxtjs/color-mode injects a tiny
  // blocking inline script so the class is set before first paint (no
  // light-flash on load), then `useColorMode()` (auto-imported) drives it
  // reactively client-side.
  colorMode: {
    classSuffix: "",
    preference: "system",
    fallback: "light",
  },
  vite: {
    plugins: [tailwindcss()],
    // Pre-bundle these so the dev server doesn't re-optimize (and reload) on
    // the first page that happens to import each one — they're pulled in
    // from dozens of components/pages (icons, the shadcn-style UI kit's
    // cn() helper, Firebase Auth, Zod) rather than from one central import.
    optimizeDeps: {
      include: [
        "class-variance-authority",
        "clsx",
        "firebase/app",
        "firebase/auth",
        "lucide-vue-next",
        "reka-ui",
        "tailwind-merge",
        "zod",
      ],
    },
  },
  runtimeConfig: {
    // Server-only — never exposed to the browser. Read by server/utils/firebase.ts.
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "school-project-dev",
    firebaseStorageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ?? "school-project-dev.appspot.com",
    public: {
      // No longer meaningful (there's no separate API server) — kept only
      // because a couple of components fall back to `${apiBase}${path}` for
      // a bare relative file path; every URL server/api/** returns is now
      // absolute (Firebase Storage), so that branch never actually fires.
      apiBase: "",
      // Safe to expose client-side — the Firebase Web API key is not a
      // secret (security is enforced by Firestore/Storage rules + the
      // server API's own auth checks, not by hiding this value).
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY ?? "demo-key",
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID ?? "school-project-dev",
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID ?? "demo-app-id",
      // When set, the client SDK connects to the local emulators instead of
      // real Firebase — mirrors FIREBASE_AUTH_EMULATOR_HOST on the server.
      firebaseAuthEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "",
    },
  },
  app: {
    head: {
      title: "EduCore",
      meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
    },
  },
});
