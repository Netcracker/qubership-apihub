// `org.example.Outer$Inner[]` -> `org.example.Outer$Inner`
export function toJavaBaseTypeName(type: string): string {
  return type.replace(/(\[\]|\.\.\.)+$/, '')
}

// `org.example.Outer$Inner[]` -> `Outer.Inner[]`
export function toJavaSimpleTypeName(type: string): string {
  const base = toJavaBaseTypeName(type)
  return base.slice(base.lastIndexOf('.') + 1).replaceAll('$', '.') + type.slice(base.length)
}

// `org.example.Outer$Inner` -> `org.example`
export function toJavaPackageName(className: string): string {
  return className.slice(0, Math.max(className.lastIndexOf('.'), 0))
}

// `org.example.Outer$Inner` -> `Outer.Inner`
export function toJavaDisplayName(className: string): string {
  const packageName = toJavaPackageName(className)
  return className.slice(packageName ? packageName.length + 1 : 0).replaceAll('$', '.')
}

// `org.example.Outer$Inner` -> `org.example.Outer`
export function toJavaEnclosingClassName(className: string): string | undefined {
  const separator = className.lastIndexOf('$')
  return separator > 0 ? className.slice(0, separator) : undefined
}
