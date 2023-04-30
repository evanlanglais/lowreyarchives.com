<template>
  <div>
    <h2>I am index</h2>
    <p>email: {{user.email}}</p>
    <p>first: {{user.data.first}}</p>
    <p>last: {{user.data.last}}</p>
    <pre>{{user}}</pre>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ["auth"]
});

const user = useSupabaseUser();
</script>