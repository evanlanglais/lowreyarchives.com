// https://v3.nuxtjs.org/api/configuration/nuxt.config
import {vite as vidstack} from "vidstack/plugins";

export default defineNuxtConfig({
    ssr: false,
    modules: [
        '@nuxt/eslint',
        '@nuxt/image',
        "@nuxt/ui",
        '@vueuse/nuxt',
        "@nuxtjs/supabase",
        "nuxt-multi-cache",
        "@pinia/nuxt",
        "@nuxt/image",
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
        cloudflareStreamKeyId: "",
        cloudflareStreamKeyJwt: "",
    },
    supabase: {
        redirectOptions: {
            login: "/login",
            callback: "/confirm",
            exclude: [],
            saveRedirectToCookie: false,
        },
        types: "#shared/types/database.types.ts",
    },
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
    css: ["~/assets/css/main.css"],
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
    },
});