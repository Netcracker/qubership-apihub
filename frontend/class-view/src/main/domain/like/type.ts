export type LikeType = typeof LIKE_TYPE_CLASS
  | typeof LIKE_TYPE_LEAF_PROPERTY
  | typeof LIKE_TYPE_PROPERTY_GROUP
  | typeof LIKE_TYPE_PROPERTY_TO_CLASS_RELATION
  | typeof LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION

export const LIKE_TYPE_CLASS = 'class'
export const LIKE_TYPE_LEAF_PROPERTY = 'leaf-property'
export const LIKE_TYPE_PROPERTY_GROUP = 'properties-group'
export const LIKE_TYPE_PROPERTY_TO_CLASS_RELATION = 'property-to-class'
export const LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION = 'include-group'