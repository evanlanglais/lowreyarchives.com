<template>
  <UContainer>
    <UPage class="flex flex-col h-full">
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
      <UPageBody>
        <!-- MediaTheater pinned at top -->
        <div class="shrink-0" :style="`height: ${theaterHeight}%`">
          <MediaTheater
            :media="currentMedia"
            :is-first="isFirst"
            :is-last="isLast"
            @previous="prevMedia"
            @next="nextMedia"
          />
        </div>

        <!-- Media info bar -->
        <MediaInfoBar :media="currentMedia" />

        <!-- Grid below -->
        <div
          ref="gridWrapper"
          class="flex-1 overflow-auto p-4"
          @scroll.passive="onScroll"
        >
          <MediaGrid
            :media-list="mediaItems"
            :selected-index="currentIndex"
            @select="setMediaByIndex"
          />
          <!-- Sentinel for infinite scroll -->
          <div ref="sentinel" />
        </div>
      </UPageBody>
    </UPage>

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
import { ref, computed, onMounted } from "vue";
import MediaTheater from "~/components/MediaTheater.vue";
import MediaGrid from "~/components/MediaGrid.vue";
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
const isLoading = ref(false);
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

// Input props/data could come from store or fetch
const mediaItems = ref<MediaWrapper[]>(new Array<MediaWrapper>());
const theaterHeight = 40; // percentage

const currentIndex = ref(0);
const currentMedia = computed(
  () => mediaItems.value[currentIndex.value] || null,
);

const isFirst = computed(() => currentIndex.value === 0);
const isLast = computed(
  () => currentIndex.value === mediaItems.value.length - 1,
);

const headline = computed(() => {
  if (!eventInfo.value) {
    return "";
  }

  return useEventDateString(eventInfo.value);
});

function goBack() {
  router.push("/archive");
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

function setMediaByIndex(idx: number) {
  if (idx >= 0 && idx < mediaItems.value.length) {
    currentIndex.value = idx;
  }
}

function prevMedia() {
  if (currentIndex.value > 0) currentIndex.value--;
}
function nextMedia() {
  if (currentIndex.value < mediaItems.value.length - 1) currentIndex.value++;
}

// Keyboard navigation
onKeyStroke("ArrowLeft", (e) => {
  e.preventDefault();
  prevMedia();
});

onKeyStroke("ArrowRight", (e) => {
  e.preventDefault();
  nextMedia();
});

// Infinite scroll logic
const gridWrapper = ref<HTMLElement | null>(null);
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver;

async function loadMore() {
  if (isMediaLoading.value || !hasMore.value) return;
  isMediaLoading.value = true;

  const newItems = await eventStore.getEventMedia(eventId);

  hasMore.value = false;
  observer.disconnect();
  mediaItems.value.push(...newItems);

  isMediaLoading.value = false;
}

async function onScroll() {
  // fallback if not using IntersectionObserver
  if (!gridWrapper.value) return;
  const el = gridWrapper.value;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
    await loadMore();
  }
}

async function onMediaUploaded() {
  // Reload media after upload
  mediaItems.value = [];
  hasMore.value = true;
  isMediaLoading.value = false;

  const newItems = await eventStore.getEventMedia(eventId);
  mediaItems.value = newItems;
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
