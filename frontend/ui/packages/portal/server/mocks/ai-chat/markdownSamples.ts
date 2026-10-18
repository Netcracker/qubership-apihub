import { buildEphemeralFileUrl, MOCK_ATTACHMENT_FILE_ID } from './ephemeralFileUrl'

/** Default happy-path gallery streamed when no `debug:*` substring matches. */
export const DEFAULT_MARKDOWN = `## Overview

This default stream is a **markdown gallery** for the assistant panel (headings, lists, quotes, rules, table, code).

### Headings

# H1 — title scale
## H2 — section
### H3 — subsection
#### H4 — detail
##### H5 — minor
###### H6 — smallest

---

### Quote

> Blockquote: use this to check spacing and left rule styling next to body text.

---

### Lists

Bullet list:

- First item with **bold** and \`inline code\`
- Second item
  - Nested bullet one
  - Nested bullet two
- Third item

Numbered list:

1. Step one
2. Step two
3. Step three

External link example: [example.com](https://example.com)

---

### Operations table

| Package | Version | Method | Path | Operation |
| --- | --- | --- | --- | --- |
| Customers | 2024.4 | GET | /api/v1/customers | List customers |
| Customers | 2024.4 | POST | /api/v1/customers | Create customer |
| Orders | 2024.3 | GET | /api/v1/orders | List orders |

---

### YAML fence

Example minimal OpenAPI fragment for \`POST /api/v1/customers\`:

\`\`\`yaml
paths:
  /api/v1/customers:
    post:
      summary: Create customer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name: { type: string }
\`\`\`

### HTTP block

\`\`\`http
POST /customer/v1/customers HTTP/1.1
Host: api.company.com
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@example.com",
  "phone": "+12025550123",
  "dateOfBirth": "1990-04-12"
}
\`\`\`

Let me know if you want to drill down into any of them.`

export const JSON_MARKDOWN = `Here is the same response encoded as JSON:

\`\`\`json
{
  "operations": [
    { "method": "GET", "path": "/api/v1/customers", "package": "Customers@2024.4" },
    { "method": "POST", "path": "/api/v1/customers", "package": "Customers@2024.4" },
    { "method": "GET", "path": "/api/v1/orders", "package": "Orders@2024.3" }
  ]
}
\`\`\`

Ask for more detail on any of them.`

export const LINKS_MARKDOWN = `## Internal navigation (portal row)

Block list (full-width cards):

- [Demo package](/portal/packages/QS.QSS.PRG.APIHUB/2026.1)
- [Demo operation](/portal/packages/QS.QSS.PRG.APIHUB/2026.1/operations/rest/get-packages-list)

**Inline in a sentence** (same components, inside a paragraph): open the [demo package](/portal/packages/QS.QSS.PRG.APIHUB/2026.1) for the version, or jump straight to the [list operation](/portal/packages/QS.QSS.PRG.APIHUB/2026.1/operations/rest/get-packages-list) from here.

---

## External and non-portal links (plain \`<a>\`, github-markdown styles)

- **HTTPS** (not a package/operation row): more background in the [OpenAPI specification](https://spec.openapis.org/oas/latest.html).
- **Same app, not under \`/portal/\`** (not treated as internal portal row): e.g. [\`/api/v1\` route](/api/v1/profiles) — still a normal link.
`

const ATTACHMENT_MARKDOWN_PREFIX = 'I generated a Markdown report with every operation I could find.'

export function buildFilesMarkdown(fileUrl: string): string {
  return `${ATTACHMENT_MARKDOWN_PREFIX} Grab [export-sample.md](${fileUrl}) from the middle of this sentence when you need the file.

Same link on its own line (easier to tap):

[export-sample.md](${fileUrl})`
}

/** Pre-rendered gallery for the seeded "Overview" history chat (no streaming required). */
export function buildOverviewFixtureMarkdown(): string {
  const fileUrl = buildEphemeralFileUrl(MOCK_ATTACHMENT_FILE_ID)
  return [DEFAULT_MARKDOWN, '---', LINKS_MARKDOWN, '---', buildFilesMarkdown(fileUrl)].join('\n\n')
}

export const OFFTOPIC_MARKDOWN = `I'm sorry, but I specialize in helping with REST API documentation and specifications.
I can't help with questions outside of this topic. Is there anything about APIs I can help you with?`

export const ERROR_STREAM_MARKDOWN = 'Searching the operations index'

export const TRUNCATED_STREAM_MARKDOWN =
  'Mock: TCP closes after deltas only - no `message.assistant.completed` or `done`. UI should show the incomplete-reply warning snackbar.'

export function buildLongMarkdownFixture(): string {
  const parts: string[] = []
  parts.push('# Long markdown stress fixture\n\n')
  parts.push('## Overview\n\n')
  parts.push('> Blockquote: this stream exists to stress markdown rendering, scrolling, and throttling.\n\n')
  parts.push('### Bullet list\n\n')
  for (let i = 0; i < 45; i++) {
    parts.push(`- Row ${i + 1} with **emphasis** and a \`code\` span.\n`)
  }
  parts.push('\n## Operations table\n\n')
  parts.push('| Id | Service | Status |\n| --- | --- | --- |\n')
  for (let i = 0; i < 35; i++) {
    parts.push(`| ${i + 1} | svc-${i % 7} | ${i % 3 === 0 ? 'ok' : 'warn'} |\n`)
  }
  parts.push('\n### YAML block\n\n```yaml\n')
  parts.push('service: long-md-stress\nendpoints:\n')
  for (let i = 0; i < 30; i++) {
    parts.push(`  - path: /api/v1/items/${i}\n    method: GET\n`)
  }
  parts.push('```\n\n### JSON block\n\n```json\n')
  parts.push(
    JSON.stringify(
      { items: Array.from({ length: 25 }, (_, i) => ({ id: i, name: `item-${i}` })) },
      null,
      2,
    ),
  )
  parts.push('\n```\n\n## Closing\n\nEnd of long markdown fixture.\n')
  let body = parts.join('')
  if (body.length < 4000) {
    body += `\n${'p'.repeat(4000 - body.length)}\n`
  }
  return body
}

export const LONG_MD_CONTENT = buildLongMarkdownFixture()

const THINKING_MARKDOWN_PREFIX = 'Done. Here is your IDS document for the customer creation operation (latest version):'
const THINKING_MARKDOWN_SUFFIX =
  ' The document describes the Create Customer process, interaction flow, request/response mappings (marked as draft), configuration, and error handling. I did not find the operation in APIHub, so I added follow-up questions to confirm the exact package/version and API contract.'

export function buildThinkingMarkdown(fileUrl: string): string {
  return `${THINKING_MARKDOWN_PREFIX} [create-customer-ids.md](${fileUrl})\n\n${THINKING_MARKDOWN_SUFFIX.trim()}`
}
