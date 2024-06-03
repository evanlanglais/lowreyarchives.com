<template>
  <UContainer>
    <UPage>
      <UPageHeader
        headline="Archives"
        title="View the archives"
        description="Sift through all the different uploads from within your family groups"
      />
      <UPageBody>
        <div v-for="group in myGroups" :key="group.id">
          <UDivider size="md" :label="group.group_name" class="mb-2" />
          <UProgress v-if="eventLoading" animation="carousel" />
          <div v-else>
            <UPageGrid
              v-if="
                !!groupEvents &&
                groupEvents.has(group.id) &&
                !!groupEvents.get(group.id) &&
                groupEvents.get(group.id).length > 0
              "
            >
              <NuxtLink
                v-for="event in groupEvents.get(group.id)"
                :key="event.id"
                :to="`/groups/${group.id}/events/${event.id}`"
              >
                <UPageCard>
                  <template #title>
                    <span class="line-clamp-2">{{ event.title }}</span>
                  </template>
                  <template #description>
                    <span class="line-clamp-2">{{ event.description }}</span>
                    <span class="line-clamp-2">{{
                      useEventDateString(event)
                    }}</span>
                  </template>
                </UPageCard>
              </NuxtLink>
            </UPageGrid>
            <span v-else class="line-clamp-2">No Events</span>
          </div>
        </div>

        <UPageCard v-if="myGroups == null">
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
import type { GroupWrapper } from "~/types/group";
import type { EventWrapper } from "~/types/event";
import { useEventDateString } from "~/composable/event";
// import { useCurrentUserGroupsFetch } from "~/composable/user";
const user = useSupabaseUser();
const { data: myGroups } = await useFetch("/api/users/me/groups");

// const { data: myGroups } = await useCurrentUserGroupsFetch();

const { data: groupEvents, pending: eventLoading } = await useAsyncData(
  async () => {
    if (!myGroups.value) {
      return;
    }

    const groupedEvents = new Map<number, EventWrapper[]>();

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
    watch: [myGroups],
  },
);
</script>
