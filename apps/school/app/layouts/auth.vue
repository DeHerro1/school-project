<script setup lang="ts">
import { ArrowLeft } from "lucide-vue-next";
import { ThemeToggle } from "@repo/ui";

const colorMode = useColorMode();
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-muted/40 p-4">
    <NuxtLink
      to="/"
      class="fixed left-4 top-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="size-4" /> Back to home
    </NuxtLink>
    <ThemeToggle v-model="colorMode.preference" class="fixed right-4 top-4" />
    <div class="w-full max-w-md">
      <slot />
    </div>
  </div>
</template>
