import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  ssr: false,
  devtools: { enabled: false },
  // Pin the dev port so the portal never drifts onto the API's port (3001),
  // which would silently break every data request.
  devServer: { port: 3000 },
  modules: ["@pinia/nuxt", "@vueuse/nuxt"],
  css: ["~/assets/css/main.css"],
  // Transpile the shared workspace packages (they ship raw TS / .vue source)
  build: {
    transpile: ["@repo/ui", "@repo/shared"],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? "http://localhost:3001",
    },
  },
  app: {
    head: {
      title: "School Portal",
      meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
    },
  },
});
