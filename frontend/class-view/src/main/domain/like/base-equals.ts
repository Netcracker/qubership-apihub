import {
  HasDeprecationLike,
  HasIdentityLike,
  HasNameLike,
  HasPrimaryLike,
  HasPropertyTypeDeprecationLike,
  HasPropertyTypeLike,
  HasReferenceFromGroupToClassLike,
  HasReferenceFromPropertyToClassLike,
  HasRequiredLike,
  HasShapeLike,
} from 'main/domain/like/base'

export function equalsByIdentity(first: HasIdentityLike, second: HasIdentityLike): boolean {
  return first.key === second.key
}

export function equalsByName(first: HasNameLike, second: HasNameLike): boolean {
  return first.name === second.name
}

export function equalsByShape(first: HasShapeLike, second: HasShapeLike): boolean {
  return first.shape === second.shape
}

export function equalsByPropertyType(first: HasPropertyTypeLike, second: HasPropertyTypeLike): boolean {
  return first.propertyType === second.propertyType
}

export function equalsByRequired(first: HasRequiredLike, second: HasRequiredLike): boolean {
  return first.required === second.required
}

export function equalsByDeprecation(first: HasDeprecationLike, second: HasDeprecationLike): boolean {
  return first.deprecated === second.deprecated
}

export function equalsByPropertyTypeDeprecation(first: HasPropertyTypeDeprecationLike, second: HasPropertyTypeDeprecationLike): boolean {
  return first.propertyTypeDeprecated === second.propertyTypeDeprecated
}

export function equalsByPrimary(first: HasPrimaryLike, second: HasPrimaryLike): boolean {
  return first.primary === second.primary
}

export function equalsByReferenceFromGroupToClass(first: HasReferenceFromGroupToClassLike, second: HasReferenceFromGroupToClassLike): boolean {
  return first.includedClass.key === second.includedClass.key
    && first.propertyGroup.key === second.propertyGroup.key
}

export function equalsByHasReferenceFromPropertyToClass(first: HasReferenceFromPropertyToClassLike, second: HasReferenceFromPropertyToClassLike): boolean {
  return first.referenceClass.key === second.referenceClass.key
    && first.leafProperty.key === second.leafProperty.key
}
