import { ClassLike } from 'main/domain/like/class'
import { LeafPropertyLike } from 'main/domain/like/leaf-property'
import { IncludePropertiesGroupRelationLike } from 'main/domain/like/include-properties-group-relation'
import { PropertyToClassRelationLike } from 'main/domain/like/property-to-class-reference-relation'
import { PropertiesGroupLike } from 'main/domain/like/properties-group'

export type DomainLike = ClassLike | PropertyLike | RelationLike
export type SelectableLike = DomainLike;
export type NavigableLike = DomainLike;

export type RelationLike = IncludePropertiesGroupRelationLike | PropertyToClassRelationLike
export type PropertyLike = LeafPropertyLike | PropertiesGroupLike