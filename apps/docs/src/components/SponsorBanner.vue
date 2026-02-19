<template>
  <a
    href="https://github.com/sponsors/blstmo"
    target="_blank"
    rel="noopener noreferrer"
    class="sponsor-banner"
    aria-label="Sponsor Fluxer.js on GitHub Sponsors">
    <span class="sponsor-heart" aria-hidden="true">♥</span>
    <span class="sponsor-text">
      <strong>Support Fluxer.js</strong> — Sponsor or donate on GitHub to help keep the project
      going
    </span>
    <span class="sponsor-cta">Sponsor →</span>
  </a>
</template>

<script setup lang="ts"></script>

<style scoped>
.sponsor-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem 1.25rem;
  flex-wrap: wrap;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(99, 179, 237, 0.1) 100%);
  border-bottom: 1px solid rgba(236, 72, 153, 0.25);
  color: var(--text-primary);
  text-decoration: none;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.sponsor-banner:hover {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.22) 0%, rgba(99, 179, 237, 0.15) 100%);
  border-bottom-color: rgba(236, 72, 153, 0.4);
  color: var(--text-primary);
}

.sponsor-heart {
  font-size: 1.5rem;
  color: #ec4899;
  animation: heartbeat 1.5s ease-in-out infinite;
}

@keyframes heartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.sponsor-text {
  font-size: 1rem;
  line-height: 1.4;
}

.sponsor-text strong {
  color: var(--text-primary);
  font-weight: 600;
}

.sponsor-cta {
  font-size: 0.9rem;
  font-weight: 600;
  color: #ec4899;
  padding: 0.4rem 0.9rem;
  background: rgba(236, 72, 153, 0.2);
  border-radius: var(--radius);
  border: 1px solid rgba(236, 72, 153, 0.35);
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.sponsor-banner:hover .sponsor-cta {
  background: rgba(236, 72, 153, 0.3);
  border-color: rgba(236, 72, 153, 0.5);
  color: #f9a8d4;
}
</style>
