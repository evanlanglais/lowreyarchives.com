// https://v3.nuxtjs.org/api/configuration/nuxt.config

export default defineNuxtConfig({
  modules: [
    "@nuxtjs/supabase",
  ],
  runtimeConfig: {
    public: {
      baseUrl: process.env.BASE_URL || "http://localhost:3000",
    },
  },
  app: {
    pageTransition: { name: "page", mode: "out-in" },
  },
  supabase: {
    redirectOptions: {
      login: "/login",
      callback: "/confirm",
      exclude: ["/register"],
    },
  },
  extends: ["@nuxt-awesome/theme"],
});
