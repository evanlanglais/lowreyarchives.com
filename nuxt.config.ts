// https://v3.nuxtjs.org/api/configuration/nuxt.config

export default defineNuxtConfig({
  modules: ["@nuxtjs/supabase", "@nuxtjs/eslint-module"],
  runtimeConfig: {
    public: {
      baseUrl: process.env.BASE_URL || "http://localhost:3000",
    },
  },
  supabase: {
    redirectOptions: {
      login: "/login",
      callback: "/confirm",
      exclude: ["/register"],
    },
  },
  extends: ["@nuxt-awesome/theme"],
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
});
