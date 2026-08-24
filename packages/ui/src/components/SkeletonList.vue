<script setup lang="ts">
import Skeleton from "./Skeleton.vue";

// A vertical list of avatar/icon + two-line rows — recent alerts, classes,
// messages, notifications, and similar "list inside a card" content.
withDefaults(defineProps<{ rows?: number; avatar?: boolean }>(), { rows: 5, avatar: true });
</script>

<template>
  <ul class="space-y-3">
    <li v-for="i in rows" :key="i" class="flex items-center gap-3">
      <Skeleton v-if="avatar" class="size-9 shrink-0 rounded-full" />
      <div class="min-w-0 flex-1">
        <Skeleton class="h-3.5 w-2/5" />
        <Skeleton class="mt-1.5 h-3 w-3/5" />
      </div>
    </li>
  </ul>
</template>
