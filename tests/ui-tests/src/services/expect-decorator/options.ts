export interface TimeoutOption {
  timeout?: number
}

export interface IgnoreCaseOption {
  ignoreCase?: boolean
}

export interface BeVisibleOptions extends TimeoutOption {
  visible?: boolean
}

export interface BeEnabledOptions extends TimeoutOption {
  enabled?: boolean
}

export interface HaveContainTextOptions extends TimeoutOption, IgnoreCaseOption {
  useInnerText?: boolean
}

export interface BeCheckedOptions extends TimeoutOption {
  checked?: boolean
}

export interface HaveAttributeOptions extends TimeoutOption, IgnoreCaseOption {}
