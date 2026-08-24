<script setup lang="ts">
import Card from "./Card.vue";
import Skeleton from "./Skeleton.vue";
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from "./table-parts";
import TableRoot from "./Table.vue";

// Loading placeholder for the "stacked cards on mobile, table on desktop"
// list pages (Schools, Admins, Students, People, ...) — same Card/Table
// structure as the loaded content so nothing jumps once data arrives.
withDefaults(defineProps<{ rows?: number; cols?: number }>(), { rows: 5, cols: 4 });
</script>

<template>
  <div>
    <!-- Mobile: stacked cards -->
    <div class="space-y-3 md:hidden">
      <Card v-for="i in rows" :key="i" class="p-4">
        <Skeleton class="h-4 w-2/3" />
        <Skeleton class="mt-2 h-3 w-1/3" />
      </Card>
    </div>

    <!-- Desktop: table -->
    <Card class="hidden md:block">
      <TableRoot>
        <TableHeader>
          <TableRow>
            <TableHead v-for="c in cols" :key="c"><Skeleton class="h-3.5 w-16" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="r in rows" :key="r">
            <TableCell v-for="c in cols" :key="c"><Skeleton class="h-4 w-full max-w-32" /></TableCell>
          </TableRow>
        </TableBody>
      </TableRoot>
    </Card>
  </div>
</template>
