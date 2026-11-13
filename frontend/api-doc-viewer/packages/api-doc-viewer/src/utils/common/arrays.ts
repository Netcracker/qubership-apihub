export class ArrayUtils {

  public static isEmpty(value: unknown): value is [] {
    if (!Array.isArray(value)) {
      return false
    }

    return value.length === 0
  }

  /** A typed list with at least one item (for APIs that take a non-empty tuple). */
  public static isNonEmptyList<T>(value: readonly T[]): value is readonly [T, ...T[]] {
    return value.length > 0
  }

  public static isNotEmpty(value: unknown): value is [unknown, ...unknown[]] {
    if (!Array.isArray(value)) {
      return false
    }

    return value.length > 0
  }

  public static isStringArray(array: unknown[]): array is string[] {
    return array.every(item => typeof item === 'string')
  }

  public static trimLeft(value: string[]): string[] {
    let indexOfLastNonEmptyLine = -1
    for (let i = 0; i < value.length; i++) {
      if (value[i].trim()) {
        indexOfLastNonEmptyLine = i
        break
      }
    }

    return indexOfLastNonEmptyLine > -1
      ? value.slice(indexOfLastNonEmptyLine)
      : []
  }

  public static trimRight(value: string[]): string[] {
    let indexOfLastNonEmptyLine = -1
    for (let i = 0; i < value.length; i++) {
      if (value[i].trim()) {
        indexOfLastNonEmptyLine = i
      }
    }

    return indexOfLastNonEmptyLine > -1
      ? value.slice(0, indexOfLastNonEmptyLine + 1)
      : []
  }

  public static trim(value: string[]): string[] {
    return ArrayUtils.trimRight(ArrayUtils.trimLeft(value))
  }

}
