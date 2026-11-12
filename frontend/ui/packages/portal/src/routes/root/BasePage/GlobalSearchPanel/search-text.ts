export function hasSearchText(value: string, text: string): boolean {
  return value.toLowerCase().includes(text.toLowerCase())
}
