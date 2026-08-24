<script setup lang="ts">
import Card from "./Card.vue";
import CardContent from "./CardContent.vue";
import Skeleton from "./Skeleton.vue";

// Loading placeholder for a row of StatCards (dashboards).
withDefaults(defineProps<{ count?: number }>(), { count: 4 });
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <Card v-for="i in count" :key="i">
      <CardContent class="flex items-center justify-between gap-4 p-5">
        <div class="min-w-0 flex-1">
          <Skeleton class="h-3 w-20" />
          <Skeleton class="mt-2 h-7 w-12" />
        </div>
        <Skeleton class="size-11 shrink-0 rounded-lg" />
      </CardContent>
    </Card>
  </div>
</template>
