'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const ATTR = 'data-hash-target';
const FLASH_MS = 2600;
const FIND_MS = 12_000;

function hashId(): string | null {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function clearHighlight(except?: Element): void {
  for (const el of document.querySelectorAll(`[${ATTR}]`)) {
    if (el === except) continue;
    el.removeAttribute(ATTR);
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function applyHighlight(el: HTMLElement): void {
  clearHighlight(el);
  el.removeAttribute(ATTR);
  void el.offsetWidth;
  el.setAttribute(ATTR, prefersReducedMotion() ? 'settled' : '');
}

function scrollToTarget(el: HTMLElement): void {
  const margin = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 96;
  const top = el.getBoundingClientRect().top;
  if (top >= margin - 12 && top <= margin + 120) return;
  const y = window.scrollY + top - margin;
  const reduce = prefersReducedMotion();
  const far = Math.abs(top - margin) > window.innerHeight * 0.6;
  window.scrollTo({
    top: Math.max(0, y),
    behavior: reduce || far ? 'auto' : 'smooth',
  });
}

function pathKey(pathname: string): string {
  return pathname.replace(/\/$/, '') || '/';
}

/**
 * Same-document hash jumps fire `hashchange` (and `:target`).
 * Next.js `router.push` to a new page often does not.
 */
export function pushDocsHref(href: string, push: (href: string) => void): void {
  if (typeof window === 'undefined') {
    push(href);
    return;
  }
  const next = new URL(href, window.location.href);
  const samePath = pathKey(window.location.pathname) === pathKey(next.pathname);
  if (samePath && next.hash) {
    if (window.location.hash === next.hash) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = next.hash;
    }
    return;
  }
  push(href);
}

/** Scroll to `#member` after client navigation (Next.js often skips hash on first paint). */
export function ScrollToHash(): null {
  const pathname = usePathname();

  useEffect(() => {
    // Hash is not in the Next.js router state; pathname re-runs this after client navigations.
    void pathname;
    let cancelled = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let stopTimer: ReturnType<typeof setTimeout> | undefined;
    let observer: MutationObserver | undefined;
    let highlighted: HTMLElement | null = null;

    const activate = (el: HTMLElement): void => {
      if (highlighted === el && el.hasAttribute(ATTR)) return;
      highlighted = el;
      scrollToTarget(el);
      applyHighlight(el);
      if (settleTimer) clearTimeout(settleTimer);
      if (el.getAttribute(ATTR) === 'settled') return;
      settleTimer = setTimeout(() => {
        if (cancelled) return;
        if (el.hasAttribute(ATTR)) el.setAttribute(ATTR, 'settled');
      }, FLASH_MS);
    };

    const apply = (): void => {
      if (cancelled) return;
      if (pollTimer) clearTimeout(pollTimer);
      if (stopTimer) clearTimeout(stopTimer);
      observer?.disconnect();
      highlighted = null;

      const id = hashId();
      if (!id) {
        clearHighlight();
        return;
      }

      const deadline = Date.now() + FIND_MS;
      const tryFind = (): void => {
        if (cancelled) return;
        const el = document.getElementById(id);
        if (el) {
          activate(el);
          return;
        }
        if (Date.now() < deadline) {
          pollTimer = setTimeout(tryFind, 50);
        }
      };

      tryFind();
      observer = new MutationObserver(() => {
        if (cancelled) return;
        const el = document.getElementById(id);
        if (!el) return;
        if (el !== highlighted || !el.hasAttribute(ATTR)) activate(el);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      stopTimer = setTimeout(() => observer?.disconnect(), FIND_MS);
    };

    apply();
    window.addEventListener('hashchange', apply);
    window.addEventListener('load', apply);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', apply);
      window.removeEventListener('load', apply);
      observer?.disconnect();
      if (settleTimer) clearTimeout(settleTimer);
      if (pollTimer) clearTimeout(pollTimer);
      if (stopTimer) clearTimeout(stopTimer);
    };
  }, [pathname]);

  return null;
}
