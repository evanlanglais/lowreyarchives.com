<template>
  <div class="flex items-center md:justify-between justify-center">
    <div class="flex items-center">
      <NuxtLink to="/">Home</NuxtLink>
    </div>
    <div class="flex items-center" v-if="user">
      <NuxtLink to="/archive">Archive</NuxtLink>
    </div>
      <div class="flex items-center" v-if="user">
          <NuxtLink to="/uploader">Uploader</NuxtLink>
      </div>
    <div class="flex items-center" v-if="user">
      <button @click="logout">Logout</button>
    </div>
  </div>
</template>

<script setup>
const user = useSupabaseUser();
const client = useSupabaseAuthClient();

const logout = async () => {
  await client.auth.signOut();
}
</script>