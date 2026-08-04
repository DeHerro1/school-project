<script setup lang="ts">
import { ref } from "vue";
import { GraduationCap } from "lucide-vue-next";
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
const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await login(username.value, password.value);
    await navigateTo("/");
  } catch (e) {
    error.value = apiError(e);
  } finally {
    loading.value = false;
  }
}

function fill(u: string) {
  username.value = u;
  password.value = "password123";
}
</script>

<template>
  <Card>
    <CardHeader class="text-center">
      <div class="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
        <GraduationCap class="size-6 text-primary" />
      </div>
      <CardTitle class="text-2xl">School Portal</CardTitle>
      <CardDescription>Staff sign in — teachers &amp; administrators</CardDescription>
    </CardHeader>
    <CardContent>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <Alert v-if="error" variant="destructive">{{ error }}</Alert>
        <div class="space-y-1.5">
          <Label for="username">Username</Label>
          <Input id="username" v-model="username" placeholder="e.g. sarah" autocapitalize="none" autocomplete="username" required />
        </div>
        <div class="space-y-1.5">
          <Label for="password">Password</Label>
          <Input id="password" v-model="password" type="password" placeholder="••••••••" required />
        </div>
        <Button type="submit" class="w-full" :loading="loading">Sign in</Button>
      </form>

      <div class="mt-6 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        <p class="mb-2 font-medium text-foreground">Demo accounts (password: password123)</p>
        <div class="flex flex-wrap gap-2">
          <button class="rounded bg-muted px-2 py-1 hover:bg-accent" @click="fill('admin')">
            Admin
          </button>
          <button class="rounded bg-muted px-2 py-1 hover:bg-accent" @click="fill('sarah')">
            Teacher
          </button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
