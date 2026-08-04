import { reactive } from "vue";

export type ToastVariant = "default" | "success" | "destructive" | "warning";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

const state = reactive<{ toasts: ToastItem[] }>({ toasts: [] });
let counter = 0;

export function useToast() {
  function dismiss(id: number) {
    const i = state.toasts.findIndex((t) => t.id === id);
    if (i !== -1) state.toasts.splice(i, 1);
  }

  function toast(opts: {
    title: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
  }) {
    const id = ++counter;
    const item: ToastItem = {
      id,
      title: opts.title,
      description: opts.description,
      variant: opts.variant ?? "default",
      duration: opts.duration ?? 4000,
    };
    state.toasts.push(item);
    if (item.duration > 0) {
      setTimeout(() => dismiss(id), item.duration);
    }
    return id;
  }

  return {
    toasts: state.toasts,
    toast,
    dismiss,
    success: (title: string, description?: string) =>
      toast({ title, description, variant: "success" }),
    error: (title: string, description?: string) =>
      toast({ title, description, variant: "destructive" }),
  };
}
