<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="search-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="searchContextLabel"
        @click.self="close"
        @keydown="handleKeydown">
        <div ref="modalRef" class="search-modal">
          <div class="search-input-wrap">
            <span class="search-icon" aria-hidden>⌘K</span>
            <input
              ref="inputRef"
              v-model="query"
              type="search"
              :placeholder="searchPlaceholder"
              class="search-input"
              autocomplete="off"
              :aria-label="searchContextLabel"
              @keydown.esc="close"
              @keydown.down.prevent="selectNext"
              @keydown.up.prevent="selectPrev"
              @keydown.enter="navigateSelected" />
          </div>

          <div v-if="query.length >= 1" class="search-results">
            <template v-if="filtered.length">
              <router-link
                v-for="(r, i) in filtered.slice(0, 12)"
                :key="r.id"
                :to="searchResultTo(r)"
                class="result-row"
                :class="{ selected: i === selectedIndex }"
                @click="close">
                <span :class="['result-type', 'type-' + r.type]">{{ typeLabel(r.type) }}</span>
                <span class="result-name">{{
                  r.type === 'guide' ? r.name : r.parent ? `${r.parent}.${r.name}` : r.name
                }}</span>
              </router-link>
            </template>
            <div v-else class="result-empty">No results for "{{ query }}"</div>
          </div>

          <div class="search-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> select</span>
            <span><kbd>esc</kbd> close</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useDocsStore } from '../stores/docs';
import { useGuidesStore } from '../stores/guides';
import { useSearchIndex, useGuidesSearchIndex } from '../composables/useSearchIndex';
import { SearchHit } from '../composables/useSearchIndex';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const docsStore = useDocsStore();
const guidesStore = useGuidesStore();
const router = useRouter();
const route = useRoute();

const docsIndex = useSearchIndex(docsStore);
const guidesIndex = useGuidesSearchIndex(guidesStore);

const searchContext = computed(() => {
  const path = route.path;
  if (path.includes('/guides')) return 'guides';
  if (path.includes('/docs')) return 'docs';
  return 'all';
});

const searchPlaceholder = computed(() => {
  switch (searchContext.value) {
    case 'guides':
      return 'Search guides...';
    case 'docs':
      return 'Search classes, methods, properties...';
    default:
      return 'Search docs and guides...';
  }
});

const searchContextLabel = computed(() => {
  switch (searchContext.value) {
    case 'guides':
      return 'Search guides';
    case 'docs':
      return 'Search API documentation';
    default:
      return 'Search documentation';
  }
});

const index = computed(() => {
  if (searchContext.value === 'guides') return guidesIndex.value;
  if (searchContext.value === 'docs') return docsIndex.value;
  return [...docsIndex.value, ...guidesIndex.value];
});

function searchResultTo(r: SearchHit) {
  const params = {
    ...(r.path.params ?? {}),
    version: (route.params.version as string) ?? 'latest',
  };
  return { name: r.path.name, params, hash: r.path.hash ?? '' };
}

const query = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const modalRef = ref<HTMLElement | null>(null);
const selectedIndex = ref(0);

function getFocusables(): HTMLElement[] {
  if (!modalRef.value) return [];
  const focusables = modalRef.value.querySelectorAll<HTMLElement>(
    'input:not([disabled]), button:not([disabled]), a[href]',
  );
  return Array.from(focusables).filter((el) => (el as HTMLElement).offsetParent !== null);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const focusables = getFocusables();
  if (focusables.length <= 1) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
}

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim();
  if (!q) return [];
  return index.value.filter((h) => {
    const name = h.name.toLowerCase();
    const parent = (h.parent ?? '').toLowerCase();
    return name.includes(q) || parent.includes(q) || `${parent}.${name}`.includes(q);
  });
});

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      query.value = '';
      selectedIndex.value = 0;
      requestAnimationFrame(() => inputRef.value?.focus());
    }
  },
);

watch(filtered, () => {
  selectedIndex.value = 0;
});

function typeLabel(t: SearchHit['type']): string {
  const map: Record<SearchHit['type'], string> = {
    class: 'Class',
    interface: 'Interface',
    enum: 'Enum',
    method: 'Method',
    property: 'Prop',
    member: 'Member',
    guide: 'Guide',
  };
  return map[t] ?? t;
}

function selectNext() {
  selectedIndex.value = Math.min(selectedIndex.value + 1, filtered.value.length - 1);
}

function selectPrev() {
  selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
}

function navigateSelected() {
  const item = filtered.value[selectedIndex.value];
  if (item) {
    router.push(searchResultTo(item));
    close();
  }
}

function close() {
  emit('close');
}
</script>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
}

.search-modal {
  width: 100%;
  max-width: 560px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
}

.search-icon {
  font-size: 1rem;
  color: var(--text-muted);
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
  outline: none;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-results {
  max-height: 320px;
  overflow-y: auto;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  color: var(--text-primary);
  text-decoration: none;
  transition: background 0.1s;
}

.result-row:hover,
.result-row.selected {
  background: var(--bg-active);
}

.result-type {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  min-width: 4.5rem;
  color: var(--text-muted);
}

.result-type.type-class {
  color: var(--accent);
}
.result-type.type-interface {
  color: var(--badge-interface);
}
.result-type.type-enum {
  color: var(--badge-enum);
}
.result-type.type-method {
  color: var(--ts-string);
}
.result-type.type-property {
  color: var(--ts-type);
}
.result-type.type-member {
  color: var(--ts-keyword);
}
.result-type.type-guide {
  color: var(--accent);
}

.result-name {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.9rem;
}

.result-empty {
  padding: 1.5rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.search-footer {
  display: flex;
  gap: 1.25rem;
  padding: 0.6rem 1.25rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border-subtle);
}

kbd {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  padding: 0.15em 0.4em;
  background: var(--bg-tertiary);
  border-radius: 3px;
  font-size: 0.75em;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .search-modal,
.modal-leave-active .search-modal {
  transition: transform 0.15s ease;
}
.modal-enter-from .search-modal,
.modal-leave-to .search-modal {
  transform: scale(0.96);
}
</style>
