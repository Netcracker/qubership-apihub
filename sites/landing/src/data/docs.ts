/**
 * Documentation sub-site structure.
 *
 * `docsNav` drives the sidebar in `DocsLayout.astro`, the card grid on `/docs/`, and the
 * previous/next footer links. Adding a page means adding an entry here and creating the
 * matching `.astro` file — nothing else needs to change.
 */
import { withBase } from '../lib/paths';
import { DOCS_URL, INSTALL_URL, ADMIN_URL, WIKI_URL } from './content';

export interface DocsPage {
  href: string;
  label: string;
  summary: string;
}

export interface DocsSection {
  label: string;
  /** Shown on the hub when the section has no published pages yet. */
  upcoming?: boolean;
  pages: DocsPage[];
}

export const docsNav: DocsSection[] = [
  {
    label: 'Architecture',
    pages: [
      {
        href: withBase('docs/architecture/'),
        label: 'Overview',
        summary: 'Two models of the same platform, and how to read the four levels of C4.',
      },
      {
        href: withBase('docs/architecture/c4/'),
        label: 'The C4 model',
        summary: 'Context, containers, components and code — plus what runs where in Kubernetes.',
      },
      {
        href: withBase('docs/architecture/flows/'),
        label: 'Runtime flows',
        summary: 'What happens over time when you publish a version, run discovery, or ask an AI agent.',
      },
      {
        href: withBase('docs/architecture/capability-map/'),
        label: 'Capability map',
        summary: 'Sixty sub-capabilities with technology and maturity overlays, and the ArchiMate view.',
      },
    ],
  },
  {
    label: 'User documentation',
    upcoming: true,
    pages: [],
  },
];

/** Flat page order, used for previous/next navigation. */
export const docsPageOrder: DocsPage[] = docsNav.flatMap((s) => s.pages);

/** Guides that still live in the product repository rather than on this site. */
export const externalGuides = [
  {
    label: 'Installation Guide',
    href: INSTALL_URL,
    summary: 'Helm chart and Docker Compose deployment, prerequisites, and configuration reference.',
  },
  {
    label: 'User Guide',
    href: DOCS_URL,
    summary: 'Working with packages, versions, publishing, comparison, and the Portal interface.',
  },
  {
    label: 'Administrator Guide',
    href: ADMIN_URL,
    summary: 'Identity providers, roles, API keys, system settings, and maintenance tasks.',
  },
  {
    label: 'Wiki',
    href: WIKI_URL,
    summary: 'Background articles, design notes, and the wider APIHUB knowledge base.',
  },
];
