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
    </UFooter>
  </UApp>
</template>
