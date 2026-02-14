<template>
  <div class="home">
    <div class="hero">
      <h1>Fluxer.js</h1>
      <p class="lead">SDK for building bots on Fluxer.</p>
      <nav class="hero-nav">
        <router-link to="/guides" class="nav-link">Guides</router-link>
        <router-link to="/docs" class="nav-link">Docs</router-link>
        <a href="https://github.com/fluxerjs/core" target="_blank" rel="noopener noreferrer" class="nav-link">GitHub</a>
        <a href="https://fluxer.gg/fluxer-js" target="_blank" rel="noopener noreferrer" class="nav-link nav-link-external">Fluxer</a>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.home {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
}

.hero {
  text-align: center;
}

.hero h1 {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  letter-spacing: -0.04em;
}

.lead {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.hero-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1.5rem 2rem;
}

.nav-link {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: none;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}

.nav-link:hover {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.nav-link-external::after {
  content: ' ↗';
  font-size: 0.8em;
  opacity: 0.7;
}
</style>
