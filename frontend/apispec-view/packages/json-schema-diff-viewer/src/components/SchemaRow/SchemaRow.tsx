import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { Diff } from '@netcracker/qubership-apihub-api-diff';
import { useExtensionsWithDiff } from '@stoplight/elements';
import { isReferenceNode, isRegularNode, ReferenceNode, SchemaNode, SchemaNodeKind } from '@stoplight/json-schema-tree';
import { Box, Flex, Icon, SpaceVals, VStack } from '@stoplight/mosaic';
import { childrenDiffCountMetaKey, DiffBlock } from 'diff-block';
import { useAtom } from 'jotai';
import { useAtomValue, useUpdateAtom } from 'jotai/utils';
import { entries, get, includes, isEmpty } from 'lodash';
import * as React from 'react';
import { useEffect, useMemo } from 'react';

import { useJSVOptionsContext } from '../../contexts';
import { calculateChildrenToShow, isFlattenableNode } from '../../tree';
import { Description, Validations } from '../shared';
import { ChildStack } from '../shared/ChildStack';
import { SchemaNameAndProperties } from '../shared/SchemaNameAndProperties';
import { SchemaRowDiffBlock } from './SchemaRowDiffBlock';
import { hoveredNodeAtom, isExpandedAtom, rowCollapsedAtom, selectedChoiceAtom } from './state';
import { useDiffMetaKey } from "@stoplight/elements/containers/DIffMetaKeyContext";
import { useChangeSeverityFilters } from "@stoplight/elements/containers/ChangeSeverityFiltersContext";

export interface SchemaRowProps {
  schemaNode: SchemaNode;
  nestingLevel: number;
  pl?: SpaceVals;
}

export const SchemaRow: React.FunctionComponent<SchemaRowProps> = React.memo(({ schemaNode, nestingLevel, pl }) => {
  const diffMetaKey = useDiffMetaKey()
  const filters = useChangeSeverityFilters();

  const parentDiff = schemaNode.parent?.[diffMetaKey];
  const rowDiff: Diff | undefined = get(parentDiff, schemaNode.subpath);
  const rowDiffCause = ''

  const childrenDiffCount = schemaNode[childrenDiffCountMetaKey];

  const schemaNodeId = useMemo(() => schemaNode.path.join('/'), [schemaNode.path]);
  const [collapsed, setCollapsed] = useAtom(rowCollapsedAtom(schemaNodeId));

  useEffect(() => {
    const filtered = filters?.length
      ? !filters.some(value => childrenDiffCount[value]) && !includes(filters, rowDiff?.type)
      : false;
    setCollapsed(filtered);
  }, [childrenDiffCount, filters, rowDiff?.type, setCollapsed]);

  if (collapsed) {
    return null;
  }

  return (
    <DiffBlock
      id={schemaNodeId}
      type={rowDiff?.type}
      action={rowDiff?.action}
      cause={rowDiffCause}
    >
      <SchemaRowInner schemaNode={schemaNode} nestingLevel={nestingLevel} pl={pl} />
    </DiffBlock>
  );
});

const SchemaRowInner: React.FunctionComponent<SchemaRowProps> = React.memo(({ schemaNode, nestingLevel, pl }) => {
  const diffMetaKey = useDiffMetaKey()

  const { defaultExpandedDepth, renderRowAddon, hideExamples, renderRootTreeLines } = useJSVOptionsContext();

  const [extensions, extensionsMeta] = useExtensionsWithDiff(schemaNode.fragment, 1);

  const setHoveredNode = useUpdateAtom(hoveredNodeAtom);

  const isExpanded = useAtomValue(
    isExpandedAtom({
      schemaNode,
      nestingLevel,
      defaultExpandedDepth,
    }),
  );

  const selectedChoice = useAtomValue(selectedChoiceAtom(schemaNode));

  const typeToShow = selectedChoice.type;

  const typeToShowParentDiff = typeToShow.parent?.[diffMetaKey];
  const typeToShowDiff: Diff | undefined = get(typeToShowParentDiff, typeToShow.subpath);
  const typeToShowDiffCause = ''

  const refNode = React.useMemo<ReferenceNode | null>(() => {
    if (isReferenceNode(schemaNode)) {
      return schemaNode;
    }

    if (
      isRegularNode(schemaNode) &&
      (isFlattenableNode(schemaNode) ||
        (schemaNode.primaryType === SchemaNodeKind.Array && schemaNode.children?.length === 1))
    ) {
      return (schemaNode.children?.find(isReferenceNode) as ReferenceNode | undefined) ?? null;
    }

    return null;
  }, [schemaNode]);

  const isBrokenRef = typeof refNode?.error === 'string';

  const rootLevel = renderRootTreeLines ? 1 : 2;
  const childNodes = React.useMemo(() => calculateChildrenToShow(typeToShow), [typeToShow]);
  const isCollapsible = childNodes.length > 0;
  const isRootLevel = nestingLevel < rootLevel;

  return (
    <>
      <Flex
        maxW="full"
        pl={pl}
        py={2}
        onMouseEnter={(e: any) => {
          e.stopPropagation();
          setHoveredNode(selectedChoice.type);
        }}
      >
        {!isRootLevel && <Box borderT w={isCollapsible ? 1 : 3} ml={-3} mr={3} mt={2} />}

        <VStack spacing={1} maxW="full" flex={1} ml={isCollapsible && !isRootLevel ? 2 : undefined}>
          <SchemaNameAndProperties schemaNode={schemaNode} nestingLevel={nestingLevel} />
          <Description schemaNode={typeToShow} />
          {extensions &&
            !isEmpty(extensions) &&
            extensions
              .flatMap(extension => entries(extension))
              .map((value, index) => (
                <SchemaRowDiffBlock key={`${value[0]}-${index}`} value={value} meta={extensionsMeta} />
              ))}
          <Validations schemaNode={typeToShow} hideExamples={hideExamples} />
          {
            // @ts-ignore
            isBrokenRef && <Icon title={refNode!.error!} color="danger" icon={faExclamationTriangle} size="sm" />
          }
        </VStack>

        {renderRowAddon ? <Box>{renderRowAddon({ schemaNode, nestingLevel })}</Box> : null}
      </Flex>

      {isCollapsible && isExpanded ? (
        <DiffBlock
          id={schemaNode.path.join('/') + 'ΘchildStack'}
          type={typeToShowDiff?.type}
          action={typeToShowDiff?.action}
          cause={typeToShowDiffCause}
        >
          <ChildStack schemaNode={schemaNode} childNodes={childNodes} currentNestingLevel={nestingLevel} />
        </DiffBlock>
      ) : null}
    </>
  );
});
