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
  </UContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import MediaTheater from "~/components/MediaTheater.vue";
import MediaGrid from "~/components/MediaGrid.vue";
import AddMediaModal from "~/components/AddMediaModal.vue";
import type { MediaWrapper } from "~/types";
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

  const [eventValue] = await Promise.all([eventStore.getEvent(eventId)]);

  eventInfo.value = eventValue;
});
</script>
