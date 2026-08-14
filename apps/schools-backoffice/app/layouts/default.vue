<script setup lang="ts">
import { ref } from "vue";
import { LayoutDashboard, Building2, Menu, LogOut, ShieldCheck } from "lucide-vue-next";
import { Avatar, DropdownMenu, DropdownMenuItem } from "@repo/ui";
import { useAuthStore } from "~/stores/auth";

const auth = useAuthStore();
const { logout } = useAuth();
const route = useRoute();
const mobileOpen = ref(false);

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/schools", label: "Schools", icon: Building2 },
];

const isActive = (to: string) =>
  to === "/" ? route.path === "/" : route.path.startsWith(to);
</script>

<template>
  <div class="min-h-screen bg-muted/30">
    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 w-64 -translate-x-full border-r bg-background transition-transform lg:translate-x-0"
      :class="mobileOpen ? 'translate-x-0' : ''"
    >
      <div class="flex h-16 items-center gap-2 border-b px-6">
        <ShieldCheck class="size-6 text-primary" />
        <span class="text-lg font-bold">Schools Backoffice</span>
      </div>
      <nav class="flex flex-col gap-1 p-3">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="
            isActive(item.to)
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          "
          @click="mobileOpen = false"
        >
          <component :is="item.icon" class="size-4" />
          {{ item.label }}
        </NuxtLink>
      </nav>
    </aside>

    <!-- Backdrop (mobile) -->
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-30 bg-black/40 lg:hidden"
      @click="mobileOpen = false"
    />

    <!-- Main -->
    <div class="lg:pl-64">
      <header
        class="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6"
      >
        <button class="rounded-md p-2 hover:bg-accent lg:hidden" @click="mobileOpen = true">
          <Menu class="size-5" />
        </button>
        <div class="hidden lg:block" />
        <div class="flex items-center gap-2">
          <DropdownMenu>
            <template #trigger>
              <button class="flex items-center gap-2 rounded-md p-1 hover:bg-accent">
                <Avatar :name="auth.admin?.name" class="size-8" />
                <span class="hidden text-sm font-medium sm:block">{{ auth.admin?.name }}</span>
              </button>
            </template>
            <div class="border-b px-2 py-1.5">
              <p class="text-sm font-medium">{{ auth.admin?.name }}</p>
              <p class="text-xs text-muted-foreground">{{ auth.admin?.email }}</p>
            </div>
            <DropdownMenuItem class="mt-1 text-destructive" @select="logout">
              <LogOut class="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </header>

      <main class="p-4 sm:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
