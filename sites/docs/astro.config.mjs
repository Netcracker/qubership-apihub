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
  'user-guide': ['portal', 'agent', 'agent-discovery'],
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
  'reference/api-changes': ['schema-changes', 'principles', 'openapi', 'graphql'],
  // The order of the old wiki sidebar (the `order` column of the compatibility wiki map).
  'reference/api-changes/openapi': [
    'general-operation-parameters',
    'headers',
    'operation-parameters',
    'parameters-schema',
    'parameters-examples',
    'request',
    'request-body-schema',
    'request-body-examples',
    'response',
    'response-body-schema',
    'response-body-examples',
    'response-headers-schema',
    'oas-extensions',
  ],
  'reference/api-changes/graphql': [
    'root-type-general',
    'scalar-type-argument-of-root-type',
    'input-type-argument-of-root-type',
    'scalar-output-type-of-root-type',
    'object-output-type-of-root-type',
    'object-output-type-of-root-type-that-implements-interface',
    'union-output-type-of-root-type',
    'directives',
    'interface-output-type-of-root-type',
  ],
};

// Group labels for folders without a README, where the folder name does not read well.
const LABELS = {
  'reference/api-changes/openapi': 'OpenAPI',
  'reference/api-changes/graphql': 'GraphQL',
  'design/custom-openapi-extensions': 'Custom OpenAPI extensions',
  'design/vscode-extension': 'VS Code extension',
  'design/contract-types': 'Contract types',
  'design/ai-assistant': 'AI assistant',
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

const { sidebar, unlisted } = buildSidebar({ pages: collectPages(), sections: SECTIONS, links: LINKS, order: ORDER, labels: LABELS });
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
