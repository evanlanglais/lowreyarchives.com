<template>
  <div class="min-h-full flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <h2 class="my-6 text-center text-3xl font-extrabold u-text-white">
      Sign in to your account
    </h2>

    <LoginCard>
      <div>
        <FormKit type="form" @submit="submitLoginRequest" submit-label="Send login request">
          <FormKit
              type="text"
              label="Email"
              name="email"
              prefix-icon="email"
              placeholder="email@domain.com"
              validation="required|email"
              help="Used to identify your account"
              v-model="email"
          />
        </FormKit>

        <nuxt-link to="/register">Register</nuxt-link>
      </div>
    </LoginCard>
  </div>
</template>

<script setup>
const client = useSupabaseAuthClient();
const router = useRouter();

const email = ref("");

const submitLoginRequest = async () => {
  const { error } = await client.auth.signInWithOtp({
    email: email.value,
    options: {
      shouldCreateUser: false
    }
  });

  if (error) {
    return alert('Something went wrong!');
  }

  return router.push('/');
}
</script>