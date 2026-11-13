import {
  type JavaApiMemberKind,
  type JavaApiTypeKind,
} from '@netcracker/qubership-apihub-next-data-model/model/javaapi/tree/node-value'
import { FC, memo } from 'react'

export type JavaElementIconKind = JavaApiTypeKind | JavaApiMemberKind

const ICONS: Record<JavaElementIconKind, { letter: string; className: string; title: string }> = {
  CLASS: { letter: 'C', className: 'java-element-icon_class', title: 'Class' },
  INTERFACE: { letter: 'I', className: 'java-element-icon_interface', title: 'Interface' },
  ENUM: { letter: 'E', className: 'java-element-icon_enum', title: 'Enum' },
  ANNOTATION: { letter: '@', className: 'java-element-icon_annotation', title: 'Annotation type' },
  NESTED_CLASS: { letter: 'C', className: 'java-element-icon_class', title: 'Nested class' },
  ENUM_CONSTANT: { letter: 'e', className: 'java-element-icon_enum', title: 'Enum constant' },
  FIELD: { letter: 'f', className: 'java-element-icon_field', title: 'Field' },
  CONSTRUCTOR: { letter: 'c', className: 'java-element-icon_method', title: 'Constructor' },
  METHOD: { letter: 'm', className: 'java-element-icon_method', title: 'Method' },
}

export const JavaElementIcon: FC<{ kind: JavaElementIconKind }> = memo(({ kind }) => {
  const icon = ICONS[kind]
  return (
    <span className={`java-element-icon ${icon.className}`} title={icon.title} data-testid="java-element-icon">
      {icon.letter}
    </span>
  )
})
