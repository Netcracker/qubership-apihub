import { isHttpOperation, isHttpService, TableOfContentsItem } from '@stoplight/elements-core';
import { ASYNC_OPERATION_NODE_TYPE } from '@stoplight/elements-core/types';
import { NodeType } from '@stoplight/types';
import { defaults, entries } from 'lodash';

import { OperationNode, ServiceChildNode, ServiceNode } from '../../utils/oas/types';

export const OPERATION_NODE_TYPES = [NodeType.HttpOperation, ASYNC_OPERATION_NODE_TYPE];

export type TagGroup = { title: string; items: OperationNode[] };

function isOperationNode(node: ServiceChildNode): node is OperationNode {
  return OPERATION_NODE_TYPES.includes(node.type);
}

export const computeTagGroups = (serviceNode: ServiceNode) => {
  const groupsByTagId: { [tagId: string]: TagGroup } = {};
  const ungrouped = [];

  const lowerCaseServiceTags = serviceNode.tags.map(tn => tn.toLowerCase());

  for (const node of serviceNode.children) {
    if (!isOperationNode(node)) continue;
    const tagName = node.tags[0];

    if (tagName) {
      const tagId = tagName.toLowerCase();
      if (groupsByTagId[tagId]) {
        groupsByTagId[tagId].items.push(node);
      } else {
        const serviceTagIndex = lowerCaseServiceTags.findIndex(tn => tn === tagId);
        const serviceTagName = serviceNode.tags[serviceTagIndex];
        groupsByTagId[tagId] = {
          title: serviceTagName || tagName,
          items: [node as OperationNode],
        };
      }
    } else {
      ungrouped.push(node);
    }
  }

  const orderedTagGroups = Object.entries(groupsByTagId)
    .sort(([g1], [g2]) => {
      const g1LC = g1.toLowerCase();
      const g2LC = g2.toLowerCase();
      const g1Idx = lowerCaseServiceTags.findIndex(tn => tn === g1LC);
      const g2Idx = lowerCaseServiceTags.findIndex(tn => tn === g2LC);

      // Move not-tagged groups to the bottom
      if (g1Idx < 0 && g2Idx < 0) return 0;
      if (g1Idx < 0) return 1;
      if (g2Idx < 0) return -1;

      // sort tagged groups according to the order found in HttpService
      return g1Idx - g2Idx;
    })
    .map(([, tagGroup]) => tagGroup);

  return { groups: orderedTagGroups, ungrouped };
};

interface ComputeAPITreeConfig {
  hideSchemas?: boolean;
  hideInternal?: boolean;
  searchPhrase?: string;
}

const defaultComputerAPITreeConfig = {
  hideSchemas: false,
  hideInternal: false,
  searchPhrase: '',
};

function containsSearchPhrase(data: object, searchPhrase?: string) {
  if (!searchPhrase) {
    return true;
  }
  const includesSearchPhrase = (str: string) => str.toLowerCase().includes(searchPhrase.toLowerCase());

  const checkEntries = (data?: unknown): boolean => {
    if (!data) {
      return false;
    }

    return data && typeof data === 'object'
      ? entries(data).some(([key, value]) => {
          return includesSearchPhrase(key) || (value && checkEntries(value));
        })
      : includesSearchPhrase(String(data));
  };

  return checkEntries(data);
}

export const computeAPITree = (serviceNode: ServiceNode, config: ComputeAPITreeConfig = {}) => {
  const mergedConfig = defaults(config, defaultComputerAPITreeConfig);
  const tree: TableOfContentsItem[] = [];

  tree.push({
    id: '/',
    slug: '/',
    title: 'Overview',
    type: 'overview',
    meta: '',
  });

  const operationNodes = serviceNode.children
    .filter(node => isOperationNode(node))
    .filter(node => containsSearchPhrase(node.data, mergedConfig.searchPhrase));
  if (operationNodes.length) {
    tree.push({
      title: 'Endpoints',
    });

    const { groups, ungrouped } = computeTagGroups(serviceNode);

    // Show ungroupped operations above tag groups
    ungrouped
      .sort((it, that) => it.name.localeCompare(that.name))
      .filter(node => containsSearchPhrase(node.data, mergedConfig.searchPhrase))
      .forEach(operationNode => {
        if (
          ('internal' in operationNode.data && mergedConfig.hideInternal && operationNode.data.internal) ||
          !isOperationNode(operationNode)
        ) {
          return;
        }

        const { uri, name, type, data } = operationNode;
        tree.push({
          id: uri,
          slug: uri,
          title: name,
          type: type,
          meta: data.method,
        });
      });

    groups.forEach(group => {
      const items = group.items.flatMap(operationNode => {
        if (
          (mergedConfig.hideInternal && operationNode.data.internal) ||
          !containsSearchPhrase(operationNode.data, mergedConfig.searchPhrase)
        ) {
          return [];
        }
        return {
          id: operationNode.uri,
          slug: operationNode.uri,
          title: operationNode.name,
          type: operationNode.type,
          meta: operationNode.data.method,
          deprecated: 'deprecated' in operationNode.data ? operationNode.data.deprecated : undefined,
        };
      });
      if (items.length > 0) {
        tree.push({
          title: group.title,
          items: items.sort((it, that) => it.title.localeCompare(that.title)),
        });
      }
    });
  }

  let schemaNodes = serviceNode.children
    .filter(node => node.type === NodeType.Model)
    .filter(node => containsSearchPhrase(node.data, mergedConfig.searchPhrase));
  if (mergedConfig.hideInternal) {
    schemaNodes = schemaNodes.filter(node => !node.data['x-internal']);
  }

  if (!mergedConfig.hideSchemas && schemaNodes.length) {
    tree.push({
      title: 'Schemas',
    });

    schemaNodes
      .sort((it, that) => it.name.localeCompare(that.name))
      .forEach(node => {
        tree.push({
          id: node.uri,
          slug: node.uri,
          title: node.name,
          type: node.type,
          meta: '',
        });
      });
  }
  return tree;
};

export const findFirstNodeSlug = (tree: TableOfContentsItem[]): string | void => {
  for (const item of tree) {
    if ('slug' in item) {
      return item.slug;
    }

    if ('items' in item) {
      const slug = findFirstNodeSlug(item.items);
      if (slug) {
        return slug;
      }
    }
  }

  return;
};

export const isInternal = (node: ServiceChildNode | ServiceNode): boolean => {
  const data = node.data;

  if (isHttpOperation(data)) {
    return !!data.internal;
  }

  if (isHttpService(data)) {
    return false;
  }

  return !!data['x-internal'];
};
