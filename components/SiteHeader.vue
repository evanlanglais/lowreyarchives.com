<script setup lang="ts">
const user = useSupabaseUser();

const { data: userGroups } = await useAsyncData(
  async () => {
    if (!user.value) {
      return [];
    }

    return $fetch(`/api/users/${user.value?.id}/groups`);
  },
  {
    watch: [user],
  },
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
  <UHeader :links="links">
    <template #logo>
      <h2>Lowrey Archives</h2>
    </template>

    <template #right>
      <UColorModeButton />

      <UButton v-if="!!user" to="/logout" label="Logout" color="green" />
    </template>
  </UHeader>
</template>

<style scoped></style>
