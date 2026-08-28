<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { CheckCircle2, XCircle, Clock, BellRing, Sparkles } from "lucide-vue-next";
import { Card, CardContent, Button, Skeleton, EmptyState } from "@repo/ui";

definePageMeta({ layout: "parent" });

const api = useApi();
const { activeId, active, loaded, load } = useChildren();

const loading = ref(true);
const attendance = ref<any[]>([]);
const alerts = ref<any[]>([]);

async function loadData(id: string) {
  loading.value = true;
  try {
    const [att, al] = await Promise.all([
      api<{ records: any[] }>(`/attendance?studentId=${id}`),
      api<{ alerts: any[] }>("/absence-alerts"),
    ]);
    attendance.value = att.records;
    alerts.value = al.alerts.filter((a) => a.attendance.student.id === id);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (!loaded.value) await load();
});

watch(activeId, (id) => { if (id) loadData(id); }, { immediate: true });

const todayIso = new Date().toISOString().slice(0, 10);
const todayRecord = computed(() =>
  attendance.value.find((r) => r.date.slice(0, 10) === todayIso),
);
const pendingAlerts = computed(() => alerts.value.filter((a) => a.status === "PENDING"));

const presence = computed(() => {
  const s = todayRecord.value?.status;
  if (s === "PRESENT") return { label: "Present today", icon: CheckCircle2, cls: "text-success", bg: "bg-success/10" };
  if (s === "ABSENT") return { label: "Absent today", icon: XCircle, cls: "text-destructive", bg: "bg-destructive/10" };
  if (s === "LATE") return { label: "Arrived late", icon: Clock, cls: "text-warning", bg: "bg-warning/10" };
  return { label: "Not yet marked", icon: Clock, cls: "text-muted-foreground", bg: "bg-muted" };
});
</script>

<template>
  <div>
    <div v-if="loading">
      <div class="grid gap-4 sm:grid-cols-2">
        <Card v-for="i in 2" :key="i">
          <CardContent class="flex items-center gap-4 pt-6">
            <Skeleton class="size-10 shrink-0 rounded-full" />
            <div class="flex-1">
              <Skeleton class="h-3 w-20" />
              <Skeleton class="mt-2 h-5 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    <EmptyState v-else-if="!active" title="No child linked yet" description="Ask the school to link your child to your account." class="mt-10">
      <template #icon><Sparkles /></template>
    </EmptyState>

    <template v-else>
      <!-- Presence + alerts -->
      <div class="grid gap-4 sm:grid-cols-2">
        <Card :class="presence.bg" class="border-0">
          <CardContent class="flex items-center gap-4 pt-6">
            <component :is="presence.icon" class="size-10" :class="presence.cls" />
            <div>
              <p class="text-sm text-muted-foreground">Attendance</p>
              <p class="text-lg font-bold">{{ presence.label }}</p>
            </div>
          </CardContent>
        </Card>

        <NuxtLink to="/parent/alerts">
          <Card class="h-full transition hover:border-primary">
            <CardContent class="flex items-center gap-4 pt-6">
              <BellRing class="size-10" :class="pendingAlerts.length ? 'text-amber-500' : 'text-muted-foreground'" />
              <div>
                <p class="text-sm text-muted-foreground">Absence alerts</p>
                <p class="text-lg font-bold">
                  {{ pendingAlerts.length ? `${pendingAlerts.length} need a reason` : "All clear" }}
                </p>
              </div>
            </CardContent>
          </Card>
        </NuxtLink>
      </div>

      <!-- Pending alert callout -->
      <Card v-if="pendingAlerts.length" class="mt-6 border-amber-300 bg-amber-50/60">
        <CardContent class="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <BellRing class="size-6 shrink-0 text-amber-500" />
            <div>
              <p class="font-semibold">{{ active.firstName }} was marked absent</p>
              <p class="text-sm text-muted-foreground">{{ pendingAlerts[0].message }}</p>
            </div>
          </div>
          <Button :as="'div'"><NuxtLink to="/parent/alerts">Provide a reason</NuxtLink></Button>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
