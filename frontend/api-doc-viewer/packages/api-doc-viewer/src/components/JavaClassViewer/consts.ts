import { type JavaApiTypeKind } from '@netcracker/qubership-apihub-next-data-model/model/javaapi/tree/node-value'

export const ADDITIONAL_INFO_LABEL_CHANGES = 'Changes'
// the jdiff field names, as the requirements show them
export const ADDITIONAL_INFO_LABEL_BINARY_COMPATIBLE = 'binaryCompatible'
export const ADDITIONAL_INFO_LABEL_SOURCE_COMPATIBLE = 'sourceCompatible'
export const ADDITIONAL_INFO_LABEL_SEMVER = 'semver'

export const JAVA_API_TYPE_KIND_TITLES: Record<JavaApiTypeKind, string> = {
  CLASS: 'Class',
  INTERFACE: 'Interface',
  ENUM: 'Enum',
  ANNOTATION: 'Annotation type',
}
