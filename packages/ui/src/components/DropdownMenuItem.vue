<script setup lang="ts">
import { DropdownMenuItem } from "reka-ui";
import { cn } from "../lib/utils";
defineProps<{ class?: string }>();
</script>

<template>
  <DropdownMenuItem
    :class="
      cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg]:size-4',
        $props.class,
      )
    "
  >
    <slot />
  </DropdownMenuItem>
</template>
