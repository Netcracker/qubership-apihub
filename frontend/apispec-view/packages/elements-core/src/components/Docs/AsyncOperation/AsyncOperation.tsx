import { IAsyncOperation } from '@netcracker/qubership-apihub-http-spec';
import { Extensions } from '@stoplight/elements-core/components/Docs/Extensions';
import { SectionSubtitle } from '@stoplight/elements-core/components/Docs/Sections';
import { Box, Flex, Heading, HStack, isNotEmptyObject, useThemeIsDark, VStack } from '@stoplight/mosaic';
import { ErrorBoundaryProps, withErrorBoundary } from '@stoplight/react-error-boundary';
import cn from 'classnames';
import { useAtomValue } from 'jotai/utils';
import * as React from 'react';

import { AsyncMethodColors } from '../../../constants';
import { useResolvedObject } from '../../../context/InlineRefResolver';
import { useChosenServerUrl } from '../../../hooks/useChosenServerUrl';
import { MarkdownViewer } from '../../MarkdownViewer';
import { chosenServerAtom } from '../../TryIt';
import { DocsComponentProps } from '..';
import { TwoColumnLayout } from '../TwoColumnLayout';
import { defaultErrorHandler } from "../../../../../system";

export type AsyncOperationProps = DocsComponentProps<IAsyncOperation>;

const AsyncOperationComponent = React.memo<AsyncOperationProps>(
  ({ className, data: unresolvedData, layoutOptions }) => {
    const data = useResolvedObject(unresolvedData) as IAsyncOperation;

    const prettyName = (data.summary || data.iid || '').trim();

    const header = !layoutOptions?.noHeading && (
      <VStack spacing={5}>
        <HStack spacing={5}>
          {!layoutOptions?.noHeading && prettyName ? (
            <Heading size={1} fontWeight="semibold">
              {prettyName}
            </Heading>
          ) : null}
        </HStack>

        <MethodPath method={data.method} path={data.path} />
      </VStack>
    );

    const description = (
      <VStack spacing={10}>
        {data.description && <MarkdownViewer className="AsyncOperation__Description" markdown={data.description} />}

        {isNotEmptyObject(data.extensions) && (
          <Box>
            <SectionSubtitle title="Custom properties" id="operation-extensions" />
            <Extensions value={data.extensions} />
          </Box>
        )}
      </VStack>
    );

    return <TwoColumnLayout className={cn('AsyncOperation', className)} header={header} left={description} />;
  },
);
AsyncOperationComponent.displayName = 'AsyncOperation.Component';

export const AsyncOperation: React.FunctionComponent<AsyncOperationProps & ErrorBoundaryProps<{}>> =
  withErrorBoundary<AsyncOperationProps>(AsyncOperationComponent, {
    recoverableProps: ['data'],
    onError: defaultErrorHandler,
  });

type MethodPathProps = { method: IAsyncOperation['method']; path: string };

function MethodPath({ method, path }: MethodPathProps) {
  const chosenServer = useAtomValue(chosenServerAtom);

  let chosenServerUrl = '';
  if (chosenServer) {
    chosenServerUrl = chosenServer.url.endsWith('/') ? chosenServer.url.slice(0, -1) : chosenServer.url;
  }

  return (
    <Box>
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
        <Box dir="rtl" color="muted" textOverflow="truncate" overflowX="hidden" display="inline-flex">
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
        bg={!isDark ? AsyncMethodColors[method] : 'canvas-100'}
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
