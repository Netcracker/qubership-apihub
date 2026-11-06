/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type MockArticle = {
  id: string
  slug: string
  title: string
  subtitle?: string
  scope: 'generic' | 'package'
  visibility?: 'public' | 'corporate'
  bodyMd?: string
  packageId?: string
  version?: string
  documentSlug?: string
  labels: string[]
  displayOrder: number
  published: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

// A file attached to an article: the path is relative to the article and unique only within it.
export type MockArticleFile = {
  articleId: string
  path: string
  contentType: string
  size: number
  checksum: string
  createdAt: string
  createdBy: string
  data: Buffer
}

const NOW = '2026-10-01T10:00:00Z'
const ADMIN = 'JD_1234'

function generic(order: number, slug: string, title: string, subtitle: string, visibility: 'public' | 'corporate', labels: string[] = []): MockArticle {
  return {
    id: `article-${order}`,
    slug: slug,
    title: title,
    subtitle: subtitle,
    scope: 'generic',
    visibility: visibility,
    bodyMd: `# ${title}

${subtitle}

## Overview

This is **mock** content served by the portal mock server for the article \`${slug}\`.

- Point one
- Point two

\`\`\`json
{ "example": true }
\`\`\`

![Environments](/docs-backend/api/v1/articles/${slug}/files/environments.png)
`,
    labels: labels,
    displayOrder: order,
    published: true,
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: ADMIN,
    updatedBy: ADMIN,
  }
}

export const ARTICLES: MockArticle[] = [
  generic(1, 'quote-to-activation', 'Quote to activation, end to end', 'The five APIs in one sequence, and where it goes wrong.', 'public', ['start-here']),
  generic(2, 'onboarding', 'Onboarding and environments', 'From contract to production credentials, and what the sandbox does not simulate.', 'public'),
  generic(3, 'authentication', 'Authentication', 'Get a token, send it, and rotate the secret before it leaks.', 'public', ['security']),
  generic(4, 'sandbox', 'Sandbox and test data', 'What the sandbox simulates, and when it resets.', 'public'),
  generic(5, 'error-handling', 'Error handling', 'Status codes, stable error codes, retries and idempotency keys.', 'public'),
  generic(6, 'rate-limits', 'Rate limits', 'What the ceilings are, and how to stay under them.', 'public'),
  generic(7, 'versioning', 'Versioning', 'What changes within a release, and what forces a new one.', 'public'),
  generic(8, 'glossary', 'Glossary', 'The terms the APIs use, in the sense the operator uses them.', 'public'),
  generic(9, 'security-checklist', 'Security checklist', 'The controls the contract requires, mapped onto the APIs.', 'corporate', ['security']),
  generic(10, 'go-live-checklist', 'Go-live checklist', 'The self-assessment submitted before production credentials are issued.', 'corporate'),
  {
    id: 'article-11',
    slug: 'some-package-overview',
    title: 'Some package overview',
    subtitle: 'How to start with Some package.',
    scope: 'package',
    packageId: 'package-some',
    version: '2.6',
    documentSlug: 'readme',
    labels: [],
    displayOrder: 1,
    published: true,
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: ADMIN,
    updatedBy: ADMIN,
  },
  {
    id: 'article-12',
    slug: 'some-package-changelog',
    title: 'Some package changelog',
    scope: 'package',
    packageId: 'package-some',
    documentSlug: 'changelog',
    labels: ['changelog'],
    displayOrder: 2,
    published: false,
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: ADMIN,
    updatedBy: ADMIN,
  },
]

// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

// Every generic article embeds the same picture; the real backend stores such identical bytes once.
export const ARTICLE_FILES: MockArticleFile[] = ARTICLES
  .filter(article => article.scope === 'generic')
  .map(article => ({
    articleId: article.id,
    path: 'environments.png',
    contentType: 'image/png',
    size: PNG.length,
    checksum: 'mock-checksum-environments',
    createdAt: NOW,
    createdBy: ADMIN,
    data: PNG,
  }))
