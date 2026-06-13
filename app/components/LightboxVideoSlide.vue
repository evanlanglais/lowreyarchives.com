<script setup lang="ts">
import "vidstack/bundle";
import type { MediaPlayerElement } from "vidstack/elements";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import "vidstack/player/styles/default/theme.css";
import "vidstack/player/styles/default/layouts/audio.css";
import "vidstack/player/styles/default/layouts/video.css";
import "vidstack/player";
import "vidstack/player/layouts";
import "vidstack/player/ui";

const props = defineProps<{
  src: string;
  width?: number;
  height?: number;
}>();

const player = ref<MediaPlayerElement | null>(null);

// The intrinsic aspect ratio drives both Vidstack's layout attribute and the
// element's CSS aspect-ratio so the player chrome hugs the actual video frame.
const measuredAspect = ref<number | null>(null);

const aspectRatio = computed(() => {
  if (measuredAspect.value && measuredAspect.value > 0) return measuredAspect.value;
  if (props.width && props.height && props.width > 0 && props.height > 0) {
    return props.width / props.height;
  }
  return null;
});

const aspectRatioAttr = computed(() =>
  aspectRatio.value ? aspectRatio.value.toFixed(6) : "0",
);

const wrapperStyle = computed(() =>
  aspectRatio.value ? { "--video-aspect": String(aspectRatio.value) } : {},
);

onMounted(() => {
  if (!player.value) return;
  // Update once the real media metadata loads, in case our variant dims were
  // missing or stale (e.g. a sideways-recorded clip with rotation metadata).
  player.value.addEventListener("loaded-metadata", () => {
    const pw = player.value?.state?.mediaWidth;
    const ph = player.value?.state?.mediaHeight;
    if (pw && ph) measuredAspect.value = pw / ph;
  });
});

onBeforeUnmount(() => {
  player.value?.destroy();
});
</script>

<template>
  <div class="lightbox-video-wrapper" :style="wrapperStyle">
    <media-player
      ref="player"
      :src="src"
      :aspect-ratio="aspectRatioAttr"
      plays-inline
    >
      <media-provider />
      <media-video-layout />
    </media-player>
  </div>
</template>

<style scoped>
.lightbox-video-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lightbox-video-wrapper :deep(media-player) {
  /* Size the player to fit-contain inside the wrapper using its aspect ratio.
     width:100% + max-height:100% means: try to be wrapper-wide, but if that
     would overflow height, shrink height-first and let width follow from
     aspect-ratio. Result is a centered, correctly-proportioned player whose
     chrome hugs the visible video. */
  width: 100%;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: var(--video-aspect, 16 / 9);
  background: transparent;
}
.lightbox-video-wrapper :deep(media-provider),
.lightbox-video-wrapper :deep(media-provider video) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
