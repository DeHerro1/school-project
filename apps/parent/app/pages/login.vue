<script setup lang="ts">
import { ref } from "vue";
import { Heart } from "lucide-vue-next";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Label, Alert,
} from "@repo/ui";
import { useAuthStore } from "~/stores/auth";

definePageMeta({ layout: "auth" });

const auth = useAuthStore();
const api = useApi();
const { login } = useAuth();

const mode = ref<"login" | "register">("login");
const name = ref("");
const email = ref("");
const password = ref("");
const phone = ref("");
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    if (mode.value === "login") {
      await login(email.value, password.value);
    } else {
      const res = await api<any>("/auth/register", {
        method: "POST",
        body: { name: name.value, email: email.value, password: password.value, phone: phone.value || undefined },
      });
      auth.setSession(res);
    }
    await navigateTo("/");
  } catch (e) {
    error.value = apiError(e);
  } finally {
    loading.value = false;
  }
}

function fill(e: string) {
  mode.value = "login";
  email.value = e;
  password.value = "password123";
}
</script>

<template>
  <Card>
    <CardHeader class="text-center">
      <div class="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
        <Heart class="size-6 text-primary" />
      </div>
      <CardTitle class="text-2xl">Parent Portal</CardTitle>
      <CardDescription>Stay connected with your child's school day</CardDescription>
    </CardHeader>
    <CardContent>
      <form class="space-y-4" @submit.prevent="submit">
        <Alert v-if="error" variant="destructive">{{ error }}</Alert>
        <div v-if="mode === 'register'" class="space-y-1.5">
          <Label for="name">Full name</Label>
          <Input id="name" v-model="name" required />
        </div>
        <div class="space-y-1.5">
          <Label for="email">Email</Label>
          <Input id="email" v-model="email" type="email" required />
        </div>
        <div class="space-y-1.5">
          <Label for="password">Password</Label>
          <Input id="password" v-model="password" type="password" required />
        </div>
        <div v-if="mode === 'register'" class="space-y-1.5">
          <Label for="phone">Phone (optional)</Label>
          <Input id="phone" v-model="phone" />
        </div>
        <Button type="submit" class="w-full" :loading="loading">
          {{ mode === "login" ? "Sign in" : "Create account" }}
        </Button>
      </form>

      <p class="mt-4 text-center text-sm text-muted-foreground">
        {{ mode === "login" ? "New parent?" : "Already have an account?" }}
        <button class="font-medium text-primary hover:underline" @click="mode = mode === 'login' ? 'register' : 'login'">
          {{ mode === "login" ? "Create an account" : "Sign in" }}
        </button>
      </p>

      <div class="mt-6 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        <p class="mb-2 font-medium text-foreground">Demo parents (password: password123)</p>
        <div class="flex flex-wrap gap-2">
          <button class="rounded bg-muted px-2 py-1 hover:bg-accent" @click="fill('john@parent.test')">John (Tunde, Ada)</button>
          <button class="rounded bg-muted px-2 py-1 hover:bg-accent" @click="fill('mary@parent.test')">Mary (Zainab)</button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
