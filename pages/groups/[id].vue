<script setup lang="ts">
import { DateTime } from "luxon";
import { useAsyncData } from "#app";
import type { Tables } from "~/types/supabase";
const route = useRoute();
const groupId = route.params.id;

const { data: groupInfo, pending: groupInfoLoading } = await useFetch(
  `/api/groups/${groupId}`,
  {
    key: `group-${groupId}-info`,
  },
);

const { data: groupEvents, pending: groupEventsLoading } = await useFetch(
  `/api/groups/${groupId}/events`,
  {
    key: `group-${groupId}-events`,
    lazy: true,
    server: false,
  },
);

const sortedGroupEvents = computed(() => {
  if (!groupEvents.value) {
    return;
  }

  const copy = groupEvents.value;

  return copy.sort((a, b) =>
    DateTime.fromISO(a.start_date) < DateTime.fromISO(b.start_date)
      ? -1
      : DateTime.fromISO(a.start_date) > DateTime.fromISO(b.start_date)
        ? 1
        : 0,
  );
});

const links = [
  {
    label: "Home",
    icon: "i-heroicons-home",
    to: "/",
  },
  {
    label: "Archive",
    icon: "i-heroicons-archive-box",
    to: "/archive",
  },
  {
    label: `${groupInfo.value ? groupInfo.value.name : "Loading..."}`,
    icon: "i-heroicons-user-group",
    to: `/groups/${groupId}`,
  },
];

function getEventDateString(event: Tables<"events">): string {
  const startDate = DateTime.fromISO(event.start_date);
  const endDate = DateTime.fromISO(event.end_date);

  let returnString = startDate.toLocaleString(DateTime.DATE_MED);

  if (!startDate.equals(endDate)) {
    returnString += ` - ${endDate.toLocaleString(DateTime.DATE_MED)}`;
  }

  return returnString;
}
</script>

<template>
  <UContainer>
    <UPage>
      <UBreadcrumb :links="links" class="mt-2 mb-2" />
      <UPageHeader
        :title="!!groupInfo ? groupInfo.name : ''"
        :description="
          !!groupInfo && !!groupInfo.description ? groupInfo.description : ''
        "
      />
      <UPageBody>
        <UProgress v-if="groupEventsLoading" animation="carousel" />
        <div v-else>
          <UPageGrid v-if="!!sortedGroupEvents && sortedGroupEvents.length > 0">
            <NuxtLink
              v-for="event in sortedGroupEvents"
              :key="event.id"
              :to="`/groups/${groupId}/events/${event.id}`"
            >
              <UPageCard>
                <template #title>
                  <span class="line-clamp-2">{{ event.title }}</span>
                </template>
                <template #description>
                  <span class="line-clamp-2">{{ event.description }}</span>
                  <span class="line-clamp-2">{{
                    getEventDateString(event)
                  }}</span>
                </template>
              </UPageCard>
            </NuxtLink>
          </UPageGrid>
          <UDivider v-else label="No Events" />
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<style scoped></style>
