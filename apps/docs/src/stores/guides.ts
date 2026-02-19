import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Guide } from '../data/guides';
import { guides as staticGuides } from '../data/guides';

export const useGuidesStore = defineStore('guides', () => {
  const guidesData = ref<Guide[] | null>(null);
  const loadedVersion = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const guides = computed(() => guidesData.value ?? staticGuides);

  function getGuideBySlug(slug: string): Guide | undefined {
    return (guidesData.value ?? staticGuides).find((g) => g.slug === slug);
  }

  async function loadGuides(versionKey: string) {
    if (guidesData.value && loadedVersion.value === versionKey) return;
    loading.value = true;
    error.value = null;
    try {
      const versionPath = versionKey === 'latest' ? 'latest' : `v${versionKey}`;
      const url = `/docs/${versionPath}/guides.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load guides: ${res.status}`);
      guidesData.value = (await res.json()) as Guide[];
      loadedVersion.value = versionKey;
    } catch (e) {
      // Fallback to static guides if json not yet generated (e.g. dev before docs:build)
      guidesData.value = null;
      loadedVersion.value = versionKey;
      error.value = e instanceof Error ? e.message : String(e);
      // Don't throw - use static fallback
    } finally {
      loading.value = false;
    }
  }

  function clearGuides() {
    guidesData.value = null;
    loadedVersion.value = null;
  }

  return {
    guides,
    loading,
    error,
    getGuideBySlug,
    loadGuides,
    clearGuides,
  };
});
