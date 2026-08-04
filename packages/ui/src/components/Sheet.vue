<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "reka-ui";
import { X } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../lib/utils";

const props = withDefaults(
  defineProps<{ title?: string; side?: "left" | "right"; class?: string }>(),
  { side: "right" },
);

const open = defineModel<boolean>("open", { default: false });

const sideClasses = computed(() =>
  props.side === "left"
    ? "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r"
    : "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l",
);
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50" />
      <DialogContent
        :class="cn('fixed z-50 flex flex-col gap-4 bg-background p-6 shadow-lg focus:outline-none', sideClasses, $props.class)"
      >
        <DialogTitle v-if="title" class="text-lg font-semibold">{{ title }}</DialogTitle>
        <slot />
        <DialogClose
          class="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none"
          aria-label="Close"
        >
          <X class="size-4" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
