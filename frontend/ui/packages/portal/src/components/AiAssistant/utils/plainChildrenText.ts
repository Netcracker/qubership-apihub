import type { ReactNode } from 'react'

/** Text content from react-markdown anchor children (link label). */
export function plainChildrenText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return ''
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(plainChildrenText).join('')
  }
  const { props } = node as { props?: { children?: ReactNode } }
  if (props?.children !== undefined) {
    return plainChildrenText(props.children)
  }
  return ''
}
