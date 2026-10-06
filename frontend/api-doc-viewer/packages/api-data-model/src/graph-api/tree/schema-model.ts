import { modelTreeNodeType, UNKNOWN_TYPE } from "../../abstract/constants";
import { LazyBuildingContext } from "../../abstract/model/model-tree-node.impl";
import { ModelTree } from '../../abstract/model/model-tree.impl';
import { CreateNodeResult, IModelTreeNode } from '../../abstract/model/types';
import { getNodeComplexityType, isObject, pick } from '../../utils';
import { schemaNodeMetaProps, schemaNodeValueProps } from '../constants';
import { isSchemaNodeType } from '../guards';
import { isBrokenRef, isRequired } from '../utils';
import type {
  SchemaCreateNodeParams,
  SchemaNodeKind,
  SchemaNodeMeta,
  SchemaNodeValue
} from './schema-types';
import { SchemaNodeType } from './schema-types';

/**
 * Generic schema-tree base: parses a schema-shaped value using a JSON-Schema-style keyword
 * vocabulary (`type`, `enum`, `minLength`, etc. - see `schemaNodeValueProps`/`schemaNodeMetaProps`
 * in `../constants`). Only consumed by `GraphApiModelTree` (`./model.ts`) today, since GraphQL
 * schemas in this data model are represented through this same keyword-based shape.
 */
export class SchemaModelTree<
  T = SchemaNodeValue,
  K extends string = SchemaNodeKind,
  M extends object = SchemaNodeMeta
> extends ModelTree<T, K, M> {
  constructor(public source: any) {
    super()
  }

  public createNodeMeta(params: SchemaCreateNodeParams<T, K, M>): M {
    const { value, key = '', parent = null } = params
    const required = isRequired(key, parent)
    const brokenRef = isBrokenRef(value) ? { brokenRef: value.$ref } : {}
    const complexityType = getNodeComplexityType(value)
    if (complexityType === 'simple') {
      return {
        ...pick<any>(value, schemaNodeMetaProps),
        required,
        ...brokenRef,
        _fragment: value,
      } as M
    } else {
      return {
        required,
        ...brokenRef,
        _fragment: value,
      } as M
    }
  }

  public createNodeValue(params: SchemaCreateNodeParams<T, K, M>): T {
    const { value } = params
    if (value === undefined || value === null) {
      return null as T
    }
    if (!isObject(value)) {
      return value as T
    }
    const type: SchemaNodeType = isSchemaNodeType(value.type) ? value.type : UNKNOWN_TYPE
    return {
      /*
      FIXME 02.09.24
       This filtering is temporarily necessary
       because of separating props to "value" and "meta" in tree
      */
      ...pick<any>(value, schemaNodeValueProps[type]),
    } as T
  }

  public createSchemaNode(
    params: SchemaCreateNodeParams<T, K, M>,
    lazyBuildingContext?: LazyBuildingContext<any, any, any>,
  ): CreateNodeResult<IModelTreeNode<T, K, M>> {
    const {
      id, kind, key = '', value, parent = null, container = null, newDataLevel = true, isCycle,
    } = params

    if (value === null) {
      const _nodeMeta = this.createNodeMeta(params)
      const _params = {
        parent,
        container,
        meta: _nodeMeta,
        newDataLevel: newDataLevel,
      }
      return {
        node: this.createNode(id, kind, key, isCycle, _params, lazyBuildingContext),
        value: null,
      }
    }

    const result = {
      value,
      node: {},
    } as CreateNodeResult<IModelTreeNode<T, K, M>>

    const complexityType = getNodeComplexityType(value)
    if (complexityType !== modelTreeNodeType.simple) {
      const _nodeMeta = this.createNodeMeta(params)
      const _params = {
        type: complexityType,
        parent,
        container,
        meta: _nodeMeta,
        newDataLevel: newDataLevel,
      }
      result.node = this.createComplexNode(id, kind, key, isCycle, _params, lazyBuildingContext)
    } else {
      const _nodeValue = this.createNodeValue({
        ...params,
        parent,
        container,
      })
      const _nodeMeta = this.createNodeMeta(params)
      const _params = {
        value: _nodeValue,
        meta: _nodeMeta,
        parent,
        container,
        newDataLevel: newDataLevel,
      }
      result.node = this.createNode(id, kind, key, isCycle, _params, lazyBuildingContext)
    }

    return result
  }
}
