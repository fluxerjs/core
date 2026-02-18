<template>
  <nav class="sidebar-nav">
    <div v-if="store.currentDoc" class="nav-content">
      <h3 class="sidebar-title">API Reference</h3>
      <router-link :to="versionedPath('/api')" class="sidebar-rest-api-link">
        REST API →
      </router-link>
      <div v-if="packages.length" class="sidebar-select-wrap">
        <select v-model="selectedPackage" class="sidebar-select">
          <option value="">All packages</option>
          <option v-for="p in packages" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      <input v-model="filter" type="search" placeholder="Filter..." class="sidebar-filter" />
      <div class="nav-group">
        <router-link :to="versionedPath('/docs/classes')" class="sidebar-group-label link">
          Classes
        </router-link>
        <div v-if="filteredClasses.length" class="sidebar-sublist">
          <router-link
            v-for="c in filteredClasses"
            :key="c.name"
            :to="versionedPath(`/docs/classes/${c.name}`)"
            class="sidebar-link sidebar-link-class"
            active-class="active"
            :title="c.name">
            {{ c.name }}
          </router-link>
        </div>
      </div>

      <div class="nav-group">
        <router-link :to="versionedPath('/docs/typedefs')" class="sidebar-group-label link">
          Interfaces
        </router-link>
        <div v-if="filteredInterfaces.length" class="sidebar-sublist">
          <router-link
            v-for="i in filteredInterfaces"
            :key="i.name"
            :to="versionedPath(`/docs/typedefs/${i.name}`)"
            class="sidebar-link sidebar-link-interface"
            active-class="active"
            :title="i.name">
            {{ i.name }}
          </router-link>
        </div>
      </div>

      <div class="nav-group">
        <router-link :to="versionedPath('/docs/typedefs')" class="sidebar-group-label link">
          Enums
        </router-link>
        <div v-if="filteredEnums.length" class="sidebar-sublist">
          <router-link
            v-for="e in filteredEnums"
            :key="e.name"
            :to="versionedPath(`/docs/typedefs/${e.name}`)"
            class="sidebar-link sidebar-link-enum"
            active-class="active"
            :title="e.name">
            {{ e.name }}
          </router-link>
        </div>
      </div>
    </div>
    <div v-else class="nav-placeholder">
      <p class="nav-loading">Loading...</p>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDocsStore } from '../stores/docs';
import { useVersionedPath } from '../composables/useVersionedPath';

const store = useDocsStore();
const { path: versionedPath } = useVersionedPath();
const filter = ref('');
const selectedPackage = ref('');

const packages = computed(() => store.currentDoc?.packages ?? []);

const filteredClasses = computed(() => {
  const q = filter.value.toLowerCase().trim();
  const pkg = selectedPackage.value;
  let list = store.currentDoc?.classes ?? [];
  if (pkg) list = list.filter((c) => (c as { package?: string }).package === pkg);
  if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
  return list;
});

const filteredInterfaces = computed(() => {
  const q = filter.value.toLowerCase().trim();
  const pkg = selectedPackage.value;
  let list = store.currentDoc?.interfaces ?? [];
  if (pkg) list = list.filter((i) => (i as { package?: string }).package === pkg);
  if (q) list = list.filter((i) => i.name.toLowerCase().includes(q));
  return list;
});

const filteredEnums = computed(() => {
  const q = filter.value.toLowerCase().trim();
  const pkg = selectedPackage.value;
  let list = store.currentDoc?.enums ?? [];
  if (pkg) list = list.filter((e) => (e as { package?: string }).package === pkg);
  if (q) list = list.filter((e) => e.name.toLowerCase().includes(q));
  return list;
});
</script>

<style scoped>
.sidebar-nav {
  padding: 0.75rem 0;
  display: flex;
  flex-direction: column;
}

.sidebar-rest-api-link {
  display: block;
  margin: 0 var(--sidebar-padding-x) 1rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  background: rgba(99, 179, 237, 0.1);
  border: 1px solid rgba(99, 179, 237, 0.25);
  border-radius: var(--radius-sm);
  transition:
    background 0.15s,
    border-color 0.15s;
}

.sidebar-rest-api-link:hover {
  background: rgba(99, 179, 237, 0.18);
  border-color: var(--accent);
}

.sidebar-filter {
  margin: 0 var(--sidebar-padding-x) 1rem;
  padding: 0.5rem var(--sidebar-padding-x);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.sidebar-filter::placeholder {
  color: var(--text-muted);
}

.sidebar-filter:focus {
  outline: none;
  border-color: var(--accent);
}

.nav-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-group {
  display: flex;
  flex-direction: column;
}

.sidebar-select-wrap {
  margin: 0 var(--sidebar-padding-x) 0.75rem;
}

.sidebar-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
}

.sidebar-select:focus {
  outline: none;
  border-color: var(--accent);
}

.sidebar-nav :deep(.sidebar-link) {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-placeholder {
  padding: 1rem;
}

.nav-loading {
  color: var(--text-muted);
  font-size: 0.8rem;
}
</style>
