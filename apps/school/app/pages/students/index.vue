<script setup lang="ts">
import { ref, onMounted } from "vue";
import { UserPlus, Search } from "lucide-vue-next";
import {
  Button,
  Input,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Avatar,
  Badge,
  Modal,
  Label,
  Select,
  SkeletonTable,
  useToast,
  Alert,
} from "@repo/ui";
import { useAuthStore } from "~/stores/auth";

const auth = useAuthStore();
const api = useApi();
const { toast } = useToast();

const loading = ref(true);
const students = ref<any[]>([]);
const classes = ref<any[]>([]);
const search = ref("");

const showAdd = ref(false);
const saving = ref(false);
const emptyForm = () => ({
  firstName: "",
  lastName: "",
  dob: "",
  classId: "",
  guardianName: "",
  guardianPhone: "",
  secondaryGuardianName: "",
  secondaryGuardianPhone: "",
  address: "",
});
const form = ref(emptyForm());
const formError = ref("");
const fieldErrors = ref<Record<string, string>>({});

// Optional profile photo, uploaded after the student record is created.
const photoFile = ref<File | null>(null);
const photoPreview = ref<string>("");
function onPhotoPick(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null;
  photoFile.value = f;
  photoPreview.value = f ? URL.createObjectURL(f) : "";
}

async function load() {
  loading.value = true;
  try {
    const [s, c] = await Promise.all([
      api<{ students: any[] }>("/students"),
      api<{ classes: any[] }>("/classes"),
    ]);
    students.value = s.students;
    classes.value = c.classes;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const filtered = computed(() =>
  students.value.filter((s) =>
    `${s.firstName} ${s.lastName} ${s.admissionNo}`
      .toLowerCase()
      .includes(search.value.toLowerCase()),
  ),
);

const classOptions = computed(() =>
  classes.value.map((c) => ({ value: c.id, label: c.name })),
);

async function createStudent() {
  saving.value = true;
  formError.value = "";
  fieldErrors.value = {};
  try {
    // Drop empty optional strings so they don't fail min-length validation.
    const payload = Object.fromEntries(
      Object.entries({ ...form.value, classId: form.value.classId || undefined }).filter(
        ([, v]) => v !== "",
      ),
    );
    const { student } = await api<{ student: any }>("/students", { method: "POST", body: payload });
    // Upload the profile photo once the student record exists.
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
    await load();
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
    <PageHeader title="Students" subtitle="All enrolled students">
      <template #actions>
        <Button v-if="auth.role === 'ADMIN'" @click="formError = ''; fieldErrors = {}; showAdd = true">
          <UserPlus class="size-4" /> Add student
        </Button>
      </template>
    </PageHeader>

    <div class="mb-4 relative max-w-sm">
      <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input v-model="search" placeholder="Search students…" class="pl-9" />
    </div>

    <SkeletonTable v-if="loading" :rows="6" :cols="5" />

    <template v-else>
      <!-- Mobile: tappable cards -->
      <div class="space-y-3 sm:hidden">
        <NuxtLink
          v-for="s in filtered"
          :key="s.id"
          :to="`/students/${s.id}`"
          class="block"
        >
          <Card class="flex items-center gap-3 p-3">
            <Avatar :name="`${s.firstName} ${s.lastName}`" :src="s.photoUrl" class="size-11 shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ s.firstName }} {{ s.lastName }}</p>
              <p class="truncate text-xs text-muted-foreground">
                {{ s.admissionNo }} · {{ s.class?.name ?? "No class" }}
              </p>
              <Badge v-if="s.isFirstTime" variant="secondary" class="mt-1 text-[10px]">First-time</Badge>
            </div>
            <span class="shrink-0 text-muted-foreground">›</span>
          </Card>
        </NuxtLink>
        <p v-if="!filtered.length" class="py-10 text-center text-sm text-muted-foreground">No students found.</p>
      </div>

      <!-- Desktop: table -->
      <Card class="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Admission&nbsp;No</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Guardians</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="s in filtered" :key="s.id">
              <TableCell>
                <div class="flex items-center gap-3">
                  <Avatar :name="`${s.firstName} ${s.lastName}`" :src="s.photoUrl" class="size-9" />
                  <div>
                    <p class="font-medium">{{ s.firstName }} {{ s.lastName }}</p>
                    <Badge v-if="s.isFirstTime" variant="secondary" class="mt-0.5 text-[10px]">
                      First-time
                    </Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell class="text-muted-foreground">{{ s.admissionNo }}</TableCell>
              <TableCell>{{ s.class?.name ?? "—" }}</TableCell>
              <TableCell class="text-muted-foreground">{{ s.guardianships?.length ?? 0 }}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" :as="'div'">
                  <NuxtLink :to="`/students/${s.id}`">Open</NuxtLink>
                </Button>
              </TableCell>
            </TableRow>
            <TableRow v-if="!filtered.length">
              <TableCell colspan="5" class="py-10 text-center text-muted-foreground">
                No students found.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </template>

    <Modal v-model:open="showAdd" title="Add student" description="Enrol a new student.">
      <form class="space-y-3" @submit.prevent="createStudent">
        <Alert v-if="formError" variant="destructive">{{ formError }}</Alert>
        <div class="flex items-center gap-3">
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
        <div class="space-y-1.5">
          <Label>Class</Label>
          <Select v-model="form.classId" :options="classOptions" placeholder="Select class" />
        </div>
        <div class="border-t pt-3">
          <p class="mb-2 text-sm font-semibold">Parent / guardian</p>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label>Full name</Label>
              <Input v-model="form.guardianName" placeholder="e.g. John Bello" />
            </div>
            <div class="space-y-1.5">
              <Label>Phone number</Label>
              <Input v-model="form.guardianPhone" type="tel" placeholder="e.g. 0803…" />
            </div>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label>Secondary contact name</Label>
              <Input v-model="form.secondaryGuardianName" placeholder="Optional" />
            </div>
            <div class="space-y-1.5">
              <Label>Secondary phone</Label>
              <Input v-model="form.secondaryGuardianPhone" type="tel" placeholder="Optional" />
            </div>
          </div>
          <div class="mt-3 space-y-1.5">
            <Label>Home / GPS address or landmark</Label>
            <Input v-model="form.address" placeholder="Address, GPS code, or a nearby landmark" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showAdd = false">Cancel</Button>
          <Button type="submit" :loading="saving">Add student</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
