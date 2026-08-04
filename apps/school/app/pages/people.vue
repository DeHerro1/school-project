<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { UserPlus, Trash2 } from "lucide-vue-next";
import {
  Card, Button, Input, Label, Select, Modal, Tabs, Avatar, Badge, Spinner,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, useToast,
} from "@repo/ui";
import { Role } from "@repo/shared";

const api = useApi();
const { toast } = useToast();
const loading = ref(true);
const users = ref<any[]>([]);
const tab = ref("TEACHER");
const tabs = [
  { value: "TEACHER", label: "Teachers" },
  { value: "ADMIN", label: "Admins" },
];

const showAdd = ref(false);
const saving = ref(false);
const form = ref({ name: "", email: "", username: "", password: "", phone: "", role: Role.TEACHER as string });
const isStaffRole = true;
const roleOptions = [
  { value: Role.TEACHER, label: "Teacher" },
  { value: Role.ADMIN, label: "Admin" },
];

// Optional profile photo, uploaded after the account is created.
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
    users.value = (await api<{ users: any[] }>("/users")).users;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const byRole = (r: string) => computed(() => users.value.filter((u) => u.role === r));
const teachers = byRole("TEACHER");
const admins = byRole("ADMIN");
const rowsForTab = (v: string) => v === "TEACHER" ? teachers.value : admins.value;

async function create() {
  saving.value = true;
  try {
    const { user } = await api<{ user: any }>("/users", {
      method: "POST",
      body: {
        ...form.value,
        phone: form.value.phone || undefined,
        username: isStaffRole.value ? form.value.username : undefined,
      },
    });
    // Upload the profile photo once the account exists.
    if (photoFile.value) {
      const fd = new FormData();
      fd.append("file", photoFile.value);
      await api(`/users/${user.id}/avatar`, { method: "POST", body: fd });
    }
    toast({ title: "Account created", variant: "success" });
    showAdd.value = false;
    form.value = { name: "", email: "", username: "", password: "", phone: "", role: Role.TEACHER };
    photoFile.value = null;
    photoPreview.value = "";
    await load();
  } catch (e) {
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
  } finally {
    saving.value = false;
  }
}
async function remove(id: string) {
  await api(`/users/${id}`, { method: "DELETE" });
  await load();
}
</script>

<template>
  <div>
    <PageHeader title="Staff" subtitle="Create and manage staff accounts">
      <template #actions><Button @click="showAdd = true"><UserPlus class="size-4" /> New account</Button></template>
    </PageHeader>

    <div v-if="loading" class="flex justify-center py-16"><Spinner class="size-7 text-primary" /></div>
    <Tabs v-else v-model="tab" :tabs="tabs">
      <template v-for="t in tabs" :key="t.value" #[t.value]>
        <!-- Mobile: stacked cards -->
        <div class="space-y-3 md:hidden">
          <Card v-for="u in rowsForTab(t.value)" :key="u.id" class="p-4">
            <div class="flex items-start justify-between gap-2">
              <div class="flex min-w-0 items-center gap-3">
                <Avatar :name="u.name" :src="u.avatarUrl" class="size-10 shrink-0" />
                <div class="min-w-0">
                  <p class="truncate font-medium">{{ u.name }}</p>
                  <p class="truncate text-xs text-muted-foreground">{{ u.email }}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" class="shrink-0" @click="remove(u.id)"><Trash2 class="size-4 text-destructive" /></Button>
            </div>
            <dl class="mt-3 space-y-1.5 text-sm">
              <div v-if="t.value !== 'PARENT'" class="flex justify-between gap-2">
                <dt class="text-muted-foreground">Username</dt>
                <dd class="truncate">{{ u.username ?? "—" }}</dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-muted-foreground">Phone</dt>
                <dd>{{ u.phone ?? "—" }}</dd>
              </div>
            </dl>
          </Card>
          <p v-if="!rowsForTab(t.value).length" class="py-10 text-center text-sm text-muted-foreground">No accounts yet.</p>
        </div>

        <!-- Desktop: table -->
        <Card class="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead v-if="t.value !== 'PARENT'">Username</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="u in rowsForTab(t.value)"
                :key="u.id"
              >
                <TableCell>
                  <div class="flex items-center gap-2">
                    <Avatar :name="u.name" :src="u.avatarUrl" class="size-8" />
                    <span class="font-medium">{{ u.name }}</span>
                  </div>
                </TableCell>
                <TableCell v-if="t.value !== 'PARENT'" class="text-muted-foreground">{{ u.username ?? "—" }}</TableCell>
                <TableCell class="text-muted-foreground">{{ u.email }}</TableCell>
                <TableCell class="text-muted-foreground">{{ u.phone ?? "—" }}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" @click="remove(u.id)"><Trash2 class="size-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </template>
    </Tabs>

    <Modal v-model:open="showAdd" title="New account">
      <form class="space-y-3" @submit.prevent="create">
        <div class="flex items-center gap-3">
          <Avatar :name="form.name" :src="photoPreview" class="size-16 text-lg" />
          <label class="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
            <UserPlus class="size-4" />
            {{ photoFile ? "Change photo" : "Add photo" }}
            <input type="file" accept="image/*" class="hidden" @change="onPhotoPick" />
          </label>
        </div>
        <div class="space-y-1.5"><Label>Role</Label><Select v-model="form.role" :options="roleOptions" /></div>
        <div class="space-y-1.5"><Label>Full name</Label><Input v-model="form.name" required /></div>
        <div class="space-y-1.5"><Label>Email</Label><Input v-model="form.email" type="email" required /></div>
        <div v-if="isStaffRole" class="space-y-1.5">
          <Label>Username</Label>
          <Input v-model="form.username" placeholder="Used to sign in — e.g. sarah" autocapitalize="none" :required="isStaffRole" />
          <p class="text-xs text-muted-foreground">Staff sign in with this username. Letters, numbers, and . _ - only.</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5"><Label>Password</Label><Input v-model="form.password" type="text" required /></div>
          <div class="space-y-1.5"><Label>Phone</Label><Input v-model="form.phone" /></div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showAdd = false">Cancel</Button>
          <Button type="submit" :loading="saving">Create</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
