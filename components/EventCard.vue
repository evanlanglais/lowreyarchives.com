<script setup lang="ts">
import type { EventWrapper } from "~/types/event";
import { useEventDateString } from "~/composable/event";
import type { MediaWrapper } from "~/types/media";

const props = defineProps<{
  event: EventWrapper;
}>();

const carouselRef = ref();

onMounted(() => {
  setInterval(() => {
    if (!carouselRef.value) return;

    if (carouselRef.value.page === carouselRef.value.pages) {
      return carouselRef.value.select(0);
    }

    carouselRef.value.next();
  }, 5000);
});

const eventMedia = await useFetch(`/api/events/${props.event.id}/media`, {
  lazy: true,
  server: false,
});
const eventThumbnails = computed((): Array<string> => {
  if (!eventMedia.data.value) {
    return [];
  }

  return eventMedia.data.value
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
      <UCarousel
        ref="carouselRef"
        v-slot="{ item }"
        :items="eventThumbnails"
        class="rounded-lg overflow-hidden"
        :ui="{ item: 'basis-full' }"
      >
        <img :src="item" class="w-full" draggable="false" />
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
