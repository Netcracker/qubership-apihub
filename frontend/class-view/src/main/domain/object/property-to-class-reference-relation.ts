import {
  HasIdentity,
  HasPrimary,
  HasReferenceFromPropertyToClass,
  HasReferenceKind,
  RELATION_TYPE_PROPERTY_TO_CLASS_REFERENCE,
} from 'main/domain/object/base'

export interface PropertyToClassRelationObject extends HasIdentity, HasReferenceKind, HasPrimary, HasReferenceFromPropertyToClass {
  readonly kind: typeof RELATION_TYPE_PROPERTY_TO_CLASS_REFERENCE;
}