<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { Plus, CreditCard, Search } from "lucide-vue-next";
import { InvoiceStatus, Term, TERM_OPTIONS } from "@repo/shared";
import {
  Card, Button, Input, Label, Select, Modal, Badge, Spinner,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, useToast,
} from "@repo/ui";

const api = useApi();
const { toast } = useToast();
const loading = ref(true);
const invoices = ref<any[]>([]);
const students = ref<any[]>([]);

const search = ref("");
const statusFilter = ref<string>("ALL");
const classFilter = ref<string>("ALL");
const termFilter = ref<string>("ALL");

const showAdd = ref(false);
const saving = ref(false);
const form = ref({ studentId: "", term: Term.FIRST as string, amount: 0, dueDate: "" });

const showPay = ref(false);
const payInvoice = ref<any>(null);
const payForm = ref({ amount: 0, method: "cash" });

async function load() {
  loading.value = true;
  try {
    const [inv, st] = await Promise.all([
      api<{ invoices: any[] }>("/invoices"),
      api<{ students: any[] }>("/students"),
    ]);
    invoices.value = inv.invoices;
    students.value = st.students;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const studentOptions = computed(() =>
  students.value.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
);

const paidOf = (inv: any) => inv.payments.reduce((s: number, p: any) => s + p.amount, 0);
// Distinct payment methods recorded against an invoice (e.g. "MTN MoMo, Bank Pay").
const methodsOf = (inv: any) =>
  [...new Set(inv.payments.map((p: any) => p.method).filter(Boolean))].join(", ");
const statusVariant = (s: string) => (s === "PAID" ? "success" : s === "PARTIAL" ? "warning" : "destructive");

// Map each student to their class so invoices can be filtered by class.
const studentClass = computed<Record<string, { id: string; name: string } | undefined>>(() =>
  Object.fromEntries(students.value.map((s) => [s.id, s.class])),
);

const statusOptions = [
  { value: "ALL", label: "All statuses" },
  { value: InvoiceStatus.UNPAID, label: "Unpaid" },
  { value: InvoiceStatus.PARTIAL, label: "Partial" },
  { value: InvoiceStatus.PAID, label: "Paid" },
];

const classOptions = computed(() => {
  const seen = new Map<string, string>();
  for (const s of students.value) if (s.class) seen.set(s.class.id, s.class.name);
  return [
    { value: "ALL", label: "All classes" },
    ...[...seen].map(([id, name]) => ({ value: id, label: name })),
  ];
});

const termOptions = computed(() => {
  const terms = [...new Set(invoices.value.map((i) => i.term))].sort();
  return [{ value: "ALL", label: "All terms" }, ...terms.map((t) => ({ value: t, label: t }))];
});

const filtered = computed(() =>
  invoices.value.filter((inv) => {
    const q = search.value.trim().toLowerCase();
    const matchesSearch =
      !q ||
      `${inv.student.firstName} ${inv.student.lastName} ${inv.term}`.toLowerCase().includes(q);
    const matchesStatus = statusFilter.value === "ALL" || inv.status === statusFilter.value;
    const matchesClass =
      classFilter.value === "ALL" || studentClass.value[inv.student.id]?.id === classFilter.value;
    const matchesTerm = termFilter.value === "ALL" || inv.term === termFilter.value;
    return matchesSearch && matchesStatus && matchesClass && matchesTerm;
  }),
);

async function create() {
  saving.value = true;
  try {
    await api("/invoices", {
      method: "POST",
      body: { ...form.value, amount: Number(form.value.amount) },
    });
    toast({ title: "Invoice issued", description: "Parents notified.", variant: "success" });
    showAdd.value = false;
    form.value = { studentId: "", term: Term.FIRST, amount: 0, dueDate: "" };
    await load();
  } catch (e) {
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
  } finally {
    saving.value = false;
  }
}

function openPay(inv: any) {
  payInvoice.value = inv;
  payForm.value = { amount: inv.amount - paidOf(inv), method: "cash" };
  showPay.value = true;
}
async function recordPayment() {
  try {
    await api("/invoices/payments", {
      method: "POST",
      body: { invoiceId: payInvoice.value.id, amount: Number(payForm.value.amount), method: payForm.value.method },
    });
    toast({ title: "Payment recorded", variant: "success" });
    showPay.value = false;
    await load();
  } catch (e) {
    toast({ title: "Failed", description: apiError(e), variant: "destructive" });
  }
}
</script>

<template>
  <div>
    <PageHeader title="Fees & Invoices">
      <template #actions><Button @click="showAdd = true"><Plus class="size-4" /> New invoice</Button></template>
    </PageHeader>

    <div class="mb-4 space-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:space-y-0">
      <div class="relative sm:min-w-[16rem] sm:flex-1">
        <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="search" placeholder="Search by student or term…" class="pl-9" />
      </div>
      <div class="grid grid-cols-2 gap-3 sm:contents">
        <Select v-model="statusFilter" :options="statusOptions" class="w-full sm:w-40" />
        <Select v-model="classFilter" :options="classOptions" class="w-full sm:w-44" />
        <Select v-model="termFilter" :options="termOptions" class="w-full sm:w-48" />
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16"><Spinner class="size-7 text-primary" /></div>

    <template v-else>
      <!-- Mobile: stacked cards -->
      <div class="space-y-3 md:hidden">
        <Card v-for="inv in filtered" :key="inv.id" class="p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate font-medium">{{ inv.student.firstName }} {{ inv.student.lastName }}</p>
              <p class="text-xs text-muted-foreground">{{ inv.term }}</p>
            </div>
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
              <dt class="text-muted-foreground">Method</dt>
              <dd class="truncate text-muted-foreground">{{ methodsOf(inv) || "—" }}</dd>
            </div>
          </dl>
          <Button v-if="inv.status !== 'PAID'" variant="outline" size="sm" class="mt-3 w-full" @click="openPay(inv)">
            <CreditCard class="size-4" /> Record payment
          </Button>
        </Card>
        <p v-if="!filtered.length" class="py-10 text-center text-sm text-muted-foreground">{{ invoices.length ? "No invoices match your filters." : "No invoices yet." }}</p>
      </div>

      <!-- Desktop: table -->
      <Card class="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead><TableHead>Term</TableHead><TableHead>Amount</TableHead>
              <TableHead>Paid</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="inv in filtered" :key="inv.id">
              <TableCell class="font-medium">{{ inv.student.firstName }} {{ inv.student.lastName }}</TableCell>
              <TableCell>{{ inv.term }}</TableCell>
              <TableCell>{{ inv.amount.toLocaleString() }}</TableCell>
              <TableCell>{{ paidOf(inv).toLocaleString() }}</TableCell>
              <TableCell class="text-muted-foreground">{{ methodsOf(inv) || "—" }}</TableCell>
              <TableCell><Badge :variant="statusVariant(inv.status)">{{ inv.status }}</Badge></TableCell>
              <TableCell>
                <Button v-if="inv.status !== 'PAID'" variant="outline" size="sm" @click="openPay(inv)">
                  <CreditCard class="size-4" /> Record payment
                </Button>
              </TableCell>
            </TableRow>
            <TableRow v-if="!filtered.length"><TableCell class="py-10 text-center text-muted-foreground">{{ invoices.length ? "No invoices match your filters." : "No invoices yet." }}</TableCell></TableRow>
          </TableBody>
        </Table>
      </Card>
    </template>

    <Modal v-model:open="showAdd" title="New invoice">
      <form class="space-y-3" @submit.prevent="create">
        <div class="space-y-1.5"><Label>Student</Label><Select v-model="form.studentId" :options="studentOptions" placeholder="Select student" /></div>
        <div class="space-y-1.5"><Label>Term</Label><Select v-model="form.term" :options="TERM_OPTIONS" placeholder="Select term" /></div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5"><Label>Amount</Label><Input v-model="form.amount" type="number" required /></div>
          <div class="space-y-1.5"><Label>Due date</Label><Input v-model="form.dueDate" type="date" required /></div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showAdd = false">Cancel</Button>
          <Button type="submit" :loading="saving" :disabled="!form.studentId">Issue invoice</Button>
        </div>
      </form>
    </Modal>

    <Modal v-model:open="showPay" title="Record payment">
      <form class="space-y-3" @submit.prevent="recordPayment">
        <div class="space-y-1.5"><Label>Amount</Label><Input v-model="payForm.amount" type="number" /></div>
        <div class="space-y-1.5"><Label>Method</Label><Input v-model="payForm.method" /></div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="showPay = false">Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
