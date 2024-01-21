<script setup lang="ts">
definePageMeta({ layout: "default" });
const user = useSupabaseUser();

const client = useSupabaseClient();

watch(
  user,
  async () => {
    if (user.value) {
      await client.auth.signOut();
      return navigateTo("/");
    }
  },
  { immediate: true },
);
</script>

<template>
  <div>Logging you out...</div>
</template>
