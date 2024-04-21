<script setup lang="ts">
import { DateTime } from "luxon";
import type { Tables } from "~/types/supabase";
import type { EventWrapper } from "~/types/event";
import { MediaType, type MediaWrapper } from "~/types/media";
import ModernPlayer from "~/components/ModernPlayer.vue";
const loadingIndicator = useLoadingIndicator();
const route = useRoute();
const eventId = route.params.id;

const event = ref(null as EventWrapper | null);

const fetchEvent = async () => {
  loadingIndicator.start();

  try {
    event.value = await $fetch(`/api/events/${eventId}`);
  } catch (e) {
    console.error(e);
  }

  loadingIndicator.finish();
};

fetchEvent();

const headline = computed(() => {
  if (!event.value) {
    return "";
  }

  const startDate = DateTime.fromISO(event.value.start_date);
  const endDate = DateTime.fromISO(event.value.end_date);

  if (startDate.equals(endDate)) {
    return startDate.toLocaleString(DateTime.DATE_MED);
  }

  return `${startDate.toLocaleString(DateTime.DATE_MED)} - ${endDate.toLocaleString(DateTime.DATE_MED)}`;
});

const videos = computed((): Array<MediaWrapper> => {
  if (!event.value) {
    return [];
  }

  return event.value.media.filter(
    (media) =>
      media.type === MediaType.Video || media.type === MediaType.Youtube,
  );
});

const photos = computed((): Array<MediaWrapper> => {
  if (!event.value) {
    return [];
  }

  return event.value.media.filter((media) => media.type === MediaType.Photo);
});
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader
        :title="!!event ? event.title : ''"
        :description="!!event && !!event.description ? event.description : ''"
        :headline="headline"
      />
      <UPageBody>
        <UDivider size="md">Videos</UDivider>
        <UPageGrid v-if="videos.length > 0">
          <UPageCard
            v-for="video in videos"
            :key="video.id"
            :description="video.description ?? ''"
          >
            <ModernPlayer :src="video.url" />
          </UPageCard>
        </UPageGrid>
        <UDivider size="md">Photos</UDivider>
        <UPageGrid v-if="photos.length > 0">
          <UPageCard
            v-for="photo in photos"
            :key="photo.id"
            :description="photo.description ?? ''"
          >
          </UPageCard>
        </UPageGrid>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<style scoped></style>
