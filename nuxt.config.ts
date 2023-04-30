// https://v3.nuxtjs.org/api/configuration/nuxt.config

export default defineNuxtConfig({
    // runtimeConfig: {
    //     //jwtRSAPublic: '',
    //     //jwtRSAPrivate: '',
    //     //mongoConnectionString: '',
    //     //sendgridKey: '',
    //     // public: {
    //     //
    //     // }
    // },
    // build: {
    //     //transpile: ['jsonwebtoken']
    // },
    modules: [
        '@nuxtjs/tailwindcss',
        '@nuxtjs/supabase',
        '@formkit/nuxt',
    ]
})
