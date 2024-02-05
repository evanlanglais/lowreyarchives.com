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
  <LayoutPageWrapper>
    <LayoutPageHeader>
      <LayoutPageTitle text="Logout" />
    </LayoutPageHeader>
    <LayoutPageSection>
      <p>Logging you out...</p>
    </LayoutPageSection>
  </LayoutPageWrapper>
</template>
