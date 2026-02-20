import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { DocOutput } from '../types/doc-schema';

/** Version used for fetch path: "latest" or "v1.0.5" */
export type DocsVersionKey = string;

export const useDocsStore = defineStore('docs', () => {
  const docsData = ref<DocOutput | null>(null);
  const loadedVersion = ref<DocsVersionKey | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const currentDoc = computed(() => docsData.value);

  /**
   * Load docs for a specific version. Uses versioned path: docs/{version}/main.json
   */
  async function loadDocs(versionKey: DocsVersionKey) {
    if (docsData.value && loadedVersion.value === versionKey) return;
    loading.value = true;
    error.value = null;
    try {
      const versionPath = versionKey === 'latest' ? 'latest' : `v${versionKey}`;
      const url = `/docs/${versionPath}/main.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load docs: ${res.status}`);
      const data = (await res.json()) as DocOutput;
      docsData.value = data;
      loadedVersion.value = versionKey;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Clear cached docs (e.g. when switching versions) */
  function clearDocs() {
    docsData.value = null;
    loadedVersion.value = null;
  }

  return {
    docsData,
    loadedVersion,
    loading,
    error,
    currentDoc,
    loadDocs,
    clearDocs,
  };
});
