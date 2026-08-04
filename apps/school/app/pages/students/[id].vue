<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  Calendar,
  Camera,
  FileText,
  Sparkles,
  UserCircle,
  Upload,
  Link2,
  Trash2,
  Phone,
  MessageCircle,
  ChevronDown,
  Send,
  GraduationCap,
} from "lucide-vue-next";
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  Label,
  Avatar,
  Badge,
  Tabs,
  Select,
  Modal,
  Spinner,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  useToast,
} from "@repo/ui";
import { TERM_OPTIONS } from "@repo/shared";
import { useAuthStore } from "~/stores/auth";

const route = useRoute();
const studentId = route.params.id as string;
const auth = useAuthStore();
const api = useApi();
const { toast } = useToast();
const config = useRuntimeConfig();
const fileUrl = (u?: string | null) =>
  !u ? undefined : u.startsWith("data:") || u.startsWith("http") ? u : `${config.public.apiBase}${u}`;

const tab = ref("profile");
const tabs = [
  { value: "profile", label: "Profile" },
  { value: "photos", label: "Photos" },
  { value: "reports", label: "Reports" },
  { value: "progress", label: "Progress & Talent" },
];

const loading = ref(true);
const student = ref<any>(null);
const media = ref<any[]>([]);
const reports = ref<any[]>([]);
const progress = ref<any[]>([]);
const subjects = ref<any[]>([]);
const parents = ref<any[]>([]);
const classes = ref<any[]>([]);

async function loadAll() {
  loading.value = true;
  try {
    const [s, m, r, p] = await Promise.all([
      api<{ student: any }>(`/students/${studentId}`),
      api<{ media: any[] }>(`/media?studentId=${studentId}`),
      api<{ reports: any[] }>(`/reports?studentId=${studentId}`),
      api<{ reports: any[] }>(`/progress?studentId=${studentId}`),
    ]);
    student.value = s.student;
    media.value = m.media;
    reports.value = r.reports;
    progress.value = p.reports;
  } finally {
    loading.value = false;
  }
}
onMounted(async () => {
  await loadAll();
  const [sub, cls] = await Promise.all([
    api<{ subjects: any[] }>("/subjects"),
    api<{ classes: any[] }>("/classes"),
  ]);
  subjects.value = sub.subjects;
  classes.value = cls.classes;
  if (auth.role === "ADMIN") {
    const pr = await api<{ users: any[] }>("/users?role=PARENT");
    parents.value = pr.users;
  }
});

// ---------- Sharing to parents (WhatsApp + parent portal) ----------
// Only the student's homeroom (class) teacher — or an admin — may share.
const canShare = computed(
  () =>
    auth.role === "ADMIN" ||
    (!!auth.user?.id && student.value?.class?.homeroomTeacherId === auth.user.id),
);
const guardianPhoneDigits = computed(() =>
  (student.value?.guardianPhone ?? "").replace(/[^0-9]/g, ""),
);

function openWhatsApp(text: string) {
  const phone = guardianPhoneDigits.value;
  const encoded = encodeURIComponent(text);
  const waUrl = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  window.open(waUrl, "_blank", "noopener");
  toast({ title: "Opening WhatsApp…", variant: "success" });
}

const studentName = computed(() =>
  student.value ? `${student.value.firstName} ${student.value.lastName}` : "",
);

function profileText() {
  const s = student.value;
  return [
    `${studentName.value} — student profile`,
    `Admission No: ${s.admissionNo}`,
    `Class: ${s.class?.name ?? "—"}`,
    `Date of birth: ${new Date(s.dob).toLocaleDateString()}`,
    s.guardianName ? `Guardian: ${s.guardianName}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
function reportText(r: any) {
  const lines = [`${r.term} ${r.year} report — ${studentName.value}`];
  if (r.positionInClass) lines.push(`Position in class: ${r.positionInClass}`);
  (r.marks ?? []).forEach((mk: any) => lines.push(`• ${mk.subject?.name}: ${mk.score}`));
  if (r.progress) lines.push(`Progress: ${r.progress}`);
  if (r.interest) lines.push(`Interest: ${r.interest}`);
  if (r.strength) lines.push(`Strength: ${r.strength}`);
  if (r.howParentsCanHelp) lines.push(`How parents can help: ${r.howParentsCanHelp}`);
  if (r.promotedToClass?.name) lines.push(`Promoted to: ${r.promotedToClass.name}`);
  const pdf = fileUrl(r.fileUrl);
  if (pdf) lines.push(pdf);
  return lines.join("\n");
}
function progressText(p: any) {
  return [
    `Progress & talent update — ${studentName.value} (${p.term})`,
    p.strengths ? `Strengths: ${p.strengths}` : "",
    p.talents ? `Talents: ${p.talents}` : "",
    p.needs ? `What's needed: ${p.needs}` : "",
    p.howParentsCanHelp ? `How you can help: ${p.howParentsCanHelp}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// Track which item is currently being pushed to the portal for per-button spinners.
const portalSharing = ref<string | null>(null);
async function shareToPortal(key: string, path: string, successMsg: string) {
  portalSharing.value = key;
  try {
    await api(path, { method: "POST" });
    toast({ title: successMsg, variant: "success" });
  } catch (e) {
    toast({ title: "Failed to share", description: apiError(e), variant: "destructive" });
  } finally {
    portalSharing.value = null;
  }
}
const shareProfilePortal = () =>
  shareToPortal("profile", `/students/${studentId}/share-profile`, "Profile sent to parent portal");
const shareReportPortal = (r: any) =>
  shareToPortal(`report-${r.id}`, `/reports/${r.id}/share`, "Report sent to parent portal");
const shareProgressPortal = (p: any) =>
  shareToPortal(`progress-${p.id}`, `/progress/${p.id}/share`, "Progress update sent to parent portal");

// ---------- Photo share ----------
const photoModal = ref(false);
const photoFile = ref<File | null>(null);
const caption = ref("");
const sharing = ref(false);
function onPhotoPick(e: Event) {
  photoFile.value = (e.target as HTMLInputElement).files?.[0] ?? null;
}
async function sharePhoto(target: "portal" | "whatsapp") {
  if (!photoFile.value) return;
  sharing.value = true;
  try {
    const fd = new FormData();
    fd.append("file", photoFile.value);
    fd.append("studentId", studentId);
    if (caption.value) fd.append("caption", caption.value);
    const res = await api<{ media: any }>("/media", { method: "POST", body: fd });

    if (target === "whatsapp") {
      const phone = (student.value?.guardianPhone ?? "").replace(/[^0-9]/g, "");
      const link = fileUrl(res.media?.fileUrl) ?? "";
      const text = encodeURIComponent(
        [caption.value?.trim(), link].filter(Boolean).join("\n"),
      );
      const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
      window.open(waUrl, "_blank", "noopener");
      toast({ title: "Opening WhatsApp…", variant: "success" });
    } else {
      toast({ title: "Photo shared to parent portal", variant: "success" });
    }

    photoModal.value = false;
    caption.value = "";
    photoFile.value = null;
    const m = await api<{ media: any[] }>(`/media?studentId=${studentId}`);
    media.value = m.media;
  } catch (e) {
    toast({ title: "Failed to share", description: apiError(e), variant: "destructive" });
  } finally {
    sharing.value = false;
  }
}

// ---------- Profile photo ----------
const avatarUploading = ref(false);
async function uploadAvatar(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  avatarUploading.value = true;
  try {
    const fd = new FormData();
    fd.append("file", f);
    const res = await api<{ student: any }>(`/students/${studentId}/photo`, {
      method: "POST",
      body: fd,
    });
    student.value.photoUrl = res.student.photoUrl;
    toast({ title: "Photo updated", variant: "success" });
  } finally {
    avatarUploading.value = false;
  }
}

// ---------- Term report ----------
// Each term report is collapsible; the most recent one starts expanded.
const openReports = ref<Record<string, boolean>>({});
function isReportOpen(r: any, idx: number) {
  return openReports.value[r.id] ?? idx === 0;
}
function toggleReport(r: any, idx: number) {
  openReports.value = { ...openReports.value, [r.id]: !isReportOpen(r, idx) };
}

const reportModal = ref(false);
const savingReport = ref(false);
function emptyReportForm() {
  return {
    term: "First Term",
    year: new Date().getFullYear(),
    marks: [] as { subjectId: string; score: number }[],
    promotedToClassId: "",
    reopenDate: "",
    positionInClass: "",
    progress: "",
    interest: "",
    strength: "",
    howParentsCanHelp: "",
  };
}
const reportForm = ref(emptyReportForm());

// A promotion is only captured on the end-of-year (Third Term) report.
const isThirdTerm = computed(() => reportForm.value.term === "Third Term");

// Group reports by the class the student was in when each report was written.
// Reports with no class recorded fall into a "General" bucket.
const groupedReports = computed(() => {
  const groups = new Map<string, { label: string; reports: any[] }>();
  for (const r of reports.value) {
    const key = r.class?.id ?? "__none__";
    if (!groups.has(key)) {
      groups.set(key, { label: r.class?.name ?? "General", reports: [] });
    }
    groups.get(key)!.reports.push(r);
  }
  // Preserve the existing order (most recent class first — reports are sorted by year desc).
  return [...groups.values()];
});

const CLASS_LEVEL_ORDER = ["NURSERY", "PRIMARY", "JUNIOR", "SENIOR"];
const classRank = (c: any): [number, string] => {
  const lvl = CLASS_LEVEL_ORDER.indexOf(c.level);
  return [lvl < 0 ? 99 : lvl, c.name ?? ""];
};
// The current class plus every class that ranks after it — "present and future".
const promotedClassOptions = computed(() => {
  const sorted = [...classes.value].sort((a, b) => {
    const [al, an] = classRank(a);
    const [bl, bn] = classRank(b);
    return al - bl || an.localeCompare(bn);
  });
  const current = student.value?.class;
  const list = !current
    ? sorted
    : sorted.filter((c) => {
        const [l, n] = classRank(c);
        const [cl, cn] = classRank(current);
        return l > cl || (l === cl && n.localeCompare(cn) >= 0);
      });
  return list.map((c) => ({
    value: c.id,
    label: c.id === current?.id ? `${c.name} (current)` : c.name,
  }));
});
function addMarkRow() {
  reportForm.value.marks.push({ subjectId: subjects.value[0]?.id ?? "", score: 0 });
}
async function createReport() {
  savingReport.value = true;
  try {
    await api("/reports", {
      method: "POST",
      body: {
        studentId,
        term: reportForm.value.term,
        year: Number(reportForm.value.year),
        marks: reportForm.value.marks
          .filter((m) => m.subjectId)
          .map((m) => ({ subjectId: m.subjectId, score: Number(m.score) })),
        promotedToClassId:
          isThirdTerm.value && reportForm.value.promotedToClassId
            ? reportForm.value.promotedToClassId
            : null,
        reopenDate:
          isThirdTerm.value && reportForm.value.promotedToClassId && reportForm.value.reopenDate
            ? reportForm.value.reopenDate
            : null,
        positionInClass: reportForm.value.positionInClass || null,
        progress: reportForm.value.progress || null,
        interest: reportForm.value.interest || null,
        strength: reportForm.value.strength || null,
        howParentsCanHelp: reportForm.value.howParentsCanHelp || null,
      },
    });
    toast({ title: "Report published", description: "Parents have been notified.", variant: "success" });
    reportModal.value = false;
    reportForm.value = emptyReportForm();
    const r = await api<{ reports: any[] }>(`/reports?studentId=${studentId}`);
    reports.value = r.reports;
  } catch (e) {
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
  } finally {
    savingReport.value = false;
  }
}
async function uploadReportPdf(reportId: string, e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  const fd = new FormData();
  fd.append("file", f);
  await api(`/reports/${reportId}/file`, { method: "POST", body: fd });
  toast({ title: "PDF attached", variant: "success" });
  const r = await api<{ reports: any[] }>(`/reports?studentId=${studentId}`);
  reports.value = r.reports;
}

// ---------- Progress / talent ----------
const progressModal = ref(false);
const savingProgress = ref(false);
const pForm = ref({ term: "First Term", strengths: "", talents: "", needs: "", howParentsCanHelp: "" });
async function createProgress() {
  savingProgress.value = true;
  try {
    await api("/progress", { method: "POST", body: { studentId, ...pForm.value } });
    toast({ title: "Progress update sent", description: "Parents have been notified.", variant: "success" });
    progressModal.value = false;
    pForm.value = { term: "First Term", strengths: "", talents: "", needs: "", howParentsCanHelp: "" };
    const p = await api<{ reports: any[] }>(`/progress?studentId=${studentId}`);
    progress.value = p.reports;
  } catch (e) {
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
  } finally {
    savingProgress.value = false;
  }
}

// ---------- Guardians (admin) ----------
const linkParentId = ref("");
const relation = ref("Parent");
async function linkGuardian() {
  if (!linkParentId.value) return;
  try {
    await api("/students/guardianships", {
      method: "POST",
      body: { parentUserId: linkParentId.value, studentId, relation: relation.value },
    });
    toast({ title: "Guardian linked", variant: "success" });
    linkParentId.value = "";
    await loadAll();
  } catch (e) {
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
  }
}
async function unlinkGuardian(id: string) {
  await api(`/students/guardianships/${id}`, { method: "DELETE" });
  await loadAll();
}

const subjectOptions = computed(() => subjects.value.map((s) => ({ value: s.id, label: s.name })));
const parentOptions = computed(() =>
  parents.value.map((p) => ({ value: p.id, label: `${p.name} (${p.email})` })),
);
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-20"><Spinner class="size-8 text-primary" /></div>
    <template v-else-if="student">
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div class="relative">
          <Avatar :name="`${student.firstName} ${student.lastName}`" :src="fileUrl(student.photoUrl)" class="size-20 text-xl" />
          <label class="absolute -bottom-1 -right-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Camera class="size-3.5" />
            <input type="file" accept="image/*" class="hidden" @change="uploadAvatar" />
          </label>
        </div>
        <div class="flex-1">
          <h1 class="text-2xl font-bold">{{ student.firstName }} {{ student.lastName }}</h1>
          <p class="text-sm text-muted-foreground">
            {{ student.admissionNo }} · {{ student.class?.name ?? "No class" }}
          </p>
          <Badge v-if="student.isFirstTime" variant="secondary" class="mt-1">First-time student</Badge>
        </div>
      </div>

      <Tabs v-model="tab" :tabs="tabs">
        <!-- PROFILE -->
        <template #profile>
          <Card v-if="canShare" class="mb-6 border-primary/30 bg-primary/5">
            <CardContent class="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="font-medium">Share this profile with parents</p>
                <p class="text-sm text-muted-foreground">Send {{ student.firstName }}'s profile via WhatsApp or the parent portal.</p>
              </div>
              <div class="flex gap-2">
                <Button variant="outline" :loading="portalSharing === 'profile'" @click="shareProfilePortal">
                  <Send class="size-4" /> Parent portal
                </Button>
                <Button @click="openWhatsApp(profileText())">
                  <MessageCircle class="size-4" /> WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
          <div class="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent class="pt-6">
                <h3 class="mb-3 flex items-center gap-2 font-semibold"><UserCircle class="size-5" /> Details</h3>
                <dl class="space-y-2 text-sm">
                  <div class="flex justify-between"><dt class="text-muted-foreground">Admission No</dt><dd>{{ student.admissionNo }}</dd></div>
                  <div class="flex justify-between"><dt class="text-muted-foreground">Date of birth</dt><dd>{{ new Date(student.dob).toLocaleDateString() }}</dd></div>
                  <div class="flex justify-between"><dt class="text-muted-foreground">Class</dt><dd>{{ student.class?.name ?? "—" }}</dd></div>
                </dl>

                <h3 class="mb-3 mt-6 flex items-center gap-2 font-semibold"><Phone class="size-5" /> Parent / guardian contact</h3>
                <dl class="space-y-2 text-sm">
                  <div class="flex justify-between"><dt class="text-muted-foreground">Guardian</dt><dd>{{ student.guardianName ?? "—" }}</dd></div>
                  <div class="flex justify-between"><dt class="text-muted-foreground">Phone</dt><dd>{{ student.guardianPhone ?? "—" }}</dd></div>
                  <div class="flex justify-between"><dt class="text-muted-foreground">Secondary contact</dt><dd>{{ student.secondaryGuardianName ?? "—" }}</dd></div>
                  <div class="flex justify-between"><dt class="text-muted-foreground">Secondary phone</dt><dd>{{ student.secondaryGuardianPhone ?? "—" }}</dd></div>
                  <div class="flex justify-between gap-4"><dt class="shrink-0 text-muted-foreground">Address / landmark</dt><dd class="text-right">{{ student.address ?? "—" }}</dd></div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardContent class="pt-6">
                <h3 class="mb-3 font-semibold">Guardians</h3>
                <ul class="space-y-2">
                  <li v-for="g in student.guardianships" :key="g.id" class="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <p class="text-sm font-medium">{{ g.parent.name }}</p>
                      <p class="text-xs text-muted-foreground">{{ g.relation }} · {{ g.parent.email }}</p>
                    </div>
                    <Button v-if="auth.role === 'ADMIN'" variant="ghost" size="icon" @click="unlinkGuardian(g.id)">
                      <Trash2 class="size-4 text-destructive" />
                    </Button>
                  </li>
                  <li v-if="!student.guardianships?.length" class="text-sm text-muted-foreground">No guardians linked.</li>
                </ul>

                <div v-if="auth.role === 'ADMIN'" class="mt-4 space-y-2 border-t pt-4">
                  <Label>Link a parent</Label>
                  <Select v-model="linkParentId" :options="parentOptions" placeholder="Choose parent" />
                  <div class="flex gap-2">
                    <Input v-model="relation" placeholder="Relation (e.g. Father)" />
                    <Button :disabled="!linkParentId" @click="linkGuardian"><Link2 class="size-4" /> Link</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </template>

        <!-- PHOTOS -->
        <template #photos>
          <div class="mb-4 flex justify-end">
            <Button @click="photoModal = true"><Camera class="size-4" /> Share a photo</Button>
          </div>
          <EmptyState v-if="!media.length" title="No photos shared yet" description="Capture a moment and share it with the parents.">
            <template #icon><Camera /></template>
          </EmptyState>
          <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card v-for="m in media" :key="m.id" class="overflow-hidden">
              <img :src="fileUrl(m.fileUrl)" :alt="m.caption" class="aspect-video w-full object-cover" />
              <CardContent class="pt-4">
                <p v-if="m.caption" class="text-sm">{{ m.caption }}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  by {{ m.teacher.name }} · {{ new Date(m.createdAt).toLocaleDateString() }}
                </p>
              </CardContent>
            </Card>
          </div>
        </template>

        <!-- REPORTS -->
        <template #reports>
          <div class="mb-4 flex justify-end">
            <Button @click="reportModal = true"><FileText class="size-4" /> New term report</Button>
          </div>
          <EmptyState v-if="!reports.length" title="No reports yet">
            <template #icon><FileText /></template>
          </EmptyState>
          <div v-else class="space-y-8">
            <div v-for="group in groupedReports" :key="group.label">
              <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <GraduationCap class="size-4" /> {{ group.label }}
              </h3>
              <div class="space-y-4">
                <Card v-for="(r, idx) in group.reports" :key="r.id">
                  <CardContent class="pt-6">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        class="flex flex-1 items-center gap-2 text-left"
                        :aria-expanded="isReportOpen(r, idx)"
                        @click="toggleReport(r, idx)"
                      >
                        <ChevronDown
                          class="size-4 shrink-0 text-muted-foreground transition-transform"
                          :class="isReportOpen(r, idx) ? '' : '-rotate-90'"
                        />
                        <h4 class="font-semibold">{{ r.term }} {{ r.year }}</h4>
                        <Badge v-if="r.promotedToClass" variant="secondary" class="gap-1">
                          <GraduationCap class="size-3" /> Promoted to {{ r.promotedToClass.name }}
                        </Badge>
                        <Badge v-if="r.reopenDate && !r.promotionAppliedAt && r.promotedToClass" variant="outline" class="gap-1 text-xs">
                          <Calendar class="size-3" /> Moves up {{ new Date(r.reopenDate).toLocaleDateString() }}
                        </Badge>
                      </button>
                      <div class="flex flex-wrap items-center gap-2">
                        <a v-if="r.fileUrl" :href="fileUrl(r.fileUrl)" target="_blank" class="text-sm text-primary underline">View PDF</a>
                        <label class="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                          <Upload class="mr-1 inline size-3.5" />{{ r.fileUrl ? "Replace" : "Attach" }} PDF
                          <input type="file" accept="application/pdf,image/*" class="hidden" @change="(e) => uploadReportPdf(r.id, e)" />
                        </label>
                        <template v-if="canShare">
                          <Button variant="outline" size="sm" :loading="portalSharing === `report-${r.id}`" @click="shareReportPortal(r)">
                            <Send class="size-4" /> Portal
                          </Button>
                          <Button size="sm" @click="openWhatsApp(reportText(r))">
                            <MessageCircle class="size-4" /> WhatsApp
                          </Button>
                        </template>
                      </div>
                    </div>
                    <div v-show="isReportOpen(r, idx)" class="mt-4 space-y-4">
                      <p v-if="r.positionInClass" class="text-sm">
                        <span class="font-medium">Position in class:</span> {{ r.positionInClass }}
                      </p>
                      <Table v-if="r.marks?.length">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead class="text-right">Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow v-for="mk in r.marks" :key="mk.id">
                            <TableCell>{{ mk.subject?.name }}</TableCell>
                            <TableCell class="text-right font-medium">{{ mk.score }}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      <p v-else class="text-sm text-muted-foreground">No subject marks recorded.</p>
                      <div v-if="r.progress"><p class="text-xs font-semibold uppercase text-muted-foreground">Progress</p><p class="text-sm">{{ r.progress }}</p></div>
                      <div v-if="r.interest"><p class="text-xs font-semibold uppercase text-muted-foreground">Interest</p><p class="text-sm">{{ r.interest }}</p></div>
                      <div v-if="r.strength"><p class="text-xs font-semibold uppercase text-muted-foreground">Strength</p><p class="text-sm">{{ r.strength }}</p></div>
                      <div v-if="r.howParentsCanHelp"><p class="text-xs font-semibold uppercase text-muted-foreground">How parents can help</p><p class="text-sm">{{ r.howParentsCanHelp }}</p></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </template>

        <!-- PROGRESS -->
        <template #progress>
          <div class="mb-4 flex justify-end">
            <Button @click="progressModal = true"><Sparkles class="size-4" /> New progress update</Button>
          </div>
          <EmptyState v-if="!progress.length" title="No progress updates yet" description="Share where the child excels and how parents can help.">
            <template #icon><Sparkles /></template>
          </EmptyState>
          <div v-else class="space-y-4">
            <Card v-for="p in progress" :key="p.id">
              <CardContent class="space-y-3 pt-6">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h3 class="font-semibold">{{ p.term }}</h3>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-muted-foreground">{{ p.teacher?.name }} · {{ new Date(p.createdAt).toLocaleDateString() }}</span>
                    <template v-if="canShare">
                      <Button variant="outline" size="sm" :loading="portalSharing === `progress-${p.id}`" @click="shareProgressPortal(p)">
                        <Send class="size-4" /> Portal
                      </Button>
                      <Button size="sm" @click="openWhatsApp(progressText(p))">
                        <MessageCircle class="size-4" /> WhatsApp
                      </Button>
                    </template>
                  </div>
                </div>
                <div><p class="text-xs font-semibold uppercase text-muted-foreground">Strengths</p><p class="text-sm">{{ p.strengths }}</p></div>
                <div><p class="text-xs font-semibold uppercase text-muted-foreground">Talents</p><p class="text-sm">{{ p.talents }}</p></div>
                <div><p class="text-xs font-semibold uppercase text-muted-foreground">What's needed</p><p class="text-sm">{{ p.needs }}</p></div>
                <div><p class="text-xs font-semibold uppercase text-muted-foreground">How parents can help</p><p class="text-sm">{{ p.howParentsCanHelp }}</p></div>
              </CardContent>
            </Card>
          </div>
        </template>
      </Tabs>
    </template>

    <!-- Share photo modal -->
    <Modal v-model:open="photoModal" title="Share a photo" description="Send a photo of this student to their parents.">
      <div class="space-y-3">
        <input type="file" accept="image/*" @change="onPhotoPick" />
        <Textarea v-model="caption" placeholder="Add a caption (optional)…" />
        <div>
          <p class="mb-2 text-xs font-medium text-muted-foreground">Choose how to share</p>
          <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" @click="photoModal = false">Cancel</Button>
            <Button variant="outline" :loading="sharing" :disabled="!photoFile" @click="sharePhoto('portal')">
              <UserCircle class="size-4" /> Parent portal
            </Button>
            <Button :loading="sharing" :disabled="!photoFile" @click="sharePhoto('whatsapp')">
              <MessageCircle class="size-4" /> WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Term report modal -->
    <Modal v-model:open="reportModal" title="New term report" description="Publish a report; parents are notified." class="max-w-xl">
      <div class="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5"><Label>Term</Label><Select v-model="reportForm.term" :options="TERM_OPTIONS" placeholder="Select term" /></div>
          <div class="space-y-1.5"><Label>Year</Label><Input v-model="reportForm.year" type="number" /></div>
        </div>
        <div class="space-y-1.5">
          <Label>Position in class</Label>
          <Input v-model="reportForm.positionInClass" placeholder="e.g. 3rd of 28" />
        </div>
        <div v-if="isThirdTerm" class="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
          <div class="space-y-1.5">
            <Label class="flex items-center gap-1.5"><GraduationCap class="size-4" /> Promoted to</Label>
            <Select
              v-model="reportForm.promotedToClassId"
              :options="promotedClassOptions"
              placeholder="Select the class the student moves up to"
            />
          </div>
          <div v-if="reportForm.promotedToClassId" class="space-y-1.5">
            <Label class="flex items-center gap-1.5"><Calendar class="size-4" /> School reopens</Label>
            <Input v-model="reportForm.reopenDate" type="date" />
            <p class="text-xs text-muted-foreground">On this date, promoted students will automatically be moved up to their new class.</p>
          </div>
          <p v-else class="text-xs text-muted-foreground">End-of-year report: choose the class this student is promoted into.</p>
        </div>
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label>Subject marks</Label>
            <Button variant="outline" size="sm" @click="addMarkRow">Add subject</Button>
          </div>
          <div v-for="(m, i) in reportForm.marks" :key="i" class="flex gap-2">
            <Select v-model="m.subjectId" :options="subjectOptions" class="flex-1" />
            <Input v-model="m.score" type="number" class="w-24" placeholder="Score" />
          </div>
        </div>
        <div class="space-y-1.5"><Label>Progress</Label><Textarea v-model="reportForm.progress" placeholder="How the student has progressed this term…" /></div>
        <div class="space-y-1.5"><Label>Interest</Label><Textarea v-model="reportForm.interest" placeholder="What the student is interested in…" /></div>
        <div class="space-y-1.5"><Label>Strength</Label><Textarea v-model="reportForm.strength" placeholder="Where the student excels…" /></div>
        <div class="space-y-1.5"><Label>How parents can help</Label><Textarea v-model="reportForm.howParentsCanHelp" placeholder="Guidance for parents…" /></div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="reportModal = false">Cancel</Button>
          <Button :loading="savingReport" @click="createReport">Publish</Button>
        </div>
      </div>
    </Modal>

    <!-- Progress modal -->
    <Modal v-model:open="progressModal" title="Progress & talent update" class="max-w-xl">
      <div class="space-y-3">
        <div class="space-y-1.5"><Label>Term</Label><Select v-model="pForm.term" :options="TERM_OPTIONS" placeholder="Select term" /></div>
        <div class="space-y-1.5"><Label>Strengths</Label><Textarea v-model="pForm.strengths" /></div>
        <div class="space-y-1.5"><Label>Talents — where the child excels</Label><Textarea v-model="pForm.talents" /></div>
        <div class="space-y-1.5"><Label>What's needed</Label><Textarea v-model="pForm.needs" /></div>
        <div class="space-y-1.5"><Label>How parents can help</Label><Textarea v-model="pForm.howParentsCanHelp" /></div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="progressModal = false">Cancel</Button>
          <Button :loading="savingProgress" @click="createProgress">Send to parents</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>
