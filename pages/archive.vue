<template>
  <UContainer>
    <UPage>
      <UPageHeader
        headline="Archives"
        title="View the archives"
        description="Sift through all the different uploads from within your family groups"
      />
      <UPageBody>
        <UProgress v-if="groupLoading" animation="carousel" />
        <div v-for="group in myGroups" :key="group.id">
          <UDivider size="md" :label="group.group_name" class="mb-2" />
          <UProgress v-if="eventLoading" animation="carousel" />
          <div v-else>
            <UPageGrid
              v-if="
                !!groupEvents &&
                groupEvents.has(group.id) &&
                groupEvents.get(group.id).length > 0
              "
            >
              <NuxtLink
                v-for="event in groupEvents.get(group.id)"
                :key="event.id"
                :to="`/events/${event.id}`"
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
            <span>No Events</span>
          </div>
        </div>

        <UPageCard v-if="!groupLoading && myGroups == null">
          <template #description>
            <span class="line-clamp-2">You don't belong to any groups!</span>
          </template>
        </UPageCard>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<script setup lang="ts">
import { DateTime } from "luxon";
import { useAsyncData } from "#app";
import type { Tables } from "~/types/supabase";
const user = useSupabaseUser();

const { data: myGroups, pending: groupLoading } = await useFetch(
  `/api/users/${user.value?.id}/groups`,
  {
    lazy: true,
    server: false,
  },
);

const { data: groupEvents, pending: eventLoading } = await useAsyncData(
  async () => {
    if (!myGroups.value) {
      return;
    }

    const groupedEvents = new Map<number, Array<Tables<"events">>>();

    await Promise.all(
      myGroups.value.map((group) =>
        $fetch(`/api/groups/${group.id}/events`).then((data) => {
          data.sort((a, b) =>
            DateTime.fromISO(a.start_date) < DateTime.fromISO(b.start_date)
              ? -1
              : DateTime.fromISO(a.start_date) > DateTime.fromISO(b.start_date)
                ? 1
                : 0,
          );
          groupedEvents.set(group.id, data);
        }),
      ),
    );

    return groupedEvents;
  },
  {
    lazy: true,
    server: false,
    watch: [myGroups],
  },
);

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
