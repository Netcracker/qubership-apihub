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
        order: [
          'Debug',
          [
            'Json Schema Viewer',
            'Json Schema Diff Viewer',
            'GraphQL Debug Page',
            'Async Api Viewer',
            'Async Api Diffs Viewer',
            'Jso Viewer',
            'DDL API from DDL SQL',
          ],
          'Json Schema Viewer',
          'Json Schema Diff Viewer',
          'GraphQL Operation Viewer',
          'GraphQL Operation Diff Viewer',
          'GraphQL Compatibility Suite',
          'Async API Suite',
          'Async API Diffs Suite',
          [
            'Whole Apihub Operation Samples',
            'Message Samples',
            'Channel Samples',
            'Operation Samples',
            'Channel Parameters Samples',
            'Channel Server Samples',
          ],
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
          'DDL API Suite',
          [
            'E2E Scenarios',
          ],
          'DDL API Diffs Suite',
          'JSON Schema Suite',
          'JSON Schema Suite (Extensions)',
          'JSON Schema Suite (Performance)',
          'JSON Schema Diffs Suite',
          'JSON Schema Diffs Suite (Extensions)',
          'JSON Schema Diffs Suite (Hiding Unchanged Nodes)',
          'JSON Schema Diffs Suite (Node Changes Summary)',
          '*'
        ]
      }
    }
  },
};

export default preview;
