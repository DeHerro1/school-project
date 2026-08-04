<script setup lang="ts">
import { cn } from "../lib/utils";
defineProps<{ title: string; description?: string; class?: string }>();
</script>

<template>
  <div
    :class="cn('flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center', $props.class)"
  >
    <div class="mb-3 text-muted-foreground [&_svg]:size-10">
      <slot name="icon" />
    </div>
    <p class="text-sm font-medium">{{ title }}</p>
    <p v-if="description" class="mt-1 text-sm text-muted-foreground">{{ description }}</p>
    <div class="mt-4"><slot name="action" /></div>
  </div>
</template>
