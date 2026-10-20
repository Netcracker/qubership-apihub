import { getCollection } from 'astro:content';

/** Numeric semver compare on "vX.Y.Z" strings. Plain string compare sorts "v2.9.0" above "v2.12.0". */
function compareVersions(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

/**
 * The release card with the highest version in `src/content/releases/`.
 * Adding the card file of a new release is the only step: every "latest version" on the site derives from it.
 */
export async function getLatestRelease() {
  const cards = await getCollection('releases');
  if (cards.length === 0) {
    throw new Error('No release cards found in src/content/releases/');
  }
  return cards.map((c) => c.data).sort((a, b) => compareVersions(b.version, a.version))[0];
}
