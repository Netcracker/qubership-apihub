import { LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION } from 'main/domain/like/type'
import {
  HasIdentityLike,
  HasPrimaryLike,
  HasReferenceFromGroupToClassLike,
  HasTypeLike,
} from 'main/domain/like/base'
import { createCustomEqual } from 'fast-equals'
import { equalsByIdentity, equalsByPrimary, equalsByReferenceFromGroupToClass } from 'main/domain/like/base-equals'
import { IsEqualFunction } from 'main/domain/base'

export interface IncludePropertiesGroupRelationLike extends HasIdentityLike, HasTypeLike<typeof LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION>, HasPrimaryLike, HasReferenceFromGroupToClassLike {
}

export const equalsIncludePropertiesGroupRelationByLayout: IsEqualFunction<IncludePropertiesGroupRelationLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsIncludePropertiesGroupRelationLikeByLayoutImpl,
  }),
})

export const equalsIncludePropertiesGroupRelationByVisual: IsEqualFunction<IncludePropertiesGroupRelationLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsIncludePropertiesGroupRelationLikeByVisualImpl,
  }),
})

function equalsIncludePropertiesGroupRelationLikeByLayoutImpl(first: IncludePropertiesGroupRelationLike, second: IncludePropertiesGroupRelationLike): boolean {
  return equalsByIdentity(first, second)
    && equalsByReferenceFromGroupToClass(first, second)
}

function equalsIncludePropertiesGroupRelationLikeByVisualImpl(first: IncludePropertiesGroupRelationLike, second: IncludePropertiesGroupRelationLike): boolean {
  return equalsByPrimary(first, second)
}