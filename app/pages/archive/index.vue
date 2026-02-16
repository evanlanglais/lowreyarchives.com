<template>
  <UContainer>
    <UPage>
      <UPageBody>
        <div class="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
          <!-- Left: Search -->
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search..."
            class="w-full sm:w-64"
          />

          <!-- Right: Sort + Person filter + Add -->
          <div class="flex items-center gap-2">
            <UButton
              :icon="sortOrder === 'desc' ? 'i-heroicons-bars-arrow-down' : 'i-heroicons-bars-arrow-up'"
              variant="ghost"
              color="neutral"
              @click="toggleSortOrder"
            >
              {{ sortOrder === 'desc' ? 'Newest' : 'Oldest' }}
            </UButton>
            <USelectMenu
              v-model="selectedPersonFilter"
              :items="personFilterOptions"
              placeholder="Everyone"
              icon="i-heroicons-funnel"
              searchable
              clearable
              class="w-44"
              @update:model-value="onPersonFilterChange"
            >
              <template #item="{ item }">
                <div class="flex items-center gap-2">
                  <UAvatar
                    v-if="item.avatarUrl"
                    :src="item.avatarUrl"
                    size="2xs"
                  />
                  <div
                    v-else-if="item.value !== '@me'"
                    class="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px]"
                  >
                    {{ getInitials(item.label) }}
                  </div>
                  <UIcon
                    v-else
                    name="i-heroicons-user"
                    class="text-primary-500"
                  />
                  <span>{{ item.label }}</span>
                </div>
              </template>
            </USelectMenu>
            <UButton
              v-if="selectedPersonFilter"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-x-mark"
              size="xs"
              @click="clearPersonFilter"
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
import type { EventWrapper } from "#shared/types/event";
import type { GroupWithMembers } from "#shared/types/user";
import { debounce } from "es-toolkit";

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
const sortOrder = ref<"asc" | "desc">("asc");

// Person filter state
const selectedPersonFilter = ref<PersonFilterOption | undefined>(undefined);
const groupMembers = ref<GroupWithMembers[]>([]);
const loadingMembers = ref(false);

type PersonFilterOption = {
  label: string;
  value: string;
  avatarUrl?: string | null;
};

const personFilterOptions = computed<PersonFilterOption[]>(() => {
  const options: PersonFilterOption[] = [
    { label: "Events I participated in", value: "@me" },
  ];

  // Add all unique group members
  const addedIds = new Set<string>();
  for (const group of groupMembers.value) {
    for (const member of group.members) {
      if (!addedIds.has(member.id) && member.id !== user.value?.id) {
        addedIds.add(member.id);
        options.push({
          label: member.display_name || member.email || "Unknown",
          value: member.id,
          avatarUrl: member.avatar_url,
        });
      }
    }
  }

  return options;
});

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc";
  resetAndLoad();
}

function onPersonFilterChange() {
  resetAndLoad();
}

function clearPersonFilter() {
  selectedPersonFilter.value = undefined;
  resetAndLoad();
}

const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

// Load initial data
const loadEvents = async () => {
  if (!user.value || loading.value || !hasMore.value) return;

  loading.value = true;
  try {
    const filters: Record<string, any> = {
      search: searchQuery.value,
      sortOrder: sortOrder.value,
    };

    if (selectedPersonFilter.value) {
      filters.taggedUserId = selectedPersonFilter.value.value;
    }

    const newEvents = await userStore.getUserEvents(
        user.value.sub,
        page.value,
        pageSize.value,
        filters
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

// Load group members for filter options
const loadGroupMembers = async () => {
  if (!user.value) return;

  loadingMembers.value = true;
  try {
    const membersData = await userStore.getGroupMembers();
    groupMembers.value = membersData.groups;
  } catch (e) {
    console.error("Failed to load group members", e);
  } finally {
    loadingMembers.value = false;
  }
};

// Setup Intersection Observer for infinite scroll
onMounted(() => {
  if (user.value) {
    loadEvents();
    loadGroupMembers();
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
