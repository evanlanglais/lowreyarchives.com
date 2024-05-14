<script setup lang="ts">
import { DateTime } from "luxon";
import type { Tables } from "~/types/supabase";
import type { EventWrapper } from "~/types/event";
import { MediaType, type MediaWrapper } from "~/types/media";
import MediaViewer from "~/components/MediaViewer.vue";
const loadingIndicator = useLoadingIndicator();
const route = useRoute();
const eventId = route.params.id;

const { data: eventInfo } = await useFetch(`/api/events/${eventId}`);
const { data: eventMedia, pending: mediaPending } = await useFetch(
  `/api/events/${eventId}/media`,
  {
    lazy: true,
    server: false,
  },
);

const links = [
  {
    label: "Home",
    icon: "i-heroicons-home",
    to: "/",
  },
  {
    label: "Archive",
    icon: "i-heroicons-square-3-stack-3d",
    to: "/archive",
  },
  {
    label: `${eventInfo.value ? eventInfo.value.title : "Loading..."}`,
    icon: "i-heroicons-link",
    to: `events/${eventId}`,
  },
];

const headline = computed(() => {
  if (!eventInfo.value) {
    return "";
  }

  const startDate = DateTime.fromISO(eventInfo.value.start_date);
  const endDate = DateTime.fromISO(eventInfo.value.end_date);

  if (startDate.equals(endDate)) {
    return startDate.toLocaleString(DateTime.DATE_MED);
  }

  return `${startDate.toLocaleString(DateTime.DATE_MED)} - ${endDate.toLocaleString(DateTime.DATE_MED)}`;
});

const videos = computed((): Array<MediaWrapper> => {
  if (!eventMedia.value) {
    return [];
  }

  return eventMedia.value.filter(
    (media) =>
      media.type === MediaType.Video ||
      media.type === MediaType.Youtube ||
      media.type === MediaType.BucketVideo,
  );
});

const photos = computed((): Array<MediaWrapper> => {
  if (!eventMedia.value) {
    return [];
  }

  return eventMedia.value.filter((media) => media.type === MediaType.Photo);
});
</script>

<template>
  <UContainer>
    <UPage>
      <UBreadcrumb :links="links" class="mt-2 mb-2" />
      <UPageHeader
        :title="!!eventInfo ? eventInfo.title : ''"
        :description="
          !!eventInfo && !!eventInfo.description ? eventInfo.description : ''
        "
        :headline="headline"
      />
      <UPageBody>
        <div v-if="!mediaPending">
          <div v-if="videos.length > 0">
            <UDivider size="md" class="mb-4">Videos</UDivider>
            <UPageGrid>
              <MediaViewer
                v-for="video in videos"
                :key="video.id"
                :media="video"
              >
              </MediaViewer>
            </UPageGrid>
          </div>
          <div v-if="photos.length > 0" class="mb-4">
            <UDivider size="md">Photos</UDivider>
            <UPageGrid>
              <MediaViewer
                v-for="photo in photos"
                :key="photo.id"
                :media="photo"
              >
              </MediaViewer>
            </UPageGrid>
          </div>
        </div>
        <UProgress v-else animation="carousel"></UProgress>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<style scoped></style>
