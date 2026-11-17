import { isArray, isObject, isString } from '../../utilities'

// binary names of every class a jdiff document mentions; type references link only to these
export function collectJavaApiClassNames(source: unknown): ReadonlySet<string> {
  const classNames = new Set<string>()
  if (!isObject(source) || !isArray(source.artifacts)) {
    return classNames
  }
  source.artifacts.forEach((artifact: unknown) => {
    if (isObject(artifact) && isArray(artifact.changes)) {
      artifact.changes.forEach((element: unknown) => {
        isObject(element) && isString(element.className) && classNames.add(element.className)
      })
    }
  })
  return classNames
}
