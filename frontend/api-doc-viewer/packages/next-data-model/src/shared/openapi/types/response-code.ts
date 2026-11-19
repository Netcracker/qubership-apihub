export const OpenApiResponseCodeClasses = {
  INFORMATIONAL: '1XX',
  SUCCESS: '2XX',
  REDIRECTION: '3XX',
  CLIENT_ERROR: '4XX',
  SERVER_ERROR: '5XX',
  DEFAULT: 'default',
  UNKNOWN: 'unknown',
} as const

export type OpenApiResponseCodeClass = typeof OpenApiResponseCodeClasses[keyof typeof OpenApiResponseCodeClasses]

const CLASS_BY_DIGIT: Readonly<Record<string, OpenApiResponseCodeClass>> = {
  '1': OpenApiResponseCodeClasses.INFORMATIONAL,
  '2': OpenApiResponseCodeClasses.SUCCESS,
  '3': OpenApiResponseCodeClasses.REDIRECTION,
  '4': OpenApiResponseCodeClasses.CLIENT_ERROR,
  '5': OpenApiResponseCodeClasses.SERVER_ERROR,
}

const EXPLICIT_CODE_PATTERN = /^[1-5]\d\d$/
const RANGE_CODE_PATTERN = /^[1-5]xx$/i
const DEFAULT_CODE = 'default'

/** Rank of a class in the canonical order: 1XX ... 5XX, unknown, default. */
const CLASS_RANK: Readonly<Record<OpenApiResponseCodeClass, number>> = {
  [OpenApiResponseCodeClasses.INFORMATIONAL]: 1,
  [OpenApiResponseCodeClasses.SUCCESS]: 2,
  [OpenApiResponseCodeClasses.REDIRECTION]: 3,
  [OpenApiResponseCodeClasses.CLIENT_ERROR]: 4,
  [OpenApiResponseCodeClasses.SERVER_ERROR]: 5,
  [OpenApiResponseCodeClasses.UNKNOWN]: 6,
  [OpenApiResponseCodeClasses.DEFAULT]: 7,
}

/** Response-code helpers: classification and canonical order. */
export class OpenApiResponseCode {
  public static resolveClass(code: string): OpenApiResponseCodeClass {
    if (code === DEFAULT_CODE) {
      return OpenApiResponseCodeClasses.DEFAULT
    }
    if (EXPLICIT_CODE_PATTERN.test(code) || RANGE_CODE_PATTERN.test(code)) {
      return CLASS_BY_DIGIT[code.charAt(0)] ?? OpenApiResponseCodeClasses.UNKNOWN
    }
    return OpenApiResponseCodeClasses.UNKNOWN
  }

  public static isRange(code: string): boolean {
    return RANGE_CODE_PATTERN.test(code)
  }

  /**
   * Canonical order: by class 1XX -> 5XX; inside a class explicit codes ascending, then the range;
   * unknown keys keep document order; `default` last. `Array.prototype.sort` is stable, so equal
   * keys (unknown ones) keep their document order.
   */
  public static compare(a: string, b: string): number {
    const classA = OpenApiResponseCode.resolveClass(a)
    const classB = OpenApiResponseCode.resolveClass(b)
    const classDelta = CLASS_RANK[classA] - CLASS_RANK[classB]
    if (classDelta !== 0) {
      return classDelta
    }
    if (classA === OpenApiResponseCodeClasses.UNKNOWN || classA === OpenApiResponseCodeClasses.DEFAULT) {
      return 0
    }
    const rangeA = OpenApiResponseCode.isRange(a)
    const rangeB = OpenApiResponseCode.isRange(b)
    if (rangeA !== rangeB) {
      return rangeA ? 1 : -1
    }
    return rangeA ? 0 : Number(a) - Number(b)
  }

  /**
   * The response shown when none is selected (Q13): the first `2XX` (an explicit success code or the
   * range), else the first. `codeOf` gives an option's code as in the document.
   * Design: docs/design/openapi/features/response-code-selector.md.
   */
  public static pickDefault<T>(options: readonly T[], codeOf: (option: T) => string): T | undefined {
    return options.find(option => OpenApiResponseCode.resolveClass(codeOf(option)) === OpenApiResponseCodeClasses.SUCCESS) ?? options[0]
  }
}
