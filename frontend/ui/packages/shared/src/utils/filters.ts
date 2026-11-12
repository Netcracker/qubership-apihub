export function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

export function includes(
  data: string[],
  searchValue: string,
): boolean {
  return data.some(item => item.toLowerCase().includes(searchValue.toLowerCase()))
}
