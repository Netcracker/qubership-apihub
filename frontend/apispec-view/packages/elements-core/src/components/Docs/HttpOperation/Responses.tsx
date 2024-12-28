import { JsonSchemaViewer } from '@netcracker/qubership-apihub-api-doc-viewer';
import { useOperationSchemaOptionsMode } from '@stoplight/elements';
import { useSearchPhrase } from '@stoplight/elements/containers/API';
import { Extension, Extensions } from '@stoplight/elements-core/components/Docs/Extensions';
import { Box, Flex, IntentVals, Tab, TabList, TabPanel, TabPanels, Tabs, VStack } from '@stoplight/mosaic';
import { IHttpOperationResponse } from '@stoplight/types';
import { JsonSchemaViewer as OldJsonSchemaViewer } from 'json-schema-viewer';
import { isEmpty, sortBy, uniqBy } from 'lodash';
import { nanoid } from 'nanoid';
import * as React from 'react';
import { Marker } from 'react-mark.js';

import { useInlineRefResolver } from '../../../context/InlineRefResolver';
import { getOriginalObject } from '../../../utils/ref-resolving/resolvedObject';
import { MarkdownViewer } from '../../MarkdownViewer';
import { SectionSubtitle, SectionTitle } from '../Sections';
import { Parameters } from './Parameters';

interface ResponseProps {
  response: IHttpOperationResponse;
  extensions?: Extension[];

  onMediaTypeChange(mediaType: string): void;
}

interface ResponsesProps {
  responses: IHttpOperationResponse[];
  extensions?: Extension[];

  onMediaTypeChange(mediaType: string): void;

  onStatusCodeChange(statusCode: string): void;
}

export const Responses = ({
  responses: unsortedResponses,
  onStatusCodeChange,
  onMediaTypeChange,
  extensions,
}: ResponsesProps) => {
  const responses = sortBy(
    uniqBy(unsortedResponses, r => r.code),
    r => r.code,
  );

  const [activeResponseId, setActiveResponseId] = React.useState(responses[0]?.code ?? '');

  React.useEffect(() => {
    onStatusCodeChange(activeResponseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeResponseId]);

  if (!responses.length) return null;

  return (
    <VStack spacing={8} as={Tabs} selectedId={activeResponseId} onChange={setActiveResponseId} appearance="pill">
      <SectionTitle title="Responses">
        <TabList density="compact">
          {responses.map(({ code }) => (
            <Tab key={code} id={code} intent={codeToIntentVal(code)}>
              {code}
            </Tab>
          ))}
        </TabList>
      </SectionTitle>

      <TabPanels p={0}>
        {responses.map(response => (
          <TabPanel key={response.code} id={response.code}>
            <Response response={response} onMediaTypeChange={onMediaTypeChange} extensions={extensions} />
          </TabPanel>
        ))}
      </TabPanels>
    </VStack>
  );
};
Responses.displayName = 'HttpOperation.Responses';

const Response = ({ response, onMediaTypeChange, extensions }: ResponseProps) => {
  const refResolver = useInlineRefResolver();
  const { contents = [], headers = [], description } = response;
  const [chosenContent, setChosenContent] = React.useState(0);

  const responseContent = contents[chosenContent];
  const schema = responseContent?.schema;
  const { schemaViewMode, defaultSchemaDepth, oldRenderer } = useOperationSchemaOptionsMode();

  React.useEffect(() => {
    responseContent && onMediaTypeChange(responseContent.mediaType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseContent]);
  const searchPhrase = useSearchPhrase();

  return (
    <VStack spacing={8} pt={8}>
      <Marker mark={searchPhrase}>
        {description && <MarkdownViewer markdown={description} />}

        {extensions && !isEmpty(extensions) && (
          <Box>
            <SectionSubtitle title="Custom properties" id="response-extensions" />
            {extensions.map(extension => (
              <Extensions key={nanoid(8)} value={extension} />
            ))}
          </Box>
        )}

        {headers.length > 0 && (
          <VStack spacing={5}>
            <SectionSubtitle title="Headers" id="response-headers" />
            {/* @ts-expect-error // Original type definitions != real types */}
            <Parameters parameterType="header" parameters={headers} />
          </VStack>
        )}

        {contents.length > 0 && (
          <>
            <SectionSubtitle title="Body" id="response-body">
              <Flex flex={1} justify="end">
                <select
                  aria-label="Response Body Content Type"
                  value={String(chosenContent)}
                  onChange={e => setChosenContent(parseInt(String(e.target.value), 10))}
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
            </SectionSubtitle>

            {schema &&
              (oldRenderer ? (
                <OldJsonSchemaViewer
                  schema={getOriginalObject(schema)}
                  resolveRef={refResolver}
                  viewMode="read"
                  parentCrumbs={['responses', response.code]}
                  schemaViewMode={schemaViewMode}
                  defaultExpandedDepth={defaultSchemaDepth}
                  renderRootTreeLines
                />
              ) : (
                <JsonSchemaViewer
                  key={nanoid(6)}
                  schema={getOriginalObject(schema!)}
                  displayMode={schemaViewMode}
                  expandedDepth={defaultSchemaDepth}
                  overriddenKind="parameters"
                />
              ))}
          </>
        )}
      </Marker>
    </VStack>
  );
};
Response.displayName = 'HttpOperation.Response';

const codeToIntentVal = (code: string): IntentVals => {
  const firstChar = code.charAt(0);

  switch (firstChar) {
    case '2':
      return 'success';
    case '4':
      return 'warning';
    case '5':
      return 'danger';
    default:
      return 'default';
  }
};
