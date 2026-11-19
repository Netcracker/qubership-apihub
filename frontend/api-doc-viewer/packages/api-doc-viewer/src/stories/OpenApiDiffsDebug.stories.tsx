import { OpenApiOperationDiffsViewer } from '@apihub/components/OpenApiOperationViewer/OpenApiOperationDiffsViewer'
import { DETAILED_DISPLAY_MODE, DisplayMode } from '@apihub/types/DisplayMode'
import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo } from 'react'
import { OPENAPI_DIFFS_STORY_ARG_TYPES } from './openapi-suite/openapi-story-args'
import { mergeOpenApiDocuments } from './preprocess'
import { parseYamlSource } from './utils/parse-yaml-source'

type StoryArgs = {
  /** OpenAPI 3.0 / 3.1 documents, YAML or JSON; merged with `apiDiff`. */
  beforeSourceText: string
  afterSourceText: string
  /** `paths` key of the operation in the merged document (the after path of a renamed path); empty = the first operation. */
  path: string
  /** HTTP method of the operation; empty = the first operation. */
  method: string
  displayMode: DisplayMode
  hideUnchangedNodes: boolean
  devMode: boolean
}

/** `mergeOpenApiDocuments` stores diffs under api-diff's own meta keys. */
const DIFF_META_KEYS = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}

const BEFORE_SOURCE_TEXT = `openapi: 3.0.3
info:
  title: Orders
  version: 1.0.0
paths:
  /orders/{orderId}:
    get:
      operationId: getOrder
      summary: Get an order
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: The order.
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  total:
                    type: number
`

const AFTER_SOURCE_TEXT = `openapi: 3.0.3
info:
  title: Orders
  version: 1.0.0
paths:
  /orders/{orderId}:
    get:
      operationId: getOrder
      summary: Get an order by its id
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: The order.
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  total:
                    type: number
                  currency:
                    type: string
        '404':
          description: Not found.
`

/** One OpenAPI operation of two pasted documents, side by side; `path` + `method` pick it. */
const OpenApiDiffsDebugStory = (args: StoryArgs) => {
  const { beforeSourceText, afterSourceText, path, method, displayMode, hideUnchangedNodes, devMode } = args
  const mergedSource = useMemo(
    () => mergeOpenApiDocuments(parseYamlSource(beforeSourceText), parseYamlSource(afterSourceText)),
    [beforeSourceText, afterSourceText],
  )
  return (
    <OpenApiOperationDiffsViewer
      mergedSource={mergedSource}
      operationKeys={path && method ? { path, method } : undefined}
      diffMetaKeys={DIFF_META_KEYS}
      displayMode={displayMode}
      hideUnchangedNodes={hideUnchangedNodes}
      devMode={devMode}
    />
  )
}

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'Debug/OpenAPI Operation Diffs Viewer',
  component: OpenApiDiffsDebugStory,
  argTypes: {
    ...OPENAPI_DIFFS_STORY_ARG_TYPES,
    beforeSourceText: { control: 'text' },
    afterSourceText: { control: 'text' },
    path: { control: 'text' },
    method: { control: 'text' },
    devMode: { control: 'boolean' },
  },
  args: {
    beforeSourceText: BEFORE_SOURCE_TEXT,
    afterSourceText: AFTER_SOURCE_TEXT,
    path: '/orders/{orderId}',
    method: 'get',
    displayMode: DETAILED_DISPLAY_MODE,
    hideUnchangedNodes: false,
    devMode: true,
  },
} satisfies Meta<typeof OpenApiDiffsDebugStory>

export default meta

type Story = StoryObj<typeof meta>

export const Debug: Story = {}
