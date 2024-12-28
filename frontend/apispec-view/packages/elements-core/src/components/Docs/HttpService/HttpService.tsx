import { useSearchPhrase } from '@stoplight/elements/containers/API';
import { useServiceExtensions } from '@stoplight/elements/hooks/useExtensions';
import { Extensions } from '@stoplight/elements-core/components/Docs/Extensions';
import { SectionSubtitle } from '@stoplight/elements-core/components/Docs/Sections';
import { Box, Flex, Heading, VStack } from '@stoplight/mosaic';
import { withErrorBoundary } from '@stoplight/react-error-boundary';
import { IHttpService } from '@stoplight/types';
import { isEmpty } from 'lodash';
import { nanoid } from 'nanoid';
import * as React from 'react';
import { Marker } from 'react-mark.js';

import { MockingContext } from '../../../containers/MockingProvider';
import { MarkdownViewer } from '../../MarkdownViewer';
import { PoweredByLink } from '../../PoweredByLink';
import { DocsComponentProps } from '..';
import { VersionBadge } from '../HttpOperation/Badges';
import { AdditionalInfo } from './AdditionalInfo';
import { ExportButton } from './ExportButton';
import { SecuritySchemes } from './SecuritySchemes';
import { ServerInfo } from './ServerInfo';
import { defaultErrorHandler } from "../../../../../system";

export type HttpServiceProps = DocsComponentProps<Partial<IHttpService>>;

const HttpServiceComponent = React.memo<HttpServiceProps>(({ data, location = {}, layoutOptions, exportProps }) => {
  const { search, pathname } = location;
  const mocking = React.useContext(MockingContext);
  const extensions = useServiceExtensions();
  const query = new URLSearchParams(search);
  const searchPhrase = useSearchPhrase();
  return (
    <Box mb={10}>
      <Marker mark={searchPhrase}>
        {data.name && !layoutOptions?.noHeading && (
          <Flex justifyContent="between" alignItems="center">
            <Heading size={1} mb={4} fontWeight="semibold">
              {data.name}
            </Heading>
            {exportProps && !layoutOptions?.hideExport && <ExportButton {...exportProps} />}
          </Flex>
        )}
        {data.version && (
          <Box mb={5}>
            <VersionBadge value={data.version} />
          </Box>
        )}
        {pathname && layoutOptions?.showPoweredByLink && (
          <PoweredByLink source={data.name ?? 'no-title'} pathname={pathname} packageType="elements" layout="stacked" />
        )}
        <VStack spacing={6}>
          <ServerInfo servers={data.servers ?? []} mockUrl={mocking.mockUrl} />
          <Box>
            {data.securitySchemes?.length && (
              <SecuritySchemes schemes={data.securitySchemes} defaultScheme={query.get('security') || undefined} />
            )}
          </Box>
          <Box>
            {(data.contact?.email || data.license || data.termsOfService) && (
              <AdditionalInfo contact={data.contact} license={data.license} termsOfService={data.termsOfService} />
            )}
            {!isEmpty(extensions) && <SectionSubtitle title="Custom properties" id="operation-extensions" />}
            {!isEmpty(extensions) && extensions.map(extension => <Extensions key={nanoid(8)} value={extension} />)}
          </Box>
        </VStack>
        {data.description && <MarkdownViewer className="sl-my-5" markdown={data.description} />}
      </Marker>
    </Box>
  );
});
HttpServiceComponent.displayName = 'HttpService.Component';

export const HttpService = withErrorBoundary<HttpServiceProps>(
  HttpServiceComponent,
  {
    recoverableProps: ['data'],
    onError: defaultErrorHandler,
  }
);
