<script setup lang="ts">
const user = useSupabaseUser();
const redirectInfo = useSupabaseCookieRedirect();

watch(
  user,
  () => {
    if (user.value) {
      // Clear cookie
      const path = redirectInfo.pluck();

      // Redirect to path
      return navigateTo(path || "/");
    }
  },
  { immediate: true },
);
</script>
<template>
  <div>Waiting for login...</div>
</template>
