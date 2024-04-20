<template>
  <UPage>
    <UPageHeader title="Login" />
    <UPageBody class="h-screen flex items-center justify-center overlay">
      <UCard class="max-w-sm w-full">
        <UAuthForm
          v-if="
            loginState == LoginStateEnum.Init ||
            loginState == LoginStateEnum.WaitingSignIn ||
            loginState == LoginStateEnum.ErrorSignIn
          "
          title="Sign in to your account"
          description="We'll send a temporary login code to your email"
          :loading="formLoading"
          align="top"
          icon="i-heroicons-lock-closed"
          :ui="{ base: 'text-center', footer: 'text-center' }"
          :fields="loginFields"
          :validate="loginValidate"
          @submit="submitLoginRequest"
        >
          <template #validation>
            <UAlert
              v-if="loginState == LoginStateEnum.ErrorSignIn"
              color="red"
              icon="i-heroicons-information-circle-20-solid"
              title="Email Authentication Failure"
              description="That email was unable to properly initiate an authentication request. Please try again."
            />
          </template>
        </UAuthForm>
        <UAuthForm
          v-if="
            loginState == LoginStateEnum.TokenInput ||
            loginState == LoginStateEnum.WaitingTokenVerify ||
            loginState == LoginStateEnum.ErrorTokenVerify
          "
          title="Verify One-Time-Passcode"
          :loading="formLoading"
          align="top"
          icon="i-heroicons-lock-closed"
          :ui="{ base: 'text-center', footer: 'text-center' }"
          :fields="otpFields"
          :validate="otpValidate"
          @submit="submitTokenVerification"
        >
          <template #description>
            <span>Enter verification code sent to {{ email }}</span>
          </template>
          <template #validation>
            <UAlert
              v-if="loginState == LoginStateEnum.ErrorTokenVerify"
              color="red"
              icon="i-heroicons-information-circle-20-solid"
              title="Token Authentication Failure"
              description="We weren't able to verify the token provided. Please try again."
            />
          </template>
        </UAuthForm>
      </UCard>
    </UPageBody>
  </UPage>
  <!--  <LayoutPageWrapper>-->
  <!--    <LayoutPageHeader>-->
  <!--      <LayoutPageTitle text="Login" />-->
  <!--    </LayoutPageHeader>-->
  <!--    <LayoutPageSection>-->
  <!--      <LayoutPageSectionTitle text="Sign in to your account" />-->
  <!--      <AwesomeAlertBanner-->
  <!--        v-if="loginState == LoginStateEnum.ErrorSignIn"-->
  <!--        type="error"-->
  <!--        title="Email Authentication Failed"-->
  <!--        text="That email was unable to properly initiate an authentication request. Please try again."-->
  <!--        class="mb-6"-->
  <!--      />-->
  <!--      <AwesomeAlertBanner-->
  <!--        v-if="loginState == LoginStateEnum.ErrorTokenVerify"-->
  <!--        type="error"-->
  <!--        title="Token Authentication Failed"-->
  <!--        text="We weren't able to verify the token provided. Please try again."-->
  <!--        class="mb-6"-->
  <!--      />-->
  <!--      <AwesomeCard-->
  <!--        :class="{-->
  <!--          'mb-4': true,-->
  <!--          'border-red-500 dark:border-red-500':-->
  <!--            loginState == LoginStateEnum.ErrorSignIn ||-->
  <!--            loginState == LoginStateEnum.ErrorTokenVerify,-->
  <!--        }"-->
  <!--      >-->
  <!--        <AwesomeCardContent>-->
  <!--          <AwesomeCardTitle-->
  <!--            class="capitalize"-->
  <!--            text="Authenticate for access to the archives"-->
  <!--          />-->
  <!--          <div-->
  <!--            v-if="-->
  <!--              loginState == LoginStateEnum.Init ||-->
  <!--              loginState == LoginStateEnum.ErrorSignIn-->
  <!--            "-->
  <!--          >-->
  <!--            <p class="mb-2">-->
  <!--              We will send you a login link / access token to the below email to-->
  <!--              log in-->
  <!--            </p>-->
  <!--            <div class="flex">-->
  <!--              <AwesomeFormTextInput-->
  <!--                v-model="email"-->
  <!--                class="w-full md:w-full"-->
  <!--                tabindex="1"-->
  <!--                @keyup.enter="submitLoginRequest"-->
  <!--              >-->
  <!--                <template #prefix-disabled>-->
  <!--                  <span class="flex-1 px-4 py-2 capitalize">email</span>-->
  <!--                </template>-->
  <!--              </AwesomeFormTextInput>-->
  <!--            </div>-->
  <!--          </div>-->
  <!--          <div-->
  <!--            v-if="-->
  <!--              loginState == LoginStateEnum.TokenInput ||-->
  <!--              loginState == LoginStateEnum.ErrorTokenVerify-->
  <!--            "-->
  <!--          >-->
  <!--            <p class="mb-2">Enter the 6-digit token we sent to {{ email }}</p>-->
  <!--            <div class="flex items-center">-->
  <!--              <AwesomeFormTextInput-->
  <!--                v-model="token"-->
  <!--                class="w-1/4 md:w-1/4"-->
  <!--                tabindex="1"-->
  <!--                @keyup.enter="submitTokenVerification"-->
  <!--              >-->
  <!--              </AwesomeFormTextInput>-->
  <!--            </div>-->
  <!--          </div>-->
  <!--        </AwesomeCardContent>-->
  <!--        <AwesomeCardFooter>-->
  <!--          <div-->
  <!--            v-if="-->
  <!--              loginState == LoginStateEnum.Init ||-->
  <!--              loginState == LoginStateEnum.ErrorSignIn ||-->
  <!--              loginState == LoginStateEnum.WaitingSignIn-->
  <!--            "-->
  <!--            class="flex flex-col space-y-2 md:space-y md:flex-row items-center md:justify-end"-->
  <!--          >-->
  <!--            <AwesomeButton-->
  <!--              :class="{-->
  <!--                capitalize: true,-->
  <!--                disabled: loginState == LoginStateEnum.WaitingSignIn,-->
  <!--              }"-->
  <!--              size="sm"-->
  <!--              type="opposite"-->
  <!--              text="Login"-->
  <!--              tabindex="2"-->
  <!--              @click="submitLoginRequest"-->
  <!--              @keyup.enter="submitLoginRequest"-->
  <!--            />-->
  <!--          </div>-->
  <!--          <div-->
  <!--            v-if="-->
  <!--              loginState == LoginStateEnum.TokenInput ||-->
  <!--              loginState == LoginStateEnum.ErrorTokenVerify ||-->
  <!--              loginState == LoginStateEnum.WaitingTokenVerify-->
  <!--            "-->
  <!--            class="flex flex-col space-y-2 md:space-y md:flex-row items-center md:justify-end"-->
  <!--          >-->
  <!--            <AwesomeButton-->
  <!--              :class="{-->
  <!--                capitalize: true,-->
  <!--                disabled: loginState == LoginStateEnum.WaitingTokenVerify,-->
  <!--              }"-->
  <!--              size="sm"-->
  <!--              type="opposite"-->
  <!--              text="Verify"-->
  <!--              @click="submitTokenVerification"-->
  <!--              @keyup.enter="submitTokenVerification"-->
  <!--            />-->
  <!--          </div>-->
  <!--        </AwesomeCardFooter>-->
  <!--      </AwesomeCard>-->
  <!--    </LayoutPageSection>-->
  <!--  </LayoutPageWrapper>-->
</template>

<script setup lang="ts">
import type { FormError } from "#ui/types";
import { UAuthForm } from "#components";

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
const runtimeConfig = useRuntimeConfig();

const email = ref("");

const loginState = ref(LoginStateEnum.Init);
const formLoading = ref(false);
const redirectTo = `${runtimeConfig.public.baseUrl}/confirm`;

const loginFields = [
  {
    name: "email",
    type: "text",
    label: "Email",
    placeholder: "Enter your email",
  },
];

const loginValidate = (state: any) => {
  const errors: FormError[] = [];
  if (!state.email) {
    errors.push({ path: "email", message: "Email is required" });
  }

  return errors;
};

const otpFields = [
  {
    name: "token",
    type: "text",
    label: "Token",
    placeholder: "Enter token sent to you",
  },
];

const otpValidate = (state: any) => {
  const errors: FormError[] = [];
  if (!state.token) {
    errors.push({ path: "token", message: "Token is required" });
  }

  return errors;
};

const submitLoginRequest = async (data: any) => {
  setLoading(true);
  setState(LoginStateEnum.WaitingSignIn);

  const { error } = await client.auth.signInWithOtp({
    email: data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: redirectTo,
    },
  });

  console.log(error);

  if (error) {
    setState(LoginStateEnum.ErrorSignIn);
  } else {
    email.value = data.email;
    setState(LoginStateEnum.TokenInput);
  }

  setLoading(false);
};

const submitTokenVerification = async (data: any) => {
  setLoading(true);

  setState(LoginStateEnum.WaitingTokenVerify);

  const { error } = await client.auth.verifyOtp({
    email: email.value,
    token: data.token,
    type: "email",
  });

  if (error) {
    setState(LoginStateEnum.ErrorTokenVerify);
    setLoading(false);
    return;
  }

  setState(LoginStateEnum.Success);
  setLoading(false);
  return router.push("/");
};

function setLoading(state: boolean) {
  formLoading.value = state;
  if (state) {
    loadingIndicator.start();
  } else {
    loadingIndicator.finish();
  }
}

function setState(state: LoginStateEnum) {
  loginState.value = state;
}
</script>
