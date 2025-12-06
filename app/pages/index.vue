<template>
  <UPageHero
    headline="Welcome"
    title="The Lowrey Archives"
    description="A simple, safe, and centralized place to upload and view family pictures, videos, and everything else!"
    :links="links"
  />
</template>

<script setup lang="ts">
useHead({
  title: 'Home | Lowrey Archives',
});

const links = ref([
  {
    label: 'View Archive',
    to: '/archive',
    icon: 'i-heroicons-archive-box'
  },
])
</script>