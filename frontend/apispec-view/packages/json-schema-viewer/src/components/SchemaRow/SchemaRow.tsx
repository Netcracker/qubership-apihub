import { safeStringify } from '@stoplight/json';
import {
  isMirroredNode,
  isReferenceNode,
  isRegularNode,
  ReferenceNode,
  SchemaNode,
  SchemaNodeKind,
} from '@stoplight/json-schema-tree';
import { MarkdownViewer } from '@stoplight/markdown-viewer';
import { Box, Flex, Icon, NodeAnnotation, SpaceVals, VStack } from '@stoplight/mosaic';
import { CodeViewer } from '@stoplight/mosaic-code-viewer';
import type { ChangeType } from '@stoplight/types';
import { Atom } from 'jotai';
import { useAtomValue, useUpdateAtom } from 'jotai/utils';
import { entries, isEmpty, last } from 'lodash';
import * as React from 'react';

import { COMBINER_NAME_MAP } from '../../consts';
import { useJSVOptionsContext } from '../../contexts';
import { getNodeId, getOriginalNodeId } from '../../hash';
import { useExtensions } from '../../hooks/useExtensions';
import { calculateChildrenToShow, isFlattenableNode, isPropertyRequired } from '../../tree';
import { Caret, Description, getInternalSchemaError, getValidationsFromSchema, Types, Validations } from '../shared';
import { ChildStack } from '../shared/ChildStack';
import { Properties, useHasProperties } from '../shared/Properties';
import { hoveredNodeAtom, isNodeHoveredAtom } from './state';
import { useChoices } from './useChoices';

export interface SchemaRowProps {
  schemaNode: SchemaNode;
  nestingLevel: number;
  pl?: SpaceVals;
  parentNodeId?: string;
  parentChangeType?: ChangeType;
}

export const SchemaRow: React.FunctionComponent<SchemaRowProps> = React.memo(
  ({ schemaNode, nestingLevel, pl, parentNodeId, parentChangeType }) => {
    const {
      defaultExpandedDepth,
      renderRowAddon,
      onGoToRef,
      hideExamples,
      renderRootTreeLines,
      nodeHasChanged,
      viewMode,
      schemaViewMode,
    } = useJSVOptionsContext();
    const extensions = useExtensions(schemaNode.fragment);

    const setHoveredNode = useUpdateAtom(hoveredNodeAtom);

    const nodeId = getNodeId(schemaNode, parentNodeId);

    // @ts-expect-error originalFragment does exist...
    const originalNodeId = schemaNode.originalFragment?.$ref ? getOriginalNodeId(schemaNode, parentNodeId) : nodeId;
    const mode = viewMode === 'standalone' ? undefined : viewMode;
    const hasChanged = nodeHasChanged?.({ nodeId: originalNodeId, mode });

    const [isExpanded, setExpanded] = React.useState<boolean>(
      !isMirroredNode(schemaNode) && nestingLevel <= defaultExpandedDepth,
    );

    const { selectedChoice, setSelectedChoice, choices } = useChoices(schemaNode);
    const typeToShow = selectedChoice.type;
    const description = isRegularNode(typeToShow) ? typeToShow.annotations.description : null;

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
    const combiner = isRegularNode(schemaNode) && schemaNode.combiners?.length ? schemaNode.combiners[0] : null;
    const isCollapsible = childNodes.length > 0;
    const isRootLevel = nestingLevel < rootLevel;

    const required = isPropertyRequired(schemaNode);
    const deprecated = isRegularNode(schemaNode) && schemaNode.deprecated;
    const validations = isRegularNode(schemaNode) ? schemaNode.validations : {};
    const hasProperties = useHasProperties({ required, deprecated, validations });

    const internalSchemaError = getInternalSchemaError(schemaNode);

    const annotationRootOffset = renderRootTreeLines ? 0 : 8;
    let annotationLeftOffset = -20 - annotationRootOffset;
    if (nestingLevel > 1) {
      // annotationLeftOffset -= 27;
      annotationLeftOffset =
        -1 * 29 * Math.max(nestingLevel - 1, 1) - Math.min(nestingLevel, 2) * 2 - 16 - annotationRootOffset;

      if (!renderRootTreeLines) {
        annotationLeftOffset += 27;
      }
    }

    if (parentChangeType === 'added' && hasChanged && hasChanged.type === 'removed') {
      return null;
    }

    if (parentChangeType === 'removed' && hasChanged && hasChanged.type === 'added') {
      return null;
    }

    return (
      <>
        <Flex
          maxW="full"
          pl={pl}
          py={2}
          data-id={originalNodeId}
          pos="relative"
          onMouseEnter={(e: any) => {
            e.stopPropagation();
            setHoveredNode(selectedChoice.type);
          }}
        >
          {!isRootLevel && <Box borderT w={isCollapsible ? 1 : 3} ml={-3} mr={3} mt={2} />}

          {parentChangeType !== 'added' && parentChangeType !== 'removed' ? (
            <NodeAnnotation change={hasChanged} style={{ left: annotationLeftOffset }} />
          ) : null}

          <VStack spacing={1} maxW="full" flex={1} ml={isCollapsible && !isRootLevel ? 2 : undefined}>
            <Flex
              alignItems="center"
              maxW="full"
              onClick={isCollapsible ? () => setExpanded(!isExpanded) : undefined}
              cursor={isCollapsible ? 'pointer' : undefined}
            >
              {isCollapsible ? <Caret isExpanded={isExpanded} /> : null}

              <Flex alignItems="baseline" fontSize="base">
                {schemaNode.subpath.length > 0 && shouldShowPropertyName(schemaNode) && (
                  <Box mr={2} fontFamily="mono" fontWeight="semibold">
                    {last(schemaNode.subpath)}
                  </Box>
                )}

                {choices.length === 1 && <Types schemaNode={typeToShow} />}

                {onGoToRef && isReferenceNode(schemaNode) && schemaNode.external ? (
                  <Box
                    as="a"
                    ml={2}
                    cursor="pointer"
                    color="primary-light"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onGoToRef(schemaNode);
                    }}
                  >
                    (go to ref)
                  </Box>
                ) : null}

                {schemaNode.subpath.length > 1 && schemaNode.subpath[0] === 'patternProperties' ? (
                  <Box ml={2} color="muted">
                    (pattern property)
                  </Box>
                ) : null}

                {choices.length > 1 && (
                  <select
                    aria-label="Pick a type"
                    value={
                      String(choices.indexOf(selectedChoice))
                      /* String to work around https://github.com/stoplightio/mosaic/issues/162 */
                    }
                    onChange={event => setSelectedChoice(choices[event.target.value])}
                    className="sl-menu-adapter"
                  >
                    {choices.map((choice, index) => (
                      <option key={index} value={index}>
                        {combiner ? `${COMBINER_NAME_MAP[combiner]}: ` : null}
                        {choice.title}
                      </option>
                    ))}
                  </select>
                )}
              </Flex>

              {hasProperties && <Divider atom={isNodeHoveredAtom(schemaNode)} />}

              <Properties required={required} deprecated={deprecated} validations={validations} />
            </Flex>

            {schemaViewMode !== 'simple' && typeof description === 'string' && description.length > 0 && (
              <Description value={description} />
            )}

            {schemaViewMode !== 'simple' &&
              extensions &&
              !isEmpty(extensions) &&
              extensions
                .flatMap(extension => entries(extension))
                .map(([key, value]) => {
                  const isObject = typeof value === 'object';
                  const isString = typeof value === 'string';
                  return (
                    <Box key={key}>
                      <MarkdownViewer markdown={`*${key}*: ${isString ? value : ''}`} />
                      {isObject && <CodeViewer value={safeStringify(value, undefined, 2) ?? ''} language="json" />}
                    </Box>
                  );
                })}

            {schemaViewMode !== 'simple' && (
              <Validations
                validations={isRegularNode(schemaNode) ? getValidationsFromSchema(schemaNode) : {}}
                hideExamples={hideExamples}
              />
            )}

            {(isBrokenRef || internalSchemaError.hasError) && (
              <Icon
                title={refNode?.error! || internalSchemaError.error}
                color="danger"
                icon={['fas', 'exclamation-triangle']}
                size="sm"
              />
            )}
          </VStack>

          {schemaViewMode !== 'simple' && renderRowAddon ? (
            <Box>{renderRowAddon({ schemaNode, nestingLevel })}</Box>
          ) : null}
        </Flex>

        {isCollapsible && isExpanded ? (
          <ChildStack
            schemaNode={schemaNode}
            childNodes={childNodes}
            currentNestingLevel={nestingLevel}
            parentNodeId={nodeId}
            parentChangeType={parentChangeType ? parentChangeType : hasChanged ? hasChanged?.type : undefined}
          />
        ) : null}
      </>
    );
  },
);

const Divider = ({ atom }: { atom: Atom<boolean> }) => {
  const isHovering = useAtomValue(atom);

  return <Box bg={isHovering ? 'canvas-200' : undefined} h="px" flex={1} mx={3} />;
};

function shouldShowPropertyName(schemaNode: SchemaNode) {
  return (
    schemaNode.subpath.length === 2 &&
    (schemaNode.subpath[0] === 'properties' || schemaNode.subpath[0] === 'patternProperties')
  );
}
