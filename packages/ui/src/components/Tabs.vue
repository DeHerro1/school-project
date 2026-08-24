<script setup lang="ts">
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from "reka-ui";

defineProps<{ tabs: { value: string; label: string }[] }>();
const model = defineModel<string>({ required: true });
</script>

<template>
  <TabsRoot v-model="model" class="w-full">
    <div class="max-w-full overflow-x-auto">
      <TabsList
        class="inline-flex h-10 w-max items-center justify-center rounded-md bg-muted p-1 text-muted-foreground"
      >
        <TabsTrigger
          v-for="t in tabs"
          :key="t.value"
          :value="t.value"
          class="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          {{ t.label }}
        </TabsTrigger>
      </TabsList>
    </div>
    <TabsContent
      v-for="t in tabs"
      :key="t.value"
      :value="t.value"
      class="mt-4 focus-visible:outline-none"
    >
      <slot :name="t.value" />
    </TabsContent>
  </TabsRoot>
</template>
