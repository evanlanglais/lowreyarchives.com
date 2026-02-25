<template>
  <UPageGrid>
    <UPageCard
        v-for="(media, idx) in mediaList"
        :key="media.id"
        :data-media-index="idx"
        :variant="idx === selectedIndex ? 'soft' : 'ghost'"
        class="cursor-pointer relative overflow-hidden aspect-video"
        :ui="{ container: 'p-0 sm:p-0 h-full' }"
        @click="() => select(idx)"
    >
      <!-- Ready media: show actual thumbnail -->
      <template v-if="media.status === MediaStatus.Ready">
        <NuxtImg
            :src="media.thumbnailUrl ?? media.url"
            :alt="media.description ?? undefined"
            loading="lazy"
            class="w-full h-full object-cover"
        />
        <div
            v-if="media.isVideo"
            class="absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
        >
          <UIcon name="i-heroicons-play" class="size-16 text-white/80" />
        </div>
      </template>

      <!-- Non-ready media: show placeholder with status -->
      <template v-else>
        <div class="w-full h-full relative">
          <USkeleton class="w-full h-full absolute inset-0" />
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <UIcon
                :name="media.isVideo ? 'i-heroicons-video-camera' : 'i-heroicons-photo'"
                class="size-12 text-gray-400 dark:text-gray-500 mb-2"
            />
            <div class="flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
              <UIcon
                  v-if="media.status === MediaStatus.Pending"
                  name="i-heroicons-clock"
                  class="size-4 text-yellow-400"
              />
              <UIcon
                  v-if="media.status === MediaStatus.Processing"
                  name="i-heroicons-arrow-path"
                  class="size-4 text-blue-400 animate-spin"
              />
              <UIcon
                  v-if="media.status === MediaStatus.Failed"
                  name="i-heroicons-exclamation-triangle"
                  class="size-4 text-red-400"
              />
              <span class="text-white text-xs font-medium">{{ statusLabel(media.status) }}</span>
            </div>
          </div>
        </div>
      </template>
    </UPageCard>
  </UPageGrid>
</template>

<script setup lang="ts">
import { MediaStatus, type MediaWrapper } from "#shared/types/media";

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

function statusLabel(status: MediaStatus): string {
  switch (status) {
    case MediaStatus.Pending:
      return "Pending";
    case MediaStatus.Processing:
      return "Processing...";
    case MediaStatus.Failed:
      return "Failed";
    default:
      return "";
  }
}
</script>
