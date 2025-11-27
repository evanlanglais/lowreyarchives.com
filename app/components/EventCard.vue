<script setup lang="ts">
import type {EventWrapper} from "#shared/types/event";
import type {MediaWrapper} from "#shared/types/media";
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

// const eventMedia = await eventStore.getEventMedia(props.event.id);
const eventThumbnails = computed((): Array<string> => {
  if (!eventMedia.value) {
    return [];
  }

  return eventMedia.value
      .map((media: MediaWrapper) => media.image)
      .filter((image) => image != null);
});
</script>

<template>
  <UPageCard
      :title="props.event.title"
      :description="props.event.description"
      reverse>
    <div class="relative w-full aspect-[4/3] rounded-lg overflow-hidden">
      <USkeleton
          v-if="loading"
          class="w-full h-full"
      />
      <UCarousel
          v-else
          ref="carouselRef"
          v-slot="{ item }"
          :autoplay="{ delay: 5000 }"
          loop
          dots
          :items="eventThumbnails"
          class="rounded-lg overflow-hidden"
          :ui="{ item: 'basis-full' }"
      >
        <NuxtImg :src="item" class="w-full" draggable="false" placeholder/>
      </UCarousel>
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
