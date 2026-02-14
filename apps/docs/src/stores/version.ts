import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const STORAGE_KEY = 'fluxer-docs-version';

export interface VersionsManifest {
  versions: string[];
  latest: string;
}

export const useVersionStore = defineStore('version', () => {
  const availableVersions = ref<string[]>([]);
  const latestVersion = ref<string>('');
  const currentVersion = ref<string>('latest');
  const versionsLoaded = ref(false);

  function setVersion(version: string) {
    currentVersion.value = version;
    try {
      localStorage.setItem(STORAGE_KEY, version);
    } catch {
      /* ignore */
    }
  }

  function getVersionForFetch(): string {
    // "latest" maps to the actual latest version for fetching
    return currentVersion.value === 'latest' ? latestVersion.value : currentVersion.value;
  }

  async function loadVersions() {
    if (versionsLoaded.value) return;
    try {
      const base = import.meta.env.BASE_URL || '/';
      const res = await fetch(`${base}docs/versions.json`);
      if (!res.ok) throw new Error('Failed to load versions');
      const data = (await res.json()) as VersionsManifest;
      availableVersions.value = data.versions ?? [];
      latestVersion.value = data.latest ?? (data.versions?.[0] ?? '1.0.5');
      versionsLoaded.value = true;

      // Restore saved preference
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && (saved === 'latest' || availableVersions.value.includes(saved))) {
          currentVersion.value = saved;
        }
      } catch {
        /* ignore */
      }
    } catch {
      // Fallback when versions.json doesn't exist (e.g. dev before first generate)
      availableVersions.value = ['1.0.5'];
      latestVersion.value = '1.0.5';
      currentVersion.value = 'latest';
      versionsLoaded.value = true;
    }
  }

  return {
    availableVersions,
    latestVersion,
    currentVersion,
    versionsLoaded,
    setVersion,
    getVersionForFetch,
    loadVersions,
  };
});
