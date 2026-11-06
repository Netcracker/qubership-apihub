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
 *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        date: /Date$/,
      },
    },
    options: {
      storySort: {
        // API type blocks from the core to the overall specifications: JSO, JSON Schema, AsyncAPI,
        // OpenAPI (both built on JSO / JSON Schema), DDL API, GraphQL (neither is). Keep the
        // single-suite runner menus in the same order: bin/screenshot-test-run-order.json
        // (tests/storybook-order.test.ts checks it).
        order: [
          'Debug',
          [
            'Jso Viewer',
            'Json Schema Viewer',
            'Json Schema Viewer (OAS)',
            'Json Schema Diff Viewer',
            'Async Api Viewer',
            'Async Api Diffs Viewer',
            'OpenAPI Operation Viewer',
            'OpenAPI Operation Diffs Viewer',
            'DDL API from DDL SQL',
            'DDL API Diffs from DDL SQL',
            'GraphQL Debug Page',
          ],
          // JSO
          'JSO Suite',
          'JSO Diffs Suite',
          [
            'stringValue',
            'numberValue',
            'booleanValue',
            'nullValue',
            'objectPrimitiveProps',
            'objectPropsObjects',
            'objectPropsArrays',
            'objectAllPropTypes',
            'arrayPrimitives',
            'arrayObjects',
            'arrayArrayItems',
            'arrayAllItemTypes',
            'stringJsonSchema',
            'objectJsonSchema',
          ],
          'JSO Diffs Suite (Hiding Unchanged Nodes)',
          [
            'Root Level',
            'Second Level',
            'Nested',
          ],
          // JSON Schema
          'JSON Schema Suite',
          'JSON Schema Suite (Extensions)',
          'JSON Schema Suite (Performance)',
          'JSON Schema Suite (Display Mode = simple)',
          'JSON Schema Diffs Suite',
          'JSON Schema Diffs Suite (Extensions)',
          'JSON Schema Diffs Suite (Hiding Unchanged Nodes)',
          'JSON Schema Diffs Suite (Node Changes Summary)',
          'JSON Schema Diffs Suite (Display Mode = simple)',
          // AsyncAPI
          'Async API Suite',
          'Async API Suite (Display Mode = simple)',
          'Async API Diffs Suite',
          [
            'Whole Apihub Operation Samples',
            'Message Samples',
            'Channel Samples',
            'Operation Samples',
            'Channel Parameters Samples',
            'Channel Server Samples',
          ],
          'Async API Diffs Suite (Display Mode = simple)',
          // OpenAPI
          'OpenAPI Operation Suite',
          'OpenAPI Operation Suite (Arrow Buttons)',
          'OpenAPI Operation Suite (Display Mode = simple)',
          'OpenAPI Operation Diffs Suite',
          'OpenAPI Operation Diffs Suite (Hiding Unchanged Nodes)',
          'OpenAPI Operation Diffs Suite (Arrow Buttons)',
          'OpenAPI Operation Diffs Suite (Display Mode = simple)',
          'OpenAPI Compatibility Suite',
          [
            'OAS 3.0 vs OAS 3.0',
            [
              'general-operation-parameters',
              'operation-parameters',
              'parameters-schema',
              'parameters-examples',
              'headers',
              'request',
              'request-body',
              'request-body-schema',
              'request-body-examples',
              'response',
              'response-headers-schema',
              'response-body-schema',
              'response-body-examples',
            ],
            'OAS 3.0 vs OAS 3.1',
            [
              'general-operation-parameters',
              'operation-parameters',
              'parameters-schema',
              'parameters-examples',
              'headers',
              'request',
              'request-body',
              'request-body-schema',
              'request-body-examples',
              'response',
              'response-headers-schema',
              'response-body-schema',
              'response-body-examples',
            ],
            'OAS 3.1 vs OAS 3.0',
            [
              'general-operation-parameters',
              'operation-parameters',
              'parameters-schema',
              'parameters-examples',
              'headers',
              'request',
              'request-body',
              'request-body-schema',
              'request-body-examples',
              'response',
              'response-headers-schema',
              'response-body-schema',
              'response-body-examples',
            ],
            'OAS 3.1 vs OAS 3.1',
            [
              'general-operation-parameters',
              'operation-parameters',
              'parameters-schema',
              'parameters-examples',
              'headers',
              'request',
              'request-body',
              'request-body-schema',
              'request-body-examples',
              'response',
              'response-headers-schema',
              'response-body-schema',
              'response-body-examples',
            ],
          ],
          // DDL API
          'DDL API Suite',
          [
            'E2E Scenarios',
          ],
          'DDL API Suite (Display Mode = simple)',
          'DDL API Diffs Suite',
          'DDL API Diffs Suite (Display Mode = simple)',
          'DDL API Compatibility Suite',
          // GraphQL
          'GraphQL Operation Viewer',
          'GraphQL Operation Diff Viewer',
          'GraphQL Compatibility Suite',
          '*'
        ]
      }
    }
  },
};

export default preview;
