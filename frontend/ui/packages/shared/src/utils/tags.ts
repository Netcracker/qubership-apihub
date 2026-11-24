import { DEFAULT_TAG, EMPTY_TAG } from '../entities/operations'

export function areDefaultTags(tags: readonly string[] | undefined): boolean {
  return !tags || tags.includes(EMPTY_TAG) || tags.includes(DEFAULT_TAG)
}

export function containsTag(
  tags: readonly string[] | undefined,
  tag?: string,
): boolean | undefined {

  return tags?.includes(tag ?? EMPTY_TAG)
}

export function isAppliedSearchValueForTag(tag: string, searchValue: string): boolean {
  const [tagLower, searchValueLower] = [tag.toLowerCase(), searchValue.toLowerCase()]
  return tagLower.includes(searchValueLower)
}

export function isEmptyTag(tag?: string): boolean {
  return tag === DEFAULT_TAG
}
