<script setup lang="ts">
import { ref, watch } from "vue";
import { CalendarDays } from "lucide-vue-next";
import { Skeleton, EmptyState, TimetableCalendar } from "@repo/ui";
import { Weekday } from "@repo/shared";

definePageMeta({ layout: "parent" });

const api = useApi();
const { activeId, loaded, load } = useChildren();

const loading = ref(true);
const slots = ref<any[]>([]);
const days = Object.values(Weekday);
const dayLabels: Record<string, string> = { MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday" };

async function loadData(id: string) {
  loading.value = true;
  try {
    slots.value = (await api<{ slots: any[] }>(`/timetable?studentId=${id}`)).slots;
  } finally {
    loading.value = false;
  }
}
onMounted(async () => { if (!loaded.value) await load(); });
watch(activeId, (id) => { if (id) loadData(id); }, { immediate: true });
</script>

<template>
  <div>
    <PageHeader title="Timetable" subtitle="Your child's weekly schedule" />
    <div v-if="loading" class="grid grid-cols-5 gap-2">
      <Skeleton v-for="i in 25" :key="i" class="h-16 rounded-lg" />
    </div>
    <EmptyState v-else-if="!slots.length" title="No timetable yet">
      <template #icon><CalendarDays /></template>
    </EmptyState>
    <TimetableCalendar
      v-else
      :slots="slots"
      :days="days"
      :day-labels="dayLabels"
      class="h-[calc(100dvh-10rem)]"
    />
  </div>
</template>
