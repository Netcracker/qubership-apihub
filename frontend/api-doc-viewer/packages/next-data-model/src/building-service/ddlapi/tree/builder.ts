import { DdlApiComplexTreeNode } from "@apihub/next-data-model/model/ddlapi/tree/complex-node.impl";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiSimpleTreeNode } from "@apihub/next-data-model/model/ddlapi/tree/simple-node.impl";
import { DdlApiTree } from "@apihub/next-data-model/model/ddlapi/tree/tree.impl";
import { DdlApiTreeNodeKind, DdlApiTreeNodeKindsList } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeMeta } from "@apihub/next-data-model/model/ddlapi/types/node-meta";
import { TableKey } from "@apihub/next-data-model/shared/ddlapi/types/table-key";
import { DdlApiTreeBuilderParams } from "@apihub/next-data-model/shared/ddlapi/types/tree-builder-params";
import { syncCrawl } from "@netcracker/qubership-apihub-json-crawl";
import { ComplexTreeNodeParams, ITreeNode, SimpleTreeNodeParams, TreeNodeComplexityTypes, TreeNodeParams } from "../../../model/abstract/tree/tree-node.interface";
import { isObject } from "../../../utilities";
import { NodeId, NodeKey } from "../../../utility-types";
import { TreeBuilder } from "../../abstract/tree/builder";
import { NodeDataPickFunction } from "../../abstract/tree/node-data/builder";
import { getDdlApiCrawlRules } from "../json-crawl-entities/rules/rules";
import { DdlApiCrawlRule } from "../json-crawl-entities/rules/types";
import { DdlApiTreeCrawlState } from "../json-crawl-entities/state/types";
import { BuildingServiceLogger, createBuildingServiceLogger } from "../../../loggers";
import { DdlApiSpecTransformer } from "../shared/ddlapi-spec-transformer";
import { createDdlApiTreeBuildingHooks } from "./building-hooks";
import { DdlApiNodeDataBuilder } from "./node-data/builder";

type SimpleDdlApiTreeNodeParams = SimpleTreeNodeParams<
  DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
  DdlApiTreeNodeKind,
  DdlApiTreeNodeMeta
>

type ComplexDdlApiTreeNodeParams = ComplexTreeNodeParams<
  DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
  DdlApiTreeNodeKind,
  DdlApiTreeNodeMeta
>

export class DdlApiTreeBuilder extends TreeBuilder<
  DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
  DdlApiTreeNodeKind,
  DdlApiTreeNodeMeta
> {
  public readonly tree: DdlApiTree;
  private readonly source: unknown;
  private readonly tableKey: TableKey;
  private readonly logger: BuildingServiceLogger;
  private readonly specificationTransformer: DdlApiSpecTransformer;
  private readonly nodeDataBuilder: DdlApiNodeDataBuilder;

  constructor(params: DdlApiTreeBuilderParams) {
    const {
      source,
      tableKey,
      logger = createBuildingServiceLogger(),
    } = params

    super()
    this.source = source
    this.tableKey = tableKey
    this.logger = logger
    this.tree = new DdlApiTree();
    this.specificationTransformer = new DdlApiSpecTransformer(this.logger)
    this.nodeDataBuilder = new DdlApiNodeDataBuilder()
  }

  public build(): DdlApiTree {
    const preparedSource = this.specificationTransformer.transformSourceToTableOrientedSpec(
      this.source,
      this.tableKey,
    )

    if (!preparedSource) {
      return this.tree;
    }

    const initialState: DdlApiTreeCrawlState = {
      parent: null,
      container: null,
      alreadyConvertedValuesCache: new Map(),
    }

    const initialRules: DdlApiCrawlRule = getDdlApiCrawlRules()

    this.logger.debug('[DDL API] Prepared Source:', preparedSource)

    const hooks = createDdlApiTreeBuildingHooks({
      source: preparedSource,
      tree: this.tree,
      supportedNodeKinds: DdlApiTreeNodeKindsList,
      createNodeFromRaw: (id, key, kind, complex, params) => this.createNodeFromRaw(id, key, kind, complex, params),
      createNodeParams: (value, parent, container) => ({
        value: isObject(value) && !Array.isArray(value) ? value : null,
        newDataLevel: true,
        parent,
        container,
      }),
      createStateForSimpleNode: (_state, node, cache) => ({
        parent: node,
        container: null,
        alreadyConvertedValuesCache: cache,
      }),
      createStateForComplexNode: (state, node, cache) => ({
        parent: state.parent,
        container: node,
        alreadyConvertedValuesCache: cache,
      }),
      isSimpleNode: (node): node is DdlApiSimpleTreeNode => this.isDdlApiSimpleTreeNode(node),
      isComplexNode: (node): node is DdlApiComplexTreeNode => this.isDdlApiComplexTreeNode(node),
      resolveNodeKey: (key, value) => this.resolveNodeKey(key, value),
    })

    syncCrawl<DdlApiTreeCrawlState, DdlApiCrawlRule>(
      preparedSource,
      hooks,
      {
        state: initialState,
        rules: initialRules,
      },
    )

    return this.tree;
  }

  private resolveNodeKey(key: NodeKey, value: unknown): NodeKey {
    if (!isObject(value)) {
      return key
    }
    if ('columnName' in value && typeof value.columnName === 'string') {
      return value.columnName
    }
    if ('indexName' in value && typeof value.indexName === 'string') {
      return value.indexName
    }
    return key
  }

  protected createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: DdlApiTreeNodeKind,
    complex: boolean,
    params: TreeNodeParams<object | null, string, object>
  ): DdlApiSimpleTreeNode | DdlApiComplexTreeNode | undefined {
    const { parent, container, newDataLevel } = params

    if (complex) {
      const nodeMeta = this.createNodeMeta(key, params)
      const extendedParams: ComplexDdlApiTreeNodeParams = {
        type: TreeNodeComplexityTypes.COMPLEX,
        parent: parent && this.isDdlApiSimpleTreeNode(parent) ? parent : null,
        container: container && this.isDdlApiComplexTreeNode(container) ? container : null,
        value: null,
        meta: nodeMeta,
        newDataLevel: newDataLevel,
      }
      return this.tree.createComplexNode(id, key, kind, false, extendedParams)
    }

    const nodeValue = this.createNodeValue(key, kind, {
      ...params,
      parent: parent,
      container: container,
    })
    const nodeMeta = this.createNodeMeta(key, params)
    const extendedParams: SimpleDdlApiTreeNodeParams = {
      type: TreeNodeComplexityTypes.SIMPLE,
      parent: parent && this.isDdlApiSimpleTreeNode(parent) ? parent : null,
      container: container && this.isDdlApiComplexTreeNode(container) ? container : null,
      value: nodeValue,
      meta: nodeMeta,
      newDataLevel: newDataLevel,
    }
    return this.tree.createSimpleNode(id, key, kind, false, extendedParams)
  }

  protected createNodeMeta(
    key: NodeKey,
    params: TreeNodeParams<object | null, string, object>,
  ): DdlApiTreeNodeMeta {
    const { value } = params
    return this.nodeDataBuilder.createNodeMeta(value)
  }

  protected createNodeValue(
    key: NodeKey,
    kind: DdlApiTreeNodeKind,
    params: TreeNodeParams<object | null, string, object>,
  ): DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null {
    const { value } = params

    return this.nodeDataBuilder.createNodeValue(
      kind,
      key,
      value,
      ((source, keys) => this.pick(source, keys)) satisfies NodeDataPickFunction,
    )
  }

  private isDdlApiSimpleTreeNode(node: ITreeNode<object | null, string, object>): node is DdlApiSimpleTreeNode {
    return node.type === TreeNodeComplexityTypes.SIMPLE
  }

  private isDdlApiComplexTreeNode(node: ITreeNode<object | null, string, object>): node is DdlApiComplexTreeNode {
    return !this.isDdlApiSimpleTreeNode(node)
  }
}
