import type { FieldNamesMarkedBoolean, FieldValues } from 'react-hook-form'

export const filterChangedFormFields = <T extends FieldValues>(
  allFields: T,
  dirtyFields: FieldNamesMarkedBoolean<T>,
): Partial<T> => {
  return Object.fromEntries(
    Object.keys(dirtyFields).map((field) => [field, allFields[field]]),
  ) as Partial<T>
}
