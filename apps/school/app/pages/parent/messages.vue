<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from "vue";
import { Send } from "lucide-vue-next";
import { Card, Button, Input, Avatar, Badge, Skeleton, EmptyState } from "@repo/ui";
import { SocketEvents } from "@repo/shared";
import { useAuthStore } from "~/stores/auth";

definePageMeta({ layout: "parent" });

const api = useApi();
const auth = useAuthStore();
const { $socket } = useNuxtApp();

const contacts = ref<any[]>([]);
const active = ref<any>(null);
const messages = ref<any[]>([]);
const draft = ref("");
const loading = ref(true);
const sending = ref(false);
const scroller = ref<HTMLElement | null>(null);

onMounted(async () => {
  contacts.value = (await api<{ contacts: any[] }>("/messages/contacts")).contacts;
  loading.value = false;

  const socket = ($socket as any)?.();
  socket?.on(SocketEvents.MESSAGE_NEW, (m: any) => {
    if (active.value && (m.senderId === active.value.id || m.receiverId === active.value.id)) {
      messages.value.push(m);
      scrollDown();
    }
  });
});

async function openChat(c: any) {
  active.value = c;
  messages.value = (await api<{ messages: any[] }>(`/messages?withUserId=${c.id}`)).messages;
  scrollDown();
}

async function send() {
  if (!draft.value.trim() || !active.value) return;
  sending.value = true;
  try {
    const res = await api<{ message: any }>("/messages", {
      method: "POST",
      body: { receiverId: active.value.id, body: draft.value.trim() },
    });
    messages.value.push(res.message);
    draft.value = "";
    scrollDown();
  } finally {
    sending.value = false;
  }
}

function scrollDown() {
  nextTick(() => {
    if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
  });
}
</script>

<template>
  <div>
    <PageHeader title="Messages" subtitle="Chat with your child's school" />

    <Card v-if="loading" class="grid h-[70vh] grid-cols-1 overflow-hidden md:grid-cols-[280px_1fr]">
      <div class="space-y-1 border-r p-3">
        <div v-for="i in 6" :key="i" class="flex items-center gap-3 p-2">
          <Skeleton class="size-9 shrink-0 rounded-full" />
          <div class="min-w-0 flex-1">
            <Skeleton class="h-3.5 w-24" />
            <Skeleton class="mt-1.5 h-3 w-12" />
          </div>
        </div>
      </div>
      <div class="hidden md:block" />
    </Card>
    <Card v-else class="grid h-[70vh] grid-cols-1 overflow-hidden md:grid-cols-[280px_1fr]">
      <!-- Contacts -->
      <div class="border-r" :class="active ? 'hidden md:block' : ''">
        <div class="h-full overflow-y-auto">
          <button
            v-for="c in contacts"
            :key="c.id"
            class="flex w-full items-center gap-3 border-b p-3 text-left hover:bg-accent"
            :class="active?.id === c.id ? 'bg-accent' : ''"
            @click="openChat(c)"
          >
            <Avatar :name="c.name" :src="c.avatarUrl" class="size-9" />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ c.name }}</p>
              <Badge variant="secondary" class="text-[10px] capitalize">{{ c.role.toLowerCase() }}</Badge>
            </div>
          </button>
          <p v-if="!contacts.length" class="p-4 text-sm text-muted-foreground">No contacts.</p>
        </div>
      </div>

      <!-- Conversation -->
      <div class="flex flex-col" :class="active ? '' : 'hidden md:flex'">
        <template v-if="active">
          <div class="flex items-center gap-3 border-b p-3">
            <Button variant="ghost" size="sm" class="md:hidden" @click="active = null">←</Button>
            <Avatar :name="active.name" :src="active.avatarUrl" class="size-8" />
            <span class="font-medium">{{ active.name }}</span>
          </div>
          <div ref="scroller" class="flex-1 space-y-2 overflow-y-auto bg-muted/20 p-4">
            <div
              v-for="m in messages"
              :key="m.id"
              class="flex"
              :class="m.senderId === auth.user?.id ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[75%] rounded-2xl px-3 py-2 text-sm"
                :class="m.senderId === auth.user?.id ? 'bg-primary text-primary-foreground' : 'bg-background border'"
              >
                {{ m.body }}
              </div>
            </div>
            <p v-if="!messages.length" class="py-8 text-center text-sm text-muted-foreground">
              No messages yet. Say hello!
            </p>
          </div>
          <form class="flex gap-2 border-t p-3" @submit.prevent="send">
            <Input v-model="draft" placeholder="Type a message…" />
            <Button type="submit" size="icon" :loading="sending" :disabled="!draft.trim()"><Send class="size-4" /></Button>
          </form>
        </template>
        <EmptyState v-else title="Select a conversation" class="m-auto border-0">
          <template #icon><Send /></template>
        </EmptyState>
      </div>
    </Card>
  </div>
</template>
