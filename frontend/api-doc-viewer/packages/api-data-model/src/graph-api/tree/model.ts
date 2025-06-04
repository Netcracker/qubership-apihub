import { GraphApiAnyDefinition, GraphApiListDefinition, isGraphApiAnyDefinition, isGraphApiDirective, isGraphApiListDefinition } from '@netcracker/qubership-apihub-graphapi';
import { CreateNodeResult, IModelTreeNode } from '../../abstract/model/types';
import { JsonSchemaCreateNodeParams, JsonSchemaModelTree } from '../../json-schema';
import { getNodeComplexityType, isObject, pick } from '../../utils';
import { graphSchemaNodeKind, graphSchemaNodeMetaProps, graphSchemaNodeValueProps } from '../constants';
import { resolveDirectiveDeprecated, resolveEnumValues } from '../utils';
import { GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta } from './types';

export class GraphApiModelTree<
  T = GraphApiNodeData,
  K extends string = GraphApiNodeKind,
  M extends object = GraphApiNodeMeta
> extends JsonSchemaModelTree<T, K, M> {

  public createNodeMeta(params: JsonSchemaCreateNodeParams<T, K, M>): M {
    const { value } = params

    const complexityType = getNodeComplexityType(value)
    if (complexityType === 'simple') {
      return {
        ...pick<any>(value, graphSchemaNodeMetaProps),
        ...resolveDirectiveDeprecated(value),
        _fragment: value,
      } as M
    } else {
      return { _fragment: value } as M
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
    /*
     FIXME 02.09.24
      This filtering is temporarily necessary
      because of separating props to "value" and "meta" in tree
      and because of "properties" and "items" which must be hidden
    */
    // directive usage
    if (isGraphApiDirective(value)) {
      const observedProps = ['title', 'description']
      return {
        ...pick<any>(value.definition, observedProps),
        ...value.meta ? { meta: value.meta } : {},
      } as T
    }

    let sourceValue: GraphApiAnyDefinition | GraphApiListDefinition | undefined
    if (isGraphApiAnyDefinition(value)) { // union items
      sourceValue = value
    } else if ( // other type usages
      isObject(value.typeDef) && (
        isGraphApiAnyDefinition(value.typeDef) ||
        isGraphApiListDefinition(value.typeDef)
      )
    ) {
      sourceValue = value.typeDef
    }
    if (sourceValue) {
      const isNotUnionItem = (sourceValue as unknown) !== value
      // directive arg specific
      let maybeArgValue
      if (
        params.parent?.kind === graphSchemaNodeKind.args &&
        params.parent?.parent?.kind === graphSchemaNodeKind.directiveUsage
      ) {
        maybeArgValue = (params.parent.parent.value() as any)?.meta?.[params.key!]
      }
      // ---
      return {
        ...isNotUnionItem ? pick<any>(value, graphSchemaNodeValueProps) : {}, // nullable, default
        ...pick<any>(sourceValue, graphSchemaNodeValueProps), // title, description, directives
        type: sourceValue.type.kind,
        ...resolveEnumValues(value.typeDef),
        ...maybeArgValue !== undefined ? { value: maybeArgValue } : {},
      } as T
    }

    const observedProps = ['title', 'description', 'directives']
    return pick<any>(value, observedProps) as T
  }

  public createGraphSchemaNode(
    params: JsonSchemaCreateNodeParams<T, K, M>
  ): CreateNodeResult<IModelTreeNode<T, K, M>> {
    return this.createJsonSchemaNode(params)
  }
}
