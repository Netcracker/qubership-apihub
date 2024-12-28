import {
  DEFAULT_DISPLAY_MODE,
  OperationDisplayModeContext,
  OperationSchemaOptions,
  OperationSchemaOptionsContext,
} from '@stoplight/elements'
import {
  InlineRefResolverProvider,
  NonIdealState,
  RoutingProps,
  withMosaicProvider,
  withPersistenceBoundary,
  withQueryClientProvider,
  withRouter,
  withStyles,
} from '@stoplight/elements-core'
import { IServer } from '@stoplight/elements-core/utils/http-spec/IServer'
import { Box, Flex, Icon, Provider } from '@stoplight/mosaic'
import { IHttpOperation } from '@stoplight/types'
import { SchemaViewMode } from 'json-schema-viewer'
import { flow } from 'lodash'
import * as React from 'react'
import { useEffect, useMemo } from 'react'

import { APIWithOperation } from '../components/API/APIWithOperation'
import { useExportDocumentProps } from '../hooks/useExportDocumentProps'
import { transformOasToServiceNode } from '../utils/oas'

// import '@netcracker/qubership-apihub-api-doc-viewer/dist/style.css'

export type APIProps = APIPropsWithOperation;

export type APIPropsWithOperation = {
  /**
   * You can specify the input OAS2/3 document here directly in JSON or YAML format.
   *
   * Mutually exclusive with `apiDescriptionUrl`.
   */
  defaultSchemaDepth?: number;
  mergedDocument?: unknown;
} & CommonAPIProps;

export interface CommonAPIProps extends RoutingProps {
  /**
   * The API component supports two layout options.
   *
   * - Sidebar: Navigation on the left side, resembles Stoplight Platform.
   * - Stacked: No sidebar, resembles the structure of Swagger UI.
   *
   * @default "sidebar"
   */
  layout?: 'sidebar' | 'stacked' | 'partial';
  logo?: string;

  /**
   * Allows hiding the TryIt component
   */
  hideTryIt?: boolean;

  /**
   * Hides schemas from being displayed in Table of Contents
   */
  hideSchemas?: boolean;

  /**
   * Hides models and operations marked as internal
   * @default false
   */
  hideInternal?: boolean;

  /**
   * Hides export button from being displayed in overview page
   * @default false
   */
  hideExport?: boolean;

  /**
   * Fetch credentials policy for TryIt component
   * For more information: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
   * @default "omit"
   */

  noHeading?: boolean;

  tryItCredentialsPolicy?: 'omit' | 'include' | 'same-origin';

  /**
   * Url of a CORS proxy that will be used to send requests in TryIt.
   * Provided url will be prepended to a URL of an actual request.
   * @default false
   */
  tryItCorsProxy?: string;

  selectedNodeUri?: string;

  searchPhrase?: string;

  schemaViewMode?: SchemaViewMode;

  proxyServer?: IServer;

  hideExamples?: boolean;
}

export const OperationAPIImpl: React.FC<APIProps> = props => {
  useEffect(() => {
    console.debug('operation-viewer:ok');
  }, []);

  const {
    hideTryIt,
    hideSchemas,
    hideInternal,
    hideExport,
    noHeading = false,
    tryItCredentialsPolicy,
    tryItCorsProxy,
    searchPhrase,
    schemaViewMode,
    defaultSchemaDepth,
    proxyServer,
    hideExamples = false,
    mergedDocument,
  } = props;

  const operationNode = useMemo(() => {
    return transformOasToServiceNode(mergedDocument)?.children?.find(({ type }) => type === 'http_operation')
      ?.data as IHttpOperation | null
  }, [mergedDocument])

  const schemaOptions: OperationSchemaOptions = useMemo(
    () => ({
      schemaViewMode: schemaViewMode,
      defaultSchemaDepth: defaultSchemaDepth,
    }),
    [schemaViewMode, defaultSchemaDepth],
  )

  const exportProps = useExportDocumentProps({
    originalDocument: document,
    bundledDocument: mergedDocument,
  })

  if (mergedDocument === null) {
    return (
      <Flex justify="center" alignItems="center" w="full" minH="screen" color="light">
        <Box as={Icon} icon={['fal', 'circle-notch']} size="3x" spin/>
      </Flex>
    );
  }

  if (!operationNode) {
    return (
      <Flex justify="center" alignItems="center" w="full" minH="screen">
        <NonIdealState
          title="Failed to parse OpenAPI file"
          description="Please make sure your OpenAPI file is valid and try again"
        />
      </Flex>
    );
  }

  let apiWithOperationElement = (
    <APIWithOperation
      operation={operationNode}
      tryItCorsProxy={tryItCorsProxy}
      tryItCredentialsPolicy={tryItCredentialsPolicy}
      exportProps={exportProps}
      schemaViewMode={schemaViewMode}
      hideExport={hideExport}
      hideInternal={hideInternal}
      hideSchemas={hideSchemas}
      hideTryIt={hideTryIt}
      noHeading={noHeading}
      proxyServer={proxyServer}
      hideExamples={hideExamples}
    />
  );

  return (
    <InlineRefResolverProvider document={mergedDocument}>
      <SearchPhraseContext.Provider value={searchPhrase}>
        <OperationSchemaOptionsContext.Provider value={schemaOptions}>
          <OperationDisplayModeContext.Provider value={DEFAULT_DISPLAY_MODE}>
            <Provider>
              <Flex
                style={{isolation: 'isolate'}}
                justifyContent="between"
                color="muted"
                fontSize="base"
                pos="relative"
                pl={8}
                pr={8}
              >
                <Flex w="full" flexDirection="col" m="auto" className="sl-max-w-4xl">
                  <Box w="full" borderB>
                    {apiWithOperationElement}
                  </Box>
                </Flex>
              </Flex>
            </Provider>
          </OperationDisplayModeContext.Provider>
        </OperationSchemaOptionsContext.Provider>
      </SearchPhraseContext.Provider>
    </InlineRefResolverProvider>
  );
};

const SearchPhraseContext = React.createContext<string | undefined>(undefined);
SearchPhraseContext.displayName = 'SearchPhraseContext';

export const OperationAPI: React.FC<APIPropsWithOperation> = flow(
  withRouter,
  withStyles,
  withPersistenceBoundary,
  withMosaicProvider,
  withQueryClientProvider,
)(props => {
  const server = typeof props.proxyServer === 'string' ? JSON.parse(props.proxyServer) : props.proxyServer;
  return <OperationAPIImpl {...props} proxyServer={server} />;
});
