<template>
  <div class="not-found-page">
    <h1>404</h1>
    <p class="message">Page not found.</p>
    <p class="hint">The page you're looking for doesn't exist or has been moved.</p>
    <nav class="not-found-nav">
      <router-link to="/" class="nav-link">Home</router-link>
      <router-link to="/v/latest/guides" class="nav-link">Guides</router-link>
      <router-link to="/v/latest/docs" class="nav-link">Docs</router-link>
      <router-link to="/changelog" class="nav-link">Changelog</router-link>
    </nav>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.not-found-page {
  max-width: 480px;
  margin: 4rem auto;
  padding: 2rem;
  text-align: center;
}

.not-found-page h1 {
  font-size: 4rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
  letter-spacing: -0.04em;
}

.message {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.hint {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
  line-height: 1.5;
}

.not-found-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
}

.nav-link {
  font-weight: 500;
}
</style>
