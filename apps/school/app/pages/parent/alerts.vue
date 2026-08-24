<script setup lang="ts">
import { ref, watch } from "vue";
import { BellRing, CheckCircle2 } from "lucide-vue-next";
import { Card, CardContent, Button, Textarea, Badge, Skeleton, EmptyState, useToast } from "@repo/ui";

definePageMeta({ layout: "parent" });

const api = useApi();
const { toast } = useToast();
const { activeId, loaded, load } = useChildren();

const loading = ref(true);
const alerts = ref<any[]>([]);
const reasons = ref<Record<string, string>>({});
const submitting = ref<Record<string, boolean>>({});
const respondErrors = ref<Record<string, string>>({});

async function loadData(id: string) {
  loading.value = true;
  try {
    const res = await api<{ alerts: any[] }>("/absence-alerts");
    alerts.value = res.alerts.filter((a) => a.attendance.student.id === id);
  } finally {
    loading.value = false;
  }
}
onMounted(async () => { if (!loaded.value) await load(); });
watch(activeId, (id) => { if (id) loadData(id); }, { immediate: true });

async function respond(alert: any) {
  const reason = reasons.value[alert.id]?.trim();
  if (!reason) return;
  submitting.value[alert.id] = true;
  delete respondErrors.value[alert.id];
  try {
    await api(`/absence-alerts/${alert.id}/respond`, { method: "POST", body: { parentReason: reason } });
    alert.status = "RESPONDED";
    alert.parentReason = reason;
    toast({ title: "Reason sent to the school", variant: "success" });
  } catch (e) {
    // Single free-text field per alert — any validation issue is about that
    // text, so just show its message right under this alert's textarea.
    const fields = apiFieldErrors(e);
    respondErrors.value[alert.id] = fields ? Object.values(fields)[0]! : apiError(e);
  } finally {
    submitting.value[alert.id] = false;
  }
}

const dateStr = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
</script>

<template>
  <div>
    <PageHeader title="Absence alerts" subtitle="Let the school know why your child was away." />

    <div v-if="loading" class="space-y-4">
      <Card v-for="i in 3" :key="i">
        <CardContent class="pt-6">
          <div class="mb-2 flex items-center justify-between">
            <Skeleton class="h-4 w-36" />
            <Skeleton class="h-5 w-24 rounded-full" />
          </div>
          <Skeleton class="h-3 w-2/3" />
        </CardContent>
      </Card>
    </div>
    <EmptyState v-else-if="!alerts.length" title="No absence alerts" description="You'll be notified here if your child is marked absent.">
      <template #icon><CheckCircle2 /></template>
    </EmptyState>

    <div v-else class="space-y-4">
      <Card v-for="a in alerts" :key="a.id">
        <CardContent class="pt-6">
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <BellRing class="size-5 text-amber-500" />
              <span class="font-semibold">{{ dateStr(a.attendance.date) }}</span>
            </div>
            <Badge :variant="a.status === 'RESPONDED' ? 'success' : 'warning'">
              {{ a.status === "RESPONDED" ? "Responded" : "Awaiting reason" }}
            </Badge>
          </div>
          <p class="text-sm text-muted-foreground">{{ a.message }}</p>

          <div v-if="a.status === 'RESPONDED'" class="mt-3 rounded-md bg-muted/60 p-3 text-sm">
            <span class="font-medium">Your reason:</span> {{ a.parentReason }}
          </div>
          <div v-else class="mt-3 space-y-2">
            <Textarea v-model="reasons[a.id]" placeholder="e.g. Tunde had a doctor's appointment…" />
            <p v-if="respondErrors[a.id]" class="text-xs text-destructive">{{ respondErrors[a.id] }}</p>
            <div class="flex justify-end">
              <Button :loading="submitting[a.id]" :disabled="!reasons[a.id]?.trim()" @click="respond(a)">
                Send reason
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
