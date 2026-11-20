import { HasDeprecationLike, HasIdentityLike, HasNameLike, HasPropertiesLike, HasTypeLike } from 'main/domain/like/base'
import { LIKE_TYPE_PROPERTY_GROUP } from 'main/domain/like/type'
import { createCustomEqual } from 'fast-equals'
import { equalsByDeprecation, equalsByIdentity, equalsByName } from 'main/domain/like/base-equals'
import { LeafPropertyLike } from 'main/domain/like/leaf-property'
import { IsEqualFunction } from 'main/domain/base'

export interface PropertiesGroupLike extends HasIdentityLike, HasTypeLike<typeof LIKE_TYPE_PROPERTY_GROUP>, HasNameLike, HasDeprecationLike, HasPropertiesLike<LeafPropertyLike> {
}

export const equalsPropertiesGroupByLayout: IsEqualFunction<PropertiesGroupLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsPropertiesGroupLikeByLayoutImpl,
  }),
})

export const equalsPropertiesGroupByVisual: IsEqualFunction<PropertiesGroupLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsPropertiesGroupLikeByVisualImpl,
  }),
})

function equalsPropertiesGroupLikeByLayoutImpl(first: PropertiesGroupLike, second: PropertiesGroupLike): boolean {
  //order? not our case until immutable
  return equalsByIdentity(first, second)
}

function equalsPropertiesGroupLikeByVisualImpl(first: PropertiesGroupLike, second: PropertiesGroupLike): boolean {
  return equalsByName(first, second)
    && equalsByDeprecation(first, second)
}