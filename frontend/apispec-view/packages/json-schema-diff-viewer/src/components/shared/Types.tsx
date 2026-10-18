import { MergeMeta } from '@netcracker/qubership-apihub-api-diff';
import {
  isReferenceNode,
  isRegularNode,
  RegularNode,
  SchemaCombinerName,
  SchemaFragment,
  SchemaNode,
  SchemaNodeKind,
} from '@stoplight/json-schema-tree';
import { Box } from '@stoplight/mosaic';
import { applyReplacedFromMeta, useDiffContext } from 'diff-block';
import * as React from 'react';

import { printName } from '../../utils';
import { useDiffMetaKey } from "@stoplight/elements/containers/DIffMetaKeyContext";

function shouldRenderName(type: SchemaNodeKind | SchemaCombinerName | '$ref'): boolean {
  return type === SchemaNodeKind.Array || type === SchemaNodeKind.Object || type === '$ref';
}

function getTypes(schemaNode: RegularNode): Array<SchemaNodeKind | SchemaCombinerName> {
  return [schemaNode.types, schemaNode.combiners].reduce<Array<SchemaNodeKind | SchemaCombinerName>>(
    (values, value) => {
      if (value === null) {
        return values;
      }

      values.push(...value);
      return values;
    },
    [],
  );
}

function applyDiffToFragment(
  fragment: SchemaFragment,
  diffMetaKey: symbol
): SchemaFragment {
  const diff: Record<string, MergeMeta> | undefined = fragment[diffMetaKey];

  const fragmentShallowCopy = { ...fragment };

  if (!diff) return fragmentShallowCopy;

  for (let key in diff) {
    fragmentShallowCopy[key] = applyReplacedFromMeta(fragmentShallowCopy[key], diff[key]);
  }

  return fragmentShallowCopy;
}

function getTypesFromDiff(
  schemaNode: RegularNode,
  diffMetaKey: symbol
): Array<SchemaNodeKind | SchemaCombinerName> {
  const fragment = applyDiffToFragment(schemaNode.fragment, diffMetaKey);
  const node = new RegularNode(fragment);
  return getTypes(node);
}

export const Types: React.FunctionComponent<{ schemaNode: SchemaNode }> = ({ schemaNode }) => {
  const diffMetaKey = useDiffMetaKey()

  const { side } = useDiffContext();

  if (isReferenceNode(schemaNode)) {
    return (
      <Box as="span" textOverflow="truncate">
        {schemaNode.value ?? '$ref'}
      </Box>
    );
  }

  if (!isRegularNode(schemaNode)) {
    return null;
  }

  const types = side === 'before' ? getTypesFromDiff(schemaNode, diffMetaKey) : getTypes(schemaNode);

  if (types.length === 0) return null;

  const rendered = types.map((type, i, { length }) => (
    <React.Fragment key={type}>
      <Box as="span" textOverflow="truncate" color="muted">
        {shouldRenderName(type) ? printName(schemaNode) ?? type : type}
      </Box>
      {i < length - 1 && (
        <Box as="span" key={`${i}-sep`} color="muted">
          {' or '}
        </Box>
      )}
    </React.Fragment>
  ));

  return rendered.length > 1 ? <Box textOverflow="truncate">{rendered}</Box> : <>{rendered}</>;
};
Types.displayName = 'JsonSchemaViewer.Types';
