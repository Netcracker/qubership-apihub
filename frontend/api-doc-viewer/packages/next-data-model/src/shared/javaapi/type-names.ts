// `org.example.Outer$Inner[]` -> `org.example.Outer$Inner`
export function toJavaBaseTypeName(type: string): string {
  return type.replace(/(\[\]|\.\.\.)+$/, '')
}

// `org.example.Outer$Inner[]` -> `org.example.Outer.Inner[]`; a `$` that starts a name is part of it, as in
// generated classes such as `org.example.$Gson$Types` -> `org.example.$Gson.Types`
export function toJavaCanonicalTypeName(type: string): string {
  return type.replace(/(?<=[^.$])\$/g, '.')
}

// `org.example.Outer$Inner[]` -> `Outer.Inner[]`
export function toJavaSimpleTypeName(type: string): string {
  const base = toJavaBaseTypeName(type)
  return toJavaCanonicalTypeName(base.slice(base.lastIndexOf('.') + 1)) + type.slice(base.length)
}

// `org.example.Outer$Inner` -> `org.example`
export function toJavaPackageName(className: string): string {
  return className.slice(0, Math.max(className.lastIndexOf('.'), 0))
}

// `org.example.Outer$Inner` -> `Outer.Inner`
export function toJavaDisplayName(className: string): string {
  const packageName = toJavaPackageName(className)
  return toJavaCanonicalTypeName(className.slice(packageName ? packageName.length + 1 : 0))
}

// `org.example.Outer$Inner` -> `org.example.Outer`
export function toJavaEnclosingClassName(className: string): string | undefined {
  const separator = className.lastIndexOf('$')
  return separator > 0 && className[separator - 1] !== '.' ? className.slice(0, separator) : undefined
}
