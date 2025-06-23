<script setup lang="ts">
import type { GroupWrapper } from "#shared/types/group";
import { useUserStore } from "~/stores/user";

const user = useSupabaseUser();
// const userGroups = ref<GroupWrapper[]>();
// const userStore = useUserStore();

// watch(
//   user,
//   async () => {
//     if (user.value) {
//       userGroups.value = await userStore.getUserGroups(user.value.id);
//     }
//   },
//   { immediate: false },
// );

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
        // children: userGroups.value
        //   ? userGroups.value.map((item) => {
        //       return {
        //         label: item.group_name,
        //         icon: "i-heroicons-user-group",
        //         to: `/groups/${item.id}`,
        //       };
        //     })
        //   : [],
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
      // ...(userGroups.value
      //   ? userGroups.value.map((item) => {
      //       return {
      //         label: item.group_name,
      //         icon: "i-heroicons-user-group",
      //         to: `/groups/${item.id}`,
      //       };
      //     })
      //   : []),
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
  <UHeader>
    <template #title>
      <h2>Lowrey Archives</h2>
    </template>

    <UNavigationMenu :items="links" />

    <template #right>
      <UColorModeButton />

      <UButton v-if="!!user" to="/logout" label="Logout" color="primary" />
    </template>
  </UHeader>
</template>
