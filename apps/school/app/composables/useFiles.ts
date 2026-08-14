// Resolve a stored file reference to a displayable URL. Supabase Storage
// URLs (what the API now returns for photos/reports) are already absolute,
// so this is mostly a passthrough — the apiBase-prefix branch is kept only
// as a fallback in case a relative path ever shows up.
export function useFiles() {
  const config = useRuntimeConfig();
  function fileUrl(path?: string | null): string | undefined {
    if (!path) return undefined;
    if (path.startsWith("http") || path.startsWith("data:")) return path;
    return `${config.public.apiBase}${path}`;
  }
  return { fileUrl };
}
