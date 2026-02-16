<script setup lang="ts">
const user = useSupabaseUser();
const archiveUploadModalRef = ref<InstanceType<typeof ArchiveUploadModal> | null>(null);
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
        icon="i-heroicons-plus"
        color="primary"
        @click="archiveUploadModalRef?.open()"
      >
        <span class="hidden sm:inline">Add to archive</span>
      </UButton>

      <UColorModeButton />

      <UButton v-if="!!user" to="/logout" icon="i-heroicons-arrow-right-on-rectangle" variant="ghost" color="neutral">
        <span class="hidden sm:inline">Logout</span>
      </UButton>
    </template>
  </UHeader>

  <ArchiveUploadModal ref="archiveUploadModalRef" />
</template>
