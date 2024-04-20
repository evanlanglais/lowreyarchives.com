<template>
  <UPage>
    <UPageHeader
      headline="Archives"
      title="View the archives"
      description="Sift through all the different uploads from within your family groups"
    />
    <UPageBody>
      <UPageGrid>
        <UPageCard v-for="group in myGroups" :key="group.id" target="_blank">
          <template #title>
            <span class="line-clamp-2">{{ group.group_name }} Events</span>
          </template>
          <template #description>
            <span class="line-clamp-2">{{ group.group_description }}</span>
          </template>
        </UPageCard>
        <UPageCard v-if="myGroups == null">
          <template #description>
            <span class="line-clamp-2">You don't belong to any groups!</span>
          </template>
        </UPageCard>
      </UPageGrid>
    </UPageBody>
  </UPage>
</template>

<script setup lang="ts">
import type { Tables } from "~/types/supabase";

definePageMeta({ layout: "default" });

const myGroups = ref(null as Array<Tables<"groups">> | null);

const fetchGroups = async () => {
  myGroups.value = await $fetch("/api/my-groups");
};

fetchGroups();
</script>
