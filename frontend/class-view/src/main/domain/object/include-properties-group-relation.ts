import {
  HasIdentity,
  HasPrimary,
  HasReferenceFromGroupToClass,
  HasReferenceKind,
  RELATION_TYPE_INCLUDE_PROPERTIES_GROUP,
} from 'main/domain/object/base'

export interface IncludePropertiesGroupRelationObject extends HasIdentity, HasReferenceKind, HasPrimary, HasReferenceFromGroupToClass {
  readonly kind: typeof RELATION_TYPE_INCLUDE_PROPERTIES_GROUP;
}