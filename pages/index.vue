<template>
  <LayoutPageHeader>
    <LayoutPageTitle text=""></LayoutPageTitle>
  </LayoutPageHeader>
  <div>
    <h2>I am index</h2>
    <p>email: {{ user.email }}</p>
    <p>first: {{ user.user_metadata.first }}</p>
    <p>last: {{ user.user_metadata.last }}</p>
    <p>{{ user }}</p>
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser();
definePageMeta({ layout: "default" });
</script>
