<template>
  <UContainer>
    <!-- Header section (does not scroll) -->
    <div>
      <div class="flex items-center gap-2 mt-2 mb-2">
        <UButton
            icon="i-heroicons-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="goBack"
        >
          Back
        </UButton>
      </div>

      <UPageHeader
          :title="!!eventInfo ? eventInfo.title : ''"
          :description="
          !!eventInfo && !!eventInfo.description ? eventInfo.description : ''
        "
          :headline="headline"
      >
        <template #links>
          <div class="flex items-center gap-2">
            <UPopover v-if="eventDetails" v-model:open="detailsPopoverOpen" :content="{ align: 'end' }">
              <UButton
                  icon="i-heroicons-information-circle"
                  color="neutral"
                  variant="ghost"
                  size="sm"
              />

              <template #content>
                <div class="w-72 p-4 space-y-3">
                  <!-- Tags -->
                  <div>
                    <span class="text-xs font-medium text-(--ui-text-muted) uppercase tracking-wide">Tags</span>
                    <div v-if="eventDetails.tags.length > 0" class="flex flex-wrap gap-1 mt-1">
                      <UBadge
                          v-for="tag in eventDetails.tags"
                          :key="tag"
                          color="neutral"
                          variant="subtle"
                          size="xs"
                      >
                        {{ tag }}
                      </UBadge>
                    </div>
                    <p v-else class="text-sm text-(--ui-text-muted) mt-1">None</p>
                  </div>

                  <!-- In This Event -->
                  <div>
                    <span class="text-xs font-medium text-(--ui-text-muted) uppercase tracking-wide">In this event</span>
                    <div v-if="eventDetails.taggedUsers.length > 0" class="space-y-1 mt-1">
                      <div
                          v-for="u in eventDetails.taggedUsers"
                          :key="u.id"
                          class="flex items-center gap-1.5 text-sm"
                      >
                        <UAvatar
                            v-if="u.avatar_url"
                            :src="u.avatar_url"
                            :alt="getUserDisplayName(u)"
                            size="3xs"
                        />
                        <span>{{ getUserDisplayName(u) }}</span>
                      </div>
                    </div>
                    <p v-else class="text-sm text-(--ui-text-muted) mt-1">None</p>
                  </div>

                  <!-- Shared With -->
                  <div>
                    <span class="text-xs font-medium text-(--ui-text-muted) uppercase tracking-wide">Shared with</span>
                    <div
                        v-if="eventDetails.groups.length > 0 || eventDetails.sharedUsers.length > 0"
                        class="space-y-1 mt-1 text-sm"
                    >
                      <div v-for="g in eventDetails.groups" :key="`g-${g.id}`">
                        {{ g.group_name }}
                      </div>
                      <div
                          v-for="u in eventDetails.sharedUsers"
                          :key="`u-${u.id}`"
                          class="flex items-center gap-1.5"
                      >
                        <UAvatar
                            v-if="u.avatar_url"
                            :src="u.avatar_url"
                            :alt="getUserDisplayName(u)"
                            size="3xs"
                        />
                        <span>{{ getUserDisplayName(u) }}</span>
                      </div>
                    </div>
                    <p v-else class="text-sm text-(--ui-text-muted) mt-1">None</p>
                  </div>

                  <!-- Single Edit button -->
                  <UButton
                      label="Edit Details"
                      icon="i-heroicons-pencil-square"
                      color="neutral"
                      variant="outline"
                      size="sm"
                      block
                      @click="openDetailsModal"
                  />
                </div>
              </template>
            </UPopover>

            <UButton
                label="Add Media"
                icon="i-heroicons-arrow-up-tray"
                color="neutral"
                variant="outline"
                @click="addMediaModalRef?.open()"
            />
          </div>
        </template>
      </UPageHeader>
    </div>

    <div ref="gridWrapper" class="p-2 sm:p-4">
      <MediaGrid
          :media-list="mediaItems"
          :selected-index="lastViewedIndex ?? -1"
          @select="onGridSelect"
      />
      <!-- Sentinel for infinite scroll -->
      <div ref="sentinel" />
    </div>

    <MediaViewer
        v-if="viewerOpen"
        :media-list="mediaItems"
        :start-index="viewerStartIndex"
        @close="onViewerClose"
    />

    <AddMediaModal
        ref="addMediaModalRef"
        :event-id="Number(eventId)"
        @uploaded="onMediaUploaded"
    />

    <EventDetailsModal
        ref="detailsModalRef"
        :event-id="Number(eventId)"
        :current-tags="eventDetails?.tags ?? []"
        :current-groups="eventDetails?.groups ?? []"
        :current-tagged-users="eventDetails?.taggedUsers ?? []"
        :current-shared-users="eventDetails?.sharedUsers ?? []"
        @updated="refreshDetails"
    />
  </UContainer>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from "vue";
import MediaGrid from "~/components/MediaGrid.vue";
import MediaViewer from "~/components/MediaViewer.vue";
import AddMediaModal from "~/components/AddMediaModal.vue";
import EventDetailsModal from "~/components/EventDetailsModal.vue";
import type { MediaWrapper } from "~/types";
import type { EventDetailsResponse } from "#shared/types/event";
import { useEventStore } from "~/stores/event";
import { useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const eventId = useFlattenParam(route.params.id);
const eventInfo = ref(null);
const isMediaLoading = ref(false);
const hasMore = ref(true);
const eventStore = useEventStore();

const addMediaModalRef = ref<InstanceType<typeof AddMediaModal> | null>(null);
const detailsModalRef = ref<InstanceType<typeof EventDetailsModal> | null>(null);
const eventDetails = ref<EventDetailsResponse | null>(null);
const detailsPopoverOpen = ref(false);

useHead({
  title: computed(() => `${(eventInfo.value ? eventInfo.value.title : '')} | Lowrey Archives`),
});

const mediaItems = ref<MediaWrapper[]>(new Array<MediaWrapper>());
const currentPage = ref(0);
const PAGE_SIZE = 50;

// Viewer state
const viewerOpen = ref(false);
const viewerStartIndex = ref(0);
const lastViewedIndex = ref<number | null>(null);

const headline = computed(() => {
  if (!eventInfo.value) {
    return "";
  }

  return useEventDateString(eventInfo.value);
});

function goBack() {
  router.back();
}

async function refreshDetails() {
  eventStore.invalidateCache("getEventDetails", eventId);
  eventDetails.value = await eventStore.getEventDetails(eventId);
}

function openDetailsModal() {
  detailsPopoverOpen.value = false;
  detailsModalRef.value?.open();
}

function getUserDisplayName(user: { display_name: string | null; email: string | null }): string {
  return user.display_name || user.email || "Unknown User";
}

function onGridSelect(idx: number) {
  viewerStartIndex.value = idx;
  viewerOpen.value = true;
}

function onViewerClose(lastIndex: number) {
  viewerOpen.value = false;
  lastViewedIndex.value = lastIndex;
  nextTick(() => scrollToGridItem(lastIndex));
}

function scrollToGridItem(idx: number) {
  if (!gridWrapper.value) return;
  const el = gridWrapper.value.querySelector(`[data-media-index="${idx}"]`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// Infinite scroll logic
const gridWrapper = ref<HTMLElement | null>(null);
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver;

async function loadMore() {
  if (isMediaLoading.value || !hasMore.value) return;
  isMediaLoading.value = true;

  const nextPage = currentPage.value + 1;
  const result = await eventStore.getEventMedia(eventId, nextPage, PAGE_SIZE);

  currentPage.value = nextPage;
  hasMore.value = result.hasMore;
  mediaItems.value.push(...result.items);

  if (!hasMore.value) {
    observer.disconnect();
  }

  isMediaLoading.value = false;
}

async function onMediaUploaded() {
  mediaItems.value = [];
  currentPage.value = 0;
  hasMore.value = true;
  isMediaLoading.value = false;

  eventStore.invalidateCacheAll("getEventMedia");
  eventStore.invalidateCache("getEventThumbnails", eventId);
  await loadMore();
}

onMounted(async () => {
  if (sentinel.value) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach(async (e) => {
        if (e.isIntersecting) await loadMore();
      });
    });
    observer.observe(sentinel.value);
  }

  const [eventValue, detailsValue] = await Promise.all([
    eventStore.getEvent(eventId),
    eventStore.getEventDetails(eventId),
  ]);

  eventInfo.value = eventValue;
  eventDetails.value = detailsValue;
});
</script>
