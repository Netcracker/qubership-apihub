import { MOCK_ATTACHMENT_FILE_ID } from './ephemeralFileUrl'
import {
  buildFilesMarkdown,
  buildThinkingMarkdown,
  DEFAULT_MARKDOWN,
  ERROR_STREAM_MARKDOWN,
  JSON_MARKDOWN,
  LINKS_MARKDOWN,
  LONG_MD_CONTENT,
  OFFTOPIC_MARKDOWN,
  TRUNCATED_STREAM_MARKDOWN,
} from './markdownSamples'
import { buildAssistantStreamFrames, deltaFrames, type ScriptedFrame, THINKING_PAUSE_MS } from './streamFrames'
import type { AiChatMessage, AiChatStreamEvent } from './types'

export type { ScriptedFrame } from './streamFrames'

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

function scenarioFromMarkdown(
  id: string,
  description: string,
  markdown: string | ((args: ScriptedBuildArgs) => string),
  options?: { deltaDelay?: number; includeDone?: boolean },
): Scenario {
  return {
    id: id,
    description: description,
    build: (args) => {
      const content = typeof markdown === 'function' ? markdown(args) : markdown
      return buildAssistantStreamFrames(content, args, options)
    },
  }
}

const defaultScenario = scenarioFromMarkdown(
  'default',
  'Default stream: full github-markdown gallery (headings, lists, quote, hr, table, yaml).',
  DEFAULT_MARKDOWN,
)

const jsonScenario = scenarioFromMarkdown(
  'debug:json',
  'Same as default but with a JSON code block.',
  JSON_MARKDOWN,
)

const linksScenario = scenarioFromMarkdown(
  'debug:links',
  'Portal link rows, inline in text, external and non-/portal/ links.',
  LINKS_MARKDOWN,
)

const longmdScenario = scenarioFromMarkdown(
  'debug:longmd',
  'Very long markdown (>= 4000 chars) with yaml+json fences and table.',
  LONG_MD_CONTENT,
  { deltaDelay: 12 },
)

const filesScenario = scenarioFromMarkdown(
  'debug:files',
  'Generated file link mid-sentence and on its own line.',
  (args) => buildFilesMarkdown(args.buildFileUrl(MOCK_ATTACHMENT_FILE_ID)),
)

const truncatedStreamScenario: Scenario = {
  id: 'debug:truncated-stream',
  description:
    'Happy-path deltas then connection close without terminal SSE frames (exercises post-stream network error snackbar).',
  build: ({ messageId }) => {
    const frames: ScriptedFrame[] = [
      {
        delay: 40,
        event: { type: 'message.assistant.start', messageId: messageId },
      },
      ...deltaFrames(TRUNCATED_STREAM_MARKDOWN),
    ]
    return frames
  },
}

const errorScenario: Scenario = {
  id: 'debug:error',
  description: 'A few deltas then an SSE error frame (APIHUB-AI-5001).',
  build: ({ messageId }) => {
    const frames: ScriptedFrame[] = [
      {
        delay: 40,
        event: { type: 'message.assistant.start', messageId: messageId },
      },
      ...deltaFrames(ERROR_STREAM_MARKDOWN),
      {
        delay: 60,
        event: {
          type: 'error',
          code: 'APIHUB-AI-5001',
          message: 'Upstream LLM provider is temporarily unavailable.',
        },
      },
    ]
    return frames
  },
}

const thinkingScenario: Scenario = {
  id: 'debug:thinking',
  description:
    '~4s idle before tool frames, IDS-style tool sequence, ~4s gap mid answer, then completion (English + file link).',
  build: ({ messageId, nowIso, buildFileUrl }) => {
    const fullText = buildThinkingMarkdown(buildFileUrl(MOCK_ATTACHMENT_FILE_ID))
    const midMarker = 'I did not find'
    const splitAt = fullText.indexOf(midMarker)
    const part1 = splitAt === -1 ? fullText : fullText.slice(0, splitAt)
    const part2 = splitAt === -1 ? '' : fullText.slice(splitAt)

    const frames: ScriptedFrame[] = [
      {
        delay: 40,
        event: { type: 'message.assistant.start', messageId: messageId },
      },
      {
        delay: THINKING_PAUSE_MS,
        event: {
          type: 'tool.started',
          toolCallId: 'tc-mock-ids-start',
          name: 'start_ids_generation',
        },
      },
      {
        delay: 45,
        event: {
          type: 'tool.completed',
          toolCallId: 'tc-mock-ids-start',
          name: 'start_ids_generation',
          status: 'ok',
          durationMs: 210,
        },
      },
    ]

    for (let i = 1; i <= 7; i++) {
      const toolCallId = `tc-mock-search-${i}`
      frames.push(
        {
          delay: 35,
          event: {
            type: 'tool.started',
            toolCallId: toolCallId,
            name: 'search_api_operations',
          },
        },
        {
          delay: 50,
          event: {
            type: 'tool.completed',
            toolCallId: toolCallId,
            name: 'search_api_operations',
            status: 'ok',
            durationMs: 70 + i * 12,
          },
        },
      )
    }

    frames.push(
      {
        delay: 40,
        event: {
          type: 'tool.started',
          toolCallId: 'tc-mock-save-file',
          name: 'save_generated_file',
        },
      },
      {
        delay: 55,
        event: {
          type: 'tool.completed',
          toolCallId: 'tc-mock-save-file',
          name: 'save_generated_file',
          status: 'ok',
          durationMs: 190,
        },
      },
      ...deltaFrames(part1),
    )

    const tailDeltas = deltaFrames(part2)
    if (tailDeltas.length > 0) {
      tailDeltas[0] = { ...tailDeltas[0], delay: THINKING_PAUSE_MS }
      frames.push(...tailDeltas)
    }

    frames.push(
      {
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
      },
      { delay: 10, event: { type: 'done' } },
    )
    return frames
  },
}

const offtopicScenario = scenarioFromMarkdown(
  'debug:offtopic',
  'Short polite refusal for off-topic questions.',
  OFFTOPIC_MARKDOWN,
  { deltaDelay: 30 },
)

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
