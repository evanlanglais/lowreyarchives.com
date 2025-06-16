<script setup lang="ts">
import type { EventWrapper } from "#shared/types/event";
import type { MediaWrapper } from "#shared/types/media";
import { useEventDateString } from "~/composables/event";
import { useEventStore } from "~/stores/event";

const props = defineProps<{
  event: EventWrapper;
}>();

const loading = ref(true);
const eventStore = useEventStore();
const eventMedia = ref(null);

const carouselRef = ref();

onMounted(async () => {
  loading.value = true;

  setInterval(() => {
    if (!carouselRef.value) return;

    if (carouselRef.value.page === carouselRef.value.pages) {
      return carouselRef.value.select(0);
    }

    carouselRef.value.next();
  }, 5000);

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
  <UCard
    :ui="{
      header: {
        padding: '',
      },
    }"
  >
    <template #header>
      <USkeleton v-if="loading" class="w-full" />
      <UCarousel
        v-else
        ref="carouselRef"
        v-slot="{ item }"
        :items="eventThumbnails"
        class="rounded-lg overflow-hidden"
        :ui="{ item: 'basis-full' }"
      >
        <NuxtImg :src="item" class="w-full" draggable="false" placeholder />
      </UCarousel>
    </template>

    <span class="line-clamp-2 font-bold text-lg">{{ props.event.title }}</span>
    <template #footer>
      <div class="flex">
        <div class="flex justify-start">
          <span class="line-clamp-2">{{ props.event.description }}</span>
        </div>
        <div class="flex justify-end">
          <span class="line-clamp-2 font-italic text-sm">{{
            useEventDateString(event)
          }}</span>
        </div>
      </div>
    </template>
  </UCard>
</template>

<style scoped></style>
