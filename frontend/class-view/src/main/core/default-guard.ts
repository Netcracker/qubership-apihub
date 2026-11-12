import { Color, Optional } from 'main/domain/base'
import { isDefine } from 'main/core/utils'

export function valueOrDefaultForGeneric<T>(value: Optional<T>, defaultValue: () => T): T {
  return isDefine(value) ? value : defaultValue()
}

export function valueOrDefaultForColor(value: Optional<Color>, defaultValue: () => Color): Color {
  // todo checks, logs
  return isDefine(value) ? value : defaultValue()
}

export function valueOrDefaultForNumber<T extends number>(value: Optional<T>, defaultValue: () => T): T {
  if (!isDefine(value) || !Number.isFinite(value)) {
    return defaultValue()
  }
  return value
}

export function valueOrDefaultForEnumType<T>(value: Optional<T>, allowedValues: T[], defaultValue: () => T): T {
  // todo logs
  if (!isDefine(value) || allowedValues.indexOf(value) < 0) {
    return defaultValue()
  }
  return value
}