<script setup lang="ts">
import SiteHeader from "~/components/SiteHeader.vue";
</script>

<template>
  <UApp>
    <SiteHeader />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <UFooter>
      <template #left>
        <p class="text-gray-500 dark:text-gray-400 text-sm">
          Copyright © {{ new Date().getFullYear() }} Evan Langlais
        </p>
      </template>

      <template #right>
        <!--      <UButton-->
        <!--        to="https://x.com/nuxt_js"-->
        <!--        target="_blank"-->
        <!--        icon="i-simple-icons-x"-->
        <!--        color="gray"-->
        <!--        variant="ghost"-->
        <!--      />-->
        <!--      <UButton-->
        <!--        to="https://discord.com/invite/ps2h6QT"-->
        <!--        target="_blank"-->
        <!--        icon="i-simple-icons-discord"-->
        <!--        color="gray"-->
        <!--        variant="ghost"-->
        <!--      />-->
        <!--      <UButton-->
        <!--        to="https://github.com/nuxt/nuxt"-->
        <!--        target="_blank"-->
        <!--        icon="i-simple-icons-github"-->
        <!--        color="gray"-->
        <!--        variant="ghost"-->
        <!--      />-->
      </template>
    </UFooter>
  </UApp>
</template>
