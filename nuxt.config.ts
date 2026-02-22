// https://v3.nuxtjs.org/api/configuration/nuxt.config
import {vite as vidstack} from "vidstack/plugins";
import { isBrowser } from 'es-toolkit/predicate';

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
            uploadChunkSize: 20 * 1024 * 1024, // 20MB for S3 multipart uploads
        },
        s3Url: "https://garage-media-s3.lowreyarchives.com",
        s3Key: "",
        s3KeySecret: "",
        s3DmzBucket: "fa-dmz",
        s3MediaBucket: "fa-media",
        s3Region: "garage",
        // Cloudflare Stream config (for playing existing cloudflare_video media)
        cloudflareStreamCode: "",
        cloudflareStreamKeyId: "",
        cloudflareStreamKeyJwt: "",
        // Cache purge API token (used by media processor and internal invalidation)
        multiCacheApiToken: "",
    },
    supabase: {
        clientOptions: {
            auth: {
                flowType: 'pkce',
                autoRefreshToken: isBrowser(),
                detectSessionInUrl: isBrowser(),
                persistSession: true,
            }
        },
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
    compatibilityDate: "2025-12-06",
    multiCache: {
        data: {
            enabled: true,
        },
        api: {
            enabled: true,
            prefix: "/__nuxt_multi_cache",
            authorization: process.env.NUXT_MULTI_CACHE_API_TOKEN || false,
            cacheTagInvalidationDelay: 0,
        },
    },
});