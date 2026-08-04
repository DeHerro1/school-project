<script setup lang="ts">
import { ref, watch } from "vue";
import { Camera } from "lucide-vue-next";
import { Card, CardContent, Spinner, EmptyState } from "@repo/ui";

const api = useApi();
const { activeId, loaded, load } = useChildren();
const { fileUrl } = useFiles();

const loading = ref(true);
const media = ref<any[]>([]);

async function loadData(id: string) {
  loading.value = true;
  try {
    media.value = (await api<{ media: any[] }>(`/media?studentId=${id}`)).media;
  } finally {
    loading.value = false;
  }
}
onMounted(async () => { if (!loaded.value) await load(); });
watch(activeId, (id) => { if (id) loadData(id); }, { immediate: true });
</script>

<template>
  <div>
    <PageHeader title="Photos" subtitle="Moments from your child's school day" />
    <div v-if="loading" class="flex justify-center py-16"><Spinner class="size-7 text-primary" /></div>
    <EmptyState v-else-if="!media.length" title="No photos yet" description="Photos shared by teachers appear here.">
      <template #icon><Camera /></template>
    </EmptyState>
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="m in media" :key="m.id" class="overflow-hidden">
        <img :src="fileUrl(m.fileUrl)" :alt="m.caption" class="aspect-square w-full object-cover" />
        <CardContent class="pt-3">
          <p v-if="m.caption" class="text-sm">{{ m.caption }}</p>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ m.teacher?.name }} · {{ new Date(m.createdAt).toLocaleDateString() }}
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
