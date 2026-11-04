import { OpenApiOperationViewer } from '@apihub/components/OpenApiOperationViewer/OpenApiOperationViewer'
import { DETAILED_DISPLAY_MODE, DisplayMode } from '@apihub/types/DisplayMode'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo } from 'react'
import { OPENAPI_STORY_ARG_TYPES } from './openapi-suite/openapi-story-args'
import { prepareOpenApiDocument } from './preprocess'
import { parseYamlSource } from './utils/parse-yaml-source'

type StoryArgs = {
  /** OpenAPI 3.0 / 3.1 document, YAML or JSON. */
  sourceText: string
  /** `paths` key of the operation; empty = the first operation of the document. */
  path: string
  /** HTTP method of the operation; empty = the first operation of the document. */
  method: string
  displayMode: DisplayMode
  devMode: boolean
}

const SOURCE_TEXT = `openapi: 3.0.3
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
        '404':
          description: Not found.
    delete:
      operationId: deleteOrder
      summary: Delete an order
      responses:
        '204':
          description: Deleted.
`

/** One OpenAPI operation of a pasted document; `path` + `method` pick it. */
const OpenApiDebugStory = ({ sourceText, path, method, displayMode, devMode }: StoryArgs) => {
  const source = useMemo(() => prepareOpenApiDocument(parseYamlSource(sourceText)), [sourceText])
  return (
    <OpenApiOperationViewer
      source={source}
      operationKeys={path && method ? { path, method } : undefined}
      displayMode={displayMode}
      devMode={devMode}
    />
  )
}

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'Debug/OpenAPI Operation Viewer',
  component: OpenApiDebugStory,
  argTypes: {
    ...OPENAPI_STORY_ARG_TYPES,
    sourceText: { control: 'text' },
    path: { control: 'text' },
    method: { control: 'text' },
    devMode: { control: 'boolean' },
  },
  args: {
    sourceText: SOURCE_TEXT,
    path: '/orders/{orderId}',
    method: 'get',
    displayMode: DETAILED_DISPLAY_MODE,
    devMode: true,
  },
} satisfies Meta<typeof OpenApiDebugStory>

export default meta

type Story = StoryObj<typeof meta>

export const Debug: Story = {}
