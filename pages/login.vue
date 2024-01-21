<template>
  <LayoutPageWrapper>
    <LayoutPageHeader>
      <LayoutPageTitle text="Login" />
    </LayoutPageHeader>
    <LayoutPageSection>
      <LayoutPageSectionTitle title="Sign in to your account" />
      <AwesomeAlertBanner
        v-if="loginState == LoginStateEnum.ErrorSignIn"
        type="error"
        title="Email Authentication Failed"
        text="That email was unable to properly initiate an authentication request. Please try again."
        class="mb-6"
      />
      <AwesomeAlertBanner
        v-if="loginState == LoginStateEnum.ErrorTokenVerify"
        type="error"
        title="Token Authentication Failed"
        text="We weren't able to verify the token provided. Please try again."
        class="mb-6"
      />
      <AwesomeCard
        :class="{
          'mb-4': true,
          'border-red-500 dark:border-red-500':
            loginState == LoginStateEnum.ErrorSignIn ||
            loginState == LoginStateEnum.ErrorTokenVerify,
        }"
      >
        <AwesomeCardContent>
          <AwesomeCardTitle
            class="capitalize"
            text="Authenticate for access to the archives"
          />
          <div
            v-if="
              loginState == LoginStateEnum.Init ||
              loginState == LoginStateEnum.ErrorSignIn
            "
          >
            <p class="mb-2">
              We will send you a login link / access token to the below email to
              log in
            </p>
            <div class="flex">
              <AwesomeFormTextInput v-model="email" class="w-full md:w-full">
                <template #prefix-disabled>
                  <span class="flex-1 px-4 py-2 capitalize">email</span>
                </template>
              </AwesomeFormTextInput>
            </div>
          </div>
          <div
            v-if="
              loginState == LoginStateEnum.TokenInput ||
              loginState == LoginStateEnum.ErrorTokenVerify
            "
          >
            <p class="mb-2">Enter the 6-digit token we sent to {{ email }}</p>
            <div class="flex items-center">
              <AwesomeFormTextInput v-model="token" class="w-1/4 md:w-1/4">
              </AwesomeFormTextInput>
            </div>
          </div>
        </AwesomeCardContent>
        <AwesomeCardFooter>
          <div
            v-if="
              loginState == LoginStateEnum.Init ||
              loginState == LoginStateEnum.ErrorSignIn ||
              loginState == LoginStateEnum.WaitingSignIn
            "
            class="flex flex-col space-y-2 md:space-y md:flex-row items-center md:justify-end"
          >
            <AwesomeButton
              :class="{
                capitalize: true,
                disabled: loginState == LoginStateEnum.WaitingSignIn,
              }"
              size="sm"
              type="opposite"
              text="Login"
              @click="submitLoginRequest"
            />
          </div>
          <div
            v-if="
              loginState == LoginStateEnum.TokenInput ||
              loginState == LoginStateEnum.ErrorTokenVerify ||
              loginState == LoginStateEnum.WaitingTokenVerify
            "
            class="flex flex-col space-y-2 md:space-y md:flex-row items-center md:justify-end"
          >
            <AwesomeButton
              :class="{
                capitalize: true,
                disabled: loginState == LoginStateEnum.WaitingTokenVerify,
              }"
              size="sm"
              type="opposite"
              text="Verify"
              @click="submitTokenVerification"
            />
          </div>
        </AwesomeCardFooter>
      </AwesomeCard>
    </LayoutPageSection>
  </LayoutPageWrapper>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" });

enum LoginStateEnum {
  Init = 0,
  WaitingSignIn,
  ErrorSignIn,
  TokenInput,
  WaitingTokenVerify,
  ErrorTokenVerify,
  Success,
}

const client = useSupabaseClient();
const router = useRouter();
const loadingIndicator = useLoadingIndicator();

const email = ref("");
const token = ref("");

const loginState = ref(LoginStateEnum.Init);

const redirectTo = `${useRuntimeConfig().public.baseUrl}/confirm`;

const submitLoginRequest = async () => {
  loadingIndicator.start();
  loginState.value = LoginStateEnum.WaitingSignIn;

  const { error } = await client.auth.signInWithOtp({
    email: email.value,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: redirectTo,
    },
  });

  loginState.value = error
    ? LoginStateEnum.ErrorSignIn
    : LoginStateEnum.TokenInput;

  loadingIndicator.finish();
};

const submitTokenVerification = async () => {
  loadingIndicator.start();
  loginState.value = LoginStateEnum.WaitingTokenVerify;

  const { error } = await client.auth.verifyOtp({
    email: email.value,
    token: token.value,
    type: "email",
  });

  if (error) {
    loginState.value = LoginStateEnum.ErrorTokenVerify;
    loadingIndicator.finish();
    return;
  }

  loginState.value = LoginStateEnum.Success;
  loadingIndicator.finish();
  return router.push("/");
};
</script>
