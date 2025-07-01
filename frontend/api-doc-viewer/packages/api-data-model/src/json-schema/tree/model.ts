import { ModelTree } from '../../abstract/model/model-tree.impl';
import { CreateNodeResult, IModelTreeNode } from '../../abstract/model/types';
import { UNKNOWN_TYPE, modelTreeNodeType } from "../../abstract/constants";
import { isOpenApiExtensionKey } from '../../oas-extension-key';
import { getNodeComplexityType, isObject, pick, pickByPredicate } from '../../utils';
import { jsonSchemaNodeMetaProps, jsonSchemaNodeValueProps } from '../constants';
import { isJsonSchemaNodeType } from '../guards';
import { isBrokenRef, isRequired } from '../utils';
import { type JsonSchemaCreateNodeParams, type JsonSchemaNodeKind, type JsonSchemaNodeMeta, JsonSchemaNodeType, type JsonSchemaNodeValue } from './types';

export class JsonSchemaModelTree<
  T = JsonSchemaNodeValue,
  K extends string = JsonSchemaNodeKind,
  M extends object = JsonSchemaNodeMeta
> extends ModelTree<T, K, M> {
  public nodes: Map<string, IModelTreeNode<T, K, M>> = new Map();

  constructor(public source: any) {
    super()
  }

  public createNodeMeta(params: JsonSchemaCreateNodeParams<T, K, M>): M {
    const { value, key = '', parent = null } = params
    const required = isRequired(key, parent)
    const brokenRef = isBrokenRef(value) ? { brokenRef: value.$ref } : {}
    const complexityType = getNodeComplexityType(value)
    if (complexityType === 'simple') {
      return {
        ...pick<any>(value, jsonSchemaNodeMetaProps),
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

  public createNodeValue(params: JsonSchemaCreateNodeParams<T, K, M>): T {
    const { value } = params
    if (value === undefined || value === null) {
      return null as T
    }
    if (!isObject(value)) {
      return value as T
    }
    const type: JsonSchemaNodeType = isJsonSchemaNodeType(value.type) ? value.type : UNKNOWN_TYPE
    return {
      /*
      FIXME 02.09.24
       This filtering is temporarily necessary
       because of separating props to "value" and "meta" in tree
      */
      ...pick<any>(value, jsonSchemaNodeValueProps[type]),
      ...pickByPredicate(value, isOpenApiExtensionKey),
    } as T
  }

  public createJsonSchemaNode(params: JsonSchemaCreateNodeParams<T, K, M>): CreateNodeResult<IModelTreeNode<T, K, M>> {
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
        node: this.createNode(id, kind, key, isCycle, _params),
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
      result.node = this.createComplexNode(id, kind, key, isCycle, _params)
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
      result.node = this.createNode(id, kind, key, isCycle, _params)
    }

    return result
  }

  public createNestedNode(id: string, kind: K, key: string | number, value: any, container: any, isCycle: boolean) {
    const res = this.createJsonSchemaNode({ id, kind, key, value, container, parent: container.parent, isCycle })
    container.addNestedNode(res.node)
    return res
  }

  public createChildNode(id: string, kind: K, key: string | number, value: any, parent: any, isCycle: boolean) {
    const res = this.createJsonSchemaNode({ id, kind, key, value, parent, isCycle })
    parent?.addChild(res.node)
    return res
  }
}
