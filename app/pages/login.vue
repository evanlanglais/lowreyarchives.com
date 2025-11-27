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
            icon="i-heroicons-lock-closed"
            :ui="{ root: 'text-center', footer: 'text-center' }"
            :fields="loginFields"
            :schema="loginSchema"
            @submit="submitLoginRequest"
          >
            <template #validation>
              <UAlert
                v-if="loginState == LoginStateEnum.ErrorSignIn"
                color="error"
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
            icon="i-heroicons-lock-closed"
            :ui="{ root: 'text-center', footer: 'text-center', otp: 'text-center justify-center' }"
            :fields="otpFields"
            :schema="tokenSchema"
            @submit="submitTokenVerification"
          >
            <template #description>
              <span>Enter verification code sent to {{ email }}</span>
            </template>
            <template #validation>
              <UAlert
                v-if="loginState == LoginStateEnum.ErrorTokenVerify"
                color="error"
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
import type {FormError, FormSubmitEvent} from "#ui/types";
// import { UAuthForm } from "#components";
import * as z from 'zod'

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
    type: "text" as const,
    label: "Email",
    placeholder: "Enter your email",
    required: true,
  },
];

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
});

type LoginSchema = z.output<typeof loginSchema>

const tokenSchema = z.object({
  token: z.array(z.string()).length(6),
})

type TokenSchema = z.output<typeof tokenSchema>

// const loginValidate = (state: any) => {
//   const errors: FormError[] = [];
//   if (!state.email) {
//     errors.push({ path: "email", message: "Email is required" });
//   }
//
//   return errors;
// };

const otpFields = [
  {
    name: 'token',
    type: 'otp' as const,
    otp: {
      length: 6,
    },
    required: true,
  }
];

// const otpValidate = (state: any) => {
//   const errors: FormError[] = [];
//   if (!state.token) {
//     errors.push({ path: "token", message: "Token is required" });
//   }
//
//   return errors;
// };

const submitLoginRequest = async (payload: FormSubmitEvent<LoginSchema>) => {
  setLoading(true);
  setState(LoginStateEnum.WaitingSignIn);

  const { error } = await client.auth.signInWithOtp({
    email: payload.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    setState(LoginStateEnum.ErrorSignIn);
  } else {
    email.value = payload.data.email;
    setState(LoginStateEnum.TokenInput);
  }

  setLoading(false);
};

const submitTokenVerification = async (payload: FormSubmitEvent<TokenSchema>) => {
  setLoading(true);

  setState(LoginStateEnum.WaitingTokenVerify);

  const { error } = await client.auth.verifyOtp({
    email: email.value,
    token: payload.data.token.join(''),
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
