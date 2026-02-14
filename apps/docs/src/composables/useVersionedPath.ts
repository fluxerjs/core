import { computed } from 'vue';
import { useRoute } from 'vue-router';

/**
 * Get the current version from the route (e.g. "latest" or "1.0.5").
 * Use with path() to build versioned links.
 */
export function useVersionedPath() {
  const route = useRoute();

  const version = computed(() => (route.params.version as string) ?? 'latest');

  function path(relativePath: string): string {
    const v = version.value;
    const p = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    return `/v/${v}${p}`;
  }

  return { version, path };
}
