<template>
  <UContainer>
    <UPage>
      <UPageHeader
        :title="pageTitle"
        :description="pageDescription"
      />

      <UPageBody>
        <!-- Wizard Steps Indicator -->
        <div class="mb-8">
          <div class="flex items-center justify-between w-full relative">
            <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-800 -z-10" />
            <div
              v-for="(stepItem, index) in steps"
              :key="index"
              class="flex flex-col items-center gap-2 bg-white dark:bg-gray-900 px-2"
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-200"
                :class="[
                  currentStep > index + 1
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : currentStep === index + 1
                    ? 'border-primary-500 text-primary-500'
                    : 'border-gray-300 text-gray-400'
                ]"
              >
                <UIcon
                  v-if="currentStep > index + 1"
                  name="i-heroicons-check"
                  class="w-5 h-5"
                />
                <span v-else>{{ index + 1 }}</span>
              </div>
              <span
                class="text-sm font-medium"
                :class="currentStep === index + 1 ? 'text-primary-500' : 'text-gray-500'"
              >
                {{ stepItem.label }}
              </span>
            </div>
          </div>
        </div>

        <!-- Step 1: Select Event -->
        <div v-show="currentStep === 1" class="space-y-6 max-w-2xl mx-auto">
          <UTabs v-model="eventSelectionMode" :items="eventSelectionTabs" />

          <UCard v-if="eventSelectionMode === 'existing'">
            <template #header>
              <h3 class="font-semibold">Find an Event</h3>
            </template>
            <div class="space-y-4">
              <UInput
                v-model="eventSearchQuery"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search events by title..."
                class="w-full"
                autofocus
              />
              <div class="space-y-2 max-h-60 overflow-y-auto">
                <div
                  v-for="event in events"
                  :key="event.id"
                  class="p-3 rounded-lg border cursor-pointer transition-colors flex justify-between items-center"
                  :class="selectedEvent?.id === event.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20' : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'"
                  @click="selectEvent(event)"
                >
                  <div>
                    <p class="font-medium">{{ event.title }}</p>
                    <p class="text-xs text-gray-500">{{ useEventDateString(event) }}</p>
                  </div>
                  <UIcon
                    v-if="selectedEvent?.id === event.id"
                    name="i-heroicons-check-circle"
                    class="text-primary-500 w-6 h-6"
                  />
                </div>
                
                <div ref="sentinel" class="h-2 w-full" />
                
                <div v-if="loadingEvents" class="text-center py-2">
                   <UIcon name="i-heroicons-arrow-path" class="animate-spin text-gray-400" />
                </div>

                <div v-if="!loadingEvents && events.length === 0" class="text-center text-gray-500 py-4">
                  No events found matching "{{ eventSearchQuery }}"
                </div>
              </div>
            </div>
          </UCard>

          <UCard v-else>
            <template #header>
              <h3 class="font-semibold">Event Details</h3>
            </template>
            <div class="space-y-4">
              <UFormField label="Event Title" required>
                <UInput v-model="newEventData.title" placeholder="e.g. Summer Vacation 2023" class="w-full" />
              </UFormField>
              
              <UFormField label="Description">
                <UTextarea v-model="newEventData.description" placeholder="What happened?" class="w-full" />
              </UFormField>
              
              <UFormField label="Location">
                <UInput v-model="newEventData.location" icon="i-heroicons-map-pin" placeholder="City, Place" />
              </UFormField>
              
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Start Date">
                  <UInput v-model="newEventData.startDate" type="date" class="w-full" />
                </UFormField>
                <UFormField label="End Date">
                  <UInput v-model="newEventData.endDate" type="date" class="w-full" />
                </UFormField>
              </div>

              <UFormField label="Tags">
                <UInput v-model="newEventData.tags" placeholder="Comma separated tags" class="w-full" />
              </UFormField>

              <UDivider label="Sharing Options" />

              <UFormField label="Share with Groups" description="Select groups that can view this event">
                <div v-if="loadingGroups" class="py-2">
                  <UIcon name="i-heroicons-arrow-path" class="animate-spin text-gray-400" />
                  <span class="ml-2 text-gray-500">Loading groups...</span>
                </div>
                <div v-else-if="groupSelectItems.length > 0" class="space-y-2">
                  <div
                    v-for="group in groupSelectItems"
                    :key="group.value"
                    class="flex items-center gap-2"
                  >
                    <UCheckbox
                      :model-value="selectedGroups.includes(group.value)"
                      @update:model-value="(checked: boolean | 'indeterminate') => {
                        if (checked === true) {
                          selectedGroups.push(group.value);
                        } else {
                          selectedGroups = selectedGroups.filter(id => id !== group.value);
                        }
                      }"
                    />
                    <span>{{ group.label }}</span>
                  </div>
                </div>
                <p v-else class="text-gray-500 text-sm">No groups available</p>
              </UFormField>

              <UFormField label="Tag Participants" description="Tag people who were part of this event">
                <UserSelectMenu
                  v-model="taggedUsers"
                  placeholder="Search for participants..."
                  :suggestions="allGroupMembers"
                />
              </UFormField>

              <UFormField label="Share with Specific Users" description="Give access to individual users">
                <UserSelectMenu
                  v-model="sharedWithUsers"
                  placeholder="Search for users to share with..."
                  :suggestions="allGroupMembers"
                />
              </UFormField>
            </div>
          </UCard>
        </div>

        <!-- Steps 2 & 3: Queue & Review (Combined Container) -->
        <div v-show="currentStep >= 2" class="max-w-4xl mx-auto space-y-6">
          <!-- Target Event Card (Shared) -->
          <UCard>
            <template #header>
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-calendar" />
                Target Event
              </h3>
            </template>

            <div v-if="eventSelectionMode === 'existing' && selectedEvent">
              <p class="text-xl font-bold">{{ selectedEvent.title }}</p>
              <p class="text-gray-500">{{ selectedEvent.description }}</p>
              <div class="mt-2 text-sm flex gap-4 text-gray-400">
                <span>{{ useEventDateString(selectedEvent) }}</span>
                <span v-if="selectedEvent.location">{{ selectedEvent.location }}</span>
              </div>
            </div>

            <div v-else-if="eventSelectionMode === 'new'">
              <div class="flex items-center gap-2 mb-2">
                <UBadge color="primary" variant="subtle">New Event</UBadge>
                <p class="text-xl font-bold">{{ newEventData.title }}</p>
              </div>
              <p class="text-gray-500">{{ newEventData.description || 'No description' }}</p>
              <div class="mt-2 text-sm flex flex-col gap-1 text-gray-400">
                <span v-if="newEventData.location">📍 {{ newEventData.location }}</span>
                <span>📅 {{ newEventData.startDate }} <span v-if="newEventData.endDate">- {{ newEventData.endDate }}</span></span>
              </div>
            </div>
          </UCard>

          <!-- Media Uploader (Shared) -->
          <MediaUploader
            ref="uploaderRef"
            manual-trigger
            :event-id="targetEventId"
          />

          <!-- Step 3 Specific: Summary Stats -->
          <UCard v-show="currentStep === 3">
            <template #header>
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-photo" />
                Media Queue
              </h3>
            </template>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-2xl font-bold">{{ queuedFilesDescription }}</p>
                <p class="text-sm text-gray-500">Files to upload</p>
              </div>
              <div class="text-right">
                <p class="text-lg font-mono">{{ formatBytes(queuedTotalSize) }}</p>
                <p class="text-sm text-gray-500">Total size</p>
              </div>
            </div>
            <div class="mt-4">
              <UButton
                variant="link"
                color="neutral"
                label="Edit Queue"
                :padded="false"
                @click="currentStep = 2"
              />
            </div>
          </UCard>
        </div>

        <!-- Navigation Footer -->
        <div class="bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center z-50">
          <UButton
            v-if="currentStep > 1 && !isUploading"
            label="Back"
            variant="ghost"
            icon="i-heroicons-arrow-left"
            @click="handleBack"
          />
          <div v-else/> <!-- Spacer -->

          <div class="flex gap-2">
             <UButton
                v-if="currentStep === 1"
                label="Next: Select Media"
                icon="i-heroicons-arrow-right"
                trailing
                :disabled="!canProceedStep1"
                @click="currentStep = 2"
             />
             <UButton
                v-if="currentStep === 2"
                label="Next: Review"
                icon="i-heroicons-arrow-right"
                trailing
                :disabled="queuedFilesCount === 0"
                @click="currentStep = 3"
             />
             <UButton
                v-if="currentStep === 3"
                :label="isUploading ? 'Uploading...' : 'Confirm & Upload'"
                :icon="isUploading ? 'i-heroicons-arrow-path' : 'i-heroicons-check'"
                :loading="isUploading"
                color="primary"
                @click="handleConfirmUpload"
             />
          </div>
        </div>
        
        <!-- Bottom spacer for the fixed footer -->
        <div class="h-20"/>

      </UPageBody>
    </UPage>
  </UContainer>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MediaUploader from '~/components/MediaUploader.vue';
import type { EventWrapper } from '#shared/types/event';
import type { UserProfile, GroupWithMembers } from '#shared/types/user';
import type { GroupWrapper } from '#shared/types/group';
import { debounce } from "es-toolkit";
import { useUserStore } from "~/stores/user";

const route = useRoute();
const router = useRouter();
const eventIdParam = route.params.eventId as string | undefined;
const eventStore = useEventStore();
const userStore = useUserStore();
const user = useSupabaseUser();

// State
const currentStep = ref(1);
const uploaderRef = ref<InstanceType<typeof MediaUploader> | null>(null);
const isUploading = ref(false);
const targetEventId = ref<number | undefined>(undefined);

// Step 1 State
const eventSelectionMode = ref<'existing' | 'new'>('new');
const eventSearchQuery = ref('');
const selectedEvent = ref<EventWrapper | null>(null);
    
// Event Loading State
const events = ref<EventWrapper[]>([]);
const loadingEvents = ref(false);
const hasMoreEvents = ref(true);
const page = ref(1);
const pageSize = ref(20);
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

// Form Data for New Event
const newEventData = reactive({
  title: '',
  description: '',
  location: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  tags: ''
});

// Sharing State
const userGroups = ref<GroupWrapper[]>([]);
const groupMembers = ref<GroupWithMembers[]>([]);
const selectedGroups = ref<number[]>([]);
const taggedUsers = ref<UserProfile[]>([]);
const sharedWithUsers = ref<UserProfile[]>([]);
const loadingGroups = ref(false);

// Dynamic page header
const totalFiles = computed(() => uploaderRef.value?.mediaUploadStateMap?.size ?? 0);
const completedFiles = computed(() => {
  if (!uploaderRef.value?.mediaUploadStateMap) return 0;
  let count = 0;
  uploaderRef.value.mediaUploadStateMap.forEach((entry) => {
    if (entry.state === 4) count++; // MEDIA_UPLOAD_STATE.COMPLETED
  });
  return count;
});

const eventName = computed(() => {
  if (eventSelectionMode.value === 'existing') {
    return selectedEvent.value?.title ?? null;
  }
  return newEventData.title || null;
});

const pageTitle = computed(() => {
  if (isUploading.value && totalFiles.value > 0) {
    return `Uploading ${completedFiles.value} / ${totalFiles.value}`;
  }
  if (eventName.value) {
    return `Upload to "${eventName.value}"`;
  }
  return "Upload Media";
});

const pageDescription = computed(() => {
  if (isUploading.value && totalFiles.value > 0) {
    return `Uploading media${eventName.value ? ` to "${eventName.value}"` : ''}...`;
  }
  return "Archive photos and videos to a Memory.";
});

useHead({
  title: computed(() => `${pageTitle.value} | Lowrey Archives`),
});

// All unique users from all groups for suggestions
const allGroupMembers = computed(() => {
  const uniqueUsers = new Map<string, UserProfile>();
  for (const group of groupMembers.value) {
    for (const member of group.members) {
      if (!uniqueUsers.has(member.id)) {
        uniqueUsers.set(member.id, member);
      }
    }
  }
  return Array.from(uniqueUsers.values());
});

// Convert groups to select menu items
const groupSelectItems = computed(() => {
  return userGroups.value.map((g) => ({
    label: g.group_name,
    value: g.id,
  }));
});

const eventSelectionTabs = [
  {
    label: 'Create New Event',
    icon: 'i-heroicons-plus-circle',
    value: 'new',
  },
  {
    label: 'Select Existing Event',
    icon: 'i-heroicons-calendar',
    value: 'existing',
  },
]

// Computeds
const steps = [
  { label: 'Select Event' },
  { label: 'Queue Media' },
  { label: 'Review' }
];

const canProceedStep1 = computed(() => {
  if (eventSelectionMode.value === 'existing') {
    return !!selectedEvent.value;
  } else {
    return !!newEventData.title && !!newEventData.startDate;
  }
});

const queuedFilesCount = computed(() => {
  if (!uploaderRef.value?.mediaUploadStateMap) return 0;
  return uploaderRef.value.mediaUploadStateMap.size;
});

const queuedVideosCount = computed(() => {
  if (!uploaderRef.value?.mediaUploadStateMap) return 0;
  let total = 0;
  for (const [_, state] of uploaderRef.value.mediaUploadStateMap) {
    if (state.file.type.startsWith('video/')) total++;
  }
  return total;
});

const queuedImagesCount = computed(() => {
  if (!uploaderRef.value?.mediaUploadStateMap) return 0;
  return queuedFilesCount.value - queuedVideosCount.value;
});

const queuedFilesDescription = computed(() => {
  let returnString = '';
  returnString += `${queuedVideosCount.value} Video${queuedVideosCount.value != 1 ? 's' : ''}, `;
  returnString += `${queuedImagesCount.value} Image${queuedImagesCount.value != 1 ? 's' : ''}`;
  return returnString;
})

const queuedTotalSize = computed(() => {
  if (!uploaderRef.value?.mediaUploadStateMap) return 0;
  let total = 0;
  for (const [_, state] of uploaderRef.value.mediaUploadStateMap) {
    total += state.file.size;
  }
  return total;
});

// Methods
function selectEvent(event: EventWrapper | null) {
  selectedEvent.value = event;
  if (event && currentStep.value === 1) {
    currentStep.value = 2;
  }
}

function handleBack() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

const loadEvents = async () => {
  if (!user.value || loadingEvents.value || !hasMoreEvents.value) return;

  loadingEvents.value = true;
  try {
    const newEvents = await userStore.getUserEvents(
      user.value.sub,
      page.value,
      pageSize.value,
      { search: eventSearchQuery.value }
    );

    if (newEvents.length < pageSize.value) {
      hasMoreEvents.value = false;
    }

    // Avoid duplicates if any
    const existingIds = new Set(events.value.map(e => e.id));
    const uniqueNewEvents = newEvents.filter(e => !existingIds.has(e.id));
        
    events.value.push(...uniqueNewEvents);
    page.value++;
  } catch (e) {
    console.error("Failed to load events", e);
  } finally {
    loadingEvents.value = false;
  }
};

const resetAndLoad = () => {
  events.value = [];
  page.value = 1;
  hasMoreEvents.value = true;
  loadEvents();
};

const debouncedSearch = debounce(() => {
  resetAndLoad();
}, 500);

watch(eventSearchQuery, () => debouncedSearch());

// Update URL and targetEventId when event is selected
watch(selectedEvent, (newEvent) => {
  if (eventSelectionMode.value === 'existing') {
    router.replace({
      params: { ...route.params, eventId: newEvent?.id || 'new' }
    });
    targetEventId.value = newEvent?.id;
  }
});

// Manage Uploader State based on Step
watch(currentStep, (newStep) => {
  if (newStep === 3) {
    // Set to QUEUED (1) to show read-only list
    uploaderRef.value?.setUploaderState(1);
  } else if (newStep === 2) {
    // Set back to INITIAL (0) to allow editing
    uploaderRef.value?.setUploaderState(0);
  }
});

// Watch for sentinel ref changes (e.g. when switching tabs or loading)
watch(sentinel, (el) => {
  if (el) {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreEvents.value && !loadingEvents.value) {
        loadEvents();
      }
    }, { threshold: 0.1 });
    observer.observe(el);
  }
});

async function handleConfirmUpload() {
  isUploading.value = true;

  try {
    // 1. Handle Event Creation/Selection
    if (eventSelectionMode.value === 'new') {
      const newEvent = await $fetch('/api/events/new', {
        method: 'POST',
        body: {
          title: newEventData.title,
          description: newEventData.description || null,
          location: newEventData.location || null,
          startDate: newEventData.startDate,
          endDate: newEventData.endDate || null,
          shareWithGroups: selectedGroups.value,
          taggedUsers: taggedUsers.value.map((u) => u.id),
          shareWithUsers: sharedWithUsers.value.map((u) => u.id),
        },
      });

      targetEventId.value = newEvent.id;
    } else {
      targetEventId.value = selectedEvent.value?.id;
    }

    // 2. Trigger Upload
    if (uploaderRef.value && targetEventId.value) {
      console.log(`Uploading media to event: ${targetEventId.value}`);

      await uploaderRef.value.startBulkUpload();

      // Navigate to the event page after successful upload
      if (uploaderRef.value?.uploaderState === 4) { // COMPLETED
        // Bust client-side cache so fresh data is fetched on navigation
        eventStore.invalidateCache('getEventMedia', targetEventId.value);
        eventStore.invalidateCache('getEvent', targetEventId.value);
        userStore.invalidateCacheAll('getUserEvents');
        // Delay to allow server-side cache invalidation to complete
        await new Promise((resolve) => setTimeout(resolve, 3000));
        router.push(`/archive/events/${targetEventId.value}`);
      }
    }
  } catch (error) {
    console.error('Upload process failed', error);
  } finally {
    isUploading.value = false;
  }
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

onMounted(async () => {
  // Initialize
  if (eventIdParam && eventIdParam !== 'new') {
    const pId = parseInt(eventIdParam);
    if (!isNaN(pId)) {
      const [eventValue] = await Promise.all([eventStore.getEvent(pId)]);
      if (eventValue) {
        selectedEvent.value = eventValue;
        targetEventId.value = eventValue.id;
        currentStep.value = 2;
      }
    }
  }

  if (user.value) {
    await loadEvents();

    // Load user's groups and group members for sharing options
    loadingGroups.value = true;
    try {
      const [groups, membersData] = await Promise.all([
        userStore.getUserGroups(user.value.sub),
        userStore.getGroupMembers(),
      ]);
      userGroups.value = groups;
      groupMembers.value = membersData.groups;
    } catch (e) {
      console.error("Failed to load groups", e);
    } finally {
      loadingGroups.value = false;
    }
  }
});
</script>
