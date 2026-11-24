import { LIKE_TYPE_PROPERTY_TO_CLASS_RELATION } from 'main/domain/like/type'
import {
  HasIdentityLike,
  HasPrimaryLike,
  HasReferenceFromPropertyToClassLike,
  HasTypeLike,
} from 'main/domain/like/base'
import {
  equalsByHasReferenceFromPropertyToClass,
  equalsByIdentity,
  equalsByPrimary,
} from 'main/domain/like/base-equals'
import { createCustomEqual } from 'fast-equals'
import { IsEqualFunction } from 'main/domain/base'

export interface PropertyToClassRelationLike extends HasIdentityLike, HasTypeLike<typeof LIKE_TYPE_PROPERTY_TO_CLASS_RELATION>, HasPrimaryLike, HasReferenceFromPropertyToClassLike {
}

export const equalsPropertyToClassRelationByLayout: IsEqualFunction<PropertyToClassRelationLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsPropertyToClassRelationLikeByLayoutImpl,
  }),
})

export const equalsPropertyToClassRelationByVisual: IsEqualFunction<PropertyToClassRelationLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsPropertyToClassRelationLikeByVisualImpl,
  }),
})

function equalsPropertyToClassRelationLikeByLayoutImpl(first: PropertyToClassRelationLike, second: PropertyToClassRelationLike): boolean {
  return equalsByIdentity(first, second)
    && equalsByPrimary(first, second)
    && equalsByHasReferenceFromPropertyToClass(first, second)
}

function equalsPropertyToClassRelationLikeByVisualImpl(): boolean {
  return true
}