import {
  HasDeprecationLike,
  HasIdentityLike,
  HasNameLike,
  HasPropertiesLike,
  HasShapeLike,
  HasTypeLike,
} from 'main/domain/like/base'
import { createCustomEqual } from 'fast-equals'
import { LIKE_TYPE_CLASS } from 'main/domain/like/type'
import { equalsByDeprecation, equalsByIdentity, equalsByName, equalsByShape } from 'main/domain/like/base-equals'
import { PropertyLike } from 'main/domain/like/all'
import { IsEqualFunction } from 'main/domain/base'

export interface ClassLike extends HasIdentityLike, HasNameLike, HasTypeLike<typeof LIKE_TYPE_CLASS>, HasPropertiesLike<PropertyLike>, HasShapeLike, HasDeprecationLike {
}

export const equalsClassByLayout: IsEqualFunction<ClassLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsClassLikeByLayoutImpl,
  }),
})

export const equalsClassByVisual: IsEqualFunction<ClassLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsClassLikeByVisualImpl,
  }),
})

function equalsClassLikeByLayoutImpl(first: ClassLike, second: ClassLike): boolean {
  return equalsByIdentity(first, second)
}

function equalsClassLikeByVisualImpl(first: ClassLike, second: ClassLike): boolean {
  return equalsByName(first, second)
    && equalsByShape(first, second)
    && equalsByDeprecation(first, second)
}