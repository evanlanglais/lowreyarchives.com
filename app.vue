<script setup lang="ts">
const user = useSupabaseUser();

const links = computed(() => {
  if (user.value) {
    return [
      {
        label: "Home",
        icon: "i-heroicons-book-open",
        to: "/",
      },
      {
        label: "Archive",
        icon: "i-simple-icons-stackblitz",
        to: "/archive",
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

  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <UFooter>
    <template #left>
      <p class="text-gray-500 dark:text-gray-400 text-sm">
        Copyright © {{ new Date().getFullYear() }} Evan Langlais
      </p>
    </template>

    <template #right>
      <!--      <UButton-->
      <!--        to="https://x.com/nuxt_js"-->
      <!--        target="_blank"-->
      <!--        icon="i-simple-icons-x"-->
      <!--        color="gray"-->
      <!--        variant="ghost"-->
      <!--      />-->
      <!--      <UButton-->
      <!--        to="https://discord.com/invite/ps2h6QT"-->
      <!--        target="_blank"-->
      <!--        icon="i-simple-icons-discord"-->
      <!--        color="gray"-->
      <!--        variant="ghost"-->
      <!--      />-->
      <!--      <UButton-->
      <!--        to="https://github.com/nuxt/nuxt"-->
      <!--        target="_blank"-->
      <!--        icon="i-simple-icons-github"-->
      <!--        color="gray"-->
      <!--        variant="ghost"-->
      <!--      />-->
    </template>
  </UFooter>
  <UNotifications />
</template>
