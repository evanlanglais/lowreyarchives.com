// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
    "rules": {
        "vue/multi-word-component-names": "off",
        "vue/no-multiple-template-root": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "no-console": "off",
        "@typescript-eslint/no-explicit-any": "off",
    },
})