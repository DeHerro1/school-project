<script setup lang="ts">
import { ref, watch } from "vue";
import { Receipt } from "lucide-vue-next";
import {
  Card, Badge, SkeletonTable, EmptyState,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@repo/ui";

definePageMeta({ layout: "parent" });

const api = useApi();
const { activeId, loaded, load } = useChildren();

const loading = ref(true);
const invoices = ref<any[]>([]);

async function loadData(id: string) {
  loading.value = true;
  try {
    invoices.value = (await api<{ invoices: any[] }>(`/invoices?studentId=${id}`)).invoices;
  } finally {
    loading.value = false;
  }
}
onMounted(async () => { if (!loaded.value) await load(); });
watch(activeId, (id) => { if (id) loadData(id); }, { immediate: true });

const paidOf = (inv: any) => inv.payments.reduce((s: number, p: any) => s + p.amount, 0);
const statusVariant = (s: string) => (s === "PAID" ? "success" : s === "PARTIAL" ? "warning" : "destructive");
</script>

<template>
  <div>
    <PageHeader title="Fees & Invoices" subtitle="Your child's school fees" />
    <SkeletonTable v-if="loading" :rows="4" :cols="5" />
    <EmptyState v-else-if="!invoices.length" title="No invoices" description="Fee invoices from the school appear here.">
      <template #icon><Receipt /></template>
    </EmptyState>
    <template v-else>
      <!-- Mobile: stacked cards -->
      <div class="space-y-3 sm:hidden">
        <Card v-for="inv in invoices" :key="inv.id" class="p-4">
          <div class="flex items-start justify-between gap-2">
            <p class="font-medium">{{ inv.term }}</p>
            <Badge :variant="statusVariant(inv.status)">{{ inv.status }}</Badge>
          </div>
          <dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            <div class="flex justify-between gap-2">
              <dt class="text-muted-foreground">Amount</dt>
              <dd>{{ inv.amount.toLocaleString() }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-muted-foreground">Paid</dt>
              <dd>{{ paidOf(inv).toLocaleString() }}</dd>
            </div>
            <div class="col-span-2 flex justify-between gap-2">
              <dt class="text-muted-foreground">Due</dt>
              <dd>{{ new Date(inv.dueDate).toLocaleDateString() }}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <!-- Desktop: table -->
      <Card class="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Term</TableHead><TableHead>Amount</TableHead><TableHead>Paid</TableHead>
              <TableHead>Due</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="inv in invoices" :key="inv.id">
              <TableCell class="font-medium">{{ inv.term }}</TableCell>
              <TableCell>{{ inv.amount.toLocaleString() }}</TableCell>
              <TableCell>{{ paidOf(inv).toLocaleString() }}</TableCell>
              <TableCell class="text-muted-foreground">{{ new Date(inv.dueDate).toLocaleDateString() }}</TableCell>
              <TableCell><Badge :variant="statusVariant(inv.status)">{{ inv.status }}</Badge></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </template>
  </div>
</template>
