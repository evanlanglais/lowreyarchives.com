<template>
  <LayoutPageWrapper>
    <LayoutPageHeader>
      <LayoutPageTitle text="Home" />
    </LayoutPageHeader>
    <LayoutPageSection>
      <LayoutPageSectionTitle text="Welcome to the Lowrey Archives" />
    </LayoutPageSection>
  </LayoutPageWrapper>
</template>

<script setup lang="ts">
const user = useSupabaseUser();
definePageMeta({ layout: "default" });
</script>
