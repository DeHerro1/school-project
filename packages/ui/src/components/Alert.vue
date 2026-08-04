<script lang="ts">
import { cva, type VariantProps } from "class-variance-authority";

export const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive [&>svg]:text-destructive",
        success: "border-success/50 text-success [&>svg]:text-success",
        warning: "border-warning/50 text-warning-foreground bg-warning/10",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export type AlertVariants = VariantProps<typeof alertVariants>;
</script>

<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../lib/utils";
const props = defineProps<{ variant?: AlertVariants["variant"]; class?: string }>();
const classes = computed(() => cn(alertVariants({ variant: props.variant }), props.class));
</script>

<template>
  <div :class="classes" role="alert"><slot /></div>
</template>
