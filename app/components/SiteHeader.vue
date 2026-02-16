<script setup lang="ts">
const user = useSupabaseUser();
</script>

<template>
  <UHeader :toggle="false">
    <template #title>
      <NuxtLink to="/archive">
        <h2>Lowrey Archives</h2>
      </NuxtLink>
    </template>

    <template #right>
      <UButton
        v-if="!!user"
        to="/upload"
        icon="i-heroicons-plus"
        color="primary"
      >
        <span class="hidden sm:inline">Add to archive</span>
      </UButton>

      <UColorModeButton />

      <UButton v-if="!!user" to="/logout" icon="i-heroicons-arrow-right-on-rectangle" variant="ghost" color="neutral">
        <span class="hidden sm:inline">Logout</span>
      </UButton>
    </template>
  </UHeader>
</template>
