'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { SiteHeader } from './Header';
import { SupportBanner } from './SupportBanner';

const COMPACT_ON = 52;
const COMPACT_OFF = 10;

const spring = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 34,
  mass: 0.85,
};

function useCompactOnScroll(): boolean {
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    let current = window.scrollY > COMPACT_ON;
    setCompact(current);
    const onScroll = (): void => {
      const y = window.scrollY;
      const next = current ? y > COMPACT_OFF : y > COMPACT_ON;
      if (next === current) return;
      current = next;
      setCompact(next);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return compact;
}

function pathHasDocsSidebar(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith('/docs') ||
    pathname.startsWith('/guides') ||
    pathname.startsWith('/rest') ||
    pathname.startsWith('/examples')
  );
}

function useChromePadding(
  compact: boolean,
  hasSidebar: boolean,
): { left: number; right: number; top: number; bottom: number } {
  const [padding, setPadding] = useState({ left: 0, right: 0, top: 0, bottom: 0 });

  useEffect(() => {
    const sync = (): void => {
      // Docs pages keep a full-width bar so the pill never sits on the sidebar.
      if (!compact || hasSidebar) {
        setPadding({ left: 0, right: 0, top: 0, bottom: 0 });
        return;
      }
      const w = window.innerWidth;
      const inset = w >= 1280 ? 20 : w >= 1024 ? 16 : w >= 640 ? 16 : 12;
      setPadding({ left: inset, right: inset, top: 10, bottom: 10 });
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [compact, hasSidebar]);

  return padding;
}

export function SiteChrome({ onOpenSearch }: { onOpenSearch?: () => void }): React.ReactElement {
  const compact = useCompactOnScroll();
  const pathname = usePathname();
  const hasSidebar = pathHasDocsSidebar(pathname);
  const reduceMotion = useReducedMotion();
  const padding = useChromePadding(compact, hasSidebar);
  const rootRef = useRef<HTMLDivElement>(null);
  const transition = reduceMotion ? { duration: 0 } : spring;

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const sync = (): void => {
      document.documentElement.style.setProperty(
        '--header-h',
        `${Math.round(el.getBoundingClientRect().height)}px`,
      );
      document.documentElement.toggleAttribute('data-chrome-compact', compact);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.removeAttribute('data-chrome-compact');
      document.documentElement.style.removeProperty('--header-h');
    };
  }, [compact]);

  const floating = compact && !hasSidebar;

  return (
    <motion.div
      ref={rootRef}
      className="site-chrome pointer-events-none sticky top-0 z-40 flex justify-end"
      initial={false}
      animate={{
        paddingLeft: padding.left,
        paddingRight: padding.right,
        paddingTop: padding.top,
        paddingBottom: padding.bottom,
      }}
      transition={transition}>
      <motion.div
        className={cn(
          'site-chrome-pill pointer-events-auto w-full origin-top overflow-hidden transition-[background-color,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          floating
            ? 'border border-border/70 bg-background/80 shadow-[0_10px_40px_-12px_rgba(15,18,28,0.28)] backdrop-blur-2xl dark:bg-background/75 dark:shadow-[0_16px_48px_-14px_rgba(0,0,0,0.62)]'
            : compact
              ? 'border-b border-border bg-background'
              : 'bg-background',
        )}
        initial={false}
        animate={{ borderRadius: floating ? 40 : 0 }}
        transition={transition}>
        <SiteHeader compact={compact} onOpenSearch={onOpenSearch} />
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
            compact ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
          )}
          aria-hidden={compact}
          inert={compact}>
          <div className="min-h-0 overflow-hidden">
            <SupportBanner />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
