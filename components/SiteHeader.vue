<script setup lang="ts">
import type { GroupWrapper } from "~/types/group";

const user = useSupabaseUser();
const userGroups = ref<GroupWrapper[]>();

watch(
  user,
  async () => {
    if (user.value) {
      userGroups.value = await $fetch(`/api/users/${user.value.id}/groups`);
    }
  },
  { immediate: true },
);

const links = computed(() => {
  if (user.value) {
    return [
      {
        label: "Home",
        icon: "i-heroicons-home",
        to: "/",
      },
      {
        label: "Archive",
        icon: "i-heroicons-archive-box",
        to: "/archive",
        children: userGroups.value
          ? userGroups.value.map((item) => {
              return {
                label: item.group_name,
                icon: "i-heroicons-user-group",
                to: `/groups/${item.id}`,
              };
            })
          : [],
      },
      {
        label: "Uploader",
        to: "/uploader",
      },
    ];
  } else {
    return [
      {
        label: "Login",
        icon: "i-fa-sign-in",
        to: "/login",
      },
    ];
  }
});

const asideLinks = computed(() => {
  if (user.value) {
    return [
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
      ...(userGroups.value
        ? userGroups.value.map((item) => {
            return {
              label: item.group_name,
              icon: "i-heroicons-user-group",
              to: `/groups/${item.id}`,
            };
          })
        : []),
    ];
  } else {
    return [
      {
        label: "Login",
        icon: "i-fa-sign-in",
        to: "/login",
      },
    ];
  }
});
</script>

<template>
  <ClientOnly>
    <UHeader :links="links">
      <template #logo>
        <h2>Lowrey Archives</h2>
      </template>

      <template #panel>
        <UAsideLinks :links="asideLinks" />
      </template>

      <template #right>
        <UColorModeButton />

        <UButton v-if="!!user" to="/logout" label="Logout" color="green" />
      </template>
    </UHeader>
  </ClientOnly>
</template>

<style scoped></style>
