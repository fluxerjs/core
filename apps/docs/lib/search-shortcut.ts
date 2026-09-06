/** Platform-aware search shortcut label. */
export function detectSearchShortcut(platform: string): '⌘K' | 'Ctrl K' {
  return /mac|iphone|ipad|ipod/i.test(platform) ? '⌘K' : 'Ctrl K';
}
