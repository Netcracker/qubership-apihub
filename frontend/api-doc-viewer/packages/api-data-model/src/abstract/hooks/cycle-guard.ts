import { buildPointer } from '@netcracker/qubership-apihub-api-unifier'
import { SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl'
import { areExcludedComponents } from '../../graph-api/utils'
import { ModelTree } from '../model/model-tree.impl'
import { IModelTreeNode } from '../model/types'
import { SchemaCrawlRule } from '../types'

interface CommonState<T, K extends string, M> {
  parent: IModelTreeNode<T, K, M> | null
  container?: IModelTreeNode<T, K, M>
  alreadyConvertedMappingStack: Map<unknown, IModelTreeNode<T, K, M>>
}

export function createCycleGuardHook<T, K extends string, M, S extends CommonState<T, K, M>>(
  tree: ModelTree<T, K, M>
): SyncCrawlHook<S, SchemaCrawlRule<any, any>> {
  return ({ value, state, key, path }) => {
    if (typeof key === 'symbol') {
      return areExcludedComponents(path) ? { done: true } : { value }
    }

    const { alreadyConvertedMappingStack, parent, container } = state
    const alreadyExisted = alreadyConvertedMappingStack.get(value)
    if (alreadyExisted) {
      const id = '#' + buildPointer(path)
      if (container) {
        container.addNestedNode(tree.createCycledClone(alreadyExisted, id, key, parent))
      } else {
        parent?.addChild(tree.createCycledClone(alreadyExisted, id, key, parent))
      }
      return { done: true }
    }

    return { value: value }
  }
}