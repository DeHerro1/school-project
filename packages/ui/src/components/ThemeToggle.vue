<script setup lang="ts">
import { computed } from "vue";
import { Sun, Moon, Monitor } from "lucide-vue-next";
import DropdownMenu from "./DropdownMenu.vue";
import DropdownMenuItem from "./DropdownMenuItem.vue";
import { cn } from "../lib/utils";

export type ThemePreference = "light" | "dark" | "system";

defineProps<{ class?: string }>();

// Purely presentational — the host app owns the actual color-mode state
// (via @nuxtjs/color-mode's useColorMode()) and passes it in as a v-model,
// same controlled-component pattern as Select/Tabs. Typed as `string`, not
// ThemePreference, because useColorMode()'s `.preference` is itself typed as
// a broad `string` (it allows custom color modes beyond light/dark/system).
const model = defineModel<string>({ default: "system" });

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const activeIcon = computed(() => options.find((o) => o.value === model.value)?.icon ?? Monitor);
</script>

<template>
  <DropdownMenu align="end">
    <template #trigger>
      <button
        type="button"
        :class="
          cn(
            'flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            $props.class,
          )
        "
        aria-label="Change theme"
      >
        <component :is="activeIcon" class="size-4" />
      </button>
    </template>
    <DropdownMenuItem
      v-for="opt in options"
      :key="opt.value"
      :class="opt.value === model ? 'bg-accent text-accent-foreground' : ''"
      @select="model = opt.value"
    >
      <component :is="opt.icon" class="size-4" />
      {{ opt.label }}
    </DropdownMenuItem>
  </DropdownMenu>
</template>
