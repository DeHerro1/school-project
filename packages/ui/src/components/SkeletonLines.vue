<script setup lang="ts">
import Skeleton from "./Skeleton.vue";

// A generic stack of shimmer bars, alternating width — detail pages, forms,
// and any content that doesn't fit SkeletonTable/SkeletonList/SkeletonStatGrid.
withDefaults(defineProps<{ lines?: number }>(), { lines: 4 });
const widths = ["w-full", "w-5/6", "w-2/3", "w-3/4", "w-1/2"];
</script>

<template>
  <div class="space-y-3">
    <Skeleton v-for="i in lines" :key="i" class="h-4" :class="widths[(i - 1) % widths.length]" />
  </div>
</template>
