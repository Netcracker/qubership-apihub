import {
  HasDeprecationLike,
  HasIdentityLike,
  HasNameLike,
  HasPropertyTypeDeprecationLike,
  HasPropertyTypeLike,
  HasRequiredLike,
  HasTypeLike,
} from 'main/domain/like/base'
import { createCustomEqual } from 'fast-equals'
import {
  equalsByDeprecation,
  equalsByIdentity,
  equalsByName,
  equalsByPropertyType,
  equalsByPropertyTypeDeprecation,
  equalsByRequired,
} from 'main/domain/like/base-equals'
import { LIKE_TYPE_LEAF_PROPERTY } from 'main/domain/like/type'
import { IsEqualFunction } from 'main/domain/base'

export interface LeafPropertyLike extends HasIdentityLike, HasNameLike, HasTypeLike<typeof LIKE_TYPE_LEAF_PROPERTY>, HasRequiredLike, HasDeprecationLike, HasPropertyTypeDeprecationLike, HasPropertyTypeLike {
}

export const equalsLeafPropertyByLayout: IsEqualFunction<LeafPropertyLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsLeafPropertyLikeByLayoutImpl,
  }),
})

export const equalsLeafPropertyByVisual: IsEqualFunction<LeafPropertyLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsLeafPropertyLikeByVisualImpl,
  }),
})

function equalsLeafPropertyLikeByLayoutImpl(first: LeafPropertyLike, second: LeafPropertyLike): boolean {
  //order? not our case until immutable
  return equalsByIdentity(first, second)
}

function equalsLeafPropertyLikeByVisualImpl(first: LeafPropertyLike, second: LeafPropertyLike): boolean {
  return equalsByName(first, second)
    && equalsByRequired(first, second)
    && equalsByPropertyType(first, second)
    && equalsByDeprecation(first, second)
    && equalsByPropertyTypeDeprecation(first, second)
}