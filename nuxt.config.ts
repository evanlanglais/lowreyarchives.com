// https://v3.nuxtjs.org/api/configuration/nuxt.config
import {vite as vidstack} from "vidstack/plugins";
import { isBrowser } from 'es-toolkit/predicate';

export default defineNuxtConfig({
    ssr: false,
    app: {
        head: {
            meta: [
                { name: "apple-mobile-web-app-capable", content: "yes" },
                { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
                { name: "apple-mobile-web-app-title", content: "Lowrey Archives" },
            ],
            link: [
                { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
                { rel: "manifest", href: "/manifest.webmanifest" },
            ],
        },
    },
    modules: [
        '@nuxt/eslint',
        '@nuxt/image',
        "@nuxt/ui",
        '@vueuse/nuxt',
        "@nuxtjs/supabase",
        "nuxt-multi-cache",
        "@pinia/nuxt",
        "@nuxt/image",
        "@vite-pwa/nuxt",
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
    pwa: {
        registerType: "autoUpdate",
        manifest: {
            name: "Lowrey Archives",
            short_name: "Lowrey",
            description: "Lowrey family media archive",
            lang: "en",
            theme_color: "#1d3557",
            background_color: "#1d3557",
            display: "standalone",
            orientation: "portrait",
            start_url: "/",
            scope: "/",
            icons: [
                { src: "icon-192.png", sizes: "192x192", type: "image/png" },
                { src: "icon-512.png", sizes: "512x512", type: "image/png" },
                { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
                { src: "icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
                { src: "icon-square.svg", sizes: "any", type: "image/svg+xml" },
            ],
        },
        workbox: {
            globPatterns: [
                "offline.html",
                "manifest.webmanifest",
                "favicon.ico",
                "apple-touch-icon.png",
                "icon-*.png",
                "icon-*.svg",
            ],
            navigateFallback: "/offline.html",
            navigateFallbackDenylist: [
                /^\/api\//,
                /^\/__/,
                /^\/confirm/,
                /^\/login/,
                /^\/logout/,
                /^\/auth/,
            ],
            cleanupOutdatedCaches: true,
        },
        client: {
            installPrompt: true,
        },
        devOptions: {
            enabled: false,
            suppressWarnings: true,
            navigateFallback: "/",
            type: "module",
        },
    },
});