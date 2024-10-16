<script setup lang="ts">
import { DateTime } from "luxon";
import { MediaType, type MediaWrapper } from "~/types/media";
import MediaViewer from "~/components/MediaViewer.vue";
import { useFlattenParam } from "~/composable/utils";
import { useEventDateString } from "~/composable/event";
const route = useRoute();
const groupId = useFlattenParam(route.params.groupId);
const eventId = useFlattenParam(route.params.eventId);

const isMediaUploaderOpen = ref(false);

const [{ data: groupInfo }, { data: eventInfo }, { data: eventMedia }] =
  await Promise.all([
    useFetch(`/api/groups/${groupId}`),
    useFetch(`/api/events/${eventId}`),
    useFetch(`/api/events/${eventId}/media`),
  ]);

const links = computed(() => [
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
    label: `${groupInfo.value ? groupInfo.value.group_name : "Loading..."}`,
    icon: "i-heroicons-user-group",
    to: `/groups/${groupId}`,
  },
  {
    label: `${eventInfo.value ? eventInfo.value.title : "Loading..."}`,
    icon: "i-heroicons-calendar",
    to: `/groups/${groupId}/events/${eventId}`,
  },
]);

const headline = computed(() => {
  if (!eventInfo.value) {
    return "";
  }

  return useEventDateString(eventInfo.value);
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
        :links="[
          {
            label: 'Upload Media',
            click: () => (isMediaUploaderOpen = true),
            icon: 'i-heroicons-arrow-up-tray',
          },
        ]"
      />
      <UPageBody>
        <div v-if="videos.length > 0">
          <UDivider size="md" class="mb-4">Videos</UDivider>
          <UPageGrid>
            <MediaViewer v-for="video in videos" :key="video.id" :media="video">
            </MediaViewer>
          </UPageGrid>
        </div>
        <div v-if="photos.length > 0" class="mb-4">
          <UDivider size="md">Photos</UDivider>
          <UPageGrid>
            <MediaViewer v-for="photo in photos" :key="photo.id" :media="photo">
            </MediaViewer>
          </UPageGrid>
        </div>
      </UPageBody>
    </UPage>
    <UModal v-model="isMediaUploaderOpen">
      <MediaUploader />
    </UModal>
  </UContainer>
</template>

<style scoped></style>
