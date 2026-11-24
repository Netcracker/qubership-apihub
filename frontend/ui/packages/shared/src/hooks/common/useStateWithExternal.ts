import { useCallback, useEffect, useState } from 'react'

export function useStateWithExternal<T>(
  defaultValue: T,
  externalValue?: T,
  externalListener?: (value: T) => void,
): [T, (value: T) => void] {
  const [internalValue, setInternalValue] = useState<T>(defaultValue)

  useEffect(() => {
    if (externalValue !== undefined) {
      setInternalValue(externalValue)
    }
  }, [externalValue])

  const internalHandler = useCallback((value: T) => {
    setInternalValue(value)
    externalListener?.(value)
  }, [externalListener])

  return [internalValue, internalHandler]
}
