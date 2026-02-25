<script setup lang="ts">
import { ref, watch } from "vue";
import { useScrollLock, useSwipe, onKeyStroke } from "@vueuse/core";

const props = defineProps<{
  src: string;
  alt?: string;
  isFirst?: boolean;
  isLast?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  previous: [];
  next: [];
}>();

const containerRef = ref<HTMLElement | null>(null);
const imageRef = ref<HTMLElement | null>(null);

const scrollLock = useScrollLock(
  typeof document !== "undefined" ? document.body : null,
);
scrollLock.value = true;

const { transformStyle, isZoomed, reset } = usePinchZoom(imageRef);

const { isSwiping, direction } = useSwipe(containerRef, {
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

// Reset zoom when image source changes (navigating)
watch(
  () => props.src,
  () => reset(),
);

onKeyStroke("Escape", () => emit("close"));

function onClose() {
  scrollLock.value = false;
  emit("close");
}

onBeforeUnmount(() => {
  scrollLock.value = false;
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        @click.self="onClose"
      >
        <!-- Close button: hidden when zoomed -->
        <button
          :class="[
            'absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-opacity duration-200 hover:bg-white/20',
            isZoomed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          ]"
          @click="onClose"
        >
          <UIcon name="i-heroicons-x-mark" class="size-6" />
        </button>

        <!-- Previous arrow: hidden when zoomed -->
        <button
          v-if="!isFirst"
          :class="[
            'absolute left-2 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-opacity duration-200 hover:bg-white/20',
            isZoomed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          ]"
          @click="emit('previous')"
        >
          <UIcon name="i-heroicons-chevron-left" class="size-6" />
        </button>

        <!-- Next arrow: hidden when zoomed -->
        <button
          v-if="!isLast"
          :class="[
            'absolute right-2 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-opacity duration-200 hover:bg-white/20',
            isZoomed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          ]"
          @click="emit('next')"
        >
          <UIcon name="i-heroicons-chevron-right" class="size-6" />
        </button>

        <!-- Image container -->
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
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
