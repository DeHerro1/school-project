<script setup lang="ts">
import { cn } from "../lib/utils";
defineProps<{ class?: string }>();
</script>

<template>
  <div
    :class="cn('relative overflow-hidden rounded-md bg-muted', $props.class)"
    role="status"
    aria-label="Loading"
  >
    <div
      class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
      style="animation: shimmer 1.6s infinite"
    />
  </div>
</template>
