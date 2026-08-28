<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../lib/utils";

interface Slot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  period?: number;
  subject: { name: string; isActivity?: boolean };
  teacher?: { id?: string; name: string } | null;
  [key: string]: unknown;
}

const props = defineProps<{
  slots: Slot[];
  days: string[];
  dayLabels: Record<string, string>;
  class?: string;
}>();

const toMinutes = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const fmtHour = (h: number): string => {
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour} ${period}`;
};

// The vertical window shown on the axis: always at least the school day
// (8 AM–3 PM), stretched further out only if a slot falls outside it —
// so a light day's timetable doesn't shrink down to just its few slots.
const SCHOOL_DAY_START = 8 * 60;
const SCHOOL_DAY_END = 15 * 60;
const range = computed(() => {
  let min = SCHOOL_DAY_START;
  let max = SCHOOL_DAY_END;
  for (const s of props.slots) {
    min = Math.min(min, toMinutes(s.startTime));
    max = Math.max(max, toMinutes(s.endTime));
  }
  return { startHour: Math.floor(min / 60), endHour: Math.ceil(max / 60) };
});

const totalMinutes = computed(() => (range.value.endHour - range.value.startHour) * 60);

// Percent of the axis height for a given absolute minute. The axis stretches to
// fill the available height, so the grid always fills the page.
const pct = (minutes: number): number =>
  ((minutes - range.value.startHour * 60) / totalMinutes.value) * 100;

// Every 30-minute tick on the axis. Hours get a label and a stronger line;
// half hours (8:30, 9:30, …) get a lighter dashed line. `edge` flags the very
// first/last ticks so their labels can be nudged inward instead of clipped.
const ticks = computed(() => {
  const startMin = range.value.startHour * 60;
  const endMin = range.value.endHour * 60;
  const out: { minutes: number; top: number; isHour: boolean; label: string; edge: "start" | "end" | null }[] = [];
  for (let m = startMin; m <= endMin; m += 30) {
    const isHour = m % 60 === 0;
    out.push({
      minutes: m,
      top: pct(m),
      isHour,
      label: isHour ? fmtHour(m / 60) : "",
      edge: m === startMin ? "start" : m === endMin ? "end" : null,
    });
  }
  return out;
});

interface Positioned {
  slot: Slot;
  topPct: number;
  heightPct: number;
  leftPct: number;
  widthPct: number;
}

// Lay out one day's slots: position each by its clock time, and split
// overlapping slots into side-by-side lanes so nothing is hidden.
function layoutDay(day: string): Positioned[] {
  const items = props.slots
    .filter((s) => s.day === day)
    .map((s) => ({ slot: s, start: toMinutes(s.startTime), end: toMinutes(s.endTime) }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const out: Positioned[] = [];
  let i = 0;
  while (i < items.length) {
    // Grow a cluster of transitively-overlapping slots.
    let clusterEnd = items[i]!.end;
    let j = i + 1;
    while (j < items.length && items[j]!.start < clusterEnd) {
      clusterEnd = Math.max(clusterEnd, items[j]!.end);
      j++;
    }
    const cluster = items.slice(i, j);

    // Greedily pack the cluster into lanes.
    const laneEnds: number[] = [];
    const laneOf = new Map<number, number>();
    cluster.forEach((it, idx) => {
      let lane = laneEnds.findIndex((end) => end <= it.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.end);
      } else {
        laneEnds[lane] = it.end;
      }
      laneOf.set(idx, lane);
    });
    const lanes = laneEnds.length;

    cluster.forEach((it, idx) => {
      const lane = laneOf.get(idx)!;
      out.push({
        slot: it.slot,
        topPct: pct(it.start),
        heightPct: ((it.end - it.start) / totalMinutes.value) * 100,
        leftPct: (lane / lanes) * 100,
        widthPct: (1 / lanes) * 100,
      });
    });
    i = j;
  }
  return out;
}

const columns = computed(() =>
  props.days.map((day) => ({
    day,
    label: props.dayLabels[day] ?? day,
    short: (props.dayLabels[day] ?? day).slice(0, 3),
    events: layoutDay(day),
  })),
);

const eventClass = (slot: Slot): string =>
  slot.subject.isActivity
    ? "border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25"
    : "border-primary/30 bg-primary/10 hover:bg-primary/20";

// A fixed clock-column width, shared by the header and body so they line up.
const gutter = "w-11 shrink-0 sm:w-14";

defineEmits<{ (e: "select", slot: Slot): void }>();
</script>

<template>
  <div :class="cn('flex min-h-[24rem] flex-col overflow-hidden rounded-lg border bg-card', $props.class)">
    <!-- Day headers, aligned with the clock gutter below. -->
    <div class="flex shrink-0 border-b">
      <div :class="gutter" />
      <div
        v-for="col in columns"
        :key="col.day"
        class="flex-1 border-l px-1 py-2 text-center text-xs font-semibold sm:px-3 sm:text-left sm:text-sm"
      >
        <span class="sm:hidden">{{ col.short }}</span>
        <span class="hidden sm:inline">{{ col.label }}</span>
      </div>
    </div>

    <!-- Grid body — fills the remaining page height. The inner layer is
         absolutely sized (inset-0) so the day columns have a *definite* height;
         without it, the flex chain leaves their height indefinite and the
         percentage-positioned events all collapse to the top (8 AM). -->
    <div class="relative min-h-0 flex-1">
      <div class="absolute inset-0 flex overflow-y-auto py-2">
        <!-- Clock gutter -->
        <div :class="cn('relative', gutter)">
          <div
            v-for="t in ticks"
            v-show="t.isHour"
            :key="t.minutes"
            class="absolute right-1.5 text-[10px] font-medium tabular-nums text-muted-foreground sm:text-xs"
            :class="t.edge === 'start' ? 'translate-y-0' : t.edge === 'end' ? '-translate-y-full' : '-translate-y-1/2'"
            :style="{ top: `${t.top}%` }"
          >
            {{ t.label }}
          </div>
        </div>

        <!-- One column per day (Mon–Fri) -->
        <div v-for="col in columns" :key="col.day" class="relative flex-1 border-l">
          <!-- Hour (solid) & half-hour (dashed, lighter) gridlines -->
          <div
            v-for="t in ticks"
            :key="t.minutes"
            class="absolute inset-x-0 border-t"
            :class="t.isHour ? 'border-border/70' : 'border-dashed border-border/40'"
            :style="{ top: `${t.top}%` }"
          />

          <!-- Positioned events -->
          <button
            v-for="ev in col.events"
            :key="ev.slot.id"
            type="button"
            :class="cn(
              'absolute overflow-hidden rounded-md border px-1.5 py-1 text-left leading-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-2',
              eventClass(ev.slot),
            )"
            :style="{
              top: `${ev.topPct}%`,
              height: `${ev.heightPct}%`,
              minHeight: '1.25rem',
              left: `calc(${ev.leftPct}% + 2px)`,
              width: `calc(${ev.widthPct}% - 4px)`,
            }"
            @click="$emit('select', ev.slot)"
          >
            <slot name="event" :slot="ev.slot">
              <p class="truncate text-xs font-semibold text-foreground">{{ ev.slot.subject.name }}</p>
              <p v-if="ev.slot.teacher" class="truncate text-[11px] text-muted-foreground">
                {{ ev.slot.teacher.name }}
              </p>
              <p class="truncate text-[10px] tabular-nums text-muted-foreground">
                {{ ev.slot.startTime }}–{{ ev.slot.endTime }}
              </p>
            </slot>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
