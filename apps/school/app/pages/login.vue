<script setup lang="ts">
import { ref } from "vue";
import { GraduationCap } from "lucide-vue-next";
import { Role } from "@repo/shared";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Alert,
} from "@repo/ui";

definePageMeta({ layout: "auth" });

const { login, loginWithGoogle } = useAuth();
const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const googleLoading = ref(false);

const homeFor = (role: Role) => (role === Role.PARENT ? "/parent" : "/dashboard");

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    const user = await login(username.value, password.value);
    await navigateTo(homeFor(user.role));
  } catch (e) {
    error.value = apiError(e);
  } finally {
    loading.value = false;
  }
}

async function onGoogleSignIn() {
  error.value = "";
  googleLoading.value = true;
  try {
    const user = await loginWithGoogle();
    if (user) await navigateTo(homeFor(user.role));
  } catch (e) {
    error.value = apiError(e);
  } finally {
    googleLoading.value = false;
  }
}
</script>

<template>
  <Card>
    <CardHeader class="text-center">
      <div class="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
        <GraduationCap class="size-6 text-primary" />
      </div>
      <CardTitle class="text-2xl">EduCore</CardTitle>
      <CardDescription>Login to your account</CardDescription>
    </CardHeader>
    <CardContent>
      <Alert v-if="error" variant="destructive" class="mb-4">{{ error }}</Alert>

      <Button
        type="button"
        variant="outline"
        class="w-full"
        :loading="googleLoading"
        :disabled="loading"
        @click="onGoogleSignIn"
      >
        <svg v-if="!googleLoading" viewBox="0 0 24 24" class="size-4" aria-hidden="true">
          <path fill="#4285F4" d="M23.52 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.88c2.27-2.09 3.57-5.17 3.57-8.74Z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3a7.4 7.4 0 0 1-11-3.89H1.08v3.11A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.07 14.21A7.2 7.2 0 0 1 4.7 12c0-.77.13-1.51.37-2.21V6.68H1.08a12 12 0 0 0 0 10.64l3.99-3.11Z" />
          <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.08 6.68l3.99 3.11C5.85 7.02 8.68 4.77 12 4.77Z" />
        </svg>
        Sign in with Google
      </Button>

      <div class="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <div class="h-px flex-1 bg-border" />
        <span>or sign in with username</span>
        <div class="h-px flex-1 bg-border" />
      </div>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="space-y-1.5">
          <Label for="username">Username or email</Label>
          <Input
            id="username"
            v-model="username"
            placeholder="Staff: e.g. sarah · Parents: your email"
            autocapitalize="none"
            autocomplete="username"
            required
          />
        </div>
        <div class="space-y-1.5">
          <Label for="password">Password</Label>
          <Input id="password" v-model="password" type="password" placeholder="••••••••" required />
        </div>
        <Button type="submit" class="w-full" :loading="loading" :disabled="googleLoading">Sign in</Button>
      </form>
    </CardContent>
  </Card>
</template>
