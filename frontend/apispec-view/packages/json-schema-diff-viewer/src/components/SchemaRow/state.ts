import { extractPointerFromRef, pointerToPath } from '@stoplight/json';
import { isMirroredNode, isReferenceNode, isRegularNode, SchemaNode } from '@stoplight/json-schema-tree';
import { schemaIdKey } from 'diff-block';
import { atom, PrimitiveAtom, WritableAtom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { isEqual, last } from 'lodash';

import { isComplexArray, isNonEmptyParentNode } from '../../tree';
import { printName } from '../../utils';

function compareNodes(source: SchemaNode | null, target: SchemaNode | null): boolean {
  return source?.[schemaIdKey] === target?.[schemaIdKey] && isEqual(source?.path, target?.path);
}

export const hoveredNodeAtom = atom<SchemaNode | null>(null);
export const isNodeHoveredAtom = atomFamily((node: SchemaNode) => atom(get => node === get(hoveredNodeAtom)));
export const isChildNodeHoveredAtom = atomFamily((parent: SchemaNode) =>
  atom(get => {
    const hoveredNode = get(hoveredNodeAtom);

    if (!hoveredNode || hoveredNode === parent) return false;

    return hoveredNode.parent === parent;
  }),
);

export const choicesAtom = atomFamily<SchemaNode, Choice[]>(
  (node: SchemaNode) => {
    // handle flattening of arrays that contain oneOfs, same logic as below
    if (isComplexArray(node) && isNonEmptyParentNode(node.children[0]) && shouldShowChildSelector(node.children[0])) {
      return atom(node.children[0].children.map(child => makeArrayChoice(child, node.children[0].combiners?.[0])));
    }

    // if current node is a combiner, offer its children
    if (isNonEmptyParentNode(node) && shouldShowChildSelector(node)) {
      return atom(node.children.map(makeChoice));
    }
    // regular node, single choice - itself
    return atom([makeChoice(node)]);
  },
  (a, b) => compareNodes(a, b),
);

export const selectedChoiceAtom = atomFamily<SchemaNode, WritableAtom<Choice, Choice>>(
  schemaNode => {
    const innerAtom = atom<Choice | undefined>(undefined);
    return atom<Choice, Choice>(
      get => get(innerAtom) ?? get(choicesAtom(schemaNode))[0],
      (get, set, update) => {
        const choices = get(choicesAtom(schemaNode));
        if (choices.find(choice => choice.title === update.title)) {
          set(innerAtom, update);
        } else {
          set(innerAtom, choices[0]);
        }
      },
    );
  },
  (a, b) => compareNodes(a, b),
);

export const isExpandedAtom = atomFamily<
  { schemaNode: SchemaNode; nestingLevel: number; defaultExpandedDepth: number; hasFilteredChildren?: boolean },
  PrimitiveAtom<boolean>
>(
  ({ schemaNode, nestingLevel, defaultExpandedDepth, hasFilteredChildren = false }) => {
    return atom(!isMirroredNode(schemaNode) && (nestingLevel <= defaultExpandedDepth || hasFilteredChildren));
  },
  (a, b) => compareNodes(a.schemaNode, b.schemaNode),
);

export const rowCollapsedAtom = atomFamily((_id: string) => atom(false));
export const setCollapsedRowAtom = atom<null, string>(null, (get, set, id) => {
  set(rowCollapsedAtom(id), false);
});

export const parentHasCollapsedRowsAtom = atomFamily((rowIds: string[]) => {
  return atom(get => rowIds.some(id => get(rowCollapsedAtom(id))));
});

///// HELPERS

type Choice = {
  title: string;
  type: SchemaNode;
};

function calculateChoiceTitle(node: SchemaNode, isPlural: boolean): string {
  const primitiveSuffix = isPlural ? 's' : '';
  if (isRegularNode(node)) {
    const realName = printName(node, { shouldUseRefNameFallback: true });
    if (realName) {
      return realName;
    }
    return node.primaryType !== null ? node.primaryType + primitiveSuffix : 'any';
  }
  if (isReferenceNode(node)) {
    if (node.value) {
      const value = extractPointerFromRef(node.value);
      const lastPiece = !node.error && value ? last(pointerToPath(value)) : null;
      if (typeof lastPiece === 'string') {
        return lastPiece.split('.')[0];
      }
    }
    return '$ref' + primitiveSuffix;
  }

  return 'any';
}

function makeChoice(node: SchemaNode): Choice {
  return {
    type: node,
    title: calculateChoiceTitle(node, false),
  };
}

function makeArrayChoice(node: SchemaNode, combiner?: string): Choice {
  const itemTitle = calculateChoiceTitle(node, true);
  const title = itemTitle !== 'any' ? `array ${combiner ? `(${combiner})` : null} [${itemTitle}]` : 'array';
  return {
    type: node,
    title,
  };
}

const shouldShowChildSelector = (schemaNode: SchemaNode) =>
  isNonEmptyParentNode(schemaNode) && ['anyOf', 'oneOf'].includes(schemaNode.combiners?.[0] ?? '');
