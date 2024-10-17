<script setup lang="ts">
import { generateGUID, runWithConcurrencyLimit } from "~/composable/utils";

enum UPLOADER_STATE {
  INITIAL,
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

const uploaderState = ref<UPLOADER_STATE>(UPLOADER_STATE.INITIAL);
const mediaUploadStateMap = ref<Map<string, MediaUploadState>>(
  new Map<string, MediaUploadState>(),
);

async function uploadMedia(key: string, file: File): Promise<boolean> {
  const chunkSize = 50 * 1024 * 1024; // 50MB
  const fileType = file.type;
  const fileName = file.name;
  const fileSize = file.size;

  let uploadKey: string | null = null;
  let uploadId: string | null = null;

  updateMediaUploadProgress(key, 0);

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
            timeout: 2 * 60 * 1000,
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
    await $fetch("/api/finish-multipart-upload", {
      method: "post",
      body: {
        key: startUploadResponse.key,
        uploadId: startUploadResponse.uploadId,
        parts: uploadedParts,
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

function openFilePicker() {
  document.getElementById("mediaFilePicker")!.click();
}

async function startBulkUpload() {
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
          <p v-if="value.state == MEDIA_UPLOAD_STATE.PENDING">Queued</p>
          <UProgress
            v-if="value.state == MEDIA_UPLOAD_STATE.UPLOADING"
            :value="value.progress"
            indicator
          ></UProgress>
          <p
            v-if="value.state == MEDIA_UPLOAD_STATE.COMPLETED"
            class="text-green-400"
          >
            Complete
          </p>
          <p
            v-if="value.state == MEDIA_UPLOAD_STATE.FAILED"
            class="text-red-400"
          >
            Failed: {{ value.errorText }}
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
