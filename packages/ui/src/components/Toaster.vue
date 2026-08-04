<script setup lang="ts">
import { computed } from "vue";
import { X } from "lucide-vue-next";
import { useToast } from "./toast";
import { cn } from "../lib/utils";

const { toasts, dismiss } = useToast();

const variantClass = (v: string) =>
  ({
    default: "border bg-background text-foreground",
    success: "border-success/40 bg-success text-success-foreground",
    destructive: "border-destructive/40 bg-destructive text-destructive-foreground",
    warning: "border-warning/40 bg-warning text-warning-foreground",
  })[v] ?? "border bg-background";

const items = computed(() => toasts);
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-sm">
      <TransitionGroup name="toast">
        <div
          v-for="t in items"
          :key="t.id"
          :class="cn('pointer-events-auto flex items-start gap-3 rounded-lg p-4 shadow-lg', variantClass(t.variant))"
        >
          <div class="flex-1">
            <p class="text-sm font-semibold">{{ t.title }}</p>
            <p v-if="t.description" class="mt-1 text-sm opacity-90">{{ t.description }}</p>
          </div>
          <button class="opacity-70 hover:opacity-100" @click="dismiss(t.id)">
            <X class="size-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(1rem);
}
</style>
