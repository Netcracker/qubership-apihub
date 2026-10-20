import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import starlightLinksValidator from 'starlight-links-validator';
import { collectPages } from './scripts/sync-docs.mjs';
import { buildSidebar, REPO_URL } from './scripts/sync-docs-lib.mjs';

const PAGES_URL = 'https://netcracker.github.io/qubership-apihub';

// The sidebar groups, in this order. A group lists its pages (slugs, '' is docs/README.md) and then
// every page under its directory, so a new file in docs/<directory>/ joins its group by itself. A
// group without pages is left out, so a folder that does not exist yet breaks nothing.
const SECTIONS = [
  {
    label: 'Get started',
    pages: [
      { slug: '', label: 'Overview' },
      { slug: 'installation-guide', label: 'Installation' },
    ],
    directory: 'getting-started',
  },
  { label: 'User guide', pages: [{ slug: 'user-guide', label: 'Overview' }], directory: 'user-guide' },
  { label: 'Reference', directory: 'reference' },
  {
    label: 'Administration',
    pages: [
      { slug: 'admin-guide', label: 'Administrator guide' },
      { slug: 'configuration-reference', label: 'Configuration reference' },
      { slug: 'maintenance-guide', label: 'Maintenance guide' },
    ],
    directory: 'administration',
  },
  { label: 'Architecture', directory: 'architecture' },
  { label: 'Design', directory: 'design', collapsed: true },
  { label: 'Development', directory: 'development' },
];

// The order inside a folder, by file or folder name; the others follow by name.
const ORDER = {
  architecture: ['overview', 'features', 'processing-libraries', 'build-process', 'database'],
  development: [
    'getting-started',
    'workflow',
    'build-and-test',
    'local-run',
    'debugging',
    'ci',
    'api-guidelines',
    'documentation',
    'ai-assistants',
    'release-process',
  ],
  'reference/api-changes': ['principles', 'schema-changes', 'openapi', 'graphql'],
};

const LINKS = [
  {
    label: 'More sites',
    items: [
      { label: 'All sites', link: `${PAGES_URL}/` },
      { label: 'Product landing', link: `${PAGES_URL}/landing/` },
      { label: 'Storybooks', link: `${PAGES_URL}/storybook/` },
      { label: 'Database ERD', link: `${PAGES_URL}/erd/` },
    ],
  },
];

const { sidebar, unlisted } = buildSidebar({ pages: collectPages(), sections: SECTIONS, links: LINKS, order: ORDER });
if (unlisted.length) {
  console.warn(
    `docs-site: pages in no sidebar group (add them to SECTIONS): ${unlisted.map((s) => `/${s}/`).join(', ')}`,
  );
}

export default defineConfig({
  site: 'https://netcracker.github.io',
  base: '/qubership-apihub/docs',
  trailingSlash: 'always',
  integrations: [
    // astro-mermaid must come before Starlight to see the mermaid code blocks.
    mermaid({ autoTheme: true }),
    starlight({
      title: 'Qubership APIHUB',
      description: 'Documentation of Qubership APIHUB: installation, administration, use, and development.',
      favicon: '/favicon.svg',
      social: [{ icon: 'github', label: 'GitHub', href: REPO_URL }],
      sidebar,
      // The installation guides link to http://localhost on purpose.
      plugins: [starlightLinksValidator({ errorOnLocalLinks: false })],
    }),
  ],
});
