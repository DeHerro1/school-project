import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  ssr: false,
  devtools: { enabled: false },
  // Pin the dev port so the portal never drifts onto the API's port (3001).
  devServer: { port: 3002 },
  modules: ["@pinia/nuxt", "@vueuse/nuxt"],
  css: ["~/assets/css/main.css"],
  build: {
    transpile: ["@repo/ui", "@repo/shared"],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? "http://localhost:3001",
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    },
  },
  app: {
    head: {
      title: "Parent Portal",
      meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
    },
  },
});
