/** Font size (px) of the address value in `AddressRow`: shrinks from `base` to `min`, then wraps. */
export const ADDRESS_VALUE_FONT_SIZE = { base: 18, min: 12 } as const

/** Size step (px): fitted sizes are rounded down to it, so a fitted value never overflows. */
const FONT_SIZE_STEP = 0.25

/** One side's address value: its one-line width at the base size and the width it may take. */
export type AddressValueMeasurement = {
  natural: number
  available: number
}

export class AddressValueFit {
  /** The largest size between `min` and `base` at which the value fits on one line. */
  public static fitSize(measurement: AddressValueMeasurement): number {
    const { natural, available } = measurement
    const { base, min } = ADDRESS_VALUE_FONT_SIZE
    if (natural <= available) {
      return base
    }
    const proportional = Math.floor((base * Math.max(available, 0) / natural) / FONT_SIZE_STEP) * FONT_SIZE_STEP
    return Math.min(base, Math.max(min, proportional))
  }

  /** Both sides use one size: the smallest fitted size among the measured sides. */
  public static sharedSize(measurements: ReadonlyArray<AddressValueMeasurement | undefined>): number {
    return measurements.reduce<number>(
      (size, measurement) => measurement ? Math.min(size, this.fitSize(measurement)) : size,
      ADDRESS_VALUE_FONT_SIZE.base,
    )
  }

  /** The value does not fit on one line at `fontSize` (only possible at the minimum size). */
  public static wraps(measurement: AddressValueMeasurement | undefined, fontSize: number): boolean {
    if (!measurement) {
      return false
    }
    return measurement.natural * fontSize / ADDRESS_VALUE_FONT_SIZE.base > measurement.available
  }

  public static isSame(first: AddressValueMeasurement | undefined, second: AddressValueMeasurement): boolean {
    return !!first && first.natural === second.natural && first.available === second.available
  }
}
