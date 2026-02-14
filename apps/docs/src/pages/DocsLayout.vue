<template>
  <div class="docs-layout">
    <aside class="sidebar">
      <SidebarNav />
    </aside>
    <main class="content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import SidebarNav from '../components/SidebarNav.vue';
</script>

<style scoped>
.docs-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  min-width: 260px;
  flex-shrink: 0;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  overflow-x: hidden;
}

.content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 2rem 2.5rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
