<script setup lang="ts">
useHead({
  title: 'Confirm Login | Lowrey Archives',
});

const user = useSupabaseUser();

watch(
  user,
  () => {
    if (user.value) {
      // Redirect to path
      return navigateTo("/");
    }
  },
  { immediate: true },
);
</script>
<template>
  <div>Waiting for login...</div>
</template>
