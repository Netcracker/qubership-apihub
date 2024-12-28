import '../index';

import { apiAuthLocalAfter, apiAuthLocalBefore, simpleOperation, specWithComplexRefs } from '@netcracker/qubership-apihub-apispec-view-samples';
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
  title: 'web-components/OperationAPI',
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

export const SimpleOperation: any = Template.bind({});
SimpleOperation.args = {
  mergedDocument: getMergedDocument(simpleOperation, undefined),
};
SimpleOperation.storyName = 'Simple Operation';

export const SimpleOperationSimpleMode: any = Template.bind({});
SimpleOperationSimpleMode.args = {
  mergedDocument: getMergedDocument(simpleOperation, undefined),
  schemaViewMode: 'simple',
};
SimpleOperationSimpleMode.storyName = 'Simple Operation (Simple Mode)';

export const ApiAuthLocalBefore: any = Template.bind({});
ApiAuthLocalBefore.args = {
  mergedDocument: getMergedDocument(apiAuthLocalBefore, undefined),
  proxyServer: { url: 'test-proxy-url', description: 'Custom url' },
  hideExamples: true,
};
ApiAuthLocalBefore.storyName = 'Api Auth Local Before';

export const ApiAuthLocalAfter: any = Template.bind({});
ApiAuthLocalAfter.args = {
  mergedDocument: getMergedDocument(apiAuthLocalAfter, undefined),
};
ApiAuthLocalAfter.storyName = 'Api Auth Local After';

export const OperationWithoutHeading: any = Template.bind({});
OperationWithoutHeading.args = {
  mergedDocument: getMergedDocument(simpleOperation, undefined),
  noHeading: true,
};
OperationWithoutHeading.storyName = 'Operation without Heading';

export const SpecWithComplexRefs: any = Template.bind({});
SpecWithComplexRefs.args = {
  mergedDocument: getMergedDocument(specWithComplexRefs, undefined),
  noHeading: true,
};
SpecWithComplexRefs.storyName = 'Spec with Complex Refs';

export const OperationWithParametersOneSchemaAnotherContent: any = Template.bind({});
OperationWithParametersOneSchemaAnotherContent.args = {
  mergedDocument: getMergedDocument({
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
  }, undefined),
};
OperationWithParametersOneSchemaAnotherContent.storyName = 'Operation with 2 params. 1st with schema, 2nd with content';

export const RequestBodyNoAdditionalProperties: any = Template.bind({});
RequestBodyNoAdditionalProperties.args = {
  mergedDocument: getMergedDocument(
    {
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
                    additionalProperties: false
                  }
                }
              }
            }
          }
        }
      }
    },
    undefined
  )
}
