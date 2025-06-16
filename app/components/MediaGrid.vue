<template>
  <UPageGrid>
    <UPageCard
      v-for="(media, idx) in mediaList"
      :key="media.id"
      :variant="idx === selectedIndex ? 'solid' : 'soft'"
      class="cursor-pointer"
      :icon="getMediaIcon(media)"
      @click="() => select(idx)"
    >
      <NuxtImg :src="media.image" :alt="media.description" />
    </UPageCard>
  </UPageGrid>
</template>

<script setup lang="ts">
import { defineEmits, defineProps } from "vue";
import { MediaType, type MediaWrapper } from "#shared/types/media";

const props = defineProps<{
  mediaList: MediaWrapper[];
  selectedIndex: number;
}>();
const emit = defineEmits<{
  (e: "select", idx: number): void;
}>();

function select(idx: number) {
  emit("select", idx);
}

function getMediaIcon(media: MediaWrapper) {
  switch (media.type) {
    case MediaType.BucketVideo:
    case MediaType.CloudflareVideo:
    case MediaType.Youtube:
    case MediaType.Video:
      return "i-heroicons-video-camera";
    case MediaType.Photo:
      return "i-heroicons-photo";
  }
}
</script>
