import {
  type JavaApiMemberKind,
  type JavaApiTypeKind,
} from '@netcracker/qubership-apihub-next-data-model/model/javaapi/tree/node-value'
import { FC, memo } from 'react'
import { JAVA_API_MEMBER_KIND_TITLES, JAVA_API_TYPE_KIND_TITLES } from './consts'

export type JavaElementIconKind = JavaApiTypeKind | JavaApiMemberKind

const ICONS: Record<JavaElementIconKind, { letter: string; className: string; title: string }> = {
  CLASS: { letter: 'C', className: 'java-element-icon_class', title: JAVA_API_TYPE_KIND_TITLES.CLASS },
  INTERFACE: { letter: 'I', className: 'java-element-icon_interface', title: JAVA_API_TYPE_KIND_TITLES.INTERFACE },
  ENUM: { letter: 'E', className: 'java-element-icon_enum', title: JAVA_API_TYPE_KIND_TITLES.ENUM },
  ANNOTATION: { letter: '@', className: 'java-element-icon_annotation', title: JAVA_API_TYPE_KIND_TITLES.ANNOTATION },
  NESTED_CLASS: { letter: 'C', className: 'java-element-icon_class', title: JAVA_API_MEMBER_KIND_TITLES.NESTED_CLASS },
  ENUM_CONSTANT: { letter: 'e', className: 'java-element-icon_enum', title: JAVA_API_MEMBER_KIND_TITLES.ENUM_CONSTANT },
  FIELD: { letter: 'f', className: 'java-element-icon_field', title: JAVA_API_MEMBER_KIND_TITLES.FIELD },
  CONSTRUCTOR: { letter: 'c', className: 'java-element-icon_method', title: JAVA_API_MEMBER_KIND_TITLES.CONSTRUCTOR },
  METHOD: { letter: 'm', className: 'java-element-icon_method', title: JAVA_API_MEMBER_KIND_TITLES.METHOD },
}

export const JavaElementIcon: FC<{ kind: JavaElementIconKind }> = memo(({ kind }) => {
  const icon = ICONS[kind]
  return (
    <span className={`java-element-icon ${icon.className}`} title={icon.title} data-testid="java-element-icon">
      {icon.letter}
    </span>
  )
})
