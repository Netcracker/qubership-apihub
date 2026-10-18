// New type instead of "SizeVariant" because there are 4 different sizes here and 2 there.
// We do not need to implement 2 extra enum values for consumers of SizeVariant.
// Also this is a temporary solution to avoid breaking changes in old components.
export enum DescriptionFontSize {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
  LEGACY = 'legacy'
}
