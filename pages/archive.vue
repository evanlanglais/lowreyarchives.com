<template>
  <UContainer>
    <UPage>
      <UPageHeader
        headline="Archives"
        title="View the archives"
        description="Sift through all the different uploads from within your family groups"
      />
      <UPageBody>
        <ClientOnly>
          <div v-for="group in userGroups" :key="group.id">
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
                  <EventCard :event="event"></EventCard>
                </NuxtLink>
              </UPageGrid>
              <span v-else class="line-clamp-2">No Events</span>
            </div>
          </div>

          <UPageCard v-if="!userGroups || userGroups.length === 0">
            <template #description>
              <span class="line-clamp-2">You don't belong to any groups!</span>
            </template>
          </UPageCard>
        </ClientOnly>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<script setup lang="ts">
import { DateTime } from "luxon";
import type { GroupWrapper } from "~/types/group";
import type { EventWrapper } from "~/types/event";

const user = useSupabaseUser();
const userGroups = ref<GroupWrapper[]>();
const groupEvents = ref<Map<number, EventWrapper[]>>();
const eventLoading = ref(false);

watch(
  user,
  async () => {
    if (user.value) {
      userGroups.value = await $fetch(`/api/users/${user.value.id}/groups`);
    }
  },
  { immediate: true },
);

watch(userGroups, async () => {
  if (userGroups.value) {
    const groupedEvents = new Map<number, EventWrapper[]>();

    eventLoading.value = true;
    await Promise.all(
      userGroups.value.map(
        async (group) =>
          await $fetch(`/api/groups/${group.id}/events`).then((data) => {
            data.sort((a, b) =>
              DateTime.fromISO(a.start_date) < DateTime.fromISO(b.start_date)
                ? -1
                : DateTime.fromISO(a.start_date) >
                    DateTime.fromISO(b.start_date)
                  ? 1
                  : 0,
            );
            groupedEvents.set(group.id, data);
          }),
      ),
    );
    groupEvents.value = groupedEvents;
    eventLoading.value = false;
  }
});
</script>
