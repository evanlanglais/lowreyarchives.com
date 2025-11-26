<script setup lang="ts">

const user = useSupabaseUser();
const route = useRoute();

const links = computed(() => {
  if (user.value) {
    const isArchiveActive = route.path.startsWith("/archive");
    const isHomeActive = route.path === "/";

    return [
      {
        label: "Home",
        icon: "i-heroicons-home",
        to: "/",
        active: isHomeActive,
      },
      {
        label: "Archive",
        icon: "i-heroicons-archive-box",
        to: "/archive",
        active: isArchiveActive,
      },
    ];
  } else {
    return [
      {
        label: "Login",
        icon: "i-fa-sign-in",
        to: "/login",
        active: route.path.startsWith("/login"),
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
    <template #body>
      <UNavigationMenu :items="links" orientation="vertical" class="-mx-2.5" />
    </template>
  </UHeader>
</template>
