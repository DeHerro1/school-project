<script setup lang="ts">
import { computed } from "vue";
import { cn, initials } from "../lib/utils";

const props = defineProps<{
  src?: string | null;
  name?: string;
  class?: string;
}>();

const fallback = computed(() => (props.name ? initials(props.name) : "?"));
</script>

<template>
  <span
    :class="
      cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted text-muted-foreground',
        $props.class,
      )
    "
  >
    <img v-if="src" :src="src" :alt="name" class="aspect-square h-full w-full object-cover" />
    <span v-else class="flex h-full w-full items-center justify-center text-sm font-medium">
      {{ fallback }}
    </span>
  </span>
</template>
