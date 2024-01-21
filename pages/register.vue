<template>
  <div class="min-h-full flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <h2 class="my-6 text-center text-3xl font-extrabold u-text-white">
      Request access to this family archive
    </h2>

    <!--    <LoginCard>-->
    <!--      <div>-->
    <!--        <FormKit-->
    <!--          v-model="input"-->
    <!--          type="form"-->
    <!--          submit-label="Submit Request"-->
    <!--          @submit="submitRegisterRequest"-->
    <!--        >-->
    <!--          <div class="double">-->
    <!--            <FormKit-->
    <!--              type="text"-->
    <!--              name="first"-->
    <!--              label="First name"-->
    <!--              placeholder="Jane"-->
    <!--              validation="required"-->
    <!--            />-->
    <!--            <FormKit-->
    <!--              type="text"-->
    <!--              name="last"-->
    <!--              label="Last name"-->
    <!--              placeholder="Doe"-->
    <!--              validation="required"-->
    <!--            />-->
    <!--          </div>-->

    <!--          <FormKit-->
    <!--            type="text"-->
    <!--            label="Email"-->
    <!--            name="email"-->
    <!--            prefix-icon="email"-->
    <!--            placeholder="email@domain.com"-->
    <!--            validation="required|email"-->
    <!--          />-->

    <!--          <div class="double">-->
    <!--            <FormKit-->
    <!--              type="password"-->
    <!--              name="password"-->
    <!--              label="Password"-->
    <!--              validation="required|length:6|matches:/[^a-zA-Z]/"-->
    <!--              :validation-messages="{-->
    <!--                matches: 'Please include at least one symbol',-->
    <!--              }"-->
    <!--              placeholder="Your password"-->
    <!--              help="Choose a password"-->
    <!--            />-->
    <!--            <FormKit-->
    <!--              type="password"-->
    <!--              name="password_confirm"-->
    <!--              label="Confirm password"-->
    <!--              placeholder="Confirm password"-->
    <!--              validation="required|confirm"-->
    <!--              help="Confirm your password"-->
    <!--            />-->
    <!--          </div>-->
    <!--        </FormKit>-->

    <!--        <NuxtLink to="/login">Already have an account? Click to login</NuxtLink>-->
    <!--      </div>-->
    <!--    </LoginCard>-->
  </div>
</template>

<script setup>
definePageMeta({ layout: "default" });
const client = useSupabaseClient();
const router = useRouter();

const input = ref({ first: "", last: "", email: "", password: "" });
const submitRegisterRequest = async () => {
  const { data, error } = await client.auth.signUp({
    email: input.value.email,
    password: input.value.password,
    options: {
      data: {
        first: input.value.first,
        last: input.value.last,
      },
    },
  });

  console.log(data);
  console.log(error);

  if (error) {
    return alert("Something went wrong!");
  }

  return router.push("/");
};
</script>
