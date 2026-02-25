<script setup lang="ts">
import { DateTime } from "luxon";
import type { MediaWrapper } from "#shared/types/media";
import { useGroupStore } from "~/stores/group";
import { useEventStore } from "~/stores/event";
import MediaTheater from "~/components/MediaTheater.vue";
import { useFlattenParam } from "#shared/utils/utils";
const route = useRoute();
const groupId = useFlattenParam(route.params.groupId);
const eventId = useFlattenParam(route.params.eventId);

const isMediaUploaderOpen = ref(false);
const loading = ref(true);
const groupInfo = ref(null);
const eventInfo = ref(null);
const eventMedia = ref(null);

const groupStore = useGroupStore();
const eventStore = useEventStore();

onMounted(async () => {
  loading.value = true;
  const [groupValue, eventValue, eventMediaResult] = await Promise.all([
    groupStore.getGroup(groupId),
    eventStore.getEvent(eventId),
    eventStore.getEventMedia(eventId, 1, 500),
  ]);

  groupInfo.value = groupValue;
  eventInfo.value = eventValue;
  eventMedia.value = eventMediaResult.items;
  loading.value = false;
});

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
  return eventMedia.value.filter((media) => media.isVideo);
});

const photos = computed((): Array<MediaWrapper> => {
  if (!eventMedia.value) {
    return [];
  }
  return eventMedia.value.filter((media) => !media.isVideo);
});
</script>

<template>
  <UContainer>
    <UPage>
      <UBreadcrumb :items="links" class="mt-2 mb-2" />
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
        <ClientOnly>
          <!--          <UProgress-->
          <!--            v-if="eventMediaStatus == 'pending'"-->
          <!--            animation="carousel"-->
          <!--          />-->
          <div v-if="videos.length > 0">
            <UDivider size="md" class="mb-4">Videos</UDivider>
            <UPageGrid>
              <MediaTheater
                v-for="video in videos"
                :key="video.id"
                :media="video"
              />
            </UPageGrid>
          </div>
          <div v-if="photos.length > 0" class="mb-4">
            <UDivider size="md">Photos</UDivider>
            <UPageGrid>
              <MediaTheater
                v-for="photo in photos"
                :key="photo.id"
                :media="photo"
              />
            </UPageGrid>
          </div>
        </ClientOnly>
      </UPageBody>
    </UPage>
    <UModal v-model="isMediaUploaderOpen">
      <MediaUploader />
    </UModal>
  </UContainer>
</template>

<style scoped></style>
