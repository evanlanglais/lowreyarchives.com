<script setup lang="ts">
import type {EventWrapper} from "#shared/types/event";
import {MediaStatus, type MediaWrapper} from "#shared/types/media";
import {useEventDateString} from "~/composables/event";
import {useEventStore} from "~/stores/event";

const props = defineProps<{
  event: EventWrapper;
}>();

const loading = ref(true);
const eventStore = useEventStore();
const eventMedia = ref(null as Array<MediaWrapper> | null);

const carouselRef = ref();

onMounted(async () => {
  loading.value = true;
  eventMedia.value = await eventStore.getEventMedia(props.event.id);
  loading.value = false;
});

// Limit thumbnails shown in carousel for performance
const MAX_THUMBNAILS = 5;

const eventThumbnails = computed((): Array<string> => {
  if (!eventMedia.value) {
    return [];
  }

  return eventMedia.value
      .filter((media: MediaWrapper) => media.status === MediaStatus.Ready)
      .slice(0, MAX_THUMBNAILS)
      .map((media: MediaWrapper) => media.thumbnailUrl ?? media.url)
      .filter((url): url is string => url != null && url !== "");
});

const hasProcessingMedia = computed((): boolean => {
  if (!eventMedia.value || eventMedia.value.length === 0) return false;
  return eventMedia.value.some(
    (m) => m.status === MediaStatus.Pending || m.status === MediaStatus.Processing,
  );
});

const processingCount = computed((): number => {
  if (!eventMedia.value) return 0;
  return eventMedia.value.filter(
    (m) => m.status === MediaStatus.Pending || m.status === MediaStatus.Processing,
  ).length;
});
</script>

<template>
  <UPageCard
      :title="props.event.title"
      :description="props.event.description"
      reverse>
    <div class="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
      <USkeleton
          v-if="loading"
          class="w-full h-full"
      />
      <template v-else-if="eventThumbnails.length > 0">
        <UCarousel
            ref="carouselRef"
            v-slot="{ item }"
            :autoplay="{ delay: 5000 }"
            loop
            dots
            :items="eventThumbnails"
            class="rounded-lg overflow-hidden h-full"
            :ui="{ item: 'basis-full' }"
        >
          <img :src="item" class="w-full h-full object-cover" draggable="false" />
        </UCarousel>
      </template>
      <div v-else-if="hasProcessingMedia" class="w-full h-full relative">
        <USkeleton class="w-full h-full absolute inset-0" />
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <UIcon name="i-heroicons-arrow-path" class="size-10 text-blue-400 animate-spin" />
          <span class="text-sm font-medium text-gray-300">
            Processing {{ processingCount }} {{ processingCount === 1 ? 'item' : 'items' }}...
          </span>
        </div>
      </div>
      <div v-else class="w-full h-full flex items-center justify-center">
        <UIcon name="i-heroicons-photo" class="size-12 text-gray-400" />
      </div>
    </div>

    <template #footer>
      <div class="flex">
        <div class="flex justify-end">
          <span class="line-clamp-2 font-italic text-sm">{{
              useEventDateString(event)
            }}</span>
        </div>
      </div>
    </template>
  </UPageCard>
</template>

<style scoped></style>
