import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiTree } from "@apihub/next-data-model/model/ddlapi/tree/tree.impl";
import { DdlApiTreeNode } from "@apihub/next-data-model/model/ddlapi/types/aliases";
import { DdlApiTreeNodeKind, DdlApiTreeNodeKindsList } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeMeta } from "@apihub/next-data-model/model/ddlapi/types/node-meta";
import { TableKey } from "@apihub/next-data-model/shared/ddlapi/types/table-key";
import { DdlApiTreeBuilderParams } from "@apihub/next-data-model/shared/ddlapi/types/tree-builder-params";
import { resolveDdlApiIndexNodeKey } from "@apihub/next-data-model/shared/ddlapi/index-title";
import { syncCrawl } from "@netcracker/qubership-apihub-json-crawl";
import { ComplexTreeNodeParams, SimpleTreeNodeParams, TreeNodeComplexityTypes } from "../../../model/abstract/tree/tree-node.interface";
import { isObject } from "../../../utilities";
import { NodeId, NodeKey } from "../../../utility-types";
import { TreeBuilder } from "../../abstract/tree/builder";
import { AncestorsRegistry } from "../../abstract/json-crawl-entities/state/ancestors-registry";
import { NodeDataPickFunction } from "../../abstract/tree/node-data/builder";
import { getDdlApiCrawlRules } from "../json-crawl-entities/rules/rules";
import { DdlApiCrawlRule } from "../json-crawl-entities/rules/types";
import { DdlApiTreeCrawlState } from "../json-crawl-entities/state/types";
import { BuildingServiceLogger, createBuildingServiceLogger } from "../../../loggers";
import { DdlApiSpecTransformer, DdlApiTableOrientedSpec } from "../shared/ddlapi-spec-transformer";
import { createDdlApiTreeBuildingHooks, DdlApiTreeBuildingNodeParams } from "./building-hooks";
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

const DDL_API_LOG_PREFIX = '[DDL API]'

export class DdlApiTreeBuilder extends TreeBuilder<
  DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
  DdlApiTreeNodeKind,
  DdlApiTreeNodeMeta
> {
  public readonly tree: DdlApiTree;
  protected readonly source: unknown;
  protected readonly tableKey: TableKey;
  protected readonly logger: BuildingServiceLogger;
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
    this.tree = this.createTree()
    this.nodeDataBuilder = this.createNodeDataBuilder()
  }

  public build(): DdlApiTree {
    if (!isObject(this.source) && !Array.isArray(this.source)) {
      return this.tree
    }

    const preparedSource = this.prepareSource()

    if (!preparedSource) {
      return this.tree;
    }

    this.logger.debug(`${this.logPrefix} Prepared Source:`, preparedSource)

    const initialState: DdlApiTreeCrawlState = {
      parent: null,
      container: null,
      ancestors: new AncestorsRegistry(),
    }

    const initialRules: DdlApiCrawlRule = getDdlApiCrawlRules()

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
      createStateForSimpleNode: (state, node) => ({
        parent: node,
        container: null,
        ancestors: state.ancestors,
      }),
      createStateForComplexNode: (state, node) => ({
        parent: state.parent,
        container: node,
        ancestors: state.ancestors,
      }),
      isSimpleNode: (node) => this.isSimpleTreeNode(node),
      isComplexNode: (node) => this.isComplexTreeNode(node),
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

  /* Extension points for descendant builders */

  protected get logPrefix(): string {
    return DDL_API_LOG_PREFIX
  }

  protected createTree(): DdlApiTree {
    return new DdlApiTree()
  }

  protected createNodeDataBuilder(): DdlApiNodeDataBuilder {
    return new DdlApiNodeDataBuilder()
  }

  protected prepareSource(): DdlApiTableOrientedSpec | null {
    const specificationTransformer = new DdlApiSpecTransformer(this.logger)
    return specificationTransformer.transformSourceToTableOrientedSpec(this.source, this.tableKey)
  }

  /* Atomic builders */

  protected createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: DdlApiTreeNodeKind,
    complex: boolean,
    params: DdlApiTreeBuildingNodeParams,
  ): DdlApiTreeNode | undefined {
    const { parent, container, newDataLevel } = params

    if (complex) {
      const nodeMeta = this.createNodeMeta(key, params)
      const extendedParams: ComplexDdlApiTreeNodeParams = {
        type: TreeNodeComplexityTypes.COMPLEX,
        parent: this.takeSimpleTreeNode(parent),
        container: this.takeComplexTreeNode(container),
        value: null,
        meta: nodeMeta,
        newDataLevel: newDataLevel,
      }
      return this.tree.createComplexNode(id, key, kind, false, extendedParams)
    }

    const nodeValue = this.createNodeValue(key, kind, params)
    const nodeMeta = this.createNodeMeta(key, params)
    const extendedParams: SimpleDdlApiTreeNodeParams = {
      type: TreeNodeComplexityTypes.SIMPLE,
      parent: this.takeSimpleTreeNode(parent),
      container: this.takeComplexTreeNode(container),
      value: nodeValue,
      meta: nodeMeta,
      newDataLevel: newDataLevel,
    }
    return this.tree.createSimpleNode(id, key, kind, false, extendedParams)
  }

  protected createNodeMeta(
    key: NodeKey,
    params: DdlApiTreeBuildingNodeParams,
  ): DdlApiTreeNodeMeta {
    const { value } = params
    return this.nodeDataBuilder.createNodeMeta(value)
  }

  protected createNodeValue(
    key: NodeKey,
    kind: DdlApiTreeNodeKind,
    params: DdlApiTreeBuildingNodeParams,
  ): DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null {
    const { value } = params

    return this.nodeDataBuilder.createNodeValue(
      kind,
      key,
      value,
      ((source, keys) => this.pick(source, keys)) satisfies NodeDataPickFunction,
    )
  }

  protected resolveNodeKey(key: NodeKey, value: unknown): NodeKey {
    if (!isObject(value)) {
      return key
    }
    if ('columnName' in value && typeof value.columnName === 'string') {
      return value.columnName
    }
    if ('indexName' in value && typeof value.indexName === 'string') {
      return resolveDdlApiIndexNodeKey(key, value)
    }
    return key
  }

  /* Node complexity checks */

  protected isSimpleTreeNode(node: DdlApiTreeNode): boolean {
    return node.type === TreeNodeComplexityTypes.SIMPLE
  }

  protected isComplexTreeNode(node: DdlApiTreeNode): boolean {
    return node.type === TreeNodeComplexityTypes.COMPLEX
  }

  private takeSimpleTreeNode(node: DdlApiTreeNode | null): DdlApiTreeNode | null {
    return node && this.isSimpleTreeNode(node) ? node : null
  }

  private takeComplexTreeNode(node: DdlApiTreeNode | null): DdlApiTreeNode | null {
    return node && this.isComplexTreeNode(node) ? node : null
  }
}
