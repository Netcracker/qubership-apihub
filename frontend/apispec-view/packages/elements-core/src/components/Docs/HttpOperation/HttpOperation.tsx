import { useSearchPhrase } from '@stoplight/elements/containers/API'; // TODO: `elements-core` must not depend on `elements`!
import { useOperationExtensions } from '@stoplight/elements/hooks/useExtensions';
import { useResolvedObject } from '@stoplight/elements-core';
import { Extensions } from '@stoplight/elements-core/components/Docs/Extensions';
import { SectionSubtitle } from '@stoplight/elements-core/components/Docs/Sections';
import { Box, Flex, Heading, HStack, isNotEmptyObject, useThemeIsDark, VStack } from '@stoplight/mosaic';
import { ErrorBoundaryProps, withErrorBoundary } from '@stoplight/react-error-boundary';
import { IHttpOperation, IServer } from '@stoplight/types';
import cn from 'classnames';
import * as React from 'react';
import { Marker } from 'react-mark.js';

import { HttpMethodColors } from '../../../constants';
import { MockingContext } from '../../../containers/MockingProvider';
import { useChosenServerUrl } from '../../../hooks/useChosenServerUrl';
import { MarkdownViewer } from '../../MarkdownViewer';
import { TryItWithRequestSamples } from '../../TryIt';
import { DocsComponentProps } from '..';
import { TwoColumnLayout } from '../TwoColumnLayout';
import { DeprecatedBadge, InternalBadge } from './Badges';
import { Request } from './Request';
import { Responses } from './Responses';
import { defaultErrorHandler } from "../../../../../system";

export type HttpOperationProps = DocsComponentProps<IHttpOperation>;

const HttpOperationComponent = React.memo<HttpOperationProps>(
  ({
    className,
    data: unresolvedData,
    layoutOptions,
    tryItCredentialsPolicy,
    tryItCorsProxy,
    proxyServer,
    hideExamples,
  }) => {
    const data = useResolvedObject(unresolvedData) as IHttpOperation;

    const mocking = React.useContext(MockingContext);
    const isDeprecated = !!data.deprecated;
    const isInternal = !!data.internal;

    const [responseMediaType, setResponseMediaType] = React.useState('');
    const [responseStatusCode, setResponseStatusCode] = React.useState('');
    const [requestBodyIndex, setTextRequestBodyIndex] = React.useState(0);

    const prettyName = (data.summary || data.iid || '').trim();

    const header = (
      <VStack spacing={5}>
        {!layoutOptions?.noHeading && prettyName && (
          <HStack spacing={5}>
            <Heading size={1} fontWeight="semibold">
              {prettyName}
            </Heading>

            <HStack spacing={2}>
              {isDeprecated && <DeprecatedBadge />}
              {isInternal && <InternalBadge isHttpService />}
            </HStack>
          </HStack>
        )}

        <MethodPath method={data.method} path={data.path} chosenServer={data?.servers?.[0]} />
      </VStack>
    );

    const tryItPanel = !layoutOptions?.hideTryItPanel && (
      <TryItWithRequestSamples
        httpOperation={data}
        responseMediaType={responseMediaType}
        responseStatusCode={responseStatusCode}
        requestBodyIndex={requestBodyIndex}
        hideTryIt={layoutOptions?.hideTryIt}
        tryItCredentialsPolicy={tryItCredentialsPolicy}
        mockUrl={mocking.hideMocking ? undefined : mocking.mockUrl}
        corsProxy={tryItCorsProxy}
        proxyServer={proxyServer}
      />
    );

    const [requestExtensions, responseExtensions] = useOperationExtensions(data.path, data.method, responseStatusCode);
    const searchPhrase = useSearchPhrase();
    const description = (
      <VStack spacing={10}>
        <Marker mark={searchPhrase}>
          {data.description && <MarkdownViewer className="HttpOperation__Description" markdown={data.description} />}

          {isNotEmptyObject(data.extensions) && (
            <Box>
              <SectionSubtitle title="Custom properties" id="operation-extensions" />
              <Extensions value={data.extensions} />
            </Box>
          )}

          <Request onChange={setTextRequestBodyIndex} operation={data} extensions={requestExtensions} />
        </Marker>

        {data.responses && (
          <Responses
            responses={data.responses}
            onMediaTypeChange={setResponseMediaType}
            onStatusCodeChange={setResponseStatusCode}
            extensions={responseExtensions}
          />
        )}

        {layoutOptions?.compact && !hideExamples && tryItPanel}
      </VStack>
    );

    return (
      <TwoColumnLayout
        className={cn('HttpOperation', className)}
        header={header}
        left={description}
        right={!layoutOptions?.compact && tryItPanel}
      />
    );
  },
);
HttpOperationComponent.displayName = 'HttpOperation.Component';

export const HttpOperation: React.FunctionComponent<HttpOperationProps & ErrorBoundaryProps<{}>> =
  withErrorBoundary<HttpOperationProps>(HttpOperationComponent, {
    recoverableProps: ['data'],
    onError: defaultErrorHandler,
  });

type MethodPathProps = { method: IHttpOperation['method']; path: string; chosenServer?: IServer };

function isValidHttpUrl(value: string): boolean {
  let url;

  try {
    url = new URL(value);
  } catch (_) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
}

function MethodPath({ method, path, chosenServer }: MethodPathProps) {
  let chosenServerUrl = '';

  const cutEndingSlash = (value: string): string => {
    return value.endsWith('/') ? value.slice(0, -1) : value;
  };

  if (chosenServer) {
    chosenServerUrl = cutEndingSlash(
      isValidHttpUrl(chosenServer.url) ? new URL(chosenServer.url).pathname : chosenServer.url,
    );
  }

  return (
    <Box style={{ marginTop: 0 }}>
      <MethodPathInner method={method} path={path} chosenServerUrl={chosenServerUrl} />
    </Box>
  );
}

function MethodPathInner({ method, path, chosenServerUrl }: MethodPathProps & { chosenServerUrl: string }) {
  const isDark = useThemeIsDark();
  const fullUrl = `${chosenServerUrl}${path}`;
  const { leading, trailing } = useChosenServerUrl(chosenServerUrl);

  const pathElem = (
    <Flex overflowX="hidden" fontSize="lg" userSelect="all">
      <span>
        <Box color="muted" textOverflow="truncate" overflowX="hidden" display="inline-flex">
          {leading}

          {trailing !== null && (
            <Box as="span" dir="ltr" style={{ unicodeBidi: 'bidi-override' }}>
              {trailing}
            </Box>
          )}
        </Box>

        <Box fontWeight="semibold" flex={1} display="inline-flex">
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
      bg="canvas-50"
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
        fontSize="lg"
        fontWeight="semibold"
        textTransform="uppercase"
      >
        {method}
      </Box>

      {pathElem}
    </HStack>
  );
}
