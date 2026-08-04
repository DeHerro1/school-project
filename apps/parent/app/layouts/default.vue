<script setup lang="ts">
import { onMounted } from "vue";
import {
  LayoutDashboard, Camera, BellRing, FileText, Sparkles, CalendarDays, Receipt, LogOut, Heart,
} from "lucide-vue-next";
import { Avatar, DropdownMenu, DropdownMenuItem, Select } from "@repo/ui";
import { useAuthStore } from "~/stores/auth";

const auth = useAuthStore();
const { logout } = useAuth();
const route = useRoute();
const { children, activeId, active, loaded, load, setActive } = useChildren();
const { fileUrl } = useFiles();

onMounted(async () => {
  if (!loaded.value) await load();
});

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/alerts", label: "Absence alerts", icon: BellRing },
  { to: "/photos", label: "Photos", icon: Camera },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/progress", label: "Progress & Talent", icon: Sparkles },
  { to: "/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/fees", label: "Fees", icon: Receipt },
];

const isActive = (to: string) => (to === "/" ? route.path === "/" : route.path.startsWith(to));
const childOptions = computed(() =>
  children.value.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` })),
);
</script>

<template>
  <div class="min-h-screen bg-muted/30">
    <header class="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div class="flex items-center gap-2">
          <Heart class="size-6 text-primary" />
          <span class="text-lg font-bold">Parent Portal</span>
        </div>
        <div class="flex items-center gap-2">
          <Select
            v-if="children.length > 1"
            :model-value="activeId ?? undefined"
            :options="childOptions"
            class="w-44"
            @update:model-value="(v) => setActive(v as string)"
          />
          <NotificationBell />
          <DropdownMenu>
            <template #trigger>
              <button class="flex items-center gap-2 rounded-md p-1 hover:bg-accent">
                <Avatar :name="auth.user?.name" :src="auth.user?.avatarUrl" class="size-8" />
              </button>
            </template>
            <div class="border-b px-2 py-1.5">
              <p class="text-sm font-medium">{{ auth.user?.name }}</p>
              <p class="text-xs text-muted-foreground">Parent</p>
            </div>
            <DropdownMenuItem class="mt-1 text-destructive" @select="logout">
              <LogOut class="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>
      <!-- Nav -->
      <div class="mx-auto max-w-6xl px-2">
        <nav class="flex gap-1 overflow-x-auto pb-1">
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors"
            :class="isActive(item.to) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
          >
            <component :is="item.icon" class="size-4" />
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-6xl p-4">
      <div v-if="active" class="mb-4 flex items-center gap-3 rounded-lg border bg-background p-3">
        <Avatar :name="`${active.firstName} ${active.lastName}`" :src="fileUrl(active.photoUrl)" class="size-11" />
        <div>
          <p class="font-semibold">{{ active.firstName }} {{ active.lastName }}</p>
          <p class="text-xs text-muted-foreground">{{ active.class?.name ?? "No class" }}</p>
        </div>
      </div>
      <slot />
    </main>
  </div>
</template>
