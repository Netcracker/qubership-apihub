import type { Package } from '../entities/packages'

export function calculatePackagePath(packageObj?: Package | null, fullPath: boolean = true, separator: string = '/'): string {
  if (!packageObj) {
    return ''
  }

  const pathItems: Package[] = [
    ...(packageObj.parents ?? []),
    ...(fullPath ? [packageObj] : []),
  ]
  return pathItems.map(group => group.name).join(` ${separator} `) ?? ''
}
