<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ArrowLeft, GraduationCap, Users, BookOpen, Pencil, Trash2, Ban, CheckCircle2 } from "lucide-vue-next";
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Modal, Badge, Avatar, Spinner,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, useToast,
} from "@repo/ui";
import { SchoolStatus } from "@repo/shared";

const route = useRoute();
const schoolId = route.params.id as string;
const api = useApi();
const { toast } = useToast();

const loading = ref(true);
const school = ref<any>(null);
const staff = ref<any[]>([]);

async function load() {
  loading.value = true;
  try {
    const res = await api<{ school: any; staff: any[] }>(`/schools/${schoolId}`);
    school.value = res.school;
    staff.value = res.staff;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

// ---- edit ----
const showEdit = ref(false);
const editForm = ref({ name: "", email: "", phone: "", address: "" });
const saving = ref(false);

function openEdit() {
  editForm.value = {
    name: school.value.name, email: school.value.email ?? "",
    phone: school.value.phone ?? "", address: school.value.address ?? "",
  };
  showEdit.value = true;
}

async function saveEdit() {
  saving.value = true;
  try {
    await api(`/schools/${schoolId}`, {
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
    saving.value = false;
  }
}

// ---- suspend / activate ----
const togglingStatus = ref(false);
async function toggleStatus() {
  togglingStatus.value = true;
  const next = school.value.status === SchoolStatus.ACTIVE ? SchoolStatus.SUSPENDED : SchoolStatus.ACTIVE;
  try {
    await api(`/schools/${schoolId}`, { method: "PATCH", body: { status: next } });
    toast({
      title: next === SchoolStatus.ACTIVE ? "School reactivated" : "School suspended",
      variant: "success",
    });
    await load();
  } catch (e) {
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
  } finally {
    togglingStatus.value = false;
  }
}

// ---- delete ----
const showConfirm = ref(false);
const removing = ref(false);
async function remove() {
  removing.value = true;
  try {
    await api(`/schools/${schoolId}`, { method: "DELETE" });
    await navigateTo("/schools");
  } catch (e) {
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
    removing.value = false;
  }
}
</script>

<template>
  <div>
    <NuxtLink to="/schools" class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft class="size-4" /> Back to schools
    </NuxtLink>

    <div v-if="loading" class="flex justify-center py-20"><Spinner class="size-8 text-primary" /></div>

    <template v-else-if="school">
      <PageHeader :title="school.name" :subtitle="`/${school.slug}`">
        <template #actions>
          <Badge :variant="school.status === 'ACTIVE' ? 'success' : 'warning'">
            {{ school.status === "ACTIVE" ? "Active" : "Suspended" }}
          </Badge>
          <Button variant="outline" :loading="togglingStatus" @click="toggleStatus">
            <component :is="school.status === 'ACTIVE' ? Ban : CheckCircle2" class="size-4" />
            {{ school.status === "ACTIVE" ? "Suspend" : "Reactivate" }}
          </Button>
          <Button variant="outline" @click="openEdit"><Pencil class="size-4" /> Edit</Button>
          <Button variant="destructive" @click="showConfirm = true"><Trash2 class="size-4" /> Delete</Button>
        </template>
      </PageHeader>

      <div class="grid gap-4 sm:grid-cols-3">
        <StatCard label="Students" :value="school.counts?.students ?? 0" :icon="GraduationCap" />
        <StatCard label="Staff" :value="school.counts?.staff ?? 0" :icon="Users" tone="bg-violet-500/10 text-violet-600" />
        <StatCard label="Classes" :value="school.counts?.classes ?? 0" :icon="BookOpen" />
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>School details</CardTitle></CardHeader>
          <CardContent>
            <dl class="space-y-3 text-sm">
              <div class="flex justify-between gap-2">
                <dt class="text-muted-foreground">Email</dt>
                <dd>{{ school.email ?? "—" }}</dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-muted-foreground">Phone</dt>
                <dd>{{ school.phone ?? "—" }}</dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="shrink-0 text-muted-foreground">Address</dt>
                <dd class="text-right">{{ school.address ?? "—" }}</dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-muted-foreground">Registered</dt>
                <dd>{{ new Date(school.createdAt).toLocaleDateString() }}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle class="flex items-center gap-2"><Users class="size-5" /> Staff</CardTitle></CardHeader>
          <CardContent>
            <EmptyState v-if="!staff.length" title="No staff yet">
              <template #icon><Users /></template>
            </EmptyState>
            <Table v-else>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Contact</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="u in staff" :key="u.id">
                  <TableCell>
                    <div class="flex items-center gap-2">
                      <Avatar :name="u.name" :src="u.avatarUrl" class="size-8" />
                      <span class="font-medium">{{ u.name }}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{{ u.role }}</Badge></TableCell>
                  <TableCell class="text-muted-foreground">{{ u.email }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </template>

    <!-- Edit -->
    <Modal v-model:open="showEdit" :title="`Edit ${school?.name ?? 'school'}`">
      <form class="space-y-3" @submit.prevent="saveEdit">
        <div class="space-y-1.5"><Label>Name</Label><Input v-model="editForm.name" required /></div>
        <div class="space-y-1.5"><Label>Email</Label><Input v-model="editForm.email" type="email" /></div>
        <div class="space-y-1.5"><Label>Phone</Label><Input v-model="editForm.phone" /></div>
        <div class="space-y-1.5"><Label>Address</Label><Input v-model="editForm.address" /></div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showEdit = false">Cancel</Button>
          <Button type="submit" :loading="saving">Save</Button>
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
