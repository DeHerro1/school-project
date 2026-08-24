<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Plus, Trash2, ShieldCheck } from "lucide-vue-next";
import {
  Card, Button, Input, Label, Modal, SkeletonTable,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, useToast,
} from "@repo/ui";
import { useAuthStore } from "~/stores/auth";
import { usePlatformAdminsApi } from "~/composables/usePlatformAdminsApi";

interface PlatformAdminRow {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const api = usePlatformAdminsApi();
const { toast } = useToast();
const auth = useAuthStore();

const loading = ref(true);
const admins = ref<PlatformAdminRow[]>([]);

async function load() {
  loading.value = true;
  try {
    const { admins: list } = await api<{ admins: PlatformAdminRow[] }>("/");
    admins.value = list;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

// ---- add admin ----
const showAdd = ref(false);
const saving = ref(false);
const emptyForm = () => ({ name: "", email: "", password: "" });
const form = ref(emptyForm());

async function create() {
  saving.value = true;
  try {
    await api("/", { method: "POST", body: form.value });
    toast({ title: "Admin added", description: `${form.value.name} can now sign in.`, variant: "success" });
    showAdd.value = false;
    form.value = emptyForm();
    await load();
  } catch (e) {
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
  } finally {
    saving.value = false;
  }
}

// ---- remove admin ----
const showConfirm = ref(false);
const confirmId = ref("");
const removing = ref(false);

function askRemove(id: string) {
  confirmId.value = id;
  showConfirm.value = true;
}

async function remove() {
  removing.value = true;
  try {
    await api(`/${confirmId.value}`, { method: "DELETE" });
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
    <PageHeader title="Admins" subtitle="Platform admins who can review signup requests and manage schools">
      <template #actions><Button @click="showAdd = true"><Plus class="size-4" /> Add admin</Button></template>
    </PageHeader>

    <SkeletonTable v-if="loading" :rows="3" :cols="4" />
    <template v-else>
      <!-- Mobile: stacked cards -->
      <div class="space-y-3 md:hidden">
        <Card v-for="a in admins" :key="a.id" class="p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate font-medium">{{ a.name }}</p>
              <p class="truncate text-xs text-muted-foreground">{{ a.email }}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              :disabled="a.id === auth.admin?.id"
              :title="a.id === auth.admin?.id ? 'You cannot remove your own access' : 'Remove admin'"
              @click="askRemove(a.id)"
            >
              <Trash2 class="size-4 text-destructive" />
            </Button>
          </div>
        </Card>
        <p v-if="!admins.length" class="py-10 text-center text-sm text-muted-foreground">No admins yet.</p>
      </div>

      <!-- Desktop: table -->
      <Card class="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Added</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="a in admins" :key="a.id">
              <TableCell>
                <div class="flex items-center gap-2 font-medium">
                  <ShieldCheck class="size-4 text-primary" />
                  {{ a.name }}
                  <span v-if="a.id === auth.admin?.id" class="text-xs font-normal text-muted-foreground">(you)</span>
                </div>
              </TableCell>
              <TableCell>{{ a.email }}</TableCell>
              <TableCell>{{ new Date(a.createdAt).toLocaleDateString() }}</TableCell>
              <TableCell>
                <div class="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    :disabled="a.id === auth.admin?.id"
                    :title="a.id === auth.admin?.id ? 'You cannot remove your own access' : 'Remove admin'"
                    @click="askRemove(a.id)"
                  >
                    <Trash2 class="size-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p v-if="!admins.length" class="py-10 text-center text-sm text-muted-foreground">No admins yet.</p>
      </Card>
    </template>

    <!-- Add admin -->
    <Modal v-model:open="showAdd" title="Add a platform admin" description="They'll be able to review signup requests and manage every school.">
      <form class="space-y-4" @submit.prevent="create">
        <div class="space-y-1.5">
          <Label for="name">Name</Label>
          <Input id="name" v-model="form.name" required />
        </div>
        <div class="space-y-1.5">
          <Label for="email">Email</Label>
          <Input id="email" v-model="form.email" type="email" required />
        </div>
        <div class="space-y-1.5">
          <Label for="password">Password</Label>
          <Input id="password" v-model="form.password" type="password" minlength="6" required />
        </div>
        <Button type="submit" class="w-full" :loading="saving">Add admin</Button>
      </form>
    </Modal>

    <!-- Confirm remove -->
    <Modal v-model:open="showConfirm" title="Remove admin access?" description="They'll immediately lose access to schools-backoffice.">
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="showConfirm = false">Cancel</Button>
        <Button variant="destructive" :loading="removing" @click="remove">Remove</Button>
      </div>
    </Modal>
  </div>
</template>
