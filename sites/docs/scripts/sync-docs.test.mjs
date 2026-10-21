import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildSidebar,
  contentPathOf,
  extractTitle,
  githubRefFrom,
  isPageSource,
  plainTitle,
  rewriteLinks,
  rewriteUrl,
  sidebarHints,
  slugOf,
  slugProblems,
  splitFrontMatter,
  titleFromFileName,
  transformPage,
} from './sync-docs-lib.mjs';

const GH = 'https://github.com/Netcracker/qubership-apihub';

// A small repository: the folders it has and the page sources of docs/ the sync publishes.
function fakeTree({ dirs = [], pages = [] } = {}) {
  const dirSet = new Set(dirs);
  const pageSet = new Set(pages);
  return { isDir: (p) => dirSet.has(p), hasPage: (p) => pageSet.has(p) };
}

const tree = fakeTree({
  dirs: ['docs', 'docs/design', 'docs/design/general', 'docs/internal', 'docs/user-guide', 'backend', 'backend/agent'],
  pages: ['README.md', 'design/README.md', 'design/general/README.md', 'admin-guide.md'],
});

describe('skip rules', () => {
  it('publishes Markdown outside docs/internal/ and docs/pages/', () => {
    assert.equal(isPageSource('admin-guide.md'), true);
    assert.equal(isPageSource('design/general/GF-001 Search.MD'), true);
    assert.equal(isPageSource('internal/README.md'), false);
    assert.equal(isPageSource('internal/adr/0001-x.md'), false);
    assert.equal(isPageSource('pages/erd/index.md'), false);
    assert.equal(isPageSource('images/arch.png'), false);
  });

  it('does not treat a file that only starts with internal as the folder', () => {
    assert.equal(isPageSource('internals.md'), true);
  });
});

describe('path mapping', () => {
  it('maps README.md and index.md to the page of their folder', () => {
    assert.equal(slugOf('README.md'), '');
    assert.equal(contentPathOf('README.md'), 'index.md');
    assert.equal(slugOf('design/README.md'), 'design');
    assert.equal(contentPathOf('design/README.md'), 'design/index.md');
    assert.equal(contentPathOf('reference/api-changes/index.md'), 'reference/api-changes/index.md');
  });

  it('slugifies spaces, uppercase, and punctuation like Astro', () => {
    assert.equal(slugOf('user-guide/Portal User Guide.md'), 'user-guide/portal-user-guide');
    assert.equal(contentPathOf('user-guide/Portal User Guide.md'), 'user-guide/portal-user-guide.md');
    assert.equal(
      slugOf('design/General Features/GF-010 Global Search (v4).md'),
      'design/general-features/gf-010-global-search-v4',
    );
    assert.equal(slugOf('design/a‐b.md'), 'design/ab');
  });

  it('rejects a name that gives an empty slug', () => {
    assert.throws(() => slugOf('design/???.md'), /empty slug/);
  });

  it('reports two files with one slug and names that Starlight skips', () => {
    assert.deepEqual(slugProblems(['admin-guide.md', 'design/README.md', 'user-guide.md']), []);
    assert.deepEqual(slugProblems(['user-guide.md', 'user-guide/README.md', 'design/_draft.md']), [
      'docs/user-guide.md and docs/user-guide/README.md both give the page "/user-guide/"',
      'docs/design/_draft.md: Starlight skips files and folders whose name starts with "_"; rename it',
    ]);
  });
});

describe('titles', () => {
  it('takes the first H1 and removes it', () => {
    const { title, body } = extractTitle('# Release process\n\nText.\n\n# Second\n');
    assert.equal(title, 'Release process');
    assert.equal(body, 'Text.\n\n# Second\n');
  });

  it('ignores a # line inside a fenced code block', () => {
    const { title, body } = extractTitle('```bash\n# a comment\n```\n\n# Real title\n\nText\n');
    assert.equal(title, 'Real title');
    assert.equal(body, '```bash\n# a comment\n```\n\nText\n');
  });

  it('reads a setext H1 and a closed ATX heading', () => {
    assert.equal(extractTitle('Title here\n==========\n\nText').title, 'Title here');
    assert.equal(extractTitle('# Closed #\n').title, 'Closed');
  });

  it('does not take an H2', () => {
    assert.equal(extractTitle('## Only H2\n').title, null);
  });

  it('turns inline Markdown into plain text', () => {
    assert.equal(plainTitle('The **`api-diff`** [library](./x.md) and *more*'), 'The api-diff library and more');
    assert.equal(plainTitle('snake_case_name stays'), 'snake_case_name stays');
  });

  it('falls back to the file name', () => {
    assert.equal(titleFromFileName('development/release-process.md'), 'Release process');
    assert.equal(titleFromFileName('design/general/README.md'), 'General');
  });
});

describe('front matter', () => {
  it('splits it off and reads the sidebar hints', () => {
    const { frontMatter, body } = splitFrontMatter(
      '---\ntitle: Own\nsidebar:\n  order: 3\n  label: "Short"\n---\n# H1\n',
    );
    assert.deepEqual(frontMatter, ['title: Own', 'sidebar:', '  order: 3', '  label: "Short"']);
    assert.equal(body, '# H1\n');
    assert.deepEqual(sidebarHints(frontMatter), { order: 3, label: 'Short' });
  });

  it('returns no front matter when there is none', () => {
    assert.deepEqual(splitFrontMatter('# Title\n'), { frontMatter: null, body: '# Title\n' });
  });
});

describe('link rewriting', () => {
  const from = 'docs/design/general/gf-001-search.md';
  const url = (link, fromFile = from, t = tree) => rewriteUrl(link, fromFile, t).url;

  it('keeps external links, anchors, and mail links', () => {
    for (const link of [
      'https://example.com/a.md',
      'http://localhost:8081/login',
      '#anchor',
      'mailto:a@b.c',
      '//cdn/x',
    ]) {
      assert.equal(url(link), link);
    }
  });

  it('turns a Markdown file of docs/ into a page URL with the base and a trailing slash', () => {
    assert.equal(url('../../admin-guide.md'), '/qubership-apihub/docs/admin-guide/');
    assert.equal(url('../../admin-guide.md#security'), '/qubership-apihub/docs/admin-guide/#security');
    assert.equal(url('gf-002-other.md'), '/qubership-apihub/docs/design/general/gf-002-other/');
    assert.equal(url('../../README.md'), '/qubership-apihub/docs/');
    assert.equal(url('./README.md'), '/qubership-apihub/docs/design/general/');
  });

  it('decodes and slugifies a file name with spaces and uppercase', () => {
    assert.equal(
      url('../../user-guide/Portal%20User%20Guide.md#first-steps'),
      '/qubership-apihub/docs/user-guide/portal-user-guide/#first-steps',
    );
  });

  it('maps a folder with a README to its page, and one without to GitHub', () => {
    assert.equal(url('../'), '/qubership-apihub/docs/design/');
    assert.equal(url('..'), '/qubership-apihub/docs/design/');
    assert.equal(url('../../'), '/qubership-apihub/docs/');
    assert.equal(url('../../user-guide/'), `${GH}/tree/develop/docs/user-guide`);
  });

  it('sends docs/internal/ to GitHub', () => {
    assert.equal(url('../../internal/README.md#adr'), `${GH}/blob/develop/docs/internal/README.md#adr`);
    assert.equal(url('../../internal/'), `${GH}/tree/develop/docs/internal`);
  });

  it('sends files and folders outside docs/ to GitHub', () => {
    assert.equal(url('../../../backend/agent/README.md'), `${GH}/blob/develop/backend/agent/README.md`);
    assert.equal(url('../../../backend/agent'), `${GH}/tree/develop/backend/agent`);
    assert.equal(
      url('../../../frontend/ui/docs/Some%20Guide.md'),
      `${GH}/blob/develop/frontend/ui/docs/Some%20Guide.md`,
    );
    assert.equal(url('../../../nx.json'), `${GH}/blob/develop/nx.json`);
    assert.equal(url('/backend/agent/'), `${GH}/tree/develop/backend/agent`);
  });

  it('points GitHub links at the ref of the tree, and edit links at develop', () => {
    const onMain = { ...tree, ref: 'main' };
    assert.equal(url('../../../backend/agent/README.md', from, onMain), `${GH}/blob/main/backend/agent/README.md`);
    assert.equal(url('../../internal/', from, onMain), `${GH}/tree/main/docs/internal`);
    assert.equal(url('/', from, onMain), `${GH}/tree/main`);
    assert.equal(url('/nx.json', from, { ...tree, ref: 'release/2.x' }), `${GH}/blob/release/2.x/nx.json`);
    const page = transformPage('a.md', '# A\n\n[agent](../backend/agent/README.md)\n', onMain);
    assert.match(page.content, /^editUrl: ".*\/edit\/develop\/docs\/a\.md"$/m);
    assert.match(page.content, /\[agent\]\(https:\/\/github\.com\/Netcracker\/qubership-apihub\/blob\/main\/backend\/agent\/README\.md\)/);
  });

  it('reads the ref of the GitHub links from DOCS_GITHUB_REF, develop when unset', () => {
    assert.equal(githubRefFrom({ DOCS_GITHUB_REF: 'main' }), 'main');
    assert.equal(githubRefFrom({ DOCS_GITHUB_REF: ' v2.16.0 ' }), 'v2.16.0');
    assert.equal(githubRefFrom({ DOCS_GITHUB_REF: '' }), 'develop');
    assert.equal(githubRefFrom({}), 'develop');
  });

  it('sends a non-image file of docs/ to GitHub', () => {
    assert.equal(url('../../images/arch.drawio'), `${GH}/blob/develop/docs/images/arch.drawio`);
  });

  it('serves images of docs/ under the base and others under _repo/', () => {
    assert.deepEqual(rewriteUrl('../../images/design/gf-001/1.png', from, tree), {
      url: '/qubership-apihub/docs/images/design/gf-001/1.png',
      asset: { from: 'docs/images/design/gf-001/1.png', to: 'images/design/gf-001/1.png' },
    });
    assert.deepEqual(rewriteUrl('../../../frontend/ui/docs/images/Shot 1.PNG', from, tree), {
      url: '/qubership-apihub/docs/_repo/frontend/ui/docs/images/Shot%201.PNG',
      asset: { from: 'frontend/ui/docs/images/Shot 1.PNG', to: '_repo/frontend/ui/docs/images/Shot 1.PNG' },
    });
  });

  it('leaves a link above the repository root as written', () => {
    assert.equal(url('../../../../outside.md'), '../../../../outside.md');
  });

  it('rewrites inline links, images, reference definitions, and HTML attributes', () => {
    const md = [
      'See [admin](../../admin-guide.md) and ![shot](../../images/a.png "Title").',
      '<img src="../../images/b.png" width="300"> <a href=\'../../admin-guide.md#x\'>admin</a>',
      '[ref]: ../../admin-guide.md',
      '[angle](<../../user-guide/Portal User Guide.md>)',
      '[parens](../../design/a_(b).md)',
    ].join('\n');
    const out = rewriteLinks(md, (link) => rewriteUrl(link, from, tree).url);
    assert.equal(
      out,
      [
        'See [admin](/qubership-apihub/docs/admin-guide/) and ![shot](/qubership-apihub/docs/images/a.png "Title").',
        '<img src="/qubership-apihub/docs/images/b.png" width="300"> <a href=\'/qubership-apihub/docs/admin-guide/#x\'>admin</a>',
        '[ref]: /qubership-apihub/docs/admin-guide/',
        '[angle](/qubership-apihub/docs/user-guide/portal-user-guide/)',
        '[parens](/qubership-apihub/docs/design/a_b/)',
      ].join('\n'),
    );
  });

  it('leaves links in code blocks and inline code alone', () => {
    const md =
      '`[x](../a.md)` and [y](../../admin-guide.md)\n\n```md\n[z](../../admin-guide.md)\n```\n~~~\n[w](a.md)\n~~~\n';
    const out = rewriteLinks(md, (link) => rewriteUrl(link, from, tree).url);
    assert.equal(
      out,
      '`[x](../a.md)` and [y](/qubership-apihub/docs/admin-guide/)\n\n```md\n[z](../../admin-guide.md)\n```\n~~~\n[w](a.md)\n~~~\n',
    );
  });
});

describe('transformPage', () => {
  it('adds the title and the edit link, removes the H1, and collects the images', () => {
    const page = transformPage('design/General/GF 1.md', '# GF-001 Search\n\n![a](../../images/x.png)\n', tree);
    assert.equal(page.title, 'GF-001 Search');
    assert.equal(
      page.content,
      [
        '---',
        'title: "GF-001 Search"',
        `editUrl: "${GH}/edit/develop/docs/design/General/GF%201.md"`,
        '---',
        '',
        '![a](/qubership-apihub/docs/images/x.png)',
        '',
      ].join('\n'),
    );
    assert.deepEqual(page.assets, [{ from: 'docs/images/x.png', to: 'images/x.png' }]);
  });

  it('keeps a title and front matter that the source sets', () => {
    const page = transformPage('a.md', '---\ntitle: Own title\n---\n# Heading\r\n\r\nText\r\n', tree);
    assert.equal(page.title, 'Own title');
    assert.match(page.content, /^---\neditUrl: ".*\/docs\/a\.md"\ntitle: Own title\n---\n\nText\n$/);
  });

  it('escapes quotes in the title', () => {
    const page = transformPage('a.md', '# The "quoted" title\n', tree);
    assert.match(page.content, /^---\ntitle: "The \\"quoted\\" title"\n/);
  });
});

describe('buildSidebar', () => {
  const page = (slug, title, extra = {}) => ({ slug, title, hints: {}, isIndex: false, ...extra });
  const pages = [
    page('', 'Home', { isIndex: true }),
    page('installation-guide', 'Install'),
    page('user-guide', 'User guide'),
    page('user-guide/portal', 'Portal'),
    page('design', 'Design items', { isIndex: true }),
    page('design/general', 'General features', { isIndex: true }),
    page('design/general/gf-002-b', 'GF-002'),
    page('design/general/gf-001-a', 'GF-001'),
    page('design/agent/agent-001', 'AGENT-001'),
    page('reference/api-changes', 'API changes', { isIndex: true }),
    page('reference/api-changes/schema-changes', 'Schema changes'),
    page('reference/api-changes/principles', 'Principles'),
    page('history', 'History'),
  ];
  const sections = [
    { label: 'Get started', pages: [{ slug: '', label: 'Overview' }, 'installation-guide'] },
    { label: 'User guide', pages: [{ slug: 'user-guide', label: 'Overview' }], directory: 'user-guide' },
    { label: 'Reference', directory: 'reference' },
    { label: 'Architecture', directory: 'architecture' },
    { label: 'Design', directory: 'design', collapsed: true },
  ];
  const links = [{ label: 'More sites', items: [{ label: 'All sites', link: 'https://x/' }] }];
  const { sidebar, unlisted } = buildSidebar({
    pages,
    sections,
    links,
    order: { 'reference/api-changes': ['principles', 'schema-changes'] },
  });

  it('keeps the section order, leaves out empty sections, and appends the links', () => {
    assert.deepEqual(
      sidebar.map((group) => group.label),
      ['Get started', 'User guide', 'Reference', 'Design', 'More sites'],
    );
  });

  it('lists explicit pages, with the home page as index', () => {
    assert.deepEqual(sidebar[0].items, [{ label: 'Overview', slug: 'index' }, { slug: 'installation-guide' }]);
    assert.deepEqual(sidebar[1].items, [{ label: 'Overview', slug: 'user-guide' }, { slug: 'user-guide/portal' }]);
  });

  it('groups subfolders under the title of their README, in the configured order', () => {
    assert.deepEqual(sidebar[2].items, [
      {
        label: 'API changes',
        collapsed: true,
        items: [
          { label: 'Overview', slug: 'reference/api-changes' },
          { slug: 'reference/api-changes/principles' },
          { slug: 'reference/api-changes/schema-changes' },
        ],
      },
    ]);
  });

  it('autogenerates the design areas, with an Overview and the items by name', () => {
    const design = sidebar[3];
    assert.equal(design.collapsed, true);
    assert.deepEqual(design.items, [
      { label: 'Overview', slug: 'design' },
      { label: 'Agent', collapsed: true, items: [{ slug: 'design/agent/agent-001' }] },
      {
        label: 'General features',
        collapsed: true,
        items: [
          { label: 'Overview', slug: 'design/general' },
          { slug: 'design/general/gf-001-a' },
          { slug: 'design/general/gf-002-b' },
        ],
      },
    ]);
  });

  it('reports the pages in no section', () => {
    assert.deepEqual(unlisted, ['history']);
  });

  it('puts sidebar.order and sidebar.label from front matter first', () => {
    const { sidebar: ordered } = buildSidebar({
      pages: [page('dev/b', 'B'), page('dev/a', 'A'), page('dev/c', 'C', { hints: { order: 0, label: 'See' } })],
      sections: [{ label: 'Development', directory: 'dev' }],
    });
    assert.deepEqual(ordered[0].items, [{ label: 'See', slug: 'dev/c' }, { slug: 'dev/a' }, { slug: 'dev/b' }]);
  });

  it('labels a folder without a README from the labels map', () => {
    const { sidebar: labeled } = buildSidebar({
      pages: [page('ref/openapi/a', 'A'), page('ref/graphql/b', 'B')],
      sections: [{ label: 'Reference', directory: 'ref' }],
      labels: { 'ref/openapi': 'OpenAPI' },
    });
    assert.deepEqual(
      labeled[0].items.map((item) => item.label),
      ['Graphql', 'OpenAPI'],
    );
  });
});
