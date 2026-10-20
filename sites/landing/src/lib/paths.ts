/** Prefix asset/link paths with Astro `base` (GitHub Pages: /apihub/). */
export function withBase(path: string): string {
  const b = import.meta.env.BASE_URL;
  if (!path) return b;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.replace(/^\/+/, '');
  return b + normalized;
}

/** Root of the org Pages hub (sibling product landings). */
export const NETCRACKER_PAGES_ROOT = 'https://netcracker.github.io/';
