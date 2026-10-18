import { JsonSchemaTree } from "@apihub/next-data-model/model/json-schema/tree/tree.impl"
import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import { JsonSchemaTreeNode } from "@apihub/next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeKind, JsonSchemaTreeNodeKindsList } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeMeta } from "@apihub/next-data-model/model/json-schema/types/node-meta"
import { JsonSchemaTreeBuilderParams } from "@apihub/next-data-model/shared/json-schema/types/tree-builder-params"
import { isJsonSchemaComplexValue, isJsonSchemaPrimitiveNodeValue } from "@apihub/next-data-model/shared/json-schema/guards/schema-value"
import { syncCrawl } from "@netcracker/qubership-apihub-json-crawl"
import {
  ComplexTreeNodeParams,
  ITreeNode,
  SimpleTreeNodeParams,
  TreeNodeComplexityTypes,
} from "../../../model/abstract/tree/tree-node.interface"
import { isObject, isArray } from "../../../utilities"
import { NodeId, NodeKey } from "../../../utility-types"
import { TreeBuilder } from "../../abstract/tree/builder"
import { AncestorsRegistry } from "../../abstract/json-crawl-entities/state/ancestors-registry"
import {
  collectAncestorsFromTree,
  LazyMaterializationState,
} from "../../abstract/tree/lazy-materialization"
import { jsonSchemaHasOwnChildren } from "@apihub/next-data-model/shared/json-schema/has-own-children"
import { BuildingServiceLogger, createBuildingServiceLogger } from "../../../loggers"
import { getJsonSchemaCrawlRules } from "../json-crawl-entities/rules/rules"
import { isPlainCombinerNodeKind } from "./node-visibility-data/kind-combiner"
import { JsonSchemaCrawlRule } from "../json-crawl-entities/rules/types"
import { JsonSchemaTreeCrawlState } from "../json-crawl-entities/state/types"
import { createJsonSchemaTreeBuildingHooks, JsonSchemaTreeBuildingNodeParams } from "./building-hooks"
import { JsonSchemaNodeDataBuilder } from "./node-data/builder"

type SimpleJsonSchemaTreeNodeParams = SimpleTreeNodeParams<
  JsonSchemaTreeNodeStoredValue | null,
  JsonSchemaTreeNodeKind,
  JsonSchemaTreeNodeMeta
>

type ComplexJsonSchemaTreeNodeParams = ComplexTreeNodeParams<
  JsonSchemaTreeNodeStoredValue | null,
  JsonSchemaTreeNodeKind,
  JsonSchemaTreeNodeMeta
>

const JSON_SCHEMA_LOG_PREFIX = "[JSON Schema]"

export class JsonSchemaTreeBuilder extends TreeBuilder<
  JsonSchemaTreeNodeStoredValue | null,
  JsonSchemaTreeNodeKind,
  JsonSchemaTreeNodeMeta
> {
  public readonly tree: JsonSchemaTree
  protected readonly source: unknown
  protected readonly materializeDepth: number | undefined
  protected readonly logger: BuildingServiceLogger
  protected readonly nodeDataBuilder: JsonSchemaNodeDataBuilder
  protected readonly lazyState = new LazyMaterializationState<JsonSchemaCrawlRule>()
  protected crawlHooks: ReturnType<typeof createJsonSchemaTreeBuildingHooks> | null = null

  constructor(params: JsonSchemaTreeBuilderParams) {
    const {
      source,
      materializeDepth,
      logger = createBuildingServiceLogger(),
    } = params

    super()
    this.source = source
    this.materializeDepth = materializeDepth
    this.logger = logger
    this.tree = this.createTree()
    this.nodeDataBuilder = this.createNodeDataBuilder()
  }

  public build(): JsonSchemaTree {
    const preparedSource = this.prepareSource()
    if (!preparedSource || !isObject(preparedSource)) {
      return this.tree
    }

    const initialState: JsonSchemaTreeCrawlState = {
      parent: null,
      container: null,
      ancestors: new AncestorsRegistry(),
      depth: 0,
      materializeDepth: this.materializeDepth,
      pathPrefix: [],
    }

    const initialRules: JsonSchemaCrawlRule = getJsonSchemaCrawlRules()

    this.crawlHooks = createJsonSchemaTreeBuildingHooks({
      source: preparedSource,
      tree: this.tree,
      supportedNodeKinds: JsonSchemaTreeNodeKindsList,
      createNodeFromRaw: (id, key, kind, complex, params) => this.createNodeFromRaw(id, key, kind, complex, params),
      createNodeParams: (value, parent, container, kind) => ({
        value: (isJsonSchemaPrimitiveNodeValue(value)
          ? value
          : isObject(value) && !Array.isArray(value)
            ? value
            : null) as JsonSchemaTreeNodeStoredValue | null,
        // Combiner option nodes (oneOf/anyOf/allOf branches) do not represent their own UI
        // nesting level - the viewer merges an option's title into its owning property's row
        // and renders the option's own structural children one level below the OWNER (see
        // CombinerNodeViewer: selector row and leaf children both render at `level + 1` from
        // the owner, with no separate step for the option itself; nested/stacked combiners
        // collapse onto that same single level too). If this crawl step counted as a data
        // level like every other node, the lazy-materialization depth budget (`materializeDepth`
        // passed by the viewer) would run one level short for anything below a combiner,
        // forcing an "initially expanded" chosen variant to render collapsed because its
        // children array came back empty (see JsonSchemaViewer.tsx for the matching
        // `materializeDepth` derivation from `expandedDepth`).
        newDataLevel: !isPlainCombinerNodeKind(kind),
        parent,
        container,
      }),
      createStateForSimpleNode: (state, node) => ({
        parent: node,
        container: null,
        ancestors: state.ancestors,
        depth: state.depth,
        materializeDepth: state.materializeDepth,
        pathPrefix: state.pathPrefix,
      }),
      createStateForComplexNode: (state, node) => ({
        parent: state.parent,
        container: node,
        ancestors: state.ancestors,
        depth: state.depth,
        materializeDepth: state.materializeDepth,
        pathPrefix: state.pathPrefix,
      }),
      isSimpleNode: (node) => this.isSimpleTreeNode(node),
      isComplexNode: (node) => this.isComplexTreeNode(node),
      resolveNodeKey: (key, value) => this.resolveNodeKey(key, value),
      isDisallowedValue: (value) => value === undefined || value === null,
      shouldSkipNodeCreation: (value) => isArray(value),
      lazy: this.materializeDepth === undefined
        ? undefined
        : {
          state: this.lazyState,
          resolveHasOwnChildren: jsonSchemaHasOwnChildren,
        },
    })

    this.logger.debug(`${this.logPrefix} Building tree from source:`, preparedSource)

    syncCrawl<JsonSchemaTreeCrawlState, JsonSchemaCrawlRule>(
      preparedSource,
      this.crawlHooks,
      {
        state: initialState,
        rules: initialRules,
      },
    )

    return this.tree
  }

  public materializeChildren(node: JsonSchemaTreeNode, depth = 1): void {
    const work = this.lazyState.pending.get(node.id)
    if (!work || !this.crawlHooks) {
      return
    }
    this.lazyState.pending.delete(work.nodeId)

    const rematerializeState: JsonSchemaTreeCrawlState = {
      parent: node,
      container: null,
      ancestors: collectAncestorsFromTree(node, this.lazyState.fragments),
      depth: 0,
      materializeDepth: depth,
      pathPrefix: work.path,
    }

    syncCrawl<JsonSchemaTreeCrawlState, JsonSchemaCrawlRule>(
      work.fragment,
      this.crawlHooks,
      {
        state: rematerializeState,
        rules: work.rules,
      },
      true,
    )
  }

  protected get logPrefix(): string {
    return JSON_SCHEMA_LOG_PREFIX
  }

  protected createTree(): JsonSchemaTree {
    return new JsonSchemaTree()
  }

  protected createNodeDataBuilder(): JsonSchemaNodeDataBuilder {
    return new JsonSchemaNodeDataBuilder((source, keys) => this.pick(source, keys))
  }

  protected prepareSource(): unknown | null {
    if (!isObject(this.source)) {
      return null
    }
    return this.source
  }

  protected createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: JsonSchemaTreeNodeKind,
    complex: boolean,
    params: JsonSchemaTreeBuildingNodeParams,
  ): JsonSchemaTreeNode | undefined {
    const { parent, container, newDataLevel, value } = params
    const isComplex = complex || (isObject(value) && isJsonSchemaComplexValue(value))

    if (isComplex) {
      const nodeMeta = this.createNodeMeta(key, params)
      const extendedParams: ComplexJsonSchemaTreeNodeParams = {
        type: TreeNodeComplexityTypes.COMPLEX,
        parent: this.takeSimpleTreeNode(parent),
        container: this.takeComplexTreeNode(container),
        value: null,
        meta: nodeMeta,
        newDataLevel,
      }
      return this.tree.createComplexNode(id, key, kind, false, extendedParams)
    }

    const nodeValue = this.createNodeValue(key, kind, params)
    const nodeMeta = this.createNodeMeta(key, params)
    const extendedParams: SimpleJsonSchemaTreeNodeParams = {
      type: TreeNodeComplexityTypes.SIMPLE,
      parent: this.takeSimpleTreeNode(parent),
      container: this.takeComplexTreeNode(container),
      value: nodeValue,
      meta: nodeMeta,
      newDataLevel,
    }
    return this.tree.createSimpleNode(id, key, kind, false, extendedParams)
  }

  protected createNodeMeta(
    key: NodeKey,
    params: JsonSchemaTreeBuildingNodeParams,
  ): JsonSchemaTreeNodeMeta {
    const { value, parent } = params
    return this.nodeDataBuilder.buildNodeMeta(value, key, parent, false)
  }

  protected createNodeValue(
    key: NodeKey,
    kind: JsonSchemaTreeNodeKind,
    params: JsonSchemaTreeBuildingNodeParams,
  ): JsonSchemaTreeNodeStoredValue | null {
    const { value } = params
    return this.nodeDataBuilder.createNodeValue(
      kind,
      key,
      value,
      (source, keys) => this.pick(source, keys),
    )
  }

  protected resolveNodeKey(key: NodeKey, value: unknown): NodeKey {
    // `title` must not drive node identity: for $ref-derived values (in particular
    // circular self-references) api-unifier's denormalize() synthesizes `title` from the
    // referenced component name (e.g. "SelfObject"), which would otherwise overwrite the
    // real raw-source property key (e.g. "child"). `title` stays a display-only field on
    // the node value.
    void value
    return key
  }

  protected isSimpleTreeNode(node: ITreeNode<JsonSchemaTreeNodeStoredValue | null, JsonSchemaTreeNodeKind, JsonSchemaTreeNodeMeta>): boolean {
    return node.type === TreeNodeComplexityTypes.SIMPLE
  }

  protected isComplexTreeNode(node: ITreeNode<JsonSchemaTreeNodeStoredValue | null, JsonSchemaTreeNodeKind, JsonSchemaTreeNodeMeta>): boolean {
    return node.type === TreeNodeComplexityTypes.COMPLEX
  }

  protected takeSimpleTreeNode(node: JsonSchemaTreeNode | null): JsonSchemaTreeNode | null {
    return node && this.isSimpleTreeNode(node) ? node : null
  }

  protected takeComplexTreeNode(node: JsonSchemaTreeNode | null): JsonSchemaTreeNode | null {
    return node && this.isComplexTreeNode(node) ? node : null
  }
}
