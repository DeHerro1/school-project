<script setup lang="ts">
import { ref } from "vue";
import { ShieldCheck } from "lucide-vue-next";
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

const { login } = useAuth();
const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await login(email.value, password.value);
    await navigateTo("/");
  } catch (e) {
    error.value = apiError(e);
  } finally {
    loading.value = false;
  }
}

function fill() {
  email.value = "owner@backoffice.test";
  password.value = "password123";
}
</script>

<template>
  <Card>
    <CardHeader class="text-center">
      <div class="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
        <ShieldCheck class="size-6 text-primary" />
      </div>
      <CardTitle class="text-2xl">Schools Backoffice</CardTitle>
      <CardDescription>Platform admin sign in — manage every registered school</CardDescription>
    </CardHeader>
    <CardContent>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <Alert v-if="error" variant="destructive">{{ error }}</Alert>
        <div class="space-y-1.5">
          <Label for="email">Email</Label>
          <Input id="email" v-model="email" type="email" placeholder="owner@backoffice.test" autocomplete="username" required />
        </div>
        <div class="space-y-1.5">
          <Label for="password">Password</Label>
          <Input id="password" v-model="password" type="password" placeholder="••••••••" autocomplete="current-password" required />
        </div>
        <Button type="submit" class="w-full" :loading="loading">Sign in</Button>
      </form>

      <div class="mt-6 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        <p class="mb-2 font-medium text-foreground">Demo account (password: password123)</p>
        <button class="rounded bg-muted px-2 py-1 hover:bg-accent" @click="fill">
          owner@backoffice.test
        </button>
      </div>
    </CardContent>
  </Card>
</template>
