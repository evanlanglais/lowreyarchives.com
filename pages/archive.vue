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
          <div
            v-if="
              groupEvents.has(group.id) && groupEvents.get(group.id)?.length > 0
            "
          >
            <UDivider size="md" :label="group.group_name" />
            <UPageGrid>
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
import type { Tables } from "~/types/supabase";
const user = useSupabaseUser();

const myGroups = ref(null as Array<Tables<"groups">> | null);
const groupEvents = ref(new Map<number, Array<Tables<"events">>>());

const fetchGroups = async () => {
  if (!user.value) {
    return;
  }

  const data = await $fetch(`/api/users/${user.value?.id}/groups`);

  myGroups.value = data;

  data.forEach((group) => fetchGroupEvents(group.id));
};

const fetchGroupEvents = async (groupId: number) => {
  try {
    let data = await $fetch(`/api/groups/${groupId}/events`);

    data = data.sort(
      (a, b) =>
        DateTime.fromISO(a.start_date).diff(DateTime.fromISO(b.start_date))
          .minutes,
    );

    groupEvents.value.set(groupId, data);
  } catch (e) {
    console.error(e);
  }
};

function getEventDateString(event: Tables<"events">): string {
  const startDate = DateTime.fromISO(event.start_date);
  const endDate = DateTime.fromISO(event.end_date);

  let returnString = startDate.toLocaleString(DateTime.DATE_MED);

  if (!startDate.equals(endDate)) {
    returnString += ` - ${endDate.toLocaleString(DateTime.DATE_MED)}`;
  }

  return returnString;
}

fetchGroups();
</script>
