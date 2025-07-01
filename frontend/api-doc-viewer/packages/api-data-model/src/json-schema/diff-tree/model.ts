import { buildPointer } from '@netcracker/qubership-apihub-api-unifier';
import { Diff, DiffMetaRecord, DiffType, isDiffReplace } from '@netcracker/qubership-apihub-api-diff';
import { isArray, syncCrawl } from '@netcracker/qubership-apihub-json-crawl';
import { DiffNodeMeta, DiffNodeValue, DiffRecord, NodeChange } from '../../abstract/diff';
import { DIFF_TREE_UTILS } from '../../abstract/diff-tree-utils';
import { IModelTreeNode, ModelTreeNodeParams, ModelTreeNodeType } from '../../abstract/model/types';
import { UNKNOWN_TYPE } from "../../abstract/constants";
import { getNodeComplexityType, isDiff, isObject, objectKeys, pick, setValueByPath } from '../../utils';
import { jsonSchemaNodeMetaProps, jsonSchemaNodeValueProps } from '../constants';
import { isJsonSchemaNodeType } from '../guards';
import { JsonSchemaModelTree } from '../tree/model';
import type { JsonSchemaCreateNodeParams, JsonSchemaNodeKind, JsonSchemaNodeType } from '../tree/types';
import { isBrokenRef, isRequired } from '../utils';
import { JsonSchemaDiffNodeMeta, JsonSchemaDiffNodeValue } from './types';

export class JsonSchemaModelDiffTree<
  T extends DiffNodeValue | null = JsonSchemaDiffNodeValue,
  K extends string = JsonSchemaNodeKind,
  M extends DiffNodeMeta = JsonSchemaDiffNodeMeta
> extends JsonSchemaModelTree<T, K, M> {

  constructor(source: unknown, public metaKey: symbol) {
    super(source)
  }

  public createNode(id: string, kind: K, key: string | number, isCycle: boolean, params: ModelTreeNodeParams<T, K, M>) {
    const node = super.createNode(id, kind, key, isCycle, params)
    // calculate $nodeChangesSummary
    node.meta.$nodeChangesSummary = DIFF_TREE_UTILS.totalChangesSummary(node)
    return node
  }

  public createComplexNode(id: string, kind: K, key: string | number, isCycle: boolean, params: ModelTreeNodeParams<T, K, M> & {
    type: Exclude<ModelTreeNodeType, 'simple'>
  }) {
    const node = super.createComplexNode(id, kind, key, isCycle, params)
    // calculate $nodeChangesSummary
    node.meta.$nodeChangesSummary = DIFF_TREE_UTILS.totalChangesSummary(node)
    return node
  }

  public createCycledClone<Node extends IModelTreeNode<T, K, M>>(source: Node, id: string, key: string | number, parent: IModelTreeNode<T, K, M> | null): Node {
    const node = super.createCycledClone(source, id, key, parent) as Node
    node.meta.$nodeChangesSummary = DIFF_TREE_UTILS.totalChangesSummary(node)
    return node
  }

  public createNodeMeta(params: JsonSchemaCreateNodeParams<T, K, M>): M {
    const { value } = params

    const complexityType = getNodeComplexityType(value)
    if (complexityType === 'simple') {
      return this.simpleDiffMeta(params) as M
    } else {
      return this.nestedDiffMeta(params) as M
    }
  }

  public createNodeValue(params: JsonSchemaCreateNodeParams<T, K, M>): T {
    const { value } = params
    if (value === undefined || value === null) {
      return null as T
    }
    if (!isObject(value)) {
      return value as T
    }
    const type: JsonSchemaNodeType = isJsonSchemaNodeType(value.type) ? value.type : UNKNOWN_TYPE
    let observedProps = jsonSchemaNodeValueProps[type]
    const valueDiffs = value[this.metaKey]
    if (isObject(valueDiffs) && 'type' in valueDiffs) {
      const typeDiff = valueDiffs.type
      const previousType: JsonSchemaNodeType | undefined = isDiff(typeDiff) && isDiffReplace(typeDiff) && isJsonSchemaNodeType(typeDiff.beforeValue)
        ? typeDiff.beforeValue
        : undefined
      observedProps = [
        ...observedProps,
        ...previousType ? jsonSchemaNodeValueProps[previousType] : []
      ]
    }
    const $changes = this.getPropsChanges(value, observedProps)
    return {
      /*
      FIXME 02.09.24
       This filtering is temporarily necessary
       because of separating props to "value" and "meta" in tree
      */
      ...pick<any>(value, observedProps),
      ...Object.keys($changes).length ? { $changes } : {},
    } as T
  }

  protected getPropsChanges(_value: any, props: readonly string[]) {
    const changes: DiffRecord = {}
    const scanned: Set<unknown> = new Set()
    syncCrawl(_value, ({ value, path, key }) => {
      // exit if we found loop
      if (scanned.has(value)) {
        return { done: true }
      }
      scanned.add(value)

      // exit if it's not allowed branch
      if (path.length === 1 && !props.includes(String(key))) {
        return { done: true }
      }
      // go deeper if it's not an object OR there's no changes
      if (!isObject(value) || !(this.metaKey in value)) {
        return { value }
      }

      // accumulate changes if we found them
      const _changes = (
        !path.length ?
          pick(value[this.metaKey], props) :
          value[this.metaKey]
      ) as DiffMetaRecord
      for (const key of objectKeys(_changes)) {
        const changePath = [...path, key]
        setValueByPath(changes, _changes[key], ...changePath)
      }
    })

    return changes
  }

  protected isAllDescendantsChanged(
    parent: IModelTreeNode<T, K, M> | null,
    container: IModelTreeNode<T, K, M> | null,
    childrenChanges: DiffRecord | undefined,
    nestedChanges: DiffRecord | undefined
  ): boolean {
    let allDescendantsChanged = false
    if (childrenChanges) {
      const keys = parent!.children().map(child => child.id)
      const changedKeys = Object
        .entries(childrenChanges)
        .filter(([, change]) => change && !!Object.keys(change).length)
        .map(([id]) => id)
      allDescendantsChanged =
        keys.length > 0 &&
        changedKeys.length > 0 &&
        keys.length === changedKeys.length &&
        keys.every(descendantKey => changedKeys.includes(descendantKey)) &&
        changedKeys.every(changedDescendantKey => childrenChanges[changedDescendantKey].action === childrenChanges[keys[0]].action)
    }
    if (nestedChanges) {
      const keys = container!.nested.map(nestedNode => nestedNode.id)
      const changedKeys = Object
        .entries(nestedChanges)
        .filter(([, change]) => change && !!Object.keys(change).length)
        .map(([id]) => id)
      allDescendantsChanged =
        keys.length > 0 &&
        changedKeys.length > 0 &&
        keys.length === changedKeys.length &&
        keys.every(descendantKey => changedKeys.includes(descendantKey)) &&
        changedKeys.every(changedDescendantKey => nestedChanges[changedDescendantKey].action === nestedChanges[keys[0]].action)
    }

    return allDescendantsChanged
  }

  protected getNodeChange(params: JsonSchemaCreateNodeParams<T, K, M>): NodeChange | undefined {
    const { id, parent = null, container = null } = params
    const inheritedChanges: NodeChange | undefined = container?.meta?.$nodeChange ?? parent?.meta?.$nodeChange

    const childrenChanges = parent?.meta?.$childrenChanges
    const nestedChanges = container?.meta?.$nestedChanges
    const descendantsChanges = childrenChanges?.[id] || nestedChanges?.[id]

    const isAllDescendantsChanged = this.isAllDescendantsChanged

    return ['add', 'remove'].includes(inheritedChanges?.action ?? '')
      ? inheritedChanges
      : descendantsChanges
        ? ({
          ...descendantsChanges,
          get depth(): number {
            const allDescendantsChanged = isAllDescendantsChanged(parent, container, childrenChanges, nestedChanges)
            return (parent?.depth ?? 0) + (!allDescendantsChanged ? 1 : 0)
          },
        } as NodeChange)
        : undefined
  }

  public getRequiredChange(key: string | number, parent: IModelTreeNode<any, any, any> | null): Diff | null {
    if (!parent || typeof key === 'number' || !key) {
      return null
    }
    const value = parent?.value()
    const diffRecord: DiffRecord = value?.$changes
    if (!!diffRecord && 'required' in diffRecord && !!value && 'required' in value && Array.isArray(value.required) && value.required.includes(key)) {
      if (diffRecord.required) {
        const index = value.required.indexOf(key).toString()
        if (index in diffRecord.required) {
          return (diffRecord.required as Record<string, Diff>)[index]
        }
      }
    }
    return null
  }

  public getChildrenChanges(id: string, _fragment: any): DiffRecord {
    const children: DiffRecord = {}

    // add/remove all properties
    if (_fragment?.[this.metaKey]?.properties) {
      for (const prop of objectKeys(_fragment.properties as object)) {
        children[`${id}/properties/${prop}`] = _fragment?.[this.metaKey]?.properties
      }
    }

    // add/remove some properties
    const properties: Record<string, any> = _fragment.properties?.[this.metaKey] ?? {}
    for (const prop of objectKeys(properties)) {
      children[`${id}/properties/${prop}`] = properties[prop]
    }

    // add/remove additionalProperties
    if (_fragment?.[this.metaKey]?.additionalProperties) {
      children[`${id}/additionalProperties`] = _fragment[this.metaKey].additionalProperties
    }

    // add/remove items
    if (_fragment?.items?.[this.metaKey]) {
      const items: DiffRecord = _fragment?.items?.[this.metaKey] ?? {}
      for (const item of objectKeys(items)) {
        children[`${id}/items/${item.toString()}`] = items[item]
      }
    }

    if (_fragment?.[this.metaKey]?.items) {
      //if items was/will be an array that we should transform changes
      const items = _fragment?.items
      if (isArray(items)) {
        for (const item of objectKeys(items)) {
          children[`${id}/items/${item.toString()}`] = _fragment?.[this.metaKey].items
        }
      } else {
        children[`${id}/items`] = _fragment?.[this.metaKey].items
      }
    }

    if (_fragment?.[this.metaKey]?.additionalItems) {
      children[`${id}/additionalItems`] = _fragment[this.metaKey].additionalItems
    }

    // add/remove all patternProperties
    if (_fragment?.[this.metaKey]?.patternProperties) {
      for (const prop of objectKeys(_fragment.patternProperties as object)) {
        children[`${id}/patternProperties${buildPointer([prop])}`] = _fragment?.[this.metaKey]?.patternProperties
      }
    }

    const patternProperties: Record<string, any> = _fragment?.patternProperties?.[this.metaKey] ?? {}
    for (const prop of objectKeys(patternProperties)) {
      children[`${id}/patternProperties${buildPointer([prop])}`] = patternProperties[prop]
    }

    return children
  }

  public simpleDiffMeta(params: JsonSchemaCreateNodeParams<T, K, M>): JsonSchemaDiffNodeMeta {
    const { value, id, key = '', parent = null } = params

    const requiredChange = this.getRequiredChange(key, parent)
    const $metaChanges = {
      ...requiredChange ? { required: requiredChange } : {},
      ...this.getPropsChanges(value, jsonSchemaNodeMetaProps),
    }
    const $childrenChanges = this.getChildrenChanges(id, value ?? {})
    const $nodeChange = this.getNodeChange(params)

    return {
      ...pick<any>(value, jsonSchemaNodeMetaProps),
      ...$nodeChange ? { $nodeChange } : {},
      ...Object.keys($metaChanges).length ? { $metaChanges } : {},
      ...Object.keys($childrenChanges).length ? { $childrenChanges } : {},
      $nodeChangesSummary: new Set<DiffType>(),
      required: isRequired(key, parent),
      ...(isBrokenRef(value) ? { brokenRef: value.$ref } : {}),
      _fragment: value,
    }
  }

  public nestedDiffMeta(params: JsonSchemaCreateNodeParams<T, K, M>): JsonSchemaDiffNodeMeta {
    const { value, id, key = '', parent = null } = params

    const complexityType = getNodeComplexityType(value)
    const nestedChanges: Record<string, any> = value?.[complexityType]?.[this.metaKey] ?? {}
    const $nodeChange: NodeChange | undefined = this.getNodeChange(params)

    const $nestedChanges: DiffRecord = {}
    for (const nested of objectKeys(nestedChanges)) {
      $nestedChanges[`${id}/${complexityType}/${nested}`] = nestedChanges[nested]
    }
    return {
      ...Object.keys($nestedChanges).length ? { $nestedChanges } : {},
      ...$nodeChange ? { $nodeChange } : {},
      $nodeChangesSummary: new Set<DiffType>(),
      required: isRequired(key, parent),
      ...(isBrokenRef(value) ? { brokenRef: value.$ref } : {}),
      _fragment: value,
    }
  }
}
