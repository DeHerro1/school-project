// Turn an API-relative file path (e.g. "/files/abc.jpg") into an absolute URL.
export function useFiles() {
  const config = useRuntimeConfig();
  function fileUrl(path?: string | null): string | undefined {
    if (!path) return undefined;
    // Mock mode serves images as inline data: URIs; pass those through untouched.
    if (path.startsWith("http") || path.startsWith("data:")) return path;
    return `${config.public.apiBase}${path}`;
  }
  return { fileUrl };
}
