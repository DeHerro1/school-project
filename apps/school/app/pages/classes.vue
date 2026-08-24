<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { Plus, Trash2, Pencil } from "lucide-vue-next";
import {
  Card, Button, Input, Label, Select, MultiSelect, Modal, Badge, SkeletonTable,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, useToast, Alert,
} from "@repo/ui";
import { ClassLevel } from "@repo/shared";
import { useAuthStore } from "~/stores/auth";

const api = useApi();
const auth = useAuthStore();
const { toast } = useToast();
const isAdmin = computed(() => auth.role === "ADMIN");

const loading = ref(true);
const classes = ref<any[]>([]);
const teachers = ref<any[]>([]);
const subjects = ref<any[]>([]);
const showAdd = ref(false);
const saving = ref(false);
// reka-ui SelectItem forbids empty-string values (it reserves "" for "no selection").
const NONE_TEACHER = "__none__";

const form = ref({
  name: "",
  level: ClassLevel.NURSERY as string,
  homeroomTeacherId: NONE_TEACHER as string,
  studentCount: "" as number | string,
  subjectsOffered: [] as string[],
});

const showEdit = ref(false);
const editing = ref<any>(null);
const editForm = ref({ studentCount: "" as number | string, subjectsOffered: [] as string[], homeroomTeacherId: NONE_TEACHER as string });
const formError = ref("");
const fieldErrors = ref<Record<string, string>>({});
const editFormError = ref("");
const editFieldErrors = ref<Record<string, string>>({});

// Confirm delete
const showConfirm = ref(false);
const confirmId = ref<string>("");
const removing = ref(false);

// "Senior" isn't offered when adding/editing a class — this school only runs
// Nursery through Junior — but the enum value stays (existing SENIOR classes,
// if any, keep working; see CLASS_LEVEL_ORDER in students/[id].vue).
const levelOptions = Object.values(ClassLevel)
  .filter((l) => l !== ClassLevel.SENIOR)
  .map((l) => ({ value: l, label: l }));
const teacherOptions = computed(() => [
  { value: NONE_TEACHER, label: "— none —" },
  ...teachers.value.map((t) => ({ value: t.id, label: t.name })),
]);
const subjectOptions = computed(() =>
  subjects.value.map((s) => ({ value: s.name, label: s.name })),
);

// subjectsOffered is stored as a comma-separated string; convert to/from an array.
const toList = (s?: string | null) =>
  (s ?? "").split(",").map((v) => v.trim()).filter(Boolean);

async function load() {
  loading.value = true;
  try {
    const reqs: Promise<any>[] = [
      api<{ classes: any[] }>("/classes"),
      api<{ subjects: any[] }>("/subjects"),
    ];
    // Only admins can list users; staff don't pick homeroom teachers.
    if (isAdmin.value) reqs.push(api<{ users: any[] }>("/users?role=TEACHER"));
    const [c, s, t] = await Promise.all(reqs);
    classes.value = c.classes;
    subjects.value = s.subjects;
    teachers.value = t?.users ?? [];
  } finally {
    loading.value = false;
  }
}
onMounted(load);

async function create() {
  saving.value = true;
  formError.value = "";
  fieldErrors.value = {};
  try {
    await api("/classes", {
      method: "POST",
      body: {
        name: form.value.name,
        level: form.value.level,
        homeroomTeacherId: form.value.homeroomTeacherId === NONE_TEACHER ? undefined : form.value.homeroomTeacherId,
        studentCount: form.value.studentCount === "" ? undefined : Number(form.value.studentCount),
        subjectsOffered: form.value.subjectsOffered.length ? form.value.subjectsOffered.join(", ") : undefined,
      },
    });
    toast({ title: "Class created", variant: "success" });
    showAdd.value = false;
    form.value = { name: "", level: ClassLevel.NURSERY, homeroomTeacherId: NONE_TEACHER, studentCount: "", subjectsOffered: [] };
    await load();
  } catch (e) {
    const fields = apiFieldErrors(e);
    if (fields) fieldErrors.value = fields;
    else formError.value = apiError(e);
  } finally {
    saving.value = false;
  }
}

function openEdit(c: any) {
  editing.value = c;
  editForm.value = {
    studentCount: c.studentCount ?? "",
    subjectsOffered: toList(c.subjectsOffered),
    homeroomTeacherId: c.homeroomTeacherId ?? NONE_TEACHER,
  };
  editFormError.value = "";
  editFieldErrors.value = {};
  showEdit.value = true;
}

async function saveEdit() {
  if (!editing.value) return;
  saving.value = true;
  editFormError.value = "";
  editFieldErrors.value = {};
  try {
    await api(`/classes/${editing.value.id}`, {
      method: "PATCH",
      body: {
        studentCount: editForm.value.studentCount === "" ? undefined : Number(editForm.value.studentCount),
        subjectsOffered: editForm.value.subjectsOffered.length ? editForm.value.subjectsOffered.join(", ") : undefined,
        ...(isAdmin.value && { homeroomTeacherId: editForm.value.homeroomTeacherId === NONE_TEACHER ? null : editForm.value.homeroomTeacherId }),
      },
    });
    toast({ title: "Class updated", variant: "success" });
    showEdit.value = false;
    await load();
  } catch (e) {
    const fields = apiFieldErrors(e);
    if (fields) editFieldErrors.value = fields;
    else editFormError.value = apiError(e);
  } finally {
    saving.value = false;
  }
}

function askRemove(id: string) {
  confirmId.value = id;
  showConfirm.value = true;
}

async function remove() {
  removing.value = true;
  try {
    await api(`/classes/${confirmId.value}`, { method: "DELETE" });
    showConfirm.value = false;
    await load();
  } catch (e) {
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
  } finally {
    removing.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Classes"
      :subtitle="isAdmin ? 'Manage classes, roll counts and subjects' : 'Update roll counts and subjects for your classes'"
    >
      <template v-if="isAdmin" #actions>
        <Button @click="formError = ''; fieldErrors = {}; showAdd = true"><Plus class="size-4" /> New class</Button>
      </template>
    </PageHeader>

    <SkeletonTable v-if="loading" :rows="5" :cols="4" />

    <template v-else>
      <!-- Mobile: stacked cards -->
      <div class="space-y-3 md:hidden">
        <Card v-for="c in classes" :key="c.id" class="p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-medium">{{ c.name }}</p>
              <Badge variant="secondary" class="mt-1">{{ c.level }}</Badge>
            </div>
            <div class="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" title="Edit students & subjects" @click="openEdit(c)">
                <Pencil class="size-4" />
              </Button>
              <Button v-if="isAdmin" variant="ghost" size="icon" title="Delete class" @click="askRemove(c.id)">
                <Trash2 class="size-4 text-destructive" />
              </Button>
            </div>
          </div>
          <dl class="mt-3 space-y-1.5 text-sm">
            <div class="flex justify-between gap-2">
              <dt class="text-muted-foreground">Homeroom teacher</dt>
              <dd class="text-right">{{ c.homeroomTeacher?.name ?? "—" }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-muted-foreground">No. of students</dt>
              <dd>{{ c.studentCount ?? c._count?.students ?? 0 }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="shrink-0 text-muted-foreground">Subjects</dt>
              <dd class="text-right text-muted-foreground">{{ c.subjectsOffered ?? "—" }}</dd>
            </div>
          </dl>
        </Card>
        <p v-if="!classes.length" class="py-10 text-center text-sm text-muted-foreground">No classes yet.</p>
      </div>

      <!-- Desktop: table -->
      <Card class="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Homeroom teacher</TableHead>
              <TableHead>No. of students</TableHead>
              <TableHead>Subjects offered</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="c in classes" :key="c.id">
              <TableCell class="font-medium">{{ c.name }}</TableCell>
              <TableCell><Badge variant="secondary">{{ c.level }}</Badge></TableCell>
              <TableCell>{{ c.homeroomTeacher?.name ?? "—" }}</TableCell>
              <TableCell>{{ c.studentCount ?? c._count?.students ?? 0 }}</TableCell>
              <TableCell class="max-w-[16rem] truncate text-muted-foreground">{{ c.subjectsOffered ?? "—" }}</TableCell>
              <TableCell>
                <div class="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" title="Edit students & subjects" @click="openEdit(c)">
                    <Pencil class="size-4" />
                  </Button>
                  <Button v-if="isAdmin" variant="ghost" size="icon" title="Delete class" @click="askRemove(c.id)">
                    <Trash2 class="size-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="!classes.length"><TableCell colspan="6" class="py-10 text-center text-muted-foreground">No classes yet.</TableCell></TableRow>
          </TableBody>
        </Table>
      </Card>
    </template>

    <!-- Create (admin only) -->
    <Modal v-model:open="showAdd" title="New class">
      <form class="space-y-3" @submit.prevent="create">
        <Alert v-if="formError" variant="destructive">{{ formError }}</Alert>
        <div class="space-y-1.5">
          <Label>Name</Label>
          <Input v-model="form.name" placeholder="e.g. Nursery A" required :class="fieldErrors.name ? 'border-destructive' : ''" />
          <p v-if="fieldErrors.name" class="text-xs text-destructive">{{ fieldErrors.name }}</p>
        </div>
        <div class="space-y-1.5">
          <Label>Level</Label>
          <Select v-model="form.level" :options="levelOptions" />
          <p v-if="fieldErrors.level" class="text-xs text-destructive">{{ fieldErrors.level }}</p>
        </div>
        <div class="space-y-1.5"><Label>Homeroom teacher</Label><Select v-model="form.homeroomTeacherId" :options="teacherOptions" placeholder="Optional" /></div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label>Number of students</Label>
            <Input v-model="form.studentCount" type="number" min="0" placeholder="e.g. 25" :class="fieldErrors.studentCount ? 'border-destructive' : ''" />
            <p v-if="fieldErrors.studentCount" class="text-xs text-destructive">{{ fieldErrors.studentCount }}</p>
          </div>
        </div>
        <div class="space-y-1.5">
          <Label>Subjects offered</Label>
          <MultiSelect v-model="form.subjectsOffered" :options="subjectOptions" placeholder="Select subjects…" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showAdd = false">Cancel</Button>
          <Button type="submit" :loading="saving">Create</Button>
        </div>
      </form>
    </Modal>

    <!-- Confirm delete -->
    <Modal v-model:open="showConfirm" title="Delete class?" description="This will permanently delete the class and cannot be undone.">
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="showConfirm = false">Cancel</Button>
        <Button variant="destructive" :loading="removing" @click="remove">Delete</Button>
      </div>
    </Modal>

    <!-- Edit class (admin + staff) -->
    <Modal v-model:open="showEdit" :title="`Edit ${editing?.name ?? 'class'}`">
      <form class="space-y-3" @submit.prevent="saveEdit">
        <Alert v-if="editFormError" variant="destructive">{{ editFormError }}</Alert>
        <div v-if="isAdmin" class="space-y-1.5">
          <Label>Homeroom teacher</Label>
          <Select v-model="editForm.homeroomTeacherId" :options="teacherOptions" />
        </div>
        <div v-else class="space-y-1.5">
          <Label>Homeroom teacher</Label>
          <p class="text-sm text-foreground">{{ editing?.homeroomTeacher?.name ?? "—" }}</p>
        </div>
        <div class="space-y-1.5">
          <Label>Number of students</Label>
          <Input v-model="editForm.studentCount" type="number" min="0" :class="editFieldErrors.studentCount ? 'border-destructive' : ''" />
          <p v-if="editFieldErrors.studentCount" class="text-xs text-destructive">{{ editFieldErrors.studentCount }}</p>
        </div>
        <div class="space-y-1.5"><Label>Subjects offered</Label><MultiSelect v-model="editForm.subjectsOffered" :options="subjectOptions" placeholder="Select subjects…" /></div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showEdit = false">Cancel</Button>
          <Button type="submit" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
