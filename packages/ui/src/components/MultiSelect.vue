<script setup lang="ts">
import { computed, ref } from "vue";
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
} from "reka-ui";
import { ChevronDown, Check, X, Search } from "lucide-vue-next";
import { cn } from "../lib/utils";

const props = defineProps<{
  options: { value: string; label: string }[];
  placeholder?: string;
  searchable?: boolean;
  class?: string;
}>();

const model = defineModel<string[]>({ default: () => [] });
const query = ref("");

const selectedLabels = computed(() =>
  props.options.filter((o) => model.value.includes(o.value)),
);

const filteredOptions = computed(() => {
  if (!props.searchable || !query.value) return props.options;
  const q = query.value.toLowerCase();
  return props.options.filter((o) => o.label.toLowerCase().includes(q));
});

function toggle(value: string) {
  const set = new Set(model.value);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  model.value = [...set];
}

function remove(value: string) {
  model.value = model.value.filter((v) => v !== value);
}
</script>

<template>
  <PopoverRoot @update:open="query = ''">
    <PopoverTrigger
      :class="
        cn(
          'flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          $props.class,
        )
      "
    >
      <div v-if="selectedLabels.length" class="flex flex-wrap gap-1">
        <span
          v-for="opt in selectedLabels"
          :key="opt.value"
          class="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {{ opt.label }}
          <X class="size-3 cursor-pointer opacity-60 hover:opacity-100" @click.stop="remove(opt.value)" />
        </span>
      </div>
      <span v-else class="text-muted-foreground">{{ placeholder ?? "Select…" }}</span>
      <ChevronDown class="size-4 shrink-0 opacity-50" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        position="popper"
        :side-offset="4"
        class="z-50 w-[var(--reka-popover-trigger-width)] rounded-md border bg-popover text-popover-foreground shadow-md"
      >
        <div v-if="searchable" class="flex items-center gap-2 border-b px-2 py-1.5">
          <Search class="size-3.5 shrink-0 text-muted-foreground" />
          <input
            v-model="query"
            placeholder="Search…"
            class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            @click.stop
          />
        </div>
        <div class="max-h-60 overflow-y-auto p-1">
          <button
            v-for="opt in filteredOptions"
            :key="opt.value"
            type="button"
            class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            @click="toggle(opt.value)"
          >
            <span v-if="model.includes(opt.value)" class="absolute left-2 inline-flex items-center">
              <Check class="size-4" />
            </span>
            {{ opt.label }}
          </button>
          <p v-if="!filteredOptions.length" class="px-2 py-1.5 text-sm text-muted-foreground">No results</p>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
