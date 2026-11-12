import { Key, OneLineText, Optional } from 'main/domain/base'
import { ClassObject } from 'main/domain/object/class'
import { LeafPropertyObject } from 'main/domain/object/leaf-property'
import { PropertiesGroupObject } from 'main/domain/object/properties-group'
import { Shape } from 'main/domain/object/shape'

export interface HasIdentity {
  readonly key?: Key;
}

export interface HasName {
  readonly name?: Optional<OneLineText>;
}

export interface HasPropertyType {
  readonly propertyType?: Optional<OneLineText>;
}

export interface HasProperties<Property> {
  readonly properties?: Optional<Property[]>;
}

export interface HasPrimary {
  readonly primary?: boolean;
}

export interface HasRequired {
  readonly required?: boolean;
}

export interface HasDeprecation {
  readonly deprecated?: Optional<boolean>;
}

export interface HasPropertyTypeDeprecation {
  readonly propertyTypeDeprecated?: Optional<boolean>;
}

export interface HasShape {
  readonly shape?: Optional<Shape>;
}

export interface HasReferenceFromGroupToClass {
  readonly includedClassKey?: ClassObject<never>['key'];
  readonly propertyGroupKey?: PropertiesGroupObject<never>['key'];
}

export interface HasReferenceFromPropertyToClass {
  readonly leafPropertyKey?: LeafPropertyObject['key'];
  readonly referenceClassKey?: ClassObject<never>['key'];
}

export interface HasPropertyKind {
  readonly kind: typeof PROPERTY_TYPE_LEAF | typeof PROPERTY_TYPE_GROUP
}

export interface HasReferenceKind {
  readonly kind: typeof RELATION_TYPE_PROPERTY_TO_CLASS_REFERENCE | typeof RELATION_TYPE_INCLUDE_PROPERTIES_GROUP
}

export const PROPERTY_TYPE_LEAF = 'property'
export const PROPERTY_TYPE_GROUP = 'group'

export const RELATION_TYPE_PROPERTY_TO_CLASS_REFERENCE = 'property-to-class-reference'
export const RELATION_TYPE_INCLUDE_PROPERTIES_GROUP = 'include-group'