<template>
  <nav class="sidebar-nav">
    <div v-if="store.currentDoc" class="nav-content">
      <div v-if="packages.length" class="sidebar-select-wrap">
        <select v-model="selectedPackage" class="sidebar-select">
          <option value="">All packages</option>
          <option v-for="p in packages" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      <input
        v-model="filter"
        type="search"
        placeholder="Filter..."
        class="sidebar-filter"
      />
      <div class="nav-group">
        <router-link :to="versionedPath('/docs/classes')" class="nav-group-title" active-class="active">
          Classes
        </router-link>
        <div v-if="filteredClasses.length" class="nav-sublist">
          <router-link
            v-for="c in filteredClasses"
            :key="c.name"
            :to="versionedPath(`/docs/classes/${c.name}`)"
            class="nav-sublink"
            active-class="active"
            :title="c.name"
          >
            {{ c.name }}
          </router-link>
        </div>
      </div>

      <div class="nav-group">
        <router-link :to="versionedPath('/docs/typedefs')" class="nav-group-title" active-class="active">
          Interfaces
        </router-link>
        <div v-if="filteredInterfaces.length" class="nav-sublist">
          <router-link
            v-for="i in filteredInterfaces"
            :key="i.name"
            :to="versionedPath(`/docs/typedefs/${i.name}`)"
            class="nav-sublink nav-sublink-interface"
            active-class="active"
            :title="i.name"
          >
            {{ i.name }}
          </router-link>
        </div>
      </div>

      <div class="nav-group">
        <router-link :to="versionedPath('/docs/typedefs')" class="nav-group-title" active-class="active">
          Enums
        </router-link>
        <div v-if="filteredEnums.length" class="nav-sublist">
          <router-link
            v-for="e in filteredEnums"
            :key="e.name"
            :to="versionedPath(`/docs/typedefs/${e.name}`)"
            class="nav-sublink nav-sublink-enum"
            active-class="active"
            :title="e.name"
          >
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

.sidebar-filter {
  margin: 0 0.75rem 0.75rem 0;
  padding: 0.5rem 0.75rem;
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

.nav-group-title {
  padding: 0.4rem 1rem;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.nav-group-title:hover {
  color: var(--text-secondary);
}

.nav-group-title.active {
  color: var(--accent);
}

.nav-sublist {
  padding-left: 0.75rem;
  margin-top: 0.25rem;
  border-left: 1px solid var(--border);
  margin-left: 0.75rem;
}

.sidebar-select-wrap {
  margin: 0 0.75rem 0.75rem 0;
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

.nav-sublink {
  display: block;
  padding: 0.35rem 0.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.8rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  border-radius: 4px;
  margin-left: -1px;
  border-left: 2px solid transparent;
  transition: color 0.15s, background 0.15s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-sublink:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.nav-sublink.active {
  color: var(--accent);
  border-left-color: var(--accent);
  background: var(--bg-active);
}

.nav-placeholder {
  padding: 1rem;
}

.nav-loading {
  color: var(--text-muted);
  font-size: 0.8rem;
}
</style>
