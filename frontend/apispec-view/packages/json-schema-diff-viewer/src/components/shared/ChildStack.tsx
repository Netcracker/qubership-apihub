import { SchemaNode } from '@stoplight/json-schema-tree';
import { Box, Button, Flex, SpaceVals } from '@stoplight/mosaic';
import { useAtomValue, useUpdateAtom } from 'jotai/utils';
import * as React from 'react';
import { useMemo } from 'react';

import { NESTING_OFFSET } from '../../consts';
import { useJSVOptionsContext } from '../../contexts';
import { SchemaRow, SchemaRowProps } from '../SchemaRow';
import { parentHasCollapsedRowsAtom, setCollapsedRowAtom } from '../SchemaRow/state';

type ChildStackProps = {
  schemaNode: SchemaNode;
  childNodes: readonly SchemaNode[];
  currentNestingLevel: number;
  className?: string;
  RowComponent?: React.FC<SchemaRowProps>;
};

export const ChildStack = React.memo(
  ({ childNodes, currentNestingLevel, className, RowComponent = SchemaRow }: ChildStackProps) => {
    const { renderRootTreeLines } = useJSVOptionsContext();
    const rootLevel = renderRootTreeLines ? 0 : 1;
    const isRootLevel = currentNestingLevel < rootLevel;

    let ml: SpaceVals | undefined;
    if (!isRootLevel) {
      ml = currentNestingLevel === rootLevel ? 'px' : 7;
    }

    const childrenIds = useMemo(() => childNodes.map(({ path }) => path.join('/')), [childNodes]);
    const setRowCollapsed = useUpdateAtom(setCollapsedRowAtom);
    const isParentCollapsed = useAtomValue(parentHasCollapsedRowsAtom(childrenIds));

    return (
      <Box
        className={className}
        ml={ml}
        fontSize="sm"
        borderL={isRootLevel ? undefined : true}
        data-level={currentNestingLevel}
      >
        {childNodes.map((childNode: SchemaNode) => (
          <RowComponent
            key={childNode.id}
            schemaNode={childNode}
            nestingLevel={currentNestingLevel + 1}
            pl={isRootLevel ? undefined : NESTING_OFFSET}
          />
        ))}
        {isParentCollapsed ? (
          <Flex>
            {!isRootLevel && <Box borderT w={3} mr={3} mt={2} />}
            <Button
              className="sl-flex-1 sl-block"
              appearance="minimal"
              size="sm"
              onPress={() => childNodes.forEach(({ path }) => setRowCollapsed(path.join('/')))}
            >
              ...
            </Button>
          </Flex>
        ) : null}
      </Box>
    );
  },
);
