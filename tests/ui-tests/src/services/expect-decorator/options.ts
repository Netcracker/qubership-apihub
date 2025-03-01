/**
 * Base interface for options that include a timeout
 */
export interface TimeoutOption {
  /** Maximum time in milliseconds to wait for the condition */
  timeout?: number
}

/**
 * Base interface for options that support case-insensitive comparison
 */
export interface IgnoreCaseOption {
  /** Whether to ignore case when comparing strings */
  ignoreCase?: boolean
}

/**
 * Options for visibility assertions
 */
export interface BeVisibleOptions extends TimeoutOption {
  /** Whether the element should be visible (true) or not (false) */
  visible?: boolean
}

/**
 * Options for enabled state assertions
 */
export interface BeEnabledOptions extends TimeoutOption {
  /** Whether the element should be enabled (true) or not (false) */
  enabled?: boolean
}

/**
 * Options for text content assertions
 */
export interface HaveContainTextOptions extends TimeoutOption, IgnoreCaseOption {
  /** Whether to use innerText instead of textContent */
  useInnerText?: boolean
}

/**
 * Options for checked state assertions
 */
export interface BeCheckedOptions extends TimeoutOption {
  /** Whether the element should be checked (true) or not (false) */
  checked?: boolean
}

/**
 * Options for attribute assertions
 */
export interface HaveAttributeOptions extends TimeoutOption, IgnoreCaseOption {}
