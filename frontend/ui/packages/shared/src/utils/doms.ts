export function isNoTextSelected(): boolean {
  return !getSelection()?.toString()
}
