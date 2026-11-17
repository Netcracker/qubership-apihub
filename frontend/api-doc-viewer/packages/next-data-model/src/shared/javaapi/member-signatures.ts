export type JavaFieldSignature = {
  readonly type: string
  readonly name: string
}

export type JavaExecutableSignature = {
  readonly returnType?: string
  readonly name: string
  readonly parameterTypes: string[]
}

// `java.lang.String API_PATH` -> { type: 'java.lang.String', name: 'API_PATH' }
export function parseJavaFieldSignature(signature: string): JavaFieldSignature {
  const [type, name] = splitAtLastSpace(signature)
  return { type, name }
}

// `java.util.List getValues(java.lang.String, boolean)`
//   -> { returnType: 'java.util.List', name: 'getValues', parameterTypes: ['java.lang.String', 'boolean'] }
// `Order()` -> { returnType: undefined, name: 'Order', parameterTypes: [] }
// jdiff writes erased types (no `<…>`), so splitting the parameters on `,` is safe
export function parseJavaExecutableSignature(signature: string): JavaExecutableSignature {
  const openParen = signature.indexOf('(')
  const [returnType, name] = splitAtLastSpace(signature.slice(0, openParen).trim())
  const parameterList = signature.slice(openParen + 1, signature.lastIndexOf(')')).trim()
  return {
    returnType: returnType || undefined,
    name,
    parameterTypes: parameterList ? parameterList.split(',').map(parameter => parameter.trim()) : [],
  }
}

// `java.lang.String NAME` -> [`java.lang.String`, `NAME`]; `NAME` -> [``, `NAME`]
function splitAtLastSpace(text: string): [before: string, after: string] {
  const separator = text.lastIndexOf(' ')
  return [text.slice(0, separator < 0 ? 0 : separator), text.slice(separator + 1)]
}
