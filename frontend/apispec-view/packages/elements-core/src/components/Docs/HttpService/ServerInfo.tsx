import { Box, InvertTheme, Panel, Text, VStack } from '@stoplight/mosaic';
import * as React from 'react';

import { MockingContext } from '../../../containers/MockingProvider';
import { isProperUrl } from '../../../utils/guards';
import { getServersToDisplay, IServer } from '../../../utils/http-spec/IServer';

interface ServerInfoProps {
  servers: IServer[];
  mockUrl?: string;
}

export const ServerInfo: React.FC<ServerInfoProps> = ({ servers, mockUrl }) => {
  const mocking = React.useContext(MockingContext);
  const showMocking = !mocking.hideMocking && mockUrl && isProperUrl(mockUrl);
  const $mockUrl = showMocking ? mockUrl || mocking.mockUrl : undefined;

  const serversToDisplay = getServersToDisplay(servers, $mockUrl);

  if (!showMocking && serversToDisplay.length === 0) {
    return null;
  }

  return (
    <InvertTheme>
      <Panel rounded isCollapsible={false} className="BaseURLContent" w="full">
        <Panel.Titlebar whitespace="nowrap">API Base URL</Panel.Titlebar>
        <Box overflowX="auto">
          <Panel.Content w="full" className="sl-flex sl-flex-col">
            <VStack spacing={1} divider>
              {serversToDisplay.map((server, index) => (
                <ServerUrl {...server} key={index} />
              ))}
            </VStack>
          </Panel.Content>
        </Box>
      </Panel>
    </InvertTheme>
  );
};

const ServerUrl = ({ description, url, marginBottom = true }: IServer & { marginBottom?: boolean }) => {
  return (
    <Box whitespace="nowrap">
      <Text pr={2} fontWeight="bold">
        {description}:
      </Text>
      <Text aria-label={description}>{url}</Text>
    </Box>
  );
};
