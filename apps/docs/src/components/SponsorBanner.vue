<template>
  <div v-if="!dismissed" class="support-cta-wrapper">
    <a
      href="https://github.com/sponsors/blstmo"
      target="_blank"
      rel="noopener noreferrer"
      class="support-cta-banner"
      aria-label="Support Fluxer.js on GitHub Sponsors">
      <span class="support-heart" aria-hidden="true">♥</span>
      <span class="support-text">
        <strong>Support Fluxer.js</strong> — Sponsor or donate on GitHub to help keep the project
        going
      </span>
      <span class="support-button">Sponsor →</span>
    </a>
    <button
      type="button"
      class="support-cta-close"
      aria-label="Dismiss support banner"
      @click="dismiss">
      ×
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const STORAGE_KEY = 'fluxer-docs-support-banner-dismissed';
const dismissed = ref(true); // Start hidden until we read localStorage (avoids flash for returning users)

function dismiss() {
  dismissed.value = true;
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Ignore storage errors
  }
}

onMounted(() => {
  try {
    dismissed.value = localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    dismissed.value = false;
  }
});
</script>

<style scoped>
.support-cta-wrapper {
  position: relative;
  flex-shrink: 0;
}

.support-cta-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem 1.25rem;
  flex-wrap: wrap;
  padding: 1rem 3rem 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(99, 179, 237, 0.1) 100%);
  border-bottom: 1px solid rgba(236, 72, 153, 0.25);
  color: #e8e9ed;
  text-decoration: none;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.support-cta-banner:hover {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.22) 0%, rgba(99, 179, 237, 0.15) 100%);
  border-bottom-color: rgba(236, 72, 153, 0.4);
  color: #e8e9ed;
}

.support-heart {
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

.support-text {
  font-size: 1rem;
  line-height: 1.4;
  color: #e8e9ed;
}

.support-text strong {
  color: #e8e9ed;
  font-weight: 600;
}

.support-button {
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

.support-cta-banner:hover .support-button {
  background: rgba(236, 72, 153, 0.3);
  border-color: rgba(236, 72, 153, 0.5);
  color: #f9a8d4;
}

.support-cta-close {
  position: absolute;
  top: 50%;
  right: 0.75rem;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: rgba(232, 233, 237, 0.7);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}

.support-cta-close:hover {
  color: #e8e9ed;
  background: rgba(255, 255, 255, 0.1);
}
</style>
