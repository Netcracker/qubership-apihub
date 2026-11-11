import { BuildingServiceLogger, createBuildingServiceLogger } from '../../../loggers'
import { TreeNodeComplexityTypes, TreeNodeParams } from '../../../model/abstract/tree/tree-node.interface'
import {
  JAVA_API_SECTION_ORDER,
  JAVA_API_SECTION_TITLES,
  JavaApiTreeNodeValue,
} from '../../../model/javaapi/tree/node-value'
import { JavaApiTree } from '../../../model/javaapi/tree/tree.impl'
import { JavaApiTreeNode } from '../../../model/javaapi/types/aliases'
import { JavaApiTreeNodeKind, JavaApiTreeNodeKinds } from '../../../model/javaapi/types/node-kind'
import { JavaApiTreeNodeMeta } from '../../../model/javaapi/types/node-meta'
import { JAVA_API_LOG_PREFIX } from '../../../shared/javaapi/log-prefix'
import { ClassKey } from '../../../shared/javaapi/types/class-key'
import { JavaApiTreeBuilderParams } from '../../../shared/javaapi/types/tree-builder-params'
import { NodeId, NodeKey } from '../../../utility-types'
import { TreeBuilder } from '../../abstract/tree/builder'
import { JavaApiClassOrientedSpec, JavaApiSpecTransformer } from '../shared/javaapi-spec-transformer'

type JavaApiNodeParams = TreeNodeParams<JavaApiTreeNodeValue | null, JavaApiTreeNodeKind, JavaApiTreeNodeMeta>

/*
 * Builds one class as `class -> section -> member`.
 * The jdiff source is flat, so nodes are created directly instead of crawling the source.
 */
export class JavaApiTreeBuilder extends TreeBuilder<
  JavaApiTreeNodeValue | null,
  JavaApiTreeNodeKind,
  JavaApiTreeNodeMeta
> {
  public readonly tree: JavaApiTree
  protected readonly source: unknown
  protected readonly classKey: ClassKey
  protected readonly logger: BuildingServiceLogger

  constructor(params: JavaApiTreeBuilderParams) {
    const {
      source,
      classKey,
      logger = createBuildingServiceLogger(),
    } = params
    super()
    this.source = source
    this.classKey = classKey
    this.logger = logger
    this.tree = new JavaApiTree()
  }

  public build(): JavaApiTree {
    const spec = this.prepareSource()
    if (!spec) {
      return this.tree
    }
    this.logger.debug(`${JAVA_API_LOG_PREFIX} Prepared Source:`, spec)

    const classNode = this.createNode('#', spec.classValue.className, JavaApiTreeNodeKinds.CLASS, {
      value: spec.classValue,
      parent: null,
      container: null,
      newDataLevel: true,
    })

    JAVA_API_SECTION_ORDER.forEach(section => {
      const members = spec.sections.get(section)
      if (!members?.length) {
        return
      }
      const sectionId = `#/${section}`
      const sectionNode = this.createNode(sectionId, section, JavaApiTreeNodeKinds.SECTION, {
        value: { section, title: JAVA_API_SECTION_TITLES[section] },
        parent: classNode,
        container: null,
        newDataLevel: true,
      })
      classNode.addChildNode(sectionNode)

      members.forEach((member, position) => {
        const memberNode = this.createNode(`${sectionId}/${position}`, member.signature, JavaApiTreeNodeKinds.MEMBER, {
          value: member,
          parent: sectionNode,
          container: null,
          newDataLevel: true,
        })
        sectionNode.addChildNode(memberNode)
      })
    })

    return this.tree
  }

  protected prepareSource(): JavaApiClassOrientedSpec | null {
    return new JavaApiSpecTransformer(this.logger).transformSourceToClassOrientedSpec(this.source, this.classKey)
  }

  private createNode(id: NodeId, key: NodeKey, kind: JavaApiTreeNodeKind, params: JavaApiNodeParams): JavaApiTreeNode {
    return this.createNodeFromRaw(id, key, kind, false, params)
  }

  /* Atomic builders */

  protected createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: JavaApiTreeNodeKind,
    _complex: boolean,
    params: JavaApiNodeParams,
  ): JavaApiTreeNode {
    return this.tree.createSimpleNode(id, key, kind, false, {
      type: TreeNodeComplexityTypes.SIMPLE,
      parent: params.parent,
      container: params.container,
      value: this.createNodeValue(key, kind, params),
      meta: this.createNodeMeta(),
      newDataLevel: params.newDataLevel,
    }) as JavaApiTreeNode
  }

  protected createNodeMeta(): JavaApiTreeNodeMeta {
    return {}
  }

  protected createNodeValue(_key: NodeKey, _kind: string, params: JavaApiNodeParams): JavaApiTreeNodeValue | null {
    return params.value
  }
}
