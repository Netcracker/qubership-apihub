import { ClassLike } from 'main/domain/like/class'
import { LeafPropertyLike } from 'main/domain/like/leaf-property'
import { OneLineText, Pixel } from 'main/domain/base'
import {
  EdgePath,
  HasGraphItemKey,
  LayoutGraphMeta,
  LocatableEdge,
  LocatableLabel,
  LocatableNode,
  LocatablePort,
} from 'main/graph/common/layout-graph-definition'
import { PropertiesGroupLike } from 'main/domain/like/properties-group'
import { IncludePropertiesGroupRelationLike } from 'main/domain/like/include-properties-group-relation'
import { PropertyToClassRelationLike } from 'main/domain/like/property-to-class-reference-relation'
import { GraphItem } from 'main/graph/common/graph-definition'
import { RelationLike } from 'main/domain/like/all'

export interface ClassView {
  readonly type: typeof VIEW_TYPE_CLASS;
  readonly like: ClassLike;
  readonly cumulativeHeight: Pixel;
  readonly separatorOffsetsFromCenter: Pixel[];
  croppedText: OneLineText
}

export interface VirtualRelation extends HasGraphItemKey {
  readonly like: RelationLike
  readonly path: EdgePath;
}

interface HasRelationView {
  readonly connectedRelations: VirtualRelation[];
}

interface HasOffsetView {
  readonly cumulativeOffsetToCenter: Pixel;
}

export interface LeafPropertyView extends HasOffsetView, HasRelationView {
  readonly type: typeof VIEW_TYPE_LEAF_PROPERTY;
  readonly like: LeafPropertyLike;
  requiredCharacter: OneLineText
  croppedName: OneLineText
  croppedRequiredCharacter: OneLineText
  croppedType: OneLineText
}

export interface PropertiesGroupView extends HasOffsetView, HasRelationView {
  readonly type: typeof VIEW_TYPE_PROPERTIES_GROUP;
  readonly like: PropertiesGroupLike;
  croppedText: OneLineText;
}

export interface IncludePropertiesGroupRelationView {
  readonly type: typeof VIEW_TYPE_GROUP_TO_CLASS_RELATION;
  readonly like: IncludePropertiesGroupRelationLike;

}

export interface PropertyToClassRelationView {
  readonly type: typeof VIEW_TYPE_PROPERTY_TO_CLASS_RELATION;
  readonly like: PropertyToClassRelationLike;

}

export const VIEW_TYPE_CLASS = 'class'
export const VIEW_TYPE_LEAF_PROPERTY = 'leaf-property'
export const VIEW_TYPE_PROPERTIES_GROUP = 'properties-group'
export const VIEW_TYPE_GROUP_TO_CLASS_RELATION = 'group-to-class'
export const VIEW_TYPE_PROPERTY_TO_CLASS_RELATION = 'property-to-class'

export interface ViewMeta extends LayoutGraphMeta {
  readonly node: LocatableNode<ClassView>;
  readonly edge: LocatableEdge<IncludePropertiesGroupRelationView> | LocatableEdge<PropertyToClassRelationView>;
  readonly label: LocatableLabel<ClassView> | LocatableLabel<LeafPropertyView> | LocatableLabel<PropertiesGroupView>;
  readonly port: LocatablePort<ClassView> | LocatablePort<LeafPropertyView> | LocatablePort<PropertiesGroupView>;
}

export type DomainGraphItem<Meta extends ViewMeta> = GraphItem<Meta>
export type DomainView<Meta extends ViewMeta> = DomainGraphItem<Meta>['userObject']