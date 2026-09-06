/** Canonical docs site origin (no trailing slash). */
export const SITE_URL = 'https://fluxer.js.org';

export const GITHUB_REPO = 'https://github.com/fluxerjs/core';

/** GitHub Sponsors for Fluxer.js development. */
export const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/blstmo';

/** Pluuty helps fund Fluxer.js. */
export const PLUUTY_URL = 'https://pluuty.com';

function withDocsUtm(base: string, content: string): string {
  const url = new URL(base);
  url.searchParams.set('utm_source', 'fluxerjs');
  url.searchParams.set('utm_medium', 'docs');
  url.searchParams.set('utm_campaign', 'funding');
  url.searchParams.set('utm_content', content);
  return url.href;
}

/** Pluuty link with docs UTM (`banner`, `header`, `help_fab`, …). */
export function pluutyHref(content: string): string {
  return withDocsUtm(PLUUTY_URL, content);
}

/** GitHub Sponsors link with docs UTM. */
export function githubSponsorsHref(content: string): string {
  return withDocsUtm(GITHUB_SPONSORS_URL, content);
}

export function githubPullUrl(pr: number): string {
  return `${GITHUB_REPO}/pull/${pr}`;
}

export function githubCompareUrl(from: string, to: string): string {
  return `${GITHUB_REPO}/compare/v${from}...${to.startsWith('v') || to === 'main' || to === 'HEAD' ? to : `v${to}`}`;
}

/** Absolute URL with trailing slash (matches `trailingSlash: true`). */
export function absoluteUrl(pathname: string): string {
  const path = pathname === '/' ? '/' : pathname.replace(/\/?$/, '/');
  return new URL(path, `${SITE_URL}/`).href;
}
