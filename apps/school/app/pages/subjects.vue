<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Pencil, Plus, Trash2 } from "lucide-vue-next";
import { Card, Button, Input, Label, Modal, Skeleton, Badge, useToast, Alert } from "@repo/ui";

const api = useApi();
const { toast } = useToast();
const loading = ref(true);
const subjects = ref<any[]>([]);
const showAdd = ref(false);
const saving = ref(false);
const form = ref({ name: "", code: "" });
const formError = ref("");
const fieldErrors = ref<Record<string, string>>({});

const showEdit = ref(false);
const editing = ref<any | null>(null);
const editForm = ref({ name: "", code: "" });
const savingEdit = ref(false);
const editFormError = ref("");
const editFieldErrors = ref<Record<string, string>>({});

async function load() {
  loading.value = true;
  try {
    subjects.value = (await api<{ subjects: any[] }>("/subjects")).subjects;
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
    await api("/subjects", { method: "POST", body: { name: form.value.name, code: form.value.code || undefined } });
    toast({ title: "Subject added", variant: "success" });
    showAdd.value = false;
    form.value = { name: "", code: "" };
    await load();
  } catch (e) {
    const fields = apiFieldErrors(e);
    if (fields) fieldErrors.value = fields;
    else formError.value = apiError(e);
  } finally {
    saving.value = false;
  }
}

function openEdit(s: any) {
  editing.value = s;
  editForm.value = { name: s.name, code: s.code ?? "" };
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
    await api(`/subjects/${editing.value.id}`, {
      method: "PATCH",
      body: { name: editForm.value.name, code: editForm.value.code || undefined },
    });
    toast({ title: "Subject updated", variant: "success" });
    showEdit.value = false;
    editing.value = null;
    await load();
  } catch (e) {
    const fields = apiFieldErrors(e);
    if (fields) editFieldErrors.value = fields;
    else editFormError.value = apiError(e);
  } finally {
    savingEdit.value = false;
  }
}

async function remove(id: string) {
  await api(`/subjects/${id}`, { method: "DELETE" });
  await load();
}
</script>

<template>
  <div>
    <PageHeader title="Subjects">
      <template #actions><Button @click="formError = ''; fieldErrors = {}; showAdd = true"><Plus class="size-4" /> New subject</Button></template>
    </PageHeader>

    <div v-if="loading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="i in 6" :key="i" class="flex items-center justify-between p-4">
        <div>
          <Skeleton class="h-4 w-24" />
          <Skeleton class="mt-2 h-3 w-12" />
        </div>
        <Skeleton class="size-8 rounded-md" />
      </Card>
    </div>
    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="s in subjects" :key="s.id" class="flex items-center justify-between p-4">
        <div>
          <p class="font-medium">{{ s.name }}</p>
          <Badge v-if="s.code" variant="secondary" class="mt-1 text-[10px]">{{ s.code }}</Badge>
        </div>
        <div class="flex items-center gap-1">
          <Button variant="ghost" size="icon" @click="openEdit(s)"><Pencil class="size-4" /></Button>
          <Button variant="ghost" size="icon" @click="remove(s.id)"><Trash2 class="size-4 text-destructive" /></Button>
        </div>
      </Card>
      <p v-if="!subjects.length" class="text-sm text-muted-foreground">No subjects yet.</p>
    </div>

    <Modal v-model:open="showAdd" title="New subject">
      <form class="space-y-3" @submit.prevent="create">
        <Alert v-if="formError" variant="destructive">{{ formError }}</Alert>
        <div class="space-y-1.5">
          <Label>Name</Label>
          <Input v-model="form.name" required :class="fieldErrors.name ? 'border-destructive' : ''" />
          <p v-if="fieldErrors.name" class="text-xs text-destructive">{{ fieldErrors.name }}</p>
        </div>
        <div class="space-y-1.5">
          <Label>Code (optional)</Label>
          <Input v-model="form.code" :class="fieldErrors.code ? 'border-destructive' : ''" />
          <p v-if="fieldErrors.code" class="text-xs text-destructive">{{ fieldErrors.code }}</p>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showAdd = false">Cancel</Button>
          <Button type="submit" :loading="saving">Add</Button>
        </div>
      </form>
    </Modal>

    <Modal v-model:open="showEdit" title="Edit subject">
      <form class="space-y-3" @submit.prevent="saveEdit">
        <Alert v-if="editFormError" variant="destructive">{{ editFormError }}</Alert>
        <div class="space-y-1.5">
          <Label>Name</Label>
          <Input v-model="editForm.name" required :class="editFieldErrors.name ? 'border-destructive' : ''" />
          <p v-if="editFieldErrors.name" class="text-xs text-destructive">{{ editFieldErrors.name }}</p>
        </div>
        <div class="space-y-1.5">
          <Label>Code (optional)</Label>
          <Input v-model="editForm.code" :class="editFieldErrors.code ? 'border-destructive' : ''" />
          <p v-if="editFieldErrors.code" class="text-xs text-destructive">{{ editFieldErrors.code }}</p>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showEdit = false">Cancel</Button>
          <Button type="submit" :loading="savingEdit">Save</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
