<script setup lang="ts">
import { reactive, ref, computed } from "vue";
import { useRouter } from "vue-router";
import MediaUploader from "~/components/MediaUploader.vue";
import type { UserProfile, GroupWithMembers } from "#shared/types/user";
import type { GroupWrapper } from "#shared/types/group";
import { useUserStore } from "~/stores/user";
import { useEventStore } from "~/stores/event";
import { formatBytes } from "#shared/utils/utils";

const router = useRouter();
const eventStore = useEventStore();
const userStore = useUserStore();
const user = useSupabaseUser();

// Modal state
const modalOpen = ref(false);
const currentStep = ref(1); // 1-3 = wizard, 4 = uploading progress view
const uploaderRef = ref<InstanceType<typeof MediaUploader> | null>(null);
const isUploading = ref(false);
const uploadComplete = ref(false);
const uploadFailed = ref(false);
const targetEventId = ref<number | undefined>(undefined);

// Event form data
const newEventData = reactive({
  title: "",
  description: "",
  location: "",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  tags: "",
});

// Sharing state
const userGroups = ref<GroupWrapper[]>([]);
const groupMembers = ref<GroupWithMembers[]>([]);
const selectedGroups = ref<number[]>([]);
const taggedUsers = ref<UserProfile[]>([]);
const sharedWithUsers = ref<UserProfile[]>([]);
const loadingGroups = ref(false);

// Computed
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

const groupSelectItems = computed(() => {
  return userGroups.value.map((g) => ({
    label: g.group_name,
    value: g.id,
  }));
});

const selectedGroupNames = computed(() => {
  return userGroups.value
    .filter((g) => selectedGroups.value.includes(g.id))
    .map((g) => g.group_name);
});

const queuedFilesCount = computed(() => {
  return uploaderRef.value?.mediaUploadStateMap?.size ?? 0;
});

const canProceedStep2 = computed(() => {
  return !!newEventData.title && !!newEventData.startDate;
});

const totalFiles = computed(() => {
  return uploaderRef.value?.mediaUploadStateMap?.size ?? 0;
});

const completedFiles = computed(() => {
  if (!uploaderRef.value?.mediaUploadStateMap) return 0;
  let count = 0;
  for (const [, entry] of uploaderRef.value.mediaUploadStateMap) {
    if (entry.state === 4) count++; // MEDIA_UPLOAD_STATE.COMPLETED
  }
  return count;
});

const failedFiles = computed(() => {
  if (!uploaderRef.value?.mediaUploadStateMap) return 0;
  let count = 0;
  for (const [, entry] of uploaderRef.value.mediaUploadStateMap) {
    if (entry.state === 3) count++; // MEDIA_UPLOAD_STATE.FAILED
  }
  return count;
});

const overallProgress = computed(() => {
  if (totalFiles.value === 0) return 0;
  return Math.round((completedFiles.value / totalFiles.value) * 100);
});

const steps = [
  { label: "Select Media" },
  { label: "Event Details" },
  { label: "Share" },
];

// Methods
function open() {
  currentStep.value = 1;
  isUploading.value = false;
  uploadComplete.value = false;
  uploadFailed.value = false;
  targetEventId.value = undefined;
  newEventData.title = "";
  newEventData.description = "";
  newEventData.location = "";
  newEventData.startDate = new Date().toISOString().split("T")[0];
  newEventData.endDate = "";
  newEventData.tags = "";
  selectedGroups.value = [];
  taggedUsers.value = [];
  sharedWithUsers.value = [];
  uploaderRef.value?.reset();
  modalOpen.value = true;
  loadGroupsData();
}

async function loadGroupsData() {
  if (!user.value || loadingGroups.value) return;
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

function handleBack() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

function handleNext() {
  if (currentStep.value < 3) {
    currentStep.value++;
  }
}

async function handleConfirmUpload() {
  // Transition to upload progress view immediately
  currentStep.value = 4;
  isUploading.value = true;
  uploadComplete.value = false;
  uploadFailed.value = false;

  try {
    const newEvent = await $fetch("/api/events/new", {
      method: "POST",
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
    await nextTick();

    if (uploaderRef.value && targetEventId.value) {
      await uploaderRef.value.startBulkUpload();

      if (uploaderRef.value.uploaderState === 4) {
        // COMPLETED
        uploadComplete.value = true;
        eventStore.invalidateCacheAll("getEventMedia");
        eventStore.invalidateCache("getEventThumbnails", targetEventId.value);
        eventStore.invalidateCache("getEvent", targetEventId.value);
        userStore.invalidateCacheAll("getUserEvents");
        await new Promise((resolve) => setTimeout(resolve, 3000));
        modalOpen.value = false;
        router.push(`/archive/events/${targetEventId.value}`);
      } else {
        // FAILED
        uploadFailed.value = true;
      }
    }
  } catch (error) {
    console.error("Upload process failed", error);
    uploadFailed.value = true;
  } finally {
    isUploading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    fullscreen
    :dismissible="!isUploading && !uploadComplete"
    :close="!isUploading && !uploadComplete"
    title="Add to Archive"
  >
    <template #default />

    <template #body>
      <div class="max-w-2xl mx-auto space-y-6">
        <!-- ==================== -->
        <!-- WIZARD (Steps 1-3)   -->
        <!-- ==================== -->
        <div v-show="currentStep <= 3" class="space-y-6">
          <!-- Intro text -->
          <p class="text-sm text-(--ui-text-muted)">
            Photos and videos are organized together by event. Select all media
            for a particular event, then describe that event to add it to the
            archive.
          </p>

          <!-- Step indicator -->
          <div class="flex items-center justify-between w-full relative">
            <div
              class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-(--ui-border) -z-10"
            />
            <div
              v-for="(stepItem, index) in steps"
              :key="index"
              class="flex flex-col items-center gap-2 bg-(--ui-bg) px-2"
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-200 text-sm font-medium"
                :class="[
                  currentStep > index + 1
                    ? 'bg-(--ui-primary) border-(--ui-primary) text-white'
                    : currentStep === index + 1
                      ? 'border-(--ui-primary) text-(--ui-primary)'
                      : 'border-(--ui-border) text-(--ui-text-muted)',
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
                :class="
                  currentStep === index + 1
                    ? 'text-(--ui-primary)'
                    : 'text-(--ui-text-muted)'
                "
              >
                {{ stepItem.label }}
              </span>
            </div>
          </div>

          <!-- Step 1: Select Media -->
          <div v-show="currentStep === 1" class="space-y-4">
            <MediaUploader
              ref="uploaderRef"
              manual-trigger
              :event-id="targetEventId"
            />

            <div v-if="queuedFilesCount > 0">
              <UploadQueueSummary :uploader-ref="uploaderRef" />
            </div>
          </div>

          <!-- Step 2: Event Details -->
          <div v-show="currentStep === 2" class="space-y-4">
            <UFormField label="Event Title" required>
              <UInput
                v-model="newEventData.title"
                placeholder="e.g. Summer Vacation 2023"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Description">
              <UTextarea
                v-model="newEventData.description"
                placeholder="What happened?"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Location">
              <UInput
                v-model="newEventData.location"
                icon="i-heroicons-map-pin"
                placeholder="City, Place"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Start Date" required>
                <UInput
                  v-model="newEventData.startDate"
                  type="date"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="End Date">
                <UInput
                  v-model="newEventData.endDate"
                  type="date"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField label="Tags">
              <UInput
                v-model="newEventData.tags"
                placeholder="Comma separated tags"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Step 3: Share -->
          <div v-show="currentStep === 3" class="space-y-4">
            <UFormField
              label="Share with Groups"
              description="Select groups that can view this event"
            >
              <div v-if="loadingGroups" class="py-2">
                <UIcon
                  name="i-heroicons-arrow-path"
                  class="animate-spin text-(--ui-text-muted)"
                />
                <span class="ml-2 text-(--ui-text-muted)">
                  Loading groups...
                </span>
              </div>
              <div
                v-else-if="groupSelectItems.length > 0"
                class="space-y-2"
              >
                <div
                  v-for="group in groupSelectItems"
                  :key="group.value"
                  class="flex items-center gap-2"
                >
                  <UCheckbox
                    :model-value="selectedGroups.includes(group.value)"
                    @update:model-value="
                      (checked: boolean | 'indeterminate') => {
                        if (checked === true) {
                          selectedGroups.push(group.value);
                        } else {
                          selectedGroups = selectedGroups.filter(
                            (id) => id !== group.value,
                          );
                        }
                      }
                    "
                  />
                  <span>{{ group.label }}</span>
                </div>
              </div>
              <p v-else class="text-(--ui-text-muted) text-sm">
                No groups available
              </p>
            </UFormField>

            <UFormField
              label="Tag Participants"
              description="Tag people who were part of this event"
            >
              <UserSelectMenu
                v-model="taggedUsers"
                placeholder="Search for participants..."
                :suggestions="allGroupMembers"
              />
            </UFormField>

            <UFormField
              label="Share with Specific Users"
              description="Give access to individual users"
            >
              <UserSelectMenu
                v-model="sharedWithUsers"
                placeholder="Search for users to share with..."
                :suggestions="allGroupMembers"
              />
            </UFormField>
          </div>
        </div>

        <!-- ============================== -->
        <!-- UPLOAD PROGRESS VIEW (Step 4)  -->
        <!-- ============================== -->
        <div v-show="currentStep === 4" class="space-y-6">
          <!-- Status header -->
          <div class="text-center space-y-3 py-4">
            <div v-if="isUploading && !uploadComplete && !uploadFailed">
              <UIcon
                name="i-heroicons-arrow-up-tray"
                class="w-10 h-10 text-(--ui-primary) mx-auto animate-pulse"
              />
              <h2 class="text-xl font-semibold mt-2">
                Uploading {{ completedFiles }} of {{ totalFiles }} files...
              </h2>
              <p class="text-sm text-(--ui-text-muted)">
                You'll be automatically redirected to the event page when
                finished.
              </p>
            </div>

            <div v-else-if="uploadComplete">
              <UIcon
                name="i-heroicons-check-circle"
                class="w-10 h-10 text-green-500 mx-auto"
              />
              <h2 class="text-xl font-semibold mt-2">
                All uploads complete!
              </h2>
              <p class="text-sm text-(--ui-text-muted)">
                Redirecting to the event page...
              </p>
            </div>

            <div v-else-if="uploadFailed">
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-10 h-10 text-red-500 mx-auto"
              />
              <h2 class="text-xl font-semibold mt-2">
                Some uploads failed
              </h2>
              <p class="text-sm text-(--ui-text-muted)">
                {{ completedFiles }} of {{ totalFiles }} files uploaded
                successfully.
                <span v-if="failedFiles > 0">
                  {{ failedFiles }} failed.
                </span>
              </p>
            </div>

            <!-- Overall progress bar -->
            <UProgress
              :model-value="overallProgress"
              :color="uploadFailed ? 'error' : uploadComplete ? 'success' : 'primary'"
              size="lg"
            />
          </div>

          <!-- Event summary card -->
          <UCard>
            <template #header>
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-calendar" />
                Event Details
              </h3>
            </template>

            <dl class="space-y-2 text-sm">
              <div class="flex gap-2">
                <dt class="font-medium text-(--ui-text-muted) w-24 shrink-0">Title</dt>
                <dd>{{ newEventData.title }}</dd>
              </div>
              <div v-if="newEventData.description" class="flex gap-2">
                <dt class="font-medium text-(--ui-text-muted) w-24 shrink-0">Description</dt>
                <dd>{{ newEventData.description }}</dd>
              </div>
              <div v-if="newEventData.location" class="flex gap-2">
                <dt class="font-medium text-(--ui-text-muted) w-24 shrink-0">Location</dt>
                <dd>{{ newEventData.location }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="font-medium text-(--ui-text-muted) w-24 shrink-0">Date</dt>
                <dd>
                  {{ newEventData.startDate }}
                  <span v-if="newEventData.endDate"> &ndash; {{ newEventData.endDate }}</span>
                </dd>
              </div>
              <div v-if="selectedGroupNames.length > 0" class="flex gap-2">
                <dt class="font-medium text-(--ui-text-muted) w-24 shrink-0">Groups</dt>
                <dd>{{ selectedGroupNames.join(", ") }}</dd>
              </div>
              <div v-if="taggedUsers.length > 0" class="flex gap-2">
                <dt class="font-medium text-(--ui-text-muted) w-24 shrink-0">Tagged</dt>
                <dd>{{ taggedUsers.map((u) => u.display_name || u.email).join(", ") }}</dd>
              </div>
            </dl>
          </UCard>

          <!-- Per-file upload progress -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold flex items-center gap-2">
                  <UIcon name="i-heroicons-photo" />
                  Upload Progress
                </h3>
                <span class="text-sm text-(--ui-text-muted)">
                  {{ completedFiles }} / {{ totalFiles }} complete
                </span>
              </div>
            </template>

            <div class="max-h-80 overflow-y-auto divide-y divide-(--ui-border)">
              <div
                v-for="[key, value] of uploaderRef?.mediaUploadStateMap ?? []"
                :key="key"
                class="py-2.5 flex items-center gap-3"
              >
                <!-- File icon -->
                <UIcon
                  :name="value.file.type.startsWith('video/') ? 'i-heroicons-film' : 'i-heroicons-photo'"
                  class="shrink-0 text-(--ui-text-muted)"
                />

                <!-- File name + size -->
                <div class="flex-1 min-w-0">
                  <p class="truncate text-sm">{{ value.name }}</p>
                  <p class="text-xs text-(--ui-text-muted)">
                    {{ formatBytes(value.file.size) }}
                  </p>
                </div>

                <!-- Status -->
                <div class="w-28 shrink-0 flex items-center justify-end">
                  <!-- Queued -->
                  <span
                    v-if="value.state === 0 || value.state === 1"
                    class="text-xs text-(--ui-text-muted)"
                  >
                    Queued
                  </span>

                  <!-- Uploading -->
                  <UProgress
                    v-else-if="value.state === 2"
                    :model-value="value.progress"
                    size="sm"
                    class="w-full"
                    status
                  />

                  <!-- Failed -->
                  <span
                    v-else-if="value.state === 3"
                    class="text-xs text-red-500 flex items-center gap-1"
                  >
                    <UIcon name="i-heroicons-x-circle" class="w-4 h-4" />
                    Failed
                  </span>

                  <!-- Complete -->
                  <span
                    v-else-if="value.state === 4"
                    class="text-xs text-green-500 flex items-center gap-1"
                  >
                    <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
                    Done
                  </span>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>

    <template #footer>
      <!-- Wizard footer (steps 1-3) -->
      <div v-if="currentStep <= 3" class="flex justify-between items-center w-full">
        <UButton
          v-if="currentStep > 1"
          label="Back"
          variant="ghost"
          icon="i-heroicons-arrow-left"
          @click="handleBack"
        />
        <div v-else />

        <div class="flex gap-2">
          <UButton
            v-if="currentStep === 1"
            label="Next: Event Details"
            icon="i-heroicons-arrow-right"
            trailing
            :disabled="queuedFilesCount === 0"
            @click="handleNext"
          />
          <UButton
            v-if="currentStep === 2"
            label="Next: Sharing"
            icon="i-heroicons-arrow-right"
            trailing
            :disabled="!canProceedStep2"
            @click="handleNext"
          />
          <UButton
            v-if="currentStep === 3"
            label="Confirm & Upload"
            icon="i-heroicons-check"
            color="primary"
            @click="handleConfirmUpload"
          />
        </div>
      </div>

      <!-- Upload progress footer (step 4) -->
      <div v-else-if="currentStep === 4 && uploadFailed && !isUploading" class="flex justify-end w-full">
        <UButton
          label="Close"
          color="neutral"
          @click="modalOpen = false"
        />
      </div>
    </template>
  </UModal>
</template>
