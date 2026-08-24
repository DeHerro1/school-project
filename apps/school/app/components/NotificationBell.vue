<script setup lang="ts">
import { onMounted } from "vue";
import { Bell } from "lucide-vue-next";
import { DropdownMenu, Badge, Button } from "@repo/ui";

const { items, unread, load, markAllRead } = useNotifications();

onMounted(load);

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
</script>

<template>
  <DropdownMenu class="w-[calc(100vw-2rem)] max-w-80 p-0">
    <template #trigger>
      <button
        class="relative inline-flex size-10 items-center justify-center rounded-md hover:bg-accent"
        aria-label="Notifications"
      >
        <Bell class="size-5" />
        <span
          v-if="unread > 0"
          class="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
        >
          {{ unread > 9 ? "9+" : unread }}
        </span>
      </button>
    </template>

    <div class="flex items-center justify-between border-b px-3 py-2">
      <span class="text-sm font-semibold">Notifications</span>
      <Button v-if="unread > 0" variant="link" size="sm" class="h-auto p-0" @click="markAllRead">
        Mark all read
      </Button>
    </div>
    <div class="max-h-96 overflow-y-auto">
      <p v-if="!items.length" class="px-3 py-8 text-center text-sm text-muted-foreground">
        No notifications yet
      </p>
      <div
        v-for="n in items"
        :key="n.id"
        class="border-b px-3 py-2.5 last:border-0"
        :class="!n.readAt ? 'bg-primary/5' : ''"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-medium">{{ n.title }}</p>
          <Badge v-if="!n.readAt" variant="secondary" class="shrink-0 text-[10px]">new</Badge>
        </div>
        <p v-if="n.body" class="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{{ n.body }}</p>
        <p class="mt-1 text-[11px] text-muted-foreground">{{ timeAgo(n.createdAt) }}</p>
      </div>
    </div>
  </DropdownMenu>
</template>
