import { JsonSchemaViewer } from '@netcracker/qubership-apihub-api-doc-viewer';
import { Extensions } from '@stoplight/elements-core/components/Docs/Extensions';
import { useSearchPhrase, useExtensions, useOperationSchemaOptionsMode } from '@stoplight/elements-core';
import { SectionSubtitle } from '@stoplight/elements-core/components/Docs/Sections';
import { Box, CopyButton, Flex, Heading, HStack, isNotEmptyObject, Panel, Text, VStack } from '@stoplight/mosaic';
import { CodeViewer } from '@stoplight/mosaic-code-viewer';
import { ErrorBoundaryProps, withErrorBoundary } from '@stoplight/react-error-boundary';
import cn from 'classnames';
import { JSONSchema7 } from 'json-schema';
import { JsonSchemaViewer as OldJsonSchemaViewer } from 'json-schema-viewer';
import * as React from 'react';
import { Marker } from 'react-mark.js';

import { useInlineRefResolver, useResolvedObject } from '../../../context/InlineRefResolver';
import { useIsCompact } from '../../../hooks/useIsCompact';
import { exceedsSize, generateExamplesFromJsonSchema } from '../../../utils/exampleGeneration/exampleGeneration';
import { getOriginalObject } from '../../../utils/ref-resolving/resolvedObject';
import { LoadMore } from '../../LoadMore';
import { MarkdownViewer } from '../../MarkdownViewer';
import { DocsComponentProps } from '..';
import { DeprecatedBadge, InternalBadge } from '../HttpOperation/Badges';
import { ExportButton } from '../HttpService/ExportButton';
import { TwoColumnLayout } from '../TwoColumnLayout';
import { defaultErrorHandler } from "../../../../../system";

export type ModelProps = DocsComponentProps<JSONSchema7>;

const ModelComponent: React.FC<ModelProps> = ({
  data: unresolvedData,
  className,
  nodeTitle,
  layoutOptions,
  exportProps,
}) => {
  const resolveRef = useInlineRefResolver();
  const data = useResolvedObject(unresolvedData) as JSONSchema7;
  const [extensions] = useExtensions(data);
  const { schemaViewMode, defaultSchemaDepth, oldRenderer } = useOperationSchemaOptionsMode();

  const { ref: layoutRef, isCompact } = useIsCompact(layoutOptions);

  const title = data.title ?? nodeTitle;
  const isDeprecated = !!data['deprecated'];
  const isInternal = !!data['x-internal'];

  const shouldDisplayHeader =
    !layoutOptions?.noHeading && (title !== undefined || (exportProps && !layoutOptions?.hideExport));

  const header = (shouldDisplayHeader || isInternal || isDeprecated) && (
    <Flex justifyContent="between" alignItems="center">
      <HStack spacing={5}>
        {title && (
          <Heading size={1} fontWeight="semibold">
            {title}
          </Heading>
        )}

        <HStack spacing={2}>
          {isDeprecated && <DeprecatedBadge />}
          {isInternal && <InternalBadge />}
        </HStack>
      </HStack>

      {exportProps && !layoutOptions?.hideExport && <ExportButton {...exportProps} />}
    </Flex>
  );

  const modelExamples = !layoutOptions?.hideModelExamples && <ModelExamples data={data} />;

  const searchPhrase = useSearchPhrase();
  const description = (
    <VStack spacing={10}>
      <Marker mark={searchPhrase}>
        {data.description && data.type === 'object' && <MarkdownViewer role="textbox" markdown={data.description} />}

        {extensions && isNotEmptyObject(extensions) && (
          <Box>
            <SectionSubtitle title="Custom properties" id="extensions" />
            <Extensions value={extensions} />
          </Box>
        )}

        {oldRenderer ? (
          <OldJsonSchemaViewer
            resolveRef={resolveRef}
            schema={getOriginalObject(data)}
            schemaViewMode={schemaViewMode}
          />
        ) : (
          <JsonSchemaViewer
            schema={getOriginalObject(data)}
            displayMode={schemaViewMode}
            expandedDepth={defaultSchemaDepth}
            overriddenKind="parameters"
          />
        )}
      </Marker>

      {isCompact && modelExamples}
    </VStack>
  );

  return (
    <TwoColumnLayout
      ref={layoutRef}
      className={cn('Model', className)}
      header={header}
      left={description}
      right={!isCompact && modelExamples}
    />
  );
};

const ModelExamples = React.memo(({ data, isCollapsible = false }: { data: JSONSchema7; isCollapsible?: boolean }) => {
  const [chosenExampleIndex, setChosenExampleIndex] = React.useState(0);
  const [show, setShow] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);

  const examples = React.useMemo(() => generateExamplesFromJsonSchema(data), [data]);

  const selectedExample = examples[chosenExampleIndex]?.data;

  const handleLoadMorePress = React.useCallback(() => {
    setLoading(true);
    setTimeout(() => setShow(true), 50);
  }, []);

  const examplesSelect = examples.length > 1 && (
    <select
      aria-label="Example"
      value={String(chosenExampleIndex)}
      onChange={({ target }) => setChosenExampleIndex(parseInt(String(target.value), 10))}
      className="sl-menu-adapter"
    >
      {examples.map(({ label }, index) => (
        <option key={index} value={index}>
          {label}
        </option>
      ))}
    </select>
  );

  return (
    <Panel rounded isCollapsible={isCollapsible} defaultIsOpen={!isCollapsible}>
      <Panel.Titlebar rightComponent={selectedExample ? <CopyButton size="sm" copyValue={selectedExample} /> : null}>
        {examplesSelect || (
          <Text color="body" role="heading">
            Example
          </Text>
        )}
      </Panel.Titlebar>

      <Panel.Content p={0}>
        {show || !exceedsSize(selectedExample) ? (
          <CodeViewer
            aria-label={selectedExample}
            noCopyButton
            maxHeight="500px"
            language="json"
            value={selectedExample}
            showLineNumbers
          />
        ) : (
          <LoadMore loading={loading} onClick={handleLoadMorePress} />
        )}
      </Panel.Content>
    </Panel>
  );
});

export const Model: React.FunctionComponent<ModelProps & ErrorBoundaryProps<{}>> = withErrorBoundary<ModelProps>(
  ModelComponent,
  {
    recoverableProps: ['data'],
    onError: defaultErrorHandler,
  },
);
