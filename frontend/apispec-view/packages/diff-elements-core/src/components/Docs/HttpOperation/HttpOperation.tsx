import { ExtensionsDiff } from '@stoplight/diff-elements-core/components/Docs/ExtensionsDiff';
import { useOperationExtensionsWithDiff } from '@stoplight/elements/hooks/useExtensionsDiff';
import { ExportButtonProps, useDocument } from '@stoplight/elements-core';
import { Box, Flex, HStack, isNotEmptyObject, useThemeIsDark, VStack } from '@stoplight/mosaic';
import { ITypographyProps } from '@stoplight/mosaic/enhancers/typography';
import { ErrorBoundaryProps, withErrorBoundary } from '@stoplight/react-error-boundary';
import { IHttpOperation } from '@stoplight/types';
import cn from 'classnames';
import {
  combineDiffMetas,
  DiffBlock,
  DiffContainer,
  useValueFromObjWithDiff,
  WithDiffMetaKey
} from 'diff-block';
import { Location } from 'history';
import { useAtomValue } from 'jotai/utils';
import { SchemaViewMode } from 'json-schema-viewer';
import { entries, pick } from 'lodash';
import * as React from 'react';

import { HttpMethodColors } from '../../../constants';
import { chosenServerAtom } from '../../TryIt';
import { TwoColumnLayout } from '../TwoColumnLayout';
import { Request } from './Request';
import { Responses } from './Responses';
import { Description } from "@stoplight/diff-elements-core/components/Docs/HttpOperation/Description";
import { Summary } from "@stoplight/diff-elements-core/components/Docs/HttpOperation/Summary";
import { useState, memo, FC } from "react";
import { Diff } from "@netcracker/qubership-apihub-api-diff";
import { defaultErrorHandler } from "../../../../../system";
import { useDiffMetaKey } from "@stoplight/elements/containers/DIffMetaKeyContext";
import { buildOpenApiDiffCause } from "@netcracker/qubership-apihub-api-doc-viewer";

interface BaseDocsProps {
  /**
   * CSS class to add to the root container.
   */
  className?: string;

  /**
   * URI of the document
   */
  uri?: string;

  /**
   * Some components may depend on some location/URL data.
   */
  location?: Location;

  /**
   * The original title of the node. It serves as a fallback title in case on is not available inside the model.
   */
  nodeTitle?: string;

  /**
   * @deprecated this property is no longer used and will be removed in the next major version
   */
  allowRouting?: boolean;

  /**
   * Export button props
   */
  exportProps?: ExportButtonProps;

  /**
   * Fetch credentials policy for TryIt component
   * For more information: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
   * @default "omit"
   */

  tryItCredentialsPolicy?: 'omit' | 'include' | 'same-origin';

  /**
   * Url of a CORS proxy that will be used to send requests in TryIt.
   * Provided url will be prepended to an URL of an actual request.
   * @default false
   */
  tryItCorsProxy?: string;

  /**
   * Allows to customize the layout of Docs
   */
  layoutOptions?: {
    /**
     * Allows to hide TryIt component
     * @default false
     */
    hideTryIt?: boolean;

    /**
     * Shows only operation document without right column
     * @default false
     */
    hideTryItPanel?: boolean;
    /**
     * If true, the component will hide its title
     * @default false
     */
    noHeading?: boolean;
    /**
     * If true, the component will hide the Powered by Stoplight banner in Docs
     * @default false
     */
    showPoweredByLink?: boolean;
    /**
     * Allows to hide model examples
     * @default false
     */
    hideModelExamples?: boolean;
    /**
     * Allows to hide server information
     * @default false
     */
    hideServerInfo?: boolean;
    /**
     * Allows to hide security information
     * @default false
     */
    hideSecurityInfo?: boolean;

    /**
     * Allows to hide export button
     * @default false
     */
    hideExport?: boolean;

    /**
     * Provide a number to trigger compact mode when the component is within that pixel width,
     * or a boolean to enable or diable compact mode.
     * @default false
     * @example 600
     */
    compact?: number | boolean;

    schemaViewMode?: SchemaViewMode;
  };
}

export interface DocsComponentProps<T = unknown> extends BaseDocsProps {
  /**
   * The input data for the component to display.
   */
  data: T;
}

export type DiffHttpOperationProps = DocsComponentProps<IHttpOperation>;

const HttpOperationComponent = memo<DiffHttpOperationProps>(props => {
  const { className, data: unresolvedData, layoutOptions } = props;
  const data = unresolvedData as WithDiffMetaKey<IHttpOperation>;
  const document = useDocument();

  const diffMetaKey = useDiffMetaKey()
  const metaForPath = (document as any)?.paths[diffMetaKey];
  const metaForMethod = (document as any)?.paths?.[data.path]?.[diffMetaKey];
  data[diffMetaKey] = {
    ...data[diffMetaKey],
    method: metaForMethod?.[data.method],
    path: metaForPath?.[data.path],
  };

  const diffMeta = data[diffMetaKey];
  const metaForHeader = combineDiffMetas(pick(diffMeta, ['summary', 'iid', 'deprecated', 'internal', 'operationId']));
  const metaForMethodPath = combineDiffMetas(pick(diffMeta, ['method', 'path']));

  const [responseStatusCode, setResponseStatusCode] = useState('');

  const headerView = !layoutOptions?.noHeading && (
    <VStack spacing={5}>
      <DiffContainer>
        <Summary 
          data={data}
          diffMeta={metaForHeader}
          noHeading={layoutOptions?.noHeading}
        />
      </DiffContainer>

      <DiffContainer>
        <MethodPath data={data} diffMeta={metaForMethodPath} />
      </DiffContainer>
    </VStack>
  );

  const extensions: any = useValueFromObjWithDiff(data, 'extensions');
  const [requestExtensions, responseExtensions, operationMeta] = useOperationExtensionsWithDiff(
    data.path,
    data.method,
    responseStatusCode,
  );
  const descriptionView = (
    <VStack spacing={10}>
      <DiffContainer>
        <Description
          id="HttpOperation__Description"
          data={data}
        />
      </DiffContainer>

      {isNotEmptyObject(extensions) && (
        <DiffContainer>
          <ExtensionsDiff
            idPrefix={'HttpOperation__Extensions'}
            value={entries(extensions).map(([key, value]) => ({ [key]: value }))}
            meta={extensions[diffMetaKey]}
          />
        </DiffContainer>
      )}

      <Request
        onChange={() => {}}
        operation={data}
        extensions={requestExtensions}
        extensionsMeta={operationMeta}
        securityMeta={diffMeta?.security}
      />

      {data.responses && (
        <Responses
          operation={data}
          onMediaTypeChange={() => {}}
          onStatusCodeChange={setResponseStatusCode}
          extensions={responseExtensions}
          extensionsMeta={operationMeta}
        />
      )}
    </VStack>
  );

  return (
    <TwoColumnLayout
      className={cn('HttpOperation', className)}
      header={headerView}
      left={descriptionView}
      right={null}
    />
  );
});
HttpOperationComponent.displayName = 'HttpOperation.Component';

export const HttpOperation: FC<DiffHttpOperationProps & ErrorBoundaryProps> = withErrorBoundary<DiffHttpOperationProps>(
  HttpOperationComponent,
  {
    recoverableProps: ['data'],
    onError: defaultErrorHandler,
  },
);

type MethodPathProps = {
  data: WithDiffMetaKey<unknown>
  noBg?: boolean;
  noColor?: boolean;
  fontSize?: ITypographyProps['fontSize'];
  diffMeta?: Diff;
};

type MethodPathInnerProps = {
  method: IHttpOperation['method'];
  path: string;
  noBg?: boolean;
  noColor?: boolean;
  fontSize?: ITypographyProps['fontSize'];
  diffMeta?: Diff;
};

export const MethodPath: FC<MethodPathProps> = (props) => {
  const {
    data,
    noBg,
    noColor,
    fontSize = 'lg',
    diffMeta
  } = props

  const diffCause = buildOpenApiDiffCause(diffMeta)

  const method = useValueFromObjWithDiff(data, 'method') as string;
  const path = useValueFromObjWithDiff(data, 'path') as string;

  const chosenServer = useAtomValue(chosenServerAtom);

  let chosenServerUrl = '';
  if (chosenServer) {
    chosenServerUrl = chosenServer.url.endsWith('/') ? chosenServer.url.slice(0, -1) : chosenServer.url;
  }

  return (
    <DiffBlock
      id="HttpOperation__MethodPath"
      type={diffMeta?.type}
      action={diffMeta?.action}
      cause={diffCause}
    >
      <Box>
        <MethodPathInner
          method={method}
          path={path}
          chosenServerUrl={chosenServerUrl}
          noBg={noBg}
          noColor={noColor}
          fontSize={fontSize}
        />
      </Box>
    </DiffBlock>
  );
}

const MethodPathInner: FC< MethodPathInnerProps & { chosenServerUrl: string }> = (props) => {
  const {
    method,
    path,
    chosenServerUrl,
    noBg,
    noColor,
    fontSize,
  } = props

  const isDark = useThemeIsDark() || noColor;
  const fullUrl = `${chosenServerUrl}${path}`;

  const pathElem = (
    <Flex overflowX="hidden">
      <span>
        {chosenServerUrl ? (
          <Box
            dir="rtl"
            color="muted"
            fontSize={fontSize}
            textOverflow="truncate"
            overflowX="hidden"
            display="inline-flex"
          >
            {chosenServerUrl}
          </Box>
        ) : null}

        <Box fontSize={fontSize} fontWeight="semibold" flex={1} display="inline-flex">
          {path}
        </Box>
      </span>
    </Flex>
  );

  return (
    <HStack
      spacing={3}
      pl={2.5}
      pr={4}
      py={2}
      bg={noBg ? undefined : 'canvas-50'}
      rounded="lg"
      fontFamily="mono"
      display="inline-flex"
      maxW="full"
      title={fullUrl}
    >
      <Box
        py={1}
        px={2.5}
        rounded="lg"
        bg={!isDark ? HttpMethodColors[method] : 'canvas-100'}
        color={!isDark ? 'on-primary' : 'body'}
        fontSize={fontSize}
        fontWeight="semibold"
        textTransform="uppercase"
      >
        {method}
      </Box>

      {pathElem}
    </HStack>
  );
}
