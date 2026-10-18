import { Diff, DiffMetaRecord, DiffReplace, DiffType } from '@netcracker/qubership-apihub-api-diff';
import { isReferenceNode, isRegularNode, SchemaNode } from '@stoplight/json-schema-tree';
import { Box, Flex } from '@stoplight/mosaic';
import {
  childrenDiffCountMetaKey,
  combineDiffMetas,
  DIFF_BUDGES_COLOR_MAP,
  DIFF_TYPES,
  DiffBlock,
  useDiffContext,
  useValueFromObjWithDiff,
} from 'diff-block';
import { useAtom } from 'jotai';
import { useAtomValue } from 'jotai/utils';
import { isEmpty, keys, last, pick } from 'lodash';
import * as React from 'react';

import { COMBINER_NAME_MAP } from '../../consts';
import { useJSVOptionsContext } from '../../contexts';
import { calculateChildrenToShow, isPropertyRequired, isPropertyWasRequired } from '../../tree';
import { choicesAtom, isExpandedAtom, isNodeHoveredAtom, selectedChoiceAtom } from '../SchemaRow/state';
import { Caret } from './Caret';
import { Format } from './Format';
import { Types } from './Types';
import { useDiffMetaKey } from "@stoplight/elements/containers/DIffMetaKeyContext";
import { useChangeSeverityFilters } from "@stoplight/elements/containers/ChangeSeverityFiltersContext";

export const SchemaNameAndProperties: React.FC<{ schemaNode: SchemaNode; nestingLevel: number }> = ({
  schemaNode,
  nestingLevel,
}) => {
  const diffMetaKey = useDiffMetaKey()

  const filters = useChangeSeverityFilters()
  const { side } = useDiffContext();

  const { defaultExpandedDepth, onGoToRef } = useJSVOptionsContext();

  const [isExpanded, setExpanded] = useAtom(isExpandedAtom({ schemaNode, nestingLevel, defaultExpandedDepth }));

  const choices = useAtomValue(choicesAtom(schemaNode));
  const [selectedChoice, setSelectedChoice] = useAtom(selectedChoiceAtom(schemaNode));

  const typeToShow = selectedChoice.type;

  const childNodes = React.useMemo(() => calculateChildrenToShow(typeToShow), [typeToShow]);
  const diffCounts = schemaNode[childrenDiffCountMetaKey];
  const combiner = isRegularNode(schemaNode) && schemaNode.combiners?.length ? schemaNode.combiners[0] : null;
  const isCollapsible = childNodes.length > 0;

  const combinedDiffMeta = calculateCombinedDiffMeta(schemaNode, diffMetaKey);

  const typeAnyWasChanged = keys(schemaNode[diffMetaKey]).some(key => ['allOf', 'anyOf', 'oneOf'].includes(key));
  const typeWasChanged = keys(schemaNode[diffMetaKey]).some(key => ['type'].includes(key));
  const formatWasChanged = keys(schemaNode[diffMetaKey]).some(key => ['format'].includes(key));
  const propertyName = useValueFromObjWithDiff(schemaNode, 'name') as string;

  // TODO 30.07.24 // Remove redundant deprecated JSV
  return (
    <DiffBlock
      id={schemaNode.path.join('/') + 'ΘnameAndProps'}
      type={combinedDiffMeta?.type}
      action={combinedDiffMeta?.action}
      cause={undefined}
    >
      <Flex
        alignItems="center"
        maxW="full"
        onClick={isCollapsible ? () => setExpanded(!isExpanded) : undefined}
        cursor={isCollapsible ? 'pointer' : undefined}
      >
        {isCollapsible ? <Caret isExpanded={isExpanded} /> : null}

        <Flex alignItems="center" fontSize="base">
          {schemaNode.subpath.length > 0 && shouldShowPropertyName(schemaNode) && (
            <Box mr={2} fontFamily="mono" fontWeight="semibold">
              {propertyName ?? last(schemaNode.subpath)}
            </Box>
          )}
          {choices.length === 1 && (
            <Box
              style={
                side === 'before' && typeAnyWasChanged
                  ? { textDecoration: 'line-through', display: 'flex' }
                  : { display: 'flex' }
              }
            >
              <Box style={side === 'before' && typeWasChanged ? { textDecoration: 'line-through' } : {}}>
                <Types schemaNode={typeToShow} />
              </Box>
              <Box style={side === 'before' && formatWasChanged ? { textDecoration: 'line-through' } : {}}>
                <Format schemaNode={typeToShow} />
              </Box>
            </Box>
          )}

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
              value={String(choices.indexOf(selectedChoice))}
              onChange={e => setSelectedChoice(choices[e.target.value])}
              className="sl-menu-adapter"
            >
              {choices.map((content, index) => (
                <option key={index} value={index}>
                  {`${combiner ? `${COMBINER_NAME_MAP[combiner]}: ` : undefined} ${content.title}`}
                </option>
              ))}
            </select>
          )}
          {isCollapsible && !isExpanded && !isEmpty(diffCounts) && (
            <Flex>
              {DIFF_TYPES.filter(
                diffType => (!isEmpty(filters) ? filters?.includes(diffType) : true) && !!diffCounts[diffType],
              ).map(diffKey => (
                <div
                  key={diffKey}
                  style={{
                    backgroundColor: DIFF_BUDGES_COLOR_MAP[diffKey],
                    borderRadius: '50%',
                    width: '12px',
                    height: '12px',
                    marginLeft: '8px',
                  }}
                />
              ))}
            </Flex>
          )}
        </Flex>

        <HoverLineAndProperties schemaNode={schemaNode} />
      </Flex>
    </DiffBlock>
  );
};

const HoverLineAndProperties: React.FC<{ schemaNode: SchemaNode }> = ({ schemaNode }) => {
  const diffMetaKey = useDiffMetaKey()

  const { viewMode } = useJSVOptionsContext();
  const { side } = useDiffContext();

  const isHovering = useAtomValue(isNodeHoveredAtom(schemaNode));

  const diffMeta = schemaNode[diffMetaKey];

  const required = isPropertyRequired(schemaNode, diffMetaKey);
  const wasRequired = isPropertyWasRequired(schemaNode, diffMetaKey);
  const viewRequired = side === 'before' ? wasRequired : required;

  const applyAddAndRemoveFromMeta = (
    afterMergedDeprecatedValue: boolean | unknown,
    { action }: { type: string; action: string },
    isWas: boolean = false,
  ): boolean | undefined => {
    if (action === 'add') {
      return side === 'before' ? false : !!afterMergedDeprecatedValue;
    } else if (action === 'remove') {
      if (side === 'before' && afterMergedDeprecatedValue && isWas) {
        return false;
      }
      return side === 'before' ? !!afterMergedDeprecatedValue : false;
    }
    return !!afterMergedDeprecatedValue;
  };

  const applyReplaceValue = (diffValue: boolean | unknown) => {
    return side === 'before' ? !!diffValue : !diffValue;
  };

  const valueSchemaDeprecated = isRegularNode(schemaNode) && schemaNode.deprecated;
  const deprecated =
    diffMeta?.deprecated?.action !== 'replace'
      ? applyAddAndRemoveFromMeta(valueSchemaDeprecated, diffMeta?.deprecated || {})
      : applyReplaceValue(diffMeta?.deprecated.beforeValue);
  const wasDeprecated =
    diffMeta?.deprecated?.action !== 'replace'
      ? applyAddAndRemoveFromMeta(valueSchemaDeprecated, diffMeta?.deprecated || {}, true)
      : valueSchemaDeprecated;
  const viewDeprecated = side === 'before' ? deprecated : wasDeprecated;

  const valueSchemaReadOnly = isRegularNode(schemaNode) && schemaNode.validations.readOnly;
  const readOnly =
    diffMeta?.readOnly?.action !== 'replace'
      ? applyAddAndRemoveFromMeta(valueSchemaReadOnly, diffMeta?.readOnly || {})
      : applyReplaceValue(diffMeta?.readOnly.beforeValue);
  const wasReadOnly =
    diffMeta?.readOnly?.action !== 'replace'
      ? applyAddAndRemoveFromMeta(valueSchemaReadOnly, diffMeta?.readOnly || {}, true)
      : valueSchemaReadOnly;
  const viewReadOnly = side === 'before' ? readOnly : wasReadOnly;

  const valueSchemaWriteOnly = isRegularNode(schemaNode) && schemaNode.validations.writeOnly;
  const writeOnly =
    diffMeta?.writeOnly?.action !== 'replace'
      ? applyAddAndRemoveFromMeta(valueSchemaWriteOnly, diffMeta?.writeOnly || {})
      : applyReplaceValue(diffMeta?.writeOnly.beforeValue);
  const wasWriteOnly =
    diffMeta?.writeOnly?.action !== 'replace'
      ? applyAddAndRemoveFromMeta(valueSchemaWriteOnly, diffMeta?.writeOnly || {}, true)
      : valueSchemaWriteOnly;
  const viewWriteOnly = side === 'before' ? writeOnly : wasWriteOnly;

  const showVisibilityValidations = viewMode === 'standalone' && !!viewReadOnly !== !!viewWriteOnly;
  const hasProperties = React.useMemo(() => {
    return viewDeprecated || showVisibilityValidations || viewRequired;
  }, [showVisibilityValidations, viewDeprecated, viewRequired]);

  return (
    <>
      {hasProperties && <Box bg={isHovering ? 'canvas-200' : undefined} h="px" flex={1} mx={3} />}

      <>
        {viewDeprecated ? (
          <Box
            as="span"
            ml={2}
            color="warning"
            style={side === 'before' && deprecated && !wasDeprecated ? { textDecoration: 'line-through' } : {}}
          >
            deprecated
          </Box>
        ) : null}
        {viewReadOnly ? (
          <Box
            as="span"
            ml={2}
            color="muted"
            style={side === 'before' && readOnly && !wasReadOnly ? { textDecoration: 'line-through' } : {}}
          >
            read-only
          </Box>
        ) : null}
        {viewWriteOnly ? (
          <Box
            as="span"
            ml={2}
            color="muted"
            style={side === 'before' && writeOnly && !wasWriteOnly ? { textDecoration: 'line-through' } : {}}
          >
            write-only
          </Box>
        ) : null}
        {viewRequired ? (
          <Box
            as="span"
            ml={2}
            color="warning"
            style={side === 'before' && wasRequired && !required ? { textDecoration: 'line-through' } : {}}
          >
            required
          </Box>
        ) : null}
      </>
    </>
  );
};

function shouldShowPropertyName(schemaNode: SchemaNode) {
  return (
    schemaNode.subpath.length === 2 &&
    (schemaNode.subpath[0] === 'properties' || schemaNode.subpath[0] === 'patternProperties')
  );
}

function calculateCombinedDiffMeta(
  schemaNode: SchemaNode,
  diffMetaKey: symbol
): Diff | undefined {
  const diffMeta: Record<string, Diff | DiffMetaRecord> = schemaNode[diffMetaKey];
  const parent = schemaNode.parent;
  const parentDiffMeta = schemaNode.parent?.[diffMetaKey];
  const indexOfRequired =
    parent && isRegularNode(parent)
      ? parent.required?.indexOf(schemaNode.subpath[schemaNode.subpath.length - 1])
      : undefined;
  const requiredMeta = indexOfRequired && parentDiffMeta?.required?.[indexOfRequired];

  const combined = combineDiffMetas({
    ...pick(diffMeta, [
      'deprecated',
      'readOnly',
      'writeOnly',
      'allOf',
      'anyOf',
      'oneOf',
      'type',
      'format',
      'name',
      'description',
    ]),
    ...(requiredMeta ? { required: requiredMeta } : {}),
  });

  return combined ? { type: combined.type as DiffType, action: 'replace' } as DiffReplace : undefined;
}
