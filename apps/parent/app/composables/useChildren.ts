export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  isFirstTime: boolean;
  class?: { id: string; name: string; level: string } | null;
}

const ACTIVE_KEY = "parent-active-child";

export function useChildren() {
  const children = useState<Child[]>("children", () => []);
  const activeId = useState<string | null>("active-child", () => null);
  const loaded = useState<boolean>("children-loaded", () => false);

  async function load() {
    const api = useApi();
    const res = await api<{ students: Child[] }>("/students/mine");
    children.value = res.students;
    const stored = import.meta.client ? localStorage.getItem(ACTIVE_KEY) : null;
    if (stored && children.value.some((c) => c.id === stored)) {
      activeId.value = stored;
    } else if (children.value[0]) {
      activeId.value = children.value[0].id;
    }
    loaded.value = true;
  }

  function setActive(id: string) {
    activeId.value = id;
    if (import.meta.client) localStorage.setItem(ACTIVE_KEY, id);
  }

  const active = computed(() => children.value.find((c) => c.id === activeId.value) ?? null);

  return { children, activeId, active, loaded, load, setActive };
}
