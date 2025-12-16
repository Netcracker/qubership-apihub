import { useMemo } from 'react'
import { cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument } from '@netcracker/qubership-apihub-api-processor'

export function useRawGraphQlCroppedToSingleOperationRawGraphQl(
  originalGraphql: string,
  operationType?: string,
  operationName?: string,
): string {
  return useMemo(() => {
    if (originalGraphql && operationType && operationName) {
      let operationTypeSection: 'queries' | 'mutations' | 'subscriptions' | undefined
      switch (operationType) {
        case 'query':
          operationTypeSection = 'queries'
          break
        case 'mutation':
          operationTypeSection = 'mutations'
          break
        case 'subscription':
          operationTypeSection = 'subscriptions'
          break
      }
      return operationTypeSection
        ? cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument(originalGraphql, operationTypeSection, operationName)
        : originalGraphql
    }
    return ''
  }, [originalGraphql, operationType, operationName])
}
