export function alphabeticallyBy<T>(
  propertyName: keyof T,
  it: T,
  that: T,
): number {
  const a = it[propertyName]
  const b = that[propertyName]

  if (typeof a === 'string' && typeof b === 'string') {
    return a.toLowerCase().localeCompare(b.toLowerCase())
  }

  return 0
}
