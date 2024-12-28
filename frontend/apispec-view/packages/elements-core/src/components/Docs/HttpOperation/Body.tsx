import { JsonSchemaViewer } from '@netcracker/qubership-apihub-api-doc-viewer';
import { useOperationSchemaOptionsMode } from '@stoplight/elements';
import { Box, Flex, VStack } from '@stoplight/mosaic';
import { IHttpOperationRequestBody } from '@stoplight/types';
import { JsonSchemaViewer as OldJsonSchemaViewer } from 'json-schema-viewer';
import * as React from 'react';

import { useInlineRefResolver } from '../../../context/InlineRefResolver';
import { isJSONSchema } from '../../../utils/guards';
import { getOriginalObject } from '../../../utils/ref-resolving/resolvedObject';
import { MarkdownViewer } from '../../MarkdownViewer';
import { SectionSubtitle } from '../Sections';

export interface BodyProps {
  body: IHttpOperationRequestBody;
  onChange: (requestBodyIndex: number) => void;
}

export const isBodyEmpty = (body?: BodyProps['body']) => {
  if (!body) return true;

  const { contents = [], description } = body;

  return contents.length === 0 && !description?.trim();
};

export const Body = ({ body, onChange }: BodyProps) => {
  const [chosenContent, setChosenContent] = React.useState(0);
  const refResolver = useInlineRefResolver();
  const { schemaViewMode, defaultSchemaDepth, oldRenderer } = useOperationSchemaOptionsMode();

  React.useEffect(() => {
    onChange(chosenContent);
    // disabling because we don't want to react on `onChange` change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenContent]);

  if (isBodyEmpty(body)) return null;

  const { contents = [], description, required = false } = body;
  const schema = contents[chosenContent]?.schema;

  return (
    <VStack spacing={6}>
      <Flex justifyContent="between" alignItems="center">
        <SectionSubtitle title="Body" id="request-body">
          {contents.length > 0 && (
            <Flex flex={1} justify="end">
              <select
                aria-label="Request Body Content Type"
                value={String(chosenContent)}
                onChange={event => setChosenContent(parseInt(String(event.target.value), 10))}
                className="sl-menu-adapter"
                style={{ backgroundColor: 'white' }}
              >
                {contents.map((content, index) => (
                  <option key={index} value={index} style={{ backgroundColor: 'white' }}>
                    {content.mediaType}
                  </option>
                ))}
              </select>
            </Flex>
          )}
        </SectionSubtitle>
        {required && (
          <Box as="span" py={1} className="sl-text-sm" color="warning">
            required
          </Box>
        )}
      </Flex>

      {description && <MarkdownViewer markdown={description} />}

      {isJSONSchema(schema) &&
        (oldRenderer ? (
          <OldJsonSchemaViewer
            resolveRef={refResolver}
            schema={getOriginalObject(schema)}
            viewMode="write"
            renderRootTreeLines
            schemaViewMode={schemaViewMode}
            defaultExpandedDepth={defaultSchemaDepth}
          />
        ) : (
          <JsonSchemaViewer
            schema={getOriginalObject(schema!)}
            displayMode={schemaViewMode}
            expandedDepth={defaultSchemaDepth}
            overriddenKind="parameters"
          />
        ))}
    </VStack>
  );
};
Body.displayName = 'HttpOperation.Body';
