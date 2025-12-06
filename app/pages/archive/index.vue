<template>
  <UContainer>
    <UPage>
      <UPageHeader
        headline="Archives"
        title="View the archives"
        description="Sift through memories of years past added by family"
      />
      <UPageBody>
        <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
           <div class="flex items-center gap-2 w-full sm:w-auto">
             <UInput 
                v-model="searchQuery" 
                icon="i-heroicons-magnifying-glass" 
                placeholder="Search..." 
                class="w-full sm:w-64"
             />
             <span class="text-sm text-gray-500 hidden sm:inline">Items per page:</span>
             <USelect
               v-model="pageSize"
               :items="[20, 50, 100]"
               @change="resetAndLoad"
               z-100
             />
           </div>
        </div>

        <div v-if="loading && events.length === 0" class="space-y-4">
           <USkeleton class="h-12 w-full" />
           <USkeleton class="h-64 w-full" />
        </div>
        
        <div v-else-if="events.length > 0">
           <UPageGrid>
             <NuxtLink
               v-for="event in events"
               :key="event.id"
               :to="`/archive/events/${event.id}`"
             >
               <EventCard :event="event" />
             </NuxtLink>
           </UPageGrid>
           
           <!-- Sentinel for infinite scroll or Load More button -->
           <div ref="sentinel" class="h-10 mt-4 flex justify-center items-center">
              <UButton 
                v-if="!loading && hasMore" 
                variant="ghost" 
                @click="loadNextPage"
              >
                Load More
              </UButton>
              <UProgress v-else-if="loading" animation="carousel" class="w-full max-w-xs" />
              <span v-else class="text-gray-500 text-sm">No more events</span>
           </div>
        </div>

        <UPageCard v-else>
           <template #description>
             <span class="line-clamp-2">No events found.</span>
           </template>
        </UPageCard>

      </UPageBody>
    </UPage>
  </UContainer>
</template>

<script setup lang="ts">
import { DateTime } from "luxon";
import type { GroupWrapper } from "#shared/types/group";
import type { EventWrapper } from "#shared/types/event";
import {debounce} from "es-toolkit";

useHead({
  title: 'Archive | Lowrey Archives',
});

const user = useSupabaseUser();
const userStore = useUserStore();
const events = ref<EventWrapper[]>([]);
const loading = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = ref(20);
const searchQuery = ref("");

const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

// Load initial data
const loadEvents = async () => {
  if (!user.value || loading.value || !hasMore.value) return;

  loading.value = true;
  try {
    const newEvents = await userStore.getUserEvents(
        user.value.sub, 
        page.value, 
        pageSize.value,
        { search: searchQuery.value }
    );

    if (newEvents.length < pageSize.value) {
      hasMore.value = false;
    }

    events.value.push(...newEvents);
    page.value++;
  } catch (e) {
    console.error("Failed to load events", e);
  } finally {
    loading.value = false;
  }
};

const resetAndLoad = () => {
  events.value = [];
  page.value = 1;
  hasMore.value = true;
  loadEvents();
};

const loadNextPage = () => {
  loadEvents();
}

// Setup Intersection Observer for infinite scroll
onMounted(() => {
  if (user.value) {
    loadEvents();
  }

  // Optional: Infinite scroll logic if preferred over button
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore.value && !loading.value) {
      loadEvents();
    }
  }, { threshold: 0.1 });

  if (sentinel.value) {
    observer.observe(sentinel.value);
  }
});

// Watch for sentinel ref changes (e.g. if it's conditionally rendered)
watch(sentinel, (el) => {
  if (el && observer) {
    observer.disconnect();
    observer.observe(el);
  }
});

const debouncedSearch = debounce(() => {
  resetAndLoad();
}, 500);

// Watch for search query changes
watch(searchQuery, () => debouncedSearch());

// Re-fetch if user changes (unlikely in this context but good practice)
watch(user, () => {
  if (user.value) {
    resetAndLoad();
  }
});
</script>
