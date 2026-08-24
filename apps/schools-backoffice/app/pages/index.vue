<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Building2, GraduationCap, Users, CheckCircle2 } from "lucide-vue-next";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, EmptyState, SkeletonStatGrid, SkeletonList } from "@repo/ui";
import { SchoolStatus } from "@repo/shared";

const api = useApi();

const loading = ref(true);
const schools = ref<any[]>([]);

onMounted(async () => {
  try {
    const { schools: list } = await api<{ schools: any[] }>("/schools");
    schools.value = list;
  } finally {
    loading.value = false;
  }
});

const totalSchools = computed(() => schools.value.length);
const activeSchools = computed(
  () => schools.value.filter((s) => s.status === SchoolStatus.ACTIVE).length,
);
const totalStudents = computed(() =>
  schools.value.reduce((n, s) => n + (s.counts?.students ?? 0), 0),
);
const totalStaff = computed(() => schools.value.reduce((n, s) => n + (s.counts?.staff ?? 0), 0));
const recentSchools = computed(() => schools.value.slice(0, 5));
</script>

<template>
  <div>
    <PageHeader title="Dashboard" subtitle="Overview of every school on the platform" />

    <div v-if="loading">
      <SkeletonStatGrid :count="4" />
      <Card class="mt-6">
        <CardContent class="pt-5"><SkeletonList :rows="5" :avatar="false" /></CardContent>
      </Card>
    </div>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Schools"
          :value="totalSchools"
          :icon="Building2"
          :subtexts="[{ label: 'active', value: activeSchools, tone: 'text-emerald-600' }]"
        />
        <StatCard
          label="Active schools"
          :value="activeSchools"
          :icon="CheckCircle2"
          tone="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard label="Students" :value="totalStudents" :icon="GraduationCap" />
        <StatCard label="Staff" :value="totalStaff" :icon="Users" tone="bg-violet-500/10 text-violet-600" />
      </div>

      <Card class="mt-6">
        <CardHeader class="flex flex-row items-center justify-between space-y-0">
          <CardTitle class="flex items-center gap-2"><Building2 class="size-5" /> Recently added</CardTitle>
          <Button v-if="schools.length" variant="outline" size="sm" :as="'div'">
            <NuxtLink to="/schools">View all</NuxtLink>
          </Button>
        </CardHeader>
        <CardContent>
          <EmptyState v-if="!schools.length" title="No schools yet" description="Add your first school to get started.">
            <template #icon><Building2 /></template>
          </EmptyState>
          <ul v-else class="divide-y">
            <li v-for="s in recentSchools" :key="s.id" class="flex items-center justify-between py-2.5">
              <NuxtLink :to="`/schools/${s.id}`" class="min-w-0">
                <p class="truncate text-sm font-medium hover:underline">{{ s.name }}</p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ s.counts?.students ?? 0 }} students · {{ s.counts?.staff ?? 0 }} staff
                </p>
              </NuxtLink>
              <Badge :variant="s.status === 'ACTIVE' ? 'success' : 'warning'">
                {{ s.status === "ACTIVE" ? "Active" : "Suspended" }}
              </Badge>
            </li>
          </ul>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
