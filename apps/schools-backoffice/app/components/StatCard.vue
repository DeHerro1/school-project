<script setup lang="ts">
import { Card } from "@repo/ui";
defineProps<{
  label: string;
  value: string | number;
  icon?: any;
  tone?: string;
  subtexts?: { label: string; value: string | number; tone?: string }[];
}>();
</script>

<template>
  <Card class="p-5">
    <div class="flex items-center justify-between">
      <div class="min-w-0 flex-1">
        <p class="text-sm text-muted-foreground">{{ label }}</p>
        <p class="mt-1 text-3xl font-bold">{{ value }}</p>
        <div v-if="subtexts?.length" class="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
          <span
            v-for="s in subtexts"
            :key="s.label"
            class="text-xs"
            :class="s.tone ?? 'text-muted-foreground'"
          >
            {{ s.value }} {{ s.label }}
          </span>
        </div>
      </div>
      <div
        v-if="icon"
        class="ml-3 flex size-11 shrink-0 items-center justify-center rounded-lg"
        :class="tone ?? 'bg-primary/10 text-primary'"
      >
        <component :is="icon" class="size-5" />
      </div>
    </div>
  </Card>
</template>
