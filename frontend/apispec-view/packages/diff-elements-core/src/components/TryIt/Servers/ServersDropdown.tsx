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

  // Server urls are not guaranteed to be unique, so the position identifies the item.
  const serverItems: MenuItem[] = servers.map((server, index) => ({
    id: String(index),
    title: server.name || server.description,
  })) as MenuItem[];

  const onChange = useCallback(
    event => {
      const index = Number.parseInt(event.target.value, 10);
      const server = Number.isInteger(index) ? servers[index] : undefined;
      if (server !== undefined) {
        setChosenServer(server);
      }
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
