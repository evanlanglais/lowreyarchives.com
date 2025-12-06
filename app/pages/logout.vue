<script setup lang="ts">
useHead({
  title: 'Logout | Lowrey Archives',
});

const user = useSupabaseUser();

const client = useSupabaseClient();

watch(
  user,
  async () => {
    if (user.value) {
      await client.auth.signOut();
    }
    return navigateTo("/");
  },
  { immediate: true },
);
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader title="Logout" description="Logging you out..." />
    </UPage>
  </UContainer>
</template>
