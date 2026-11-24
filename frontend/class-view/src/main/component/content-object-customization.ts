import { DomainMeta, PropertyObject } from 'main/domain/object/meta'
import { ClassObject } from 'main/domain/object/class'
import {
  OBJECT_TYPE_CLASS,
  OBJECT_TYPE_INCLUDE_PROPERTIES_GROUP,
  OBJECT_TYPE_LEAF_PROPERTY,
  OBJECT_TYPE_PROPERTIES_GROUP,
  OBJECT_TYPE_PROPERTY_TO_CLASS_REFERENCE,
} from 'main/domain/object/type'
import { LeafPropertyObject } from 'main/domain/object/leaf-property'
import { PropertiesGroupObject } from 'main/domain/object/properties-group'
import { IncludePropertiesGroupRelationObject } from 'main/domain/object/include-properties-group-relation'
import { PropertyToClassRelationObject } from 'main/domain/object/property-to-class-reference-relation'

const CUSTOMIZATION_FUNCTION_SUFFIX = 'Function'

type ClassCustomization<
  Meta extends DomainMeta,
  Props extends keyof ClassObject<PropertyObject<Meta>>
> = {
  [Prop in Props as `${typeof OBJECT_TYPE_CLASS}${Capitalize<Prop>}${typeof CUSTOMIZATION_FUNCTION_SUFFIX}`]: (cl: Meta['class']) => ClassObject<PropertyObject<Meta>>[Prop]
}

type LeafPropertyCustomization<
  Meta extends DomainMeta,
  Props extends keyof LeafPropertyObject
> = {
  [Prop in Props as `${typeof OBJECT_TYPE_LEAF_PROPERTY}${Capitalize<Prop>}${typeof CUSTOMIZATION_FUNCTION_SUFFIX}`]: (prp: Meta['leafProperty']) => LeafPropertyObject[Prop]
}

type PropertiesGroupCustomization<
  Meta extends DomainMeta,
  Props extends keyof PropertiesGroupObject<LeafPropertyObject>
> = {
  [Prop in Props as `${typeof OBJECT_TYPE_PROPERTIES_GROUP}${Capitalize<Prop>}${typeof CUSTOMIZATION_FUNCTION_SUFFIX}`]: (group: Meta['propertiesGroup']) => PropertiesGroupObject<LeafPropertyObject>[Prop]
}

type IncludePropertiesGroupRelationCustomization<
  Meta extends DomainMeta,
  Props extends keyof IncludePropertiesGroupRelationObject
> = {
  [Prop in Props as `${typeof OBJECT_TYPE_INCLUDE_PROPERTIES_GROUP}${Capitalize<Prop>}${typeof CUSTOMIZATION_FUNCTION_SUFFIX}`]: (rel: Meta['includeGroupFromClassRelation']) => IncludePropertiesGroupRelationObject[Prop]
}

type PropertyToClassRelationCustomization<
  Meta extends DomainMeta,
  Props extends keyof PropertyToClassRelationObject
> = {
  [Prop in Props as `${typeof OBJECT_TYPE_PROPERTY_TO_CLASS_REFERENCE}${Capitalize<Prop>}${typeof CUSTOMIZATION_FUNCTION_SUFFIX}`]: (rel: Meta['propertyToClassRelation']) => PropertyToClassRelationObject[Prop]
}

export interface ContentObjectCustomization<Meta extends DomainMeta>
//todo turn off all customization. Cause it doesn't need at current moment. Remove excludes one by one on demand
  extends ClassCustomization<Meta, Exclude<keyof ClassObject<PropertyObject<Meta>>, 'key' | 'name' | 'properties' | 'deprecated'>>,
    LeafPropertyCustomization<Meta, Exclude<keyof LeafPropertyObject, 'key' | 'name' | 'kind' | 'propertyType' | 'required' | 'deprecated' | 'propertyTypeDeprecated'>>,
    PropertiesGroupCustomization<Meta, Exclude<keyof PropertiesGroupObject<LeafPropertyObject>, 'key' | 'name' | 'kind' | 'properties' | 'deprecated'>>,
    IncludePropertiesGroupRelationCustomization<Meta, Exclude<keyof IncludePropertiesGroupRelationObject, 'key' | 'kind' | 'primary' | 'includedClassKey' | 'propertyGroupKey'>>,
    PropertyToClassRelationCustomization<Meta, Exclude<keyof PropertyToClassRelationObject, 'key' | 'kind' | 'primary' | 'leafPropertyKey' | 'referenceClassKey'>> {
}