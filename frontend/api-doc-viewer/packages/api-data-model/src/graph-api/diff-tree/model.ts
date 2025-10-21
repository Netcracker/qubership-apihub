import {
  breaking,
  Diff,
  DiffAction,
  DiffAdd,
  DiffMetaRecord,
  DiffRemove,
  DiffReplace,
  DiffType,
  isDiffAdd,
  isDiffRemove,
  isDiffReplace,
} from '@netcracker/qubership-apihub-api-diff'
import {
  GRAPH_API_NODE_KIND_INPUT_OBJECT,
  GRAPH_API_NODE_KIND_INTERFACE,
  GRAPH_API_NODE_KIND_LIST,
  GRAPH_API_NODE_KIND_OBJECT,
  GraphApiAnyDefinition,
  isGraphApiAnyDefinition,
  isGraphApiAnyUsage,
  isGraphApiArgs,
  isGraphApiArgument,
  isGraphApiDirective,
  isGraphApiDirectiveDefinition,
  isGraphApiDirectives,
  isGraphApiEnumDefinition,
  isGraphApiInputObjectDefinition,
  isGraphApiObjectiveDefinition,
  isGraphApiOperation,
  isGraphApiRef
} from '@netcracker/qubership-apihub-graphapi'
import { DiffNodeMeta, DiffNodeValue, DiffRecord, NodeChange } from '../../abstract/diff'
import { LazyBuildingContext } from '../../abstract/model/model-tree-node.impl'
import { CreateNodeResult, IModelTreeNode } from '../../abstract/model/types'
import { isBrokenRef, JsonSchemaCreateNodeParams, JsonSchemaModelDiffTree } from '../../json-schema'
import {
  extendToObject,
  getNodeComplexityType,
  inverDiffAction,
  isDiff,
  isDiffMetaRecord,
  isObject,
  pick,
  setValueByPath
} from '../../utils'
import { graphSchemaNodeKind, graphSchemaNodeMetaProps, graphSchemaNodeValueProps } from '../constants'
import { isGraphApiNodeType } from '../guards'
import { type GraphSchemaNodeKind, type GraphSchemaNodeType } from '../tree/types'
import { resolveDirectiveDeprecated, resolveEnumValues } from '../utils'
import { GraphApiDiffNodeMeta, GraphSchemaDiffNodeValue } from './types'

const OBJECTIVE_KINDS = new Set([
  GRAPH_API_NODE_KIND_OBJECT,
  GRAPH_API_NODE_KIND_INTERFACE,
  GRAPH_API_NODE_KIND_INPUT_OBJECT,
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
          if (!isDiff(diff)) {
            continue
          }
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
              { afterValue: methods[method] },
          }
        }
        const replacedMethods = diffForType?.beforeValue?.methods ?? {}
        const replacedMethodsKeys = Object.keys(replacedMethods)
        // invert diff if both present
        const diffForReplacedMethods = methodsKeys.length > 0 && replacedMethodsKeys.length > 0 ?
          inverDiffAction(diffForMethods) :
          diffForMethods
        for (const method of replacedMethodsKeys) {
          let childrenKey = `${id}/typeDef/type/methods/${method}`
          if (childrenKey in childrenChanges) {
            childrenKey = `${childrenKey}$1`
          }
          childrenChanges[childrenKey] = {
            ...diffForReplacedMethods,
            ...diffForReplacedMethods!.action === DiffAction.remove ?
              { beforeValue: methods[method] } :
              { afterValue: methods[method] },
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
              { afterValue: properties[property] },
          }
        }
        const replacedProperties = diffForType?.beforeValue?.properties ?? {}
        const replacedPropertiesKeys = Object.keys(replacedProperties)
        // invert diff if both present
        const diffForReplacedProps = propertiesKeys.length > 0 && replacedPropertiesKeys.length > 0 ?
          inverDiffAction(diffForProps) :
          diffForProps
        for (const property of replacedPropertiesKeys) {
          let childrenKey = `${id}/typeDef/type/properties/${property}`
          if (childrenKey in childrenChanges) {
            childrenKey = `${childrenKey}$1`
          }
          childrenChanges[`${id}/typeDef/type/properties/${property}`] = {
            ...diffForReplacedProps,
            ...diffForReplacedProps!.action === DiffAction.add ?
              { beforeValue: replacedProperties[property] } :
              { afterValue: replacedProperties[property] },
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
        if (!isDiff(diff)) {
          continue
        }
        childrenChanges[`${id}/typeDef/type/${kindOfElements}/${property}`] = diff
      }
    }

    return childrenChanges
  }

  public simpleDiffMeta(params: JsonSchemaCreateNodeParams<T, K, M>): GraphApiDiffNodeMeta {
    const { id } = params
    const value = params.value as unknown

    const $metaChanges: Partial<DiffRecord> = {}

    this.aggregateDiffsForDirective(value, $metaChanges)
    this.aggregateDiffsFromDirectives(value, $metaChanges)

    const $childrenChanges = this.getChildrenChanges(id, value ?? {})
    const $nodeChange = this.getNodeChange(params)

    return {
      // data
      ...pick<any>(value, graphSchemaNodeMetaProps),
      ...isGraphApiDirective(value) ? pick<any>(value.definition, graphSchemaNodeMetaProps) : {},
      ...resolveDirectiveDeprecated(value),
      // changes
      ...$nodeChange
        ? { $nodeChange }
        : {},
      ...Object.keys($metaChanges).length
        ? { $metaChanges: $metaChanges as DiffRecord } // allowed cast because we checked keys count
        : {},
      ...Object.keys($childrenChanges).length
        ? { $childrenChanges }
        : {},
      $nodeChangesSummary: new Set<DiffType>(),
      _fragment: value,
    }
  }

  private aggregateDiffsForDirective(value: unknown, $metaChanges: Partial<DiffRecord>) {
    let directiveDefinition
    if (isGraphApiDirective(value)) {
      directiveDefinition = value.definition
    } else if (isGraphApiDirectiveDefinition(value)) {
      directiveDefinition = value
    }
    if (directiveDefinition && !isGraphApiRef(directiveDefinition)) {
      // locations
      const untypedLocations = (directiveDefinition?.locations ?? []) as unknown
      const locationsRawChanges =
        isObject(untypedLocations)
          ? untypedLocations[this.metaKey]
          : undefined
      if (isDiffMetaRecord(locationsRawChanges)) {
        for (const [locIndex, locDiff] of Object.entries(locationsRawChanges)) {
          setValueByPath($metaChanges, locDiff, ...['locations', locIndex])
        }
      }
      // repeatable
      const untypedDirectiveDefinition = directiveDefinition as unknown
      const directiveDefinitionRawChanges =
        isObject(untypedDirectiveDefinition)
          ? untypedDirectiveDefinition[this.metaKey]
          : undefined
      if (isDiffMetaRecord(directiveDefinitionRawChanges)) {
        const repeatableDiff = directiveDefinitionRawChanges.repeatable
        repeatableDiff && setValueByPath($metaChanges, repeatableDiff, ...['repeatable'])
      }
    }
  }

  private aggregateDiffsFromDirectives(value: unknown, $metaChanges: Partial<DiffRecord>) {
    if (isGraphApiOperation(value) || isGraphApiArgument(value)) {
      const directives = value.directives ?? {}
      // added/removed deprecation
      const untypedDirectives = extendToObject(directives)
      const directivesRawChanges = untypedDirectives?.[this.metaKey]
      if (isDiffMetaRecord(directivesRawChanges)) {
        const { deprecated: rawChangesForDeprecated, ...otherRawChanges } = directivesRawChanges
        if (rawChangesForDeprecated) {
          const maybeDiff = extendToObject(rawChangesForDeprecated)
          const diff = isDiff(maybeDiff) ? maybeDiff : undefined
          this.remapDeprecationReasonDiff(diff)
          diff && setValueByPath($metaChanges, diff, ...['deprecationReason'])
        }
        if (Object.keys(otherRawChanges).length > 0) {
          setValueByPath($metaChanges, otherRawChanges, ...['directives'])
        }
      }
      // replace deprecation reason
      const usedDirectiveDeprecated = directives.deprecated
      if (usedDirectiveDeprecated) {
        const { meta } = usedDirectiveDeprecated
        if (meta) {
          const untypedMeta = extendToObject(meta)
          const metaRawChanges = untypedMeta?.[this.metaKey]
          if (isDiffMetaRecord(metaRawChanges)) {
            const maybeDiff = extendToObject(metaRawChanges.reason)
            const diff = isDiff(maybeDiff) ? maybeDiff : undefined
            diff && setValueByPath($metaChanges, diff, ...['deprecationReason'])
          }
        }
      }
    }
  }

  public nestedDiffMeta(params: JsonSchemaCreateNodeParams<T, K, M>): GraphApiDiffNodeMeta {
    const { value, id } = params

    const complexityType = getNodeComplexityType(value)
    const nestedChanges: DiffRecord = value?.typeDef?.type?.[complexityType]?.[this.metaKey] ?? {}

    const $nestedChanges: DiffRecord = {}
    for (const nestedId of Object.keys(nestedChanges)) {
      $nestedChanges[`${id}/typeDef/type/${complexityType}/${nestedId}`] = nestedChanges[nestedId]
    }
    const $nodeChange = this.getNodeChange(params)//

    return {
      ...Object.keys($nestedChanges).length
        ? { $nestedChanges }
        : {},
      ...$nodeChange
        ? { $nodeChange }
        : {},
      $nodeChangesSummary: new Set<DiffType>(),
      ...(isBrokenRef(value) ? { brokenRef: value.$ref } : {}),
      _fragment: value,
    }
  }

  public createNodeValue(params: JsonSchemaCreateNodeParams<T, K, M>): T {
    const value = params.value as unknown
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
      // definition changes for fields: title, description
      const definition = extendToObject(value.definition)
      const definitionChanges: Partial<DiffRecord> = {}
      const definitionRawChanges = definition?.[this.metaKey]
      if (isDiffMetaRecord(definitionRawChanges)) {
        ['description'].forEach(field => {
          const diff = definitionRawChanges?.[field]
          diff && setValueByPath(definitionChanges, diff, ...[field])
        })
      }

      const meta = extendToObject(value.meta)
      const metaChanges: Partial<DiffRecord> = {} // isn't the same as field $metaChanges is
      const metaRawChanges = meta?.[this.metaKey]
      if (isDiffMetaRecord(metaRawChanges)) {
        setValueByPath(metaChanges, metaRawChanges, ...['meta'])
      }

      const $changes = { ...definitionChanges, ...metaChanges }
      return {
        ...pick<any>(value.definition, graphSchemaNodeValueProps),
        ...value.meta ? { meta: value.meta } : {},
        ...Object.keys($changes).length ? { $changes } : {},
      } as T
    }

    let typeDefinition: GraphApiAnyDefinition | undefined
    if (isGraphApiAnyDefinition(value)) { // union type item
      typeDefinition = !isGraphApiRef(value) ? value : undefined
    } else if (isGraphApiAnyUsage(value)) { // argument/input property or output
      typeDefinition = !isGraphApiRef(value.typeDef) ? value.typeDef : undefined
    }
    if (typeDefinition) {
      const typeDefinitionAsRawObject = extendToObject(typeDefinition)
      const typeDefinitionRawChanges = typeDefinitionAsRawObject?.[this.metaKey]

      const $changes: Partial<DiffRecord> = {}

      const isNotUnionItem = typeDefinitionAsRawObject !== value

      const currentType = typeDefinition.type.kind

      // common props changed
      if (isNotUnionItem) { // argument/input property or output
        const valueRawChanges = value?.[this.metaKey]
        if (isDiffMetaRecord(valueRawChanges)) {
          ['nullable', 'default', 'description'].forEach(field => {
            const diff = valueRawChanges?.[field]
            diff && setValueByPath($changes, diff, ...[field])
          })
        }
      }

      // any type definition common props changed
      if (isDiffMetaRecord(typeDefinitionRawChanges)) {
        ['title', 'description'].forEach(field => {
          const diff = typeDefinitionRawChanges[field]
          diff && setValueByPath($changes, diff, ...[field])
        })

        // changed node type (e.g. String -> Int)
        let diffForFieldType: DiffReplace | undefined = undefined
        const rawChangeForFieldType = typeDefinitionRawChanges.type
        if (rawChangeForFieldType) {
          if (isDiffReplace(rawChangeForFieldType)) {
            diffForFieldType = { ...rawChangeForFieldType }
          }
          if (
            diffForFieldType &&
            isObject(diffForFieldType.beforeValue) &&
            isGraphApiNodeType(diffForFieldType.beforeValue.kind)
          ) {
            // synthesize diffs for enum values if kind "enum" was replaced by another one or vice versa
            const maybeEnumTypeBefore = diffForFieldType.beforeValue
            const maybeEnumTypeAfter = diffForFieldType.afterValue
            const enumValuesBefore =
              isObject(maybeEnumTypeBefore) && isObject(maybeEnumTypeBefore.values)
                ? maybeEnumTypeBefore.values
                : undefined
            const enumValuesAfter =
              isObject(maybeEnumTypeAfter) && isObject(maybeEnumTypeAfter.values)
                ? maybeEnumTypeAfter.values
                : undefined
            const valuesChanges: DiffMetaRecord = {}
            if (enumValuesBefore) {
              Object.entries(enumValuesBefore).forEach(([enumKey, enumValue]) => {
                valuesChanges[enumKey] = {
                  ...diffForFieldType,
                  action: DiffAction.remove,
                  beforeValue: enumValue,
                  afterValue: undefined,
                  afterNormalizedValue: undefined,
                  afterDeclarationPaths: undefined,
                } as DiffRemove
              })
            }
            if (enumValuesAfter) {
              Object.entries(enumValuesAfter).forEach(([enumKey, enumValue]) => {
                valuesChanges[enumKey] = {
                  ...diffForFieldType,
                  action: DiffAction.add,
                  afterValue: enumValue,
                  beforeValue: undefined,
                  beforeNormalizedValue: undefined,
                  beforeDeclarationPaths: undefined,
                } as DiffAdd
              })
            }
            if (Object.keys(valuesChanges).length > 0) {
              setValueByPath($changes, valuesChanges, ...['values'])
            }

            // If any work with raw diff value is finished, update it
            const previousType: GraphSchemaNodeType = diffForFieldType.beforeValue.kind
            diffForFieldType.beforeValue = previousType
            diffForFieldType.afterValue = currentType
          }
        }
        diffForFieldType && setValueByPath($changes, diffForFieldType, ...['type'])
      }

      // specific for enum type definition
      if (isGraphApiEnumDefinition(typeDefinition)) {
        const values = typeDefinition.type.values ?? {}
        // added/removed enum values
        const rawChanges = extendToObject(values)?.[this.metaKey]
        rawChanges && setValueByPath($changes, rawChanges, ...['values'])
        // changed "description" or "deprecation reason" inside enum values
        for (const [enumKey, enumValue] of Object.entries(values)) {
          // description (added/removed/replaced)
          const maybeDiffMetaRecord = extendToObject(enumValue)?.[this.metaKey]
          const diffMetaRecord = isDiffMetaRecord(maybeDiffMetaRecord) ? maybeDiffMetaRecord : undefined
          const maybeDiff = diffMetaRecord?.description as unknown
          const diff = isDiff(maybeDiff) ? maybeDiff : undefined
          diff && setValueByPath($changes, diff, ...['values', enumKey, 'description'])
          // deprecation reason (added/removed)
          const directives = enumValue.directives ?? {}
          const untypedDirectives = extendToObject(directives)
          const maybeDirectivesRawChanges = untypedDirectives?.[this.metaKey]
          if (
            isDiffMetaRecord(maybeDirectivesRawChanges) &&
            'deprecated' in maybeDirectivesRawChanges
          ) {
            const maybeDiff = maybeDirectivesRawChanges.deprecated as unknown
            const diff = isDiff(maybeDiff) ? maybeDiff : undefined
            this.remapDeprecationReasonDiff(diff)
            diff && setValueByPath($changes, diff, ...['values', enumKey, 'deprecationReason'])
          }
          // deprecation reason (replaced)
          const usedDirectiveDeprecated = directives.deprecated
          if (usedDirectiveDeprecated) {
            const { meta } = usedDirectiveDeprecated
            const untypedMeta = extendToObject(meta)
            const maybeMetaRawChanges = untypedMeta?.[this.metaKey]
            if (isDiffMetaRecord(maybeMetaRawChanges)) {
              const maybeDiff = maybeMetaRawChanges.reason as unknown
              const diff = isDiff(maybeDiff) ? maybeDiff : undefined
              diff && setValueByPath($changes, diff, ...['values', enumKey, 'deprecationReason'])
            }
          }
        }
      }

      const diffNodeValue: DiffNodeValue = {
        ...Object.keys($changes).length
          ? { $changes: $changes as DiffRecord } // allowed cast because we checked keys count
          : {},
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
      if (diffForDirectiveUsageArgument) {
        diffNodeValue.$changes ??= {}
        diffNodeValue.$changes.value = diffForDirectiveUsageArgument
      }
      // @ts-expect-error // TODO // 29.10.24 // wrong types
      return {
        ...isNotUnionItem ? pick<any>(value, graphSchemaNodeValueProps) : {},
        ...pick<any>(typeDefinition, graphSchemaNodeValueProps),
        type: currentType,
        ...resolveEnumValues(value.typeDef, typeDefinitionRawChanges),
        ...directiveUsageArgValue !== undefined ? { value: directiveUsageArgValue } : {},
        ...diffNodeValue,
      } as T
    }

    // all changed props in, for example, output node
    let $changes: DiffRecord = {}
    const rawChanges = value[this.metaKey]
    if (isDiffMetaRecord(rawChanges)) {
      $changes = rawChanges
    }

    return {
      ...pick<any>(value, graphSchemaNodeValueProps),
      ...Object.keys($changes).length ? { $changes } : {},
    } as T
  }

  public createGraphSchemaNode(
    params: JsonSchemaCreateNodeParams<T, K, M>,
    lazyBuildingContext?: LazyBuildingContext<any, any, any>,
  ): CreateNodeResult<IModelTreeNode<T, K, M>> {
    return this.createJsonSchemaNode(params, lazyBuildingContext)
  }

  protected getNodeChange = (params: JsonSchemaCreateNodeParams<T, K, M>) => {
    const { id, parent = null, container = null } = params
    const inheritedChanges = container?.meta?.$nodeChange ?? parent?.meta.$nodeChange

    const childrenChanges = parent?.meta?.$childrenChanges
    const nestedChanges = container?.meta?.$nestedChanges
    const descendantChanges: NodeChange | undefined = params.kind === 'args'
      ? undefined
      : (childrenChanges?.[id] || childrenChanges?.[`${id}$1`] || nestedChanges?.[id]) as NodeChange

    const isAllDescendantsChanged = this.isAllDescendantsChanged

    return ['add', 'remove'].includes(inheritedChanges?.action ?? '')
      ? inheritedChanges
      : descendantChanges
        ? ({
          ...descendantChanges,
          get depth(): number {
            const allDescendantsChanged = isAllDescendantsChanged(parent, container, childrenChanges, nestedChanges)
            return (parent?.depth ?? 0) + (!allDescendantsChanged && params.newDataLevel ? 1 : 0)
          },
        })
        : undefined
  }

  private remapDeprecationReasonDiff(diff: Diff | undefined): void {
    if (!diff) {
      return
    }

    if (isDiffAdd(diff)) {
      const afterValue = diff.afterValue
      if (isGraphApiDirective(afterValue)) {
        diff.afterValue = afterValue.meta?.reason
      }
    }
    if (isDiffRemove(diff)) {
      const beforeValue = diff.beforeValue
      if (isGraphApiDirective(beforeValue)) {
        diff.beforeValue = beforeValue.meta?.reason
      }
    }
  }
}
