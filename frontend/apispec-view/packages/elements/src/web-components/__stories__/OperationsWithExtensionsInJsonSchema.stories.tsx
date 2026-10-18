import '../index';

import { OperationAPIImpl } from "@stoplight/elements/containers/OperationAPI";
import { getMergedDocument } from "@stoplight/elements/web-components/__stories__/helpers/getMergedDocument";
import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'operation-view': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

const Template = (props: any) => <OperationAPIImpl {...props} proxyServer={JSON.stringify(props.proxyServer)} />;

export default {
  title: 'web-components/Operations with extensions in JSON Schema',
  argTypes: {
    operation: {
      control: 'text',
    },
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
  },
};

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

const SCHEMA_WITH_EXTENSIONS_ON_SECOND_LEVEL = {
  type: 'object',
  properties: {
    id: { type: 'integer', format: 'int64', 'x-internal': true, 'x-label': 'item', 'x-order': 1 },
    name: { type: 'string' },
  },
}

export const RequestBodyWithExtensionsOnFirstLevel: any = Template.bind({});
RequestBodyWithExtensionsOnFirstLevel.args = {
  mergedDocument: getMergedDocument(
    buildOasSpec({
      requestBody: {
        required: true,
        content: { 'application/json': { schema: SCHEMA_WITH_EXTENSIONS } },
      },
    }),
    undefined
  ),
};
RequestBodyWithExtensionsOnFirstLevel.storyName = '[post] Request body with extensions on first level';

export const RequestBodyWithExtensionsOnSecondLevel: any = Template.bind({});
RequestBodyWithExtensionsOnSecondLevel.args = {
  mergedDocument: getMergedDocument(
    buildOasSpec({
      requestBody: {
        required: true,
        content: { 'application/json': { schema: SCHEMA_WITH_EXTENSIONS_ON_SECOND_LEVEL } },
      },
    }),
    undefined
  ),
};
RequestBodyWithExtensionsOnSecondLevel.storyName = '[post] Request body with extensions on second level';
