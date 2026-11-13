import { syncCrawl } from "@netcracker/qubership-apihub-json-crawl"
import { BuildingServiceLogger, createBuildingServiceLogger } from "../../../loggers"
import { ComplexTreeNodeParams, SimpleTreeNodeParams, TreeNodeComplexityTypes } from "../../../model/abstract/tree/tree-node.interface"
import { OpenApiTree } from "../../../model/openapi/tree/tree.impl"
import { OpenApiTreeNode } from "../../../model/openapi/types/aliases"
import { OpenApiTreeNodeKind, OpenApiTreeNodeKinds, OpenApiTreeNodeKindsList } from "../../../model/openapi/types/node-kind"
import { OpenApiTreeNodeMeta } from "../../../model/openapi/types/node-meta"
import { OpenApiAnyTreeNodeValue } from "../../../model/openapi/types/node-value"
import { OpenApiOperationKeys } from "../../../shared/openapi/types/operation-keys"
import { OpenApiResponseCode } from "../../../shared/openapi/types/response-code"
import { OpenApiTreeBuilderParams } from "../../../shared/openapi/types/tree-builder-params"
import { isObject } from "../../../utilities"
import { NodeId, NodeKey } from "../../../utility-types"
import { AncestorsRegistry } from "../../abstract/json-crawl-entities/state/ancestors-registry"
import { TreeBuilder } from "../../abstract/tree/builder"
import { NodeDataPickFunction } from "../../abstract/tree/node-data/builder"
import { getOpenApiCrawlRules } from "../json-crawl-entities/rules/rules"
import { OpenApiCrawlRule } from "../json-crawl-entities/rules/types"
import { OpenApiTreeCrawlState } from "../json-crawl-entities/state/types"
import { OPENAPI_LOG_PREFIX } from "../shared/log-prefix"
import { OpenApiOperationOrientedSpec, OpenApiSpecTransformer } from "../shared/openapi-spec-transformer"
import { createOpenApiTreeBuildingHooks, OpenApiTreeBuildingNodeParams } from "./building-hooks"
import { OpenApiNodeDataBuilder } from "./node-data/builder"

type SimpleOpenApiTreeNodeParams = SimpleTreeNodeParams<OpenApiAnyTreeNodeValue | null, OpenApiTreeNodeKind, OpenApiTreeNodeMeta>
type ComplexOpenApiTreeNodeParams = ComplexTreeNodeParams<OpenApiAnyTreeNodeValue | null, OpenApiTreeNodeKind, OpenApiTreeNodeMeta>

/**
 * OpenAPI document -> operation-oriented spec -> tree.
 * Design: docs/design/openapi/architecture/data-model-plain.md
 */
export class OpenApiTreeBuilder extends TreeBuilder<OpenApiAnyTreeNodeValue | null, OpenApiTreeNodeKind, OpenApiTreeNodeMeta> {
  public readonly tree: OpenApiTree
  protected readonly source: unknown
  protected readonly operationKeys?: OpenApiOperationKeys
  protected readonly logger: BuildingServiceLogger
  private readonly nodeDataBuilder: OpenApiNodeDataBuilder

  constructor(params: OpenApiTreeBuilderParams) {
    const { source, operationKeys, logger = createBuildingServiceLogger() } = params
    super()
    this.source = source
    this.operationKeys = operationKeys
    this.logger = logger
    this.tree = this.createTree()
    this.nodeDataBuilder = this.createNodeDataBuilder()
  }

  public build(): OpenApiTree {
    if (!isObject(this.source)) {
      return this.tree
    }
    const preparedSource = this.prepareSource()
    this.logger.debug(`${this.logPrefix} Prepared Source:`, preparedSource)
    if (!preparedSource) {
      return this.tree
    }

    const initialState: OpenApiTreeCrawlState = {
      parent: null,
      container: null,
      ancestors: new AncestorsRegistry(),
    }
    const initialRules: OpenApiCrawlRule = getOpenApiCrawlRules(OpenApiTreeNodeKinds.OPERATION)

    const hooks = createOpenApiTreeBuildingHooks({
      source: preparedSource,
      tree: this.tree,
      supportedNodeKinds: OpenApiTreeNodeKindsList,
      createNodeFromRaw: (id, key, kind, complex, params) => this.createNodeFromRaw(id, key, kind, complex, params),
      createNodeParams: (value, parent, container) => ({
        value: this.takeCrawlValue(value),
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
      isSimpleNode: (node) => node.type === TreeNodeComplexityTypes.SIMPLE,
      isComplexNode: (node) => node.type === TreeNodeComplexityTypes.COMPLEX,
      resolveNodeKey: (key) => key,
    })

    syncCrawl<OpenApiTreeCrawlState, OpenApiCrawlRule>(preparedSource, hooks, {
      state: initialState,
      rules: initialRules,
    })
    this.sortResponseCodes()

    return this.tree
  }

  /**
   * Canonical response-code order (`OpenApiResponseCode.compare`) of the response options (nested
   * nodes of the complex `responses`). The spec keeps responses in an object, and JS enumerates
   * integer-like keys (`200`, `500`) before every other key, so ranges (`2XX`) and `default` would
   * otherwise always come after the numeric codes.
   */
  private sortResponseCodes(): void {
    const responses = this.tree.root?.childrenNodes().find(child => child.kind === OpenApiTreeNodeKinds.RESPONSES)
    responses?.sortNestedNodes((a, b) => OpenApiResponseCode.compare(String(a.key), String(b.key)))
  }

  /* Extension points for descendant builders */

  protected get logPrefix(): string {
    return OPENAPI_LOG_PREFIX
  }

  protected createTree(): OpenApiTree {
    return new OpenApiTree()
  }

  protected createNodeDataBuilder(): OpenApiNodeDataBuilder {
    return new OpenApiNodeDataBuilder()
  }

  protected prepareSource(): OpenApiOperationOrientedSpec | null {
    return new OpenApiSpecTransformer(this.logger).transform(this.source, this.operationKeys)
  }

  protected takeCrawlValue(value: unknown): object | null {
    return isObject(value) ? value : null
  }

  /* Atomic builders */

  protected createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: OpenApiTreeNodeKind,
    complex: boolean,
    params: OpenApiTreeBuildingNodeParams,
  ): OpenApiTreeNode | undefined {
    const { parent, container, newDataLevel } = params
    const meta = this.createNodeMeta(key, params)
    if (complex) {
      const complexParams: ComplexOpenApiTreeNodeParams = {
        type: TreeNodeComplexityTypes.COMPLEX,
        parent: this.takeSimpleNode(parent),
        container: this.takeComplexNode(container),
        value: null,
        meta,
        newDataLevel,
      }
      return this.tree.createComplexNode(id, key, kind, false, complexParams)
    }
    const simpleParams: SimpleOpenApiTreeNodeParams = {
      type: TreeNodeComplexityTypes.SIMPLE,
      parent: this.takeSimpleNode(parent),
      container: this.takeComplexNode(container),
      value: this.createNodeValue(key, kind, params),
      meta,
      newDataLevel,
    }
    return this.tree.createSimpleNode(id, key, kind, false, simpleParams)
  }

  protected createNodeMeta(_key: NodeKey, params: OpenApiTreeBuildingNodeParams): OpenApiTreeNodeMeta {
    return this.nodeDataBuilder.createNodeMeta(params.value)
  }

  protected createNodeValue(key: NodeKey, kind: OpenApiTreeNodeKind, params: OpenApiTreeBuildingNodeParams): OpenApiAnyTreeNodeValue | null {
    return this.nodeDataBuilder.createNodeValue(
      kind,
      key,
      params.value,
      ((source, keys) => this.pick(source, keys)) satisfies NodeDataPickFunction,
    )
  }

  protected isSimpleTreeNode(node: OpenApiTreeNode): boolean {
    return node.type === TreeNodeComplexityTypes.SIMPLE
  }

  protected isComplexTreeNode(node: OpenApiTreeNode): boolean {
    return node.type === TreeNodeComplexityTypes.COMPLEX
  }

  private takeSimpleNode(node: OpenApiTreeNode | null): OpenApiTreeNode | null {
    return node && this.isSimpleTreeNode(node) ? node : null
  }

  private takeComplexNode(node: OpenApiTreeNode | null): OpenApiTreeNode | null {
    return node && this.isComplexTreeNode(node) ? node : null
  }
}
