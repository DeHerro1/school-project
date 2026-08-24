<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { CheckCircle2, XCircle, Clock, BellRing, Camera, Sparkles } from "lucide-vue-next";
import { Card, CardContent, Button, Skeleton, EmptyState } from "@repo/ui";

definePageMeta({ layout: "parent" });

const api = useApi();
const { activeId, active, loaded, load } = useChildren();
const { fileUrl } = useFiles();

const loading = ref(true);
const attendance = ref<any[]>([]);
const alerts = ref<any[]>([]);
const media = ref<any[]>([]);

async function loadData(id: string) {
  loading.value = true;
  try {
    const [att, al, m] = await Promise.all([
      api<{ records: any[] }>(`/attendance?studentId=${id}`),
      api<{ alerts: any[] }>("/absence-alerts"),
      api<{ media: any[] }>(`/media?studentId=${id}`),
    ]);
    attendance.value = att.records;
    alerts.value = al.alerts.filter((a) => a.attendance.student.id === id);
    media.value = m.media;
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
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card v-for="i in 3" :key="i">
          <CardContent class="flex items-center gap-4 pt-6">
            <Skeleton class="size-10 shrink-0 rounded-full" />
            <div class="flex-1">
              <Skeleton class="h-3 w-20" />
              <Skeleton class="mt-2 h-5 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton v-for="i in 3" :key="i" class="aspect-video rounded-lg" />
      </div>
    </div>
    <EmptyState v-else-if="!active" title="No child linked yet" description="Ask the school to link your child to your account." class="mt-10">
      <template #icon><Sparkles /></template>
    </EmptyState>

    <template v-else>
      <!-- Presence + alerts -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <NuxtLink to="/parent/photos">
          <Card class="h-full transition hover:border-primary">
            <CardContent class="flex items-center gap-4 pt-6">
              <Camera class="size-10 text-primary" />
              <div>
                <p class="text-sm text-muted-foreground">Photos shared</p>
                <p class="text-lg font-bold">{{ media.length }}</p>
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

      <!-- Recent photos -->
      <div class="mt-6">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold">Recent photos</h2>
          <NuxtLink to="/parent/photos" class="text-sm text-primary hover:underline">View all</NuxtLink>
        </div>
        <EmptyState v-if="!media.length" title="No photos yet" description="Photos from teachers will show up here.">
          <template #icon><Camera /></template>
        </EmptyState>
        <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card v-for="m in media.slice(0, 3)" :key="m.id" class="overflow-hidden">
            <img :src="fileUrl(m.fileUrl)" :alt="m.caption" class="aspect-video w-full object-cover" />
            <CardContent class="pt-3">
              <p v-if="m.caption" class="text-sm">{{ m.caption }}</p>
              <p class="mt-1 text-xs text-muted-foreground">{{ new Date(m.createdAt).toLocaleDateString() }}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>
  </div>
</template>
