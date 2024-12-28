/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ContentLike } from 'main/domain/like/content'
import { GraphMergerImpl } from 'main/graph/common/graph-merger'
import { DIRTY_STATE_NONE, DirtyState, mergeDirtyState } from 'main/graph/common/dirty-state'
import { Integer, Optional, Pixel, Point } from 'main/domain/base'
import { DomainLike, PropertyLike, RelationLike } from 'main/domain/like/all'
import { ClassLike } from 'main/domain/like/class'
import { LeafPropertyLike } from 'main/domain/like/leaf-property'
import {
  compositeModificationAppliers,
  GraphItem,
  GraphMergerSession,
  MergeResult,
  ModificationAppliers,
} from 'main/graph/common/graph-definition'
import { isDefine } from 'main/core/utils'
import {
  ClassView,
  DomainGraphItem,
  IncludePropertiesGroupRelationView,
  LeafPropertyView,
  PropertiesGroupView,
  PropertyToClassRelationView,
  VIEW_TYPE_CLASS,
  VIEW_TYPE_GROUP_TO_CLASS_RELATION,
  VIEW_TYPE_LEAF_PROPERTY,
  VIEW_TYPE_PROPERTIES_GROUP,
  VIEW_TYPE_PROPERTY_TO_CLASS_RELATION,
  ViewMeta,
  VirtualRelation,
} from 'main/graph/view-definition'
import {
  LIKE_TYPE_CLASS,
  LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION,
  LIKE_TYPE_LEAF_PROPERTY,
  LIKE_TYPE_PROPERTY_GROUP,
  LIKE_TYPE_PROPERTY_TO_CLASS_RELATION,
} from 'main/domain/like/type'
import {
  EdgePath,
  EdgeViewModificationAppliers,
  GraphItemKey,
  LabelViewModificationAppliers,
  NodeViewModificationAppliers,
  PortViewModificationAppliers,
} from 'main/graph/common/layout-graph-definition'
import {
  classLabelCropApplierFactory,
  classLabelDirtyStatusApplierFactory,
  classLabelSizeAndLocationApplierFactory,
  classNodeDirtyStatusApplierFactory,
  classNodeSizeApplierFactory,
  classPortDirtyStatusApplierFactory,
  classPortSizeAndLocationApplierFactory,
} from 'main/graph/class-appliers'
import { UpdateDirtyState } from 'main/graph/appliers-common'
import {
  leafPropertyLabelCropApplierFactory,
  leafPropertyLabelDirtyStatusApplierFactory,
  leafPropertyLabelSizeAndLocationApplierFactory,
  leafPropertyPortDirtyStatusApplierFactory,
  leafPropertyPortSizeAndLocationApplierFactory,
} from 'main/graph/leaf-property-appliers'
import {
  propertiesGroupLabelCropApplierFactory,
  propertiesGroupLabelDirtyStatusApplierFactory,
  propertiesGroupLabelSizeAndPositionApplierFactory,
  propertiesGroupPortDirtyStatusApplierFactory,
  propertiesGroupPortSizeAndLocationApplierFactory,
} from 'main/graph/properties-group-appliers'
import { includePropertiesEdgeDirtyStatusApplierFactory } from 'main/graph/include-reference-appliers'
import { propertyReferenceEdgeDirtyStatusApplierFactory } from 'main/graph/property-reference-appliers'
import { PropertiesGroupLike } from 'main/domain/like/properties-group'
import {
  DEFAULT_CLASS_HEADER_HEIGHT,
  DEFAULT_CLASS_MARGIN_BOTTOM,
  DEFAULT_CLASS_SPLITTER_PADDING_BOTTOM,
  DEFAULT_CLASS_SPLITTER_PADDING_TOP,
  DEFAULT_LEAF_PROPERTY_LINE_HEIGHT,
  DEFAULT_LEAF_PROPERTY_REQUIRED_CHARACTER,
  DEFAULT_LEAF_PROPERTY_SEPARATOR_LENGTH,
  DEFAULT_PROPERTIES_GROUP_ICON_SIZE,
  DEFAULT_PROPERTIES_GROUP_SPLITTER_PADDING_BOTTOM,
  DEFAULT_PROPERTIES_GROUP_SPLITTER_PADDING_TOP,
  DEFAULT_PROPERTIES_GROUP_TITLE_HEIGHT,
  DEFAULT_PROPERTIES_GROUP_TITLE_TO_CHILDREN_SEPARATOR_LENGTH,
} from 'main/defaults'
import { PropertyToClassRelationLike } from 'main/domain/like/property-to-class-reference-relation'
import { IncludePropertiesGroupRelationLike } from 'main/domain/like/include-properties-group-relation'
import { TextService } from 'main/graph/common/text-service'
import { ListMultimap } from 'main/core/list-multimap'

export function resolveGraphItems<Meta extends ViewMeta>(br: BuildResult<Meta>, domainLikes: DomainLike[]): DomainGraphItem<Meta>[] {
  return domainLikes.flatMap(like => br.resolveGraphItem(like))
}

export interface BuildResult<Meta extends ViewMeta> {
  readonly dirtyState: DirtyState;
  readonly createdCount: Integer;
  readonly updatedCount: Integer;
  readonly removedCount: Integer;

  resolveGraphItem(like: DomainLike): DomainGraphItem<Meta>[]
}

export interface GraphBuilder<Meta extends ViewMeta> {
  buildGraph(content: ContentLike): BuildResult<Meta>
}

export class GraphBuilderImpl<Meta extends ViewMeta> implements GraphBuilder<Meta> {
  private readonly _merger: GraphMergerImpl<Meta>

  private readonly _classNodeModificationAppliers: NodeViewModificationAppliers<Meta, ClassView>
  private readonly _classPortModificationAppliers: PortViewModificationAppliers<Meta, ClassView>
  private readonly _classLabelModificationAppliers: LabelViewModificationAppliers<Meta, ClassView>

  private readonly _leafPropertyLabelModificationAppliers: LabelViewModificationAppliers<Meta, LeafPropertyView>
  private readonly _leafPropertyPortModificationAppliers: PortViewModificationAppliers<Meta, LeafPropertyView>

  private readonly _propertiesGroupLabelModificationAppliers: LabelViewModificationAppliers<Meta, PropertiesGroupView>
  private readonly _propertiesGroupPortModificationAppliers: PortViewModificationAppliers<Meta, PropertiesGroupView>

  private readonly _includeModificationAppliers: EdgeViewModificationAppliers<Meta, IncludePropertiesGroupRelationView>
  private readonly _referenceModificationAppliers: EdgeViewModificationAppliers<Meta, PropertyToClassRelationView>

  private _lastMergeResult: Optional<MergeResult<Meta>>
  private _lastDirtyState: DirtyState
  private _lastCreatedCount: Integer
  private _lastUpdatedCount: Integer
  private _lastRemovedCount: Integer

  constructor(
    private readonly _graph: Meta['graph'],
    private readonly _textService: TextService,
  ) {
    this._merger = new GraphMergerImpl<Meta>((one, another) => one.localeCompare(another))
    this._lastMergeResult = undefined
    this._lastDirtyState = DIRTY_STATE_NONE
    this._lastCreatedCount = 0
    this._lastUpdatedCount = 0
    this._lastRemovedCount = 0
    const counterApplier: ModificationAppliers<unknown, unknown, unknown> = {
      createApplier: () => this._lastCreatedCount++,
      updateApplier: () => this._lastUpdatedCount++,
      removeApplier: () => this._lastRemovedCount++,
    }

    const updateDirtyState: UpdateDirtyState = value => this._lastDirtyState = mergeDirtyState(this._lastDirtyState, value)
    this._classNodeModificationAppliers = compositeModificationAppliers(counterApplier, classNodeDirtyStatusApplierFactory(updateDirtyState), classNodeSizeApplierFactory())
    this._classPortModificationAppliers = compositeModificationAppliers(counterApplier, classPortDirtyStatusApplierFactory(updateDirtyState), classPortSizeAndLocationApplierFactory())
    this._classLabelModificationAppliers = compositeModificationAppliers(counterApplier, classLabelDirtyStatusApplierFactory(updateDirtyState), classLabelSizeAndLocationApplierFactory(), classLabelCropApplierFactory(this._textService))
    this._leafPropertyLabelModificationAppliers = compositeModificationAppliers(counterApplier, leafPropertyLabelDirtyStatusApplierFactory(updateDirtyState), leafPropertyLabelSizeAndLocationApplierFactory(), leafPropertyLabelCropApplierFactory(this._textService))
    this._leafPropertyPortModificationAppliers = compositeModificationAppliers(counterApplier, leafPropertyPortDirtyStatusApplierFactory(updateDirtyState), leafPropertyPortSizeAndLocationApplierFactory())
    this._propertiesGroupLabelModificationAppliers = compositeModificationAppliers(counterApplier, propertiesGroupLabelDirtyStatusApplierFactory(updateDirtyState), propertiesGroupLabelSizeAndPositionApplierFactory(), propertiesGroupLabelCropApplierFactory(this._textService))
    this._propertiesGroupPortModificationAppliers = compositeModificationAppliers(counterApplier, propertiesGroupPortDirtyStatusApplierFactory(updateDirtyState), propertiesGroupPortSizeAndLocationApplierFactory())
    this._includeModificationAppliers = compositeModificationAppliers(counterApplier, includePropertiesEdgeDirtyStatusApplierFactory(updateDirtyState))
    this._referenceModificationAppliers = compositeModificationAppliers(counterApplier, propertyReferenceEdgeDirtyStatusApplierFactory(updateDirtyState))
  }

  buildGraph(content: ContentLike): BuildResult<Meta> {
    this._lastDirtyState = DIRTY_STATE_NONE
    this._lastCreatedCount = 0
    this._lastUpdatedCount = 0
    this._lastRemovedCount = 0
    const session = isDefine(this._lastMergeResult) ? this._merger.createEditSession(this._lastMergeResult) : this._merger.createEditSession(this._graph)
    const usedLikePorts: Set<DomainLike> = new Set()
    const propertyRelations: ListMultimap<PropertyLike, RelationLike> = new ListMultimap()
    const add = usedLikePorts.add.bind(usedLikePorts)
    const has = usedLikePorts.has.bind(usedLikePorts)
    const pair = propertyRelations.set.bind(propertyRelations)
    const fetchRelations = propertyRelations.get.bind(propertyRelations)
    content.relations.forEach(rel => this.buildRelation(session, rel, add, pair))
    content.classes.forEach(cl => this.buildClass(session, cl, has, fetchRelations))
    const mergeResult = this._lastMergeResult = session.commit()
    const resolveGraphItem: (like: DomainLike) => DomainGraphItem<Meta>[] = (like) => {
      switch (like.type) {
        case LIKE_TYPE_CLASS:
          return GraphBuilderImpl.notNullArray(
            mergeResult.resolveItem(this.classGraphKeyNode(like)),
            mergeResult.resolveItem(this.classGraphKeyLabel(like)),
            mergeResult.resolveItem(this.classGraphKeyPort(like)),
          )
        case LIKE_TYPE_LEAF_PROPERTY:
          return GraphBuilderImpl.notNullArray(
            mergeResult.resolveItem(this.leafPropertyGraphKeyLabel(like)),
            mergeResult.resolveItem(this.leafPropertyGraphKeyPort(like)),
          )
        case LIKE_TYPE_PROPERTY_GROUP:
          return GraphBuilderImpl.notNullArray(
            mergeResult.resolveItem(this.propertiesGroupGraphKeyLabel(like)),
            mergeResult.resolveItem(this.propertiesGroupGraphKeyPort(like)),
          )
        case LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION:
          return GraphBuilderImpl.notNullArray(
            mergeResult.resolveItem(this.includePropertiesGroupGraphKeyEdge(like)),
          )
        case LIKE_TYPE_PROPERTY_TO_CLASS_RELATION:
          return GraphBuilderImpl.notNullArray(
            mergeResult.resolveItem(this.propertyToClassGraphKeyEdge(like)),
          )
      }
    }
    return {
      dirtyState: this._lastDirtyState,
      createdCount: this._lastCreatedCount,
      updatedCount: this._lastUpdatedCount,
      removedCount: this._lastRemovedCount,
      resolveGraphItem: resolveGraphItem,
    }
  }

  private buildClass(session: GraphMergerSession<Meta>, cl: ClassLike, isLikePortUsed: (like: DomainLike) => boolean, resolvePropertyRelations: (like: PropertyLike) => RelationLike[]) {
    const separatorOffsetsFromTop: Pixel[] = []
    const view: ClassView = {
      type: VIEW_TYPE_CLASS,
      like: cl,
      cumulativeHeight: 0,
      separatorOffsetsFromCenter: [],
      croppedText: cl.name,
    }
    session.node(view, this.classGraphKeyNode(cl), this._classNodeModificationAppliers)
    session.label(view, this.classGraphKeyLabel(cl), this.classGraphKeyNode(cl), cl.name, this._classLabelModificationAppliers)
    if (isLikePortUsed(cl)) {
      session.port(view, this.classGraphKeyPort(cl), this.classGraphKeyNode(cl), this._classPortModificationAppliers)
    }
    let cumulativeOffsetToStart = DEFAULT_CLASS_HEADER_HEIGHT + (cl.properties.length ? DEFAULT_CLASS_SPLITTER_PADDING_BOTTOM : -DEFAULT_CLASS_SPLITTER_PADDING_TOP)
    if (cl.properties.length)
      separatorOffsetsFromTop.push(DEFAULT_CLASS_HEADER_HEIGHT)
    cl.properties.forEach((prp, index, array) => cumulativeOffsetToStart = this.buildProperty(session, prp, cl, cumulativeOffsetToStart, isLikePortUsed, resolvePropertyRelations, array.length - 1 === index, item => separatorOffsetsFromTop.push(item)))
    cumulativeOffsetToStart += DEFAULT_CLASS_MARGIN_BOTTOM
    Object.assign(view, {
      cumulativeHeight: cumulativeOffsetToStart,
      separatorOffsetsFromCenter: separatorOffsetsFromTop.map(offsetFromTop => -cumulativeOffsetToStart / 2.0 + offsetFromTop),
    })
  }

  private resolveConnectedRelationsPaths(prp: PropertyLike, resolvePropertyRelations: (like: PropertyLike) => RelationLike[]): VirtualRelation[] {
    return resolvePropertyRelations(prp)
      .flatMap<VirtualRelation>(rel => {
        if (rel.primary) {
          let edge: Optional<GraphItem<ViewMeta>> = undefined
          switch (rel.type) {
            case LIKE_TYPE_PROPERTY_TO_CLASS_RELATION:
              edge = this._lastMergeResult?.resolveItem(this.propertyToClassGraphKeyEdge(rel))
              break
            case LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION:
              edge = this._lastMergeResult?.resolveItem(this.includePropertiesGroupGraphKeyEdge(rel))
              break
          }
          if (isDefine(edge) && this._graph.isEdge(edge)) {
            return [
              {
                id: edge.id,
                like: rel,
                path: this._graph.getAbsoluteEdgePath(edge),
              } satisfies VirtualRelation,
            ]
          } else {
            return []
          }
        } else {
          let targetPort: Optional<GraphItem<ViewMeta>> = undefined
          let sourcePort: Optional<GraphItem<ViewMeta>> = undefined
          let key: Optional<GraphItemKey> = undefined
          switch (prp.type) {
            case LIKE_TYPE_LEAF_PROPERTY:
              sourcePort = this._lastMergeResult?.resolveItem(this.leafPropertyGraphKeyPort(prp))
              break
            case LIKE_TYPE_PROPERTY_GROUP:
              sourcePort = this._lastMergeResult?.resolveItem(this.propertiesGroupGraphKeyPort(prp))
              break
          }
          switch (rel.type) {
            case LIKE_TYPE_PROPERTY_TO_CLASS_RELATION:
              key = this.propertyToClassGraphKeyEdge(rel)
              targetPort = this._lastMergeResult?.resolveItem(this.classGraphKeyPort(rel.referenceClass))
              break
            case LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION:
              key = this.includePropertiesGroupGraphKeyEdge(rel)
              targetPort = this._lastMergeResult?.resolveItem(this.classGraphKeyPort(rel.includedClass))
              break
          }
          if (isDefine(targetPort) && isDefine(sourcePort) && this._graph.isPort(targetPort) && this._graph.isPort(sourcePort)) {
            const sourcePortCenter = this._graph.getAbsolutePortCenter(sourcePort)
            const sourcePortSize = this._graph.getPortSize(sourcePort)
            const targetPortCenter = this._graph.getAbsolutePortCenter(targetPort)
            const targetPortSize = this._graph.getPortSize(targetPort)
            return [
              {
                id: key,
                like: rel,
                path: this.manhattanPath(
                  { x: sourcePortCenter.x + sourcePortSize.width / 2.0, y: sourcePortCenter.y },
                  { x: targetPortCenter.x - targetPortSize.width / 2.0, y: targetPortCenter.y },
                ),
              } satisfies VirtualRelation]
          } else {
            return []
          }
        }
      })
  }

  private manhattanPath(start: Point<Pixel>, end: Point<Pixel>): EdgePath {
    return [start, {
      x: (start.x + end.x) / 2.0,
      y: start.y,
    }, {
      x: (start.x + end.x) / 2.0,
      y: end.y,
    }, end]
  }

  private buildProperty(session: GraphMergerSession<Meta>, prp: PropertyLike, cl: ClassLike, cumulativeOffsetToStart: Pixel, isLikePortUsed: (like: DomainLike) => boolean, resolvePropertyRelations: (like: PropertyLike) => RelationLike[], isLast: boolean, addSeparator: (offsetFromTop: Pixel) => void): Pixel {
    const resolveConnectedRelations = () => this.resolveConnectedRelationsPaths(prp, resolvePropertyRelations)
    switch (prp.type) {
      case LIKE_TYPE_LEAF_PROPERTY: {
        const requiredCharacter = prp.required ? `${DEFAULT_LEAF_PROPERTY_REQUIRED_CHARACTER} ` : ' '
        const leafView: LeafPropertyView = {
          type: VIEW_TYPE_LEAF_PROPERTY,
          like: prp,
          requiredCharacter: requiredCharacter,
          croppedName: prp.name,
          croppedRequiredCharacter: requiredCharacter,
          croppedType: prp.propertyType,
          cumulativeOffsetToCenter: cumulativeOffsetToStart + (DEFAULT_LEAF_PROPERTY_LINE_HEIGHT / 2.0),
          get connectedRelations(): VirtualRelation[] {
            return resolveConnectedRelations()
          },
        }
        session.label(leafView, this.leafPropertyGraphKeyLabel(prp), this.classGraphKeyNode(cl), `${prp.name}: ${prp.propertyType}`, this._leafPropertyLabelModificationAppliers)
        if (isLikePortUsed(prp)) {
          session.port(leafView, this.leafPropertyGraphKeyPort(prp), this.classGraphKeyNode(cl), this._leafPropertyPortModificationAppliers)
        }
        return cumulativeOffsetToStart + DEFAULT_LEAF_PROPERTY_LINE_HEIGHT + (isLast ? 0 : DEFAULT_LEAF_PROPERTY_SEPARATOR_LENGTH)
      }
      case LIKE_TYPE_PROPERTY_GROUP: {
        const rowHeight = Math.max(DEFAULT_PROPERTIES_GROUP_TITLE_HEIGHT, DEFAULT_PROPERTIES_GROUP_ICON_SIZE)
        const groupView: PropertiesGroupView = {
          type: VIEW_TYPE_PROPERTIES_GROUP,
          like: prp,
          cumulativeOffsetToCenter: cumulativeOffsetToStart + rowHeight / 2.0,
          get connectedRelations(): VirtualRelation[] {
            return resolveConnectedRelations()
          },
          croppedText: prp.name,
        }
        cumulativeOffsetToStart += rowHeight + DEFAULT_PROPERTIES_GROUP_TITLE_TO_CHILDREN_SEPARATOR_LENGTH
        session.label(groupView, this.propertiesGroupGraphKeyLabel(prp), this.classGraphKeyNode(cl), prp.name, this._propertiesGroupLabelModificationAppliers)
        if (isLikePortUsed(prp)) {
          session.port(groupView, this.propertiesGroupGraphKeyPort(prp), this.classGraphKeyNode(cl), this._propertiesGroupPortModificationAppliers)
        }
        prp.properties.forEach((child, index, array) => cumulativeOffsetToStart = this.buildProperty(session, child, cl, cumulativeOffsetToStart, isLikePortUsed, resolvePropertyRelations, array.length - 1 === index, addSeparator))
        if (!isLast) {
          addSeparator(cumulativeOffsetToStart + DEFAULT_PROPERTIES_GROUP_SPLITTER_PADDING_TOP)
          cumulativeOffsetToStart += DEFAULT_PROPERTIES_GROUP_SPLITTER_PADDING_TOP + DEFAULT_PROPERTIES_GROUP_SPLITTER_PADDING_BOTTOM
        }
        return cumulativeOffsetToStart
      }
    }
  }

  private buildRelation(session: GraphMergerSession<Meta>, rel: RelationLike, usedPorts: (used: DomainLike) => void, propertyRelations: (from: PropertyLike, by: RelationLike) => void) {
    switch (rel.type) {
      case LIKE_TYPE_PROPERTY_TO_CLASS_RELATION: {
        if (rel.primary) {
          session.edge({
            type: VIEW_TYPE_PROPERTY_TO_CLASS_RELATION,
            like: rel,
          }, this.propertyToClassGraphKeyEdge(rel), this.leafPropertyGraphKeyPort(rel.leafProperty), this.classGraphKeyPort(rel.referenceClass), this._referenceModificationAppliers)
        }
        propertyRelations(rel.leafProperty, rel)
        usedPorts(rel.referenceClass)
        usedPorts(rel.leafProperty)
        break
      }
      case LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION: {
        if (rel.primary) {
          session.edge({
            type: VIEW_TYPE_GROUP_TO_CLASS_RELATION,
            like: rel,
          }, this.includePropertiesGroupGraphKeyEdge(rel), this.propertiesGroupGraphKeyPort(rel.propertyGroup), this.classGraphKeyPort(rel.includedClass), this._includeModificationAppliers)
        }
        propertyRelations(rel.propertyGroup, rel)
        usedPorts(rel.includedClass)
        usedPorts(rel.propertyGroup)
        break
      }
    }
  }

  private classGraphKeyNode(cl: ClassLike): GraphItemKey {
    return `${cl.key}-node`
  }

  private classGraphKeyLabel(cl: ClassLike): GraphItemKey {
    return `${cl.key}-label`
  }

  private classGraphKeyPort(cl: ClassLike): GraphItemKey {
    return `${cl.key}-port`
  }

  private leafPropertyGraphKeyLabel(prp: LeafPropertyLike): GraphItemKey {
    return `${prp.key}-label`
  }

  private leafPropertyGraphKeyPort(prp: LeafPropertyLike): GraphItemKey {
    return `${prp.key}-port`
  }

  private propertiesGroupGraphKeyLabel(prp: PropertiesGroupLike): GraphItemKey {
    return `${prp.key}-label`
  }

  private propertiesGroupGraphKeyPort(prp: PropertiesGroupLike): GraphItemKey {
    return `${prp.key}-port`
  }

  private propertyToClassGraphKeyEdge(rel: PropertyToClassRelationLike): GraphItemKey {
    return `${rel.leafProperty.key}->${rel.referenceClass.key}`
  }

  private includePropertiesGroupGraphKeyEdge(rel: IncludePropertiesGroupRelationLike): GraphItemKey {
    return `${rel.propertyGroup.key}->${rel.includedClass.key}`
  }

  static notNullArray<T>(...args: Optional<T>[]): T[] {
    return args.filter(value => isDefine(value))
  }
}