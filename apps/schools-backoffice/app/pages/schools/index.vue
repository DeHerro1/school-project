<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Plus, Trash2, Pencil, Building2 } from "lucide-vue-next";
import {
  Card, Button, Input, Label, Modal, Badge, SkeletonTable,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, useToast,
} from "@repo/ui";
import { SchoolStatus } from "@repo/shared";

const api = useApi();
const { toast } = useToast();

const loading = ref(true);
const schools = ref<any[]>([]);

async function load() {
  loading.value = true;
  try {
    const { schools: list } = await api<{ schools: any[] }>("/schools");
    schools.value = list;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

// ---- create ----
const showAdd = ref(false);
const saving = ref(false);
const emptyForm = () => ({
  name: "", slug: "", email: "", phone: "", address: "",
  adminName: "", adminUsername: "", adminEmail: "", adminPassword: "", adminPhone: "",
});
const form = ref(emptyForm());

async function create() {
  saving.value = true;
  try {
    await api("/schools", {
      method: "POST",
      body: {
        name: form.value.name,
        slug: form.value.slug || undefined,
        email: form.value.email || undefined,
        phone: form.value.phone || undefined,
        address: form.value.address || undefined,
        adminName: form.value.adminName,
        adminUsername: form.value.adminUsername,
        adminEmail: form.value.adminEmail,
        adminPassword: form.value.adminPassword,
        adminPhone: form.value.adminPhone || undefined,
      },
    });
    toast({ title: "School created", description: "Its first admin can now sign in to EduCore.", variant: "success" });
    showAdd.value = false;
    form.value = emptyForm();
    await load();
  } catch (e) {
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
  } finally {
    saving.value = false;
  }
}

// ---- edit ----
const showEdit = ref(false);
const editing = ref<any>(null);
const editForm = ref({ name: "", email: "", phone: "", address: "" });
const savingEdit = ref(false);

function openEdit(s: any) {
  editing.value = s;
  editForm.value = { name: s.name, email: s.email ?? "", phone: s.phone ?? "", address: s.address ?? "" };
  showEdit.value = true;
}

async function saveEdit() {
  if (!editing.value) return;
  savingEdit.value = true;
  try {
    await api(`/schools/${editing.value.id}`, {
      method: "PATCH",
      body: {
        name: editForm.value.name,
        email: editForm.value.email || null,
        phone: editForm.value.phone || null,
        address: editForm.value.address || null,
      },
    });
    toast({ title: "School updated", variant: "success" });
    showEdit.value = false;
    await load();
  } catch (e) {
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
  } finally {
    savingEdit.value = false;
  }
}

// ---- suspend / activate ----
async function toggleStatus(s: any) {
  const next = s.status === SchoolStatus.ACTIVE ? SchoolStatus.SUSPENDED : SchoolStatus.ACTIVE;
  try {
    await api(`/schools/${s.id}`, { method: "PATCH", body: { status: next } });
    toast({
      title: next === SchoolStatus.ACTIVE ? "School reactivated" : "School suspended",
      variant: "success",
    });
    await load();
  } catch (e) {
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
  }
}

// ---- delete ----
const showConfirm = ref(false);
const confirmId = ref<string>("");
const removing = ref(false);

function askRemove(id: string) {
  confirmId.value = id;
  showConfirm.value = true;
}

async function remove() {
  removing.value = true;
  try {
    await api(`/schools/${confirmId.value}`, { method: "DELETE" });
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
    <PageHeader title="Schools" subtitle="Register and manage every school on the platform">
      <template #actions><Button @click="showAdd = true"><Plus class="size-4" /> Add school</Button></template>
    </PageHeader>

    <SkeletonTable v-if="loading" :rows="5" :cols="5" />
    <template v-else>
      <!-- Mobile: stacked cards -->
      <div class="space-y-3 md:hidden">
        <Card v-for="s in schools" :key="s.id" class="p-4">
          <div class="flex items-start justify-between gap-2">
            <NuxtLink :to="`/schools/${s.id}`" class="min-w-0">
              <p class="truncate font-medium hover:underline">{{ s.name }}</p>
              <p class="truncate text-xs text-muted-foreground">{{ s.email ?? "—" }}</p>
            </NuxtLink>
            <div class="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" @click="openEdit(s)"><Pencil class="size-4" /></Button>
              <Button variant="ghost" size="icon" @click="askRemove(s.id)"><Trash2 class="size-4 text-destructive" /></Button>
            </div>
          </div>
          <dl class="mt-3 space-y-1.5 text-sm">
            <div class="flex justify-between gap-2">
              <dt class="text-muted-foreground">Students</dt>
              <dd>{{ s.counts?.students ?? 0 }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-muted-foreground">Staff</dt>
              <dd>{{ s.counts?.staff ?? 0 }}</dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-muted-foreground">Status</dt>
              <dd>
                <button @click="toggleStatus(s)">
                  <Badge :variant="s.status === 'ACTIVE' ? 'success' : 'warning'">
                    {{ s.status === "ACTIVE" ? "Active" : "Suspended" }}
                  </Badge>
                </button>
              </dd>
            </div>
          </dl>
        </Card>
        <p v-if="!schools.length" class="py-10 text-center text-sm text-muted-foreground">No schools yet.</p>
      </div>

      <!-- Desktop: table -->
      <Card class="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="s in schools" :key="s.id">
              <TableCell>
                <NuxtLink :to="`/schools/${s.id}`" class="font-medium hover:underline">{{ s.name }}</NuxtLink>
                <p class="text-xs text-muted-foreground">{{ s.email ?? "—" }}</p>
              </TableCell>
              <TableCell>{{ s.counts?.students ?? 0 }}</TableCell>
              <TableCell>{{ s.counts?.staff ?? 0 }}</TableCell>
              <TableCell>
                <button @click="toggleStatus(s)" :title="s.status === 'ACTIVE' ? 'Click to suspend' : 'Click to reactivate'">
                  <Badge :variant="s.status === 'ACTIVE' ? 'success' : 'warning'">
                    {{ s.status === "ACTIVE" ? "Active" : "Suspended" }}
                  </Badge>
                </button>
              </TableCell>
              <TableCell>
                <div class="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" title="Edit school" @click="openEdit(s)">
                    <Pencil class="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete school" @click="askRemove(s.id)">
                    <Trash2 class="size-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="!schools.length">
              <TableCell colspan="5" class="py-10 text-center text-sm text-muted-foreground">No schools yet.</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </template>

    <!-- Create: school + its first admin -->
    <Modal v-model:open="showAdd" title="Add a school" description="Registers the school and creates its first admin account for EduCore.">
      <form class="space-y-4" @submit.prevent="create">
        <div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Building2 class="size-4" /> School details
        </div>
        <div class="space-y-1.5"><Label>Name</Label><Input v-model="form.name" placeholder="e.g. Green Hills Academy" required /></div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5"><Label>Slug <span class="text-muted-foreground font-normal">(optional)</span></Label><Input v-model="form.slug" placeholder="auto-generated" /></div>
          <div class="space-y-1.5"><Label>Phone</Label><Input v-model="form.phone" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5"><Label>Email</Label><Input v-model="form.email" type="email" /></div>
          <div class="space-y-1.5"><Label>Address</Label><Input v-model="form.address" /></div>
        </div>

        <div class="border-t pt-3 text-sm font-medium text-muted-foreground">First admin account</div>
        <div class="space-y-1.5"><Label>Full name</Label><Input v-model="form.adminName" required /></div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5"><Label>Username</Label><Input v-model="form.adminUsername" placeholder="e.g. head" required /></div>
          <div class="space-y-1.5"><Label>Phone</Label><Input v-model="form.adminPhone" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5"><Label>Email</Label><Input v-model="form.adminEmail" type="email" required /></div>
          <div class="space-y-1.5"><Label>Password</Label><Input v-model="form.adminPassword" type="text" required /></div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showAdd = false">Cancel</Button>
          <Button type="submit" :loading="saving">Create school</Button>
        </div>
      </form>
    </Modal>

    <!-- Edit -->
    <Modal v-model:open="showEdit" :title="`Edit ${editing?.name ?? 'school'}`">
      <form class="space-y-3" @submit.prevent="saveEdit">
        <div class="space-y-1.5"><Label>Name</Label><Input v-model="editForm.name" required /></div>
        <div class="space-y-1.5"><Label>Email</Label><Input v-model="editForm.email" type="email" /></div>
        <div class="space-y-1.5"><Label>Phone</Label><Input v-model="editForm.phone" /></div>
        <div class="space-y-1.5"><Label>Address</Label><Input v-model="editForm.address" /></div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showEdit = false">Cancel</Button>
          <Button type="submit" :loading="savingEdit">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Confirm delete -->
    <Modal v-model:open="showConfirm" title="Delete school?" description="This permanently deletes the school and all of its staff, students, classes and records. This cannot be undone.">
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="showConfirm = false">Cancel</Button>
        <Button variant="destructive" :loading="removing" @click="remove">Delete</Button>
      </div>
    </Modal>
  </div>
</template>
