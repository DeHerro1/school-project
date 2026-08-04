<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { GraduationCap, Users, ClipboardCheck, BellRing } from "lucide-vue-next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Avatar,
  Spinner,
  EmptyState,
} from "@repo/ui";
import { useAuthStore } from "~/stores/auth";
const api = useApi();
const auth = useAuthStore();

interface Overview {
  totalTeachers: number;
  availableTeachers: number;
  unavailableTeachers: number;
  totalStudents: number;
  presentStudents: number;
  absentStudents: number;
  totalClasses: number;
  pendingAlerts: number;
}

interface ClassSummary {
  id: string;
  homeroomTeacherId: string | null;
  total: number;
  present: number;
  absent: number;
}

const isTeacher = computed(() => auth.role === "TEACHER");

const loading = ref(true);
const classes = ref<any[]>([]);
const alerts = ref<any[]>([]);
const stats = ref<Overview | null>(null);
const summary = ref<ClassSummary[]>([]);

onMounted(async () => {
  try {
    const [c, a, o] = await Promise.all([
      api<{ classes: any[] }>("/classes"),
      api<{ alerts: any[] }>("/absence-alerts"),
      api<Overview>("/stats/overview"),
      // Homeroom teachers see today's register for their own class(es).
      isTeacher.value
        ? api<{ classes: ClassSummary[] }>("/attendance/summary").then((r) => {
            summary.value = r.classes;
          })
        : Promise.resolve(),
    ]);
    classes.value = c.classes;
    alerts.value = a.alerts;
    stats.value = o;
  } finally {
    loading.value = false;
  }
});

const pendingAlerts = computed(() => alerts.value.filter((a) => a.status === "PENDING"));

// The class(es) this teacher is homeroom teacher for — the basis of their cards.
const myHomeroom = computed(() =>
  summary.value.filter((c) => c.homeroomTeacherId === auth.user?.id),
);
const presentStudents = computed(() =>
  myHomeroom.value.reduce((n, c) => n + c.present, 0),
);
const absentStudents = computed(() => myHomeroom.value.reduce((n, c) => n + c.absent, 0));
const homeroomStudents = computed(() =>
  myHomeroom.value.reduce((n, c) => n + c.total, 0),
);
</script>

<template>
  <div>
    <PageHeader
      title="Dashboard"
      subtitle="Here's what's happening at your school today."
    />

    <div v-if="loading" class="flex justify-center py-20"><Spinner class="size-8 text-primary" /></div>

    <template v-else>
      <div v-if="isTeacher" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Present students"
          :value="presentStudents"
          :icon="ClipboardCheck"
          tone="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="Absent students"
          :value="absentStudents"
          :icon="GraduationCap"
          tone="bg-rose-500/10 text-rose-600"
        />
        <StatCard label="Students" :value="homeroomStudents" :icon="GraduationCap" />
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Teachers"
          :value="stats?.totalTeachers ?? 0"
          :icon="Users"
          tone="bg-violet-500/10 text-violet-600"
          :subtexts="[
            { label: 'available', value: stats?.availableTeachers ?? 0, tone: 'text-emerald-600' },
            { label: 'unavailable', value: stats?.unavailableTeachers ?? 0, tone: 'text-rose-500' },
          ]"
        />
        <StatCard
          label="Students"
          :value="stats?.totalStudents ?? 0"
          :icon="GraduationCap"
          :subtexts="[
            { label: 'present', value: stats?.presentStudents ?? 0, tone: 'text-emerald-600' },
            { label: 'absent', value: stats?.absentStudents ?? 0, tone: 'text-rose-500' },
          ]"
        />
        <StatCard
          label="Pending alerts"
          :value="stats?.pendingAlerts ?? pendingAlerts.length"
          :icon="BellRing"
          tone="bg-amber-500/10 text-amber-600"
        />
        <StatCard label="Classes" :value="stats?.totalClasses ?? 0" :icon="ClipboardCheck" />
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <BellRing class="size-5" /> Recent absence alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              v-if="!alerts.length"
              title="No alerts"
              description="Absence alerts you raise will appear here."
            >
              <template #icon><ClipboardCheck /></template>
            </EmptyState>
            <ul v-else class="space-y-3">
              <li v-for="a in alerts.slice(0, 6)" :key="a.id" class="flex items-center gap-3">
                <Avatar
                  :name="`${a.attendance.student.firstName} ${a.attendance.student.lastName}`"
                  :src="a.attendance.student.photoUrl"
                  class="size-9"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">
                    {{ a.attendance.student.firstName }} {{ a.attendance.student.lastName }}
                  </p>
                  <p class="truncate text-xs text-muted-foreground">
                    {{ a.parentReason ? `Reason: ${a.parentReason}` : a.message }}
                  </p>
                </div>
                <Badge :variant="a.status === 'RESPONDED' ? 'success' : 'warning'">
                  {{ a.status === "RESPONDED" ? "Responded" : "Pending" }}
                </Badge>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0">
            <CardTitle class="flex items-center gap-2"><Users class="size-5" /> Classes</CardTitle>
            <Button v-if="classes.length" variant="outline" size="sm" :as="'div'">
              <NuxtLink to="/classes">View All</NuxtLink>
            </Button>
          </CardHeader>
          <CardContent>
            <EmptyState v-if="!classes.length" title="No classes yet">
              <template #icon><Users /></template>
            </EmptyState>
            <ul v-else class="divide-y">
              <li v-for="c in classes.slice(0, 5)" :key="c.id" class="flex items-center justify-between py-2.5">
                <div>
                  <p class="text-sm font-medium">{{ c.name }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ c.homeroomTeacher?.name ?? "No homeroom teacher" }}
                  </p>
                </div>
                <Badge variant="secondary">{{ c._count?.students ?? 0 }} students</Badge>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>
