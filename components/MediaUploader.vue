<script setup lang="ts">
import { generateGUID } from "~/composable/utils";

enum UPLOADER_STATE {
  INITIAL,
  UPLOADING,
  FAILED,
  COMPLETED,
}

enum MEDIA_UPLOAD_STATE {
  INITIAL,
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

const uploaderState = ref<UPLOADER_STATE>(UPLOADER_STATE.INITIAL);
const mediaUploadStateMap = ref<Map<string, MediaUploadState>>(
  new Map<string, MediaUploadState>(),
);

async function uploadMedia(key: string, file: File): Promise<boolean> {
  const chunkSize = 5 * 1024 * 1024; // 5MB
  const fileType = file.type;
  const fileName = file.name;
  const fileSize = file.size;

  console.log(file);

  try {
    const startUploadResponse = await $fetch("/api/start-multipart-upload", {
      method: "post",
      body: {
        fileName,
        fileType,
      },
    });

    const chunks = Math.ceil(fileSize / chunkSize);
    const uploadedParts = [];

    for (let i = 0; i < chunks; i++) {
      const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
      try {
        const response = await $fetch("/api/get-chunk-upload-url", {
          method: "post",
          body: {
            key: startUploadResponse.key,
            fileType,
            uploadId: startUploadResponse.uploadId,
            partNumber: i + 1,
          },
        });

        const uploadResponse = await $fetch.raw(response.presignedUrl, {
          method: "put",
          headers: {
            "Content-Type": fileType,
          },
          body: chunk,
        });

        uploadedParts.push({
          ETag: uploadResponse.headers.get("ETag"),
          PartNumber: i + 1,
        });

        updateMediaUploadProgress(key, (i / chunks) * 100);
      } catch (error) {
        failMediaUpload(key, "Failed to upload chunk");
        break;
      }
    }

    try {
      await $fetch("/api/finish-multipart-upload", {
        method: "post",
        body: {
          key: startUploadResponse.key,
          uploadId: startUploadResponse.uploadId,
          parts: uploadedParts,
        },
      });

      completeMediaUpload(key);
      return true;
    } catch (error) {
      failMediaUpload(key, "Failed to finalize upload");
    }
  } catch (error) {
    failMediaUpload(key, "Failed to start upload");
  }

  return false;
}

function onMediaSelectedForUpload(e: FileList) {
  for (let i = 0; i < e.length; i++) {
    const file: File | null = e.item(i);

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

function openFilePicker() {
  document.getElementById("mediaFilePicker")!.click();
}

async function startBulkUpload() {
  uploaderState.value = UPLOADER_STATE.UPLOADING;
  const promises = [];
  for (const [key, value] of mediaUploadStateMap.value) {
    promises.push(uploadMedia(key, value.file));
  }
  const results = await Promise.all(promises);
  uploaderState.value = results.includes(false)
    ? UPLOADER_STATE.FAILED
    : UPLOADER_STATE.COMPLETED;
}
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <p class="content-center text-lg font-bold">Media Uploader</p>
        <p class="text-sm">Select all files you'd like to upload</p>
      </div>
    </template>

    <div v-if="mediaUploadStateMap.size == 0">
      <p>Select files to queue them for upload</p>
    </div>
    <div v-if="mediaUploadStateMap.size > 0" class="max-h-64 overflow-y-auto">
      <div
        v-for="[key, value] of mediaUploadStateMap"
        :key="key"
        class="py-2 border-b last:border-none flex items-center space-x-4 border-gray-700"
      >
        <span class="text-blue-500">
          <UIcon name="i-heroicons-photo" />
        </span>

        <span class="flex-1">
          {{ value.name }}
        </span>

        <span class="w-1/4 items-center">
          <UButton
            v-if="value.state == MEDIA_UPLOAD_STATE.INITIAL"
            :padded="false"
            color="gray"
            variant="link"
            icon="i-heroicons-x-mark-20-solid"
            @click="removeMediaFromUploadQueue(key)"
          />
          <UProgress
            v-if="value.state == MEDIA_UPLOAD_STATE.UPLOADING"
            :value="value.progress"
            indicator
          ></UProgress>
          <p
            v-if="value.state == MEDIA_UPLOAD_STATE.COMPLETED"
            class="text-green-400"
          >
            Upload Completed
          </p>
          <p
            v-if="value.state == MEDIA_UPLOAD_STATE.FAILED"
            class="text-red-400"
          >
            Upload Failed: {{ value.errorText }}
          </p>
        </span>
      </div>
    </div>

    <template #footer>
      <div
        v-if="
          uploaderState == UPLOADER_STATE.INITIAL ||
          uploaderState == UPLOADER_STATE.COMPLETED ||
          uploaderState == UPLOADER_STATE.FAILED
        "
      >
        <UAlert
          v-if="uploaderState == UPLOADER_STATE.FAILED"
          color="red"
          title="Finished -- Some uploads failed"
          class="mb-2"
        />
        <UAlert
          v-if="uploaderState == UPLOADER_STATE.COMPLETED"
          color="green"
          title="Finished -- All uploads succeeded"
          class="mb-2"
        />
        <UButton @click="openFilePicker">Select Files to Upload</UButton>
        <UButton
          v-if="mediaUploadStateMap.size > 0"
          class="ml-2"
          @click="startBulkUpload"
          >Begin Bulk Upload</UButton
        >
        <input
          id="mediaFilePicker"
          type="file"
          hidden="hidden"
          multiple
          accept="image/*,video/*"
          @change="(e) => onMediaSelectedForUpload(e.target.files)"
        />
      </div>
    </template>
  </UCard>
</template>

<style scoped></style>
