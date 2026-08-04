<script setup lang="ts">
import { cn } from "../lib/utils";
defineProps<{ class?: string }>();
</script>

<template>
  <span
    :class="cn('inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent', $props.class)"
    role="status"
    aria-label="Loading"
  />
</template>
