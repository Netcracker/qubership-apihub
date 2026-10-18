import { NativeMenuAdapter } from '@stoplight/diff-elements-core/hoc/NativeMenuAdapter';
import { MenuItem } from '@stoplight/mosaic';
import { useAtom } from 'jotai';
import * as React from 'react';
import { useCallback } from 'react';

import type { IServer } from '../../../utils/http-spec/IServer';
import { chosenServerAtom } from '../chosenServer';

export type ServersDropdownProps = {
  servers: IServer[];
};

export const ServersDropdown = ({ servers }: ServersDropdownProps) => {
  const [chosenServer, setChosenServer] = useAtom(chosenServerAtom);

  const serverItems: MenuItem[] = servers.map(server => ({
    id: server.url,
    title: server.name || server.description,
  })) as MenuItem[];

  const onChange = useCallback(
    event => {
      const server = servers.find(server => server.url === event.target.value);
      setChosenServer(server);
      event.target.value = 'default';
    },
    [servers, setChosenServer],
  );

  return (
    <NativeMenuAdapter
      title={`${chosenServer?.name} ${chosenServer?.description}`}
      menuItems={serverItems}
      onChange={onChange}
      backgroundColor="var(--color-canvas-100)"
    />
  );
};

ServersDropdown.displayName = 'ServersDropdown';
