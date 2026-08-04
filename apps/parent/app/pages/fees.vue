<script setup lang="ts">
import { ref, watch } from "vue";
import { Receipt } from "lucide-vue-next";
import {
  Card, Badge, Spinner, EmptyState,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@repo/ui";

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
    <div v-if="loading" class="flex justify-center py-16"><Spinner class="size-7 text-primary" /></div>
    <EmptyState v-else-if="!invoices.length" title="No invoices" description="Fee invoices from the school appear here.">
      <template #icon><Receipt /></template>
    </EmptyState>
    <Card v-else>
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
  </div>
</template>
