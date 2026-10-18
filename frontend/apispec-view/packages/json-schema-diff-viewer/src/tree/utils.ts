import {
  isReferenceNode,
  isRegularNode,
  MirroredSchemaNode,
  ReferenceNode,
  RegularNode,
  SchemaNode,
  SchemaNodeKind,
} from '@stoplight/json-schema-tree';

import { isNonNullable } from '../guards/isNonNullable';
import { ComplexArrayNode, FlattenableNode, PrimitiveArrayNode } from './types';

export type ChildNode = RegularNode | ReferenceNode | MirroredSchemaNode;

export const isNonEmptyParentNode = (
  node: SchemaNode,
): node is RegularNode & {
  children: ChildNode[] & { 0: ChildNode };
} => isRegularNode(node) && !!node.children && node.children.length > 0;

export function isFlattenableNode(node: SchemaNode): node is FlattenableNode {
  if (!isRegularNode(node)) return false;

  if (node.primaryType !== SchemaNodeKind.Array || !isNonNullable(node.children) || node.children.length === 0) {
    return false;
  }

  return (
    node.children.length === 1 &&
    (isRegularNode(node.children[0]) || (isReferenceNode(node.children[0]) && node.children[0].error !== null))
  );
}

export function isPrimitiveArray(node: SchemaNode): node is PrimitiveArrayNode {
  return isFlattenableNode(node) && isRegularNode(node.children[0]) && node.children[0].simple;
}

export function isComplexArray(node: SchemaNode): node is ComplexArrayNode {
  return isFlattenableNode(node) && isRegularNode(node.children[0]) && !node.children[0].simple;
}

/**
 * Returns the children of `node` that should be displayed in the tree.
 * Defaults to `node.children`, except for Arrays that get special handling (flattening).
 */
export function calculateChildrenToShow(node: SchemaNode): SchemaNode[] {
  if (!isRegularNode(node) || isPrimitiveArray(node)) {
    return [];
  }
  if (isComplexArray(node)) {
    // flatten the tree here, and show the properties of the item type directly
    return node.children[0].children ?? [];
  }
  return node.children ?? [];
}

export function isPropertyRequired(schemaNode: SchemaNode, diffMetaKey: symbol): boolean {
  const { parent } = schemaNode;
  if (parent === null || !isRegularNode(parent) || schemaNode.subpath.length === 0) {
    return false;
  }
  const {
    currentField,
    requiredFieldMap,
    requiredMeta
  } = initConstRequired(schemaNode, diffMetaKey);

  if (requiredMeta?.action === 'remove' && parent.required?.includes(currentField)) {
    return requiredMeta?.action !== 'remove';
  }

  if (requiredMeta?.action === 'add' && parent.required?.includes(currentField)) {
    return requiredMeta?.action === 'add';
  }

  let isChange = !!parent.required?.includes(currentField);
  requiredFieldMap?.forEach(item => {
    if (item?.action === 'remove' && item?.field === currentField) {
      isChange = false;
    }
    if (item?.action === 'add' && item?.field === currentField) {
      isChange = true;
    }
    if (item?.action === 'replace') {
      if (item.field === currentField) {
        isChange = item.field === currentField;
      } else if (item.beforeValue === currentField) {
        isChange = false;
      }
    }
  });
  return requiredMeta ? isChange : !!parent.required?.includes(currentField);
}

export function isPropertyWasRequired(schemaNode: SchemaNode, diffMetaKey: symbol): boolean {
  const { parent } = schemaNode;
  if (parent === null || !isRegularNode(parent) || schemaNode.subpath.length === 0) {
    return false;
  }
  const {
    currentField,
    requiredFieldMap,
    requiredMeta
  } = initConstRequired(schemaNode, diffMetaKey);

  if (requiredMeta?.action === 'remove' && parent.required?.includes(currentField)) {
    return requiredMeta?.action === 'remove';
  }

  if (requiredMeta?.action === 'add' && parent.required?.includes(currentField)) {
    return requiredMeta?.action !== 'add';
  }

  let isChange = !!parent.required?.includes(currentField);
  requiredFieldMap?.forEach(item => {
    if (item?.action === 'remove' && item?.field === currentField) {
      isChange = true;
    }
    if (item?.action === 'add' && item?.field === currentField) {
      isChange = false;
    }
    if (item?.action === 'replace') {
      if (item.field === currentField) {
        isChange = item.field !== currentField;
      } else if (item.beforeValue === currentField) {
        isChange = true;
      }
    }
  });
  return requiredMeta ? isChange : !!parent.required?.includes(currentField);
}

function initConstRequired(schemaNode: SchemaNode, diffMetaKey: symbol): {
  currentField: string;
  requiredFieldMap: DiffRequired[];
  requiredMeta: any;
} {
  const { parent } = schemaNode;

  const currentField = schemaNode.subpath[schemaNode.subpath.length - 1];
  const requiredFieldMap =
    parent &&
    isRegularNode(parent) &&
    parent.required?.map((item, index) => {
      const diff = parent && parent[diffMetaKey]?.required?.[index];
      if (diff) {
        return {
          field: item,
          action: diff['action'],
          beforeValue: diff['beforeValue'],
        };
      } else {
        return {};
      }
    });
  const requiredMeta = parent && parent[diffMetaKey]?.required;
  return {
    currentField: currentField,
    requiredFieldMap: requiredFieldMap || [],
    requiredMeta: requiredMeta,
  };
}

type DiffRequired = {
  field?: string | undefined;
  action?: string | undefined;
  beforeValue?: string | undefined;
};
