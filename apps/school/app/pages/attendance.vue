<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { BellRing, Check, X, CheckCheck, Send, Eye, UserCircle, Phone, UserPlus } from "lucide-vue-next";
import {
  Card,
  Button,
  Select,
  Input,
  Label,
  Avatar,
  Badge,
  Skeleton,
  SkeletonLines,
  EmptyState,
  Modal,
  useToast,
  Alert,
} from "@repo/ui";
import { useAuthStore } from "~/stores/auth";

const api = useApi();
const auth = useAuthStore();
const { toast } = useToast();
// Only staff (teachers) may mark attendance; admins get a read-only view.
const canMark = computed(() => auth.role === "TEACHER");

const classes = ref<any[]>([]);
const classId = ref("");
const date = ref(new Date().toISOString().slice(0, 10));
const rows = ref<any[]>([]);
const loading = ref(false);

// Admins/heads get a per-class overview instead of the marking roster.
const summary = ref<any[]>([]);

// ---- Attendance marking (teacher) ----
// The register is marked in a dedicated mode and staged locally; nothing is
// saved until the teacher submits the whole day's attendance at once.
const markMode = ref(false);
const confirmAllPresent = ref(false);
const submitting = ref(false);
const pendingCount = computed(() => rows.value.filter((r) => r.pending).length);
const effectiveStatus = (row: any) => row.pending ?? row.record?.status ?? null;

onMounted(async () => {
  if (canMark.value) {
    const c = await api<{ classes: any[] }>("/classes");
    // A homeroom teacher may only mark the register for the class(es) they are
    // assigned to as homeroom teacher — never any other class.
    classes.value = c.classes.filter((k) => k.homeroomTeacher?.id === auth.user?.id);
    if (classes.value[0]) {
      classId.value = classes.value[0].id;
      await loadRoster();
    }
  } else {
    await loadSummary();
  }
});

const classOptions = computed(() => classes.value.map((c) => ({ value: c.id, label: c.name })));

async function loadSummary() {
  loading.value = true;
  try {
    const res = await api<{ classes: any[] }>(`/attendance/summary?date=${date.value}`);
    summary.value = res.classes;
  } finally {
    loading.value = false;
  }
}

async function loadRoster() {
  if (!classId.value) return;
  loading.value = true;
  try {
    const res = await api<{ students: any[] }>(
      `/attendance/roster?classId=${classId.value}&date=${date.value}`,
    );
    rows.value = res.students.map((s) => ({
      ...s,
      record: s.attendance?.[0] ?? null,
      pending: null as string | null,
    }));
  } finally {
    loading.value = false;
  }
}

// Stage a status change locally; it is only persisted on submit.
function setPending(row: any, status: string) {
  row.pending = status;
}

function markAllPresent() {
  rows.value.forEach((r) => (r.pending = "PRESENT"));
  confirmAllPresent.value = false;
}

async function submitAttendance() {
  const entries = rows.value
    .filter((r) => r.pending)
    .map((r) => ({ studentId: r.id, status: r.pending }));
  if (!entries.length) return;
  submitting.value = true;
  try {
    await api("/attendance/bulk", {
      method: "POST",
      body: { classId: classId.value, date: date.value, entries },
    });
    toast({
      title: "Attendance submitted",
      description: `${entries.length} student${entries.length === 1 ? "" : "s"} recorded for the day.`,
      variant: "success",
    });
    // Reload so records (and any absence-alert buttons) reflect what was saved.
    await loadRoster();
  } catch (e) {
    toast({ title: "Could not submit attendance", description: apiError(e), variant: "destructive" });
  } finally {
    submitting.value = false;
  }
}

async function raiseAlert(row: any) {
  try {
    const res = await api<{ alert: any }>(`/attendance/${row.record.id}/alert`, {
      method: "POST",
      body: { message: `${row.firstName} is not at school today. Please let us know why.` },
    });
    row.record.alert = res.alert;
    toast({ title: "Parents alerted", description: `${row.firstName}'s guardians were notified.`, variant: "success" });
  } catch (e) {
    toast({ title: "Could not raise alert", description: apiError(e), variant: "destructive" });
  }
}

const statusVariant = (s?: string) =>
  s === "PRESENT" ? "success" : s === "ABSENT" ? "destructive" : s === "LATE" ? "warning" : "secondary";

// Full student profile shown in the Details modal — the same information as the
// student details page, fetched fresh from /students/:id.
const config = useRuntimeConfig();
const fileUrl = (u?: string | null) =>
  !u ? undefined : u.startsWith("data:") || u.startsWith("http") ? u : `${config.public.apiBase}${u}`;

const showDetails = ref(false);
const detail = ref<any>(null);
const detailLoading = ref(false);

async function openDetails(row: any) {
  detail.value = null;
  showDetails.value = true;
  detailLoading.value = true;
  try {
    const res = await api<{ student: any }>(`/students/${row.id}`);
    detail.value = res.student;
  } finally {
    detailLoading.value = false;
  }
}

// ---- Add student ----
// New pupils are enrolled straight into the teacher's current class.
const showAdd = ref(false);
const saving = ref(false);
const currentClassName = computed(
  () => classes.value.find((c) => c.id === classId.value)?.name ?? "",
);
const emptyForm = () => ({
  firstName: "",
  lastName: "",
  dob: "",
  guardianName: "",
  guardianPhone: "",
  secondaryGuardianName: "",
  secondaryGuardianPhone: "",
  address: "",
});
const form = ref(emptyForm());
const formError = ref("");
const fieldErrors = ref<Record<string, string>>({});

const photoFile = ref<File | null>(null);
const photoPreview = ref("");
function onPhotoPick(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null;
  photoFile.value = f;
  photoPreview.value = f ? URL.createObjectURL(f) : "";
}

async function createStudent() {
  saving.value = true;
  formError.value = "";
  fieldErrors.value = {};
  try {
    // Drop empty optional strings so they don't fail min-length validation.
    const payload = Object.fromEntries(
      Object.entries({ ...form.value, classId: classId.value || undefined }).filter(
        ([, v]) => v !== "",
      ),
    );
    const { student } = await api<{ student: any }>("/students", { method: "POST", body: payload });
    if (photoFile.value) {
      const fd = new FormData();
      fd.append("file", photoFile.value);
      await api(`/students/${student.id}/photo`, { method: "POST", body: fd });
    }
    toast({ title: "Student added", variant: "success" });
    showAdd.value = false;
    form.value = emptyForm();
    photoFile.value = null;
    photoPreview.value = "";
    await loadRoster();
  } catch (e) {
    const fields = apiFieldErrors(e);
    if (fields) fieldErrors.value = fields;
    else formError.value = apiError(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader
      :title="canMark ? 'Students' : 'Attendance'"
      :subtitle="canMark
        ? 'Mark the register and alert parents of absent students.'
        : 'Attendance overview by class — present and absent counts for the day.'"
    >
      <template v-if="canMark" #actions>
        <Button @click="formError = ''; fieldErrors = {}; showAdd = true"><UserPlus class="size-4" /> Add student</Button>
      </template>
    </PageHeader>

    <Card class="mb-4 p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div v-if="canMark" class="space-y-1.5">
          <label class="text-sm font-medium">Class</label>
          <Select v-model="classId" :options="classOptions" class="w-full sm:w-56" @update:model-value="loadRoster" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Date</label>
          <Input v-model="date" type="date" class="w-full sm:w-44" @change="canMark ? loadRoster() : loadSummary()" />
        </div>

        <!-- Marking toggle sits at the far right of the filter row. -->
        <button
          v-if="canMark"
          type="button"
          role="switch"
          :aria-checked="markMode"
          class="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors sm:ml-auto sm:py-1.5"
          :class="markMode ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'"
          @click="markMode = !markMode"
        >
          <span
            class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors"
            :class="markMode ? 'bg-primary' : 'bg-muted-foreground/30'"
          >
            <span
              class="inline-block size-3 rounded-full bg-white transition-transform"
              :class="markMode ? 'translate-x-3.5' : 'translate-x-0.5'"
            />
          </span>
          Mark attendance
        </button>
      </div>
    </Card>

    <!-- Admin / head overview: one card per class with present & absent counts. -->
    <template v-if="!canMark">
      <div v-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card v-for="i in 6" :key="i" class="p-4">
          <div class="flex items-center justify-between gap-2">
            <Skeleton class="h-4 w-20" />
            <Skeleton class="h-5 w-12 rounded-full" />
          </div>
          <div class="mt-4 grid grid-cols-3 gap-2">
            <Skeleton class="h-12 rounded-md" />
            <Skeleton class="h-12 rounded-md" />
            <Skeleton class="h-12 rounded-md" />
          </div>
        </Card>
      </div>
      <EmptyState v-else-if="!summary.length" title="No classes yet">
        <template #icon><Check /></template>
      </EmptyState>
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card v-for="c in summary" :key="c.id" class="p-4">
          <div class="flex items-center justify-between gap-2">
            <p class="font-medium">{{ c.name }}</p>
            <Badge variant="secondary">{{ c.level }}</Badge>
          </div>
          <div class="mt-4 grid grid-cols-3 gap-2 text-center">
            <div class="rounded-md bg-muted/50 py-2">
              <p class="text-xl font-semibold">{{ c.total }}</p>
              <p class="text-xs text-muted-foreground">Total</p>
            </div>
            <div class="rounded-md bg-muted/50 py-2">
              <p class="text-xl font-semibold text-success">{{ c.present }}</p>
              <p class="text-xs text-muted-foreground">Present</p>
            </div>
            <div class="rounded-md bg-muted/50 py-2">
              <p class="text-xl font-semibold text-destructive">{{ c.absent }}</p>
              <p class="text-xs text-muted-foreground">Absent</p>
            </div>
          </div>
        </Card>
      </div>
    </template>

    <template v-else>
    <Card v-if="loading" class="divide-y">
      <div v-for="i in 6" :key="i" class="flex items-center gap-3 p-4">
        <Skeleton class="size-10 shrink-0 rounded-full" />
        <div class="min-w-0 flex-1">
          <Skeleton class="h-4 w-32" />
          <Skeleton class="mt-1.5 h-3 w-20" />
        </div>
      </div>
    </Card>
    <EmptyState v-else-if="!rows.length" title="No students in this class">
      <template #icon><Check /></template>
    </EmptyState>

    <template v-else>
    <!-- Bulk action for the marking session, above the students list. -->
    <div v-if="markMode" class="mb-3 flex justify-end">
      <Button variant="outline" size="sm" @click="confirmAllPresent = true">
        <CheckCheck class="size-4" /> Mark all as present
      </Button>
    </div>

    <Card class="divide-y">
      <div v-for="row in rows" :key="row.id" class="flex flex-wrap items-center gap-3 p-4">
        <Avatar :name="`${row.firstName} ${row.lastName}`" :src="row.photoUrl" class="size-10 shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="font-medium">{{ row.firstName }} {{ row.lastName }}</p>
          <div class="mt-0.5 flex flex-wrap items-center gap-2">
            <Badge :variant="statusVariant(effectiveStatus(row))">
              {{ effectiveStatus(row) ?? "Not marked" }}
            </Badge>
            <Badge v-if="row.pending" variant="secondary" class="text-[10px]">Unsaved</Badge>
            <Badge v-if="row.record?.alert" variant="secondary" class="text-[10px]">
              {{ row.record.alert.status === "RESPONDED" ? "Parent replied" : "Alert sent" }}
            </Badge>
          </div>
        </div>

        <div class="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
          <Button size="sm" variant="ghost" class="flex-1 sm:flex-none" @click="openDetails(row)">
            <Eye class="size-4" /> Details
          </Button>
          <template v-if="markMode">
          <Button
            size="sm"
            class="flex-1 sm:flex-none"
            :variant="effectiveStatus(row) === 'PRESENT' ? 'success' : 'outline'"
            @click="setPending(row, 'PRESENT')"
          >
            <Check class="size-4" /> Present
          </Button>
          <Button
            size="sm"
            class="flex-1 sm:flex-none"
            :variant="effectiveStatus(row) === 'ABSENT' ? 'destructive' : 'outline'"
            @click="setPending(row, 'ABSENT')"
          >
            <X class="size-4" /> Absent
          </Button>
          <Button
            v-if="row.record?.status === 'ABSENT' && !row.record?.alert"
            size="sm"
            class="flex-1 sm:flex-none"
            @click="raiseAlert(row)"
          >
            <BellRing class="size-4" /> Alert parents
          </Button>
          </template>
        </div>
      </div>
    </Card>

    <!-- Submit the whole day's register at once. -->
    <div v-if="markMode" class="mt-4 flex items-center justify-end gap-3">
      <p v-if="pendingCount" class="text-sm text-muted-foreground">
        {{ pendingCount }} unsaved change{{ pendingCount === 1 ? "" : "s" }}
      </p>
      <Button :loading="submitting" :disabled="!pendingCount" @click="submitAttendance">
        <Send class="size-4" /> Submit attendance
      </Button>
    </div>
    </template>
    </template>

    <!-- Add a student to the current class. -->
    <Modal v-model:open="showAdd" title="Add student" :description="currentClassName ? `Enrolling into ${currentClassName}.` : undefined">
      <form class="space-y-3" @submit.prevent="createStudent">
        <Alert v-if="formError" variant="destructive">{{ formError }}</Alert>
        <div class="flex items-center gap-4">
          <Avatar :name="`${form.firstName} ${form.lastName}`" :src="photoPreview" class="size-16 text-lg" />
          <label class="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
            <UserPlus class="size-4" />
            {{ photoFile ? "Change photo" : "Add photo" }}
            <input type="file" accept="image/*" class="hidden" @change="onPhotoPick" />
          </label>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label>First name</Label>
            <Input v-model="form.firstName" required :class="fieldErrors.firstName ? 'border-destructive' : ''" />
            <p v-if="fieldErrors.firstName" class="text-xs text-destructive">{{ fieldErrors.firstName }}</p>
          </div>
          <div class="space-y-1.5">
            <Label>Last name</Label>
            <Input v-model="form.lastName" required :class="fieldErrors.lastName ? 'border-destructive' : ''" />
            <p v-if="fieldErrors.lastName" class="text-xs text-destructive">{{ fieldErrors.lastName }}</p>
          </div>
        </div>
        <div class="space-y-1.5">
          <Label>Date of birth</Label>
          <Input v-model="form.dob" type="date" required :class="fieldErrors.dob ? 'border-destructive' : ''" />
          <p v-if="fieldErrors.dob" class="text-xs text-destructive">{{ fieldErrors.dob }}</p>
        </div>
        <div class="space-y-1.5"><Label>Class</Label><Input :model-value="currentClassName" disabled /></div>
        <div class="border-t pt-3">
          <p class="mb-2 text-sm font-semibold">Parent / guardian</p>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5"><Label>Full name</Label><Input v-model="form.guardianName" placeholder="e.g. John Bello" /></div>
            <div class="space-y-1.5"><Label>Phone number</Label><Input v-model="form.guardianPhone" type="tel" placeholder="e.g. 0803…" /></div>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <div class="space-y-1.5"><Label>Secondary contact name</Label><Input v-model="form.secondaryGuardianName" placeholder="Optional" /></div>
            <div class="space-y-1.5"><Label>Secondary phone</Label><Input v-model="form.secondaryGuardianPhone" type="tel" placeholder="Optional" /></div>
          </div>
          <div class="mt-3 space-y-1.5"><Label>Home / GPS address or landmark</Label><Input v-model="form.address" placeholder="Address, GPS code, or a nearby landmark" /></div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showAdd = false">Cancel</Button>
          <Button type="submit" :loading="saving">Add student</Button>
        </div>
      </form>
    </Modal>

    <!-- Confirm marking every student present. -->
    <Modal
      v-model:open="confirmAllPresent"
      title="Mark all as present?"
      description="This sets every student in the class to Present. You can still change individual students before submitting."
    >
      <div class="flex justify-end gap-2 pt-2">
        <Button variant="outline" @click="confirmAllPresent = false">Cancel</Button>
        <Button @click="markAllPresent"><CheckCheck class="size-4" /> Mark all present</Button>
      </div>
    </Modal>

    <!-- Per-student details — mirrors the student details page. -->
    <Modal
      v-model:open="showDetails"
      :title="detail ? `${detail.firstName} ${detail.lastName}` : 'Student details'"
      class="max-w-xl"
    >
      <div v-if="detailLoading" class="space-y-6">
        <div class="flex items-center gap-3">
          <Skeleton class="size-14 shrink-0 rounded-full" />
          <div class="space-y-1.5">
            <Skeleton class="h-4 w-36" />
            <Skeleton class="h-3 w-24" />
          </div>
        </div>
        <SkeletonLines :lines="3" />
      </div>
      <div v-else-if="detail" class="space-y-6">
        <div class="flex items-center gap-3">
          <Avatar
            :name="`${detail.firstName} ${detail.lastName}`"
            :src="fileUrl(detail.photoUrl)"
            class="size-14 text-lg"
          />
          <div>
            <p class="font-semibold">{{ detail.firstName }} {{ detail.lastName }}</p>
            <p class="text-sm text-muted-foreground">
              {{ detail.admissionNo }} · {{ detail.class?.name ?? "No class" }}
            </p>
            <Badge v-if="detail.isFirstTime" variant="secondary" class="mt-1">First-time student</Badge>
          </div>
        </div>

        <div>
          <h3 class="mb-3 flex items-center gap-2 font-semibold"><UserCircle class="size-5" /> Details</h3>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-muted-foreground">Admission No</dt><dd>{{ detail.admissionNo }}</dd></div>
            <div class="flex justify-between"><dt class="text-muted-foreground">Date of birth</dt><dd>{{ new Date(detail.dob).toLocaleDateString() }}</dd></div>
            <div class="flex justify-between"><dt class="text-muted-foreground">Class</dt><dd>{{ detail.class?.name ?? "—" }}</dd></div>
          </dl>
        </div>

        <div>
          <h3 class="mb-3 flex items-center gap-2 font-semibold"><Phone class="size-5" /> Parent / guardian contact</h3>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-muted-foreground">Guardian</dt><dd>{{ detail.guardianName ?? "—" }}</dd></div>
            <div class="flex justify-between"><dt class="text-muted-foreground">Phone</dt><dd>{{ detail.guardianPhone ?? "—" }}</dd></div>
            <div class="flex justify-between"><dt class="text-muted-foreground">Secondary contact</dt><dd>{{ detail.secondaryGuardianName ?? "—" }}</dd></div>
            <div class="flex justify-between"><dt class="text-muted-foreground">Secondary phone</dt><dd>{{ detail.secondaryGuardianPhone ?? "—" }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="shrink-0 text-muted-foreground">Address / landmark</dt><dd class="text-right">{{ detail.address ?? "—" }}</dd></div>
          </dl>
        </div>

        <div v-if="detail.guardianships?.length">
          <h3 class="mb-3 font-semibold">Guardians</h3>
          <ul class="space-y-2">
            <li v-for="g in detail.guardianships" :key="g.id" class="rounded-md border p-2">
              <p class="text-sm font-medium">{{ g.parent.name }}</p>
              <p class="text-xs text-muted-foreground">{{ g.relation }} · {{ g.parent.email }}</p>
            </li>
          </ul>
        </div>

        <div class="flex justify-end border-t pt-3">
          <NuxtLink :to="`/students/${detail.id}`" class="text-sm text-primary underline">View full profile →</NuxtLink>
        </div>
      </div>
    </Modal>
  </div>
</template>
