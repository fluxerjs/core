/**
 * No-op changelog. Changelog is maintained in apps/docs/src/data/changelog.ts
 * as the single source of truth for the docs site.
 */
async function getReleaseLine() {
  return '';
}

async function getDependencyReleaseLine() {
  return '';
}

module.exports = {
  getReleaseLine,
  getDependencyReleaseLine,
};
