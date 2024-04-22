// https://v3.nuxtjs.org/api/configuration/nuxt.config
import { vite as vidstack } from "vidstack/plugins";

export default defineNuxtConfig({
  modules: [
    "@nuxtjs/supabase",
    "@nuxtjs/eslint-module",
    "@nuxt/ui",
    "@nuxtjs/fontaine",
    "@nuxtjs/google-fonts",
  ],
  runtimeConfig: {
    public: {
      baseUrl: "http://localhost:3000",
    },
  },
  supabase: {
    redirectOptions: {
      login: "/login",
      callback: "/confirm",
      exclude: ["/register"],
    },
  },
  extends: ["@nuxt/ui-pro"],
  nitro: {
    azure: {
      config: {
        // ...
        platform: {
          apiRuntime: "node:18",
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
});
