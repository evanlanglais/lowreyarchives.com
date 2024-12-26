<script setup lang="ts">
import { MediaType, type MediaWrapper } from "~/types/media";
import { useMediaUrlFetch } from "~/composable/media";

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

const { data: mediaUrl } = await useMediaUrlFetch(props.media);
</script>

<template>
  <UPageCard :description="media.description ?? ''">
    <UProgress v-if="!mediaUrl" animation="carousel" />
    <ModernPlayer v-if="isVideo && !!mediaUrl" :src="mediaUrl" />
  </UPageCard>
</template>

<style scoped></style>
