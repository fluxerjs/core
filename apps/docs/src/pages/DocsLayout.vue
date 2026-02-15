<template>
  <div class="docs-layout">
    <button
      type="button"
      class="sidebar-toggle"
      aria-label="Toggle navigation menu"
      @click="sidebarOpen = !sidebarOpen"
    >
      <span class="toggle-icon">{{ sidebarOpen ? '✕' : '☰' }}</span>
    </button>
    <div
      v-if="sidebarOpen"
      class="sidebar-backdrop"
      aria-hidden="true"
      @click="sidebarOpen = false"
    />
    <aside class="sidebar sidebar-base" :class="{ 'is-open': sidebarOpen }">
      <SidebarNav />
    </aside>
    <main class="content">
      <div class="content-scroll">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
      <Footer class="content-footer" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import SidebarNav from '../components/SidebarNav.vue';
import Footer from '../components/Footer.vue';

const route = useRoute();
const sidebarOpen = ref(false);
watch(
  () => route.path,
  () => {
    sidebarOpen.value = false;
  }
);
</script>

<style scoped>
.docs-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.sidebar {
  /* Shared styles from .sidebar-base in main.css */
}

.content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.content-scroll {
  flex: 1;
  padding: 2rem 2.5rem;
  min-width: 0;
}

.content-footer {
  flex-shrink: 0;
}

.sidebar-toggle {
  display: none;
  position: fixed;
  bottom: 1.25rem;
  left: 1.25rem;
  z-index: 99;
  width: 48px;
  height: 48px;
  padding: 0;
  background: var(--accent);
  color: var(--bg-primary);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition:
    transform 0.2s,
    background 0.2s;
}

.sidebar-toggle:hover {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.sidebar-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 99;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

@media (max-width: 900px) {
  .sidebar-toggle,
  .sidebar-backdrop {
    display: block;
  }
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
