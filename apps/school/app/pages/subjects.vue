<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Pencil, Plus, Trash2 } from "lucide-vue-next";
import { Card, Button, Input, Label, Modal, Spinner, Badge, useToast } from "@repo/ui";

const api = useApi();
const { toast } = useToast();
const loading = ref(true);
const subjects = ref<any[]>([]);
const showAdd = ref(false);
const saving = ref(false);
const form = ref({ name: "", code: "" });

const showEdit = ref(false);
const editing = ref<any | null>(null);
const editForm = ref({ name: "", code: "" });
const savingEdit = ref(false);

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
  try {
    await api("/subjects", { method: "POST", body: { name: form.value.name, code: form.value.code || undefined } });
    toast({ title: "Subject added", variant: "success" });
    showAdd.value = false;
    form.value = { name: "", code: "" };
    await load();
  } catch (e) {
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
  } finally {
    saving.value = false;
  }
}

function openEdit(s: any) {
  editing.value = s;
  editForm.value = { name: s.name, code: s.code ?? "" };
  showEdit.value = true;
}

async function saveEdit() {
  if (!editing.value) return;
  savingEdit.value = true;
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
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
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
      <template #actions><Button @click="showAdd = true"><Plus class="size-4" /> New subject</Button></template>
    </PageHeader>

    <div v-if="loading" class="flex justify-center py-16"><Spinner class="size-7 text-primary" /></div>
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
        <div class="space-y-1.5"><Label>Name</Label><Input v-model="form.name" required /></div>
        <div class="space-y-1.5"><Label>Code (optional)</Label><Input v-model="form.code" /></div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showAdd = false">Cancel</Button>
          <Button type="submit" :loading="saving">Add</Button>
        </div>
      </form>
    </Modal>

    <Modal v-model:open="showEdit" title="Edit subject">
      <form class="space-y-3" @submit.prevent="saveEdit">
        <div class="space-y-1.5"><Label>Name</Label><Input v-model="editForm.name" required /></div>
        <div class="space-y-1.5"><Label>Code (optional)</Label><Input v-model="editForm.code" /></div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showEdit = false">Cancel</Button>
          <Button type="submit" :loading="savingEdit">Save</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
