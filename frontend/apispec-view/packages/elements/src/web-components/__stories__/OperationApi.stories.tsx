import '../index';

import { apiAuthLocalAfter, apiAuthLocalBefore, simpleOperation, specWithComplexRefs } from '@netcracker/qubership-apihub-apispec-view-samples';
import {
  createLegacyOperationStory,
  legacyStoryArgTypes,
  LegacyStoryArgs,
  legacyStoryParameters,
} from '@netcracker/qubership-apihub-apispec-view/web-components/__stories__/helpers/legacy-stories-utils';
import { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'operation-view': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

const meta: Meta<LegacyStoryArgs> = {
  title: 'Legacy tests/OperationAPI',
  id: 'legacy-tests-operation-api',
  argTypes: legacyStoryArgTypes,
  parameters: legacyStoryParameters,
};

export default meta;
type Story = StoryObj<LegacyStoryArgs>;

export const case1: Story = {
  name: '[GET /pets/{id}/**] Operation with path param, security and request body',
  ...createLegacyOperationStory(simpleOperation),
};

export const case2: Story = {
  name: '[GET /pets/{id}/**] Same, schema view mode "simple"',
  ...createLegacyOperationStory(simpleOperation, { componentProps: { schemaViewMode: 'simple' } }),
};

export const case3: Story = {
  name: '[POST /auth/local_added] Header params, custom proxy server, examples hidden',
  ...createLegacyOperationStory(apiAuthLocalBefore, {
    componentProps: {
      proxyServer: JSON.stringify({ url: 'test-proxy-url', description: 'Custom url' }),
      hideExamples: true,
    },
  }),
};

export const case4: Story = {
  name: '[POST /auth/local] Header params, default settings',
  ...createLegacyOperationStory(apiAuthLocalAfter),
};

export const case5: Story = {
  name: '[GET /pets/{id}/**] Operation without heading',
  ...createLegacyOperationStory(simpleOperation, { componentProps: { noHeading: true } }),
};

export const case6: Story = {
  name: '[GET /foo] Request body and response via chained $refs, without heading',
  ...createLegacyOperationStory(specWithComplexRefs, { componentProps: { noHeading: true } }),
};

export const case7: Story = {
  name: '[POST /test] Query params: one with schema, one with content',
  ...createLegacyOperationStory({
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Description for Test',
          parameters: [
            {
              name: 'simple',
              in: 'query',
              schema: {
                type: 'number',
                description: 'Number param',
              },
            },
            {
              name: 'complex',
              in: 'query',
              content: {
                'application/json': {
                  schema: {
                    type: 'string',
                    description: 'String param',
                  },
                },
              },
            },
          ],
        },
      },
    },
  }),
};

export const case8: Story = {
  name: '[POST /test] Request body with additionalProperties: false',
  ...createLegacyOperationStory({
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    prop1: { type: 'string' },
                    prop2: { type: 'string' },
                  },
                  additionalProperties: false,
                },
              },
            },
          },
        },
      },
    },
  }),
};
