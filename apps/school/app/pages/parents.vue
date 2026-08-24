<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { UserPlus, Trash2, Pencil } from "lucide-vue-next";
import {
  Card, Button, Input, Label, Modal, Avatar, SkeletonTable, MultiSelect,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, useToast, Alert,
} from "@repo/ui";
import { Role } from "@repo/shared";

const api = useApi();
const { toast } = useToast();
const loading = ref(true);
const parents = ref<any[]>([]);
const allStudents = ref<any[]>([]);

const showAdd = ref(false);
const saving = ref(false);
const form = ref({ name: "", email: "", password: "", phone: "" });
const selectedStudentIds = ref<string[]>([]);
const formError = ref("");
const fieldErrors = ref<Record<string, string>>({});

// Edit
const showEdit = ref(false);
const editing = ref<any>(null);
const editForm = ref({ name: "", email: "", phone: "" });
const savingEdit = ref(false);
const editFormError = ref("");
const editFieldErrors = ref<Record<string, string>>({});

// Confirm delete
const showConfirm = ref(false);
const confirmId = ref<string>("");
const removing = ref(false);

const studentOptions = computed(() =>
  allStudents.value.map((s) => ({
    value: s.id,
    label: `${s.firstName} ${s.lastName}`,
  })),
);

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
    const [{ users }, { students }] = await Promise.all([
      api<{ users: any[] }>("/users"),
      api<{ students: any[] }>("/students"),
    ]);
    parents.value = users.filter((u) => u.role === Role.PARENT);
    allStudents.value = students;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

function resetForm() {
  form.value = { name: "", email: "", password: "", phone: "" };
  selectedStudentIds.value = [];
  photoFile.value = null;
  photoPreview.value = "";
  formError.value = "";
  fieldErrors.value = {};
}

async function create() {
  saving.value = true;
  formError.value = "";
  fieldErrors.value = {};
  try {
    const { user } = await api<{ user: any }>("/users", {
      method: "POST",
      body: {
        ...form.value,
        role: Role.PARENT,
        phone: form.value.phone || undefined,
      },
    });
    if (photoFile.value) {
      const fd = new FormData();
      fd.append("file", photoFile.value);
      await api(`/users/${user.id}/avatar`, { method: "POST", body: fd });
    }
    await Promise.all(
      selectedStudentIds.value.map((studentId) =>
        api("/students/guardianships", {
          method: "POST",
          body: { parentUserId: user.id, studentId, relation: "Parent" },
        }),
      ),
    );
    toast({ title: "Account created", variant: "success" });
    showAdd.value = false;
    resetForm();
    await load();
  } catch (e) {
    const fields = apiFieldErrors(e);
    if (fields) fieldErrors.value = fields;
    else formError.value = apiError(e);
  } finally {
    saving.value = false;
  }
}

function openEdit(u: any) {
  editing.value = u;
  editForm.value = { name: u.name, email: u.email, phone: u.phone ?? "" };
  editFormError.value = "";
  editFieldErrors.value = {};
  showEdit.value = true;
}

async function saveEdit() {
  if (!editing.value) return;
  savingEdit.value = true;
  editFormError.value = "";
  editFieldErrors.value = {};
  try {
    await api(`/users/${editing.value.id}`, {
      method: "PATCH",
      body: {
        name: editForm.value.name,
        email: editForm.value.email,
        phone: editForm.value.phone || undefined,
      },
    });
    toast({ title: "Account updated", variant: "success" });
    showEdit.value = false;
    await load();
  } catch (e) {
    const fields = apiFieldErrors(e);
    if (fields) editFieldErrors.value = fields;
    else editFormError.value = apiError(e);
  } finally {
    savingEdit.value = false;
  }
}

function askRemove(id: string) {
  confirmId.value = id;
  showConfirm.value = true;
}

async function remove() {
  removing.value = true;
  try {
    await api(`/users/${confirmId.value}`, { method: "DELETE" });
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
    <PageHeader title="Parents" subtitle="Create and manage parent accounts">
      <template #actions><Button @click="resetForm(); showAdd = true"><UserPlus class="size-4" /> New account</Button></template>
    </PageHeader>

    <SkeletonTable v-if="loading" :rows="5" :cols="4" />
    <template v-else>
      <!-- Mobile: stacked cards -->
      <div class="space-y-3 md:hidden">
        <Card v-for="u in parents" :key="u.id" class="p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="flex min-w-0 items-center gap-3">
              <Avatar :name="u.name" :src="u.avatarUrl" class="size-10 shrink-0" />
              <div class="min-w-0">
                <p class="truncate font-medium">{{ u.name }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ u.email }}</p>
              </div>
            </div>
            <div class="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" @click="openEdit(u)"><Pencil class="size-4" /></Button>
              <Button variant="ghost" size="icon" @click="askRemove(u.id)"><Trash2 class="size-4 text-destructive" /></Button>
            </div>
          </div>
          <dl class="mt-3 space-y-1.5 text-sm">
            <div class="flex justify-between gap-2">
              <dt class="text-muted-foreground">Phone</dt>
              <dd>{{ u.phone ?? "—" }}</dd>
            </div>
          </dl>
        </Card>
        <p v-if="!parents.length" class="py-10 text-center text-sm text-muted-foreground">No parents yet.</p>
      </div>

      <!-- Desktop: table -->
      <Card class="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="u in parents" :key="u.id">
              <TableCell>
                <div class="flex items-center gap-2">
                  <Avatar :name="u.name" :src="u.avatarUrl" class="size-8" />
                  <span class="font-medium">{{ u.name }}</span>
                </div>
              </TableCell>
              <TableCell class="text-muted-foreground">{{ u.email }}</TableCell>
              <TableCell class="text-muted-foreground">{{ u.phone ?? "—" }}</TableCell>
              <TableCell>
                <div class="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" @click="openEdit(u)"><Pencil class="size-4" /></Button>
                  <Button variant="ghost" size="icon" @click="askRemove(u.id)"><Trash2 class="size-4 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="!parents.length">
              <TableCell colspan="4" class="py-10 text-center text-sm text-muted-foreground">No parents yet.</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </template>

    <!-- Create -->
    <Modal v-model:open="showAdd" title="New parent account">
      <form class="space-y-3" @submit.prevent="create">
        <Alert v-if="formError" variant="destructive">{{ formError }}</Alert>
        <div class="flex items-center gap-3">
          <Avatar :name="form.name" :src="photoPreview" class="size-16 text-lg" />
          <label class="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
            <UserPlus class="size-4" />
            {{ photoFile ? "Change photo" : "Add photo" }}
            <input type="file" accept="image/*" class="hidden" @change="onPhotoPick" />
          </label>
        </div>
        <div class="space-y-1.5">
          <Label>Full name</Label>
          <Input v-model="form.name" required :class="fieldErrors.name ? 'border-destructive' : ''" />
          <p v-if="fieldErrors.name" class="text-xs text-destructive">{{ fieldErrors.name }}</p>
        </div>
        <div class="space-y-1.5">
          <Label>Email</Label>
          <Input v-model="form.email" type="email" required :class="fieldErrors.email ? 'border-destructive' : ''" />
          <p v-if="fieldErrors.email" class="text-xs text-destructive">{{ fieldErrors.email }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label>Password</Label>
            <Input v-model="form.password" type="text" required :class="fieldErrors.password ? 'border-destructive' : ''" />
            <p v-if="fieldErrors.password" class="text-xs text-destructive">{{ fieldErrors.password }}</p>
            <p v-else class="text-xs text-muted-foreground">At least 6 characters.</p>
          </div>
          <div class="space-y-1.5">
            <Label>Phone</Label>
            <Input v-model="form.phone" :class="fieldErrors.phone ? 'border-destructive' : ''" />
            <p v-if="fieldErrors.phone" class="text-xs text-destructive">{{ fieldErrors.phone }}</p>
          </div>
        </div>
        <div class="space-y-1.5">
          <Label>Linked students <span class="text-muted-foreground font-normal">(optional)</span></Label>
          <MultiSelect
            v-model="selectedStudentIds"
            :options="studentOptions"
            placeholder="Search and select students…"
            searchable
          />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showAdd = false">Cancel</Button>
          <Button type="submit" :loading="saving">Create</Button>
        </div>
      </form>
    </Modal>

    <!-- Edit -->
    <Modal v-model:open="showEdit" :title="`Edit ${editing?.name ?? 'parent'}`">
      <form class="space-y-3" @submit.prevent="saveEdit">
        <Alert v-if="editFormError" variant="destructive">{{ editFormError }}</Alert>
        <div class="space-y-1.5">
          <Label>Full name</Label>
          <Input v-model="editForm.name" required :class="editFieldErrors.name ? 'border-destructive' : ''" />
          <p v-if="editFieldErrors.name" class="text-xs text-destructive">{{ editFieldErrors.name }}</p>
        </div>
        <div class="space-y-1.5">
          <Label>Email</Label>
          <Input v-model="editForm.email" type="email" required />
          <p class="text-xs text-muted-foreground">Editing email here isn't wired up yet — it won't be saved.</p>
        </div>
        <div class="space-y-1.5">
          <Label>Phone</Label>
          <Input v-model="editForm.phone" :class="editFieldErrors.phone ? 'border-destructive' : ''" />
          <p v-if="editFieldErrors.phone" class="text-xs text-destructive">{{ editFieldErrors.phone }}</p>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showEdit = false">Cancel</Button>
          <Button type="submit" :loading="savingEdit">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Confirm delete -->
    <Modal v-model:open="showConfirm" title="Delete parent account?" description="This will permanently delete the account and cannot be undone.">
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="showConfirm = false">Cancel</Button>
        <Button variant="destructive" :loading="removing" @click="remove">Delete</Button>
      </div>
    </Modal>
  </div>
</template>
