<template>
  <div class="app">
    <a href="#main" class="skip-link">Skip to main content</a>
    <header class="header">
      <router-link to="/" class="logo">
        <FluxerLogo class="logo-icon" />
        <span class="logo-text">Fluxer.js</span>
      </router-link>
      <nav class="header-nav header-nav-desktop" aria-label="Main navigation">
        <router-link to="/v/latest/guides" class="header-link">Guides</router-link>
        <router-link to="/v/latest/api" class="header-link">REST API</router-link>
        <router-link to="/v/latest/docs" class="header-link">Docs</router-link>
        <router-link to="/changelog" class="header-link">Changelog</router-link>
        <span class="header-spacer"></span>
        <div class="header-right">
          <div class="header-tools">
            <SearchBar />
            <VersionPicker />
          </div>
          <div class="header-icons">
            <a
              href="https://github.com/fluxerjs/core"
              target="_blank"
              rel="noopener noreferrer"
              class="header-icon-link"
              aria-label="GitHub repository">
              <svg class="icon-github" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a
              href="https://fluxer.gg/fluxer-js"
              target="_blank"
              rel="noopener noreferrer"
              class="header-icon-link"
              aria-label="Fluxer website">
              <FluxerLogo class="icon-fluxer" />
            </a>
          </div>
        </div>
      </nav>
      <button
        type="button"
        class="header-menu-btn"
        :aria-label="mobileMenuOpen ? 'Close menu' : 'Open menu'"
        :aria-expanded="mobileMenuOpen"
        @click="mobileMenuOpen = !mobileMenuOpen">
        <span class="menu-icon" :class="{ open: mobileMenuOpen }">
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
        </span>
      </button>
    </header>
    <Transition name="mobile-menu">
      <div v-if="mobileMenuOpen" class="mobile-menu-overlay" @click="mobileMenuOpen = false">
        <nav class="mobile-menu" aria-label="Mobile navigation" @click.stop>
          <router-link to="/v/latest/guides" class="mobile-link" @click="mobileMenuOpen = false">
            Guides
          </router-link>
          <router-link to="/v/latest/api" class="mobile-link" @click="mobileMenuOpen = false">
            REST API
          </router-link>
          <router-link to="/v/latest/docs" class="mobile-link" @click="mobileMenuOpen = false">
            Docs
          </router-link>
          <router-link to="/changelog" class="mobile-link" @click="mobileMenuOpen = false">
            Changelog
          </router-link>
          <div class="mobile-menu-row">
            <SearchBar />
            <VersionPicker />
          </div>
          <a
            href="https://github.com/fluxerjs/core"
            target="_blank"
            rel="noopener noreferrer"
            class="mobile-link mobile-link-icon"
            aria-label="GitHub repository"
            @click="mobileMenuOpen = false">
            <svg class="icon-github" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span>GitHub</span>
          </a>
          <a
            href="https://fluxer.gg/fluxer-js"
            target="_blank"
            rel="noopener noreferrer"
            class="mobile-link mobile-link-icon"
            aria-label="Fluxer website"
            @click="mobileMenuOpen = false">
            <FluxerLogo class="icon-fluxer" />
            <span>Fluxer ↗</span>
          </a>
        </nav>
      </div>
    </Transition>
    <main
      id="main"
      class="layout"
      :class="{
        'layout-docs': isDocsRoute,
        'layout-guides': isGuidesRoute,
        'layout-api': isApiRoute,
      }"
      role="main">
      <div class="layout-scroll">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
        <Footer v-if="!hideFooterInLayout" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useDocsStore } from './stores/docs';
import { useGuidesStore } from './stores/guides';
import { useVersionStore } from './stores/version';
import VersionPicker from './components/VersionPicker.vue';
import SearchBar from './components/SearchBar.vue';
import FluxerLogo from './components/FluxerLogo.vue';
import Footer from './components/Footer.vue';

const route = useRoute();
const mobileMenuOpen = ref(false);
const docsStore = useDocsStore();

watch(
  () => route.path,
  () => {
    mobileMenuOpen.value = false;
  },
);

watch(mobileMenuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : '';
});

const isDocsRoute = computed(() => route.path.includes('/docs'));
const isGuidesRoute = computed(() => route.path.includes('/guides'));
const isApiRoute = computed(() => route.path.includes('/api'));
const hideFooterInLayout = computed(
  () => isDocsRoute.value || isGuidesRoute.value || isApiRoute.value,
);

const guidesStore = useGuidesStore();
const versionStore = useVersionStore();

onMounted(async () => {
  await versionStore.loadVersions();
});

// Sync route version to store when navigating
watch(
  () => route.params.version as string | undefined,
  (v) => {
    if (v) versionStore.setVersion(v);
  },
  { immediate: true },
);

// Lazy-load docs only when visiting docs section; each version = separate file
watch(
  () => ({ path: route.path, version: route.params.version }),
  async ({ path, version }) => {
    if (!version) return;
    const key = (version as string) === 'latest' ? 'latest' : (version as string);
    if (path?.includes('/docs')) await docsStore.loadDocs(key);
    if (path?.includes('/guides')) await guidesStore.loadGuides(key);
  },
  { immediate: true },
);
</script>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.header {
  height: 56px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 1.25rem;
  gap: 1rem;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--text-primary);
  text-decoration: none;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  letter-spacing: -0.02em;
}

.logo:hover {
  color: var(--accent);
  text-decoration: none;
}

.logo:hover .logo-icon,
.logo:hover .logo-text {
  color: inherit;
}

.logo-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  color: inherit;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-tools {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.header-icons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.header-tools :deep(.search-trigger-wrap) {
  flex: 0 0 auto;
  width: 130px;
}

.header-tools :deep(.version-picker) {
  flex: 0 0 auto;
  width: 92px;
}

.header-spacer {
  flex: 1;
  min-width: 1rem;
}

.header-tools :deep(.search-trigger),
.header-tools :deep(.version-trigger) {
  height: 34px;
  min-height: 34px;
  display: flex;
  align-items: center;
}

.header-icon-link {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.35rem;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  transition:
    color 0.15s,
    background 0.15s;
}

.header-icon-link:hover {
  background: var(--bg-hover);
}

.header-icon-link:hover {
  color: var(--accent);
}

.icon-github,
.icon-fluxer {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.icon-fluxer {
  color: inherit;
}

.header-link {
  flex-shrink: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s;
}

.header-link:hover {
  color: var(--accent);
}

.header-link.router-link-active {
  color: var(--accent);
}

.header-menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  cursor: pointer;
}

.menu-icon {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.menu-icon .bar {
  display: block;
  width: 20px;
  height: 2px;
  background: currentColor;
  border-radius: 1px;
  transition: transform 0.2s;
}

.menu-icon.open .bar:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.menu-icon.open .bar:nth-child(2) {
  opacity: 0;
}

.menu-icon.open .bar:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

.mobile-menu-overlay {
  position: fixed;
  inset: 0;
  top: 56px;
  z-index: 200;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.mobile-menu {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 1rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  max-height: calc(100vh - 56px);
  overflow-y: auto;
}

.mobile-link {
  display: block;
  padding: 0.9rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
  text-decoration: none;
  border-radius: var(--radius-sm);
  transition:
    background 0.15s,
    color 0.15s;
}

.mobile-link:hover {
  background: var(--bg-hover);
  color: var(--accent);
}

.mobile-link.router-link-active {
  color: var(--accent);
  background: var(--bg-active);
}

.mobile-link-icon {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.mobile-link-icon .icon-github {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.mobile-link-icon .icon-fluxer {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: inherit;
}

.mobile-menu-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin: 0.25rem 0;
}

.mobile-menu-row .search-trigger-wrap,
.mobile-menu-row .version-picker {
  flex: 1;
  min-width: 0;
}

.mobile-menu-row .version-picker .version-trigger {
  width: 100%;
  justify-content: center;
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.2s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
}

.skip-link {
  position: absolute;
  top: -100px;
  left: 1rem;
  z-index: 1001;
  padding: 0.5rem 1rem;
  background: var(--accent);
  color: var(--bg-primary);
  font-weight: 600;
  border-radius: var(--radius);
  text-decoration: none;
  transition: top 0.15s;
}

.skip-link:focus {
  top: 1rem;
  outline: 2px solid var(--accent-hover);
  outline-offset: 2px;
}

.layout {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.layout.layout-docs,
.layout.layout-guides,
.layout.layout-api {
  overflow: hidden;
}

.layout-docs .layout-scroll,
.layout-guides .layout-scroll,
.layout-api .layout-scroll {
  height: 100%;
  overflow: hidden;
}

.layout-scroll {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.layout-scroll > :first-child {
  flex: 1;
  min-height: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .header-nav-desktop {
    display: none !important;
  }

  .header-menu-btn {
    display: flex;
    margin-left: auto;
  }

  .header {
    padding: 0 1rem;
  }
}
</style>
