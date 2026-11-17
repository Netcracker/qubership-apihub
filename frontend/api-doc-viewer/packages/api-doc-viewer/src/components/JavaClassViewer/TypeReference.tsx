import {
  toJavaBaseTypeName,
  toJavaCanonicalTypeName,
  toJavaSimpleTypeName,
} from '@netcracker/qubership-apihub-next-data-model/shared/javaapi/type-names'
import { FC, memo, useMemo } from 'react'
import { useJavaClassViewerContext } from './JavaClassViewerContext'

type TypeReferenceProps = {
  // binary type name, e.g. `org.example.Outer$Inner[]`
  type: string
}

// Renders a simple type name; a class of the same artifact becomes a navigation link
export const TypeReference: FC<TypeReferenceProps> = memo<TypeReferenceProps>(({ type }) => {
  const { navigationLinkBuilder, navigationLinkComponent: NavigationLink, knownClassNames } =
    useJavaClassViewerContext()
  const baseName = toJavaBaseTypeName(type)
  const label = toJavaSimpleTypeName(type)
  const title = toJavaCanonicalTypeName(type)
  const href = useMemo(
    () => navigationLinkBuilder && knownClassNames.has(baseName) ? navigationLinkBuilder(baseName) : undefined,
    [navigationLinkBuilder, knownClassNames, baseName],
  )

  if (!href) {
    return <span className="java-type-reference" title={title}>{label}</span>
  }
  return (
    <NavigationLink href={href} title={title} className="java-type-reference java-type-reference_link">
      {label}
    </NavigationLink>
  )
})
