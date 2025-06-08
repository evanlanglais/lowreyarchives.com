<script setup lang="ts">
import { MediaType, type MediaWrapper } from "#shared/types/media";

const props = defineProps<{
  media: MediaWrapper;
}>();

const isVideo = computed((): boolean => {
  switch (props.media.type) {
    case MediaType.Video:
    case MediaType.Youtube:
    case MediaType.BucketVideo:
    case MediaType.CloudflareVideo:
      return true;
    case MediaType.Photo:
      return false;
    default:
      return false;
  }
});
</script>

<template>
  <UPageCard :description="media.description ?? ''">
    <ModernPlayer v-if="isVideo" :src="media.url" />
  </UPageCard>
</template>

<style scoped></style>
