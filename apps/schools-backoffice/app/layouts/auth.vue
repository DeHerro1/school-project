<script setup lang="ts">
import { ThemeToggle } from "@repo/ui";

const colorMode = useColorMode();
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-muted/40 p-4">
    <ThemeToggle v-model="colorMode.preference" class="fixed right-4 top-4" />
    <div class="w-full max-w-md">
      <slot />
    </div>
  </div>
</template>
