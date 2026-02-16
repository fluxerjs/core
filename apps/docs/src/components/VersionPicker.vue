<template>
  <div v-if="availableVersions.length > 0" ref="containerRef" class="version-picker">
    <button
      type="button"
      class="version-trigger"
      :class="{ open: open }"
      @click="open = !open"
      @blur="handleBlur">
      <span class="version-trigger-label">v{{ displayVersion }}</span>
      <span class="version-trigger-chevron">▼</span>
    </button>
    <Transition name="dropdown">
      <div v-if="open" class="version-dropdown">
        <button
          v-for="opt in versionOptions"
          :key="opt.value"
          type="button"
          class="version-option"
          :class="{ active: currentVersion === opt.value }"
          @mousedown.prevent="selectVersion(opt.value)">
          {{ opt.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter, useRoute } from 'vue-router';
import { useVersionStore } from '../stores/version';
import { useDocsStore } from '../stores/docs';
import { useGuidesStore } from '../stores/guides';

const versionStore = useVersionStore();
const docsStore = useDocsStore();
const guidesStore = useGuidesStore();
const router = useRouter();
const route = useRoute();

const open = ref(false);
const containerRef = ref<HTMLElement | null>(null);

function handleClickOutside(e: MouseEvent) {
  if (open.value && !containerRef.value?.contains(e.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));

const { availableVersions, latestVersion, currentVersion } = storeToRefs(versionStore);

const displayVersion = computed(() =>
  currentVersion.value === 'latest' ? latestVersion.value : currentVersion.value,
);

const versionOptions = computed(() => {
  const opts = [{ value: 'latest', label: `v${latestVersion.value} (latest)` }];
  for (const v of availableVersions.value) {
    if (v !== latestVersion.value) opts.push({ value: v, label: `v${v}` });
  }
  return opts;
});

function handleBlur() {
  setTimeout(() => {
    open.value = false;
  }, 150);
}

function selectVersion(newVersion: string) {
  open.value = false;
  versionStore.setVersion(newVersion);
  docsStore.clearDocs();
  guidesStore.clearGuides();

  const version = route.params.version as string | undefined;
  const path = route.path;
  // Changelog is never versioned - stay on /changelog or go to versioned guides
  if (path === '/changelog') {
    router.push(`/v/${newVersion}/guides`);
    return;
  }
  if (version !== undefined && path.startsWith('/v/')) {
    const newPath = path.replace(/^\/v\/[^/]+/, `/v/${newVersion}`);
    router.replace(newPath);
  } else {
    const subPath = path === '/' ? '/guides' : path;
    router.push(`/v/${newVersion}${subPath}`);
  }
}
</script>

<style scoped>
.version-picker {
  position: relative;
}

.version-trigger {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  height: 34px;
  min-height: 34px;
  padding: 0 0.6rem;
  font-size: 0.85rem;
  font-weight: 500;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}

.version-trigger:hover {
  color: var(--text-primary);
  border-color: var(--border);
}

.version-trigger.open {
  border-color: var(--accent);
  color: var(--accent);
}

.version-trigger-chevron {
  font-size: 0.55rem;
  opacity: 0.8;
  transition: transform 0.2s;
}

.version-trigger.open .version-trigger-chevron {
  transform: rotate(180deg);
}

.version-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 0.35rem 0;
  z-index: 100;
}

.version-option {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  text-align: left;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background 0.1s,
    color 0.1s;
}

.version-option:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.version-option.active {
  color: var(--accent);
  background: var(--bg-active);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
