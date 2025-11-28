import {
  InlineRefResolverProvider,
  NonIdealState,
  RoutingProps,
  SearchPhraseContext,
  useBundleRefsIntoDocument,
  useParsedValue,
  withMosaicProvider,
  withPersistenceBoundary,
  withQueryClientProvider,
  withRouter,
  withStyles,
} from '@stoplight/elements-core';
import { IServer } from '@stoplight/elements-core/utils/http-spec/IServer';
import { Box, Flex, Icon } from '@stoplight/mosaic';
import { SchemaViewMode } from 'json-schema-viewer';
import { flow } from 'lodash';
import * as React from 'react';
import { useMemo } from 'react';
import { useQuery } from 'react-query';

import { APIWithPartialLayout } from '../components/API/APIWithPartialLayout';
import { APIWithSidebarLayout } from '../components/API/APIWithSidebarLayout';
import { APIWithStackedLayout } from '../components/API/APIWithStackedLayout';
import { useExportDocumentProps } from '../hooks/useExportDocumentProps';
import { isAsyncApi, transformAsyncApiToServiceNode } from '../utils/asyncapi';
import { transformOasToServiceNode } from '../utils/oas';
import {
  OperationSchemaOptions,
  OperationSchemaOptionsContext,
} from '@stoplight/elements/containers/OperationSchemaOptionsContext';

export type APIProps = APIPropsWithDocument | APIPropsWithUrl;

export type APIPropsWithUrl = {
  /**
   * Specify the URL of the input OAS2/3 document here.
   *
   * Mutually exclusive with `apiDescriptionDocument`.
   */
  apiDescriptionUrl: string;
} & CommonAPIProps;
export type APIPropsWithDocument = {
  /**
   * You can specify the input OAS2/3 document here directly in JSON or YAML format.
   *
   * Mutually exclusive with `apiDescriptionUrl`.
   */
  apiDescriptionDocument: string | object;
  apiDescriptionUrl?: string;
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

  tryItCredentialsPolicy?: 'omit' | 'include' | 'same-origin';

  /**
   * Url of a CORS proxy that will be used to send requests in TryIt.
   * Provided url will be prepended to an URL of an actual request.
   * @default false
   */
  tryItCorsProxy?: string;

  selectedNodeUri?: string;

  searchPhrase?: string;

  schemaViewMode?: SchemaViewMode;

  proxyServer?: IServer;
}

const propsAreWithDocument = (props: APIProps): props is APIPropsWithDocument => {
  return props.hasOwnProperty('apiDescriptionDocument');
};

export const APIImpl: React.FC<APIProps> = props => {
  const {
    layout,
    apiDescriptionUrl = '',
    logo,
    hideTryIt,
    hideSchemas,
    hideInternal,
    hideExport,
    tryItCredentialsPolicy,
    tryItCorsProxy,
    selectedNodeUri,
    searchPhrase,
    schemaViewMode,
    proxyServer,
  } = props;
  const apiDescriptionDocument = propsAreWithDocument(props) ? props.apiDescriptionDocument : undefined;

  const { data: fetchedDocument, error } = useQuery(
    [apiDescriptionUrl],
    () =>
      fetch(apiDescriptionUrl).then(res => {
        if (res.ok) {
          return res.text();
        }
        throw new Error(`Unable to load description document, status code: ${res.status}`);
      }),
    {
      enabled: apiDescriptionUrl !== '' && !apiDescriptionDocument,
    },
  );

  const document = apiDescriptionDocument || fetchedDocument || '';
  const parsedDocument = useParsedValue(document);
  const bundledDocument = useBundleRefsIntoDocument(parsedDocument, { baseUrl: apiDescriptionUrl });
  const serviceNode = React.useMemo(() => {
    if (isAsyncApi(bundledDocument)) {
      return transformAsyncApiToServiceNode(bundledDocument);
    }

    return transformOasToServiceNode(bundledDocument);
  }, [bundledDocument]);
  const exportProps = useExportDocumentProps({ originalDocument: document, bundledDocument });

  const schemaOptions: OperationSchemaOptions = useMemo(
    () => ({
      schemaViewMode: schemaViewMode,
      defaultSchemaDepth: undefined,
      oldRenderer: true,
    }),
    [schemaViewMode],
  );

  if (error) {
    return (
      <Flex justify="center" alignItems="center" w="full" minH="screen">
        <NonIdealState
          title="Document could not be loaded"
          description="The API description document could not be fetched. This could indicate connectivity problems, or issues with the server hosting the spec."
          icon="exclamation-triangle"
        />
      </Flex>
    );
  }

  if (!bundledDocument) {
    return (
      <Flex justify="center" alignItems="center" w="full" minH="screen" color="light">
        <Box as={Icon} icon={['fal', 'circle-notch']} size="3x" spin />
      </Flex>
    );
  }

  if (!serviceNode) {
    return (
      <Flex justify="center" alignItems="center" w="full" minH="screen">
        <NonIdealState
          title="Failed to parse OpenAPI file"
          description="Please make sure your OpenAPI file is valid and try again"
        />
      </Flex>
    );
  }

  return (
    <InlineRefResolverProvider document={parsedDocument}>
      <SearchPhraseContext.Provider value={searchPhrase}>
        <OperationSchemaOptionsContext.Provider value={schemaOptions}>
          {layout === 'stacked' ? (
            <APIWithStackedLayout
              serviceNode={serviceNode}
              hideTryIt={hideTryIt}
              hideExport={hideExport}
              exportProps={exportProps}
              tryItCredentialsPolicy={tryItCredentialsPolicy}
              tryItCorsProxy={tryItCorsProxy}
            />
          ) : layout === 'partial' ? (
            <APIWithPartialLayout
              serviceNode={serviceNode}
              hideTryIt={hideTryIt}
              hideSchemas={hideSchemas}
              hideInternal={hideInternal}
              hideExport={hideExport}
              exportProps={exportProps}
              tryItCredentialsPolicy={tryItCredentialsPolicy}
              tryItCorsProxy={tryItCorsProxy}
              selectedNodeUri={selectedNodeUri}
              router={props.router}
            />
          ) : (
            <APIWithSidebarLayout
              logo={logo}
              serviceNode={serviceNode}
              hideTryIt={hideTryIt}
              hideSchemas={hideSchemas}
              hideInternal={hideInternal}
              hideExport={hideExport}
              exportProps={exportProps}
              tryItCredentialsPolicy={tryItCredentialsPolicy}
              tryItCorsProxy={tryItCorsProxy}
              router={props.router}
              proxyServer={proxyServer}
            />
          )}
        </OperationSchemaOptionsContext.Provider>
      </SearchPhraseContext.Provider>
    </InlineRefResolverProvider>
  );
};

export const API: React.FC<APIPropsWithDocument> = flow(
  withRouter,
  withStyles,
  withPersistenceBoundary,
  withMosaicProvider,
  withQueryClientProvider,
)(props => {
  const server = typeof props.proxyServer === 'string' ? JSON.parse(props.proxyServer) : props.proxyServer;
  return <APIImpl {...props} proxyServer={server} />;
});
