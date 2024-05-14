<template>
  <UContainer>
    <UPage>
      <UPageHeader title="Login" />
      <UPageBody class="flex items-center justify-center">
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
  </UContainer>
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
