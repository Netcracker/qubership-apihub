import { breaking, Diff, DiffAction, DiffAdd, DiffMetaRecord, DiffRemove, DiffReplace, DiffType, isDiffAdd, isDiffRemove, isDiffReplace } from '@netcracker/qubership-apihub-api-diff';
import { GRAPH_API_NODE_KIND_INPUT_OBJECT, GRAPH_API_NODE_KIND_INTERFACE, GRAPH_API_NODE_KIND_LIST, GRAPH_API_NODE_KIND_OBJECT, GraphApiAnyDefinition, GraphApiDirective, GraphApiListDefinition, isGraphApiAnyDefinition, isGraphApiArgs, isGraphApiDirective, isGraphApiDirectives, isGraphApiInputObjectDefinition, isGraphApiListDefinition, isGraphApiObjectiveDefinition } from '@netcracker/qubership-apihub-graphapi';
import { JsonPath, syncCrawl } from '@netcracker/qubership-apihub-json-crawl';
import { DiffNodeMeta, DiffNodeValue, DiffRecord, NodeChange } from '../../abstract/diff';
import { CreateNodeResult, IModelTreeNode } from '../../abstract/model/types';
import { isBrokenRef, JsonSchemaCreateNodeParams, JsonSchemaModelDiffTree } from '../../json-schema';
import { getNodeComplexityType, inverDiffAction, isDiff, isObject, objectKeys, PathUtils, pick, setValueByPath } from '../../utils';
import { graphSchemaNodeKind, graphSchemaNodeMetaProps, graphSchemaNodeValueProps } from '../constants';
import { isGraphApiNodeType } from '../guards';
import { type GraphSchemaNodeKind, type GraphSchemaNodeType } from '../tree/types';
import { resolveDirectiveDeprecated, resolveEnumValues } from '../utils';
import { GraphApiDiffNodeMeta, GraphSchemaDiffNodeValue } from './types';

const OBJECTIVE_KINDS = new Set([
  GRAPH_API_NODE_KIND_OBJECT,
  GRAPH_API_NODE_KIND_INTERFACE,
  GRAPH_API_NODE_KIND_INPUT_OBJECT
] as const)

export class GraphApiModelDiffTree<
  T extends DiffNodeValue = GraphSchemaDiffNodeValue,
  K extends string = GraphSchemaNodeKind,
  M extends DiffNodeMeta = GraphApiDiffNodeMeta
> extends JsonSchemaModelDiffTree<T, K, M> {

  public getChildrenChanges(id: string, _fragment: any): DiffRecord {
    const childrenChanges: DiffRecord = {}

    const rootDiffs = _fragment[this.metaKey]

    // case of added/removed directives
    // case of added/removed args
    if (isObject(rootDiffs) && (isGraphApiDirectives(_fragment) || isGraphApiArgs(_fragment))) {
      const keys = new Set(Object.keys(_fragment))
      const rootDiffsKeys = Object.keys(rootDiffs)
      const hasWhollyChangedItem = rootDiffsKeys.some(key => keys.has(key))
      if (hasWhollyChangedItem) {
        for (const key of rootDiffsKeys) {
          const diff = rootDiffs[key]
          if (!isDiff(diff)) { continue }
          childrenChanges[`${id}/${key}`] = diff
        }
        return childrenChanges
      }
    }

    // add/remove all properties/methods/items
    /*
    cases:
    1. properties -> methods
    2. properties -> items
    3. methods -> properties
    4. methods -> items
    5. items -> properties
    6. items -> methods
    */
    const diffForType = _fragment?.typeDef?.[this.metaKey]?.type
    if (diffForType &&
      diffForType?.type === breaking &&
      diffForType?.action === DiffAction.replace) {
      const kindBefore = diffForType?.beforeValue?.kind
      const kindAfter = diffForType?.afterValue?.kind
      let diffForProps
      let diffForMethods
      let diffForItems
      const isBeforeObjective = OBJECTIVE_KINDS.has(kindBefore)
      const isAfterObjective = OBJECTIVE_KINDS.has(kindAfter)
      const kindsNotEqual = kindBefore !== kindAfter
      if (kindsNotEqual) {
        if (!isBeforeObjective && !isAfterObjective) {
          if (kindBefore === GRAPH_API_NODE_KIND_LIST) {
            diffForItems = { ...diffForType, action: DiffAction.remove }
          }
          if (kindAfter === GRAPH_API_NODE_KIND_LIST) {
            diffForItems = { ...diffForType, action: DiffAction.add }
          }
          if (isDiff(diffForItems)) {
            childrenChanges[`${id}/typeDef/type/items`] = diffForItems
          }
          return childrenChanges
        } else if (isBeforeObjective && isAfterObjective) {
          if (kindBefore === GRAPH_API_NODE_KIND_OBJECT || kindBefore === GRAPH_API_NODE_KIND_INTERFACE) {
            diffForMethods = { ...diffForType, action: DiffAction.remove }
          }
          if (kindAfter === GRAPH_API_NODE_KIND_OBJECT || kindAfter === GRAPH_API_NODE_KIND_INTERFACE) {
            diffForMethods = { ...diffForType, action: DiffAction.add }
          }
          if (kindBefore === GRAPH_API_NODE_KIND_INPUT_OBJECT) {
            diffForProps = { ...diffForType, action: DiffAction.remove }
          }
          if (kindAfter === GRAPH_API_NODE_KIND_INPUT_OBJECT) {
            diffForProps = { ...diffForType, action: DiffAction.add }
          }
        } else if (isBeforeObjective) {
          if (kindBefore === GRAPH_API_NODE_KIND_OBJECT || kindBefore === GRAPH_API_NODE_KIND_INTERFACE) {
            diffForMethods = { ...diffForType, action: DiffAction.remove }
          }
          if (kindBefore === GRAPH_API_NODE_KIND_INPUT_OBJECT) {
            diffForProps = { ...diffForType, action: DiffAction.remove }
          }
          if (kindAfter === GRAPH_API_NODE_KIND_LIST) {
            diffForItems = { ...diffForType, action: DiffAction.add }
          }
        } else if (isAfterObjective) {
          if (kindAfter === GRAPH_API_NODE_KIND_OBJECT || kindAfter === GRAPH_API_NODE_KIND_INTERFACE) {
            diffForMethods = { ...diffForType, action: DiffAction.add }
          }
          if (kindAfter === GRAPH_API_NODE_KIND_INPUT_OBJECT) {
            diffForProps = { ...diffForType, action: DiffAction.add }
          }
          if (kindBefore === GRAPH_API_NODE_KIND_LIST) {
            diffForItems = { ...diffForType, action: DiffAction.remove }
          }
        }
      }
      if (isDiff(diffForMethods)) {
        // TODO 27.11.24 // Not type safe
        const methods = _fragment?.typeDef?.type?.methods ?? {}
        const methodsKeys = Object.keys(methods)
        for (const method of methodsKeys) {
          childrenChanges[`${id}/typeDef/type/methods/${method}`] = {
            ...diffForMethods,
            ...diffForMethods.action === DiffAction.remove ?
              { beforeValue: methods[method] } :
              { afterValue: methods[method] }
          }
        }
        const replacedMethods = diffForType?.beforeValue?.methods ?? {}
        const replacedMethodsKeys = Object.keys(replacedMethods)
        // invert diff if both present
        const diffForReplacedMethods = methodsKeys.length > 0 && replacedMethodsKeys.length > 0 ?
          inverDiffAction(diffForMethods) :
          diffForMethods
        for (const method of replacedMethodsKeys) {
          childrenChanges[`#/methods/${method}`] = {
            ...diffForReplacedMethods,
            ...diffForReplacedMethods!.action === DiffAction.remove ?
              { beforeValue: methods[method] } :
              { afterValue: methods[method] }
          }
        }
      }
      if (isDiff(diffForProps)) {
        // TODO 27.11.24 // Not type safe
        const properties = _fragment?.typeDef?.type?.properties ?? {}
        const propertiesKeys = Object.keys(properties)
        for (const property of propertiesKeys) {
          childrenChanges[`${id}/typeDef/type/properties/${property}`] = {
            ...diffForProps,
            ...diffForProps.action === DiffAction.remove ?
              { beforeValue: properties[property] } :
              { afterValue: properties[property] }
          }
        }
        const replacedProperties = diffForType?.beforeValue?.properties ?? {}
        const replacedPropertiesKeys = Object.keys(replacedProperties)
        // invert diff if both present
        const diffForReplacedProps = propertiesKeys.length > 0 && replacedPropertiesKeys.length > 0 ?
          inverDiffAction(diffForProps) :
          diffForProps
        for (const property of replacedPropertiesKeys) {
          childrenChanges[`#/properties/${property}`] = {
            ...diffForReplacedProps,
            ...diffForReplacedProps!.action === DiffAction.add ?
              { beforeValue: replacedProperties[property] } :
              { afterValue: replacedProperties[property] }
          }
        }
      }
      if (isDiff(diffForItems)) {
        childrenChanges[`${id}/typeDef/type/items`] = diffForItems
      }
      return childrenChanges
    }

    // add/remove some properties/methods
    const typeDef = _fragment.typeDef
    let typeDefElements: Record<PropertyKey, unknown> | undefined = undefined
    let kindOfElements = undefined
    if (isGraphApiInputObjectDefinition(typeDef)) {
      typeDefElements = typeDef.type.properties
      kindOfElements = 'properties'
    }
    if (isGraphApiObjectiveDefinition(typeDef)) {
      typeDefElements = typeDef.type.methods
      kindOfElements = 'methods'
    }
    typeDefElements ??= {}
    const elementsDiffs = typeDefElements[this.metaKey]
    if (isObject(elementsDiffs)) {
      for (const property of Object.keys(typeDefElements)) {
        const diff = elementsDiffs[property]
        if (!isDiff(diff)) { continue }
        childrenChanges[`${id}/typeDef/type/${kindOfElements}/${property}`] = diff
      }
    }

    return childrenChanges
  }

  public simpleDiffMeta(params: JsonSchemaCreateNodeParams<T, K, M>): GraphApiDiffNodeMeta {
    const { id } = params
    let { value } = params

    if (isGraphApiDirective(value)) {
      value = value.definition
    }

    const $metaChanges = this.getPropsChanges(value, graphSchemaNodeMetaProps)
    const $childrenChanges = this.getChildrenChanges(id, value ?? {})
    const $nodeChange = this.getNodeChange(params)

    return {
      // data
      ...pick<any>(value, graphSchemaNodeMetaProps),
      ...resolveDirectiveDeprecated(value),
      // changes
      ...$nodeChange
        ? { $nodeChange }
        : {},
      ...Object.keys($metaChanges).length
        ? { $metaChanges }
        : {},
      ...Object.keys($childrenChanges).length
        ? { $childrenChanges }
        : {},
      $nodeChangesSummary: new Set<DiffType>(),
      _fragment: value,
    }
  }

  public nestedDiffMeta(params: JsonSchemaCreateNodeParams<T, K, M>): GraphApiDiffNodeMeta {
    const { value, id } = params

    const complexityType = getNodeComplexityType(value)
    const nestedChanges: DiffRecord = value?.typeDef?.type?.[complexityType]?.[this.metaKey] ?? {}

    const $nestedChanges: DiffRecord = {}
    for (const nested of objectKeys(nestedChanges)) {
      $nestedChanges[`${id}/typeDef/type/${complexityType}/${nested.toString()}`] = nestedChanges[nested]
    }
    const $nodeChange = this.getNodeChange(params)
    const $metaChanges = this.getPropsChanges(value, ['args'])

    return {
      ...Object.keys($nestedChanges).length
        ? { $nestedChanges }
        : {},
      ...$nodeChange
        ? { $nodeChange }
        : {},
      ...Object.keys($metaChanges).length
        ? { $metaChanges }
        : {},
      $nodeChangesSummary: new Set<DiffType>(),
      ...(isBrokenRef(value) ? { brokenRef: value.$ref } : {}),
      _fragment: value,
    }
  }

  public createNodeValue(params: JsonSchemaCreateNodeParams<T, K, M>): T {
    const { value } = params
    if (value === undefined || value === null) {
      // return null as T
      throw new Error(`[GraphAPI][Diff] Provided value is empty. Value = ${value}`)
    }
    if (!isObject(value)) {
      return value as T
    }
    /*
      FIXME 02.09.24
       This filtering is temporarily necessary
       because of separating props to "value" and "meta" in tree
       and because of "properties" and "items" which must be hidden
    */
    // directive usage
    if (isGraphApiDirective(value)) {
      const definitionChanges = this.getPropsChanges(value.definition, graphSchemaNodeValueProps)
      // remark: this is not the same that $metaChanges is
      const metaChanges = this.getPropsChanges(value, ['meta'])
      const $changes = { ...definitionChanges, ...metaChanges }
      return {
        ...pick<any>(value.definition, graphSchemaNodeValueProps),
        ...value.meta ? { meta: value.meta } : {},
        ...Object.keys($changes).length ? { $changes } : {},
      } as T
    }

    let sourceValue: GraphApiAnyDefinition | GraphApiListDefinition | undefined
    if (isGraphApiAnyDefinition(value)) {
      sourceValue = value
    } else if (
      isObject(value.typeDef) && (
        isGraphApiAnyDefinition(value.typeDef) ||
        isGraphApiListDefinition(value.typeDef)
      )
    ) {
      sourceValue = value.typeDef
    }
    if (sourceValue) {
      const isNotUnionItem = (sourceValue as unknown) !== value
      const currentType = sourceValue.type.kind
      const valueDiffs = isObject(sourceValue) ? sourceValue[this.metaKey] : undefined
      let diffForFieldType: DiffReplace | undefined = undefined
      if (isObject(valueDiffs) && 'type' in valueDiffs) {
        if (isDiff(valueDiffs.type) && isDiffReplace(valueDiffs.type)) {
          const diff = valueDiffs.type
          diffForFieldType = { ...diff }
        }
        if (
          diffForFieldType &&
          isObject(diffForFieldType.beforeValue) &&
          isGraphApiNodeType(diffForFieldType.beforeValue.kind)
        ) {
          const previousType: GraphSchemaNodeType = diffForFieldType.beforeValue.kind
          diffForFieldType.beforeValue = previousType
          diffForFieldType.afterValue = currentType
        }
      }
      const $changes = this.getPropsChanges(sourceValue, graphSchemaNodeValueProps)
      const totalChanges: DiffNodeValue = {
        ...isNotUnionItem ? { $changes: this.getPropsChanges(value, graphSchemaNodeValueProps) } : {},
        ...Object.keys($changes).length ? { $changes } : {},
      }
      // directive arg specific
      let directiveUsageArgValue
      let diffForDirectiveUsageArgument
      if (
        params.parent?.kind === graphSchemaNodeKind.args &&
        params.parent?.parent?.kind === graphSchemaNodeKind.directiveUsage
      ) {
        const directiveUsageValue = params.parent.parent.value() as any
        directiveUsageArgValue = directiveUsageValue?.meta?.[params.key!]
        diffForDirectiveUsageArgument = directiveUsageValue?.$changes?.meta?.[params.key!]
      }
      // ---
      if (diffForFieldType) {
        totalChanges.$changes ??= {}
        totalChanges.$changes.type = diffForFieldType
      }
      if (diffForDirectiveUsageArgument) {
        totalChanges.$changes ??= {}
        totalChanges.$changes.value = diffForDirectiveUsageArgument
      }
      // @ts-expect-error // TODO // 29.10.24 // wrong types
      return {
        ...isNotUnionItem ? pick<any>(value, graphSchemaNodeValueProps) : {},
        ...pick<any>(sourceValue, graphSchemaNodeValueProps),
        type: currentType,
        ...resolveEnumValues(value.typeDef, valueDiffs),
        ...directiveUsageArgValue !== undefined ? { value: directiveUsageArgValue } : {},
        ...totalChanges,
      } as T
    }

    const $changes = this.getPropsChanges(value, graphSchemaNodeValueProps)
    return {
      ...pick<any>(value, graphSchemaNodeValueProps),
      ...Object.keys($changes).length ? { $changes } : {},
    } as T
  }

  public createGraphSchemaNode(
    params: JsonSchemaCreateNodeParams<T, K, M>
  ): CreateNodeResult<IModelTreeNode<T, K, M>> {
    return this.createJsonSchemaNode(params)
  }

  protected getPropsChanges(_value: any, props: readonly string[]) {
    const changes: DiffRecord = {}
    const scanned: Set<unknown> = new Set()
    syncCrawl(_value, ({ value, path }) => {
      // exit if we found loop
      if (scanned.has(value)) {
        return { done: true }
      }
      scanned.add(value)

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
        // <! Attention !> Order of this instructions is IMPORTANT
        const changePath = [...path, key]
        const transformedChangePath = this.transformPathForDeprecation(changePath)
        const change = _changes[key]
        let transformedChange = this.transformChangeForDeprecation(changePath, change)
        const [changeEnum, changeEnumPath] = this.extractChangeForEnumValues(transformedChangePath, transformedChange) ?? []
        if (changeEnum && changeEnumPath) {
          setValueByPath(changes, changeEnum, ...changeEnumPath)
          continue
        }
        transformedChange = this.transformChangeForType(transformedChangePath, transformedChange)
        setValueByPath(changes, transformedChange, ...transformedChangePath)
      }
    })

    return changes
  }

  private transformChangeForDeprecation(path: JsonPath, change: Diff | DiffMetaRecord): Diff | DiffMetaRecord {
    if (path.length < 2) {
      return change
    }
    if (!isDiff(change)) {
      return change
    }
    const pathWithUtils = new PathUtils(path)
    if (pathWithUtils.endsWith(['directives', 'deprecated'])) {
      if (isDiffAdd(change)) {
        return {
          ...change,
          afterValue: (change.afterValue as GraphApiDirective)?.meta?.reason,
          afterNormalizedValue: (change.afterValue as GraphApiDirective)?.meta?.reason,
        } as DiffAdd
      }
      if (isDiffRemove(change)) {
        return {
          ...change,
          beforeValue: (change.beforeValue as GraphApiDirective)?.meta?.reason,
          beforeNormalizedValue: (change.beforeValue as GraphApiDirective)?.meta?.reason,
        } as DiffRemove
      }
    }
    return change
  }

  private transformPathForDeprecation(path: JsonPath): JsonPath {
    if (path.length < 2) {
      return path
    }
    const pathUtils = new PathUtils(path)
    // add, remove
    const pathToDirective = ['directives', 'deprecated']
    if (pathUtils.endsWith(pathToDirective)) {
      return [...path.slice(0, path.length - pathToDirective.length), 'deprecationReason']
    }
    // replace
    const pathToReason = [...pathToDirective, 'meta', 'reason']
    if (pathUtils.endsWith(pathToReason)) {
      return [...path.slice(0, path.length - pathToReason.length), 'deprecationReason']
    }
    return path
  }

  private transformChangeForType(path: JsonPath, change: Diff | DiffMetaRecord): Diff | DiffMetaRecord {
    if (path.length === 0) {
      return change
    }
    if (!isDiff(change)) {
      return change
    }
    const pathUtils = new PathUtils(path)
    if (pathUtils.endsWith(['type']) && isDiffReplace(change)) {
      const typeBefore = change.beforeValue
      const typeAfter = change.afterValue
      const isObjectBefore = isObject(typeBefore)
      const isObjectAfter = isObject(typeAfter)
      const kindBefore = isObjectBefore ? typeBefore.kind : undefined
      const kindAfter = isObjectAfter ? typeAfter.kind : undefined

      const newChange = { ...change }
      newChange.beforeValue = kindBefore
      newChange.afterValue = kindAfter

      return newChange
    }
    return change
  }

  private extractChangeForEnumValues(path: JsonPath, change: Diff | DiffMetaRecord): [Diff | DiffMetaRecord, JsonPath] | undefined {
    if (path.length === 0) {
      return undefined
    }
    if (!isDiff(change)) {
      return undefined
    }
    const pathUtils = new PathUtils(path)
    // case: not enum <-> enum
    if (pathUtils.endsWith(['type']) && isDiffReplace(change)) {
      const typeBefore = change.beforeValue
      const typeAfter = change.afterValue
      const valuesBefore = isObject(typeBefore) ? typeBefore.values : undefined
      const valuesAfter = isObject(typeAfter) ? typeAfter.values : undefined

      const valuesChanges: DiffMetaRecord = {}
      if (valuesBefore) {
        Object.entries(valuesBefore).forEach(([enumKey, enumValue]) => {
          valuesChanges[enumKey] = {
            ...change,
            action: DiffAction.remove,
            beforeValue: enumValue,
            afterValue: undefined,
            afterNormalizedValue: undefined,
            afterDeclarationPaths: undefined,
          } as DiffRemove
        })
      }
      if (valuesAfter) {
        Object.entries(valuesAfter).forEach(([enumKey, enumValue]) => {
          valuesChanges[enumKey] = {
            ...change,
            action: DiffAction.add,
            afterValue: enumValue,
            beforeValue: undefined,
            beforeNormalizedValue: undefined,
            beforeDeclarationPaths: undefined,
          } as DiffAdd
        })
      }

      const newPath = [...path.slice(0, path.length - 1), 'values']
      return Object.keys(valuesChanges).length > 0
        ? [valuesChanges, newPath]
        : undefined
    }
    // case: enum values changed by itself
    if (pathUtils.endsWith(['type', 'values', '*'])) {
      const newPath = [...path]
      newPath.splice(newPath.length - 3, 1)
      return Object.keys(change).length > 0 ? [change, newPath] : undefined
    }
    if (pathUtils.endsWith(['type', 'values', '*', 'description']) ||
      pathUtils.endsWith(['type', 'values', '*', 'deprecationReason'])) {
      const newPath = [...path]
      newPath.splice(newPath.length - 4, 1)
      return Object.keys(change).length > 0 ? [change, newPath] : undefined
    }
    return undefined
  }

  protected getNodeChange = (params: JsonSchemaCreateNodeParams<T, K, M>) => {
    const { id, parent = null, container = null } = params
    const inheritedChanges = container?.meta?.$nodeChange ?? parent?.meta.$nodeChange

    const childrenChanges = parent?.meta?.$childrenChanges
    const nestedChanges = container?.meta?.$nestedChanges
    const descendantChanges: NodeChange | undefined = params.kind === 'args'
      ? undefined
      : (childrenChanges?.[id] || nestedChanges?.[id]) as NodeChange

    const isAllDescendantsChanged = this.isAllDescendantsChanged

    return ['add', 'remove'].includes(inheritedChanges?.action ?? '')
      ? inheritedChanges
      : descendantChanges
        ? ({
          ...descendantChanges,
          get depth(): number {
            const allDescendantsChanged = isAllDescendantsChanged(parent, container, childrenChanges, nestedChanges)
            return (parent?.depth ?? 0) + (!allDescendantsChanged && params.newDataLevel ? 1 : 0)
          }
        })
        : undefined
  };
}
