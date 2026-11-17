import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

import { SERVICE_COMPONENT_LABEL_KEY } from '@agents/entities/services'

export const MISSING_API_DOCUMENTS_LABEL_WARNING = 'missing-api-documents'
export const UNEXPECTED_API_DOCUMENTS_LABEL_WARNING = 'unexpected-api-documents'

export type ServiceLabelWarning =
  | typeof MISSING_API_DOCUMENTS_LABEL_WARNING
  | typeof UNEXPECTED_API_DOCUMENTS_LABEL_WARNING

type LabelledService = Readonly<{
  specs?: ReadonlyArray<unknown>
  labels?: Readonly<Record<string, string>>
}>

const API_DOCUMENTS_EXPECTED_COMPONENT = 'backend'
const API_DOCUMENTS_NOT_EXPECTED_COMPONENTS: ReadonlyArray<string> = ['frontend', 'job', 'operator', 'mesh-gateway']

export function serviceLabelWarningOf({ specs, labels }: LabelledService): ServiceLabelWarning | undefined {
  const component = labels?.[SERVICE_COMPONENT_LABEL_KEY]
  const hasApiDocuments = isNotEmpty(specs)
  if (component === API_DOCUMENTS_EXPECTED_COMPONENT && !hasApiDocuments) {
    return MISSING_API_DOCUMENTS_LABEL_WARNING
  }
  if (component !== undefined && API_DOCUMENTS_NOT_EXPECTED_COMPONENTS.includes(component) && hasApiDocuments) {
    return UNEXPECTED_API_DOCUMENTS_LABEL_WARNING
  }
  return undefined
}
