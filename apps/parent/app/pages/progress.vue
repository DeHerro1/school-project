<script setup lang="ts">
import { ref, watch } from "vue";
import { Sparkles, Star, Target, HandHeart, TrendingUp } from "lucide-vue-next";
import { Card, CardContent, Spinner, EmptyState } from "@repo/ui";

const api = useApi();
const { activeId, loaded, load } = useChildren();

const loading = ref(true);
const reports = ref<any[]>([]);

async function loadData(id: string) {
  loading.value = true;
  try {
    reports.value = (await api<{ reports: any[] }>(`/progress?studentId=${id}`)).reports;
  } finally {
    loading.value = false;
  }
}
onMounted(async () => { if (!loaded.value) await load(); });
watch(activeId, (id) => { if (id) loadData(id); }, { immediate: true });

const sections = [
  { key: "strengths", label: "Strengths", icon: TrendingUp, cls: "text-blue-600" },
  { key: "talents", label: "Talents — where they excel", icon: Star, cls: "text-amber-500" },
  { key: "needs", label: "What's needed", icon: Target, cls: "text-violet-600" },
  { key: "howParentsCanHelp", label: "How you can help", icon: HandHeart, cls: "text-success" },
];
</script>

<template>
  <div>
    <PageHeader title="Progress & Talent" subtitle="Guidance from your child's teachers" />
    <div v-if="loading" class="flex justify-center py-16"><Spinner class="size-7 text-primary" /></div>
    <EmptyState v-else-if="!reports.length" title="No updates yet" description="Teachers will share progress and talent guidance here.">
      <template #icon><Sparkles /></template>
    </EmptyState>
    <div v-else class="space-y-6">
      <Card v-for="p in reports" :key="p.id">
        <CardContent class="pt-6">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold">{{ p.term }}</h3>
            <span class="text-xs text-muted-foreground">{{ p.teacher?.name }} · {{ new Date(p.createdAt).toLocaleDateString() }}</span>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div v-for="s in sections" :key="s.key" class="rounded-lg border p-4">
              <div class="mb-1.5 flex items-center gap-2">
                <component :is="s.icon" class="size-4" :class="s.cls" />
                <p class="text-sm font-semibold">{{ s.label }}</p>
              </div>
              <p class="text-sm text-muted-foreground">{{ p[s.key] }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
