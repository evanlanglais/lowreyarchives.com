// https://v3.nuxtjs.org/api/configuration/nuxt.config
import { vite as vidstack } from "vidstack/plugins";

export default defineNuxtConfig({
  modules: [
    "@nuxtjs/supabase",
    "@nuxtjs/eslint-module",
    "@nuxt/ui",
    "@nuxtjs/fontaine",
    "@nuxtjs/google-fonts",
    "nuxt-multi-cache",
  ],
  runtimeConfig: {
    public: {
      baseUrl: "https://lowreyarchives.com",
    },
    minioKey: "",
    minioKeySecret: "",
    minioBucket: "fa-archive",
    cloudflareAccount: "",
    cloudflareKey: "",
    cloudflareStreamCode: "",
  },
  supabase: {
    redirectOptions: {
      login: "/login",
      callback: "/confirm",
      exclude: [],
      cookieRedirect: true,
    },
  },
  extends: ["@nuxt/ui-pro"],
  nitro: {
    azure: {
      config: {
        // ...
        platform: {
          apiRuntime: "node:20",
        },
      },
    },
  },
  ui: {
    icons: ["ph", "simple-icons"],
  },
  colorMode: {
    preference: "dark",
  },
  googleFonts: {
    display: "swap",
    download: true,
    families: {
      "DM+Sans": [400, 500, 600, 700],
    },
  },
  fontMetrics: {
    fonts: ["DM Sans"],
  },
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag.startsWith("media-"),
    },
  },
  vite: {
    plugins: [vidstack()],
  },
  experimental: {
    payloadExtraction: true,
  },
  compatibilityDate: "2024-10-15",
  multiCache: {
    data: {
      enabled: true,
    },
    // Cache Management API.
    api: {
      enabled: true,

      // Use a different prefix for the API endpoints.
      prefix: "/api/nuxt-multi-cache",
    },
    debug: true,
  },
});
