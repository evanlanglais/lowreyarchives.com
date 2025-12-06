<template>
  <UPageGrid>
    <UPageCard
        v-for="(media, idx) in mediaList"
        :key="media.id"
        :variant="idx === selectedIndex ? 'soft' : 'ghost'"
        class="cursor-pointer"
        @click="() => select(idx)"
    >
      <NuxtImg :src="media.image" :alt="media.description"/>
      <div
          v-if="isVideo(media)"
          class="absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
      >
        <!-- You can use UIcon if available, or an SVG -->
        <UIcon name="i-heroicons-play" class="size-16"/>
      </div>
    </UPageCard>
  </UPageGrid>
</template>

<script setup lang="ts">
import {MediaType, type MediaWrapper} from "#shared/types/media";

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

function isVideo(media: MediaWrapper) {
  switch (media.type) {
    case MediaType.BucketVideo:
    case MediaType.CloudflareVideo:
    case MediaType.Youtube:
    case MediaType.Video:
      return true;
    case MediaType.Photo:
      return false;
  }
}
</script>
