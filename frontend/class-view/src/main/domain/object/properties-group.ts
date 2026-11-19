import {
  HasDeprecation,
  HasIdentity,
  HasName,
  HasProperties,
  HasPropertyKind,
  PROPERTY_TYPE_GROUP,
} from 'main/domain/object/base'

export interface PropertiesGroupObject<Property> extends HasIdentity, HasName, HasPropertyKind, HasDeprecation, HasProperties<Property> {
  readonly kind: typeof PROPERTY_TYPE_GROUP
}

