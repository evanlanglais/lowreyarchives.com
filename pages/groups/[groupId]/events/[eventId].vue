<script setup lang="ts">
import { DateTime } from "luxon";
import { MediaType, type MediaWrapper } from "~/types/media";
import MediaViewer from "~/components/MediaViewer.vue";
const route = useRoute();
const groupId = route.params.groupId;
const eventId = route.params.eventId;

const { data: groupInfo } = await useFetch(`/api/groups/${groupId}`, {
  key: `group-${groupId}-info`,
});
const { data: eventInfo } = await useFetch(`/api/events/${eventId}`, {
  key: `event-${eventId}-info`,
});
const { data: eventMedia, pending: mediaPending } = await useFetch(
  `/api/events/${eventId}/media`,
  {
    key: `event-${eventId}-media`,
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
    icon: "i-heroicons-archive-box",
    to: "/archive",
  },
  {
    label: `${groupInfo.value ? groupInfo.value.name : "Loading..."}`,
    icon: "i-heroicons-user-group",
    to: `/groups/${groupId}`,
  },
  {
    label: `${eventInfo.value ? eventInfo.value.title : "Loading..."}`,
    icon: "i-heroicons-calendar",
    to: `/groups/${groupId}/events/${eventId}`,
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
