<script setup lang="ts">
import { ref } from "vue";
import { GraduationCap, Menu, X } from "lucide-vue-next";
import { ThemeToggle } from "@repo/ui";

const mobileOpen = ref(false);
const colorMode = useColorMode();
const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#gallery", label: "Gallery" },
  { href: "#audiences", label: "Who it's for" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <NuxtLink to="/" class="flex items-center gap-2 font-bold" @click="mobileOpen = false">
          <GraduationCap class="size-6 text-primary" />
          EduCore
        </NuxtLink>
        <nav aria-label="Primary" class="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
          <a v-for="l in navLinks" :key="l.href" :href="l.href" class="transition-colors hover:text-foreground">
            {{ l.label }}
          </a>
        </nav>
        <div class="hidden items-center gap-4 lg:flex">
          <ThemeToggle v-model="colorMode.preference" />
          <NuxtLink to="/login" class="text-sm font-medium text-muted-foreground hover:text-foreground">
            Login
          </NuxtLink>
          <a
            href="#get-started"
            class="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get started
          </a>
        </div>
        <button
          type="button"
          class="rounded-md p-2 text-foreground hover:bg-accent lg:hidden"
          :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
          @click="mobileOpen = !mobileOpen"
        >
          <component :is="mobileOpen ? X : Menu" class="size-5" />
        </button>
      </div>

      <!-- Mobile menu -->
      <div v-if="mobileOpen" class="border-t bg-background px-4 py-4 lg:hidden">
        <nav aria-label="Mobile" class="flex flex-col gap-1">
          <a
            v-for="l in navLinks"
            :key="l.href"
            :href="l.href"
            class="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            @click="mobileOpen = false"
          >
            {{ l.label }}
          </a>
          <div class="my-2 h-px bg-border" />
          <div class="flex items-center justify-between px-3 py-1">
            <span class="text-sm font-medium text-muted-foreground">Theme</span>
            <ThemeToggle v-model="colorMode.preference" />
          </div>
          <NuxtLink
            to="/login"
            class="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            @click="mobileOpen = false"
          >
            Login
          </NuxtLink>
          <a
            href="#get-started"
            class="mt-1 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            @click="mobileOpen = false"
          >
            Get started
          </a>
        </nav>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer class="border-t bg-muted/30">
      <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div class="lg:col-span-2">
            <div class="flex items-center gap-2 font-bold">
              <GraduationCap class="size-6 text-primary" />
              EduCore
            </div>
            <p class="mt-3 max-w-xs text-sm text-muted-foreground">
              The parent-engagement platform that keeps admins, teachers, and parents on the same
              page — from a child's first day to their end-of-term report.
            </p>
          </div>
          <div>
            <p class="text-sm font-semibold">Product</p>
            <ul class="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" class="hover:text-foreground">Features</a></li>
              <li><a href="#audiences" class="hover:text-foreground">Who it's for</a></li>
              <li><a href="#how-it-works" class="hover:text-foreground">How it works</a></li>
              <li><a href="#faq" class="hover:text-foreground">FAQ</a></li>
            </ul>
          </div>
          <div>
            <p class="text-sm font-semibold">Get started</p>
            <ul class="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#get-started" class="hover:text-foreground">Create account</a></li>
              <li><NuxtLink to="/login" class="hover:text-foreground">Login</NuxtLink></li>
            </ul>
          </div>
        </div>
        <div class="mt-10 border-t pt-6 text-sm text-muted-foreground">
          © {{ new Date().getFullYear() }} EduCore. All rights reserved.
        </div>
      </div>
    </footer>
  </div>
</template>
