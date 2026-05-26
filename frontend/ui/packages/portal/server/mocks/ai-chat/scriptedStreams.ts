import { MOCK_ATTACHMENT_FILE_ID } from './ephemeralFileUrl'
import type { AiChatMessage, AiChatStreamEvent } from './types'

export type ScriptedFrame = {
  // Delay after the previous frame in milliseconds (0 for the first frame).
  delay: number
  event: AiChatStreamEvent
}

export type Scenario = {
  id: string
  description: string
  build: (args: ScriptedBuildArgs) => ScriptedFrame[]
}

export type ScriptedBuildArgs = {
  messageId: string
  nowIso: string
  clientMessageId: string | null
  /** Relative `GET /api/v1/ephemeral-files/...` URL for markdown download links */
  buildFileUrl: (fileId: string) => string
}

const TOKEN_DELAY_MS = 35
/** Used by `debug:thinking` to mimic long provider/network gaps in the SSE stream. */
const THINKING_PAUSE_MS = 4000

function tokens(text: string): string[] {
  // Split on whitespace while preserving trailing whitespace on each token
  // so concatenation reproduces the original string verbatim.
  return text.match(/\S+\s*|\s+/g) ?? [text]
}

function deltaFrames(text: string, delay = TOKEN_DELAY_MS): ScriptedFrame[] {
  const parts = tokens(text)
  return parts.map((delta) => ({
    delay: delay,
    event: { type: 'message.assistant.delta', delta: delta },
  }))
}

const DEFAULT_MARKDOWN = `## Overview

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

const JSON_MARKDOWN = `Here is the same response encoded as JSON:

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

const LINKS_MARKDOWN = `## Internal navigation (portal row)

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

const OFFTOPIC_MARKDOWN = `I'm sorry, but I specialize in helping with REST API documentation and specifications.
I can't help with questions outside of this topic. Is there anything about APIs I can help you with?`

const ERROR_MARKDOWN = 'Searching the operations index'

function buildLongMarkdownFixture(): string {
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

const LONG_MD_CONTENT = buildLongMarkdownFixture()

const defaultScenario: Scenario = {
  id: 'default',
  description: 'Default stream: full github-markdown gallery (headings, lists, quote, hr, table, yaml).',
  build: ({ messageId, nowIso, clientMessageId }) => {
    const frames: ScriptedFrame[] = []
    frames.push({
      delay: 40,
      event: { type: 'message.assistant.start', messageId: messageId },
    })
    frames.push(...deltaFrames(DEFAULT_MARKDOWN))
    frames.push({
      delay: 25,
      event: {
        type: 'message.assistant.completed',
        message: {
          messageId: messageId,
          clientMessageId: null,
          role: 'assistant',
          content: DEFAULT_MARKDOWN,
          createdAt: nowIso,
        },
      },
    })
    frames.push({ delay: 10, event: { type: 'done' } })
    return frames
  },
}

const jsonScenario: Scenario = {
  id: 'debug:json',
  description: 'Same as default but with a JSON code block.',
  build: ({ messageId, nowIso, clientMessageId }) => {
    const frames: ScriptedFrame[] = []
    frames.push({
      delay: 40,
      event: { type: 'message.assistant.start', messageId: messageId },
    })
    frames.push(...deltaFrames(JSON_MARKDOWN))
    frames.push({
      delay: 25,
      event: {
        type: 'message.assistant.completed',
        message: {
          messageId: messageId,
          clientMessageId: null,
          role: 'assistant',
          content: JSON_MARKDOWN,
          createdAt: nowIso,
        },
      },
    })
    frames.push({ delay: 10, event: { type: 'done' } })
    return frames
  },
}

const linksScenario: Scenario = {
  id: 'debug:links',
  description: 'Portal link rows, inline in text, external and non-/portal/ links.',
  build: ({ messageId, nowIso, clientMessageId }) => {
    const frames: ScriptedFrame[] = []
    frames.push({
      delay: 40,
      event: { type: 'message.assistant.start', messageId: messageId },
    })
    frames.push(...deltaFrames(LINKS_MARKDOWN))
    frames.push({
      delay: 25,
      event: {
        type: 'message.assistant.completed',
        message: {
          messageId: messageId,
          clientMessageId: null,
          role: 'assistant',
          content: LINKS_MARKDOWN,
          createdAt: nowIso,
        },
      },
    })
    frames.push({ delay: 10, event: { type: 'done' } })
    return frames
  },
}

const longmdScenario: Scenario = {
  id: 'debug:longmd',
  description: 'Very long markdown (>= 4000 chars) with yaml+json fences and table.',
  build: ({ messageId, nowIso, clientMessageId }) => {
    const frames: ScriptedFrame[] = []
    frames.push({
      delay: 40,
      event: { type: 'message.assistant.start', messageId: messageId },
    })
    frames.push(...deltaFrames(LONG_MD_CONTENT, 12))
    frames.push({
      delay: 25,
      event: {
        type: 'message.assistant.completed',
        message: {
          messageId: messageId,
          clientMessageId: null,
          role: 'assistant',
          content: LONG_MD_CONTENT,
          createdAt: nowIso,
        },
      },
    })
    frames.push({ delay: 10, event: { type: 'done' } })
    return frames
  },
}

const filesScenario: Scenario = {
  id: 'debug:files',
  description: 'Generated file link mid-sentence and on its own line.',
  build: ({ messageId, nowIso, clientMessageId, buildFileUrl }) => {
    const url = buildFileUrl(MOCK_ATTACHMENT_FILE_ID)
    const markdownWithLink =
      `${ATTACHMENT_MARKDOWN_PREFIX} Grab [export-sample.md](${url}) from the middle of this sentence when you need the file.

Same link on its own line (easier to tap):

[export-sample.md](${url})`
    const frames: ScriptedFrame[] = []
    frames.push({
      delay: 40,
      event: { type: 'message.assistant.start', messageId: messageId },
    })
    frames.push(...deltaFrames(markdownWithLink))
    frames.push({
      delay: 25,
      event: {
        type: 'message.assistant.completed',
        message: {
          messageId: messageId,
          clientMessageId: null,
          role: 'assistant',
          content: markdownWithLink,
          createdAt: nowIso,
        },
      },
    })
    frames.push({ delay: 10, event: { type: 'done' } })
    return frames
  },
}

const TRUNCATED_STREAM_MARKDOWN =
  'Mock: TCP closes after deltas only - no `message.assistant.completed` or `done`. UI should show the incomplete-reply warning snackbar.'

const truncatedStreamScenario: Scenario = {
  id: 'debug:truncated-stream',
  description:
    'Happy-path deltas then connection close without terminal SSE frames (exercises post-stream network error snackbar).',
  build: ({ messageId }) => {
    const frames: ScriptedFrame[] = []
    frames.push({
      delay: 40,
      event: { type: 'message.assistant.start', messageId: messageId },
    })
    frames.push(...deltaFrames(TRUNCATED_STREAM_MARKDOWN))
    return frames
  },
}

const errorScenario: Scenario = {
  id: 'debug:error',
  description: 'A few deltas then an SSE error frame (APIHUB-AI-5001).',
  build: ({ messageId }) => {
    const frames: ScriptedFrame[] = []
    frames.push({
      delay: 40,
      event: { type: 'message.assistant.start', messageId: messageId },
    })
    frames.push(...deltaFrames(ERROR_MARKDOWN))
    frames.push({
      delay: 60,
      event: {
        type: 'error',
        code: 'APIHUB-AI-5001',
        message: 'Upstream LLM provider is temporarily unavailable.',
      },
    })
    return frames
  },
}

const THINKING_MARKDOWN_PREFIX = 'Done. Here is your IDS document for the customer creation operation (latest version):'
const THINKING_MARKDOWN_SUFFIX =
  ' The document describes the Create Customer process, interaction flow, request/response mappings (marked as draft), configuration, and error handling. I did not find the operation in APIHub, so I added follow-up questions to confirm the exact package/version and API contract.'

const thinkingScenario: Scenario = {
  id: 'debug:thinking',
  description:
    '~4s idle before tool frames, IDS-style tool sequence, ~4s gap mid answer, then completion (English + file link).',
  build: ({ messageId, nowIso, buildFileUrl }) => {
    const url = buildFileUrl(MOCK_ATTACHMENT_FILE_ID)
    const fullText = `${THINKING_MARKDOWN_PREFIX} [create-customer-ids.md](${url})\n\n${THINKING_MARKDOWN_SUFFIX.trim()}`
    const midMarker = 'I did not find'
    const splitAt = fullText.indexOf(midMarker)
    const part1 = splitAt === -1 ? fullText : fullText.slice(0, splitAt)
    const part2 = splitAt === -1 ? '' : fullText.slice(splitAt)

    const frames: ScriptedFrame[] = []
    frames.push({
      delay: 40,
      event: { type: 'message.assistant.start', messageId: messageId },
    })

    frames.push({
      delay: THINKING_PAUSE_MS,
      event: {
        type: 'tool.started',
        toolCallId: 'tc-mock-ids-start',
        name: 'start_ids_generation',
      },
    })
    frames.push({
      delay: 45,
      event: {
        type: 'tool.completed',
        toolCallId: 'tc-mock-ids-start',
        name: 'start_ids_generation',
        status: 'ok',
        durationMs: 210,
      },
    })

    for (let i = 1; i <= 7; i++) {
      const toolCallId = `tc-mock-search-${i}`
      frames.push({
        delay: 35,
        event: {
          type: 'tool.started',
          toolCallId: toolCallId,
          name: 'search_api_operations',
        },
      })
      frames.push({
        delay: 50,
        event: {
          type: 'tool.completed',
          toolCallId: toolCallId,
          name: 'search_api_operations',
          status: 'ok',
          durationMs: 70 + i * 12,
        },
      })
    }

    frames.push({
      delay: 40,
      event: {
        type: 'tool.started',
        toolCallId: 'tc-mock-save-file',
        name: 'save_generated_file',
      },
    })
    frames.push({
      delay: 55,
      event: {
        type: 'tool.completed',
        toolCallId: 'tc-mock-save-file',
        name: 'save_generated_file',
        status: 'ok',
        durationMs: 190,
      },
    })

    frames.push(...deltaFrames(part1))
    const tailDeltas = deltaFrames(part2)
    if (tailDeltas.length > 0) {
      tailDeltas[0] = { ...tailDeltas[0], delay: THINKING_PAUSE_MS }
      frames.push(...tailDeltas)
    }

    frames.push({
      delay: 25,
      event: {
        type: 'message.assistant.completed',
        message: {
          messageId: messageId,
          clientMessageId: null,
          role: 'assistant',
          content: fullText,
          createdAt: nowIso,
        },
      },
    })
    frames.push({ delay: 10, event: { type: 'done' } })
    return frames
  },
}

const offtopicScenario: Scenario = {
  id: 'debug:offtopic',
  description: 'Short polite refusal for off-topic questions.',
  build: ({ messageId, nowIso, clientMessageId }) => {
    const frames: ScriptedFrame[] = []
    frames.push({
      delay: 30,
      event: { type: 'message.assistant.start', messageId: messageId },
    })
    frames.push(...deltaFrames(OFFTOPIC_MARKDOWN))
    frames.push({
      delay: 20,
      event: {
        type: 'message.assistant.completed',
        message: {
          messageId: messageId,
          clientMessageId: null,
          role: 'assistant',
          content: OFFTOPIC_MARKDOWN,
          createdAt: nowIso,
        },
      },
    })
    frames.push({ delay: 10, event: { type: 'done' } })
    return frames
  },
}

// Ordered list: the first match (by substring presence) wins.
// debug:* scenarios must be tried BEFORE the default so 'debug:error' doesn't
// fall through to the happy path.
export const SCENARIOS: Scenario[] = [
  errorScenario,
  truncatedStreamScenario,
  linksScenario,
  longmdScenario,
  jsonScenario,
  filesScenario,
  thinkingScenario,
  offtopicScenario,
  defaultScenario,
]

export function pickScenario(userContent: string): Scenario {
  const normalized = userContent.toLowerCase()
  for (const scenario of SCENARIOS) {
    if (scenario.id === 'default') continue
    if (normalized.includes(scenario.id)) return scenario
  }
  return defaultScenario
}

export function assistantMessageFromScenario(scenario: Scenario, args: ScriptedBuildArgs): AiChatMessage {
  // Reconstruct the terminal message from the scenario's completed frame
  // so that non-streaming callers (POST /messages without /stream) produce the
  // same final state as the SSE path. If a scenario never emits a completed
  // frame (debug:error), return a best-effort shape with whatever markdown
  // was produced before the error.
  const frames = scenario.build(args)
  const completed = frames.find(
    (f): f is ScriptedFrame & { event: Extract<AiChatStreamEvent, { type: 'message.assistant.completed' }> } =>
      f.event.type === 'message.assistant.completed',
  )
  if (completed) return completed.event.message
  const collected = frames
    .filter((f): f is ScriptedFrame & { event: Extract<AiChatStreamEvent, { type: 'message.assistant.delta' }> } =>
      f.event.type === 'message.assistant.delta',
    )
    .map((f) => f.event.delta)
    .join('')
  return {
    messageId: args.messageId,
    clientMessageId: args.clientMessageId,
    role: 'assistant',
    content: collected,
    createdAt: args.nowIso,
  }
}
