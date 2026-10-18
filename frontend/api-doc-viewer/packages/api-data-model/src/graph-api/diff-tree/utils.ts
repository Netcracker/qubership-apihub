import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi';
import { syncCrawl } from '@netcracker/qubership-apihub-json-crawl';
import { DiffRecord, NodeChange } from '../../abstract/diff';
import { escapeSlash, isDiff, isObject, objectKeys, pick } from '../../utils';
import { GraphApiDiffComplexNode, GraphApiDiffTreeNode } from './types';


// Schema node

export function collectSchemaChildrenChanges(
  value: unknown,
  metaKey: symbol
): DiffRecord | undefined {
  if (!isObject(value)) {
    return undefined
  }

  const childrenChanges: DiffRecord = {}

  const props = ['components', 'directives']
  const operations = ['queries', 'mutations', 'subscriptions']

  //is cycled JSO safe?
  syncCrawl(value, ({ value, path }) => {
    // Ignore not components section
    if (path.length >= 1 && path[0] !== props[0] && !operations.some(operationType => path[0] === operationType)) {
      return { done: true }
    }
    // Ignore not directives section under components section
    if (path.length === 2 && path[1] !== props[1]) {
      return { done: true }
    }
    // Ignore deep changes
    if (path.length > 2) {
      return { done: true }
    }
    if (!isObject(value) || !(metaKey in value)) {
      return
    }

    const changesFragment: any = !path.length
      ? pick(value[metaKey], props)
      : value[metaKey]
    for (const key of objectKeys(changesFragment)) {
      const newKey = [...path, escapeSlash(key.toString())].join('/')
      childrenChanges[`#/${newKey}`] = changesFragment[key]
    }
  })

  return Object.keys(childrenChanges).length > 0
    ? childrenChanges
    : undefined
}
// Directive node

export function collectDirectiveNodeChange(
  id: string,
  parent: GraphApiDiffTreeNode | GraphApiDiffComplexNode | null
): NodeChange | undefined {
  const changeMeta = parent?.meta?.$childrenChanges?.[id]

  if (isObject(changeMeta)) {
    return {
      ...changeMeta,
      // because custom directives definition are always on 1st level
      depth: 1
    } as NodeChange
  }

  return undefined
}

export function collectDirectiveMetaChanges(
  key: string | number,
  source: unknown,
  metaKey: symbol
): DiffRecord | undefined {
  if (!isObject(source)) {
    return undefined
  }

  const directive: object | undefined = (source as unknown as GraphApiSchema)?.components?.directives?.[key]
  const rawMetaChanges = isObject(directive) && metaKey in directive
    ? directive[metaKey]
    : undefined

  let hasChanges = false

  const metaChanges: DiffRecord = {}
  if (isObject(rawMetaChanges)) {
    for (const changedPropertyKey of Object.keys(rawMetaChanges)) {
      const changedPropertyMeta = rawMetaChanges[changedPropertyKey]
      if (isDiff(changedPropertyMeta)) {
        hasChanges = true
        metaChanges[changedPropertyKey] = changedPropertyMeta
      }
    }
  }

  return hasChanges ? metaChanges : undefined
}
