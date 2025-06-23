<script setup lang="ts">
import "vidstack/bundle";
import type { MediaPlayerElement } from "vidstack/elements";
import { onBeforeUnmount, ref } from "vue";
// Import styles.
import "vidstack/player/styles/default/theme.css";
import "vidstack/player/styles/default/layouts/audio.css";
import "vidstack/player/styles/default/layouts/video.css";
// Register elements.
import "vidstack/player";
import "vidstack/player/layouts";
import "vidstack/player/ui";

const props = defineProps<{
  src: string;
}>();

const player = ref<MediaPlayerElement>(null);

onBeforeUnmount(() => {
  // This call will destroy the player and all child instances.
  player.value.destroy();
});
</script>

<template>
  <media-player ref="player" :src="src" load="play" posterLoad="eager">
    <media-provider></media-provider>
    <media-video-layout></media-video-layout>
  </media-player>
</template>

<style scoped></style>
