import { ISourceNodeMap, NodeTypes } from '../oas/types';

export const asyncApiSourceMap: ISourceNodeMap[] = [
  {
    match: 'channels',
    type: NodeTypes.Paths,
    children: [
      {
        notMatch: '^x-',
        type: NodeTypes.Path,
        children: [
          {
            match: 'publish|subscribe',
            type: NodeTypes.Operation,
          },
        ],
      },
    ],
  },

  {
    match: 'components',
    type: NodeTypes.Components,
    children: [
      {
        match: 'schemas',
        type: NodeTypes.Models,
        children: [
          {
            notMatch: '^x-',
            type: NodeTypes.Model,
          },
        ],
      },
      {
        match: 'parameters',
        type: NodeTypes.Models,
        children: [
          {
            notMatch: '^x-',
            type: NodeTypes.Model,
          },
        ],
      },
    ],
  },
];
