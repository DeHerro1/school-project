<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { FileText, Download, ChevronDown, GraduationCap, TrendingUp, Lightbulb, Star, HandHeart } from "lucide-vue-next";
import { Card, CardContent, Button, Spinner, EmptyState, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@repo/ui";

const api = useApi();
const { activeId, loaded, load } = useChildren();
const { fileUrl } = useFiles();

const loading = ref(true);
const reports = ref<any[]>([]);
const openGroups = ref<Set<string>>(new Set());
const openReports = ref<Set<string>>(new Set());

async function loadData(id: string) {
  loading.value = true;
  openGroups.value = new Set();
  openReports.value = new Set();
  try {
    const res = await api<{ reports: any[] }>(`/reports?studentId=${id}`);
    reports.value = res.reports;
    // auto-open the first (most recent) class group and its first term
    const first = res.reports[0];
    if (first) {
      const firstGroupKey = first.class?.id ?? "__none__";
      openGroups.value.add(firstGroupKey);
      openReports.value.add(first.id);
    }
  } finally {
    loading.value = false;
  }
}
onMounted(async () => { if (!loaded.value) await load(); });
watch(activeId, (id) => { if (id) loadData(id); }, { immediate: true });

function toggleGroup(key: string) {
  if (openGroups.value.has(key)) openGroups.value.delete(key);
  else openGroups.value.add(key);
}
function toggleReport(id: string) {
  if (openReports.value.has(id)) openReports.value.delete(id);
  else openReports.value.add(id);
}

const average = (r: any) =>
  r.marks?.length ? Math.round(r.marks.reduce((s: number, m: any) => s + m.score, 0) / r.marks.length) : null;

const gradeColor = (g: string) => ({
  A: "text-success font-semibold",
  B: "text-primary font-semibold",
  C: "text-amber-600 font-semibold",
  D: "text-destructive font-semibold",
}[g] ?? "");

const narratives = [
  { key: "progress", label: "Progress", icon: TrendingUp, cls: "text-primary" },
  { key: "interest", label: "Interest", icon: Lightbulb, cls: "text-amber-500" },
  { key: "strength", label: "Strength", icon: Star, cls: "text-violet-600" },
  { key: "howParentsCanHelp", label: "How you can help", icon: HandHeart, cls: "text-success" },
];

const termOrder: Record<string, number> = { "First Term": 1, "Second Term": 2, "Third Term": 3 };

// Group reports by class, preserving most-recent-class-first order
const groupedReports = computed(() => {
  const groups = new Map<string, { key: string; label: string; reports: any[] }>();
  for (const r of reports.value) {
    const key = r.class?.id ?? "__none__";
    if (!groups.has(key)) groups.set(key, { key, label: r.class?.name ?? "General", reports: [] });
    groups.get(key)!.reports.push(r);
  }
  // Sort terms within each group: Third Term first → First Term last
  for (const g of groups.values()) {
    g.reports.sort((a, b) => (termOrder[b.term] ?? 0) - (termOrder[a.term] ?? 0));
  }
  return [...groups.values()];
});
</script>

<template>
  <div>
    <PageHeader title="Term Reports" subtitle="Your child's academic results by term" />
    <div v-if="loading" class="flex justify-center py-16"><Spinner class="size-7 text-primary" /></div>
    <EmptyState v-else-if="!reports.length" title="No reports yet" description="Term reports will be published here once available.">
      <template #icon><FileText /></template>
    </EmptyState>

    <div v-else class="space-y-4">
      <!-- One card per class -->
      <Card v-for="group in groupedReports" :key="group.key">
        <CardContent class="pt-5">
          <!-- Class group header -->
          <button
            type="button"
            class="flex w-full items-center gap-2 text-left"
            @click="toggleGroup(group.key)"
          >
            <ChevronDown
              class="size-4 shrink-0 text-muted-foreground transition-transform duration-200"
              :class="openGroups.has(group.key) ? '' : '-rotate-90'"
            />
            <span class="text-base font-semibold">{{ group.label }}</span>
            <span class="ml-auto text-xs text-muted-foreground">{{ group.reports.length }} term{{ group.reports.length !== 1 ? 's' : '' }}</span>
          </button>

          <!-- Terms inside the group -->
          <div v-show="openGroups.has(group.key)" class="mt-3 space-y-3">
            <div
              v-for="r in group.reports"
              :key="r.id"
              class="rounded-lg border bg-muted/20"
            >
              <!-- Term row -->
              <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <button
                  type="button"
                  class="flex flex-1 items-center gap-2 text-left"
                  @click="toggleReport(r.id)"
                >
                  <ChevronDown
                    class="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200"
                    :class="openReports.has(r.id) ? '' : '-rotate-90'"
                  />
                  <span class="font-medium">{{ r.term }}</span>
                  <Badge v-if="r.promotedToClass" variant="secondary" class="gap-1 text-xs">
                    <GraduationCap class="size-3" /> Promoted to {{ r.promotedToClass.name }}
                  </Badge>
                </button>
                <div class="flex flex-wrap items-center gap-2">
                  <span v-if="r.positionInClass" class="rounded bg-background px-2 py-0.5 text-xs font-medium ring-1 ring-border">
                    {{ r.positionInClass }}
                  </span>
                  <span v-if="average(r) !== null" class="rounded bg-background px-2 py-0.5 text-xs font-medium ring-1 ring-border">
                    Avg {{ average(r) }}%
                  </span>
                  <a v-if="r.fileUrl" :href="fileUrl(r.fileUrl)" target="_blank">
                    <Button variant="outline" size="sm" class="h-7 gap-1 text-xs">
                      <Download class="size-3" /> PDF
                    </Button>
                  </a>
                </div>
              </div>

              <!-- Term expandable body -->
              <div v-show="openReports.has(r.id)" class="border-t px-4 pb-4 pt-4 space-y-4">
                <!-- Stats bar -->
                <div v-if="r.positionInClass || r.totalStudents" class="flex flex-wrap gap-4 rounded-lg bg-background px-4 py-3 text-sm ring-1 ring-border">
                  <div v-if="r.positionInClass">
                    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Position in class</p>
                    <p class="mt-0.5 text-lg font-bold">{{ r.positionInClass }}</p>
                  </div>
                  <div v-if="r.totalStudents">
                    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Class size</p>
                    <p class="mt-0.5 text-lg font-bold">{{ r.totalStudents }} students</p>
                  </div>
                  <div v-if="average(r) !== null">
                    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Average score</p>
                    <p class="mt-0.5 text-lg font-bold">{{ average(r) }}%</p>
                  </div>
                </div>

                <!-- Marks table -->
                <div v-if="r.marks?.length">
                  <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject Marks</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead class="text-right">Score</TableHead>
                        <TableHead class="text-center">Grade</TableHead>
                        <TableHead class="hidden sm:table-cell">Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow v-for="mk in r.marks" :key="mk.id">
                        <TableCell>{{ mk.subject?.name }}</TableCell>
                        <TableCell class="text-right font-semibold">{{ mk.score }}</TableCell>
                        <TableCell class="text-center">
                          <span :class="gradeColor(mk.grade)">{{ mk.grade ?? "—" }}</span>
                        </TableCell>
                        <TableCell class="hidden text-sm text-muted-foreground sm:table-cell">{{ mk.comment ?? "" }}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <p v-else class="text-sm text-muted-foreground">No subject marks recorded.</p>

                <!-- Narrative sections -->
                <div v-if="narratives.some(n => r[n.key])" class="grid gap-3 sm:grid-cols-2">
                  <div v-for="n in narratives" v-show="r[n.key]" :key="n.key" class="rounded-lg border bg-background p-3">
                    <div class="mb-1 flex items-center gap-2">
                      <component :is="n.icon" class="size-4" :class="n.cls" />
                      <p class="text-xs font-semibold uppercase tracking-wide">{{ n.label }}</p>
                    </div>
                    <p class="text-sm text-muted-foreground">{{ r[n.key] }}</p>
                  </div>
                </div>

                <!-- Promotion notice -->
                <div v-if="r.promotedToClass" class="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                  <GraduationCap class="size-4 shrink-0" />
                  Promoted to <strong>{{ r.promotedToClass.name }}</strong>
                  <span v-if="r.reopenDate && !r.promotionAppliedAt"> — moves up {{ new Date(r.reopenDate).toLocaleDateString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
