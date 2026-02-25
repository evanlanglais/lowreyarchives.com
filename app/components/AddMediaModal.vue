<script setup lang="ts">
import MediaUploader from "~/components/MediaUploader.vue";
import { useEventStore } from "~/stores/event";

const props = defineProps<{
  eventId: number;
}>();

const emit = defineEmits<{
  uploaded: [];
}>();

const eventStore = useEventStore();
const modalOpen = ref(false);
const uploaderRef = ref<InstanceType<typeof MediaUploader> | null>(null);
const isUploading = ref(false);
const uploadComplete = ref(false);
const uploadFailed = ref(false);

const hasFiles = computed(() => {
  return (uploaderRef.value?.mediaUploadStateMap?.size ?? 0) > 0;
});

function open() {
  uploadComplete.value = false;
  uploadFailed.value = false;
  isUploading.value = false;
  modalOpen.value = true;
}

async function handleConfirmUpload() {
  if (!uploaderRef.value) return;

  isUploading.value = true;
  uploadFailed.value = false;

  try {
    await uploaderRef.value.startBulkUpload();

    if (uploaderRef.value.uploaderState === 4) {
      // COMPLETED
      uploadComplete.value = true;
      eventStore.invalidateCacheAll("getEventMedia");
      eventStore.invalidateCache("getEventThumbnails", props.eventId);
      eventStore.invalidateCache("getEvent", props.eventId);

      // Brief delay then close and notify parent
      await new Promise((resolve) => setTimeout(resolve, 1500));
      modalOpen.value = false;
      emit("uploaded");
    } else {
      uploadFailed.value = true;
    }
  } catch (error) {
    console.error("Upload failed", error);
    uploadFailed.value = true;
  } finally {
    isUploading.value = false;
  }
}

function handleClose() {
  if (!isUploading.value) {
    modalOpen.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    title="Add Media"
    :dismissible="!isUploading"
    :close="!isUploading"
  >
    <template #default />

    <template #body>
      <MediaUploader
        ref="uploaderRef"
        manual-trigger
        :event-id="eventId"
      />

      <div v-if="hasFiles" class="mt-4">
        <UploadQueueSummary :uploader-ref="uploaderRef" />
      </div>

      <UAlert
        v-if="uploadComplete"
        color="success"
        title="All uploads completed successfully"
        class="mt-4"
      />
      <UAlert
        v-if="uploadFailed"
        color="error"
        title="Some uploads failed"
        class="mt-4"
      />
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          v-if="!isUploading && !uploadComplete"
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="handleClose"
        />
        <UButton
          v-if="hasFiles && !uploadComplete"
          :label="isUploading ? 'Uploading...' : 'Confirm & Upload'"
          :icon="isUploading ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-up-tray'"
          :loading="isUploading"
          :disabled="isUploading"
          color="primary"
          @click="handleConfirmUpload"
        />
        <UButton
          v-if="uploadFailed && !isUploading"
          label="Close"
          color="neutral"
          @click="handleClose"
        />
      </div>
    </template>
  </UModal>
</template>
