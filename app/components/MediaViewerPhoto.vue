<script setup lang="ts">
import { ref } from "vue";
import { useSwipe } from "@vueuse/core";

const props = defineProps<{
  src: string;
  alt?: string;
  isFirst?: boolean;
  isLast?: boolean;
}>();

const emit = defineEmits<{
  previous: [];
  next: [];
}>();

const containerRef = ref<HTMLElement | null>(null);
const imageRef = ref<HTMLElement | null>(null);

const { transformStyle, isZoomed } = usePinchZoom(imageRef);

const { direction } = useSwipe(containerRef, {
  passive: false,
  onSwipeEnd() {
    if (isZoomed.value) return;
    if (direction.value === "left" && !props.isLast) {
      emit("next");
    } else if (direction.value === "right" && !props.isFirst) {
      emit("previous");
    }
  },
});
</script>

<template>
  <div
    ref="containerRef"
    class="h-full w-full touch-none flex items-center justify-center overflow-hidden"
  >
    <img
      ref="imageRef"
      :src="src"
      :alt="alt"
      class="max-h-full max-w-full object-contain select-none"
      :style="transformStyle"
      draggable="false"
    >
  </div>
</template>
