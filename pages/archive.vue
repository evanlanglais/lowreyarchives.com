<template>
  <LayoutPageWrapper>
    <LayoutPageHeader>
      <LayoutPageTitle text="Archives" />
    </LayoutPageHeader>
    <div v-if="myGroups !== null">
      <LayoutPageSection  v-for="group in myGroups">
        <LayoutPageSectionTitle :text="`${group.group_name} Events`" />
      </LayoutPageSection>
    </div>
  </LayoutPageWrapper>
</template>

<script setup lang="ts">
import type {Tables} from "~/types/supabase";

definePageMeta({ layout: "default" });

const myGroups = ref(null as Array<Tables<'groups'>> | null);

const fetchGroups = async () => {
  myGroups.value = await $fetch("/api/my-groups")
}

fetchGroups()

</script>
