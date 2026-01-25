<script setup lang="ts">
import { generateGUID, runWithConcurrencyLimit } from "#shared/utils/utils";

enum UPLOADER_STATE {
  INITIAL,
  QUEUED,
  UPLOADING,
  FAILED,
  COMPLETED,
}

enum MEDIA_UPLOAD_STATE {
  INITIAL,
  PENDING,
  UPLOADING,
  FAILED,
  COMPLETED,
}

class MediaUploadState {
  name: string;
  file: File;
  state: MEDIA_UPLOAD_STATE;
  errorText: string;
  progress: number;

  constructor(file: File) {
    this.name = file.name;
    this.file = file;
    this.state = MEDIA_UPLOAD_STATE.INITIAL;
    this.errorText = "";
    this.progress = 0;
  }
}

const props = defineProps<{
  manualTrigger?: boolean;
  eventId?: number;
}>();

const uploaderState = ref<UPLOADER_STATE>(UPLOADER_STATE.INITIAL);
const selectedFiles = ref<File[]>([]);
const mediaUploadStateMap = ref<Map<string, MediaUploadState>>(
    new Map<string, MediaUploadState>(),
);

// Watch for new files and immediately queue them
watch(selectedFiles, (newFiles) => {
  if (newFiles.length > 0) {
    onMediaSelectedForUpload(newFiles);
    // Clear selected files so duplicates can be re-added if desired,
    // and to keep this array as a temporary buffer.
    selectedFiles.value = [];
  }
});

async function uploadMedia(key: string, file: File): Promise<boolean> {
  const runtimeConfig = useRuntimeConfig();
  const chunkSize = runtimeConfig.public.uploadChunkSize;
  const fileType = file.type;
  const fileName = file.name;
  const fileSize = file.size;

  updateMediaUploadProgress(key, 0);

  let uploadKey: string | null = null;
  let uploadId: string | null = null;

  try {
    console.log(`${key} starting multipartupload request`);
    const startUploadResponse = await $fetch("/api/start-multipart-upload", {
      method: "post",
      body: {
        fileName,
        fileType,
      },
    });
    console.log(`${key} got mjultipartuploadrequest`);

    uploadKey = startUploadResponse.key;
    uploadId = startUploadResponse.uploadId;

    const chunks = Math.ceil(fileSize / chunkSize);
    const uploadedParts = [];

    for (let i = 0; i < chunks; i++) {
      const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
      let successful = false;
      for (let j = 0; j < 5; j++) {
        try {
          console.log(
              `${key} starting to get chunk ${i} of ${chunks} upload url`,
          );
          const response = await $fetch("/api/get-chunk-upload-url", {
            method: "post",
            body: {
              key: uploadKey,
              fileType,
              uploadId,
              partNumber: i + 1,
            },
          });

          console.log(`${key} starting put to received chunk ${i}`);
          const uploadResponse = await $fetch.raw(response.presignedUrl, {
            method: "put",
            headers: {
              "Content-Type": fileType,
            },
            body: chunk,
            timeout: 60 * 1000,
          });
          console.log(`${key} finished putting chunk for ${i}`);

          uploadedParts.push({
            ETag: uploadResponse.headers.get("ETag"),
            PartNumber: i + 1,
          });

          updateMediaUploadProgress(key, (i / chunks) * 100);
          successful = true;
          break;
        } catch (error) {
          console.log(`${key} Chunk ${i} failed on attempt ${j}`);
        }
      }

      if (!successful) {
        throw createError(`Unable to upload chunk ${i}`);
      }
    }

    console.log(`${key} finishing`);

    // Determine media type based on file MIME type
    const mediaType = file.type.startsWith("video/") ? "video" : "photo";

    await $fetch("/api/finish-multipart-upload", {
      method: "post",
      body: {
        key: startUploadResponse.key,
        uploadId: startUploadResponse.uploadId,
        parts: uploadedParts,
        eventId: props.eventId,
        mediaType,
      },
    });
    console.log(`${key} finished`);

    completeMediaUpload(key);
    return true;
  } catch (error) {
    failMediaUpload(key, "Failed to upload file");
    console.error(error);
    if (uploadKey != null && uploadId != null) {
      await $fetch("/api/abort-multipart-upload", {
        method: "post",
        body: {
          key: uploadKey,
          uploadId,
        },
      });
    }
  }

  return false;
}

function onMediaSelectedForUpload(e: FileList | File[]) {
  const files = Array.isArray(e) ? e : Array.from(e);
  for (const file of files) {
    if (!file) {
      throw createError("bad file");
    }

    addMediaToUploadQueue(generateGUID(), file);
  }
}

function removeMediaFromUploadQueue(key: string) {
  mediaUploadStateMap.value.delete(key);
}

function addMediaToUploadQueue(key: string, media: File) {
  mediaUploadStateMap.value?.set(key, new MediaUploadState(media));
}

function pendMediaUpload(key: string) {
  const mediaUploadState: MediaUploadState | undefined =
      mediaUploadStateMap.value.get(key);
  if (mediaUploadState === undefined) {
    throw createError("what");
  }

  mediaUploadState.state = MEDIA_UPLOAD_STATE.PENDING;
  mediaUploadStateMap.value.set(key, mediaUploadState);
}

function updateMediaUploadProgress(key: string, progress: number) {
  const mediaUploadState: MediaUploadState | undefined =
      mediaUploadStateMap.value.get(key);
  if (mediaUploadState === undefined) {
    throw createError("what");
  }

  mediaUploadState.state = MEDIA_UPLOAD_STATE.UPLOADING;
  mediaUploadState.progress = progress;
  mediaUploadStateMap.value.set(key, mediaUploadState);
}

function failMediaUpload(key: string, reason: string) {
  const mediaUploadState: MediaUploadState | undefined =
      mediaUploadStateMap.value.get(key);
  if (mediaUploadState === undefined) {
    throw createError("what");
  }

  mediaUploadState.state = MEDIA_UPLOAD_STATE.FAILED;
  mediaUploadState.errorText = reason;
  mediaUploadStateMap.value.set(key, mediaUploadState);
}

function completeMediaUpload(key: string) {
  const mediaUploadState: MediaUploadState | undefined =
      mediaUploadStateMap.value.get(key);
  if (mediaUploadState === undefined) {
    throw createError("what");
  }

  mediaUploadState.state = MEDIA_UPLOAD_STATE.COMPLETED;
  mediaUploadStateMap.value.set(key, mediaUploadState);
}

async function startBulkUpload() {
  // If any files were lingering in selectedFiles (unlikely due to watch), add them
  if (selectedFiles.value.length > 0) {
    onMediaSelectedForUpload(selectedFiles.value);
    selectedFiles.value = [];
  }

  uploaderState.value = UPLOADER_STATE.UPLOADING;

  mediaUploadStateMap.value.forEach((_, key) => pendMediaUpload(key));

  const results = await runWithConcurrencyLimit<boolean>(
    Array.from(mediaUploadStateMap.value).map(
      ([key, value]) =>
        () =>
          uploadMedia(key, value.file),
    ),
    2,
  );

  uploaderState.value = results.includes(false)
    ? UPLOADER_STATE.FAILED
    : UPLOADER_STATE.COMPLETED;
}

function setUploaderState(state: UPLOADER_STATE) {
  uploaderState.value = state;
}

defineExpose({
  startBulkUpload,
  mediaUploadStateMap,
  uploaderState,
  setUploaderState
});
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <p class="content-center text-lg font-bold">Media Uploader</p>
      </div>
    </template>

    <div v-if="mediaUploadStateMap.size == 0">
      <UFileUpload
        v-model="selectedFiles"
        label="Select or drop files to upload"
        description="Select as many photos, videos, and other media files as you'd like."
        icon="i-heroicons-folder-open"
        multiple
        accept="image/*,video/*"
        class="w-full"
        variant="area"
        layout="list"
        position="inside"
      />
    </div>

    <div v-if="mediaUploadStateMap.size > 0">
      <div v-if="uploaderState == UPLOADER_STATE.INITIAL" class="mb-4">
         <UFileUpload
             v-model="selectedFiles"
             label="Add more files"
             icon="i-heroicons-plus"
             multiple
             accept="image/*,video/*"
             class="w-full"
         />
      </div>

      <div class="max-h-64 overflow-y-auto">
        <div
            v-for="[key, value] of mediaUploadStateMap"
            :key="key"
            class="py-2 border-b last:border-none flex items-center space-x-4 border-gray-700"
        >
          <span class="text-blue-500">
            <UIcon name="i-heroicons-photo"/>
          </span>

          <span class="flex-1 truncate">
            {{ value.name }}
          </span>

          <span class="w-1/4 flex items-center justify-end">
            <UButton
                v-if="uploaderState == UPLOADER_STATE.INITIAL"
                :padded="false"
                color="neutral"
                variant="link"
                icon="i-heroicons-x-mark-20-solid"
                @click="removeMediaFromUploadQueue(key)"
            />
            <p v-if="value.state == MEDIA_UPLOAD_STATE.PENDING" class="text-sm text-gray-500">Queued</p>
            <UProgress
                v-if="value.state == MEDIA_UPLOAD_STATE.UPLOADING"
                v-model="value.progress"
                status
            />
            <p
                v-if="value.state == MEDIA_UPLOAD_STATE.COMPLETED"
                class="text-green-400 text-sm"
            >
              Complete
            </p>
            <p
                v-if="value.state == MEDIA_UPLOAD_STATE.FAILED"
                class="text-red-400 text-sm"
            >
              Failed
            </p>
          </span>
        </div>
      </div>
    </div>

    <template v-if="!manualTrigger" #footer>
      <div
          v-if="
          uploaderState == UPLOADER_STATE.INITIAL ||
          uploaderState == UPLOADER_STATE.COMPLETED ||
          uploaderState == UPLOADER_STATE.FAILED
        "
          class="flex flex-col gap-4"
      >
        <UAlert
            v-if="uploaderState == UPLOADER_STATE.FAILED"
            color="error"
            title="Finished -- Some uploads failed"
        />
        <UAlert
            v-if="uploaderState == UPLOADER_STATE.COMPLETED"
            color="success"
            title="Finished -- All uploads succeeded"
        />

        <UButton
            v-if="mediaUploadStateMap.size > 0"
            block
            label="Begin Upload"
            @click="startBulkUpload"
        />
      </div>
    </template>
  </UCard>
</template>
