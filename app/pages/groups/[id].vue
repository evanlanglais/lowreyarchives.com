<script setup lang="ts">
import { DateTime } from "luxon";
import { useFlattenParam } from "#shared/utils/utils";
import type { EventWrapper } from "#shared/types/event";
const route = useRoute();
const groupId = useFlattenParam(route.params.id);

const [{ data: groupInfo }, { data: groupEvents, status: groupEventStatus }] =
  await Promise.all([
    useFetch(`/api/groups/${groupId}`),
    useFetch(`/api/groups/${groupId}/events`, {
      transform: (input) =>
        input.sort((a, b) =>
          DateTime.fromISO(a.start_date) < DateTime.fromISO(b.start_date)
            ? -1
            : DateTime.fromISO(a.start_date) > DateTime.fromISO(b.start_date)
              ? 1
              : 0,
        ),
      lazy: true,
      server: false,
    }),
  ]);

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
    label: `${groupInfo.value ? groupInfo.value.group_name : "Loading..."}`,
    icon: "i-heroicons-user-group",
    to: `/groups/${groupId}`,
  },
];
</script>

<template>
  <UContainer>
    <UPage>
      <UBreadcrumb :links="links" class="mt-2 mb-2" />
      <UPageHeader
        :title="!!groupInfo ? groupInfo.group_name : ''"
        :description="
          !!groupInfo && !!groupInfo.group_description
            ? groupInfo.group_description
            : ''
        "
      />
      <UPageBody>
        <ClientOnly>
          <UProgress
            v-if="groupEventStatus == 'pending'"
            animation="carousel"
          />
          <UPageGrid v-if="!!groupEvents && groupEvents.length > 0">
            <NuxtLink
              v-for="event in groupEvents"
              :key="event.id"
              :to="`/groups/${groupId}/events/${event.id}`"
            >
              <EventCard :event="event"></EventCard>
              <!--              <UPageCard>-->
              <!--                <template #title>-->
              <!--                  <span class="line-clamp-2">{{ event.title }}</span>-->
              <!--                </template>-->
              <!--                <template #description>-->
              <!--                  <span class="line-clamp-2">{{ event.description }}</span>-->
              <!--                  <span class="line-clamp-2">{{-->
              <!--                    getEventDateString(event)-->
              <!--                  }}</span>-->
              <!--                </template>-->
              <!--              </UPageCard>-->
            </NuxtLink>
          </UPageGrid>
          <UDivider v-else label="No Events" />
        </ClientOnly>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<style scoped></style>
