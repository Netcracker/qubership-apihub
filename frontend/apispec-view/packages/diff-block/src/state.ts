import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { max } from 'lodash';

import { DiffSide } from './DiffContext';

export const diffBlockHeight = atomFamily((_id: string) => {
  const beforeHeight = atom(0);
  const afterHeight = atom(0);
  return atom<number, [DiffSide, number], void>(
    get => max([get(beforeHeight), get(afterHeight)]) ?? 0,
    (get, set, [side, newHeight]) => {
      if (side === 'after') {
        set(afterHeight, newHeight);
      } else {
        set(beforeHeight, newHeight);
      }
    },
  );
});

export const diffBlockTop = atomFamily((_id: string) => atom(0));
