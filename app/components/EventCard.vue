<script setup lang="ts">
import type {EventWrapper} from "#shared/types/event";
import type {ThumbnailsResponse} from "#shared/types/media";
import {useEventDateString} from "~/composables/event";
import {useEventStore} from "~/stores/event";

const props = defineProps<{
  event: EventWrapper;
}>();

const loading = ref(true);
const eventStore = useEventStore();
const thumbnailData = ref<ThumbnailsResponse | null>(null);

const carouselRef = ref();

onMounted(async () => {
  loading.value = true;
  thumbnailData.value = await eventStore.getEventThumbnails(props.event.id);
  loading.value = false;
});

const eventThumbnails = computed((): Array<string> => {
  return thumbnailData.value?.thumbnails ?? [];
});

const hasProcessingMedia = computed((): boolean => {
  return thumbnailData.value?.hasProcessing ?? false;
});

const processingCount = computed((): number => {
  return thumbnailData.value?.processingCount ?? 0;
});
</script>

<template>
  <UPageCard
      :title="props.event.title"
      :description="props.event.description"
      :ui="{ container: 'p-0 sm:p-0', wrapper: 'p-4 sm:p-6' }"
      reverse>
    <div class="relative w-full aspect-4/3 overflow-hidden bg-gray-100 dark:bg-gray-800">
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
            class="overflow-hidden h-full"
            :ui="{ viewport: 'h-full', container: 'h-full ms-0 items-stretch', item: 'ps-0 basis-full' }"
        >
          <img :src="item" class="w-full h-full object-cover" draggable="false">
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
