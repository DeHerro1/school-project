<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-vue-next";
import {
  Button, Select, Modal, Label, Input, Skeleton, EmptyState, useToast, Alert,
  TimetableCalendar,
} from "@repo/ui";
import { Weekday } from "@repo/shared";
import { useAuthStore } from "~/stores/auth";

const api = useApi();
const auth = useAuthStore();
const { toast } = useToast();

const classes = ref<any[]>([]);
const subjects = ref<any[]>([]);
const teachers = ref<any[]>([]);
const classId = ref("");
const slots = ref<any[]>([]);
const loading = ref(false);

const days = Object.values(Weekday);
const dayLabels: Record<string, string> = { MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday" };

const isAdmin = computed(() => auth.role === "ADMIN");
const canEdit = computed(() => auth.role === "ADMIN" || auth.role === "TEACHER");

const showAdd = ref(false);
const saving = ref(false);
const form = ref({
  subjectId: "",
  teacherId: "",
  day: Weekday.MON as string,
  period: 1,
  startTime: "08:00",
  endTime: "08:45",
  repeat: false,
});
const formError = ref("");
const fieldErrors = ref<Record<string, string>>({});

onMounted(async () => {
  const [c, s] = await Promise.all([
    api<{ classes: any[] }>("/classes"),
    api<{ subjects: any[] }>("/subjects"),
  ]);
  // Staff only manage their own homeroom class; admins see every class.
  classes.value = isAdmin.value
    ? c.classes
    : c.classes.filter((k) => k.homeroomTeacher?.id === auth.user?.id);
  subjects.value = s.subjects;
  if (isAdmin.value) {
    teachers.value = (await api<{ users: any[] }>("/users?role=TEACHER")).users;
  } else {
    // Staff can only assign timetable slots to themselves.
    form.value.teacherId = auth.user?.id ?? "";
  }
  if (classes.value[0]) {
    classId.value = classes.value[0].id;
    await loadSlots();
  }
});

const classOptions = computed(() => classes.value.map((c) => ({ value: c.id, label: c.name })));
const subjectOptions = computed(() =>
  subjects.value.map((s) => ({ value: s.id, label: s.isActivity ? `${s.name} (activity)` : s.name })),
);
const teacherOptions = computed(() => teachers.value.map((t) => ({ value: t.id, label: t.name })));
const dayOptions = days.map((d) => ({ value: d, label: dayLabels[d] }));

// Editing an existing slot reuses the same fields (minus "repeat").
const showEdit = ref(false);
const editingId = ref<string | null>(null);
const editForm = ref({
  subjectId: "",
  teacherId: "",
  day: Weekday.MON as string,
  period: 1,
  startTime: "08:00",
  endTime: "08:45",
});
const editFormError = ref("");
const editFieldErrors = ref<Record<string, string>>({});

// Activity subjects (Lunch, Worship, …) don't need a teacher.
const isActivity = (subjectId: string) =>
  subjects.value.find((s) => s.id === subjectId)?.isActivity ?? false;
const isValid = (f: { subjectId: string; startTime: string; endTime: string; teacherId: string }) =>
  !!f.subjectId && !!f.startTime && !!f.endTime && (isActivity(f.subjectId) || !!f.teacherId);

const selectedIsActivity = computed(() => isActivity(form.value.subjectId));
const canSubmit = computed(() => isValid(form.value));
const editIsActivity = computed(() => isActivity(editForm.value.subjectId));
const canSubmitEdit = computed(() => isValid(editForm.value));

async function loadSlots() {
  if (!classId.value) return;
  loading.value = true;
  try {
    slots.value = (await api<{ slots: any[] }>(`/timetable?classId=${classId.value}`)).slots;
  } finally {
    loading.value = false;
  }
}

async function create() {
  saving.value = true;
  formError.value = "";
  fieldErrors.value = {};
  try {
    const res = await api("/timetable", {
      method: "POST",
      body: {
        classId: classId.value,
        ...form.value,
        period: Number(form.value.period),
        // Activity slots carry no teacher.
        teacherId: selectedIsActivity.value ? undefined : form.value.teacherId || undefined,
      },
    });
    toast({
      title: form.value.repeat ? `Added on ${res.count ?? 0} day(s)` : "Slot added",
      variant: "success",
    });
    showAdd.value = false;
    await loadSlots();
  } catch (e) {
    const fields = apiFieldErrors(e);
    if (fields) fieldErrors.value = fields;
    else formError.value = apiError(e);
  } finally {
    saving.value = false;
  }
}
function openEdit(slot: any) {
  editingId.value = slot.id;
  editForm.value = {
    subjectId: slot.subject.id,
    teacherId: slot.teacher?.id ?? "",
    day: slot.day,
    period: slot.period ?? 1,
    startTime: slot.startTime ?? "08:00",
    endTime: slot.endTime ?? "08:45",
  };
  editFormError.value = "";
  editFieldErrors.value = {};
  showEdit.value = true;
}

async function update() {
  if (!editingId.value) return;
  saving.value = true;
  editFormError.value = "";
  editFieldErrors.value = {};
  try {
    await api(`/timetable/${editingId.value}`, {
      method: "PATCH",
      body: {
        subjectId: editForm.value.subjectId,
        day: editForm.value.day,
        period: Number(editForm.value.period),
        startTime: editForm.value.startTime,
        endTime: editForm.value.endTime,
        // Activity slots carry no teacher; null clears any existing one.
        teacherId: editIsActivity.value ? null : editForm.value.teacherId || null,
      },
    });
    toast({ title: "Slot updated", variant: "success" });
    showEdit.value = false;
    await loadSlots();
  } catch (e) {
    const fields = apiFieldErrors(e);
    if (fields) editFieldErrors.value = fields;
    else editFormError.value = apiError(e);
  } finally {
    saving.value = false;
  }
}

async function remove(id: string) {
  await api(`/timetable/${id}`, { method: "DELETE" });
  await loadSlots();
}
</script>

<template>
  <div>
    <PageHeader title="Timetable">
      <template #actions>
        <div class="flex w-full gap-2 sm:w-auto">
          <Select v-model="classId" :options="classOptions" class="flex-1 sm:w-48" @update:model-value="loadSlots" />
          <Button v-if="canEdit" class="shrink-0" @click="formError = ''; fieldErrors = {}; showAdd = true"><Plus class="size-4" /> Add slot</Button>
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="grid grid-cols-5 gap-2">
      <Skeleton v-for="i in 25" :key="i" class="h-16 rounded-lg" />
    </div>

    <EmptyState
      v-else-if="!classId"
      title="Select a class"
      description="Choose a class above to view its weekly timetable."
    >
      <template #icon><CalendarDays /></template>
    </EmptyState>

    <EmptyState
      v-else-if="!slots.length"
      title="No timetable yet"
      description="Add a slot to start building this class's weekly schedule."
    >
      <template #icon><CalendarDays /></template>
    </EmptyState>

    <TimetableCalendar
      v-else
      :slots="slots"
      :days="days"
      :day-labels="dayLabels"
      class="h-[calc(100dvh-10rem)]"
    >
      <template #event="{ slot }">
        <div class="group flex h-full flex-col">
          <div class="flex items-start justify-between gap-1">
            <p class="truncate text-xs font-semibold">{{ slot.subject.name }}</p>
            <div
              v-if="isAdmin || slot.teacher?.id === auth.user?.id"
              class="flex shrink-0 gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
            >
              <button title="Edit slot" class="p-0.5" @click.stop="openEdit(slot)">
                <Pencil class="size-4 text-muted-foreground hover:text-foreground sm:size-3.5" />
              </button>
              <button title="Delete slot" class="p-0.5" @click.stop="remove(slot.id)">
                <Trash2 class="size-4 text-destructive sm:size-3.5" />
              </button>
            </div>
          </div>
          <p v-if="slot.teacher" class="truncate text-[11px] text-muted-foreground">{{ slot.teacher.name }}</p>
          <p class="truncate text-[10px] tabular-nums text-muted-foreground">
            {{ slot.startTime }}–{{ slot.endTime }}
          </p>
        </div>
      </template>
    </TimetableCalendar>

    <Modal v-model:open="showAdd" title="Add timetable slot">
      <form class="space-y-3" @submit.prevent="create">
        <Alert v-if="formError" variant="destructive">{{ formError }}</Alert>
        <div class="space-y-1.5"><Label>Subject</Label><Select v-model="form.subjectId" :options="subjectOptions" /></div>
        <p v-if="selectedIsActivity" class="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          This is an activity — no teacher is assigned.
        </p>
        <div v-else-if="isAdmin" class="space-y-1.5"><Label>Teacher</Label><Select v-model="form.teacherId" :options="teacherOptions" /></div>
        <p v-else class="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          This slot will be assigned to you ({{ auth.user?.name }}).
        </p>
        <div class="grid grid-cols-2 gap-3">
          <div v-if="!form.repeat" class="space-y-1.5"><Label>Day</Label><Select v-model="form.day" :options="dayOptions" /></div>
          <div class="space-y-1.5">
            <Label>Period</Label>
            <Input v-model="form.period" type="number" min="1" max="12" :class="fieldErrors.period ? 'border-destructive' : ''" />
            <p v-if="fieldErrors.period" class="text-xs text-destructive">{{ fieldErrors.period }}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label>From</Label>
            <Input v-model="form.startTime" type="time" required :class="fieldErrors.startTime ? 'border-destructive' : ''" />
            <p v-if="fieldErrors.startTime" class="text-xs text-destructive">{{ fieldErrors.startTime }}</p>
          </div>
          <div class="space-y-1.5">
            <Label>To</Label>
            <Input v-model="form.endTime" type="time" required :class="fieldErrors.endTime ? 'border-destructive' : ''" />
            <p v-if="fieldErrors.endTime" class="text-xs text-destructive">{{ fieldErrors.endTime }}</p>
          </div>
        </div>
        <label class="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <input v-model="form.repeat" type="checkbox" class="size-4 accent-primary" />
          <span>Repeat every school day (Mon–Fri) this term</span>
        </label>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showAdd = false">Cancel</Button>
          <Button type="submit" :loading="saving" :disabled="!canSubmit">Add</Button>
        </div>
      </form>
    </Modal>

    <Modal v-model:open="showEdit" title="Edit timetable slot">
      <form class="space-y-3" @submit.prevent="update">
        <Alert v-if="editFormError" variant="destructive">{{ editFormError }}</Alert>
        <div class="space-y-1.5"><Label>Subject</Label><Select v-model="editForm.subjectId" :options="subjectOptions" /></div>
        <p v-if="editIsActivity" class="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          This is an activity — no teacher is assigned.
        </p>
        <div v-else-if="isAdmin" class="space-y-1.5"><Label>Teacher</Label><Select v-model="editForm.teacherId" :options="teacherOptions" /></div>
        <p v-else class="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          This slot is assigned to you ({{ auth.user?.name }}).
        </p>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5"><Label>Day</Label><Select v-model="editForm.day" :options="dayOptions" /></div>
          <div class="space-y-1.5">
            <Label>Period</Label>
            <Input v-model="editForm.period" type="number" min="1" max="12" :class="editFieldErrors.period ? 'border-destructive' : ''" />
            <p v-if="editFieldErrors.period" class="text-xs text-destructive">{{ editFieldErrors.period }}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label>From</Label>
            <Input v-model="editForm.startTime" type="time" required :class="editFieldErrors.startTime ? 'border-destructive' : ''" />
            <p v-if="editFieldErrors.startTime" class="text-xs text-destructive">{{ editFieldErrors.startTime }}</p>
          </div>
          <div class="space-y-1.5">
            <Label>To</Label>
            <Input v-model="editForm.endTime" type="time" required :class="editFieldErrors.endTime ? 'border-destructive' : ''" />
            <p v-if="editFieldErrors.endTime" class="text-xs text-destructive">{{ editFieldErrors.endTime }}</p>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showEdit = false">Cancel</Button>
          <Button type="submit" :loading="saving" :disabled="!canSubmitEdit">Save</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
