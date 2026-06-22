import { COMPARE_DISPLAY_MODE } from '@stoplight/elements'
import { DiffOperationAPI } from '@stoplight/elements/containers/DiffOperationAPI'
import {
  getMergedDocument
} from '@stoplight/elements/web-components/__stories__/helpers/getMergedDocument'
import { aggregatedDiffsMetaKey, diffsMetaKey } from 'diff-block'
import React from 'react'
import '../index'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'diff-operation-view': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export default {
  title: 'web-components/Operations with changed extensions in JSON Schemas',
  component: DiffOperationAPI,
  argTypes: {
    layout: {
      control: { type: 'inline-radio', options: ['sidebar', 'stacked', 'partial'] },
      defaultValue: 'sidebar',
    },
    router: {
      control: { type: 'inline-radio', options: ['history', 'memory', 'hash', 'static'] },
      defaultValue: 'history',
    },
    selectedNodeUri: { control: 'text', defaultValue: '/' },
    searchPhrase: { control: 'text' },
    schemaViewMode: {
      control: { type: 'inline-radio', options: ['simple', 'detailed'] },
      defaultValue: undefined,
    },
    filters: {
      options: ['breaking', 'non-breaking', 'annotation', 'unclassified', 'deprecate'],
      control: { type: 'inline-check' },
    },
    mergedDocument: { type: 'object' },
  },
}

const Template = (props: any) => {
  return (
    <DiffOperationAPI
      {...props}
      diffsMetaKey={diffsMetaKey}
      aggregatedDiffsMetaKey={aggregatedDiffsMetaKey}
      filters={JSON.stringify(props.filters)}
    />
  )
}

const DEFAULT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'integer', format: 'int64' },
    name: { type: 'string' },
  },
}

const DEFAULT_RESPONSES: Record<string, object> = {
  '200': {
    description: 'Successful operation',
    content: {
      'application/json': {
        schema: DEFAULT_SCHEMA,
      },
    },
  },
}

const DEFAULT_REQUEST_BODY = {
  required: true,
  content: {
    'application/json': {
      schema: DEFAULT_SCHEMA,
    },
  },
}

interface OasSpecOptions {
  requestBody?: object
  responsesBody?: Record<string, object>
}

function buildOasSpec(options: OasSpecOptions = {}): object {
  const { requestBody, responsesBody } = options

  const responses = responsesBody
    ? {
      ...DEFAULT_RESPONSES,
      ...Object.fromEntries(
        Object.entries(responsesBody).map(([statusCode, response]) => [
          statusCode,
          { description: 'Response', ...response },
        ]),
      ),
    }
    : DEFAULT_RESPONSES

  return {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      '/items': {
        post: {
          operationId: 'createItem',
          requestBody: requestBody ?? DEFAULT_REQUEST_BODY,
          responses,
        },
      },
    },
  }
}

const SCHEMA_WITHOUT_EXTENSIONS = {
  type: 'object',
  properties: {
    id: { type: 'integer', format: 'int64' },
    name: { type: 'string' },
  },
}

const SCHEMA_WITH_EXTENSIONS = {
  type: 'object',
  'x-internal': true,
  'x-label': 'item',
  'x-order': 1,
  properties: {
    id: { type: 'integer', format: 'int64' },
    name: { type: 'string' },
  },
}

export const RequestBodySchemaAddedExtensions: any = Template.bind({})
RequestBodySchemaAddedExtensions.args = {
  mergedDocument: getMergedDocument(
    buildOasSpec({
      requestBody: {
        required: true,
        content: { 'application/json': { schema: SCHEMA_WITHOUT_EXTENSIONS } },
      },
    }),
    buildOasSpec({
      requestBody: {
        required: true,
        content: { 'application/json': { schema: SCHEMA_WITH_EXTENSIONS } },
      },
    }),
  ),
  displayMode: COMPARE_DISPLAY_MODE,
}
RequestBodySchemaAddedExtensions.storyName = '[post] Request body schema added extensions'

export const RequestBodySchemaRemovedExtensions: any = Template.bind({})
RequestBodySchemaRemovedExtensions.args = {
  mergedDocument: getMergedDocument(
    buildOasSpec({
      requestBody: {
        required: true,
        content: { 'application/json': { schema: SCHEMA_WITH_EXTENSIONS } },
      },
    }),
    buildOasSpec({
      requestBody: {
        required: true,
        content: { 'application/json': { schema: SCHEMA_WITHOUT_EXTENSIONS } },
      },
    }),
  ),
  displayMode: COMPARE_DISPLAY_MODE,
}
RequestBodySchemaRemovedExtensions.storyName = '[post] Request body schema removed extensions'

const SCHEMA_WITH_EXTENSIONS_BEFORE = {
  type: 'object',
  'x-internal': true,
  'x-label': 'legacy-item',
  'x-deprecated-reason': 'use /v2/items instead',
  properties: {
    id: { type: 'integer', format: 'int64' },
    name: { type: 'string' },
  },
}

const SCHEMA_WITH_EXTENSIONS_AFTER = {
  type: 'object',
  'x-internal': false,
  'x-label': 'item',
  'x-order': 1,
  properties: {
    id: { type: 'integer', format: 'int64' },
    name: { type: 'string' },
  },
}

export const RequestBodySchemaExtensionsChanged: any = Template.bind({})
RequestBodySchemaExtensionsChanged.args = {
  mergedDocument: getMergedDocument(
    buildOasSpec({
      requestBody: {
        required: true,
        content: { 'application/json': { schema: SCHEMA_WITH_EXTENSIONS_BEFORE } },
      },
    }),
    buildOasSpec({
      requestBody: {
        required: true,
        content: { 'application/json': { schema: SCHEMA_WITH_EXTENSIONS_AFTER } },
      },
    }),
  ),
  displayMode: COMPARE_DISPLAY_MODE,
}
RequestBodySchemaExtensionsChanged.storyName = '[post] Request body schema extensions changed'

const SCHEMA_WITHOUT_NAME_PROPERTY = {
  type: 'object',
  properties: {
    id: { type: 'integer', format: 'int64' },
  },
}

const SCHEMA_WITH_NAME_PROPERTY_WITH_EXTENSIONS = {
  type: 'object',
  properties: {
    id: { type: 'integer', format: 'int64' },
    name: {
      type: 'string',
      'x-internal': true,
      'x-label': 'display-name',
      'x-order': 2,
    },
  },
}

export const RequestBodySchemaAddedPropertyWithExtensions: any = Template.bind({})
RequestBodySchemaAddedPropertyWithExtensions.args = {
  mergedDocument: getMergedDocument(
    buildOasSpec({
      requestBody: {
        required: true,
        content: { 'application/json': { schema: SCHEMA_WITHOUT_NAME_PROPERTY } },
      },
    }),
    buildOasSpec({
      requestBody: {
        required: true,
        content: { 'application/json': { schema: SCHEMA_WITH_NAME_PROPERTY_WITH_EXTENSIONS } },
      },
    }),
  ),
  displayMode: COMPARE_DISPLAY_MODE,
}
RequestBodySchemaAddedPropertyWithExtensions.storyName = '[post] Request body schema added property with extensions'

export const RequestBodySchemaRemovedPropertyWithExtensions: any = Template.bind({})
RequestBodySchemaRemovedPropertyWithExtensions.args = {
  mergedDocument: getMergedDocument(
    buildOasSpec({
      requestBody: {
        required: true,
        content: { 'application/json': { schema: SCHEMA_WITH_NAME_PROPERTY_WITH_EXTENSIONS } },
      },
    }),
    buildOasSpec({
      requestBody: {
        required: true,
        content: { 'application/json': { schema: SCHEMA_WITHOUT_NAME_PROPERTY } },
      },
    }),
  ),
  displayMode: COMPARE_DISPLAY_MODE,
}
RequestBodySchemaRemovedPropertyWithExtensions.storyName = '[post] Request body schema removed property with extensions'
